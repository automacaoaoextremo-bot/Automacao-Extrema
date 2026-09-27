import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  confirmationTokenHash,
  isPastConfirmationDeadline,
  loadPilotSettings,
  longDateLabel,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Consulente";
}

export type TucxaConfirmationAppointment = {
  id: string;
  fullName: string;
  firstName: string;
  appointmentDate: string;
  appointmentDateLabel: string;
  appointmentTime: string;
  arrivalWindow: string;
  doorClosesAt: string;
  doorReopensAt: string;
  endTime: string;
  entityName: string;
  status: string;
  confirmationStatus: string;
  confirmationExpiresAt: string;
  confirmedAt: string;
};

export async function loadTucxaConfirmationAppointment(
  token: string,
): Promise<TucxaConfirmationAppointment | null> {
  if (token.length < 20) return null;

  const hash = confirmationTokenHash(token);
  const { data: appointment, error } = await supabaseAdmin
    .from("oh_consulente_appointments")
    .select(
      "id, organization_id, entity_id, consulente_name, appointment_date, appointment_time, status, confirmation_status, confirmation_expires_at, confirmed_at",
    )
    .eq("confirmation_token_hash", hash)
    .maybeSingle();

  if (error) throw error;
  if (!appointment?.id) return null;

  const organizationId = asText(appointment.organization_id);
  const [{ data: entity, error: entityError }, settings] = await Promise.all([
    appointment.entity_id
      ? supabaseAdmin.from("oh_spiritual_entities").select("name").eq("id", appointment.entity_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    organizationId ? loadPilotSettings(organizationId) : Promise.resolve(null),
  ]);

  if (entityError) throw entityError;

  const deadline = asText(appointment.confirmation_expires_at);
  const expired =
    Boolean(deadline) &&
    isPastConfirmationDeadline(deadline) &&
    appointment.confirmation_status === "pending";

  if (expired) {
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .update({
        status: "cancelado",
        confirmation_status: "expired",
        cancelled_at: now,
        cancellation_reason: "Prazo de confirmação do piloto encerrado",
        updated_at: now,
      })
      .eq("id", appointment.id);

    if (updateError) throw updateError;
  }

  return {
    id: asText(appointment.id),
    fullName: asText(appointment.consulente_name),
    firstName: firstName(asText(appointment.consulente_name)),
    appointmentDate: asText(appointment.appointment_date),
    appointmentDateLabel: longDateLabel(asText(appointment.appointment_date)),
    appointmentTime: asText(appointment.appointment_time) || settings?.appointmentTime || "20:00",
    arrivalWindow: settings?.arrivalWindow || "18:30–19:20",
    doorClosesAt: settings?.doorClosesAt || "19:20",
    doorReopensAt: settings?.doorReopensAt || "20:00",
    endTime: settings?.endTime || "21:40",
    entityName: asText(entity?.name) || "Entidade",
    status: expired ? "cancelado" : asText(appointment.status),
    confirmationStatus: expired ? "expired" : asText(appointment.confirmation_status),
    confirmationExpiresAt: deadline,
    confirmedAt: asText(appointment.confirmed_at),
  };
}
