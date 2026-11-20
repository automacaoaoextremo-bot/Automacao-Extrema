import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { safeError, isUuid } from '@/lib/atendimento-inteligente/security';
import { timelineAccess, isValidISODate } from '@/lib/atendimento-inteligente/timeline';
import {TIMELINE_MIMES, TIMELINE_BUCKET} from '@/lib/atendimento-inteligente/timeline-constants';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{id:string}> };
type Submission = {kind?:'message'|'attachment';text?:string;fileName?:string;mimeType?:string;
  size?:number;origin?:string;occurredAt?:string;importedAuthor?:string;sourceKey?:string};
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
async function signFile(path:string){
 const {data,error}=await supabaseAdmin.storage.from(TIMELINE_BUCKET).createSignedUrl(path,300);
 return error ? null : (data?.signedUrl ?? null);
}
export async function GET(request:NextRequest,{params}:Ctx){
 try{
  const {id}=await params;
  const access=await timelineAccess(request,id);
  if(!access)return fail('Pedido nao encontrado ou nao autorizado.',403);
  const org=access.record.organization_id;
  const [t,l,h]=await Promise.all([
    supabaseAdmin.from('ae_ai_request_timeline')
       .select('id,author_role,author_label,event_type,body,object_path,mime_type,original_name,uploaded,origin,occurred_at,created_at')
       .eq('organization_id',org).eq('request_id',id).order('occurred_at',{ascending:true}).limit(300),
    supabaseAdmin.from('ae_ai_request_media')
       .select('id,object_path,mime_type,original_name,created_at')
       .eq('organization_id',org).eq('request_id',id).eq('uploaded',true).limit(80),
    supabaseAdmin.from('ae_ai_request_history')
       .select('id,status,created_at').eq('organization_id',org).eq('request_id',id).limit(100),
  ]);
  if(t.error)throw t.error;
  if(l.error)throw l.error;
  if(h.error)throw h.error;
  const entries=await Promise.all((t.data??[]).filter(x=>x.event_type==='message'||x.uploaded).map(async x=>({
   id:x.id, type:x.event_type, author:x.author_label, origin:x.origin,
   body:x.body, name:x.original_name, mimeType:x.mime_type,
   occurredAt:x.occurred_at, importedAt:x.created_at,
   url:x.object_path ? await signFile(x.object_path) : null,
  })));
  const legacy=await Promise.all((l.data??[]).map(async x=>({
   id:`legacy-${x.id}`,type:'attachment',author:'Anexo inicial',origin:'legacy',body:null,
   name:x.original_name,mimeType:x.mime_type,occurredAt:x.created_at,importedAt:x.created_at,
   url:await signFile(x.object_path),
  })));
  const status=(h.data??[]).map(x=>({id:`status-${x.id}`,type:'status',author:'Sistema RMC',origin:'system',
    body:x.status,name:null,mimeType:null,occurredAt:x.created_at,importedAt:x.created_at,url:null}));
  return NextResponse.json({entries:[...entries,...legacy,...status].sort((a,b)=>
    Date.parse(a.occurredAt)-Date.parse(b.occurredAt)||a.id.localeCompare(b.id)),canImport:access.canImport});
 }catch(error){return fail(safeError(error),500);}
}
export async function POST(request:NextRequest,{params}:Ctx){
 try{
  const {id}=await params;
  const access=await timelineAccess(request,id);
  if(!access)return fail('Sem permissao para este pedido.',403);
  const data=await request.json() as Submission;
  const kind=data.kind;
  const imported=data.origin==='whatsapp_import';
  if(data.origin&&data.origin!=='whatsapp_import')return fail('Origem invalida.',400);
  if(imported&&!access.canImport)return fail('A importacao e exclusiva do N2.',403);
  const occurredAt=imported ? data.occurredAt : new Date().toISOString();
  if(imported&&(!isValidISODate(occurredAt)||Date.parse(occurredAt)>Date.now()+300000))return fail('Data historica invalida.',400);
  const sourceKey=imported ? String(data.sourceKey??'') : null;
  if(imported&&(!/^[a-f0-9]{64}$/.test(sourceKey!) || !/^(?:M[aá]rcio|Anderson|Cliente)(?: \(.+\))?$/i.test(String(data.importedAuthor??''))))
    return fail('Identificacao ou chave historica invalida.',400);
  const authorRole=imported?'imported':access.actor.role;
  const authorLabel=imported?String(data.importedAuthor).slice(0,100):access.actor.name.slice(0,100);
  const base={organization_id:access.record.organization_id,request_id:id,
    author_user_id:access.actor.userId,author_role:authorRole,author_label:authorLabel,
    origin:imported?'whatsapp_import':'portal',source_key:sourceKey,occurred_at:occurredAt};
  if(kind==='message'){
    const body=String(data.text??'').trim();
    if(body.length<1||body.length>3000)return fail('Mensagem deve ter de 1 a 3000 caracteres.',400);
    if(imported){
      const {data:existing}=await supabaseAdmin.from('ae_ai_request_timeline').select('id')
       .eq('organization_id',base.organization_id).eq('request_id',id).eq('source_key',sourceKey).maybeSingle();
      if(existing)return NextResponse.json({duplicate:true,entryId:existing.id});
    }
    const {data:row,error}=await supabaseAdmin.from('ae_ai_request_timeline').insert({...base,event_type:'message',body}).select('id').single();
    if(error)throw error;
    return NextResponse.json({entryId:row.id},{status:201});
  }
  if(kind!=='attachment')return fail('Tipo de evento invalido.',400);
  const mime=String(data.mimeType??'').split(';')[0].toLowerCase();
  const cfg=TIMELINE_MIMES[mime];
  if(!cfg||!Number.isSafeInteger(data.size)||Number(data.size)<1||Number(data.size)>cfg.max)
    return fail('Formato nao permitido ou arquivo acima do limite.',400);
  const fileName=String(data.fileName??'').trim().slice(0,180)||`arquivo${cfg.extension}`;
  const {count,error:countError}=await supabaseAdmin.from('ae_ai_request_timeline').select('id',{count:'exact',head:true})
    .eq('organization_id',base.organization_id).eq('request_id',id).eq('event_type','attachment');
  if(countError)throw countError;
  if((count??0)>=80)return fail('Limite de 80 anexos por pedido.',400);
  if(imported){
    const {data:existing,error:existingError}=await supabaseAdmin.from('ae_ai_request_timeline')
      .select('id,object_path,uploaded').eq('organization_id',base.organization_id)
      .eq('request_id',id).eq('source_key',sourceKey).maybeSingle();
    if(existingError)throw existingError;
    if(existing){
      if(existing.uploaded)return NextResponse.json({duplicate:true,entryId:existing.id});
      const {data:signed,error:signError}=await supabaseAdmin.storage.from(TIMELINE_BUCKET).createSignedUploadUrl(existing.object_path,{upsert:false});
      if(signError||!signed)throw signError??new Error('Falha assinatura');
      return NextResponse.json({entryId:existing.id,path:existing.object_path,token:signed.token});
    }
  }
  const path=`${base.organization_id}/${id}/timeline/${randomUUID()}${cfg.extension}`;
  const {data:signed,error:signError}=await supabaseAdmin.storage.from(TIMELINE_BUCKET).createSignedUploadUrl(path,{upsert:false});
  if(signError||!signed)throw signError??new Error('Falha assinatura');
  const {data:row,error}=await supabaseAdmin.from('ae_ai_request_timeline').insert({...base,
    event_type:'attachment',object_path:path,mime_type:mime,original_name:fileName,
    file_size_bytes:data.size,uploaded:false}).select('id').single();
  if(error)throw error;
  return NextResponse.json({entryId:row.id,path,token:signed.token},{status:201});
 }catch(error){return fail(safeError(error),500);}
}
export async function PATCH(request:NextRequest,{params}:Ctx){
 try{
  const {id}=await params;
  const access=await timelineAccess(request,id);
  if(!access)return fail('Sem permissao.',403);
  const payload=await request.json() as {entryId?:string};
  if(!isUuid(payload.entryId))return fail('Anexo invalido.',400);
  const {data:row,error}=await supabaseAdmin.from('ae_ai_request_timeline')
   .select('id,object_path,file_size_bytes,mime_type,author_user_id,uploaded')
   .eq('organization_id',access.record.organization_id).eq('request_id',id)
   .eq('id',payload.entryId).eq('event_type','attachment').maybeSingle();
  if(error)throw error;
  if(!row)return fail('Anexo nao encontrado.',404);
  if(row.author_user_id!==access.actor.userId&&!access.canImport)return fail('Anexo de outro usuario.',403);
  if(row.uploaded)return NextResponse.json({ok:true});
  const folder=row.object_path.split('/').slice(0,-1).join('/');
  const name=row.object_path.split('/').at(-1)!;
  const {data:files,error:storageError}=await supabaseAdmin.storage.from(TIMELINE_BUCKET).list(folder,{limit:100,search:name});
  if(storageError)throw storageError;
  const file=(files??[]).find(x=>x.name===name);
  if(!file)return fail('Aguardando conclusao do upload.',409);
  const actual=Number(file.metadata?.size||0);
  const storedMime=String(file.metadata?.mimetype??'').toLowerCase();
  if(storedMime&&storedMime!==row.mime_type)return fail('Tipo do arquivo nao corresponde ao enviado.',409);
  if(!actual||actual!==Number(row.file_size_bytes))return fail('Arquivo recebido tem tamanho diferente.',409);
  const {error:updateError}=await supabaseAdmin.from('ae_ai_request_timeline').update({uploaded:true})
    .eq('id',row.id).eq('organization_id',access.record.organization_id);
  if(updateError)throw updateError;
  return NextResponse.json({ok:true});
 }catch(error){return fail(safeError(error),500);}
}
