"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type MonthSummary = {
  month: string;
  workflowStatus: string;
  finalized: boolean;
  current: boolean;
  hasData: boolean;
  revenues: number | null;
  expenses: number | null;
  result: number | null;
  openingBalance: number | null;
  closingBalance: number | null;
  bankBalance: number | null;
  realizedRevenues: number;
  realizedExpenses: number;
  estimatedRevenues: number;
  estimatedExpenses: number;
  sourceLabel: string | null;
  updatedAt: string | null;
};

type Group = {
  type: "receita" | "despesa";
  group: string;
  total: number;
  items: Array<{ name: string; total: number }>;
};

type LivePayload = {
  generatedAt: string;
  settings: {
    detailLevel: "resumido" | "grupos" | "itens";
    showLast12Months: boolean;
    showDrilldown: boolean;
    showTopExpenses: boolean;
    showTopRevenues: boolean;
    showNegativeResults: boolean;
    showAccumulatedBalance: boolean;
    headline: string;
    message: string;
  };
  latestFinalized: MonthSummary | null;
  currentForecast: MonthSummary;
  finalizedMonthly: MonthSummary[];
  history: MonthSummary[];
  latestFinalizedGroups: Group[];
  currentGroups: Group[];
};

type ApiPayload = {
  live?: LivePayload;
  error?: string;
};

