"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = { id: string; full_name: string; email: string | null; whatsapp: string | null; active: boolean };
type Payload = { people: Person[]; error?: string };

function clientLoginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export default function SimularAcessoPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(clientLoginUrl());
      return;
    }
    const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", { headers: { Authorization: `Bearer ${token}` } });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar pessoas.");
    setPeople(result.people ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar pessoas.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  return (
    <OrganizacaoClientShell title="Simular acesso" description="Escolha um Filho da Corrente para visualizar o sistema exatamente como ele verá após a validação.">
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando pessoas...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {!loading && (
        <section className="grid gap-3 md:grid-cols-2">
          {people.map((person) => (
            <Link key={person.id} href={`/solucoes/organizacao-em-harmonia/cliente/simular-acesso/${person.id}`} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
              <p className="text-lg font-black text-[#00334E]">{person.full_name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{person.whatsapp || "WhatsApp não informado"} · {person.email || "E-mail não informado"}</p>
            </Link>
          ))}
          {people.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhuma pessoa cadastrada.</p>}
        </section>
      )}
    </OrganizacaoClientShell>
  );
}
