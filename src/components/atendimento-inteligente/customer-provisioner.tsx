'use client';
import { useEffect,useState,type FormEvent } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';

type Actor={role:'operator'|'customer';name:string};
const input='mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm';
export function AiCustomerProvisioner(){
 const [status,setStatus]=useState<'loading'|'operator'|'public'>('loading');
 const [organizationId,setOrganizationId]=useState('');
 const [fullName,setFullName]=useState('');
 const [phone,setPhone]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=>{
   let mounted=true;
   async function load(){
    const {data}=await supabaseBrowser.auth.getSession();
    if(!data.session)return;
    const actor=await adminFetch<Actor>('/api/atendimento-inteligente/actor');
    if(actor.role!=='operator')return;
    const orgs=await adminFetch<{organizations:{id:string;slug:string}[]}>('/api/atendimento-inteligente/organizations');
    const id=orgs.organizations.find(o=>o.slug==='reparos-rmc')?.id;
    if(id&&mounted){setOrganizationId(id);setStatus('operator');}
   }
   load().catch(()=>null).finally(()=>{if(mounted)setStatus(s=>s==='loading'?'public':s);});
   return ()=>{mounted=false;};
 },[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setNotice('');
  if(password!==confirm){setError('As senhas digitadas nao coincidem.');return;}
  setBusy(true);
  try {
   await adminFetch('/api/atendimento-inteligente/customers',{method:'POST',body:JSON.stringify({organizationId,fullName,phone,email,password})});
   setNotice('Cadastro assistido salvo. A conta do cliente permanecerá bloqueada até a verificação e liberação individual.');
   setFullName('');setPhone('');setEmail('');setPassword('');setConfirm('');
  }catch(e){setError(e instanceof Error?e.message:'Falha no cadastro.');}
  finally{setBusy(false);}
 }
 if(status==='loading')return <p className="rounded-xl bg-white p-6 text-sm">Verificando acesso...</p>;
 if(status==='public')return <section className="rounded-2xl bg-white p-6 shadow">
  <h1 className="text-2xl font-black text-[#173d53]">Cadastro RMC</h1>
  <p className="mt-3 text-sm text-slate-600">Nesta fase, a equipe registra seus dados com sua autorização. Você continua conversando pelo WhatsApp comercial da Reparos RMC. O acesso individual será disponibilizado após a validação da identidade.</p>
  <Link className="mt-5 inline-flex rounded-full bg-[#ef8924] px-5 py-3 text-sm font-bold" href="/solucoes/atendimento-inteligente/rmc/entrar">Já tenho acesso</Link>
 </section>;
 return <form className="rounded-2xl bg-white p-5 shadow" onSubmit={submit}>
  <p className="text-xs font-bold uppercase text-orange-700">Cadastro assistido • Equipe autorizada</p>
  <h1 className="mt-2 text-2xl font-black text-[#153c50]">Cadastrar cliente RMC</h1>
  <p className="mt-2 text-xs text-slate-600">Cada cliente recebe senha individual, nunca compartilhada. Não encaminhe o acesso antes de verificar a identidade e autorizar o portal.</p>
  <div className="mt-5 space-y-3">
   <label className="block text-sm font-bold">Nome completo<input className={input} required value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={120}/></label>
   <label className="block text-sm font-bold">WhatsApp com DDD<input className={input} required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(19) 99999-9999"/></label>
   <label className="block text-sm font-bold">E-mail (opcional)<input className={input} type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label className="block text-sm font-bold">Senha individual (mínimo 12 caracteres)<input className={input} type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label className="block text-sm font-bold">Confirmar senha<input className={input} type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
  </div>
  {error&&<p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
  {notice&&<p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>}
  <button type="submit" disabled={busy} className="mt-5 rounded-full bg-[#ef8924] px-5 py-3 text-sm font-bold disabled:opacity-50">{busy?'Cadastrando...':'Cadastrar cliente'}</button>
  <Link href="/solucoes/atendimento-inteligente/rmc/solicitar" className="ml-3 text-sm font-bold underline">Voltar aos pedidos</Link>
 </form>;
}
