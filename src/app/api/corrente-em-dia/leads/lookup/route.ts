import { NextResponse } from "next/server";
import { CORRENTE_LEAD_STATUS_LABELS, CorrenteLeadStatus } from "@/lib/corrente-em-dia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; whatsapp?: string; leadId?: string };
  const email = asText(body.email).toLowerCase();
  const whatsapp = digits(asText(body.whatsapp));
  const leadId = asText(body.leadId);

  if (!email && !whatsapp && !leadId) {
    return NextResponse.json({ ok: false, error: "Informe e-mail, WhatsApp ou código do lead." }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("ced_leads")
    .select("id, responsible_name, organization_name, email, whatsapp, status, access_sent_at, access_user_email")
    .order("created_at", { ascending: false })
    .limit(1);

  if (leadId) {
    query = query.eq("id", leadId);
  } else if (email) {
    query = query.eq("email", email);
  } else {
    query = query.eq("whatsapp", whatsapp);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (!data) {
    return NextResponse.json({
      ok: false,
      found: false,
      message: "Não localizei esse cadastro no Corrente em Dia. O caminho mais rápido é preencher novamente o Quero Conhecer.",
      leadFormUrl: `${siteUrl()}/solucoes/corrente-em-dia/quero-conhecer`,
    });
  }

  const status = data.status as CorrenteLeadStatus;
  return NextResponse.json({
    ok: true,
    found: true,
    leadId: data.id,
    responsibleName: data.responsible_name,
    organizationName: data.organization_name,
    email: data.email,
    whatsapp: data.whatsapp,
    status,
    statusLabel: CORRENTE_LEAD_STATUS_LABELS[status] ?? status,
    accessSent: Boolean(data.access_sent_at),
    accessEmail: data.access_user_email ?? data.email,
    loginUrl: `${siteUrl()}/solucoes/corrente-em-dia/login`,
    message: "Localizei seu cadastro. O acesso foi enviado por e-mail; se não encontrar, confira spam/lixo eletrônico ou use Esqueci minha senha na tela de login.",
  });
}
