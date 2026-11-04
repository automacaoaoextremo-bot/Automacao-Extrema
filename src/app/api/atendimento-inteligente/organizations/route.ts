import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aeScope, safeError } from "@/lib/atendimento-inteligente/security";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const scope = await aeScope(request);
    if (!scope) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    if (!scope.platformAdmin && scope.organizationIds.length === 0) return NextResponse.json({ organizations: [] });
    let query = supabaseAdmin.from("ae_ai_organizations")
      .select("id,slug,name,segment,status,automation_enabled,website")
      .order("name", { ascending: true });
    if (!scope.platformAdmin) query = query.in("id", scope.organizationIds);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ organizations: data ?? [], platformAdmin: scope.platformAdmin });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
