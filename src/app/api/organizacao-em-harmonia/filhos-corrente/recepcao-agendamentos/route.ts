import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const PAGE_SIZE_LIMIT = 50;

type ProfileRecord = Record<string, unknown>;

type ReceptionContext = {
  organizationId: string;
  personId: string;
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
};

type AppointmentRow = {
  id: string;
  person_id: string | null;
  entity_id: string | null;
  consulente_name: string | null;
  whatsapp: string | null;
  appointment_date: string;
  appointment_time: string | null;
  status: string | null;
  booking_channel: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
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

function profileValues(profile: ProfileRecord) {
  const functions = Array.isArray(profile.functionSlugs) ? profile.functionSlugs.map(normalize) : [];
  const selected = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions.map((item) => {
        const record = asRecord(item);
        return normalize(`${asText(record.slug)} ${asText(record.label)}`);
      })
    : [];
  return [...functions, ...selected];
}

function canUseReception(profile: ProfileRecord) {
  if (profile.supportsReception === true) return true;
  return profileValues(profile).some((value) => value.includes("recepcao") || value.includes("recepcionista"));
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

  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, slug, name")
    .eq("id", person.organization_id)
    .maybeSingle();
  if (organizationError || !organization?.id) return null;
  if (normalize(organization.slug) !== "tucxa" && !normalize(organization.name).includes("tucxa")) return null;

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, role_id, active, status, agenda_viva_profile")
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

  if (!canUseReception(profile) && !roleCanReception) return null;
  return { organizationId: person.organization_id, personId: person.id };
}

function appointmentOrder(metadataValue: unknown) {
  const metadata = asRecord(metadataValue);
  const candidate = Number(metadata.order ?? metadata.confirmed_order ?? metadata.appointment_order ?? 0);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : null;
}

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível consultar os agendamentos da Recepção.";
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const context = await currentReception(request);
    if (!context) {
      return NextResponse.json({ error: "Somente pessoas com a função ativa de Recepção podem consultar estes agendamentos.", requestId }, { status: 403 });
    }

    const url = new URL(request.url);
    const range = asText(url.searchParams.get("range")) || "upcoming";
    const queryText = asText(url.searchParams.get("q"));
    const entityId = asText(url.searchParams.get("entityId"));
    const status = asText(url.searchParams.get("status"));
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const pageSize = Math.min(PAGE_SIZE_LIMIT, Math.max(5, Number(url.searchParams.get("pageSize") || 20) || 20));
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

    if (queryText && matchingPersonIds.length === 0) {
      return NextResponse.json({
        ok: true,
        range,
        today,
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        appointments: [],
        entities: [],
      });
    }

    let appointmentQuery = supabaseAdmin
      .from("oh_consulente_appointments")
      .select(
        "id, person_id, entity_id, consulente_name, whatsapp, appointment_date, appointment_time, status, booking_channel, metadata, created_at",
        { count: "exact" },
      )
      .eq("organization_id", context.organizationId)
      .or("booking_channel.neq.filho_corrente,booking_channel.is.null");

    if (range === "previous") appointmentQuery = appointmentQuery.lt("appointment_date", today).order("appointment_date", { ascending: false });
    else if (range === "today") appointmentQuery = appointmentQuery.eq("appointment_date", today).order("appointment_time", { ascending: true });
    else appointmentQuery = appointmentQuery.gte("appointment_date", today).order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true });

    if (entityId) appointmentQuery = appointmentQuery.eq("entity_id", entityId);
    if (status) appointmentQuery = appointmentQuery.eq("status", status);
    if (queryText) appointmentQuery = appointmentQuery.in("person_id", matchingPersonIds);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: appointmentRows, error: appointmentsError, count } = await appointmentQuery.range(from, to);
    if (appointmentsError) throw appointmentsError;

    const appointmentsSource = (appointmentRows ?? []) as AppointmentRow[];
    const entityIds = Array.from(new Set(appointmentsSource.map((item) => item.entity_id).filter((value): value is string => Boolean(value))));
    const { data: entityRows, error: entitiesError } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, active")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("name", { ascending: true });
    if (entitiesError) throw entitiesError;

    const entities = (entityRows ?? []) as EntityRow[];
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
      selectedEntityIds: entityIds,
    });
  } catch (error) {
    console.error("[OH/TUCXA recepcao-agendamentos]", { requestId, error });
    return NextResponse.json({ error: friendlyError(error), requestId }, { status: 500 });
  }
}
