"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import {
  canFinalizeFinancialMonth,
  lastBusinessDayOfMonth,
} from "@/lib/organizacao-em-harmonia/business-days";
import { supabaseBrowser } from "@/lib/supabase-browser";

type EntryType = "receita" | "despesa";

type Category = {
  id: string;
  entry_type: EntryType;
  parent_id?: string | null;
  name: string;
  public_name: string | null;
  group_name: string;
  sort_order?: number | null;
  metadata?: Record<string, unknown> | null;
};

type Entry = {
  id: string;
  category_id: string | null;
  entry_type: EntryType;
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
  opening_balance: number | string | null;
  closing_balance: number | string | null;
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
  entryType: EntryType;
  categoryId: string;
  description: string;
  amount: string;
  paymentMethod: string;
  financialAccount: string;
  counterpartyName: string;
  publicVisible: boolean;
  structure: "linha" | "agrupamento";
  groupName: string;
  parentId: string;
};

type GroupNode = {
  key: string;
  id: string | null;
  label: string;
  type: EntryType;
  sortOrder: number;
  parentKey: string | null;
  entries: Entry[];
  children: GroupNode[];
};

type NewRowState = {
  scopeKey: string;
  parentId: string;
  groupName: string;
  draft: Draft;
} | null;

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

function categoryLabel(category: Category) {
  return category.public_name || category.name;
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
    description_internal: categoryLabel(category),
    description_public: categoryLabel(category),
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

function buildDisplayEntries(entries: Entry[], categories: Category[], month: string) {
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
    parentId: category?.parent_id ?? "",
  };
}

function newDraft(
  type: EntryType,
  groupName = "",
  parentId = "",
): Draft {
  return {
    id: "",
    entryType: type,
    categoryId: "",
    description: "",
    amount: "0",
    paymentMethod: "pix",
    financialAccount: "",
    counterpartyName: "",
    publicVisible: true,
    structure: "linha",
    groupName,
    parentId,
  };
}

function normalizedGroupName(value: string) {
  return value.trim() || "Outros";
}

