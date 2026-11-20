'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {adminFetch} from '@/lib/admin-fetch';

type Draft={id:string;customer_label:string;customer_phone:string;source_date:string|null;
 title:string;summary:string;suggested_status:string;review_status:string;review_note:string};
const url='/api/atendimento-inteligente/rmc/review-drafts';
const pageSize=4;
export function RmcReviewDrafts(){
 const [drafts,setDrafts]=useState<Draft[]>([]);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [page,setPage]=useState(1);const [expanded,setExpanded]=useState<string|null>(null);
 const pages=Math.max(1,Math.ceil(drafts.length/pageSize));
 const currentPage=Math.min(page,pages);
 const visible=useMemo(()=>drafts.slice((currentPage-1)*pageSize,currentPage*pageSize),[drafts,currentPage]);
 const load=useCallback(async()=>{const r=await adminFetch<{drafts:Draft[]}>(url);setDrafts(r.drafts);},[]);
 useEffect(()=>{let active=true;adminFetch<{drafts:Draft[]}>(url).then(r=>{if(active)setDrafts(r.drafts);})
 .catch(e=>{if(active)setError(e instanceof Error?e.message:'Falha ao carregar rascunhos.');});
 return()=>{active=false;};},[]);
 async function setReview(d:Draft,status:'approved_for_manual_entry'|'rejected'|'pending'){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{await adminFetch(url,{method:'PATCH',body:JSON.stringify({id:d.id,reviewStatus:status,note:notes[d.id]??d.review_note??''})});
   await load();setExpanded(null);setNotice('Decisão registrada. O N1 deve cadastrar o pedido oficial após confirmar endereço e dados faltantes.');
  }catch(e){setError(e instanceof Error?e.message:'Falha ao salvar decisão.');}finally{setBusy(false);}
 }
 return <section className="rounded-2xl border bg-white p-3 shadow-sm sm:p-5" aria-label="Rascunhos do WhatsApp para revisão">
 <h2 className="text-lg font-black text-[#143e31]">Solicitações de WhatsApp — revisão N2 ({drafts.length})</h2>
 <p className="mt-1 text-xs text-slate-600">Aprovar uma prévia não cria pedido nem altera orçamento. A equipe N1 confirma os dados antes do registro oficial.</p>
 {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
 {notice&&<p role="status" className="mt-3 rounded-lg bg-green-50 p-2 text-sm text-green-700">{notice}</p>}
 <div className="mt-3 grid gap-3 sm:grid-cols-2">
 {visible.map(d=><article key={d.id} className="rounded-xl border bg-[#f7faf8] p-3">
  <p className="font-bold">{d.customer_label} · {d.title}</p>
  <p className="mt-1 text-xs">Origem: {d.source_date??'Data não informada'} · Proposta: {d.suggested_status} · Revisão: {d.review_status}</p>
  {expanded === d.id ? <>
   <p className="mt-2 whitespace-pre-wrap text-sm">{d.summary}</p>
   <label className="mt-2 block text-xs font-semibold">Observações N2
    <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={2} maxLength={1000} value={notes[d.id]??d.review_note??''}
      onChange={e=>setNotes(old=>({...old,[d.id]:e.target.value}))}/></label>
   <div className="mt-2 flex flex-wrap gap-2">
    <button type="button" disabled={busy} onClick={()=>void setReview(d,'approved_for_manual_entry')} className="rounded-lg bg-[#143e31] px-3 py-2 text-xs font-semibold text-white">Confirmar para N1</button>
    <button type="button" disabled={busy} onClick={()=>void setReview(d,'rejected')} className="rounded-lg border px-3 py-2 text-xs">Não cadastrar</button>
    <button type="button" disabled={busy} onClick={()=>void setReview(d,'pending')} className="rounded-lg border px-3 py-2 text-xs">Rever depois</button>
    <button type="button" onClick={()=>setExpanded(null)} className="rounded-lg border px-3 py-2 text-xs">Fechar</button>
   </div>
  </> : <button type="button" onClick={()=>setExpanded(d.id)} className="mt-3 rounded-lg border border-[#143e31] px-3 py-2 text-xs font-semibold">Abrir revisão</button>}
 </article>)}
 {drafts.length===0&&<p className="col-span-full rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Nenhum rascunho importado. O histórico do WhatsApp não é inserido automaticamente pela publicação.</p>}
 </div>
 {drafts.length>pageSize&&<nav aria-label="Paginação da revisão" className="mt-4 flex items-center justify-between gap-2 text-xs">
  <button type="button" disabled={currentPage<=1} onClick={()=>{setPage(p=>Math.max(1,p-1));setExpanded(null);}} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button>
  <span>Página {currentPage} de {pages}</span>
  <button type="button" disabled={currentPage>=pages} onClick={()=>{setPage(p=>Math.min(pages,p+1));setExpanded(null);}} className="rounded-lg border px-3 py-2 disabled:opacity-40">Próxima</button>
 </nav>}
 </section>;
}
