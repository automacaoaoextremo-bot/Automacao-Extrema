"use client";

import { useEffect, useState } from "react";

type Group = { label: string; quantity: number; total: number };
type CategorySummary = { label: string; quantity: number; revenue: number; expenses: number; result: number; resultPercent: number | null };
type PendingPayment = { id: string; clientName: string; code: string; createdAt: string; items: string; total: number };
type Expense = { id: string; category: string; description: string; amount: number; status: string; notes?: string | null };
type Report = {
  event: { name: string };
  totals: { sold: number; paid: number; pending: number; canceled: number; expenses: number; result: number };
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

export function PrestacaoClient() {
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    fetch("/api/bazar-sementinha/report", { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ignore) return;
        if (!ok) throw new Error(data.error || "Erro ao carregar relatório.");
        setReport(data);
      })
      .catch((error) => {
        if (!ignore) setMessage(error instanceof Error ? error.message : "Erro ao carregar relatório.");
      });
    return () => {
      ignore = true;
    };
  }, []);

  function exportCsv() {
    if (!report) return;
    const rows = [
      ["Indicador", "Total"],
      ["Total vendido", report.totals.sold],
      ["Total pago", report.totals.paid],
      ["Total pendente", report.totals.pending],
      ["Cancelado", report.totals.canceled],
      ["Despesas", report.totals.expenses],
      ["Resultado", report.totals.result],
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
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prestacao-contas-bazar-sementinha.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!report) {
    return <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] px-3 py-8 text-[15px] text-[#214527] sm:px-4 sm:py-10 sm:text-base"><div className="mx-auto w-full max-w-6xl rounded-3xl bg-white p-4 sm:p-5">Carregando relatório... {message}</div></main>;
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.18em]">Relatório final do evento</p>
              <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{report.event.name}</h1>
              <p className="mt-2 text-sm text-[#496451]">Use “Imprimir / salvar em PDF” para gerar o PDF completo.</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button onClick={exportCsv} className="rounded-full border border-[#2f7d45]/20 px-4 py-2 text-sm font-black text-[#2f7d45]">Exportar planilha</button>
              <button onClick={() => window.print()} className="rounded-full bg-[#2f7d45] px-4 py-2 text-sm font-black text-white">Gerar PDF</button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
              <span className="text-sm font-bold text-[#496451]">{label}</span>
              <strong className="mt-2 block text-2xl text-[#064b2c] sm:text-3xl">{brl(value)}</strong>
            </div>
          ))}
        </section>

        <ReportTable title="1. Totais por forma de pagamento" rows={report.byPayment} />
        <CategorySummaryTable rows={report.byCategorySummary} />
        <ReportTable title="3. Itens vendidos do cardápio de alimentação" rows={report.byItem} emptyText="Nenhum item de alimentação registrado." />
        <PendingPaymentsTable rows={report.pendingPayments} />
        <ReportTable title="5. Despesas por categoria" rows={report.byExpense} />

        <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm print:break-inside-avoid sm:p-5">
          <h2 className="text-xl font-black sm:text-2xl">6. Despesas registradas</h2>
          <p className="mt-2 text-sm leading-6 text-[#496451] print:hidden">A inclusão e manutenção de despesas ficam somente na área de Gestão, evitando alteração indevida na prestação pública.</p>
          {message && <p className="mt-3 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold print:hidden">{message}</p>}
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
