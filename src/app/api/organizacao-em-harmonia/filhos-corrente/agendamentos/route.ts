import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isMonthOccurrenceAllowed, monthOccurrenceIndex } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";
import {
  eventAllowsOptionalEntityAppointment,
  eventAllowsPersonGroups,
  eventAllowsThursdayOccurrence,
  eventOverridesRegularThursdaySchedule,
  eventRequiresAttendanceConfirmation,
  eventTargetsAllThursdayGroups,
  eventThursdayGroups,
  isWednesdayTreatmentEvent,
  normalizeBrazilPhone,
  whatsappShareUrl,
} from "@/lib/organizacao-em-harmonia/tucxa-scheduling";

export const dynamic = "force-dynamic";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const ACTIVE_APPOINTMENT_STATUSES = ["confirmado", "solicitado", "aprovado", "presente", "concluido"];
const APPROVED_EVENT_STATUSES = ["aprovado", "ativo", "publicado", "recorrente"];

type AgendaProfile = Record<string, unknown>;
type CurrentFilho = {
  organizationId: string;
  personId: string;
  fullName: string;
  whatsapp: string;
  email: string;
  profile: AgendaProfile;
  groups: Array<"grupo-1" | "grupo-2">;
  canReception: boolean;
};

type AgendaEvent = {
  id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  recurrence_rule: string | null;
  group_slug: string | null;
  event_type: string | null;
  status: string | null;
  active: boolean | null;
  metadata: Record<string, unknown> | null;
};

type EntityRecord = {
  id: string;
  name: string | null;
  line: string | null;
  entity_type: string | null;
  usual_days: string[] | null;
  usual_materials: string | null;
  daily_capacity: number | null;
  appointment_enabled: boolean | null;
  appointment_notes: string | null;
  active: boolean | null;
};

type Period = {
  id: string;
  eventId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  label: string;
  weekday: "segunda" | "terca" | "quarta" | "quinta";
  audience: "self" | "reception";
  group: "grupo-1" | "grupo-2" | null;
  eventTitle: string;
  eventKind: "regular-thursday" | "special-all-groups" | "reception-regular" | "reception-wednesday";
  attendanceRequired: boolean;
  allowEntityAppointment: boolean;
};

type AppointmentRow = {
  id: string;
  person_id: string | null;
  entity_id: string | null;
  event_id: string | null;
  appointment_date: string;
  appointment_time: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
};


type AttendanceRow = {
  id: string;
  event_id: string;
  occurrence_date: string;
  person_id: string;
  status: "confirmed" | "cannot_attend";
  responded_at: string | null;
  checked_in_at: string | null;
};

type ReceptionAccountAccess = {
  login: string;
  authEmail: string;
  temporaryPassword: string;
  loginUrl: string;
  whatsappUrl: string;
  emailSent: boolean;
};

type ReservationResult = {
  appointment_id: string;
  confirmed_date: string;
  confirmed_time: string;
  confirmed_status: string;
  confirmed_order: number;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalize(value: unknown) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
}

function normalizePhone(value: unknown) {
  return normalizeBrazilPhone(value);
}

function normalizeEmail(value: unknown) {
  return asText(value).toLowerCase();
}

function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function requestCode() {
  return crypto.randomUUID().slice(0, 8);
}

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, requestId: code }, { status });
}

function logError(code: string, phase: string, error: unknown) {
  const details = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  console.error("[OH/TUCXA filhos-corrente agendamentos]", {
    requestId: code,
    phase,
    message: error instanceof Error ? error.message : String(error),
    code: details.code,
    details: details.details,
    hint: details.hint,
  });
}

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

function dateFromIso(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weekdaySlug(value: string) {
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][dateFromIso(value).getUTCDay()] || "";
}

