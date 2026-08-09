"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Category = {
  id: string;
  entry_type: "receita" | "despesa";
  name: string;
  public_name: string | null;
  group_name: string;
};

type Entry = {
  id: string;
  category_id: string | null;
  entry_type: "receita" | "despesa";
  entry_date: string;
  due_date: string | null;
  financial_date: string | null;
  financial_month: string | null;
  competence_month: string;
  description_internal: string;
  description_public: string | null;
  amount: number | string;
  payment_method: string | null;
  financial_account: string | null;
  counterparty_name: string | null;
  status: string;
  workflow_status: string;
  data_nature: "realizado" | "estimado";
  is_provisional: boolean;
  needs_update: boolean;
  public_visible: boolean;
  notes_internal: string | null;
};

type Period = {
  id: string;
  competence_month: string;
  status: string;
  workflow_status: string;
  data_nature: string;
  needs_update: boolean;
  source_label: string | null;
  finalized_at: string | null;
  updated_at: string | null;
};

type Payload = {
  entries?: Entry[];
  categories?: Category[];
  period?: Period | null;
  canManage?: boolean;
  error?: string;
};

type Draft = {
  id: string;
  entryType: "receita" | "despesa";
  categoryId: string;
  description: string;
  amount: string;
  paymentMethod: string;
  financialAccount: string;
  counterpartyName: string;
  publicVisible: boolean;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function money(value: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`));
}

function toDraft(entry: Entry): Draft {
  return {
    id: entry.id,
    entryType: entry.entry_type,
    categoryId: entry.category_id ?? "",
    description: entry.description_internal,
    amount: String(Number(entry.amount) || ""),
    paymentMethod: entry.payment_method ?? "",
    financialAccount: entry.financial_account ?? "",
    counterpartyName: entry.counterparty_name ?? "",
    publicVisible: entry.public_visible,
  };
}

function newDraft(type: "receita" | "despesa"): Draft {
  return {
    id: "",
    entryType: type,
    categoryId: "",
    description: "",
    amount: "",
    paymentMethod: "pix",
    financialAccount: "",
    counterpartyName: "",
    publicVisible: true,
  };
}

export default function LancamentosPage() {
  const [month, setMonth] = useState(currentMonth());
  const [payload, setPayload] = useState<Payload>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newRows, setNewRows] = useState<Record<string, Draft | null>>({ receita: null, despesa: null });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ receita: true, despesa: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const accessToken = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async (targetMonth: string) => {
    const token = await accessToken();
    const response = await fetch(
      `/api/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos?financialMonth=${targetMonth}-01`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar o mês financeiro.");
    setPayload(result);
    setDrafts(Object.fromEntries((result.entries ?? []).map((entry) => [entry.id, toDraft(entry)])));
    setNewRows({ receita: null, despesa: null });
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void load(month)
        .catch((reason) => {
          if (active) setError(reason instanceof Error ? reason.message : "Erro ao carregar o mês.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load, month]);

  const entries = useMemo(() => payload.entries ?? [], [payload.entries]);
  const finalized = payload.period?.workflow_status === "finalizado";
  const hasSavedMonth = Boolean(payload.period || entries.length > 0);
  const totals = useMemo(
    () => entries.reduce(
      (acc, entry) => {
        if (entry.entry_type === "receita") acc.receita += Number(entry.amount) || 0;
        if (entry.entry_type === "despesa") acc.despesa += Number(entry.amount) || 0;
        return acc;
      },
      { receita: 0, despesa: 0 },
    ),
    [entries],
  );

  const categoriesByType = useMemo(
    () => ({
      receita: (payload.categories ?? []).filter((category) => category.entry_type === "receita"),
      despesa: (payload.categories ?? []).filter((category) => category.entry_type === "despesa"),
    }),
    [payload.categories],
  );

  async function post(body: Record<string, unknown>) {
    const token = await accessToken();
    const response = await fetch("/api/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos", {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
    return result;
  }

  async function replicate(mode: "last" | "average") {
    const label = mode === "last" ? "último mês" : "média dos últimos meses";
    if (!window.confirm(`Replicar ${label} para ${monthLabel(month)}?`)) return;
    setBusy(`replicate:${mode}`);
    setError("");
    setMessage("");
    try {
      const result = await post({ action: "replicateMonth", targetMonth: `${month}-01`, mode });
      setMessage(result.message || "Dados replicados. Revise antes de finalizar.");
      await load(month);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao replicar mês.");
    } finally {
      setBusy("");
    }
  }

  async function saveDraft(key: string, draft: Draft, isNew: boolean) {
    if (!draft.description.trim()) {
      setError("Informe a descrição do lançamento.");
      return;
    }
    if (!(Number(draft.amount) > 0)) {
      setError("Informe um valor maior que zero.");
      return;
    }

    setBusy(`save:${key}`);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "save",
        id: draft.id || null,
        entryType: draft.entryType,
        entryDate: `${month}-01`,
        dueDate: `${month}-01`,
        financialDate: `${month}-01`,
        financialMonth: `${month}-01`,
        competenceMonth: `${month}-01`,
        categoryId: draft.categoryId || null,
        descriptionInternal: draft.description.trim(),
        descriptionPublic: draft.description.trim(),
        amount: Number(draft.amount),
        paymentMethod: draft.paymentMethod || null,
        financialAccount: draft.financialAccount || null,
        counterpartyName: draft.counterpartyName || null,
        workflowStatus: "em_andamento",
        dataNature: "realizado",
        needsUpdate: false,
        publicVisible: draft.publicVisible,
      });
      setMessage(result.message || "Lançamento salvo.");
      if (isNew) setNewRows((current) => ({ ...current, [draft.entryType]: null }));
      await load(month);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao salvar lançamento.");
    } finally {
      setBusy("");
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Excluir este lançamento do mês?")) return;
    setBusy(`delete:${id}`);
    setError("");
    try {
      const result = await post({ action: "delete", id });
      setMessage(result.message || "Lançamento excluído.");
      await load(month);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao excluir lançamento.");
    } finally {
      setBusy("");
    }
  }

  async function finalize() {
    if (!window.confirm(`Finalizar ${monthLabel(month)}? Depois disso o mês ficará fechado para edição normal.`)) return;
    setBusy("finalize");
    setError("");
    setMessage("");
    try {
      const result = await post({ action: "finalizeMonth", targetMonth: `${month}-01` });
      setMessage(result.message || "Mês finalizado.");
      await load(month);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao finalizar mês.");
    } finally {
      setBusy("");
    }
  }

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }

  function updateNew(type: "receita" | "despesa", patch: Partial<Draft>) {
    setNewRows((current) => ({
      ...current,
      [type]: { ...(current[type] ?? newDraft(type)), ...patch },
    }));
  }

  function renderEditor(key: string, draft: Draft, isNew: boolean) {
    const update = (patch: Partial<Draft>) => isNew ? updateNew(draft.entryType, patch) : updateDraft(key, patch);
    return (
      <div key={key} className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10 sm:grid-cols-6">
        <input value={draft.description} onChange={(event) => update({ description: event.target.value })} disabled={finalized} placeholder="Descrição" className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100" />
        <select value={draft.categoryId} onChange={(event) => update({ categoryId: event.target.value })} disabled={finalized} className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100">
          <option value="">Categoria</option>
          {categoriesByType[draft.entryType].map((category) => <option key={category.id} value={category.id}>{category.public_name || category.name}</option>)}
        </select>
        <input value={draft.amount} onChange={(event) => update({ amount: event.target.value })} disabled={finalized} inputMode="decimal" placeholder="Valor" className="rounded-xl border border-slate-200 p-2.5 font-semibold disabled:bg-slate-100" />
        <div className="flex gap-1.5">
          <button type="button" disabled={finalized || busy === `save:${key}`} onClick={() => void saveDraft(key, draft, isNew)} className="flex-1 rounded-xl bg-[#123D2C] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40">{busy === `save:${key}` ? "Salvando" : "Salvar"}</button>
          {!isNew && <button type="button" disabled={finalized || busy === `delete:${draft.id}`} onClick={() => void deleteEntry(draft.id)} className="rounded-xl bg-white px-3 py-2.5 text-xs font-black text-red-700 ring-1 ring-red-200 disabled:opacity-40">Excluir</button>}
        </div>
      </div>
    );
  }

  return (
    <OrganizacaoClientShell title="Registro de Receitas e Despesas" simpleFinancialHeader>
      <section className="rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-slate-100 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1 text-sm font-black text-[#123D2C]">
            Mês a registrar
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value || currentMonth())} className="rounded-xl border border-slate-200 p-2.5 font-semibold" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={finalized || busy !== "" || entries.length > 0} onClick={() => void replicate("last")} className="rounded-xl bg-[#E9F2E7] px-3 py-2.5 text-xs font-black text-[#123D2C] disabled:opacity-40 sm:text-sm">Replicar último mês</button>
            <button type="button" disabled={finalized || busy !== "" || entries.length > 0} onClick={() => void replicate("average")} className="rounded-xl bg-[#E9F2E7] px-3 py-2.5 text-xs font-black text-[#123D2C] disabled:opacity-40 sm:text-sm">Replicar média</button>
          </div>
        </div>

        {loading && <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">Carregando...</p>}
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
        {message && <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">{message}</p>}

        {!loading && hasSavedMonth && !finalized && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-black text-amber-900 ring-1 ring-amber-200">⚠ {monthLabel(month)} possui informações salvas e ainda precisa ser finalizado.</p>
        )}
        {!loading && finalized && (
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-200">✓ {monthLabel(month)} está finalizado.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-[1.5rem] bg-white shadow ring-1 ring-slate-100">
        <div className="grid grid-cols-[1fr_auto] bg-[#123D2C] px-4 py-3 font-black text-white">
          <span>Prestação de contas por mês</span>
          <span>{monthLabel(month)}</span>
        </div>

        {(["receita", "despesa"] as const).map((type) => {
          const label = type === "receita" ? "Receitas" : "Despesas";
          const typeEntries = entries.filter((entry) => entry.entry_type === type);
          const total = type === "receita" ? totals.receita : totals.despesa;
          return (
            <div key={type} className="border-t border-[#123D2C]/10 first:border-t-0">
              <button type="button" onClick={() => setExpanded((current) => ({ ...current, [type]: !current[type] }))} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 bg-[#F7FAF2] px-4 py-3 text-left">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">{expanded[type] ? "−" : "+"}</span>
                <span className="font-black text-[#123D2C]">{label}</span>
                <span className="font-black text-[#123D2C]">{money(total)}</span>
              </button>

              {expanded[type] && (
                <div className="grid gap-2 p-3 sm:p-4">
                  {typeEntries.map((entry) => drafts[entry.id] ? renderEditor(entry.id, drafts[entry.id], false) : null)}
                  {typeEntries.length === 0 && !newRows[type] && <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhum lançamento neste grupo.</p>}
                  {newRows[type] && renderEditor(`new:${type}`, newRows[type] as Draft, true)}
                  {!finalized && !newRows[type] && (
                    <button type="button" onClick={() => setNewRows((current) => ({ ...current, [type]: newDraft(type) }))} className="rounded-xl border-2 border-dashed border-[#123D2C]/25 bg-white px-4 py-3 text-sm font-black text-[#123D2C]">+ Incluir nova {type === "receita" ? "receita" : "despesa"}</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {!finalized && hasSavedMonth && (
        <button type="button" disabled={busy === "finalize" || loading} onClick={() => void finalize()} className="w-full rounded-2xl bg-[#123D2C] px-5 py-3.5 text-base font-black text-white shadow disabled:opacity-50">{busy === "finalize" ? "Finalizando..." : "Finalizar mês"}</button>
      )}
    </OrganizacaoClientShell>
  );
}