function buildGroups(
  type: EntryType,
  categories: Category[],
  displayEntries: Entry[],
) {
  const typeCategories = categories.filter((category) => category.entry_type === type);
  const groupingCategories = typeCategories.filter(isGroupingCategory);
  const groupingById = new Map(groupingCategories.map((category) => [category.id, category]));
  const groupingByLabel = new Map(
    groupingCategories.map((category) => [categoryLabel(category), category]),
  );
  const nodes = new Map<string, GroupNode>();

  const ensureNode = (input: {
    key: string;
    id?: string | null;
    label: string;
    sortOrder?: number;
    parentKey?: string | null;
  }) => {
    const existing = nodes.get(input.key);
    if (existing) return existing;
    const node: GroupNode = {
      key: input.key,
      id: input.id ?? null,
      label: input.label,
      type,
      sortOrder: input.sortOrder ?? 999,
      parentKey: input.parentKey ?? null,
      entries: [],
      children: [],
    };
    nodes.set(input.key, node);
    return node;
  };

  for (const group of groupingCategories) {
    const parent = group.parent_id ? groupingById.get(group.parent_id) : null;
    const parentByName =
      !parent && group.group_name && group.group_name !== categoryLabel(group)
        ? groupingByLabel.get(group.group_name)
        : null;
    const legacyParentLabel =
      !parent && !parentByName && group.group_name && group.group_name !== categoryLabel(group)
        ? normalizedGroupName(group.group_name)
        : "";
    if (legacyParentLabel) {
      ensureNode({
        key: `legacy:${type}:${legacyParentLabel}`,
        label: legacyParentLabel,
        sortOrder: Number(group.sort_order) || 999,
      });
    }
    ensureNode({
      key: `group:${group.id}`,
      id: group.id,
      label: categoryLabel(group),
      sortOrder: Number(group.sort_order) || 999,
      parentKey: parent
        ? `group:${parent.id}`
        : parentByName
          ? `group:${parentByName.id}`
          : legacyParentLabel
            ? `legacy:${type}:${legacyParentLabel}`
            : null,
    });
  }

  for (const entry of displayEntries.filter((item) => item.entry_type === type)) {
    const category = typeCategories.find((item) => item.id === entry.category_id);
    const parentCategory = category?.parent_id
      ? groupingById.get(category.parent_id)
      : null;
    const groupLabel = normalizedGroupName(category?.group_name ?? "");
    const namedGrouping = groupingByLabel.get(groupLabel);
    const target = parentCategory ?? namedGrouping;
    const node = target
      ? ensureNode({
          key: `group:${target.id}`,
          id: target.id,
          label: categoryLabel(target),
          sortOrder: Number(target.sort_order) || 999,
        })
      : ensureNode({
          key: `legacy:${type}:${groupLabel}`,
          label: groupLabel,
          sortOrder: Number(category?.sort_order) || 999,
        });
    node.entries.push(entry);
  }

  for (const node of nodes.values()) {
    if (!node.parentKey) continue;
    const parent = nodes.get(node.parentKey);
    if (parent) parent.children.push(node);
  }

  const sortNodes = (items: GroupNode[]): GroupNode[] =>
    items
      .map((item) => ({
        ...item,
        children: sortNodes(item.children),
        entries: [...item.entries].sort((left, right) =>
          left.description_internal.localeCompare(right.description_internal, "pt-BR"),
        ),
      }))
      .sort((left, right) =>
        left.sortOrder !== right.sortOrder
          ? left.sortOrder - right.sortOrder
          : left.label.localeCompare(right.label, "pt-BR"),
      );

  return sortNodes([...nodes.values()].filter((node) => !node.parentKey));
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-3"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:rounded-[2rem] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black text-[#123D2C] sm:text-2xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white"
          >
            Fechar
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function LancamentosPage() {
  const [month, setMonth] = useState(currentMonth());
  const [payload, setPayload] = useState<Payload>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newRow, setNewRow] = useState<NewRowState>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    saldo: false,
    receita: false,
    despesa: false,
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  const [reviewOpen, setReviewOpen] = useState(false);
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
          visible.map((entry) => [entry.id, toDraft(entry, currentCategories)]),
        ),
      );
      setOpeningBalance(String(Number(result.period?.opening_balance) || 0));
      setClosingBalance(String(Number(result.period?.closing_balance) || 0));
      setNewRow(null);
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
  const categories = useMemo(() => payload.categories ?? [], [payload.categories]);
  const displayEntries = useMemo(
    () => buildDisplayEntries(entries, categories, month),
    [categories, entries, month],
  );
  const groups = useMemo(
    () => ({
      receita: buildGroups("receita", categories, displayEntries),
      despesa: buildGroups("despesa", categories, displayEntries),
    }),
    [categories, displayEntries],
  );

  const finalized = payload.period?.workflow_status === "finalizado";
  const hasSavedMonth = Boolean(
    payload.period || entries.length > 0 || Number(openingBalance) || Number(closingBalance),
  );
  const lastBusinessDay = useMemo(() => lastBusinessDayOfMonth(month), [month]);
  const canFinalize = useMemo(
    () => !finalized && hasSavedMonth && canFinalizeFinancialMonth(month),
    [finalized, hasSavedMonth, month],
  );

  const draftAmount = useCallback(
    (entry: Entry) => Number(drafts[entry.id]?.amount ?? entry.amount) || 0,
    [drafts],
  );

  const groupTotal = useCallback(
    function calculate(node: GroupNode): number {
      return (
        node.entries.reduce((sum, entry) => sum + draftAmount(entry), 0) +
        node.children.reduce((sum, child) => sum + calculate(child), 0)
      );
    },
    [draftAmount],
  );

  const totals = useMemo(
    () => ({
      receita: groups.receita.reduce((sum, group) => sum + groupTotal(group), 0),
      despesa: groups.despesa.reduce((sum, group) => sum + groupTotal(group), 0),
    }),
    [groupTotal, groups],
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
    const label = mode === "last" ? "último mês" : "média dos últimos meses";
    if (!window.confirm(`Replicar ${label} para ${monthLabel(month)}?`)) return;

    setBusy(`replicate:${mode}`);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "replicateMonth",
        targetMonth: `${month}-01`,
        mode,
      });
      setMessage(result.message || "Valores atualizados. Revise antes de finalizar.");
      await load(month);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao replicar mês.");
    } finally {
      setBusy("");
    }
  }

  async function saveBalances() {
    const opening = Number(openingBalance || 0);
    const closing = Number(closingBalance || 0);
    if (!Number.isFinite(opening) || !Number.isFinite(closing)) {
      setError("Informe valores válidos para Saldo Inicial e Saldo Final.");
      return;
    }

    setBusy("balances");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "saveBalances",
        targetMonth: `${month}-01`,
        openingBalance: opening,
        closingBalance: closing,
      });
      setMessage(result.message || "Saldos bancários salvos.");
      await load(month);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao salvar os saldos.");
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
      groupName: draft.groupName,
      parentId: draft.parentId || null,
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

    setBusy(`save:${key}`);
    setError("");
    setMessage("");

    try {
      if (isNew && draft.structure === "agrupamento") {
        await createCategory(draft);
        setMessage("Novo agrupamento criado.");
        setNewRow(null);
        await load(month);
        return;
      }

      const categoryId = isNew ? await createCategory(draft) : draft.categoryId || null;
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
      if (isNew) setNewRow(null);
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
    setBusy("finalize");
    setError("");
    setMessage("");
    try {
      await post({
        action: "saveBalances",
        targetMonth: `${month}-01`,
        openingBalance: Number(openingBalance || 0),
        closingBalance: Number(closingBalance || 0),
      });
      const result = await post({
        action: "finalizeMonth",
        targetMonth: `${month}-01`,
      });
      setMessage(result.message || "Mês finalizado.");
      setReviewOpen(false);
      await load(month);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao finalizar mês.");
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

  function beginInclude(type: EntryType, group?: GroupNode) {
    const draft = newDraft(type, group?.label ?? "", group?.id ?? "");
    if (!group) draft.structure = "agrupamento";
    setNewRow({
      scopeKey: group?.key ?? `root:${type}`,
      parentId: group?.id ?? "",
      groupName: group?.label ?? "",
      draft,
    });
    if (group) {
      setExpandedGroups((current) => ({ ...current, [group.key]: true }));
    } else {
      setExpanded((current) => ({ ...current, [type]: true }));
    }
  }

  function updateNewDraft(patch: Partial<Draft>) {
    setNewRow((current) =>
      current ? { ...current, draft: { ...current.draft, ...patch } } : current,
    );
  }

  function renderNewEditor(state: NonNullable<NewRowState>) {
    const draft = state.draft;
    return (
      <div className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/15 sm:grid-cols-6">
        <input
          value={draft.description}
          onChange={(event) => updateNewDraft({ description: event.target.value })}
          disabled={finalized}
          placeholder={
            draft.structure === "agrupamento"
              ? "Nome do novo agrupamento"
              : "Descrição da nova linha"
          }
          className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
        />
        <select
          value={draft.structure}
          onChange={(event) =>
            updateNewDraft({
              structure: event.target.value as "linha" | "agrupamento",
              amount: event.target.value === "agrupamento" ? "0" : draft.amount,
            })
          }
          disabled={finalized}
          className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
        >
          <option value="linha">Linha deste agrupamento</option>
          <option value="agrupamento">Novo agrupamento abaixo</option>
        </select>
        {draft.structure === "linha" ? (
          <input
            value={draft.amount}
            onChange={(event) => updateNewDraft({ amount: event.target.value })}
            disabled={finalized}
            inputMode="decimal"
            placeholder="Valor (pode ser 0)"
            className="rounded-xl border border-slate-200 p-2.5 font-semibold sm:col-span-2 disabled:bg-slate-100"
          />
        ) : (
          <p className="rounded-xl bg-[#F7FAF2] p-2.5 text-xs font-bold text-[#123D2C] sm:col-span-2">
            Será criado abaixo de {state.groupName || (draft.entryType === "receita" ? "Receitas" : "Despesas")}.
          </p>
        )}
        <div className="flex gap-2 sm:col-span-6">
          <button
            type="button"
            disabled={finalized || busy === `save:new:${state.scopeKey}`}
            onClick={() => void saveDraft(`new:${state.scopeKey}`, draft, true)}
            className="flex-1 rounded-xl bg-[#123D2C] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40"
          >
            {busy === `save:new:${state.scopeKey}` ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => setNewRow(null)}
            className="rounded-xl bg-white px-3 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  function renderEntry(entry: Entry) {
    const draft = drafts[entry.id];
    if (!draft) return null;

    return (
      <div
        key={entry.id}
        className="grid grid-cols-[minmax(0,1fr)_110px] gap-2 rounded-xl bg-white p-2.5 ring-1 ring-[#123D2C]/10 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
      >
        <input
          value={draft.description}
          onChange={(event) => updateDraft(entry.id, { description: event.target.value })}
          disabled={finalized}
          aria-label="Descrição"
          className="min-w-0 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold disabled:bg-slate-100"
        />
        <input
          value={draft.amount}
          onChange={(event) => updateDraft(entry.id, { amount: event.target.value })}
          disabled={finalized}
          inputMode="decimal"
          aria-label={`Valor de ${draft.description}`}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-right text-sm font-black text-[#123D2C] disabled:bg-slate-100"
        />
        <div className="col-span-2 flex gap-1.5 sm:col-span-1">
          <button
            type="button"
            disabled={finalized || busy === `save:${entry.id}`}
            onClick={() => void saveDraft(entry.id, draft, false)}
            className="flex-1 rounded-lg bg-[#123D2C] px-2.5 py-2 text-xs font-black text-white disabled:opacity-40"
          >
            {busy === `save:${entry.id}` ? "Salvando" : "Salvar"}
          </button>
          {draft.id && (
            <button
              type="button"
              disabled={finalized || busy === `delete:${draft.id}`}
              onClick={() => void deleteEntry(draft.id)}
              className="rounded-lg bg-white px-2.5 py-2 text-xs font-black text-red-700 ring-1 ring-red-200 disabled:opacity-40"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderGroup(group: GroupNode, depth = 0): ReactNode {
    const open = expandedGroups[group.key] ?? false;
    const subtotal = groupTotal(group);
    const isNewHere = newRow?.scopeKey === group.key;

    return (
      <div
        key={group.key}
        className={`${depth > 0 ? "ml-2 border-l-2 border-[#123D2C]/10 pl-2 sm:ml-4 sm:pl-3" : ""}`}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-[#F1F7EC] px-2.5 py-2 ring-1 ring-[#123D2C]/10">
          <button
            type="button"
            onClick={() =>
              setExpandedGroups((current) => ({ ...current, [group.key]: !open }))
            }
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
            aria-label={open ? `Recolher ${group.label}` : `Expandir ${group.label}`}
          >
            {open ? "−" : "+"}
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#123D2C]">{group.label}</p>
            {!finalized && (
              <button
                type="button"
                onClick={() => beginInclude(group.type, group)}
                className="mt-0.5 text-[11px] font-black text-[#2F6B43] underline decoration-dotted underline-offset-2"
              >
                + Incluir neste agrupamento
              </button>
            )}
          </div>
          <span className="text-sm font-black text-[#123D2C]">{money(subtotal)}</span>
        </div>

        {open && (
          <div className="mt-2 grid gap-2">
            {group.children.map((child) => renderGroup(child, depth + 1))}
            {group.entries.map(renderEntry)}
            {isNewHere && newRow ? renderNewEditor(newRow) : null}
            {group.children.length === 0 && group.entries.length === 0 && !isNewHere && (
              <p className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                Este agrupamento ainda não possui linhas.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderReviewGroup(group: GroupNode, depth = 0): ReactNode {
    return (
      <div key={`review:${group.key}`} className={depth ? "ml-3 border-l border-slate-200 pl-3" : ""}>
        <div className="flex items-center justify-between gap-3 py-1.5 text-sm font-black text-[#123D2C]">
          <span>{group.label}</span>
          <span>{money(groupTotal(group))}</span>
        </div>
        {group.children.map((child) => renderReviewGroup(child, depth + 1))}
        {group.entries.map((entry) => (
          <div
            key={`review:${entry.id}`}
            className="flex items-center justify-between gap-3 border-t border-slate-100 py-1.5 text-xs font-semibold text-slate-600"
          >
            <span>{drafts[entry.id]?.description || entry.description_internal}</span>
            <span>{money(draftAmount(entry))}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <OrganizacaoClientShell
      title="Receitas e Despesas"
      simpleFinancialHeader
      simpleFinancialActive="inicio"
      simpleFinancialHeaderControl={
        <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-black text-[#123D2C] sm:gap-2 sm:text-sm">
          <span className="whitespace-nowrap">Mês a registrar</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value || currentMonth())}
            className="min-w-0 max-w-[135px] rounded-xl border border-slate-200 p-1.5 text-[11px] font-semibold sm:max-w-none sm:p-2.5 sm:text-sm"
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
            ⚠ {monthLabel(month)} possui informações salvas e ainda precisa ser finalizado.
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

        <div className="border-t border-[#123D2C]/10">
          <button
            type="button"
            onClick={() => setExpanded((current) => ({ ...current, saldo: !current.saldo }))}
            className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 bg-[#EEF5EA] px-4 py-3 text-left"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">
              {expanded.saldo ? "−" : "+"}
            </span>
            <span className="font-black text-[#123D2C]">Saldo Bancário</span>
            <span className="font-black text-[#123D2C]">{money(closingBalance)}</span>
          </button>
          {expanded.saldo && (
            <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
              <label className="grid gap-1 text-xs font-black text-[#123D2C]">
                Saldo Inicial
                <input
                  value={openingBalance}
                  onChange={(event) => setOpeningBalance(event.target.value)}
                  disabled={finalized}
                  inputMode="decimal"
                  className="rounded-xl border border-slate-200 p-2.5 text-right text-sm font-black disabled:bg-slate-100"
                />
              </label>
              <label className="grid gap-1 text-xs font-black text-[#123D2C]">
                Saldo Final
                <input
                  value={closingBalance}
                  onChange={(event) => setClosingBalance(event.target.value)}
                  disabled={finalized}
                  inputMode="decimal"
                  className="rounded-xl border border-slate-200 p-2.5 text-right text-sm font-black disabled:bg-slate-100"
                />
              </label>
              {!finalized && (
                <button
                  type="button"
                  disabled={busy === "balances"}
                  onClick={() => void saveBalances()}
                  className="rounded-xl bg-[#123D2C] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40 sm:col-span-2"
                >
                  {busy === "balances" ? "Salvando..." : "Salvar saldos bancários"}
                </button>
              )}
            </div>
          )}
        </div>

        {(["receita", "despesa"] as const).map((type) => {
          const label = type === "receita" ? "Receitas" : "Despesas";
          const total = type === "receita" ? totals.receita : totals.despesa;
          const isNewAtRoot = newRow?.scopeKey === `root:${type}`;

          return (
            <div key={type} className="border-t border-[#123D2C]/10">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-[#F7FAF2] px-4 py-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [type]: !current[type] }))
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
                  aria-label={expanded[type] ? `Recolher ${label}` : `Expandir ${label}`}
                >
                  {expanded[type] ? "−" : "+"}
                </button>
                <div className="min-w-0">
                  <p className="font-black text-[#123D2C]">{label}</p>
                  {!finalized && (
                    <button
                      type="button"
                      onClick={() => beginInclude(type)}
                      className="mt-0.5 text-[11px] font-black text-[#2F6B43] underline decoration-dotted underline-offset-2"
                    >
                      + Incluir agrupamento ou linha
                    </button>
                  )}
                </div>
                <span className="font-black text-[#123D2C]">{money(total)}</span>
              </div>

              {expanded[type] && (
                <div className="grid gap-2 p-3 sm:p-4">
                  {groups[type].map((group) => renderGroup(group))}
                  {isNewAtRoot && newRow ? renderNewEditor(newRow) : null}
                  {groups[type].length === 0 && !isNewAtRoot && (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                      Nenhum agrupamento cadastrado.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {!finalized && (
        <section className="rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-slate-100 sm:p-4">
          <button
            type="button"
            disabled={!canFinalize || busy === "finalize" || loading}
            onClick={() => setReviewOpen(true)}
            className="w-full rounded-2xl bg-[#123D2C] px-5 py-3.5 text-base font-black text-white shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            Finalização
          </button>
          {!canFinalize && (
            <p className="mt-2 text-center text-xs font-semibold leading-5 text-slate-500">
              A finalização de {monthLabel(month)} fica disponível somente após o último dia útil do mês ({lastBusinessDay.split("-").reverse().join("/")}).
            </p>
          )}
        </section>
      )}

      {reviewOpen && (
        <Modal title={`Revisão para finalização — ${monthLabel(month)}`} onClose={() => setReviewOpen(false)}>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">
            Confira os valores abaixo antes de encerrar as informações do mês. Depois da finalização, a edição normal fica bloqueada.
          </p>

          <div className="mt-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
            <div className="flex justify-between gap-3 text-sm font-black text-[#123D2C]">
              <span>Saldo Inicial</span>
              <span>{money(openingBalance)}</span>
            </div>
            <div className="mt-1 flex justify-between gap-3 text-sm font-black text-[#123D2C]">
              <span>Saldo Final</span>
              <span>{money(closingBalance)}</span>
            </div>
          </div>

          {(["receita", "despesa"] as const).map((type) => (
            <div key={`review:${type}`} className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-base font-black text-[#123D2C]">
                <span>{type === "receita" ? "Receitas" : "Despesas"}</span>
                <span>{money(type === "receita" ? totals.receita : totals.despesa)}</span>
              </div>
              <div className="mt-2 grid gap-1">
                {groups[type].map((group) => renderReviewGroup(group))}
              </div>
            </div>
          ))}

          <div className="mt-3 rounded-2xl bg-[#123D2C] p-3 text-white">
            <div className="flex justify-between gap-3 text-sm font-black">
              <span>Resultado do mês</span>
              <span>{money(totals.receita - totals.despesa)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={busy === "finalize"}
            onClick={() => void finalize()}
            className="mt-3 w-full rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {busy === "finalize" ? "Finalizando..." : "Confirmar finalização do mês"}
          </button>
        </Modal>
      )}
    </OrganizacaoClientShell>
  );
}
