import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isMonthOccurrenceAllowed } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";

export const dynamic = "force-dynamic";

type EventRecord = {
  id: string;
  title: string | null;
  event_type: string | null;
  event_type_id: string | null;
  status: string | null;
  active: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean | null;
  recurrence_rule: string | null;
  location_id: string | null;
  location: string | null;
  group_slug: string | null;
  responsible_person_id: string | null;
  created_by_person_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type PersonRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  auth_user_id?: string | null;
};

type MembershipRecord = {
  id: string;
  person_id: string;
  active: boolean | null;
  status: string | null;
  agenda_viva_profile: Record<string, unknown> | null;
};


type AppointmentRecord = {
  id: string;
  person_id: string | null;
  entity_id: string | null;
  appointment_date: string;
  appointment_time: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
};

type SpiritualEntityRecord = {
  id: string;
  name: string | null;
};

type LookupRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
};

type AgendaEvent = {
  id: string;
  title: string;
  status: string;
  eventType: string;
  eventTypeLabel: string;
  classification: string;
  eventCollection: string;
  calendarColorKey: string;
  eventSubtype: string;
  audience: string;
  responsiblePersonId: string;
  responsiblePersonName: string;
  associatedToCurrentPerson: boolean;
  startsAt: string | null;
  endsAt: string | null;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  recurrenceLabel: string;
  notes: string;
  continuesDuringVacation: boolean;
};

type AgendaPreferences = {
  defaultView?: string;
  periodMode?: string;
  eventTypes?: string[];
  classification?: string;
  audience?: string;
  responsible?: string;
  startDate?: string;
  endDate?: string;
  showAnnualGuide?: boolean;
  calendarMode?: string;
};

const weekDayMap: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const calendarViews = new Set(["schedule", "day", "threeDays", "week", "month", "year"]);
const calendarModes = new Set(["tucxa", "events", "sementinha", "mine", "interactive"]);

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function labelFromSlug(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1))
    .join(" ");
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function displayEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.endsWith("@organizacao-em-harmonia.local") ? "" : email;
}

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id, name").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return { id: bySlug.id as string, name: asText(bySlug.name) || "Tucxa" };

  const { data: byName } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return byName?.id ? { id: byName.id as string, name: asText(byName.name) || "Tucxa" } : null;
}

async function currentFilho(request: Request, organizationId: string) {
  const token = bearerToken(request);
  if (!token) throw new Error("Sessão expirada. Entre novamente no painel do Filho da Corrente.");

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Sessão inválida. Entre novamente no painel do Filho da Corrente.");

  const user = userData.user;
  const email = user.email || "";

  let person: PersonRecord | null = null;

  const byAuth = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, auth_user_id")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuth.error) throw byAuth.error;
  if (byAuth.data?.id) person = byAuth.data as PersonRecord;

  if (!person && email) {
    const byEmail = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, auth_user_id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data?.id) person = byEmail.data as PersonRecord;
  }

  if (!person) throw new Error("Cadastro do Filho da Corrente não localizado.");

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, person_id, active, status, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", person.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership?.id || membership.active !== true || membership.status !== "ativo") {
    throw new Error("Seu acesso ainda não está liberado para consultar a Agenda Viva.");
  }

  return { user, person, membership: membership as MembershipRecord };
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null) {
  const date = parseDate(value);
  if (!date) return "Data a definir";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatHour(value: string | null) {
  const date = parseDate(value);
  if (!date) return "";
  const [hour = "", minute = ""] = date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).split(":");
  return minute === "00" ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}

function formatTime(event: EventRecord) {
  if (event.all_day) return "Dia inteiro";
  const start = formatHour(event.starts_at);
  const end = formatHour(event.ends_at);
  if (start && end) return `${start} às ${end}`;
  if (start) return `A partir de ${start}`;
  return "Horário a definir";
}

