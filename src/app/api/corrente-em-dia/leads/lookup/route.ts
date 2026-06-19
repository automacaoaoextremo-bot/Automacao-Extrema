import { NextResponse } from "next/server";
import { CORRENTE_LEAD_STATUS_LABELS, type CorrenteLeadStatus } from "@/lib/corrente-em-dia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type LookupRequest = {
  email?: string;
  whatsapp?: string;
  leadId?: string;
  source?: string;
  message?: string;
  mensagem?: string;
  texto?: string;
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
  created_at?: string | null;
};

type PhoneCandidates = {
  raw: string;
  digits: string;
  withoutBrazilCode: string;
  last11: string;
  candidates: string[];
};

const LEAD_SELECT =
  "id, responsible_name, organization_name, email, whatsapp, status, access_sent_at, access_user_email, created_at";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeEmail(value: string | null | undefined) {
  return asText(value).toLowerCase();
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

function firstName(value: string | null | undefined) {
  return value?.trim().split(/\s+/)[0] || "tudo bem";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function lastDigits(value: string, size: number) {
  return value.length > size ? value.slice(-size) : value;
}

function isBotconversaLiteral(value: string | null | undefined) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;

  return (
    text.includes("{telefone}") ||
    text.includes("{{telefone}}") ||
    text.includes("contact.phone") ||
    text.includes("phone") ||
    text.includes("whatsapp")
  );
}

function buildPhoneCandidates(rawWhatsapp: string | null | undefined): PhoneCandidates {
  const raw = String(rawWhatsapp ?? "").trim();
  const digits = onlyDigits(raw);

  if (!digits || isBotconversaLiteral(raw)) {
    return {
      raw,
      digits: "",
      withoutBrazilCode: "",
      last11: "",
      candidates: [],
    };
  }

  const withoutBrazilCode = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const last11 = lastDigits(digits, 11);
  const last10 = lastDigits(digits, 10);

  const candidates = unique([
    digits,
    withoutBrazilCode,
    last11,
    last10,
    `55${withoutBrazilCode}`,
    `55${last11}`,
    `55${last10}`,
  ]);

  return {
    raw,
    digits,
    withoutBrazilCode,
    last11,
    candidates,
  };
}

function extractEmailFromText(value: string | null | undefined) {
  const text = String(value ?? "");
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? "";
}

function extractLeadIdFromText(value: string | null | undefined) {
  const text = String(value ?? "");
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match?.[0] ?? "";
}

function normalizePhoneForCompare(value: string | null | undefined) {
  const phone = buildPhoneCandidates(value);
  return phone.last11 || phone.withoutBrazilCode || phone.digits;
}

function phoneMatchesCandidate(storedWhatsapp: string | null | undefined, phone: PhoneCandidates) {
  if (!phone.candidates.length) return false;

  const storedDigits = onlyDigits(storedWhatsapp);
  if (!storedDigits) return false;

  const storedWithoutBrazilCode = storedDigits.startsWith("55") && storedDigits.length > 11 ? storedDigits.slice(2) : storedDigits;
  const storedLast11 = lastDigits(storedDigits, 11);

  return (
    phone.candidates.includes(storedDigits) ||
    phone.candidates.includes(storedWithoutBrazilCode) ||
    phone.candidates.includes(storedLast11) ||
    Boolean(phone.last11 && storedLast11 === phone.last11) ||
    Boolean(phone.withoutBrazilCode && storedWithoutBrazilCode === phone.withoutBrazilCode)
  );
}

function buildFallbackMessage(loginUrl: string) {
  return [
    "Não consegui localizar automaticamente seu cadastro agora, mas seu atendimento ficou salvo por aqui.",
    "",
    "As orientações de acesso foram enviadas para o e-mail informado no formulário do Corrente em Dia.",
    "",
    "Acesse:",
    loginUrl,
    "",
    "Use o e-mail informado no cadastro. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.",
    "",
    "Se já tiver senha, use sua senha atual. Se não lembrar, clique em \"Esqueci minha senha\" na tela de login.",
    "",
    "Se precisar de ajuda, responda AJUDA por aqui.",
  ].join("\n");
}

function buildSuccessMessage(input: { name: string | null; loginUrl: string; accessEmail: string | null }) {
  const greeting = firstName(input.name);

  return [
    `Pronto, ${greeting}. Localizei seu cadastro no Corrente em Dia.`,
    "",
    "Seu acesso inicial já foi preparado para você começar a configuração da organização.",
    "",
    "Link de acesso:",
    input.loginUrl,
    "",
    "E-mail usado no cadastro:",
    input.accessEmail ?? "não informado",
    "",
    "As orientações também foram enviadas para esse e-mail. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.",
    "",
    "Se já tiver senha, use sua senha atual. Se não lembrar, clique em \"Esqueci minha senha\" na tela de login.",
    "",
    "Próximo passo:",
    "entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.",
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
  lookupBy?: string;
}) {
  const status = (input.lead?.status ?? (input.found ? "localizado" : "cadastro_nao_localizado_whatsapp")) as CorrenteLeadStatus;
  const accessEmail = input.lead?.access_user_email ?? input.lead?.email ?? null;

  return {
    ok: input.ok,
    found: input.found,
    error: input.error ?? null,
    lookupBy: input.lookupBy ?? null,
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
            "Se não encontrar o e-mail de acesso, conferir spam/lixo eletrônico.",
            "Completar dados da organização.",
            "Configurar Pix, valores, funções e contribuintes.",
            "Fazer uma contribuição de teste antes de liberar para todos.",
          ]
        : [
            "Acessar o login do Corrente em Dia.",
            "Usar o e-mail informado no cadastro.",
            "Conferir spam/lixo eletrônico se não encontrar o e-mail de acesso.",
            "Usar Esqueci minha senha se necessário.",
            "Responder AJUDA no WhatsApp se precisar de acompanhamento.",
          ],
    },
  };
}

