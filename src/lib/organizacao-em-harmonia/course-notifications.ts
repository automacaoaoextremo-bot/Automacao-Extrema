import nodemailer from "nodemailer";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Olá";
}

export function normalizeWhatsapp(value: unknown) {
  const digits = text(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function buildCourseWhatsappUrl(input: {
  whatsapp: string;
  studentName: string;
  courseName: string;
  invitationUrl: string;
  needsRegistration: boolean;
}) {
  const phone = normalizeWhatsapp(input.whatsapp);
  if (!phone) return "";

  const greeting = firstName(input.studentName);
  const registration = input.needsRegistration
    ? "\n\nComo seu cadastro ainda não foi localizado na Base Única do Tucxa, abra o convite e siga a orientação para fazer o cadastro antes de confirmar sua participação."
    : "";
  const message = `${greeting}, você foi convidado(a) para participar do curso \"${input.courseName}\" no Tucxa.${registration}\n\nAbra seu convite: ${input.invitationUrl}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export async function sendCourseInvitationEmail(input: {
  email: string;
  studentName: string;
  courseName: string;
  invitationUrl: string;
  needsRegistration: boolean;
}) {
  const email = text(input.email);
  if (!email) return { sent: false, reason: "Aluno sem e-mail informado." };
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return { sent: false, reason: "Notificações por e-mail desabilitadas." };
  }

  const host = text(process.env.SMTP_HOST);
  const user = text(process.env.SMTP_USER);
  const pass = text(process.env.SMTP_PASS);
  const fromAddress = text(process.env.EMAIL_FROM) || user;
  const port = Number(process.env.SMTP_PORT ?? "587");

  if (!host || !user || !pass || !fromAddress) {
    return { sent: false, reason: "SMTP não configurado." };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  const registrationText = input.needsRegistration
    ? "Seu cadastro ainda não foi localizado na Base Única. Ao abrir o convite, siga a orientação para se cadastrar e depois confirme a participação."
    : "Seu cadastro já foi localizado na Base Única. Abra o convite para confirmar sua participação.";

  await transporter.sendMail({
    from: `${process.env.EMAIL_FROM_NAME ?? "Tucxa em Harmonia"} <${fromAddress}>`,
    to: email,
    subject: `Convite para o curso ${input.courseName} — Tucxa`,
    text: `${firstName(input.studentName)},\n\nVocê foi convidado(a) para participar do curso \"${input.courseName}\" no Tucxa.\n\n${registrationText}\n\nConvite: ${input.invitationUrl}\n\nTucxa em Harmonia`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#123D2C">
        <h2>Convite para curso do Tucxa</h2>
        <p>${escapeHtml(firstName(input.studentName))}, você foi convidado(a) para participar do curso <strong>${escapeHtml(input.courseName)}</strong>.</p>
        <p>${escapeHtml(registrationText)}</p>
        <p><a href="${escapeHtml(input.invitationUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#123D2C;color:#fff;text-decoration:none;font-weight:bold">Abrir convite</a></p>
        <p style="font-size:13px;color:#64748b">Este convite faz parte do Tucxa em Harmonia.</p>
      </div>
    `,
  });

  return { sent: true, reason: "E-mail enviado." };
}
