'use client';
import { useState, type FormEvent } from 'react';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
const base = '/solucoes/atendimento-inteligente/rmc';
export default function RmcForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { error: failure } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}${base}/redefinir-senha`,
      });
      if (failure) throw failure;
      setDone(true);
    } catch { setError('Não foi possível solicitar a recuperação agora. Entre em contato com a equipe RMC.'); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-[#eff5ef]"><AiBrandHeader backHref={`${base}/entrar`} />
    <main className="mx-auto max-w-md p-4"><section className="rounded-[28px] bg-[#143e31] p-4"><div className="rounded-2xl bg-white p-5">
      <h1 className="text-2xl font-black text-[#173b4c]">Recuperar senha</h1>
      <p className="mt-2 text-sm text-slate-600">Se sua conta possuir e-mail confirmado, enviaremos um link de recuperação. Para cadastro apenas com celular, procure a equipe pelo WhatsApp comercial.</p>
      <form onSubmit={submit} className="mt-5"><label className="block text-sm font-semibold" htmlFor="rmc-reset-email">E-mail cadastrado</label>
        <input id="rmc-reset-email" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border p-3" required value={email} onChange={e=>setEmail(e.target.value)} />
        <button disabled={busy} className="mt-4 w-full rounded-xl bg-[#143e31] p-3 text-sm font-bold text-white disabled:opacity-60">{busy?'Solicitando...':'Enviar link de recuperação'}</button>
      </form>
      {done&&<p role="status" className="mt-3 text-sm text-green-800">Se o e-mail estiver habilitado, você receberá orientações. Confira também a pasta de spam.</p>}
      {error&&<p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
      <Link href={`${base}/entrar`} className="mt-4 block text-center text-sm underline">Voltar para entrar</Link>
    </div></section></main></div>;
}