function recurrenceLabel(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  const explicit = asText(metadata.recurrenceLabel) || asText(metadata.periodicityLabel) || asText(metadata.recorrenciaLabel);
  if (explicit) return explicit;
  const rule = asText(event.recurrence_rule).toUpperCase();
  if (!rule) return "Evento pontual";
  if (rule.includes("INTERVAL=2")) return "Recorrência quinzenal";
  if (rule.includes("FREQ=MONTHLY")) return "Recorrência mensal";
  if (rule.includes("FREQ=WEEKLY")) return "Recorrência semanal";
  return "Evento recorrente";
}

function metadataList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  const text = asText(value);
  return text ? [text] : [];
}

function metadataBoolean(event: EventRecord, keys: string[], fallback = false) {
  const metadata = asRecord(event.metadata);
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(metadata, key)) continue;
    const value = metadata[key];
    if (typeof value === "boolean") return value;
    const text = normalize(asText(value));
    if (["true", "1", "sim", "s", "yes"].includes(text)) return true;
    if (["false", "0", "nao", "não", "n", "no"].includes(text)) return false;
  }
  return fallback;
}

function continuesDuringVacation(event: EventRecord) {
  return metadataBoolean(event, ["continuesDuringVacation", "continues_during_vacation", "keepDuringVacation", "mantemNasFerias"], false);
}

function shouldShowEvent(event: EventRecord) {
  const status = normalize(asText(event.status));

  // O calendário histórico "Eventos do TUCXA" mantém datas inativas/reprovadas
  // para representar fielmente o calendário físico, sempre sinalizadas como inativas.
  if (event.active === false && isEventosDoTucxa(event)) {
    return !new Set(["pendente_aprovacao", "pendente", "rascunho", "draft", "cancelado", "cancelled"]).has(status);
  }

  if (event.active === false) return false;
  const hidden = new Set(["pendente_aprovacao", "pendente", "reprovado", "ajuste_solicitado", "rascunho", "draft", "cancelado", "cancelled"]);
  return !hidden.has(status);
}
function isVacationEvent(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  const text = `${event.title ?? ""} ${event.event_type ?? ""} ${event.group_slug ?? ""} ${asText(metadata.eventTypeLabel)} ${asText(metadata.classification)}`;
  const normalized = normalize(text);
  return normalized.includes("ferias") || normalized.includes("recesso");
}

function isUmbandaEvent(event: EventRecord) {
  return normalize(eventClassification(event)).includes("umbanda");
}

function addVacationRange(keys: Set<string>, year: number, startMonth: number, startDay: number, endMonth: number, endDay: number) {
  let cursor = new Date(Date.UTC(year, startMonth, startDay, 12));
  const end = new Date(Date.UTC(year, endMonth, endDay, 12));
  while (cursor <= end) {
    keys.add(toIsoDate(cursor));
    cursor = addDays(cursor, 1);
  }
}

function vacationDateKeys(events: EventRecord[]) {
  const keys = new Set<string>();
  addVacationRange(keys, 2026, 0, 1, 0, 28);
  addVacationRange(keys, 2026, 6, 1, 6, 29);
  addVacationRange(keys, 2026, 11, 21, 11, 31);
  events.filter(isVacationEvent).forEach((event) => {
    const startIso = localDateIso(event.starts_at);
    const endIso = localDateIso(event.ends_at) || startIso;
    if (!startIso) return;
    let cursor = dateFromIso(startIso);
    const last = dateFromIso(endIso);
    while (cursor <= last) {
      keys.add(toIsoDate(cursor));
      cursor = addDays(cursor, 1);
    }
  });
  return keys;
}

function removeUmbandaDuringVacations(events: EventRecord[]) {
  const vacationKeys = vacationDateKeys(events);
  if (vacationKeys.size === 0) return events;
  return events.filter((event) => {
    if (isVacationEvent(event) || !isUmbandaEvent(event) || continuesDuringVacation(event)) return true;
    const key = localDateIso(event.starts_at);
    return !key || !vacationKeys.has(key);
  });
}


