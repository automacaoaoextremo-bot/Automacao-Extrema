import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  findTucxaOrganization,
  loadPilotSettings,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaAppointmentWhatsapp } from "@/lib/botconversa";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return authorization === `Bearer ${secret}`;
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
  status: string | null;
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
};

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Cron não autorizado." }, { status: 401 });
  }

  try {
    const organization = await findTucxaOrganization();
    if (!organization) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });

    const settings = await loadPilotSettings(organization.id);

    const now = new Date();
    const nowIso = now.toISOString();
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id,person_id,entity_id,appointment_date,appointment_time,confirmation_expires_at,confirmation_status,consulente_name,whatsapp,status")
      .eq("organization_id", organization.id)
      .eq("confirmation_status", "pending")
      .gt("confirmation_expires_at", nowIso)
      .in("status", ["solicitado", "confirmado", "aprovado"])
      .order("confirmation_expires_at", { ascending: true })
      .limit(500);

    if (appointmentsError) throw appointmentsError;
    const rows = (appointments ?? []) as AppointmentRow[];
    if (!rows.length) return NextResponse.json({ ok: true, sent: 0, skipped: 0, failed: 0 });

    const personIds = [...new Set(rows.map((item) => asText(item.person_id)).filter(Boolean))];
    const entityIds = [...new Set(rows.map((item) => asText(item.entity_id)).filter(Boolean))];
    const appointmentIds = rows.map((item) => item.id);

    const [preferencesResult, entitiesResult, logsResult] = await Promise.all([
      personIds.length
        ? supabaseAdmin
            .from("oh_tucxa_pilot_person_preferences")
            .select("person_id,reminder_whatsapp_enabled,reminder_offsets_hours")
            .eq("organization_id", organization.id)
            .in("person_id", personIds)
        : Promise.resolve({ data: [], error: null }),
      entityIds.length
        ? supabaseAdmin
            .from("oh_spiritual_entities")
            .select("id,name")
            .eq("organization_id", organization.id)
            .in("id", entityIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from("oh_tucxa_pilot_notification_log")
        .select("appointment_id,scheduled_offset_hours,status")
        .eq("organization_id", organization.id)
        .eq("channel", "whatsapp")
        .eq("notification_type", "confirmation_reminder")
        .in("appointment_id", appointmentIds),
    ]);

    if (preferencesResult.error) throw preferencesResult.error;
    if (entitiesResult.error) throw entitiesResult.error;
    if (logsResult.error) throw logsResult.error;

    const preferenceRows = (preferencesResult.data ?? []) as PreferenceRow[];
    const entityRows = (entitiesResult.data ?? []) as EntityRow[];
    const notificationLogs = (logsResult.data ?? []) as NotificationLogRow[];

    const preferences = new Map<string, PreferenceRow>(
      preferenceRows.map((item) => [asText(item.person_id), item]),
    );
    const entityNames = new Map<string, string>(
      entityRows.map((item) => [asText(item.id), asText(item.name)]),
    );
    const sentKeys = new Set(
      notificationLogs
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
        // O cron é pensado para rodar de hora em hora. A janela de 2 h evita
        // enviar tardiamente um lembrete antigo (ex.: o de 24 h quando faltam 3 h).
        return !alreadySent && remainingHours <= offset && remainingHours > Math.max(0, offset - 2);
      });

      if (!dueOffset) {
        skipped += 1;
        continue;
      }

      const phone = asText(appointment.whatsapp);
      if (!phone) {
        skipped += 1;
        continue;
      }

      const entityName = entityNames.get(asText(appointment.entity_id)) || "Entidade";
      const result = await sendTucxaAppointmentWhatsapp({
        kind: "reminder",
        fullName: asText(appointment.consulente_name) || "Consulente",
        whatsapp: phone,
        appointmentDate: appointment.appointment_date,
        entityName,
        reminderOffsetHours: dueOffset,
      });

      const logPayload = {
        organization_id: organization.id,
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

    return NextResponse.json({ ok: true, sent, skipped, failed, checked: rows.length });
  } catch (error) {
    console.error("[TUCXA cron agendamento reminders]", error);
    return NextResponse.json({ error: "Não foi possível processar os lembretes do Tucxa." }, { status: 500 });
  }
}
