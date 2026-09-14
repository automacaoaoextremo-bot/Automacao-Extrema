"use client";

import { useEffect, useState } from "react";

type AudienceFilter = "all" | "corrente" | "nao_corrente";
type Group = { label: string; quantity: number; total: number };
type CategorySummary = { label: string; quantity: number; revenue: number; expenses: number; result: number; resultPercent: number | null };
type PendingPayment = { id: string; clientName: string; code: string; createdAt: string; items: string; total: number };
type Expense = { id: string; category: string; description: string; amount: number; status: string; notes?: string | null };
type ExtraRevenue = {
  id: string;
  revenue_type: "doacao" | "receita_extra";
  description: string;
  source?: string | null;
  amount: number | string;
  status: "confirmada" | "pendente" | "cancelada";
  notes?: string | null;
  created_at?: string | null;
};
type EventOption = { id: string; name: string; event_date: string; slug: string; status: string; is_public?: boolean };
type Report = {
  event: EventOption;
  events: EventOption[];
  audience: AudienceFilter;
  audienceCounts: { total: number; corrente: number; naoCorrente: number; unknown: number };
  orderWindow: { firstOrderAt: string | null; lastOrderAt: string | null; durationMinutes: number | null };
  expenseScope?: "filtered-event" | "whole-event";
  expenseScopeNote?: string | null;
  totals: {
    sold: number;
    paid: number;
    pending: number;
    canceled: number;
    expenses: number;
    extraRevenues: number;
    revenue: number;
    result: number;
  };
  metrics: { orders: number; clients: number; itemQuantity: number; averageTicket: number; paidOrders: number; pendingOrders: number };
  byPayment: Group[];
  byKind: Group[];
  byCategorySummary: CategorySummary[];
  byItem: Group[];
  byUnitPrice: Group[];
  byExpense: Group[];
  byExtraRevenue: Group[];
  pendingPayments: PendingPayment[];
  expenses: Expense[];
  extraRevenues: ExtraRevenue[];
};

