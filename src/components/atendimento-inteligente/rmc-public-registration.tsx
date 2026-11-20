'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { normalizeBRPhone } from '@/lib/atendimento-inteligente/intake';

const base='/solucoes/atendimento-inteligente/rmc';
const field='mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100';

/** Nao exige N1/N2, convite, aprovacao ou lista de usuarios-piloto. */
export function RmcPublicRegistration({ existingSession=false }: { existingSession?:boolean }) {
  const router=useRouter();
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [show,setShow]=useState(false);
  const [code,setCode]=useState('');
  const [step,setStep]=useState<'form'|'sms'|'email'|'done'>('form');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(busy)return;
    setError('');
    const normalized=normalizeBRPhone(phone);
    if(!normalized){setError('Informe um WhatsApp valido com DDD.');return;}
    if(name.trim().length<3){setError('Informe seu nome completo.');return;}
    if(!existingSession && (password.length<8 || password.length>72 ||
      [/[A-Z]/,/[a-z]/,/\d/,/[^\w]/].filter(re=>re.test(password)).length<3)){
      setError('Use senha de 8 a 72 caracteres, com 3 tipos entre letras, numeros e simbolos.');return;
    }
    setBusy(true);
    try{
      if(existingSession){
        await adminFetch('/api/atendimento-inteligente/customers/self-register',{
          method:'POST',body:JSON.stringify({fullName:name.trim(),phone:normalized}),
        });
        setStep('done');router.replace(`${base}/solicitar`);router.refresh();return;
      }
      const usingEmail=email.trim().length>0;
      const metadata={ae_ai_full_name:name.trim(),ae_ai_phone:normalized,ae_ai_rmc_candidate:true};
      const {data,error:failure}=usingEmail
        ? await supabaseBrowser.auth.signUp({email:email.trim().toLowerCase(),password,
            options:{data:metadata,emailRedirectTo:`${window.location.origin}${base}/entrar`}})
        : await supabaseBrowser.auth.signUp({phone:`+${normalized}`,password,options:{data:metadata}});
      if(failure)throw failure;
      if(!data.user || (data.user.identities && data.user.identities.length===0))
        throw new Error('Conta ja existente. Use Entrar ou Esqueci minha senha.');
      setPassword('');
      if(data.session){
        await adminFetch('/api/atendimento-inteligente/customers/self-register',{
          method:'POST',body:JSON.stringify({fullName:name.trim(),phone:normalized}),
        });
        setStep('done');router.replace(`${base}/solicitar`);router.refresh();return;
      }
      setStep(usingEmail?'email':'sms');
    }catch(err){setError(err instanceof Error?err.message:'Nao foi possivel cadastrar. Confira os dados.');}
    finally{setBusy(false);}
  }

  async function verifySms(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); if(busy)return;
    setError('');setBusy(true);
    try{
      const normalized=normalizeBRPhone(phone);
      if(!normalized)throw new Error('WhatsApp invalido.');
      const {error:failure}=await supabaseBrowser.auth.verifyOtp({phone:`+${normalized}`,token:code.trim(),type:'sms'});
      if(failure)throw failure;
      await adminFetch('/api/atendimento-inteligente/customers/self-register',{
        method:'POST',body:JSON.stringify({fullName:name.trim(),phone:normalized}),
      });
      setCode('');setStep('done');router.replace(`${base}/solicitar`);router.refresh();
    }catch(err){setError(err instanceof Error?err.message:'Nao foi possivel verificar o codigo.');}
    finally{setBusy(false);}
  }

  return <section className="mx-auto w-full max-w-md rounded-[26px] bg-[#143e31] p-2.5 shadow-lg" aria-label="Cadastro de clientes Reparos RMC">
    <div className="rounded-2xl bg-white px-4 py-5 text-[#173b4c] sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700">Reparos RMC</p>
      <h1 className="mt-2 text-2xl font-black">{existingSession?'Concluir meu cadastro':'Cadastrar como cliente'}</h1>
      <p className="mt-2 text-sm text-slate-700">Cadastro aberto a todos os clientes, sem autorizacao N1 ou N2. A verificacao de e-mail ou celular protege seus pedidos.</p>
      {step==='form' && <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-sm font-semibold">Nome completo
          <input className={field} required minLength={3} maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/>
        </label>
        <label className="block text-sm font-semibold">WhatsApp/celular com DDD
          <input className={field} required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(19) 99999-9999" />
        </label>
        {!existingSession && <>
          <label className="block text-sm font-semibold">E-mail (opcional)
            <input className={field} type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" />
          </label>
          <p className="text-xs text-slate-600">Com e-mail, a confirmacao e enviada para o e-mail. Sem e-mail, a confirmacao utiliza SMS, que precisa estar configurado no Supabase.</p>
          <label className="block text-sm font-semibold">Crie sua senha
            <span className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-300">
              <input className="min-w-0 flex-1 px-3 py-2.5 outline-none" type={show?'text':'password'} autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)}/>
              <button className="px-3 text-xs font-bold" type="button" onClick={()=>setShow(!show)}>{show?'Ocultar':'Mostrar'}</button>
            </span>
          </label>
        </>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#143e31] p-3 font-bold text-white disabled:opacity-50">{busy?'Aguarde...':existingSession?'Concluir cadastro':'Criar minha conta'}</button>
      </form>}
      {step==='sms' && <form className="mt-4 space-y-3" onSubmit={verifySms}>
        <p className="text-sm">Digite o codigo de verificacao enviado por SMS.</p>
        <label className="block text-sm font-bold">Codigo
          <input className={field} inputMode="numeric" autoComplete="one-time-code" minLength={4} maxLength={8} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,8))}/>
        </label>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#143e31] p-3 font-bold text-white disabled:opacity-50">Confirmar numero</button>
      </form>}
      {step==='email' && <p role="status" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm">Enviamos instrucoes para confirmar seu e-mail. Confirme o endereco e depois use <Link className="font-bold underline" href={`${base}/entrar`}>Entrar</Link> para concluir automaticamente o cadastro.</p>}
      {step==='done' && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm">Cadastro concluido. Voce pode solicitar um servico.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <Link href={`${base}/entrar`} className="mt-4 block rounded-xl border p-3 text-center text-sm font-semibold">Ja tenho acesso</Link>
    </div>
  </section>;
}
