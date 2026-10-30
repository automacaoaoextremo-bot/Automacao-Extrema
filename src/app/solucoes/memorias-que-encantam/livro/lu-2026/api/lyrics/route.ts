import { NextRequest, NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { LU_PROJECT, songValid } from "@/lib/education/lu-storage";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await hasLuAdminAccess())) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "Conteudo invalido" }, { status: 415 });
  }
  try {
    const body = await request.json() as { trackId?: unknown; lyrics?: unknown; isPublished?: unknown };
    if (typeof body.trackId !== "string" || !songValid(body.trackId) ||
        typeof body.lyrics !== "string" || body.lyrics.length > 8000 ||
        typeof body.isPublished !== "boolean") {
      return NextResponse.json({ error: "Dados da letra invalidos (maximo de 8000 caracteres)." }, { status: 400 });
    }
    const text = body.lyrics.replace(/\r\n?/g, "\n").trim();
    if (body.isPublished && !text) {
      return NextResponse.json({ error: "Informe a letra antes de publicar." }, { status: 400 });
    }
    // A escola decide sobre os direitos da letra antes de marcar como publicada.
    const { error } = await supabaseAdmin.from("ae_education_track_lyrics").upsert({
      project_slug: LU_PROJECT,
      track_id: body.trackId,
      body: text,
      is_published: body.isPublished,
      updated_at: new Date().toISOString(),
    }, { onConflict: "project_slug,track_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel salvar a letra. Confira a migracao V10." }, { status: 500 });
  }
}