async function findLeadByLeadId(leadId: string) {
  if (!leadId) return null;

  const { data, error } = await supabaseAdmin.from("ced_leads").select(LEAD_SELECT).eq("id", leadId).maybeSingle();
  if (error) throw error;
  return data as LeadRow | null;
}

async function findLeadByEmail(email: string) {
  if (!email) return null;

  const { data, error } = await supabaseAdmin
    .from("ced_leads")
    .select(LEAD_SELECT)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as LeadRow | null;
}

async function findLeadByWhatsapp(rawWhatsapp: string | null | undefined) {
  const phone = buildPhoneCandidates(rawWhatsapp);

  if (phone.candidates.length === 0) {
    return null;
  }

  const { data: exactLead, error: exactError } = await supabaseAdmin
    .from("ced_leads")
    .select(LEAD_SELECT)
    .in("whatsapp", phone.candidates)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exactError) throw exactError;
  if (exactLead) return exactLead as LeadRow;

  if (phone.last11) {
    const { data: suffixLead, error: suffixError } = await supabaseAdmin
      .from("ced_leads")
      .select(LEAD_SELECT)
      .ilike("whatsapp", `%${phone.last11}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (suffixError) throw suffixError;
    if (suffixLead) return suffixLead as LeadRow;
  }

  // Fallback final: busca os leads mais recentes e compara telefones normalizados em JS.
  // Isso cobre números salvos com máscara, espaços, parênteses ou +55.
  const { data: recentLeads, error: recentError } = await supabaseAdmin
    .from("ced_leads")
    .select(LEAD_SELECT)
    .not("whatsapp", "is", null)
    .order("created_at", { ascending: false })
    .limit(250);

  if (recentError) throw recentError;

  return ((recentLeads ?? []) as LeadRow[]).find((lead) => phoneMatchesCandidate(lead.whatsapp, phone)) ?? null;
}

async function findLead(input: { leadId: string; email: string; whatsapp: string }) {
  const byLeadId = await findLeadByLeadId(input.leadId);
  if (byLeadId) return { lead: byLeadId, lookupBy: "leadId" };

  const byEmail = await findLeadByEmail(input.email);
  if (byEmail) return { lead: byEmail, lookupBy: "email" };

  const byWhatsapp = await findLeadByWhatsapp(input.whatsapp);
  if (byWhatsapp) return { lead: byWhatsapp, lookupBy: "whatsapp" };

  return { lead: null, lookupBy: "not_found" };
}

export async function GET() {
  const baseUrl = siteUrl();
  return NextResponse.json({
    ok: true,
    service: "corrente-em-dia-leads-lookup",
    method: "POST",
    expectedBody: {
      whatsapp: "{telefone}",
      leadId: "opcional",
      email: "opcional",
      message: "opcional; se disponível no BotConversa, pode conter o texto recebido",
      source: "botconversa_ced_site",
    },
    lookupOrder: ["leadId", "email", "whatsapp flexível", "fallback amigável"],
    loginUrl: `${baseUrl}/solucoes/corrente-em-dia/login`,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LookupRequest;
  const messageText = asText(body.message ?? body.mensagem ?? body.texto);
  const email = normalizeEmail(body.email) || extractEmailFromText(messageText);
  const whatsapp = asText(body.whatsapp);
  const leadId = asText(body.leadId) || extractLeadIdFromText(messageText);
  const baseUrl = siteUrl();
  const leadFormUrl = `${baseUrl}/solucoes/corrente-em-dia/quero-conhecer`;
  const loginUrl = `${baseUrl}/solucoes/corrente-em-dia/login`;

  // O teste do BotConversa pode enviar variáveis literais, como {telefone}.
  // Neste caso, retornamos 200 para permitir mapeamento de resposta sem quebrar o bloco.
  if (!email && !leadId && buildPhoneCandidates(whatsapp).candidates.length === 0) {
    const botconversaMessage = buildFallbackMessage(loginUrl);
    return NextResponse.json(
      responsePayload({
        ok: true,
        found: false,
        botconversaMessage,
        lead: null,
        loginUrl,
        leadFormUrl,
        lookupBy: "fallback_sem_identificador_valido",
        error:
          "Nenhum identificador válido recebido. No teste do BotConversa, isso pode acontecer se a variável ainda não tiver valor real.",
      }),
    );
  }

  try {
    const { lead, lookupBy } = await findLead({ leadId, email, whatsapp });

    if (!lead) {
      const botconversaMessage = buildFallbackMessage(loginUrl);
      return NextResponse.json(
        responsePayload({
          ok: true,
          found: false,
          botconversaMessage,
          lead: null,
          loginUrl,
          leadFormUrl,
          lookupBy,
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
        lookupBy,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao consultar lead.";
    const botconversaMessage = buildFallbackMessage(loginUrl);

    // Mantém HTTP 200 para o BotConversa seguir o fluxo e exibir a mensagem de contingência.
    return NextResponse.json(
      responsePayload({
        ok: false,
        found: false,
        botconversaMessage,
        lead: null,
        loginUrl,
        leadFormUrl,
        lookupBy: "error",
        error: message,
      }),
    );
  }
}
