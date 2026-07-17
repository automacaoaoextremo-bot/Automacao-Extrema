"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type SpiritualEntity = {
  id: string;
  name: string;
  line: string | null;
  entity_type: string | null;
  usual_days: string[] | null;
  daily_capacity?: number | null;
  appointment_enabled?: boolean | null;
  appointment_notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AgendaEvent = {
  id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean | null;
  recurrence_rule: string | null;
  group_slug: string | null;
  event_type: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
};

type Scheduler = { id: string; full_name: string; email: string | null; whatsapp: string | null };

type AgendaSettings = {
  maxRecurringAppointmentsPerConsulente: number;
  recurringEnabled: boolean;
  autoCancelRecurringOnAbsence: boolean;
  allowDifferentEntityAfterFirstAppointment: boolean;
  allowAlternateEntityWhenUnavailable: boolean;
  wednesdayBookingMode: string;
  wednesdayAuthorizedPersonIds: string[];
  requireRecommendingEntityForWednesday: boolean;
  appointmentReturnGuidance: string;
};

type Availability = {
  entityId: string;
  appointmentDate: string;
  booked: number;
  capacity: number;
  available: number;
  nextOrder: number;
};

type Payload = {
  entities: SpiritualEntity[];
  events: AgendaEvent[];
  availability: Availability[];
  authorizedSchedulers: Scheduler[];
  settings: AgendaSettings;
};

type CalendarDay = {
  isoDate: string;
  dayNumber: number;
  outsideMonth: boolean;
  isToday: boolean;
  isBookingDay: boolean;
  isVacation: boolean;
  events: AgendaEvent[];
};

type ModalKind = "agenda" | "entities" | "entityInfo" | "booking" | "thanks" | null;

const todayIso = new Date().toISOString().slice(0, 10);
const saoPauloTimeZone = "America/Sao_Paulo";
const weekDayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
const headerActions = [
  { label: "Consulente", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente", variant: "secondary" as const },
  { label: "Agenda Viva", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/agendar", variant: "primary" as const },
  { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
];

const eventTones = [
  { background: "#F5B7B1", border: "#D9827B", text: "#5C211E", soft: "#FCE3E0" },
  { background: "#B8D8F1", border: "#6BAED6", text: "#17445B", soft: "#E4F1FB" },
  { background: "#CDE8CC", border: "#80B97F", text: "#234D2C", soft: "#EAF7E8" },
  { background: "#6EA87A", border: "#2F6B43", text: "#FFFFFF", soft: "#DDEDDD" },
  { background: "#4EA3D8", border: "#2477A8", text: "#FFFFFF", soft: "#D9EEF9" },
  { background: "#F7E6B5", border: "#D9B85F", text: "#3B2F11", soft: "#FFF4CF" },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateFromIso(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth) || !Number.isFinite(parsedDay)) return new Date();
  return new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay, 12));
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
  const date = dateFromIso(isoDate);
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function weekdayFromIso(value: string) {
  const date = dateFromIso(value);
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][date.getUTCDay()] ?? "";
}

function weekdayLabel(value: string) {
  const labels: Record<string, string> = { domingo: "domingo", segunda: "segunda-feira", terca: "terça-feira", quarta: "quarta-feira", quinta: "quinta-feira", sexta: "sexta-feira", sabado: "sábado" };
  return labels[value] ?? value;
}

function isVacationDate(isoDate: string) {
  const date = dateFromIso(isoDate);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return (month === 1 && day <= 28) || (month === 7 && day <= 29) || (month === 12 && day >= 21);
}

function isBookingWeekday(isoDate: string) {
  const weekday = weekdayFromIso(isoDate);
  return weekday === "segunda" || weekday === "terca";
}

function isBookingDate(isoDate: string) {
  return isBookingWeekday(isoDate) && !isVacationDate(isoDate);
}

function entityMatchesDate(entity: SpiritualEntity, isoDate: string) {
  const weekday = weekdayFromIso(isoDate);
  const days = entity.usual_days ?? [];
  if (!days.length) return weekday === "segunda" || weekday === "terca";
  const normalizedDays = days.map((day) => normalize(day));
  if (weekday === "terca") return normalizedDays.some((day) => day.includes("terca") || day.includes("terça"));
  return normalizedDays.some((day) => day.includes(weekday));
}

