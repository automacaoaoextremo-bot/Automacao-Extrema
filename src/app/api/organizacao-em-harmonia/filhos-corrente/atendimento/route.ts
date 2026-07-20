import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { monthOccurrenceIndex } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";

type AuthContext = {
  organizationId: string;
  personId: string | null;
  fullName: string;
  canReception: boolean;
  groups: Array<"grupo-1" | "grupo-2">;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(asText(value) || value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function permissionsFromProfile(value: unknown) {
  const profile = asRecord(value);
  const functionValues = [
    ...(Array.isArray(profile.functionSlugs) ? profile.functionSlugs : []),
    ...(Array.isArray(profile.selectedFunctions) ? profile.selectedFunctions.map((item) => `${asText(asRecord(item).slug)} ${asText(asRecord(item).label)}`) : []),
  ].map(normalize);
  const agendaValues = [
    normalize(profile.thursdayGroup),
    ...(Array.isArray(profile.agendaSlugs) ? profile.agendaSlugs.map(normalize) : []),
    ...(Array.isArray(profile.selectedAgenda) ? profile.selectedAgenda.map((item) => normalize(`${asText(asRecord(item).slug)} ${asText(asRecord(item).label)}`)) : []),
  ].join(" ");
  const groups: Array<"grupo-1" | "grupo-2"> = [];
  if (/grupo-?1|grupo i\b/.test(agendaValues)) groups.push("grupo-1");
  if (/grupo-?2|grupo ii\b/.test(agendaValues)) groups.push("grupo-2");
  return {
    canReception: profile.supportsReception === true || functionValues.some((item) => item.includes("recepcao") || item.includes("recepcionista")),
    groups,
  };
}

function asBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  const text = asText(value).toLowerCase();
  if (!text) return fallback;
  return ["sim", "s", "yes", "true", "1"].includes(text);
}

function normalizePhone(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function asDateOnly(value: unknown) {
  const text = asText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function weekdaySlug(dateText: string) {
  const date = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][date.getDay()] ?? "";
}

function normalizeSettings(settings: unknown) {
  const current = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  return {
    maxRecurringAppointmentsPerConsulente: Math.max(0, asNumber(current.maxRecurringAppointmentsPerConsulente, 2)),
    autoCancelRecurringOnAbsence: current.autoCancelRecurringOnAbsence !== false,
    allowDifferentEntityAfterFirstAppointment: current.allowDifferentEntityAfterFirstAppointment !== false,
    allowAlternateEntityWhenUnavailable: current.allowAlternateEntityWhenUnavailable !== false,
    wednesdayBookingMode: asText(current.wednesdayBookingMode) || "coordination",
    wednesdayAuthorizedPersonIds: Array.isArray(current.wednesdayAuthorizedPersonIds) ? current.wednesdayAuthorizedPersonIds.map((item) => asText(item)).filter(Boolean) : [],
    requireRecommendingEntityForWednesday: current.requireRecommendingEntityForWednesday !== false,
  };
}

async function getAuthContext(request: Request): Promise<AuthContext> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) throw new Error("Sessão não encontrada.");

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Sessão inválida.");

  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug")
    .or("slug.eq.tucxa,name.ilike.%tucxa%")
    .limit(1)
    .maybeSingle();
  if (organizationError) throw organizationError;
  if (!organization?.id) throw new Error("Organização Tucxa não localizada.");

  const { data: person } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp")
    .eq("organization_id", organization.id)
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  const { data: membership } = person?.id
    ? await supabaseAdmin
        .from("oh_memberships")
        .select("role_id, agenda_viva_profile")
        .eq("organization_id", organization.id)
        .eq("person_id", person.id)
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const permissions = permissionsFromProfile(membership?.agenda_viva_profile);
  let roleCanReception = false;
  if (membership?.role_id) {
    const { data: role } = await supabaseAdmin
      .from("oh_roles")
      .select("name, slug, active")
      .eq("organization_id", organization.id)
      .eq("id", membership.role_id)
      .maybeSingle();
    roleCanReception = role?.active === true && normalize(`${role.slug ?? ""} ${role.name ?? ""}`).includes("recepc");
  }

  return {
    organizationId: organization.id,
    personId: person?.id ?? null,
    fullName: person?.full_name || userData.user.email || "Filho da Corrente",
    canReception: permissions.canReception || roleCanReception,
    groups: permissions.groups,
  };
}

