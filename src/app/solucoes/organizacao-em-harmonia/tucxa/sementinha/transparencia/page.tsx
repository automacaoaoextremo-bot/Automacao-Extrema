"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FinancialTransparencyMatrix,
  type FinancialTransparencyMatrixData,
} from "@/components/organizacao-em-harmonia/financial-transparency-matrix";
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
  matrix: FinancialTransparencyMatrixData;
};

type ApiPayload = {
  live?: LivePayload;
  error?: string;
};

type PopupKey = "finalizado" | "detalhado" | "analises" | null;
type AnalysisQuestionKey = "receitas" | "despesas" | "saldo" | null;
type FilterMode = "all" | "custom" | "quarter" | "semester" | "last12" | "year";

type RankedItem = {
  name: string;
  total: number;
  average: number;
};

type AnalysisSnapshot = {
  revenues: number;
  expenses: number;
  result: number;
  openingBalance: number | null;
  closingBalance: number | null;
  revenueRanking: RankedItem[];
  expenseRanking: RankedItem[];
};

const SEMENTINHA_BASE = "/solucoes/organizacao-em-harmonia/tucxa/sementinha";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "Voltar", href: SEMENTINHA_BASE, variant: "secondary" as const },
  { label: "Visão", href: `${SEMENTINHA_BASE}#visao`, variant: "secondary" as const },
  { label: "Módulos", href: `${SEMENTINHA_BASE}#modulos`, variant: "secondary" as const },
  { label: "Prestação de Contas", href: "#inicio", variant: "secondary" as const },
  {
    label: "Ajuda",
    href: "#ajuda",
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

function signedStyle(value: number | null | undefined) {
  return {
    color: Number(value ?? 0) < 0 ? "#B42318" : "#123D2C",
    fontWeight: 800,
  } as const;
}

function SignedMoney({
  value,
  suffix = "",
}: {
  value: number | null | undefined;
  suffix?: string;
}) {
  return (
    <strong style={signedStyle(value)}>
      {money(value)}
      {suffix}
    </strong>
  );
}

function publicMessageWithoutCurrent(value?: string | null) {
  const fallback =
    "Acompanhe os recursos das competências finalizadas, com clareza sobre receitas, despesas, resultado e saldo.";
  const current = (value || "").trim();
  if (!current) return fallback;

  const normalized = current
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("mes atual") || normalized.includes("previsao")) {
    return fallback;
  }
  return current;
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

function matrixTypeValue(
  matrix: FinancialTransparencyMatrixData,
  type: "receita" | "despesa",
  month: string,
) {
  return matrix.groups
    .filter((group) => group.type === type)
    .reduce((sum, group) => sum + (Number(group.values[month]) || 0), 0);
}

function rankMatrixItems(
  matrix: FinancialTransparencyMatrixData,
  type: "receita" | "despesa",
  selectedMonths: string[],
): RankedItem[] {
  const selected = new Set(selectedMonths.map(monthKey));
  const totals = new Map<string, number>();

  for (const group of matrix.groups.filter((item) => item.type === type)) {
    for (const item of group.items) {
      const total = matrix.months
        .filter((month) => selected.has(monthKey(month.month)))
        .reduce(
          (sum, month) => sum + (Number(item.values[month.month]) || 0),
          0,
        );
      totals.set(item.name, (totals.get(item.name) ?? 0) + total);
    }
  }

  return Array.from(totals.entries())
    .map(([name, total]) => ({
      name,
      total,
      average: selectedMonths.length > 0 ? total / selectedMonths.length : 0,
    }))
    .filter((item) => item.total !== 0)
    .sort((left, right) => right.average - left.average);
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

function SummaryCard({ month }: { month: MonthSummary | null }) {
  if (!month) {
    return (
      <article className="rounded-[1.75rem] bg-amber-50 p-5 ring-1 ring-amber-200">
        <h2 className="text-xl font-black text-amber-950">Finalizado</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
          Ainda não há competência finalizada disponível para este quadro.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
        Finalizado
      </p>
      <h2 className="mt-1 text-2xl font-black capitalize text-[#123D2C]">
        {monthLabel(month.month)}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
        Valores oficiais da última competência finalizada.
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

function SementinhaActionButtons({
  className = "",
  inverse = false,
}: {
  className?: string;
  inverse?: boolean;
}) {
  const items = [
    { label: "Voltar ao Sementinha", href: SEMENTINHA_BASE },
    { label: "Abrir Despensa Viva", href: `${SEMENTINHA_BASE}/despensa-viva` },
  ];

  return (
    <nav
      aria-label="Atalhos do Sementinha"
      className={`grid w-full grid-cols-2 gap-2 ${className}`}
    >
      {items.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className={`inline-flex min-h-16 flex-col items-center justify-center rounded-2xl px-3 py-2.5 text-center text-sm font-black shadow-sm ring-1 transition hover:-translate-y-0.5 ${
            inverse
              ? index === 0
                ? "bg-[#CFE2C7] text-[#123D2C] ring-white/20 hover:bg-white"
                : "bg-white text-[#123D2C] ring-white/20 hover:bg-[#EEF7EA]"
              : index === 0
                ? "bg-[#123D2C] text-white ring-[#123D2C]"
                : "bg-white text-[#123D2C] ring-[#123D2C]/15 hover:bg-[#F7FAF2]"
          }`}
        >
          <span>{item.label}</span>
          <span
            className={`mt-1 text-[8px] font-black uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.18em] ${
              inverse && index === 0
                ? "text-[#123D2C]/75"
                : inverse
                  ? "text-[#2F6B43]"
                  : index === 0
                    ? "text-white/75"
                    : "text-[#2F6B43]"
            }`}
          >
            TOQUE PARA ABRIR
          </span>
        </Link>
      ))}
    </nav>
  );
}

function SummaryNavigationButtons({
  onOpen,
}: {
  onOpen: (key: Exclude<PopupKey, null>) => void;
}) {
  const items = [
    {
      key: "finalizado" as const,
      label: "Finalizado",
      subtitle: "Última competência encerrada",
    },
    {
      key: "detalhado" as const,
      label: "Detalhado",
      subtitle: "Competências finalizadas por item",
    },
    {
      key: "analises" as const,
      label: "Análises",
      subtitle: "Médias, tendências e saldo",
    },
  ];

  return (
    <nav
      aria-label="Acessos aos quadros financeiros"
      className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onOpen(item.key)}
          className="min-h-24 rounded-2xl bg-white px-2 py-3 text-center shadow ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA] sm:px-4 sm:py-4"
        >
          <span className="block text-sm font-black text-[#123D2C] sm:text-lg">
            {item.label}
          </span>
          <span className="mt-1 block text-[9px] font-semibold leading-3 text-slate-500 sm:text-xs sm:leading-4">
            {item.subtitle}
          </span>
          <span className="mt-2 block text-[8px] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-[10px] sm:tracking-[0.18em]">
            TOQUE PARA ABRIR
          </span>
        </button>
      ))}
    </nav>
  );
}

