import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
};

function normalizeEmailList(values: Array<string | null | undefined>) {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromAddress = process.env.EMAIL_FROM || user;
  const fromName = process.env.EMAIL_FROM_NAME || "Automação Extrema";
  const replyTo = process.env.IMPACTO_ADMIN_EMAIL || process.env.EMAIL_COPY_TO || fromAddress || "";

  if (!host || !user || !pass || !fromAddress) {
    return { ok: false as const, reason: "SMTP não configurado.", replyTo };
  }

  return {
    ok: true as const,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    }),
    from: `${fromName} <${fromAddress}>`,
    replyTo,
  };
}

export async function sendEmail({ to, subject, html, text, cc = [] }: SendEmailInput) {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return { skipped: true, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    console.warn(`Impacto no Controle: ${config.reason}`);
    return { skipped: true, reason: "missing_smtp_config" };
  }

  const recipients = normalizeEmailList([to]);
  if (!recipients.length) {
    return { skipped: true, reason: "missing_recipient" };
  }

  return config.transporter.sendMail({
    from: config.from,
    to: recipients,
    cc: normalizeEmailList(cc),
    replyTo: config.replyTo || undefined,
    subject,
    html,
    text,
  });
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
