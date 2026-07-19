"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConsulentePanelHeader } from "@/components/organizacao-em-harmonia/consulente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type SpiritualEntity = {
  id: string;
  name: string;
  line: string | null;
  entity_type: string | null;
  usual_days: string[] | null;
  daily_capacity: number | null;
  appointment_enabled: boolean | null;
  appointment_notes: string | null;
};

type BookingPeriod = {
  id: string;
  eventId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  label: string;
  title: string;
  weekday: "segunda" | "terca";
  tone: "segunda" | "terca";
};

type Availability = {
  periodId: string;
  entityId: string;
  booked: number;
  capacity: number;
  available: number;
  nextOrder: number;
};

type Profile = {
  fullName: string;
  whatsapp: string;
  email: string;
  communicationsOptIn: boolean;
};

type Payload = {
  profile: Profile;
  entities: SpiritualEntity[];
  periods: BookingPeriod[];
  availability: Availability[];
  settings: {
    appointmentReturnGuidance: string;
  };
};

type Confirmation = {
  id: string;
  date: string;
  time: string;
  entityName: string;
  order: number;
  guidance: string;
  emailSent: boolean;
  email: string;
};

type CalendarDay = {
  isoDate: string;
  dayNumber: number;
  outsideMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  periods: BookingPeriod[];
};

type ModalKind = "calendar" | "entities" | "confirm" | "success" | null;

const weekDayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const LOGIN_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/login";
const APPOINTMENTS_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/agendamentos";

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

const todayIso = todayInSaoPaulo();

function dateFromIso(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12));
}

function monthTitle(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function longDateLabel(isoDate: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateFromIso(isoDate));
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function buildMonthDays(month: Date, periods: BookingPeriod[]): CalendarDay[] {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1, 12));
  const start = addDays(first, -first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    const isoDate = toIsoDate(date);
    return {
      isoDate,
      dayNumber: date.getUTCDate(),
      outsideMonth: date.getUTCMonth() !== month.getUTCMonth(),
      isToday: isoDate === todayIso,
      isPast: isoDate < todayIso,
      periods: periods.filter((period) => period.appointmentDate === isoDate),
    };
  });
}

function availabilityKey(periodId: string, entityId: string) {
  return `${periodId}::${entityId}`;
}

function phoneLabel(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return value || "Não informado";
}

function statusTone(available: number) {
  return available > 0
    ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
    : "bg-red-50 text-red-700 ring-red-100";
}

