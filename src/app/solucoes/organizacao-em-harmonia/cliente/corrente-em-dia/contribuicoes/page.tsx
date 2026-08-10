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

type Summary = {
  intent: number;
  proofSent: number;
  pendingConfirmation: number;
  confirmed: number;
};

const FINAL_STATUSES = ["confirmado", "aprovado", "pago", "cancelado"];

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  recepcao: "Cartão de Crédito, Débito ou Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  dinheiro: "Dinheiro",
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

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function firstLastName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "Contribuinte";
  return `${parts[0]} ${parts.at(-1)}`;
}

function monthlyDates(startDate: string, occurrences: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || occurrences <= 1) {
    return [startDate].filter(Boolean);
  }

  const [year, month, day] = startDate.split("-").map(Number);
  const values: string[] = [];

  for (let index = 0; index < occurrences; index += 1) {
    const absoluteMonth = month - 1 + index;
    const targetYear = year + Math.floor(absoluteMonth / 12);
    const targetMonth = ((absoluteMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    values.push(
      `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(
        Math.min(day, lastDay),
      ).padStart(2, "0")}`,
    );
  }

  return values;
}

function asDates(item: Contribution) {
  const raw = item.metadata?.scheduledDates;
  if (Array.isArray(raw)) {
    const values = raw.filter(
      (value): value is string =>
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value),
    );
    if (values.length > 0) return [...new Set(values)].sort();
  }

  const recurring =
    item.recurrence_type === "pix_agendado" ||
    Number(item.recurrence_occurrences) > 1;
  const start =
    item.recurrence_start_date?.slice(0, 10) || item.due_date?.slice(0, 10) || "";
  const occurrences = Math.max(1, Number(item.recurrence_occurrences) || 1);

  if (recurring && start) {
    return monthlyDates(start, occurrences);
  }

  return [item.due_date].filter(Boolean);
}

function competencyCount(item: Contribution) {
  return Math.max(1, asDates(item).length);
}

function stage(status: string) {
  if (["confirmado", "aprovado", "pago"].includes(status)) return "confirmed";
  if (["em_revisao", "reprovado"].includes(status)) return "pendingConfirmation";
  if (status === "comprovante_enviado") return "proofSent";
  if (
    [
      "intencao_registrada",
      "aguardando_pagamento",
      "aguardando_comprovante",
      "aguardando_recepcao",
      "atrasado",
      "programado",
    ].includes(status)
  ) {
    return "intent";
  }
  return "other";
}

function isOverdue(item: Contribution) {
  if (FINAL_STATUSES.includes(item.status)) return false;
  const today = todayIso();
  return asDates(item).some((value) => value.slice(0, 10) < today);
}

function statusKey(item: Contribution) {
  if (isOverdue(item)) return "atrasado";
  if (["confirmado", "aprovado", "pago"].includes(item.status)) return "confirmado";
  if (item.status === "reprovado") return "reprovado";
  if (item.status === "em_revisao") return "pendente_confirmacao";
  if (item.status === "comprovante_enviado") return "comprovante_enviado";
  if (item.status === "cancelado") return "cancelado";
  if (
    [
      "intencao_registrada",
      "aguardando_pagamento",
      "aguardando_comprovante",
      "aguardando_recepcao",
      "programado",
    ].includes(item.status)
  ) {
    return "aguardando";
  }
  return item.status;
}

function statusLabel(item: Contribution) {
  const key = statusKey(item);
  const labels: Record<string, string> = {
    aguardando: "Aguardando pagamento/envio do comprovante",
    comprovante_enviado: "Comprovante enviado",
    pendente_confirmacao: "Pendente confirmação",
    confirmado: "Confirmado",
    reprovado: "Reprovado / pendente",
    atrasado: "Em atraso",
    cancelado: "Cancelado",
  };
  return labels[key] || item.status;
}

function whatsappHref(number: string, message: string) {
  let digits = number.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : "";
}

