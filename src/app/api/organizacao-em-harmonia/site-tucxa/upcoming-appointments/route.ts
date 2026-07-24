import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

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

async function authenticatedContext(request: Request) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return null;

  const { data: person } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, active")
    .eq("auth_user_id", authData.user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!person?.id || !person.organization_id) return null;

  const { data: organization } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, slug, name")
    .eq("id", person.organization_id)
    .maybeSingle();
  if (!organization?.id) return null;
  if (normalize(organization.slug) !== "tucxa" && !normalize(organization.name).includes("tucxa")) return null;

  const { data: membership } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, status, active, agenda_viva_profile")
    .eq("organization_id", person.organization_id)
    .eq("person_id", person.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!membership?.id || normalize(membership.status) !== "ativo") return null;

  return {
    personId: person.id as string,
    organizationId: person.organization_id as string,
    membershipId: membership.id as string,
    profile: asRecord(membership.agenda_viva_profile),
  };
}

function appointmentOrder(value: unknown) {
  const metadata = asRecord(value);
  const candidate = Number(metadata.order ?? metadata.confirmed_order ?? metadata.appointment_order ?? 0);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : null;
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const context = await authenticatedContext(request);
    if (!context) return NextResponse.json({ error: "Sessão inválida ou acesso não liberado.", requestId }, { status: 401 });

    const today = todayInSaoPaulo();
    const { data: appointments, error } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id, entity_id, appointment_date, appointment_time, status, metadata")
      .eq("organization_id", context.organizationId)
      .eq("person_id", context.personId)
      .gte("appointment_date", today)
      .not("status", "in", '("cancelado","cancelamento_solicitado","ausente")')
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(6);
    if (error) throw error;

    const entityIds = Array.from(new Set((appointments ?? []).map((item) => item.entity_id).filter(Boolean)));
    const { data: entities } = entityIds.length
      ? await supabaseAdmin.from("oh_spiritual_entities").select("id, name").in("id", entityIds)
      : { data: [] };
    const entityById = new Map((entities ?? []).map((entity) => [entity.id, entity.name]));

    return NextResponse.json({
      ok: true,
      preference: context.profile.showUpcomingAppointmentsOnLogin !== false,
      appointments: (appointments ?? []).map((appointment) => ({
        id: appointment.id,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time || "Horário a confirmar",
        status: appointment.status || "confirmado",
        order: appointmentOrder(appointment.metadata),
        entityName: entityById.get(appointment.entity_id) || "Entidade a confirmar",
      })),
    });
  } catch (error) {
    console.error("[OH/TUCXA upcoming-appointments GET]", { requestId, error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao consultar próximos agendamentos.", requestId }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const context = await authenticatedContext(request);
    if (!context) return NextResponse.json({ error: "Sessão inválida ou acesso não liberado.", requestId }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const show = body.showUpcomingAppointmentsOnLogin !== false;
    const nextProfile = {
      ...context.profile,
      showUpcomingAppointmentsOnLogin: show,
      upcomingAppointmentsPreferenceUpdatedAt: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from("oh_memberships")
      .update({ agenda_viva_profile: nextProfile, updated_at: new Date().toISOString() })
      .eq("id", context.membershipId)
      .eq("organization_id", context.organizationId);
    if (error) throw error;

    return NextResponse.json({ ok: true, preference: show });
  } catch (error) {
    console.error("[OH/TUCXA upcoming-appointments POST]", { requestId, error });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar preferência.", requestId }, { status: 500 });
  }
}