export default function AgendarConsulentePage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestCode, setRequestCode] = useState("");
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [month, setMonth] = useState(() => dateFromIso(todayIso));
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [email, setEmail] = useState("");
  const [communicationsOptIn, setCommunicationsOptIn] = useState(false);
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [successEmail, setSuccessEmail] = useState("");
  const [successOptIn, setSuccessOptIn] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const authorizedFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
      throw new Error("Sua sessão expirou.");
    }
    const response = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    const result = await response.json();
    if (response.status === 401) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
      throw new Error("Sua sessão expirou.");
    }
    if (!response.ok) {
      const routeError = new Error(result.error || "Não foi possível concluir a ação.");
      Object.assign(routeError, { requestId: result.requestId || "" });
      throw routeError;
    }
    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setRequestCode("");
    try {
      const result = await authorizedFetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos");
      const nextPayload = result as Payload;
      setPayload(nextPayload);
      setEmail(nextPayload.profile.email || "");
      setCommunicationsOptIn(nextPayload.profile.communicationsOptIn === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar os agendamentos.");
      setRequestCode(String((err as { requestId?: string })?.requestId || ""));
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const calendarDays = useMemo(() => buildMonthDays(month, payload?.periods ?? []), [month, payload?.periods]);
  const availabilityMap = useMemo(() => {
    const map = new Map<string, Availability>();
    (payload?.availability ?? []).forEach((item) => map.set(availabilityKey(item.periodId, item.entityId), item));
    return map;
  }, [payload?.availability]);
  const periodsForSelectedDate = useMemo(
    () => (payload?.periods ?? []).filter((period) => period.appointmentDate === selectedDate),
    [payload?.periods, selectedDate],
  );
  const selectedPeriod = useMemo(
    () => (payload?.periods ?? []).find((period) => period.id === selectedPeriodId) ?? null,
    [payload?.periods, selectedPeriodId],
  );
  const selectedEntity = useMemo(
    () => (payload?.entities ?? []).find((entity) => entity.id === selectedEntityId) ?? null,
    [payload?.entities, selectedEntityId],
  );
  const selectedAvailability = selectedPeriod && selectedEntity
    ? availabilityMap.get(availabilityKey(selectedPeriod.id, selectedEntity.id))
    : undefined;

  function entitiesForPeriod(period: BookingPeriod) {
    return (payload?.entities ?? [])
      .map((entity) => ({ entity, availability: availabilityMap.get(availabilityKey(period.id, entity.id)) }))
      .filter((item): item is { entity: SpiritualEntity; availability: Availability } => Boolean(item.availability))
      .sort((left, right) => left.entity.name.localeCompare(right.entity.name, "pt-BR", { sensitivity: "base" }));
  }

  function openCalendar() {
    setError("");
    setSelectedDate("");
    setSelectedPeriodId("");
    setSelectedEntityId("");
    setActiveModal("calendar");
  }

  function openDate(isoDate: string) {
    const periods = (payload?.periods ?? []).filter((period) => period.appointmentDate === isoDate);
    if (!periods.length || isoDate < todayIso) return;
    setSelectedDate(isoDate);
    setSelectedPeriodId(periods.length === 1 ? periods[0].id : "");
    setSelectedEntityId("");
    setActiveModal("entities");
  }

  function chooseEntity(period: BookingPeriod, entity: SpiritualEntity, availability: Availability) {
    if (availability.available <= 0) return;
    setSelectedPeriodId(period.id);
    setSelectedEntityId(entity.id);
    setEmail(payload?.profile.email || "");
    setCommunicationsOptIn(payload?.profile.communicationsOptIn === true);
    setNotes("");
    setIdempotencyKey(crypto.randomUUID());
    setError("");
    setActiveModal("confirm");
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPeriod || !selectedEntity || !selectedAvailability) return;
    setSaving(true);
    setError("");
    setRequestCode("");
    try {
      const result = await authorizedFetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos", {
        method: "POST",
        body: JSON.stringify({
          action: "book",
          periodId: selectedPeriod.id,
          entityId: selectedEntity.id,
          email,
          communicationsOptIn,
          notes,
          idempotencyKey,
        }),
      });
      const appointment = result.appointment as {
        id: string;
        appointmentDate: string;
        appointmentTime: string;
        entityName: string;
        order: number;
        guidance: string;
      };
      const nextConfirmation: Confirmation = {
        id: appointment.id,
        date: appointment.appointmentDate,
        time: appointment.appointmentTime,
        entityName: appointment.entityName,
        order: Number(appointment.order),
        guidance: appointment.guidance,
        emailSent: result.emailSent === true,
        email: String(result.email || email || ""),
      };
      setConfirmation(nextConfirmation);
      setSuccessEmail(nextConfirmation.email);
      setSuccessOptIn(communicationsOptIn);
      setEmailMessage("");
      setActiveModal("success");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar o agendamento.");
      setRequestCode(String((err as { requestId?: string })?.requestId || ""));
    } finally {
      setSaving(false);
    }
  }

  async function saveSuccessEmail() {
    if (!confirmation) return;
    setSaving(true);
    setEmailMessage("");
    try {
      const result = await authorizedFetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos", {
        method: "POST",
        body: JSON.stringify({
          action: "update-email",
          appointmentId: confirmation.id,
          email: successEmail,
          communicationsOptIn: successOptIn,
        }),
      });
      setEmailMessage(result.message || "E-mail salvo.");
      setConfirmation((current) => current ? { ...current, email: successEmail, emailSent: result.emailSent === true } : current);
    } catch (err) {
      setEmailMessage(err instanceof Error ? err.message : "Não foi possível salvar o e-mail.");
    } finally {
      setSaving(false);
    }
  }

  const currentMonthStart = dateFromIso(todayIso);
  const canGoPrevious = month.getUTCFullYear() > currentMonthStart.getUTCFullYear()
    || month.getUTCMonth() > currentMonthStart.getUTCMonth();

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <ConsulentePanelHeader navLabel="Atendimento em Harmonia - Agendamento" />
      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
        <article className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={openCalendar}
              disabled={loading || !payload}
              className="min-h-16 rounded-2xl bg-white px-5 py-4 text-lg font-black text-[#123D2C] shadow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agendar
            </button>
            <Link
              href={APPOINTMENTS_PATH}
              className="flex min-h-16 items-center justify-center rounded-2xl border border-white/35 bg-[#1B563F] px-5 py-4 text-center text-lg font-black text-white shadow transition hover:-translate-y-0.5 hover:bg-[#246D50]"
            >
              Agendamentos
            </Link>
          </div>
        </article>

        {loading && <p className="mt-4 rounded-2xl bg-white p-4 font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando períodos e disponibilidades...</p>}
        {error && !activeModal && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">
            <p>{error}</p>
            {requestCode && <p className="mt-1 text-xs">Código para suporte: {requestCode}</p>}
            <button type="button" onClick={() => void load()} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-black ring-1 ring-red-200">Tentar novamente</button>
          </div>
        )}

        {!loading && payload && (
          <p className="mt-4 rounded-[1.5rem] bg-[#E9F2E7] p-4 text-sm font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
            {payload.settings.appointmentReturnGuidance}
          </p>
        )}
      </section>

      {activeModal === "calendar" && (
        <Modal title="Agendar atendimento" onClose={() => setActiveModal(null)} fullScreenMobile bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-5">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <button type="button" disabled={!canGoPrevious} onClick={() => setMonth((current) => addMonths(current, -1))} className="min-h-11 rounded-xl bg-white px-4 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-30">←</button>
            <div className="min-w-0 text-center">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#2F6B43]">Períodos disponíveis</p>
              <h2 className="truncate text-lg font-black text-[#123D2C] sm:text-2xl">{monthTitle(month)}</h2>
            </div>
            <button type="button" onClick={() => setMonth((current) => addMonths(current, 1))} className="min-h-11 rounded-xl bg-white px-4 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">→</button>
          </div>
          <div className="mt-2 grid shrink-0 grid-cols-2 gap-2 text-[0.68rem] font-black">
            <span className="rounded-xl bg-[#FCE3E0] px-2 py-1 text-center text-[#5C211E] ring-1 ring-[#D9827B]">Segunda-feira</span>
            <span className="rounded-xl bg-[#E4F1FB] px-2 py-1 text-center text-[#17445B] ring-1 ring-[#6BAED6]">Terça-feira</span>
          </div>
          <div className="mt-2 grid shrink-0 grid-cols-7 bg-[#F7FAF2] text-center text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#2F6B43]">
            {weekDayLabels.map((label, index) => <div key={`${label}-${index}`} className="py-1.5">{label}</div>)}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-hidden rounded-b-2xl ring-1 ring-[#123D2C]/10">
            {calendarDays.map((day) => {
              const enabled = !day.outsideMonth && !day.isPast && day.periods.length > 0;
              const tone = day.periods[0]?.tone;
              return (
                <button
                  key={day.isoDate}
                  type="button"
                  disabled={!enabled}
                  onClick={() => openDate(day.isoDate)}
                  className={`relative min-h-0 border-b border-r border-[#123D2C]/10 p-1 text-left ${day.outsideMonth ? "bg-slate-50 text-slate-300" : "bg-white text-[#123D2C]"} ${enabled ? "hover:bg-[#E9F2E7]" : "cursor-default"}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${day.isToday ? "bg-[#123D2C] text-white" : ""}`}>{day.dayNumber}</span>
                  {enabled && (
                    <span className={`absolute inset-x-1 bottom-1 block h-2 rounded-full ${tone === "segunda" ? "bg-[#D9827B]" : "bg-[#6BAED6]"}`} title={`${day.periods.length} período(s)`} />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 shrink-0 text-center text-[0.68rem] font-bold text-slate-500">Toque em um dia marcado para ver períodos, entidades e vagas.</p>
        </Modal>
      )}

      {activeModal === "entities" && (
        <Modal title="Entidades e disponibilidade" onClose={() => setActiveModal("calendar")}>
          <p className="rounded-2xl bg-[#E9F2E7] p-4 text-sm font-black text-[#123D2C]">{longDateLabel(selectedDate)}</p>
          <div className="mt-4 grid gap-4">
            {periodsForSelectedDate.map((period) => {
              const entities = entitiesForPeriod(period);
              return (
                <section key={period.id} className="overflow-hidden rounded-[1.4rem] bg-white ring-1 ring-[#123D2C]/10">
                  <header className={`p-3 ${period.tone === "segunda" ? "bg-[#FCE3E0] text-[#5C211E]" : "bg-[#E4F1FB] text-[#17445B]"}`}>
                    <p className="text-xs font-black uppercase tracking-[0.16em]">Período</p>
                    <h3 className="mt-1 text-lg font-black">{period.label}</h3>
                  </header>
                  <div className="grid gap-2 p-3">
                    {entities.map(({ entity, availability }) => (
                      <article key={`${period.id}-${entity.id}`} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="truncate font-black text-[#123D2C]">{entity.name}</h4>
                            <p className="mt-1 text-xs font-semibold text-slate-600">{entity.line || entity.entity_type || "Linha/tipo não informado"}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] font-black">
                              <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">Previstos: {availability.capacity}</span>
                              <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">Agendados: {availability.booked}</span>
                              <span className={`rounded-full px-2 py-1 ring-1 ${statusTone(availability.available)}`}>Disponíveis: {availability.available}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={availability.available <= 0}
                            onClick={() => chooseEntity(period, entity, availability)}
                            className="min-h-12 shrink-0 rounded-2xl bg-[#123D2C] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {availability.available > 0 ? "Escolher" : "Sem vagas"}
                          </button>
                        </div>
                      </article>
                    ))}
                    {!entities.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">Nenhuma entidade está habilitada para este período.</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </Modal>
      )}

      {activeModal === "confirm" && selectedPeriod && selectedEntity && selectedAvailability && payload && (
        <Modal title="Confirmar agendamento" onClose={() => setActiveModal("entities")}>
          <form onSubmit={submitBooking} className="grid gap-4">
            <section className="rounded-[1.4rem] bg-[#E9F2E7] p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
              <p><strong>Consulente:</strong> {payload.profile.fullName}</p>
              <p><strong>WhatsApp:</strong> {phoneLabel(payload.profile.whatsapp)}</p>
              <p><strong>Data:</strong> {longDateLabel(selectedPeriod.appointmentDate)}</p>
              <p><strong>Período:</strong> {selectedPeriod.label}</p>
              <p><strong>Entidade:</strong> {selectedEntity.name}</p>
              <p><strong>Previstos:</strong> {selectedAvailability.capacity} · <strong>Agendados:</strong> {selectedAvailability.booked} · <strong>Disponíveis:</strong> {selectedAvailability.available}</p>
              <p className="mt-2 rounded-xl bg-white p-3 font-black">Ordem prevista: {selectedAvailability.nextOrder}</p>
            </section>

            {selectedEntity.appointment_notes && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">{selectedEntity.appointment_notes}</p>}

            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">E-mail para receber a confirmação</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="rounded-2xl border border-[#123D2C]/15 p-4" placeholder="Opcional" />
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <input type="checkbox" checked={communicationsOptIn} onChange={(event) => setCommunicationsOptIn(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold leading-5 text-[#123D2C]">Aceito receber futuras informações da Organização em Harmonia do TUCXA por e-mail. Esta opção é separada da confirmação deste agendamento e pode ser revogada.</span>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Observação para a recepção</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-2xl border border-[#123D2C]/15 p-4" placeholder="Opcional. Escreva apenas o necessário." />
            </label>
            {error && (
              <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
                <p>{error}</p>
                {requestCode && <p className="mt-1 text-xs">Código para suporte: {requestCode}</p>}
              </div>
            )}
            <button type="submit" disabled={saving || selectedAvailability.available <= 0} className="min-h-14 rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Confirmando..." : "Confirmar agendamento"}
            </button>
            <p className="text-center text-xs font-semibold text-slate-500">A vaga e a ordem são validadas novamente no servidor no momento da confirmação.</p>
          </form>
        </Modal>
      )}

      {activeModal === "success" && confirmation && (
        <Modal title="Agendamento confirmado" onClose={() => setActiveModal(null)}>
          <div className="grid gap-3 text-sm font-bold leading-6 text-[#123D2C]">
            <p className="rounded-2xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-100">Obrigado. Seu agendamento foi confirmado.</p>
            <section className="rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
              <p><strong>Entidade:</strong> {confirmation.entityName}</p>
              <p><strong>Data:</strong> {longDateLabel(confirmation.date)}</p>
              <p><strong>Período:</strong> {confirmation.time}</p>
              <p><strong>Ordem confirmada:</strong> {confirmation.order}</p>
            </section>
            <p className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">{confirmation.guidance}</p>
            {confirmation.email ? (
              <p className="rounded-2xl bg-blue-50 p-4 text-blue-900 ring-1 ring-blue-100">
                {confirmation.emailSent ? `As informações também foram enviadas para ${confirmation.email}.` : `O e-mail ${confirmation.email} foi salvo. O agendamento está confirmado, mas o envio da mensagem não pôde ser concluído agora.`}
              </p>
            ) : (
              <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <p>Você pode incluir um e-mail para receber esta confirmação e facilitar futuros contatos sobre seus agendamentos.</p>
                <label className="mt-3 grid gap-1">
                  <span className="text-xs font-black uppercase tracking-[0.12em]">E-mail</span>
                  <input value={successEmail} onChange={(event) => setSuccessEmail(event.target.value)} type="email" className="rounded-2xl border border-amber-200 bg-white p-3" placeholder="seu@email.com" />
                </label>
                <label className="mt-3 flex items-start gap-3">
                  <input type="checkbox" checked={successOptIn} onChange={(event) => setSuccessOptIn(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
                  <span className="text-xs font-semibold leading-5">Também aceito receber futuras informações da Organização em Harmonia do TUCXA por e-mail.</span>
                </label>
                <button type="button" disabled={saving || !successEmail.trim()} onClick={() => void saveSuccessEmail()} className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar e enviar confirmação"}</button>
                {emailMessage && <p className="mt-2 text-xs font-black">{emailMessage}</p>}
              </section>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href={APPOINTMENTS_PATH} className="flex min-h-13 items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white">Ver meus agendamentos</Link>
            <button type="button" onClick={() => setActiveModal(null)} className="min-h-13 rounded-2xl bg-white px-5 py-4 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Fechar</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Modal({
  title,
  children,
  onClose,
  fullScreenMobile = false,
  bodyClassName = "overflow-y-auto p-4 sm:p-5",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  fullScreenMobile?: boolean;
  bodyClassName?: string;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <section className={`flex w-full flex-col overflow-hidden bg-white shadow-2xl shadow-black/25 ring-1 ring-[#123D2C]/10 ${fullScreenMobile ? "h-[calc(100dvh-1rem)] max-w-3xl rounded-[1.5rem] sm:h-auto sm:max-h-[92vh] sm:rounded-[2rem]" : "max-h-[calc(100dvh-1rem)] max-w-2xl rounded-[1.5rem] sm:max-h-[90vh] sm:rounded-[2rem]"}`}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 bg-white p-3 sm:p-4">
          <h2 className="min-w-0 truncate text-base font-black uppercase tracking-[0.13em] text-[#123D2C] sm:text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-2xl bg-[#123D2C] px-4 text-sm font-black text-white">Fechar</button>
        </header>
        <div className={bodyClassName}>{children}</div>
      </section>
    </div>
  );
}
