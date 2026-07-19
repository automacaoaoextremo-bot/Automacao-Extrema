import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { sendAgendaVivaApprovalRequestEmail } from "@/lib/mail";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeAllowedMonthOccurrences } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  const text = asText(value).toLowerCase();
  if (!text) return fallback;
  return ["sim", "s", "yes", "true", "1"].includes(text);
}

function errorToMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    if (parts.length) return parts.join(" | ");
  }
  return fallback;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function normalizeWhatsapp(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function whatsappUrl(phone: string | null | undefined, message: string) {
  const normalized = normalizeWhatsapp(phone);
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function normalizeLocalDateTime(value: unknown) {
  const text = asText(value);
  if (!text) return "";
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (!match) return text;
  return `${match[1]}T${match[2]}`;
}

function eventDate(value: unknown) {
  const text = asText(value);
  if (!text) return null;

  // Campos datetime-local vêm sem fuso. O Tucxa opera em Campinas/SP, então
  // tratamos estes valores como America/Sao_Paulo antes de gravar no timestamptz.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    const date = new Date(`${text.length === 16 ? `${text}:00` : text}-03:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function weekdayCode(value: string) {
  const normalized = normalizeText(value);
  if (normalized.includes("domingo") || normalized === "0" || normalized === "su") return "SU";
  if (normalized.includes("segunda") || normalized === "1" || normalized === "mo") return "MO";
  if (normalized.includes("terca") || normalized === "2" || normalized === "tu") return "TU";
  if (normalized.includes("quarta") || normalized === "3" || normalized === "we") return "WE";
  if (normalized.includes("quinta") || normalized === "4" || normalized === "th") return "TH";
  if (normalized.includes("sexta") || normalized === "5" || normalized === "fr") return "FR";
  if (normalized.includes("sabado") || normalized === "6" || normalized === "sa") return "SA";
  return "";
}

function weekdayFromDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][date.getDay()] ?? "";
}

function buildRecurrenceRule(input: { isRecurring: boolean; frequency: string; weekday: string; startsAt: string | null }) {
  if (!input.isRecurring) return null;

  const frequency = normalizeText(input.frequency || "semanal");
  const day = weekdayCode(input.weekday) || weekdayFromDate(input.startsAt);

  if (frequency.includes("quinzen")) return `FREQ=WEEKLY;INTERVAL=2${day ? `;BYDAY=${day}` : ""}`;
  if (frequency.includes("mensal") || frequency.includes("month")) return `FREQ=MONTHLY${day ? `;BYDAY=${day}` : ""}`;
  return `FREQ=WEEKLY${day ? `;BYDAY=${day}` : ""}`;
}

function defaultAgendaSettings() {
  return {
    maxRecurringAppointmentsPerConsulente: 2,
    autoCancelRecurringOnAbsence: true,
    wednesdayBookingMode: "coordination",
    wednesdayAuthorizedPersonIds: [] as string[],
    requireRecommendingEntityForWednesday: true,
    appointmentReturnGuidance:
      "Após o primeiro atendimento com uma entidade, se houver orientação de retorno, procure voltar com a mesma entidade para preservar a continuidade do cuidado.",
    appointmentEditCutoffMinutes: 1440,
    accessValidationReviewerEmails: "",
    accessValidationReviewerPersonIds: [] as string[],
    accessSimulationPersonIds: [] as string[],
    accessCopyEmail: "automacao.ao.extremo@gmail.com",
    agendaCatalogs: {
      audiences: [
        { id: "filhos-corrente", value: "filhos-corrente", label: "Somente Filhos da Corrente", active: true, archived: false },
        { id: "consulentes", value: "consulentes", label: "Consulentes / Filhos de Fora", active: true, archived: false },
        { id: "todos", value: "todos", label: "Filhos da Corrente e Consulentes", active: true, archived: false },
      ],
      classifications: [
        { id: "umbanda", value: "umbanda", label: "Umbanda", active: true, archived: false },
        { id: "outros", value: "outros", label: "Outros", active: true, archived: false },
        { id: "sementinha", value: "sementinha", label: "Sementinha", active: true, archived: false },
        { id: "estudos", value: "estudos", label: "Estudos", active: true, archived: false },
        { id: "social", value: "social", label: "Social / comunidade", active: true, archived: false },
      ],
      responsiblePersonIds: [] as string[],
    },
  };
}

