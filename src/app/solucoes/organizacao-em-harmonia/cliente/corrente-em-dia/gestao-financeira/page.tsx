"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type MonthSummary = {
  month: string;
  revenues: number | null;
  expenses: number | null;
  result: number | null;
  bankBalance: number | null;
};

type Payload = {
  canManage?: boolean;
  live?: {
    latestFinalized: MonthSummary | null;
    currentForecast: MonthSummary;
  };
  error?: string;
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

export default function GestaoFinanceiraPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [contributors, setContributors] = useState("50");
  const [averageValue, setAverageValue] = useState("50");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/gestao-financeira",
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar a gestão financeira.");
    }
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setPayload({
              error:
                reason instanceof Error
                  ? reason.message
                  : "Erro ao carregar a Gestão Financeira.",
            });
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [load]);

  const simulation = useMemo(() => {
    const people = Math.max(0, Number(contributors.replace(/\D/g, "")) || 0);
    const value = Math.max(
      0,
      Number(averageValue.replace(/\./g, "").replace(",", ".")) || 0,
    );
    const projected = people * value;
    const expenses = payload.live?.currentForecast.expenses ?? 0;
    const difference = projected - expenses;
    const contributorsNeeded = value > 0 ? Math.ceil(expenses / value) : 0;
    return { projected, expenses, difference, contributorsNeeded };
  }, [averageValue, contributors, payload.live?.currentForecast.expenses]);

  return (
    <OrganizacaoClientShell
      title="Gestão Financeira"
      description="Área restrita para controlar competências, vencimentos, movimento de caixa, fechamento mensal, previsão e sustentabilidade financeira."
    >
      {loading && (
        <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
          Carregando indicadores...
        </p>
      )}
      {payload.error && (
        <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {payload.error}
        </p>
      )}

      {payload.live && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Receitas do mês atual", payload.live.currentForecast.revenues],
              ["Despesas do mês atual", payload.live.currentForecast.expenses],
              ["Resultado do mês atual", payload.live.currentForecast.result],
              ["Saldo no banco", payload.live.currentForecast.bankBalance],
            ].map(([label, value]) => (
              <article key={String(label)} className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">
                  {label}
                </p>
                <p className={`mt-2 text-xl font-black ${(Number(value) || 0) < 0 ? "text-red-700" : "text-[#123D2C]"}`}>
                  {money(value as number | null)}
                </p>
              </article>
            ))}
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Organização dos registros
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
              Competência, vencimento e mês financeiro não são a mesma coisa
            </h2>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <article className="rounded-2xl bg-[#F7FAF2] p-4">
                <h3 className="font-black text-[#123D2C]">Competência</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Mês ao qual a receita ou despesa pertence, como a conta de água referente a julho.
                </p>
              </article>
              <article className="rounded-2xl bg-[#F7FAF2] p-4">
                <h3 className="font-black text-[#123D2C]">Vencimento</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Data em que a obrigação precisa ser paga ou o valor deve ser recebido.
                </p>
              </article>
              <article className="rounded-2xl bg-[#F7FAF2] p-4">
                <h3 className="font-black text-[#123D2C]">Movimento financeiro</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Data e mês em que o dinheiro movimentou o caixa ou a conta bancária.
                </p>
              </article>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Simulação de equilíbrio
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
              Avalie cenários sem expor nenhuma pessoa
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A referência de despesas é o mês atual. A simulação apoia decisões e não altera nenhum lançamento.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-black text-[#123D2C]">
                Quantidade de contribuintes
                <input
                  value={contributors}
                  onChange={(event) => setContributors(event.target.value)}
                  inputMode="numeric"
                  className="rounded-2xl border border-slate-200 p-4"
                />
              </label>
              <label className="grid gap-2 font-black text-[#123D2C]">
                Valor médio da contribuição
                <input
                  value={averageValue}
                  onChange={(event) => setAverageValue(event.target.value)}
                  inputMode="decimal"
                  className="rounded-2xl border border-slate-200 p-4"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-[#F7FAF2] p-4"><p className="text-sm font-black text-[#123D2C]">Receita projetada</p><p className="mt-2 text-xl font-black">{money(simulation.projected)}</p></div>
              <div className="rounded-2xl bg-[#F7FAF2] p-4"><p className="text-sm font-black text-[#123D2C]">Despesas de referência</p><p className="mt-2 text-xl font-black">{money(simulation.expenses)}</p></div>
              <div className="rounded-2xl bg-[#F7FAF2] p-4"><p className="text-sm font-black text-[#123D2C]">Diferença</p><p className={`mt-2 text-xl font-black ${simulation.difference < 0 ? "text-red-700" : "text-emerald-800"}`}>{money(simulation.difference)}</p></div>
              <div className="rounded-2xl bg-[#F7FAF2] p-4"><p className="text-sm font-black text-[#123D2C]">Pessoas necessárias</p><p className="mt-2 text-xl font-black">{simulation.contributorsNeeded}</p></div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos" className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white">Registrar receitas e despesas</Link>
            <Link href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/balancetes" className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C]">Finalizar competência</Link>
            <Link href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/prestacao-contas" className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] shadow ring-1 ring-slate-100">Validar visão pública</Link>
            <Link href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/configuracoes" className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] shadow ring-1 ring-slate-100">Configurações</Link>
          </section>

          {payload.live.latestFinalized && (
            <p className="rounded-2xl bg-[#F7FAF2] p-4 text-center text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10">
              Último mês finalizado: {monthLabel(payload.live.latestFinalized.month)}.
            </p>
          )}
        </>
      )}
    </OrganizacaoClientShell>
  );
}
