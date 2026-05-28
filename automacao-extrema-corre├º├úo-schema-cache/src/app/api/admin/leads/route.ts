import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("ae_leads")
    .select("id, full_name, whatsapp, email, profile_type, main_area, main_pain, urgency, diagnostic_score, status, created_at, recommended_solution_id, ae_solutions(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}
