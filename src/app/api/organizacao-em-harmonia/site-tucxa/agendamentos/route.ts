import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type AgendaSettings = {
  maxRecurringAppointmentsPerConsulente: number;
  recurringEnabled: boolean;
  autoCancelRecurringOnAbsence: boolean;
  allowDifferentEntityAfterFirstAppointment: boolean;
  allowAlternateEntityWhenUnavailable: boolean;
  wednesdayBookingMode: string;
  wednesdayAuthorizedPersonIds: string[];
  requireRecommendingEntityForWednesday: boolean;
  appointmentReturnGuidance: string;
};

type EntityRecord = {
  id: string;
  name: string | null;
  line?: string | null;
  entity_type?: string | null;
  usual_days?: string[] | null;
  daily_capacity?: number | null;
  appointment_enabled?: boolean | null;
  appointment_notes?: string | null;
  active?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

type AppointmentCount = {
  entity_id: string | null;
  appointment_date: string | null;
  status: string | null;
};

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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function asDateOnly(value: unknown) {
  const text = asText(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

function dateFromIso(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function weekdaySlug(dateText: string) {
  const date = dateFromIso(dateText);
  if (Number.isNaN(date.getTime())) return "";
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][date.getUTCDay()] ?? "";
}

function isVacationDate(dateText: string) {
  const date = dateFromIso(dateText);
  if (Number.isNaN(date.getTime())) return false;
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return (month === 1 && day <= 28) || (month === 7 && day <= 29) || (month === 12 && day >= 21);
}

function isPublicBookingDay(dateText: string) {
  const weekday = weekdaySlug(dateText);
  return (weekday === "segunda" || weekday === "terca") && !isVacationDate(dateText);
}

function entityMatchesDate(entity: EntityRecord, dateText: string) {
  const weekday = weekdaySlug(dateText);
  const days = Array.isArray(entity.usual_days) ? entity.usual_days.map((day) => normalize(asText(day))) : [];
  if (!days.length) return weekday === "segunda" || weekday === "terca";
  if (weekday === "terca") return days.some((day) => day.includes("terca") || day.includes("terça"));
  return days.some((day) => day.includes(weekday));
}

function normalizeSettings(settings: unknown): AgendaSettings {
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
    .select("id, name, slug, line, entity_type, usual_days, daily_capacity, appointment_enabled, appointment_notes, active, metadata")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as EntityRecord[]).filter((entity) => entity.appointment_enabled !== false);
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

async function appointmentCounts(organizationId: string) {
  const start = toIsoDate(addDays(new Date(), -45));
  const end = toIsoDate(addDays(new Date(), 420));
  const { data, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("entity_id, appointment_date, status")
    .eq("organization_id", organizationId)
    .gte("appointment_date", start)
    .lte("appointment_date", end)
    .not("status", "in", "(cancelado,cancelamento_solicitado,ausente)");
  if (error) throw error;
  return (data ?? []) as AppointmentCount[];
}

function buildAvailability(entities: EntityRecord[], appointments: AppointmentCount[]) {
  const counts = new Map<string, number>();
  appointments.forEach((appointment) => {
    if (!appointment.entity_id || !appointment.appointment_date) return;
    const key = `${appointment.entity_id}::${appointment.appointment_date}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const dates: string[] = [];
  const start = dateFromIso(toIsoDate(new Date()));
  for (let index = 0; index < 420; index += 1) {
    const isoDate = toIsoDate(addDays(start, index));
    if (isPublicBookingDay(isoDate)) dates.push(isoDate);
  }

  return entities.flatMap((entity) => {
    const capacity = Math.max(1, Number(entity.daily_capacity ?? 4));
    return dates
      .filter((isoDate) => entityMatchesDate(entity, isoDate))
      .map((isoDate) => {
        const booked = counts.get(`${entity.id}::${isoDate}`) ?? 0;
        const available = Math.max(capacity - booked, 0);
        return {
          entityId: entity.id,
          appointmentDate: isoDate,
          booked,
          capacity,
          available,
          nextOrder: booked + 1,
        };
      });
  });
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

async function sendConfirmationEmail(input: { to: string; name: string; entityName: string; appointmentDate: string; order: number; guidance: string }) {
  if (!input.to || !hasSmtpConfig()) return false;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const formattedDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(dateFromIso(input.appointmentDate));
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Organização em Harmonia"}" <${process.env.EMAIL_FROM}>`,
    to: input.to,
    subject: `Agendamento solicitado no Tucxa - ${input.entityName}`,
    text: [
      `Olá, ${input.name}.`,
      "",
      `Seu agendamento foi solicitado para ${formattedDate}.`,
      `Entidade: ${input.entityName}`,
      `Ordem prevista: ${input.order}`,
      "",
      "Ao chegar, informe seu nome completo, WhatsApp/e-mail e a entidade agendada para a recepção confirmar sua ordem de atendimento.",
      input.guidance,
      "",
      "Esta mensagem confirma o recebimento da solicitação. A organização do Tucxa poderá ajustar orientações conforme necessidade da casa.",
    ].join("\n"),
  });
  return true;
}

async function firstPreviousAppointment(input: { organizationId: string; email: string; whatsapp: string }) {
  if (!input.email && !input.whatsapp) return null;
  let query = supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, entity_id, appointment_date, status")
    .eq("organization_id", input.organizationId)
    .not("status", "in", "(cancelado,cancelamento_solicitado,ausente)")
    .order("appointment_date", { ascending: true })
    .limit(1);

  if (input.email) query = query.eq("email", input.email);
  else query = query.eq("whatsapp", input.whatsapp);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as { id: string; entity_id: string | null } | null;
}

async function countAppointments(organizationId: string, entityId: string, date: string) {
  const { count, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("entity_id", entityId)
    .eq("appointment_date", date)
    .not("status", "in", "(cancelado,cancelamento_solicitado,ausente)");
  if (error) throw error;
  return count ?? 0;
}

function recurrenceDates(startDate: string, count: number) {
  const dates: string[] = [];
  const start = dateFromIso(startDate);
  for (let index = 0; index < count; index += 1) {
    dates.push(toIsoDate(addDays(start, index * 7)));
  }
  return dates;
}

export async function GET() {
  try {
    const organization = await tucxaOrganization();
    const settings = await agendaSettings(organization.id);
    const [entities, events, authorizedSchedulers, appointments] = await Promise.all([
      availableEntities(organization.id),
      availableEvents(organization.id),
      authorizedPeople(organization.id, settings.wednesdayAuthorizedPersonIds),
      appointmentCounts(organization.id),
    ]);

    return NextResponse.json({
      organization,
      settings,
      entities,
      events,
      availability: buildAvailability(entities, appointments),
      authorizedSchedulers,
    });
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
    const notes = asText(body.notes);

    if (!appointmentDate) throw new Error("Informe a data desejada.");
    if (!isPublicBookingDay(appointmentDate)) throw new Error("Agendamentos de Filhos de Fora/Consulentes estão disponíveis somente em segundas e terças fora dos períodos de férias/recesso.");
    if (!entityId) throw new Error("Escolha a entidade para o atendimento.");
    if (!fullName) throw new Error("Informe seu nome completo.");
    if (!whatsapp && !email) throw new Error("Informe WhatsApp ou e-mail para retorno.");
    if (isRecurring && !settings.recurringEnabled) throw new Error("Agendamento recorrente não está habilitado para este fluxo.");
    if (isRecurring && recurrenceCount > settings.maxRecurringAppointmentsPerConsulente) {
      throw new Error(`O limite configurado é de ${settings.maxRecurringAppointmentsPerConsulente} recorrência(s).`);
    }

    const { data: entity, error: entityError } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, daily_capacity, appointment_enabled, usual_days")
      .eq("id", entityId)
      .eq("organization_id", organization.id)
      .eq("active", true)
      .maybeSingle();
    if (entityError) throw entityError;
    const selectedEntity = entity as EntityRecord | null;
    if (!selectedEntity?.id || selectedEntity.appointment_enabled === false) throw new Error("Entidade indisponível para agendamento.");
    if (!entityMatchesDate(selectedEntity, appointmentDate)) throw new Error("Esta entidade não está configurada para atender neste dia.");

    const previous = await firstPreviousAppointment({ organizationId: organization.id, email, whatsapp });
    if (previous?.entity_id && previous.entity_id !== entityId && !settings.allowDifferentEntityAfterFirstAppointment) {
      throw new Error("Após o primeiro atendimento, a configuração atual orienta manter a mesma entidade. Procure a recepção para avaliar a troca.");
    }

    const dates = isRecurring ? recurrenceDates(appointmentDate, recurrenceCount) : [appointmentDate];
    for (const date of dates) {
      if (!isPublicBookingDay(date)) throw new Error("Uma das recorrências cai em período sem atendimento público. Escolha outra data ou reduza as recorrências.");
      const booked = await countAppointments(organization.id, entityId, date);
      const capacity = Math.max(1, Number(selectedEntity.daily_capacity ?? 4));
      if (booked >= capacity) {
        const suffix = settings.allowAlternateEntityWhenUnavailable ? " Escolha outra entidade com vaga neste dia." : "";
        throw new Error(`Limite de ${capacity} atendimentos para ${selectedEntity.name ?? "a entidade"} em ${date} já foi atingido.${suffix}`);
      }
    }

    const insertPayload = await Promise.all(dates.map(async (date, index) => {
      const booked = await countAppointments(organization.id, entityId, date);
      return {
        organization_id: organization.id,
        entity_id: entityId,
        recommended_by_entity_id: null,
        scheduled_by_person_id: null,
        consulente_name: fullName,
        whatsapp: whatsapp || null,
        email: email || null,
        appointment_date: date,
        appointment_time: "18:00",
        is_recurring: isRecurring,
        recurrence_count: isRecurring ? recurrenceCount : 1,
        status: "solicitado",
        notes: notes || null,
        metadata: {
          source: "site_tucxa_consulente_popup",
          return_guidance: settings.appointmentReturnGuidance,
          weekday: weekdaySlug(date),
          recurrence_index: index + 1,
          recurrence_total: dates.length,
          order: booked + 1,
          auto_cancel_recurring_on_absence: settings.autoCancelRecurringOnAbsence,
        },
      };
    }));

    const { data, error } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .insert(insertPayload)
      .select("id, status, appointment_date, metadata")
      .order("appointment_date", { ascending: true });
    if (error) throw error;

    const firstAppointment = Array.isArray(data) ? data[0] : null;
    const firstOrder = Number((firstAppointment?.metadata as Record<string, unknown> | null)?.order ?? 1);
    let emailSent = false;
    try {
      emailSent = await sendConfirmationEmail({
        to: email,
        name: fullName,
        entityName: selectedEntity.name || "Entidade escolhida",
        appointmentDate,
        order: firstOrder,
        guidance: settings.appointmentReturnGuidance,
      });
    } catch {
      emailSent = false;
    }

    return NextResponse.json({
      ok: true,
      appointment: firstAppointment,
      recurrenceCount: dates.length,
      entityName: selectedEntity.name || "Entidade escolhida",
      order: firstOrder,
      emailSent,
      message: "Solicitação registrada. A organização do Tucxa fará a validação e retornará pelo contato informado.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao solicitar agendamento." }, { status: 500 });
  }
}
