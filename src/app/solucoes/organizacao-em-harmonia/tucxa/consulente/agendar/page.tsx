"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConsulentePanelHeader } from "@/components/organizacao-em-harmonia/consulente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type SpiritualEntity = {
  id: string;
  name: string;
  line: string | null;
  entity_type: string | null;
  usual_days: string[] | null;
  usual_materials: string | null;
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

type ExistingAppointment = {
  id: string;
  periodId: string;
  appointmentDate: string;
  appointmentTime: string;
  entityId: string | null;
  entityName: string;
  order: number | null;
  status: string;
  canEdit: boolean;
  editBlockedReason: string;
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
  existingAppointments: ExistingAppointment[];
  editingAppointment: ExistingAppointment | null;
  settings: {
    appointmentReturnGuidance: string;
    appointmentEditCutoffMinutes: number;
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
  changed: boolean;
};

type ModalKind = "calendar" | "entities" | "entityInfo" | "confirm" | "success" | "existing" | null;

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const LOGIN_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/login";
const APPOINTMENTS_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/agendamentos";
const dayLabels: Record<string, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
  eventual: "Eventual",
};

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

function monthKeyFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthDateFromKey(key: string) {
  return dateFromIso(`${key}-01`);
}

function eligibleMonthKeysForPayload(payload: Payload) {
  const availabilityByPeriod = new Set(
    payload.availability.filter((item) => item.available > 0).map((item) => item.periodId),
  );
  const existingPeriodIds = new Set(payload.existingAppointments.map((item) => item.periodId));

  return [...new Set(
    payload.periods
      .filter((period) => existingPeriodIds.has(period.id) || availabilityByPeriod.has(period.id))
      .map((period) => period.appointmentDate.slice(0, 7)),
  )].sort();
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

function compactDateLabel(isoDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(dateFromIso(isoDate)).replace(".", "");
}

function availabilityKey(periodId: string, entityId: string) {
  return `${periodId}::${entityId}`;
}

function phoneLabel(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return value || "Não informado";
}

function periodTone(period: BookingPeriod) {
  return period.tone === "segunda"
    ? "border-[#D9827B] bg-[#FCE3E0] text-[#5C211E]"
    : "border-[#6BAED6] bg-[#E4F1FB] text-[#17445B]";
}

export default function AgendarConsulentePage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestCode, setRequestCode] = useState("");
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [month, setMonth] = useState(() => dateFromIso(todayIso));
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedExisting, setSelectedExisting] = useState<ExistingAppointment | null>(null);
  const [infoEntity, setInfoEntity] = useState<SpiritualEntity | null>(null);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [successEmail, setSuccessEmail] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [editingAppointmentId, setEditingAppointmentId] = useState("");
  const initializedEdit = useRef(false);

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
      const editId = new URLSearchParams(window.location.search).get("edit")?.trim() || "";
      setEditingAppointmentId(editId);
      const endpoint = editId
        ? `/api/organizacao-em-harmonia/site-tucxa/agendamentos?edit=${encodeURIComponent(editId)}`
        : "/api/organizacao-em-harmonia/site-tucxa/agendamentos";
      const result = await authorizedFetch(endpoint);
      const nextPayload = result as Payload;
      setPayload(nextPayload);
      setEmail(nextPayload.profile.email || "");

      if (editId && nextPayload.editingAppointment && !initializedEdit.current) {
        initializedEdit.current = true;
        const editMonthKey = nextPayload.editingAppointment.appointmentDate.slice(0, 7);
        const eligibleMonths = eligibleMonthKeysForPayload(nextPayload);
        setMonth(monthDateFromKey(eligibleMonths.includes(editMonthKey) ? editMonthKey : (eligibleMonths[0] || editMonthKey)));
        setActiveModal("calendar");
      } else if (!editId) {
        const eligibleMonths = eligibleMonthKeysForPayload(nextPayload);
        if (eligibleMonths[0]) setMonth(monthDateFromKey(eligibleMonths[0]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar os agendamentos.");
      setRequestCode(String((err as { requestId?: string })?.requestId || ""));
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const availabilityMap = useMemo(() => {
    const map = new Map<string, Availability>();
    (payload?.availability ?? []).forEach((item) => map.set(availabilityKey(item.periodId, item.entityId), item));
    return map;
  }, [payload?.availability]);

  const existingMap = useMemo(() => {
    const map = new Map<string, ExistingAppointment>();
    (payload?.existingAppointments ?? []).forEach((item) => map.set(item.periodId, item));
    return map;
  }, [payload?.existingAppointments]);

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

  const monthDates = useMemo(() => {
    const grouped = new Map<string, BookingPeriod[]>();
    (payload?.periods ?? [])
      .filter((period) => {
        const date = dateFromIso(period.appointmentDate);
        if (date.getUTCFullYear() !== month.getUTCFullYear() || date.getUTCMonth() !== month.getUTCMonth()) return false;
        const existing = existingMap.has(period.id);
        const hasVacancy = (payload?.entities ?? []).some((entity) => (availabilityMap.get(availabilityKey(period.id, entity.id))?.available ?? 0) > 0);
        return existing || hasVacancy;
      })
      .forEach((period) => grouped.set(period.appointmentDate, [...(grouped.get(period.appointmentDate) ?? []), period]));

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, periods]) => ({ date, periods: periods.sort((left, right) => left.startTime.localeCompare(right.startTime)) }));
  }, [availabilityMap, existingMap, month, payload?.entities, payload?.periods]);

  function entitiesForPeriod(period: BookingPeriod) {
    return (payload?.entities ?? [])
      .map((entity) => ({ entity, availability: availabilityMap.get(availabilityKey(period.id, entity.id)) }))
      .filter((item): item is { entity: SpiritualEntity; availability: Availability } => Boolean(item.availability))
      .sort((left, right) => left.entity.name.localeCompare(right.entity.name, "pt-BR", { sensitivity: "base" }));
  }

  function openCalendar() {
    setError("");
    setSelectedPeriodId("");
    setSelectedEntityId("");
    const eligibleMonths = payload ? eligibleMonthKeysForPayload(payload) : [];
    if (eligibleMonths.length && !eligibleMonths.includes(monthKeyFromDate(month))) {
      setMonth(monthDateFromKey(eligibleMonths[0]));
    }
    setActiveModal("calendar");
  }

  function openPeriod(period: BookingPeriod) {
    const existing = existingMap.get(period.id);
    if (existing) {
      setSelectedExisting(existing);
      setActiveModal("existing");
      return;
    }
    setSelectedPeriodId(period.id);
    setSelectedEntityId("");
    setActiveModal("entities");
  }

  function chooseEntity(entity: SpiritualEntity, availability: Availability) {
    if (availability.available <= 0) return;
    setSelectedEntityId(entity.id);
    setEmail(payload?.profile.email || "");
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
      const changing = Boolean(editingAppointmentId);
      const result = await authorizedFetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos", {
        method: "POST",
        body: JSON.stringify({
          action: changing ? "reschedule" : "book",
          appointmentId: changing ? editingAppointmentId : undefined,
          periodId: selectedPeriod.id,
          entityId: selectedEntity.id,
          email,
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
        changed: changing,
      };
      setConfirmation(nextConfirmation);
      setSuccessEmail(nextConfirmation.email);
      setEmailMessage("");
      setActiveModal("success");
      if (changing) window.history.replaceState({}, "", window.location.pathname);
      setEditingAppointmentId("");
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

  const eligibleMonthKeys = useMemo(
    () => payload ? eligibleMonthKeysForPayload(payload) : [],
    [payload],
  );
  const currentMonthKey = monthKeyFromDate(month);
  const currentMonthIndex = eligibleMonthKeys.indexOf(currentMonthKey);
  const previousMonthKey = currentMonthIndex > 0 ? eligibleMonthKeys[currentMonthIndex - 1] : "";
  const nextMonthKey = currentMonthIndex >= 0 && currentMonthIndex < eligibleMonthKeys.length - 1
    ? eligibleMonthKeys[currentMonthIndex + 1]
    : "";
  const isEditing = Boolean(editingAppointmentId && payload?.editingAppointment);

  async function editExistingInFlow() {
    if (!selectedExisting?.canEdit) return;
    setSaving(true);
    setError("");
    setRequestCode("");
    try {
      const result = await authorizedFetch(
        `/api/organizacao-em-harmonia/site-tucxa/agendamentos?edit=${encodeURIComponent(selectedExisting.id)}`,
      );
      const nextPayload = result as Payload;
      setPayload(nextPayload);
      setEditingAppointmentId(selectedExisting.id);
      const eligibleMonths = eligibleMonthKeysForPayload(nextPayload);
      const currentKey = selectedExisting.appointmentDate.slice(0, 7);
      setMonth(monthDateFromKey(eligibleMonths.includes(currentKey) ? currentKey : (eligibleMonths[0] || currentKey)));
      setSelectedExisting(null);
      setActiveModal("calendar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a alteração.");
      setRequestCode(String((err as { requestId?: string })?.requestId || ""));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#F7FAF2] text-[#10251C]">
      <ConsulentePanelHeader navLabel="Atendimento em Harmonia - Agendamento" />
      <section className="flex min-h-0 flex-1 items-center justify-center px-3 py-2 sm:px-6 sm:py-4 lg:px-8">
        <article className="w-full max-w-4xl rounded-[1.6rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">Seu atendimento começa com uma escolha simples.</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-5 text-[#EEF7EA] sm:text-base sm:leading-6">Veja somente os próximos dias com atendimento, escolha uma entidade com vaga e confirme em poucos passos.</p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.65rem] font-black leading-4 text-[#123D2C] sm:text-xs">
            <span className="rounded-xl bg-white/95 px-2 py-2">Horários disponíveis</span>
            <span className="rounded-xl bg-white/95 px-2 py-2">Vaga e ordem confirmadas</span>
            <span className="rounded-xl bg-white/95 px-2 py-2">Consulte ou ajuste depois</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={openCalendar}
              disabled={loading || !payload}
              className="min-h-14 rounded-2xl bg-white px-4 py-3 text-base font-black text-[#123D2C] shadow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-16 sm:text-lg"
            >
              {isEditing ? "Alterar" : "Agendar"}
            </button>
            <Link href={APPOINTMENTS_PATH} className="flex min-h-14 items-center justify-center rounded-2xl border border-white/35 bg-[#1B563F] px-4 py-3 text-center text-base font-black text-white shadow transition hover:-translate-y-0.5 hover:bg-[#246D50] sm:min-h-16 sm:text-lg">
              Agendamentos
            </Link>
          </div>

          <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-[0.7rem] font-semibold leading-4 text-[#EEF7EA] sm:text-xs">Você confere todos os dados antes de reservar. {payload?.settings.appointmentReturnGuidance ?? ""}</p>

          {loading && <p className="mt-2 text-center text-xs font-bold text-[#CFE2C7]">Carregando períodos e vagas...</p>}
          {error && !activeModal && (
            <div className="mt-2 rounded-xl bg-red-50 p-2 text-xs font-bold text-red-700">
              <p>{error}</p>
              {requestCode && <p>Código para suporte: {requestCode}</p>}
              <button type="button" onClick={() => void load()} className="mt-1 rounded-lg bg-white px-3 py-1.5 font-black ring-1 ring-red-200">Tentar novamente</button>
            </div>
          )}
        </article>
      </section>

      {activeModal === "calendar" && (
        <Modal title={isEditing ? "Escolha o novo período" : "Agendar atendimento"} onClose={() => setActiveModal(null)} fullScreenMobile bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-5">
          {isEditing && payload?.editingAppointment && (
            <p className="mb-2 shrink-0 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 ring-1 ring-amber-100">Alterando: {longDateLabel(payload.editingAppointment.appointmentDate)} · {payload.editingAppointment.appointmentTime}</p>
          )}
          <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2">
            <button
              type="button"
              disabled={!previousMonthKey}
              onClick={() => previousMonthKey && setMonth(monthDateFromKey(previousMonthKey))}
              className="min-h-11 rounded-xl bg-white px-3 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-30 sm:px-4 sm:text-sm"
            >
              ← Anterior
            </button>
            <div className="min-w-0 text-center">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Somente opções agendáveis</p>
              <h2 className="truncate text-lg font-black text-[#123D2C] sm:text-2xl">{monthTitle(month)}</h2>
            </div>
            <button
              type="button"
              disabled={!nextMonthKey}
              onClick={() => nextMonthKey && setMonth(monthDateFromKey(nextMonthKey))}
              className="min-h-11 rounded-xl bg-white px-3 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-30 sm:px-4 sm:text-sm"
            >
              Próximo →
            </button>
          </div>

          <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 sm:gap-3">
            {monthDates.map(({ date, periods }) => (
              <section key={date} className="flex min-h-0 flex-col rounded-2xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black capitalize text-[#123D2C]">{compactDateLabel(date)}</p>
                <div className="mt-2 grid gap-1.5">
                  {periods.map((period) => {
                    const existing = existingMap.get(period.id);
                    return (
                      <button
                        key={period.id}
                        type="button"
                        onClick={() => openPeriod(period)}
                        className={`min-h-12 rounded-xl border px-2 py-2 text-left text-xs font-black leading-4 transition hover:-translate-y-0.5 ${existing ? "border-emerald-300 bg-emerald-50 text-emerald-900" : periodTone(period)}`}
                      >
                        <span className="block">{period.label}</span>
                        <span className="mt-0.5 block text-[0.62rem] font-bold">{existing ? "✓ Você já está agendado" : period.weekday === "segunda" ? "Segunda-feira" : "Terça-feira"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            {!monthDates.length && (
              <p className="col-span-2 self-start rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100 sm:col-span-3">No momento não há novos períodos disponíveis para agendamento.</p>
            )}
          </div>
        </Modal>
      )}

      {activeModal === "entities" && selectedPeriod && (
        <Modal title="Escolha uma entidade" onClose={() => setActiveModal("calendar")}>
          <div className={`rounded-2xl border p-3 ${periodTone(selectedPeriod)}`}>
            <p className="text-xs font-black">{longDateLabel(selectedPeriod.appointmentDate)}</p>
            <p className="mt-1 text-lg font-black">{selectedPeriod.label}</p>
          </div>
          <div className="mt-3 grid gap-2">
            {entitiesForPeriod(selectedPeriod).map(({ entity, availability }) => {
              const hasVacancy = availability.available > 0;
              return (
                <article key={`${selectedPeriod.id}-${entity.id}`} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-black text-[#123D2C]">{entity.name}</h3>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[0.68rem] font-black ring-1 ${hasVacancy ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-red-50 text-red-700 ring-red-100"}`}>{hasVacancy ? "Vaga disponível" : "Sem vaga disponível"}</span>
                    </div>
                    <div className="grid shrink-0 grid-cols-2 gap-2">
                      <button type="button" onClick={() => { setInfoEntity(entity); setActiveModal("entityInfo"); }} className="min-h-11 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">+ Infos</button>
                      <button type="button" disabled={!hasVacancy} onClick={() => chooseEntity(entity, availability)} className="min-h-11 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">Escolher</button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!entitiesForPeriod(selectedPeriod).length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">Nenhuma entidade está habilitada para este período.</p>}
          </div>
        </Modal>
      )}

      {activeModal === "entityInfo" && infoEntity && (
        <Modal title={infoEntity.name} onClose={() => setActiveModal("entities")}>
          <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-700">
            <Info label="Linha de trabalho">{infoEntity.line || "Não informada"}</Info>
            <Info label="Tipo">{infoEntity.entity_type || "Não informado"}</Info>
            <Info label="Dias em que costuma atender">{(infoEntity.usual_days ?? []).map((day) => dayLabels[day] ?? day).join(", ") || "Não definidos"}</Info>
            <Info label="Materiais/apetrechos usuais">{infoEntity.usual_materials || "Não informados"}</Info>
            <Info label="Capacidade prevista por período">{Math.max(1, Number(infoEntity.daily_capacity ?? 1))} atendimento(s)</Info>
            <Info label="Agendamento pelo sistema">{infoEntity.appointment_enabled === false ? "Não habilitado" : "Habilitado"}</Info>
            <Info label="Orientações para o agendamento">{infoEntity.appointment_notes || "Siga as orientações apresentadas na confirmação e pela recepção."}</Info>
          </div>
        </Modal>
      )}

      {activeModal === "existing" && selectedExisting && (
        <Modal title="Você já está agendado" onClose={() => setActiveModal("calendar")}>
          <p className="rounded-2xl bg-emerald-50 p-4 font-black text-emerald-900 ring-1 ring-emerald-100">Já consta um agendamento ativo para este dia e período.</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
            <Info label="Data">{longDateLabel(selectedExisting.appointmentDate)}</Info>
            <Info label="Período">{selectedExisting.appointmentTime}</Info>
            <Info label="Entidade">{selectedExisting.entityName}</Info>
            <Info label="Ordem">{selectedExisting.order ?? "A confirmar"}</Info>
          </div>
          {selectedExisting.canEdit ? (
            <button
              type="button"
              onClick={() => void editExistingInFlow()}
              disabled={saving}
              className="mt-4 min-h-13 w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white disabled:opacity-60"
            >
              {saving ? "Preparando alteração..." : "Editar este agendamento"}
            </button>
          ) : (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
              {selectedExisting.editBlockedReason || "Este agendamento não pode mais ser editado. Você ainda pode excluí-lo em Meus Agendamentos."}
            </p>
          )}
          <Link href={APPOINTMENTS_PATH} className="mt-3 flex min-h-13 items-center justify-center rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Ver meus agendamentos</Link>
        </Modal>
      )}

      {activeModal === "confirm" && selectedPeriod && selectedEntity && selectedAvailability && payload && (
        <Modal title={isEditing ? "Confirmar alteração" : "Confirmar agendamento"} onClose={() => setActiveModal("entities")}>
          <form onSubmit={submitBooking} className="grid gap-4">
            <section className="rounded-[1.4rem] bg-[#E9F2E7] p-4 text-sm leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
              <p><strong>Consulente:</strong> {payload.profile.fullName}</p>
              <p><strong>WhatsApp:</strong> {phoneLabel(payload.profile.whatsapp)}</p>
              <p><strong>Data:</strong> {longDateLabel(selectedPeriod.appointmentDate)}</p>
              <p><strong>Período:</strong> {selectedPeriod.label}</p>
              <p><strong>Entidade:</strong> {selectedEntity.name}</p>
              <p className="mt-2 rounded-xl bg-white p-3 font-black">Ordem prevista: {selectedAvailability.nextOrder}</p>
            </section>

            {selectedEntity.appointment_notes && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">{selectedEntity.appointment_notes}</p>}

            {!isEditing && (
              <>
                {payload.profile.email ? (
                  <p className="rounded-2xl bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-900 ring-1 ring-blue-100">
                    A confirmação também será enviada para <strong>{payload.profile.email}</strong>.
                  </p>
                ) : (
                  <label className="grid gap-1">
                    <span className="text-sm font-black text-[#123D2C]">E-mail para receber a confirmação</span>
                    <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="rounded-2xl border border-[#123D2C]/15 p-4" placeholder="Opcional" />
                  </label>
                )}
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#123D2C]">Observação para a recepção</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-2xl border border-[#123D2C]/15 p-4" placeholder="Opcional. Escreva apenas o necessário." />
                </label>
              </>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
                <p>{error}</p>
                {requestCode && <p className="mt-1 text-xs">Código para suporte: {requestCode}</p>}
              </div>
            )}
            <button type="submit" disabled={saving || selectedAvailability.available <= 0} className="min-h-14 rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Confirmando..." : isEditing ? "Confirmar alteração" : "Confirmar agendamento"}</button>
          </form>
        </Modal>
      )}

      {activeModal === "success" && confirmation && (
        <Modal title={confirmation.changed ? "Agendamento alterado" : "Agendamento confirmado"} onClose={() => setActiveModal(null)}>
          <div className="grid gap-3 text-sm font-bold leading-6 text-[#123D2C]">
            <p className="rounded-2xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-100">{confirmation.changed ? "A alteração foi confirmada." : "Obrigado. Seu agendamento foi confirmado."}</p>
            <section className="rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
              <p><strong>Entidade:</strong> {confirmation.entityName}</p>
              <p><strong>Data:</strong> {longDateLabel(confirmation.date)}</p>
              <p><strong>Período:</strong> {confirmation.time}</p>
              <p><strong>Ordem confirmada:</strong> {confirmation.order}</p>
            </section>
            <p className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">{confirmation.guidance}</p>
            {confirmation.email ? (
              <p className="rounded-2xl bg-blue-50 p-4 text-blue-900 ring-1 ring-blue-100">{confirmation.emailSent ? `As informações também foram enviadas para ${confirmation.email}.` : `O agendamento está confirmado, mas o envio para ${confirmation.email} não pôde ser concluído agora.`}</p>
            ) : !confirmation.changed ? (
              <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <p>Você pode incluir um e-mail para receber esta confirmação.</p>
                <label className="mt-3 grid gap-1"><span className="text-xs font-black uppercase tracking-[0.12em]">E-mail</span><input value={successEmail} onChange={(event) => setSuccessEmail(event.target.value)} type="email" className="rounded-2xl border border-amber-200 bg-white p-3" placeholder="seu@email.com" /></label>
                <button type="button" disabled={saving || !successEmail.trim()} onClick={() => void saveSuccessEmail()} className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar e enviar confirmação"}</button>
                {emailMessage && <p className="mt-2 text-xs font-black">{emailMessage}</p>}
              </section>
            ) : null}
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

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{label}</p><div className="mt-1">{children}</div></div>;
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
