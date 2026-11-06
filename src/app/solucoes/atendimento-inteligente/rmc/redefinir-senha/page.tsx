'use client';
import { useState, useEffect, type FormEvent } from 'react';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
const base='/solucoes/atendimento-inteligente/rmc';
export default function RmcResetPassword(){
 const [ready,setReady]=useState(false);const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{let active=true;supabaseBrowser.auth.getSession().then(({data})=>{if(active)setReady(Boolean(data.session));}).catch(()=>{});
  const {data:listener}=supabaseBrowser.auth.onAuthStateChange((_event,session)=>{if(active)setReady(Boolean(session));});
  return()=>{active=false;listener.subscription.unsubscribe();};},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');if(password!==confirm){setError('As senhas não coincidem.');return;}
  if(password.length<12){setError('Use pelo menos 12 caracteres.');return;}setBusy(true);
  try{const {error:fail}=await supabaseBrowser.auth.updateUser({password});if(fail)throw fail;setDone(true);await supabaseBrowser.auth.signOut();}
  catch{setError('Falha ao redefinir senha. Solicite um novo link.');}finally{setBusy(false);}}
 return <div className="min-h-screen bg-[#eff5ef]"><AiBrandHeader backHref={`${base}/entrar`}/><main className="mx-auto max-w-md p-4"><section className="rounded-3xl bg-white p-6 shadow">
  <h1 className="text-2xl font-black text-[#173b4c]">Definir nova senha</h1>
  {done?<p role="status" className="mt-4 text-sm">Senha atualizada. <Link className="font-bold underline" href={`${base}/entrar`}>Voltar para entrar</Link></p>
    :ready?<form className="mt-4 space-y-3" onSubmit={submit}>
      <label className="block text-sm font-semibold">Nova senha<input className="mt-1 w-full rounded-xl border p-3" type="password" minLength={12} autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <label className="block text-sm font-semibold">Confirme a senha<input className="mt-1 w-full rounded-xl border p-3" type="password" minLength={12} autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-[#143e31] p-3 text-white">{busy?'Salvando...':'Salvar senha'}</button></form>
    :<p className="mt-3 text-sm">Este link ainda não foi validado ou expirou. <Link href={`${base}/esqueci-senha`} className="underline">Solicitar novo link</Link>.</p>}
 </section></main></div>;
}
