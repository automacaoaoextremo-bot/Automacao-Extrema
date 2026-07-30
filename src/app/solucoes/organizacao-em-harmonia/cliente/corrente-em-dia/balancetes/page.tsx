"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type EntryType = "receita" | "despesa";

type Category = {
  id: string;
  entry_type: EntryType;
  name: string;
  public_name: string | null;
  group_name: string;
};

type EntryCategory = Pick<Category, "id" | "name" | "public_name" | "group_name">;

type ApiEntry = {
  id: string;
  category_id: string | null;
  entry_type: EntryType;
  description_internal: string;
  description_public: string | null;
  amount: number;
  public_visible: boolean;
  metadata: Record<string, unknown> | null;
  category: EntryCategory | EntryCategory[] | null;
};

type Period = {
  id: string;
  competence_month: string;
  status: string;
  opening_balance: number;
  closing_balance: number | null;
  needs_update: boolean;
  source_label: string | null;
  notes: string | null;
};

type ApiPayload = {
  canManage?: boolean;
  competenceMonth?: string;
  period?: Period | null;
  entries?: ApiEntry[];
  categories?: Category[];
  error?: string;
};

type BalanceRow = {
  id: string;
  clientKey: string;
  entryType: EntryType;
  categoryId: string;
  descriptionInternal: string;
  descriptionPublic: string;
  amount: string;
  quantity: string;
  unit: string;
  publicVisible: boolean;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function newRow(entryType: EntryType): BalanceRow {
  return {
    id: "",
    clientKey: crypto.randomUUID(),
    entryType,
    categoryId: "",
    descriptionInternal: "",
    descriptionPublic: "",
    amount: "",
    quantity: "",
    unit: "",
    publicVisible: true,
  };
}

function metadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value : "";
}

function entryCategory(entry: ApiEntry) {
  return Array.isArray(entry.category)
    ? entry.category[0] ?? null
    : entry.category;
}

