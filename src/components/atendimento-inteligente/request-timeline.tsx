'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {adminFetch} from '@/lib/admin-fetch';
import {supabaseBrowser} from '@/lib/supabase-browser';
import {AiAudioRecorder} from './audio-recorder';
import {TIMELINE_MIMES, TIMELINE_BUCKET} from '@/lib/atendimento-inteligente/timeline-constants';
type Entry={id:string;type:string;author:string;origin:string;body:string|null;name:string|null;
 mimeType:string|null;occurredAt:string;importedAt:string;url:string|null};
const format=(date:string)=>new Date(date).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});
function PendingAudio({file}:{file:File}){
 const audio=useRef<HTMLAudioElement>(null);
 useEffect(()=>{const src=URL.createObjectURL(file);if(audio.current)audio.current.src=src;
   return()=>URL.revokeObjectURL(src);},[file]);
 return <audio controls ref={audio} className="mt-2 w-full" />;
}
export function AiRequestTimeline({requestId,onChanged}:{requestId:string;onChanged?:()=>void}){
 const [entries,setEntries]=useState<Entry[]>([]);const [text,setText]=useState('');
 const [pending,setPending]=useState<File|null>(null);
 const [sending,setSending]=useState(false);const [error,setError]=useState('');
 const [requiresResponse,setRequiresResponse]=useState(false);
 const [canManageN2,setCanManageN2]=useState(false);
 const [responseDue,setResponseDue]=useState<string|null>(null);
 const [requestStatus,setRequestStatus]=useState<string|null>(null);
 const waitingLabel=responseDue==='customer'?'Aguardando resposta do cliente':responseDue==='n2'?'Aguardando análise do Anderson (N2)':'Sem resposta pendente';

 const api=`/api/atendimento-inteligente/requests/${requestId}/timeline`;
 const load=useCallback(async()=>{
  const data=await adminFetch<{entries:Entry[];canManageN2:boolean;responseDue:string|null;requestStatus:string|null}>(api);
  setEntries(data.entries);setCanManageN2(data.canManageN2);setResponseDue(data.responseDue);setRequestStatus(data.requestStatus);
 },[api]);
 useEffect(()=>{let ignore=false;
  adminFetch<{entries:Entry[];canManageN2:boolean;responseDue:string|null;requestStatus:string|null}>(api)
   .then(r=>{if(!ignore){setEntries(r.entries);setCanManageN2(r.canManageN2);setResponseDue(r.responseDue);setRequestStatus(r.requestStatus);}})
   .catch(e=>{if(!ignore)setError(e instanceof Error?e.message:'Nao foi possivel abrir historico.');});
  return()=>{ignore=true;};},[api]);
 async function sendText(){if(!text.trim())return;setSending(true);setError('');try{
  await adminFetch(api,{method:'POST',body:JSON.stringify({kind:'message',text:text.trim(),requiresResponse:canManageN2&&requiresResponse})});
  setText('');setRequiresResponse(false);await load();onChanged?.();
 }catch(e){setError(e instanceof Error?e.message:'Falha no envio.');}finally{setSending(false);}}
 async function sendFile(file:File){setSending(true);setError('');try{
  const mime=(file.name.toLowerCase().endsWith('.ogg')&&(file.type===''||file.type==='application/ogg'))?'audio/ogg':file.type.split(';')[0];
  const cfg=TIMELINE_MIMES[mime];if(!cfg||file.size>cfg.max)throw new Error('Formato nao aceito ou arquivo acima do limite.');
  const signed=await adminFetch<{entryId:string;path:string;token:string}>(api,{method:'POST',
   body:JSON.stringify({kind:'attachment',fileName:file.name,mimeType:mime,size:file.size,requiresResponse:canManageN2&&requiresResponse})});
  const uploaded=await supabaseBrowser.storage.from(TIMELINE_BUCKET)
    .uploadToSignedUrl(signed.path,signed.token,file,{contentType:mime});
  if(uploaded.error)throw uploaded.error;
  await adminFetch(api,{method:'PATCH',body:JSON.stringify({entryId:signed.entryId})});
  setPending(null);setRequiresResponse(false);await load();onChanged?.();
 }catch(e){setError(e instanceof Error?e.message:'Falha no envio do anexo.');}
 finally{setSending(false);}}
 return <section className="mt-4 rounded-xl border bg-white p-3" aria-label="Historico multimidia do pedido">
  <div className="flex items-center justify-between gap-2"><h3 className="text-base font-black">Historico de mensagens e anexos</h3>
   <button type="button" onClick={()=>void load().catch(e=>setError(String(e)))} className="rounded-lg border px-3 py-1 text-xs">Atualizar</button></div>
  <p className="mt-1 text-xs text-slate-600">Mensagens, fotos, videos e audios ficam vinculados a esta solicitacao.</p>
  <p role="status" className="mt-2 rounded-lg bg-orange-50 p-2 text-xs font-bold text-[#62350b]">Próxima ação: {waitingLabel}</p>
  <div className="mt-3 max-h-[50svh] space-y-2 overflow-y-auto" aria-live="polite">
   {entries.length===0&&<p className="text-sm text-slate-500">Nenhuma interacao registrada.</p>}
   {entries.map(e=><div key={e.id} className="rounded-lg border bg-slate-50 p-3 text-sm">
    <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600"><strong>{e.author}</strong><span>{format(e.occurredAt)}</span></div>
    {e.origin==='whatsapp_import'&&<p className="mt-1 text-[11px] text-amber-800">Historico WhatsApp importado; data informada no arquivo (importado em {format(e.importedAt)}).</p>}
    {e.type==='status'&&<p className="mt-1">Status: {e.body}</p>}
    {e.type==='message'&&<p className="mt-1 whitespace-pre-wrap">{e.body}</p>}
    {e.type==='attachment'&&<div className="mt-2">
      {e.url && e.mimeType?.startsWith('audio/') ? <audio controls preload="none" className="w-full" src={e.url}>Audio</audio>
       :e.url&&e.mimeType?.startsWith('video/')?<video controls preload="none" className="max-h-72 w-full" src={e.url}>Video</video>
       :null}
      {e.url?<a href={e.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-xs text-blue-800 underline">Abrir anexo privado: {e.name}</a>
       :<p className="text-xs text-rose-700">Anexo indisponivel.</p>}
    </div>}
   </div>)}
  </div>
  <div className="mt-3 space-y-2 border-t pt-3">
   {canManageN2&&<label className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs">
     <input type="checkbox" className="mt-0.5" disabled={sending||!['pending','in_review','need_info'].includes(requestStatus??'')} checked={requiresResponse} onChange={e=>setRequiresResponse(e.target.checked)}/>
     <span><strong>Solicitar resposta do cliente.</strong> Ao enviar esta mensagem ou áudio, o pedido ficará aguardando o cliente. Ao receber uma resposta, voltará automaticamente ao N2 para orçamento.</span>
   </label>}
   <label className="block text-sm font-semibold">Escrever resposta<textarea className="mt-1 w-full rounded-lg border p-2 text-sm" rows={2}
    maxLength={3000} value={text} onChange={e=>setText(e.target.value)} placeholder="Mensagem sobre este pedido..."/></label>
   <button type="button" disabled={sending||!text.trim()} onClick={()=>void sendText()} className="rounded-lg bg-orange-400 px-4 py-2 text-sm font-bold disabled:opacity-40">Enviar texto</button>
   <div className="flex flex-wrap items-center gap-2">
    <AiAudioRecorder disabled={sending} onFile={file=>setPending(file)}/>
    <label className="rounded-lg border px-3 py-2 text-sm">Anexar foto, audio ou video
      <input type="file" className="mt-1 block w-full text-xs" accept="image/jpeg,image/png,image/webp,audio/*,video/mp4,video/webm,.ogg,.opus,.m4a" onChange={e=>setPending(e.target.files?.[0]??null)}/>
    </label>
   </div>
   {pending&&<div className="rounded-lg bg-orange-50 p-2 text-xs"><p>{pending.name} ({(pending.size/1024).toFixed(0)} KB)</p>
      {pending.type.startsWith('audio/')&&<PendingAudio file={pending} />}
      <button type="button" disabled={sending} onClick={()=>void sendFile(pending)} className="mt-2 rounded-lg bg-orange-400 px-3 py-2 font-bold">Enviar arquivo</button>
      <button type="button" disabled={sending} onClick={()=>setPending(null)} className="ml-2 rounded-lg border px-3 py-2">Descartar</button>
   </div>}
   {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
  </div>
 </section>;
}
