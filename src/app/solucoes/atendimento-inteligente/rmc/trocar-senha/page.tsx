'use client';
import { useState,type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { adminFetch } from '@/lib/admin-fetch';
const base='/solucoes/atendimento-inteligente/rmc';
export default function RmcChangePassword(){
 const router=useRouter();const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [showPassword,setShowPassword]=useState(false);const [showConfirm,setShowConfirm]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');
  if(password!==confirm){setError('Confirme a nova senha corretamente.');return;}
  setBusy(true);
  try{await adminFetch('/api/atendimento-inteligente/me/change-password',{method:'POST',body:JSON.stringify({password})});router.replace(`${base}/meus-pedidos`);router.refresh();}
  catch(err){setError(err instanceof Error?err.message:'Falha ao alterar senha.');}finally{setBusy(false);}
 }
 return <div className="min-h-screen bg-[#eff4f5]"><AiBrandHeader backHref={base}/><main className="mx-auto max-w-md p-4"><form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow">
   <h1 className="text-2xl font-black text-[#16384b]">Definir nova senha</h1><p className="mt-2 text-sm text-slate-600">Por segurança, escolha uma senha exclusiva antes de acessar seus pedidos.</p>
   <label className="mt-4 block text-sm">Nova senha<input type={showPassword?'text':'password'} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border p-3" autoComplete="new-password"/><button type="button" className="mt-1 text-xs underline" onClick={()=>setShowPassword(x=>!x)}>{showPassword?'Ocultar senha':'Mostrar senha'}</button></label>
   <label className="mt-4 block text-sm">Confirmar senha<input type={showConfirm?'text':'password'} required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 w-full rounded-lg border p-3" autoComplete="new-password"/><button type="button" className="mt-1 text-xs underline" onClick={()=>setShowConfirm(x=>!x)}>{showConfirm?'Ocultar confirmação':'Mostrar confirmação'}</button></label>
   {error&&<p className="mt-3 text-sm text-rose-800" role="alert">{error}</p>}
   <button className="mt-5 rounded-lg bg-[#ef8924] px-5 py-3 font-bold" disabled={busy}>{busy?'Salvando...':'Atualizar senha'}</button>
 </form></main></div>;
}
