'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';
import { AiCustomerProvisioner } from './customer-provisioner';
import { RmcLoginForm } from './rmc-login-form';
import { RmcPublicRegistration } from './rmc-public-registration';

type Access = 'loading' | 'operator' | 'customer' | 'guest' | 'denied';
const selfRegistrationEnabled = process.env.NEXT_PUBLIC_AE_AI_SELF_REGISTRATION_ENABLED === 'true';
const base = '/solucoes/atendimento-inteligente/rmc';

/** Fase 0: N1/N2 autenticado cadastra clientes; visitante nunca provisiona contas. */
export function RmcRegistrationGate() {
  const [access, setAccess] = useState<Access>('loading');
  useEffect(() => {
    let mounted = true;
    let version = 0;
    async function verify() {
      const seq = ++version;
      let sessionExists = false;
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        sessionExists = Boolean(data.session);
        if (!data.session) {
          if (mounted && seq === version) setAccess('guest');
          return;
        }
        const actor = await adminFetch<{ role: 'operator' | 'customer' }>('/api/atendimento-inteligente/actor');
        if (mounted && seq === version) setAccess(actor.role);
      } catch {
        if (mounted && seq === version) setAccess(sessionExists ? 'denied' : 'guest');
      }
    }
    void verify();
    // A verificacao de permissao ocorre fora do callback de autenticacao.
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(() => {
      void Promise.resolve().then(verify);
    });
    return () => { mounted = false; version++; listener.subscription.unsubscribe(); };
  }, []);

  if (access === 'loading') return <p role="status" className="rounded-xl bg-white p-5 text-sm">Verificando acesso...</p>;
  if (access === 'operator') return <AiCustomerProvisioner />;
  if (access === 'guest' && selfRegistrationEnabled) return <RmcPublicRegistration />;
  if (access === 'denied') return <section className="rounded-2xl bg-white p-5 shadow">
    <h1 className="text-xl font-black text-[#173d53]">Acesso não autorizado</h1>
    <p className="mt-2 text-sm text-slate-700">Sua conta não possui permissão para cadastrar clientes RMC. Solicite autorização ao administrador.</p>
    <Link href={base} className="mt-4 inline-flex rounded-xl border px-4 py-2.5 text-sm font-bold">Voltar à RMC</Link>
  </section>;
  if (access === 'customer') return <section className="rounded-2xl bg-white p-5 shadow">
    <h1 className="text-xl font-black text-[#173d53]">Cadastro de clientes</h1>
    <p className="mt-2 text-sm text-slate-700">O cadastro assistido é exclusivo da equipe. Você pode consultar os próprios pedidos na sua área.</p>
    <Link href={`${base}/meus-pedidos`} className="mt-4 inline-flex rounded-xl border px-4 py-2.5 text-sm font-bold">Meus pedidos</Link>
  </section>;
  return <div className="space-y-3">
    <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
      <strong>Cadastro assistido — equipe RMC:</strong> entre com seu acesso autorizado para cadastrar clientes e registrar solicitações.
    </div>
    <RmcLoginForm returnTo="registration" />
  </div>;
}
