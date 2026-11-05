'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';

export function AiOperatorGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let active = true;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) router.replace('/solucoes/atendimento-inteligente/rmc/entrar');
      else setReady(true);
    }).catch(() => { if (active) router.replace('/solucoes/atendimento-inteligente/rmc/entrar'); });
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/solucoes/atendimento-inteligente/rmc/entrar');
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [router]);
  return <><AiBrandHeader />{ready ? children : <main className="min-h-[70vh] bg-[#f5f8f8] p-8 text-center text-[#16384b]">Validando acesso à equipe...</main>}</>;
}
