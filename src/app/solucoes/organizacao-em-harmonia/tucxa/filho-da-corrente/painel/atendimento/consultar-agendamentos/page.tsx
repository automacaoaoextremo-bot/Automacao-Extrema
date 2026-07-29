"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoSignOutAction,
  filhoSupportAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const atendimentoPath = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento";
const agendamentosPath = `${atendimentoPath}/agendamentos`;
const loginPath = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
const voltarParaConsultaHref = `${atendimentoPath}?consulta=agendamentos`;

type Appointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  bookingChannel: string;
  order: number | null;
  person: { id: string | null; fullName: string; whatsapp: string; email: string };
  entity: { id: string | null; name: string };
  access: {
    kind: "appointment" | "attendance";
    isOwn: boolean;
    mode: "manage" | "self" | "read_only";
    canEdit: boolean;
    canCancel: boolean;
    canDelete: boolean;
    editBlockedReason: string;
  };
};

type EntityOption = {
  id: string;
  name: string;
};

type Payload = {
  appointments?: Appointment[];
  entities?: EntityOption[];
  range?: string;
  view?: "all" | "appointments" | "attendances";
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
type AppointmentView = "all" | "appointments" | "attendances";
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
    filho_corrente: "Filho da Corrente",
    site: "Site",
  };
  return labels[value] || value || "Consulente";
}

function whatsappConversationUrl(appointment: Appointment) {
  const digits = appointment.person.whatsapp.replace(/\D/g, "");
  if (!digits) return "";
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const subject = appointment.access.isOwn ? "agendamento" : "atendimento";
  const message = [
    `Olá, ${appointment.person.fullName}.`,
    "",
    `Estou entrando em contato sobre seu ${subject} no TUCXA:`,
    `Data: ${longDate(appointment.appointmentDate)}`,
    `Período: ${appointment.appointmentTime}`,
    `Entidade: ${appointment.entity.name}`,
    `Situação: ${statusLabel(appointment.status)}`,
    appointment.order ? `Ordem prevista: ${appointment.order}` : "",
    "",
    "Podemos prosseguir por aqui?",
  ].filter(Boolean).join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function redirectToLogin() {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(`${loginPath}?returnTo=${encodeURIComponent(returnTo)}`);
}

async function accessToken() {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    redirectToLogin();
    throw new Error("Sessão expirada. Entre novamente.");
  }
  return token;
}

