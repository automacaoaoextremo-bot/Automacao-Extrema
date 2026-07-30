"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type Monthly = {
  month: string;
  revenues: number;
  expenses: number;
  result: number;
  openingBalance?: number;
  closingBalance?: number;
  balanceDivergence?: boolean;
  provisional: boolean;
  sourceLabel?: string | null;
  updatedAt?: string | null;
};

type Group = {
  type: "receita" | "despesa";
  group: string;
  total: number;
  items: Array<{ name: string; total: number }>;
};

type PublicPayload = {
  generatedAt: string;
  settings: {
    detailLevel: "resumido" | "grupos" | "itens";
    showLast12Months: boolean;
    showDrilldown: boolean;
    showTopExpenses: boolean;
    showTopRevenues: boolean;
    showNegativeResults: boolean;
    showAccumulatedBalance: boolean;
    showSimulator: boolean;
    showProvisionalData: boolean;
    headline: string;
    message: string;
  };
  monthly: Monthly[];
  groups: Group[];
  totals: { revenues: number; expenses: number; result: number };
  latest: Monthly;
  accumulatedBalance?: number;
  comparison?: {
    previousMonth: string | null;
    previousResult: number | null;
    resultDifference: number;
    resultComparisonPercentage: number | null;
  };
  confirmedPercentage: number;
  provisionalNotice: string | null;
};

type Snapshot = {
  id: string;
  reference_month: string;
  payload: PublicPayload;
  published_at: string | null;
};