async function loadSettings(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_module_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .eq("module_slug", "atendimento-em-harmonia")
    .maybeSingle();
  if (error) throw error;
  return normalizeSettings(data?.settings);
}

async function loadPayload(context: AuthContext) {
  const [settingsResult, entitiesResult, appointmentsResult] = await Promise.all([
    loadSettings(context.organizationId),
    supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, line, entity_type, usual_days, daily_capacity, appointment_enabled, active")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id, consulente_name, whatsapp, email, appointment_date, appointment_time, status, is_recurring, entity_id, recommended_by_entity_id, scheduled_by_person_id, notes, metadata, created_at")
      .eq("organization_id", context.organizationId)
      .gte("appointment_date", new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10))
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true, nullsFirst: false })
      .limit(400),
  ]);

  if (entitiesResult.error) throw entitiesResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;

  const activeAppointmentEntities = (entitiesResult.data ?? []).filter((entity) => entity.active !== false && entity.appointment_enabled !== false);

  const canRegisterWednesday =
    settingsResult.wednesdayBookingMode !== "coordination" ||
    !settingsResult.wednesdayAuthorizedPersonIds.length ||
    (!!context.personId && settingsResult.wednesdayAuthorizedPersonIds.includes(context.personId));

  return {
    settings: settingsResult,
    entities: activeAppointmentEntities,
    appointments: appointmentsResult.data ?? [],
    permissions: {
      personId: context.personId,
      canRegisterGeneral: true,
      canRegisterWednesday,
    },
  };
}

