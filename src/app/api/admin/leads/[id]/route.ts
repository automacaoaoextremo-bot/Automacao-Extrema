import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  const [{ data: lead, error: leadError }, { data: answers }, { data: matches }, { data: followups }] = await Promise.all([
    supabaseAdmin
      .from("ae_leads")
      .select("*, ae_solutions(name, slug)")
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("ae_lead_answers")
      .select("id, question_key, question_text, answer, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("ae_solution_matches")
      .select("id, score, reason, ae_solutions(id, name, slug)")
      .eq("lead_id", id)
      .order("score", { ascending: false }),
    supabaseAdmin
      .from("ae_lead_followups")
      .select("id, kind, channel, status, scheduled_at, sent_at, notes, created_at")
      .eq("lead_id", id)
      .order("scheduled_at", { ascending: true }),
  ]);

  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });
  return NextResponse.json({ lead, answers: answers ?? [], matches: matches ?? [], followups: followups ?? [] });
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("ae_leads")
    .update({
      status: body.status,
      funnel_stage: body.funnel_stage,
      notes: body.notes,
      next_action_at: body.next_action_at || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
