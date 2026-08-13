"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type PopupKey = "finalizado" | "detalhado" | "analises" | "imprimir" | null;

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
          Ainda não há competência finalizada disponível para este quadro.
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
        {monthsCount > 0
          ? `Média mensal = total do item no período ÷ ${monthsCount} ${
              monthsCount === 1 ? "mês finalizado selecionado" : "meses finalizados selecionados"
            }.`
          : "Selecione um período que contenha pelo menos uma competência finalizada."}
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
          Não há lançamentos realizados nas competências finalizadas deste período.
        </p>
      )}
    </article>
  );
}

function Popup({
  title,
  subtitle,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="screen-only fixed inset-0 z-[100] flex items-center justify-center bg-[#10251C]/70 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`max-h-[92vh] w-full overflow-y-auto rounded-[2rem] bg-[#F7FAF2] shadow-2xl ring-1 ring-white/30 ${
          wide ? "max-w-7xl" : "max-w-3xl"
        }`}
      >
        <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
              Corrente em Dia · Análises
            </p>
            <h2 className="mt-1 text-xl font-black text-[#123D2C] sm:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
          >
            Fechar
          </button>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

export default function AnalisesFinanceirasPage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);
  const [openPopup, setOpenPopup] = useState<PopupKey>(null);
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

    // availableMonths já contém somente competências finalizadas, pois a API
    // filtra a base antes de enviá-la ao navegador.
    return availableMonths.filter(
      (month) => month >= selectedRange.start && month <= selectedRange.end,
    );
  }, [availableMonths, selectedRange]);

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
      .sort((left, right) =>
        monthDate(left.month).localeCompare(monthDate(right.month)),
      );

    const openingBalance = periods[0]?.openingBalance ?? null;
    const closingBalance =
      periods.length > 0
        ? periods[periods.length - 1]?.closingBalance ?? null
        : null;
    const result = revenues - expenses;
    const revenueRanking = rank("receita");
    const expenseRanking = rank("despesa");

    let explanation =
      "Não há competências finalizadas com dados realizados suficientes no período selecionado para explicar a evolução do saldo.";

    if (selectedMonths.length && realizedEntries.length) {
      const startText =
        openingBalance == null
          ? "sem saldo inicial informado"
          : `partindo de ${money(openingBalance)}`;
      const endText =
        closingBalance == null
          ? "sem saldo final informado"
          : `chegando a ${money(closingBalance)}`;
      const topRevenue = revenueRanking[0];
      const topExpense = expenseRanking[0];

      if (result < 0) {
        explanation = `Nas competências finalizadas do período, as despesas superaram as receitas em ${money(
          Math.abs(result),
        )}. Entraram ${money(revenues)} e saíram ${money(
          expenses,
        )}, ${startText} e ${endText}.`;
      } else if (closingBalance != null && closingBalance < 0) {
        explanation = `As competências finalizadas do período geraram resultado positivo de ${money(
          result,
        )}, porém ele ainda não foi suficiente para absorver o déficit trazido do início do período (${money(
          openingBalance,
        )}). O saldo encerrou em ${money(closingBalance)}.`;
      } else {
        explanation = `Nas competências finalizadas do período, as receitas superaram as despesas em ${money(
          result,
        )}. Foram ${money(revenues)} de entradas contra ${money(
          expenses,
        )} de saídas, ${startText} e ${endText}.`;
      }

      if (topRevenue) {
        explanation += ` O item de receita com maior média mensal foi “${topRevenue.name}” (${money(
          topRevenue.average,
        )}/mês finalizado).`;
      }
      if (topExpense) {
        explanation += ` Entre as despesas, o maior item médio foi “${topExpense.name}” (${money(
          topExpense.average,
        )}/mês finalizado).`;
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

  const rangeError = Boolean(
    selectedRange.start &&
      selectedRange.end &&
      selectedRange.start > selectedRange.end,
  );

  const analysisContent = (
    <>
      <p className="max-w-5xl text-sm font-semibold leading-6 text-slate-600">
        As análises consideram exclusivamente competências finalizadas. Meses em
        andamento, em revisão, reabertos ou ainda não finalizados ficam fora das
        médias e da explicação do saldo.
      </p>

      <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">
          Período
        </label>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as FilterMode)}
          className="mt-2 w-full rounded-xl border border-[#123D2C]/20 bg-white px-3 py-3 font-bold text-[#123D2C]"
        >
          <option value="all">Toda a base finalizada</option>
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
          Período analisado: {" "}
          {selectedRange.start && selectedRange.end
            ? `${monthLabel(selectedRange.start)} a ${monthLabel(selectedRange.end)}`
            : "—"}{" "}
          · {selectedMonths.length}{" "}
          {selectedMonths.length === 1
            ? "competência finalizada"
            : "competências finalizadas"}
        </p>
      </div>

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

          <article className="mt-4 rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
            <h3 className="text-xl font-black text-[#123D2C]">
              O que levou o saldo bancário a estar positivo ou negativo?
            </h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
              {analysis.explanation}
            </p>
            <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-5 text-slate-500">
              Leitura automática baseada somente nos lançamentos realizados das
              competências finalizadas do período selecionado. Ela apoia a análise
              da Tesouraria/Financeiro e Diretoria e não substitui a conferência dos
              documentos e lançamentos de origem.
            </p>
          </article>
        </>
      )}
    </>
  );

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

      <section className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CFE2C7]">
            Tesouraria / Financeiro
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            Análises financeiras do Tucxa
          </h1>
          <p className="mt-3 max-w-5xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            Esta área reúne a competência finalizada, o detalhamento mensal e análises
            sobre receitas, despesas e evolução do saldo. Os filtros permitem observar
            toda a base ou períodos específicos para apoiar decisões da
            Tesouraria/Financeiro e Diretoria.
          </p>
        </section>

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

        {!loading && payload.live && (
          <nav className="screen-only grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setOpenPopup("finalizado")}
              className="min-h-24 rounded-2xl bg-white px-4 py-4 text-center shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">Finalizado</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                Última competência encerrada
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOpenPopup("detalhado")}
              className="min-h-24 rounded-2xl bg-white px-4 py-4 text-center shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">Detalhado</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                Competências finalizadas por item
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOpenPopup("analises")}
              className="min-h-24 rounded-2xl bg-white px-4 py-4 text-center shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">Análises</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                Médias, tendências e saldo
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOpenPopup("imprimir")}
              className="min-h-24 rounded-2xl bg-white px-4 py-4 text-center shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">Imprimir PDF</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                Relatório completo para impressão
              </span>
            </button>
          </nav>
        )}
      </section>

      {openPopup === "finalizado" && payload.live && (
        <Popup
          title="Competência finalizada"
          subtitle="Última competência conferida e encerrada pela Tesouraria/Financeiro."
          onClose={() => setOpenPopup(null)}
        >
          <SummaryCard
            title="Finalizado"
            subtitle="Valores oficiais da última competência finalizada."
            month={payload.live.latestFinalized}
          />
        </Popup>
      )}

      {openPopup === "detalhado" && payload.live && (
        <Popup
          title="Detalhado"
          subtitle="Receitas, despesas e saldos somente das competências finalizadas."
          onClose={() => setOpenPopup(null)}
          wide
        >
          <FinancialTransparencyMatrix
            matrix={payload.live.matrix}
            title="Detalhado"
            description="Competências finalizadas, com receitas, despesas e saldos organizados por mês."
          />
        </Popup>
      )}

      {openPopup === "analises" && payload.live && (
        <Popup
          title="Análises"
          subtitle="Filtros e respostas automáticas considerando somente competências finalizadas."
          onClose={() => setOpenPopup(null)}
          wide
        >
          {analysisContent}
        </Popup>
      )}

      {openPopup === "imprimir" && payload.live && (
        <Popup
          title="Imprimir PDF"
          subtitle="O relatório reúne Finalizado, Detalhado e Análises."
          onClose={() => setOpenPopup(null)}
        >
          <div className="rounded-[1.5rem] bg-white p-5 ring-1 ring-[#123D2C]/10">
            <p className="font-bold leading-7 text-slate-700">
              A impressão considera somente competências finalizadas e usa o período
              atualmente selecionado na opção Análises. No diálogo de impressão do
              navegador, escolha <strong>Salvar como PDF</strong> para gerar o arquivo.
            </p>
            <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-sm font-bold text-[#123D2C]">
              Período das análises: {selectedRange.start && selectedRange.end
                ? `${monthLabel(selectedRange.start)} a ${monthLabel(selectedRange.end)}`
                : "—"} · {selectedMonths.length} {selectedMonths.length === 1
                ? "competência finalizada"
                : "competências finalizadas"}
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-5 w-full rounded-xl bg-[#123D2C] px-5 py-4 font-black text-white"
            >
              Abrir impressão / Salvar em PDF
            </button>
          </div>
        </Popup>
      )}

      {payload.live && (
        <section className="print-only">
          <h1 style={{ fontSize: "22px", fontWeight: 800 }}>
            Análises financeiras do Tucxa
          </h1>
          <p style={{ marginTop: "6px" }}>
            Relatório baseado somente em competências finalizadas.
          </p>

          <div className="print-card" style={{ marginTop: "12px" }}>
            <SummaryCard
              title="Finalizado"
              subtitle="Última competência conferida e encerrada pela Tesouraria/Financeiro."
              month={payload.live.latestFinalized}
            />
          </div>

          <h2 style={{ marginTop: "18px", fontSize: "18px", fontWeight: 800 }}>
            Análises
          </h2>
          <p style={{ marginTop: "6px", fontWeight: 700 }}>
            Período analisado: {selectedRange.start && selectedRange.end
              ? `${monthLabel(selectedRange.start)} a ${monthLabel(selectedRange.end)}`
              : "—"} · {selectedMonths.length} {selectedMonths.length === 1
              ? "competência finalizada"
              : "competências finalizadas"}
          </p>

          <div className="print-card" style={{ marginTop: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <tbody>
                {[
                  ["Saldo inicial", analysis.openingBalance],
                  ["Receitas", analysis.revenues],
                  ["Despesas", analysis.expenses],
                  ["Resultado", analysis.result],
                  ["Saldo final", analysis.closingBalance],
                ].map(([label, value]) => (
                  <tr key={String(label)}>
                    <td style={{ border: "1px solid #999", padding: "5px", fontWeight: 700 }}>
                      {String(label)}
                    </td>
                    <td style={{ border: "1px solid #999", padding: "5px", textAlign: "right" }}>
                      {money(value as number | null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-card" style={{ marginTop: "12px" }}>
            <h3 style={{ fontWeight: 800 }}>Maiores receitas médias</h3>
            <ol>
              {analysis.revenueRanking.slice(0, 10).map((item) => (
                <li key={item.name}>
                  {item.name}: {money(item.average)}/mês · total {money(item.total)}
                </li>
              ))}
            </ol>
          </div>

          <div className="print-card" style={{ marginTop: "12px" }}>
            <h3 style={{ fontWeight: 800 }}>Maiores despesas médias</h3>
            <ol>
              {analysis.expenseRanking.slice(0, 10).map((item) => (
                <li key={item.name}>
                  {item.name}: {money(item.average)}/mês · total {money(item.total)}
                </li>
              ))}
            </ol>
          </div>

          <div className="print-card" style={{ marginTop: "12px" }}>
            <h3 style={{ fontWeight: 800 }}>
              O que levou o saldo bancário a estar positivo ou negativo?
            </h3>
            <p>{analysis.explanation}</p>
          </div>

          <h2 style={{ marginTop: "18px", fontSize: "18px", fontWeight: 800 }}>
            Detalhado — competências finalizadas
          </h2>
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
                    {group.type === "receita" ? "Receita" : "Despesa"} · {group.group}
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
      )}
    </main>
  );
}