type CustomerRegistration = {
  clientId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  isCorrente: boolean | null;
  correnteIdentifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type CustomerOrder = {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  code: string;
  status: string;
  paymentStatus: string;
  paymentMethods: string[];
  createdAt: string;
  total: number;
  notes: string | null;
  items: Array<{
    id: string;
    kind: string;
    name: string;
    categoryPath: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

type CustomerAnalysisRow = {
  key: string;
  name: string;
  whatsapp: string | null;
  registrations: CustomerRegistration[];
  orders: CustomerOrder[];
  summary: {
    orders: number;
    events: number;
    itemQuantity: number;
    total: number;
    paid: number;
    pending: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
};

type CustomerAnalysis = {
  scope: "event" | "all";
  selectedEvent: EventOption | null;
  events: EventOption[];
  customers: CustomerAnalysisRow[];
  totals: { customers: number; orders: number; itemQuantity: number; total: number; paid: number; pending: number };
};

type ParetoRow = Group & {
  sharePercent: number;
  cumulativePercent: number;
  bucket: "principal" | "complementar";
};

type ParetoSummary = {
  principal: { quantity: number; total: number; sharePercent: number; values: ParetoRow[] };
  complementar: { quantity: number; total: number; sharePercent: number; values: ParetoRow[] };
  total: number;
};

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function number(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value || 0);
}

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}

function variationPercent(base: number, current: number) {
  if (!Number.isFinite(base) || !Number.isFinite(current)) return "—";
  if (base === 0) return current === 0 ? "0,0%" : "novo";
  const variation = ((current - base) / Math.abs(base)) * 100;
  const prefix = variation > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(variation)}%`;
}

const BAZAR_TIME_ZONE = "America/Sao_Paulo";

function dateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("pt-BR", {
    timeZone: BAZAR_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  });
}

function timeOnly(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString("pt-BR", {
    timeZone: BAZAR_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(minutes?: number | null) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "—";
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  return `${hours}h ${String(remaining).padStart(2, "0")}min`;
}

function eventDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function bazarAuthHeaders(extra?: HeadersInit): HeadersInit {
  const headers = new Headers(extra);
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("bazar_sementinha_session");
    if (token) headers.set("x-bazar-session", token);
  }
  return headers;
}

function currencyLabelValue(label: string) {
  const normalized = label
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function buildParetoRows(rows: Group[]): ParetoRow[] {
  const eligible = rows
    .filter((row) => Number.isFinite(row.total) && row.total > 0)
    .sort((a, b) => b.total - a.total || currencyLabelValue(a.label) - currencyLabelValue(b.label));

  const total = eligible.reduce((sum, row) => sum + row.total, 0);
  if (total <= 0) return [];

  let accumulated = 0;
  return eligible.map((row) => {
    const sharePercent = (row.total / total) * 100;
    const bucket: ParetoRow["bucket"] = accumulated / total < 0.8 ? "principal" : "complementar";
    accumulated += row.total;
    return {
      ...row,
      sharePercent,
      cumulativePercent: (accumulated / total) * 100,
      bucket,
    };
  });
}

function summarizePareto(rows: Group[]): ParetoSummary {
  const paretoRows = buildParetoRows(rows);
  const total = paretoRows.reduce((sum, row) => sum + row.total, 0);

  const summarize = (bucket: ParetoRow["bucket"]) => {
    const values = paretoRows.filter((row) => row.bucket === bucket);
    const bucketTotal = values.reduce((sum, row) => sum + row.total, 0);
    return {
      quantity: values.reduce((sum, row) => sum + row.quantity, 0),
      total: bucketTotal,
      sharePercent: total > 0 ? (bucketTotal / total) * 100 : 0,
      values,
    };
  };

  return {
    principal: summarize("principal"),
    complementar: summarize("complementar"),
    total,
  };
}

function paretoValuesLabel(rows: ParetoRow[]) {
  return rows
    .slice()
    .sort((a, b) => currencyLabelValue(a.label) - currencyLabelValue(b.label))
    .map((row) => row.label)
    .join(", ");
}

function reportUrl(eventSelector: string, audience: AudienceFilter) {
  const params = new URLSearchParams();
  if (eventSelector) params.set("evento", eventSelector);
  if (audience !== "all") params.set("audience", audience);
  const query = params.toString();
  return `/api/bazar-sementinha/report${query ? `?${query}` : ""}`;
}

async function fetchReport(eventSelector: string, audience: AudienceFilter) {
  const response = await fetch(reportUrl(eventSelector, audience), { cache: "no-store" });
  const data = (await response.json()) as Report & { error?: string };
  if (!response.ok) throw new Error(data.error || "Erro ao carregar relatório.");
  return data;
}

export function PrestacaoClient({ eventSelector = "" }: { eventSelector?: string }) {
  const [selectedEvent, setSelectedEvent] = useState(eventSelector);
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [report, setReport] = useState<Report | null>(null);
  const [comparisonReports, setComparisonReports] = useState<Report[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    fetchReport(selectedEvent, audience)
      .then((data) => {
        if (ignore) return;
        setReport(data);
        if (!selectedEvent) setSelectedEvent(data.event.id);
        setCompareIds((current) => {
          const available = data.events.map((item) => item.id);
          const kept = current.filter((id) => available.includes(id)).slice(0, 2);
          if (kept.length === 2) return kept;
          return [data.event.id, ...available.filter((id) => id !== data.event.id)].slice(0, 2);
        });
      })
      .catch((error) => {
        if (!ignore) setMessage(error instanceof Error ? error.message : "Erro ao carregar relatório.");
      });
    return () => {
      ignore = true;
    };
  }, [audience, refreshNonce, selectedEvent]);

  function selectEvent(next: string) {
    setSelectedEvent(next);
    setComparisonReports([]);
    setComparisonOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("evento", next);
      else url.searchParams.delete("evento");
      window.history.replaceState({}, "", url.toString());
    }
  }

  function toggleComparisonEvent(id: string, checked: boolean) {
    setMessage("");
    if (checked && !compareIds.includes(id) && compareIds.length >= 2) {
      setMessage("A comparação percentual desta tela usa exatamente dois bazares. Desmarque um evento para escolher outro.");
      return;
    }
    setCompareIds((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  async function compareSelectedEvents() {
    if (compareIds.length !== 2) {
      setMessage("Selecione exatamente dois bazares para comparar.");
      return;
    }
    setLoadingCompare(true);
    setMessage("");
    try {
      const reports = await Promise.all(compareIds.map((id) => fetchReport(id, audience)));
      reports.sort((a, b) => a.event.event_date.localeCompare(b.event.event_date));
      setComparisonReports(reports);
      setComparisonOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao comparar bazares.");
    } finally {
      setLoadingCompare(false);
    }
  }

  function exportCsv() {
    if (!report) return;
    const rows: Array<Array<string | number | null | undefined>> = [
      ["Evento", report.event.name],
      ["Data do evento", eventDate(report.event.event_date)],
      ["Público", audienceLabel(audience)],
      ["Primeiro pedido", dateTime(report.orderWindow.firstOrderAt)],
      ["Último pedido", dateTime(report.orderWindow.lastOrderAt)],
      ["Duração do bazar", durationLabel(report.orderWindow.durationMinutes)],
      [],
      ["Indicador", "Total"],
      ["Vendas", report.totals.sold],
      ["Doações / receitas extras", report.totals.extraRevenues],
      ["Receita total", report.totals.revenue],
      ["Total pago em vendas", report.totals.paid],
      ["Total pendente", report.totals.pending],
      ["Cancelado", report.totals.canceled],
      ["Despesas", report.totals.expenses],
      ["Resultado realizado", report.totals.result],
      ["Pedidos", report.metrics.orders],
      ["Clientes", report.metrics.clients],
      ["Itens", report.metrics.itemQuantity],
      ["Ticket médio", report.metrics.averageTicket],
      [],
      ["Totais por categoria/resumo"],
      ["Descrição", "Quantidade", "Receita", "Despesas", "Resultado", "% resultado"],
      ...report.byCategorySummary.map((item) => [item.label, item.quantity, item.revenue, item.expenses, item.result, percent(item.resultPercent)]),
      [],
      ["Itens vendidos do cardápio de alimentação"],
      ["Item", "Quantidade", "Total"],
      ...report.byItem.map((item) => [item.label, item.quantity, item.total]),
      [],
      ["Quantidade vendida por valor unitário — análise 80/20"],
      ["Faixa", "Valor unitário", "Quantidade", "Faturamento", "Participação %", "Acumulado %"],
      ...buildParetoRows(report.byUnitPrice).map((item) => [
        item.bucket === "principal" ? "Principal ~80%" : "Complementar ~20%",
        item.label,
        item.quantity,
        item.total,
        item.sharePercent,
        item.cumulativePercent,
      ]),
      [],
      ["Doações e receitas extraordinárias"],
      ["Data", "Tipo", "Descrição", "Origem", "Status", "Valor", "Observações"],
      ...report.extraRevenues.map((item) => [
        dateTime(item.created_at),
        item.revenue_type,
        item.description,
        item.source || "",
        item.status,
        item.amount,
        item.notes || "",
      ]),
      [],
      ["Pagamentos pendentes"],
      ["Cliente", "Pedido", "Itens", "Data", "Valor pendente"],
      ...report.pendingPayments.map((item) => [item.clientName, item.code, item.items, dateTime(item.createdAt), item.total]),
      [],
      ["Despesas registradas"],
      ["Categoria", "Descrição", "Status", "Valor"],
      ...report.expenses.map((item) => [item.category, item.description, item.status, item.amount]),
    ];
    downloadCsv(rows, `prestacao-contas-bazar-sementinha-${report.event.event_date}-${audience}.csv`);
  }

  function generatePdf() {
    if (!report || typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) {
      setMessage("O navegador bloqueou a janela do PDF. Autorize pop-ups para este site e tente novamente.");
      return;
    }
    const comparison = comparisonOpen && comparisonReports.length === 2 ? comparisonReports : [];
    popup.document.open();
    popup.document.write(buildPrintHtml(report, audience, comparison));
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 350);
  }

  function generateComparisonPdf() {
    if (typeof window === "undefined" || comparisonReports.length !== 2) {
      setMessage("Gere primeiro a comparação entre exatamente dois bazares.");
      return;
    }

    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) {
      setMessage("O navegador bloqueou a janela do PDF. Autorize pop-ups para este site e tente novamente.");
      return;
    }

    popup.document.open();
    popup.document.write(buildComparisonOnlyPrintHtml(comparisonReports, audience));
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 350);
  }

  if (!report) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] px-3 py-8 text-[15px] text-[#214527] sm:px-4 sm:py-10 sm:text-base">
        <div className="mx-auto w-full max-w-6xl rounded-3xl bg-white p-4 sm:p-5">
          Carregando relatório... {message}
        </div>
      </main>
    );
  }

  const cards = [
    ["Vendas", report.totals.sold],
    ["Doações / receitas extras", report.totals.extraRevenues],
    ["Receita total", report.totals.revenue],
    ["Total pago em vendas", report.totals.paid],
    ["Total pendente", report.totals.pending],
    ["Despesas confirmadas", report.totals.expenses],
    ["Resultado realizado", report.totals.result],
  ] as const;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] px-3 py-4 text-[15px] text-[#214527] sm:px-4 sm:py-6 sm:text-base">
      <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 sm:space-y-5">
        <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.18em]">Prestação de contas por evento</p>
              <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{report.event.name}</h1>
              <p className="mt-2 text-sm text-[#496451]">Consulte outros bazares, filtre o público analisado e compare dois eventos com variação percentual.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportCsv} className="rounded-full border border-[#2f7d45]/20 px-4 py-2 text-sm font-black text-[#2f7d45]">Exportar planilha</button>
              <button onClick={generatePdf} className="rounded-full bg-[#2f7d45] px-4 py-2 text-sm font-black text-white">Gerar PDF</button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="grid gap-1 text-sm font-black">
              Evento consultado
              <select value={report.event.id} onChange={(event) => selectEvent(event.target.value)} className="rounded-2xl border border-[#dfe8df] bg-white px-4 py-3">
                {report.events.map((item) => (
                  <option key={item.id} value={item.id}>{eventDate(item.event_date)} — {item.name}</option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-sm font-black">Público analisado</p>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {([
                  ["all", "Todos"],
                  ["corrente", "Filhos da Corrente"],
                  ["nao_corrente", "Filhos de Fora"],
                ] as Array<[AudienceFilter, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setAudience(value); setComparisonReports([]); setComparisonOpen(false); }}
                    className={`rounded-2xl px-3 py-3 text-xs font-black ${audience === value ? "bg-[#0f6b35] text-white" : "bg-[#f9f7ef] text-[#214527] ring-1 ring-[#dfe8df]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <AudienceStat label="Clientes classificados" value={report.audienceCounts.corrente + report.audienceCounts.naoCorrente} />
            <AudienceStat label="Filhos da Corrente" value={report.audienceCounts.corrente} />
            <AudienceStat label="Filhos de Fora" value={report.audienceCounts.naoCorrente} />
            <AudienceStat label="Não identificados" value={report.audienceCounts.unknown} />
          </div>

          {report.audienceCounts.unknown > 0 && (
            <p className="mt-3 rounded-2xl bg-[#fff8dd] p-3 text-xs font-bold leading-5 text-[#7a5a00]">
              Este evento possui {report.audienceCounts.unknown} cliente(s) sem identificação de Filho da Corrente. Eles aparecem em “Todos”, mas não entram nos filtros “Filhos da Corrente” ou “Filhos de Fora”.
            </p>
          )}

          {report.expenseScopeNote && (
            <p className="mt-3 rounded-2xl bg-[#eef7ff] p-3 text-xs font-bold leading-5 text-[#174a68]">
              {report.expenseScopeNote}
            </p>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
              <span className="text-sm font-bold text-[#496451]">{label}</span>
              <strong className="mt-2 block text-2xl text-[#064b2c] sm:text-3xl">{brl(value)}</strong>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Pedidos" value={String(report.metrics.orders)} />
          <MetricCard label="Clientes" value={String(report.metrics.clients)} />
          <MetricCard label="Itens vendidos" value={number(report.metrics.itemQuantity)} />
          <MetricCard label="Ticket médio" value={brl(report.metrics.averageTicket)} />
          <MetricCard label="Primeiro pedido" value={timeOnly(report.orderWindow.firstOrderAt)} />
          <MetricCard label="Último pedido" value={timeOnly(report.orderWindow.lastOrderAt)} />
          <MetricCard label="Duração do bazar" value={durationLabel(report.orderWindow.durationMinutes)} />
        </section>

        <section className="rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black sm:text-2xl">Comparar dois bazares</h2>
              <p className="mt-1 text-sm text-[#496451]">Selecione exatamente dois eventos. O sistema mostra valores e a variação percentual do segundo em relação ao primeiro.</p>
            </div>
            <button type="button" disabled={loadingCompare || compareIds.length !== 2} onClick={() => void compareSelectedEvents()} className="rounded-full bg-[#073f20] px-4 py-2 text-sm font-black text-white disabled:opacity-40">
              {loadingCompare ? "Comparando..." : "Comparar selecionados"}
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {report.events.map((item) => (
              <label key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#f9f7ef] px-3 py-3 ring-1 ring-[#dfe8df]">
                <input
                  type="checkbox"
                  checked={compareIds.includes(item.id)}
                  onChange={(event) => toggleComparisonEvent(item.id, event.target.checked)}
                />
                <span className="min-w-0">
                  <strong className="block text-sm">{eventDate(item.event_date)}</strong>
                  <span className="block truncate text-xs text-[#496451]">{item.name}</span>
                </span>
              </label>
            ))}
          </div>
          {message && <p className="mt-3 rounded-2xl bg-[#fff8dd] p-3 text-sm font-bold text-[#7a5a00]">{message}</p>}
        </section>

        {comparisonOpen && comparisonReports.length === 2 && (
          <ComparisonSection
            reports={comparisonReports}
            audience={audience}
            onGeneratePdf={generateComparisonPdf}
            onClose={() => setComparisonOpen(false)}
          />
        )}

        <ReportTable title="1. Totais por forma de pagamento" rows={report.byPayment} />
        <CategorySummaryTable rows={report.byCategorySummary} />
        <ReportTable title="3. Itens vendidos do cardápio de alimentação" rows={report.byItem} emptyText="Nenhum item de alimentação registrado." />
        <ParetoUnitPriceTable rows={report.byUnitPrice} />
        <PendingPaymentsTable rows={report.pendingPayments} />
        <ReportTable title="6. Despesas por categoria" rows={report.byExpense} />

        <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-black sm:text-2xl">7. Despesas registradas</h2>
          <p className="mt-2 text-sm leading-6 text-[#496451]">A inclusão e manutenção de despesas ficam somente na área de Gestão, evitando alteração indevida na prestação pública.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr className="border-b"><th className="p-3">Categoria</th><th className="p-3">Descrição</th><th className="p-3">Status</th><th className="p-3">Valor</th></tr></thead>
              <tbody>
                {report.expenses.length === 0 && <tr><td className="p-3 text-[#496451]" colSpan={4}>Nenhuma despesa registrada.</td></tr>}
                {report.expenses.map((item) => <tr key={item.id} className="border-b"><td className="p-3">{item.category}</td><td className="p-3">{item.description}</td><td className="p-3">{item.status}</td><td className="p-3 font-bold">{brl(Number(item.amount))}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <ExtraRevenueSection
          event={report.event}
          revenues={report.extraRevenues}
          onSaved={() => setRefreshNonce((current) => current + 1)}
        />

        <CustomerAnalysisSection selectedEvent={report.event.id} events={report.events} />
      </div>
    </main>
  );
}

function audienceLabel(value: AudienceFilter) {
  if (value === "corrente") return "Filhos da Corrente";
  if (value === "nao_corrente") return "Filhos de Fora";
  return "Todos";
}

function AudienceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#f9f7ef] px-3 py-3 text-center ring-1 ring-[#dfe8df]">
      <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-[#496451]">{label}</span>
      <strong className="mt-1 block text-xl text-[#064b2c]">{value}</strong>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#dfe8df] bg-white p-4 text-center shadow-sm">
      <span className="text-xs font-bold text-[#496451]">{label}</span>
      <strong className="mt-2 block text-lg text-[#064b2c] sm:text-xl">{value}</strong>
    </div>
  );
}

function ComparisonSection({
  reports,
  audience,
  onGeneratePdf,
  onClose,
}: {
  reports: Report[];
  audience: AudienceFilter;
  onGeneratePdf: () => void;
  onClose: () => void;
}) {
  const [base, current] = reports;
  const maxSold = Math.max(...reports.map((item) => item.totals.sold), 1);
  const maxPaid = Math.max(...reports.map((item) => item.totals.paid), 1);
  const maxOrders = Math.max(...reports.map((item) => item.metrics.orders), 1);
  const maxClients = Math.max(...reports.map((item) => item.metrics.clients), 1);

  return (
    <section className="space-y-4 rounded-3xl border-2 border-[#2f7d45] bg-[#f4fff7] p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f7d45]">Comparativo • {audienceLabel(audience)}</p>
          <h2 className="mt-1 text-2xl font-black">Comparação entre bazares</h2>
          <p className="mt-1 text-sm text-[#496451]">Variação percentual: {eventDate(current.event.event_date)} em relação a {eventDate(base.event.event_date)}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onGeneratePdf} className="rounded-full bg-[#2f7d45] px-4 py-2 text-xs font-black text-white">
            PDF da comparação
          </button>
          <button type="button" onClick={onClose} className="rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-[#dfe8df]">
            Fechar
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <BarChart title="Receita vendida" reports={reports} value={(item) => item.totals.sold} max={maxSold} format={brl} />
        <BarChart title="Receita paga" reports={reports} value={(item) => item.totals.paid} max={maxPaid} format={brl} />
        <BarChart title="Pedidos" reports={reports} value={(item) => item.metrics.orders} max={maxOrders} format={(value) => number(value)} />
        <BarChart title="Clientes" reports={reports} value={(item) => item.metrics.clients} max={maxClients} format={(value) => number(value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map((item) => (
          <div key={item.event.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#dfe8df]">
            <strong className="block">{eventDate(item.event.event_date)}</strong>
            <p className="mt-2 text-sm">Primeiro pedido: <b>{timeOnly(item.orderWindow.firstOrderAt)}</b></p>
            <p className="mt-1 text-sm">Último pedido: <b>{timeOnly(item.orderWindow.lastOrderAt)}</b></p>
            <p className="mt-1 text-sm">Duração: <b>{durationLabel(item.orderWindow.durationMinutes)}</b></p>
          </div>
        ))}
      </div>

      {audience !== "all" && (
        <p className="rounded-2xl bg-[#eef7ff] p-3 text-xs font-bold leading-5 text-[#174a68]">
          No comparativo por público, vendas, pedidos, clientes, pagamentos e itens são segmentados. Despesas e doações/receitas extraordinárias permanecem integrais por evento porque não possuem vínculo com um cliente específico.
        </p>
      )}

      <ComparisonMetricsTable reports={reports} />
      <GroupComparisonTable title="Formas de pagamento" reports={reports} getRows={(item) => item.byPayment} />
      <GroupComparisonTable title="Bazar x alimentos e bebidas" reports={reports} getRows={(item) => item.byKind} />
      <GroupComparisonTable title="Itens de alimentação" reports={reports} getRows={(item) => item.byItem} limit={12} />
      <ParetoComparisonTable reports={reports} />
      <GroupComparisonTable title="Despesas por categoria" reports={reports} getRows={(item) => item.byExpense} />
      <GroupComparisonTable title="Doações e receitas extraordinárias" reports={reports} getRows={(item) => item.byExtraRevenue} />
      <CategoryComparisonTable reports={reports} />

      {reports.some((item) => item.audienceCounts.unknown > 0) && (
        <p className="rounded-2xl bg-[#fff8dd] p-3 text-xs font-bold leading-5 text-[#7a5a00]">
          Clientes históricos ainda sem correspondência segura permanecem em “Todos”. Quando a mesma pessoa de 04/07 é identificada em 29/08 por WhatsApp ou nome único, a classificação pode ser retroatualizada pela migration desta evolução.
        </p>
      )}
    </section>
  );
}

function BarChart({
  title,
  reports,
  value,
  max,
  format,
}: {
  title: string;
  reports: Report[];
  value: (report: Report) => number;
  max: number;
  format: (value: number) => string;
}) {
  const [base, current] = reports;
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-black">{title}</h3>
        <span className="rounded-full bg-[#e8f5e9] px-2 py-1 text-xs font-black text-[#1d6b35]">{variationPercent(value(base), value(current))}</span>
      </div>
      <div className="mt-4 space-y-3">
        {reports.map((report) => {
          const currentValue = value(report);
          const width = Math.max(2, (currentValue / max) * 100);
          return (
            <div key={report.event.id}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <strong>{eventDate(report.event.event_date)}</strong>
                <span className="font-black text-[#064b2c]">{format(currentValue)}</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-[#e8efe8]">
                <div className="h-full rounded-full bg-[#2f7d45]" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonMetricsTable({ reports }: { reports: Report[] }) {
  const [base, current] = reports;
  const rows: Array<{
    label: string;
    value: (report: Report) => number;
    format: (value: number) => string;
  }> = [
    { label: "Vendas", value: (item) => item.totals.sold, format: brl },
    { label: "Doações / receitas extras", value: (item) => item.totals.extraRevenues, format: brl },
    { label: "Receita total", value: (item) => item.totals.revenue, format: brl },
    { label: "Total pago em vendas", value: (item) => item.totals.paid, format: brl },
    { label: "Pendente", value: (item) => item.totals.pending, format: brl },
    { label: "Cancelado", value: (item) => item.totals.canceled, format: brl },
    { label: "Despesas", value: (item) => item.totals.expenses, format: brl },
    { label: "Resultado", value: (item) => item.totals.result, format: brl },
    { label: "Pedidos", value: (item) => item.metrics.orders, format: number },
    { label: "Clientes", value: (item) => item.metrics.clients, format: number },
    { label: "Itens", value: (item) => item.metrics.itemQuantity, format: number },
    { label: "Ticket médio", value: (item) => item.metrics.averageTicket, format: brl },
    { label: "Pagamentos pendentes", value: (item) => item.pendingPayments.length, format: number },
  ];

  return (
    <section className="overflow-x-auto rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <h3 className="text-lg font-black">Indicadores gerais</h3>
      <table className="mt-3 w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Indicador</th>
            <th className="p-2">{eventDate(base.event.event_date)}</th>
            <th className="p-2">{eventDate(current.event.event_date)}</th>
            <th className="p-2">Variação</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b"><td className="p-2 font-bold">Primeiro pedido</td><td className="p-2">{timeOnly(base.orderWindow.firstOrderAt)}</td><td className="p-2">{timeOnly(current.orderWindow.firstOrderAt)}</td><td className="p-2">—</td></tr>
          <tr className="border-b"><td className="p-2 font-bold">Último pedido</td><td className="p-2">{timeOnly(base.orderWindow.lastOrderAt)}</td><td className="p-2">{timeOnly(current.orderWindow.lastOrderAt)}</td><td className="p-2">—</td></tr>
          <tr className="border-b"><td className="p-2 font-bold">Duração do bazar</td><td className="p-2">{durationLabel(base.orderWindow.durationMinutes)}</td><td className="p-2">{durationLabel(current.orderWindow.durationMinutes)}</td><td className="p-2">—</td></tr>
          {rows.map((row) => (
            <tr key={row.label} className="border-b">
              <td className="p-2 font-bold">{row.label}</td>
              <td className="p-2">{row.format(row.value(base))}</td>
              <td className="p-2">{row.format(row.value(current))}</td>
              <td className="p-2 font-black text-[#1d6b35]">{variationPercent(row.value(base), row.value(current))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function GroupComparisonTable({
  title,
  reports,
  getRows,
  limit = 20,
  sortMode = "total-desc",
}: {
  title: string;
  reports: Report[];
  getRows: (report: Report) => Group[];
  limit?: number;
  sortMode?: "total-desc" | "unit-price-asc";
}) {
  const [base, current] = reports;
  const totals = new Map<string, number>();
  for (const report of reports) {
    for (const row of getRows(report)) totals.set(row.label, (totals.get(row.label) || 0) + row.total);
  }

  const orderedEntries = [...totals.entries()].sort((a, b) => {
    if (sortMode === "unit-price-asc") {
      return currencyLabelValue(a[0]) - currencyLabelValue(b[0]);
    }
    return b[1] - a[1];
  });
  const labels = orderedEntries.slice(0, limit).map(([label]) => label);

  return (
    <section className="overflow-x-auto rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <h3 className="text-lg font-black">{title}</h3>
      <table className="mt-3 w-full min-w-[820px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Descrição</th>
            <th className="p-2">{eventDate(base.event.event_date)}</th>
            <th className="p-2">{eventDate(current.event.event_date)}</th>
            <th className="p-2">Variação qtd.</th>
            <th className="p-2">Variação valor</th>
          </tr>
        </thead>
        <tbody>
          {labels.length === 0 && <tr><td colSpan={5} className="p-3 text-[#496451]">Sem dados para comparar.</td></tr>}
          {labels.map((label) => {
            const baseRow = getRows(base).find((item) => item.label === label) || { label, quantity: 0, total: 0 };
            const currentRow = getRows(current).find((item) => item.label === label) || { label, quantity: 0, total: 0 };
            return (
              <tr key={label} className="border-b">
                <td className="p-2 font-bold">{label}</td>
                <td className="p-2">{number(baseRow.quantity)} • {brl(baseRow.total)}</td>
                <td className="p-2">{number(currentRow.quantity)} • {brl(currentRow.total)}</td>
                <td className="p-2 font-black text-[#1d6b35]">{variationPercent(baseRow.quantity, currentRow.quantity)}</td>
                <td className="p-2 font-black text-[#1d6b35]">{variationPercent(baseRow.total, currentRow.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function CategoryComparisonTable({ reports }: { reports: Report[] }) {
  const [base, current] = reports;
  const set = new Set<string>();
  reports.forEach((report) => report.byCategorySummary.forEach((row) => {
    if (row.label !== "Total do evento") set.add(row.label);
  }));
  const labels = [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <section className="overflow-x-auto rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <h3 className="text-lg font-black">Categorias / resumo</h3>
      <table className="mt-3 w-full min-w-[900px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Categoria</th>
            <th className="p-2">{eventDate(base.event.event_date)} — receita / resultado</th>
            <th className="p-2">{eventDate(current.event.event_date)} — receita / resultado</th>
            <th className="p-2">Var. receita</th>
            <th className="p-2">Var. resultado</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => {
            const baseRow = base.byCategorySummary.find((item) => item.label === label);
            const currentRow = current.byCategorySummary.find((item) => item.label === label);
            return (
              <tr key={label} className="border-b">
                <td className="p-2 font-bold">{label}</td>
                <td className="p-2">{baseRow ? `${brl(baseRow.revenue)} / ${brl(baseRow.result)}` : "—"}</td>
                <td className="p-2">{currentRow ? `${brl(currentRow.revenue)} / ${brl(currentRow.result)}` : "—"}</td>
                <td className="p-2 font-black text-[#1d6b35]">{variationPercent(baseRow?.revenue || 0, currentRow?.revenue || 0)}</td>
                <td className="p-2 font-black text-[#1d6b35]">{variationPercent(baseRow?.result || 0, currentRow?.result || 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}


function ParetoUnitPriceTable({ rows }: { rows: Group[] }) {
  const summary = summarizePareto(rows);
  const paretoRows = buildParetoRows(rows);

  return (
    <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-black sm:text-2xl">4. Quantidade vendida por valor unitário — análise 80/20</h2>
      <p className="mt-2 text-sm leading-6 text-[#496451]">
        Os valores unitários são agrupados por contribuição ao faturamento: a faixa principal reúne os valores que levam o acumulado a aproximadamente 80%; os demais formam a faixa complementar.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#eef8ef] p-4 ring-1 ring-[#cfe1d1]">
          <span className="text-xs font-black uppercase tracking-[0.08em] text-[#2f7d45]">Faixa principal • ~80%</span>
          <strong className="mt-2 block text-2xl text-[#064b2c]">{brl(summary.principal.total)}</strong>
          <p className="mt-1 text-sm text-[#496451]">{number(summary.principal.quantity)} item(ns) • {percent(summary.principal.sharePercent)}</p>
          <p className="mt-2 text-xs leading-5 text-[#496451]">
            Valores: {paretoValuesLabel(summary.principal.values) || "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#fff8dd] p-4 ring-1 ring-[#eadba7]">
          <span className="text-xs font-black uppercase tracking-[0.08em] text-[#8a6b00]">Faixa complementar • ~20%</span>
          <strong className="mt-2 block text-2xl text-[#6f5700]">{brl(summary.complementar.total)}</strong>
          <p className="mt-1 text-sm text-[#6b5d2f]">{number(summary.complementar.quantity)} item(ns) • {percent(summary.complementar.sharePercent)}</p>
          <p className="mt-2 text-xs leading-5 text-[#6b5d2f]">
            Valores: {paretoValuesLabel(summary.complementar.values) || "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Faixa</th>
              <th className="p-3">Valor unitário</th>
              <th className="p-3">Quantidade</th>
              <th className="p-3">Faturamento</th>
              <th className="p-3">Participação</th>
              <th className="p-3">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {paretoRows.length === 0 && (
              <tr><td className="p-3 text-[#496451]" colSpan={6}>Nenhuma venda registrada.</td></tr>
            )}
            {paretoRows.map((row) => (
              <tr key={row.label} className="border-b">
                <td className="p-3 font-bold">{row.bucket === "principal" ? "Principal ~80%" : "Complementar ~20%"}</td>
                <td className="p-3">{row.label}</td>
                <td className="p-3">{number(row.quantity)}</td>
                <td className="p-3 font-bold">{brl(row.total)}</td>
                <td className="p-3">{percent(row.sharePercent)}</td>
                <td className="p-3">{percent(row.cumulativePercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ParetoComparisonTable({ reports }: { reports: Report[] }) {
  const [base, current] = reports;
  const baseSummary = summarizePareto(base.byUnitPrice);
  const currentSummary = summarizePareto(current.byUnitPrice);

  const buckets = [
    {
      label: "Faixa principal (~80%)",
      base: baseSummary.principal,
      current: currentSummary.principal,
    },
    {
      label: "Faixa complementar (~20%)",
      base: baseSummary.complementar,
      current: currentSummary.complementar,
    },
  ];

  return (
    <section className="rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <h3 className="text-lg font-black">Quantidade por valor unitário — análise 80/20</h3>
      <p className="mt-2 text-xs leading-5 text-[#496451]">
        Cada bazar é classificado individualmente pelo princípio de Pareto. A faixa principal reúne os valores que levam o faturamento acumulado a aproximadamente 80%.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Faixa</th>
              <th className="p-2">{eventDate(base.event.event_date)}</th>
              <th className="p-2">{eventDate(current.event.event_date)}</th>
              <th className="p-2">Var. qtd.</th>
              <th className="p-2">Var. valor</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.label} className="border-b">
                <td className="p-2 font-bold">{bucket.label}</td>
                <td className="p-2">
                  {number(bucket.base.quantity)} • {brl(bucket.base.total)} • {percent(bucket.base.sharePercent)}
                </td>
                <td className="p-2">
                  {number(bucket.current.quantity)} • {brl(bucket.current.total)} • {percent(bucket.current.sharePercent)}
                </td>
                <td className="p-2 font-black text-[#1d6b35]">{variationPercent(bucket.base.quantity, bucket.current.quantity)}</td>
                <td className="p-2 font-black text-[#1d6b35]">{variationPercent(bucket.base.total, bucket.current.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {[base, current].map((report) => {
          const summary = summarizePareto(report.byUnitPrice);
          return (
            <div key={report.event.id} className="rounded-2xl bg-[#f9f7ef] p-4 ring-1 ring-[#dfe8df]">
              <strong>{eventDate(report.event.event_date)}</strong>
              <p className="mt-2 text-xs leading-5 text-[#496451]">
                <b>Principal:</b> {paretoValuesLabel(summary.principal.values) || "—"} ({percent(summary.principal.sharePercent)})
              </p>
              <p className="mt-1 text-xs leading-5 text-[#496451]">
                <b>Complementar:</b> {paretoValuesLabel(summary.complementar.values) || "—"} ({percent(summary.complementar.sharePercent)})
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExtraRevenueSection({
  event,
  revenues,
  onSaved,
}: {
  event: EventOption;
  revenues: ExtraRevenue[];
  onSaved: () => void;
}) {
  const isTargetEvent = event.slug === "bazar-sementinha-2026-08-29";
  const [amount, setAmount] = useState("200,00");
  const [description, setDescription] = useState("Doação ao Bazar de 29/08/2026");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function registerDonation() {
    setSaving(true);
    setFeedback("");

    try {
      const response = await fetch("/api/bazar-sementinha/revenues", {
        method: "POST",
        credentials: "same-origin",
        headers: bazarAuthHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({
          eventId: event.id,
          revenueType: "doacao",
          description,
          source,
          amount,
          status: "confirmada",
          notes,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (response.status === 401) {
        throw new Error("Entre na Gestão antes de registrar a doação.");
      }
      if (!response.ok) {
        throw new Error(payload.error || "Erro ao registrar doação.");
      }

      setFeedback("Doação registrada com sucesso.");
      setAmount("200,00");
      setSource("");
      setNotes("");
      onSaved();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao registrar doação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 rounded-3xl border-2 border-[#89a96a] bg-[#f7fff4] p-4 shadow-sm sm:p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#527c28]">Receitas extraordinárias</p>
        <h2 className="mt-1 text-2xl font-black">8. Doações e outras receitas</h2>
        <p className="mt-2 text-sm leading-6 text-[#496451]">
          Doações ficam separadas das vendas e entram no resultado do evento com rastreabilidade de valor, origem e data.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Data</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Status</th>
              <th className="p-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {revenues.length === 0 && (
              <tr><td className="p-3 text-[#496451]" colSpan={5}>Nenhuma doação ou receita extraordinária registrada.</td></tr>
            )}
            {revenues.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="p-3">{dateTime(item.created_at)}</td>
                <td className="p-3">{item.description}</td>
                <td className="p-3">{item.source || "Não informada"}</td>
                <td className="p-3">{item.status}</td>
                <td className="p-3 font-bold">{brl(Number(item.amount || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isTargetEvent ? (
        <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-[#cfe1c1]">
          <h3 className="font-black">Registrar doação para 29/08/2026</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold">
              Valor
              <input value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-xl border border-[#d7e4ce] px-3 py-2.5" />
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Origem / doador
              <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Opcional" className="rounded-xl border border-[#d7e4ce] px-3 py-2.5" />
            </label>
            <label className="grid gap-1 text-sm font-bold sm:col-span-2">
              Descrição
              <input value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-xl border border-[#d7e4ce] px-3 py-2.5" />
            </label>
            <label className="grid gap-1 text-sm font-bold sm:col-span-2">
              Observações
              <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" className="rounded-xl border border-[#d7e4ce] px-3 py-2.5" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void registerDonation()}
              disabled={saving}
              className="rounded-full bg-[#527c28] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
            >
              {saving ? "Registrando..." : "Registrar doação de R$ 200,00"}
            </button>
            <a href="/bazar-sementinha/gestao" target="_blank" rel="noreferrer" className="rounded-full border border-[#527c28]/25 bg-white px-4 py-2.5 text-xs font-black text-[#527c28]">
              Abrir Gestão
            </a>
          </div>
          {feedback && <p className="mt-3 rounded-xl bg-[#f9f7ef] p-3 text-sm font-bold text-[#496451]">{feedback}</p>}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-[#f9f7ef] p-3 text-sm text-[#496451]">
          Para registrar a doação de R$ 200,00 solicitada, selecione o evento de 29/08/2026.
        </p>
      )}
    </section>
  );
}

function ReportTable({ title, rows, emptyText = "Nenhum registro encontrado.", totalHeader = "Total" }: { title: string; rows: Group[]; emptyText?: string; totalHeader?: string }) {
  return (
    <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead><tr className="border-b"><th className="p-3">Descrição</th><th className="p-3">Quantidade</th><th className="p-3">{totalHeader}</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-3 text-[#496451]" colSpan={3}>{emptyText}</td></tr>}
            {rows.map((row) => <tr key={row.label} className="border-b"><td className="p-3">{row.label}</td><td className="p-3">{number(row.quantity)}</td><td className="p-3 font-bold">{brl(row.total)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CategorySummaryTable({ rows }: { rows: CategorySummary[] }) {
  return (
    <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-black sm:text-2xl">2. Totais por categoria/resumo</h2>
      <p className="mt-2 text-sm leading-6 text-[#496451]">
        Resultado por categoria = receita registrada menos despesas vinculadas. Despesas gerais ficam separadas quando não pertencem diretamente ao bazar ou ao cardápio.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Descrição</th>
              <th className="p-3">Qtd.</th>
              <th className="p-3">Receita</th>
              <th className="p-3">Despesas</th>
              <th className="p-3">Resultado</th>
              <th className="p-3">% resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-3 text-[#496451]" colSpan={6}>Nenhum resumo encontrado.</td></tr>}
            {rows.map((row) => (
              <tr key={row.label} className={`border-b ${row.label === "Total do evento" ? "bg-[#f9f7ef] font-black" : ""}`}>
                <td className="p-3">{row.label}</td>
                <td className="p-3">{number(row.quantity)}</td>
                <td className="p-3 font-bold">{brl(row.revenue)}</td>
                <td className="p-3 font-bold">{brl(row.expenses)}</td>
                <td className="p-3 font-bold">{brl(row.result)}</td>
                <td className="p-3 font-bold">{percent(row.resultPercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PendingPaymentsTable({ rows }: { rows: PendingPayment[] }) {
  return (
    <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-black sm:text-2xl">5. Pagamentos pendentes</h2>
      <p className="mt-2 text-sm leading-6 text-[#496451]">Pedidos ainda sem pagamento confirmado no caixa.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Cliente</th>
              <th className="p-3">Pedido</th>
              <th className="p-3">Itens</th>
              <th className="p-3">Data</th>
              <th className="p-3">Valor pendente</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-3 text-[#496451]" colSpan={5}>Não há pagamentos pendentes.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="p-3 font-bold">{row.clientName}</td>
                <td className="p-3">#{row.code}</td>
                <td className="max-w-[420px] p-3">{row.items}</td>
                <td className="p-3">{dateTime(row.createdAt)}</td>
                <td className="p-3 font-bold">{brl(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CustomerAnalysisSection({ selectedEvent, events }: { selectedEvent: string; events: EventOption[] }) {
  const [scope, setScope] = useState<"event" | "all">("event");
  const [data, setData] = useState<CustomerAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [search, setSearch] = useState("");

  async function loadAnalysis(nextScope = scope) {
    setLoading(true);
    setError("");
    setNeedsAuth(false);
    try {
      const params = new URLSearchParams();
      params.set("scope", nextScope);
      if (nextScope === "event") params.set("evento", selectedEvent);
      const response = await fetch(`/api/bazar-sementinha/customer-analysis?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: bazarAuthHeaders(),
      });
      const payload = (await response.json()) as CustomerAnalysis & { error?: string };
      if (response.status === 401) {
        setNeedsAuth(true);
        setData(null);
        throw new Error("A análise detalhada por cliente é restrita à Gestão. Entre na Gestão e tente novamente.");
      }
      if (!response.ok) throw new Error(payload.error || "Erro ao analisar clientes.");
      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro ao analisar clientes.");
    } finally {
      setLoading(false);
    }
  }

  function changeScope(next: "event" | "all") {
    setScope(next);
    setData(null);
    void loadAnalysis(next);
  }

  function exportCustomers() {
    if (!data) return;
    const rows: Array<Array<string | number | null | undefined>> = [[
      "Cliente",
      "WhatsApp",
      "Classificação Tucxa",
      "Eventos com cadastro",
      "Cliente ID",
      "Evento",
      "Data do evento",
      "Cadastro em",
      "Atualizado em",
      "Identificação Corrente em",
      "Pedido",
      "Data/hora pedido",
      "Status pedido",
      "Status pagamento",
      "Forma(s) pagamento",
      "Item",
      "Tipo",
      "Categoria",
      "Quantidade",
      "Valor unitário",
      "Total item",
      "Total pedido",
      "Observações",
    ]];

    for (const customer of data.customers) {
      const registrationsByEvent = new Map(customer.registrations.map((registration) => [registration.eventId, registration]));
      if (customer.orders.length === 0) {
        const registration = customer.registrations[0];
        rows.push([
          customer.name,
          customer.whatsapp || "",
          correnteLabel(registration?.isCorrente ?? null),
          customer.registrations.length,
          registration?.clientId || "",
          registration?.eventName || "",
          eventDate(registration?.eventDate),
          dateTime(registration?.createdAt),
          dateTime(registration?.updatedAt),
          dateTime(registration?.correnteIdentifiedAt),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
        continue;
      }

      for (const order of customer.orders) {
        const registration = registrationsByEvent.get(order.eventId) || customer.registrations[0];
        const items = order.items.length > 0 ? order.items : [null];
        for (const item of items) {
          rows.push([
            customer.name,
            customer.whatsapp || "",
            correnteLabel(registration?.isCorrente ?? null),
            customer.registrations.length,
            registration?.clientId || "",
            order.eventName,
            eventDate(order.eventDate),
            dateTime(registration?.createdAt),
            dateTime(registration?.updatedAt),
            dateTime(registration?.correnteIdentifiedAt),
            order.code,
            dateTime(order.createdAt),
            order.status,
            order.paymentStatus,
            order.paymentMethods.join(", "),
            item?.name || "",
            item?.kind || "",
            item?.categoryPath || "",
            item?.quantity || "",
            item?.unitPrice || "",
            item?.total || "",
            order.total,
            order.notes || "",
          ]);
        }
      }
    }

    downloadCsv(rows, `analise-compras-clientes-bazar-sementinha-${scope === "all" ? "todos-bazares" : selectedEvent}.csv`);
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = (data?.customers || []).filter((customer) => {
    if (!normalizedSearch) return true;
    const haystack = `${customer.name} ${customer.whatsapp || ""}`.toLocaleLowerCase("pt-BR");
    return haystack.includes(normalizedSearch);
  });

  return (
    <section className="rounded-3xl border-2 border-[#d7b74a] bg-[#fffdf2] p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6b00]">Análise por cliente</p>
          <h2 className="mt-1 text-2xl font-black">Compras realizadas por cliente</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d654e]">Consulte cadastro, identificação como Filho da Corrente, eventos, pedidos, itens, valores e situação de pagamento. Tokens técnicos de acesso não são exibidos nem exportados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void loadAnalysis()} disabled={loading} className="rounded-full bg-[#7b6500] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{loading ? "Carregando..." : "Analisar clientes"}</button>
          <button type="button" onClick={exportCustomers} disabled={!data} className="rounded-full border border-[#7b6500]/25 bg-white px-4 py-2 text-sm font-black text-[#7b6500] disabled:opacity-40">Exportar planilha</button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[auto_auto_minmax(0,1fr)]">
        <button type="button" onClick={() => changeScope("event")} className={`rounded-2xl px-4 py-3 text-sm font-black ${scope === "event" ? "bg-[#7b6500] text-white" : "bg-white ring-1 ring-[#e2d9b7]"}`}>Bazar selecionado</button>
        <button type="button" onClick={() => changeScope("all")} className={`rounded-2xl px-4 py-3 text-sm font-black ${scope === "all" ? "bg-[#7b6500] text-white" : "bg-white ring-1 ring-[#e2d9b7]"}`}>Todos os bazares</button>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente por nome ou WhatsApp" className="min-w-0 rounded-2xl border border-[#e2d9b7] bg-white px-4 py-3 text-sm" />
      </div>

      {scope === "event" && <p className="mt-2 text-xs text-[#6b725f]">Evento selecionado: {eventDate(events.find((event) => event.id === selectedEvent)?.event_date)}</p>}
      {error && <p className="mt-3 rounded-2xl bg-[#fff1ee] p-3 text-sm font-bold text-[#8a2f20]">{error}</p>}
      {needsAuth && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e6c8a8] bg-[#fff8ef] p-3">
          <span className="text-sm text-[#6c4d2c]">Faça login na Gestão para liberar os dados detalhados dos clientes.</span>
          <a
            href="/bazar-sementinha/gestao"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#214527] px-4 py-2 text-xs font-black text-white"
          >
            Abrir Gestão
          </a>
          <button
            type="button"
            onClick={() => void loadAnalysis()}
            className="rounded-full border border-[#214527]/20 bg-white px-4 py-2 text-xs font-black text-[#214527]"
          >
            Já entrei — tentar novamente
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <AudienceStat label="Clientes" value={data.totals.customers} />
            <AudienceStat label="Pedidos" value={data.totals.orders} />
            <AudienceStat label="Itens" value={data.totals.itemQuantity} />
            <MetricCard label="Total comprado" value={brl(data.totals.total)} />
            <MetricCard label="Pago" value={brl(data.totals.paid)} />
            <MetricCard label="Pendente" value={brl(data.totals.pending)} />
          </div>

          <div className="mt-4 space-y-3">
            {filtered.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-[#5d654e] ring-1 ring-[#e2d9b7]">Nenhum cliente encontrado.</p>}
            {filtered.map((customer) => (
              <details key={customer.key} className="rounded-2xl bg-white p-4 ring-1 ring-[#e2d9b7]">
                <summary className="cursor-pointer list-none">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <strong className="text-lg">{customer.name}</strong>
                      <p className="mt-1 text-xs text-[#65705d]">{formatWhatsapp(customer.whatsapp)} • {customer.summary.orders} pedido(s) • {customer.summary.events} bazar(es)</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <strong className="text-lg text-[#7b6500]">{brl(customer.summary.total)}</strong>
                      <p className="text-xs text-[#65705d]">Pago {brl(customer.summary.paid)} • Pendente {brl(customer.summary.pending)}</p>
                    </div>
                  </div>
                </summary>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoBox label="WhatsApp" value={formatWhatsapp(customer.whatsapp)} />
                  <InfoBox label="Primeiro pedido" value={dateTime(customer.summary.firstOrderAt)} />
                  <InfoBox label="Último pedido" value={dateTime(customer.summary.lastOrderAt)} />
                  <InfoBox label="Itens comprados" value={number(customer.summary.itemQuantity)} />
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                    <thead><tr className="border-b"><th className="p-2">Evento</th><th className="p-2">Pedido</th><th className="p-2">Data/hora</th><th className="p-2">Itens</th><th className="p-2">Pagamento</th><th className="p-2">Valor</th></tr></thead>
                    <tbody>
                      {customer.orders.length === 0 && <tr><td colSpan={6} className="p-3 text-[#65705d]">Cliente cadastrado, mas sem pedidos no escopo selecionado.</td></tr>}
                      {customer.orders.map((order) => (
                        <tr key={order.id} className="border-b align-top">
                          <td className="p-2">{eventDate(order.eventDate)}</td>
                          <td className="p-2 font-bold">#{order.code}</td>
                          <td className="p-2">{dateTime(order.createdAt)}</td>
                          <td className="max-w-[360px] p-2">{describeCustomerItems(order.items)}</td>
                          <td className="p-2">{order.paymentStatus}{order.paymentMethods.length > 0 ? ` • ${order.paymentMethods.join(", ")}` : ""}</td>
                          <td className="p-2 font-black">{brl(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {customer.registrations.map((registration) => (
                    <div key={registration.clientId} className="rounded-xl bg-[#faf7e8] p-3 text-xs leading-5">
                      <strong>{eventDate(registration.eventDate)} — {registration.eventName}</strong>
                      <div>Cliente ID: {registration.clientId}</div>
                      <div>Classificação: {correnteLabel(registration.isCorrente)}</div>
                      <div>Cadastro: {dateTime(registration.createdAt)}</div>
                      <div>Atualização: {dateTime(registration.updatedAt)}</div>
                      <div>Identificação Corrente: {dateTime(registration.correnteIdentifiedAt)}</div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#faf7e8] p-3"><span className="block text-[10px] font-black uppercase tracking-[0.08em] text-[#6b725f]">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}

function correnteLabel(value: boolean | null) {
  if (value === true) return "Filho da Corrente";
  if (value === false) return "Filho de Fora";
  return "Não identificado";
}

function formatWhatsapp(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Não informado";
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

function describeCustomerItems(items: CustomerOrder["items"]) {
  if (items.length === 0) return "Sem itens detalhados";
  return items.map((item) => `${number(item.quantity)}x ${item.name} (${brl(item.unitPrice)})`).join(", ");
}

function downloadCsv(rows: Array<Array<string | number | null | undefined>>, filename: string) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlGroupTable(title: string, rows: Group[]) {
  return `<section><h2>${escapeHtml(title)}</h2><table><thead><tr><th>Descrição</th><th>Quantidade</th><th>Total</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(number(row.quantity))}</td><td>${escapeHtml(brl(row.total))}</td></tr>`).join("") || '<tr><td colspan="3">Sem registros.</td></tr>'}</tbody></table></section>`;
}

function htmlParetoTable(title: string, rows: Group[]) {
  const summary = summarizePareto(rows);
  const paretoRows = buildParetoRows(rows);

  return `<section><h2>${escapeHtml(title)}</h2>
    <p class="small">Faixa principal: valores que levam o faturamento acumulado a aproximadamente 80%. Faixa complementar: valores restantes.</p>
    <table><thead><tr><th>Faixa</th><th>Valor unitário</th><th>Qtd.</th><th>Faturamento</th><th>Participação</th><th>Acumulado</th></tr></thead><tbody>
      ${paretoRows.map((row) => `<tr><td>${escapeHtml(row.bucket === "principal" ? "Principal ~80%" : "Complementar ~20%")}</td><td>${escapeHtml(row.label)}</td><td>${escapeHtml(number(row.quantity))}</td><td>${escapeHtml(brl(row.total))}</td><td>${escapeHtml(percent(row.sharePercent))}</td><td>${escapeHtml(percent(row.cumulativePercent))}</td></tr>`).join("") || '<tr><td colspan="6">Sem registros.</td></tr>'}
    </tbody></table>
    <p class="small">Principal: ${escapeHtml(brl(summary.principal.total))} (${escapeHtml(percent(summary.principal.sharePercent))}) • Complementar: ${escapeHtml(brl(summary.complementar.total))} (${escapeHtml(percent(summary.complementar.sharePercent))})</p>
  </section>`;
}

function htmlParetoComparison(reports: Report[]) {
  const [base, current] = reports;
  const baseSummary = summarizePareto(base.byUnitPrice);
  const currentSummary = summarizePareto(current.byUnitPrice);

  const buckets = [
    ["Faixa principal (~80%)", baseSummary.principal, currentSummary.principal],
    ["Faixa complementar (~20%)", baseSummary.complementar, currentSummary.complementar],
  ] as const;

  return `<section><h2>Quantidade por valor unitário — análise 80/20</h2>
    <table><thead><tr><th>Faixa</th><th>${escapeHtml(eventDate(base.event.event_date))}</th><th>${escapeHtml(eventDate(current.event.event_date))}</th><th>Var. qtd.</th><th>Var. valor</th></tr></thead><tbody>
      ${buckets.map(([label, baseBucket, currentBucket]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(`${number(baseBucket.quantity)} / ${brl(baseBucket.total)} / ${percent(baseBucket.sharePercent)}`)}</td><td>${escapeHtml(`${number(currentBucket.quantity)} / ${brl(currentBucket.total)} / ${percent(currentBucket.sharePercent)}`)}</td><td><b>${escapeHtml(variationPercent(baseBucket.quantity, currentBucket.quantity))}</b></td><td><b>${escapeHtml(variationPercent(baseBucket.total, currentBucket.total))}</b></td></tr>`).join("")}
    </tbody></table>
    <p class="small">${escapeHtml(eventDate(base.event.event_date))} principal: ${escapeHtml(paretoValuesLabel(baseSummary.principal.values) || "—")}</p>
    <p class="small">${escapeHtml(eventDate(current.event.event_date))} principal: ${escapeHtml(paretoValuesLabel(currentSummary.principal.values) || "—")}</p>
  </section>`;
}

function buildPrintHtml(report: Report, audience: AudienceFilter, comparisonReports: Report[]) {
  const comparisonHtml = comparisonReports.length === 2 ? buildComparisonPrintHtml(comparisonReports) : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prestação de contas - ${escapeHtml(report.event.name)}</title><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#214527;margin:0;font-size:11px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:16px 0 6px;color:#064b2c}.meta{margin:4px 0 14px;color:#496451}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.card{border:1px solid #dfe8df;border-radius:8px;padding:8px}.card b{display:block;font-size:15px;margin-top:3px}table{width:100%;border-collapse:collapse;margin-top:5px}th,td{border-bottom:1px solid #dfe8df;padding:5px;text-align:left;vertical-align:top}th{background:#f3f7f0}.page-break{break-before:page}section{break-inside:auto}.small{font-size:9px;color:#496451}
  </style></head><body>
    <h1>Prestação de contas - ${escapeHtml(report.event.name)}</h1>
    <div class="meta">Data: ${escapeHtml(eventDate(report.event.event_date))} | Público: ${escapeHtml(audienceLabel(audience))} | Primeiro pedido: ${escapeHtml(dateTime(report.orderWindow.firstOrderAt))} | Último pedido: ${escapeHtml(dateTime(report.orderWindow.lastOrderAt))} | Duração: ${escapeHtml(durationLabel(report.orderWindow.durationMinutes))}</div>
    <div class="cards">
      ${[["Vendas", brl(report.totals.sold)],["Doações / receitas extras", brl(report.totals.extraRevenues)],["Receita total", brl(report.totals.revenue)],["Total pago em vendas", brl(report.totals.paid)],["Pendente", brl(report.totals.pending)],["Despesas", brl(report.totals.expenses)],["Resultado realizado", brl(report.totals.result)],["Ticket médio", brl(report.metrics.averageTicket)]].map(([label,value]) => `<div class="card"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("")}
    </div>
    <div class="cards" style="margin-top:6px">
      ${[["Pedidos", report.metrics.orders],["Clientes", report.metrics.clients],["Itens vendidos", number(report.metrics.itemQuantity)],["Primeiro pedido", timeOnly(report.orderWindow.firstOrderAt)],["Último pedido", timeOnly(report.orderWindow.lastOrderAt)],["Duração", durationLabel(report.orderWindow.durationMinutes)],["Pendências", report.pendingPayments.length]].map(([label,value]) => `<div class="card"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("")}
    </div>
    ${htmlGroupTable("1. Totais por forma de pagamento", report.byPayment)}
    <section><h2>2. Totais por categoria/resumo</h2><table><thead><tr><th>Descrição</th><th>Qtd.</th><th>Receita</th><th>Despesas</th><th>Resultado</th><th>%</th></tr></thead><tbody>${report.byCategorySummary.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(number(row.quantity))}</td><td>${escapeHtml(brl(row.revenue))}</td><td>${escapeHtml(brl(row.expenses))}</td><td>${escapeHtml(brl(row.result))}</td><td>${escapeHtml(percent(row.resultPercent))}</td></tr>`).join("")}</tbody></table></section>
    ${htmlGroupTable("3. Itens vendidos do cardápio", report.byItem)}
    ${htmlParetoTable("4. Quantidade vendida por valor unitário — análise 80/20", report.byUnitPrice)}
    <section><h2>5. Pagamentos pendentes</h2><table><thead><tr><th>Cliente</th><th>Pedido</th><th>Itens</th><th>Data</th><th>Valor</th></tr></thead><tbody>${report.pendingPayments.map((row) => `<tr><td>${escapeHtml(row.clientName)}</td><td>#${escapeHtml(row.code)}</td><td>${escapeHtml(row.items)}</td><td>${escapeHtml(dateTime(row.createdAt))}</td><td>${escapeHtml(brl(row.total))}</td></tr>`).join("") || '<tr><td colspan="5">Não há pagamentos pendentes.</td></tr>'}</tbody></table></section>
    ${htmlGroupTable("6. Despesas por categoria", report.byExpense)}
    <section><h2>7. Despesas registradas</h2><table><thead><tr><th>Categoria</th><th>Descrição</th><th>Status</th><th>Valor</th></tr></thead><tbody>${report.expenses.map((row) => `<tr><td>${escapeHtml(row.category)}</td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(brl(Number(row.amount)))}</td></tr>`).join("") || '<tr><td colspan="4">Nenhuma despesa registrada.</td></tr>'}</tbody></table></section>
    <section><h2>8. Doações e receitas extraordinárias</h2><table><thead><tr><th>Data</th><th>Descrição</th><th>Origem</th><th>Status</th><th>Valor</th></tr></thead><tbody>${report.extraRevenues.map((row) => `<tr><td>${escapeHtml(dateTime(row.created_at))}</td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.source || "Não informada")}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(brl(Number(row.amount)))}</td></tr>`).join("") || '<tr><td colspan="5">Nenhuma doação ou receita extraordinária registrada.</td></tr>'}</tbody></table></section>
    ${comparisonHtml}
    <script>window.addEventListener('afterprint',()=>window.close());</script>
  </body></html>`;
}

function comparisonRows(reports: Report[]) {
  const [base, current] = reports;
  return [
    ["Vendas", base.totals.sold, current.totals.sold, brl],
    ["Doações / receitas extras", base.totals.extraRevenues, current.totals.extraRevenues, brl],
    ["Receita total", base.totals.revenue, current.totals.revenue, brl],
    ["Total pago em vendas", base.totals.paid, current.totals.paid, brl],
    ["Pendente", base.totals.pending, current.totals.pending, brl],
    ["Despesas", base.totals.expenses, current.totals.expenses, brl],
    ["Resultado realizado", base.totals.result, current.totals.result, brl],
    ["Pedidos", base.metrics.orders, current.metrics.orders, number],
    ["Clientes", base.metrics.clients, current.metrics.clients, number],
    ["Itens", base.metrics.itemQuantity, current.metrics.itemQuantity, number],
    ["Ticket médio", base.metrics.averageTicket, current.metrics.averageTicket, brl],
  ] as Array<[string, number, number, (value: number) => string]>;
}

function htmlComparisonGroupTable(
  title: string,
  reports: Report[],
  getRows: (report: Report) => Group[],
  sortMode: "label" | "unit-price-asc" = "label",
) {
  const [base, current] = reports;
  const baseMap = new Map(getRows(base).map((row) => [row.label, row]));
  const currentMap = new Map(getRows(current).map((row) => [row.label, row]));
  const labels = [...new Set([...baseMap.keys(), ...currentMap.keys()])].sort((a, b) => {
    if (sortMode === "unit-price-asc") {
      return currencyLabelValue(a) - currencyLabelValue(b);
    }
    return a.localeCompare(b, "pt-BR");
  });

  return `<section><h2>${escapeHtml(title)}</h2><table><thead><tr><th>Descrição</th><th>${escapeHtml(eventDate(base.event.event_date))}</th><th>${escapeHtml(eventDate(current.event.event_date))}</th><th>Var. qtd.</th><th>Var. valor</th></tr></thead><tbody>${labels.map((label) => {
    const baseRow = baseMap.get(label) || { label, quantity: 0, total: 0 };
    const currentRow = currentMap.get(label) || { label, quantity: 0, total: 0 };
    return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(`${number(baseRow.quantity)} / ${brl(baseRow.total)}`)}</td><td>${escapeHtml(`${number(currentRow.quantity)} / ${brl(currentRow.total)}`)}</td><td><b>${escapeHtml(variationPercent(baseRow.quantity, currentRow.quantity))}</b></td><td><b>${escapeHtml(variationPercent(baseRow.total, currentRow.total))}</b></td></tr>`;
  }).join("") || '<tr><td colspan="5">Sem registros.</td></tr>'}</tbody></table></section>`;
}

function buildComparisonPrintHtml(reports: Report[], pageBreak = true) {
  const [base, current] = reports;
  const rows = comparisonRows(reports);
  const pageBreakClass = pageBreak ? ' class="page-break"' : "";

  return `<section${pageBreakClass}><h1>Comparação entre bazares</h1><div class="meta">${escapeHtml(eventDate(base.event.event_date))} x ${escapeHtml(eventDate(current.event.event_date))}</div><table><thead><tr><th>Indicador</th><th>${escapeHtml(eventDate(base.event.event_date))}</th><th>${escapeHtml(eventDate(current.event.event_date))}</th><th>Variação</th></tr></thead><tbody><tr><td>Primeiro pedido</td><td>${escapeHtml(timeOnly(base.orderWindow.firstOrderAt))}</td><td>${escapeHtml(timeOnly(current.orderWindow.firstOrderAt))}</td><td>—</td></tr><tr><td>Último pedido</td><td>${escapeHtml(timeOnly(base.orderWindow.lastOrderAt))}</td><td>${escapeHtml(timeOnly(current.orderWindow.lastOrderAt))}</td><td>—</td></tr><tr><td>Duração do bazar</td><td>${escapeHtml(durationLabel(base.orderWindow.durationMinutes))}</td><td>${escapeHtml(durationLabel(current.orderWindow.durationMinutes))}</td><td>—</td></tr>${rows.map(([label,baseValue,currentValue,formatter]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(formatter(baseValue))}</td><td>${escapeHtml(formatter(currentValue))}</td><td><b>${escapeHtml(variationPercent(baseValue,currentValue))}</b></td></tr>`).join("")}</tbody></table>
  ${htmlComparisonGroupTable("Formas de pagamento", reports, (item) => item.byPayment)}
  ${htmlComparisonGroupTable("Bazar x alimentos e bebidas", reports, (item) => item.byKind)}
  ${htmlComparisonGroupTable("Itens de alimentação", reports, (item) => item.byItem)}
  ${htmlParetoComparison(reports)}
  ${htmlComparisonGroupTable("Despesas por categoria", reports, (item) => item.byExpense)}
  ${htmlComparisonGroupTable("Doações e receitas extraordinárias", reports, (item) => item.byExtraRevenue)}
  </section>`;
}

function buildComparisonOnlyPrintHtml(reports: Report[], audience: AudienceFilter) {
  const [base, current] = reports;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comparação entre bazares - ${escapeHtml(eventDate(base.event.event_date))} x ${escapeHtml(eventDate(current.event.event_date))}</title><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#214527;margin:0;font-size:11px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:16px 0 6px;color:#064b2c}.meta{margin:4px 0 14px;color:#496451}table{width:100%;border-collapse:collapse;margin-top:5px}th,td{border-bottom:1px solid #dfe8df;padding:5px;text-align:left;vertical-align:top}th{background:#f3f7f0}section{break-inside:auto}
  </style></head><body>
    <div class="meta">Prestação de contas • Público: ${escapeHtml(audienceLabel(audience))}</div>
    ${buildComparisonPrintHtml(reports, false)}
    <script>window.addEventListener('afterprint',()=>window.close());</script>
  </body></html>`;
}
