'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { AiCustomerProvisioner } from './customer-provisioner';
import { RmcPublicRegistration } from './rmc-public-registration';

const base='/solucoes/atendimento-inteligente/rmc';
type Access='loading'|'operator'|'customer'|'guest'|'authenticated';

/** N1 continua com cadastro assistido; publico nao exige permissao de operador. */
export function RmcRegistrationGate(){
  const [access,setAccess]=useState<Access>('loading');
  const [activeCustomer,setActiveCustomer]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    let mounted=true;let version=0;
    async function check(){
      const current=++version;
      try{
        const {data}=await supabaseBrowser.auth.getSession();
        if(!data.session){if(mounted&&current===version)setAccess('guest');return;}
        try{
          const actor=await adminFetch<{role:'operator'|'customer';portalEnabled:boolean}>('/api/atendimento-inteligente/actor');
          if(mounted&&current===version){setAccess(actor.role);setActiveCustomer(actor.role==='customer'&&actor.portalEnabled);}
        }catch{if(mounted&&current===version)setAccess('authenticated');}
      }catch{if(mounted&&current===version)setAccess('guest');}
    }
    void check();
    const {data:listener}=supabaseBrowser.auth.onAuthStateChange(()=>{void Promise.resolve().then(check);});
    return ()=>{mounted=false;version++;listener.subscription.unsubscribe();};
  },[]);

  async function activate(){
    setBusy(true);setError('');
    try{
      await adminFetch('/api/atendimento-inteligente/customers/self-register',{method:'POST',body:'{}'});
      const actor=await adminFetch<{portalEnabled:boolean}>('/api/atendimento-inteligente/actor');
      if(!actor.portalEnabled)throw new Error('Verifique seu e-mail ou celular antes de continuar.');
      setActiveCustomer(true);
    }catch(e){setError(e instanceof Error?e.message:'Falha ao concluir cadastro.');}
    finally{setBusy(false);}
  }

  if(access==='loading')return <p role="status" className="rounded-xl bg-white p-5 text-sm">Verificando sessao...</p>;
  if(access==='operator')return <AiCustomerProvisioner/>;
  if(access==='customer')return <section className="rounded-2xl bg-white p-5 shadow">
    <h1 className="text-xl font-black text-[#173d53]">Meu cadastro RMC</h1>
    {activeCustomer?<>
      <p className="mt-2 text-sm">Sua conta esta ativa. Voce pode solicitar um servico ou consultar seus pedidos.</p>
      <Link className="mt-4 inline-flex rounded-xl bg-[#143e31] px-4 py-3 text-sm font-bold text-white" href={`${base}/solicitar`}>Solicitar servico</Link>
    </>:<>
      <p className="mt-2 text-sm">Sua conta ja existe. Confirme seu e-mail ou celular e conclua o cadastro sem aprovacao de operador.</p>
      <button type="button" disabled={busy} onClick={activate} className="mt-4 rounded-xl bg-[#143e31] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Verificando...':'Concluir meu acesso'}</button>
      {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    </>}
  </section>;
  return <RmcPublicRegistration existingSession={access==='authenticated'}/>;
}
