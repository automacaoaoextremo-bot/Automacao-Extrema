"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PAGE_PATH = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/consultar-agendamentos";
const ATTENDANCE_PATH = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento";

type Appointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  bookingChannel: string;
  order: number | null;
  person: { id: string | null; fullName: string; whatsapp: string; email: string };
  entity: { id: string | null; name: string };
};

type EntityOption = {
  id: string;
  name: string;
};

type Payload = {
  appointments?: Appointment[];
  entities?: EntityOption[];
  range?: string;
  today?: string;
  page?: number;
  total?: number;
  totalPages?: number;
  error?: string;
  requestId?: string;
  capabilities?: {
    scope: "manage" | "read_all" | "linked_entities";
    canRead: boolean;
    canEdit: boolean;
    canCancel: boolean;
    canDelete: boolean;
  };
};

type Range = "upcoming" | "today" | "previous";
type GroupBy = "date" | "entity";

type EditDraft = {
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  entityId: string;
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value || "Não informado";
}

function longDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    confirmado: "Confirmado",
    solicitado: "Solicitado",
    aprovado: "Aprovado",
    presente: "Presente",
    concluido: "Concluído",
    cancelado: "Cancelado",
    cancelamento_solicitado: "Cancelamento solicitado",
    ausente: "Ausente",
  };
  return labels[value] || value || "Não informado";
}

function channelLabel(value: string) {
  const labels: Record<string, string> = {
    recepcao: "Recepção",
    consulente: "Consulente",
    site: "Site",
  };
  return labels[value] || value || "Consulente";
}

async function accessToken() {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  return token;
}