function parseMoney(value: string, absolute = false) {
  const clean = value.trim().replace(/R\$\s*/gi, "").replace(/\s/g, "");
  if (!clean) return 0;
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return absolute ? Math.abs(parsed) : parsed;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function statusLabel(status: string | undefined) {
  const labels: Record<string, string> = {
    aberto: "Aberto",
    importado: "Importado",
    provisorio: "Provisório",
    em_revisao: "Em revisão",
    confirmado: "Confirmado",
    com_divergencia: "Com divergência",
    fechado: "Fechado",
  };
  return status ? labels[status] ?? status : "Novo mês";
}

export default function BalanceteMensalPage() {
  const [month, setMonth] = useState(currentMonth());
  const [payload, setPayload] = useState<ApiPayload>({});
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [openingBalance, setOpeningBalance] = useState("0,00");
  const [closingBalance, setClosingBalance] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Cadastro manual pela Tesouraria");
  const [notes, setNotes] = useState("");
  const [isProvisional, setIsProvisional] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
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
    const response = await fetch(
      `/api/organizacao-em-harmonia/cliente/corrente-em-dia/balancetes?month=${month}-01`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as ApiPayload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar o balancete.");
    }

    const mappedRows = (result.entries ?? []).map((entry) => ({
      id: entry.id,
      clientKey:
        metadataText(entry.metadata, "balanceteClientKey") || entry.id,
      entryType: entry.entry_type,
      categoryId: entry.category_id ?? entryCategory(entry)?.id ?? "",
      descriptionInternal: entry.description_internal,
      descriptionPublic: entry.description_public ?? "",
      amount: String(entry.amount).replace(".", ","),
      quantity: metadataText(entry.metadata, "quantity"),
      unit: metadataText(entry.metadata, "unit"),
      publicVisible: entry.public_visible,
    }));

    setPayload(result);
    setRows(mappedRows);
    setOpeningBalance(
      String(result.period?.opening_balance ?? 0).replace(".", ","),
    );
    setClosingBalance(
      result.period?.closing_balance == null
        ? ""
        : String(result.period.closing_balance).replace(".", ","),
    );
    setSourceLabel(
      result.period?.source_label || "Cadastro manual pela Tesouraria",
    );
    setNotes(result.period?.notes || "");
    setIsProvisional(result.period?.status === "provisorio");
    setNeedsUpdate(result.period?.needs_update === true);
  }, [accessToken, month]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar o balancete.",
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
  }, [load]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const value = parseMoney(row.amount, true);
          if (row.entryType === "receita") acc.revenues += value;
          else acc.expenses += value;
          return acc;
        },
        { revenues: 0, expenses: 0 },
      ),
    [rows],
  );

  const calculatedClosing =
    parseMoney(openingBalance) + totals.revenues - totals.expenses;

  function categoriesFor(entryType: EntryType) {
    return (payload.categories ?? []).filter(
      (category) => category.entry_type === entryType,
    );
  }

  function updateRow(index: number, patch: Partial<BalanceRow>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function addRow(entryType: EntryType) {
    setRows((current) => [...current, newRow(entryType)]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function post(body: Record<string, unknown>) {
    const token = await accessToken();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/balancetes",
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
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível salvar o balancete.");
    }
    return result;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await post({
        action: "save_monthly",
        competenceMonth: `${month}-01`,
        openingBalance,
        closingBalance: closingBalance || String(calculatedClosing),
        sourceLabel,
        notes,
        isProvisional,
        needsUpdate,
        rows: rows.map((row) => ({
          ...row,
          amount: parseMoney(row.amount, true),
          quantity: row.quantity ? Number(row.quantity.replace(",", ".")) : null,
        })),
      });
      setMessage(result.message || "Balancete salvo.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao salvar o balancete.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmMonth() {
    if (
      !window.confirm(
        "Confirmar este mês? Os lançamentos deixarão de ser provisórios e passarão a compor a prestação revisada.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "confirm_month",
        competenceMonth: `${month}-01`,
      });
      setMessage(result.message || "Balancete confirmado.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao confirmar o balancete.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell
      title="Balancete mensal"
      description="Cadastre receitas e despesas no formato dos balancetes mensais. A tela calcula totais, resultado e saldo final, mantendo a revisão restrita à Tesouraria/Financeiro."
    >
      {error && (
        <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          {message}
        </p>
      )}

      <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 font-black text-[#123D2C]">
            Competência
            <input
              type="month"
              value={month}
              onChange={(event) => {
                const nextMonth = event.target.value;
                if (!nextMonth) return;
                setMonth(nextMonth);
                setLoading(true);
                setError("");
                setMessage("");
              }}
              className="min-h-12 rounded-2xl border border-slate-200 px-4"
            />
          </label>
          <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
              Situação
            </p>
            <p className="mt-2 font-black text-[#123D2C]">
              {statusLabel(payload.period?.status)}
            </p>
          </div>
          <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
              Linhas
            </p>
            <p className="mt-2 font-black text-[#123D2C]">{rows.length}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
            Receitas
          </p>
          <p className="mt-2 text-lg font-black text-emerald-800">
            {money(totals.revenues)}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
            Despesas
          </p>
          <p className="mt-2 text-lg font-black text-amber-800">
            {money(totals.expenses)}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
            Resultado
          </p>
          <p
            className={`mt-2 text-lg font-black ${
              totals.revenues - totals.expenses < 0
                ? "text-red-700"
                : "text-[#123D2C]"
            }`}
          >
            {money(totals.revenues - totals.expenses)}
          </p>
        </article>
        <article className="rounded-2xl bg-[#E9F2E7] p-4 shadow ring-1 ring-[#123D2C]/10">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
            Saldo calculado
          </p>
          <p
            className={`mt-2 text-lg font-black ${
              calculatedClosing < 0 ? "text-red-700" : "text-[#123D2C]"
            }`}
          >
            {money(calculatedClosing)}
          </p>
        </article>
      </section>

      {loading && (
        <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
          Carregando o balancete...
        </p>
      )}

      {!loading && !payload.canManage && (
        <p className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-900">
          Seu perfil pode consultar, mas não pode alterar os dados financeiros.
        </p>
      )}

      {!loading && payload.canManage && (
        <form onSubmit={save} className="grid gap-5">
          <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 font-black text-[#123D2C]">
                Saldo inicial
                <input
                  value={openingBalance}
                  onChange={(event) => setOpeningBalance(event.target.value)}
                  inputMode="decimal"
                  className="rounded-2xl border border-slate-200 p-4"
                />
              </label>
              <label className="grid gap-2 font-black text-[#123D2C]">
                Saldo final informado
                <input
                  value={closingBalance}
                  onChange={(event) => setClosingBalance(event.target.value)}
                  inputMode="decimal"
                  placeholder={money(calculatedClosing)}
                  className="rounded-2xl border border-slate-200 p-4"
                />
                <span className="text-xs font-semibold text-slate-500">
                  Deixe vazio para usar o saldo calculado.
                </span>
              </label>
              <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
                Origem dos dados
                <input
                  value={sourceLabel}
                  onChange={(event) => setSourceLabel(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4"
                />
              </label>
              <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
                Observações da competência
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-24 rounded-2xl border border-slate-200 p-4 font-semibold text-slate-700"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
                <input
                  type="checkbox"
                  checked={isProvisional}
                  onChange={(event) => {
                    setIsProvisional(event.target.checked);
                    if (event.target.checked) setNeedsUpdate(true);
                  }}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-black text-amber-900">
                    Valores provisórios
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-amber-800">
                    Use quando os números ainda precisam ser substituídos pelos realizados.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-4">
                <input
                  type="checkbox"
                  checked={needsUpdate}
                  onChange={(event) => setNeedsUpdate(event.target.checked)}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-black text-[#123D2C]">
                    Precisa ser atualizado
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">
                    Mantém a pendência visível para a Tesouraria/Financeiro.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Receitas e despesas
                </p>
                <h2 className="mt-1 text-xl font-black text-[#123D2C]">
                  Preencha uma linha para cada item do balancete.
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => addRow("receita")}
                  className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800"
                >
                  + Receita
                </button>
                <button
                  type="button"
                  onClick={() => addRow("despesa")}
                  className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800"
                >
                  + Despesa
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {rows.map((row, index) => (
                <article
                  key={row.clientKey}
                  className="rounded-[1.5rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        row.entryType === "receita"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      Linha {index + 1} · {row.entryType === "receita" ? "Receita" : "Despesa"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2 font-black text-[#123D2C]">
                      Tipo
                      <select
                        value={row.entryType}
                        onChange={(event) =>
                          updateRow(index, {
                            entryType: event.target.value as EntryType,
                            categoryId: "",
                          })
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      >
                        <option value="receita">Receita</option>
                        <option value="despesa">Despesa</option>
                      </select>
                    </label>
                    <label className="grid gap-2 font-black text-[#123D2C]">
                      Valor
                      <input
                        value={row.amount}
                        onChange={(event) =>
                          updateRow(index, { amount: event.target.value })
                        }
                        inputMode="decimal"
                        placeholder="0,00"
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      />
                    </label>
                    <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
                      Item
                      <input
                        value={row.descriptionInternal}
                        onChange={(event) =>
                          updateRow(index, {
                            descriptionInternal: event.target.value,
                          })
                        }
                        placeholder="Ex.: CPFL, Mensalidades, Segurança"
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      />
                    </label>
                    <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
                      Categoria
                      <select
                        value={row.categoryId}
                        onChange={(event) =>
                          updateRow(index, { categoryId: event.target.value })
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      >
                        <option value="">Sem categoria</option>
                        {categoriesFor(row.entryType).map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.group_name} · {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 font-black text-[#123D2C]">
                      Quantidade
                      <input
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(index, { quantity: event.target.value })
                        }
                        inputMode="decimal"
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      />
                    </label>
                    <label className="grid gap-2 font-black text-[#123D2C]">
                      Unidade
                      <input
                        value={row.unit}
                        onChange={(event) =>
                          updateRow(index, { unit: event.target.value })
                        }
                        placeholder="Ex.: pct, un"
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      />
                    </label>
                    <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
                      Descrição pública
                      <input
                        value={row.descriptionPublic}
                        onChange={(event) =>
                          updateRow(index, {
                            descriptionPublic: event.target.value,
                          })
                        }
                        placeholder="Sem nomes ou informações sensíveis"
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      />
                    </label>
                    <label className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={row.publicVisible}
                        onChange={(event) =>
                          updateRow(index, {
                            publicVisible: event.target.checked,
                          })
                        }
                        className="mt-1 h-5 w-5"
                      />
                      <span className="font-black text-[#123D2C]">
                        Pode compor o painel público de forma agregada
                      </span>
                    </label>
                  </div>
                </article>
              ))}

              {rows.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-5 text-center font-bold text-slate-500">
                  Nenhuma linha neste mês. Use os botões Receita e Despesa para começar.
                </p>
              )}
            </div>
          </section>

          <section className="sticky bottom-3 z-20 rounded-[1.5rem] bg-white/95 p-3 shadow-2xl ring-1 ring-[#123D2C]/15 backdrop-blur sm:static sm:p-5 sm:shadow">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button
                disabled={saving}
                className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar para revisão"}
              </button>
              <button
                type="button"
                disabled={saving || !payload.period}
                onClick={confirmMonth}
                className="rounded-2xl bg-emerald-50 px-5 py-4 font-black text-emerald-800 ring-1 ring-emerald-100 disabled:opacity-50"
              >
                Confirmar competência
              </button>
              <p className="flex items-center justify-center rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] sm:col-span-2 lg:col-span-1">
                Saldo calculado: {money(calculatedClosing)}
              </p>
            </div>
          </section>
        </form>
      )}
    </OrganizacaoClientShell>
  );
}
