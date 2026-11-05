'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabaseBrowser} from '@/lib/supabase-browser';
const base='/solucoes/atendimento-inteligente/rmc';
export function AiHeaderActions({backHref}:{backHref?:string}){
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);
 useEffect(()=>{
  let active=true;
  supabaseBrowser.auth.getSession().then(({data})=>{if(active)setAuthenticated(Boolean(data.session));}).catch(()=>{if(active)setAuthenticated(false);});
  const {data:listener}=supabaseBrowser.auth.onAuthStateChange((_event,session)=>{if(active)setAuthenticated(Boolean(session));});
  return()=>{active=false;listener.subscription.unsubscribe();};
 },[]);
 return <nav aria-label="Navegacao RMC" className="flex gap-1.5 text-xs font-bold sm:gap-2 sm:text-sm">
  {backHref?<Link href={backHref} className="rounded-full border px-3 py-2">Voltar</Link>:
    <Link href={`${base}/solicitar`} className="rounded-full bg-[#ef8924] px-3 py-2 text-[#242b31]">Solicitar</Link>}
  {authenticated===false&&<Link href={`${base}/entrar`} className="rounded-full border px-3 py-2">Entrar</Link>}
 </nav>;
}
