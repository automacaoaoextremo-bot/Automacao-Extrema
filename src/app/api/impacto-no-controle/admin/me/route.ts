import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";

export async function GET(request: Request) {
  try {
    const { supabase, appUser } = await requireAdminFromRequest(request);
    let client = null;
    if (appUser.client_id) {
      const { data } = await supabase.from("inc_clients").select("id,name,slug,logo_url,primary_color,secondary_color").eq("id", appUser.client_id).maybeSingle();
      client = data;
    }
    return NextResponse.json({ user: appUser, client });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }
}
