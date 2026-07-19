import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isMonthOccurrenceAllowed } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";

export const dynamic = "force-dynamic";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const CANCELED_APPOINTMENT_FILTER = "(cancelado,cancelamento_solicitado,ausente)";
const APPROVED_EVENT_STATUSES = ["aprovado", "ativo", "publicado", "recorrente"];

type AgendaSettings = {
  allowDifferentEntityAfterFirstAppointment: boolean;
  allowAlternateEntityWhenUnavailable: boolean;
  appointmentReturnGuidance: string;
  appointmentEditCutoffMinutes: number;
};

type AuthUser = {
  id: string;
  email?: string | null;
};

type ConsulenteContext = {
  user: AuthUser;
  organizationId: string;
  personId: string;
  fullName: string;
  whatsapp: string;
  email: string;
  communicationsOptIn: boolean;
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
  active: boolean | null;
  metadata: Record<string, unknown> | null;
};

type AppointmentCount = {
  id: string;
  entity_id: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string | null;
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

type ReserveResult = {
  appointment_id: string;
  confirmed_date: string;
  confirmed_time: string;
  confirmed_status: string;
  confirmed_order: number;
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
    .toLowerCase();
}

function normalizePhone(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function normalizeEmail(value: unknown) {
  return asText(value).toLowerCase();
}

function isRealEmail(value: unknown) {
  const email = normalizeEmail(value);
  return Boolean(email && email.includes("@") && !email.endsWith("@organizacao-em-harmonia.local"));
}

function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function requestId() {
  return crypto.randomUUID().slice(0, 8);
}

function logRouteError(id: string, phase: string, error: unknown) {
  const details = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error("[OH/TUCXA agendamentos]", {
    requestId: id,
    phase,
    message: error instanceof Error ? error.message : String(error),
    code: details.code,
    details: details.details,
    hint: details.hint,
  });
}

function jsonError(message: string, status: number, id: string) {
  return NextResponse.json({ error: message, requestId: id }, { status });
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

function weekdaySlug(dateText: string) {
  const date = dateFromIso(dateText);
  if (Number.isNaN(date.getTime())) return "";
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][date.getUTCDay()] ?? "";
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
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${hour}:${map.minute}`;
}

function localTimeFromMetadata(event: AgendaEvent, kind: "start" | "end") {
  const metadata = asRecord(event.metadata);
  const candidates = kind === "start"
    ? [metadata.localStart, metadata.local_start]
    : [metadata.localEnd, metadata.local_end];
  for (const candidate of candidates) {
    const text = asText(candidate);
    const match = text.match(/T(\d{2}:\d{2})/);
    if (match?.[1]) return match[1];
  }
  return "";
}

function eventAudience(event: AgendaEvent) {
  const metadata = asRecord(event.metadata);
  return normalize(metadata.audience ?? metadata.publico ?? metadata.targetAudience ?? metadata.target_audience);
}

function visibleForConsulente(event: AgendaEvent) {
  const audience = eventAudience(event);
  if (!audience) return true;
  if (audience === "filhos-corrente" || audience === "filhos_corrente") return false;
  return !(audience.includes("somente") && audience.includes("filhos") && audience.includes("corrente"));
}

function isBookingScheduleEvent(event: AgendaEvent) {
  if (event.active === false || !APPROVED_EVENT_STATUSES.includes(normalize(event.status))) return false;
  if (!visibleForConsulente(event)) return false;
  const search = normalize(`${event.title ?? ""} ${event.event_type ?? ""} ${event.group_slug ?? ""}`);
  const isMonday = search.includes("atendimento-segunda") || search.includes("grupo-segunda-feira") || (search.includes("filhos de fora") && search.includes("segunda"));
  const isTuesday = search.includes("atendimento-terca") || search.includes("grupo-terca-feira") || (search.includes("filhos de fora") && search.includes("terca"));
  return isMonday || isTuesday;
}

function isBlockingEvent(event: AgendaEvent) {
  if (event.active === false || !APPROVED_EVENT_STATUSES.includes(normalize(event.status))) return false;
  const metadata = asRecord(event.metadata);
  if (metadata.blocksAppointments === true || metadata.blocks_appointments === true || metadata.appointmentBlocked === true) return true;
  const search = normalize(`${event.title ?? ""} ${event.event_type ?? ""} ${event.group_slug ?? ""}`);
  return search.includes("ferias") || search.includes("recesso") || search.includes("pausa");
}

function eventMatchesDate(event: AgendaEvent, dateText: string) {
  const startDate = dateOnlyFromTimestamp(event.starts_at);
  if (!startDate || dateText < startDate) return false;

  // Em eventos recorrentes, uma data final posterior ao início representa
  // o limite de vigência cadastrado para a série (por exemplo, fevereiro a dezembro).
  const configuredEndDate = dateOnlyFromTimestamp(event.ends_at);
  if (configuredEndDate && configuredEndDate > startDate && dateText > configuredEndDate) return false;

  const recurrence = normalize(event.recurrence_rule).toUpperCase();
  if (!recurrence) return dateText === startDate;

  const weekday = weekdaySlug(dateText);
  if (recurrence.includes("BYDAY=MO")) return weekday === "segunda" && isMonthOccurrenceAllowed(event.metadata, dateText);
  if (recurrence.includes("BYDAY=TU")) return weekday === "terca" && isMonthOccurrenceAllowed(event.metadata, dateText);
  return dateText === startDate;
}

function eventBlocksDate(event: AgendaEvent, dateText: string) {
  if (!isBlockingEvent(event)) return false;
  const startDate = dateOnlyFromTimestamp(event.starts_at);
  if (!startDate) return false;
  const endDate = dateOnlyFromTimestamp(event.ends_at) || startDate;
  return dateText >= startDate && dateText <= endDate;
}

function periodTimeLabel(startTime: string, endTime: string, event: AgendaEvent) {
  const metadata = asRecord(event.metadata);
  const configured = asText(metadata.timeLabel ?? metadata.time_label);
  if (configured) return configured;
  const readable = (value: string) => value.replace(":00", "h");
  return endTime ? `${readable(startTime)} às ${readable(endTime)}` : readable(startTime);
}

function buildBookingPeriods(events: AgendaEvent[], startDate: string, horizonDays = 420) {
  const schedules = events.filter(isBookingScheduleEvent);
  const blockers = events.filter(isBlockingEvent);
  const periods = new Map<string, BookingPeriod>();
  const start = dateFromIso(startDate);

  for (let index = 0; index < horizonDays; index += 1) {
    const appointmentDate = toIsoDate(addDays(start, index));
    const weekday = weekdaySlug(appointmentDate);
    if (weekday !== "segunda" && weekday !== "terca") continue;
    if (blockers.some((event) => eventBlocksDate(event, appointmentDate))) continue;

    schedules
      .filter((event) => eventMatchesDate(event, appointmentDate))
      .forEach((event) => {
        const startTime = localTimeFromMetadata(event, "start") || timeFromTimestamp(event.starts_at, "18:00");
        const endTime = localTimeFromMetadata(event, "end") || timeFromTimestamp(event.ends_at, "22:00");
        const key = `${appointmentDate}::${startTime}::${endTime}`;
        if (periods.has(key)) return;
        periods.set(key, {
          id: `${event.id}::${appointmentDate}::${startTime}`,
          eventId: event.id,
          appointmentDate,
          startTime,
          endTime,
          label: periodTimeLabel(startTime, endTime, event),
          title: asText(event.title) || `Atendimento de ${weekday}`,
          weekday,
          tone: weekday,
        });
      });
  }

  return [...periods.values()].sort((left, right) => {
    const dateDifference = left.appointmentDate.localeCompare(right.appointmentDate);
    return dateDifference || left.startTime.localeCompare(right.startTime);
  });
}

function entityMatchesPeriod(entity: EntityRecord, period: BookingPeriod) {
  const days = Array.isArray(entity.usual_days) ? entity.usual_days.map(normalize) : [];
  if (!days.length) return period.weekday === "segunda" || period.weekday === "terca";
  return days.some((day) => day.includes(period.weekday));
}

function availabilityKey(entityId: string, date: string, time: string) {
  return `${entityId}::${date}::${time}`;
}

function buildAvailability(periods: BookingPeriod[], entities: EntityRecord[], appointments: AppointmentCount[]) {
  const counts = new Map<string, number>();
  appointments.forEach((appointment) => {
    if (!appointment.entity_id || !appointment.appointment_date) return;
    const key = availabilityKey(appointment.entity_id, appointment.appointment_date, appointment.appointment_time || "18:00");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return periods.flatMap((period) => entities
    .filter((entity) => entityMatchesPeriod(entity, period))
    .map((entity) => {
      const capacity = Math.max(1, Number(entity.daily_capacity ?? 4));
      const booked = counts.get(availabilityKey(entity.id, period.appointmentDate, period.startTime)) ?? 0;
      return {
        periodId: period.id,
        entityId: entity.id,
        booked,
        capacity,
        available: Math.max(capacity - booked, 0),
        nextOrder: booked + 1,
      };
    }));
}

function normalizeSettings(settings: unknown): AgendaSettings {
  const current = asRecord(settings);
  return {
    allowDifferentEntityAfterFirstAppointment: current.allowDifferentEntityAfterFirstAppointment !== false,
    allowAlternateEntityWhenUnavailable: current.allowAlternateEntityWhenUnavailable !== false,
    appointmentReturnGuidance: asText(current.appointmentReturnGuidance) || "Após o primeiro atendimento com uma entidade, se houver orientação de retorno, procure manter a continuidade com a mesma entidade sempre que possível.",
    appointmentEditCutoffMinutes: Math.max(0, Math.trunc(Number(current.appointmentEditCutoffMinutes ?? 1440) || 0)),
  };
}

async function authenticatedConsulente(request: Request): Promise<ConsulenteContext | null> {
  const token = tokenFromRequest(request);
  if (!token) return null;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: person, error: personError } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, whatsapp, email, notification_email, communications_opt_in, active")
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

  const authEmail = isRealEmail(person.email) ? normalizeEmail(person.email) : "";
  const notificationEmail = isRealEmail(person.notification_email) ? normalizeEmail(person.notification_email) : "";
  return {
    user: { id: authData.user.id, email: authData.user.email },
    organizationId: person.organization_id as string,
    personId: person.id as string,
    fullName: asText(person.full_name) || "Consulente",
    whatsapp: normalizePhone(person.whatsapp),
    email: notificationEmail || authEmail,
    communicationsOptIn: person.communications_opt_in === true,
  };
}

async function agendaSettings(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_module_settings")
    .select("module_slug, settings")
    .eq("organization_id", organizationId)
    .in("module_slug", ["atendimento-em-harmonia", "agenda-viva"]);
  if (error) throw error;
  const rows = data ?? [];
  const agendaSettingsRow = rows.find((item) => item.module_slug === "agenda-viva");
  const atendimentoSettingsRow = rows.find((item) => item.module_slug === "atendimento-em-harmonia");
  return normalizeSettings({
    ...asRecord(agendaSettingsRow?.settings),
    ...asRecord(atendimentoSettingsRow?.settings),
  });
}

async function availableEntities(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_spiritual_entities")
    .select("id, name, line, entity_type, usual_days, usual_materials, daily_capacity, appointment_enabled, appointment_notes, active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as EntityRecord[]).filter((entity) => entity.appointment_enabled !== false);
}

async function availableEvents(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("agv_events")
    .select("id, title, starts_at, ends_at, all_day, recurrence_rule, group_slug, event_type, status, active, metadata")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .in("status", APPROVED_EVENT_STATUSES)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as AgendaEvent[];
}

function appointmentStartInstant(appointmentDate: string, appointmentTime: string) {
  const timeMatch = appointmentTime.match(/(\d{1,2}):(\d{2})/);
  const time = timeMatch ? `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}` : "23:59";
  const date = new Date(`${appointmentDate}T${time}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function editEligibility(appointmentDate: string, appointmentTime: string, cutoffMinutes: number) {
  const start = appointmentStartInstant(appointmentDate, appointmentTime);
  if (!start) {
    return {
      canEdit: false,
      editDeadline: null,
      editBlockedReason: "O horário deste agendamento precisa ser confirmado pela organização antes de uma alteração.",
    };
  }

  const deadline = new Date(start.getTime() - Math.max(0, cutoffMinutes) * 60_000);
  const canEdit = Date.now() < deadline.getTime();
  return {
    canEdit,
    editDeadline: deadline.toISOString(),
    editBlockedReason: canEdit
      ? ""
      : "O prazo de edição definido pelo TUCXA terminou. Você ainda pode excluir este agendamento.",
  };
}

async function appointmentCounts(organizationId: string, start: string, end: string, excludedAppointmentId = "") {
  let query = supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, entity_id, appointment_date, appointment_time, status")
    .eq("organization_id", organizationId)
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .not("status", "in", CANCELED_APPOINTMENT_FILTER);

  if (excludedAppointmentId) query = query.neq("id", excludedAppointmentId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AppointmentCount[];
}

async function activeAppointmentsForPerson(context: ConsulenteContext, start: string, end: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, entity_id, event_id, appointment_date, appointment_time, status, metadata")
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId)
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .not("status", "in", CANCELED_APPOINTMENT_FILTER)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function ownedAppointment(context: ConsulenteContext, appointmentId: string) {
  if (!appointmentId) return null;
  const { data, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, entity_id, event_id, appointment_date, appointment_time, status, notes, metadata, created_at")
    .eq("id", appointmentId)
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function existingAppointmentsForPeriods(
  rows: Array<Record<string, unknown>>,
  periods: BookingPeriod[],
  entities: EntityRecord[],
  settings: AgendaSettings,
  excludedAppointmentId = "",
): ExistingAppointment[] {
  const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
  return rows
    .filter((row) => asText(row.id) !== excludedAppointmentId)
    .flatMap((row) => {
      const appointmentDate = asText(row.appointment_date);
      const appointmentTime = asText(row.appointment_time) || "18:00";
      const eventId = asText(row.event_id);
      const period = periods.find((item) =>
        item.appointmentDate === appointmentDate
        && item.startTime === appointmentTime
        && (!eventId || item.eventId === eventId)
      );
      if (!period) return [];

      const entityId = asText(row.entity_id);
      const entity = entityMap.get(entityId);
      const metadata = asRecord(row.metadata);
      const eligibility = editEligibility(appointmentDate, appointmentTime, settings.appointmentEditCutoffMinutes);
      return [{
        id: asText(row.id),
        periodId: period.id,
        appointmentDate,
        appointmentTime: period.label,
        entityId: entityId || null,
        entityName: entity?.name || "Entidade a confirmar",
        order: Number(metadata.order ?? 0) || null,
        status: asText(row.status),
        canEdit: eligibility.canEdit,
        editBlockedReason: eligibility.editBlockedReason,
      }];
    });
}

async function appointmentBundle(context: ConsulenteContext, editingAppointmentId = "") {
  const today = todayInSaoPaulo();
  const horizonEnd = toIsoDate(addDays(dateFromIso(today), 420));
  const [settings, entities, events, counts, personAppointments] = await Promise.all([
    agendaSettings(context.organizationId),
    availableEntities(context.organizationId),
    availableEvents(context.organizationId),
    appointmentCounts(context.organizationId, today, horizonEnd, editingAppointmentId),
    activeAppointmentsForPerson(context, today, horizonEnd),
  ]);
  const periods = buildBookingPeriods(events, today);
  const existingAppointments = existingAppointmentsForPeriods(
    personAppointments as Array<Record<string, unknown>>,
    periods,
    entities,
    settings,
    editingAppointmentId,
  );

  const editingRow = editingAppointmentId
    ? (personAppointments as Array<Record<string, unknown>>).find((row) => asText(row.id) === editingAppointmentId)
    : null;
  const editingAppointment = editingRow
    ? existingAppointmentsForPeriods([editingRow], periods, entities, settings)[0] ?? null
    : null;

  return {
    settings,
    entities,
    periods,
    availability: buildAvailability(periods, entities, counts),
    existingAppointments,
    editingAppointment,
  };
}

async function previousAppointment(context: ConsulenteContext, excludedAppointmentId = "") {
  let query = supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, entity_id")
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId)
    .not("status", "in", CANCELED_APPOINTMENT_FILTER)
    .order("appointment_date", { ascending: true })
    .limit(1);

  if (excludedAppointmentId) query = query.neq("id", excludedAppointmentId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as { id: string; entity_id: string | null } | null;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

async function sendConfirmationEmail(input: {
  to: string;
  name: string;
  entityName: string;
  appointmentDate: string;
  appointmentTime: string;
  order: number;
  guidance: string;
}) {
  if (!input.to || !hasSmtpConfig() || process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") return false;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateFromIso(input.appointmentDate));
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Organização em Harmonia"}" <${process.env.EMAIL_FROM}>`,
    to: input.to,
    subject: `Agendamento confirmado no Tucxa - ${input.entityName}`,
    text: [
      `Olá, ${input.name}.`,
      "",
      "Seu agendamento no Tucxa foi confirmado.",
      `Data: ${formattedDate}`,
      `Horário/período: ${input.appointmentTime}`,
      `Entidade: ${input.entityName}`,
      `Ordem confirmada: ${input.order}`,
      "",
      input.guidance,
      "",
      "Consulte seus agendamentos:",
      `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/consulente/agendamentos`,
    ].join("\n"),
  });
  return true;
}

async function updateContactPreferences(context: ConsulenteContext, email: string, communicationsOptIn: boolean) {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    communications_opt_in: communicationsOptIn,
    updated_at: now,
  };

  if (communicationsOptIn) {
    payload.communications_opt_in_at = now;
    payload.communications_opt_in_source = "agendamento-consulente-tucxa";
    payload.communications_opt_out_at = null;
  } else if (context.communicationsOptIn) {
    payload.communications_opt_out_at = now;
  }

  if (email) payload.notification_email = email;
  const { error } = await supabaseAdmin.from("oh_people").update(payload).eq("id", context.personId);
  if (error) throw error;
}

async function myAppointments(context: ConsulenteContext) {
  const settings = await agendaSettings(context.organizationId);
  const { data, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, entity_id, event_id, appointment_date, appointment_time, status, notes, metadata, created_at, updated_at, cancelled_at, cancellation_reason")
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });
  if (error) throw error;

  const appointments = data ?? [];
  const entityIds = [...new Set(appointments.map((item) => asText(item.entity_id)).filter(Boolean))];
  const entities = new Map<string, EntityRecord>();

  if (entityIds.length) {
    const { data: entityRows, error: entityError } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, line, entity_type, appointment_notes")
      .in("id", entityIds);
    if (entityError) throw entityError;
    (entityRows ?? []).forEach((entity) => entities.set(entity.id as string, entity as EntityRecord));
  }

  return appointments.map((appointment) => {
    const entity = entities.get(asText(appointment.entity_id));
    const metadata = asRecord(appointment.metadata);
    const status = asText(appointment.status);
    const canceled = ["cancelado", "cancelamento_solicitado", "ausente"].includes(status);
    const eligibility = editEligibility(
      appointment.appointment_date,
      appointment.appointment_time || "23:59",
      settings.appointmentEditCutoffMinutes,
    );

    return {
      id: appointment.id,
      eventId: appointment.event_id,
      appointmentDate: appointment.appointment_date,
      appointmentTime: asText(metadata.period_label) || appointment.appointment_time || "Horário a confirmar",
      appointmentStartTime: appointment.appointment_time || "",
      status,
      notes: appointment.notes,
      order: Number(metadata.order ?? 0) || null,
      canEdit: !canceled && eligibility.canEdit,
      canDelete: !canceled,
      editDeadline: eligibility.editDeadline,
      editBlockedReason: canceled ? "Este agendamento já foi cancelado." : eligibility.editBlockedReason,
      cancelledAt: appointment.cancelled_at,
      cancellationReason: appointment.cancellation_reason,
      entity: {
        id: entity?.id || null,
        name: entity?.name || "Entidade a confirmar",
        line: entity?.line || null,
        entityType: entity?.entity_type || null,
        guidance: entity?.appointment_notes || null,
      },
      createdAt: appointment.created_at,
      updatedAt: appointment.updated_at,
    };
  });
}

function publicProfile(context: ConsulenteContext) {
  return {
    fullName: context.fullName,
    whatsapp: context.whatsapp,
    email: context.email,
    communicationsOptIn: context.communicationsOptIn,
  };
}

function reservationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : asText((error as Record<string, unknown> | null)?.message);
  if (message.includes("NO_AVAILABILITY")) return { message: "A última vaga deste período acabou de ser preenchida. Escolha outra entidade ou outro dia.", status: 409 };
  if (message.includes("DUPLICATE_APPOINTMENT")) return { message: "Você já possui um agendamento neste mesmo dia e período.", status: 409 };
  if (message.includes("APPOINTMENT_NOT_FOUND")) return { message: "Agendamento não localizado.", status: 404 };
  if (message.includes("APPOINTMENT_NOT_EDITABLE")) return { message: "Este agendamento não pode mais ser alterado.", status: 409 };
  if (message.includes("INVALID_APPOINTMENT")) return { message: "Não foi possível confirmar este período. Atualize a agenda e tente novamente.", status: 400 };
  return { message: "Não foi possível confirmar o agendamento agora.", status: 500 };
}

export async function GET(request: Request) {
  const id = requestId();
  try {
    const context = await authenticatedConsulente(request);
    if (!context) return jsonError("Sua sessão expirou. Entre novamente para continuar.", 401, id);

    const url = new URL(request.url);
    if (url.searchParams.get("view") === "mine") {
      return NextResponse.json({
        profile: publicProfile(context),
        appointments: await myAppointments(context),
        settings: await agendaSettings(context.organizationId),
      });
    }

    const editingAppointmentId = asText(url.searchParams.get("edit"));
    if (editingAppointmentId) {
      const [appointment, settings] = await Promise.all([
        ownedAppointment(context, editingAppointmentId),
        agendaSettings(context.organizationId),
      ]);
      if (!appointment?.id) return jsonError("Agendamento não localizado.", 404, id);
      if (["cancelado", "cancelamento_solicitado", "ausente"].includes(asText(appointment.status))) {
        return jsonError("Este agendamento não pode mais ser alterado.", 409, id);
      }

      const eligibility = editEligibility(
        appointment.appointment_date,
        appointment.appointment_time || "23:59",
        settings.appointmentEditCutoffMinutes,
      );
      if (!eligibility.canEdit) return jsonError(eligibility.editBlockedReason, 409, id);
    }

    const bundle = await appointmentBundle(context, editingAppointmentId);
    return NextResponse.json({ profile: publicProfile(context), ...bundle });
  } catch (error) {
    logRouteError(id, "GET", error);
    return jsonError("Não foi possível carregar os agendamentos. Tente novamente. Se o erro continuar, informe o código exibido.", 500, id);
  }
}

export async function POST(request: Request) {
  const id = requestId();
  try {
    const context = await authenticatedConsulente(request);
    if (!context) return jsonError("Sua sessão expirou. Entre novamente para continuar.", 401, id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action) || "book";

    if (action === "update-email") {
      const appointmentId = asText(body.appointmentId);
      const email = normalizeEmail(body.email);
      const communicationsOptIn = body.communicationsOptIn === true;
      if (!appointmentId) return jsonError("Agendamento não localizado.", 400, id);
      if (!isRealEmail(email)) return jsonError("Informe um e-mail válido.", 400, id);
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id, entity_id, appointment_date, appointment_time, metadata")
        .eq("id", appointmentId)
        .eq("organization_id", context.organizationId)
        .eq("person_id", context.personId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment?.id) return jsonError("Agendamento não localizado.", 404, id);
      await updateContactPreferences(context, email, communicationsOptIn);
      const { data: entity } = await supabaseAdmin.from("oh_spiritual_entities").select("name").eq("id", appointment.entity_id).maybeSingle();
      let emailSent = false;
      try {
        emailSent = await sendConfirmationEmail({
          to: email,
          name: context.fullName,
          entityName: asText(entity?.name) || "Entidade escolhida",
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time || "Horário a confirmar",
          order: Number(asRecord(appointment.metadata).order ?? 1),
          guidance: (await agendaSettings(context.organizationId)).appointmentReturnGuidance,
        });
      } catch (emailError) {
        logRouteError(id, "update-email/send", emailError);
      }
      return NextResponse.json({ ok: true, emailSent, message: emailSent ? "E-mail salvo e confirmação enviada." : "E-mail salvo. O agendamento permanece confirmado, mas o envio não pôde ser concluído agora." });
    }

    if (action === "cancel") {
      const appointmentId = asText(body.appointmentId);
      const reason = asText(body.reason) || "Cancelado pelo Consulente";
      if (!appointmentId) return jsonError("Agendamento não localizado.", 400, id);

      const appointment = await ownedAppointment(context, appointmentId);
      if (!appointment?.id) return jsonError("Agendamento não localizado.", 404, id);
      if (["cancelado", "cancelamento_solicitado"].includes(asText(appointment.status))) {
        return NextResponse.json({ ok: true, message: "Este agendamento já estava excluído." });
      }

      const cancelledAt = new Date().toISOString();
      const metadata = {
        ...asRecord(appointment.metadata),
        cancelled_at: cancelledAt,
        cancellation_source: "consulente",
        cancellation_reason: reason,
      };
      const { error: cancelError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          status: "cancelado",
          cancelled_at: cancelledAt,
          cancelled_by_person_id: context.personId,
          cancellation_reason: reason,
          metadata,
          updated_at: cancelledAt,
        })
        .eq("id", appointmentId)
        .eq("organization_id", context.organizationId)
        .eq("person_id", context.personId);
      if (cancelError) throw cancelError;

      return NextResponse.json({
        ok: true,
        message: "Agendamento excluído. O histórico foi preservado para segurança e organização.",
      });
    }

    if (action === "reschedule") {
      const appointmentId = asText(body.appointmentId);
      const periodId = asText(body.periodId);
      const entityId = asText(body.entityId);
      const idempotencyKey = asText(body.idempotencyKey) || crypto.randomUUID();
      if (!appointmentId || !periodId || !entityId) {
        return jsonError("Escolha o novo dia, período e entidade.", 400, id);
      }

      const [appointment, settings] = await Promise.all([
        ownedAppointment(context, appointmentId),
        agendaSettings(context.organizationId),
      ]);
      if (!appointment?.id) return jsonError("Agendamento não localizado.", 404, id);
      if (["cancelado", "cancelamento_solicitado", "ausente"].includes(asText(appointment.status))) {
        return jsonError("Este agendamento não pode mais ser alterado.", 409, id);
      }

      const eligibility = editEligibility(
        appointment.appointment_date,
        appointment.appointment_time || "23:59",
        settings.appointmentEditCutoffMinutes,
      );
      if (!eligibility.canEdit) return jsonError(eligibility.editBlockedReason, 409, id);

      const bundle = await appointmentBundle(context, appointmentId);
      const period = bundle.periods.find((item) => item.id === periodId);
      if (!period) return jsonError("Este período não está mais disponível. Atualize o calendário.", 409, id);
      const entity = bundle.entities.find((item) => item.id === entityId && entityMatchesPeriod(item, period));
      if (!entity || entity.appointment_enabled === false) {
        return jsonError("Esta entidade não está disponível neste período.", 409, id);
      }

      const availability = bundle.availability.find((item) => item.periodId === period.id && item.entityId === entity.id);
      if (!availability || availability.available <= 0) {
        return jsonError("Não há mais vagas para esta entidade neste período.", 409, id);
      }

      const previous = await previousAppointment(context, appointmentId);
      if (previous?.entity_id && previous.entity_id !== entityId && !bundle.settings.allowDifferentEntityAfterFirstAppointment) {
        return jsonError("A configuração atual orienta manter a mesma entidade após o primeiro atendimento. Procure a recepção para avaliar uma troca.", 409, id);
      }

      const rpcPayload = {
        p_appointment_id: appointmentId,
        p_organization_id: context.organizationId,
        p_person_id: context.personId,
        p_entity_id: entity.id,
        p_event_id: period.eventId,
        p_appointment_date: period.appointmentDate,
        p_appointment_time: period.startTime,
        p_capacity: Math.max(1, Number(entity.daily_capacity ?? 4)),
        p_idempotency_key: idempotencyKey,
        p_metadata: {
          source: "site_tucxa_consulente_reschedule",
          period_id: period.id,
          period_label: period.label,
          period_end_time: period.endTime,
          event_id: period.eventId,
          return_guidance: bundle.settings.appointmentReturnGuidance,
        },
      };

      const { data: rescheduled, error: rescheduleError } = await supabaseAdmin.rpc(
        "oh_reschedule_consulente_appointment",
        rpcPayload,
      );
      if (rescheduleError) {
        const friendly = reservationErrorMessage(rescheduleError);
        if (friendly.status >= 500) logRouteError(id, "POST/reschedule-rpc", rescheduleError);
        return jsonError(friendly.message, friendly.status, id);
      }

      const reservation = (Array.isArray(rescheduled) ? rescheduled[0] : rescheduled) as ReserveResult | null;
      if (!reservation?.appointment_id) throw new Error("Alteração não retornou identificador.");

      let emailSent = false;
      if (context.email) {
        try {
          emailSent = await sendConfirmationEmail({
            to: context.email,
            name: context.fullName,
            entityName: asText(entity.name) || "Entidade escolhida",
            appointmentDate: reservation.confirmed_date,
            appointmentTime: period.label,
            order: Number(reservation.confirmed_order),
            guidance: bundle.settings.appointmentReturnGuidance,
          });
        } catch (emailError) {
          logRouteError(id, "POST/reschedule-send", emailError);
        }
      }

      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.appointment_id,
          appointmentDate: reservation.confirmed_date,
          appointmentTime: period.label,
          status: reservation.confirmed_status,
          order: Number(reservation.confirmed_order),
          entityName: entity.name || "Entidade escolhida",
          guidance: entity.appointment_notes || bundle.settings.appointmentReturnGuidance,
        },
        emailSent,
        email: context.email,
        message: "Agendamento alterado.",
      });
    }

    const periodId = asText(body.periodId);
    const entityId = asText(body.entityId);
    const email = normalizeEmail(body.email);
    const communicationsOptIn = body.communicationsOptIn === true;
    const notes = asText(body.notes);
    const idempotencyKey = asText(body.idempotencyKey) || crypto.randomUUID();
    if (!periodId || !entityId) return jsonError("Escolha o dia, o período e a entidade.", 400, id);
    if (email && !isRealEmail(email)) return jsonError("Confira o e-mail informado ou deixe o campo em branco.", 400, id);

    const bundle = await appointmentBundle(context);
    const period = bundle.periods.find((item) => item.id === periodId);
    if (!period) return jsonError("Este período não está mais disponível. Atualize o calendário.", 409, id);
    const entity = bundle.entities.find((item) => item.id === entityId && entityMatchesPeriod(item, period));
    if (!entity || entity.appointment_enabled === false) return jsonError("Esta entidade não está disponível neste período.", 409, id);
    const availability = bundle.availability.find((item) => item.periodId === period.id && item.entityId === entity.id);
    if (!availability || availability.available <= 0) return jsonError("Não há mais vagas para esta entidade neste período.", 409, id);

    const previous = await previousAppointment(context);
    if (previous?.entity_id && previous.entity_id !== entityId && !bundle.settings.allowDifferentEntityAfterFirstAppointment) {
      return jsonError("A configuração atual orienta manter a mesma entidade após o primeiro atendimento. Procure a recepção para avaliar uma troca.", 409, id);
    }

    const rpcPayload = {
      p_organization_id: context.organizationId,
      p_person_id: context.personId,
      p_entity_id: entity.id,
      p_event_id: period.eventId,
      p_appointment_date: period.appointmentDate,
      p_appointment_time: period.startTime,
      p_consulente_name: context.fullName,
      p_whatsapp: context.whatsapp || null,
      p_email: email || context.email || null,
      p_notes: notes || null,
      p_capacity: Math.max(1, Number(entity.daily_capacity ?? 4)),
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        source: "site_tucxa_consulente_popup",
        period_id: period.id,
        period_label: period.label,
        period_end_time: period.endTime,
        event_id: period.eventId,
        return_guidance: bundle.settings.appointmentReturnGuidance,
      },
    };
    const { data: reserved, error: reserveError } = await supabaseAdmin.rpc("oh_reserve_consulente_appointment", rpcPayload);
    if (reserveError) {
      const friendly = reservationErrorMessage(reserveError);
      if (friendly.status >= 500) logRouteError(id, "POST/rpc", reserveError);
      return jsonError(friendly.message, friendly.status, id);
    }
    const reservation = (Array.isArray(reserved) ? reserved[0] : reserved) as ReserveResult | null;
    if (!reservation?.appointment_id) throw new Error("Reserva não retornou identificador.");

    await updateContactPreferences(context, email || context.email, communicationsOptIn);
    let emailSent = false;
    const confirmationEmail = email || context.email;
    if (confirmationEmail) {
      try {
        emailSent = await sendConfirmationEmail({
          to: confirmationEmail,
          name: context.fullName,
          entityName: asText(entity.name) || "Entidade escolhida",
          appointmentDate: reservation.confirmed_date,
          appointmentTime: period.label,
          order: Number(reservation.confirmed_order),
          guidance: bundle.settings.appointmentReturnGuidance,
        });
      } catch (emailError) {
        logRouteError(id, "POST/send", emailError);
      }
    }

    return NextResponse.json({
      ok: true,
      appointment: {
        id: reservation.appointment_id,
        appointmentDate: reservation.confirmed_date,
        appointmentTime: period.label,
        status: reservation.confirmed_status,
        order: Number(reservation.confirmed_order),
        entityName: entity.name || "Entidade escolhida",
        guidance: entity.appointment_notes || bundle.settings.appointmentReturnGuidance,
      },
      emailSent,
      email: confirmationEmail,
      message: "Agendamento confirmado.",
    });
  } catch (error) {
    logRouteError(id, "POST", error);
    return jsonError("Não foi possível concluir o agendamento. Tente novamente. Se o erro continuar, informe o código exibido.", 500, id);
  }
}
