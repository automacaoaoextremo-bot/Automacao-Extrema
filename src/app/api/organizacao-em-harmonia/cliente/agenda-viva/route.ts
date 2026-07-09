import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { sendAgendaVivaApprovalRequestEmail } from "@/lib/mail";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

function eventDate(value: unknown) {
  const text = asText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
  const [organizationResult, peopleResult, membershipsResult, rolesResult, eventTypesResult, locationsResult, eventsResult] = await Promise.all([
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
      .select("id, title, event_type, event_type_id, status, starts_at, ends_at, all_day, recurrence_rule, location_id, location, group_slug, responsible_person_id, created_by_person_id, approved_by_person_id, approved_at, requires_approval, notes, metadata, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  for (const result of [organizationResult, peopleResult, membershipsResult, rolesResult, eventTypesResult, locationsResult, eventsResult]) {
    if (result.error) throw result.error;
  }

  return {
    organization: organizationResult.data,
    people: peopleResult.data ?? [],
    memberships: membershipsResult.data ?? [],
    roles: rolesResult.data ?? [],
    eventTypes: eventTypesResult.data ?? [],
    locations: locationsResult.data ?? [],
    events: eventsResult.data ?? [],
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

  const fallbackWhatsapp = process.env.OH_AGENDA_APPROVER_WHATSAPP || process.env.AE_INTERNAL_WHATSAPP || "19992360856";
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
  const startsAt = eventDate(body.startsAt ?? body.starts_at);
  const endsAt = eventDate(body.endsAt ?? body.ends_at);
  const allDay = asBool(body.allDay ?? body.all_day, false);
  const isRecurring = asBool(body.isRecurring ?? body.recurring ?? body.recurrenceEnabled, false);
  const recurrenceFrequency = asText(body.recurrenceFrequency ?? body.periodicity ?? body.periodicidade) || "semanal";
  const recurrenceWeekday = asText(body.recurrenceWeekday ?? body.weekday ?? body.diaSemana);
  const recurrenceRule = buildRecurrenceRule({ isRecurring, frequency: recurrenceFrequency, weekday: recurrenceWeekday, startsAt });
  const locationId = asText(body.locationId ?? body.location_id);
  const locationName = asText(body.locationName ?? body.location_name);
  const location = asText(body.location) || locationName;
  const audience = asText(body.audience ?? body.publico ?? body.targetAudience) || "filhos-corrente";
  const groupSlug = asText(body.groupSlug ?? body.group_slug);
  const responsiblePersonId = asText(body.responsiblePersonId ?? body.responsible_person_id);
  const notes = asText(body.notes);
  const imageUrl = asText(body.imageUrl ?? body.image_url);
  const imageAlt = asText(body.imageAlt ?? body.image_alt) || title;
  const imageEmoji = asText(body.imageEmoji ?? body.image_emoji);
  const highlightVisual = body.highlightVisual === undefined ? true : asBool(body.highlightVisual, true);
  const firstAccessEnabled = body.firstAccessEnabled === undefined ? true : asBool(body.firstAccessEnabled, true);
  const firstAccessOrderRaw = Number(asText(body.firstAccessOrder ?? body.first_access_order));
  const firstAccessOrder = Number.isFinite(firstAccessOrderRaw) && firstAccessOrderRaw > 0 ? Math.trunc(firstAccessOrderRaw) : null;
  const firstAccessSummary = asText(body.firstAccessSummary ?? body.first_access_summary);
  const requiresApproval = body.requiresApproval === undefined ? true : asBool(body.requiresApproval, true);
  const status = requiresApproval ? "pendente_aprovacao" : "aprovado";

  if (!title) throw new Error("Informe o nome da atividade/evento.");

  const payload = {
    organization_id: organizationId,
    title,
    event_type: eventTypeSlug,
    event_type_id: eventTypeId || null,
    status,
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
      location_id: locationId || null,
      location_name: location || null,
      locationLabel: location || null,
      approval_requested_at: new Date().toISOString(),
      visual_calendar: true,
      highlight_visual: highlightVisual,
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
      recurrenceLabel: isRecurring ? recurrenceLabel(recurrenceFrequency) : "Evento pontual",
      periodicityLabel: isRecurring ? recurrenceLabel(recurrenceFrequency) : "Evento pontual",
    },
    updated_at: new Date().toISOString(),
  };

  let savedId = eventId;

  if (eventId) {
    const { data: current, error: currentError } = await supabaseAdmin
      .from("agv_events")
      .select("id, status")
      .eq("id", eventId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) throw new Error("Atividade não encontrada.");

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

async function deleteEvent(organizationId: string, body: Record<string, unknown>) {
  const eventId = asText(body.eventId);
  if (!eventId) throw new Error("Atividade não informada.");
  const { error } = await supabaseAdmin
    .from("agv_events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .in("status", ["rascunho", "pendente_aprovacao", "ajuste_solicitado"]);
  if (error) throw error;
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await listPayload(auth.context.organizationId);
    return NextResponse.json({ ...payload, currentPerson: auth.context.person });
  } catch (error) {
    return NextResponse.json({ error: errorToMessage(error, "Erro ao carregar Agenda Viva.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action) || "upsertEvent";
    let approvalWhatsappUrl = "";

    if (action === "upsertEvent") {
      const result = await upsertEvent(
        auth.context.organizationId,
        auth.context.person.id,
        body,
        auth.context.organization?.name || "Organização em Harmonia",
        auth.context.person.full_name,
        auth.context.person.email,
      );
      approvalWhatsappUrl = result.approvalWhatsappUrl;
    } else if (action === "approveEvent") {
      await decideEvent(auth.context.organizationId, auth.context.person.id, body, "aprovado");
    } else if (action === "rejectEvent") {
      await decideEvent(auth.context.organizationId, auth.context.person.id, body, "reprovado");
    } else if (action === "requestAdjustments") {
      await decideEvent(auth.context.organizationId, auth.context.person.id, body, "ajuste_solicitado");
    } else if (action === "deleteEvent") {
      await deleteEvent(auth.context.organizationId, body);
    }

    const payload = await listPayload(auth.context.organizationId);
    return NextResponse.json({ ok: true, approvalWhatsappUrl, ...payload });
  } catch (error) {
    return NextResponse.json({ error: errorToMessage(error, "Erro ao salvar Agenda Viva.") }, { status: 500 });
  }
}
