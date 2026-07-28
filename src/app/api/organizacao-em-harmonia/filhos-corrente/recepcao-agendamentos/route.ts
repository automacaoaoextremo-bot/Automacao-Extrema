import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveAppointmentCapabilities } from "@/lib/organizacao-em-harmonia/appointment-permissions";

export const dynamic = "force-dynamic";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const PAGE_SIZE_LIMIT = 12;
type ReceptionContext = {
  organizationId: string;
  personId: string;
  capabilities: {
    scope: "manage" | "read_all" | "linked_entities";
    canRead: boolean;
    canEdit: boolean;
    canCancel: boolean;
    canDelete: boolean;
  };
  linkedEntityIds: string[];
};

type PersonRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  normalized_whatsapp: string | null;
  email: string | null;
  active: boolean | null;
};

type EntityRow = {
  id: string;
  name: string | null;
  active: boolean | null;
  daily_capacity?: number | null;
};

type AppointmentRow = {
  id: string;
  person_id: string | null;
  entity_id: string | null;
  event_id: string | null;
  consulente_name: string | null;
  whatsapp: string | null;
  appointment_date: string;
  appointment_time: string | null;
  status: string | null;
  booking_channel: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by_person_id?: string | null;
  cancellation_reason?: string | null;
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
  const digits = asText(value).replace(/\D/g, "");
  return digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
}

function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
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

