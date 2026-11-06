'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-fetch';

type Actor = { name: string; role: 'operator' | 'customer' };
const home = '/solucoes/atendimento-inteligente/rmc';

export function AiUserMenu() {
  const [actor, setActor] = useState<Actor | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let sequence = 0;
    function refreshActor(hasSession: boolean) {
      const version = ++sequence;
      if (!hasSession) {
        setActor(null);
        return;
      }
      // Executar depois do callback do Supabase evita consultas à sessão dentro do callback.
      void Promise.resolve()
        .then(() => adminFetch<Actor>('/api/atendimento-inteligente/actor'))
        .then(result => { if (active && version === sequence) setActor(result); })
        .catch(() => { if (active && version === sequence) setActor(null); });
    }
    void supabaseBrowser.auth.getSession()
      .then(({ data }) => { if (active) refreshActor(Boolean(data.session)); })
      .catch(() => { if (active) refreshActor(false); });
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (active) refreshActor(Boolean(session));
    });
    return () => {
      active = false;
      sequence += 1;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!actor) return null;
  async function signOut() {
    const { error } = await supabaseBrowser.auth.signOut();
    if (!error) {
      setActor(null);
      router.replace(home);
      router.refresh();
    }
  }
  return <div className="flex min-w-0 items-center gap-1.5 text-[11px] sm:gap-2 sm:text-sm">
    <span className="max-w-[105px] truncate font-semibold text-[#1b3e53] sm:max-w-[230px]" title={actor.name}>{actor.name}</span>
    <button type="button" onClick={() => void signOut()}
      className="rounded-full border border-slate-300 px-2.5 py-1.5 font-semibold sm:px-3">Sair</button>
  </div>;
}
