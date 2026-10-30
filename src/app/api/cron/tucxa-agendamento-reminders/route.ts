import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  findTucxaOrganization,
  isCampinasHoliday,
  loadPilotSettings,
  createConfirmationToken,
  confirmationTokenHash,
  confirmationDeadlineIso,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaAppointmentWhatsapp } from "@/lib/botconversa";
import { sendTucxaAppointmentAuditEmail } from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { appointmentReminderMessage, TUCXA_INDIVIDUAL_NOTICE } from "@/lib/organizacao-em-harmonia/tucxa-appointment-messages";

import { dispatchDateAllowed, appointmentDispatchAllowed } from "@/lib/organizacao-em-harmonia/tucxa-appointment-homologation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function appointmentOrder(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const record = metadata as Record<string, unknown>;
  const value = Number(record.order ?? record.confirmed_order ?? 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function authorize(request: Request) {
  const secrets = [process.env.CRON_SECRET, process.env.TUCXA_SCHEDULER_SECRET]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];
  if (!secrets.length) return false;
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return secrets.some((secret) => authorization === `Bearer ${secret}`);
}

function weekdaySaoPaulo() {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(new Date());
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? new Date().getDay();
}

function todaySaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type AppointmentRow = {
  id: string;
  person_id: string | null;
  entity_id: string | null;
  appointment_date: string;
  appointment_time: string | null;
  confirmation_expires_at: string | null;
  confirmation_status: string | null;
  consulente_name: string | null;
  whatsapp: string | null;
  notification_contact_name: string | null;
  notification_contact_whatsapp: string | null;
  status: string | null;
  metadata: unknown;
};

type PreferenceRow = {
  person_id: string | null;
  reminder_whatsapp_enabled: boolean | null;
};

type EntityRow = {
  id: string;
  name: string | null;
};

type NotificationLogRow = {
  appointment_id: string;
  scheduled_offset_hours: number | null;
  status: string | null;
  metadata: unknown;
};

type ReminderSummary = {
  sent: number;
  skipped: number;
  failed: number;
  checked: number;
};