function dateOnlyFromTimestamp(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function timeFromTimestamp(value: string | null, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.hour === "24" ? "00" : map.hour}:${map.minute}`;
}

function localTime(event: AgendaEvent, kind: "start" | "end") {
  const metadata = asRecord(event.metadata);
  const candidates = kind === "start"
    ? [metadata.localStart, metadata.local_start]
    : [metadata.localEnd, metadata.local_end];
  for (const candidate of candidates) {
    const match = asText(candidate).match(/T(\d{2}:\d{2})/);
    if (match?.[1]) return match[1];
  }
  return "";
}

function formatTimeLabel(startTime: string, endTime: string, event: AgendaEvent) {
  const metadata = asRecord(event.metadata);
  const configured = asText(metadata.timeLabel ?? metadata.time_label);
  if (configured) return configured.split("•")[0]?.trim() || configured;
  const readable = (value: string) => value.replace(":00", "h");
  return endTime ? `${readable(startTime)} às ${readable(endTime)}` : readable(startTime);
}

function eventText(event: AgendaEvent) {
  return normalize(`${event.title ?? ""} ${event.event_type ?? ""} ${event.group_slug ?? ""}`);
}

function isActiveEvent(event: AgendaEvent) {
  return event.active !== false && APPROVED_EVENT_STATUSES.includes(normalize(event.status));
}

function eventIsBlocker(event: AgendaEvent) {
  if (!isActiveEvent(event)) return false;
  const metadata = asRecord(event.metadata);
  if (metadata.blocksAppointments === true || metadata.blocks_appointments === true || metadata.appointmentBlocked === true) return true;
  const search = eventText(event);
  return search.includes("ferias") || search.includes("recesso") || search.includes("pausa");
}

function eventBlocksDate(event: AgendaEvent, appointmentDate: string) {
  if (!eventIsBlocker(event)) return false;
  const start = dateOnlyFromTimestamp(event.starts_at);
  if (!start) return false;
  const end = dateOnlyFromTimestamp(event.ends_at) || start;
  return appointmentDate >= start && appointmentDate <= end;
}

function recurrencePositions(event: AgendaEvent) {
  const recurrence = asText(event.recurrence_rule).toUpperCase();
  const match = recurrence.match(/BYSETPOS=([0-9,]+)/);
  if (!match?.[1]) return [];
  return match[1].split(",").map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 1 && item <= 5);
}

function eventMatchesDate(event: AgendaEvent, appointmentDate: string) {
  const start = dateOnlyFromTimestamp(event.starts_at);
  if (!start || appointmentDate < start) return false;
  const end = dateOnlyFromTimestamp(event.ends_at);
  if (end && end > start && appointmentDate > end) return false;

  const recurrence = asText(event.recurrence_rule).toUpperCase();
  if (!recurrence) return appointmentDate === start;
  const weekday = weekdaySlug(appointmentDate);
  if (recurrence.includes("BYDAY=MO") && weekday !== "segunda") return false;
  if (recurrence.includes("BYDAY=TU") && weekday !== "terca") return false;
  if (recurrence.includes("BYDAY=TH") && weekday !== "quinta") return false;

  const positions = recurrencePositions(event);
  if (positions.length && !positions.includes(monthOccurrenceIndex(appointmentDate))) return false;
  return isMonthOccurrenceAllowed(event.metadata, appointmentDate);
}


function isReceptionSchedule(event: AgendaEvent) {
  if (!isActiveEvent(event)) return false;
  const search = eventText(event);
  return search.includes("atendimento-segunda")
    || search.includes("grupo-segunda-feira")
    || search.includes("atendimento-terca")
    || search.includes("grupo-terca-feira")
    || (search.includes("filhos de fora") && (search.includes("segunda") || search.includes("terca")));
}

function isWednesdaySchedule(event: AgendaEvent) {
  if (!isActiveEvent(event)) return false;
  const recurrence = asText(event.recurrence_rule).toUpperCase();
  return recurrence.includes("BYDAY=WE") || isWednesdayTreatmentEvent(event);
}

function isThursdaySchedule(event: AgendaEvent, groups: CurrentFilho["groups"]) {
  if (!isActiveEvent(event)) return false;
  return eventAllowsPersonGroups(event, groups);
}

function buildPeriods(events: AgendaEvent[], context: CurrentFilho, horizonDays = 420) {
  const today = todayInSaoPaulo();
  const start = dateFromIso(today);
  const blockers = events.filter(eventIsBlocker);
  const receptionSchedules = context.canReception ? events.filter(isReceptionSchedule) : [];
  const wednesdaySchedules = context.canReception ? events.filter(isWednesdaySchedule) : [];
  const ownSchedules = events.filter((event) => isThursdaySchedule(event, context.groups));
  const periods = new Map<string, Period>();

  for (let index = 0; index < horizonDays; index += 1) {
    const appointmentDate = toIsoDate(addDays(start, index));
    const weekday = weekdaySlug(appointmentDate);
    if (!["segunda", "terca", "quarta", "quinta"].includes(weekday)) continue;
    if (blockers.some((event) => eventBlocksDate(event, appointmentDate))) continue;

    const candidates = weekday === "quinta"
      ? ownSchedules
      : weekday === "quarta"
        ? wednesdaySchedules
        : receptionSchedules;

    candidates
      .filter((event) => eventMatchesDate(event, appointmentDate))
      .filter((event) => {
        if (weekday !== "quinta") return true;
        if (eventTargetsAllThursdayGroups(event) && eventOverridesRegularThursdaySchedule(event)) return true;
        return eventAllowsThursdayOccurrence(event, monthOccurrenceIndex(appointmentDate));
      })
      .forEach((event) => {
        const eventGroups = eventThursdayGroups(event);
        const group = weekday === "quinta" && eventGroups.length === 1 ? eventGroups[0] : null;
        const startTime = localTime(event, "start") || timeFromTimestamp(event.starts_at, "18:00");
        const endTime = localTime(event, "end") || timeFromTimestamp(event.ends_at, "22:00");
        const audience = weekday === "quinta" ? "self" : "reception";
        const eventKind: Period["eventKind"] = weekday === "quinta"
          ? eventTargetsAllThursdayGroups(event) && eventOverridesRegularThursdaySchedule(event)
            ? "special-all-groups"
            : "regular-thursday"
          : weekday === "quarta"
            ? "reception-wednesday"
            : "reception-regular";
        const key = `${audience}::${event.id}::${appointmentDate}::${startTime}`;
        periods.set(key, {
          id: key,
          eventId: event.id,
          appointmentDate,
          startTime,
          endTime,
          label: formatTimeLabel(startTime, endTime, event),
          weekday: weekday as Period["weekday"],
          audience,
          group,
          eventTitle: asText(event.title) || "Atendimento em Harmonia",
          eventKind,
          attendanceRequired: audience === "self" ? eventRequiresAttendanceConfirmation(event, true) : false,
          allowEntityAppointment: audience === "self" ? eventAllowsOptionalEntityAppointment(event, true) : true,
        });
      });
  }

  return [...periods.values()].sort((left, right) => left.appointmentDate.localeCompare(right.appointmentDate) || left.startTime.localeCompare(right.startTime));
}

function normalizedDays(entity: EntityRecord) {
  return (entity.usual_days ?? []).map(normalize).map((value) => value.replace("-feira", ""));
}

function entityMatchesPeriod(entity: EntityRecord, period: Period) {
  if (entity.active !== true || entity.appointment_enabled !== true) return false;
  const days = normalizedDays(entity);
  if (period.weekday === "quinta") {
    const groupDay = period.group === "grupo-1" ? "quinta-grupo-1" : "quinta-grupo-2";
    const hasSpecificThursday = days.some((day) => day.startsWith("quinta-grupo"));
    return hasSpecificThursday ? days.includes(groupDay) : days.includes("quinta");
  }
  return days.includes(period.weekday);
}

function availabilityKey(entityId: string, date: string, time: string) {
  return `${entityId}::${date}::${time}`;
}

function buildAvailability(periods: Period[], entities: EntityRecord[], appointments: AppointmentRow[]) {
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    if (!appointment.entity_id) continue;
    const key = availabilityKey(appointment.entity_id, appointment.appointment_date, appointment.appointment_time || "18:00");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return periods.flatMap((period) => entities
    .filter((entity) => entityMatchesPeriod(entity, period))
    .map((entity) => {
      const capacity = Math.max(1, Number(entity.daily_capacity ?? 4));
      const booked = counts.get(availabilityKey(entity.id, period.appointmentDate, period.startTime)) ?? 0;
      return {
        periodId: period.id,
        entityId: entity.id,
        capacity,
        booked,
        available: Math.max(capacity - booked, 0),
        nextOrder: booked + 1,
      };
    }));
}

function profileValues(profile: AgendaProfile) {
  const functionSlugs = Array.isArray(profile.functionSlugs) ? profile.functionSlugs.map(normalize) : [];
  const selectedFunctions = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions.map((item) => normalize(`${asText(asRecord(item).slug)} ${asText(asRecord(item).label)}`))
    : [];
  const agendaSlugs = Array.isArray(profile.agendaSlugs) ? profile.agendaSlugs.map(normalize) : [];
  const selectedAgenda = Array.isArray(profile.selectedAgenda)
    ? profile.selectedAgenda.map((item) => normalize(`${asText(asRecord(item).slug)} ${asText(asRecord(item).label)}`))
    : [];
  return { functionSlugs, selectedFunctions, agendaSlugs, selectedAgenda };
}

function groupsFromProfile(profile: AgendaProfile): CurrentFilho["groups"] {
  const values = profileValues(profile);
  const haystack = [
    normalize(profile.thursdayGroup),
    ...values.agendaSlugs,
    ...values.selectedAgenda,
  ].join(" ");
  const groups: CurrentFilho["groups"] = [];
  if (/grupo-?1|grupo i\b/.test(haystack)) groups.push("grupo-1");
  if (/grupo-?2|grupo ii\b/.test(haystack)) groups.push("grupo-2");
  return groups;
}

function receptionFromProfile(profile: AgendaProfile) {
  if (profile.supportsReception === true) return true;
  const values = profileValues(profile);
  return [...values.functionSlugs, ...values.selectedFunctions].some((value) => value.includes("recepcao") || value.includes("recepcionista"));
}

async function currentFilho(request: Request): Promise<CurrentFilho | null> {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: person, error: personError } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, whatsapp, email, notification_email, active")
    .eq("auth_user_id", authData.user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (personError || !person?.id || !person.organization_id) return null;

  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, slug, name")
    .eq("id", person.organization_id)
    .maybeSingle();
  if (organizationError || !organization?.id) return null;
  if (normalize(organization.slug) !== "tucxa" && !normalize(organization.name).includes("tucxa")) return null;

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, active, status, role_id, agenda_viva_profile")
    .eq("organization_id", person.organization_id)
    .eq("person_id", person.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership?.id || normalize(membership.status) !== "ativo") return null;

  const profile = asRecord(membership.agenda_viva_profile);
  let roleCanReception = false;
  if (membership.role_id) {
    const { data: role } = await supabaseAdmin
      .from("oh_roles")
      .select("name, slug, active")
      .eq("organization_id", person.organization_id)
      .eq("id", membership.role_id)
      .maybeSingle();
    roleCanReception = role?.active === true && normalize(`${role.slug ?? ""} ${role.name ?? ""}`).includes("recepc");
  }

  return {
    organizationId: person.organization_id,
    personId: person.id,
    fullName: asText(person.full_name) || "Filho da Corrente",
    whatsapp: normalizePhone(person.whatsapp),
    email: normalizeEmail(person.notification_email || person.email),
    profile,
    groups: groupsFromProfile(profile),
    canReception: receptionFromProfile(profile) || roleCanReception,
  };
}

async function settings(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_module_settings")
    .select("module_slug, settings")
    .eq("organization_id", organizationId)
    .in("module_slug", ["agenda-viva", "atendimento-em-harmonia"]);
  if (error) throw error;
  const merged = Object.assign({}, ...(data ?? []).map((row) => asRecord(row.settings)));
  return {
    appointmentEditCutoffMinutes: Math.max(0, Number(merged.appointmentEditCutoffMinutes ?? 1440) || 0),
    appointmentReturnGuidance: asText(merged.appointmentReturnGuidance) || "Siga as orientações da recepção e da entidade no dia do atendimento.",
  };
}

async function loadEvents(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("agv_events")
    .select("id, title, starts_at, ends_at, recurrence_rule, group_slug, event_type, status, active, metadata")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .in("status", APPROVED_EVENT_STATUSES)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as AgendaEvent[];
}

async function loadEntities(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_spiritual_entities")
    .select("id, name, line, entity_type, usual_days, usual_materials, daily_capacity, appointment_enabled, appointment_notes, active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .eq("appointment_enabled", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EntityRecord[];
}

async function appointmentRows(organizationId: string, start: string, end: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, person_id, entity_id, event_id, appointment_date, appointment_time, status, metadata")
    .eq("organization_id", organizationId)
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .in("status", ACTIVE_APPOINTMENT_STATUSES);
  if (error) throw error;
  return (data ?? []) as AppointmentRow[];
}

async function attendanceRows(organizationId: string, personId: string, start: string, end: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_event_attendance_confirmations")
    .select("id, event_id, occurrence_date, person_id, status, responded_at, checked_in_at")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .gte("occurrence_date", start)
    .lte("occurrence_date", end);
  if (error) throw error;
  return (data ?? []) as AttendanceRow[];
}

function editEligibility(date: string, time: string, cutoffMinutes: number) {
  const match = time.match(/(\d{1,2}):(\d{2})/);
  const normalizedTime = match ? `${String(match[1]).padStart(2, "0")}:${match[2]}` : "23:59";
  const start = new Date(`${date}T${normalizedTime}:00-03:00`);
  if (Number.isNaN(start.getTime())) return { canEdit: false, reason: "Horário não confirmado." };
  const canEdit = Date.now() < start.getTime() - cutoffMinutes * 60_000;
  return {
    canEdit,
    reason: canEdit ? "" : "O prazo de edição definido pelo TUCXA terminou. Você ainda pode excluir este agendamento.",
  };
}

function existingAppointments(periods: Period[], entities: EntityRecord[], rows: AppointmentRow[], personId: string, cutoffMinutes: number) {
  const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
  return rows
    .filter((row) => row.person_id === personId)
    .flatMap((row) => {
      const period = periods.find((item) => item.appointmentDate === row.appointment_date && item.startTime === (row.appointment_time || "18:00"));
      if (!period) return [];
      const eligibility = editEligibility(row.appointment_date, row.appointment_time || "23:59", cutoffMinutes);
      return [{
        id: row.id,
        periodId: period.id,
        appointmentDate: row.appointment_date,
        appointmentTime: period.label,
        entityId: row.entity_id,
        entityName: entityMap.get(row.entity_id || "")?.name || "Entidade a confirmar",
        order: Number(asRecord(row.metadata).order ?? 0) || null,
        status: row.status,
        canEdit: eligibility.canEdit,
        editBlockedReason: eligibility.reason,
      }];
    });
}

async function bundle(context: CurrentFilho) {
  const today = todayInSaoPaulo();
  const horizon = toIsoDate(addDays(dateFromIso(today), 420));
  const [eventRows, entityRows, appointments, settingRows, attendance] = await Promise.all([
    loadEvents(context.organizationId),
    loadEntities(context.organizationId),
    appointmentRows(context.organizationId, today, horizon),
    settings(context.organizationId),
    attendanceRows(context.organizationId, context.personId, today, horizon),
  ]);
  const periods = buildPeriods(eventRows, context);
  const periodIdsByAttendanceKey = new Map(periods.map((period) => [`${period.eventId}::${period.appointmentDate}`, period.id]));
  return {
    profile: {
      fullName: context.fullName,
      whatsapp: context.whatsapp,
      email: context.email,
      groups: context.groups,
      canReception: context.canReception,
    },
    settings: settingRows,
    periods,
    entities: entityRows,
    availability: buildAvailability(periods, entityRows, appointments),
    existingAppointments: existingAppointments(periods, entityRows, appointments, context.personId, settingRows.appointmentEditCutoffMinutes),
    attendanceConfirmations: attendance.flatMap((item) => {
      const periodId = periodIdsByAttendanceKey.get(`${item.event_id}::${item.occurrence_date}`);
      return periodId ? [{ ...item, periodId }] : [];
    }),
  };
}

function entityForPeriod(entities: EntityRecord[], entityId: string, period: Period) {
  return entities.find((entity) => entity.id === entityId && entityMatchesPeriod(entity, period)) || null;
}

function reservationError(error: unknown) {
  const message = error instanceof Error ? error.message : asText(asRecord(error).message);
  if (message.includes("NO_AVAILABILITY")) return { status: 409, message: "A última vaga deste período acabou de ser preenchida." };
  if (message.includes("DUPLICATE_APPOINTMENT")) return { status: 409, message: "Já existe um agendamento ativo para esta pessoa neste dia e período." };
  if (message.includes("APPOINTMENT_NOT_FOUND")) return { status: 404, message: "Agendamento não localizado." };
  return { status: 500, message: "Não foi possível confirmar o agendamento agora." };
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function consulenteLoginUrl() {
  return `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/consulente/login`;
}

function syntheticEmailFromPhone(phone: string) {
  return `tucxa-consulente-${phone}@organizacao-em-harmonia.local`;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

async function sendReceptionAccessEmail(input: {
  to: string;
  fullName: string;
  login: string;
  temporaryPassword?: string;
  appointment?: { date: string; period: string; entity: string };
}) {
  if (!input.to || process.env.EMAIL_NOTIFICATIONS_ENABLED === "false" || !hasSmtpConfig()) return false;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const appointmentLines = input.appointment
    ? ["", "Agendamento:", `Data: ${input.appointment.date}`, `Período: ${input.appointment.period}`, `Entidade: ${input.appointment.entity}`]
    : [];
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Automação Extrema"}" <${process.env.EMAIL_FROM}>`,
    to: input.to,
    subject: "[TUCXA] Acesso ao Organização em Harmonia",
    text: [
      `Olá, ${input.fullName}.`,
      "",
      "Seu acesso como Consulente / Filho de Fora foi criado pela Recepção do TUCXA.",
      `Link: ${consulenteLoginUrl()}`,
      `Login: ${input.login}`,
      ...(input.temporaryPassword ? [`Senha temporária: ${input.temporaryPassword}`, "", "Troque a senha após o primeiro acesso e não compartilhe estes dados."] : []),
      ...appointmentLines,
    ].join("\n"),
  });
  return true;
}

