'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { normalizeBRPhone } from '@/lib/atendimento-inteligente/intake';
const base='/solucoes/atendimento-inteligente/rmc';
const enabled=process.env.NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED==='true';
const field='mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-base focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100';

export function RmcPublicRegistration(){
 const [name,setName]=useState('');const [phone,setPhone]=useState('');const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');const [show,setShow]=useState(false);const [code,setCode]=useState('');
 const [step,setStep]=useState<'register'|'verify'|'done'>('register');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function begin(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!enabled)return;
  setError('');const normalized=normalizeBRPhone(phone);
  if(!normalized){setError('Informe um WhatsApp válido com DDD.');return;}
  if(name.trim().length<3){setError('Informe seu nome completo.');return;}
  if(password.length<12){setError('Use uma senha com ao menos 12 caracteres.');return;}
  setBusy(true);
  try{
   const {error:failure}=await supabaseBrowser.auth.signUp({phone:`+${normalized}`,password,
    options:{data:{ae_ai_full_name:name.trim(),ae_ai_contact_email:email.trim().toLowerCase(),ae_ai_rmc_candidate:true}}});
   if(failure)throw failure;
   setStep('verify');
  }catch{setError('Não foi possível iniciar o cadastro. Se você já tem conta, utilize Entrar ou entre em contato com a equipe.');}
  finally{setBusy(false);}
 }
 async function verify(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');setBusy(true);
  try{const normalized=normalizeBRPhone(phone);if(!normalized)throw new Error();
   const {error:failure}=await supabaseBrowser.auth.verifyOtp({phone:`+${normalized}`,token:code.trim(),type:'sms'});
   if(failure)throw failure;
   await adminFetch('/api/atendimento-inteligente/customers/self-register',{method:'POST',body:'{}'});
   setStep('done');
  }catch{setError('Não foi possível confirmar o código. Verifique a mensagem recebida ou solicite ajuda à equipe.');}
  finally{setBusy(false);}
 }
 return <section className="mx-auto w-full max-w-lg rounded-[28px] bg-[#143e31] p-3 shadow-xl">
  <div className="rounded-2xl bg-white p-5 sm:p-6">
   <p className="text-xs font-black uppercase tracking-widest text-[#b46824]">Reparos RMC • Primeiro acesso</p>
   <h1 className="mt-2 text-2xl font-black text-[#173e50]">Cadastre-se para solicitar serviços</h1>
   {!enabled?<>
     <p className="mt-3 text-sm leading-relaxed text-slate-600">O cadastro direto está sendo preparado para a próxima etapa. Durante a homologação, nossa equipe registra seus dados e solicitações com sua autorização. Você não precisa criar uma senha aqui ainda.</p>
     <p className="mt-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-900">Continue usando o WhatsApp comercial da Reparos RMC para pedir atendimento. Quando o acesso individual estiver disponível, sua identidade será verificada antes da liberação.</p>
     <Link href={`${base}/entrar`} className="mt-5 block rounded-xl border p-3 text-center text-sm font-bold">Já tenho acesso</Link>
   </>:step==='register'?<form onSubmit={begin} className="mt-4 space-y-3 text-[#173b4c]">
     <label className="block text-sm font-bold">Nome completo<input className={field} required minLength={3} maxLength={120} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" /></label>
     <label className="block text-sm font-bold">WhatsApp/celular (obrigatório)<input className={field} required inputMode="tel" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(19) 99999-9999" /></label>
     <label className="block text-sm font-bold">E-mail (opcional)<input className={field} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" /></label>
     <label className="block text-sm font-bold">Senha (12 caracteres ou mais)<span className="mt-2 flex overflow-hidden rounded-xl border"><input className="min-w-0 flex-1 p-3 text-base outline-none" type={show?'text':'password'} autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setShow(x=>!x)} className="px-3 text-xs font-semibold">{show?'Ocultar':'Mostrar'}</button></span></label>
     <p className="text-xs text-slate-600">Enviaremos um código para verificar a posse do celular. O cadastro não confirma automaticamente serviços ou valores.</p>
     <button disabled={busy} className="w-full rounded-xl bg-[#143e31] p-3 font-bold text-white disabled:opacity-50">{busy?'Aguarde...':'Criar meu acesso'}</button>
   </form>:step==='verify'?<form onSubmit={verify} className="mt-4 space-y-3"><p className="text-sm">Digite o código recebido por SMS no celular informado.</p>
     <label className="block text-sm font-bold">Código de verificação<input className={field} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,8))} inputMode="numeric" minLength={4} required/></label>
     <button disabled={busy} className="w-full rounded-xl bg-[#143e31] p-3 font-bold text-white">{busy?'Verificando...':'Confirmar celular'}</button>
   </form>:<p role="status" className="mt-4 text-sm text-green-800">Celular verificado e cadastro registrado. <Link href={`${base}/entrar`} className="font-bold underline">Entrar</Link> para continuar. A solicitação de serviços depende da liberação do portal.</p>}
   {error&&<p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
   <Link className="mt-4 block text-center text-sm font-semibold underline" href={base}>Voltar à Reparos RMC</Link>
  </div>
 </section>;
}
