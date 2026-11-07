'use client';
import { useEffect, useState } from 'react';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';
import { AiRequestForm } from '@/components/atendimento-inteligente/request-form';
import { RmcLoginForm } from '@/components/atendimento-inteligente/rmc-login-form';
import { supabaseBrowser } from '@/lib/supabase-browser';

/** Pedidos assistidos exigem uma sessão de operador N1; clientes permanecem bloqueados. */
export default function RmcRequestPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    supabaseBrowser.auth.getSession()
      .then(({ data }) => { if (active) setAuthenticated(Boolean(data.session)); })
      .catch(() => { if (active) setAuthenticated(false); });
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthenticated(Boolean(session));
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  return <div className="min-h-screen bg-[#eff5ef]">
    <AiBrandHeader backHref="/solucoes/atendimento-inteligente/rmc" />
    <main className="mx-auto max-w-2xl px-3 py-3 sm:py-4">
      {authenticated === null ? <p role="status" className="rounded-xl bg-white p-6 text-sm">Verificando acesso...</p>
        : authenticated ? <AiRequestForm initialOrg="reparos-rmc" fixedOrg />
          : <RmcLoginForm returnTo="request" />}
    </main>
  </div>;
}