async function findPersonByPhone(organizationId: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return null;

  const { data: direct, error: directError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, whatsapp, email, notification_email, active, auth_user_id, normalized_whatsapp")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .eq("normalized_whatsapp", normalized)
    .limit(1)
    .maybeSingle();
  if (directError && !String(directError.message || "").includes("normalized_whatsapp")) throw directError;
  if (direct?.id) return direct;

  const { data, error } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, whatsapp, email, notification_email, active, auth_user_id")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .not("whatsapp", "is", null)
    .limit(1500);
  if (error) throw error;
  return (data ?? []).find((person) => normalizePhone(person.whatsapp) === normalized) || null;
}

function maskPhone(value: unknown) {
  const digits = normalizePhone(value);
  if (digits.length < 4) return "Não informado";
  return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
}

function maskEmail(value: unknown) {
  const email = normalizeEmail(value);
  const [local, domain] = email.split("@");
  if (!local || !domain || domain.endsWith(".local")) return "Não informado";
  return `${local.slice(0, 2)}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

async function defaultConsulenteRoleId(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .in("slug", ["consulente", "filho-de-fora", "visitante", "membro"])
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function ensureReceptionConsulenteAccount(input: {
  context: CurrentFilho;
  person: { id: string; auth_user_id?: string | null };
  fullName: string;
  whatsapp: string;
  email: string;
  password: string;
}) {
  const authEmail = input.email || syntheticEmailFromPhone(input.whatsapp);
  let authUserId = input.person.auth_user_id || "";
  const metadata = {
    full_name: input.fullName,
    whatsapp: input.whatsapp,
    organization_id: input.context.organizationId,
    oh_profile: "consulente",
    oh_access_status: "active",
    must_change_password: true,
    created_by_reception: input.context.personId,
  };

  if (authUserId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      email: authEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: input.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    authUserId = data.user.id;
  }

  const { error: personError } = await supabaseAdmin
    .from("oh_people")
    .update({
      auth_user_id: authUserId,
      email: authEmail,
      notification_email: input.email || null,
      normalized_whatsapp: input.whatsapp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.person.id)
    .eq("organization_id", input.context.organizationId);
  if (personError) throw personError;

  const roleId = await defaultConsulenteRoleId(input.context.organizationId);
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id")
    .eq("organization_id", input.context.organizationId)
    .eq("person_id", input.person.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;

  const membershipPayload = {
    organization_id: input.context.organizationId,
    person_id: input.person.id,
    role_id: roleId,
    module_slugs: ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"],
    active: true,
    status: "ativo",
    is_main_contact: false,
    can_receive_notifications: Boolean(input.email || input.whatsapp),
    agenda_viva_profile: {
      publico: "consulente-filho-de-fora",
      canScheduleAttendance: true,
      validationStatus: "ativo",
      accessReleasedAt: new Date().toISOString(),
      accessType: "consulente-filho-de-fora",
      registrationSource: "recepcao",
    },
    updated_at: new Date().toISOString(),
  };
  const membershipWrite = membership?.id
    ? supabaseAdmin.from("oh_memberships").update(membershipPayload).eq("id", membership.id)
    : supabaseAdmin.from("oh_memberships").insert(membershipPayload);
  const { error: membershipWriteError } = await membershipWrite;
  if (membershipWriteError) throw membershipWriteError;

  return { authEmail, authUserId };
}

async function createReceptionPerson(context: CurrentFilho, body: Record<string, unknown>) {
  if (!context.canReception) throw new Error("PERMISSION_DENIED");
  const fullName = asText(body.fullName);
  const whatsapp = normalizePhone(body.whatsapp);
  const email = normalizeEmail(body.email);
  const password = asText(body.password);
  const privacyAccepted = body.privacyAccepted === true;
  if (!fullName) throw new Error("Informe o nome completo do Consulente.");
  if (whatsapp.length < 10) throw new Error("Informe o WhatsApp com DDD.");
  if (email && !email.includes("@")) throw new Error("Confira o e-mail informado.");
  if (password.length < 8) throw new Error("Defina uma senha temporária com pelo menos 8 caracteres.");
  if (!privacyAccepted) throw new Error("Confirme a ciência do Aviso de Privacidade.");

  const existing = await findPersonByPhone(context.organizationId, whatsapp);
  if (existing?.id) {
    return { person: existing, access: null as ReceptionAccountAccess | null };
  }

  const now = new Date().toISOString();
  const authEmail = email || syntheticEmailFromPhone(whatsapp);
  const { data, error } = await supabaseAdmin
    .from("oh_people")
    .insert({
      organization_id: context.organizationId,
      full_name: fullName,
      whatsapp,
      normalized_whatsapp: whatsapp,
      email: authEmail,
      notification_email: email || null,
      active: true,
      privacy_notice_accepted_at: now,
      privacy_notice_version: "2026-07-20",
      privacy_notice_source: "recepcao",
      registration_source: "recepcao",
      created_by_person_id: context.personId,
    })
    .select("id, full_name, whatsapp, email, notification_email, active, auth_user_id")
    .single();
  if (error) throw error;

  const account = await ensureReceptionConsulenteAccount({
    context,
    person: data,
    fullName,
    whatsapp,
    email,
    password,
  });
  const login = whatsapp;
  const message = [
    `Olá, ${fullName}.`,
    "Seu cadastro como Consulente / Filho de Fora do TUCXA foi criado.",
    `Acesso: ${consulenteLoginUrl()}`,
    `Login: ${login}`,
    `Senha temporária: ${password}`,
    "Troque a senha após o primeiro acesso.",
  ].join("\n");
  const emailSent = email
    ? await sendReceptionAccessEmail({ to: email, fullName, login, temporaryPassword: password }).catch(() => false)
    : false;

  return {
    person: { ...data, auth_user_id: account.authUserId },
    access: {
      login,
      authEmail: account.authEmail,
      temporaryPassword: password,
      loginUrl: consulenteLoginUrl(),
      whatsappUrl: whatsappShareUrl(whatsapp, message),
      emailSent,
    } satisfies ReceptionAccountAccess,
  };
}

async function reserveOnBehalf(
  context: CurrentFilho,
  target: { id: string; full_name: string | null; whatsapp: string | null; email?: string | null; notification_email?: string | null },
  period: Period,
  entity: EntityRecord,
  body: Record<string, unknown>,
  channel: "filho_corrente" | "recepcao",
) {
  const idempotencyKey = asText(body.idempotencyKey) || crypto.randomUUID();
  const notes = asText(body.notes);
  const email = normalizeEmail(target.notification_email || target.email);
  const basePayload = {
    p_organization_id: context.organizationId,
    p_person_id: target.id,
    p_entity_id: entity.id,
    p_event_id: period.eventId,
    p_appointment_date: period.appointmentDate,
    p_appointment_time: period.startTime,
    p_consulente_name: asText(target.full_name) || "Pessoa atendida",
    p_whatsapp: normalizePhone(target.whatsapp) || null,
    p_email: email || null,
    p_notes: notes || null,
    p_capacity: Math.max(1, Number(entity.daily_capacity ?? 4)),
    p_idempotency_key: idempotencyKey,
    p_scheduled_by_person_id: context.personId,
    p_booking_channel: channel,
    p_metadata: {
      source: channel === "recepcao" ? "filho_corrente_recepcao" : "filho_corrente_autosservico",
      period_id: period.id,
      period_label: period.label,
      period_end_time: period.endTime,
      group: period.group,
      event_kind: period.eventKind,
      scheduled_by_name: context.fullName,
    },
  };

  const rpcName = channel === "recepcao" ? "oh_reserve_reception_appointment" : "oh_reserve_appointment_on_behalf";
  const rpcPayload = channel === "recepcao"
    ? {
        ...basePayload,
        p_recommended_by_entity_id: asText(body.recommendedByEntityId) || null,
        p_age_at_appointment: Number(body.ageAtAppointment || 0) || null,
        p_treatment_need: asText(body.treatmentNeed) || null,
      }
    : basePayload;
  const { data, error } = await supabaseAdmin.rpc(rpcName, rpcPayload);
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as ReservationResult | null;
}

export async function GET(request: Request) {
  const code = requestCode();
  try {
    const context = await currentFilho(request);
    if (!context) return jsonError("Sua sessão expirou ou seu cadastro ainda não está ativo.", 401, code);
    return NextResponse.json(await bundle(context));
  } catch (error) {
    logError(code, "GET", error);
    return jsonError("Não foi possível carregar os agendamentos. Informe o código exibido se o erro continuar.", 500, code);
  }
}

export async function POST(request: Request) {
  const code = requestCode();
  try {
    const context = await currentFilho(request);
    if (!context) return jsonError("Sua sessão expirou ou seu cadastro ainda não está ativo.", 401, code);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "search-consulente") {
      if (!context.canReception) return jsonError("Somente a Recepção pode pesquisar Consulentes para agendamento.", 403, code);
      const person = await findPersonByPhone(context.organizationId, asText(body.whatsapp));
      if (!person) return NextResponse.json({ ok: true, found: false });
      return NextResponse.json({
        ok: true,
        found: true,
        person: {
          id: person.id,
          fullName: person.full_name,
          whatsapp: maskPhone(person.whatsapp),
          email: maskEmail(person.notification_email || person.email),
        },
      });
    }

    if (action === "create-consulente") {
      const created = await createReceptionPerson(context, body);
      return NextResponse.json({
        ok: true,
        person: {
          id: created.person.id,
          fullName: created.person.full_name,
          whatsapp: maskPhone(created.person.whatsapp),
          email: maskEmail(created.person.notification_email || created.person.email),
        },
        access: created.access,
      });
    }

    if (action === "set-attendance") {
      const periodId = asText(body.periodId);
      const status = asText(body.status) as "confirmed" | "cannot_attend";
      if (!periodId || !["confirmed", "cannot_attend"].includes(status)) {
        return jsonError("Escolha uma resposta de presença válida.", 400, code);
      }
      const currentBundle = await bundle(context);
      const period = currentBundle.periods.find((item) => item.id === periodId && item.audience === "self");
      if (!period) return jsonError("Este encontro não está disponível para o seu grupo.", 403, code);
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("oh_event_attendance_confirmations")
        .upsert({
          organization_id: context.organizationId,
          event_id: period.eventId,
          occurrence_date: period.appointmentDate,
          person_id: context.personId,
          group_slug: period.group,
          status,
          response_source: "painel_filho_corrente",
          responded_at: now,
          updated_at: now,
          metadata: { event_title: period.eventTitle, event_kind: period.eventKind },
        }, { onConflict: "organization_id,event_id,occurrence_date,person_id" })
        .select("id, event_id, occurrence_date, person_id, status, responded_at, checked_in_at")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, attendance: { ...data, periodId } });
    }

    if (action === "cancel-self") {
      const appointmentId = asText(body.appointmentId);
      if (!appointmentId) return jsonError("Agendamento não localizado.", 400, code);
      const now = new Date().toISOString();
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id, metadata")
        .eq("organization_id", context.organizationId)
        .eq("person_id", context.personId)
        .eq("id", appointmentId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment?.id) return jsonError("Agendamento não localizado.", 404, code);
      const { error: cancelError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          status: "cancelado",
          cancelled_at: now,
          cancelled_by_person_id: context.personId,
          cancellation_reason: "Cancelado pelo Filho da Corrente",
          metadata: { ...asRecord(appointment.metadata), cancellation_source: "filho_corrente", cancelled_at: now },
          updated_at: now,
        })
        .eq("id", appointmentId);
      if (cancelError) throw cancelError;
      return NextResponse.json({ ok: true, message: "Agendamento excluído. A vaga foi liberada." });
    }

    const currentBundle = await bundle(context);
    const periodId = asText(body.periodId);
    const entityId = asText(body.entityId);
    const period = currentBundle.periods.find((item) => item.id === periodId);
    if (!period) return jsonError("Este período não está mais disponível.", 409, code);
    const entity = entityForPeriod(currentBundle.entities, entityId, period);
    if (!entity) return jsonError("Esta entidade não está disponível neste período.", 409, code);
    const availability = currentBundle.availability.find((item) => item.periodId === period.id && item.entityId === entity.id);
    if (!availability || availability.available <= 0) return jsonError("Não há mais vagas para esta entidade neste período.", 409, code);

    if (action === "reschedule-self") {
      if (period.audience !== "self") return jsonError("Escolha uma quinta-feira correspondente ao seu grupo.", 403, code);
      const appointmentId = asText(body.appointmentId);
      if (!appointmentId) return jsonError("Agendamento não localizado.", 400, code);
      const { data: currentAppointment, error: currentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id, appointment_date, appointment_time, status")
        .eq("organization_id", context.organizationId)
        .eq("person_id", context.personId)
        .eq("id", appointmentId)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!currentAppointment?.id) return jsonError("Agendamento não localizado.", 404, code);
      if (!ACTIVE_APPOINTMENT_STATUSES.includes(asText(currentAppointment.status))) {
        return jsonError("Este agendamento não pode mais ser alterado.", 409, code);
      }
      const eligibility = editEligibility(
        currentAppointment.appointment_date,
        currentAppointment.appointment_time || "23:59",
        currentBundle.settings.appointmentEditCutoffMinutes,
      );
      if (!eligibility.canEdit) return jsonError(eligibility.reason, 409, code);
      const { data: changed, error: changeError } = await supabaseAdmin.rpc(
        "oh_reschedule_consulente_appointment",
        {
          p_appointment_id: appointmentId,
          p_organization_id: context.organizationId,
          p_person_id: context.personId,
          p_entity_id: entity.id,
          p_event_id: period.eventId,
          p_appointment_date: period.appointmentDate,
          p_appointment_time: period.startTime,
          p_capacity: Math.max(1, Number(entity.daily_capacity ?? 4)),
          p_idempotency_key: asText(body.idempotencyKey) || crypto.randomUUID(),
          p_metadata: {
            source: "filho_corrente_reschedule",
            period_id: period.id,
            period_label: period.label,
            period_end_time: period.endTime,
            group: period.group,
            scheduled_by_person_id: context.personId,
          },
        },
      );
      if (changeError) throw changeError;
      const reservation = (Array.isArray(changed) ? changed[0] : changed) as ReservationResult | null;
      if (!reservation?.appointment_id) throw new Error("Alteração sem identificador.");
      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.appointment_id,
          appointmentDate: reservation.confirmed_date,
          appointmentTime: period.label,
          entityName: entity.name || "Entidade escolhida",
          order: reservation.confirmed_order,
          status: reservation.confirmed_status,
        },
      });
    }

    if (action === "book-self") {
      if (period.audience !== "self") return jsonError("Escolha uma quinta-feira correspondente ao seu grupo.", 403, code);
      if (!period.allowEntityAppointment) return jsonError("Este encontro aceita confirmação de presença, mas não possui agendamento com entidade.", 409, code);
      const reservation = await reserveOnBehalf(
        context,
        { id: context.personId, full_name: context.fullName, whatsapp: context.whatsapp, email: context.email },
        period,
        entity,
        body,
        "filho_corrente",
      );
      if (!reservation?.appointment_id) throw new Error("Reserva sem identificador.");
      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.appointment_id,
          appointmentDate: reservation.confirmed_date,
          appointmentTime: period.label,
          entityName: entity.name || "Entidade escolhida",
          order: reservation.confirmed_order,
          status: reservation.confirmed_status,
        },
      });
    }

    if (action === "book-reception") {
      if (!context.canReception || period.audience !== "reception") {
        return jsonError("Somente a Recepção pode agendar Consulentes nas segundas, terças e quartas autorizadas.", 403, code);
      }
      const targetPersonId = asText(body.targetPersonId);
      if (!targetPersonId) return jsonError("Confirme ou cadastre o Consulente antes de continuar.", 400, code);
      const { data: target, error: targetError } = await supabaseAdmin
        .from("oh_people")
        .select("id, full_name, whatsapp, email, notification_email, active")
        .eq("organization_id", context.organizationId)
        .eq("id", targetPersonId)
        .eq("active", true)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target?.id) return jsonError("Cadastro do Consulente não localizado.", 404, code);

      if (period.weekday === "quarta") {
        const recommendedByEntityId = asText(body.recommendedByEntityId);
        const ageAtAppointment = Number(body.ageAtAppointment || 0);
        const treatmentNeed = asText(body.treatmentNeed);
        if (!recommendedByEntityId) return jsonError("Informe qual entidade recomendou o atendimento de quarta-feira.", 400, code);
        if (!Number.isInteger(ageAtAppointment) || ageAtAppointment < 0 || ageAtAppointment > 120) {
          return jsonError("Informe uma idade válida.", 400, code);
        }
        if (treatmentNeed.length < 5) return jsonError("Descreva brevemente a necessidade do atendimento de quarta-feira.", 400, code);
        const referringEntity = currentBundle.entities.find((item) => item.id === recommendedByEntityId && item.active === true);
        if (!referringEntity) return jsonError("A entidade que recomendou não foi localizada.", 404, code);
      }

      const reservation = await reserveOnBehalf(context, target, period, entity, body, "recepcao");
      if (!reservation?.appointment_id) throw new Error("Reserva sem identificador.");

      const actualEmail = normalizeEmail(target.notification_email || target.email);
      const login = normalizePhone(target.whatsapp);
      const appointmentMessage = [
        `Olá, ${asText(target.full_name) || "Consulente"}.`,
        "Seu agendamento no TUCXA foi confirmado.",
        `Data: ${reservation.confirmed_date}`,
        `Período: ${period.label}`,
        `Entidade: ${entity.name || "Entidade escolhida"}`,
        `Ordem: ${reservation.confirmed_order}`,
        `Acesso: ${consulenteLoginUrl()}`,
        `Login: ${login || actualEmail}`,
      ].join("\n");
      const emailSent = actualEmail && !actualEmail.endsWith(".local")
        ? await sendReceptionAccessEmail({
            to: actualEmail,
            fullName: asText(target.full_name) || "Consulente",
            login: login || actualEmail,
            temporaryPassword: asText(body.temporaryPassword) || undefined,
            appointment: { date: reservation.confirmed_date, period: period.label, entity: entity.name || "Entidade escolhida" },
          }).catch(() => false)
        : false;

      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.appointment_id,
          appointmentDate: reservation.confirmed_date,
          appointmentTime: period.label,
          entityName: entity.name || "Entidade escolhida",
          order: reservation.confirmed_order,
          status: reservation.confirmed_status,
          personName: target.full_name,
          weekday: period.weekday,
        },
        delivery: {
          emailSent,
          whatsappUrl: whatsappShareUrl(target.whatsapp, appointmentMessage),
          login: login || actualEmail,
          loginUrl: consulenteLoginUrl(),
        },
      });
    }

    return jsonError("Ação não reconhecida.", 400, code);
  } catch (error) {
    const friendly = reservationError(error);
    if (friendly.status >= 500) logError(code, "POST", error);
    return jsonError(friendly.message, friendly.status, code);
  }
}
