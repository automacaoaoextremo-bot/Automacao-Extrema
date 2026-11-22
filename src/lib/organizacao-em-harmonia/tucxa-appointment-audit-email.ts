import nodemailer from "nodemailer";

export const TUCXA_AUDIT_EMAIL = "tucxacentro@gmail.com";

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: { user, pass },
    from: process.env.EMAIL_FROM || user,
  };
}

export async function sendTucxaAppointmentAuditEmail(input: {
  event: string;
  consulenteName?: string;
  appointmentDate?: string;
  entityName?: string;
  details?: string;
  message?: string;
}) {
  const config = smtpConfig();
  if (!config) {
    console.warn("[TUCXA auditoria e-mail] SMTP não configurado", input.event);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
    const text = input.message || [
      `Evento: ${input.event}`,
      input.consulenteName ? `Consulente: ${input.consulenteName}` : "",
      input.appointmentDate ? `Data: ${input.appointmentDate}` : "",
      input.entityName ? `Entidade: ${input.entityName}` : "",
      input.details || "",
    ].filter(Boolean).join("\n");

    await transporter.sendMail({
      from: config.from,
      to: TUCXA_AUDIT_EMAIL,
      subject: `[TUCXA] ${input.event}`,
      text,
    });
    return true;
  } catch (error) {
    console.error("[TUCXA auditoria e-mail]", error);
    return false;
  }
}


/** O resumo operacional e independente da copia de auditoria. */
export function tucxaOperationalSummaryEmailConfigured(): boolean {
  return smtpConfig() !== null;
}

export async function sendTucxaOperationalSummaryEmail(input: {
  to: string;
  recipientName: string;
  appointmentDate: string;
  summary: string;
  phase: "morning" | "afternoon";
}) {
  const config = smtpConfig();
  if (!config || !input.to.trim()) return false;
  try {
    const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: config.auth });
    await transporter.sendMail({
      from: config.from,
      to: input.to.trim(),
      bcc: input.to.trim().toLowerCase() === TUCXA_AUDIT_EMAIL ? undefined : TUCXA_AUDIT_EMAIL,
      subject: `[TUCXA] ${input.phase === "morning" ? "Prévia 8h-9h" : "Atualização 16h-17h"} - ${input.appointmentDate}`,
      text: input.summary,
    });
    return true;
  } catch (error) {
    console.error("[TUCXA resumo operacional e-mail]", error);
    return false;
  }
}

/** AG26: e-mail igual à comunicação "TUCXA - Agendamento Realizado" da Recepção. */
export async function sendTucxaReceptionBookingNoticeEmail(input: {
  to: string; consulenteName: string; date: string; entity: string; confirmationUrl: string;
}) {
  const config = smtpConfig();
  if (!config || !input.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.to)) return false;
  const dateMatch = input.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const formattedDate = dateMatch ? `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}` : input.date;
  const text = [
    "🌿 TUCXA — AGENDAMENTO REALIZADO",
    "",
    `Olá, consulente ${input.consulenteName} acabou de ter um agendamento registrado`,
    "",
    `📅 Data: ${formattedDate}`,
    `🙏 Entidade: ${input.entity}`,
    "🕒 Chegada: 18h30 às 19h20",
    `✅ Link enviado para confirmar presença: ${input.confirmationUrl}`,
    "",
    "📍 Endereço e orientações estão disponíveis no link.",
    "",
    "Não quer mais receber estas mensagens? Desabilite nas configurações da sua conta no TUCXA - Agendamento",
  ].join("\n");
  try {
    const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: config.auth });
    await transporter.sendMail({ from: config.from, to: input.to, subject: "[TUCXA] Agendamento realizado", text });
    return true;
  } catch (error) { console.error("[TUCXA aviso AG26 email]", error); return false; }
}