function eventClassification(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  const raw = asText(metadata.eventClassification) || asText(metadata.event_classification) || asText(metadata.classification) || asText(metadata.classificacao);
  return raw || (normalize(`${event.event_type ?? ""} ${event.title ?? ""}`).includes("umbanda") ? "Umbanda" : "Outros");
}

function eventCollection(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  return (
    asText(metadata.eventCollection) ||
    asText(metadata.event_collection) ||
    asText(metadata.collection) ||
    asText(metadata.calendarCollection) ||
    asText(metadata.calendar_collection)
  );
}

function calendarColorKey(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  return asText(metadata.calendarColorKey) || asText(metadata.calendar_color_key);
}

function eventSubtype(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  return (
    asText(metadata.sementinhaEventType) ||
    asText(metadata.sementinha_event_type) ||
    asText(metadata.eventSubtype) ||
    asText(metadata.event_subtype)
  );
}

function eventAudience(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  return asText(metadata.audience) || asText(metadata.publico) || asText(metadata.targetAudience) || "Filhos da Corrente";
}

function mapById<T extends LookupRecord>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function localDateIso(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function localTime(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "00:00";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

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

function startOfWeek(date: Date) {
  const base = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
  base.setUTCDate(base.getUTCDate() - base.getUTCDay());
  return base;
}

function parseRRule(rule: string | null | undefined) {
  const cleanRule = asText(rule).replace(/^RRULE:/i, "").toUpperCase();
  const result: Record<string, string> = {};
  cleanRule.split(";").forEach((part) => {
    const [key = "", value = ""] = part.split("=");
    if (key && value) result[key] = value;
  });
  return result;
}

function monthDatesForBySetPos(year: number, month: number, weekday: number, positions: number[]) {
  const dates: Date[] = [];
  const cursor = new Date(Date.UTC(year, month, 1, 12));
  while (cursor.getUTCMonth() === month) {
    if (cursor.getUTCDay() === weekday) dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return positions.flatMap((position) => {
    if (position > 0) return dates[position - 1] ? [dates[position - 1]] : [];
    const index = dates.length + position;
    return dates[index] ? [dates[index]] : [];
  });
}

function buildOccurrence(event: EventRecord, occurrenceDateIso: string, occurrenceIndex: number): EventRecord {
  if (!event.recurrence_rule) return event;

  const startTime = localTime(event.starts_at);
  const endTime = localTime(event.ends_at);
  const startsAt = event.all_day ? `${occurrenceDateIso}T00:00:00-03:00` : `${occurrenceDateIso}T${startTime}:00-03:00`;
  let endsAt: string | null = null;

  if (event.ends_at && !event.all_day) {
    const startHour = Number(startTime.slice(0, 2));
    const startMinute = Number(startTime.slice(3, 5));
    const endHour = Number(endTime.slice(0, 2));
    const endMinute = Number(endTime.slice(3, 5));
    const endDate = endHour < startHour || (endHour === startHour && endMinute <= startMinute) ? toIsoDate(addDays(dateFromIso(occurrenceDateIso), 1)) : occurrenceDateIso;
    endsAt = `${endDate}T${endTime}:00-03:00`;
  }

  return {
    ...event,
    id: `${event.id}__${occurrenceDateIso}__${occurrenceIndex}`,
    starts_at: startsAt,
    ends_at: endsAt,
  };
}

function expandRecurringEvent(event: EventRecord) {
  const rule = parseRRule(event.recurrence_rule);
  if (!rule.FREQ || !event.starts_at) return [event];

  const startIso = localDateIso(event.starts_at);
  if (!startIso) return [event];

  const startDate = dateFromIso(startIso);
  const endIso = event.ends_at && localDateIso(event.ends_at) !== startIso ? localDateIso(event.ends_at) : `${startDate.getUTCFullYear()}-12-31`;
  const endDate = dateFromIso(endIso);
  const interval = Math.max(Number(rule.INTERVAL || "1") || 1, 1);
  const byDays = asText(rule.BYDAY)
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean);
  const positions = asText(rule.BYSETPOS)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item !== 0);

  const occurrences: EventRecord[] = [];

  if (rule.FREQ === "WEEKLY") {
    const allowedWeekdays = byDays.length > 0 ? new Set(byDays.map((day) => weekDayMap[day]).filter((item) => item !== undefined)) : new Set([startDate.getUTCDay()]);
    const startWeek = startOfWeek(startDate);
    let cursor = new Date(startDate);
    let index = 0;

    while (cursor <= endDate && index < 370) {
      const weekDiff = Math.floor((startOfWeek(cursor).getTime() - startWeek.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weekDiff >= 0 && weekDiff % interval === 0 && allowedWeekdays.has(cursor.getUTCDay())) {
        const occurrenceDate = toIsoDate(cursor);
        if (isMonthOccurrenceAllowed(event.metadata, occurrenceDate)) {
          occurrences.push(buildOccurrence(event, occurrenceDate, occurrences.length));
        }
      }
      cursor = addDays(cursor, 1);
      index += 1;
    }
  }

  if (rule.FREQ === "MONTHLY") {
    let cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1, 12));
    let monthIndex = 0;

    while (cursor <= endDate && monthIndex < 36) {
      if (monthIndex % interval === 0) {
        if (byDays.length > 0) {
          byDays.forEach((byDay) => {
            const weekday = weekDayMap[byDay];
            if (weekday === undefined) return;
            const dates = positions.length > 0 ? monthDatesForBySetPos(cursor.getUTCFullYear(), cursor.getUTCMonth(), weekday, positions) : monthDatesForBySetPos(cursor.getUTCFullYear(), cursor.getUTCMonth(), weekday, [1]);
            dates.forEach((date) => {
              if (date >= startDate && date <= endDate) {
                const occurrenceDate = toIsoDate(date);
                if (isMonthOccurrenceAllowed(event.metadata, occurrenceDate)) {
                  occurrences.push(buildOccurrence(event, occurrenceDate, occurrences.length));
                }
              }
            });
          });
        } else {
          const date = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), startDate.getUTCDate(), 12));
          if (date.getUTCMonth() === cursor.getUTCMonth() && date >= startDate && date <= endDate) {
            const occurrenceDate = toIsoDate(date);
            if (isMonthOccurrenceAllowed(event.metadata, occurrenceDate)) {
              occurrences.push(buildOccurrence(event, occurrenceDate, occurrences.length));
            }
          }
        }
      }
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1, 12));
      monthIndex += 1;
    }
  }

  return occurrences.length > 0 ? occurrences : [event];
}


