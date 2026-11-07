'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { normalizeBRPhone } from '@/lib/atendimento-inteligente/intake';

const base = '/solucoes/atendimento-inteligente/rmc';
// O controle no cliente é somente visual; a API também valida uma flag no servidor.
const enabled = process.env.NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED === 'true';
const field = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-500';

export function RmcPublicRegistration() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'register' | 'verify' | 'done'>('register');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    // O cadastro público somente é exibido na fase futura em que foi habilitado.
    if (!enabled) return;
    const normalized = normalizeBRPhone(phone);
    if (!normalized) { setError('Informe um WhatsApp válido com DDD.'); return; }
    if (name.trim().length < 3) { setError('Informe seu nome completo.'); return; }
    if (password.length < 8 || password.length > 72 ||
        [/[A-Z]/, /[a-z]/, /\d/, /[^\w]/].filter(re => re.test(password)).length < 3) {
      setError('Use de 8 a 72 caracteres, combinando maiúsculas, minúsculas, números ou símbolos.'); return;
    }
    setBusy(true);
    try {
      const { error: failure } = await supabaseBrowser.auth.signUp({
        phone: `+${normalized}`, password,
        options: { data: { ae_ai_full_name: name.trim(), ae_ai_contact_email: email.trim().toLowerCase(), ae_ai_rmc_candidate: true } },
      });
      if (failure) throw failure;
      setStep('verify');
    } catch {
      setError('Não foi possível iniciar o cadastro. Se já tem conta, utilize Entrar ou contate a equipe.');
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy) return;
    setError(''); setBusy(true);
    try {
      const normalized = normalizeBRPhone(phone);
      if (!normalized) throw new Error('Telefone inválido');
      const { error: failure } = await supabaseBrowser.auth.verifyOtp({ phone: `+${normalized}`, token: code.trim(), type: 'sms' });
      if (failure) throw failure;
      await adminFetch('/api/atendimento-inteligente/customers/self-register', { method: 'POST', body: '{}' });
      setPassword(''); setCode(''); setStep('done');
    } catch {
      setError('Não foi possível confirmar seu cadastro. Verifique o código recebido ou procure a equipe.');
    } finally { setBusy(false); }
  }

  return <section className="mx-auto w-full max-w-md rounded-[28px] bg-[#143e31] p-2.5 shadow-xl sm:p-4" aria-label="Primeiro acesso à Reparos RMC">
    <div className="rounded-2xl bg-white px-4 py-5 text-[#173b4c] sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#b46824]">Reparos RMC • Primeiro acesso</p>
      <h1 className="mt-2 text-2xl font-black leading-tight text-[#173e50]">Cadastre-se para solicitar serviços</h1>
      {step === 'register' ? <form onSubmit={begin} className="mt-4 space-y-3">
        <fieldset disabled={busy} className="space-y-3">
          <label htmlFor="rmc-reg-name" className="block text-sm font-bold">Nome completo
            <input id="rmc-reg-name" className={field} required minLength={3} maxLength={120} value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Seu nome completo" />
          </label>
          <label htmlFor="rmc-reg-phone" className="block text-sm font-bold">WhatsApp/celular (obrigatório)
            <input id="rmc-reg-phone" className={field} required inputMode="tel" type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="(19) 99999-9999" />
          </label>
          <label htmlFor="rmc-reg-email" className="block text-sm font-bold">E-mail (opcional)
            <input id="rmc-reg-email" className={field} type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" />
          </label>
          <label htmlFor="rmc-reg-password" className="block text-sm font-bold">Senha (mínimo de 8 caracteres)
            <span className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-300">
              <input id="rmc-reg-password" className="min-w-0 flex-1 bg-white px-3 py-2.5 text-base outline-none disabled:bg-slate-50" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Crie sua senha" />
              <button type="button" onClick={() => setShow(current => !current)} className="px-3 text-xs font-semibold" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? 'Ocultar' : 'Mostrar'}</button>
            </span>
          </label>
        </fieldset>
        {enabled && <p className="text-xs leading-relaxed text-slate-600">Para proteger seus pedidos, enviaremos um código de verificação por SMS. O cadastro não confirma preço, visita ou agendamento.</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#143e31] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Aguarde...' : 'Criar meu acesso'}</button>
      </form> : step === 'verify' ? <form onSubmit={verify} className="mt-4 space-y-3">
        <p className="text-sm">Digite o código de verificação recebido por SMS.</p>
        <label htmlFor="rmc-verify-code" className="block text-sm font-bold">Código
          <input id="rmc-verify-code" className={field} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0,8))} inputMode="numeric" autoComplete="one-time-code" minLength={4} required />
        </label>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#143e31] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Verificando...' : 'Confirmar celular'}</button>
      </form> : <p role="status" className="mt-4 text-sm text-green-800">Cadastro registrado após a verificação do celular. <Link href={`${base}/entrar`} className="font-bold underline">Entrar</Link> para continuar.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <Link href={`${base}/entrar`} className="mt-4 block rounded-xl border border-slate-200 p-2.5 text-center text-sm font-semibold">Já tenho acesso</Link>
    </div>
  </section>;
}
