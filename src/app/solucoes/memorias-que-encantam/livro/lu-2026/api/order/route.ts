import { NextRequest, NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { LU_PROJECT } from "@/lib/education/lu-storage";
import { sanitizeLuOrder } from "@/lib/education/lu-track-order";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  if (!(await hasLuAdminAccess())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  }
  try {
    const body: unknown = await request.json();
    const incoming = body as { order?: unknown };
    const order = sanitizeLuOrder(incoming?.order);
    const records = order.map((track_id, index) => ({
      project_slug: LU_PROJECT, track_id, sort_order: index + 1,
    }));
    const { error } = await supabaseAdmin.from("ae_education_track_order")
      .upsert(records, { onConflict: "project_slug,track_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true, order }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao salvar a ordem" }, { status: 400 });
  }
}