function emailHref(email: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export default function CorrenteContribuicoesPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [selected, setSelected] = useState<Contribution | null>(null);
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
        (payload.people ?? []).map((person) => [person.id, person.full_name]),
      ),
    [payload.people],
  );

  const ordered = useMemo(
    () =>
      [...(payload.contributions ?? [])].sort((left, right) =>
        left.due_date.localeCompare(right.due_date),
      ),
    [payload.contributions],
  );

  const summary = useMemo<Summary>(
    () =>
      ordered.reduce(
        (acc, item) => {
          const count = competencyCount(item);
          const itemStage = stage(item.status);
          // Intenção Registrada representa todas as competências ativas já registradas,
          // independentemente de o fluxo ter avançado para comprovante/confirmação.
          if (item.status !== "cancelado") acc.intent += count;
          if (itemStage === "proofSent") acc.proofSent += count;
          if (itemStage === "pendingConfirmation")
            acc.pendingConfirmation += count;
          if (itemStage === "confirmed") acc.confirmed += count;
          return acc;
        },
        {
          intent: 0,
          proofSent: 0,
          pendingConfirmation: 0,
          confirmed: 0,
        },
      ),
    [ordered],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);

    return ordered.filter((item) => {
      const derivedStatus = statusKey(item);
      if (
        statusFilter === "pendencias" &&
        ![
          "aguardando",
          "comprovante_enviado",
          "pendente_confirmacao",
          "reprovado",
          "atrasado",
        ].includes(derivedStatus)
      ) {
        return false;
      }
      if (
        statusFilter &&
        statusFilter !== "pendencias" &&
        derivedStatus !== statusFilter
      ) {
        return false;
      }

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
            statusLabel(item),
          ]
            .filter(Boolean)
            .join(" "),
        );
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [ordered, peopleMap, query, statusFilter, typeFilter]);

  async function postAction(body: Record<string, unknown>) {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia",
      {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
      throw new Error(result.error || "Não foi possível atualizar.");
    }
    return result;
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    setError("");
    setMessage("");
    try {
      const result = await postAction({
        action: "updateContributionStatus",
        contributionId: id,
        status,
      });
      setMessage(result.message || "Contribuição atualizada.");
      setSelected(null);
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

  async function cancelContribution(id: string) {
    if (
      !window.confirm(
        "Excluir esta contribuição/programação ainda não validada?",
      )
    ) {
      return;
    }

    setUpdatingId(id);
    setError("");
    setMessage("");
    try {
      const result = await postAction({
        action: "cancelContribution",
        contributionId: id,
      });
      setMessage(result.message || "Contribuição excluída.");
      setSelected(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao excluir contribuição.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  function personName(item: Contribution) {
    const fullName =
      peopleMap.get(item.person_id ?? "") ||
      item.contributor_name ||
      (item.is_anonymous ? "Contribuição anônima" : "Contribuinte");
    return item.is_anonymous ? fullName : firstLastName(fullName);
  }

  function reminderMessage(item: Contribution) {
    const dates = asDates(item).map(date).join(", ");
    return [
      `Olá, ${personName(item)}.`,
      "Aqui é a Tesouraria/Financeiro do Tucxa.",
      `Sua contribuição de ${money(item.amount)} está como "${statusLabel(item)}".`,
      `Data(s): ${dates}.`,
      "Se o pagamento já foi realizado, por favor inclua o comprovante no Corrente em Dia. Se ainda não foi realizado, o próprio sistema apresenta as orientações de pagamento.",
    ].join("\n");
  }

  return (
    <OrganizacaoClientShell
      title="Acompanhamento de Contribuições"
      simpleFinancialHeader
      simpleFinancialActive="inicio"
    >
      <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {[
          ["Intenção Registrada", summary.intent],
          ["Comprovante enviado", summary.proofSent],
          ["Pendente Confirmação", summary.pendingConfirmation],
          ["Confirmado", summary.confirmed],
        ].map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-2xl bg-white p-3 shadow ring-1 ring-slate-100 sm:p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-xs">
              {String(label)}
            </p>
            <p className="mt-1 text-2xl font-black text-[#123D2C]">
              {Number(value)}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-slate-100 sm:p-5">
        <div className="grid gap-2 md:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white p-2.5 font-semibold md:col-span-2"
            placeholder="Buscar por nome, WhatsApp ou e-mail"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white p-2.5 font-semibold"
          >
            <option value="pendencias">Pendências</option>
            <option value="">Todos os status</option>
            <option value="aguardando">
              Aguardando pagamento/envio do comprovante
            </option>
            <option value="comprovante_enviado">Comprovante enviado</option>
            <option value="pendente_confirmacao">Pendente confirmação</option>
            <option value="reprovado">Reprovado / pendente</option>
            <option value="atrasado">Em atraso</option>
            <option value="confirmado">Confirmado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white p-2.5 font-semibold"
          >
            <option value="">Pontual e recorrente</option>
            <option value="pontual">Pontual</option>
            <option value="recorrente">Recorrente</option>
          </select>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("pendencias");
              setTypeFilter("");
            }}
            className="rounded-full bg-[#E9F2E7] px-4 py-2 text-sm font-black text-[#123D2C]"
          >
            Restaurar pendências
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
          >
            Imprimir
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

        <div className="mt-4 grid gap-2">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)_auto] sm:gap-3"
            >
              <div className="min-w-0">
                <p className="truncate font-black text-[#00334E]">
                  {personName(item)}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500 sm:hidden">
                  {statusLabel(item)}
                </p>
              </div>
              <p className="hidden text-sm font-black text-[#2F6B43] sm:block">
                {statusLabel(item)}
              </p>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white sm:text-sm"
              >
                Acompanhar
              </button>
            </article>
          ))}

          {!loading && filtered.length === 0 && (
            <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">
              Nenhuma contribuição encontrada para os filtros selecionados.
            </p>
          )}
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-3"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="contribution-detail-title"
            className="max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:rounded-[2rem] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                  Corrente em Dia
                </p>
                <h2
                  id="contribution-detail-title"
                  className="mt-1 text-xl font-black text-[#123D2C] sm:text-2xl"
                >
                  Acompanhar contribuição
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white"
              >
                Fechar
              </button>
            </div>

            <div className="mt-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-[#00334E]">
                    {personName(selected)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#2F6B43]">
                    {statusLabel(selected)}
                  </p>
                </div>
                <p className="shrink-0 text-xl font-black text-[#123D2C]">
                  {money(selected.amount)}
                </p>
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-[#2F6B43]">
                    Data(s)
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {asDates(selected).map(date).join(" · ")}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-[#2F6B43]">
                    Forma
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {paymentLabels[selected.payment_method ?? ""] ||
                      selected.payment_method ||
                      "Não informada"}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-[#2F6B43]">
                    Comprovante
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {selected.receipt_uploaded_at || selected.proof_url
                      ? "Enviado"
                      : "Pendente"}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-black uppercase text-[#2F6B43]">
                    Competências
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {competencyCount(selected)}
                  </p>
                </div>
              </div>

              {selected.notes && (
                <p className="mt-2 rounded-xl bg-white p-3 text-sm leading-5 text-slate-600">
                  {selected.notes}
                </p>
              )}
            </div>

            {!selected.is_anonymous &&
              ["aguardando", "atrasado"].includes(statusKey(selected)) &&
              (selected.contributor_whatsapp || selected.contributor_email) && (
                <div className="mt-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
                  <p className="font-black text-amber-950">
                    Sinalizar comprovante/pagamento pendente
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-amber-900/80">
                    As opções aparecem somente para contribuições identificadas com
                    contato informado.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {selected.contributor_whatsapp ? (
                      <a
                        href={whatsappHref(
                          selected.contributor_whatsapp,
                          reminderMessage(selected),
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#25D366] px-3 py-2.5 text-center text-sm font-black text-white"
                      >
                        WhatsApp
                      </a>
                    ) : (
                      <span className="rounded-xl bg-white px-3 py-2.5 text-center text-sm font-black text-slate-400">
                        Sem WhatsApp
                      </span>
                    )}
                    {selected.contributor_email ? (
                      <a
                        href={emailHref(
                          selected.contributor_email,
                          "Tucxa — contribuição pendente",
                          reminderMessage(selected),
                        )}
                        className="rounded-xl bg-[#123D2C] px-3 py-2.5 text-center text-sm font-black text-white"
                      >
                        E-mail
                      </a>
                    ) : (
                      <span className="rounded-xl bg-white px-3 py-2.5 text-center text-sm font-black text-slate-400">
                        Sem e-mail
                      </span>
                    )}
                  </div>
                </div>
              )}

            {payload.canManage &&
              !FINAL_STATUSES.includes(selected.status) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {["comprovante_enviado", "em_revisao", "reprovado"].includes(
                    selected.status,
                  ) && (
                    <button
                      type="button"
                      disabled={updatingId === selected.id}
                      onClick={() =>
                        void updateStatus(selected.id, "confirmado")
                      }
                      className="rounded-xl bg-[#123D2C] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                    >
                      Confirmar
                    </button>
                  )}
                  {["comprovante_enviado", "em_revisao"].includes(
                    selected.status,
                  ) && (
                    <button
                      type="button"
                      disabled={updatingId === selected.id}
                      onClick={() =>
                        void updateStatus(selected.id, "reprovado")
                      }
                      className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-900 ring-1 ring-amber-200 disabled:opacity-60"
                    >
                      Reprovar / pendente
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={updatingId === selected.id}
                    onClick={() => void cancelContribution(selected.id)}
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-red-700 ring-1 ring-red-200 disabled:opacity-60 sm:col-span-2"
                  >
                    Excluir
                  </button>
                </div>
              )}
          </section>
        </div>
      )}
    </OrganizacaoClientShell>
  );
}
