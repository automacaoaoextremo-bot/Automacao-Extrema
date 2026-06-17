"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CorrenteClientHeader } from "@/components/corrente-client-header";
import { currencyBR, type CorrenteClientDashboardPayload } from "@/lib/corrente-em-dia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type DashboardPayload = CorrenteClientDashboardPayload;

const modules = [
  {
    title: "Cadastro",
    href: "/solucoes/corrente-em-dia/cliente/cadastro",
    description: "Complete dados da organização, Pix, valores, datas, endereço e lembretes.",
  },
  {
    title: "Configurações",
    href: "/solucoes/corrente-em-dia/cliente/configuracoes",
    description: "Cadastre funções e defina quais telas e ações cada perfil pode acessar.",
  },
  {
    title: "Contribuintes",
    href: "/solucoes/corrente-em-dia/cliente/contribuintes",
    description: "Inclua pessoas, funções, valores, dias de contribuição, login e envio de acesso.",
  },
  {
    title: "Contribuir",
    href: "/solucoes/corrente-em-dia/cliente/contribuir",
    description: "Acesse Pix, copia e cola, comprovantes, histórico e status das contribuições.",
  },
  {
    title: "Aprovações",
    href: "/solucoes/corrente-em-dia/cliente/aprovacoes",
    description: "Revise comprovantes, aprove, peça correção e envie lembretes com cuidado.",
  },
];

export default function CorrenteEmDiaClientDashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/solucoes/corrente-em-dia/login";
        return;
      }

      const response = await fetch("/api/corrente-em-dia/cliente/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar o painel.");
      if (active) setPayload(result);
    }

    load()
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar painel.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    return (payload?.dashboard ?? []).reduce(
      (acc, item) => {
        acc.expected += Number(item.expected_amount ?? 0);
        acc.approved += Number(item.approved_amount ?? 0);
        acc.pending += Number(item.pending_amount ?? 0);
        acc.review += Number(item.review_count ?? 0);
        return acc;
      },
      { expected: 0, approved: 0, pending: 0, review: 0 },
    );
  }, [payload?.dashboard]);

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <CorrenteClientHeader />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Painel do cliente</p>
        <h1 className="mt-2 text-4xl font-black leading-tight text-[#00334E]">
          {payload?.organizations?.[0]?.name ?? "Corrente em Dia"}
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Olá{payload?.person?.full_name ? `, ${payload.person.full_name}` : ""}. Use o menu para configurar a organização, cadastrar contribuintes, acompanhar contribuições e revisar comprovantes.
        </p>

        {loading && <p className="mt-6 rounded-2xl bg-white p-5 shadow-sm">Carregando painel...</p>}
        {error && <p className="mt-6 rounded-2xl bg-red-50 p-5 font-bold text-red-700">{error}</p>}

        {!loading && !error && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Previsto</p>
                <p className="mt-2 text-3xl font-black text-[#00334E]">{currencyBR(totals.expected)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Aprovado</p>
                <p className="mt-2 text-3xl font-black text-[#00334E]">{currencyBR(totals.approved)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Pendente</p>
                <p className="mt-2 text-3xl font-black text-[#00334E]">{currencyBR(totals.pending)}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Em revisão</p>
                <p className="mt-2 text-3xl font-black text-[#00334E]">{totals.review}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg"
                >
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
