import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveAppointmentCapabilities } from "@/lib/organizacao-em-harmonia/appointment-permissions";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
export const PILOT_ACTIVE_STATUSES = ["solicitado", "confirmado", "aprovado", "presente", "concluido"];

export type PilotEntityAvailability = {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  booked: number;
  available: number;
  isAvailable: boolean;
  suspendedReason: string;
};

export type PilotDateOption = {
  date: string;
  weekday: "segunda" | "terca";
  monthOccurrence: number;
  label: string;
};

export type PilotSettings = {
  confirmationCutoff: string;
  appointmentTime: string;
  arrivalWindow: string;
  doorClosesAt: string;
  doorReopensAt: string;
  endTime: string;
  daysAhead: number;
  smsEnabled: boolean;
  rolloutStage: "reception" | "consulente" | "all";
  selfServiceEnabled: boolean;
  selfServiceViewMode: "entity_day" | "day_entity" | "both";
  useDefaultEntity: boolean;
  allowDifferentEntity: boolean;
  serviceOrderMode: "booking" | "arrival";
  confirmationReminderOffsetsHours: number[];
};

export type PilotPersonPreferences = {
  defaultEntityId: string;
  reminderSmsEnabled: boolean;
  reminderOffsetsHours: number[];
  receptionSummaryChannels: string[];
  receptionSummaryViewMode: "entity_day" | "day_entity" | "both";
};

type PilotReceptionContext = {
  organizationId: string;
  personId: string;
  fullName: string;
  canManage: boolean;
};

type PilotConsulenteContext = {
  organizationId: string;
  personId: string;
  fullName: string;
  whatsapp: string;
  email: string;
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

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

export function normalizeBrazilPhone(value: unknown) {
  const digits = asText(value).replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) return digits.slice(2);
  return digits;
}

