"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = { id: string; full_name: string };

type Contribution = {
  id: string;
  person_id: string | null;
  contributor_name: string | null;
  contributor_email: string | null;
  contributor_whatsapp: string | null;
  amount: number | string;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
  proof_url: string | null;
  receipt_uploaded_at: string | null;
  notes: string | null;
  contribution_kind: string | null;
  is_anonymous: boolean;
  recurrence_type: string | null;
  preferred_due_day: number | null;
  recurrence_start_date: string | null;
  recurrence_occurrences: number | null;
  public_identification_mode: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type Payload = {
  canManage?: boolean;
  people?: Person[];
  contributions?: Contribution[];
  error?: string;
};

const PENDING_STATUSES = ["aguardando_comprovante", "comprovante_enviado", "em_revisao"];

const statusLabels: Record<string, string> = {
  intencao_registrada: "Intenção registrada",
  aguardando_pagamento: "Aguardando pagamento",
  aguardando_comprovante: "Aguardando comprovante",
  aguardando_recepcao: "Aguardando pagamento na Recepção",
  comprovante_enviado: "Comprovante enviado",
  em_revisao: "Pendente confirmação",
  confirmado: "Confirmado",
  aprovado: "Aprovado",
  pago: "Pago",
  atrasado: "Em atraso",
  cancelado: "Cancelado",
};

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  recepcao: "Cartão de Crédito, Débito ou Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  dinheiro: "Dinheiro",
};

function money(value: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function asDates(item: Contribution) {
  const raw = item.metadata?.scheduledDates;
  if (Array.isArray(raw)) {
    const values = raw.filter((value): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value));
    if (values.length > 0) return values.sort();
  }
  return [item.due_date].filter(Boolean);
}

function stage(status: string) {
  if (["confirmado", "aprovado", "pago"].includes(status)) return "confirmed";
  if (status === "em_revisao") return "pendingConfirmation";
  if (status === "comprovante_enviado") return "proofSent";
  if (["intencao_registrada", "aguardando_pagamento", "aguardando_comprovante", "aguardando_recepcao"].includes(status)) return "intent";
  return "other";
}

