import { NextResponse } from "next/server";
import { getBotConversaConfigSummary, syncCorrenteLeadWithBotConversa } from "@/lib/botconversa";

export const dynamic = "force-dynamic";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
    service: "botconversa-test",
    config: getBotConversaConfigSummary(),
    expectedPostBody: {
      responsibleName: "Márcio Alexandre da Silva",
      email: "marcioalex.silva@gmail.com",
      whatsapp: "19992360856",
      leadId: "teste-opcional",
    },
  });
}

export async function POST(request: Request) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const responsibleName = asText(body.responsibleName) || "Márcio Alexandre da Silva";
  const email = asText(body.email) || "marcioalex.silva@gmail.com";
  const whatsapp = asText(body.whatsapp) || "19992360856";
  const leadId = asText(body.leadId) || `debug-${Date.now()}`;
  const loginUrl = `${siteUrl()}/solucoes/corrente-em-dia/login`;

  const result = await syncCorrenteLeadWithBotConversa({
    leadId,
    responsibleName,
    email,
    whatsapp,
    loginUrl,
    source: "debug_botconversa_test",
    organizationName: "Organização em configuração - teste BotConversa",
    founderTermsAccepted: true,
    accessEmailSent: true,
    status: "debug_botconversa_test",
    trialDays: 30,
  });

  return NextResponse.json({
    ok: result.ok,
    config: getBotConversaConfigSummary(),
    botconversa: result,
  });
}
