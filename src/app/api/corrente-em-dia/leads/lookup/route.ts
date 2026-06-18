import { NextResponse } from "next/server";
import { CORRENTE_LEAD_STATUS_LABELS, type CorrenteLeadStatus } from "@/lib/corrente-em-dia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type LookupRequest = {
  email?: string;
  whatsapp?: string;
  leadId?: string;
  source?: string;
};

type LeadRow = {
  id: string;
  responsible_name: string | null;
  organization_name: string | null;
  email: string | null;
  whatsapp: string | null;
  status: string | null;
  access_sent_at: string | null;
  access_user_email: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

function firstName(value: string | null | undefined) {
  return value?.trim().split(/\s+/)[0] || "tudo bem";
}

function phoneVariants(rawPhone: string) {
  const raw = digits(rawPhone);
  if (!raw) return [];

  const withoutBrazilCode = raw.startsWith("55") && raw.length > 11 ? raw.slice(2) : raw;
  const withBrazilCode = withoutBrazilCode.startsWith("55") ? withoutBrazilCode : `55${withoutBrazilCode}`;

  return Array.from(new Set([raw, withoutBrazilCode, withBrazilCode].filter(Boolean)));
}

function buildFallbackMessage(input?: { reason?: string; leadFormUrl?: string }) {
  const leadFormUrl = input?.leadFormUrl ?? `${siteUrl()}/solucoes/corrente-em-dia/quero-conhecer`;

  return [
    "Não consegui localizar automaticamente seu cadastro agora.",
    "",
    "Mas não se preocupe: seu atendimento ficou salvo por aqui.",
    "",
    "Vou sinalizar para a equipe da Automação Extrema verificar seu acesso e continuar o atendimento.",
    "",
    `Se preferir, você também pode preencher novamente o Quero Conhecer pelo site: ${leadFormUrl}`,
  ].join("\n");
}

function buildSuccessMessage(input: { name: string | null; loginUrl: string; accessEmail: string | null }) {
  const greeting = firstName(input.name);

  return [
    `Pronto, ${greeting}. Localizei seu cadastro no Corrente em Dia.`,
    "",
    "Seu acesso inicial já foi preparado para você começar a configuração da organização.",
    "",
    `Link de acesso: ${input.loginUrl}`,
    `E-mail usado no cadastro: ${input.accessEmail ?? "não informado"}`,
    "",
    "As orientações também foram enviadas para esse e-mail. Se não encontrar, confira spam/lixo eletrônico.",
    "",
    "Se já tiver senha, use sua senha atual. Se não lembrar, clique em Esqueci minha senha na tela de login.",
    "",
    "Próximo passo: entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.",
    "",
    "Se tiver qualquer dificuldade, responda AJUDA por aqui.",
  ].join("\n");
}

function responsePayload(input: {
  ok: boolean;
  found: boolean;
  botconversaMessage: string;
  lead?: LeadRow | null;
  loginUrl: string;
  leadFormUrl: string;
  error?: string;
}) {
  const status = (input.lead?.status ?? "nao_localizado") as CorrenteLeadStatus;
  const accessEmail = input.lead?.access_user_email ?? input.lead?.email ?? null;

  return {
    ok: input.ok,
    found: input.found,
    error: input.error ?? null,
    leadId: input.lead?.id ?? null,
    name: input.lead?.responsible_name ?? null,
    responsibleName: input.lead?.responsible_name ?? null,
    organizationName: input.lead?.organization_name ?? null,
    email: input.lead?.email ?? null,
    whatsapp: input.lead?.whatsapp ?? null,
    status,
    statusLabel: CORRENTE_LEAD_STATUS_LABELS[status] ?? status,
    accessSent: Boolean(input.lead?.access_sent_at),
    accessEmail,
    loginUrl: input.loginUrl,
    leadFormUrl: input.leadFormUrl,

    // Campo principal para mapear no BotConversa.
    botconversaMessage: input.botconversaMessage,

    // Alias mantido para compatibilidade com versões anteriores do fluxo.
    botconversaReply: input.botconversaMessage,

    orientation: {
      headline: input.found ? "Acesso inicial localizado" : "Cadastro não localizado automaticamente",
      steps: input.found
        ? [
            "Entrar no link de acesso.",
            "Usar o e-mail cadastrado.",
            "Completar dados da organização.",
            "Configurar Pix, valores, funções e contribuintes.",
            "Fazer uma contribuição de teste antes de liberar para todos.",
          ]
        : [
            "Manter o atendimento pelo WhatsApp.",
            "Aguardar conferência da equipe da Automação Extrema.",
            "Reenviar o cadastro pelo site apenas se solicitado.",
          ],
    },
  };
}

async function findLead(input: { leadId: string; email: string; whatsapp: string }) {
  const select = "id, responsible_name, organization_name, email, whatsapp, status, access_sent_at, access_user_email";

  if (input.leadId) {
    const { data, error } = await supabaseAdmin.from("ced_leads").select(select).eq("id", input.leadId).maybeSingle();
    if (error) throw error;
    return data as LeadRow | null;
  }

  const variants = phoneVariants(input.whatsapp);
  if (variants.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("ced_leads")
      .select(select)
      .in("whatsapp", variants)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as LeadRow;
  }

  if (input.email) {
    const { data, error } = await supabaseAdmin
      .from("ced_leads")
      .select(select)
      .eq("email", input.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as LeadRow | null;
  }

  return null;
}

export async function GET() {
  const baseUrl = siteUrl();
  return NextResponse.json({
    ok: true,
    service: "corrente-em-dia-leads-lookup",
    method: "POST",
    expectedBody: {
      whatsapp: "5519999999999",
      leadId: "opcional",
      email: "opcional",
      source: "botconversa_ced_site",
    },
    loginUrl: `${baseUrl}/solucoes/corrente-em-dia/login`,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LookupRequest;
  const email = asText(body.email).toLowerCase();
  const whatsapp = digits(asText(body.whatsapp));
  const leadId = asText(body.leadId);
  const baseUrl = siteUrl();
  const leadFormUrl = `${baseUrl}/solucoes/corrente-em-dia/quero-conhecer`;
  const loginUrl = `${baseUrl}/solucoes/corrente-em-dia/login`;

  // O teste do BotConversa muitas vezes envia variáveis literais, como {{telefone}}.
  // Neste caso, retornamos 200 para permitir mapeamento de resposta sem quebrar o bloco.
  if (!email && !whatsapp && !leadId) {
    const botconversaMessage = buildFallbackMessage({ leadFormUrl });
    return NextResponse.json(
      responsePayload({
        ok: true,
        found: false,
        botconversaMessage,
        lead: null,
        loginUrl,
        leadFormUrl,
        error: "Nenhum identificador válido recebido. No teste do BotConversa, isso pode acontecer se a variável ainda não tiver valor real.",
      }),
    );
  }

  try {
    const lead = await findLead({ leadId, email, whatsapp });

    if (!lead) {
      const botconversaMessage = buildFallbackMessage({ leadFormUrl });
      return NextResponse.json(
        responsePayload({
          ok: true,
          found: false,
          botconversaMessage,
          lead: null,
          loginUrl,
          leadFormUrl,
          error: "Lead não localizado para os dados recebidos.",
        }),
      );
    }

    const accessEmail = lead.access_user_email ?? lead.email;
    const botconversaMessage = buildSuccessMessage({ name: lead.responsible_name, loginUrl, accessEmail });

    return NextResponse.json(
      responsePayload({
        ok: true,
        found: true,
        botconversaMessage,
        lead,
        loginUrl,
        leadFormUrl,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao consultar lead.";
    const botconversaMessage = buildFallbackMessage({ leadFormUrl });

    // Mantém HTTP 200 para o BotConversa seguir o fluxo e exibir a mensagem de contingência.
    return NextResponse.json(
      responsePayload({
        ok: false,
        found: false,
        botconversaMessage,
        lead: null,
        loginUrl,
        leadFormUrl,
        error: message,
      }),
    );
  }
}
