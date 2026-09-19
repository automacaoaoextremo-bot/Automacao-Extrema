import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";

export async function GET(request: Request) {
  try {
    const { supabase, appUser } = await requireAdminFromRequest(request);
    if (appUser.role !== "owner") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

    const { data, error } = await supabase
      .from("inc_clients")
      .select("id,name,slug,logo_url,primary_color,secondary_color,pix_key,responsible_name,responsible_email,responsible_whatsapp,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ clients: data || [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao carregar clientes." }, { status: 500 });
  }
}
