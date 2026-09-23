import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  confirmationTokenHash,
  isPastConfirmationDeadline,
  longDateLabel,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

export const dynamic = "force-dynamic";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Consulente";
}

async function appointmentFromToken(token: string) {
  if (token.length < 20) return null;
  const hash = confirmationTokenHash(token);
  const { data: appointment, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select("id, entity_id, consulente_name, appointment_date, appointment_time, status, confirmation_status, confirmation_expires_at, confirmed_at")
    .eq("confirmation_token_hash", hash)
    .maybeSingle();
  if (error) throw error;
  if (!appointment?.id) return null;

  const { data: entity, error: entityError } = appointment.entity_id
    ? await supabaseAdmin.from("oh_spiritual_entities").select("name").eq("id", appointment.entity_id).maybeSingle()
    : { data: null, error: null };
  if (entityError) throw entityError;
  return { appointment, entityName: asText(entity?.name) || "Entidade" };
}

export async function GET(request: Request) {
  try {
    const token = asText(new URL(request.url).searchParams.get("token"));
    const found = await appointmentFromToken(token);
    if (!found) return NextResponse.json({ error: "Link de confirmação inválido ou não localizado." }, { status: 404 });
    const { appointment, entityName } = found;
    const deadline = asText(appointment.confirmation_expires_at);
    const expired = Boolean(deadline) && isPastConfirmationDeadline(deadline) && appointment.confirmation_status === "pending";
    if (expired) {
      const now = new Date().toISOString();
      await supabaseAdmin.from("oh_consulente_appointments").update({
        status: "cancelado",
        confirmation_status: "expired",
        cancelled_at: now,
        cancellation_reason: "Prazo de confirmação do piloto encerrado",
        updated_at: now,
      }).eq("id", appointment.id);
    }
    return NextResponse.json({
      ok: true,
      appointment: {
        id: appointment.id,
        firstName: firstName(asText(appointment.consulente_name)),
        appointmentDate: asText(appointment.appointment_date),
        appointmentDateLabel: longDateLabel(asText(appointment.appointment_date)),
        appointmentTime: asText(appointment.appointment_time) || "20:00",
        entityName,
        status: asText(appointment.status),
        confirmationStatus: expired ? "expired" : asText(appointment.confirmation_status),
        confirmationExpiresAt: deadline,
        confirmedAt: asText(appointment.confirmed_at),
      },
    });
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
    const { appointment } = found;
    const deadline = asText(appointment.confirmation_expires_at);
    if (appointment.confirmation_status === "pending" && deadline && isPastConfirmationDeadline(deadline)) {
      const now = new Date().toISOString();
      await supabaseAdmin.from("oh_consulente_appointments").update({
        status: "cancelado",
        confirmation_status: "expired",
        cancelled_at: now,
        cancellation_reason: "Prazo de confirmação do piloto encerrado",
        updated_at: now,
      }).eq("id", appointment.id);
      return NextResponse.json({ error: "O prazo de confirmação encerrou. Entre em contato com a Recepção do Tucxa." }, { status: 410 });
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
        confirmation_channel: "sms_link",
        updated_at: now,
      }).eq("id", appointment.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Presença confirmada. Seu atendimento está reservado." });
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
      return NextResponse.json({ ok: true, message: "Recebemos seu aviso. A vaga foi liberada." });
    }

    return NextResponse.json({ error: "Escolha uma opção válida." }, { status: 400 });
  } catch (error) {
    console.error("[TUCXA piloto confirmação POST]", error);
    return NextResponse.json({ error: "Não foi possível registrar sua resposta agora." }, { status: 500 });
  }
}
