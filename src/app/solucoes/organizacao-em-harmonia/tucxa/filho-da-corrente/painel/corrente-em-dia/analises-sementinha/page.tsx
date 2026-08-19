"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { FinancialLineChart } from "@/components/organizacao-em-harmonia/financial-line-chart";
import {
  FinancialTransparencyMatrix,
  type FinancialMatrixMonth,
  type FinancialTransparencyMatrixData,
} from "@/components/organizacao-em-harmonia/financial-transparency-matrix";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PANEL_BASE = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const CORRENTE_BASE = `${PANEL_BASE}/corrente-em-dia`;

const actions: PanelHeaderAction[] = [
  { label: "Início", href: "#inicio", variant: "secondary" },
  { label: "Voltar", href: `${CORRENTE_BASE}?financeiro=1`, variant: "secondary" },
  filhoSupportAction,
  filhoSignOutAction,
];

type MonthSummary = {
  month: string;
  revenues: number | null;
  expenses: number | null;
  result: number | null;
  openingBalance: number | null;
  closingBalance: number | null;
  bankBalance: number | null;
};

type LivePayload = {
  latestFinalized: MonthSummary | null;
  matrix: FinancialTransparencyMatrixData;
};

type ApiPayload = {
  live?: LivePayload;
  error?: string;
};

type FinanceAccessPayload = {
  canManageFinance?: boolean;
  error?: string;
};

type PopupKey = "finalizado" | "detalhado" | "analises" | "imprimir" | null;
type PrintMode = "resumo" | "detalhado" | null;

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

type EventProfitability = {
  name: string;
  revenues: number;
  expenses: number;
  result: number;
  percentage: number | null;
};

