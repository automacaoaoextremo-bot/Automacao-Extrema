import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { profileHasCavalinho } from "@/lib/organizacao-em-harmonia/appointment-permissions";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["confirmado", "solicitado", "aprovado", "presente", "concluido"];

type EntityLinkRow = {
  entity_id: string | null;
  relationship_type: string | null;
  is_primary_for_attendance: boolean | null;
  active: boolean | null;
};

type LinkedEntityRow = {
  id: string;
  name: string | null;
  line: string | null;
  entity_type: string | null;
  attends_consulentes: boolean | null;
  active: boolean | null;
};

type LinkedAppointmentRow = {
  id: string;
  person_id: string | null;
  entity_id: string | null;
  consulente_name: string | null;
  whatsapp: string | null;
  appointment_date: string;
  appointment_time: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
}

async function currentPerson(request: Request) {
  const token = tokenFromRequest(request);
  if (!token) return null;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: person, error: personError } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, active")
    .eq("auth_user_id", authData.user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (personError || !person?.id || !person.organization_id) return null;

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, active, status, agenda_viva_profile")
    .eq("organization_id", person.organization_id)
    .eq("person_id", person.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership?.id || asText(membership.status).toLowerCase() !== "ativo") return null;
  if (!profileHasCavalinho(asRecord(membership.agenda_viva_profile))) return null;

  return {
    id: person.id as string,
    organizationId: person.organization_id as string,
    fullName: asText(person.full_name) || "Filho da Corrente",
  };
}

export async function GET(request: Request) {
  const person = await currentPerson(request);
  if (!person) return NextResponse.json({ error: "Sessão inválida ou acesso ainda não liberado." }, { status: 401 });

  try {
    const { data: links, error: linksError } = await supabaseAdmin
      .from("oh_person_entity_links")
      .select("entity_id, relationship_type, is_primary_for_attendance, active")
      .eq("organization_id", person.organizationId)
      .eq("person_id", person.id)
      .eq("relationship_type", "recebe")
      .eq("active", true);
    if (linksError) throw linksError;

    const linkRows = (links ?? []) as EntityLinkRow[];
    const primaryEntityIds = [...new Set(linkRows.filter((link) => link.is_primary_for_attendance === true).map((link) => asText(link.entity_id)).filter(Boolean))];
    const legacyEntityIds = [...new Set(linkRows.map((link) => asText(link.entity_id)).filter(Boolean))];
    const hasExplicitConsulenteEntity = primaryEntityIds.length > 0;
    const entityIds = hasExplicitConsulenteEntity ? primaryEntityIds : legacyEntityIds;
    if (entityIds.length === 0) {
      return NextResponse.json({ profile: { fullName: person.fullName }, entities: [], appointments: [] });
    }

    const [{ data: entities, error: entitiesError }, { data: appointments, error: appointmentsError }] = await Promise.all([
      supabaseAdmin
        .from("oh_spiritual_entities")
        .select("id, name, line, entity_type, attends_consulentes, active")
        .eq("organization_id", person.organizationId)
        .in("id", entityIds)
        .eq("active", true)
        .order("name", { ascending: true }),
      supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id, person_id, entity_id, consulente_name, whatsapp, appointment_date, appointment_time, status, metadata, created_at")
        .eq("organization_id", person.organizationId)
        .in("entity_id", entityIds)
        .gte("appointment_date", todayInSaoPaulo())
        .in("status", ACTIVE_STATUSES)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true }),
    ]);
    if (entitiesError) throw entitiesError;
    if (appointmentsError) throw appointmentsError;

    const entityRows = ((entities ?? []) as LinkedEntityRow[]).filter(
      (entity) => hasExplicitConsulenteEntity || entity.attends_consulentes === true,
    );
    const appointmentRows = (appointments ?? []) as LinkedAppointmentRow[];
    const personIds = [...new Set(appointmentRows.map((appointment) => asText(appointment.person_id)).filter(Boolean))];
    const { data: people, error: peopleError } = personIds.length
      ? await supabaseAdmin
          .from("oh_people")
          .select("id, whatsapp, normalized_whatsapp")
          .eq("organization_id", person.organizationId)
          .in("id", personIds)
      : { data: [], error: null };
    if (peopleError) throw peopleError;
    const whatsappByPersonId = new Map((people ?? []).map((row) => [asText(row.id), asText(row.normalized_whatsapp || row.whatsapp)]));
    const allowedEntityIds = new Set(entityRows.map((entity) => entity.id));
    const entityMap = new Map<string, LinkedEntityRow>(entityRows.map((entity) => [entity.id, entity]));
    const linkMap = new Map<string, EntityLinkRow>(linkRows.map((link) => [asText(link.entity_id), link]));

    return NextResponse.json({
      profile: { fullName: person.fullName },
      entities: entityRows.map((entity) => ({
        ...entity,
        isPrimaryForAttendance: linkMap.get(entity.id as string)?.is_primary_for_attendance === true,
      })),
      appointments: appointmentRows
        .filter((appointment) => allowedEntityIds.has(asText(appointment.entity_id)))
        .map((appointment) => {
          const metadata = asRecord(appointment.metadata);
          return {
            id: appointment.id,
            appointmentDate: appointment.appointment_date,
            appointmentTime: appointment.appointment_time || "Horário a confirmar",
            entityId: appointment.entity_id,
            entityName: entityMap.get(asText(appointment.entity_id))?.name || "Entidade",
            consulenteName: asText(appointment.consulente_name) || "Consulente",
            whatsapp: whatsappByPersonId.get(asText(appointment.person_id)) || asText(appointment.whatsapp),
            order: Number(metadata.order ?? 0) || null,
            status: appointment.status,
          };
        }),
    });
  } catch (error) {
    console.error("[OH/TUCXA entidade-agendamentos]", error);
    return NextResponse.json({ error: "Não foi possível carregar os atendimentos das entidades vinculadas." }, { status: 500 });
  }
}
