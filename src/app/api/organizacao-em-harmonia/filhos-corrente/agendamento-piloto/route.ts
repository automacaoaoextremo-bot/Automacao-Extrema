import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  confirmationDeadlineIso,
  confirmationTokenHash,
  createConfirmationToken,
  currentPilotReception,
  expirePastPilotConfirmations,
  isPastConfirmationDeadline,
  loadPilotAppointments,
  loadPilotDates,
  loadPilotDay,
  loadPilotSettings,
  longDateLabel,
  normalizeBrazilPhone,
  pilotReservationError,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaSms } from "@/lib/organizacao-em-harmonia/tucxa-sms";

export const dynamic = "force-dynamic";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "sim", "yes"].includes(value.toLowerCase());
  return fallback;
}

function requestId() {
  return crypto.randomUUID().slice(0, 8);
}

function siteUrl() {
  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (process.env.VERCEL_ENV === "preview" && vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function confirmationUrl(token: string) {
  return `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/confirmar-agendamento/${encodeURIComponent(token)}`;
}

async function appointmentPayload(organizationId: string, date: string) {
  const appointments = await loadPilotAppointments(organizationId, date, date);
  return appointments;
}

async function buildPayload(organizationId: string, selectedDate?: string) {
  await expirePastPilotConfirmations(organizationId);
  const settings = await loadPilotSettings(organizationId);
  const dates = await loadPilotDates(organizationId, settings.daysAhead);
  const selected = dates.some((item) => item.date === selectedDate) ? selectedDate! : dates[0]?.date || todayInSaoPaulo();
  const [entities, appointments] = await Promise.all([
    loadPilotDay(organizationId, selected),
    appointmentPayload(organizationId, selected),
  ]);
  return { settings, dates, selectedDate: selected, entities, appointments };
}

export async function GET(request: Request) {
  const code = requestId();
  try {
    const context = await currentPilotReception(request);
    if (!context) {
      return NextResponse.json({ error: "Seu acesso não possui permissão de Recepção para este piloto.", requestId: code }, { status: 403 });
    }
    const url = new URL(request.url);
    const date = asText(url.searchParams.get("date"));
    const payload = await buildPayload(context.organizationId, date);
    return NextResponse.json({
      ok: true,
      profile: { fullName: context.fullName, canManage: context.canManage },
      ...payload,
    });
  } catch (error) {
    console.error("[TUCXA piloto recepcao GET]", { requestId: code, error });
    return NextResponse.json({ error: "Não foi possível carregar o piloto de agendamentos.", requestId: code }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const code = requestId();
  try {
    const context = await currentPilotReception(request);
    if (!context?.canManage) {
      return NextResponse.json({ error: "Seu acesso não possui permissão para gerir o piloto.", requestId: code }, { status: 403 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);
    const settings = await loadPilotSettings(context.organizationId);

    if (action === "book") {
      const targetPersonId = asText(body.targetPersonId);
      const entityId = asText(body.entityId);
      const appointmentDate = asText(body.appointmentDate);
      const notes = asText(body.notes);
      if (!targetPersonId || !entityId || !appointmentDate) {
        return NextResponse.json({ error: "Informe a pessoa, a data e a Entidade.", requestId: code }, { status: 400 });
      }

      const deadline = confirmationDeadlineIso(appointmentDate, settings.confirmationCutoff);
      if (isPastConfirmationDeadline(deadline)) {
        return NextResponse.json({ error: `O prazo de confirmação desta data encerrou às ${settings.confirmationCutoff}.`, requestId: code }, { status: 409 });
      }

      const { data: person, error: personError } = await supabaseAdmin
        .from("oh_people")
        .select("id, full_name, whatsapp, email, notification_email, active")
        .eq("organization_id", context.organizationId)
        .eq("id", targetPersonId)
        .eq("active", true)
        .maybeSingle();
      if (personError) throw personError;
      if (!person?.id) return NextResponse.json({ error: "Cadastro do Filho de Fora/Consulente não localizado.", requestId: code }, { status: 404 });

      const dayEntities = await loadPilotDay(context.organizationId, appointmentDate);
      const entity = dayEntities.find((item) => item.id === entityId);
      if (!entity) return NextResponse.json({ error: "A Entidade escolhida não está prevista para esta data.", requestId: code }, { status: 409 });
      if (!entity.isAvailable) return NextResponse.json({ error: entity.suspendedReason || "Atendimento suspenso para esta Entidade.", requestId: code }, { status: 409 });
      if (entity.available < 1) return NextResponse.json({ error: "Não há vagas disponíveis para esta Entidade nesta data.", requestId: code }, { status: 409 });

      const token = createConfirmationToken();
      const tokenHash = confirmationTokenHash(token);
      const actualEmail = asText(person.notification_email) || (asText(person.email).endsWith("@organizacao-em-harmonia.local") ? "" : asText(person.email));
      const phone = normalizeBrazilPhone(person.whatsapp);
      const { data: reservationData, error: reservationError } = await supabaseAdmin.rpc("oh_tucxa_pilot_reserve_appointment", {
        p_organization_id: context.organizationId,
        p_person_id: person.id,
        p_entity_id: entityId,
        p_appointment_date: appointmentDate,
        p_scheduled_by_person_id: context.personId,
        p_booking_channel: "recepcao_piloto",
        p_consulente_name: asText(person.full_name) || "Filho de Fora/Consulente",
        p_whatsapp: phone || null,
        p_email: actualEmail || null,
        p_notes: notes || null,
        p_confirmation_token_hash: tokenHash,
        p_confirmation_expires_at: deadline,
        p_appointment_time: settings.appointmentTime,
      });
      if (reservationError) throw reservationError;
      const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as {
        appointment_id?: string;
        confirmed_order?: number;
        confirmed_capacity?: number;
        confirmed_status?: string;
      } | null;
      if (!reservation?.appointment_id) throw new Error("Reserva criada sem identificador.");

      const link = confirmationUrl(token);
      const smsMessage = [
        "TUCXA - Atendimento em Harmonia",
        `Olá, ${asText(person.full_name).split(/\s+/)[0] || "Consulente"}.`,
        `Agendamento: ${longDateLabel(appointmentDate)}, ${settings.appointmentTime}, com ${entity.name}.`,
        `Confirme até ${settings.confirmationCutoff}: ${link}`,
      ].join("\n");

      const sms = settings.smsEnabled && phone
        ? await sendTucxaSms({ to: phone, message: smsMessage }).catch((error: unknown) => ({ sent: false, provider: "disabled" as const, error: error instanceof Error ? error.message : "Falha no envio do SMS." }))
        : { sent: false, provider: "disabled" as const, error: phone ? "Envio de SMS desabilitado na configuração." : "Telefone não informado." };

      if (sms.sent) {
        const { error: sentUpdateError } = await supabaseAdmin
          .from("oh_consulente_appointments")
          .update({ confirmation_sent_at: new Date().toISOString(), confirmation_channel: "sms", updated_at: new Date().toISOString() })
          .eq("organization_id", context.organizationId)
          .eq("id", reservation.appointment_id);
        if (sentUpdateError) console.error("[TUCXA piloto SMS status]", sentUpdateError);
      }

      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.appointment_id,
          personName: person.full_name,
          appointmentDate,
          appointmentTime: settings.appointmentTime,
          entityName: entity.name,
          order: Number(reservation.confirmed_order ?? 0) || null,
          capacity: Number(reservation.confirmed_capacity ?? entity.capacity),
          status: reservation.confirmed_status || "solicitado",
          confirmationDeadline: deadline,
        },
        confirmation: { url: link, sms },
      });
    }

    if (action === "set-availability") {
      const entityId = asText(body.entityId);
      const startsOn = asText(body.startsOn);
      const endsOn = asText(body.endsOn) || startsOn;
      const available = asBoolean(body.available, true);
      const capacityValue = Number(body.capacity ?? 0);
      const capacity = Number.isInteger(capacityValue) && capacityValue > 0 ? capacityValue : null;
      const reason = asText(body.reason);
      if (!entityId || !startsOn || !endsOn) {
        return NextResponse.json({ error: "Informe Entidade, data inicial e data final.", requestId: code }, { status: 400 });
      }
      if (endsOn < startsOn) return NextResponse.json({ error: "A data final não pode ser anterior à data inicial.", requestId: code }, { status: 400 });

      const { error } = await supabaseAdmin.from("oh_tucxa_pilot_entity_overrides").insert({
        organization_id: context.organizationId,
        entity_id: entityId,
        starts_on: startsOn,
        ends_on: endsOn,
        available,
        capacity,
        reason: reason || null,
        created_by_person_id: context.personId,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, message: available ? "Disponibilidade atualizada." : "Atendimento suspenso para o período informado." });
    }

    if (action === "confirm-manual") {
      const appointmentId = asText(body.appointmentId);
      if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId: code }, { status: 400 });
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          status: "confirmado",
          confirmation_status: "confirmed",
          confirmed_at: now,
          confirmation_channel: "recepcao",
          cancelled_at: null,
          cancelled_by_person_id: null,
          cancellation_reason: null,
          updated_at: now,
        })
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      return NextResponse.json({ ok: true, message: "Agendamento confirmado pela Recepção." });
    }

    if (action === "cancel") {
      const appointmentId = asText(body.appointmentId);
      const reason = asText(body.reason) || "Cancelado pela Recepção no piloto";
      if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId: code }, { status: 400 });
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          status: "cancelado",
          confirmation_status: "declined",
          cancelled_at: now,
          cancelled_by_person_id: context.personId,
          cancellation_reason: reason,
          updated_at: now,
        })
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      return NextResponse.json({ ok: true, message: "Agendamento cancelado e vaga liberada." });
    }

    return NextResponse.json({ error: "Ação não reconhecida.", requestId: code }, { status: 400 });
  } catch (error) {
    const friendly = pilotReservationError(error);
    if (friendly.status >= 500) console.error("[TUCXA piloto recepcao POST]", { requestId: code, error });
    return NextResponse.json({ error: friendly.message, requestId: code }, { status: friendly.status });
  }
}
