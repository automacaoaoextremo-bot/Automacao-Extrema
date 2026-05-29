import { NextResponse } from "next/server";
import { sendFollowupAlertEmail } from "@/lib/mail";
import { FollowupKind } from "@/lib/followups";
import { supabaseAdmin } from "@/lib/supabase-admin";

type FollowupRow = {
  id: string;
  kind: FollowupKind;
  channel: string;
  status: string;
  scheduled_at: string;
  notes: string | null;
  lead_id: string;
  ae_leads?: {
    id: string;
    full_name: string | null;
    email: string | null;
    whatsapp: string | null;
    diagnostic_score: number;
    ae_solutions?: { name: string } | null;
  } | null;
};

const ALERT_MARKER = "[alerta_15min_enviado]";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const now = new Date();
  const from = new Date(now.getTime() + 14 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 16 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("ae_lead_followups")
    .select("id, kind, channel, status, scheduled_at, notes, lead_id, ae_leads(id, full_name, email, whatsapp, diagnostic_score, ae_solutions(name))")
    .eq("status", "pendente")
    .eq("channel", "whatsapp")
    .gte("scheduled_at", from)
    .lte("scheduled_at", to)
    .order("scheduled_at", { ascending: true })
    .limit(50)
    .returns<FollowupRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidates = (data ?? []).filter((item) => !item.notes?.includes(ALERT_MARKER));
  const results: Array<{ id: string; sent: boolean; reason: string }> = [];

  for (const followup of candidates) {
    const lead = followup.ae_leads;
    const result = await sendFollowupAlertEmail({
      leadId: followup.lead_id,
      leadName: lead?.full_name ?? null,
      leadEmail: lead?.email ?? null,
      leadWhatsapp: lead?.whatsapp ?? null,
      solutionName: lead?.ae_solutions?.name ?? null,
      diagnosticScore: lead?.diagnostic_score ?? 0,
      followupId: followup.id,
      followupKind: followup.kind,
      scheduledAt: followup.scheduled_at,
    });

    if (result.sent) {
      const notes = [followup.notes, ALERT_MARKER, result.reason].filter(Boolean).join("\n");
      await supabaseAdmin.from("ae_lead_followups").update({ notes }).eq("id", followup.id);
    }

    results.push({ id: followup.id, sent: result.sent, reason: result.reason });
  }

  return NextResponse.json({ ok: true, window: { from, to }, checked: data?.length ?? 0, alerted: results.length, results });
}
