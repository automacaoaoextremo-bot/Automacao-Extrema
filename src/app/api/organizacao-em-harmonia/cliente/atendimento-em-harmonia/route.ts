import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(asText(value) || value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


function asTextList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item)).filter(Boolean);
}

function normalizeSettings(settings: unknown) {
  const current = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  return {
    recurringEnabled: current.recurringEnabled !== false,
    maxRecurringAppointmentsPerConsulente: Math.max(0, asNumber(current.maxRecurringAppointmentsPerConsulente, 2)),
    autoCancelRecurringOnAbsence: current.autoCancelRecurringOnAbsence !== false,
    allowDifferentEntityAfterFirstAppointment: current.allowDifferentEntityAfterFirstAppointment !== false,
    allowAlternateEntityWhenUnavailable: current.allowAlternateEntityWhenUnavailable !== false,
    wednesdayBookingMode: asText(current.wednesdayBookingMode) || "coordination",
    wednesdayAuthorizedPersonIds: asTextList(current.wednesdayAuthorizedPersonIds),
    requireRecommendingEntityForWednesday: current.requireRecommendingEntityForWednesday !== false,
    appointmentReturnGuidance:
      asText(current.appointmentReturnGuidance) ||
      "Após o primeiro atendimento com uma entidade, caso seja orientado retorno, procure manter a continuidade com a mesma entidade sempre que possível.",
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

async function saveSettings(organizationId: string, settings: ReturnType<typeof normalizeSettings>) {
  const { error } = await supabaseAdmin.from("oh_module_settings").upsert(
    {
      organization_id: organizationId,
      module_slug: "atendimento-em-harmonia",
      enabled: true,
      settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,module_slug" },
  );
  if (error) throw error;
}

async function loadPayload(organizationId: string) {
  const [settings, entitiesResult, peopleResult, appointmentsResult] = await Promise.all([
    loadSettings(organizationId),
    supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, line, entity_type, usual_days, daily_capacity, appointment_enabled, appointment_notes, active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id, consulente_name, whatsapp, email, appointment_date, appointment_time, status, is_recurring, entity_id, recommended_by_entity_id, scheduled_by_person_id, notes, metadata, created_at")
      .eq("organization_id", organizationId)
      .order("appointment_date", { ascending: false })
      .limit(500),
  ]);

  if (entitiesResult.error) throw entitiesResult.error;
  if (peopleResult.error) throw peopleResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;

  return { settings, entities: entitiesResult.data ?? [], people: peopleResult.data ?? [], appointments: appointmentsResult.data ?? [] };
}

export async function GET(request: Request) {
  try {
    const auth = await getOrganizacaoAuthContext(request);
    if (!auth.ok) return auth.response;
    return NextResponse.json(await loadPayload(auth.context.organizationId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar Atendimento em Harmonia." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getOrganizacaoAuthContext(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "saveSettings") {
      const settings = normalizeSettings(body.settings ?? body);
      await saveSettings(auth.context.organizationId, settings);
      return NextResponse.json({ ok: true, settings, message: "Configurações do Atendimento em Harmonia salvas." });
    }

    if (action === "updateAppointmentStatus") {
      const appointmentId = asText(body.appointmentId ?? body.id);
      const status = asText(body.status);
      if (!appointmentId || !status) throw new Error("Informe agendamento e status.");
      const { error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", appointmentId);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Status atualizado." });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar Atendimento em Harmonia." }, { status: 500 });
  }
}
