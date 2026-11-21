'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AiBrandHeader} from '@/components/atendimento-inteligente/brand-header';
import {adminFetch} from '@/lib/admin-fetch';
import {supabaseBrowser} from '@/lib/supabase-browser';
import {AiRequestTimeline} from '@/components/atendimento-inteligente/request-timeline';
import {REQUEST_STAGES,type RequestStage} from '@/lib/atendimento-inteligente/intake';
type Item={id:string;category:string;description:string;status:string;awaiting_response_from?:string|null;created_at:string;requested_at?:string|null;property_address:string|null;on_behalf_of?:boolean;beneficiary_name?:string|null;beneficiary_phone?:string|null;beneficiary_contact_channel?:string|null};
const base='/solucoes/atendimento-inteligente/rmc';
export default function RmcMyRequests(){
 const router=useRouter();const [items,setItems]=useState<Item[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [expandedId,setExpandedId]=useState('');
 useEffect(()=>{
  let mounted=true;
  async function load(){
   const {data}=await supabaseBrowser.auth.getSession();
   if(!data.session){router.replace(`${base}/entrar`);return;}
   const actor=await adminFetch<{role:'customer'|'operator';portalEnabled:boolean;mustChangePassword:boolean}>('/api/atendimento-inteligente/actor');
   if(actor.role==='operator'){router.replace(`${base}/atendimento`);return;}
   if(!actor.portalEnabled){router.replace(`${base}/entrar`);return;}
   if(actor.mustChangePassword){router.replace(`${base}/trocar-senha`);return;}
   const result=await adminFetch<{requests:Item[]}>('/api/atendimento-inteligente/my/requests');
   if(mounted)setItems(result.requests);
  }
  load().catch(e=>{if(mounted)setError(e instanceof Error?e.message:'Falha ao carregar');}).finally(()=>{if(mounted)setLoading(false);});
  return()=>{mounted=false;};
 },[router]);
 return <div className="min-h-screen bg-[#eff4f5]"><AiBrandHeader backHref={base}/><main className="mx-auto max-w-3xl p-4">
  <h1 className="text-2xl font-black text-[#163e51]">Meus pedidos</h1>
  {loading&&<p className="mt-4">Carregando...</p>}{error&&<p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
  <div className="mt-4 space-y-3">{items.map(item=><article key={item.id} className="rounded-xl bg-white p-4 shadow">
   <h2 className="font-bold">{item.category}</h2>{item.on_behalf_of && <p className="mt-2 text-sm font-semibold text-[#173e53]">Pessoa atendida: {item.beneficiary_name} · Telefone: {item.beneficiary_phone} ({item.beneficiary_contact_channel==='requester'?'retorno pelo solicitante':item.beneficiary_contact_channel==='whatsapp'?'WhatsApp':'ligacao telefonica'})</p>}<p className="mt-1 text-xs text-slate-600">{REQUEST_STAGES[item.status as RequestStage]??item.status} • {new Date(item.requested_at??item.created_at).toLocaleDateString('pt-BR')}{item.requested_at&&' (data informada)'}</p>
   {item.awaiting_response_from&&<p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-950">{item.awaiting_response_from==='customer'?'Aguardando sua resposta':'Aguardando Anderson (N2)'}</p>}
   <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>
   <button type="button" className="mt-3 text-sm font-bold text-[#ad5f10] underline" onClick={()=>setExpandedId(id=>id===item.id?'':item.id)}>
     {expandedId===item.id?'Fechar conversa':'Abrir conversa e anexos'}
   </button>
   {expandedId===item.id&&<AiRequestTimeline requestId={item.id}/>}
  </article>)}{!loading&&!error&&items.length===0&&<p className="rounded-xl bg-white p-4 text-sm">Nenhum pedido localizado.</p>}</div>
  <Link className="mt-5 inline-flex rounded-lg bg-[#ef8924] px-5 py-3 text-sm font-bold" href={`${base}/solicitar`}>Novo pedido</Link>
 </main></div>;
}
