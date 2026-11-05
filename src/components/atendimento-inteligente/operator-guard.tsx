'use client';
import { useEffect,useState,type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { AiBrandHeader } from './brand-header';
const base='/solucoes/atendimento-inteligente/rmc';
export function AiOperatorGuard({children}:{children:ReactNode}){
 const router=useRouter();const [ready,setReady]=useState(false);const [denied,setDenied]=useState(false);
 useEffect(()=>{
  let active=true;
  async function verify(){
   const {data}=await supabaseBrowser.auth.getSession();
   if(!data.session){router.replace(`${base}/entrar`);return;}
   const actor=await adminFetch<{role:'operator'|'customer'}>('/api/atendimento-inteligente/actor');
   if(!active)return;
   if(actor.role==='operator')setReady(true);
   else {setDenied(true);router.replace(`${base}/meus-pedidos`);}
  }
  verify().catch(()=>{if(active){setDenied(true);router.replace(`${base}/entrar`);}});
  const {data:listener}=supabaseBrowser.auth.onAuthStateChange((_event,session)=>{if(!session)router.replace(`${base}/entrar`);});
  return()=>{active=false;listener.subscription.unsubscribe();};
 },[router]);
 return <><AiBrandHeader/>{ready?children:<main className="min-h-[55vh] p-8 text-center text-sm">{denied?'Acesso restrito a equipe.':'Validando permissões...'}</main>}</>;
}
