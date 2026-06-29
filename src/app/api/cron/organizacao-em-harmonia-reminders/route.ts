import { NextResponse } from "next/server";
import { sendOrganizacaoHarmoniaImplantationReminderEmail } from "@/lib/mail";
import { moduleInfo, normalizeOrganizacaoModulo } from "@/lib/organizacao-em-harmonia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.OH_REMINDER_CRON_SECRET || process.env.CRON_SECRET;
  return Boolean(expected && token && token === expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const now = new Date().toISOString();
  const baseUrl = siteUrl();
  const funilUrl = `${baseUrl}/admin/ae/organizacao-em-harmonia`;
  const loginUrl = `${baseUrl}/solucoes/organizacao-em-harmonia`;

  const { data: leads, error } = await supabaseAdmin
    .from("oh_leads")
    .select("id, contact_name, email, whatsapp, interest_module, priority_module, implantation_due_at, next_reminder_at, last_reminder_sent_at, status")
    .not("next_reminder_at", "is", null)
    .lte("next_reminder_at", now)
    .is("last_reminder_sent_at", null)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const lead of leads ?? []) {
    const moduleName = moduleInfo(normalizeOrganizacaoModulo(lead.interest_module)).name;
    const priorityModuleName = moduleInfo(normalizeOrganizacaoModulo(lead.priority_module)).name;
    const emailResult = await sendOrganizacaoHarmoniaImplantationReminderEmail({
      leadId: lead.id,
      contactName: lead.contact_name,
      email: lead.email,
      whatsapp: lead.whatsapp,
      moduleName,
      priorityModuleName,
      implantationDueAt: lead.implantation_due_at,
      funilUrl,
      loginUrl,
    });

    if (emailResult.sent) {
      await supabaseAdmin
        .from("oh_leads")
        .update({ last_reminder_sent_at: now, next_reminder_at: null })
        .eq("id", lead.id);
    }

    results.push({ leadId: lead.id, sent: emailResult.sent, reason: emailResult.reason });
  }

  return NextResponse.json({ ok: true, checkedAt: now, total: results.length, results });
}
