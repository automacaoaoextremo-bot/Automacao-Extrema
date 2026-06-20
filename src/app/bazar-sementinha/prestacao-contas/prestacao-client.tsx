"use client";

import { useEffect, useState } from "react";

type Group = { label: string; quantity: number; total: number };
type Expense = { id: string; category: string; description: string; amount: number; status: string; notes?: string | null };
type Report = { event: { name: string }; totals: { sold: number; paid: number; pending: number; canceled: number; expenses: number; result: number }; byPayment: Group[]; byKind: Group[]; byItem: Group[]; byExpense: Group[]; expenses: Expense[] };

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function PrestacaoClient() {
  const [report, setReport] = useState<Report | null>(null);
  const [expense, setExpense] = useState({ category: "Geral", description: "", amount: "", notes: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/bazar-sementinha/report", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao carregar relatório.");
    setReport(data);
  }

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

  async function addExpense() {
    setMessage("");
    const res = await fetch("/api/bazar-sementinha/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expense) });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Para incluir despesas, entre na Gestão primeiro.");
      return;
    }
    setExpense({ category: "Geral", description: "", amount: "", notes: "" });
    setMessage("Despesa incluída.");
    await load();
  }

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
      ["Item", "Quantidade", "Total"],
      ...report.byItem.map((item) => [item.label, item.quantity, item.total]),
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
    return <main className="min-h-screen bg-[#f9f7ef] px-4 py-10 text-[#214527]"><div className="mx-auto max-w-6xl rounded-3xl bg-white p-5">Carregando relatório... {message}</div></main>;
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
    <main className="min-h-screen bg-[#f9f7ef] px-4 py-6 text-[#214527] print:bg-white">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm print:shadow-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Relatório final do evento</p>
              <h1 className="mt-2 text-3xl font-black">{report.event.name}</h1>
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
              <strong className="mt-2 block text-3xl text-[#064b2c]">{brl(value)}</strong>
            </div>
          ))}
        </section>

        <ReportTable title="1. Totais por forma de pagamento" rows={report.byPayment} />
        <ReportTable title="2. Totais por categoria/resumo" rows={report.byKind} />
        <ReportTable title="3. Itens vendidos por item" rows={report.byItem} />
        <ReportTable title="4. Despesas por categoria" rows={report.byExpense} />

        <section className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm print:break-inside-avoid">
          <h2 className="text-2xl font-black">5. Incluir despesas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4 print:hidden">
            <input value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} placeholder="Categoria" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
            <input value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} placeholder="Descrição" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
            <input value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} placeholder="Valor" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
            <button onClick={addExpense} className="rounded-2xl bg-[#2f7d45] px-4 py-3 font-black text-white">Incluir</button>
          </div>
          {message && <p className="mt-3 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold print:hidden">{message}</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr className="border-b"><th className="p-3">Categoria</th><th className="p-3">Descrição</th><th className="p-3">Status</th><th className="p-3">Valor</th></tr></thead>
              <tbody>{report.expenses.map((item) => <tr key={item.id} className="border-b"><td className="p-3">{item.category}</td><td className="p-3">{item.description}</td><td className="p-3">{item.status}</td><td className="p-3 font-bold">{brl(Number(item.amount))}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function ReportTable({ title, rows }: { title: string; rows: Group[] }) {
  return (
    <section className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm print:break-inside-avoid">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead><tr className="border-b"><th className="p-3">Descrição</th><th className="p-3">Quantidade</th><th className="p-3">Total</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.label} className="border-b"><td className="p-3">{row.label}</td><td className="p-3">{row.quantity}</td><td className="p-3 font-bold">{brl(row.total)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