export default function CorrenteContribuicoesPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("pendencias");
  const [typeFilter, setTypeFilter] = useState("");
  const [query, setQuery] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch("/api/organizacao-em-harmonia/cliente/corrente-em-dia", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      cache: "no-store",
    });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar as contribuições.");
    setPayload(result);
  }, [token]);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) setError(reason instanceof Error ? reason.message : "Erro ao carregar contribuições.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [load]);

  const peopleMap = useMemo(
    () => new Map((payload.people ?? []).map((person) => [person.id, person.full_name])),
    [payload.people],
  );

  const ordered = useMemo(
    () => [...(payload.contributions ?? [])].sort((left, right) => left.due_date.localeCompare(right.due_date)),
    [payload.contributions],
  );

  const summary = useMemo(
    () => ordered.reduce(
      (acc, item) => {
        const itemStage = stage(item.status);
        if (itemStage === "intent") acc.intent += 1;
        if (itemStage === "proofSent") acc.proofSent += 1;
        if (itemStage === "pendingConfirmation") acc.pendingConfirmation += 1;
        if (itemStage === "confirmed") acc.confirmed += 1;
        return acc;
      },
      { intent: 0, proofSent: 0, pendingConfirmation: 0, confirmed: 0 },
    ),
    [ordered],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return ordered.filter((item) => {
      if (statusFilter === "pendencias" && !PENDING_STATUSES.includes(item.status)) return false;
      if (statusFilter && statusFilter !== "pendencias" && item.status !== statusFilter) return false;
      const type = item.contribution_kind || (item.recurrence_type && item.recurrence_type !== "pontual" ? "recorrente" : "pontual");
      if (typeFilter && type !== typeFilter) return false;
      if (normalizedQuery) {
        const personName = peopleMap.get(item.person_id ?? "") || item.contributor_name || (item.is_anonymous ? "não identificada" : "contribuinte");
        const haystack = normalize([personName, item.contributor_email, item.contributor_whatsapp, item.payment_method, item.notes].filter(Boolean).join(" "));
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [ordered, peopleMap, query, statusFilter, typeFilter]);

  async function postAction(body: Record<string, unknown>) {
    const accessToken = await token();
    const response = await fetch("/api/organizacao-em-harmonia/cliente/corrente-em-dia", {
      method: "POST",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível atualizar.");
    return result;
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    setError("");
    setMessage("");
    try {
      const result = await postAction({ action: "updateContributionStatus", contributionId: id, status });
      setMessage(result.message || "Contribuição atualizada.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao atualizar contribuição.");
    } finally {
      setUpdatingId("");
    }
  }

  async function cancelContribution(id: string) {
    if (!window.confirm("Excluir esta contribuição/programação ainda não validada?")) return;
    setUpdatingId(id);
    setError("");
    setMessage("");
    try {
      const result = await postAction({ action: "cancelContribution", contributionId: id });
      setMessage(result.message || "Contribuição excluída.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao excluir contribuição.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <OrganizacaoClientShell title="Acompanhamento de Contribuições" simpleFinancialHeader>
      <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {[
          ["Intenção Registrada", summary.intent],
          ["Comprovante enviado", summary.proofSent],
          ["Pendente Confirmação", summary.pendingConfirmation],
          ["Confirmado", summary.confirmed],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl bg-white p-3 shadow ring-1 ring-slate-100 sm:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-xs">{String(label)}</p>
            <p className="mt-1 text-2xl font-black text-[#123D2C]">{Number(value)}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-slate-100 sm:p-5">
        <div className="grid gap-2 md:grid-cols-4">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-2.5 font-semibold md:col-span-2" placeholder="Buscar por nome, WhatsApp ou e-mail" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-2.5 font-semibold">
            <option value="pendencias">Pendências de comprovante/confirmação</option>
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-2.5 font-semibold">
            <option value="">Pontual e recorrente</option>
            <option value="pontual">Pontual</option>
            <option value="recorrente">Recorrente</option>
          </select>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setQuery(""); setStatusFilter("pendencias"); setTypeFilter(""); }} className="rounded-full bg-[#E9F2E7] px-4 py-2 text-sm font-black text-[#123D2C]">Restaurar pendências</button>
          <button type="button" onClick={() => window.print()} className="rounded-full bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Imprimir</button>
        </div>

        {loading && <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">Carregando...</p>}
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
        {message && <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">{message}</p>}

        <div className="mt-4 grid gap-3">
          {filtered.map((item) => {
            const personName = peopleMap.get(item.person_id ?? "") || item.contributor_name || (item.is_anonymous ? "Contribuição não identificada" : "Contribuinte");
            const dates = asDates(item);
            const recurring = dates.length > 1 || item.recurrence_type === "pix_agendado";
            const finalized = ["confirmado", "aprovado", "pago", "cancelado"].includes(item.status);
            return (
              <article key={item.id} className="rounded-[1.35rem] bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-xs">{recurring ? "Programação recorrente" : "Contribuição pontual"}</span>
                      <span className="rounded-full bg-[#E9F2E7] px-2.5 py-1 text-[10px] font-black text-[#123D2C] sm:text-xs">{statusLabels[item.status] || item.status}</span>
                    </div>
                    <h2 className="mt-2 text-base font-black text-[#00334E] sm:text-lg">{personName}</h2>
                    {!item.is_anonymous && <p className="mt-0.5 break-words text-xs text-slate-600 sm:text-sm">{[item.contributor_whatsapp, item.contributor_email].filter(Boolean).join(" · ") || "Sem contato informado"}</p>}
                  </div>
                  <p className="text-xl font-black text-[#123D2C] sm:text-2xl">{money(item.amount)}</p>
                </div>

                <div className="mt-3 rounded-xl bg-white p-3 text-sm ring-1 ring-[#123D2C]/10">
                  <p className="font-black text-[#2F6B43]">{recurring ? "Datas desta programação" : "Data prevista"}</p>
                  <p className="mt-1 font-semibold text-slate-700">{dates.map(date).join(" · ")}</p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 sm:text-sm">
                  <div><p className="font-black text-[#2F6B43]">Forma</p><p className="mt-0.5 font-semibold text-slate-700">{paymentLabels[item.payment_method ?? ""] || item.payment_method || "Não informada"}</p></div>
                  <div><p className="font-black text-[#2F6B43]">Comprovante</p><p className="mt-0.5 font-semibold text-slate-700">{item.receipt_uploaded_at || item.proof_url ? "Enviado" : "Pendente"}</p></div>
                  <div><p className="font-black text-[#2F6B43]">Tipo</p><p className="mt-0.5 font-semibold text-slate-700">{recurring ? "Recorrente" : "Pontual"}</p></div>
                  <div><p className="font-black text-[#2F6B43]">Status</p><p className="mt-0.5 font-semibold text-slate-700">{statusLabels[item.status] || item.status}</p></div>
                </div>

                {item.notes && <p className="mt-2 rounded-xl bg-white p-3 text-sm leading-5 text-slate-600">{item.notes}</p>}

                {payload.canManage && !finalized && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.status === "comprovante_enviado" || item.status === "em_revisao") && (
                      <button type="button" disabled={updatingId === item.id} onClick={() => updateStatus(item.id, "confirmado")} className="rounded-xl bg-[#123D2C] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">Confirmar</button>
                    )}
                    {item.status === "comprovante_enviado" && (
                      <button type="button" disabled={updatingId === item.id} onClick={() => updateStatus(item.id, "em_revisao")} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-60">Marcar em revisão</button>
                    )}
                    <button type="button" disabled={updatingId === item.id} onClick={() => void cancelContribution(item.id)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-red-700 ring-1 ring-red-200 disabled:opacity-60">Excluir</button>
                  </div>
                )}
              </article>
            );
          })}

          {!loading && filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhuma contribuição encontrada para os filtros selecionados.</p>}
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}