function money(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function signedClass(value: number | null | undefined) {
  return Number(value ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]";
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
        .reduce((sum, month) => sum + (Number(item.values[month.month]) || 0), 0);
      totals.set(item.name, (totals.get(item.name) ?? 0) + total);
    }
  }

  return Array.from(totals.entries())
    .map(([name, total]) => ({
      name,
      total,
      average: selectedMonths.length ? total / selectedMonths.length : 0,
    }))
    .filter((item) => item.total !== 0)
    .sort((left, right) => right.average - left.average);
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">
        {label}
      </p>
      <p className={`mt-1 text-base font-black ${signedClass(value)}`}>{money(value)}</p>
    </div>
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
        Não há competências finalizadas com dados suficientes no período selecionado para explicar a evolução do saldo.
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-[2rem] bg-[#F7FAF2] shadow-2xl ring-1 ring-white/30 ${
          wide ? "max-w-7xl" : "max-w-3xl"
        }`}
      >
        <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
              Tesouraria / Financeiro · Sementinha
            </p>
            <h2 className="mt-1 text-xl font-black text-[#123D2C] sm:text-2xl">{title}</h2>
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

export default function AnalisesFinanceirasSementinhaPage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);
  const [openPopup, setOpenPopup] = useState<PopupKey>(null);
  const [printMode, setPrintMode] = useState<PrintMode>(null);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");

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

      const accessResponse = await fetch(
        "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const access = (await accessResponse.json().catch(() => ({}))) as FinanceAccessPayload;
      if (!accessResponse.ok || access.canManageFinance !== true) {
        if (active) {
          setPayload({
            error:
              access.error ||
              "Esta área é restrita às pessoas com função Tesouraria/Financeiro.",
          });
          setLoading(false);
        }
        return;
      }

      const response = await fetch(
        "/api/organizacao-em-harmonia/site-tucxa/sementinha-transparencia",
        { cache: "no-store" },
      );
      const result = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!active) return;
      setPayload(
        response.ok
          ? result
          : { error: result.error || "Não foi possível carregar os dados do Sementinha." },
      );
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const clearPrint = () => {
      setPrintMode(null);
      document.getElementById("sementinha-financial-page-size")?.remove();
    };
    window.addEventListener("afterprint", clearPrint);
    return () => {
      window.removeEventListener("afterprint", clearPrint);
      document.getElementById("sementinha-financial-page-size")?.remove();
    };
  }, []);

  const data = payload.live;

  const availableMonths = useMemo(
    () => (data?.matrix.months ?? []).map((month) => monthDate(month.month)).sort(),
    [data],
  );

  const effectiveStartMonth =
    startMonth || availableMonths[0]?.slice(0, 7) || "";
  const effectiveEndMonth =
    endMonth || availableMonths[availableMonths.length - 1]?.slice(0, 7) || "";

  const selectedMonths = useMemo(() => {
    if (!availableMonths.length) return [];
    const start = effectiveStartMonth ? `${effectiveStartMonth}-01` : availableMonths[0];
    const end = effectiveEndMonth
      ? `${effectiveEndMonth}-01`
      : availableMonths[availableMonths.length - 1];
    if (start > end) return [];
    return availableMonths.filter((month) => month >= start && month <= end);
  }, [availableMonths, effectiveEndMonth, effectiveStartMonth]);

  const analysis = useMemo(() => {
    if (!data || !selectedMonths.length) {
      return {
        revenues: 0,
        expenses: 0,
        result: 0,
        openingBalance: null as number | null,
        closingBalance: null as number | null,
        revenueRanking: [] as RankedItem[],
        expenseRanking: [] as RankedItem[],
      };
    }

    const selected = new Set(selectedMonths.map(monthKey));
    const chronological = [...data.matrix.months]
      .filter((month) => selected.has(monthKey(month.month)))
      .sort((left, right) => monthDate(left.month).localeCompare(monthDate(right.month)));
    const revenues = chronological.reduce(
      (sum, month) => sum + matrixTypeValue(data.matrix, "receita", month.month),
      0,
    );
    const expenses = chronological.reduce(
      (sum, month) => sum + matrixTypeValue(data.matrix, "despesa", month.month),
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
      revenueRanking: rankMatrixItems(data.matrix, "receita", selectedMonths),
      expenseRanking: rankMatrixItems(data.matrix, "despesa", selectedMonths),
    };
  }, [data, selectedMonths]);

  const filteredMatrixMonths = useMemo<FinancialMatrixMonth[]>(() => {
    if (!data) return [];
    const selected = new Set(selectedMonths.map(monthKey));
    return data.matrix.months.filter((month) => selected.has(monthKey(month.month)));
  }, [data, selectedMonths]);

  const detailChronologicalMonths = useMemo(
    () =>
      [...filteredMatrixMonths].sort((left, right) =>
        monthDate(left.month).localeCompare(monthDate(right.month)),
      ),
    [filteredMatrixMonths],
  );

  const detailSummaryChart = useMemo(() => {
    if (!data) {
      return { labels: [] as string[], balance: [] as number[], revenues: [] as number[], expenses: [] as number[] };
    }
    return {
      labels: detailChronologicalMonths.map((month) => monthLabel(month.month)),
      balance: detailChronologicalMonths.map((month) => month.bankBalance ?? month.closingBalance ?? 0),
      revenues: detailChronologicalMonths.map((month) =>
        matrixTypeValue(data.matrix, "receita", month.month),
      ),
      expenses: detailChronologicalMonths.map((month) =>
        matrixTypeValue(data.matrix, "despesa", month.month),
      ),
    };
  }, [data, detailChronologicalMonths]);

  const eventProfitability = useMemo<EventProfitability[]>(() => {
    if (!data || !selectedMonths.length) return [];
    const selected = new Set(selectedMonths.map(monthKey));
    const totals = new Map<string, { name: string; revenues: number; expenses: number }>();

    for (const group of data.matrix.groups) {
      for (const item of group.items) {
        const key = normalizeText(item.name);
        if (!key) continue;
        const amount = data.matrix.months
          .filter((month) => selected.has(monthKey(month.month)))
          .reduce((sum, month) => sum + (Number(item.values[month.month]) || 0), 0);
        if (!amount) continue;
        const current = totals.get(key) ?? { name: item.name, revenues: 0, expenses: 0 };
        if (group.type === "receita") current.revenues += amount;
        if (group.type === "despesa") current.expenses += amount;
        totals.set(key, current);
      }
    }

    return Array.from(totals.values())
      .filter((item) => item.revenues > 0 && item.expenses > 0)
      .map((item) => {
        const result = item.revenues - item.expenses;
        return {
          ...item,
          result,
          percentage: item.revenues !== 0 ? (result / item.revenues) * 100 : null,
        };
      })
      .sort((left, right) => right.result - left.result);
  }, [data, selectedMonths]);

  function printReport(mode: Exclude<PrintMode, null>) {
    setOpenPopup(null);
    setPrintMode(mode);

    let style = document.getElementById(
      "sementinha-financial-page-size",
    ) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = "sementinha-financial-page-size";
      document.head.appendChild(style);
    }
    style.textContent =
      mode === "resumo"
        ? "@page { size: A4 portrait; margin: 10mm; }"
        : "@page { size: A3 landscape; margin: 8mm; }";

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  }

  const periodLabel =
    selectedMonths.length > 0
      ? `${monthLabel(selectedMonths[0])} a ${monthLabel(selectedMonths[selectedMonths.length - 1])}`
      : "—";

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Análises Financeiras do Sementinha"
        actions={actions}
        mobileActionColumns={4}
      />

      <style jsx global>{`
        .financial-print-root {
          display: none;
        }

        @media print {
          body {
            background: white !important;
          }

          body * {
            visibility: hidden !important;
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

      <section id="inicio" className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#CFE2C7]">
            Tesouraria / Financeiro
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">
            Análises financeiras do Sementinha
          </h1>
          <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            Esta área reúne a competência finalizada, o detalhamento mensal e análises sobre receitas,
            despesas e evolução do saldo do Sementinha, mantendo o mesmo fluxo utilizado nas análises do Tucxa.
          </p>
        </section>

        {loading && (
          <p className="mt-4 rounded-2xl bg-white p-5 font-bold text-[#123D2C] shadow">
            Carregando análises do Sementinha...
          </p>
        )}
        {payload.error && (
          <p className="mt-4 rounded-2xl bg-red-50 p-5 font-bold text-red-700">
            {payload.error}
          </p>
        )}

        {!loading && data && (
          <nav className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["finalizado", "Finalizado", "Última competência encerrada"],
              ["detalhado", "Detalhado", "Competências finalizadas por item"],
              ["analises", "Análises", "Médias, tendências e saldo"],
              ["imprimir", "Imprimir PDF", "Relatórios A4 e A3"],
            ].map(([key, label, subtitle]) => (
              <button
                key={key}
                type="button"
                onClick={() => setOpenPopup(key as Exclude<PopupKey, null>)}
                className="min-h-28 rounded-2xl bg-white px-4 py-4 text-center shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"
              >
                <span className="block text-lg font-black text-[#123D2C]">{label}</span>
                <span className="mt-1 block text-xs font-semibold text-slate-500">{subtitle}</span>
                <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  TOQUE PARA ABRIR
                </span>
              </button>
            ))}
          </nav>
        )}
      </section>

      {openPopup === "finalizado" && data && (
        <Popup
          title="Competência finalizada"
          subtitle="Última competência encerrada do Sementinha."
          onClose={() => setOpenPopup(null)}
        >
          {data.latestFinalized ? (
            <article className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
              <h3 className="text-2xl font-black capitalize text-[#123D2C]">
                {monthLabel(data.latestFinalized.month)}
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric label="Receitas" value={data.latestFinalized.revenues} />
                <Metric label="Despesas" value={data.latestFinalized.expenses} />
                <Metric label="Resultado" value={data.latestFinalized.result} />
                <Metric
                  label="Saldo final"
                  value={data.latestFinalized.closingBalance ?? data.latestFinalized.bankBalance}
                />
              </div>
            </article>
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 font-bold text-amber-900">
              Ainda não há competência finalizada disponível.
            </p>
          )}
        </Popup>
      )}

      {openPopup === "detalhado" && data && (
        <Popup
          title="Detalhado"
          subtitle="Receitas, despesas e saldos das competências finalizadas do Sementinha."
          onClose={() => setOpenPopup(null)}
          wide
        >
          <FinancialTransparencyMatrix
            matrix={data.matrix}
            title="Detalhado"
            description="Competências finalizadas do Sementinha, organizadas por mês, grupo e item."
          />
        </Popup>
      )}

      {openPopup === "analises" && data && (
        <Popup
          title="Análises"
          subtitle="Selecione o período para analisar o Sementinha."
          onClose={() => setOpenPopup(null)}
          wide
        >
          <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10 sm:grid-cols-2">
            <label className="text-sm font-black text-[#123D2C]">
              Mês inicial
              <input
                type="month"
                value={effectiveStartMonth}
                onChange={(event) => setStartMonth(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#123D2C]/20 px-3 py-3"
              />
            </label>
            <label className="text-sm font-black text-[#123D2C]">
              Mês final
              <input
                type="month"
                value={effectiveEndMonth}
                onChange={(event) => setEndMonth(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#123D2C]/20 px-3 py-3"
              />
            </label>
          </div>

          <p className="mt-3 rounded-xl bg-[#E9F2E7] p-3 text-sm font-bold text-[#123D2C]">
            Período analisado: {periodLabel} · {selectedMonths.length} competência(s)
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Metric label="Saldo inicial" value={analysis.openingBalance} />
            <Metric label="Receitas" value={analysis.revenues} />
            <Metric label="Despesas" value={analysis.expenses} />
            <Metric label="Resultado" value={analysis.result} />
            <Metric label="Saldo final" value={analysis.closingBalance} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {[
              ["Maiores receitas médias", analysis.revenueRanking],
              ["Maiores despesas médias", analysis.expenseRanking],
            ].map(([title, ranking]) => (
              <article key={String(title)} className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <h3 className="text-lg font-black text-[#123D2C]">{String(title)}</h3>
                <div className="mt-3 space-y-2">
                  {(ranking as RankedItem[]).slice(0, 8).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7FAF2] p-3">
                      <span className="font-bold text-slate-700">{index + 1}. {item.name}</span>
                      <span className="shrink-0 font-black text-[#123D2C]">{money(item.average)}/mês</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Popup>
      )}

      {openPopup === "imprimir" && data && (
        <Popup
          title="Imprimir PDF"
          subtitle="Mesmo fluxo de relatórios utilizado nas Análises Financeiras do Tucxa."
          onClose={() => setOpenPopup(null)}
        >
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => printReport("resumo")}
              className="rounded-[1.5rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">Finalizado + Análises</span>
              <span className="mt-1 block text-sm font-semibold text-slate-600">Relatório A4 retrato.</span>
              <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
            </button>
            <button
              type="button"
              onClick={() => printReport("detalhado")}
              className="rounded-[1.5rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 hover:bg-[#EEF7EA]"
            >
              <span className="block text-lg font-black text-[#123D2C]">Detalhado expandido</span>
              <span className="mt-1 block text-sm font-semibold text-slate-600">Relatório A3 paisagem.</span>
              <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
            </button>
          </div>
        </Popup>
      )}

      {data && printMode === "resumo" && (
        <section
          className="financial-print-root financial-print-summary"
          aria-label="Relatório A4 de competência finalizada e análises do Sementinha"
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
                Sementinha · Finalizado e Análises
              </h1>
              <p style={{ margin: "3px 0 0" }}>
                Relatório baseado nas competências finalizadas do período selecionado.
              </p>
            </div>
            <p style={{ margin: 0, textAlign: "right", fontWeight: 700 }}>
              Período: {periodLabel}
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
            {data.latestFinalized ? (
              <>
                <p style={{ margin: "2px 0 5px", fontWeight: 700 }}>
                  Última competência encerrada: {monthLabel(data.latestFinalized.month)}
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <tbody>
                    <tr>
                      {[
                        ["Receitas", data.latestFinalized.revenues],
                        ["Despesas", data.latestFinalized.expenses],
                        ["Resultado", data.latestFinalized.result],
                        ["Saldo final", data.latestFinalized.closingBalance ?? data.latestFinalized.bankBalance],
                      ].map(([label, value]) => (
                        <td
                          key={String(label)}
                          style={{ border: "1px solid #94A3B8", padding: "5px", verticalAlign: "top" }}
                        >
                          <strong>{String(label)}</strong>
                          <br />
                          <span style={{ fontSize: "7px", color: "#64748B" }}>
                            {monthLabel(data.latestFinalized!.month)}
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
              <p style={{ margin: "4px 0 0" }}>Ainda não há competência finalizada disponível.</p>
            )}
          </section>

          <section className="print-card" style={{ marginTop: "9px" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800 }}>Análises</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: "5px" }}>
              <tbody>
                <tr>
                  {[
                    ["Saldo inicial", analysis.openingBalance, selectedMonths[0]],
                    ["Receitas", analysis.revenues, periodLabel],
                    ["Despesas", analysis.expenses, periodLabel],
                    ["Resultado", analysis.result, periodLabel],
                    ["Saldo final", analysis.closingBalance, selectedMonths[selectedMonths.length - 1]],
                  ].map(([label, value, dateValue]) => (
                    <td
                      key={String(label)}
                      style={{ border: "1px solid #94A3B8", padding: "4px", verticalAlign: "top" }}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "9px" }}>
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
                      <td style={{ borderBottom: "1px solid #CBD5E1", padding: "2px", textAlign: "right", whiteSpace: "nowrap", ...signedStyle(item.average) }}>
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
                      <td style={{ borderBottom: "1px solid #CBD5E1", padding: "2px", textAlign: "right", whiteSpace: "nowrap", ...signedStyle(item.average) }}>
                        {money(item.average)}/mês
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          {eventProfitability.length > 0 && (
            <section className="print-card" style={{ marginTop: "9px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 800 }}>
                Resultado de eventos com receitas e despesas relacionadas
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Evento", "Receitas", "Despesas", "Resultado", "Resultado %"].map((label) => (
                      <th
                        key={label}
                        style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: label === "Evento" ? "left" : "right", background: "#E9F2E7" }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventProfitability.map((item) => (
                    <tr key={`profit-${item.name}`}>
                      <td style={{ border: "1px solid #CBD5E1", padding: "3px", fontWeight: 700 }}>{item.name}</td>
                      <td style={{ border: "1px solid #CBD5E1", padding: "3px", textAlign: "right", ...signedStyle(item.revenues) }}>{money(item.revenues)}</td>
                      <td style={{ border: "1px solid #CBD5E1", padding: "3px", textAlign: "right", ...signedStyle(item.expenses) }}>{money(item.expenses)}</td>
                      <td style={{ border: "1px solid #CBD5E1", padding: "3px", textAlign: "right", ...signedStyle(item.result) }}>{money(item.result)}</td>
                      <td style={{ border: "1px solid #CBD5E1", padding: "3px", textAlign: "right", ...signedStyle(item.percentage) }}>{percent(item.percentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="print-card" style={{ marginTop: "9px", border: "1px solid #CBD5E1", padding: "7px" }}>
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

      {data && printMode === "detalhado" && (
        <section
          className="financial-print-root financial-print-detail"
          aria-label="Relatório A3 detalhado de competências finalizadas do Sementinha"
          style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "8px", lineHeight: 1.15 }}
        >
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
            Sementinha · Detalhado — competências finalizadas
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
                <h2 style={{ margin: "0 0 5px", fontSize: "12px", fontWeight: 800 }}>Resumo do período</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "15%", border: "1px solid #64748B", padding: "3px", textAlign: "left", background: "#123D2C", color: "white" }}>Tipo</th>
                      <th style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#123D2C", color: "white" }}>Média</th>
                      {filteredMatrixMonths.map((month) => (
                        <th key={`summary-head-${month.month}`} style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#123D2C", color: "white" }}>
                          {monthLabel(month.month)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Saldo bancário", values: filteredMatrixMonths.map((month) => month.bankBalance ?? month.closingBalance ?? 0) },
                      { label: "Receitas", values: filteredMatrixMonths.map((month) => matrixTypeValue(data.matrix, "receita", month.month)) },
                      { label: "Despesas", values: filteredMatrixMonths.map((month) => matrixTypeValue(data.matrix, "despesa", month.month)) },
                    ].map((row) => (
                      <tr key={`summary-row-${row.label}`}>
                        <td style={{ border: "1px solid #94A3B8", padding: "4px", fontWeight: 800, background: "#E9F2E7" }}>{row.label}</td>
                        <td style={{ border: "1px solid #94A3B8", padding: "4px", textAlign: "right", background: "#F7FAF2", ...signedStyle(average(row.values)) }}>{money(average(row.values))}</td>
                        {row.values.map((value, index) => (
                          <td key={`${row.label}-${filteredMatrixMonths[index]?.month}`} style={{ border: "1px solid #94A3B8", padding: "4px", textAlign: "right", ...signedStyle(value) }}>
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
                <h2 style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 800 }}>Informações expandidas</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "18%", border: "1px solid #64748B", padding: "3px", textAlign: "left", background: "#E9F2E7" }}>Tipo / grupo / item</th>
                      <th style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#E9F2E7" }}>Média</th>
                      {filteredMatrixMonths.map((month) => (
                        <th key={`print-head-${month.month}`} style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#E9F2E7" }}>
                          {monthLabel(month.month)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Saldo inicial", key: "opening" as const, values: filteredMatrixMonths.map((month) => month.openingBalance ?? 0) },
                      { label: "Saldo final", key: "closing" as const, values: filteredMatrixMonths.map((month) => month.closingBalance ?? month.bankBalance ?? 0) },
                    ].map((row) => (
                      <tr key={`print-${row.key}`}>
                        <td style={{ border: "1px solid #94A3B8", padding: "3px", fontWeight: 800 }}>{row.label}</td>
                        <td style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: "right", ...signedStyle(average(row.values)) }}>{money(average(row.values))}</td>
                        {row.values.map((value, index) => (
                          <td key={`print-${row.key}-${filteredMatrixMonths[index]?.month}`} style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: "right", ...signedStyle(value) }}>
                            {money(value)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {(["receita", "despesa"] as const).flatMap((type) => {
                      const groups = data.matrix.groups.filter((group) => group.type === type);
                      const label = type === "receita" ? "Receitas" : "Despesas";
                      const sectionValues = filteredMatrixMonths.map((month) => matrixTypeValue(data.matrix, type, month.month));

                      return [
                        <tr key={`print-section-${type}`}>
                          <td style={{ border: "1px solid #64748B", padding: "3px", fontWeight: 900, background: "#DDEAD8" }}>{label}</td>
                          <td style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#DDEAD8", ...signedStyle(average(sectionValues)) }}>{money(average(sectionValues))}</td>
                          {sectionValues.map((value, index) => (
                            <td key={`print-section-${type}-${filteredMatrixMonths[index]?.month}`} style={{ border: "1px solid #64748B", padding: "3px", textAlign: "right", background: "#DDEAD8", ...signedStyle(value) }}>{money(value)}</td>
                          ))}
                        </tr>,
                        ...groups.flatMap((group) => {
                          const groupValues = filteredMatrixMonths.map((month) => Number(group.values[month.month]) || 0);
                          return [
                            <tr key={`print-group-${type}-${group.group}`}>
                              <td style={{ border: "1px solid #94A3B8", padding: "3px 3px 3px 9px", fontWeight: 800, background: "#F3F8F0" }}>{group.group}</td>
                              <td style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: "right", background: "#F3F8F0", ...signedStyle(average(groupValues)) }}>{money(average(groupValues))}</td>
                              {groupValues.map((value, index) => (
                                <td key={`print-group-${type}-${group.group}-${filteredMatrixMonths[index]?.month}`} style={{ border: "1px solid #94A3B8", padding: "3px", textAlign: "right", background: "#F3F8F0", ...signedStyle(value) }}>{money(value)}</td>
                              ))}
                            </tr>,
                            ...group.items.map((item) => {
                              const itemValues = filteredMatrixMonths.map((month) => Number(item.values[month.month]) || 0);
                              return (
                                <tr key={`print-item-${type}-${group.group}-${item.name}`}>
                                  <td style={{ border: "1px solid #CBD5E1", padding: "2px 3px 2px 16px" }}>{item.name}</td>
                                  <td style={{ border: "1px solid #CBD5E1", padding: "2px 3px", textAlign: "right", ...signedStyle(average(itemValues)) }}>{money(average(itemValues))}</td>
                                  {itemValues.map((value, index) => (
                                    <td key={`print-item-${type}-${group.group}-${item.name}-${filteredMatrixMonths[index]?.month}`} style={{ border: "1px solid #CBD5E1", padding: "2px 3px", textAlign: "right", ...signedStyle(value) }}>{money(value)}</td>
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
