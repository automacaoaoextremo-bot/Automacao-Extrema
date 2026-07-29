import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isRecurringWeekdayOccurrenceAllowed, monthOccurrenceIndex } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";
import { resolveAppointmentCapabilities } from "@/lib/organizacao-em-harmonia/appointment-permissions";
import {
  eventAllowsOptionalEntityAppointment,
  eventAllowsPersonGroups,
  eventAllowsThursdayOccurrence,
  eventOverridesRegularThursdaySchedule,
  eventPanelLabel,
  eventRequiresAttendanceConfirmation,
  eventTargetsAllThursdayGroups,
  eventThursdayGroups,
  isReturnFromVacationEvent,
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
  activeFunctionIds: string[];
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

function realNotificationEmail(value: unknown) {
  const email = normalizeEmail(value);
  const [localPart, domain = ""] = email.split("@");

  if (!localPart || !domain || !domain.includes(".")) return "";
  if (domain === "organizacao-em-harmonia.local" || domain.endsWith(".local")) return "";

  return email;
}


function formatDateForMessage(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
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
  return isRecurringWeekdayOccurrenceAllowed(event.metadata, appointmentDate);
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
  if (isReturnFromVacationEvent(event)) return groups.length > 0;
  return eventAllowsPersonGroups(event, groups);
}

function buildPeriods(events: AgendaEvent[], context: CurrentFilho, appointmentSettings: Awaited<ReturnType<typeof settings>>, horizonDays = 420) {
  const today = todayInSaoPaulo();
  const start = dateFromIso(today);
  const blockers = events.filter(eventIsBlocker);
  const canBookWednesday = context.canReception || context.activeFunctionIds.some((id) => appointmentSettings.wednesdayAuthorizedFunctionIds.includes(id));
  const receptionSchedules = context.canReception ? events.filter(isReceptionSchedule) : [];
  const wednesdaySchedules = canBookWednesday ? events.filter(isWednesdaySchedule) : [];
  const ownSchedules = events.filter((event) => isThursdaySchedule(event, context.groups));
  const periods = new Map<string, Period>();

  for (let index = 0; index < horizonDays; index += 1) {
    const appointmentDate = toIsoDate(addDays(start, index));
    const weekday = weekdaySlug(appointmentDate);
    if (!["segunda", "terca", "quarta", "quinta"].includes(weekday)) continue;
    const dateBlocked = blockers.some((event) => eventBlocksDate(event, appointmentDate));

    const candidates = weekday === "quinta"
      ? ownSchedules
      : weekday === "quarta"
        ? wednesdaySchedules
        : receptionSchedules;

    candidates
      .filter((event) => eventMatchesDate(event, appointmentDate))
      .filter((event) => {
        if (!dateBlocked) return true;
        return weekday === "quinta"
          && (isReturnFromVacationEvent(event)
            || (eventTargetsAllThursdayGroups(event) && eventOverridesRegularThursdaySchedule(event)));
      })
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
          ? (isReturnFromVacationEvent(event) || (eventTargetsAllThursdayGroups(event) && eventOverridesRegularThursdaySchedule(event)))
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
          eventTitle: eventPanelLabel(event) || asText(event.title) || "Atendimento em Harmonia",
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
    const hasSpecificThursday = days.some((day) => day.startsWith("quinta-grupo"));
    if (period.eventKind === "special-all-groups") {
      return days.includes("quinta") || hasSpecificThursday;
    }
    const groupDay = period.group === "grupo-1" ? "quinta-grupo-1" : "quinta-grupo-2";
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

function profileItemText(value: unknown) {
  const item = asRecord(value);
  return normalize([
    asText(item.slug),
    asText(item.label),
    asText(item.title),
    asText(item.name),
    asText(item.description),
    asText(item.dateLabel),
    asText(item.date_label),
  ].filter(Boolean).join(" "));
}

function profileValues(profile: AgendaProfile) {
  const approvedSnapshot = asRecord(asRecord(profile.approvedProfileSnapshot).profile);
  const sources = [profile, approvedSnapshot].filter((item) => Object.keys(item).length > 0);
  const functionSlugs = sources.flatMap((source) => Array.isArray(source.functionSlugs) ? source.functionSlugs.map(normalize) : []);
  const selectedFunctions = sources.flatMap((source) => Array.isArray(source.selectedFunctions) ? source.selectedFunctions.map(profileItemText) : []);
  const agendaSlugs = sources.flatMap((source) => Array.isArray(source.agendaSlugs) ? source.agendaSlugs.map(normalize) : []);
  const selectedAgenda = sources.flatMap((source) => Array.isArray(source.selectedAgenda) ? source.selectedAgenda.map(profileItemText) : []);
  return { functionSlugs, selectedFunctions, agendaSlugs, selectedAgenda };
}

function groupsFromProfile(profile: AgendaProfile): CurrentFilho["groups"] {
  const values = profileValues(profile);
  const haystack = [
    normalize(profile.thursdayGroup),
    normalize(profile.thursday_group),
    normalize(profile.groupSlug),
    normalize(profile.group_slug),
    normalize(profile.group),
    ...values.agendaSlugs,
    ...values.selectedAgenda,
  ].join(" ");
  const groups: CurrentFilho["groups"] = [];
  if (/grupo-?1|grupo\s*1|grupo i\b|quinta-grupo-1/.test(haystack)) groups.push("grupo-1");
  if (/grupo-?2|grupo\s*2|grupo ii\b|quinta-grupo-2/.test(haystack)) groups.push("grupo-2");
  return groups;
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

  const [{ data: membership, error: membershipError }, { data: roles, error: rolesError }] = await Promise.all([
    supabaseAdmin
      .from("oh_memberships")
      .select("id, active, status, role_id, agenda_viva_profile")
      .eq("organization_id", person.organization_id)
      .eq("person_id", person.id)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_roles")
      .select("id, name, slug, active")
      .eq("organization_id", person.organization_id)
      .eq("active", true),
  ]);
  if (membershipError || rolesError || !membership?.id || normalize(membership.status) !== "ativo") return null;

  const profile = asRecord(membership.agenda_viva_profile);
  const capabilities = resolveAppointmentCapabilities({ profile, roles: roles ?? [] });

  return {
    organizationId: person.organization_id,
    personId: person.id,
    fullName: asText(person.full_name) || "Filho da Corrente",
    whatsapp: normalizePhone(person.whatsapp),
    email: realNotificationEmail(person.notification_email) || realNotificationEmail(person.email),
    profile,
    groups: groupsFromProfile(profile),
    canReception: capabilities.canReception,
    activeFunctionIds: capabilities.activeFunctionIds,
  };
}

async function settings(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_module_settings")
    .select("module_slug, settings")
    .eq("organization_id", organizationId)
    .in("module_slug", ["agenda-viva", "atendimento-em-harmonia"]);
  if (error) throw error;
  const rows = data ?? [];
  const atendimentoSettings = rows.find((row) => row.module_slug === "atendimento-em-harmonia");
  const agendaSettings = rows.find((row) => row.module_slug === "agenda-viva");
  const merged = {
    ...asRecord(atendimentoSettings?.settings),
    ...asRecord(agendaSettings?.settings),
  };
  return {
    appointmentEditCutoffMinutes: Math.max(0, Number(merged.appointmentEditCutoffMinutes ?? 1440) || 0),
    appointmentReturnGuidance: asText(merged.appointmentReturnGuidance) || "Siga as orientações da recepção e da entidade no dia do atendimento.",
    maxRecurringAppointmentsPerConsulente: Math.max(1, Math.trunc(Number(merged.maxRecurringAppointmentsPerConsulente ?? 2) || 2)),
    autoCancelRecurringOnAbsence: merged.autoCancelRecurringOnAbsence !== false,
    wednesdayAuthorizedFunctionIds: Array.isArray(merged.wednesdayAuthorizedFunctionIds)
      ? merged.wednesdayAuthorizedFunctionIds.map((item) => asText(item)).filter(Boolean)
      : [],
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
  const periods = buildPeriods(eventRows, context, settingRows);
  const periodIdsByAttendanceKey = new Map(periods.map((period) => [`${period.eventId}::${period.appointmentDate}`, period.id]));
  return {
    profile: {
      fullName: context.fullName,
      whatsapp: context.whatsapp,
      email: context.email,
      groups: context.groups,
      canReception: context.canReception,
      canBookWednesday: context.canReception || context.activeFunctionIds.some((id) => settingRows.wednesdayAuthorizedFunctionIds.includes(id)),
      canScheduleConsulente: context.canReception || context.activeFunctionIds.some((id) => settingRows.wednesdayAuthorizedFunctionIds.includes(id)),
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
  if (message.includes("PHONE_DDD_REQUIRED")) return { status: 409, message: "Encontramos mais de um cadastro com esse número sem DDD. Informe também o DDD." };
  if (message.includes("RECURRENCE_LIMIT:")) return { status: 409, message: `A configuração permite no máximo ${message.split(":")[1] || "o número definido"} ocorrência(s) por série.` };
  if (message.includes("RECURRENCE_PERIODS_UNAVAILABLE")) return { status: 409, message: "Não existem datas futuras suficientes com o mesmo dia e período para completar a recorrência." };
  if (message.includes("RECURRENCE_NO_AVAILABILITY:")) return { status: 409, message: `Não há vaga para a mesma entidade na data ${message.split(":")[1] || "selecionada"}. Nenhum agendamento da série foi criado.` };
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

type ReceptionDeliveryAppointment = {
  date: string;
  period: string;
  entity: string;
  order?: number | null;
};

async function sendReceptionAccessEmail(input: {
  to: string;
  fullName: string;
  login: string;
  temporaryPassword?: string;
  appointments?: ReceptionDeliveryAppointment[];
}) {
  const recipient = realNotificationEmail(input.to);
  if (!recipient || process.env.EMAIL_NOTIFICATIONS_ENABLED === "false" || !hasSmtpConfig()) return false;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const appointments = input.appointments ?? [];
  const appointmentLines = appointments.length > 0
    ? [
        "",
        appointments.length > 1 ? `${appointments.length} agendamentos confirmados:` : "Agendamento confirmado:",
        ...appointments.flatMap((appointment, index) => [
          "",
          ...(appointments.length > 1 ? [`Agendamento ${index + 1}:`] : []),
          `Data: ${formatDateForMessage(appointment.date)}`,
          `Período: ${appointment.period}`,
          `Entidade: ${appointment.entity}`,
          ...(appointment.order ? [`Ordem: ${appointment.order}`] : []),
        ]),
      ]
    : [];
  await transporter.sendMail({
    from: `"${process.env.OH_TUCXA_EMAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || "Tucxa em Harmonia"}" <${process.env.EMAIL_FROM}>`,
    to: recipient,
    subject: appointments.length > 0 ? "[TUCXA] Agendamento confirmado" : "[TUCXA] Acesso ao Organização em Harmonia",
    text: [
      `Olá, ${input.fullName}.`,
      "",
      "Seu acesso como Consulente / Filho de Fora foi criado ou confirmado pela Recepção do TUCXA.",
      `Link: ${consulenteLoginUrl()}`,
      `Login: ${input.login}`,
      ...(input.temporaryPassword ? [`Senha temporária: ${input.temporaryPassword}`, "", "Troque esta senha no primeiro acesso e não compartilhe estes dados."] : []),
      ...appointmentLines,
    ].join("\n"),
  });
  return true;
}

function filhoAppointmentsUrl() {
  return `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/consultar-agendamentos`;
}

async function sendFilhoAppointmentConfirmationEmail(input: {
  to: string;
  fullName: string;
  appointments: ReceptionDeliveryAppointment[];
}) {
  const recipient = realNotificationEmail(input.to);
  if (!recipient || process.env.EMAIL_NOTIFICATIONS_ENABLED === "false" || !hasSmtpConfig()) return false;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"${process.env.OH_TUCXA_EMAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || "Tucxa em Harmonia"}" <${process.env.EMAIL_FROM}>`,
    to: recipient,
    subject: input.appointments.length > 1
      ? `[TUCXA] ${input.appointments.length} agendamentos confirmados`
      : "[TUCXA] Agendamento confirmado",
    text: [
      `Olá, ${input.fullName}.`,
      "",
      input.appointments.length > 1
        ? `Seus ${input.appointments.length} agendamentos foram confirmados.`
        : "Seu agendamento foi confirmado.",
      ...input.appointments.flatMap((appointment, index) => [
        "",
        ...(input.appointments.length > 1 ? [`Agendamento ${index + 1} de ${input.appointments.length}:`] : []),
        `Data: ${formatDateForMessage(appointment.date)}`,
        `Período: ${appointment.period}`,
        `Entidade: ${appointment.entity}`,
        ...(appointment.order ? [`Ordem: ${appointment.order}`] : []),
      ]),
      "",
      "Consulte os agendamentos:",
      filhoAppointmentsUrl(),
    ].join("\n"),
  });

  return true;
}

function filhoAppointmentWhatsappMessage(input: {
  fullName: string;
  appointments: ReceptionDeliveryAppointment[];
}) {
  return [
    "Tucxa em Harmonia",
    "",
    `Olá, ${input.fullName}.`,
    input.appointments.length > 1
      ? `Seus ${input.appointments.length} agendamentos foram confirmados.`
      : "Seu agendamento foi confirmado.",
    ...input.appointments.flatMap((appointment, index) => [
      "",
      ...(input.appointments.length > 1 ? [`Agendamento ${index + 1} de ${input.appointments.length}:`] : []),
      `Data: ${formatDateForMessage(appointment.date)}`,
      `Período: ${appointment.period}`,
      `Entidade: ${appointment.entity}`,
      ...(appointment.order ? [`Ordem: ${appointment.order}`] : []),
    ]),
    "",
    `Consulte os agendamentos: ${filhoAppointmentsUrl()}`,
  ].join("\n");
}

async function findPersonByPhone(organizationId: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) return { person: null, ambiguous: false };

  const selectFields = "id, full_name, whatsapp, email, notification_email, active, auth_user_id, normalized_whatsapp";

  if (normalized.length >= 10) {
    const { data: direct, error: directError } = await supabaseAdmin
      .from("oh_people")
      .select(selectFields)
      .eq("organization_id", organizationId)
      .eq("active", true)
      .eq("normalized_whatsapp", normalized)
      .limit(1)
      .maybeSingle();
    if (directError && !String(directError.message || "").includes("normalized_whatsapp")) throw directError;
    if (direct?.id) return { person: direct, ambiguous: false };
  }

  const { data, error } = await supabaseAdmin
    .from("oh_people")
    .select(selectFields)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .not("whatsapp", "is", null)
    .limit(1500);
  if (error) throw error;

  const matches = (data ?? []).filter((person) => {
    const candidate = normalizePhone(person.normalized_whatsapp || person.whatsapp);
    return normalized.length >= 10 ? candidate === normalized : candidate.endsWith(normalized);
  });

  if (matches.length === 1) return { person: matches[0], ambiguous: false };
  return { person: null, ambiguous: matches.length > 1 };
}

function maskPhone(value: unknown) {
  const digits = normalizePhone(value);
  if (digits.length < 4) return "Não informado";
  return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
}

function maskEmail(value: unknown) {
  const email = realNotificationEmail(value);
  const [local, domain] = email.split("@");
  if (!local || !domain) return "";
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

async function createReceptionPerson(
  context: CurrentFilho,
  body: Record<string, unknown>,
  canScheduleConsulente: boolean,
) {
  if (!canScheduleConsulente) throw new Error("PERMISSION_DENIED");
  const fullName = asText(body.fullName);
  const whatsapp = normalizePhone(body.whatsapp);
  const rawEmail = normalizeEmail(body.email);
  const email = rawEmail ? realNotificationEmail(rawEmail) : "";
  const password = asText(body.password);
  const privacyAccepted = body.privacyAccepted === true;
  if (!fullName) throw new Error("Informe o nome completo do Consulente.");
  if (whatsapp.length < 10) throw new Error("Informe o WhatsApp com DDD.");
  if (rawEmail && !email) throw new Error("Confira o e-mail informado.");
  if (password.length < 8) throw new Error("Defina uma senha temporária com pelo menos 8 caracteres.");
  if (!privacyAccepted) throw new Error("Confirme a ciência do Aviso de Privacidade.");

  const existingLookup = await findPersonByPhone(context.organizationId, whatsapp);
  if (existingLookup.ambiguous) throw new Error("PHONE_DDD_REQUIRED");
  if (existingLookup.person?.id) {
    return { person: existingLookup.person, access: null as ReceptionAccountAccess | null };
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
    "Tucxa em Harmonia",
    "",
    `Olá, ${fullName}.`,
    "Seu cadastro como Consulente / Filho de Fora do TUCXA foi criado.",
    `Acesso: ${consulenteLoginUrl()}`,
    `Login: ${login}`,
    `Senha temporária: ${password}`,
    "Troque esta senha no primeiro acesso.",
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
  const email = realNotificationEmail(target.notification_email) || realNotificationEmail(target.email);
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
      recurrence_series_id: asText(body.recurrenceSeriesId) || null,
      recurrence_sequence: Number(body.recurrenceSequence || 0) || null,
      recurrence_total: Number(body.recurrenceTotal || 0) || null,
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

function recurrenceCount(body: Record<string, unknown>, maximum: number) {
  const requested = Math.max(1, Math.trunc(Number(body.recurrenceCount ?? 1) || 1));
  if (requested > maximum) throw new Error(`RECURRENCE_LIMIT:${maximum}`);
  return requested;
}

function recurrencePeriods(periods: Period[], base: Period, count: number) {
  return periods
    .filter((candidate) => candidate.audience === base.audience)
    .filter((candidate) => candidate.weekday === base.weekday)
    .filter((candidate) => candidate.startTime === base.startTime)
    .filter((candidate) => candidate.appointmentDate >= base.appointmentDate)
    .filter((candidate) => base.audience !== "self" || candidate.group === base.group)
    .sort((left, right) => left.appointmentDate.localeCompare(right.appointmentDate))
    .slice(0, count);
}

async function reserveRecurringSeries(input: {
  context: CurrentFilho;
  currentBundle: Awaited<ReturnType<typeof bundle>>;
  target: { id: string; full_name: string | null; whatsapp: string | null; email?: string | null; notification_email?: string | null };
  basePeriod: Period;
  entity: EntityRecord;
  body: Record<string, unknown>;
  channel: "filho_corrente" | "recepcao";
}) {
  const total = recurrenceCount(input.body, input.currentBundle.settings.maxRecurringAppointmentsPerConsulente);
  const occurrences = recurrencePeriods(input.currentBundle.periods, input.basePeriod, total);
  if (occurrences.length !== total) throw new Error("RECURRENCE_PERIODS_UNAVAILABLE");

  for (const occurrence of occurrences) {
    const matchedEntity = entityForPeriod(input.currentBundle.entities, input.entity.id, occurrence);
    const availability = input.currentBundle.availability.find((item) => item.periodId === occurrence.id && item.entityId === input.entity.id);
    if (!matchedEntity || !availability || availability.available <= 0) {
      throw new Error(`RECURRENCE_NO_AVAILABILITY:${occurrence.appointmentDate}`);
    }
  }

  const seriesId = total > 1 ? crypto.randomUUID() : "";
  const createdIds: string[] = [];
  const appointments: Array<{ id: string; appointmentDate: string; appointmentTime: string; entityName: string; order: number; status: string }> = [];
  try {
    for (let index = 0; index < occurrences.length; index += 1) {
      const occurrence = occurrences[index];
      const reservation = await reserveOnBehalf(
        input.context,
        input.target,
        occurrence,
        input.entity,
        {
          ...input.body,
          idempotencyKey: `${asText(input.body.idempotencyKey) || crypto.randomUUID()}-${index + 1}`,
          recurrenceSeriesId: seriesId,
          recurrenceSequence: index + 1,
          recurrenceTotal: total,
        },
        input.channel,
      );
      if (!reservation?.appointment_id) throw new Error("Reserva recorrente sem identificador.");
      createdIds.push(reservation.appointment_id);
      appointments.push({
        id: reservation.appointment_id,
        appointmentDate: reservation.confirmed_date || occurrence.appointmentDate,
        appointmentTime: occurrence.label,
        entityName: input.entity.name || "Entidade escolhida",
        order: reservation.confirmed_order,
        status: reservation.confirmed_status,
      });
    }

    if (seriesId && createdIds.length > 0) {
      const { error: seriesError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({ is_recurring: true, recurrence_count: total, recurrence_total: total, series_id: seriesId, updated_at: new Date().toISOString() })
        .in("id", createdIds)
        .eq("organization_id", input.context.organizationId);
      if (seriesError) throw seriesError;
      await Promise.all(createdIds.map(async (appointmentId, index) => {
        const { error: sequenceError } = await supabaseAdmin
          .from("oh_consulente_appointments")
          .update({ recurrence_sequence: index + 1 })
          .eq("organization_id", input.context.organizationId)
          .eq("id", appointmentId);
        if (sequenceError) throw sequenceError;
      }));
    }
    return { seriesId: seriesId || null, appointments };
  } catch (error) {
    if (createdIds.length > 0) {
      await supabaseAdmin.from("oh_consulente_appointments").delete().in("id", createdIds).eq("organization_id", input.context.organizationId);
    }
    throw error;
  }
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
    const currentBundle = await bundle(context);

    if (action === "search-consulente") {
      if (!currentBundle.profile.canScheduleConsulente) return jsonError("Seu perfil não possui função autorizada para agendar Consulentes.", 403, code);
      const lookup = await findPersonByPhone(context.organizationId, asText(body.whatsapp));
      if (lookup.ambiguous) {
        return jsonError("Encontramos mais de um cadastro com esse número sem DDD. Informe também o DDD.", 409, code);
      }
      if (!lookup.person) return NextResponse.json({ ok: true, found: false });
      return NextResponse.json({
        ok: true,
        found: true,
        person: {
          id: lookup.person.id,
          fullName: lookup.person.full_name,
          whatsapp: maskPhone(lookup.person.whatsapp),
          email: maskEmail(lookup.person.notification_email || lookup.person.email),
        },
      });
    }

    if (action === "create-consulente") {
      const created = await createReceptionPerson(context, body, currentBundle.profile.canScheduleConsulente);
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
      const recurring = await reserveRecurringSeries({
        context,
        currentBundle,
        target: { id: context.personId, full_name: context.fullName, whatsapp: context.whatsapp, email: context.email },
        basePeriod: period,
        entity,
        body,
        channel: "filho_corrente",
      });
      const deliveryAppointments: ReceptionDeliveryAppointment[] = recurring.appointments.map((appointment) => ({
        date: appointment.appointmentDate,
        period: appointment.appointmentTime,
        entity: appointment.entityName,
        order: appointment.order,
      }));
      const emailSent = context.email
        ? await sendFilhoAppointmentConfirmationEmail({
            to: context.email,
            fullName: context.fullName,
            appointments: deliveryAppointments,
          }).catch(() => false)
        : false;

      return NextResponse.json({
        ok: true,
        appointment: recurring.appointments[0],
        appointments: recurring.appointments,
        recurrence: { seriesId: recurring.seriesId, count: recurring.appointments.length, autoCancelOnAbsence: currentBundle.settings.autoCancelRecurringOnAbsence },
        delivery: {
          emailSent,
          whatsappUrl: whatsappShareUrl(context.whatsapp, filhoAppointmentWhatsappMessage({
            fullName: context.fullName,
            appointments: deliveryAppointments,
          })),
        },
      });
    }

    if (action === "book-reception") {
      const allowedForPeriod = period.weekday === "quarta"
        ? currentBundle.profile.canBookWednesday
        : context.canReception;
      if (!allowedForPeriod || period.audience !== "reception") {
        return jsonError("Seu perfil não possui função autorizada para este dia de atendimento.", 403, code);
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

      const recurring = await reserveRecurringSeries({ context, currentBundle, target, basePeriod: period, entity, body, channel: "recepcao" });
      const reservation = recurring.appointments[0];
      if (!reservation?.id) throw new Error("Reserva sem identificador.");

      const actualEmail = realNotificationEmail(target.notification_email) || realNotificationEmail(target.email);
      const login = normalizePhone(target.whatsapp);
      const temporaryPassword = asText(body.temporaryPassword);
      const deliveryAppointments: ReceptionDeliveryAppointment[] = recurring.appointments.map((appointment) => ({
        date: appointment.appointmentDate,
        period: appointment.appointmentTime,
        entity: appointment.entityName,
        order: appointment.order,
      }));
      const appointmentMessage = [
        "Tucxa em Harmonia",
        "",
        `Olá, ${asText(target.full_name) || "Consulente"}.`,
        recurring.appointments.length > 1
          ? `${recurring.appointments.length} agendamentos no TUCXA foram confirmados.`
          : "Seu agendamento no TUCXA foi confirmado.",
        ...deliveryAppointments.flatMap((appointment, index) => [
          "",
          ...(deliveryAppointments.length > 1 ? [`Agendamento ${index + 1}:`] : []),
          `Data: ${formatDateForMessage(appointment.date)}`,
          `Período: ${appointment.period}`,
          `Entidade: ${appointment.entity}`,
          ...(appointment.order ? [`Ordem: ${appointment.order}`] : []),
        ]),
        "",
        `Acesso: ${consulenteLoginUrl()}`,
        `Login: ${login || actualEmail}`,
        ...(temporaryPassword
          ? [`Senha temporária: ${temporaryPassword}`, "Troque esta senha no primeiro acesso."]
          : []),
      ].join("\n");
      const emailSent = actualEmail
        ? await sendReceptionAccessEmail({
            to: actualEmail,
            fullName: asText(target.full_name) || "Consulente",
            login: login || actualEmail,
            temporaryPassword: asText(body.temporaryPassword) || undefined,
            appointments: deliveryAppointments,
          }).catch(() => false)
        : false;

      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.id,
          appointmentDate: reservation.appointmentDate,
          appointmentTime: period.label,
          entityName: entity.name || "Entidade escolhida",
          order: reservation.order,
          status: reservation.status,
          personName: target.full_name,
          weekday: period.weekday,
        },
        appointments: recurring.appointments,
        recurrence: { seriesId: recurring.seriesId, count: recurring.appointments.length, autoCancelOnAbsence: currentBundle.settings.autoCancelRecurringOnAbsence },
        delivery: {
          emailSent,
          whatsappUrl: whatsappShareUrl(target.whatsapp, appointmentMessage),
          login: login || actualEmail,
          loginUrl: consulenteLoginUrl(),
          temporaryPassword: temporaryPassword || undefined,
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
