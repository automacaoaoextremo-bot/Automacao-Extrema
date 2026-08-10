"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Category = {
  id: string;
  entry_type: "receita" | "despesa";
  name: string;
  group_name: string;
};

type SuggestedEntry = {
  id: string;
  entryDate: string;
  entryType: "receita" | "despesa";
  description: string;
  amount: number;
  status: string;
  score: number;
  category: { id: string; name: string; group_name: string } | null;
};

type Transaction = {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: "credito" | "debito";
  account_label: string | null;
  fit_id: string | null;
  status: string;
  matchedEntry: {
    id: string;
    entryDate: string;
    description: string;
    amount: number;
    category: { id: string; name: string; group_name: string } | null;
  } | null;
  suggestions: SuggestedEntry[];
};

type Payload = {
  transactions?: Transaction[];
  categories?: Category[];
  summary?: { pending: number; reconciled: number; ignored: number };
  error?: string;
};

type Draft = {
  categoryId: string;
  descriptionInternal: string;
  descriptionPublic: string;
  publicVisible: boolean;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

export default function ReconciliacaoPage() {
  const [view, setView] = useState("pendentes");
  const [payload, setPayload] = useState<Payload>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [expandedId, setExpandedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      `/api/organizacao-em-harmonia/cliente/corrente-em-dia/reconciliacao?view=${encodeURIComponent(view)}`,
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar a conciliação.");
    }
    setPayload(result);
    setDrafts((current) => {
      const next = { ...current };
      for (const transaction of result.transactions ?? []) {
        if (!next[transaction.id]) {
          const type =
            transaction.transaction_type === "credito" ? "receita" : "despesa";
          const firstCategory = (result.categories ?? []).find(
            (category) => category.entry_type === type,
          );
          next[transaction.id] = {
            categoryId: firstCategory?.id ?? "",
            descriptionInternal: transaction.description,
            descriptionPublic: transaction.description,
            publicVisible: true,
          };
        }
      }
      return next;
    });
  }, [token, view]);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar a conciliação.",
            );
          }
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

  async function action(
    transactionId: string,
    body: Record<string, unknown>,
  ) {
    setSavingId(transactionId);
    setError("");
    setMessage("");
    try {
      const accessToken = await token();
      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia/reconciliacao",
        {
          method: "POST",
          headers: {
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactionId, ...body }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível atualizar a conciliação.");
      }
      setMessage(result.message || "Conciliação atualizada.");
      setExpandedId("");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao atualizar a conciliação.",
      );
    } finally {
      setSavingId("");
    }
  }

  const transactions = payload.transactions ?? [];
  const categoriesByType = useMemo(
    () => ({
      receita: (payload.categories ?? []).filter(
        (category) => category.entry_type === "receita",
      ),
      despesa: (payload.categories ?? []).filter(
        (category) => category.entry_type === "despesa",
      ),
    }),
    [payload.categories],
  );

  return (
    <OrganizacaoClientShell
      title="Conciliação bancária"
      description="Confira cada movimento do extrato, associe a um lançamento existente ou crie o lançamento sem digitar tudo novamente."
    >
      {error && (
        <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          {message}
        </p>
      )}

      <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
          Conciliação segura
        </p>
        <h2 className="mt-2 text-2xl font-black">
          O extrato mostra o movimento; a Tesouraria confirma o significado.
        </h2>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA]">
          Sugestões usam valor, data e descrição. Nenhuma associação é concluída sem uma ação explícita da Tesouraria/Financeiro.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <article className="rounded-2xl bg-white p-3 text-center shadow ring-1 ring-slate-100 sm:p-4">
          <p className="text-xs font-black uppercase text-amber-700">Pendentes</p>
          <p className="mt-1 text-2xl font-black text-[#123D2C]">
            {payload.summary?.pending ?? 0}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-3 text-center shadow ring-1 ring-slate-100 sm:p-4">
          <p className="text-xs font-black uppercase text-emerald-700">Conciliados</p>
          <p className="mt-1 text-2xl font-black text-[#123D2C]">
            {payload.summary?.reconciled ?? 0}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-3 text-center shadow ring-1 ring-slate-100 sm:p-4">
          <p className="text-xs font-black uppercase text-slate-500">Ignorados</p>
          <p className="mt-1 text-2xl font-black text-[#123D2C]">
            {payload.summary?.ignored ?? 0}
          </p>
        </article>
      </section>

      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow ring-1 ring-slate-100">
        {[
          ["pendentes", "Pendentes"],
          ["concluidos", "Concluídos"],
          ["todos", "Todos"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setLoading(true);
              setView(value);
            }}
            className={`rounded-xl px-3 py-3 text-sm font-black ${
              view === value
                ? "bg-[#123D2C] text-white"
                : "bg-[#F7FAF2] text-[#123D2C]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="rounded-2xl bg-white p-4 font-bold text-slate-500 shadow">
          Carregando movimentos...
        </p>
      )}

      <section className="grid gap-4">
        {!loading && transactions.length === 0 && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Nenhuma transação encontrada nesta visão.
          </p>
        )}

        {transactions.map((transaction) => {
          const entryType =
            transaction.transaction_type === "credito" ? "receita" : "despesa";
          const draft = drafts[transaction.id] ?? {
            categoryId: "",
            descriptionInternal: transaction.description,
            descriptionPublic: transaction.description,
            publicVisible: true,
          };
          const expanded = expandedId === transaction.id;
          const saving = savingId === transaction.id;

          return (
            <article
              key={transaction.id}
              className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        transaction.transaction_type === "credito"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {transaction.transaction_type === "credito"
                        ? "Crédito"
                        : "Débito"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {transaction.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h3 className="mt-3 break-words text-base font-black text-[#123D2C] sm:text-lg">
                    {transaction.description}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {dateLabel(transaction.transaction_date)}
                    {transaction.account_label
                      ? ` · ${transaction.account_label}`
                      : ""}
                  </p>
                </div>
                <p
                  className={`text-xl font-black ${
                    transaction.transaction_type === "credito"
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {money(transaction.amount)}
                </p>
              </div>

              {transaction.matchedEntry && (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-black">Lançamento conciliado</p>
                  <p className="mt-1 font-semibold">
                    {transaction.matchedEntry.description} · {dateLabel(transaction.matchedEntry.entryDate)}
                  </p>
                </div>
              )}

              {transaction.suggestions.length > 0 &&
                ["nao_conciliado", "sugerido"].includes(transaction.status) && (
                  <div className="mt-4 grid gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                      Sugestões de correspondência
                    </p>
                    {transaction.suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void action(transaction.id, {
                            action: "match",
                            entryId: suggestion.id,
                            confidence: suggestion.score,
                          })
                        }
                        className="flex w-full items-start justify-between gap-3 rounded-2xl bg-[#F7FAF2] p-4 text-left ring-1 ring-[#123D2C]/10 disabled:opacity-50"
                      >
                        <span>
                          <span className="block font-black text-[#123D2C]">
                            {suggestion.description}
                          </span>
                          <span className="mt-1 block text-xs font-semibold text-slate-500">
                            {dateLabel(suggestion.entryDate)} · {suggestion.category?.name || "Sem categoria"}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C]">
                          {suggestion.score}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}

              {["nao_conciliado", "sugerido"].includes(transaction.status) && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? "" : transaction.id)}
                    className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white"
                  >
                    {expanded ? "Fechar lançamento" : "Criar lançamento"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void action(transaction.id, {
                        action: "ignore",
                        justification: "Marcada como não financeira pela Tesouraria.",
                      })
                    }
                    className="rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700 disabled:opacity-50"
                  >
                    Ignorar movimento
                  </button>
                </div>
              )}

              {expanded && (
                <div className="mt-4 grid gap-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                  <label className="grid gap-2 font-black text-[#123D2C]">
                    Categoria
                    <select
                      value={draft.categoryId}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [transaction.id]: {
                            ...draft,
                            categoryId: event.target.value,
                          },
                        }))
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <option value="">Sem categoria</option>
                      {categoriesByType[entryType].map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.group_name} · {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 font-black text-[#123D2C]">
                    Descrição interna
                    <input
                      value={draft.descriptionInternal}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [transaction.id]: {
                            ...draft,
                            descriptionInternal: event.target.value,
                          },
                        }))
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    />
                  </label>
                  <label className="grid gap-2 font-black text-[#123D2C]">
                    Descrição pública
                    <input
                      value={draft.descriptionPublic}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [transaction.id]: {
                            ...draft,
                            descriptionPublic: event.target.value,
                          },
                        }))
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    />
                  </label>
                  <label className="flex items-start gap-3 rounded-2xl bg-white p-4 font-bold text-[#123D2C] ring-1 ring-slate-100">
                    <input
                      type="checkbox"
                      checked={draft.publicVisible}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [transaction.id]: {
                            ...draft,
                            publicVisible: event.target.checked,
                          },
                        }))
                      }
                      className="mt-1 h-5 w-5"
                    />
                    Permitir que este valor componha a prestação pública agregada.
                  </label>
                  <button
                    type="button"
                    disabled={saving || !draft.descriptionInternal.trim()}
                    onClick={() =>
                      void action(transaction.id, {
                        action: "createEntry",
                        ...draft,
                      })
                    }
                    className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
                  >
                    Criar e conciliar
                  </button>
                </div>
              )}

              {["conciliado", "ignorado"].includes(transaction.status) && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void action(transaction.id, { action: "reopen" })
                  }
                  className="mt-4 w-full rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700 disabled:opacity-50 sm:w-fit"
                >
                  Reabrir conciliação
                </button>
              )}
            </article>
          );
        })}
      </section>
    </OrganizacaoClientShell>
  );
}
