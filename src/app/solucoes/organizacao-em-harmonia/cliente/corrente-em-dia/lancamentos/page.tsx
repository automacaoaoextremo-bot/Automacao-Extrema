"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Category = {
  id: string;
  entry_type: "receita" | "despesa";
  parent_id?: string | null;
  name: string;
  public_name: string | null;
  group_name: string;
  metadata?: Record<string, unknown> | null;
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
  structure: "linha" | "agrupamento";
  groupName: string;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function money(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T12:00:00Z`));
}

function isGroupingCategory(category: Category) {
  return category.metadata?.isGrouping === true;
}

function toDraft(entry: Entry, categories: Category[]): Draft {
  const category = categories.find((item) => item.id === entry.category_id);
  return {
    id: entry.id.startsWith("template:") ? "" : entry.id,
    entryType: entry.entry_type,
    categoryId: entry.category_id ?? "",
    description: entry.description_internal,
    amount: String(Number(entry.amount) || 0),
    paymentMethod: entry.payment_method ?? "",
    financialAccount: entry.financial_account ?? "",
    counterpartyName: entry.counterparty_name ?? "",
    publicVisible: entry.public_visible,
    structure: "linha",
    groupName: category?.group_name ?? "",
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
    structure: "linha",
    groupName: "",
  };
}

function virtualEntry(category: Category, month: string): Entry {
  return {
    id: `template:${category.id}`,
    category_id: category.id,
    entry_type: category.entry_type,
    entry_date: `${month}-01`,
    due_date: `${month}-01`,
    financial_date: `${month}-01`,
    financial_month: `${month}-01`,
    competence_month: `${month}-01`,
    description_internal: category.public_name || category.name,
    description_public: category.public_name || category.name,
    amount: 0,
    payment_method: null,
    financial_account: null,
    counterparty_name: null,
    status: "rascunho",
    workflow_status: "rascunho",
    data_nature: "realizado",
    is_provisional: false,
    needs_update: false,
    public_visible: true,
    notes_internal: null,
  };
}

function buildDisplayEntries(
  entries: Entry[],
  categories: Category[],
  month: string,
) {
  const usedCategories = new Set(
    entries.map((entry) => entry.category_id).filter(Boolean),
  );
  const templates = categories
    .filter((category) => !isGroupingCategory(category))
    .filter((category) => !usedCategories.has(category.id))
    .map((category) => virtualEntry(category, month));

  return [...entries, ...templates].sort((left, right) => {
    if (left.entry_type !== right.entry_type) {
      return left.entry_type.localeCompare(right.entry_type);
    }
    return left.description_internal.localeCompare(
      right.description_internal,
      "pt-BR",
    );
  });
}

export default function LancamentosPage() {
  const [month, setMonth] = useState(currentMonth());
  const [payload, setPayload] = useState<Payload>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newRows, setNewRows] = useState<Record<string, Draft | null>>({
    receita: null,
    despesa: null,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    receita: false,
    despesa: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const accessToken = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(
    async (targetMonth: string) => {
      const token = await accessToken();
      const response = await fetch(
        `/api/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos?financialMonth=${targetMonth}-01`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        },
      );
      const result = (await response.json()) as Payload;
      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível carregar o mês financeiro.",
        );
      }

      const currentEntries = result.entries ?? [];
      const currentCategories = result.categories ?? [];
      const visible = buildDisplayEntries(
        currentEntries,
        currentCategories,
        targetMonth,
      );

      setPayload(result);
      setDrafts(
        Object.fromEntries(
          visible.map((entry) => [
            entry.id,
            toDraft(entry, currentCategories),
          ]),
        ),
      );
      setNewRows({ receita: null, despesa: null });
    },
    [accessToken],
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void load(month)
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar o mês.",
            );
          }
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
  const categories = useMemo(
    () => payload.categories ?? [],
    [payload.categories],
  );
  const displayEntries = useMemo(
    () => buildDisplayEntries(entries, categories, month),
    [categories, entries, month],
  );

  const finalized = payload.period?.workflow_status === "finalizado";
  const hasSavedMonth = Boolean(payload.period || entries.length > 0);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => {
          if (entry.entry_type === "receita")
            acc.receita += Number(entry.amount) || 0;
          if (entry.entry_type === "despesa")
            acc.despesa += Number(entry.amount) || 0;
          return acc;
        },
        { receita: 0, despesa: 0 },
      ),
    [entries],
  );

  const categoriesByType = useMemo(
    () => ({
      receita: categories.filter(
        (category) =>
          category.entry_type === "receita" && !isGroupingCategory(category),
      ),
      despesa: categories.filter(
        (category) =>
          category.entry_type === "despesa" && !isGroupingCategory(category),
      ),
    }),
    [categories],
  );

  const groupNamesByType = useMemo(
    () => ({
      receita: Array.from(
        new Set(
          categories
            .filter((category) => category.entry_type === "receita")
            .map((category) => category.group_name.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
      despesa: Array.from(
        new Set(
          categories
            .filter((category) => category.entry_type === "despesa")
            .map((category) => category.group_name.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, "pt-BR")),
    }),
    [categories],
  );

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
      category?: { id?: string };
    };
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível concluir a operação.");
    }
    return result;
  }

  async function replicate(mode: "last" | "average") {
    const label =
      mode === "last" ? "último mês" : "média dos últimos meses";
    if (!window.confirm(`Replicar ${label} para ${monthLabel(month)}?`)) {
      return;
    }

    setBusy(`replicate:${mode}`);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "replicateMonth",
        targetMonth: `${month}-01`,
        mode,
      });
      setMessage(
        result.message || "Valores atualizados. Revise antes de finalizar.",
      );
      await load(month);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao replicar mês.",
      );
    } finally {
      setBusy("");
    }
  }

  async function createCategory(draft: Draft) {
    const result = await post({
      action: "createCategory",
      entryType: draft.entryType,
      name: draft.description.trim(),
      publicName: draft.description.trim(),
      isGrouping: draft.structure === "agrupamento",
      groupName:
        draft.structure === "agrupamento"
          ? draft.description.trim()
          : draft.groupName,
    });

    const categoryId = result.category?.id;
    if (!categoryId) {
      throw new Error("A categoria financeira não foi criada corretamente.");
    }
    return categoryId;
  }

  async function saveDraft(key: string, draft: Draft, isNew: boolean) {
    if (!draft.description.trim()) {
      setError("Informe a descrição do lançamento.");
      return;
    }

    const numericAmount = Number(draft.amount || 0);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setError("Informe um valor igual ou maior que zero.");
      return;
    }

    if (
      isNew &&
      draft.structure === "linha" &&
      !draft.groupName.trim()
    ) {
      setError("Selecione em qual grupo a nova linha será registrada.");
      return;
    }

    setBusy(`save:${key}`);
    setError("");
    setMessage("");

    try {
      if (isNew && draft.structure === "agrupamento") {
        await createCategory(draft);
        setMessage("Novo agrupamento criado.");
        setNewRows((current) => ({
          ...current,
          [draft.entryType]: null,
        }));
        await load(month);
        return;
      }

      const categoryId = isNew
        ? await createCategory(draft)
        : draft.categoryId || null;

      const result = await post({
        action: "save",
        id: draft.id || null,
        entryType: draft.entryType,
        entryDate: `${month}-01`,
        dueDate: `${month}-01`,
        financialDate: `${month}-01`,
        financialMonth: `${month}-01`,
        competenceMonth: `${month}-01`,
        categoryId,
        descriptionInternal: draft.description.trim(),
        descriptionPublic: draft.description.trim(),
        amount: numericAmount,
        paymentMethod: draft.paymentMethod || null,
        financialAccount: draft.financialAccount || null,
        counterpartyName: draft.counterpartyName || null,
        workflowStatus: "em_andamento",
        dataNature: "realizado",
        needsUpdate: false,
        publicVisible: draft.publicVisible,
      });

      setMessage(result.message || "Lançamento salvo.");
      if (isNew) {
        setNewRows((current) => ({
          ...current,
          [draft.entryType]: null,
        }));
      }
      await load(month);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao salvar lançamento.",
      );
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
      setError(
        reason instanceof Error ? reason.message : "Erro ao excluir lançamento.",
      );
    } finally {
      setBusy("");
    }
  }

  async function finalize() {
    if (
      !window.confirm(
        `Finalizar ${monthLabel(
          month,
        )}? Depois disso o mês ficará fechado para edição normal.`,
      )
    ) {
      return;
    }

    setBusy("finalize");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "finalizeMonth",
        targetMonth: `${month}-01`,
      });
      setMessage(result.message || "Mês finalizado.");
      await load(month);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao finalizar mês.",
      );
    } finally {
      setBusy("");
    }
  }

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }

  function updateNew(
    type: "receita" | "despesa",
    patch: Partial<Draft>,
  ) {
    setNewRows((current) => ({
      ...current,
      [type]: { ...(current[type] ?? newDraft(type)), ...patch },
    }));
  }

  function renderEditor(key: string, draft: Draft, isNew: boolean) {
    const update = (patch: Partial<Draft>) =>
      isNew
        ? updateNew(draft.entryType, patch)
        : updateDraft(key, patch);

    if (isNew) {
      return (
        <div
          key={key}
          className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10 sm:grid-cols-6"
        >
          <input
            value={draft.description}
            onChange={(event) =>
              update({ description: event.target.value })
            }
            disabled={finalized}
            placeholder={
              draft.structure === "agrupamento"
                ? "Nome do agrupamento"
                : "Descrição da nova linha"
            }
            className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
          />
          <select
            value={draft.structure}
            onChange={(event) =>
              update({
                structure: event.target.value as
                  | "linha"
                  | "agrupamento",
                groupName:
                  event.target.value === "agrupamento"
                    ? ""
                    : draft.groupName,
              })
            }
            disabled={finalized}
            className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
          >
            <option value="linha">Linha financeira</option>
            <option value="agrupamento">Agrupamento</option>
          </select>

          {draft.structure === "linha" ? (
            <>
              <select
                value={draft.groupName}
                onChange={(event) =>
                  update({ groupName: event.target.value })
                }
                disabled={finalized}
                className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
              >
                <option value="">Grupo</option>
                {groupNamesByType[draft.entryType].map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <input
                value={draft.amount}
                onChange={(event) =>
                  update({ amount: event.target.value })
                }
                disabled={finalized}
                inputMode="decimal"
                placeholder="Valor (pode ser 0)"
                className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
              />
            </>
          ) : (
            <p className="rounded-xl bg-[#F7FAF2] p-2.5 text-xs font-bold leading-5 text-[#123D2C] sm:col-span-2">
              O agrupamento será criado sem valor. Depois poderá receber linhas financeiras.
            </p>
          )}

          <div className="flex gap-1.5 sm:col-span-2">
            <button
              type="button"
              disabled={finalized || busy === `save:${key}`}
              onClick={() => void saveDraft(key, draft, true)}
              className="flex-1 rounded-xl bg-[#123D2C] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40"
            >
              {busy === `save:${key}`
                ? "Salvando"
                : draft.structure === "agrupamento"
                  ? "Criar agrupamento"
                  : "Salvar linha"}
            </button>
            <button
              type="button"
              disabled={busy === `save:${key}`}
              onClick={() =>
                setNewRows((current) => ({
                  ...current,
                  [draft.entryType]: null,
                }))
              }
              className="rounded-xl bg-white px-3 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={key}
        className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10 sm:grid-cols-6"
      >
        <input
          value={draft.description}
          onChange={(event) =>
            update({ description: event.target.value })
          }
          disabled={finalized}
          placeholder="Descrição"
          className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
        />
        <select
          value={draft.categoryId}
          onChange={(event) =>
            update({ categoryId: event.target.value })
          }
          disabled={finalized}
          className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
        >
          <option value="">Categoria</option>
          {categoriesByType[draft.entryType].map((category) => (
            <option key={category.id} value={category.id}>
              {category.public_name || category.name}
            </option>
          ))}
        </select>
        <input
          value={draft.amount}
          onChange={(event) => update({ amount: event.target.value })}
          disabled={finalized}
          inputMode="decimal"
          placeholder="Valor"
          className="rounded-xl border border-slate-200 p-2.5 font-semibold disabled:bg-slate-100"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={finalized || busy === `save:${key}`}
            onClick={() => void saveDraft(key, draft, false)}
            className="flex-1 rounded-xl bg-[#123D2C] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40"
          >
            {busy === `save:${key}` ? "Salvando" : "Salvar"}
          </button>
          {draft.id && (
            <button
              type="button"
              disabled={
                finalized || busy === `delete:${draft.id}`
              }
              onClick={() => void deleteEntry(draft.id)}
              className="rounded-xl bg-white px-3 py-2.5 text-xs font-black text-red-700 ring-1 ring-red-200 disabled:opacity-40"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <OrganizacaoClientShell
      title="Receitas e Despesas"
      simpleFinancialHeader
      simpleFinancialActive="inicio"
      simpleFinancialHeaderControl={
        <label className="flex items-center gap-2 text-xs font-black text-[#123D2C] sm:text-sm">
          <span className="hidden sm:inline">Mês</span>
          <input
            type="month"
            value={month}
            onChange={(event) =>
              setMonth(event.target.value || currentMonth())
            }
            className="max-w-[155px] rounded-xl border border-slate-200 p-2 text-xs font-semibold sm:max-w-none sm:p-2.5 sm:text-sm"
          />
        </label>
      }
    >
      <section className="rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-slate-100 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={finalized || busy !== ""}
            onClick={() => void replicate("last")}
            className="rounded-xl bg-[#E9F2E7] px-3 py-2.5 text-xs font-black text-[#123D2C] disabled:opacity-40 sm:text-sm"
          >
            Replicar último mês
          </button>
          <button
            type="button"
            disabled={finalized || busy !== ""}
            onClick={() => void replicate("average")}
            className="rounded-xl bg-[#E9F2E7] px-3 py-2.5 text-xs font-black text-[#123D2C] disabled:opacity-40 sm:text-sm"
          >
            Replicar média
          </button>
        </div>

        {loading && (
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">
            Carregando...
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">
            {message}
          </p>
        )}

        {!loading && hasSavedMonth && !finalized && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-black text-amber-900 ring-1 ring-amber-200">
            ⚠ {monthLabel(month)} possui informações salvas e ainda precisa ser
            finalizado.
          </p>
        )}
        {!loading && finalized && (
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-200">
            ✓ {monthLabel(month)} está finalizado.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-[1.5rem] bg-white shadow ring-1 ring-slate-100">
        <div className="grid grid-cols-[1fr_auto] bg-[#123D2C] px-4 py-3 font-black text-white">
          <span>Prestação de contas por mês</span>
          <span>{monthLabel(month)}</span>
        </div>

        {(["receita", "despesa"] as const).map((type) => {
          const label = type === "receita" ? "Receitas" : "Despesas";
          const typeEntries = displayEntries.filter(
            (entry) => entry.entry_type === type,
          );
          const total =
            type === "receita" ? totals.receita : totals.despesa;

          return (
            <div
              key={type}
              className="border-t border-[#123D2C]/10 first:border-t-0"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded((current) => ({
                    ...current,
                    [type]: !current[type],
                  }))
                }
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 bg-[#F7FAF2] px-4 py-3 text-left"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">
                  {expanded[type] ? "−" : "+"}
                </span>
                <span className="font-black text-[#123D2C]">{label}</span>
                <span className="font-black text-[#123D2C]">
                  {money(total)}
                </span>
              </button>

              {expanded[type] && (
                <div className="grid gap-2 p-3 sm:p-4">
                  {typeEntries.map((entry) =>
                    drafts[entry.id]
                      ? renderEditor(
                          entry.id,
                          drafts[entry.id],
                          false,
                        )
                      : null,
                  )}

                  {newRows[type] &&
                    renderEditor(
                      `new:${type}`,
                      newRows[type] as Draft,
                      true,
                    )}

                  {!finalized && !newRows[type] && (
                    <button
                      type="button"
                      onClick={() =>
                        setNewRows((current) => ({
                          ...current,
                          [type]: newDraft(type),
                        }))
                      }
                      className="rounded-xl border-2 border-dashed border-[#123D2C]/25 bg-white px-4 py-3 text-sm font-black text-[#123D2C]"
                    >
                      + Incluir nova{" "}
                      {type === "receita" ? "receita" : "despesa"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {!finalized && hasSavedMonth && (
        <button
          type="button"
          disabled={busy === "finalize" || loading}
          onClick={() => void finalize()}
          className="w-full rounded-2xl bg-[#123D2C] px-5 py-3.5 text-base font-black text-white shadow disabled:opacity-50"
        >
          {busy === "finalize" ? "Finalizando..." : "Finalizar mês"}
        </button>
      )}
    </OrganizacaoClientShell>
  );
}
