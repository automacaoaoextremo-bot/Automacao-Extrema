"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import {
  FinancialTransparencyMatrix,
  type FinancialTransparencyMatrixData,
} from "@/components/organizacao-em-harmonia/financial-transparency-matrix";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PANEL_BASE =
  "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const CORRENTE_BASE = `${PANEL_BASE}/corrente-em-dia`;

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

type LivePayload = {
  latestFinalized: MonthSummary | null;
  currentForecast: MonthSummary;
  matrix: FinancialTransparencyMatrixData;
};

type AnalysisEntry = {
  type: "receita" | "despesa";
  month: string;
  item: string;
  group: string;
  amount: number;
  dataNature: "realizado" | "estimado";
  workflowStatus: string;
  sourceType: string;
};

type AnalysisPeriod = {
  month: string;
  status: string;
  workflowStatus: string;
  dataNature: "realizado" | "estimado";
  openingBalance: number;
  closingBalance: number | null;
  sourceLabel: string | null;
  updatedAt: string | null;
};

type ApiPayload = {
  live?: LivePayload;
  analysisBase?: {
    periods: AnalysisPeriod[];
    entries: AnalysisEntry[];
  };
  error?: string;
};

type FilterMode =
  | "all"
  | "custom"
  | "quarter"
  | "semester"
  | "last12"
  | "year";

type RankedItem = {
  name: string;
  total: number;
  average: number;
  activeMonths: number;
};

const actions: PanelHeaderAction[] = [
  { label: "Início", href: CORRENTE_BASE, variant: "primary" },
  { label: "Voltar", href: CORRENTE_BASE, variant: "secondary" },
  filhoSupportAction,
  filhoSignOutAction,
];

