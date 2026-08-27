"use client";

import { useEffect, useMemo, useState } from "react";

type AudienceFilter = "all" | "corrente" | "nao_corrente";
type Group = { label: string; quantity: number; total: number };
type CategorySummary = { label: string; quantity: number; revenue: number; expenses: number; result: number; resultPercent: number | null };
type PendingPayment = { id: string; clientName: string; code: string; createdAt: string; items: string; total: number };
type Expense = { id: string; category: string; description: string; amount: number; status: string; notes?: string | null };
type EventOption = { id: string; name: string; event_date: string; slug: string; status: string; is_public?: boolean };
type Report = {
  event: EventOption;
  events: EventOption[];
  audience: AudienceFilter;
  audienceCounts: { total: number; corrente: number; naoCorrente: number; unknown: number };
  expenseScope?: "filtered-event" | "whole-event";
  expenseScopeNote?: string | null;
  totals: { sold: number; paid: number; pending: number; canceled: number; expenses: number; result: number };
  metrics: { orders: number; clients: number; itemQuantity: number; averageTicket: number; paidOrders: number; pendingOrders: number };
  byPayment: Group[];
  byKind: Group[];
  byCategorySummary: CategorySummary[];
  byItem: Group[];
  byExpense: Group[];
  pendingPayments: PendingPayment[];
  expenses: Expense[];
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

function dateTime(value: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function eventDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
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
          const kept = current.filter((id) => available.includes(id));
          if (kept.length >= 2) return kept;
          const defaults = [data.event.id, ...available.filter((id) => id !== data.event.id)].slice(0, 2);
          return defaults;
        });
      })
      .catch((error) => {
        if (!ignore) setMessage(error instanceof Error ? error.message : "Erro ao carregar relatório.");
      });
    return () => {
      ignore = true;
    };
  }, [audience, selectedEvent]);

  function selectEvent(next: string) {
    setSelectedEvent(next);
    setComparisonReports([]);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("evento", next);
      else url.searchParams.delete("evento");
      window.history.replaceState({}, "", url.toString());
    }
  }

  async function compareSelectedEvents() {
    if (compareIds.length < 2) {
      setMessage("Selecione pelo menos dois bazares para comparar.");
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
    const rows = [
      ["Evento", report.event.name],
      ["Público", audienceLabel(audience)],
      ["Indicador", "Total"],
      ["Total vendido", report.totals.sold],
      ["Total pago", report.totals.paid],
      ["Total pendente", report.totals.pending],
      ["Cancelado", report.totals.canceled],
      ["Despesas", report.totals.expenses],
      ["Resultado", report.totals.result],
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
      ["Pagamentos pendentes"],
      ["Cliente", "Pedido", "Itens", "Data", "Valor pendente"],
      ...report.pendingPayments.map((item) => [item.clientName, item.code, item.items, dateTime(item.createdAt), item.total]),
      [],
      ["Despesas registradas"],
      ["Categoria", "Descrição", "Status", "Valor"],
      ...report.expenses.map((item) => [item.category, item.description, item.status, item.amount]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prestacao-contas-bazar-sementinha-${report.event.event_date}-${audience}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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
    ["Total vendido", report.totals.sold],
    ["Total pago", report.totals.paid],
    ["Total pendente", report.totals.pending],
    ["Cancelado", report.totals.canceled],
    ["Despesas confirmadas", report.totals.expenses],
    ["Resultado estimado", report.totals.result],
  ] as const;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] px-3 py-4 text-[15px] text-[#214527] print:bg-white sm:px-4 sm:py-6 sm:text-base">
      <div className="mx-auto w-full max-w-6xl min-w-0 space-y-4 sm:space-y-5">
        <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm print:shadow-none sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.18em]">Prestação de contas por evento</p>
              <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{report.event.name}</h1>
              <p className="mt-2 text-sm text-[#496451]">Consulte outros bazares, filtre o público analisado e compare eventos usando os mesmos indicadores.</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button onClick={exportCsv} className="rounded-full border border-[#2f7d45]/20 px-4 py-2 text-sm font-black text-[#2f7d45]">Exportar planilha</button>
              <button onClick={() => window.print()} className="rounded-full bg-[#2f7d45] px-4 py-2 text-sm font-black text-white">Gerar PDF</button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2 print:hidden">
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
                  ["nao_corrente", "Não Filhos"],
                ] as Array<[AudienceFilter, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setAudience(value); setComparisonReports([]); }}
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
            <AudienceStat label="Não Filhos" value={report.audienceCounts.naoCorrente} />
            <AudienceStat label="Não identificados" value={report.audienceCounts.unknown} />
          </div>

          {report.audienceCounts.unknown > 0 && (
            <p className="mt-3 rounded-2xl bg-[#fff8dd] p-3 text-xs font-bold leading-5 text-[#7a5a00]">
              Este evento possui {report.audienceCounts.unknown} cliente(s) sem identificação de Filho da Corrente. Eles aparecem em “Todos”, mas não entram nos filtros “Filhos da Corrente” ou “Não Filhos”.
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

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Pedidos" value={String(report.metrics.orders)} />
          <MetricCard label="Clientes" value={String(report.metrics.clients)} />
          <MetricCard label="Itens vendidos" value={number(report.metrics.itemQuantity)} />
          <MetricCard label="Ticket médio" value={brl(report.metrics.averageTicket)} />
        </section>

        <section className="rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm print:hidden sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black sm:text-2xl">Comparar bazares</h2>
              <p className="mt-1 text-sm text-[#496451]">Selecione dois ou mais eventos. A comparação usa o mesmo filtro de público escolhido acima.</p>
            </div>
            <button type="button" disabled={loadingCompare || compareIds.length < 2} onClick={() => void compareSelectedEvents()} className="rounded-full bg-[#073f20] px-4 py-2 text-sm font-black text-white disabled:opacity-40">
              {loadingCompare ? "Comparando..." : "Comparar selecionados"}
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {report.events.map((item) => (
              <label key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#f9f7ef] px-3 py-3 ring-1 ring-[#dfe8df]">
                <input
                  type="checkbox"
                  checked={compareIds.includes(item.id)}
                  onChange={(event) => setCompareIds((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))}
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

        {comparisonOpen && comparisonReports.length >= 2 && (
          <ComparisonSection reports={comparisonReports} audience={audience} onClose={() => setComparisonOpen(false)} />
        )}

        <ReportTable title="1. Totais por forma de pagamento" rows={report.byPayment} />
        <CategorySummaryTable rows={report.byCategorySummary} />
        <ReportTable title="3. Itens vendidos do cardápio de alimentação" rows={report.byItem} emptyText="Nenhum item de alimentação registrado." />
        <PendingPaymentsTable rows={report.pendingPayments} />
        <ReportTable title="5. Despesas por categoria" rows={report.byExpense} />

        <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm print:break-inside-avoid sm:p-5">
          <h2 className="text-xl font-black sm:text-2xl">6. Despesas registradas</h2>
          <p className="mt-2 text-sm leading-6 text-[#496451] print:hidden">A inclusão e manutenção de despesas ficam somente na área de Gestão, evitando alteração indevida na prestação pública.</p>
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
      </div>
    </main>
  );
}

function audienceLabel(value: AudienceFilter) {
  if (value === "corrente") return "Filhos da Corrente";
  if (value === "nao_corrente") return "Não Filhos da Corrente";
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
      <strong className="mt-2 block text-xl text-[#064b2c]">{value}</strong>
    </div>
  );
}

function ComparisonSection({ reports, audience, onClose }: { reports: Report[]; audience: AudienceFilter; onClose: () => void }) {
  const maxSold = Math.max(...reports.map((item) => item.totals.sold), 1);
  const maxPaid = Math.max(...reports.map((item) => item.totals.paid), 1);
  const maxOrders = Math.max(...reports.map((item) => item.metrics.orders), 1);
  const maxClients = Math.max(...reports.map((item) => item.metrics.clients), 1);

  return (
    <section className="space-y-4 rounded-3xl border-2 border-[#2f7d45] bg-[#f4fff7] p-4 shadow-sm print:break-before-page sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f7d45]">Comparativo • {audienceLabel(audience)}</p>
          <h2 className="mt-1 text-2xl font-black">Comparação entre bazares</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-white px-3 py-2 text-xs font-black ring-1 ring-[#dfe8df] print:hidden">Fechar</button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <BarChart title="Receita vendida" reports={reports} value={(item) => item.totals.sold} max={maxSold} format={brl} />
        <BarChart title="Receita paga" reports={reports} value={(item) => item.totals.paid} max={maxPaid} format={brl} />
        <BarChart title="Pedidos" reports={reports} value={(item) => item.metrics.orders} max={maxOrders} format={(value) => number(value)} />
        <BarChart title="Clientes" reports={reports} value={(item) => item.metrics.clients} max={maxClients} format={(value) => number(value)} />
      </div>

      {audience !== "all" && (
        <p className="rounded-2xl bg-[#eef7ff] p-3 text-xs font-bold leading-5 text-[#174a68]">
          No comparativo por público, pedidos, clientes, receitas, pagamentos e itens são segmentados. Despesas permanecem integrais por evento porque hoje não possuem vínculo com um cliente específico.
        </p>
      )}

      <ComparisonMetricsTable reports={reports} />
      <GroupComparisonTable title="Formas de pagamento" reports={reports} getRows={(item) => item.byPayment} />
      <GroupComparisonTable title="Bazar x alimentos e bebidas" reports={reports} getRows={(item) => item.byKind} />
      <GroupComparisonTable title="Itens de alimentação" reports={reports} getRows={(item) => item.byItem} limit={12} />
      <GroupComparisonTable title="Despesas por categoria" reports={reports} getRows={(item) => item.byExpense} />
      <CategoryComparisonTable reports={reports} />

      {reports.some((item) => item.audienceCounts.unknown > 0) && (
        <p className="rounded-2xl bg-[#fff8dd] p-3 text-xs font-bold leading-5 text-[#7a5a00]">
          Bazares anteriores podem ter clientes ainda não classificados como Filho/Não Filho. Eles permanecem em “Todos” e não são inferidos retroativamente.
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
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-4 space-y-3">
        {reports.map((report) => {
          const current = value(report);
          const width = Math.max(2, (current / max) * 100);
          return (
            <div key={report.event.id}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <strong>{eventDate(report.event.event_date)}</strong>
                <span className="font-black text-[#064b2c]">{format(current)}</span>
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
  const rows = [
    ["Total vendido", (item: Report) => brl(item.totals.sold)],
    ["Total pago", (item: Report) => brl(item.totals.paid)],
    ["Pendente", (item: Report) => brl(item.totals.pending)],
    ["Cancelado", (item: Report) => brl(item.totals.canceled)],
    ["Despesas", (item: Report) => brl(item.totals.expenses)],
    ["Resultado", (item: Report) => brl(item.totals.result)],
    ["Pedidos", (item: Report) => String(item.metrics.orders)],
    ["Clientes", (item: Report) => String(item.metrics.clients)],
    ["Itens", (item: Report) => number(item.metrics.itemQuantity)],
    ["Ticket médio", (item: Report) => brl(item.metrics.averageTicket)],
    ["Pagamentos pendentes", (item: Report) => String(item.pendingPayments.length)],
  ] as Array<[string, (report: Report) => string]>;

  return (
    <section className="overflow-x-auto rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <h3 className="text-lg font-black">Indicadores gerais</h3>
      <table className="mt-3 w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Indicador</th>
            {reports.map((report) => <th key={report.event.id} className="p-2">{eventDate(report.event.event_date)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, getter]) => (
            <tr key={label} className="border-b">
              <td className="p-2 font-bold">{label}</td>
              {reports.map((report) => <td key={report.event.id} className="p-2">{getter(report)}</td>)}
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
}: {
  title: string;
  reports: Report[];
  getRows: (report: Report) => Group[];
  limit?: number;
}) {
  const labels = useMemo(() => {
    const totals = new Map<string, number>();
    for (const report of reports) {
      for (const row of getRows(report)) totals.set(row.label, (totals.get(row.label) || 0) + row.total);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label]) => label);
  }, [getRows, limit, reports]);

  return (
    <section className="overflow-x-auto rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <h3 className="text-lg font-black">{title}</h3>
      <table className="mt-3 w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Descrição</th>
            {reports.map((report) => <th key={report.event.id} className="p-2">{eventDate(report.event.event_date)}</th>)}
          </tr>
        </thead>
        <tbody>
          {labels.length === 0 && <tr><td colSpan={reports.length + 1} className="p-3 text-[#496451]">Sem dados para comparar.</td></tr>}
          {labels.map((label) => (
            <tr key={label} className="border-b">
              <td className="p-2 font-bold">{label}</td>
              {reports.map((report) => {
                const row = getRows(report).find((item) => item.label === label);
                return <td key={report.event.id} className="p-2">{row ? `${number(row.quantity)} • ${brl(row.total)}` : "—"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CategoryComparisonTable({ reports }: { reports: Report[] }) {
  const labels = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((report) => report.byCategorySummary.forEach((row) => {
      if (row.label !== "Total do evento") set.add(row.label);
    }));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [reports]);

  return (
    <section className="overflow-x-auto rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df]">
      <h3 className="text-lg font-black">Categorias / resumo</h3>
      <table className="mt-3 w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Categoria</th>
            {reports.map((report) => <th key={report.event.id} className="p-2">{eventDate(report.event.event_date)} — receita / resultado</th>)}
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <tr key={label} className="border-b">
              <td className="p-2 font-bold">{label}</td>
              {reports.map((report) => {
                const row = report.byCategorySummary.find((item) => item.label === label);
                return <td key={report.event.id} className="p-2">{row ? `${brl(row.revenue)} / ${brl(row.result)}` : "—"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportTable({ title, rows, emptyText = "Nenhum registro encontrado." }: { title: string; rows: Group[]; emptyText?: string }) {
  return (
    <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm print:break-inside-avoid sm:p-5">
      <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead><tr className="border-b"><th className="p-3">Descrição</th><th className="p-3">Quantidade</th><th className="p-3">Total</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-3 text-[#496451]" colSpan={3}>{emptyText}</td></tr>}
            {rows.map((row) => <tr key={row.label} className="border-b"><td className="p-3">{row.label}</td><td className="p-3">{row.quantity}</td><td className="p-3 font-bold">{brl(row.total)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CategorySummaryTable({ rows }: { rows: CategorySummary[] }) {
  return (
    <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm print:break-inside-avoid sm:p-5">
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
                <td className="p-3">{row.quantity}</td>
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
    <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm print:break-inside-avoid sm:p-5">
      <h2 className="text-xl font-black sm:text-2xl">4. Pagamentos pendentes</h2>
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
