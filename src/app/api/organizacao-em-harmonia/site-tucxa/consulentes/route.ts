import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_INTERNAL_EMAIL = "automacao.ao.extremo@gmail.com";

type ConsulenteBody = {
  requestType?: string;
  name?: string;
  whatsapp?: string;
  email?: string;
  contributionMode?: string;
  preferredDay?: string;
  notes?: string;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function onlyDigits(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function internalEmail() {
  return process.env.OH_ACCESS_REVIEW_EMAIL || process.env.OH_CONSULENTE_REVIEW_EMAIL || process.env.EMAIL_COPY_TO || DEFAULT_INTERNAL_EMAIL;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

function whatsappUrl(phone: string, message: string) {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
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

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return bySlug.id as string;

  const { data: byName } = await supabaseAdmin.from("oh_organizations").select("id").ilike("name", "%tucxa%").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (byName?.id) return byName.id as string;

  return null;
}

async function saveRequest(body: Required<ConsulenteBody>) {
  const organizationId = await findTucxaOrganizationId();
  if (!organizationId) return;

  const payload = {
    organization_id: organizationId,
    source: "site-tucxa",
    request_type: body.requestType,
    full_name: body.name || null,
    whatsapp: onlyDigits(body.whatsapp) || null,
    email: body.email || null,
    contribution_mode: body.contributionMode || null,
    preferred_day: body.preferredDay || null,
    notes: body.notes || null,
    status: "novo",
  };

  await supabaseAdmin.from("oh_public_site_requests").insert(payload);
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "organizacao-em-harmonia-site-tucxa-consulentes" });
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => ({}))) as ConsulenteBody;
    const body: Required<ConsulenteBody> = {
      requestType: asText(raw.requestType) || "atendimento",
      name: asText(raw.name),
      whatsapp: asText(raw.whatsapp),
      email: asText(raw.email).toLowerCase(),
      contributionMode: asText(raw.contributionMode),
      preferredDay: asText(raw.preferredDay),
      notes: asText(raw.notes),
    };

    if (body.requestType !== "contribuicao-anonima" && !body.name) {
      return NextResponse.json({ error: "Informe seu nome ou escolha contribuição anônima." }, { status: 400 });
    }
    if (body.requestType !== "contribuicao-anonima" && !body.whatsapp && !body.email) {
      return NextResponse.json({ error: "Informe WhatsApp ou e-mail para retorno, se necessário." }, { status: 400 });
    }
    if (body.email && !body.email.includes("@")) {
      return NextResponse.json({ error: "Confira o e-mail informado." }, { status: 400 });
    }

    await saveRequest(body).catch(() => undefined);

    const subject = `[Tucxa] Novo contato de consulente - ${body.name || "contribuição anônima"}`;
    const text = [
      "Novo contato recebido pelo site específico do Tucxa.",
      "",
      `Tipo: ${body.requestType}`,
      `Nome: ${body.name || "não informado / anônimo"}`,
      `WhatsApp: ${body.whatsapp || "não informado"}`,
      `E-mail: ${body.email || "não informado"}`,
      `Contribuição: ${body.contributionMode || "não informado"}`,
      `Preferência de dia: ${body.preferredDay || "sem preferência"}`,
      body.notes ? `Mensagem: ${body.notes}` : "Mensagem: não informada",
      "",
      `Origem: ${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro`,
    ].join("\n");

    await sendEmail({ to: internalEmail(), subject, text, cc: internalEmail() });

    const waMessage = [
      "Olá. Enviei meus dados pelo site do Tucxa.",
      `Tipo: ${body.requestType}`,
      body.name ? `Nome: ${body.name}` : "Contribuição anônima",
      body.notes ? `Mensagem: ${body.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({
      ok: true,
      message: "Recebemos suas informações. A organização do Tucxa dará sequência conforme a necessidade.",
      whatsappUrl: whatsappUrl(process.env.TUCXA_PUBLIC_WHATSAPP || body.whatsapp, waMessage),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao registrar contato." }, { status: 500 });
  }
}
