"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = { id: string; full_name: string; email: string | null; whatsapp: string | null; active: boolean };
type Membership = { id: string; person_id: string; status: string | null; module_slugs: string[] | null; agenda_viva_profile: Record<string, unknown> | null };
type Payload = { people: Person[]; memberships: Membership[]; error?: string };

function clientLoginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function selectedLabels(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const label = (item as { label?: unknown }).label;
      return typeof label === "string" ? label : "";
    })
    .filter(Boolean);
}

export default function SimularAcessoFilhoDaCorrentePage() {
  const router = useRouter();
  const params = useParams<{ personId: string }>();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace(clientLoginUrl());
      return;
    }
    const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", { headers: { Authorization: `Bearer ${token}` } });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar simulação.");
    setPayload(result);
  }, [router]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar simulação.");
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

  const target = useMemo(() => {
    const person = (payload?.people ?? []).find((item) => item.id === params.personId) ?? null;
    const membership = (payload?.memberships ?? []).find((item) => item.person_id === params.personId) ?? null;
    return { person, membership };
  }, [params.personId, payload?.memberships, payload?.people]);

  const profile = target.membership?.agenda_viva_profile ?? {};
  const functionLabels = selectedLabels(profile.selectedFunctions);
  const agendaLabels = selectedLabels(profile.selectedAgenda);

  return (
    <OrganizacaoClientShell title="Simular acesso" description="Visualize a experiência do Filho da Corrente antes de aprovar o acesso definitivo.">
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando simulação...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

      {!loading && !target.person && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Filho da Corrente não encontrado.</p>}

      {target.person && (
        <section className="grid gap-5">
          <div className="rounded-[2rem] bg-[#123D2C] p-6 text-white shadow-xl shadow-green-900/10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Simulação</p>
            <h2 className="mt-2 text-3xl font-black">{target.person.full_name}</h2>
            <p className="mt-3 leading-7 text-[#EEF7EA]">Esta visão representa o que será liberado para o Filho da Corrente após a validação.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">Status</p>
              <p className="mt-2 text-lg font-black text-[#123D2C]">{target.membership?.status || "Sem vínculo"}</p>
            </article>
            <article className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">Módulos</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{target.membership?.module_slugs?.join(" • ") || "Agenda Viva • Atendimento • Corrente em Dia"}</p>
            </article>
            <article className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">Contato</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{target.person.whatsapp || "WhatsApp não informado"}<br />{target.person.email || "E-mail não informado"}</p>
            </article>
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100">
              <h3 className="text-xl font-black text-[#00334E]">Funções visíveis</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{functionLabels.length ? functionLabels.join(" • ") : "Somente Filho da Corrente"}</p>
            </article>
            <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100">
              <h3 className="text-xl font-black text-[#00334E]">Agenda associada</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{agendaLabels.length ? agendaLabels.join(" • ") : "Nenhum item de agenda associado"}</p>
            </article>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/solucoes/organizacao-em-harmonia/cliente/validacoes" className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Voltar para validações</Link>
            <Link href="/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos" className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white">Abrir Base Única</Link>
          </div>
        </section>
      )}
    </OrganizacaoClientShell>
  );
}