async function loadPreferencesAndEntities(
  organizationId: string,
  rows: AppointmentRow[],
) {
  const personIds = [...new Set(rows.map((item) => asText(item.person_id)).filter(Boolean))];
  const entityIds = [...new Set(rows.map((item) => asText(item.entity_id)).filter(Boolean))];

  const [preferencesResult, entitiesResult] = await Promise.all([
    personIds.length
      ? supabaseAdmin
          .from("oh_tucxa_pilot_person_preferences")
          .select("person_id,reminder_whatsapp_enabled")
          .eq("organization_id", organizationId)
          .in("person_id", personIds)
      : Promise.resolve({ data: [], error: null }),
    entityIds.length
      ? supabaseAdmin
          .from("oh_spiritual_entities")
          .select("id,name")
          .eq("organization_id", organizationId)
          .in("id", entityIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (preferencesResult.error) throw preferencesResult.error;
  if (entitiesResult.error) throw entitiesResult.error;

  return {
    preferences: new Map<string, PreferenceRow>(
      ((preferencesResult.data ?? []) as PreferenceRow[]).map((item) => [asText(item.person_id), item]),
    ),
    entityNames: new Map<string, string>(
      ((entitiesResult.data ?? []) as EntityRow[]).map((item) => [asText(item.id), asText(item.name)]),
    ),
  };
}

async function processDayOfReminders(
  organizationId: string,
  today: string,
): Promise<ReminderSummary> {
  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id,person_id,entity_id,appointment_date,appointment_time,confirmation_expires_at,confirmation_status,consulente_name,whatsapp,notification_contact_name,notification_contact_whatsapp,status,metadata")
    .eq("organization_id", organizationId)
    .eq("appointment_date", today)
    .in("status", ["solicitado", "confirmado", "aprovado"])
    .order("appointment_time", { ascending: true })
    .limit(500);

  if (appointmentsError) throw appointmentsError;

  const rows = (appointments ?? []) as AppointmentRow[];
  if (!rows.length) return { sent: 0, skipped: 0, failed: 0, checked: 0 };

  const appointmentIds = rows.map((item) => item.id);
  const [{ preferences, entityNames }, logsResult] = await Promise.all([
    loadPreferencesAndEntities(organizationId, rows),
    supabaseAdmin
      .from("oh_tucxa_pilot_notification_log")
      .select("appointment_id,scheduled_offset_hours,status")
      .eq("organization_id", organizationId)
      .eq("channel", "whatsapp")
      .eq("notification_type", "day_reminder")
      .in("appointment_id", appointmentIds),
  ]);

  if (logsResult.error) throw logsResult.error;

  const sentAppointments = new Set(
    ((logsResult.data ?? []) as NotificationLogRow[])
      .filter((item) => item.status === "sent")
      .map((item) => item.appointment_id),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const appointment of rows) {
    const candidatePhone = asText(appointment.notification_contact_whatsapp) || asText(appointment.whatsapp);
    if (!appointmentDispatchAllowed(today, appointment.id, candidatePhone)) {
      skipped += 1;
      continue;
    }
    if (sentAppointments.has(appointment.id)) {
      skipped += 1;
      continue;
    }

    const preference = preferences.get(asText(appointment.person_id));
    if (preference?.reminder_whatsapp_enabled === false) {
      skipped += 1;
      continue;
    }

    const phone = asText(appointment.notification_contact_whatsapp) || asText(appointment.whatsapp);
    if (!phone) {
      skipped += 1;
      continue;
    }

    const entityName = entityNames.get(asText(appointment.entity_id)) || "Entidade";
    const isConfirmed = appointment.confirmation_status === "confirmed";
    let confirmationUrl: string | undefined;
    if (!isConfirmed) {
      const settings = await loadPilotSettings(organizationId);
      const expiry = confirmationDeadlineIso(appointment.appointment_date, settings.confirmationCutoff);
      if (Date.parse(expiry) > Date.now()) {
        const token = createConfirmationToken();
        const { error: tokenError } = await supabaseAdmin.from("oh_consulente_appointments")
          .update({ confirmation_token_hash: confirmationTokenHash(token), confirmation_expires_at: expiry, confirmation_status: "pending", updated_at: new Date().toISOString() })
          .eq("organization_id", organizationId).eq("id", appointment.id);
        if (tokenError) throw tokenError;
        const publicBase = (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL)
          ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
          : (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com");
        confirmationUrl = `${publicBase.replace(/\/$/, "")}/solucoes/organizacao-em-harmonia/tucxa/confirmar-agendamento/${encodeURIComponent(token)}`;
      }
    }
    const result = await sendTucxaAppointmentWhatsapp({
      kind: "reminder",
      confirmationUrl,
      fullName: asText(appointment.consulente_name) || "Consulente",
      recipientName: asText(appointment.notification_contact_name) || asText(appointment.consulente_name) || "Consulente",
      whatsapp: phone,
      appointmentDate: appointment.appointment_date,
      entityName,
      reminderOffsetHours: null,
      appointmentOrder: appointmentOrder(appointment.metadata),
      individualNotice: appointment.confirmation_status === "confirmed"
        ? TUCXA_INDIVIDUAL_NOTICE
        : `Sua presença ainda não foi confirmada. Confirme para ajudar a Recepção a organizar as vagas. ${TUCXA_INDIVIDUAL_NOTICE}`,
    });

    const logPayload = {
      organization_id: organizationId,
      appointment_id: appointment.id,
      person_id: appointment.person_id || null,
      channel: "whatsapp",
      notification_type: "day_reminder",
      scheduled_offset_hours: 0,
      status: result.sent ? "sent" : "failed",
      provider: result.provider,
      provider_message_id: result.subscriberId || null,
      error: result.error || null,
      sent_at: result.sent ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error: logError } = await supabaseAdmin
      .from("oh_tucxa_pilot_notification_log")
      .upsert(logPayload, {
        onConflict: "appointment_id,channel,notification_type,scheduled_offset_hours",
      });

    if (logError) throw logError;

    if (result.sent) {
      sent += 1;
      sentAppointments.add(appointment.id);
    } else {
      failed += 1;
    }
    const auditCopied = await sendTucxaAppointmentAuditEmail({
      event: result.sent ? "Lembrete de agendamento enviado" : "Falha no lembrete de agendamento",
      consulenteName: asText(appointment.consulente_name),
      appointmentDate: appointment.appointment_date,
      entityName,
      details: `Destinatário: ${asText(appointment.notification_contact_name) || asText(appointment.consulente_name)}\nWhatsApp: ${phone}\nResultado: ${result.sent ? "enviado" : "falhou"}\nMotivo: ${result.error || "nenhum"}`,
      message: [
        `Destinatário: ${asText(appointment.notification_contact_name) || asText(appointment.consulente_name)}`,
        `WhatsApp: ${phone}`,
        `Resultado: ${result.sent ? "enviado" : "falhou"}`,
        result.error ? `Motivo: ${result.error}` : "",
        "",
        appointmentReminderMessage({
          fullName: asText(appointment.consulente_name) || "Consulente",
          appointmentDate: appointment.appointment_date,
          entityName,
          order: appointmentOrder(appointment.metadata),
          confirmed: isConfirmed,
          confirmationUrl,
        }),
      ].filter(Boolean).join("\n"),
    });
    if (!auditCopied) console.error("[TUCXA auditoria] falha ao copiar lembrete", appointment.id);
  }

  return { sent, skipped, failed, checked: rows.length };
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Cron não autorizado." }, { status: 401 });
  }
  // Nenhum envio ou gravação de dados em Preview/Development.
  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ ok: true, blocked: true, reason: "non_production_environment", sent: 0, messagesSent: 0 });
  }

  try {
    const organization = await findTucxaOrganization();
    if (!organization) {
      return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });
    }

    const today = todaySaoPaulo();
    if (!dispatchDateAllowed(today)) {
      return NextResponse.json({ ok: true, blocked: true, reason: "homologation_guard", today, sent: 0, checked: 0 });
    }

    // Segurança operacional: feriado/data sem atendimento é bloqueado antes
    // de qualquer consulta de envio, gravação de log ou contato com provedor.
    if (isCampinasHoliday(today)) {
      return NextResponse.json({
        ok: true,
        today,
        blocked: true,
        reason: "holiday_or_no_service_date",
        sent: 0,
        skipped: 0,
        failed: 0,
        checked: 0,
      });
    }

    const settings = await loadPilotSettings(organization.id);
    const weekday = weekdaySaoPaulo();
    if (!settings.automaticDispatchWeekdays.includes(weekday)) {
      return NextResponse.json({
        ok: true,
        today,
        skippedByWeekday: true,
        weekday,
        sent: 0,
        skipped: 0,
        failed: 0,
        checked: 0,
      });
    }

    const campinasTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(new Date());
    if (campinasTime < "12:00") {
      return NextResponse.json({ ok: true, blocked: true, reason: "before_12_campinas", today, campinasTime });
    }

    // Ajuste 50: o cron diário envia SOMENTE os lembretes dos agendamentos
    // da data local corrente de Campinas/Brasília.
    const dayReminder = await processDayOfReminders(organization.id, today);

    return NextResponse.json({
      ok: true,
      today,
      mode: "today_only",
      dayReminder,
      sent: dayReminder.sent,
      skipped: dayReminder.skipped,
      failed: dayReminder.failed,
      checked: dayReminder.checked,
    });
  } catch (error) {
    console.error("[TUCXA cron agendamento reminders]", error);
    return NextResponse.json(
      { error: "Não foi possível processar os lembretes do Tucxa." },
      { status: 500 },
    );
  }
}
