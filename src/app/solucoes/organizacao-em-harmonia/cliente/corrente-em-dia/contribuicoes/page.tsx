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

const statusLabels: Record<string, string> = {
  intencao_registrada: "Intenção registrada",
  aguardando_pagamento: "Aguardando pagamento",
  aguardando_comprovante: "Aguardando comprovante",
  aguardando_recepcao: "Aguardando Recepção",
  comprovante_enviado: "Comprovante enviado",
  em_revisao: "Em revisão",
  confirmado: "Confirmado",
  pago: "Pago",
  atrasado: "Em atraso",
  cancelado: "Cancelado",
};

const recurrenceLabels: Record<string, string> = {
  pontual: "Uma vez",
  pix_agendado: "Pix agendado",
  pix_automatico: "Pix Automático",
  cartao_recorrente: "Cartão recorrente",
  boleto_recorrente: "Boleto recorrente",
};

function money(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function CorrenteContribuicoesPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [query, setQuery] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia",
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(
        result.error || "Não foi possível carregar as contribuições.",
      );
    }
    setPayload(result);
  }, [token]);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar contribuições.",
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

  const peopleMap = useMemo(
    () =>
      new Map(
        (payload.people ?? []).map((person) => [
          person.id,
          person.full_name,
        ]),
      ),
    [payload.people],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return (payload.contributions ?? []).filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      const type =
        item.contribution_kind ||
        (item.recurrence_type && item.recurrence_type !== "pontual"
          ? "recorrente"
          : "pontual");
      if (typeFilter && type !== typeFilter) return false;

      if (normalizedQuery) {
        const personName =
          peopleMap.get(item.person_id ?? "") ||
          item.contributor_name ||
          (item.is_anonymous ? "não identificada" : "contribuinte");
        const haystack = normalize(
          [
            personName,
            item.contributor_email,
            item.contributor_whatsapp,
            item.payment_method,
            item.notes,
          ]
            .filter(Boolean)
            .join(" "),
        );
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [
    payload.contributions,
    peopleMap,
    query,
    statusFilter,
    typeFilter,
  ]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, item) => {
          const amount = Number(item.amount) || 0;
          acc.total += amount;
          if (["confirmado", "pago"].includes(item.status)) {
            acc.received += amount;
          } else if (item.status !== "cancelado") {
            acc.pending += amount;
          }
          if (item.is_anonymous) acc.anonymous += amount;
          return acc;
        },
        { total: 0, received: 0, pending: 0, anonymous: 0 },
      ),
    [filtered],
  );

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    setError("");
    setMessage("");
    try {
      const accessToken = await token();
      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia",
        {
          method: "POST",
          headers: {
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "updateContributionStatus",
            contributionId: id,
            status,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível atualizar.");
      }
      setMessage(result.message || "Contribuição atualizada.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao atualizar contribuição.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <OrganizacaoClientShell
      title="Contribuições sigilosas"
      description="A Tesouraria/Financeiro acompanha valores identificados ou não, contribuições pontuais e recorrentes. Nenhum dado individual é exposto no painel público."
    >
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Total filtrado", totals.total, "text-[#123D2C]"],
          ["Recebido", totals.received, "text-emerald-700"],
          ["Pendente", totals.pending, "text-amber-700"],
          ["Não identificado", totals.anonymous, "text-slate-700"],
        ].map(([label, value, tone]) => (
          <article
            key={String(label)}
            className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
              {String(label)}
            </p>
            <p className={`mt-2 text-xl font-black ${String(tone)}`}>
              {money(Number(value))}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold md:col-span-2"
            placeholder="Buscar por nome, WhatsApp ou e-mail"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold"
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold"
          >
            <option value="">Pontual e recorrente</option>
            <option value="pontual">Pontual</option>
            <option value="recorrente">Recorrente</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("");
              setTypeFilter("");
            }}
            className="rounded-full bg-[#E9F2E7] px-4 py-2 text-sm font-black text-[#123D2C]"
          >
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
          >
            Imprimir visão
          </button>
        </div>

        {loading && (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
            Carregando...
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
            {message}
          </p>
        )}

        <div className="mt-5 grid gap-3">
          {filtered.map((item) => {
            const personName =
              peopleMap.get(item.person_id ?? "") ||
              item.contributor_name ||
              (item.is_anonymous
                ? "Contribuição não identificada"
                : "Contribuinte");
            const recurring =
              item.contribution_kind === "recorrente" ||
              Boolean(
                item.recurrence_type &&
                  item.recurrence_type !== "pontual",
              );
            return (
              <article
                key={item.id}
                className="rounded-[1.5rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                        {item.is_anonymous ? "Contribuição anônima" : "Identificada"}
                      </span>
                      {item.status === "aguardando_comprovante" && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 ring-1 ring-amber-200">
                          Aguardando upload do comprovante
                        </span>
                      )}
                      <span className="rounded-full bg-[#E9F2E7] px-3 py-1 text-xs font-black text-[#123D2C]">
                        {recurring ? "Recorrente" : "Pontual"}
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-black text-[#00334E]">
                      {personName}
                    </h2>
                    {!item.is_anonymous && (
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {[item.contributor_whatsapp, item.contributor_email]
                          .filter(Boolean)
                          .join(" · ") || "Sem contato informado"}
                      </p>
                    )}
                  </div>
                  <p className="text-2xl font-black text-[#123D2C]">
                    {money(item.amount)}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="font-black text-[#2F6B43]">Vencimento</p>
                    <p className="mt-1 font-semibold text-slate-700">
                      {date(item.due_date)}
                    </p>
                  </div>
                  <div>
                    <p className="font-black text-[#2F6B43]">Forma</p>
                    <p className="mt-1 font-semibold text-slate-700">
                      {item.payment_method || "Não informada"}
                    </p>
                  </div>
                  <div>
                    <p className="font-black text-[#2F6B43]">Frequência</p>
                    <p className="mt-1 font-semibold text-slate-700">
                      {recurrenceLabels[item.recurrence_type ?? "pontual"] ||
                        item.recurrence_type ||
                        "Uma vez"}
                    </p>
                  </div>
                  <div>
                    <p className="font-black text-[#2F6B43]">Situação</p>
                    <p className="mt-1 font-semibold text-slate-700">
                      {statusLabels[item.status] || item.status}
                    </p>
                  </div>
                </div>

                {item.recurrence_type === "pix_agendado" && (
                  <div className="mt-3 grid gap-2 rounded-2xl bg-white p-3 text-sm ring-1 ring-[#123D2C]/10 sm:grid-cols-2">
                    <div>
                      <p className="font-black text-[#2F6B43]">Primeira contribuição</p>
                      <p className="mt-1 font-semibold text-slate-700">
                        {date(item.recurrence_start_date)}
                      </p>
                    </div>
                    <div>
                      <p className="font-black text-[#2F6B43]">Programação</p>
                      <p className="mt-1 font-semibold text-slate-700">
                        {item.recurrence_occurrences
                          ? `${item.recurrence_occurrences} contribuições planejadas`
                          : "Quantidade não informada"}
                      </p>
                    </div>
                  </div>
                )}

                {item.notes && (
                  <p className="mt-3 rounded-2xl bg-white p-3 text-sm leading-6 text-slate-600">
                    {item.notes}
                  </p>
                )}

                {payload.canManage && item.status !== "confirmado" && item.status !== "pago" && item.status !== "cancelado" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => updateStatus(item.id, "confirmado")}
                      className="rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      Confirmar recebimento
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => updateStatus(item.id, "em_revisao")}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-60"
                    >
                      Marcar em revisão
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {!loading && filtered.length === 0 && (
            <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
              Nenhuma contribuição encontrada.
            </p>
          )}
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}