export default function ConsultarAgendamentosRecepcaoPage() {
  const [range, setRange] = useState<Range>("upcoming");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [entityId, setEntityId] = useState("");
  const [status, setStatus] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const load = useCallback(async (
    openResults = true,
    overrides: Partial<{ range: Range; page: number; submittedQuery: string; entityId: string; status: string }> = {},
  ) => {
    setLoading(true);
    setError("");
    setMessage("");
    const token = await accessToken();
    const nextRange = overrides.range ?? range;
    const nextPage = overrides.page ?? page;
    const nextQuery = overrides.submittedQuery ?? submittedQuery;
    const nextEntityId = overrides.entityId ?? entityId;
    const nextStatus = overrides.status ?? status;
    const params = new URLSearchParams({ range: nextRange, page: String(nextPage), pageSize: "4" });
    if (nextQuery) params.set("q", nextQuery);
    if (nextEntityId) params.set("entityId", nextEntityId);
    if (nextStatus) params.set("status", nextStatus);

    const response = await fetch(`/api/organizacao-em-harmonia/filhos-corrente/recepcao-agendamentos?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível consultar os agendamentos.");
    setPayload(result);
    if (openResults) setResultsOpen(true);
  }, [entityId, page, range, status, submittedQuery]);

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      void load(false)
        .catch((reason) => {
          if (active) setError(reason instanceof Error ? reason.message : "Erro ao carregar os filtros.");
        })
        .finally(() => {
          if (active) {
            setInitialLoading(false);
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  useEffect(() => {
    if (!resultsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [resultsOpen]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    for (const appointment of payload?.appointments ?? []) {
      const key = groupBy === "entity"
        ? `${appointment.entity.id ?? "sem-entidade"}::${appointment.entity.name}`
        : `${appointment.appointmentDate}::${appointment.appointmentTime}`;
      groups.set(key, [...(groups.get(key) ?? []), appointment]);
    }
    return Array.from(groups.entries());
  }, [groupBy, payload?.appointments]);

  async function runSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const nextQuery = query.trim();
    setPage(1);
    setSubmittedQuery(nextQuery);
    try {
      await load(true, { page: 1, submittedQuery: nextQuery });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao consultar agendamentos.");
      setResultsOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function changeRange(nextRange: Range) {
    setRange(nextRange);
    setPage(1);
    setLoading(true);
    window.setTimeout(() => {
      void load(true, { range: nextRange, page: 1 })
        .catch((reason) => setError(reason instanceof Error ? reason.message : "Erro ao consultar agendamentos."))
        .finally(() => setLoading(false));
    }, 0);
  }

  async function changePage(nextPage: number) {
    setPage(nextPage);
    setLoading(true);
    window.setTimeout(() => {
      void load(true, { page: nextPage })
        .catch((reason) => setError(reason instanceof Error ? reason.message : "Erro ao consultar agendamentos."))
        .finally(() => setLoading(false));
    }, 0);
  }

  async function mutateAppointment(method: "PATCH" | "DELETE", body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await accessToken();
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/recepcao-agendamentos", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o agendamento.");
      const successMessage = method === "DELETE"
        ? "Agendamento excluído definitivamente."
        : body.action === "cancel"
          ? "Agendamento cancelado e preservado no histórico."
          : "Agendamento atualizado.";
      setEditDraft(null);
      await load(true);
      setMessage(successMessage);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao atualizar o agendamento.");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }

  function startEdit(appointment: Appointment) {
    setEditDraft({
      appointmentId: appointment.id,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      entityId: appointment.entity.id ?? "",
    });
  }

  function cancelAppointment(appointment: Appointment) {
    const reason = window.prompt(`Informe o motivo do cancelamento de ${appointment.person.fullName}:`, "Cancelado pela Recepção.") ?? "";
    if (!reason.trim()) return;
    if (!window.confirm("Confirmar o cancelamento? O registro permanecerá no histórico.")) return;
    void mutateAppointment("PATCH", { action: "cancel", appointmentId: appointment.id, reason });
  }

  function deleteAppointment(appointment: Appointment) {
    const firstConfirmation = window.confirm(
      `Excluir o agendamento de ${appointment.person.fullName}?\n\nExcluir é uma ação definitiva e não pode ser desfeita.`,
    );
    if (!firstConfirmation) return;
    const typed = window.prompt("Para confirmar a exclusão definitiva, digite EXCLUIR:");
    if (typed?.trim().toUpperCase() !== "EXCLUIR") return;
    void mutateAppointment("DELETE", { appointmentId: appointment.id, confirmation: "EXCLUIR" });
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Consulta de agendamentos"
        showSupport={false}
        actions={[
          { label: "Voltar", href: ATTENDANCE_PATH, variant: "secondary" },
          { label: "Consultas", href: PAGE_PATH, variant: "primary" },
        ]}
      />

      <section className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">Consulta de Agendamentos</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#EEF7EA]">
            {payload?.capabilities?.scope === "manage"
              ? "Recepção: consulta e gestão completa dos agendamentos."
              : payload?.capabilities?.scope === "linked_entities"
                ? "Cavalinho: consulta somente dos atendimentos destinados às entidades vinculadas ao seu cadastro."
                : "Cambono: consulta geral em modo somente leitura."}
          </p>
        </header>

        <section className="mt-4 rounded-[2rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
          <form onSubmit={(event) => void runSearch(event)} className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-black text-[#123D2C] md:col-span-2">
              Nome ou WhatsApp
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex.: Antonio ou 993194222"
                className="min-h-12 rounded-2xl border border-slate-200 px-4 text-base font-semibold outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Entidade
              <select value={entityId} onChange={(event) => setEntityId(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-3 font-semibold">
                <option value="">Todas</option>
                {(payload?.entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Situação
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-3 font-semibold">
                <option value="">Todas</option>
                <option value="confirmado">Confirmado</option>
                <option value="solicitado">Solicitado</option>
                <option value="presente">Presente</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C] md:col-span-2">
              Agrupar resultados por
              <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupBy)} className="min-h-12 rounded-2xl border border-slate-200 px-3 font-semibold">
                <option value="date">Data e período</option>
                <option value="entity">Entidade</option>
              </select>
            </label>
            <button type="submit" disabled={initialLoading || loading} className="min-h-12 rounded-2xl bg-[#123D2C] px-5 font-black text-white disabled:opacity-60 md:col-span-2">
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </form>
          {error && !resultsOpen && <p className="mt-3 rounded-2xl bg-red-50 p-3 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
        </section>
      </section>

      {resultsOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Resultados da consulta de agendamentos">
          <section className="flex h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Consulta</p>
                <h2 className="truncate text-xl font-black text-[#123D2C]">Resultados da consulta</h2>
              </div>
              <button type="button" onClick={() => setResultsOpen(false)} className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-2 font-black text-white">Fechar</button>
            </header>

            <div className="shrink-0 border-b border-slate-100 p-3">
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => void changeRange("upcoming")} className={`rounded-2xl px-2 py-2 text-sm font-black ${range === "upcoming" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Próximos</button>
                <button type="button" onClick={() => void changeRange("today")} className={`rounded-2xl px-2 py-2 text-sm font-black ${range === "today" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Hoje</button>
                <button type="button" onClick={() => void changeRange("previous")} className={`rounded-2xl px-2 py-2 text-sm font-black ${range === "previous" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Anteriores</button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[#123D2C]">{payload?.total ?? 0} agendamento(s)</p>
                {range !== "previous" && (
                  <button type="button" onClick={() => void changeRange("previous")} className="text-xs font-black text-[#2F6B43] underline underline-offset-4">
                    Consultar agendamentos anteriores
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {loading && <p className="rounded-2xl bg-[#F7FAF2] p-4 text-center font-bold text-slate-600">Carregando...</p>}
              {error && <p className="rounded-2xl bg-red-50 p-3 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
              {message && <p className="mb-3 rounded-2xl bg-emerald-50 p-3 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

              {!loading && !error && (
                <div className="grid gap-3">
                  {grouped.map(([key, appointments]) => {
                    const [first, second] = key.split("::");
                    const title = groupBy === "entity" ? second : longDate(first);
                    const subtitle = groupBy === "entity" ? `${appointments.length} agendamento(s)` : second;
                    return (
                      <article key={key} className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-[#123D2C]/10">
                        <header className="bg-[#E9F2E7] px-3 py-2">
                          <h3 className="font-black capitalize text-[#123D2C]">{title}</h3>
                          <p className="text-xs font-bold text-[#2F6B43]">{subtitle}</p>
                        </header>
                        <div className="grid gap-2 p-2">
                          {appointments.map((appointment) => (
                            <div key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="break-words font-black text-[#123D2C]">{appointment.person.fullName}</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-600">{formatPhone(appointment.person.whatsapp)}</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                                  Ordem {appointment.order ?? "a confirmar"}
                                </span>
                              </div>
                              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-700">
                                {groupBy === "entity" && <p><span className="font-black text-[#2F6B43]">Quando:</span> {longDate(appointment.appointmentDate)} · {appointment.appointmentTime}</p>}
                                {groupBy === "date" && <p><span className="font-black text-[#2F6B43]">Entidade:</span> {appointment.entity.name}</p>}
                                <p><span className="font-black text-[#2F6B43]">Situação:</span> {statusLabel(appointment.status)} · {channelLabel(appointment.bookingChannel)}</p>
                              </div>
                              {(payload?.capabilities?.canEdit || payload?.capabilities?.canCancel || payload?.capabilities?.canDelete) && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  {payload?.capabilities?.canEdit && <button type="button" disabled={saving || appointment.status === "cancelado"} onClick={() => startEdit(appointment)} className="rounded-xl bg-white px-2 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Editar</button>}
                                  {payload?.capabilities?.canCancel && <button type="button" disabled={saving || appointment.status === "cancelado"} onClick={() => cancelAppointment(appointment)} className="rounded-xl bg-amber-50 px-2 py-2 text-xs font-black text-amber-900 ring-1 ring-amber-100 disabled:opacity-40">Cancelar</button>}
                                  {payload?.capabilities?.canDelete && <button type="button" disabled={saving} onClick={() => deleteAppointment(appointment)} className="rounded-xl bg-red-50 px-2 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 disabled:opacity-40">Excluir</button>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                  {grouped.length === 0 && <p className="rounded-[1.5rem] bg-[#F7FAF2] p-5 text-center font-bold text-slate-500">Nenhum agendamento encontrado.</p>}
                </div>
              )}
            </div>

            {(payload?.totalPages ?? 0) > 1 && (
              <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-100 p-3">
                <button type="button" disabled={page <= 1 || loading} onClick={() => void changePage(Math.max(1, page - 1))} className="rounded-xl bg-[#F7FAF2] px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 disabled:opacity-40">Anterior</button>
                <span className="text-xs font-black text-[#123D2C]">{page}/{payload?.totalPages}</span>
                <button type="button" disabled={page >= (payload?.totalPages ?? 1) || loading} onClick={() => void changePage(page + 1)} className="rounded-xl bg-[#F7FAF2] px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 disabled:opacity-40">Próxima</button>
              </footer>
            )}
          </section>
        </div>
      )}

      {editDraft && payload?.capabilities?.canEdit && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#10251C]/80 p-3" role="dialog" aria-modal="true" aria-label="Editar agendamento">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void mutateAppointment("PATCH", { action: "edit", ...editDraft });
            }}
            className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[#123D2C]">Editar agendamento</h2>
              <button type="button" onClick={() => setEditDraft(null)} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-[#123D2C]">Fechar</button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Data
                <input type="date" value={editDraft.appointmentDate} onChange={(event) => setEditDraft({ ...editDraft, appointmentDate: event.target.value })} className="min-h-12 rounded-2xl border border-slate-200 px-3 font-semibold" required />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Período
                <input value={editDraft.appointmentTime} onChange={(event) => setEditDraft({ ...editDraft, appointmentTime: event.target.value })} className="min-h-12 rounded-2xl border border-slate-200 px-3 font-semibold" required />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Entidade
                <select value={editDraft.entityId} onChange={(event) => setEditDraft({ ...editDraft, entityId: event.target.value })} className="min-h-12 rounded-2xl border border-slate-200 px-3 font-semibold" required>
                  <option value="">Escolha</option>
                  {(payload?.entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </select>
              </label>
              <button type="submit" disabled={saving} className="min-h-12 rounded-2xl bg-[#123D2C] px-5 font-black text-white disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar alteração"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