function Popup({
  title,
  subtitle,
  onClose,
  wide = false,
  nested = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  nested?: boolean;
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
      className={`fixed inset-0 ${
        nested ? "z-[120]" : "z-[100]"
      } flex items-center justify-center bg-[#10251C]/70 p-3 backdrop-blur-sm sm:p-5`}
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
              Prestação de Contas do Sementinha
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
              monthsCount === 1
                ? "mês finalizado selecionado"
                : "meses finalizados selecionados"
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
                  <td
                    className="border-b border-[#123D2C]/5 px-2 py-3 text-right"
                    style={signedStyle(item.average)}
                  >
                    {money(item.average)}
                  </td>
                  <td
                    className="border-b border-[#123D2C]/5 px-2 py-3 text-right"
                    style={signedStyle(item.total)}
                  >
                    {money(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">
          Não há lançamentos nas competências finalizadas deste período.
        </p>
      )}
    </article>
  );
}

function BalanceExplanation({
  analysis,
  monthsCount,
}: {
  analysis: AnalysisSnapshot;
  monthsCount: number;
}) {
  if (monthsCount === 0) {
    return (
      <p className="text-sm font-semibold leading-7 text-slate-700">
        Não há competências finalizadas suficientes no período selecionado para
        explicar a evolução do saldo.
      </p>
    );
  }

  const topRevenue = analysis.revenueRanking[0];
  const topExpense = analysis.expenseRanking[0];

  return (
    <div className="space-y-3 text-sm font-semibold leading-7 text-slate-700">
      <p>
        No período selecionado, o resultado entre receitas e despesas foi{" "}
        <SignedMoney value={analysis.result} />. Foram registradas{" "}
        <SignedMoney value={analysis.revenues} /> em receitas e{" "}
        <SignedMoney value={analysis.expenses} /> em despesas.
      </p>
      <p>
        O saldo partiu de <SignedMoney value={analysis.openingBalance} /> e
        encerrou em <SignedMoney value={analysis.closingBalance} />.
        {analysis.closingBalance != null && analysis.closingBalance < 0
          ? " O encerramento permaneceu negativo no período analisado."
          : analysis.result >= 0
            ? " O resultado do período contribuiu positivamente para a evolução do saldo."
            : " A diferença negativa entre entradas e saídas pressionou a evolução do saldo."}
      </p>
      {(topRevenue || topExpense) && (
        <p>
          {topRevenue && (
            <>
              A maior receita média foi <strong>{topRevenue.name}</strong>, com{" "}
              <SignedMoney value={topRevenue.average} suffix="/mês" />.
            </>
          )}{" "}
          {topExpense && (
            <>
              A maior despesa média foi <strong>{topExpense.name}</strong>, com{" "}
              <SignedMoney value={topExpense.average} suffix="/mês" />.
            </>
          )}
        </p>
      )}
    </div>
  );
}

