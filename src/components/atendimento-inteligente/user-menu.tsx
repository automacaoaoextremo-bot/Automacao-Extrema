'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
type Actor={name:string;role:'operator'|'customer'};
export function AiUserMenu(){
 const [actor,setActor]=useState<Actor|null>(null);
 const router=useRouter();
 useEffect(()=>{
   let active=true;
   supabaseBrowser.auth.getSession().then(({data})=>{
    if(!data.session)return;
    return adminFetch<Actor>('/api/atendimento-inteligente/actor').then(result=>{if(active)setActor(result);});
   }).catch(()=>null);
   return()=>{active=false;};
 },[]);
 if(!actor)return null;
 return <div className="flex min-w-0 items-center gap-2 text-[11px] sm:text-sm">
  <span className="max-w-[125px] truncate font-semibold text-[#1b3e53] sm:max-w-[230px]">{actor.name}</span>
  <button type="button" onClick={()=>{void supabaseBrowser.auth.signOut().then(()=>router.replace('/solucoes/atendimento-inteligente/rmc'));}}
    className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold">Sair</button>
 </div>;
}
