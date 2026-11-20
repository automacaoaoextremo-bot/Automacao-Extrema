'use client';

import { useState,type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { normalizeBRPhone } from '@/lib/atendimento-inteligente/intake';

type Actor={role:'operator'|'customer';portalEnabled:boolean;mustChangePassword:boolean};
const base='/solucoes/atendimento-inteligente/rmc';
const field='mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-[#ed8e2d] focus:ring-2 focus:ring-orange-100';

/** Login do cliente sem exigencia de aprovacao N1; perfis administrativos separados. */
export function RmcLoginForm({returnTo='dashboard'}:{returnTo?:'dashboard'|'request'|'registration'}){
  const router=useRouter();
  const [login,setLogin]=useState('');
  const [password,setPassword]=useState('');
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;
    setBusy(true);setError('');
    try{
      const value=login.trim();const email=value.includes('@');
      const phone=email?null:normalizeBRPhone(value);
      if(!email&&!phone)throw new Error('Informe WhatsApp com DDD ou e-mail valido.');
      const credentials=email?{email:value.toLowerCase(),password}:{phone:`+${phone}`,password};
      const {error:authError}=await supabaseBrowser.auth.signInWithPassword(credentials);
      if(authError)throw new Error('Nao foi possivel entrar. Confira a senha ou use Esqueci minha senha.');

      let actor:Actor|null=null;
      try{actor=await adminFetch<Actor>('/api/atendimento-inteligente/actor');}catch{}
      // Contas novas confirmadas e antigos clientes pendentes podem concluir
      // cadastro sem permissao N1/N2. A API confirma a identidade no servidor.
      if(!actor || (actor.role==='customer'&&!actor.portalEnabled)){
        try{
          await adminFetch('/api/atendimento-inteligente/customers/self-register',{method:'POST',body:'{}'});
          actor=await adminFetch<Actor>('/api/atendimento-inteligente/actor');
        }catch{
          router.replace(`${base}/cadastro`);router.refresh();return;
        }
      }
      if(!actor)throw new Error('Cadastro nao encontrado. Abra a opcao Cadastrar.');
      if(actor.role==='operator'){
        router.replace(returnTo==='registration'?`${base}/cadastro`:returnTo==='request'?`${base}/solicitar`:`${base}/atendimento`);
        router.refresh();return;
      }
      if(!actor.portalEnabled){router.replace(`${base}/cadastro`);router.refresh();return;}
      router.replace(actor.mustChangePassword?`${base}/trocar-senha`:
        returnTo==='registration'?`${base}/cadastro`:
          returnTo==='request'?`${base}/solicitar`:`${base}/meus-pedidos`);
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:'Nao foi possivel entrar.');}
    finally{setBusy(false);}
  }

  return <section className="mx-auto w-full max-w-md rounded-[26px] bg-[#143e31] p-2.5 shadow-xl sm:p-4" aria-label="Acesso a Reparos RMC">
    <p className="px-2 pb-2 pt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#f3bd78]">Reparos RMC</p>
    <form onSubmit={submit} className="rounded-2xl bg-white px-4 py-4 text-[#173b4c] sm:p-6">
      <h1 className="text-[23px] font-black leading-tight">Entre para continuar</h1>
      <p className="mt-1.5 text-[13px] leading-snug text-slate-600">Acompanhe seus pedidos e organize as informacoes dos servicos.</p>
      <label className="mt-3.5 block text-sm font-bold" htmlFor="rmc-user">WhatsApp/celular ou e-mail</label>
      <input id="rmc-user" className={field} required value={login} onChange={e=>setLogin(e.target.value)} autoComplete="username" placeholder="(19) 99999-9999 ou seu@email.com"/>
      <label className="mt-3 block text-sm font-bold" htmlFor="rmc-password">Senha</label>
      <div className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-300 focus-within:border-[#ed8e2d] focus-within:ring-2 focus-within:ring-orange-100">
        <input id="rmc-password" className="min-w-0 flex-1 px-3 py-2.5 text-base outline-none" required type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/>
        <button type="button" onClick={()=>setShow(!show)} className="px-3 text-sm font-semibold">{show?'Ocultar':'Mostrar'}</button>
      </div>
      {error&&<p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}
      <button type="submit" disabled={busy} className="mt-4 w-full rounded-xl bg-[#143e31] px-4 py-2.5 font-bold text-white disabled:opacity-50">{busy?'Entrando...':'Entrar na Reparos RMC'}</button>
      <Link href={`${base}/esqueci-senha`} className="mt-2 block rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold">Esqueci minha senha</Link>
    </form>
    <div className="mt-2 rounded-2xl bg-white/10 px-4 py-3 text-white">
      <p className="text-xs font-semibold">Ainda nao tem acesso?</p>
      <Link className="mt-2 block rounded-xl bg-[#f1f4ec] px-4 py-2.5 text-center text-sm font-bold text-[#143e31]" href={`${base}/cadastro`}>Cadastrar</Link>
    </div>
  </section>;
}
