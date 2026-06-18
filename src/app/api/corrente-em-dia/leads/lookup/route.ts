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

function firstName(value: string | null | undefined) {
  return value?.trim().split(/\s+/)[0] || "tudo bem";
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
  } else if (whatsapp) {
    query = query.eq("whatsapp", whatsapp);
  } else {
    query = query.eq("email", email);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const baseUrl = siteUrl();
  const leadFormUrl = `${baseUrl}/solucoes/corrente-em-dia/quero-conhecer`;
  const loginUrl = `${baseUrl}/solucoes/corrente-em-dia/login`;

  if (!data) {
    return NextResponse.json({
      ok: false,
      found: false,
      leadFormUrl,
      supportMessage:
        "Não localizei seu cadastro automaticamente agora. Vou sinalizar para a equipe da Automação Extrema verificar seu acesso e continuar por aqui.",
      botconversaReply:
        "Não localizei seu cadastro automaticamente agora. Vou sinalizar para a equipe da Automação Extrema verificar seu acesso e continuar por aqui. Se preferir, você também pode preencher novamente o Quero Conhecer pelo site.",
    });
  }

  const status = data.status as CorrenteLeadStatus;
  const accessEmail = data.access_user_email ?? data.email;
  const name = data.responsible_name ?? "";
  const greeting = firstName(name);
  const botconversaReply = [
    `Pronto, ${greeting}. Localizei seu cadastro no Corrente em Dia.`,
    "",
    "Seu acesso inicial já foi preparado para você começar a configuração da organização.",
    "",
    `Link de acesso: ${loginUrl}`,
    `E-mail usado no cadastro: ${accessEmail ?? "não informado"}`,
    "",
    "As orientações também foram enviadas para esse e-mail. Se não encontrar, confira spam/lixo eletrônico. Se já tiver senha, use sua senha atual. Se não lembrar, clique em Esqueci minha senha na tela de login.",
    "",
    "Próximo passo: entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.",
    "",
    "Se tiver qualquer dificuldade, responda AJUDA por aqui.",
  ].join("\n");

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
    accessEmail,
    loginUrl,
    leadFormUrl,
    botconversaReply,
    orientation: {
      headline: "Acesso inicial localizado",
      steps: [
        "Entrar no link de acesso.",
        "Usar o e-mail cadastrado.",
        "Completar dados da organização.",
        "Configurar Pix, valores, funções e contribuintes.",
        "Fazer uma contribuição de teste antes de liberar para todos.",
      ],
    },
    message:
      "Localizei seu cadastro. O acesso foi preparado e as orientações foram enviadas por e-mail. Use o WhatsApp para continuar o atendimento e tirar dúvidas.",
  });
}
