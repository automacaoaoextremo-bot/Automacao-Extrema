import nodemailer from "nodemailer";

const TO = "automacao.ao.extremo@gmail.com";

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
      to: TO,
      subject: `[TUCXA] ${input.event}`,
      text,
    });
    return true;
  } catch (error) {
    console.error("[TUCXA auditoria e-mail]", error);
    return false;
  }
}


export async function sendTucxaOperationalSummaryEmail(input: {
  to: string;
  recipientName: string;
  appointmentDate: string;
  summary: string;
}) {
  const config = smtpConfig();
  if (!config || !input.to.trim()) return false;
  try {
    const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: config.auth });
    await transporter.sendMail({
      from: config.from,
      to: input.to.trim(),
      subject: `[TUCXA] Resumo dos agendamentos - ${input.appointmentDate}`,
      text: [`Olá, ${input.recipientName}.`, "", "Resumo dos atendimentos do TUCXA:", "", input.summary].join("\n"),
    });
    return true;
  } catch (error) {
    console.error("[TUCXA resumo operacional e-mail]", error);
    return false;
  }
}
