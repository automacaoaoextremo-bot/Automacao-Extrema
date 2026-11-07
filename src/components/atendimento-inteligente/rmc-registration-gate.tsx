'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { AiCustomerProvisioner } from './customer-provisioner';

const base = '/solucoes/atendimento-inteligente/rmc';
type Access = 'loading' | 'operator' | 'customer' | 'guest' | 'denied';

/** Fase 0: somente um operador autenticado cria contas com senhas iniciais. */
export function RmcRegistrationGate() {
  const [access, setAccess] = useState<Access>('loading');

  useEffect(() => {
    let active = true;
    let version = 0;
    async function check() {
      const current = ++version;
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!data.session) {
          if (active && current === version) setAccess('guest');
          return;
        }
        const actor = await adminFetch<{role:'operator'|'customer'}>('/api/atendimento-inteligente/actor');
        if (active && current === version) setAccess(actor.role);
      } catch {
        if (active && current === version) setAccess('denied');
      }
    }
    void check();
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(() => {
      void Promise.resolve().then(check);
    });
    return () => { active = false; version++; listener.subscription.unsubscribe(); };
  }, []);

  if (access === 'loading') return <p role="status" className="rounded-xl bg-white p-5 text-sm">Verificando acesso...</p>;
  if (access === 'operator') return <AiCustomerProvisioner />;
  if (access === 'customer') return <section className="rounded-2xl bg-white p-5 shadow">
    <h1 className="text-xl font-black text-[#173d53]">Cadastro assistido</h1>
    <p className="mt-2 text-sm text-slate-700">Seu acesso individual ainda não está liberado para criar pedidos. Entre em contato pelo WhatsApp da Reparos RMC.</p>
    <Link href={base} className="mt-4 inline-flex rounded-xl border px-4 py-2.5 text-sm font-bold">Voltar à RMC</Link>
  </section>;
  return <section className="rounded-2xl bg-white p-5 shadow">
    <h1 className="text-xl font-black text-[#173d53]">Cadastro de clientes — equipe RMC</h1>
    <p className="mt-2 text-sm text-slate-700">Para cadastrar clientes com senha individual, entre com sua conta de operador N1. As contas dos clientes permanecem bloqueadas até a liberação futura.</p>
    {access === 'denied' && <p role="alert" className="mt-3 text-sm text-rose-700">Sua conta não está vinculada à RMC. Verifique sua permissão de operador.</p>}
    <Link href={`${base}/entrar`} className="mt-4 inline-flex rounded-xl bg-[#143e31] px-4 py-2.5 text-sm font-bold text-white">Entrar como operador</Link>
  </section>;
}