const actions = [
  {
    label: "Corrente em Dia",
    href: "/solucoes/organizacao-em-harmonia/tucxa/corrente-em-dia",
    variant: "secondary" as const,
  },
  {
    label: "Início",
    href: "/solucoes/organizacao-em-harmonia/tucxa",
    variant: "secondary" as const,
  },
  {
    label: "Contribuir",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao",
    variant: "primary" as const,
  },
  {
    label: "Dúvidas?",
    href: "#duvidas",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

function money(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function monthLabel(value: string, format: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("pt-BR", {
    month: format,
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    .replace(".", "");
}

function MetricCard({
  label,
  value,
  tone = "text-[#123D2C]",
}: {
  label: string;
  value: number | null;
  tone?: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
        {label}
      </p>
      <p className={`mt-2 text-xl font-black ${tone}`}>{money(value)}</p>
    </article>
  );
}

function FinancialSummary({
  title,
  subtitle,
  month,
}: {
  title: string;
  subtitle: string;
  month: MonthSummary;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
        {title}
      </p>
      <h2 className="mt-1 text-2xl font-black capitalize text-[#123D2C]">
        {monthLabel(month.month, "long")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Receitas" value={month.revenues} tone="text-emerald-800" />
        <MetricCard label="Despesas" value={month.expenses} tone="text-amber-800" />
        <MetricCard
          label="Resultado"
          value={month.result}
          tone={(month.result ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]"}
        />
        <MetricCard
          label="Saldo no banco"
          value={month.bankBalance}
          tone={(month.bankBalance ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]"}
        />
      </div>
    </section>
  );
}

export default function TucxaTransparenciaPage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);
  const [averageWindow, setAverageWindow] = useState<"3" | "6" | "all">("3");
  const [detailScope, setDetailScope] = useState<"finalized" | "current">("finalized");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void fetch("/api/organizacao-em-harmonia/site-tucxa/transparencia", {
        cache: "no-store",
      })
        .then(async (response) => {
          const result = (await response.json()) as ApiPayload;
          if (!active) return;
          setPayload(result);
        })
        .catch(() => {
          if (active) {
            setPayload({ error: "Não foi possível carregar a prestação de contas." });
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
  }, []);

  const data = payload.live;
  const averageMonths = useMemo(() => {
    const finalized = data?.finalizedMonthly ?? [];
    if (averageWindow === "all") return finalized;
    return finalized.slice(-Number(averageWindow));
  }, [averageWindow, data?.finalizedMonthly]);

  const averages = useMemo(() => {
    if (averageMonths.length === 0) {
      return { revenues: 0, expenses: 0, result: 0 };
    }
    const totals = averageMonths.reduce(
      (current, month) => ({
        revenues: current.revenues + (month.revenues ?? 0),
        expenses: current.expenses + (month.expenses ?? 0),
        result: current.result + (month.result ?? 0),
      }),
      { revenues: 0, expenses: 0, result: 0 },
    );
    return {
      revenues: totals.revenues / averageMonths.length,
      expenses: totals.expenses / averageMonths.length,
      result: totals.result / averageMonths.length,
    };
  }, [averageMonths]);

  const historyNewestFirst = useMemo(() => {
    const previousMonths = (data?.history ?? []).filter((month) => !month.current);
    const finalized = previousMonths
      .filter((month) => month.finalized)
      .sort((left, right) => right.month.localeCompare(left.month));
    const unfinished = previousMonths
      .filter((month) => !month.finalized)
      .sort((left, right) => right.month.localeCompare(left.month));
    return [...finalized, ...unfinished];
  }, [data?.history]);

  const detailGroups =
    detailScope === "current"
      ? data?.currentGroups ?? []
      : data?.latestFinalizedGroups ?? [];

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu da Transparência em Harmonia"
        showSupport={false}
      />

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Transparência em Harmonia
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            {data?.settings.headline || "Fortalecendo a confiança"}
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA]">
            {data?.settings.message ||
              "Acompanhe o último mês finalizado e os valores registrados para o mês atual."}
          </p>
        </header>

        {loading && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Carregando a prestação de contas...
          </p>
        )}

        {!loading && payload.error && (
          <p className="rounded-2xl bg-red-50 p-5 font-bold text-red-700">
            {payload.error}
          </p>
        )}

        {data && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.latestFinalized ? (
                <FinancialSummary
                  title="Último mês finalizado"
                  subtitle="Valores conferidos e encerrados pela Tesouraria/Financeiro."
                  month={data.latestFinalized}
                />
              ) : (
                <section className="rounded-[2rem] bg-amber-50 p-5 font-bold leading-7 text-amber-900 ring-1 ring-amber-200">
                  Ainda não existe uma competência finalizada para exibição pública.
                </section>
              )}
              <FinancialSummary
                title="Previsão do mês atual"
                subtitle="Receitas e despesas registradas até a consulta, incluindo estimativas cadastradas."
                month={data.currentForecast}
              />
            </div>

            <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                    Médias dos meses finalizados
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                    Escolha o período usado como referência
                  </h2>
                </div>
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                  Período da média
                  <select
                    value={averageWindow}
                    onChange={(event) =>
                      setAverageWindow(event.target.value as "3" | "6" | "all")
                    }
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4"
                  >
                    <option value="3">Últimos 3 meses finalizados</option>
                    <option value="6">Últimos 6 meses finalizados</option>
                    <option value="all">Todos os meses finalizados</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MetricCard label="Média receitas" value={averages.revenues} tone="text-emerald-800" />
                <MetricCard label="Média despesas" value={averages.expenses} tone="text-amber-800" />
                <MetricCard
                  label="Média resultado"
                  value={averages.result}
                  tone={averages.result < 0 ? "text-red-700" : "text-[#123D2C]"}
                />
              </div>
            </section>

            {data.settings.showLast12Months && (
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <h2 className="text-xl font-black text-[#123D2C]">
                  Histórico dos últimos 12 meses
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Meses anteriores sem fechamento permanecem sem valores. Arraste horizontalmente para consultar os demais meses.
                </p>

                <div className="mt-5 overflow-x-auto pb-3">
                  <div className="flex min-w-max gap-3">
                    <article className="w-36 shrink-0 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-800">Média receitas</p>
                      <p className="mt-2 font-black text-emerald-900">{money(averages.revenues)}</p>
                    </article>
                    <article className="w-36 shrink-0 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">Média despesas</p>
                      <p className="mt-2 font-black text-amber-900">{money(averages.expenses)}</p>
                    </article>
                    <article className="w-36 shrink-0 rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">Média resultado</p>
                      <p className={`mt-2 font-black ${averages.result < 0 ? "text-red-700" : "text-[#123D2C]"}`}>{money(averages.result)}</p>
                    </article>

                    {historyNewestFirst.map((month) => (
                      <article
                        key={month.month}
                        className="w-40 shrink-0 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
                      >
                        <p className="text-sm font-black capitalize text-[#123D2C]">
                          {monthLabel(month.month)}
                        </p>
                        {month.finalized || month.current ? (
                          <div className="mt-3 grid gap-2 text-xs">
                            <p className="flex justify-between gap-2"><span>Receitas</span><strong>{money(month.revenues)}</strong></p>
                            <p className="flex justify-between gap-2"><span>Despesas</span><strong>{money(month.expenses)}</strong></p>
                            <p className="flex justify-between gap-2"><span>Resultado</span><strong>{money(month.result)}</strong></p>
                            <div className="mt-1 rounded-xl bg-white p-2">
                              <p className="font-black text-[#2F6B43]">Saldo no banco</p>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${(month.bankBalance ?? 0) < 0 ? "bg-red-500" : "bg-[#2F6B43]"}`}
                                  style={{ width: `${Math.min(100, Math.max(8, Math.abs(month.bankBalance ?? 0) / 250))}%` }}
                                />
                              </div>
                              <p className={`mt-1 font-black ${(month.bankBalance ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]"}`}>{money(month.bankBalance)}</p>
                            </div>
                            {month.current && (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-center font-black text-blue-800">Mês atual</span>
                            )}
                          </div>
                        ) : (
                          <p className="mt-4 rounded-xl bg-white p-3 text-center text-xs font-bold leading-5 text-slate-400">
                            Financeiro ainda não finalizado
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {data.settings.detailLevel !== "resumido" && (
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Detalhamento</p>
                    <h2 className="mt-1 text-xl font-black text-[#123D2C]">Categorias e itens</h2>
                  </div>
                  <select
                    value={detailScope}
                    onChange={(event) => setDetailScope(event.target.value as "finalized" | "current")}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-black text-[#123D2C]"
                  >
                    <option value="finalized">Último mês finalizado</option>
                    <option value="current">Mês atual</option>
                  </select>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {(["receita", "despesa"] as const).map((type) => (
                    <article key={type} className="rounded-[1.5rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                      <h3 className="text-lg font-black text-[#123D2C]">
                        {type === "receita" ? "Receitas" : "Despesas"}
                      </h3>
                      <div className="mt-3 grid gap-2">
                        {detailGroups
                          .filter((group) => group.type === type)
                          .map((group) => {
                            const key = `${detailScope}:${type}:${group.group}`;
                            const canOpen = data.settings.showDrilldown && data.settings.detailLevel === "itens";
                            return (
                              <div key={key} className="rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10">
                                <button
                                  type="button"
                                  disabled={!canOpen}
                                  onClick={() => setOpenGroups((current) => ({ ...current, [key]: !current[key] }))}
                                  className="flex w-full items-center justify-between gap-3 text-left"
                                >
                                  <span className="font-black text-[#123D2C]">{group.group}</span>
                                  <span className="shrink-0 font-black text-[#123D2C]">{money(group.total)}</span>
                                </button>
                                {canOpen && openGroups[key] && (
                                  <div className="mt-3 grid gap-2 border-t border-[#123D2C]/10 pt-3">
                                    {group.items.map((item) => (
                                      <p key={item.name} className="flex justify-between gap-3 text-sm text-slate-600">
                                        <span>{item.name}</span>
                                        <strong className="shrink-0 text-[#123D2C]">{money(item.total)}</strong>
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {detailGroups.filter((group) => group.type === type).length === 0 && (
                          <p className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">Nenhum valor registrado para este período.</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-[2rem] bg-[#E9F2E7] p-5 text-center ring-1 ring-[#123D2C]/10 sm:p-7">
              <h2 className="text-2xl font-black text-[#123D2C]">
                Manter a Casa em harmonia também é cuidar de cada trabalho.
              </h2>
              <p className="mx-auto mt-3 max-w-3xl leading-7 text-slate-700">
                Você escolhe o valor, se deseja se identificar e como prefere organizar sua contribuição.
              </p>
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao"
                className="mt-5 inline-flex rounded-2xl bg-[#123D2C] px-6 py-4 font-black text-white"
              >
                Contribuir
              </Link>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
