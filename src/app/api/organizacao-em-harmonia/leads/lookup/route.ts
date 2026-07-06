import { NextResponse } from "next/server";
import { moduleInfo, normalizeOrganizacaoModulo } from "@/lib/organizacao-em-harmonia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function lastDigits(value: string, size: number) {
  return value.length > size ? value.slice(-size) : value;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function phoneCandidates(rawWhatsapp: string | null | undefined) {
  const digits = onlyDigits(rawWhatsapp);
  if (!digits || digits.includes("telefone")) return [];
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const last11 = lastDigits(digits, 11);
  return unique([digits, withoutCountry, last11, `55${withoutCountry}`, `55${last11}`]);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function firstName(value: string | null | undefined) {
  return String(value ?? "").trim().split(/\s+/)[0] || "tudo bem";
}

function buildMessage(lead: {
  id: string;
  contact_name: string | null;
  email: string | null;
  whatsapp: string | null;
  organization_name: string | null;
  interest_module: string | null;
}) {
  const selectedModule = moduleInfo(normalizeOrganizacaoModulo(lead.interest_module));
  const loginUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia`;

  return [
    `Pronto, ${firstName(lead.contact_name)}. Localizei seu cadastro da ${selectedModule.name}.`,
    "",
    "Seu interesse já está salvo para continuarmos a validação com a Automação Extrema.",
    "",
    "Link de referência:",
    loginUrl,
    "",
    "E-mail usado no cadastro:",
    lead.email ?? "não informado",
    "",
    "Também enviamos uma confirmação para esse e-mail. Se não encontrar, confira spam/lixo eletrônico.",
    "",
    "Dados localizados:",
    `Nome do contato: ${lead.contact_name ?? "não informado"}`,
    `WhatsApp: ${lead.whatsapp ?? "não informado"}`,
    lead.organization_name ? `Organização: ${lead.organization_name}` : "Organização: será confirmada na próxima etapa",
    `Interesse: ${selectedModule.name}`,
    `Código do lead: ${lead.id}`,
    "",
    "Se precisar de ajuda, responda AJUDA por aqui.",
  ].join("\n");
}

function fallbackMessage() {
  return [
    "Não consegui localizar automaticamente seu cadastro agora, mas seu atendimento ficou salvo por aqui.",
    "",
    "Se você preencheu o Quero Conhecer, confira também o e-mail informado no formulário. A confirmação pode estar em spam/lixo eletrônico.",
    "",
    "Link de referência:",
    `${siteUrl()}/solucoes/organizacao-em-harmonia`,
    "",
    "Se precisar de ajuda, responda AJUDA por aqui.",
  ].join("\n");
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "organizacao-em-harmonia-leads-lookup",
    method: "POST",
    expectedBody: {
      whatsapp: "5519999999999",
      leadId: "opcional",
      email: "opcional",
      source: "botconversa_oh_site",
    },
    loginUrl: `${siteUrl()}/solucoes/organizacao-em-harmonia`,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    whatsapp?: string;
    leadId?: string;
    email?: string;
    source?: string;
  };

  let lead = null;

  if (body.leadId) {
    const { data } = await supabaseAdmin
      .from("oh_leads")
      .select("id, contact_name, email, whatsapp, organization_name, interest_module")
      .eq("id", body.leadId)
      .maybeSingle();
    lead = data;
  }

  if (!lead && body.email) {
    const { data } = await supabaseAdmin
      .from("oh_leads")
      .select("id, contact_name, email, whatsapp, organization_name, interest_module")
      .ilike("email", body.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = data;
  }

  if (!lead) {
    const candidates = phoneCandidates(body.whatsapp);
    if (candidates.length > 0) {
      const { data: exactLead } = await supabaseAdmin
        .from("oh_leads")
        .select("id, contact_name, email, whatsapp, organization_name, interest_module")
        .in("whatsapp", candidates)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      lead = exactLead;

      if (!lead) {
        const last11 = lastDigits(onlyDigits(body.whatsapp), 11);
        const { data: partialLead } = await supabaseAdmin
          .from("oh_leads")
          .select("id, contact_name, email, whatsapp, organization_name, interest_module")
          .ilike("whatsapp", `%${last11}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        lead = partialLead;
      }
    }
  }

  const message = lead ? buildMessage(lead) : fallbackMessage();

  return NextResponse.json({
    ok: true,
    found: Boolean(lead),
    leadId: lead?.id ?? null,
    name: lead?.contact_name ?? null,
    email: lead?.email ?? null,
    whatsapp: lead?.whatsapp ?? null,
    loginUrl: `${siteUrl()}/solucoes/organizacao-em-harmonia`,
    botconversaMessage: message,
    botconversaReply: message,
  });
}