export default function SementinhaTransparenciaPage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);
  const [openPopup, setOpenPopup] = useState<PopupKey>(null);
  const [summaryPopupOpen, setSummaryPopupOpen] = useState(false);
  const [analysisQuestion, setAnalysisQuestion] =
    useState<AnalysisQuestionKey>(null);
  const [mode, setMode] = useState<FilterMode>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [year, setYear] = useState("");
  const [quarter, setQuarter] = useState("1");
  const [semester, setSemester] = useState("1");

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void fetch("/api/organizacao-em-harmonia/site-tucxa/sementinha-transparencia", {
        cache: "no-store",
      })
        .then(async (response) => {
          const result = (await response.json()) as ApiPayload;
          if (active) setPayload(result);
        })
        .catch(() => {
          if (active) {
            setPayload({
              error: "Não foi possível carregar a prestação de contas.",
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
  }, []);

  const data = payload.live;

  const availableMonths = useMemo(
    () =>
      (data?.matrix.months ?? [])
        .map((month) => monthDate(month.month))
        .sort(),
    [data],
  );

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set<string>(availableMonths.map((month) => month.slice(0, 4))),
      ).sort((left, right) => right.localeCompare(left)),
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
      return { start: addMonths(last, -11), end: last };
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
    if (
      !selectedRange.start ||
      !selectedRange.end ||
      selectedRange.start > selectedRange.end
    ) {
      return [];
    }

    return availableMonths.filter(
      (month) => month >= selectedRange.start && month <= selectedRange.end,
    );
  }, [availableMonths, selectedRange]);

  const rangeError = Boolean(
    selectedRange.start &&
      selectedRange.end &&
      selectedRange.start > selectedRange.end,
  );

  const analysis = useMemo<AnalysisSnapshot>(() => {
    if (!data) {
      return {
        revenues: 0,
        expenses: 0,
        result: 0,
        openingBalance: null,
        closingBalance: null,
        revenueRanking: [],
        expenseRanking: [],
      };
    }

    const selected = new Set(selectedMonths.map(monthKey));
    const chronological = [...data.matrix.months]
      .filter((month) => selected.has(monthKey(month.month)))
      .sort((left, right) =>
        monthDate(left.month).localeCompare(monthDate(right.month)),
      );

    const revenues = chronological.reduce(
      (sum, month) =>
        sum + matrixTypeValue(data.matrix, "receita", month.month),
      0,
    );
    const expenses = chronological.reduce(
      (sum, month) =>
        sum + matrixTypeValue(data.matrix, "despesa", month.month),
      0,
    );

    return {
      revenues,
      expenses,
      result: revenues - expenses,
      openingBalance: chronological[0]?.openingBalance ?? null,
      closingBalance: chronological.length
        ? chronological[chronological.length - 1]?.closingBalance ??
          chronological[chronological.length - 1]?.bankBalance ??
          null
        : null,
      revenueRanking: rankMatrixItems(
        data.matrix,
        "receita",
        selectedMonths,
      ),
      expenseRanking: rankMatrixItems(
        data.matrix,
        "despesa",
        selectedMonths,
      ),
    };
  }, [data, selectedMonths]);

  const analysisContent = data ? (
    <>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">
          Escolha o Período
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
          Período analisado:{" "}
          {selectedRange.start && selectedRange.end
            ? `${monthLabel(selectedRange.start)} a ${monthLabel(
                selectedRange.end,
              )}`
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

          <button
            type="button"
            onClick={() => setSummaryPopupOpen(true)}
            className="mt-4 flex min-h-20 w-full flex-col items-center justify-center rounded-[1.75rem] bg-white p-5 text-center shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
          >
            <span className="block text-xl font-black leading-6 text-[#123D2C]">
              Resumos
            </span>
            <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
              TOQUE PARA ABRIR
            </span>
          </button>
        </>
      )}
    </>
  ) : null;

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu da Prestação de Contas do Sementinha"
        showSupport={false}
        mobileActionColumns={3}
        compactMobileActions
      />

      <section className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Prestação de Contas do Sementinha
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            {data?.settings.headline || "Fortalecendo a confiança"}
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA]">
            {publicMessageWithoutCurrent(data?.settings.message)}
          </p>
          <SummaryNavigationButtons onOpen={setOpenPopup} />
          <SementinhaActionButtons className="mt-3" inverse />
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
          <section
            id="fonte-dos-dados"
            className="scroll-mt-48 rounded-[2rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10 sm:p-7"
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
              Janeiro a junho de 2026
            </p>
            <h2 className="mt-2 max-w-4xl text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
              Os lançamentos desta visão reproduzem os balancetes mensais fornecidos pelo Sementinha.
            </h2>
            <p className="mt-3 max-w-4xl leading-7 text-slate-700">
              Receitas, despesas, resultado e saldo permanecem separados por competência para facilitar a conferência no celular. Use os botões de resumo, detalhamento e análises para mudar apenas a forma de leitura — não os valores de origem.
            </p>
            <SementinhaActionButtons className="mt-5 max-w-xl" />
          </section>
        )}
      </section>

      {openPopup === "finalizado" && data && (
        <Popup
          title="Competência finalizada"
          subtitle="Última competência disponível nos balancetes fornecidos do Sementinha."
          onClose={() => setOpenPopup(null)}
        >
          <SummaryCard month={data.latestFinalized} />
        </Popup>
      )}

      {openPopup === "detalhado" && data && (
        <Popup
          title="Detalhado"
          subtitle="Receitas, despesas e saldos somente das competências finalizadas."
          onClose={() => setOpenPopup(null)}
          wide
        >
          <FinancialTransparencyMatrix
            matrix={data.matrix}
            title="Detalhado"
            description="Competências finalizadas, com receitas, despesas e saldos organizados por mês."
          />
        </Popup>
      )}

      {openPopup === "analises" && data && (
        <Popup
          title="Análises"
          onClose={() => {
            setAnalysisQuestion(null);
            setSummaryPopupOpen(false);
            setOpenPopup(null);
          }}
          wide
        >
          {analysisContent}
        </Popup>
      )}

      {openPopup === "analises" && summaryPopupOpen && (
        <Popup
          nested
          title="Resumos"
          subtitle="Escolha a pergunta que deseja analisar no período selecionado."
          onClose={() => {
            setAnalysisQuestion(null);
            setSummaryPopupOpen(false);
          }}
          wide
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setAnalysisQuestion("receitas")}
              className="min-h-28 rounded-[1.75rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black leading-6 text-[#123D2C]">
                Quais, em média, os itens com maiores receitas?
              </span>
              <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAnalysisQuestion("despesas")}
              className="min-h-28 rounded-[1.75rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black leading-6 text-[#123D2C]">
                Quais, em média, os itens com maiores despesas?
              </span>
              <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAnalysisQuestion("saldo")}
              className="min-h-28 rounded-[1.75rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black leading-6 text-[#123D2C]">
                O que levou o saldo bancário a estar positivo ou negativo?
              </span>
              <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
              </span>
            </button>
          </div>
        </Popup>
      )}

      {openPopup === "analises" && analysisQuestion === "receitas" && (
        <Popup
          nested
          title="Quais, em média, os itens com maiores receitas?"
          subtitle="Ranking calculado somente com as competências finalizadas do período selecionado."
          onClose={() => setAnalysisQuestion(null)}
          wide
        >
          <RankingTable
            title="Maiores receitas médias"
            items={analysis.revenueRanking}
            monthsCount={selectedMonths.length}
          />
        </Popup>
      )}

      {openPopup === "analises" && analysisQuestion === "despesas" && (
        <Popup
          nested
          title="Quais, em média, os itens com maiores despesas?"
          subtitle="Ranking calculado somente com as competências finalizadas do período selecionado."
          onClose={() => setAnalysisQuestion(null)}
          wide
        >
          <RankingTable
            title="Maiores despesas médias"
            items={analysis.expenseRanking}
            monthsCount={selectedMonths.length}
          />
        </Popup>
      )}

      {openPopup === "analises" && analysisQuestion === "saldo" && (
        <Popup
          nested
          title="O que levou o saldo bancário a estar positivo ou negativo?"
          subtitle="Leitura automática baseada nas competências finalizadas do período selecionado."
          onClose={() => setAnalysisQuestion(null)}
          wide
        >
          <article className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
            <BalanceExplanation
              analysis={analysis}
              monthsCount={selectedMonths.length}
            />
            <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-5 text-slate-500">
              Esta leitura é informativa e não substitui a conferência dos
              documentos e lançamentos de origem.
            </p>
          </article>
        </Popup>
      )}
    </main>
  );
}
