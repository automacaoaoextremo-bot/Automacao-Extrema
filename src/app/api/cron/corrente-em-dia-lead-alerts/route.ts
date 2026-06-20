import { NextResponse } from "next/server";
import { sendCorrenteLeadPendingAlertEmail } from "@/lib/mail";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  organization_name: string;
  responsible_name: string;
  email: string | null;
  whatsapp: string | null;
  status: string;
  access_due_at: string | null;
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

export async function GET(request: Request) {
  return handleAlert(request);
}

export async function POST(request: Request) {
  return handleAlert(request);
}

async function handleAlert(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const token = new URL(request.url).searchParams.get("token");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && token !== cronSecret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const now = new Date().toISOString();
  const funilUrl = `${siteUrl()}/admin/ae/corrente-em-dia/funil`;

  const { data, error } = await supabaseAdmin
    .from("ced_leads")
    .select("id, organization_name, responsible_name, email, whatsapp, status, access_due_at")
    .is("internal_alert_sent_at", null)
    .lte("internal_alert_at", now)
    .or("access_sent_at.is.null,status.eq.aguardando_primeiro_acesso")
    .order("internal_alert_at", { ascending: true })
    .limit(25)
    .returns<LeadRow[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ id: string; sent: boolean; reason: string }> = [];

  for (const lead of data ?? []) {
    const result = await sendCorrenteLeadPendingAlertEmail({
      leadId: lead.id,
      responsibleName: lead.responsible_name,
      organizationName: lead.organization_name,
      email: lead.email,
      whatsapp: lead.whatsapp,
      status: lead.status,
      accessDueAt: lead.access_due_at,
      funilUrl,
    });

    if (result.sent) {
      await supabaseAdmin
        .from("ced_leads")
        .update({ internal_alert_sent_at: new Date().toISOString() })
        .eq("id", lead.id);
    }

    results.push({ id: lead.id, sent: result.sent, reason: result.reason });
  }

  return NextResponse.json({ ok: true, checked: data?.length ?? 0, results });
}