function eventDateOnly(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function eventAudience(event: AgendaEvent) {
  const metadata = asRecord(event.metadata);
  return normalize(asText(metadata.audience ?? metadata.publico ?? metadata.targetAudience ?? metadata.target_audience));
}

function eventVisibleForConsulente(event: AgendaEvent) {
  const audience = eventAudience(event);
  if (!audience) return true;
  if (audience.includes("somente") && audience.includes("filhos") && audience.includes("corrente")) return false;
  if (audience === "filhos-corrente" || audience === "filhos_corrente") return false;
  return true;
}

function eventTone(event: AgendaEvent) {
  const search = normalize(`${event.title ?? ""} ${event.event_type ?? ""} ${event.group_slug ?? ""}`);
  if (search.includes("segunda")) return eventTones[0];
  if (search.includes("terca") || search.includes("terça")) return eventTones[1];
  if (search.includes("tratamento") || search.includes("transformacao") || search.includes("transformação")) return eventTones[2];
  if (search.includes("grupo 1") || search.includes("grupo-1")) return eventTones[3];
  if (search.includes("grupo 2") || search.includes("grupo-2")) return eventTones[4];
  if (search.includes("ferias") || search.includes("férias") || search.includes("recesso")) return eventTones[5];
  const key = `${event.title ?? ""}-${event.event_type ?? ""}-${event.group_slug ?? ""}`;
  const index = Array.from(key).reduce((total, char) => total + char.charCodeAt(0), 0) % eventTones.length;
  return eventTones[index];
}

function buildMonthDays(monthDate: Date, events: AgendaEvent[], onlyBookingDays: boolean): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1, 12));
  const start = addDays(firstOfMonth, -firstOfMonth.getUTCDay());
  const days: CalendarDay[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const isoDate = toIsoDate(date);
    const isBookingDay = isBookingDate(isoDate);
    days.push({
      isoDate,
      dayNumber: date.getUTCDate(),
      outsideMonth: date.getUTCMonth() !== monthDate.getUTCMonth(),
      isToday: isoDate === todayIso,
      isBookingDay,
      isVacation: isVacationDate(isoDate),
      events: onlyBookingDays ? [] : events.filter((event) => eventDateOnly(event.starts_at) === isoDate),
    });
  }
  return days;
}

function formatEventTime(event: AgendaEvent) {
  if (event.all_day) return "Dia inteiro";
  const start = event.starts_at ? new Date(event.starts_at) : null;
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const formatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: saoPauloTimeZone });
  const startText = start && !Number.isNaN(start.getTime()) ? formatter.format(start).replace(":00", "h") : "Horário a definir";
  const endText = end && !Number.isNaN(end.getTime()) ? formatter.format(end).replace(":00", "h") : "";
  return endText ? `${startText} às ${endText}` : startText;
}


function capacityLabel(availability?: Availability) {
  if (!availability) return "Disponibilidade a confirmar";
  if (availability.available <= 0) return `Sem vagas • ${availability.booked}/${availability.capacity} preenchidas`;
  return `${availability.available} vaga(s) • ordem ${availability.nextOrder}`;
}

function availabilityKey(entityId: string, isoDate: string) {
  return `${entityId}::${isoDate}`;
}