async function currentReception(request: Request): Promise<ReceptionContext | null> {
  const token = tokenFromRequest(request);
  if (!token) return null;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: person, error: personError } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, active")
    .eq("auth_user_id", authData.user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (personError || !person?.id || !person.organization_id) return null;

  const { data: organization } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, slug, name")
    .eq("id", person.organization_id)
    .maybeSingle();
  if (!organization?.id) return null;
  if (normalize(organization.slug) !== "tucxa" && !normalize(organization.name).includes("tucxa")) return null;

  const [{ data: membership, error: membershipError }, { data: roles, error: rolesError }] = await Promise.all([
    supabaseAdmin
      .from("oh_memberships")
      .select("id, role_id, active, status, agenda_viva_profile")
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

  const capabilities = resolveAppointmentCapabilities({
    profile: asRecord(membership.agenda_viva_profile),
    roles: roles ?? [],
  });
  if (!capabilities.canRead || capabilities.consultationScope === "none") return null;

  let linkedEntityIds: string[] = [];
  if (capabilities.consultationScope === "linked_entities") {
    const { data: links, error: linksError } = await supabaseAdmin
      .from("oh_person_entity_links")
      .select("entity_id")
      .eq("organization_id", person.organization_id)
      .eq("person_id", person.id)
      .eq("active", true)
      .in("relationship_type", ["recebe", "cavalinho", "incorporates_for_consulente"]);
    if (linksError) throw linksError;
    linkedEntityIds = Array.from(new Set((links ?? []).map((item) => asText(item.entity_id)).filter(Boolean)));
  }

  return {
    organizationId: person.organization_id,
    personId: person.id,
    capabilities: {
      scope: capabilities.consultationScope,
      canRead: capabilities.canRead,
      canEdit: capabilities.canEdit,
      canCancel: capabilities.canCancel,
      canDelete: capabilities.canDelete,
    },
    linkedEntityIds,
  };
}

function appointmentOrder(metadataValue: unknown) {
  const metadata = asRecord(metadataValue);
  const candidate = Number(metadata.order ?? metadata.confirmed_order ?? metadata.appointment_order ?? 0);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : null;
}

function firstHour(value: string) {
  const match = value.match(/(?:^|\D)(\d{1,2})(?::(\d{2}))?\s*h?/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function appointmentStart(date: string, time: string) {
  const parsed = firstHour(time);
  if (!parsed) return null;
  const hour = String(parsed.hour).padStart(2, "0");
  const minute = String(parsed.minute).padStart(2, "0");
  return new Date(`${date}T${hour}:${minute}:00-03:00`);
}

async function editCutoffMinutes(organizationId: string) {
  const { data } = await supabaseAdmin
    .from("oh_module_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .in("module_slug", ["agenda-viva", "atendimento-em-harmonia"]);
  for (const row of data ?? []) {
    const settings = asRecord(row.settings);
    const candidate = Number(settings.appointmentEditCutoffMinutes ?? 1440);
    if (Number.isFinite(candidate) && candidate >= 0) return Math.trunc(candidate);
  }
  return 1440;
}

async function appointmentForReception(context: ReceptionContext, appointmentId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, organization_id, person_id, entity_id, event_id, consulente_name, whatsapp, appointment_date, appointment_time, status, booking_channel, metadata, created_at, updated_at, cancelled_at, cancelled_by_person_id, cancellation_reason")
    .eq("id", appointmentId)
    .eq("organization_id", context.organizationId)
    .or("booking_channel.neq.filho_corrente,booking_channel.is.null")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Agendamento não localizado.");
  if (context.capabilities.scope === "linked_entities" && !context.linkedEntityIds.includes(asText(data.entity_id))) {
    throw new Error("Agendamento fora das entidades vinculadas ao seu perfil.");
  }
  return data as AppointmentRow & { organization_id: string };
}

async function registerAudit(context: ReceptionContext, appointment: AppointmentRow, action: string, details: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("oh_appointment_audit_log").insert({
    organization_id: context.organizationId,
    appointment_id: appointment.id,
    actor_person_id: context.personId,
    action,
    snapshot: appointment,
    details,
  });
  if (error && !String(error.message || "").toLowerCase().includes("does not exist")) throw error;
}

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível processar os agendamentos da Recepção.";
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const context = await currentReception(request);
    if (!context) {
      return NextResponse.json({ error: "Seu perfil não possui permissão para consultar agendamentos.", requestId }, { status: 403 });
    }

    const url = new URL(request.url);
    const range = asText(url.searchParams.get("range")) || "upcoming";
    const queryText = asText(url.searchParams.get("q"));
    const entityId = asText(url.searchParams.get("entityId"));
    const status = asText(url.searchParams.get("status"));
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const pageSize = Math.min(PAGE_SIZE_LIMIT, Math.max(3, Number(url.searchParams.get("pageSize") || 4) || 4));
    const today = todayInSaoPaulo();

    const { data: peopleRows, error: peopleError } = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, whatsapp, normalized_whatsapp, email, active")
      .eq("organization_id", context.organizationId)
      .eq("active", true);
    if (peopleError) throw peopleError;

    const people = (peopleRows ?? []) as PersonRow[];
    const normalizedQuery = normalize(queryText);
    const phoneQuery = normalizePhone(queryText);
    const matchingPersonIds = queryText
      ? people
          .filter((person) => {
            const nameMatches = normalize(person.full_name).includes(normalizedQuery);
            const phone = normalizePhone(person.normalized_whatsapp || person.whatsapp);
            const phoneMatches = Boolean(phoneQuery && phone.endsWith(phoneQuery));
            return nameMatches || phoneMatches;
          })
          .map((person) => person.id)
      : [];

    const { data: entityRows, error: entitiesError } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, active, daily_capacity")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("name", { ascending: true });
    if (entitiesError) throw entitiesError;

    const allEntities = (entityRows ?? []) as EntityRow[];
    // O Cavalinho consulta a entidade vinculada e também precisa visualizar
    // os próprios agendamentos, mesmo quando foram feitos com outra entidade.
    // A relação completa é usada apenas para resolver nomes e filtros; o
    // conjunto de registros continua limitado na consulta abaixo.
    const entities = allEntities;
    const matchingEntityIds = queryText
      ? entities.filter((entity) => normalize(entity.name).includes(normalizedQuery)).map((entity) => entity.id)
      : [];

    if (queryText && matchingPersonIds.length === 0 && matchingEntityIds.length === 0) {
      return NextResponse.json({ ok: true, range, today, page, pageSize, total: 0, totalPages: 0, appointments: [], entities: entities.map((entity) => ({ id: entity.id, name: entity.name })), capabilities: context.capabilities });
    }

    let appointmentQuery = supabaseAdmin
      .from("oh_consulente_appointments")
      .select(
        "id, person_id, entity_id, event_id, consulente_name, whatsapp, appointment_date, appointment_time, status, booking_channel, metadata, created_at, updated_at, cancelled_at, cancelled_by_person_id, cancellation_reason",
        { count: "exact" },
      )
      .eq("organization_id", context.organizationId);

    if (context.capabilities.scope === "linked_entities") {
      const linkedEntityFilter = context.linkedEntityIds.length > 0
        ? `entity_id.in.(${context.linkedEntityIds.join(",")}),person_id.eq.${context.personId}`
        : `person_id.eq.${context.personId}`;
      appointmentQuery = appointmentQuery.or(linkedEntityFilter);
    } else {
      appointmentQuery = appointmentQuery.or("booking_channel.neq.filho_corrente,booking_channel.is.null");
    }

    if (range === "previous") appointmentQuery = appointmentQuery.lt("appointment_date", today).order("appointment_date", { ascending: false });
    else if (range === "today") appointmentQuery = appointmentQuery.eq("appointment_date", today).order("appointment_time", { ascending: true });
    else appointmentQuery = appointmentQuery.gte("appointment_date", today).order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true });

    if (entityId) appointmentQuery = appointmentQuery.eq("entity_id", entityId);
    if (status) appointmentQuery = appointmentQuery.eq("status", status);
    if (queryText) {
      if (matchingPersonIds.length > 0 && matchingEntityIds.length > 0) {
        appointmentQuery = appointmentQuery.or(`person_id.in.(${matchingPersonIds.join(",")}),entity_id.in.(${matchingEntityIds.join(",")})`);
      } else if (matchingPersonIds.length > 0) {
        appointmentQuery = appointmentQuery.in("person_id", matchingPersonIds);
      } else {
        appointmentQuery = appointmentQuery.in("entity_id", matchingEntityIds);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: appointmentRows, error: appointmentsError, count } = await appointmentQuery.range(from, to);
    if (appointmentsError) throw appointmentsError;

    const appointmentsSource = (appointmentRows ?? []) as AppointmentRow[];
    const personById = new Map<string, PersonRow>(people.map((person) => [person.id, person]));
    const entityById = new Map<string, EntityRow>(entities.map((entity) => [entity.id, entity]));

    const appointments = appointmentsSource.map((appointment) => {
      const person = appointment.person_id ? personById.get(appointment.person_id) : null;
      const entity = appointment.entity_id ? entityById.get(appointment.entity_id) : null;
      return {
        id: appointment.id,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time || "Horário a confirmar",
        status: appointment.status,
        bookingChannel: appointment.booking_channel || "consulente",
        order: appointmentOrder(appointment.metadata),
        person: {
          id: appointment.person_id,
          fullName: asText(person?.full_name) || asText(appointment.consulente_name) || "Consulente",
          whatsapp: normalizePhone(person?.normalized_whatsapp || person?.whatsapp || appointment.whatsapp),
          email: asText(person?.email),
        },
        entity: {
          id: appointment.entity_id,
          name: asText(entity?.name) || "Entidade a confirmar",
        },
      };
    });

    const total = count ?? appointments.length;
    return NextResponse.json({
      ok: true,
      range,
      today,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      appointments,
      entities: entities.map((entity) => ({ id: entity.id, name: entity.name })),
      capabilities: context.capabilities,
    });
  } catch (error) {
    console.error("[OH/TUCXA recepcao-agendamentos GET]", { requestId, error });
    return NextResponse.json({ error: friendlyError(error), requestId }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const context = await currentReception(request);
    if (!context || !context.capabilities.canEdit) return NextResponse.json({ error: "Seu perfil possui acesso somente para consulta.", requestId }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const appointmentId = asText(body.appointmentId);
    const action = asText(body.action) || "edit";
    if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId }, { status: 400 });

    const current = await appointmentForReception(context, appointmentId);
    const now = new Date().toISOString();

    if (action === "cancel") {
      const reason = asText(body.reason) || "Cancelado pela Recepção.";
      await registerAudit(context, current, "cancel", { reason });
      const { error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          status: "cancelado",
          cancelled_at: now,
          cancelled_by_person_id: context.personId,
          cancellation_reason: reason,
          metadata: {
            ...asRecord(current.metadata),
            receptionLastAction: "cancel",
            receptionLastActionAt: now,
            receptionLastActionBy: context.personId,
          },
          updated_at: now,
        })
        .eq("id", appointmentId)
        .eq("organization_id", context.organizationId);
      if (error) throw error;
      return NextResponse.json({ ok: true, action: "cancel", appointmentId });
    }

    const appointmentDate = asText(body.appointmentDate);
    const appointmentTime = asText(body.appointmentTime);
    const entityId = asText(body.entityId);
    if (!appointmentDate || !appointmentTime || !entityId) {
      return NextResponse.json({ error: "Informe data, período e entidade.", requestId }, { status: 400 });
    }

    const start = appointmentStart(current.appointment_date, current.appointment_time || "");
    const cutoff = await editCutoffMinutes(context.organizationId);
    if (start && start.getTime() - Date.now() < cutoff * 60_000) {
      return NextResponse.json({ error: `O prazo de edição encerra ${cutoff} minuto(s) antes do atendimento.`, requestId }, { status: 409 });
    }
    if (appointmentDate < todayInSaoPaulo()) {
      return NextResponse.json({ error: "Não é possível mover o agendamento para uma data passada.", requestId }, { status: 409 });
    }

    const { data: entity, error: entityError } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, daily_capacity, active, appointment_enabled")
      .eq("id", entityId)
      .eq("organization_id", context.organizationId)
      .maybeSingle();
    if (entityError) throw entityError;
    if (!entity?.id || entity.active !== true || entity.appointment_enabled !== true) {
      return NextResponse.json({ error: "A entidade escolhida não está disponível para agendamento.", requestId }, { status: 409 });
    }

    const { count, error: countError } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organizationId)
      .eq("entity_id", entityId)
      .eq("appointment_date", appointmentDate)
      .eq("appointment_time", appointmentTime)
      .neq("id", appointmentId)
      .not("status", "in", '("cancelado","cancelamento_solicitado","ausente")');
    if (countError) throw countError;
    const capacity = Math.max(1, Number(entity.daily_capacity ?? 1));
    if ((count ?? 0) >= capacity) return NextResponse.json({ error: "Não há vaga disponível para esta entidade no período escolhido.", requestId }, { status: 409 });

    const order = (count ?? 0) + 1;
    await registerAudit(context, current, "edit", { appointmentDate, appointmentTime, entityId, order });
    const { error } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .update({
        entity_id: entityId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: "confirmado",
        cancelled_at: null,
        cancelled_by_person_id: null,
        cancellation_reason: null,
        metadata: {
          ...asRecord(current.metadata),
          order,
          receptionLastAction: "edit",
          receptionLastActionAt: now,
          receptionLastActionBy: context.personId,
          previousAppointmentDate: current.appointment_date,
          previousAppointmentTime: current.appointment_time,
          previousEntityId: current.entity_id,
        },
        updated_at: now,
      })
      .eq("id", appointmentId)
      .eq("organization_id", context.organizationId);
    if (error) throw error;

    return NextResponse.json({ ok: true, action: "edit", appointmentId, order });
  } catch (error) {
    console.error("[OH/TUCXA recepcao-agendamentos PATCH]", { requestId, error });
    return NextResponse.json({ error: friendlyError(error), requestId }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const context = await currentReception(request);
    if (!context || !context.capabilities.canDelete) return NextResponse.json({ error: "Seu perfil possui acesso somente para consulta.", requestId }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const appointmentId = asText(body.appointmentId);
    const confirmation = asText(body.confirmation).toUpperCase();
    if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId }, { status: 400 });
    if (confirmation !== "EXCLUIR") {
      return NextResponse.json({ error: "Digite EXCLUIR para confirmar a ação definitiva.", requestId }, { status: 400 });
    }

    const current = await appointmentForReception(context, appointmentId);
    await registerAudit(context, current, "delete", { irreversible: true });
    const { error } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .delete()
      .eq("id", appointmentId)
      .eq("organization_id", context.organizationId);
    if (error) throw error;

    return NextResponse.json({ ok: true, action: "delete", appointmentId });
  } catch (error) {
    console.error("[OH/TUCXA recepcao-agendamentos DELETE]", { requestId, error });
    return NextResponse.json({ error: friendlyError(error), requestId }, { status: 500 });
  }
}
