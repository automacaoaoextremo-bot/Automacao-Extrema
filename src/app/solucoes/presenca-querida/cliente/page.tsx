"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PresencaClientHeader } from "@/components/presenca-client-header";
import { PresencaOnboardingChecklist } from "@/components/presenca-onboarding-checklist";
import {
  formatDateBR,
  integerBR,
  percentBR,
  type PresencaClientDashboardPayload,
  type PresencaOnboardingStep,
} from "@/lib/presenca-querida";
import { supabaseBrowser } from "@/lib/supabase-browser";

type DashboardPayload = PresencaClientDashboardPayload;

type OnboardingPayload = {
  steps: PresencaOnboardingStep[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
    nextStep: PresencaOnboardingStep | null;
  };
};

const modules = [
  {
    title: "Primeiros passos",
    href: "/solucoes/presenca-querida/cliente/primeiros-passos",
    description: "Veja o fluxo recomendado para lançar o convite, testar confirmação e acompanhar pendências.",
  },
  {
    title: "Cadastro",
    href: "/solucoes/presenca-querida/cliente/cadastro",
    description: "Complete dados do evento, anfitrião, local, modo surpresa, texto do convite e orientações.",
  },
  {
    title: "Convidados",
    href: "/solucoes/presenca-querida/cliente/convidados",
    description: "Inclua convidados, grupos, acompanhantes, crianças e observações úteis para operação.",
  },
  {
    title: "Mensagens",
    href: "/solucoes/presenca-querida/cliente/mensagens",
    description: "Prepare Save the Date, convite oficial, lembrete carinhoso, orientação final e agradecimento.",
  },
  {
    title: "Confirmações",
    href: "/solucoes/presenca-querida/cliente/confirmacoes",
    description: "Acompanhe confirmados, pendentes, talvez e quem precisa de retorno com cuidado.",
  },
  {
    title: "Relatórios",
    href: "/solucoes/presenca-querida/cliente/relatorios",
    description: "Veja indicadores para buffet, mesas, lembrancinhas, recepção, etiquetas e pós-evento.",
  },
];

export default function PresencaQueridaClientDashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/solucoes/presenca-querida/login";
        return;
      }

      const [dashboardResponse, onboardingResponse] = await Promise.all([
        fetch("/api/presenca-querida/cliente/dashboard", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/presenca-querida/cliente/onboarding", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const dashboardResult = await dashboardResponse.json();
      if (!dashboardResponse.ok) throw new Error(dashboardResult.error || "Não foi possível carregar o painel.");

      const onboardingResult = await onboardingResponse.json();
      if (!onboardingResponse.ok) throw new Error(onboardingResult.error || "Não foi possível carregar os primeiros passos.");

      if (!active) return;
      setPayload(dashboardResult);
      setOnboarding(onboardingResult);
    }

    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : "Erro ao carregar painel.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const totals = useMemo(() => {
    return (payload?.dashboard ?? []).reduce(
      (acc, item) => {
        acc.total += Number(item.total_guests ?? 0);
        acc.confirmed += Number(item.confirmed_count ?? 0);
        acc.pending += Number(item.pending_count ?? 0);
        acc.maybe += Number(item.maybe_count ?? 0);
        acc.adults += Number(item.adults_count ?? 0);
        acc.children += Number(item.children_count ?? 0);
        acc.companions += Number(item.companions_count ?? 0);
        acc.responseRate = Math.max(acc.responseRate, Number(item.response_rate ?? 0));
        return acc;
      },
      { total: 0, confirmed: 0, pending: 0, maybe: 0, adults: 0, children: 0, companions: 0, responseRate: 0 },
    );
  }, [payload?.dashboard]);

  const event = payload?.events?.[0];

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <PresencaClientHeader />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Painel do cliente</p>
        <h1 className="mt-2 text-4xl font-black leading-tight text-[#00334E]">
          {event?.name ?? "Presença Querida"}
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Olá{payload?.person?.full_name ? `, ${payload.person.full_name}` : ""}. Comece pelo checklist para reduzir dúvidas, evitar retrabalho e lançar o convite com mais segurança.
        </p>

        {event && (
          <p className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-[#00334E] shadow-sm ring-1 ring-rose-100">
            {formatDateBR(event.event_date)} {event.city ? `• ${event.city}${event.state ? `/${event.state}` : ""}` : ""}
          </p>
        )}

        {loading && <p className="mt-6 rounded-2xl bg-white p-5 shadow-sm">Carregando painel...</p>}
        {error && <p className="mt-6 rounded-2xl bg-red-50 p-5 font-bold text-red-700">{error}</p>}

        {!loading && !error && (
          <>
            {onboarding?.steps && (
              <div className="mt-6">
                <PresencaOnboardingChecklist steps={onboarding.steps} />
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-rose-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Convidados</p>
                <p className="mt-2 text-3xl font-black text-[#00334E]">{integerBR(totals.total)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-rose-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Confirmados</p>
                <p className="mt-2 text-3xl font-black text-[#00334E]">{integerBR(totals.confirmed)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-rose-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Pendentes</p>
                <p className="mt-2 text-3xl font-black text-[#00334E]">{integerBR(totals.pending)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-rose-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Resposta</p>
                <p className="mt-2 text-3xl font-black text-[#00334E]">{percentBR(totals.responseRate)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[1.5rem] bg-rose-50 p-5 shadow-sm ring-1 ring-rose-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-400">Talvez</p>
                <p className="mt-2 text-2xl font-black text-[#00334E]">{integerBR(totals.maybe)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-rose-50 p-5 shadow-sm ring-1 ring-rose-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-400">Adultos</p>
                <p className="mt-2 text-2xl font-black text-[#00334E]">{integerBR(totals.adults)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-rose-50 p-5 shadow-sm ring-1 ring-rose-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-400">Crianças</p>
                <p className="mt-2 text-2xl font-black text-[#00334E]">{integerBR(totals.children)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-rose-50 p-5 shadow-sm ring-1 ring-rose-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-400">Acompanhantes</p>
                <p className="mt-2 text-2xl font-black text-[#00334E]">{integerBR(totals.companions)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="text-xl font-black text-[#00334E]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
