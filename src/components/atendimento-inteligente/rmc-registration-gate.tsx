'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { AiCustomerProvisioner } from './customer-provisioner';
import { RmcPublicRegistration } from './rmc-public-registration';

export function RmcRegistrationGate(){
 const [operator,setOperator]=useState<boolean | null>(null);
 useEffect(()=>{
  let active=true;
  async function check(){
   const {data}=await supabaseBrowser.auth.getSession();
   if(!data.session)return false;
   try{const actor=await adminFetch<{role:'operator'|'customer'}>('/api/atendimento-inteligente/actor');
    return actor.role==='operator';}catch{return false;}
  }
  check().then(result=>{if(active)setOperator(result);}).catch(()=>{if(active)setOperator(false);});
  return()=>{active=false;};
 },[]);
 if(operator===null)return <p className="rounded-xl bg-white p-5 text-sm">Verificando acesso...</p>;
 return operator?<AiCustomerProvisioner/>:<RmcPublicRegistration/>;
}
