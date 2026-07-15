import { NextResponse } from "next/server";
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

function normalizePhone(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function asDateOnly(value: unknown) {
  const text = asText(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

function weekdaySlug(dateText: string) {
  const date = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][date.getDay()] ?? "";
}

function normalizeSettings(settings: unknown) {
  const current = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  return {
    maxRecurringAppointmentsPerConsulente: Number(current.maxRecurringAppointmentsPerConsulente ?? 2),
    recurringEnabled: current.recurringEnabled !== false,
    autoCancelRecurringOnAbsence: current.autoCancelRecurringOnAbsence !== false,
    allowDifferentEntityAfterFirstAppointment: current.allowDifferentEntityAfterFirstAppointment !== false,
    allowAlternateEntityWhenUnavailable: current.allowAlternateEntityWhenUnavailable !== false,
    wednesdayBookingMode: asText(current.wednesdayBookingMode) || "coordination",
    wednesdayAuthorizedPersonIds: Array.isArray(current.wednesdayAuthorizedPersonIds) ? current.wednesdayAuthorizedPersonIds.map((item) => asText(item)).filter(Boolean) : [],
    requireRecommendingEntityForWednesday: current.requireRecommendingEntityForWednesday !== false,
    appointmentReturnGuidance:
      asText(current.appointmentReturnGuidance) ||
      "Após o primeiro atendimento com uma entidade, se houver orientação de retorno, procure voltar com a mesma entidade para preservar a continuidade do cuidado.",
  };
}

async function tucxaOrganization() {
  const { data, error } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug")
    .or("slug.eq.tucxa,name.ilike.%tucxa%")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Organização Tucxa não localizada.");
  return data;
}

async function agendaSettings(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_module_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .eq("module_slug", "agenda-viva")
    .maybeSingle();
  if (error) throw error;
  return normalizeSettings(data?.settings);
}

async function availableEntities(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_spiritual_entities")
    .select("id, name, slug, line, entity_type, usual_days, daily_capacity, appointment_enabled, appointment_notes, active")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).filter((entity) => entity.appointment_enabled !== false);
}

async function availableEvents(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("agv_events")
    .select("id, title, starts_at, ends_at, all_day, recurrence_rule, group_slug, event_type, status, metadata")
    .eq("organization_id", organizationId)
    .in("status", ["aprovado", "ativo", "publicado", "recorrente"])
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

async function authorizedPeople(organizationId: string, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, active")
    .eq("organization_id", organizationId)
    .in("id", ids)
    .eq("active", true)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function GET() {
  try {
    const organization = await tucxaOrganization();
    const settings = await agendaSettings(organization.id);
    const [entities, events, authorizedSchedulers] = await Promise.all([
      availableEntities(organization.id),
      availableEvents(organization.id),
      authorizedPeople(organization.id, settings.wednesdayAuthorizedPersonIds),
    ]);

    return NextResponse.json({ organization, settings, entities, events, authorizedSchedulers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar agendamentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const organization = await tucxaOrganization();
    const settings = await agendaSettings(organization.id);

    const appointmentDate = asDateOnly(body.appointmentDate ?? body.date);
    const entityId = asText(body.entityId ?? body.entity_id);
    const fullName = asText(body.fullName ?? body.full_name);
    const whatsapp = normalizePhone(body.whatsapp);
    const email = asText(body.email).toLowerCase();
    const isRecurring = asBool(body.isRecurring ?? body.recurring, false);
    const recurrenceCount = Math.max(1, Math.min(12, Number(asText(body.recurrenceCount) || 1)));
    const age = asText(body.age);
    const condition = asText(body.condition);
    const recommendedByEntityId = asText(body.recommendedByEntityId ?? body.recommended_by_entity_id);
    const scheduledByPersonId = asText(body.scheduledByPersonId ?? body.scheduled_by_person_id);
    const notes = asText(body.notes);

    if (!appointmentDate) throw new Error("Informe a data desejada.");
    if (!entityId) throw new Error("Escolha a entidade para o atendimento.");
    if (!fullName) throw new Error("Informe seu nome completo.");
    if (!whatsapp && !email) throw new Error("Informe WhatsApp ou e-mail para retorno.");

    const { data: entity, error: entityError } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, daily_capacity, appointment_enabled, usual_days")
      .eq("id", entityId)
      .eq("organization_id", organization.id)
      .eq("active", true)
      .maybeSingle();
    if (entityError) throw entityError;
    if (!entity?.id || entity.appointment_enabled === false) throw new Error("Entidade indisponível para agendamento.");

    const dateWeekday = weekdaySlug(appointmentDate);
    if (dateWeekday === "quarta") {
      if (settings.requireRecommendingEntityForWednesday && !recommendedByEntityId) {
        throw new Error("Para quarta-feira, informe qual entidade recomendou o atendimento.");
      }
      if (!age) {
        throw new Error("Para quarta-feira, informe a idade do consulente.");
      }
      if (!condition) {
        throw new Error("Para quarta-feira, informe a doença ou motivo do atendimento.");
      }
      if (settings.wednesdayBookingMode === "coordination" && !scheduledByPersonId) {
        throw new Error("Agendamentos de quarta-feira devem ser registrados por uma pessoa autorizada pela coordenação/diretoria.");
      }
      if (scheduledByPersonId && settings.wednesdayAuthorizedPersonIds.length > 0 && !settings.wednesdayAuthorizedPersonIds.includes(scheduledByPersonId)) {
        throw new Error("Pessoa não autorizada para agendar quarta-feira.");
      }
    }

    const { count, error: countError } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("entity_id", entityId)
      .eq("appointment_date", appointmentDate)
      .not("status", "in", "(cancelado,cancelamento_solicitado,ausente)");
    if (countError) throw countError;

    const capacity = Math.max(1, Number(entity.daily_capacity ?? 4));
    if ((count ?? 0) >= capacity && !settings.allowAlternateEntityWhenUnavailable) {
      return NextResponse.json({ error: `Limite de ${capacity} atendimentos para ${entity.name} nesta data já foi atingido.` }, { status: 409 });
    }

    if (isRecurring && !settings.recurringEnabled) {
      throw new Error("Agendamento recorrente não está habilitado para este fluxo.");
    }

    if (isRecurring && settings.maxRecurringAppointmentsPerConsulente > 0) {
      const recurringQuery = supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("is_recurring", true)
        .not("status", "in", "(cancelado,cancelamento_solicitado,ausente)");
      if (email) recurringQuery.eq("email", email);
      else recurringQuery.eq("whatsapp", whatsapp);
      const { count: recurringCount, error: recurringError } = await recurringQuery;
      if (recurringError) throw recurringError;
      if ((recurringCount ?? 0) >= settings.maxRecurringAppointmentsPerConsulente) {
        throw new Error(`Limite de ${settings.maxRecurringAppointmentsPerConsulente} agendamento(s) recorrente(s) por consulente atingido.`);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .insert({
        organization_id: organization.id,
        entity_id: entityId,
        recommended_by_entity_id: recommendedByEntityId || null,
        scheduled_by_person_id: scheduledByPersonId || null,
        consulente_name: fullName,
        whatsapp: whatsapp || null,
        email: email || null,
        appointment_date: appointmentDate,
        appointment_time: asText(body.appointmentTime ?? body.time) || null,
        is_recurring: isRecurring,
        recurrence_count: isRecurring ? recurrenceCount : 1,
        status: "solicitado",
        notes: notes || null,
        metadata: {
          source: "site_tucxa_consulente",
          return_guidance: settings.appointmentReturnGuidance,
          weekday: dateWeekday,
          age: age || null,
          condition: condition || null,
          recurrence_count: isRecurring ? recurrenceCount : 1,
        },
      })
      .select("id, status")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, appointment: data, message: "Solicitação registrada. A organização do Tucxa fará a validação e retornará pelo contato informado." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao solicitar agendamento." }, { status: 500 });
  }
}
