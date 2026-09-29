import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  confirmationTokenHash,
  isPastConfirmationDeadline,
  loadPilotSettings,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { loadTucxaConfirmationAppointment } from "@/lib/organizacao-em-harmonia/tucxa-confirmation";
import { sendTucxaReceptionConfirmationWhatsapp } from "@/lib/botconversa";
import { sendTucxaAppointmentAuditEmail } from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { receptionConfirmationMessage } from "@/lib/organizacao-em-harmonia/tucxa-appointment-messages";

export const dynamic = "force-dynamic";


const RECEPTION_LOGIN_URL =
  "https://www.automacaoextrema.com/solucoes/organizacao-em-harmonia/agendamento/login";

function receptionLoginUrl() {
  return RECEPTION_LOGIN_URL;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}


async function appointmentFromToken(token: string) {
  if (token.length < 20) return null;
  const hash = confirmationTokenHash(token);
  const { data: appointment, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, organization_id, status, confirmation_status, confirmation_expires_at")
    .eq("confirmation_token_hash", hash)
    .maybeSingle();
  if (error) throw error;
  return appointment?.id ? appointment : null;
}

export async function GET(request: Request) {
  try {
    const token = asText(new URL(request.url).searchParams.get("token"));
    const appointment = await loadTucxaConfirmationAppointment(token);
    if (!appointment) {
      return NextResponse.json({ error: "Link de confirmação inválido ou não localizado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, appointment });
  } catch (error) {
    console.error("[TUCXA piloto confirmação GET]", error);
    return NextResponse.json({ error: "Não foi possível validar este link agora." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const token = asText(body.token);
    const action = asText(body.action);
    const found = await appointmentFromToken(token);
    if (!found) return NextResponse.json({ error: "Link de confirmação inválido ou não localizado." }, { status: 404 });
    const appointment = found;
    const deadline = asText(appointment.confirmation_expires_at);
    if (appointment.confirmation_status === "pending" && deadline && isPastConfirmationDeadline(deadline)) {
      const settings = await loadPilotSettings(asText(appointment.organization_id));
      if (settings.autoCancelExpiredConfirmations) {
        const now = new Date().toISOString();
        await supabaseAdmin.from("oh_consulente_appointments").update({
          status: "cancelado",
          confirmation_status: "expired",
          cancelled_at: now,
          cancellation_reason: "Prazo de confirmação do piloto encerrado",
          updated_at: now,
        }).eq("id", appointment.id);
      }
      return NextResponse.json({ error: "O prazo de confirmação encerrou. Entre em contato com a Recepção do Tucxa.", autoCancelled: settings.autoCancelExpiredConfirmations }, { status: 410 });
    }
    if (appointment.confirmation_status === "expired") {
      return NextResponse.json({ error: "O prazo de confirmação encerrou. Entre em contato com a Recepção do Tucxa." }, { status: 410 });
    }
    if (action === "confirm" && appointment.confirmation_status === "declined") {
      return NextResponse.json({ error: "Este agendamento já foi cancelado e a vaga foi liberada." }, { status: 409 });
    }
    if (action === "confirm" && appointment.confirmation_status === "confirmed") {
      return NextResponse.json({ ok: true, message: "Sua presença já estava confirmada." });
    }
    if (action === "decline" && appointment.confirmation_status === "declined") {
      return NextResponse.json({ ok: true, message: "Seu aviso já havia sido registrado e a vaga está liberada." });
    }

    const now = new Date().toISOString();
    if (action === "confirm") {
      const { error } = await supabaseAdmin.from("oh_consulente_appointments").update({
        status: "confirmado",
        confirmation_status: "confirmed",
        confirmed_at: now,
        confirmation_channel: "whatsapp_link",
        updated_at: now,
      }).eq("id", appointment.id);
      if (error) throw error;

      try {
        const details = await loadTucxaConfirmationAppointment(token);
        if (details) {
          const notification = await sendTucxaReceptionConfirmationWhatsapp({
            consulenteName: details.fullName || details.firstName,
            appointmentDate: details.appointmentDate,
            entityName: details.entityName,
            loginUrl: receptionLoginUrl(),
            appointmentOrder: details.order,
          });
          if (!notification.sent && notification.provider === "botconversa") {
            console.warn("[TUCXA confirmação] aviso à Recepção não enviado", notification.error || "erro desconhecido");
          }
        }
      } catch (notificationError) {
        console.error("[TUCXA confirmação] falha ao avisar a Recepção", notificationError);
      }

      const confirmedDetails = await loadTucxaConfirmationAppointment(token).catch(() => null);
      void sendTucxaAppointmentAuditEmail({
        event: "Consulente confirmou a presença",
        consulenteName: confirmedDetails?.fullName,
        appointmentDate: confirmedDetails?.appointmentDate,
        entityName: confirmedDetails?.entityName,
        message: confirmedDetails ? receptionConfirmationMessage({
          fullName: confirmedDetails.fullName,
          appointmentDate: confirmedDetails.appointmentDate,
          entityName: confirmedDetails.entityName,
          order: confirmedDetails.order,
          loginUrl: receptionLoginUrl(),
        }) : undefined,
      });
      return NextResponse.json({ ok: true, message: "Presença confirmada conforme os dados abaixo." });
    }

    if (action === "decline") {
      const { error } = await supabaseAdmin.from("oh_consulente_appointments").update({
        status: "cancelado",
        confirmation_status: "declined",
        cancelled_at: now,
        cancellation_reason: "Informou pelo link de confirmação que não poderá comparecer",
        updated_at: now,
      }).eq("id", appointment.id);
      if (error) throw error;
      const declinedDetails = await loadTucxaConfirmationAppointment(token).catch(() => null);
      void sendTucxaAppointmentAuditEmail({ event: "Cancelamento de agendamento", consulenteName: declinedDetails?.fullName, appointmentDate: declinedDetails?.appointmentDate, entityName: declinedDetails?.entityName, details: "Cancelado pelo link de confirmação." });
      return NextResponse.json({ ok: true, message: "Recebemos seu aviso. A vaga foi liberada." });
    }

    return NextResponse.json({ error: "Escolha uma opção válida." }, { status: 400 });
  } catch (error) {
    console.error("[TUCXA piloto confirmação POST]", error);
    return NextResponse.json({ error: "Não foi possível registrar sua resposta agora." }, { status: 500 });
  }
}