export default function AgendarConsulentePage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [month, setMonth] = useState(() => dateFromIso(todayIso));
  const [agendaMonth, setAgendaMonth] = useState(() => dateFromIso(todayIso));
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [confirmation, setConfirmation] = useState<{ date: string; entityName: string; order: number; emailSent: boolean } | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    appointmentDate: "",
    entityId: "",
    isRecurring: false,
    recurrenceCount: "1",
    notes: "",
  });

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const saved = window.sessionStorage.getItem("oh_consulente_agendamento_dados");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<typeof form>;
          setForm((current) => ({ ...current, ...parsed, appointmentDate: "", entityId: "", notes: "" }));
        } catch {
          // Mantém o formulário vazio quando o armazenamento local estiver inválido.
        }
      }

      fetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos")
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Não foi possível carregar a Agenda Viva.");
          if (active) setPayload(result as Payload);
        })
        .catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar agendamento."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const publicEvents = useMemo(() => (payload?.events ?? []).filter(eventVisibleForConsulente), [payload?.events]);
  const bookingDays = useMemo(() => buildMonthDays(month, [], true), [month]);
  const agendaDays = useMemo(() => buildMonthDays(agendaMonth, publicEvents, false), [agendaMonth, publicEvents]);
  const availabilityMap = useMemo(() => {
    const map = new Map<string, Availability>();
    (payload?.availability ?? []).forEach((item) => map.set(availabilityKey(item.entityId, item.appointmentDate), item));
    return map;
  }, [payload?.availability]);

  const entitiesForSelectedDate = useMemo(() => {
    if (!payload || !selectedDate) return [];
    return payload.entities
      .filter((entity) => entity.appointment_enabled !== false)
      .filter((entity) => entityMatchesDate(entity, selectedDate))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [payload, selectedDate]);

  const selectedEntity = useMemo(() => (payload?.entities ?? []).find((entity) => entity.id === selectedEntityId) ?? null, [payload?.entities, selectedEntityId]);
  const selectedAvailability = selectedEntityId && selectedDate ? availabilityMap.get(availabilityKey(selectedEntityId, selectedDate)) : undefined;

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openEntitiesForDate(isoDate: string) {
    if (!isBookingDate(isoDate)) return;
    setSelectedDate(isoDate);
    setSelectedEntityId("");
    setError("");
    setActiveModal("entities");
  }

  function openBooking(entityId: string) {
    setSelectedEntityId(entityId);
    setForm((current) => ({ ...current, appointmentDate: selectedDate, entityId }));
    setActiveModal("booking");
  }

  function persistContactData() {
    window.sessionStorage.setItem(
      "oh_consulente_agendamento_dados",
      JSON.stringify({ fullName: form.fullName, whatsapp: form.whatsapp, email: form.email }),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar o agendamento.");
      persistContactData();
      setConfirmation({
        date: result.appointment?.appointment_date || form.appointmentDate,
        entityName: result.entityName || selectedEntity?.name || "Entidade escolhida",
        order: Number(result.order || selectedAvailability?.nextOrder || 1),
        emailSent: result.emailSent === true,
      });
      setActiveModal("thanks");
      setForm((current) => ({ ...current, appointmentDate: "", entityId: "", isRecurring: false, recurrenceCount: "1", notes: "" }));
      const refresh = await fetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos");
      if (refresh.ok) setPayload((await refresh.json()) as Payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de agendamento do consulente" />
      <section className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Escolha o dia, veja as entidades e agende sem adivinhar o próximo passo.</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-[#EEF7EA] sm:text-base">
            O calendário abaixo mostra somente os períodos de atendimento de segunda e terça, já retirando férias/recessos. Toque no dia para ver as entidades disponíveis e seguir pelo fluxo em pop-ups.
          </p>
          <button type="button" onClick={() => setActiveModal("agenda")} className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#123D2C] shadow transition hover:-translate-y-0.5">
            Ver Agenda Viva do Consulente
          </button>
        </div>

        {loading && <p className="mt-4 rounded-2xl bg-white p-4 font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando calendário, entidades e regras...</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

        <section className="mt-4 overflow-hidden rounded-[1.75rem] bg-white shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10">
          <div className="flex flex-col gap-3 border-b border-[#123D2C]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Calendário de atendimento</p>
              <h2 className="text-2xl font-black text-[#123D2C]">{monthTitle(month)}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex">
              <button type="button" onClick={() => setMonth((current) => addMonths(current, -1))} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">←</button>
              <button type="button" onClick={() => setMonth(dateFromIso(todayIso))} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Hoje</button>
              <button type="button" onClick={() => setMonth((current) => addMonths(current, 1))} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">→</button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-[#123D2C]/10 bg-[#F7FAF2] text-center text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
            {weekDayLabels.map((label) => <div key={label} className="p-2">{label}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {bookingDays.map((day) => (
              <button
                key={day.isoDate}
                type="button"
                onClick={() => openEntitiesForDate(day.isoDate)}
                disabled={!day.isBookingDay || day.outsideMonth}
                className={`min-h-20 border-b border-r border-[#123D2C]/10 p-2 text-left transition ${day.outsideMonth ? "bg-slate-50 text-slate-300" : "bg-white text-[#123D2C]"} ${day.isBookingDay && !day.outsideMonth ? "hover:bg-[#E9F2E7]" : "cursor-default"}`}
              >
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${day.isToday ? "bg-[#123D2C] text-white" : ""}`}>{day.dayNumber}</span>
                {day.isBookingDay && !day.outsideMonth && (
                  <span className={`mt-2 block rounded-xl px-2 py-1 text-[0.65rem] font-black ${weekdayFromIso(day.isoDate) === "segunda" ? "bg-[#FCE3E0] text-[#5C211E] ring-1 ring-[#D9827B]" : "bg-[#E4F1FB] text-[#17445B] ring-1 ring-[#6BAED6]"}`}>
                    {weekdayFromIso(day.isoDate) === "segunda" ? "Segunda" : "Terça"}
                  </span>
                )}
                {day.isVacation && !day.outsideMonth && <span className="mt-2 block rounded-xl bg-[#FFF4CF] px-2 py-1 text-[0.65rem] font-black text-[#3B2F11] ring-1 ring-[#D9B85F]">Férias</span>}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-4 rounded-[1.5rem] bg-[#E9F2E7] p-4 text-sm font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
          {payload?.settings?.appointmentReturnGuidance || "Após o primeiro atendimento com uma entidade, se houver orientação de retorno, procure voltar com a mesma entidade para preservar a continuidade do cuidado."}
        </div>
      </section>

      {activeModal === "agenda" && (
        <Modal title="Agenda Viva do Consulente" onClose={() => setActiveModal(null)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Eventos visíveis para consulentes</p>
              <h2 className="text-2xl font-black text-[#123D2C]">{monthTitle(agendaMonth)}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setAgendaMonth((current) => addMonths(current, -1))} className="rounded-2xl bg-white px-4 py-3 text-sm font-black ring-1 ring-[#123D2C]/10">←</button>
              <button type="button" onClick={() => setAgendaMonth(dateFromIso(todayIso))} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-sm font-black ring-1 ring-[#123D2C]/10">Hoje</button>
              <button type="button" onClick={() => setAgendaMonth((current) => addMonths(current, 1))} className="rounded-2xl bg-white px-4 py-3 text-sm font-black ring-1 ring-[#123D2C]/10">→</button>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-[1.5rem] ring-1 ring-[#123D2C]/10">
            <div className="grid grid-cols-7 bg-[#F7FAF2] text-center text-xs font-black text-[#2F6B43]">
              {weekDayLabels.map((label) => <div key={label} className="p-2">{label}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {agendaDays.map((day) => (
                <div key={day.isoDate} className={`min-h-16 border-b border-r border-[#123D2C]/10 p-1.5 ${day.outsideMonth ? "bg-slate-50 text-slate-300" : "bg-white"}`}>
                  <span className="text-xs font-black">{day.dayNumber}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {day.events.slice(0, 3).map((event) => {
                      const tone = eventTone(event);
                      return <span key={event.id} title={event.title ?? "Evento"} className="h-2 w-5 rounded-full" style={{ backgroundColor: tone.background }} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {publicEvents.slice(0, 12).map((event) => {
              const tone = eventTone(event);
              return (
                <article key={event.id} className="rounded-2xl p-3 ring-1" style={{ backgroundColor: tone.soft, borderColor: tone.border }}>
                  <p className="font-black text-[#123D2C]">{event.title || "Evento do Tucxa"}</p>
                  <p className="text-sm font-semibold text-slate-700">{eventDateOnly(event.starts_at) ? longDateLabel(eventDateOnly(event.starts_at)) : "Data a definir"} • {formatEventTime(event)}</p>
                </article>
              );
            })}
            {!publicEvents.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">Nenhum evento público disponível para consulentes neste momento.</p>}
          </div>
        </Modal>
      )}

      {activeModal === "entities" && (
        <Modal title="Escolha a entidade" onClose={() => setActiveModal(null)}>
          <p className="rounded-2xl bg-[#E9F2E7] p-4 text-sm font-bold leading-6 text-[#123D2C]">
            {longDateLabel(selectedDate)} • {weekdayLabel(weekdayFromIso(selectedDate))}. A lista abaixo vem das entidades ativas e liberadas para agendamento neste dia.
          </p>
          <div className="mt-4 grid gap-3">
            {entitiesForSelectedDate.map((entity) => {
              const availability = availabilityMap.get(availabilityKey(entity.id, selectedDate));
              const hasSpot = !availability || availability.available > 0;
              return (
                <article key={entity.id} className="rounded-[1.35rem] bg-white p-4 shadow-sm ring-1 ring-[#123D2C]/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-[#123D2C]">{entity.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{entity.line || entity.entity_type || "Linha/informações a confirmar"}</p>
                      <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${hasSpot ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100" : "bg-red-50 text-red-700 ring-1 ring-red-100"}`}>{capacityLabel(availability)}</p>
                    </div>
                    <div className="grid gap-2 sm:min-w-40">
                      <button type="button" onClick={() => { setSelectedEntityId(entity.id); setActiveModal("entityInfo"); }} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Mais informações</button>
                      <button type="button" onClick={() => openBooking(entity.id)} disabled={!hasSpot} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white disabled:opacity-50">Agendar</button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!entitiesForSelectedDate.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100">Não há entidades ativas para este dia. Escolha outra segunda ou terça disponível.</p>}
          </div>
        </Modal>
      )}

      {activeModal === "entityInfo" && selectedEntity && (
        <Modal title={selectedEntity.name} onClose={() => setActiveModal("entities")}>
          <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-700">
            <p><strong className="text-[#123D2C]">Linha/tipo:</strong> {selectedEntity.line || selectedEntity.entity_type || "A definir"}</p>
            <p><strong className="text-[#123D2C]">Dias:</strong> {(selectedEntity.usual_days ?? []).join(", ") || "Conforme organização da casa"}</p>
            <p><strong className="text-[#123D2C]">Capacidade:</strong> {selectedEntity.daily_capacity ?? 4} atendimento(s) por dia/período</p>
            <p className="rounded-2xl bg-[#E9F2E7] p-4 text-[#123D2C]">{selectedEntity.appointment_notes || "Mais informações podem ser complementadas no cadastro da entidade pela área logada do Tucxa."}</p>
          </div>
          <button type="button" onClick={() => openBooking(selectedEntity.id)} className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white">Agendar com esta entidade</button>
        </Modal>
      )}

      {activeModal === "booking" && selectedEntity && (
        <Modal title="Confirmar agendamento" onClose={() => setActiveModal("entities")}>
          <p className="rounded-2xl bg-[#E9F2E7] p-4 text-sm font-bold leading-6 text-[#123D2C]">
            {selectedEntity.name} • {longDateLabel(form.appointmentDate)} • ordem prevista {selectedAvailability?.nextOrder ?? 1}. Preencha ou confira seus dados antes de enviar.
          </p>
          <form onSubmit={submit} className="mt-4 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Nome completo *</span>
              <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">WhatsApp</span>
              <input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4" placeholder="(19) 99999-9999" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">E-mail</span>
              <input value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4" placeholder="seu@email.com" />
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <input type="checkbox" checked={form.isRecurring} disabled={payload?.settings?.recurringEnabled === false} onChange={(event) => update("isRecurring", event.target.checked)} className="h-5 w-5" />
              <span className="text-sm font-black text-[#123D2C]">Agendamento recorrente</span>
            </label>
            {form.isRecurring && (
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Quantidade de recorrências</span>
                <input value={form.recurrenceCount} onChange={(event) => update("recurrenceCount", event.target.value)} inputMode="numeric" className="rounded-2xl border border-[#123D2C]/15 p-4" />
                <span className="text-xs font-bold text-slate-500">Máximo configurado: {payload?.settings?.maxRecurringAppointmentsPerConsulente ?? 1}</span>
              </label>
            )}
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Observação</span>
              <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-[#123D2C]/15 p-4" placeholder="Escreva apenas o necessário para orientar a recepção." />
            </label>
            {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            <button disabled={saving || loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 disabled:opacity-60">
              {saving ? "Enviando..." : "Confirmar solicitação"}
            </button>
          </form>
        </Modal>
      )}

      {activeModal === "thanks" && confirmation && (
        <Modal title="Agendamento solicitado" onClose={() => setActiveModal(null)}>
          <div className="grid gap-3 text-sm font-bold leading-6 text-[#123D2C]">
            <p className="rounded-2xl bg-emerald-50 p-4 text-emerald-800 ring-1 ring-emerald-100">
              Obrigado. Sua solicitação para {confirmation.entityName} em {longDateLabel(confirmation.date)} foi registrada com ordem prevista {confirmation.order}.
            </p>
            <p className="rounded-2xl bg-[#E9F2E7] p-4">
              Ao chegar, informe seu nome completo, WhatsApp/e-mail e a entidade agendada para a recepção confirmar a ordem de atendimento. As senhas e fichas seguem a orientação da casa e a sequência do atendimento.
            </p>
            <p className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              Venha com respeito, paciência e abertura. Evite retirar senha para outra pessoa e acompanhe a orientação da recepção. {confirmation.emailSent ? "Enviamos também um resumo para o e-mail informado." : "Quando houver e-mail válido e SMTP configurado, um resumo também será enviado por e-mail."}
            </p>
          </div>
          <button type="button" onClick={() => setActiveModal(null)} className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white">Entendi</button>
        </Modal>
      )}
    </main>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[#10251C]/70 px-3 py-5 backdrop-blur-sm sm:py-8">
      <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/20 ring-1 ring-[#123D2C]/10">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#123D2C]/10 bg-white p-4">
          <h2 className="min-w-0 truncate text-lg font-black uppercase tracking-[0.16em] text-[#123D2C] sm:text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white">Fechar</button>
        </header>
        <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}
