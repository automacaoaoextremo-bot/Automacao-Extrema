/** AG26: aviso individual novo agendamento para Recepção, com opt-in e idempotência.
 * Fail-closed: desligado por padrão; nunca dispara no Preview.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendTucxaAppointmentWhatsapp } from "@/lib/botconversa";
import { sendTucxaReceptionBookingNoticeEmail } from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { loadPilotPersonPreferences, normalizeBrazilPhone } from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { firstTwoPersonNames } from "@/lib/organizacao-em-harmonia/person-display";

type NoticeInput = {
  organizationId: string;
  appointmentId: string;
  fullName: string;
  appointmentDate: string;
  entityName: string;
  confirmationUrl: string;
};
const asText = (value: unknown) => typeof value === "string" ? value.trim() : "";
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function hasReception(profile: unknown): boolean {
  const record = asRecord(profile);
  if (record.supportsReception === true || record.isReception === true) return true;
  return [record.functions, record.functionSlugs, record.selectedFunctions].some((source) =>
    Array.isArray(source) && source.some((item) => {
      const functionData = asRecord(item);
      return asText(functionData.slug || functionData.name || functionData.label || item)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("recepc");
    }));
}
function validEmail(raw: unknown) {
  const email = asText(raw).toLowerCase();
  return email && !email.endsWith("@organizacao-em-harmonia.local") && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : "";
}

export async function sendNewBookingReceptionNotices(input: NoticeInput): Promise<void> {
  if (process.env.VERCEL_ENV !== "production" || process.env.TUCXA_AG26_NEW_BOOKING_NOTICES_ENABLED !== "true") return;
  try {
    const { data: memberships, error: memberError } = await supabaseAdmin.from("oh_memberships")
      .select("person_id,agenda_viva_profile").eq("organization_id", input.organizationId).eq("active", true);
    if (memberError) throw memberError;
    const ids = [...new Set((memberships ?? []).filter((item) => hasReception(item.agenda_viva_profile))
      .map((item) => asText(item.person_id)).filter(Boolean))];
    if (!ids.length) return;
    const { data: people, error: peopleError } = await supabaseAdmin.from("oh_people")
      .select("id,full_name,whatsapp,normalized_whatsapp,notification_email,email,active")
      .eq("organization_id", input.organizationId).eq("active", true).in("id", ids);
    if (peopleError) throw peopleError;
    // Evita envios indevidos por ambiguidade: cada contato deve ser unico entre destinatarios.
    const recipients = (people ?? []).slice(0, 30);
    const emailCounts = new Map<string, number>();
    const phoneCounts = new Map<string, number>();
    for (const person of recipients) {
      const email = validEmail(person.notification_email) || validEmail(person.email);
      if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
      const phone = normalizeBrazilPhone(person.normalized_whatsapp || person.whatsapp);
      if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1);
    }
    for (const person of recipients) {
      const personId = asText(person.id);
      const preferences = await loadPilotPersonPreferences(input.organizationId, personId);
      for (const channel of preferences.receptionNewBookingChannels) {
        if (channel === "whatsapp" && process.env.TUCXA_AG26_RECEPTION_WHATSAPP_ENABLED !== "true") continue;
        const address = channel === "email"
          ? validEmail(person.notification_email) || validEmail(person.email)
          : normalizeBrazilPhone(person.normalized_whatsapp || person.whatsapp);
        if (!address || (channel === "email" ? emailCounts.get(address) : phoneCounts.get(address)) !== 1) continue;
        const { error: claimError } = await supabaseAdmin.from("oh_tucxa_pilot_booking_notice_dispatches")
          .insert({ organization_id: input.organizationId, appointment_id: input.appointmentId,
            recipient_person_id: personId, channel, recipient_contact: address, status: "processing" });
        if (claimError?.code === "23505") continue; // sem reenviar automaticamente
        if (claimError) { console.error("[AG26 claim aviso]", claimError); continue; }
        let sent = false;
        if (channel === "email") sent = await sendTucxaReceptionBookingNoticeEmail({
          to: address, consulenteName: firstTwoPersonNames(input.fullName), date: input.appointmentDate,
          entity: input.entityName, confirmationUrl: input.confirmationUrl,
        });
        else {
          const result = await sendTucxaAppointmentWhatsapp({ kind: "reception_booking",
            fullName: firstTwoPersonNames(input.fullName), recipientName: asText(person.full_name),
            whatsapp: address, appointmentDate: input.appointmentDate, entityName: input.entityName,
            confirmationUrl: input.confirmationUrl,
          });
          sent = result.sent;
        }
        const { error: updateError } = await supabaseAdmin.from("oh_tucxa_pilot_booking_notice_dispatches")
          .update({ status: sent ? "sent" : "error", error: sent ? null : "Falha no provedor; verificar manualmente",
            sent_at: sent ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
          .eq("appointment_id", input.appointmentId).eq("recipient_person_id", personId).eq("channel", channel);
        if (updateError) console.error("[AG26 atualizacao log]", updateError);
      }
    }
  } catch (error) { console.error("[TUCXA aviso novo agendamento AG26]", error); }
}
