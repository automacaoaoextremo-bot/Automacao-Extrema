import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AcervoNotificationKind =
  | "reserva"
  | "fila"
  | "emprestimo"
  | "devolucao"
  | "reserva_disponivel"
  | "lembrete_devolucao";

type NotificationInput = {
  organizationId: string;
  personId: string;
  titleId: string;
  copyId?: string | null;
  kind: AcervoNotificationKind;
  dueAt?: string | null;
  holdUntil?: string | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value)
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function realEmail(value: unknown) {
  const email = text(value).toLowerCase();
  return email.includes("@") && !email.endsWith("@organizacao-em-harmonia.local");
}

function mailConfig() {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return { ok: false as const, reason: "E-mails desabilitados." };
  }
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  if (!host || !user || !pass || !from) {
    return { ok: false as const, reason: "SMTP não configurado." };
  }
  return {
    ok: true as const,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    }),
    from: `${process.env.EMAIL_FROM_NAME ?? "Tucxa em Harmonia"} <${from}>`,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function labels(kind: AcervoNotificationKind) {
  if (kind === "emprestimo") return { subject: "Empréstimo registrado", action: "foi emprestado" };
  if (kind === "devolucao") return { subject: "Devolução registrada", action: "foi devolvido" };
  if (kind === "reserva_disponivel") return { subject: "Livro disponível para retirada", action: "está separado para retirada" };
  if (kind === "lembrete_devolucao") return { subject: "Lembrete de devolução", action: "continua em seu empréstimo" };
  if (kind === "fila") return { subject: "Entrada na fila de reserva", action: "foi incluído na fila de reserva" };
  return { subject: "Reserva registrada", action: "foi reservado" };
}

export async function sendAcervoMovementNotifications(input: NotificationInput) {
  const config = mailConfig();
  if (!config.ok) return { sent: false, reason: config.reason };

  const [personResult, titleResult, copyResult, settingsResult] = await Promise.all([
    supabaseAdmin
      .from("oh_people")
      .select("full_name,email,whatsapp")
      .eq("organization_id", input.organizationId)
      .eq("id", input.personId)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_acervo_titles")
      .select("title,authors")
      .eq("organization_id", input.organizationId)
      .eq("id", input.titleId)
      .maybeSingle(),
    input.copyId
      ? supabaseAdmin
          .from("oh_acervo_copies")
          .select("asset_code,legacy_code")
          .eq("organization_id", input.organizationId)
          .eq("id", input.copyId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from("oh_acervo_settings")
      .select("metadata")
      .eq("organization_id", input.organizationId)
      .maybeSingle(),
  ]);

  for (const result of [personResult, titleResult, copyResult, settingsResult]) {
    if (result.error) throw result.error;
  }

  const person = personResult.data;
  const title = titleResult.data;
  if (!person || !title) return { sent: false, reason: "Pessoa ou livro não localizado." };

  const metadata = record(settingsResult.data?.metadata);
  const managers = stringList(metadata.notification_emails).filter(realEmail);
  const fallback = text(process.env.EMAIL_COPY_TO);
  if (realEmail(fallback) && !managers.includes(fallback)) managers.push(fallback);

  const personEmail = realEmail(person.email) ? text(person.email) : "";
  const recipients = Array.from(new Set([personEmail, ...managers].filter(Boolean)));
  if (!recipients.length) return { sent: false, reason: "Nenhum destinatário configurado." };

  const label = labels(input.kind);
  const authors = Array.isArray(title.authors) ? title.authors.filter(Boolean).join(", ") : "";
  const copyCode = text(copyResult.data?.asset_code) || text(copyResult.data?.legacy_code);
  const pickupLocation = text(metadata.pickup_location) || "Tucxa";
  const dueLine = input.dueAt ? `\nDevolução prevista: ${formatDate(input.dueAt)}.` : "";
  const holdLine = input.holdUntil ? `\nRetirar até: ${formatDate(input.holdUntil)} em ${pickupLocation}.` : "";
  const returnLine = ["emprestimo", "lembrete_devolucao"].includes(input.kind)
    ? `Devolver no mesmo local da retirada: ${pickupLocation}.`
    : "";
  const reminderIntro = input.kind === "lembrete_devolucao"
    ? "Este é um lembrete respeitoso de que a data prevista de devolução está se aproximando."
    : "";

  const textBody = [
    `Olá, ${text(person.full_name) || "leitor(a)"}.`,
    "",
    reminderIntro,
    `O livro \"${text(title.title)}\" ${label.action} no Acervo Vivo do Tucxa.`,
    authors ? `Autor(es): ${authors}.` : "",
    copyCode ? `Exemplar: ${copyCode}.` : "",
    dueLine.trim(),
    holdLine.trim(),
    returnLine,
    "",
    "Esta mensagem também pode ser encaminhada aos responsáveis pelo Acervo Vivo configurados pela gestão.",
    "Tucxa em Harmonia — Acervo Vivo",
  ].filter(Boolean).join("\n");

  await config.transporter.sendMail({
    from: config.from,
    to: recipients.join(","),
    subject: `[Tucxa • Acervo Vivo] ${label.subject} — ${text(title.title)}`,
    text: textBody,
  });

  return { sent: true, recipients };
}
