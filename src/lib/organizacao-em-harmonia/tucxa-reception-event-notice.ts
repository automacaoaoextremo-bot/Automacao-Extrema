/** AG28 — avisos à Recepção, sempre opt-in, auditados e desligados no Preview. */
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadPilotPersonPreferences, normalizeBrazilPhone } from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaReceptionEventWhatsapp } from "@/lib/botconversa";

type Kind = "link_request" | "entity_change" | "reschedule";
const asText = (x: unknown) => typeof x === "string" ? x.trim() : "";
function reception(profile: unknown) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return false;
  const p = profile as Record<string, unknown>;
  if (p.supportsReception === true || p.isReception === true || asText(p.pilotAccessKind).toLowerCase() === "recepcao") return true;
  return [p.functions, p.selectedFunctions, p.functionSlugs].some((source) => Array.isArray(source) && source.some((item) =>
    asText(typeof item === "object" && item ? (item as Record<string, unknown>).slug || (item as Record<string, unknown>).name : item)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("recepc")));
}
const validEmail = (x: unknown) => {
  const v = asText(x).toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && !v.endsWith("@organizacao-em-harmonia.local") ? v : "";
};
async function sendEmail(to: string, kind: Kind, details: string) {
  const host = process.env.SMTP_HOST, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return false;
  try {
    await nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT || 587),
      secure: (process.env.SMTP_SECURE || "").toLowerCase() === "true", auth: { user, pass } }).sendMail({
      from: process.env.EMAIL_FROM || user, to,
      subject: `[TUCXA] ${kind === "link_request" ? "Solicitação de vínculo" : kind === "entity_change" ? "Troca de Entidade" : "Reagendamento"}`,
      text: details,
    });
    return true;
  } catch (error) { console.error("[AG28 email aviso]", error); return false; }
}
export async function sendTucxaReceptionEventNotice(input: {
  organizationId: string; eventId: string; kind: Kind; details: string;
}) {
  // Sem automatismo no Preview; um único controle administrativo para todos os canais.
  if (process.env.VERCEL_ENV !== "production" || process.env.TUCXA_AG28_NOTICES_ENABLED !== "true") return;
  try {
    const { data: memberships, error: membershipError } = await supabaseAdmin.from("oh_memberships")
      .select("person_id,agenda_viva_profile").eq("organization_id", input.organizationId).eq("active", true);
    if (membershipError) throw membershipError;
    const ids = [...new Set((memberships || []).filter((row) => reception(row.agenda_viva_profile))
      .map((row) => asText(row.person_id)).filter(Boolean))];
    if (!ids.length) return;
    const { data: people, error: peopleError } = await supabaseAdmin.from("oh_people")
      .select("id,full_name,whatsapp,normalized_whatsapp,email,notification_email")
      .eq("organization_id", input.organizationId).eq("active", true).in("id", ids.slice(0, 50));
    if (peopleError) throw peopleError;
    const contacts = (people || []).map((person) => ({ person,
      email: validEmail(person.notification_email) || validEmail(person.email),
      whatsapp: normalizeBrazilPhone(person.normalized_whatsapp || person.whatsapp),
    }));
    const duplicates = (channel: "email" | "whatsapp", value: string) =>
      contacts.filter((r) => r[channel] === value).length > 1;
    for (const row of contacts) {
      const personId = asText(row.person.id);
      const preferences = await loadPilotPersonPreferences(input.organizationId, personId);
      const channels = input.kind === "link_request" ? preferences.receptionLinkRequestChannels
        : input.kind === "entity_change" ? preferences.receptionEntityChangeChannels : preferences.receptionRescheduleChannels;
      for (const channel of channels) {
        if (channel !== "email" && channel !== "whatsapp") continue;
        if (channel === "whatsapp" && process.env.TUCXA_AG28_RECEPTION_WHATSAPP_ENABLED !== "true") continue;
        const address = row[channel];
        if (!address || duplicates(channel, address)) continue;
        const { error: claimError } = await supabaseAdmin.from("oh_tucxa_ag28_event_dispatches").insert({
          organization_id: input.organizationId, event_id: input.eventId, event_type: input.kind,
          recipient_person_id: personId, channel, recipient_contact: address, status: "processing",
        });
        if (claimError?.code === "23505") continue;
        if (claimError) { console.error("[AG28 claim]", claimError); continue; }
        const sent = channel === "email" ? await sendEmail(address, input.kind, input.details)
          : (await sendTucxaReceptionEventWhatsapp({
              kind: input.kind, whatsapp: address, recipientName: asText(row.person.full_name), details: input.details,
            })).sent;
        await supabaseAdmin.from("oh_tucxa_ag28_event_dispatches")
          .update({ status: sent ? "sent" : "error", error: sent ? null : "Envio não confirmado. Verificar manualmente.",
            sent_at: sent ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
          .eq("event_id", input.eventId).eq("recipient_person_id", personId).eq("channel", channel);
      }
    }
  } catch (error) { console.error("[AG28 avisos recepcao]", error); }
}