function money(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function monthDate(value: string) {
  return `${monthKey(value)}-01`;
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${monthDate(value)}T12:00:00Z`))
    .replace(".", "");
}

function monthSequence(start: string, end: string) {
  const result: string[] = [];
  const [startYear, startMonth] = monthKey(start).split("-").map(Number);
  const [endYear, endMonth] = monthKey(end).split("-").map(Number);

  if (!startYear || !startMonth || !endYear || !endMonth) return result;

  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1, 12));
  const limit = new Date(Date.UTC(endYear, endMonth - 1, 1, 12));

  while (cursor <= limit) {
    result.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(
        2,
        "0",
      )}-01`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function addMonths(value: string, amount: number) {
  const [year, month] = monthKey(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

function SummaryCard({
  title,
  subtitle,
  month,
}: {
  title: string;
  subtitle: string;
  month: MonthSummary | null;
}) {
  if (!month) {
    return (
      <article className="rounded-[1.75rem] bg-amber-50 p-5 ring-1 ring-amber-200">
        <h2 className="text-xl font-black text-amber-950">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
          Ainda não há dados disponíveis para este quadro.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
        {title}
      </p>
      <h2 className="mt-1 text-2xl font-black capitalize text-[#123D2C]">
        {monthLabel(month.month)}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
        {subtitle}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric label="Receitas" value={month.revenues} />
        <Metric label="Despesas" value={month.expenses} />
        <Metric label="Resultado" value={month.result} />
        <Metric
          label="Saldo final"
          value={month.closingBalance ?? month.bankBalance}
        />
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const numeric = value == null ? null : Number(value);
  return (
    <div className="rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-black ${
          numeric != null && numeric < 0 ? "text-red-700" : "text-[#123D2C]"
        }`}
      >
        {money(numeric)}
      </p>
    </div>
  );
}

function RankingTable({
  title,
  items,
  monthsCount,
}: {
  title: string;
  items: RankedItem[];
  monthsCount: number;
}) {
  return (
    <article className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
      <h3 className="text-xl font-black text-[#123D2C]">{title}</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        Média mensal = total do item no período ÷ {monthsCount}{" "}
        {monthsCount === 1 ? "mês selecionado" : "meses selecionados"}.
      </p>
      {items.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-[#2F6B43]">
                <th className="border-b border-[#123D2C]/10 px-2 py-2">Item</th>
                <th className="border-b border-[#123D2C]/10 px-2 py-2 text-right">
                  Média/mês
                </th>
                <th className="border-b border-[#123D2C]/10 px-2 py-2 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 10).map((item, index) => (
                <tr key={`${item.name}-${index}`}>
                  <td className="border-b border-[#123D2C]/5 px-2 py-3 font-bold text-slate-700">
                    {index + 1}. {item.name}
                  </td>
                  <td className="border-b border-[#123D2C]/5 px-2 py-3 text-right font-black text-[#123D2C]">
                    {money(item.average)}
                  </td>
                  <td className="border-b border-[#123D2C]/5 px-2 py-3 text-right font-semibold text-slate-600">
                    {money(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">
          Não há lançamentos realizados neste período.
        </p>
      )}
    </article>
  );
}

export default function AnalisesFinanceirasPage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FilterMode>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState("1");
  const [semester, setSemester] = useState("1");

  useEffect(() => {
    let active = true;

    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        if (active) {
          setPayload({ error: "Sessão expirada. Entre novamente no painel." });
          setLoading(false);
        }
        return;
      }

      const response = await fetch(
        "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia/analises",
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const result = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!active) return;
      setPayload(
        response.ok
          ? result
          : { error: result.error || "Não foi possível carregar as análises." },
      );
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const availableMonths = useMemo(() => {
    const values = new Set<string>();
    for (const period of payload.analysisBase?.periods ?? []) {
      values.add(monthDate(period.month));
    }
    for (const entry of payload.analysisBase?.entries ?? []) {
      values.add(monthDate(entry.month));
    }
    return Array.from(values).sort();
  }, [payload.analysisBase]);

  const availableYears = useMemo(
    () =>
      Array.from(new Set(availableMonths.map((month) => month.slice(0, 4)))).sort(
        (left, right) => right.localeCompare(left),
      ),
    [availableMonths],
  );

  const selectedRange = useMemo(() => {
    const first = availableMonths[0] || "";
    const last = availableMonths[availableMonths.length - 1] || "";
    if (!first || !last) return { start: "", end: "" };

    if (mode === "custom") {
      return {
        start: customStart ? `${customStart}-01` : first,
        end: customEnd ? `${customEnd}-01` : last,
      };
    }

    if (mode === "last12") {
      return {
        start: addMonths(last, -11),
        end: last,
      };
    }

    const selectedYear = year || availableYears[0] || "";

    if (mode === "year" && selectedYear) {
      return {
        start: `${selectedYear}-01-01`,
        end: `${selectedYear}-12-01`,
      };
    }

    if (mode === "quarter" && selectedYear) {
      const startMonth = (Number(quarter) - 1) * 3 + 1;
      return {
        start: `${selectedYear}-${String(startMonth).padStart(2, "0")}-01`,
        end: `${selectedYear}-${String(startMonth + 2).padStart(2, "0")}-01`,
      };
    }

    if (mode === "semester" && selectedYear) {
      return Number(semester) === 1
        ? { start: `${selectedYear}-01-01`, end: `${selectedYear}-06-01` }
        : { start: `${selectedYear}-07-01`, end: `${selectedYear}-12-01` };
    }

    return { start: first, end: last };
  }, [
    availableMonths,
    availableYears,
    customEnd,
    customStart,
    mode,
    quarter,
    semester,
    year,
  ]);

  const selectedMonths = useMemo(() => {
    if (!selectedRange.start || !selectedRange.end) return [];
    if (selectedRange.start > selectedRange.end) return [];
    return monthSequence(selectedRange.start, selectedRange.end);
  }, [selectedRange]);

  const analysis = useMemo(() => {
    const monthSet = new Set(selectedMonths);
    const realizedEntries = (payload.analysisBase?.entries ?? []).filter(
      (entry) =>
        entry.dataNature === "realizado" && monthSet.has(monthDate(entry.month)),
    );

    function rank(type: "receita" | "despesa") {
      const totals = new Map<string, { total: number; months: Set<string> }>();
      for (const entry of realizedEntries.filter((row) => row.type === type)) {
        const current = totals.get(entry.item) ?? {
          total: 0,
          months: new Set<string>(),
        };
        current.total += Number(entry.amount) || 0;
        current.months.add(monthDate(entry.month));
        totals.set(entry.item, current);
      }

      return Array.from(totals.entries())
        .map(
          ([name, value]): RankedItem => ({
            name,
            total: value.total,
            average:
              selectedMonths.length > 0
                ? value.total / selectedMonths.length
                : 0,
            activeMonths: value.months.size,
          }),
        )
        .sort((left, right) => right.average - left.average);
    }

    const revenues = realizedEntries
      .filter((entry) => entry.type === "receita")
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const expenses = realizedEntries
      .filter((entry) => entry.type === "despesa")
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

    const periods = (payload.analysisBase?.periods ?? [])
      .filter((period) => monthSet.has(monthDate(period.month)))
      .sort((left, right) => monthDate(left.month).localeCompare(monthDate(right.month)));

    const openingBalance = periods[0]?.openingBalance ?? null;
    const closingBalance =
      periods.length > 0 ? periods[periods.length - 1]?.closingBalance ?? null : null;
    const result = revenues - expenses;
    const revenueRanking = rank("receita");
    const expenseRanking = rank("despesa");

    let explanation =
      "Não há dados realizados suficientes no período selecionado para explicar a evolução do saldo.";

    if (selectedMonths.length && realizedEntries.length) {
      const startText =
        openingBalance == null ? "sem saldo inicial informado" : `partindo de ${money(openingBalance)}`;
      const endText =
        closingBalance == null ? "sem saldo final informado" : `chegando a ${money(closingBalance)}`;
      const topRevenue = revenueRanking[0];
      const topExpense = expenseRanking[0];

      if (result < 0) {
        explanation = `No período, as despesas superaram as receitas em ${money(
          Math.abs(result),
        )}. O saldo ficou pressionado porque entraram ${money(
          revenues,
        )} e saíram ${money(expenses)}, ${startText} e ${endText}.`;
      } else if (closingBalance != null && closingBalance < 0) {
        explanation = `O período gerou resultado positivo de ${money(
          result,
        )}, porém ele ainda não foi suficiente para absorver o déficit trazido do início do período (${money(
          openingBalance,
        )}). O saldo encerrou em ${money(closingBalance)}.`;
      } else {
        explanation = `As receitas superaram as despesas em ${money(
          result,
        )}. Foram ${money(revenues)} de entradas contra ${money(
          expenses,
        )} de saídas, ${startText} e ${endText}.`;
      }

      if (topRevenue) {
        explanation += ` O item de receita com maior média mensal foi “${topRevenue.name}” (${money(
          topRevenue.average,
        )}/mês).`;
      }
      if (topExpense) {
        explanation += ` Entre as despesas, o maior item médio foi “${topExpense.name}” (${money(
          topExpense.average,
        )}/mês).`;
      }
    }

    return {
      revenues,
      expenses,
      result,
      openingBalance,
      closingBalance,
      revenueRanking,
      expenseRanking,
      explanation,
    };
  }, [payload.analysisBase, selectedMonths]);

  const rangeError =
    selectedRange.start &&
    selectedRange.end &&
    selectedRange.start > selectedRange.end;

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Corrente em Dia · Análises"
        showSupport={false}
        actions={actions}
      />

      <style jsx global>{`
        .print-only {
          display: none;
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background: white !important;
          }
          header,
          .screen-only {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-card {
            break-inside: avoid;
          }
        }
      `}</style>

      <section className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CFE2C7]">
            Tesouraria / Financeiro
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            Análises financeiras do Tucxa
          </h1>
          <p className="mt-3 max-w-5xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            Esta área reúne a competência finalizada, a visão atual, o detalhamento
            mensal e análises sobre receitas, despesas e evolução do saldo. Os
            filtros permitem observar toda a base ou períodos específicos para
            apoiar decisões da Tesouraria/Financeiro.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="screen-only mt-5 rounded-xl bg-white px-5 py-3 font-black text-[#123D2C]"
          >
            Imprimir / Salvar em PDF
          </button>
        </section>

        <nav className="screen-only grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Finalizado", "#finalizado"],
            ["Atual", "#atual"],
            ["Detalhado", "#detalhado"],
            ["Análises", "#analises"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-xl bg-white px-3 py-3 text-center text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10"
            >
              {label}
            </a>
          ))}
        </nav>

        {loading && (
          <p className="rounded-2xl bg-white p-5 font-bold text-[#123D2C] shadow">
            Carregando informações financeiras...
          </p>
        )}

        {payload.error && (
          <p className="rounded-2xl bg-red-50 p-5 font-bold leading-6 text-red-700 ring-1 ring-red-200">
            {payload.error}
          </p>
        )}

        {payload.live && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div id="finalizado" className="scroll-mt-40 print-card">
                <SummaryCard
                  title="Finalizado"
                  subtitle="Última competência conferida e encerrada pela Tesouraria/Financeiro."
                  month={payload.live.latestFinalized}
                />
              </div>
              <div id="atual" className="scroll-mt-40 print-card">
                <SummaryCard
                  title="Atual"
                  subtitle="Visão do mês atual considerando valores realizados e estimativas disponíveis."
                  month={payload.live.currentForecast}
                />
              </div>
            </div>

            <div id="detalhado" className="screen-only scroll-mt-40">
              <FinancialTransparencyMatrix
                matrix={payload.live.matrix}
                title="Detalhado"
                description="Competências finalizadas, com receitas, despesas e saldos organizados por mês."
              />
            </div>

            <section
              id="analises"
              className="scroll-mt-40 rounded-[2rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:p-6"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                Análises
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#123D2C]">
                O que os números ajudam a entender?
              </h2>
              <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-slate-600">
                As médias abaixo consideram os lançamentos realizados da base e
                dividem o total de cada item pela quantidade de meses do período
                escolhido. A visão Atual continua separada para preservar as
                estimativas e previsões do mês em andamento.
              </p>

              <div className="screen-only mt-5 rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10">
                <label className="text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">
                  Período
                </label>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as FilterMode)}
                  className="mt-2 w-full rounded-xl border border-[#123D2C]/20 bg-white px-3 py-3 font-bold text-[#123D2C]"
                >
                  <option value="all">Toda a base</option>
                  <option value="custom">Mês inicial e final</option>
                  <option value="quarter">Trimestre</option>
                  <option value="semester">Semestre</option>
                  <option value="last12">Últimos 12 meses</option>
                  <option value="year">Ano</option>
                </select>

                {mode === "custom" && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold text-slate-700">
                      Mês inicial
                      <input
                        type="month"
                        value={customStart || availableMonths[0]?.slice(0, 7) || ""}
                        onChange={(event) => setCustomStart(event.target.value)}
                        className="mt-1 block w-full rounded-xl border border-[#123D2C]/20 px-3 py-3"
                      />
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      Mês final
                      <input
                        type="month"
                        value={
                          customEnd ||
                          availableMonths[availableMonths.length - 1]?.slice(0, 7) ||
                          ""
                        }
                        onChange={(event) => setCustomEnd(event.target.value)}
                        className="mt-1 block w-full rounded-xl border border-[#123D2C]/20 px-3 py-3"
                      />
                    </label>
                  </div>
                )}

                {["quarter", "semester", "year"].includes(mode) && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold text-slate-700">
                      Ano
                      <select
                        value={year || availableYears[0] || ""}
                        onChange={(event) => setYear(event.target.value)}
                        className="mt-1 block w-full rounded-xl border border-[#123D2C]/20 bg-white px-3 py-3"
                      >
                        {availableYears.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    {mode === "quarter" && (
                      <label className="text-sm font-bold text-slate-700">
                        Trimestre
                        <select
                          value={quarter}
                          onChange={(event) => setQuarter(event.target.value)}
                          className="mt-1 block w-full rounded-xl border border-[#123D2C]/20 bg-white px-3 py-3"
                        >
                          <option value="1">1º trimestre</option>
                          <option value="2">2º trimestre</option>
                          <option value="3">3º trimestre</option>
                          <option value="4">4º trimestre</option>
                        </select>
                      </label>
                    )}

                    {mode === "semester" && (
                      <label className="text-sm font-bold text-slate-700">
                        Semestre
                        <select
                          value={semester}
                          onChange={(event) => setSemester(event.target.value)}
                          className="mt-1 block w-full rounded-xl border border-[#123D2C]/20 bg-white px-3 py-3"
                        >
                          <option value="1">1º semestre</option>
                          <option value="2">2º semestre</option>
                        </select>
                      </label>
                    )}
                  </div>
                )}

                <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-sm font-bold text-[#123D2C]">
                  Período analisado:{" "}
                  {selectedRange.start && selectedRange.end
                    ? `${monthLabel(selectedRange.start)} a ${monthLabel(
                        selectedRange.end,
                      )}`
                    : "—"}{" "}
                  · {selectedMonths.length}{" "}
                  {selectedMonths.length === 1 ? "mês" : "meses"}
                </p>
              </div>

              <p className="print-only" style={{ marginTop: "8px", fontWeight: 700 }}>
                Período analisado: {selectedRange.start && selectedRange.end
                  ? `${monthLabel(selectedRange.start)} a ${monthLabel(selectedRange.end)}`
                  : "—"} · {selectedMonths.length} {selectedMonths.length === 1 ? "mês" : "meses"}
              </p>

              {rangeError ? (
                <p className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-700">
                  O mês inicial deve ser anterior ou igual ao mês final.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Metric label="Saldo inicial" value={analysis.openingBalance} />
                    <Metric label="Receitas" value={analysis.revenues} />
                    <Metric label="Despesas" value={analysis.expenses} />
                    <Metric label="Resultado" value={analysis.result} />
                    <Metric label="Saldo final" value={analysis.closingBalance} />
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <RankingTable
                      title="Quais, em média, os itens com maiores receitas?"
                      items={analysis.revenueRanking}
                      monthsCount={selectedMonths.length}
                    />
                    <RankingTable
                      title="Quais, em média, os itens com maiores despesas?"
                      items={analysis.expenseRanking}
                      monthsCount={selectedMonths.length}
                    />
                  </div>

                  <article className="mt-4 rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 print-card">
                    <h3 className="text-xl font-black text-[#123D2C]">
                      O que levou o saldo bancário a estar positivo ou negativo?
                    </h3>
                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
                      {analysis.explanation}
                    </p>
                    <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-5 text-slate-500">
                      Leitura automática baseada nos lançamentos e saldos do
                      período selecionado. Ela apoia a análise da
                      Tesouraria/Financeiro e não substitui a conferência dos
                      documentos e lançamentos de origem.
                    </p>
                  </article>
                </>
              )}
            </section>

            <section className="print-only">
              <h2>Detalhado — competências finalizadas</h2>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "9px",
                  marginTop: "8px",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #999", padding: "4px" }}>
                      Tipo / item
                    </th>
                    {payload.live.matrix.months.map((month) => (
                      <th
                        key={month.month}
                        style={{ border: "1px solid #999", padding: "4px" }}
                      >
                        {monthLabel(month.month)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #999", padding: "4px" }}>
                      Saldo final
                    </td>
                    {payload.live.matrix.months.map((month) => (
                      <td
                        key={month.month}
                        style={{
                          border: "1px solid #999",
                          padding: "4px",
                          textAlign: "right",
                        }}
                      >
                        {money(month.closingBalance)}
                      </td>
                    ))}
                  </tr>
                  {payload.live.matrix.groups.flatMap((group) => [
                    <tr key={`group-${group.type}-${group.group}`}>
                      <td
                        style={{
                          border: "1px solid #999",
                          padding: "4px",
                          fontWeight: 700,
                        }}
                      >
                        {group.type === "receita" ? "Receita" : "Despesa"} ·{" "}
                        {group.group}
                      </td>
                      {payload.live!.matrix.months.map((month) => (
                        <td
                          key={month.month}
                          style={{
                            border: "1px solid #999",
                            padding: "4px",
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          {money(group.values[month.month] ?? 0)}
                        </td>
                      ))}
                    </tr>,
                    ...group.items.map((item) => (
                      <tr key={`item-${group.type}-${group.group}-${item.name}`}>
                        <td
                          style={{
                            border: "1px solid #999",
                            padding: "4px 4px 4px 12px",
                          }}
                        >
                          {item.name}
                        </td>
                        {payload.live!.matrix.months.map((month) => (
                          <td
                            key={month.month}
                            style={{
                              border: "1px solid #999",
                              padding: "4px",
                              textAlign: "right",
                            }}
                          >
                            {money(item.values[month.month] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
