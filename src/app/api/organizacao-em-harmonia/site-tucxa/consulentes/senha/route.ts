import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const DEFAULT_INTERNAL_EMAIL = "automacao.ao.extremo@gmail.com";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function internalEmail() {
  return process.env.OH_ACCESS_REVIEW_EMAIL || process.env.OH_CONSULENTE_REVIEW_EMAIL || process.env.EMAIL_COPY_TO || DEFAULT_INTERNAL_EMAIL;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

async function sendEmail(input: { to: string; subject: string; text: string; cc?: string }) {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false" || !hasSmtpConfig()) return { skipped: true };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Automação Extrema"}" <${process.env.EMAIL_FROM}>`,
    to: input.to,
    cc: input.cc || internalEmail(),
    subject: input.subject,
    text: input.text,
  });

  return { skipped: false };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { identifier?: string };
    const identifier = asText(body.identifier);

    if (!identifier) {
      return NextResponse.json({ error: "Informe o WhatsApp ou e-mail cadastrado." }, { status: 400 });
    }

    const subject = "[Tucxa] Solicitação de troca de senha de consulente";
    const text = [
      "Um Consulente / Filho de Fora solicitou apoio para troca de senha.",
      "",
      `Identificador informado: ${identifier}`,
      "",
      "Se for WhatsApp, responder com orientação pelo próprio WhatsApp.",
      "Se for e-mail, orientar o envio de link de redefinição pelo fluxo de acesso.",
    ].join("\n");

    await sendEmail({ to: internalEmail(), subject, text, cc: internalEmail() });

    return NextResponse.json({ ok: true, message: "Solicitação enviada. A organização do Tucxa fará o retorno pelo canal informado." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao solicitar troca de senha." }, { status: 500 });
  }
}
