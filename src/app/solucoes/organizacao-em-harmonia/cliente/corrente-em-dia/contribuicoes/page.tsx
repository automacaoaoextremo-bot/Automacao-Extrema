"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = { id: string; full_name: string };
type Contribution = {
  id: string;
  person_id: string | null;
  contributor_name: string | null;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
  proof_url: string | null;
  notes: string | null;
};
type Payload = { people?: Person[]; contributions?: Contribution[]; error?: string };

const statusLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  comprovante_enviado: "Comprovante enviado",
  confirmado: "Confirmado",
  pago: "Pago",
  atrasado: "Em atraso",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function CorrenteContribuicoesPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [personFilter, setPersonFilter] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/organizacao-em-harmonia/cliente/corrente-em-dia", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar contribuições.");
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar contribuições."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const peopleMap = useMemo(() => new Map((payload.people ?? []).map((person) => [person.id, person.full_name])), [payload.people]);
  const filtered = useMemo(() => {
    return (payload.contributions ?? []).filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (personFilter && item.person_id !== personFilter) return false;
      return true;
    });
  }, [payload.contributions, personFilter, statusFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, item) => {
        const amount = Number(item.amount) || 0;
        acc.total += amount;
        if (["confirmado", "pago"].includes(item.status)) acc.received += amount;
        else acc.pending += amount;
        return acc;
      },
      { total: 0, received: 0, pending: 0 },
    );
  }, [filtered]);

  async function updateStatus(id: string, status: string) {
    setError("");
    setMessage("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/organizacao-em-harmonia/cliente/corrente-em-dia", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateContributionStatus", contributionId: id, status }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar.");
      setMessage(result.message || "Contribuição atualizada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar contribuição.");
    }
  }

  return (
    <OrganizacaoClientShell title="Contribuições" description="Acompanhe histórico, pendências, comprovantes e conferência da tesouraria.">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-sm font-black text-[#2F6B43]">Total filtrado</p><p className="mt-2 text-3xl font-black text-[#00334E]">{formatCurrency(totals.total)}</p></article>
        <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-sm font-black text-[#2F6B43]">Recebido</p><p className="mt-2 text-3xl font-black text-emerald-700">{formatCurrency(totals.received)}</p></article>
        <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-sm font-black text-[#2F6B43]">Pendente</p><p className="mt-2 text-3xl font-black text-amber-700">{formatCurrency(totals.pending)}</p></article>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <div className="grid gap-3 md:grid-cols-3">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold">
            <option value="">Todos status</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={personFilter} onChange={(event) => setPersonFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold">
            <option value="">Todos envolvidos</option>
            {(payload.people ?? []).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
          </select>
          <button type="button" onClick={() => window.print()} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white">Imprimir</button>
        </div>

        {loading && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Carregando...</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead><tr className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]"><th className="px-3 py-3">Pessoa</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3">Vencimento</th><th className="px-3 py-3">Forma</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 font-black text-[#00334E]">{peopleMap.get(item.person_id ?? "") ?? item.contributor_name ?? "Contribuinte"}</td>
                  <td className="px-3 py-3 font-semibold">{formatCurrency(Number(item.amount))}</td>
                  <td className="px-3 py-3 font-semibold">{item.due_date}</td>
                  <td className="px-3 py-3 font-semibold">{item.payment_method || "-"}</td>
                  <td className="px-3 py-3"><span className="rounded-full bg-[#E9F2E7] px-3 py-1 text-xs font-black text-[#123D2C]">{statusLabels[item.status] ?? item.status}</span></td>
                  <td className="px-3 py-3"><button type="button" onClick={() => updateStatus(item.id, "confirmado")} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Confirmar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhuma contribuição encontrada.</p>}
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}
