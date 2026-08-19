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
import { FinancialLineChart } from "@/components/organizacao-em-harmonia/financial-line-chart";
import {
  FinancialTransparencyMatrix,
  type FinancialMatrixGroup,
  type FinancialMatrixMonth,
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

type AnalysisSnapshot = {
  revenues: number;
  expenses: number;
  result: number;
  openingBalance: number | null;
  closingBalance: number | null;
  revenueRanking: RankedItem[];
  expenseRanking: RankedItem[];
  explanation: string;
};

type EventProfitability = {
  name: string;
  revenues: number;
  expenses: number;
  result: number;
  percentage: number | null;
};

type PopupKey = "finalizado" | "detalhado" | "analises" | "imprimir" | null;
type AnalysisQuestionKey = "receitas" | "despesas" | "saldo" | null;
type PrintMode = "resumo" | "detalhado" | null;

const actions: PanelHeaderAction[] = [
  { label: "Início", href: "#inicio", variant: "secondary" },
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function signedStyle(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  return {
    color: numeric < 0 ? "#B42318" : "#123D2C",
    fontWeight: 800,
  } as const;
}

function percent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function average(values: Array<number | null | undefined>) {
  return values.length > 0
    ? values.reduce<number>((sum, value) => sum + (Number(value) || 0), 0) / values.length
    : 0;
}

function matrixTypeValue(
  groups: FinancialMatrixGroup[],
  type: "receita" | "despesa",
  month: string,
) {
  return groups
    .filter((group) => group.type === type)
    .reduce((sum, group) => sum + (Number(group.values[month]) || 0), 0);
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
          Não há lançamentos realizados nas competências finalizadas deste período.
        </p>
      )}
    </article>
  );
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
        Não há competências finalizadas com dados realizados suficientes no período selecionado para explicar a evolução do saldo.
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
        O saldo partiu de <SignedMoney value={analysis.openingBalance} /> e encerrou em{" "}
        <SignedMoney value={analysis.closingBalance} />.
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
  const [analysisQuestion, setAnalysisQuestion] =
    useState<AnalysisQuestionKey>(null);
  const [summaryPopupOpen, setSummaryPopupOpen] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>(null);
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

  useEffect(() => {
    const clearPrintMode = () => {
      setPrintMode(null);
      document.getElementById("tucxa-financial-page-size")?.remove();
    };

    window.addEventListener("afterprint", clearPrintMode);
    return () => {
      window.removeEventListener("afterprint", clearPrintMode);
      document.getElementById("tucxa-financial-page-size")?.remove();
    };
  }, []);

  function printReport(modeToPrint: Exclude<PrintMode, null>) {
    setAnalysisQuestion(null);
    setSummaryPopupOpen(false);
    setOpenPopup(null);
    setPrintMode(modeToPrint);

    let style = document.getElementById(
      "tucxa-financial-page-size",
    ) as HTMLStyleElement | null;

    if (!style) {
      style = document.createElement("style");
      style.id = "tucxa-financial-page-size";
      document.head.appendChild(style);
    }

    style.textContent =
      modeToPrint === "resumo"
        ? "@page { size: A4 portrait; margin: 10mm; }"
        : "@page { size: A3 landscape; margin: 8mm; }";

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  }

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
      Array.from(
        new Set<string>(availableMonths.map((month) => month.slice(0, 4))),
      ).sort((left: string, right: string) => right.localeCompare(left)),
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

  const analysis = useMemo<AnalysisSnapshot>(() => {
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

  const eventProfitability = useMemo<EventProfitability[]>(() => {
    const monthSet = new Set(selectedMonths);
    const entries = (payload.analysisBase?.entries ?? []).filter(
      (entry) =>
        entry.dataNature === "realizado" && monthSet.has(monthDate(entry.month)),
    );

    const definitions = [
      { name: "Pizza", keywords: ["pizza"] },
      { name: "Festa Junina", keywords: ["festa junina"] },
      { name: "Feijoada", keywords: ["feijoada"] },
      { name: "Confraternização", keywords: ["confraternizacao"] },
    ];

    return definitions
      .map((definition) => {
        const matching = entries.filter((entry) => {
          const value = normalizeText(`${entry.item} ${entry.group}`);
          return definition.keywords.some((keyword) => value.includes(keyword));
        });
        const revenues = matching
          .filter((entry) => entry.type === "receita")
          .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        const expenses = matching
          .filter((entry) => entry.type === "despesa")
          .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        const result = revenues - expenses;
        return {
          name: definition.name,
          revenues,
          expenses,
          result,
          percentage: revenues !== 0 ? (result / revenues) * 100 : null,
        };
      })
      .sort((left, right) => right.result - left.result);
  }, [payload.analysisBase, selectedMonths]);

  const filteredMatrixMonths = useMemo<FinancialMatrixMonth[]>(() => {
    const selected = new Set(selectedMonths);
    return (payload.live?.matrix.months ?? []).filter((month) =>
      selected.has(monthDate(month.month)),
    );
  }, [payload.live, selectedMonths]);

  const detailChronologicalMonths = useMemo(
    () =>
      [...filteredMatrixMonths].sort((left, right) =>
        monthDate(left.month).localeCompare(monthDate(right.month)),
      ),
    [filteredMatrixMonths],
  );

  const detailSummaryChart = useMemo(() => {
    const groups = payload.live?.matrix.groups ?? [];
    return {
      labels: detailChronologicalMonths.map((month) => monthLabel(month.month)),
      balance: detailChronologicalMonths.map((month) => month.bankBalance ?? 0),
      revenues: detailChronologicalMonths.map((month) =>
        matrixTypeValue(groups, "receita", month.month),
      ),
      expenses: detailChronologicalMonths.map((month) =>
        matrixTypeValue(groups, "despesa", month.month),
      ),
    };
  }, [detailChronologicalMonths, payload.live]);

  const rangeError = Boolean(
    selectedRange.start &&
      selectedRange.end &&
      selectedRange.start > selectedRange.end,
  );

  const analysisContent = (
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
  );

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Corrente em Dia · Análises"
        showSupport={false}
        actions={actions}
        autoHighlightCurrent={false}
      />

      <style jsx global>{`
        .financial-print-root {
          display: none;
        }

        @media print {
          body {
            background: white !important;
          }

          .screen-only,
          [data-tucxa-public-header] {
            display: none !important;
          }

          .financial-print-root,
          .financial-print-root * {
            visibility: visible !important;
          }

          .financial-print-root {
            display: block !important;
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            background: white !important;
            color: #10251c !important;
          }

          .print-card {
            break-inside: avoid;
          }

          .financial-print-detail table {
            page-break-inside: auto;
          }

          .financial-print-detail tr {
            break-inside: avoid;
          }

          .financial-expanded-page {
            break-before: page;
            page-break-before: always;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .financial-expanded-page table {
            font-size: 7px !important;
            line-height: 1.02 !important;
          }

          .financial-expanded-page th,
          .financial-expanded-page td {
            padding-top: 1.25px !important;
            padding-bottom: 1.25px !important;
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
              <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
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
              <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
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
              <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOpenPopup("imprimir")}
              className="min-h-24 rounded-2xl bg-white px-4 py-4 text-center shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">Imprimir PDF</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                Relatórios A4 e A3
              </span>
              <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
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
          title="O que levou o saldo bancário a estar positivo ou negativo?"
          subtitle="Leitura automática baseada nos lançamentos realizados das competências finalizadas."
          onClose={() => setAnalysisQuestion(null)}
          wide
        >
          <article className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
            <BalanceExplanation
              analysis={analysis}
              monthsCount={selectedMonths.length}
            />
            <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-5 text-slate-500">
              Esta leitura apoia a Tesouraria/Financeiro e a Diretoria e não
              substitui a conferência dos documentos e lançamentos de origem.
            </p>
          </article>
        </Popup>
      )}

      {openPopup === "imprimir" && payload.live && (
        <Popup
          title="Imprimir PDF"
          subtitle="Escolha o relatório adequado ao conteúdo que deseja imprimir ou salvar em PDF."
          onClose={() => setOpenPopup(null)}
        >
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => printReport("resumo")}
              className="rounded-[1.5rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">
                Finalizado + Análises
              </span>
              <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600">
                Relatório compacto em A4 retrato, usando o período selecionado em Análises.
              </span>
              <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
              </span>
            </button>

            <button
              type="button"
              onClick={() => printReport("detalhado")}
              className="rounded-[1.5rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">
                Detalhado expandido
              </span>
              <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600">
                Relatório separado em A3 paisagem, com grupos e itens expandidos.
              </span>
              <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
              </span>
            </button>
          </div>
        </Popup>
      )}

      {payload.live && printMode === "resumo" && (
        <section
          className="financial-print-root financial-print-summary"
          aria-label="Relatório A4 de competência finalizada e análises"
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "9px",
            lineHeight: 1.25,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              borderBottom: "2px solid #123D2C",
              paddingBottom: "6px",
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                Tucxa · Finalizado e Análises
              </h1>
              <p style={{ margin: "3px 0 0" }}>
                Relatório baseado nas competências finalizadas do período selecionado.
              </p>
            </div>
            <p style={{ margin: 0, textAlign: "right", fontWeight: 700 }}>
              Período:{" "}
              {selectedRange.start && selectedRange.end
                ? `${monthLabel(selectedRange.start)} a ${monthLabel(selectedRange.end)}`
                : "—"}
              <br />
              {selectedMonths.length}{" "}
              {selectedMonths.length === 1
                ? "competência finalizada"
                : "competências finalizadas"}
            </p>
          </div>

          <section className="print-card" style={{ marginTop: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800 }}>
              Finalizado
            </h2>
            {payload.live.latestFinalized ? (
              <>
                <p style={{ margin: "2px 0 5px", fontWeight: 700 }}>
                  Última competência encerrada: {monthLabel(payload.live.latestFinalized.month)}
                </p>
                <table
                  style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
                >
                  <tbody>
                    <tr>
                      {[
                        ["Receitas", payload.live.latestFinalized.revenues],
                        ["Despesas", payload.live.latestFinalized.expenses],
                        ["Resultado", payload.live.latestFinalized.result],
                        [
                          "Saldo final",
                          payload.live.latestFinalized.closingBalance ??
                            payload.live.latestFinalized.bankBalance,
                        ],
                      ].map(([label, value]) => (
                        <td
                          key={String(label)}
                          style={{
                            border: "1px solid #94A3B8",
                            padding: "5px",
                            verticalAlign: "top",
                          }}
                        >
                          <strong>{String(label)}</strong>
                          <br />
                          <span style={{ fontSize: "7px", color: "#64748B" }}>
                            {monthLabel(payload.live!.latestFinalized!.month)}
                          </span>
                          <br />
                          <span style={signedStyle(value as number | null)}>
                            {money(value as number | null)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </>
            ) : (
              <p style={{ margin: "4px 0 0" }}>
                Ainda não há competência finalizada disponível.
              </p>
            )}
          </section>

          <section className="print-card" style={{ marginTop: "9px" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800 }}>
              Análises
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
                marginTop: "5px",
              }}
            >
              <tbody>
                <tr>
                  {[
                    ["Saldo inicial", analysis.openingBalance, selectedRange.start],
                    [
                      "Receitas",
                      analysis.revenues,
                      selectedRange.start && selectedRange.end
                        ? `${monthLabel(selectedRange.start)} a ${monthLabel(selectedRange.end)}`
                        : "—",
                    ],
                    [
                      "Despesas",
                      analysis.expenses,
                      selectedRange.start && selectedRange.end
                        ? `${monthLabel(selectedRange.start)} a ${monthLabel(selectedRange.end)}`
                        : "—",
                    ],
                    [
                      "Resultado",
                      analysis.result,
                      selectedRange.start && selectedRange.end
                        ? `${monthLabel(selectedRange.start)} a ${monthLabel(selectedRange.end)}`
                        : "—",
                    ],
                    ["Saldo final", analysis.closingBalance, selectedRange.end],
                  ].map(([label, value, dateValue]) => (
                    <td
                      key={String(label)}
                      style={{
                        border: "1px solid #94A3B8",
                        padding: "4px",
                        verticalAlign: "top",
                      }}
                    >
                      <strong>{String(label)}</strong>
                      <br />
                      <span style={{ fontSize: "7px", color: "#64748B" }}>
                        {typeof dateValue === "string" && /^\d{4}-\d{2}/.test(dateValue)
                          ? monthLabel(dateValue)
                          : String(dateValue || "—")}
                      </span>
                      <br />
                      <span style={signedStyle(value as number | null)}>
                        {money(value as number | null)}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginTop: "9px",
            }}
          >
            <section className="print-card">
              <h3 style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 800 }}>
                Maiores receitas médias
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {analysis.revenueRanking.slice(0, 10).map((item, index) => (
                    <tr key={`print-receita-${item.name}-${index}`}>
                      <td style={{ borderBottom: "1px solid #CBD5E1", padding: "2px" }}>
                        {index + 1}. {item.name}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #CBD5E1",
                          padding: "2px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          ...signedStyle(item.average),
                        }}
                      >
                        {money(item.average)}/mês
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="print-card">
              <h3 style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 800 }}>
                Maiores despesas médias
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {analysis.expenseRanking.slice(0, 10).map((item, index) => (
                    <tr key={`print-despesa-${item.name}-${index}`}>
                      <td style={{ borderBottom: "1px solid #CBD5E1", padding: "2px" }}>
                        {index + 1}. {item.name}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #CBD5E1",
                          padding: "2px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          ...signedStyle(item.average),
                        }}
                      >
                        {money(item.average)}/mês
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="print-card" style={{ marginTop: "9px" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 800 }}>
              Resultado de eventos com receitas e despesas relacionadas
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Evento", "Receitas", "Despesas", "Resultado", "Resultado %"].map(
                    (label) => (
                      <th
                        key={label}
                        style={{
                          border: "1px solid #94A3B8",
                          padding: "3px",
                          textAlign: label === "Evento" ? "left" : "right",
                          background: "#E9F2E7",
                        }}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {eventProfitability.map((item) => (
                  <tr key={`profit-${item.name}`}>
                    <td style={{ border: "1px solid #CBD5E1", padding: "3px", fontWeight: 700 }}>
                      {item.name}
                    </td>
                    <td style={{ border: "1px solid #CBD5E1", padding: "3px", textAlign: "right", ...signedStyle(item.revenues) }}>
                      {money(item.revenues)}
                    </td>
                    <td style={{ border: "1px solid #CBD5E1", padding: "3px", textAlign: "right", ...signedStyle(item.expenses) }}>
                      {money(item.expenses)}
                    </td>
                    <td style={{ border: "1px solid #CBD5E1", padding: "3px", textAlign: "right", ...signedStyle(item.result) }}>
                      {money(item.result)}
                    </td>
                    <td style={{ border: "1px solid #CBD5E1", padding: "3px", textAlign: "right", ...signedStyle(item.percentage) }}>
                      {percent(item.percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section
            className="print-card"
            style={{ marginTop: "9px", border: "1px solid #CBD5E1", padding: "7px" }}
          >
            <h3 style={{ margin: 0, fontSize: "11px", fontWeight: 800 }}>
              O que levou o saldo bancário a estar positivo ou negativo?
            </h3>
            <div style={{ marginTop: "4px" }}>
              <BalanceExplanation analysis={analysis} monthsCount={selectedMonths.length} />
            </div>
          </section>

          <p style={{ margin: "7px 0 0", fontSize: "8px", color: "#475569" }}>
            Leitura automática de apoio à Tesouraria/Financeiro e Diretoria. A conferência dos documentos e lançamentos de origem continua sendo a referência oficial.
          </p>
        </section>
      )}

      {payload.live && printMode === "detalhado" && (
        <section
          className="financial-print-root financial-print-detail"
          aria-label="Relatório A3 detalhado de competências finalizadas"
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "8px",
            lineHeight: 1.15,
          }}
        >
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
            Tucxa · Detalhado — competências finalizadas
          </h1>
          <p style={{ margin: "3px 0 8px" }}>
            Visão resumida e expandida de saldos, receitas, despesas, grupos e itens no período selecionado.
          </p>

          {filteredMatrixMonths.length === 0 ? (
            <p style={{ margin: "10px 0", fontWeight: 700 }}>
              O período selecionado não contém competências finalizadas para o relatório detalhado.
            </p>
          ) : (
            <>
              <section className="print-card">
                <h2 style={{ margin: "0 0 5px", fontSize: "12px", fontWeight: 800 }}>
                  Resumo do período
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "15%", border: "1px solid #64748B", padding: "3px", textAlign: "left", background: "#123D2C", color: "white" }}>
                        Tipo
                      </th>
                      <th style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#123D2C", color: "white" }}>
                        Média
                      </th>
                      {filteredMatrixMonths.map((month) => (
                        <th
                          key={`summary-head-${month.month}`}
                          style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#123D2C", color: "white" }}
                        >
                          {monthLabel(month.month)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Saldo bancário",
                        values: filteredMatrixMonths.map((month) => month.bankBalance ?? 0),
                      },
                      {
                        label: "Receitas",
                        values: filteredMatrixMonths.map((month) =>
                          matrixTypeValue(payload.live!.matrix.groups, "receita", month.month),
                        ),
                      },
                      {
                        label: "Despesas",
                        values: filteredMatrixMonths.map((month) =>
                          matrixTypeValue(payload.live!.matrix.groups, "despesa", month.month),
                        ),
                      },
                    ].map((row) => (
                      <tr key={`summary-row-${row.label}`}>
                        <td style={{ border: "1px solid #94A3B8", padding: "4px", fontWeight: 800, background: "#E9F2E7" }}>
                          {row.label}
                        </td>
                        <td style={{ border: "1px solid #94A3B8", padding: "4px", textAlign: "right", background: "#F7FAF2", ...signedStyle(average(row.values)) }}>
                          {money(average(row.values))}
                        </td>
                        {row.values.map((value, index) => (
                          <td
                            key={`${row.label}-${filteredMatrixMonths[index]?.month}`}
                            style={{ border: "1px solid #94A3B8", padding: "4px", textAlign: "right", ...signedStyle(value) }}
                          >
                            {money(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <FinancialLineChart
                labels={detailSummaryChart.labels}
                series={[
                  { label: "Saldo bancário", values: detailSummaryChart.balance },
                  { label: "Receitas", values: detailSummaryChart.revenues },
                  { label: "Despesas", values: detailSummaryChart.expenses },
                ]}
                title="Evolução de saldo, receitas e despesas"
                description="Gráfico referente às mesmas competências finalizadas do filtro selecionado."
                compact
                className="print-card mt-3"
              />

              <section className="financial-expanded-page" style={{ marginTop: 0 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 800 }}>
                  Informações expandidas
                </h2>
                <table
                  style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          width: "18%",
                          border: "1px solid #64748B",
                          padding: "3px",
                          textAlign: "left",
                          background: "#E9F2E7",
                        }}
                      >
                        Tipo / grupo / item
                      </th>
                      <th
                        style={{
                          border: "1px solid #64748B",
                          padding: "3px",
                          textAlign: "right",
                          background: "#E9F2E7",
                        }}
                      >
                        Média
                      </th>
                      {filteredMatrixMonths.map((month) => (
                        <th
                          key={`print-head-${month.month}`}
                          style={{
                            border: "1px solid #64748B",
                            padding: "3px",
                            textAlign: "right",
                            background: "#E9F2E7",
                          }}
                        >
                          {monthLabel(month.month)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Saldo inicial",
                        key: "opening" as const,
                        values: filteredMatrixMonths.map((month) => month.openingBalance ?? 0),
                      },
                      {
                        label: "Saldo final",
                        key: "closing" as const,
                        values: filteredMatrixMonths.map((month) => month.closingBalance ?? 0),
                      },
                    ].map((row) => (
                      <tr key={`print-${row.key}`}>
                        <td style={{ border: "1px solid #94A3B8", padding: "3px", fontWeight: 800 }}>
                          {row.label}
                        </td>
                        <td style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: "right", ...signedStyle(average(row.values)) }}>
                          {money(average(row.values))}
                        </td>
                        {row.values.map((value, index) => (
                          <td
                            key={`print-${row.key}-${filteredMatrixMonths[index]?.month}`}
                            style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: "right", ...signedStyle(value) }}
                          >
                            {money(value)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {(["receita", "despesa"] as const).flatMap((type) => {
                      const groups = payload.live!.matrix.groups.filter(
                        (group) => group.type === type,
                      );
                      const label = type === "receita" ? "Receitas" : "Despesas";
                      const sectionValues = filteredMatrixMonths.map((month) =>
                        matrixTypeValue(groups, type, month.month),
                      );

                      return [
                        <tr key={`print-section-${type}`}>
                          <td style={{ border: "1px solid #64748B", padding: "3px", fontWeight: 900, background: "#DDEAD8" }}>
                            {label}
                          </td>
                          <td style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#DDEAD8", ...signedStyle(average(sectionValues)) }}>
                            {money(average(sectionValues))}
                          </td>
                          {sectionValues.map((value, index) => (
                            <td
                              key={`print-section-${type}-${filteredMatrixMonths[index]?.month}`}
                              style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#DDEAD8", ...signedStyle(value) }}
                            >
                              {money(value)}
                            </td>
                          ))}
                        </tr>,
                        ...groups.flatMap((group) => {
                          const groupValues = filteredMatrixMonths.map(
                            (month) => Number(group.values[month.month]) || 0,
                          );
                          return [
                            <tr key={`print-group-${type}-${group.group}`}>
                              <td style={{ border: "1px solid #94A3B8", padding: "3px 3px 3px 9px", fontWeight: 800, background: "#F3F8F0" }}>
                                {group.group}
                              </td>
                              <td style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: "right", background: "#F3F8F0", ...signedStyle(average(groupValues)) }}>
                                {money(average(groupValues))}
                              </td>
                              {groupValues.map((value, index) => (
                                <td
                                  key={`print-group-${type}-${group.group}-${filteredMatrixMonths[index]?.month}`}
                                  style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: "right", background: "#F3F8F0", ...signedStyle(value) }}
                                >
                                  {money(value)}
                                </td>
                              ))}
                            </tr>,
                            ...group.items.map((item) => {
                              const itemValues = filteredMatrixMonths.map(
                                (month) => Number(item.values[month.month]) || 0,
                              );
                              return (
                                <tr key={`print-item-${type}-${group.group}-${item.name}`}>
                                  <td style={{ border: "1px solid #CBD5E1", padding: "2px 3px 2px 16px" }}>
                                    {item.name}
                                  </td>
                                  <td style={{ border: "1px solid #CBD5E1", padding: "2px 3px", textAlign: "right", ...signedStyle(average(itemValues)) }}>
                                    {money(average(itemValues))}
                                  </td>
                                  {itemValues.map((value, index) => (
                                    <td
                                      key={`print-item-${type}-${group.group}-${item.name}-${filteredMatrixMonths[index]?.month}`}
                                      style={{ border: "1px solid #CBD5E1", padding: "2px 3px", textAlign: "right", ...signedStyle(value) }}
                                    >
                                      {money(value)}
                                    </td>
                                  ))}
                                </tr>
                              );
                            }),
                          ];
                        }),
                      ];
                    })}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </section>
      )}
    </main>
  );
}
