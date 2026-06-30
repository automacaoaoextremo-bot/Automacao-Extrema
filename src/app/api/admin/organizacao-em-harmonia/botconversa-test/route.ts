import { NextResponse } from "next/server";
import {
  getBotConversaConfigSummary,
  syncOrganizacaoLeadWithBotConversa,
} from "@/lib/botconversa";
import {
  founderTimelineFrom,
  moduleInfo,
  normalizeOrganizacaoModulo,
} from "@/lib/organizacao-em-harmonia";

export const dynamic = "force-dynamic";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: unknown) {
  if (typeof value === "boolean") return value;
  const text = asText(value).toLowerCase();
  return ["sim", "s", "yes", "true", "1", "aceito", "concordo"].includes(text);
}

function hasValidToken(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("x-debug-token") || "";
  const expected = process.env.BOTCONVERSA_TEST_SECRET || process.env.CRON_SECRET || "";
  return Boolean(expected && token && token === expected);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

export async function GET(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    service: "organizacao-em-harmonia-botconversa-test",
    description:
      "Valida criação/atualização do contato, campos personalizados, etiquetas e envio opcional do fluxo OH - Lead vindo do site.",
    config: getBotConversaConfigSummary(),
    expectedPostBody: {
      contactName: "Márcio Alexandre da Silva",
      email: "marcioalex.silva@gmail.com",
      whatsapp: "19992360856",
      leadId: "debug-opcional",
      moduleSlug: "organizacao-em-harmonia",
      priorityModuleSlug: "agenda-viva",
      organizationName: "Tucxa",
      founderTermsAccepted: true,
    },
  });
}

export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const contactName = asText(body.contactName) || "Márcio Alexandre da Silva";
  const email = asText(body.email) || "marcioalex.silva@gmail.com";
  const whatsapp = asText(body.whatsapp) || "19992360856";
  const leadId = asText(body.leadId) || `debug-oh-${Date.now()}`;
  const moduleSlug = asText(body.moduleSlug) || "organizacao-em-harmonia";
  const priorityModuleSlug = asText(body.priorityModuleSlug) || "agenda-viva";
  const organizationName = asText(body.organizationName) || "Tucxa";
  const founderTermsAccepted = asBool(body.founderTermsAccepted ?? true);
  const timeline = founderTimelineFrom();
  const selectedModule = moduleInfo(normalizeOrganizacaoModulo(moduleSlug));
  const priorityModule = moduleInfo(normalizeOrganizacaoModulo(priorityModuleSlug));
  const loginUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia`;

  const result = await syncOrganizacaoLeadWithBotConversa({
    leadId,
    contactName,
    email,
    whatsapp,
    moduleName: selectedModule.name,
    moduleSlug: selectedModule.slug,
    priorityModuleName: priorityModule.name,
    priorityModuleSlug: priorityModule.slug,
    organizationName,
    loginUrl,
    source: "debug_botconversa_test_oh",
    founderTermsAccepted,
    accessEmailSent: true,
    status: "debug_botconversa_test",
    trialDays: timeline.founderEvaluationDays,
    implantationDueAt: timeline.implantationDueAt,
    reminderHoursBeforeDue: timeline.reminderHoursBeforeDue,
  });

  return NextResponse.json({
    ok: result.ok,
    config: getBotConversaConfigSummary(),
    botconversa: result,
  });
}
