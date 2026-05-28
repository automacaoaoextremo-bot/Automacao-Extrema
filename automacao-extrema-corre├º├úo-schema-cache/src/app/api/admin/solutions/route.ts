import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("ae_solutions")
    .select("id, name, slug, short_description, target_audience, main_pains, current_status, stage, priority, source_file, is_active, created_at, updated_at")
    .order("priority", { ascending: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ solutions: data ?? [] });
}