export default function ConsultarAgendamentosRecepcaoPage() {
  const [range, setRange] = useState<Range>("upcoming");
  const [view, setView] = useState<AppointmentView>("all");
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
    overrides: Partial<{ range: Range; view: AppointmentView; page: number; submittedQuery: string; entityId: string; status: string }> = {},
  ) => {
    setLoading(true);
    setError("");
    setMessage("");
    const token = await accessToken();
    const nextRange = overrides.range ?? range;
    const nextView = overrides.view ?? view;
    const nextPage = overrides.page ?? page;
    const nextQuery = overrides.submittedQuery ?? submittedQuery;
    const nextEntityId = overrides.entityId ?? entityId;
    const nextStatus = overrides.status ?? status;
    const params = new URLSearchParams({ range: nextRange, view: nextView, page: String(nextPage), pageSize: "4" });
    if (nextQuery) params.set("q", nextQuery);
    if (nextEntityId) params.set("entityId", nextEntityId);
    if (nextStatus) params.set("status", nextStatus);

    const response = await fetch(`/api/organizacao-em-harmonia/filhos-corrente/recepcao-agendamentos?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json().catch(() => ({}))) as Payload;
    if (response.status === 401) {
      redirectToLogin();
      throw new Error("Sessão expirada. Entre novamente.");
    }
    if (!response.ok) throw new Error(result.error || "Não foi possível consultar os agendamentos.");
    setPayload(result);
    if (result.view) setView(result.view);
    if (openResults) setResultsOpen(true);
  }, [entityId, page, range, status, submittedQuery, view]);

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

  async function changeView(nextView: AppointmentView) {
    setView(nextView);
    setEntityId("");
    setPage(1);
    setLoading(true);
    window.setTimeout(() => {
      void load(true, { view: nextView, entityId: "", page: 1 })
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

  async function deleteOwnAppointment(appointment: Appointment) {
    if (!window.confirm("Excluir este agendamento? A vaga será liberada e o histórico será preservado.")) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await accessToken();
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "cancel-self", appointmentId: appointment.id }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (response.status === 401) {
        redirectToLogin();
        throw new Error("Sessão expirada. Entre novamente.");
      }
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir o seu agendamento.");
      setMessage(result.message || "Agendamento excluído. A vaga foi liberada.");
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir o seu agendamento.");
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
          { label: "Início", href: "#inicio", variant: "primary" },
          { label: "Voltar", href: voltarParaConsultaHref, variant: "secondary" },
          filhoSupportAction,
          filhoSignOutAction,
        ]}
      />

      <section id="inicio" className="mx-auto max-w-4xl scroll-mt-36 px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <header className="rounded-[1.5rem] bg-[#123D2C] p-4 text-white shadow-xl sm:rounded-[2rem] sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight sm:text-3xl">Consulta de Agendamentos</h1>
          <p className="mt-1.5 text-sm font-semibold leading-5 text-[#EEF7EA] sm:leading-6">
            {payload?.capabilities?.scope === "manage"
              ? "Recepção: consulta e gestão completa de todos os agendamentos, inclusive os próprios."
              : payload?.capabilities?.scope === "linked_entities"
                ? "Cavalinho: seus Agendamentos possuem gestão própria; os Atendimentos da entidade vinculada ficam em modo somente leitura."
                : "Cambono: consulta todos em modo somente leitura e pode gerir somente os próprios agendamentos."}
          </p>
        </header>

        <section className="mt-3 rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-[#123D2C]/10 sm:mt-4 sm:rounded-[2rem] sm:p-5">
          <form onSubmit={(event) => void runSearch(event)} className="grid gap-2.5 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-black text-[#123D2C] md:col-span-2">
              Nome, WhatsApp ou Entidade
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex.: Antonio, 993194222 ou Caboclo"
                className="min-h-10 rounded-xl border border-slate-200 px-3 text-base font-semibold outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Entidade
              <select value={entityId} onChange={(event) => setEntityId(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 px-3 font-semibold">
                <option value="">Todas</option>
                {(payload?.entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Situação
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 px-3 font-semibold">
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
              <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupBy)} className="min-h-10 rounded-xl border border-slate-200 px-3 font-semibold">
                <option value="date">Data e período</option>
                <option value="entity">Entidade</option>
              </select>
            </label>
            <button type="submit" disabled={initialLoading || loading} className="min-h-11 rounded-xl bg-[#123D2C] px-5 font-black text-white disabled:opacity-60 md:col-span-2">
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
              {payload?.capabilities?.scope === "linked_entities" && (
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void changeView("appointments")}
                    className={`rounded-2xl px-3 py-2 text-sm font-black ${view === "appointments" ? "bg-[#123D2C] text-white" : "bg-[#E9F2E7] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}
                  >
                    Agendamentos
                  </button>
                  <button
                    type="button"
                    onClick={() => void changeView("attendances")}
                    className={`rounded-2xl px-3 py-2 text-sm font-black ${view === "attendances" ? "bg-[#123D2C] text-white" : "bg-[#E9F2E7] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}
                  >
                    Atendimentos
                  </button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => void changeRange("upcoming")} className={`rounded-2xl px-2 py-2 text-sm font-black ${range === "upcoming" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Próximos</button>
                <button type="button" onClick={() => void changeRange("today")} className={`rounded-2xl px-2 py-2 text-sm font-black ${range === "today" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Hoje</button>
                <button type="button" onClick={() => void changeRange("previous")} className={`rounded-2xl px-2 py-2 text-sm font-black ${range === "previous" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Anteriores</button>
              </div>
              <div className="mt-2">
                <p className="text-sm font-black text-[#123D2C]">
                  {payload?.total ?? 0} {view === "attendances" ? "atendimento(s)" : "agendamento(s)"}
                </p>
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
                    const itemLabel = view === "attendances" ? "atendimento(s)" : "agendamento(s)";
                    const subtitle = groupBy === "entity" ? `${appointments.length} ${itemLabel}` : second;
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
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-semibold text-slate-600">{formatPhone(appointment.person.whatsapp)}</p>
                                    {whatsappConversationUrl(appointment) && (
                                      <a href={whatsappConversationUrl(appointment)} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center rounded-xl bg-[#25D366] px-2.5 py-1 text-[0.68rem] font-black text-[#073B1D]">
                                        Falar no WhatsApp
                                      </a>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                                    appointment.access.isOwn
                                      ? "bg-blue-50 text-blue-800 ring-1 ring-blue-100"
                                      : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                                  }`}>
                                    {appointment.access.isOwn ? "Meu agendamento" : "Atendimento"}
                                  </span>
                                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                                    Ordem {appointment.order ?? "a confirmar"}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-700">
                                {groupBy === "entity" && <p><span className="font-black text-[#2F6B43]">Quando:</span> {longDate(appointment.appointmentDate)} · {appointment.appointmentTime}</p>}
                                {groupBy === "date" && <p><span className="font-black text-[#2F6B43]">Entidade:</span> {appointment.entity.name}</p>}
                                <p><span className="font-black text-[#2F6B43]">Situação:</span> {statusLabel(appointment.status)} · {channelLabel(appointment.bookingChannel)}</p>
                              </div>
                              {appointment.access.mode === "manage" && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  {appointment.access.canEdit && <button type="button" disabled={saving || appointment.status === "cancelado"} onClick={() => startEdit(appointment)} className="rounded-xl bg-white px-2 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Editar</button>}
                                  {appointment.access.canCancel && <button type="button" disabled={saving || appointment.status === "cancelado"} onClick={() => cancelAppointment(appointment)} className="rounded-xl bg-amber-50 px-2 py-2 text-xs font-black text-amber-900 ring-1 ring-amber-100 disabled:opacity-40">Cancelar</button>}
                                  {appointment.access.canDelete && <button type="button" disabled={saving} onClick={() => deleteAppointment(appointment)} className="rounded-xl bg-red-50 px-2 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 disabled:opacity-40">Excluir</button>}
                                </div>
                              )}
                              {appointment.access.mode === "self" && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {appointment.access.canEdit ? (
                                    <Link
                                      href={`${agendamentosPath}?editar=${encodeURIComponent(appointment.id)}`}
                                      className="rounded-xl bg-white px-2 py-2 text-center text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
                                    >
                                      Editar
                                    </Link>
                                  ) : (
                                    <span className="rounded-xl bg-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-500">
                                      Edição indisponível
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    disabled={saving || !appointment.access.canCancel}
                                    onClick={() => void deleteOwnAppointment(appointment)}
                                    className="rounded-xl bg-red-50 px-2 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 disabled:opacity-40"
                                  >
                                    Excluir
                                  </button>
                                  {appointment.access.editBlockedReason && (
                                    <p className="col-span-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                                      {appointment.access.editBlockedReason}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                  {grouped.length === 0 && (
                    <p className="rounded-[1.5rem] bg-[#F7FAF2] p-5 text-center font-bold text-slate-500">
                      {view === "attendances" ? "Nenhum atendimento encontrado." : "Nenhum agendamento encontrado."}
                    </p>
                  )}
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

      {editDraft && (
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
                <input type="date" value={editDraft.appointmentDate} onChange={(event) => setEditDraft({ ...editDraft, appointmentDate: event.target.value })} className="min-h-10 rounded-xl border border-slate-200 px-3 font-semibold" required />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Período
                <input value={editDraft.appointmentTime} onChange={(event) => setEditDraft({ ...editDraft, appointmentTime: event.target.value })} className="min-h-10 rounded-xl border border-slate-200 px-3 font-semibold" required />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Entidade
                <select value={editDraft.entityId} onChange={(event) => setEditDraft({ ...editDraft, entityId: event.target.value })} className="min-h-10 rounded-xl border border-slate-200 px-3 font-semibold" required>
                  <option value="">Escolha</option>
                  {(payload?.entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </select>
              </label>
              <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#123D2C] px-5 font-black text-white disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar alteração"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
