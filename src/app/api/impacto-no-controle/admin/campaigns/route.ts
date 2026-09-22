import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";

export async function GET(request: Request) {
  try {
    const { supabase, appUser } = await requireAdminFromRequest(request);
    let query = supabase.from("inc_admin_campaigns_overview").select("*").order("created_at", { ascending: false });
    if (appUser.role !== "owner" && appUser.client_id) query = query.eq("client_id", appUser.client_id);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ campaigns: data || [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Acesso não autorizado ou erro ao carregar campanhas." }, { status: 401 });
  }
}
