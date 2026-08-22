import { NextResponse } from "next/server";
import { sendAcervoMovementNotifications } from "@/lib/organizacao-em-harmonia/acervo-vivo-notifications";
import { record } from "@/lib/organizacao-em-harmonia/acervo-vivo";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_MS = 86_400_000;

function isAuthorized(request: Request) {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-cron-secret") ||
    new URL(request.url).searchParams.get("token") ||
    "";
  const expected = process.env.CRON_SECRET || process.env.OH_REMINDER_CRON_SECRET || "";
  return Boolean(expected && token && token === expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const now = new Date();
  const { data: settingsRows, error: settingsError } = await supabaseAdmin
    .from("oh_acervo_settings")
    .select("organization_id,metadata");
  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const results: Array<{ loanId: string; sent: boolean; reason?: string }> = [];

  for (const settings of settingsRows ?? []) {
    const metadata = record(settings.metadata);
    const reminderDays = Math.max(0, Math.min(30, Number(metadata.loan_reminder_days_before_due ?? 3) || 0));
    if (reminderDays <= 0) continue;

    const until = new Date(now.getTime() + reminderDays * DAY_MS);
    const { data: loans, error: loansError } = await supabaseAdmin
      .from("oh_acervo_loans")
      .select("id,organization_id,person_id,copy_id,due_at,metadata")
      .eq("organization_id", settings.organization_id)
      .eq("status", "ativo")
      .is("returned_at", null)
      .gt("due_at", now.toISOString())
      .lte("due_at", until.toISOString())
      .limit(100);
    if (loansError) {
      results.push({ loanId: `org:${settings.organization_id}`, sent: false, reason: loansError.message });
      continue;
    }

    for (const loan of loans ?? []) {
      const loanMetadata = record(loan.metadata);
      if (loanMetadata.reminder_sent_for_due_at === loan.due_at) {
        continue;
      }

      const { data: copy, error: copyError } = await supabaseAdmin
        .from("oh_acervo_copies")
        .select("title_id")
        .eq("organization_id", loan.organization_id)
        .eq("id", loan.copy_id)
        .maybeSingle();
      if (copyError || !copy?.title_id) {
        results.push({ loanId: loan.id, sent: false, reason: copyError?.message || "Exemplar não localizado." });
        continue;
      }

      try {
        const notification = await sendAcervoMovementNotifications({
          organizationId: loan.organization_id,
          personId: loan.person_id,
          titleId: copy.title_id,
          copyId: loan.copy_id,
          kind: "lembrete_devolucao",
          dueAt: loan.due_at,
        });

        if (notification.sent) {
          await supabaseAdmin
            .from("oh_acervo_loans")
            .update({
              metadata: {
                ...loanMetadata,
                reminder_sent_at: now.toISOString(),
                reminder_sent_for_due_at: loan.due_at,
              },
              updated_at: now.toISOString(),
            })
            .eq("organization_id", loan.organization_id)
            .eq("id", loan.id);
        }

        results.push({
          loanId: loan.id,
          sent: notification.sent,
          reason: "reason" in notification ? notification.reason : undefined,
        });
      } catch (error) {
        results.push({
          loanId: loan.id,
          sent: false,
          reason: error instanceof Error ? error.message : "Erro ao enviar lembrete.",
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    total: results.length,
    sent: results.filter((item) => item.sent).length,
    results,
  });
}
