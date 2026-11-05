'use client';
import { useState,type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { normalizeBRPhone } from '@/lib/atendimento-inteligente/intake';

type Actor={role:'operator'|'customer';portalEnabled:boolean;mustChangePassword:boolean};
const base='/solucoes/atendimento-inteligente/rmc';
export default function RmcLogin(){
 const router=useRouter();
 const [login,setLogin]=useState('');const [password,setPassword]=useState('');
 const [show,setShow]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function onSubmit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');
  try{
   const isEmail=login.includes('@');
   const phone=!isEmail?normalizeBRPhone(login):null;
   if(!isEmail&&!phone)throw new Error('Informe o WhatsApp com DDD ou um e-mail válido.');
   const credentials=isEmail?{email:login.trim().toLowerCase(),password}:{phone:`+${phone}`,password};
   const {error:authError}=await supabaseBrowser.auth.signInWithPassword(credentials);
   if(authError)throw new Error('Não foi possível entrar. Verifique os dados e a confirmação do telefone.');
   const actor=await adminFetch<Actor>('/api/atendimento-inteligente/actor');
   if(actor.role==='operator'){router.replace(`${base}/atendimento`);router.refresh();return;}
   if(!actor.portalEnabled){await supabaseBrowser.auth.signOut();throw new Error('Seu acesso individual ainda não foi liberado. A equipe continuará acompanhando seus pedidos.');}
   router.replace(actor.mustChangePassword?`${base}/trocar-senha`:`${base}/meus-pedidos`);router.refresh();
  }catch(err){setError(err instanceof Error?err.message:'Falha ao entrar.');}
  finally{setBusy(false);}
 }
 return <div className="min-h-screen bg-[#eff4f5]"><AiBrandHeader backHref={base}/>
  <main className="mx-auto max-w-md px-4 py-8"><form onSubmit={onSubmit} className="rounded-3xl border bg-white p-6 shadow-xl">
   <p className="text-xs font-bold uppercase tracking-widest text-[#b46922]">Reparos RMC • Acesso</p>
   <h1 className="mt-2 text-2xl font-black text-[#193e53]">Entre para continuar</h1>
   <p className="mt-2 text-sm text-slate-600">Clientes e equipe usam a mesma tela. Cada conta tem permissões e informações próprias.</p>
   <label className="mt-5 block text-sm font-bold">WhatsApp com DDD ou e-mail
     <input className="mt-2 w-full rounded-xl border p-3" required value={login} onChange={e=>setLogin(e.target.value)} autoComplete="username"/></label>
   <label className="mt-4 block text-sm font-bold">Senha
     <div className="mt-2 flex overflow-hidden rounded-xl border"><input className="min-w-0 flex-1 p-3" required type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/>
       <button type="button" className="px-3 text-sm" onClick={()=>setShow(s=>!s)}>{show?'Ocultar':'Mostrar'}</button></div></label>
   {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
   <button disabled={busy} className="mt-5 w-full rounded-xl bg-[#193e53] px-4 py-3 font-bold text-white disabled:opacity-50">{busy?'Verificando...':'Entrar'}</button>
   <Link href={`${base}/cadastro`} className="mt-4 block text-center text-sm font-semibold underline">Ainda não tem cadastro?</Link>
   <p className="mt-4 text-xs text-slate-600">Na homologação, o cadastro dos clientes é assistido pela equipe. O acesso individual só será liberado após verificação.</p>
  </form></main></div>;
}
