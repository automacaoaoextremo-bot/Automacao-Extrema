import { NextRequest,NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { aeScope,isUuid,safeError } from '@/lib/atendimento-inteligente/security';
export const dynamic='force-dynamic';
async function owner(request:Request): Promise<{error?:NextResponse;orgId?:string;userId?:string}>{
 const scope=await aeScope(request);
 if(!scope)return {error:NextResponse.json({error:'Sessão necessária.'},{status:401})};
 const {data:org,error}=await supabaseAdmin.from('ae_ai_organizations').select('id').eq('slug','reparos-rmc').single();
 if(error||!org)throw error??new Error('Empresa não encontrada.');
 if(!scope.platformAdmin){
 const {data:membership,error:me}=await supabaseAdmin.from('ae_ai_memberships')
 .select('role').eq('user_id',scope.userId).eq('organization_id',org.id).maybeSingle();
 if(me)throw me;
 if(membership?.role!=='owner')return {error:NextResponse.json({error:'Exclusivo N2.'},{status:403})};
 }
 return {orgId:org.id,userId:scope.userId};
}
export async function GET(request:NextRequest){
 try{
 const a=await owner(request);if(a.error)return a.error;
 const {data,error}=await supabaseAdmin.from('ae_ai_rmc_review_drafts')
 .select('id,customer_label,customer_phone,source_date,title,summary,suggested_status,review_status,review_note')
 .eq('organization_id',a.orgId!).order('created_at',{ascending:false}).limit(100);
 if(error)throw error;
 return NextResponse.json({drafts:data??[]});
 }catch(e){return NextResponse.json({error:safeError(e)},{status:500});}
}
export async function PATCH(request:NextRequest){
 try{
 const a=await owner(request);if(a.error)return a.error;
 const body=await request.json() as {id?:string;reviewStatus?:string;note?:string};
 if(!isUuid(body.id)||!['pending','approved_for_manual_entry','rejected'].includes(body.reviewStatus??''))
 return NextResponse.json({error:'Escolha uma decisão válida.'},{status:400});
 const {data,error}=await supabaseAdmin.from('ae_ai_rmc_review_drafts').update({
 review_status:body.reviewStatus,review_note:String(body.note??'').slice(0,1000),
 reviewed_by:a.userId,reviewed_at:new Date().toISOString(),
 }).eq('organization_id',a.orgId!).eq('id',body.id).select('id').maybeSingle();
 if(error)throw error;
 if(!data)return NextResponse.json({error:'Rascunho não encontrado.'},{status:404});
 return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:safeError(e)},{status:500});}
}
