import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { CorrenteLeadStatus } from "@/lib/corrente-em-dia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type UpdateBody = {
  id?: string;
  status?: CorrenteLeadStatus;
  accessSent?: boolean;
  notes?: string;
};

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("ced_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const leads = (data ?? []).map((lead) => {
    const accessDueAt = lead.access_due_at ? new Date(lead.access_due_at).getTime() : null;
    const internalAlertAt = lead.internal_alert_at ? new Date(lead.internal_alert_at).getTime() : null;
    return {
      ...lead,
      is_access_overdue: Boolean(!lead.access_sent_at && accessDueAt && accessDueAt < now),
      needs_internal_alert: Boolean(!lead.access_sent_at && !lead.internal_alert_sent_at && internalAlertAt && internalAlertAt < now),
    };
  });

  return NextResponse.json({ leads });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as UpdateBody;
  if (!body.id) return NextResponse.json({ error: "ID do lead não informado." }, { status: 400 });

  const payload: Record<string, string | null> = {};
  if (body.status) payload.status = body.status;
  if (typeof body.notes === "string") payload.notes = body.notes;
  if (body.accessSent) {
    payload.access_sent_at = new Date().toISOString();
    payload.status = body.status ?? "email_acesso_enviado";
  }

  const { data, error } = await supabaseAdmin
    .from("ced_leads")
    .update(payload)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