async function createAppointment(context: AuthContext, body: Record<string, unknown>) {
  const appointmentDate = asDateOnly(body.appointmentDate ?? body.date);
  const appointmentTime = asText(body.appointmentTime ?? body.time) || null;
  const entityId = asText(body.entityId ?? body.entity_id);
  const fullName = asText(body.fullName ?? body.full_name);
  const whatsapp = normalizePhone(body.whatsapp);
  const email = asText(body.email).toLowerCase();
  const isRecurring = asBool(body.isRecurring ?? body.recurring, false);
  const recurrenceCount = Math.max(1, Math.min(12, Math.trunc(asNumber(body.recurrenceCount, 1))));
  const recommendedByEntityId = asText(body.recommendedByEntityId ?? body.recommended_by_entity_id);
  const notes = asText(body.notes);
  const age = asText(body.age);
  const condition = asText(body.condition);

  if (!appointmentDate) throw new Error("Informe a data desejada.");
  if (!entityId) throw new Error("Escolha a entidade para atendimento.");
  if (!fullName) throw new Error("Informe o nome completo.");
  if (!whatsapp && !email) throw new Error("Informe WhatsApp ou e-mail.");

  const settings = await loadSettings(context.organizationId);
  const weekday = weekdaySlug(appointmentDate);

  if (["segunda", "terca"].includes(weekday) && !context.canReception) {
    throw new Error("Somente quem possui a função ativa de Recepção pode agendar Consulentes nas segundas e terças.");
  }

  if (weekday === "quinta") {
    if (!context.personId) throw new Error("Cadastro do Filho da Corrente não localizado.");
    const occurrence = monthOccurrenceIndex(appointmentDate);
    const allowed = (context.groups.includes("grupo-1") && [1, 3].includes(occurrence))
      || (context.groups.includes("grupo-2") && [2, 4].includes(occurrence));
    if (!allowed) throw new Error("Esta quinta-feira não corresponde ao seu grupo cadastrado.");
  }

  if (weekday === "quarta") {
    const canRegisterWednesday =
      settings.wednesdayBookingMode !== "coordination" ||
      !settings.wednesdayAuthorizedPersonIds.length ||
      (!!context.personId && settings.wednesdayAuthorizedPersonIds.includes(context.personId));

    if (!canRegisterWednesday) throw new Error("Somente responsáveis definidos na área logada podem registrar agendamentos de quarta-feira.");
    if (!age) throw new Error("Para quarta-feira, informe a idade do consulente.");
    if (!condition) throw new Error("Para quarta-feira, informe a doença ou motivo do atendimento.");
    if (settings.requireRecommendingEntityForWednesday && !recommendedByEntityId) throw new Error("Para quarta-feira, informe a entidade que encaminhou.");
  }

  const { data: entity, error: entityError } = await supabaseAdmin
    .from("oh_spiritual_entities")
    .select("id, name, daily_capacity, appointment_enabled, active")
    .eq("organization_id", context.organizationId)
    .eq("id", entityId)
    .eq("active", true)
    .maybeSingle();
  if (entityError) throw entityError;
  if (!entity?.id || entity.active === false || entity.appointment_enabled === false) throw new Error("Entidade indisponível para agendamento. Confira se ela está ativa no cadastro da área logada.");

  const { count, error: countError } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", context.organizationId)
    .eq("entity_id", entityId)
    .eq("appointment_date", appointmentDate)
    .not("status", "in", "(cancelado,cancelamento_solicitado,ausente)");
  if (countError) throw countError;

  const capacity = Math.max(1, Number(entity.daily_capacity ?? 1));
  if ((count ?? 0) >= capacity && !settings.allowAlternateEntityWhenUnavailable) {
    throw new Error(`Limite de ${capacity} atendimento(s) para ${entity.name} nesta data já foi atingido.`);
  }

  const metadata = {
    source: "filho_corrente_recepcao",
    weekday,
    registered_by_person_id: context.personId,
    registered_by_name: context.fullName,
    age: age || null,
    condition: condition || null,
    recurrence_count: isRecurring ? recurrenceCount : 1,
  };

  const { data, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .insert({
      organization_id: context.organizationId,
      person_id: weekday === "quinta" ? context.personId : null,
      entity_id: entityId,
      recommended_by_entity_id: recommendedByEntityId || null,
      scheduled_by_person_id: context.personId,
      consulente_name: fullName,
      whatsapp: whatsapp || null,
      email: email || null,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      is_recurring: isRecurring,
      recurrence_count: isRecurring ? recurrenceCount : 1,
      status: "confirmado",
      notes: notes || null,
      booking_channel: weekday === "quinta" ? "filho_corrente" : "recepcao",
      created_by_function: weekday === "quinta" ? "filho_corrente" : "recepcao",
      metadata,
    })
    .select("id")
    .single();
  if (error) throw error;

  return { appointment: data, message: "Agendamento registrado. A ordem do atendimento deve seguir a sequência de agendamento por entidade." };
}

async function updateAppointmentStatus(context: AuthContext, body: Record<string, unknown>) {
  const appointmentId = asText(body.appointmentId ?? body.id);
  const status = asText(body.status);
  if (!appointmentId || !status) throw new Error("Informe agendamento e status.");

  const { error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("organization_id", context.organizationId)
    .eq("id", appointmentId);
  if (error) throw error;

  if (status === "ausente") {
    const settings = await loadSettings(context.organizationId);
    if (settings.autoCancelRecurringOnAbsence) {
      const { data: current } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("email, whatsapp, appointment_date")
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .maybeSingle();
      if (current?.appointment_date) {
        let query = supabaseAdmin
          .from("oh_consulente_appointments")
          .update({ status: "cancelado", updated_at: new Date().toISOString() })
          .eq("organization_id", context.organizationId)
          .gt("appointment_date", current.appointment_date)
          .eq("is_recurring", true)
          .not("status", "in", "(cancelado,atendido)");
        if (current.email) query = query.eq("email", current.email);
        else if (current.whatsapp) query = query.eq("whatsapp", current.whatsapp);
        await query;
      }
    }
  }

  return { message: "Status atualizado." };
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    return NextResponse.json(await loadPayload(context));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar atendimentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "createAppointment") return NextResponse.json({ ok: true, ...(await createAppointment(context, body)) });
    if (action === "updateAppointmentStatus") return NextResponse.json({ ok: true, ...(await updateAppointmentStatus(context, body)) });

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar atendimento." }, { status: 500 });
  }
}