function mergeAgendaSettings(settings: unknown) {
  const base = defaultAgendaSettings();
  const current = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  const currentCatalogs = current.agendaCatalogs && typeof current.agendaCatalogs === "object" && !Array.isArray(current.agendaCatalogs) ? current.agendaCatalogs as Record<string, unknown> : {};
  const normalizeCatalogItems = (fallback: Array<Record<string, unknown>>, value: unknown) => {
    const map = new Map<string, Record<string, unknown>>();
    fallback.forEach((item) => map.set(asText(item.value), item));
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return;
        const record = item as Record<string, unknown>;
        const label = asText(record.label) || "Item";
        const valueText = asText(record.value) || slugify(label);
        map.set(valueText, {
          id: asText(record.id) || valueText,
          value: valueText,
          label,
          description: asText(record.description),
          active: record.active === false ? false : true,
          archived: record.archived === true,
        });
      });
    }
    return Array.from(map.values());
  };

  return {
    ...base,
    ...current,
    wednesdayAuthorizedPersonIds: Array.isArray(current.wednesdayAuthorizedPersonIds)
      ? current.wednesdayAuthorizedPersonIds.map((item) => asText(item)).filter(Boolean)
      : base.wednesdayAuthorizedPersonIds,
    accessValidationReviewerEmails: asText(current.accessValidationReviewerEmails ?? base.accessValidationReviewerEmails),
    accessValidationReviewerPersonIds: Array.isArray(current.accessValidationReviewerPersonIds)
      ? current.accessValidationReviewerPersonIds.map((item) => asText(item)).filter(Boolean)
      : base.accessValidationReviewerPersonIds,
    accessSimulationPersonIds: Array.isArray(current.accessSimulationPersonIds)
      ? current.accessSimulationPersonIds.map((item) => asText(item)).filter(Boolean)
      : base.accessSimulationPersonIds,
    accessCopyEmail: asText(current.accessCopyEmail ?? base.accessCopyEmail) || base.accessCopyEmail,
    agendaCatalogs: {
      audiences: normalizeCatalogItems(base.agendaCatalogs.audiences, currentCatalogs.audiences),
      classifications: normalizeCatalogItems(base.agendaCatalogs.classifications, currentCatalogs.classifications),
      responsiblePersonIds: Array.isArray(currentCatalogs.responsiblePersonIds)
        ? currentCatalogs.responsiblePersonIds.map((item) => asText(item)).filter(Boolean)
        : base.agendaCatalogs.responsiblePersonIds,
    },
  };
}

function asNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(asText(value).replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function asTextList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function recurrenceLabel(frequency: string) {
  const normalized = normalizeText(frequency);
  if (normalized.includes("quinzen")) return "Recorrência quinzenal";
  if (normalized.includes("mensal") || normalized.includes("month")) return "Recorrência mensal";
  if (normalized.includes("custom") || normalized.includes("personal")) return "Recorrência personalizada";
  return "Recorrência semanal";
}

function approvalMessage(input: {
  organizationName: string;
  title: string;
  eventTypeName: string;
  requestedByName: string;
  approvalUrl: string;
  startsAt: string | null;
}) {
  const starts = input.startsAt
    ? new Date(input.startsAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "data a confirmar";
  return [
    "Olá! Há uma nova atividade/evento aguardando aprovação no Agenda Viva.",
    "",
    `Organização: ${input.organizationName}`,
    `Atividade: ${input.title}`,
    `Tipo: ${input.eventTypeName}`,
    `Data/horário: ${starts}`,
    `Solicitante: ${input.requestedByName}`,
    "",
    "Para aprovar, reprovar ou pedir ajuste, acesse:",
    input.approvalUrl,
  ].join("\n");
}

async function listPayload(organizationId: string) {
  const [organizationResult, peopleResult, membershipsResult, rolesResult, eventTypesResult, locationsResult, eventsResult, moduleSettingsResult, entitiesResult] = await Promise.all([
    supabaseAdmin
      .from("oh_organizations")
      .select("id, name, slug, email, whatsapp, enabled_modules")
      .eq("id", organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_memberships")
      .select("id, person_id, role_id, module_slugs, active, status, agenda_viva_profile")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_roles")
      .select("id, name, slug, active")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("agv_event_types")
      .select("id, slug, name, description, requires_approval, active, sort_order")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("oh_locations")
      .select("id, name, location_type, address, number, complement, district, city, state, active, is_primary")
      .eq("organization_id", organizationId)
      .order("is_primary", { ascending: false })
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("agv_events")
      .select("id, title, event_type, event_type_id, status, active, starts_at, ends_at, all_day, recurrence_rule, location_id, location, group_slug, responsible_person_id, created_by_person_id, approved_by_person_id, approved_at, requires_approval, notes, metadata, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("oh_module_settings")
      .select("id, module_slug, enabled, settings")
      .eq("organization_id", organizationId)
      .eq("module_slug", "agenda-viva")
      .maybeSingle(),
    supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, slug, line, entity_type, usual_days, daily_capacity, appointment_enabled, appointment_notes, active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
  ]);

  for (const result of [organizationResult, peopleResult, membershipsResult, rolesResult, eventTypesResult, locationsResult, eventsResult]) {
    if (result.error) throw result.error;
  }

  const agendaSettings = mergeAgendaSettings(moduleSettingsResult.status === 200 && !moduleSettingsResult.error ? moduleSettingsResult.data?.settings : null);

  return {
    organization: organizationResult.data,
    people: peopleResult.data ?? [],
    memberships: membershipsResult.data ?? [],
    roles: rolesResult.data ?? [],
    eventTypes: eventTypesResult.data ?? [],
    locations: locationsResult.data ?? [],
    events: eventsResult.data ?? [],
    entities: entitiesResult.status === 200 && !entitiesResult.error ? entitiesResult.data ?? [] : [],
    agendaSettings,
  };
}

async function findApprover(organizationId: string) {
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from("oh_memberships")
    .select("person_id, role_id, agenda_viva_profile, active")
    .eq("organization_id", organizationId)
    .eq("active", true);

  if (membershipsError) throw membershipsError;

  const approverMembership = (memberships ?? []).find((membership) => {
    const profile = membership.agenda_viva_profile as { canApproveEvents?: boolean } | null;
    return profile?.canApproveEvents === true;
  });

  if (approverMembership?.person_id) {
    const { data: person, error: personError } = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp")
      .eq("id", approverMembership.person_id)
      .maybeSingle();
    if (personError) throw personError;
    if (person) return person;
  }

  const fallbackWhatsapp = process.env.OH_AGENDA_APPROVER_WHATSAPP || process.env.AE_INTERNAL_WHATSAPP || "19989848246";
  const fallbackEmail = process.env.OH_AGENDA_APPROVER_EMAIL || process.env.EMAIL_COPY_TO || "automacao.ao.extremo@gmail.com";
  return {
    id: "fallback-approver",
    full_name: "Aprovador Agenda Viva",
    email: fallbackEmail,
    whatsapp: fallbackWhatsapp,
  };
}

async function eventTypeName(organizationId: string, eventTypeId: string, fallback: string) {
  if (!eventTypeId) return fallback || "Atividade";
  const { data } = await supabaseAdmin
    .from("agv_event_types")
    .select("name")
    .eq("id", eventTypeId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data?.name || fallback || "Atividade";
}

async function upsertEvent(organizationId: string, personId: string, body: Record<string, unknown>, organizationName: string, requestedByName: string, requestedByEmail: string | null) {
  const eventId = asText(body.eventId ?? body.id);
  const title = asText(body.title);
  const eventTypeId = asText(body.eventTypeId ?? body.event_type_id);
  const eventTypeSlug = asText(body.eventType ?? body.event_type) || "atividade";
  const rawStartsAt = body.startsAt ?? body.starts_at;
  const rawEndsAt = body.endsAt ?? body.ends_at;
  const startsAt = eventDate(rawStartsAt);
  const endsAt = eventDate(rawEndsAt);
  const localStart = normalizeLocalDateTime(rawStartsAt);
  const localEnd = normalizeLocalDateTime(rawEndsAt);
  const allDay = asBool(body.allDay ?? body.all_day, false);
  const isRecurring = asBool(body.isRecurring ?? body.recurring ?? body.recurrenceEnabled, false);
  const recurrenceFrequency = asText(body.recurrenceFrequency ?? body.periodicity ?? body.periodicidade) || "semanal";
  const recurrenceWeekday = asText(body.recurrenceWeekday ?? body.weekday ?? body.diaSemana);
  const allowedMonthOccurrences = normalizeAllowedMonthOccurrences(body.allowedMonthOccurrences ?? body.allowed_month_occurrences);
  const recurrenceRule = buildRecurrenceRule({ isRecurring, frequency: recurrenceFrequency, weekday: recurrenceWeekday, startsAt });
  const locationId = asText(body.locationId ?? body.location_id);
  const locationName = asText(body.locationName ?? body.location_name);
  const location = asText(body.location) || locationName;
  const audience = asText(body.audience ?? body.publico ?? body.targetAudience) || "filhos-corrente";
  const eventClassification = asText(body.eventClassification ?? body.event_classification ?? body.classification ?? body.classificacao) || "umbanda";
  const groupSlug = asText(body.groupSlug ?? body.group_slug);
  const responsiblePersonId = asText(body.responsiblePersonId ?? body.responsible_person_id);
  const notes = asText(body.notes);
  const imageUrl = asText(body.imageUrl ?? body.image_url);
  const imageAlt = asText(body.imageAlt ?? body.image_alt) || title;
  const imageEmoji = asText(body.imageEmoji ?? body.image_emoji);
  const highlightVisual = body.highlightVisual === undefined ? true : asBool(body.highlightVisual, true);
  const continuesDuringVacation = body.continuesDuringVacation === undefined ? false : asBool(body.continuesDuringVacation, false);
  const firstAccessEnabled = body.firstAccessEnabled === undefined ? true : asBool(body.firstAccessEnabled, true);
  const firstAccessOrderRaw = Number(asText(body.firstAccessOrder ?? body.first_access_order));
  const firstAccessOrder = Number.isFinite(firstAccessOrderRaw) && firstAccessOrderRaw > 0 ? Math.trunc(firstAccessOrderRaw) : null;
  const firstAccessSummary = asText(body.firstAccessSummary ?? body.first_access_summary);
  const requiresApproval = body.requiresApproval === undefined ? true : asBool(body.requiresApproval, true);
  const requestedActive = body.active === undefined && body.eventActive === undefined
    ? null
    : asBool(body.active ?? body.eventActive, true);
  const status = requiresApproval ? "pendente_aprovacao" : "aprovado";

  if (!title) throw new Error("Informe o nome da atividade/evento.");

  const payload: Record<string, unknown> = {
    organization_id: organizationId,
    title,
    event_type: eventTypeSlug,
    event_type_id: eventTypeId || null,
    status,
    active: requestedActive ?? true,
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: allDay,
    recurrence_rule: recurrenceRule,
    location_id: locationId || null,
    location: location || null,
    group_slug: groupSlug || null,
    responsible_person_id: responsiblePersonId || null,
    created_by_person_id: personId,
    requires_approval: requiresApproval,
    notes: notes || null,
    metadata: {
      source: "agenda_viva_cliente",
      requested_by: personId,
      audience,
      publico: audience,
      targetAudience: audience,
      eventClassification,
      event_classification: eventClassification,
      classification: eventClassification,
      classificacao: eventClassification,
      location_id: locationId || null,
      location_name: location || null,
      locationLabel: location || null,
      localStart: localStart || null,
      local_start: localStart || null,
      localEnd: localEnd || null,
      local_end: localEnd || null,
      approval_requested_at: new Date().toISOString(),
      visual_calendar: true,
      highlight_visual: highlightVisual,
      continuesDuringVacation,
      continues_during_vacation: continuesDuringVacation,
      keepDuringVacation: continuesDuringVacation,
      mantemNasFerias: continuesDuringVacation,
      firstAccessEnabled,
      first_access_enabled: firstAccessEnabled,
      showOnFirstAccess: firstAccessEnabled,
      show_on_first_access: firstAccessEnabled,
      firstAccessOrder,
      first_access_order: firstAccessOrder,
      firstAccessSummary: firstAccessSummary || null,
      first_access_summary: firstAccessSummary || null,
      image_url: imageUrl || null,
      image_alt: imageAlt || null,
      image_emoji: imageEmoji || null,
      recurring: isRecurring,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : null,
      recurrenceWeekday: isRecurring ? recurrenceWeekday || null : null,
      allowedMonthOccurrences: isRecurring ? allowedMonthOccurrences : null,
      allowed_month_occurrences: isRecurring ? allowedMonthOccurrences : null,
      recurrenceLabel: isRecurring ? recurrenceLabel(recurrenceFrequency) : "Evento pontual",
      periodicityLabel: isRecurring ? recurrenceLabel(recurrenceFrequency) : "Evento pontual",
    },
    updated_at: new Date().toISOString(),
  };

  let savedId = eventId;

  if (eventId) {
    const { data: current, error: currentError } = await supabaseAdmin
      .from("agv_events")
      .select("id, status, active")
      .eq("id", eventId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) throw new Error("Atividade não encontrada.");
    payload.active = requestedActive ?? current.active !== false;

    const { error } = await supabaseAdmin
      .from("agv_events")
      .update(payload)
      .eq("id", eventId)
      .eq("organization_id", organizationId);
    if (error) throw error;
  } else {
    const { data, error } = await supabaseAdmin
      .from("agv_events")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    savedId = data.id as string;
  }

  const approvalUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/cliente/agenda-viva/aprovacoes?eventId=${encodeURIComponent(savedId)}`;
  const typeName = await eventTypeName(organizationId, eventTypeId, eventTypeSlug);
  const approver = await findApprover(organizationId);
  const waMessage = approvalMessage({ organizationName, title, eventTypeName: typeName, requestedByName, approvalUrl, startsAt });
  const approvalWhatsappUrl = whatsappUrl(approver.whatsapp, waMessage);

  if (requiresApproval) {
    const { error: approvalError } = await supabaseAdmin.from("agv_event_approvals").insert({
      event_id: savedId,
      requested_by_person_id: personId,
      status: "pendente",
    });
    if (approvalError) throw approvalError;

    await sendAgendaVivaApprovalRequestEmail({
      organizationName,
      eventTitle: title,
      eventTypeName: typeName,
      requestedByName,
      requestedByEmail,
      startsAt,
      endsAt,
      location,
      notes,
      approvalUrl,
      whatsappApprovalUrl: approvalWhatsappUrl,
      approverEmail: approver.email,
    });
  }

  return { eventId: savedId, approvalWhatsappUrl };
}

async function setEventActive(organizationId: string, body: Record<string, unknown>) {
  const eventId = asText(body.eventId ?? body.id);
  const active = asBool(body.active, true);
  if (!eventId) throw new Error("Atividade não informada.");

  const { error } = await supabaseAdmin
    .from("agv_events")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

async function decideEvent(organizationId: string, personId: string, body: Record<string, unknown>, status: "aprovado" | "reprovado" | "ajuste_solicitado") {
  const eventId = asText(body.eventId);
  const decisionNotes = asText(body.decisionNotes ?? body.notes);
  if (!eventId) throw new Error("Atividade não informada.");

  const { error } = await supabaseAdmin
    .from("agv_events")
    .update({
      status,
      approved_by_person_id: status === "aprovado" ? personId : null,
      approved_at: status === "aprovado" ? new Date().toISOString() : null,
      notes: decisionNotes ? decisionNotes : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("organization_id", organizationId);
  if (error) throw error;

  const { error: approvalError } = await supabaseAdmin
    .from("agv_event_approvals")
    .update({ status, approved_by_person_id: personId, decision_notes: decisionNotes || null, decided_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("status", "pendente");
  if (approvalError) throw approvalError;
}

async function updateAgendaSettings(organizationId: string, body: Record<string, unknown>) {
  const current = mergeAgendaSettings(body.settings && typeof body.settings === "object" ? body.settings : body);
  const settings = {
    ...current,
    maxRecurringAppointmentsPerConsulente: Math.max(0, Math.trunc(asNumber(body.maxRecurringAppointmentsPerConsulente ?? current.maxRecurringAppointmentsPerConsulente, 2))),
    autoCancelRecurringOnAbsence: asBool(body.autoCancelRecurringOnAbsence ?? current.autoCancelRecurringOnAbsence, true),
    wednesdayBookingMode: asText(body.wednesdayBookingMode ?? current.wednesdayBookingMode) || "coordination",
    wednesdayAuthorizedPersonIds: asTextList(body.wednesdayAuthorizedPersonIds ?? current.wednesdayAuthorizedPersonIds),
    requireRecommendingEntityForWednesday: asBool(body.requireRecommendingEntityForWednesday ?? current.requireRecommendingEntityForWednesday, true),
    appointmentReturnGuidance: asText(body.appointmentReturnGuidance ?? current.appointmentReturnGuidance) || defaultAgendaSettings().appointmentReturnGuidance,
    appointmentEditCutoffMinutes: Math.max(0, Math.trunc(asNumber(body.appointmentEditCutoffMinutes ?? current.appointmentEditCutoffMinutes, 1440))),
    accessValidationReviewerEmails: asText(body.accessValidationReviewerEmails ?? current.accessValidationReviewerEmails),
    accessValidationReviewerPersonIds: asTextList(body.accessValidationReviewerPersonIds ?? current.accessValidationReviewerPersonIds),
    accessSimulationPersonIds: asTextList(body.accessSimulationPersonIds ?? current.accessSimulationPersonIds),
    accessCopyEmail: asText(body.accessCopyEmail ?? current.accessCopyEmail) || defaultAgendaSettings().accessCopyEmail,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("oh_module_settings")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("module_slug", "agenda-viva")
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("oh_module_settings")
      .update({ enabled: true, settings, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.from("oh_module_settings").insert({
    organization_id: organizationId,
    module_slug: "agenda-viva",
    enabled: true,
    settings,
  });
  if (error) throw error;
}

async function upsertEventType(organizationId: string, body: Record<string, unknown>) {
  const record = body.eventType && typeof body.eventType === "object" && !Array.isArray(body.eventType) ? body.eventType as Record<string, unknown> : body;
  const id = asText(record.id);
  const name = asText(record.name);
  const slug = slugify(asText(record.slug) || name);
  const description = asText(record.description);
  const requiresApproval = record.requiresApproval === undefined ? true : asBool(record.requiresApproval, true);
  const active = record.active === undefined ? true : asBool(record.active, true);
  const sortOrderRaw = Number(asText(record.sortOrder ?? record.sort_order));
  const sortOrder = Number.isFinite(sortOrderRaw) ? Math.trunc(sortOrderRaw) : 100;

  if (!name) throw new Error("Informe o nome do tipo de atividade.");

  if (id) {
    const { error } = await supabaseAdmin
      .from("agv_event_types")
      .update({ name, slug, description: description || null, requires_approval: requiresApproval, active, sort_order: sortOrder, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.from("agv_event_types").insert({
    organization_id: organizationId,
    name,
    slug,
    description: description || null,
    requires_approval: requiresApproval,
    active,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

async function deleteEventType(organizationId: string, body: Record<string, unknown>) {
  const eventTypeId = asText(body.eventTypeId ?? body.id);
  if (!eventTypeId) throw new Error("Tipo de atividade não informado.");

  const { data: events, error: eventsError } = await supabaseAdmin
    .from("agv_events")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("event_type_id", eventTypeId)
    .limit(1);
  if (eventsError) throw eventsError;

  if ((events ?? []).length > 0) {
    const { error } = await supabaseAdmin
      .from("agv_event_types")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", eventTypeId)
      .eq("organization_id", organizationId);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin
    .from("agv_event_types")
    .delete()
    .eq("id", eventTypeId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

async function updateAgendaCatalogs(organizationId: string, body: Record<string, unknown>) {
  const currentPayload = await listPayload(organizationId);
  const currentSettings = mergeAgendaSettings(currentPayload.agendaSettings);
  const incoming = body.agendaCatalogs && typeof body.agendaCatalogs === "object" && !Array.isArray(body.agendaCatalogs)
    ? body.agendaCatalogs as Record<string, unknown>
    : {};
  const settings = mergeAgendaSettings({
    ...currentSettings,
    agendaCatalogs: incoming,
  });

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("oh_module_settings")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("module_slug", "agenda-viva")
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("oh_module_settings")
      .update({ enabled: true, settings, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.from("oh_module_settings").insert({
    organization_id: organizationId,
    module_slug: "agenda-viva",
    enabled: true,
    settings,
  });
  if (error) throw error;
}

async function deleteEvent(organizationId: string, body: Record<string, unknown>) {
  const eventId = asText(body.eventId);
  if (!eventId) throw new Error("Atividade não informada.");

  const { data: event, error: eventError } = await supabaseAdmin
    .from("agv_events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!event) throw new Error("Atividade não encontrada para esta organização.");

  const { error: approvalError } = await supabaseAdmin
    .from("agv_event_approvals")
    .delete()
    .eq("event_id", eventId);

  if (approvalError) throw approvalError;

  const { error } = await supabaseAdmin
    .from("agv_events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

type AuthPerson = {
  id: string;
  full_name: string;
  email: string | null;
};


function normalizeOrganizationName(organization: unknown) {
  if (!organization || typeof organization !== "object") return "Organização em Harmonia";

  const record = organization as Record<string, unknown>;
  return asText(record.name) || asText(record.title) || "Organização em Harmonia";
}

function normalizeAuthPerson(person: unknown): AuthPerson | null {
  if (!person || typeof person !== "object") return null;

  const record = person as Record<string, unknown>;
  const id = asText(record.id);
  if (!id) return null;

  return {
    id,
    full_name: asText(record.full_name) || asText(record.name) || "Usuário Organização em Harmonia",
    email: asText(record.email) || null,
  };
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  const currentPerson = normalizeAuthPerson(auth.context.person);
  if (!currentPerson) {
    return NextResponse.json(
      { error: "Este usuário ainda não está vinculado à Organização em Harmonia." },
      { status: 403 },
    );
  }

  try {
    const payload = await listPayload(auth.context.organizationId);
    return NextResponse.json({ ...payload, currentPerson });
  } catch (error) {
    return NextResponse.json({ error: errorToMessage(error, "Erro ao carregar Agenda Viva.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  const currentPerson = normalizeAuthPerson(auth.context.person);
  if (!currentPerson) {
    return NextResponse.json(
      { error: "Este usuário ainda não está vinculado à Organização em Harmonia." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action) || "upsertEvent";
    let approvalWhatsappUrl = "";

    if (action === "upsertEvent") {
      const result = await upsertEvent(
        auth.context.organizationId,
        currentPerson.id,
        body,
        normalizeOrganizationName(auth.context.organization),
        currentPerson.full_name,
        currentPerson.email,
      );
      approvalWhatsappUrl = result.approvalWhatsappUrl;
    } else if (action === "approveEvent") {
      await decideEvent(auth.context.organizationId, currentPerson.id, body, "aprovado");
    } else if (action === "rejectEvent") {
      await decideEvent(auth.context.organizationId, currentPerson.id, body, "reprovado");
    } else if (action === "requestAdjustments") {
      await decideEvent(auth.context.organizationId, currentPerson.id, body, "ajuste_solicitado");
    } else if (action === "setEventActive") {
      await setEventActive(auth.context.organizationId, body);
    } else if (action === "deleteEvent") {
      await deleteEvent(auth.context.organizationId, body);
    } else if (action === "upsertEventType") {
      await upsertEventType(auth.context.organizationId, body);
    } else if (action === "deleteEventType") {
      await deleteEventType(auth.context.organizationId, body);
    } else if (action === "updateAgendaCatalogs") {
      await updateAgendaCatalogs(auth.context.organizationId, body);
    } else if (action === "updateAgendaSettings") {
      await updateAgendaSettings(auth.context.organizationId, body);
    }

    const payload = await listPayload(auth.context.organizationId);
    return NextResponse.json({ ok: true, approvalWhatsappUrl, ...payload });
  } catch (error) {
    return NextResponse.json({ error: errorToMessage(error, "Erro ao salvar Agenda Viva.") }, { status: 500 });
  }
}
