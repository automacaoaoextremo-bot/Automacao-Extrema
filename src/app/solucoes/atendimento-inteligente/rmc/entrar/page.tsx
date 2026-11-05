'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AiLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      // O painel valida as permissoes por empresa na API; autenticacao nao garante acesso.
      router.replace('/solucoes/atendimento-inteligente/rmc/atendimento');
      router.refresh();
    } catch { setError('Não foi possível entrar. Confira seus dados ou solicite acesso ao responsável.'); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-[#f5f8f8] text-[#16384b]">
    <AiBrandHeader />
    <main className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={login} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-[#ae7d33]">Área restrita • Equipe RMC</p>
        <h1 className="mt-2 text-3xl font-black">Entrar no atendimento</h1>
        <p className="mt-3 text-sm text-slate-600">Acesso somente para colaboradores autorizados. Acesso exclusivo da equipe N1/N2. O cadastro do cliente é feito com autorização na triagem assistida.</p>
        <label className="mt-6 block text-sm font-semibold" htmlFor="ai-email">E-mail</label>
        <input required id="ai-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
        <label className="mt-4 block text-sm font-semibold" htmlFor="ai-password">Senha</label>
        <input required id="ai-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-[#123e50] px-5 py-3 font-bold text-white disabled:opacity-50">{busy?'Entrando...':'Entrar'}</button>
        <p className="mt-4 text-center text-xs text-slate-500">Ainda não tem acesso? Solicite ao administrador da Automação Extrema.</p>
      </form>
      <p className="mt-5 text-center text-sm"><Link className="underline" href="/solucoes/atendimento-inteligente/rmc/solicitar">Sou cliente e quero pedir um serviço</Link></p>
    </main>
  </div>;
}
