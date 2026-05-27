import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const [{ data: leads }, { data: matches }, { data: followups }] = await Promise.all([
    supabaseAdmin
      .from("ae_leads")
      .select("id, full_name, whatsapp, email, main_area, main_pain, urgency, diagnostic_score, status, created_at, ae_solutions(name)")
      .order("diagnostic_score", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("ae_solution_matches")
      .select("score, ae_solutions(name, slug)")
      .order("score", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("ae_lead_followups")
      .select("id, kind, channel, status, scheduled_at, lead_id, ae_leads(full_name, whatsapp, email, diagnostic_score, ae_solutions(name))")
      .order("scheduled_at", { ascending: true })
      .limit(200),
  ]);

  return NextResponse.json({ leads: leads ?? [], matches: matches ?? [], followups: followups ?? [] });
}