function canonicalTaxonomy(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "");
}

function isEventosDoTucxa(event: EventRecord) {
  const collection = canonicalTaxonomy(eventCollection(event));
  return ["eventosdotucxa", "eventostucxa"].includes(collection);
}

function appointmentOrder(metadataValue: unknown) {
  const metadata = asRecord(metadataValue);
  const candidate = Number(metadata.order ?? metadata.confirmed_order ?? metadata.appointment_order ?? 0);
  return Number.isFinite(candidate) && candidate > 0 ? Math.trunc(candidate) : null;
}

function appointmentTimes(value: string | null) {
  const text = asText(value);
  const matches = Array.from(text.matchAll(/(\d{1,2})(?::|h)(\d{2})?/gi));
  const normalizePart = (match: RegExpMatchArray | undefined, fallbackHour: number) => {
    const hour = Math.min(23, Math.max(0, Number(match?.[1] ?? fallbackHour)));
    const minute = Math.min(59, Math.max(0, Number(match?.[2] ?? 0)));
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };
  return {
    start: normalizePart(matches[0], 12),
    end: normalizePart(matches[1], matches[0] ? Math.min(Number(matches[0][1]) + 4, 23) : 16),
  };
}

function appointmentInstant(dateIso: string, time: string) {
  const value = new Date(`${dateIso}T${time}:00-03:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function appointmentDateLabel(dateIso: string) {
  const [year = "", month = "", day = ""] = dateIso.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  if (Number.isNaN(date.getTime())) return dateIso;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

async function personalAppointmentEvents(organizationId: string, personId: string): Promise<AgendaEvent[]> {
  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, person_id, entity_id, appointment_date, appointment_time, status, metadata")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .order("appointment_date", { ascending: true })
    .limit(500);
  if (appointmentsError) throw appointmentsError;

  const appointmentRows = (appointments ?? []) as AppointmentRecord[];
  const entityIds = Array.from(new Set(appointmentRows.map((item) => item.entity_id).filter((value): value is string => Boolean(value))));
  const { data: entities, error: entitiesError } = entityIds.length
    ? await supabaseAdmin.from("oh_spiritual_entities").select("id, name").in("id", entityIds)
    : { data: [] as SpiritualEntityRecord[], error: null };
  if (entitiesError) throw entitiesError;

  const entityById = new Map(((entities ?? []) as SpiritualEntityRecord[]).map((entity) => [entity.id, asText(entity.name)]));
  return appointmentRows.map((appointment) => {
    const status = asText(appointment.status) || "confirmado";
    const normalizedStatus = canonicalTaxonomy(status);
    const metadata = asRecord(appointment.metadata);
    const periodLabel = asText(metadata.period_label) || asText(appointment.appointment_time) || "Horário a confirmar";
    const periodEndTime = asText(metadata.period_end_time);
    const times = appointmentTimes([periodLabel, periodEndTime].filter(Boolean).join(" às "));
    const order = appointmentOrder(metadata);
    const entityName = appointment.entity_id ? entityById.get(appointment.entity_id) || "Entidade a confirmar" : "Entidade a confirmar";
    const title = normalizedStatus.includes("presente") ? "Presença confirmada" : "Meu atendimento";
    const details = [
      periodLabel,
      entityName,
      order ? `Ordem ${order}` : "",
    ].filter(Boolean).join(" • ");

    return {
      id: `appointment:${appointment.id}`,
      title,
      status,
      eventType: "agendamento",
      eventTypeLabel: "Agendamento",
      classification: "Agendamento",
      eventCollection: "meu",
      calendarColorKey: "agendamento",
      eventSubtype: "appointment",
      audience: "Pessoal",
      responsiblePersonId: "",
      responsiblePersonName: "Tucxa",
      associatedToCurrentPerson: true,
      startsAt: appointmentInstant(appointment.appointment_date, times.start),
      endsAt: appointmentInstant(appointment.appointment_date, times.end),
      dateLabel: appointmentDateLabel(appointment.appointment_date),
      timeLabel: periodLabel,
      locationLabel: entityName,
      recurrenceLabel: details,
      notes: "",
      continuesDuringVacation: true,
    };
  });
}

function agendaPreferences(profile: Record<string, unknown>): AgendaPreferences {
  const primaryPreferences = asRecord(profile.agendaPreferences);
  const fallbackPreferences = asRecord(profile.agendaViewPreferences);
  const preferences = Object.keys(primaryPreferences).length > 0 ? primaryPreferences : fallbackPreferences;
  const defaultView = asText(preferences.defaultView);
  const periodMode = asText(preferences.periodMode);
  return {
    defaultView: calendarViews.has(defaultView) ? defaultView : "month",
    periodMode: periodMode === "all" ? "all" : "future",
    eventTypes: Array.isArray(preferences.eventTypes) ? preferences.eventTypes.map((item) => asText(item)).filter(Boolean) : [],
    classification: asText(preferences.classification),
    audience: asText(preferences.audience),
    responsible: asText(preferences.responsible),
    startDate: asText(preferences.startDate),
    endDate: asText(preferences.endDate),
    showAnnualGuide: false,
    calendarMode: calendarModes.has(asText(preferences.calendarMode)) ? asText(preferences.calendarMode) : "tucxa",
  };
}

function normalizePreferences(value: unknown): AgendaPreferences {
  const record = asRecord(value);
  const defaultView = asText(record.defaultView);
  const periodMode = asText(record.periodMode);
  return {
    defaultView: calendarViews.has(defaultView) ? defaultView : "month",
    periodMode: periodMode === "all" ? "all" : "future",
    eventTypes: Array.isArray(record.eventTypes) ? record.eventTypes.map((item) => asText(item)).filter(Boolean) : [],
    classification: asText(record.classification),
    audience: asText(record.audience),
    responsible: asText(record.responsible),
    startDate: asText(record.startDate),
    endDate: asText(record.endDate),
    showAnnualGuide: false,
    calendarMode: calendarModes.has(asText(record.calendarMode)) ? asText(record.calendarMode) : "tucxa",
  };
}

function eventPayload(event: EventRecord, context: { currentPersonId: string; selectedAgendaSlugs: string[]; selectedFunctionSlugs: string[]; eventTypes: Map<string, LookupRecord>; locations: Map<string, LookupRecord>; people: Map<string, LookupRecord> }): AgendaEvent {
  const metadata = asRecord(event.metadata);
  const typeRecord = event.event_type_id ? context.eventTypes.get(event.event_type_id) : null;
  const locationRecord = event.location_id ? context.locations.get(event.location_id) : null;
  const responsible = event.responsible_person_id ? context.people.get(event.responsible_person_id) : null;
  const eventType = asText(event.event_type) || asText(typeRecord?.slug) || "atividade";
  const groupSlug = asText(event.group_slug);
  const associatedPersonIds = [
    ...metadataList(metadata.personIds),
    ...metadataList(metadata.associatedPersonIds),
    ...metadataList(metadata.pessoasAssociadas),
    asText(event.responsible_person_id),
    asText(event.created_by_person_id),
  ].filter(Boolean);
  const associatedAgendaSlugs = [
    groupSlug,
    eventType,
    asText(typeRecord?.slug),
    ...metadataList(metadata.agendaSlugs),
    ...metadataList(metadata.associatedAgendaSlugs),
  ].filter(Boolean);
  const associatedFunctionSlugs = [
    ...metadataList(metadata.functionSlugs),
    ...metadataList(metadata.associatedFunctionSlugs),
    ...metadataList(metadata.funcoesAssociadas),
  ].filter(Boolean);

  return {
    id: event.id,
    title: asText(event.title) || labelFromSlug(eventType),
    status: event.active === false ? "inativo" : asText(event.status) || "ativo",
    eventType,
    eventTypeLabel: asText(typeRecord?.name) || labelFromSlug(eventType),
    classification: eventClassification(event),
    eventCollection: eventCollection(event),
    calendarColorKey: calendarColorKey(event),
    eventSubtype: eventSubtype(event),
    audience: eventAudience(event),
    responsiblePersonId: asText(event.responsible_person_id),
    responsiblePersonName: asText(responsible?.name) || "Responsável a definir",
    associatedToCurrentPerson:
      associatedPersonIds.includes(context.currentPersonId) ||
      associatedAgendaSlugs.some((slug) => context.selectedAgendaSlugs.includes(slug)) ||
      associatedFunctionSlugs.some((slug) => context.selectedFunctionSlugs.includes(slug)),
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    dateLabel: formatDate(event.starts_at),
    timeLabel: formatTime(event),
    locationLabel: asText(locationRecord?.name) || asText(event.location) || asText(metadata.locationLabel) || "Local a definir",
    recurrenceLabel: recurrenceLabel(event),
    notes: asText(event.notes),
    continuesDuringVacation: continuesDuringVacation(event),
  };
}

export async function GET(request: Request) {
  try {
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");

    const current = await currentFilho(request, organization.id);
    const profile = asRecord(current.membership.agenda_viva_profile);
    const selectedAgendaSlugs = Array.isArray(profile.agendaSlugs) ? profile.agendaSlugs.map((item) => asText(item)).filter(Boolean) : [];
    const selectedFunctionSlugs = Array.isArray(profile.functionSlugs) ? profile.functionSlugs.map((item) => asText(item)).filter(Boolean) : [];

    const [eventsResult, typesResult, locationsResult, peopleResult] = await Promise.all([
      supabaseAdmin
        .from("agv_events")
        .select("id, title, event_type, event_type_id, status, active, starts_at, ends_at, all_day, recurrence_rule, location_id, location, group_slug, responsible_person_id, created_by_person_id, notes, metadata, created_at, updated_at")
        .eq("organization_id", organization.id)
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(500),
      supabaseAdmin.from("agv_event_types").select("id, name, slug").eq("organization_id", organization.id),
      supabaseAdmin.from("oh_locations").select("id, name").eq("organization_id", organization.id),
      supabaseAdmin.from("oh_people").select("id, full_name").eq("organization_id", organization.id),
    ]);

    if (eventsResult.error) throw eventsResult.error;
    if (typesResult.error) throw typesResult.error;
    if (locationsResult.error) throw locationsResult.error;
    if (peopleResult.error) throw peopleResult.error;

    const eventTypes = mapById((typesResult.data ?? []) as LookupRecord[]);
    const locations = mapById((locationsResult.data ?? []) as LookupRecord[]);
    const people = mapById((peopleResult.data ?? []) as LookupRecord[]);

    const expandedEvents = ((eventsResult.data ?? []) as EventRecord[])
      .filter(shouldShowEvent)
      .flatMap(expandRecurringEvent);

    const agendaEvents = removeUmbandaDuringVacations(expandedEvents)
      .map((event) => eventPayload(event, { currentPersonId: current.person.id, selectedAgendaSlugs, selectedFunctionSlugs, eventTypes, locations, people }));
    const appointmentEvents = await personalAppointmentEvents(organization.id, current.person.id);
    const events = [...agendaEvents, ...appointmentEvents]
      .sort((a, b) => (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999"));

    return NextResponse.json({
      ok: true,
      organization,
      currentPerson: {
        id: current.person.id,
        fullName: current.person.full_name || "Filho da Corrente",
        email: displayEmail(current.person.email),
        whatsapp: current.person.whatsapp || "",
      },
      selectedAgendaSlugs,
      selectedFunctionSlugs,
      agendaPreferences: agendaPreferences(profile),
      events,
      filters: {
        eventTypes: Array.from(new Map(events.map((event) => [event.eventType, { value: event.eventType, label: event.eventTypeLabel }])).values()),
        classifications: Array.from(new Set(events.map((event) => event.classification).filter(Boolean))),
        audiences: Array.from(new Set(events.map((event) => event.audience).filter(Boolean))),
        responsiblePeople: Array.from(new Map(events.map((event) => [event.responsiblePersonId || event.responsiblePersonName, { value: event.responsiblePersonId || event.responsiblePersonName, label: event.responsiblePersonName }])).values()).filter((item) => item.label !== "Responsável a definir"),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar Agenda Viva dos Filhos da Corrente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");

    const current = await currentFilho(request, organization.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);
    if (action !== "savePreferences") throw new Error("Ação inválida para a Agenda Viva.");

    const preferences = normalizePreferences(body.preferences);
    const previousProfile = asRecord(current.membership.agenda_viva_profile);
    const now = new Date().toISOString();
    const nextProfile = {
      ...previousProfile,
      agendaPreferences: preferences,
      agendaViewPreferences: preferences,
      agendaPreferencesUpdatedAt: now,
    };

    const { error } = await supabaseAdmin
      .from("oh_memberships")
      .update({
        agenda_viva_profile: nextProfile,
        updated_at: now,
      })
      .eq("id", current.membership.id)
      .eq("person_id", current.person.id)
      .eq("organization_id", organization.id);

    if (error) throw error;

    return NextResponse.json({ ok: true, agendaPreferences: preferences, message: "Padrão da Agenda Viva salvo com sucesso." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar padrão da Agenda Viva.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