type ApiPayload = {
  snapshot?: Snapshot | null;
  message?: string;
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

function money(value: number | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function monthLabel(value: string) {
  const normalized = value.length >= 10 ? value.slice(0, 10) : `${value}-01`;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
    .format(new Date(`${normalized}T12:00:00Z`))
    .replace(".", "");
}

function dateTime(value: string | null | undefined) {
  if (!value) return "Ainda não publicado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function comparisonText(data: PublicPayload) {
  const comparison = data.comparison;
  if (!comparison || comparison.previousResult == null) {
    return "Ainda não há mês anterior suficiente para comparação.";
  }

  const direction = comparison.resultDifference >= 0 ? "melhor" : "pior";
  const percentage = comparison.resultComparisonPercentage;
  return percentage == null
    ? `O resultado ficou ${money(Math.abs(comparison.resultDifference))} ${direction} que no mês anterior.`
    : `O resultado ficou ${Math.abs(percentage).toLocaleString("pt-BR")}% ${direction} que no mês anterior.`;
}

export default function TucxaTransparenciaPage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [simulatorPeople, setSimulatorPeople] = useState("10");
  const [simulatorAmount, setSimulatorAmount] = useState("50");

  useEffect(() => {
    let active = true;
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

    return () => {
      active = false;
    };
  }, []);

  const snapshot = payload.snapshot;
  const data = snapshot?.payload;
  const maxValue = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.monthly ?? []).flatMap((item) => [
          item.revenues,
          item.expenses,
        ]),
      ),
    [data?.monthly],
  );

  const topExpenses = useMemo(
    () =>
      (data?.groups ?? [])
        .filter((group) => group.type === "despesa")
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    [data?.groups],
  );
  const topRevenues = useMemo(
    () =>
      (data?.groups ?? [])
        .filter((group) => group.type === "receita")
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    [data?.groups],
  );

  const simulatorTotal =
    Math.max(0, Number(simulatorPeople) || 0) *
    Math.max(0, Number(simulatorAmount.replace(",", ".")) || 0);
  const latestGap = data ? Math.max(0, data.latest.expenses - data.latest.revenues) : 0;
  const simulatorRemaining = Math.max(0, latestGap - simulatorTotal);

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
            {data?.settings.headline || "Transparência fortalece a confiança."}
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA]">
            {data?.settings.message ||
              "Acompanhe a aplicação coletiva dos recursos sem exposição de quem contribuiu."}
          </p>
          {snapshot && (
            <p className="mt-4 text-xs font-bold text-[#CFE2C7]">
              Última publicação: {dateTime(snapshot.published_at)}
            </p>
          )}
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

        {!loading && !snapshot && !payload.error && (
          <section className="rounded-[2rem] bg-white p-6 text-center shadow ring-1 ring-[#123D2C]/10">
            <h2 className="text-2xl font-black text-[#123D2C]">
              Prestação em preparação
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              {payload.message ||
                "A Tesouraria/Financeiro ainda está revisando os dados para a primeira publicação."}
            </p>
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao"
              className="mt-5 inline-flex rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white"
            >
              Contribuir com a Casa
            </Link>
          </section>
        )}

        {data && (
          <>
            {data.provisionalNotice && (
              <section className="rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
                <p className="font-black">Dados provisórios</p>
                <p className="mt-1 text-sm leading-6">{data.provisionalNotice}</p>
              </section>
            )}

            {data.latest.balanceDivergence && (
              <section className="rounded-2xl bg-blue-50 p-4 text-blue-900 ring-1 ring-blue-200">
                <p className="font-black">Saldo em conferência</p>
                <p className="mt-1 text-sm leading-6">
                  O saldo informado no balancete possui diferença em relação ao saldo calculado pelas receitas e despesas. A Tesouraria preservou o valor original para conferência.
                </p>
              </section>
            )}

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                  Receitas do mês
                </p>
                <p className="mt-2 text-xl font-black text-emerald-800">
                  {money(data.latest.revenues)}
                </p>
              </article>
              <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                  Despesas do mês
                </p>
                <p className="mt-2 text-xl font-black text-amber-800">
                  {money(data.latest.expenses)}
                </p>
              </article>
              <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                  Resultado do mês
                </p>
                <p
                  className={`mt-2 text-xl font-black ${
                    data.latest.result < 0 ? "text-red-700" : "text-[#123D2C]"
                  }`}
                >
                  {money(data.latest.result)}
                </p>
              </article>
              <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                  Dados confirmados
                </p>
                <p className="mt-2 text-xl font-black text-[#123D2C]">
                  {data.confirmedPercentage}%
                </p>
              </article>
            </section>

            <section className="grid gap-3 lg:grid-cols-3">
              {data.settings.showAccumulatedBalance && (
                <article className="rounded-[1.5rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                    Saldo acumulado
                  </p>
                  <p
                    className={`mt-2 text-2xl font-black ${
                      (data.accumulatedBalance ?? 0) < 0
                        ? "text-red-700"
                        : "text-[#123D2C]"
                    }`}
                  >
                    {money(data.accumulatedBalance)}
                  </p>
                </article>
              )}
              <article className="rounded-[1.5rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                  Comparação mensal
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                  {comparisonText(data)}
                </p>
              </article>
              <article className="rounded-[1.5rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                  Origem e atualização
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                  {data.latest.sourceLabel || "Dados revisados pela Tesouraria/Financeiro."}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Atualizado em {dateTime(data.latest.updatedAt || data.generatedAt)}
                </p>
              </article>
            </section>

            {data.settings.showLast12Months && (
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <h2 className="text-xl font-black text-[#123D2C]">
                  Histórico dos últimos 12 meses
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Verde representa receitas e dourado representa despesas. Meses provisórios são identificados abaixo.
                </p>
                <div className="mt-5 flex gap-2 overflow-x-auto pb-3">
                  {data.monthly.map((item) => (
                    <div key={item.month} className="min-w-[82px] text-center">
                      <div className="flex h-44 items-end justify-center gap-1 rounded-2xl bg-[#F7FAF2] p-2">
                        <div
                          className="w-3 rounded-t-lg bg-[#2F6B43]"
                          style={{
                            height: `${Math.max(3, (item.revenues / maxValue) * 100)}%`,
                          }}
                          title={`Receitas: ${money(item.revenues)}`}
                        />
                        <div
                          className="w-3 rounded-t-lg bg-[#C7A55B]"
                          style={{
                            height: `${Math.max(3, (item.expenses / maxValue) * 100)}%`,
                          }}
                          title={`Despesas: ${money(item.expenses)}`}
                        />
                      </div>
                      <p className="mt-2 text-xs font-black text-[#123D2C]">
                        {monthLabel(item.month)}
                      </p>
                      <p
                        className={`mt-1 text-[0.68rem] font-black ${
                          item.result < 0 ? "text-red-700" : "text-emerald-800"
                        }`}
                      >
                        {money(item.result)}
                      </p>
                      {item.provisional && (
                        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-black text-amber-800">
                          Provisório
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.settings.detailLevel !== "resumido" && (
              <section className="grid gap-4 lg:grid-cols-2">
                {[
                  {
                    title: "Como os recursos foram aplicados",
                    items: data.settings.showTopExpenses ? topExpenses : [],
                    type: "despesa" as const,
                  },
                  {
                    title: "De onde vieram os recursos",
                    items: data.settings.showTopRevenues ? topRevenues : [],
                    type: "receita" as const,
                  },
                ].map((section) => (
                  <article
                    key={section.type}
                    className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6"
                  >
                    <h2 className="text-xl font-black text-[#123D2C]">
                      {section.title}
                    </h2>
                    <div className="mt-4 grid gap-3">
                      {section.items.map((group) => {
                        const key = `${section.type}:${group.group}`;
                        const canOpen =
                          data.settings.showDrilldown &&
                          data.settings.detailLevel === "itens" &&
                          group.items.length > 0;
                        return (
                          <div
                            key={key}
                            className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
                          >
                            <button
                              type="button"
                              disabled={!canOpen}
                              onClick={() =>
                                setOpenGroups((current) => ({
                                  ...current,
                                  [key]: !current[key],
                                }))
                              }
                              className="flex w-full items-center justify-between gap-3 text-left"
                            >
                              <span className="font-black text-[#123D2C]">
                                {group.group}
                              </span>
                              <span className="shrink-0 font-black text-[#123D2C]">
                                {money(group.total)}
                              </span>
                            </button>
                            {canOpen && openGroups[key] && (
                              <div className="mt-3 grid gap-2 border-t border-[#123D2C]/10 pt-3">
                                {group.items.map((item) => (
                                  <div
                                    key={item.name}
                                    className="flex items-start justify-between gap-3 text-sm"
                                  >
                                    <span className="text-slate-600">{item.name}</span>
                                    <span className="shrink-0 font-bold text-[#123D2C]">
                                      {money(item.total)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {section.items.length === 0 && (
                        <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                          Este destaque foi desativado pela Tesouraria/Financeiro.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            )}

            {data.settings.showNegativeResults && data.latest.result < 0 && (
              <section className="rounded-[2rem] bg-red-50 p-5 text-red-900 ring-1 ring-red-100 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em]">
                  Atenção do mês
                </p>
                <h2 className="mt-2 text-xl font-black">
                  As despesas superaram as receitas em {money(Math.abs(data.latest.result))}.
                </h2>
                <p className="mt-2 text-sm leading-6">
                  O destaque ajuda a comunidade a compreender a situação sem expor contribuições individuais.
                </p>
              </section>
            )}

            {data.settings.showSimulator && (
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Simulação de equilíbrio
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
                  Pequenas participações podem reduzir uma diferença coletiva.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  Esta simulação não cria cobrança e não substitui a prestação de contas. Ela apenas mostra o impacto matemático de um grupo contribuindo com um mesmo valor.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 font-black text-[#123D2C]">
                    Quantidade de pessoas
                    <input
                      type="number"
                      min="0"
                      value={simulatorPeople}
                      onChange={(event) => setSimulatorPeople(event.target.value)}
                      className="rounded-2xl border border-slate-200 p-4"
                    />
                  </label>
                  <label className="grid gap-2 font-black text-[#123D2C]">
                    Valor médio por pessoa
                    <input
                      value={simulatorAmount}
                      onChange={(event) => setSimulatorAmount(event.target.value)}
                      inputMode="decimal"
                      className="rounded-2xl border border-slate-200 p-4"
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Impacto simulado</p>
                    <p className="mt-2 text-xl font-black text-[#123D2C]">{money(simulatorTotal)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Diferença atual</p>
                    <p className="mt-2 text-xl font-black text-red-700">{money(latestGap)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Diferença restante</p>
                    <p className="mt-2 text-xl font-black text-[#123D2C]">{money(simulatorRemaining)}</p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-[2rem] bg-[#E9F2E7] p-5 text-center ring-1 ring-[#123D2C]/10 sm:p-7">
              <h2 className="text-2xl font-black text-[#123D2C]">
                Manter a Casa em harmonia também é cuidar de cada trabalho.
              </h2>
              <p className="mx-auto mt-3 max-w-3xl leading-7 text-slate-700">
                Você escolhe o valor, se deseja se identificar e se prefere contribuir uma vez ou organizar uma contribuição recorrente.
              </p>
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao"
                className="mt-5 inline-flex rounded-2xl bg-[#123D2C] px-6 py-4 font-black text-white"
              >
                Contribuir com sigilo
              </Link>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
