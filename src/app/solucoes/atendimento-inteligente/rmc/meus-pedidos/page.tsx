'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AiBrandHeader} from '@/components/atendimento-inteligente/brand-header';
import {adminFetch} from '@/lib/admin-fetch';
import {supabaseBrowser} from '@/lib/supabase-browser';
import {REQUEST_STAGES,type RequestStage} from '@/lib/atendimento-inteligente/intake';
type Item={id:string;category:string;description:string;status:string;created_at:string;property_address:string|null};
const base='/solucoes/atendimento-inteligente/rmc';
export default function RmcMyRequests(){
 const router=useRouter();const [items,setItems]=useState<Item[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
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
   <h2 className="font-bold">{item.category}</h2><p className="mt-1 text-xs text-slate-600">{REQUEST_STAGES[item.status as RequestStage]??item.status} • {new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
   <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>
  </article>)}{!loading&&!error&&items.length===0&&<p className="rounded-xl bg-white p-4 text-sm">Nenhum pedido localizado.</p>}</div>
  <Link className="mt-5 inline-flex rounded-lg bg-[#ef8924] px-5 py-3 text-sm font-bold" href={`${base}/solicitar`}>Novo pedido</Link>
 </main></div>;
}
