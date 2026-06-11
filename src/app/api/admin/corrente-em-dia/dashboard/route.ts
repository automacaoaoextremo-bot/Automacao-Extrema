import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const [dashboard, organizations, clientTerms] = await Promise.all([
    supabaseAdmin
      .from("ced_v_dashboard_month")
      .select("*")
      .order("reference_month", { ascending: false })
      .order("organization_name", { ascending: true }),
    supabaseAdmin
      .from("ced_organizations")
      .select("id, organization_type, name, slug, email, whatsapp, city, state, pix_key, pix_receiver_name, default_individual_amount, default_family_amount, contribution_due_day, contribution_due_mode, public_headline, deep_dive_text, public_status, is_demo")
      .order("organization_type", { ascending: true })
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("ced_v_client_terms_summary")
      .select("*")
      .eq("is_active", true)
      .order("organization_name", { ascending: true }),
  ]);

  const firstError = dashboard.error || organizations.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({ dashboard: dashboard.data ?? [], organizations: organizations.data ?? [], clientTerms: clientTerms.error ? [] : clientTerms.data ?? [] });
}
