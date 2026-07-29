"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  competence_month: string;
  description_internal: string;
  description_public: string | null;
  amount: number;
  payment_method: string | null;
  financial_account: string | null;
  counterparty_name: string | null;
  status: string;
  is_provisional: boolean;
  needs_update: boolean;
  public_visible: boolean;
  notes_internal: string | null;
  category: Category | Category[] | null;
};

type Payload = {
  entries?: Entry[];
  categories?: Category[];
  canManage?: boolean;
  error?: string;
};

type FormState = {
  id: string;
  entryType: "receita" | "despesa";
  entryDate: string;
  competenceMonth: string;
  categoryId: string;
  descriptionInternal: string;
  descriptionPublic: string;
  amount: string;
  paymentMethod: string;
  financialAccount: string;
  counterpartyName: string;
  status: string;
  isProvisional: boolean;
  needsUpdate: boolean;
  publicVisible: boolean;
  notesInternal: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthOf(date: string) {
  return `${date.slice(0, 7)}-01`;
}

const emptyForm: FormState = {
  id: "",
  entryType: "despesa",
  entryDate: today(),
  competenceMonth: monthOf(today()),
  categoryId: "",
  descriptionInternal: "",
  descriptionPublic: "",
  amount: "",
  paymentMethod: "pix",
  financialAccount: "",
  counterpartyName: "",
  status: "em_revisao",
  isProvisional: false,
  needsUpdate: false,
  publicVisible: true,
  notesInternal: "",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  importado: "Importado",
  provisorio: "Provisório",
  em_revisao: "Em revisão",
  confirmado: "Confirmado",
  com_divergencia: "Com divergência",
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function categoryOf(entry: Entry) {
  return Array.isArray(entry.category)
    ? entry.category[0] ?? null
    : entry.category;
}

export default function LancamentosPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const accessToken = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const token = await accessToken();
    const params = new URLSearchParams();
    if (monthFilter) params.set("month", `${monthFilter}-01`);
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (query.trim()) params.set("q", query.trim());

    const response = await fetch(
      `/api/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos?${params.toString()}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar os lançamentos.");
    }
    setPayload(result);
  }, [accessToken, monthFilter, query, statusFilter, typeFilter]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar lançamentos.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const categories = useMemo(
    () =>
      (payload.categories ?? []).filter(
        (category) => category.entry_type === form.entryType,
      ),
    [form.entryType, payload.categories],
  );

  const totals = useMemo(
    () =>
      (payload.entries ?? []).reduce(
        (acc, entry) => {
          if (entry.entry_type === "receita") acc.revenues += Number(entry.amount) || 0;
          else acc.expenses += Number(entry.amount) || 0;
          return acc;
        },
        { revenues: 0, expenses: 0 },
      ),
    [payload.entries],
  );

  function edit(entry: Entry) {
    setForm({
      id: entry.id,
      entryType: entry.entry_type,
      entryDate: entry.entry_date,
      competenceMonth: entry.competence_month,
      categoryId: entry.category_id ?? "",
      descriptionInternal: entry.description_internal,
      descriptionPublic: entry.description_public ?? "",
      amount: String(entry.amount),
      paymentMethod: entry.payment_method ?? "",
      financialAccount: entry.financial_account ?? "",
      counterpartyName: entry.counterparty_name ?? "",
      status: entry.status,
      isProvisional: entry.is_provisional,
      needsUpdate: entry.needs_update,
      publicVisible: entry.public_visible,
      notesInternal: entry.notes_internal ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm({ ...emptyForm, entryDate: today(), competenceMonth: monthOf(today()) });
    setShowForm(false);
  }

  async function post(body: Record<string, unknown>) {
    const token = await accessToken();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos",
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
    return result;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "save",
        ...form,
        amount: Number(form.amount.replace(",", ".")),
      });
      setMessage(result.message || "Lançamento salvo.");
      resetForm();
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao salvar lançamento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function approve(entry: Entry) {
    setSaving(true);
    setError("");
    try {
      const result = await post({ action: "approve", id: entry.id });
      setMessage(result.message || "Lançamento confirmado.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao aprovar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: Entry) {
    if (!window.confirm(`Remover "${entry.description_internal}" da visão ativa?`)) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await post({
        action: "delete",
        id: entry.id,
        justification: "Removido pela Tesouraria/Financeiro na interface.",
      });
      setMessage(result.message || "Lançamento removido.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao remover.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell
      title="Lançamentos financeiros"
      description="Cadastre e revise receitas e despesas. Informações individuais permanecem restritas à Tesouraria/Financeiro e à Diretoria autorizada."
    >
      {error && (
        <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          {message}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
            Receitas filtradas
          </p>
          <p className="mt-2 text-xl font-black text-[#123D2C]">
            {money(totals.revenues)}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
            Despesas filtradas
          </p>
          <p className="mt-2 text-xl font-black text-[#123D2C]">
            {money(totals.expenses)}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
            Resultado
          </p>
          <p
            className={`mt-2 text-xl font-black ${
              totals.revenues - totals.expenses < 0
                ? "text-red-700"
                : "text-[#123D2C]"
            }`}
          >
            {money(totals.revenues - totals.expenses)}
          </p>
        </article>
      </section>

      <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-5">
        <div className="grid gap-3 md:grid-cols-5">
          <input
            type="month"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 px-4"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 px-4"
          >
            <option value="">Receitas e despesas</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 px-4"
          >
            <option value="">Todas as situações</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Descrição, fornecedor ou conta"
            className="min-h-12 rounded-2xl border border-slate-200 px-4 md:col-span-2"
          />
        </div>

        {payload.canManage && (
          <button
            type="button"
            onClick={() => {
              setForm({ ...emptyForm, entryDate: today(), competenceMonth: monthOf(today()) });
              setShowForm((current) => !current);
            }}
            className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white sm:w-fit"
          >
            {showForm ? "Fechar cadastro" : "Novo lançamento"}
          </button>
        )}
      </section>

      {showForm && payload.canManage && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              {form.id ? "Editar lançamento" : "Cadastro manual"}
            </p>
            <h2 className="mt-1 text-xl font-black text-[#00334E]">
              {form.id ? "Atualize os dados e preserve o histórico." : "Registre uma receita ou despesa."}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["receita", "despesa"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    entryType: type,
                    categoryId: "",
                  }))
                }
                className={`rounded-2xl p-3 font-black ring-1 ${
                  form.entryType === type
                    ? "bg-[#123D2C] text-white ring-[#123D2C]"
                    : "bg-white text-[#123D2C] ring-[#123D2C]/15"
                }`}
              >
                {type === "receita" ? "Receita" : "Despesa"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 font-black text-[#123D2C]">
              Data
              <input
                type="date"
                value={form.entryDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    entryDate: event.target.value,
                    competenceMonth: monthOf(event.target.value),
                  }))
                }
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Competência
              <input
                type="month"
                value={form.competenceMonth.slice(0, 7)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    competenceMonth: `${event.target.value}-01`,
                  }))
                }
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Categoria
              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.group_name} · {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Valor
              <input
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                inputMode="decimal"
                placeholder="0,00"
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
              Descrição interna
              <input
                value={form.descriptionInternal}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    descriptionInternal: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
              Descrição pública
              <input
                value={form.descriptionPublic}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    descriptionPublic: event.target.value,
                  }))
                }
                placeholder="Texto sem nomes ou informações sensíveis"
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Forma de pagamento
              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paymentMethod: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 p-4"
              >
                <option value="">Não informada</option>
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
                <option value="cartao">Cartão</option>
                <option value="transferencia">Transferência</option>
                <option value="debito_conta">Débito em conta</option>
              </select>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Conta financeira
              <input
                value={form.financialAccount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    financialAccount: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
            <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
              Fornecedor ou origem
              <input
                value={form.counterpartyName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    counterpartyName: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
              <input
                type="checkbox"
                checked={form.isProvisional}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isProvisional: event.target.checked,
                    needsUpdate: event.target.checked,
                    status: event.target.checked
                      ? "provisorio"
                      : "em_revisao",
                  }))
                }
                className="mt-1 h-5 w-5"
              />
              <span className="font-black text-amber-900">Valor provisório</span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-4">
              <input
                type="checkbox"
                checked={form.publicVisible}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    publicVisible: event.target.checked,
                  }))
                }
                className="mt-1 h-5 w-5"
              />
              <span className="font-black text-[#123D2C]">
                Pode compor o painel público
              </span>
            </label>
            <label className="grid gap-2 font-black text-[#123D2C]">
              Situação
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 p-3"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 font-black text-[#123D2C]">
            Observação restrita
            <textarea
              value={form.notesInternal}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notesInternal: event.target.value,
                }))
              }
              className="min-h-24 rounded-2xl border border-slate-200 p-4 font-semibold text-slate-700"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              disabled={saving}
              className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar lançamento"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl bg-slate-100 px-5 py-4 font-black text-[#123D2C]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="grid gap-3">
        {loading && (
          <p className="rounded-2xl bg-white p-4 font-bold text-slate-500">
            Carregando lançamentos...
          </p>
        )}

        {(payload.entries ?? []).map((entry) => {
          const category = categoryOf(entry);
          return (
            <article
              key={entry.id}
              className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        entry.entry_type === "receita"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {entry.entry_type === "receita" ? "Receita" : "Despesa"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {statusLabels[entry.status] ?? entry.status}
                    </span>
                    {entry.is_provisional && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                        Precisa ser atualizado
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 break-words text-lg font-black text-[#00334E]">
                    {entry.description_internal}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {entry.entry_date} · {category?.group_name ?? "Sem grupo"} ·{" "}
                    {category?.name ?? "Sem categoria"}
                  </p>
                  {entry.counterparty_name && (
                    <p className="mt-1 text-sm text-slate-600">
                      {entry.counterparty_name}
                    </p>
                  )}
                </div>
                <p
                  className={`text-xl font-black ${
                    entry.entry_type === "receita"
                      ? "text-emerald-800"
                      : "text-amber-800"
                  }`}
                >
                  {money(Number(entry.amount))}
                </p>
              </div>

              {payload.canManage && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => edit(entry)}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-[#00334E]"
                  >
                    Editar
                  </button>
                  {entry.status !== "confirmado" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => approve(entry)}
                      className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800"
                    >
                      Confirmar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => remove(entry)}
                    className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700"
                  >
                    Remover
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {!loading && (payload.entries ?? []).length === 0 && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Nenhum lançamento encontrado com os filtros atuais.
          </p>
        )}
      </section>
    </OrganizacaoClientShell>
  );
}
