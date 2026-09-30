import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  findTucxaOrganization,
  loadPilotSettings,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaAppointmentWhatsapp } from "@/lib/botconversa";
import { sendTucxaAppointmentAuditEmail } from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { appointmentReminderMessage, TUCXA_INDIVIDUAL_NOTICE } from "@/lib/organizacao-em-harmonia/tucxa-appointment-messages";

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
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return authorization === `Bearer ${secret}`;
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
  reminder_offsets_hours: unknown;
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
          .select("person_id,reminder_whatsapp_enabled,reminder_offsets_hours")
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
    const result = await sendTucxaAppointmentWhatsapp({
      kind: "reminder",
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
      void sendTucxaAppointmentAuditEmail({
        event: "Lembrete de agendamento enviado",
        consulenteName: asText(appointment.consulente_name),
        appointmentDate: appointment.appointment_date,
        entityName,
        message: appointmentReminderMessage({
          fullName: asText(appointment.consulente_name) || "Consulente",
          appointmentDate: appointment.appointment_date,
          entityName,
          order: appointmentOrder(appointment.metadata),
          confirmed: appointment.confirmation_status === "confirmed",
        }),
      });
    } else {
      failed += 1;
    }
  }

  return { sent, skipped, failed, checked: rows.length };
}

async function processConfirmationOffsetReminders(
  organizationId: string,
  today: string,
): Promise<ReminderSummary> {
  const settings = await loadPilotSettings(organizationId);
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id,person_id,entity_id,appointment_date,appointment_time,confirmation_expires_at,confirmation_status,consulente_name,whatsapp,notification_contact_name,notification_contact_whatsapp,status,metadata")
    .eq("organization_id", organizationId)
    .eq("confirmation_status", "pending")
    .gt("confirmation_expires_at", nowIso)
    .neq("appointment_date", today)
    .in("status", ["solicitado", "confirmado", "aprovado"])
    .order("confirmation_expires_at", { ascending: true })
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
      .eq("notification_type", "confirmation_reminder")
      .in("appointment_id", appointmentIds),
  ]);

  if (logsResult.error) throw logsResult.error;

  const sentKeys = new Set(
    ((logsResult.data ?? []) as NotificationLogRow[])
      .filter((item) => item.status === "sent")
      .map((item) => `${item.appointment_id}:${Number(item.scheduled_offset_hours)}`),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const appointment of rows) {
    const deadline = new Date(asText(appointment.confirmation_expires_at));
    if (Number.isNaN(deadline.getTime()) || deadline <= now) {
      skipped += 1;
      continue;
    }

    const preference = preferences.get(asText(appointment.person_id));
    if (preference?.reminder_whatsapp_enabled === false) {
      skipped += 1;
      continue;
    }

    const customOffsets = Array.isArray(preference?.reminder_offsets_hours)
      ? preference.reminder_offsets_hours
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isFinite(value) && value > 0)
      : [];

    const offsetSource: number[] = customOffsets.length
      ? customOffsets
      : settings.confirmationReminderOffsetsHours;

    const offsets: number[] = [...new Set<number>(offsetSource)].sort((left, right) => left - right);
    const remainingHours = (deadline.getTime() - now.getTime()) / (60 * 60 * 1000);

    const dueOffset = offsets.find((offset) => {
      const alreadySent = sentKeys.has(`${appointment.id}:${offset}`);
      return !alreadySent && remainingHours <= offset && remainingHours > Math.max(0, offset - 2);
    });

    if (!dueOffset) {
      skipped += 1;
      continue;
    }

    const phone = asText(appointment.notification_contact_whatsapp) || asText(appointment.whatsapp);
    if (!phone) {
      skipped += 1;
      continue;
    }

    const entityName = entityNames.get(asText(appointment.entity_id)) || "Entidade";
    const result = await sendTucxaAppointmentWhatsapp({
      kind: "reminder",
      fullName: asText(appointment.consulente_name) || "Consulente",
      recipientName: asText(appointment.notification_contact_name) || asText(appointment.consulente_name) || "Consulente",
      whatsapp: phone,
      appointmentDate: appointment.appointment_date,
      entityName,
      reminderOffsetHours: dueOffset,
      appointmentOrder: appointmentOrder(appointment.metadata),
      individualNotice: `Sua presença ainda não foi confirmada. Confirme para ajudar a Recepção a organizar as vagas. ${TUCXA_INDIVIDUAL_NOTICE}`,
    });

    const logPayload = {
      organization_id: organizationId,
      appointment_id: appointment.id,
      person_id: appointment.person_id || null,
      channel: "whatsapp",
      notification_type: "confirmation_reminder",
      scheduled_offset_hours: dueOffset,
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
      sentKeys.add(`${appointment.id}:${dueOffset}`);
    } else {
      failed += 1;
    }
  }

  return { sent, skipped, failed, checked: rows.length };
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Cron não autorizado." }, { status: 401 });
  }

  try {
    const organization = await findTucxaOrganization();
    if (!organization) {
      return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });
    }

    const today = todaySaoPaulo();
    const [dayReminder, confirmationReminder] = await Promise.all([
      processDayOfReminders(organization.id, today),
      processConfirmationOffsetReminders(organization.id, today),
    ]);

    return NextResponse.json({
      ok: true,
      today,
      dayReminder,
      confirmationReminder,
      sent: dayReminder.sent + confirmationReminder.sent,
      skipped: dayReminder.skipped + confirmationReminder.skipped,
      failed: dayReminder.failed + confirmationReminder.failed,
      checked: dayReminder.checked + confirmationReminder.checked,
    });
  } catch (error) {
    console.error("[TUCXA cron agendamento reminders]", error);
    return NextResponse.json(
      { error: "Não foi possível processar os lembretes do Tucxa." },
      { status: 500 },
    );
  }
}