export function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function isoDateToUtc(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function addDaysIso(value: string, days: number) {
  const date = isoDateToUtc(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monthOccurrence(value: string) {
  const day = Number(value.slice(8, 10));
  return Math.floor((day - 1) / 7) + 1;
}

export function pilotWeekday(value: string): "segunda" | "terca" | null {
  const day = isoDateToUtc(value).getUTCDay();
  if (day === 1) return "segunda";
  if (day === 2) return "terca";
  return null;
}

export function longDateLabel(value: string) {
  return isoDateToUtc(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function createConfirmationToken() {
  return randomBytes(32).toString("base64url");
}

export function confirmationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function confirmationDeadlineIso(date: string, cutoff: string) {
  const match = cutoff.match(/^(\d{2}):(\d{2})$/);
  const hour = match?.[1] ?? "16";
  const minute = match?.[2] ?? "00";
  return new Date(`${date}T${hour}:${minute}:00-03:00`).toISOString();
}

export function isPastConfirmationDeadline(deadlineIso: string) {
  const deadline = new Date(deadlineIso);
  return Number.isNaN(deadline.getTime()) || Date.now() > deadline.getTime();
}

export async function findTucxaOrganization() {
  const { data: bySlug, error: slugError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug")
    .eq("slug", "tucxa")
    .maybeSingle();
  if (slugError) throw slugError;
  if (bySlug?.id) return { id: bySlug.id as string, name: asText(bySlug.name) || "Tucxa" };

  const { data: byName, error: nameError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nameError) throw nameError;
  if (!byName?.id) return null;
  return { id: byName.id as string, name: asText(byName.name) || "Tucxa" };
}

function viewMode(value: unknown): "entity_day" | "day_entity" | "both" {
  const normalized = asText(value);
  return normalized === "entity_day" || normalized === "day_entity" ? normalized : "both";
}

function positiveHourList(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) return fallback;
  const parsed = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0 && item <= 720)
    .map((item) => Math.round(item));
  return Array.from(new Set(parsed)).sort((left, right) => right - left).slice(0, 8).length
    ? Array.from(new Set(parsed)).sort((left, right) => right - left).slice(0, 8)
    : fallback;
}

export async function loadPilotSettings(organizationId: string): Promise<PilotSettings> {
  const { data, error } = await supabaseAdmin
    .from("oh_module_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .eq("module_slug", "atendimento-em-harmonia")
    .maybeSingle();
  if (error) throw error;
  const settings = asRecord(data?.settings);
  return {
    confirmationCutoff: asText(settings.pilotConfirmationCutoff) || "16:00",
    appointmentTime: asText(settings.pilotAppointmentTime) || "20:00",
    arrivalWindow: asText(settings.pilotArrivalWindow) || "18:30–19:20",
    doorClosesAt: asText(settings.pilotDoorClosesAt) || "19:20",
    doorReopensAt: asText(settings.pilotDoorReopensAt) || "20:00",
    endTime: asText(settings.pilotEndTime) || "21:40",
    daysAhead: Math.max(14, Math.min(180, Number(settings.pilotDaysAhead ?? 90) || 90)),
    smsEnabled: settings.pilotSmsEnabled !== false,
    rolloutStage: asText(settings.pilotRolloutStage) === "all"
      ? "all"
      : asText(settings.pilotRolloutStage) === "consulente"
        ? "consulente"
        : "reception",
    selfServiceEnabled: settings.pilotSelfServiceEnabled === true,
    selfServiceViewMode: viewMode(settings.pilotSelfServiceViewMode),
    useDefaultEntity: settings.pilotUseDefaultEntity === true,
    allowDifferentEntity: settings.pilotAllowDifferentEntity !== false,
    serviceOrderMode: asText(settings.pilotServiceOrderMode) === "arrival" ? "arrival" : "booking",
    confirmationReminderOffsetsHours: positiveHourList(settings.pilotConfirmationReminderOffsetsHours, [24, 4]),
  };
}

export async function loadPilotPersonPreferences(organizationId: string, personId: string): Promise<PilotPersonPreferences> {
  const { data, error } = await supabaseAdmin
    .from("oh_tucxa_pilot_person_preferences")
    .select("default_entity_id, reminder_sms_enabled, reminder_offsets_hours, reception_summary_channels, reception_summary_view_mode")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .maybeSingle();
  if (error) throw error;
  return {
    defaultEntityId: asText(data?.default_entity_id),
    reminderSmsEnabled: data?.reminder_sms_enabled !== false,
    reminderOffsetsHours: positiveHourList(data?.reminder_offsets_hours, []),
    receptionSummaryChannels: Array.isArray(data?.reception_summary_channels)
      ? data.reception_summary_channels.map(asText).filter((item) => item === "email" || item === "sms")
      : [],
    receptionSummaryViewMode: viewMode(data?.reception_summary_view_mode),
  };
}

export async function savePilotPersonPreferences(
  organizationId: string,
  personId: string,
  input: Partial<PilotPersonPreferences>,
) {
  const current = await loadPilotPersonPreferences(organizationId, personId);
  const payload = {
    organization_id: organizationId,
    person_id: personId,
    default_entity_id: input.defaultEntityId === undefined ? current.defaultEntityId || null : input.defaultEntityId || null,
    reminder_sms_enabled: input.reminderSmsEnabled ?? current.reminderSmsEnabled,
    reminder_offsets_hours: input.reminderOffsetsHours === undefined
      ? current.reminderOffsetsHours
      : positiveHourList(input.reminderOffsetsHours, []),
    reception_summary_channels: input.receptionSummaryChannels === undefined
      ? current.receptionSummaryChannels
      : Array.from(new Set(input.receptionSummaryChannels.filter((item) => item === "email" || item === "sms"))),
    reception_summary_view_mode: input.receptionSummaryViewMode ?? current.receptionSummaryViewMode,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin
    .from("oh_tucxa_pilot_person_preferences")
    .upsert(payload, { onConflict: "organization_id,person_id" });
  if (error) throw error;
}

export async function currentPilotReception(request: Request): Promise<PilotReceptionContext | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return null;

  const organization = await findTucxaOrganization();
  if (!organization) return null;

  const { data: person, error: personError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, active")
    .eq("organization_id", organization.id)
    .eq("auth_user_id", authData.user.id)
    .eq("active", true)
    .maybeSingle();
  if (personError || !person?.id) return null;

  const [{ data: membership, error: membershipError }, { data: roles, error: rolesError }] = await Promise.all([
    supabaseAdmin
      .from("oh_memberships")
      .select("id, active, status, agenda_viva_profile")
      .eq("organization_id", organization.id)
      .eq("person_id", person.id)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_roles")
      .select("id, name, slug, active")
      .eq("organization_id", organization.id)
      .eq("active", true),
  ]);
  if (membershipError || rolesError || !membership?.id || normalize(membership.status) !== "ativo") return null;

  const capabilities = resolveAppointmentCapabilities({
    profile: asRecord(membership.agenda_viva_profile),
    roles: roles ?? [],
  });

  const canManage = capabilities.consultationScope === "manage" && capabilities.canEdit === true;
  if (!canManage) return null;

  return {
    organizationId: organization.id,
    personId: person.id as string,
    fullName: asText(person.full_name) || "Recepção",
    canManage,
  };
}

export async function currentPilotConsulente(request: Request): Promise<PilotConsulenteContext | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return null;

  const organization = await findTucxaOrganization();
  if (!organization) return null;

  let person: { id: string; full_name: string | null; whatsapp: string | null; email: string | null; notification_email?: string | null } | null = null;
  const { data: byAuth, error: byAuthError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, whatsapp, email, notification_email")
    .eq("organization_id", organization.id)
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (byAuthError) throw byAuthError;
  if (byAuth?.id) person = byAuth;

  if (!person && authData.user.email) {
    const { data: byEmail, error: byEmailError } = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, whatsapp, email, notification_email")
      .eq("organization_id", organization.id)
      .eq("email", authData.user.email)
      .maybeSingle();
    if (byEmailError) throw byEmailError;
    if (byEmail?.id) person = byEmail;
  }
  if (!person?.id) return null;

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, active, status, agenda_viva_profile")
    .eq("organization_id", organization.id)
    .eq("person_id", person.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership?.id || normalize(membership.status) !== "ativo") return null;

  const profile = asRecord(membership.agenda_viva_profile);
  const profileText = normalize([profile.accessType, profile.publico, authData.user.user_metadata?.oh_profile].map(asText).join(" "));
  if (!profileText.includes("consulente") && !profileText.includes("filho-de-fora") && !profileText.includes("filho de fora")) return null;

  const email = asText(person.notification_email) || (asText(person.email).endsWith("@organizacao-em-harmonia.local") ? "" : asText(person.email));
  return {
    organizationId: organization.id,
    personId: person.id,
    fullName: asText(person.full_name) || "Filho de Fora/Consulente",
    whatsapp: normalizeBrazilPhone(person.whatsapp),
    email,
  };
}

export async function loadPilotDates(organizationId: string, daysAhead: number): Promise<PilotDateOption[]> {
  const today = todayInSaoPaulo();
  const candidates: PilotDateOption[] = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const date = addDaysIso(today, offset);
    const weekday = pilotWeekday(date);
    if (!weekday) continue;
    const occurrence = monthOccurrence(date);
    if (occurrence > 4) continue;
    candidates.push({
      date,
      weekday,
      monthOccurrence: occurrence,
      label: `${longDateLabel(date)} · ${occurrence}ª ${weekday === "segunda" ? "segunda" : "terça"} do mês`,
    });
  }

  if (!candidates.length) return [];
  const weekdayValues = Array.from(new Set(candidates.map((item) => item.weekday)));
  const occurrences = Array.from(new Set(candidates.map((item) => item.monthOccurrence)));
  const { data, error } = await supabaseAdmin
    .from("oh_tucxa_pilot_entity_schedule")
    .select("weekday, month_occurrence")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .in("weekday", weekdayValues)
    .in("month_occurrence", occurrences);
  if (error) throw error;

  const availableKeys = new Set((data ?? []).map((item) => `${item.weekday}:${item.month_occurrence}`));
  return candidates.filter((item) => availableKeys.has(`${item.weekday}:${item.monthOccurrence}`));
}

export async function loadPilotDay(organizationId: string, date: string): Promise<PilotEntityAvailability[]> {
  const weekday = pilotWeekday(date);
  const occurrence = monthOccurrence(date);
  if (!weekday || occurrence > 5) return [];

  const { data: scheduleRows, error: scheduleError } = await supabaseAdmin
    .from("oh_tucxa_pilot_entity_schedule")
    .select("entity_id, default_capacity")
    .eq("organization_id", organizationId)
    .eq("weekday", weekday)
    .eq("month_occurrence", occurrence)
    .eq("active", true);
  if (scheduleError) throw scheduleError;
  const entityIds = Array.from(new Set((scheduleRows ?? []).map((row) => asText(row.entity_id)).filter(Boolean)));
  if (!entityIds.length) return [];

  const [{ data: entities, error: entityError }, { data: overrides, error: overrideError }, { data: appointments, error: appointmentError }] = await Promise.all([
    supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, slug, daily_capacity, active, appointment_enabled")
      .eq("organization_id", organizationId)
      .in("id", entityIds),
    supabaseAdmin
      .from("oh_tucxa_pilot_entity_overrides")
      .select("id, entity_id, available, capacity, reason, created_at")
      .eq("organization_id", organizationId)
      .in("entity_id", entityIds)
      .lte("starts_on", date)
      .gte("ends_on", date)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id, entity_id, status")
      .eq("organization_id", organizationId)
      .eq("appointment_date", date)
      .in("entity_id", entityIds)
      .in("status", PILOT_ACTIVE_STATUSES),
  ]);
  if (entityError) throw entityError;
  if (overrideError) throw overrideError;
  if (appointmentError) throw appointmentError;

  const scheduleMap = new Map((scheduleRows ?? []).map((row) => [asText(row.entity_id), Math.max(1, Number(row.default_capacity ?? 4) || 4)]));
  const overrideMap = new Map<string, { available: boolean; capacity: number | null; reason: string }>();
  for (const item of overrides ?? []) {
    const id = asText(item.entity_id);
    if (!id || overrideMap.has(id)) continue;
    overrideMap.set(id, {
      available: item.available !== false,
      capacity: item.capacity == null ? null : Math.max(1, Number(item.capacity) || 1),
      reason: asText(item.reason),
    });
  }

  const bookedMap = new Map<string, number>();
  for (const appointment of appointments ?? []) {
    const id = asText(appointment.entity_id);
    if (!id) continue;
    bookedMap.set(id, (bookedMap.get(id) ?? 0) + 1);
  }

  return (entities ?? [])
    .filter((entity) => entity.active === true && entity.appointment_enabled === true)
    .map((entity) => {
      const id = asText(entity.id);
      const override = overrideMap.get(id);
      const capacity = override?.capacity ?? scheduleMap.get(id) ?? Math.max(1, Number(entity.daily_capacity ?? 4) || 4);
      const booked = bookedMap.get(id) ?? 0;
      const isAvailable = override?.available !== false;
      return {
        id,
        name: asText(entity.name) || "Entidade",
        slug: asText(entity.slug),
        capacity,
        booked,
        available: isAvailable ? Math.max(capacity - booked, 0) : 0,
        isAvailable,
        suspendedReason: isAvailable ? "" : (override?.reason || "Atendimento suspenso nesta data."),
      } satisfies PilotEntityAvailability;
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export async function expirePastPilotConfirmations(organizationId: string, personId?: string) {
  const now = new Date().toISOString();
  let query = supabaseAdmin
    .from("oh_consulente_appointments")
    .update({
      status: "cancelado",
      confirmation_status: "expired",
      cancelled_at: now,
      cancellation_reason: "Prazo de confirmação do piloto encerrado",
      updated_at: now,
    })
    .eq("organization_id", organizationId)
    .eq("confirmation_status", "pending")
    .in("status", ["solicitado"])
    .not("confirmation_expires_at", "is", null)
    .lt("confirmation_expires_at", now);
  if (personId) query = query.eq("person_id", personId);
  const { error } = await query;
  if (error) throw error;
}

export async function loadPilotAppointments(organizationId: string, startDate: string, endDate: string, personId?: string) {
  let query = supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, person_id, entity_id, scheduled_by_person_id, consulente_name, whatsapp, appointment_date, appointment_time, status, booking_channel, confirmation_status, confirmation_expires_at, confirmation_sent_at, confirmation_channel, confirmed_at, arrival_status, arrived_at, arrival_order, metadata, notes, created_at")
    .eq("organization_id", organizationId)
    .gte("appointment_date", startDate)
    .lte("appointment_date", endDate)
    .order("appointment_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (personId) query = query.eq("person_id", personId);
  const { data: appointments, error } = await query;
  if (error) throw error;

  const entityIds = Array.from(new Set((appointments ?? []).map((item) => asText(item.entity_id)).filter(Boolean)));
  const { data: entities, error: entityError } = entityIds.length
    ? await supabaseAdmin.from("oh_spiritual_entities").select("id, name").in("id", entityIds)
    : { data: [], error: null };
  if (entityError) throw entityError;
  const entityMap = new Map((entities ?? []).map((item) => [asText(item.id), asText(item.name) || "Entidade"]));

  return (appointments ?? []).map((item) => ({
    id: asText(item.id),
    personId: asText(item.person_id),
    entityId: asText(item.entity_id),
    entityName: entityMap.get(asText(item.entity_id)) || "Entidade",
    consulenteName: asText(item.consulente_name) || "Filho de Fora/Consulente",
    whatsapp: asText(item.whatsapp),
    appointmentDate: asText(item.appointment_date),
    appointmentTime: asText(item.appointment_time) || "20:00",
    status: asText(item.status),
    bookingChannel: asText(item.booking_channel),
    confirmationStatus: asText(item.confirmation_status) || "not_required",
    confirmationExpiresAt: asText(item.confirmation_expires_at),
    confirmationSentAt: asText(item.confirmation_sent_at),
    confirmationChannel: asText(item.confirmation_channel),
    confirmedAt: asText(item.confirmed_at),
    arrivalStatus: asText(item.arrival_status) || "pending",
    arrivedAt: asText(item.arrived_at),
    arrivalOrder: Number(item.arrival_order ?? 0) || null,
    notes: asText(item.notes),
    order: Number(asRecord(item.metadata).order ?? 0) || null,
  }));
}

export function pilotReservationError(error: unknown) {
  const message = error instanceof Error ? error.message : asText(asRecord(error).message);
  if (message.includes("PILOT_DATE_NOT_ALLOWED")) return { status: 409, message: "O piloto está disponível somente nas segundas e terças previstas no calendário." };
  if (message.includes("PILOT_ENTITY_NOT_SCHEDULED")) return { status: 409, message: "Esta Entidade não está prevista para esta data." };
  if (message.includes("PILOT_ENTITY_SUSPENDED")) return { status: 409, message: "O atendimento desta Entidade está suspenso para a data escolhida." };
  if (message.includes("PILOT_DUPLICATE_PERSON_DATE")) return { status: 409, message: "Esta pessoa já possui um agendamento ativo nesta data." };
  if (message.includes("PILOT_NO_AVAILABILITY")) return { status: 409, message: "A última vaga desta Entidade para a data escolhida acabou de ser preenchida." };
  return { status: 500, message: "Não foi possível concluir o agendamento agora." };
}
