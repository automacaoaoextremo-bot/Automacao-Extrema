import { NextRequest, NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LU_BUCKET, LU_PROJECT } from "@/lib/education/lu-storage";

export const dynamic = "force-dynamic";

/** Exclusão definitiva: nunca apaga versão escolhida. Exige confirmação na interface. */
export async function POST(request: NextRequest) {
  if (!(await hasLuAdminAccess())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  try {
    const payload: unknown = await request.json();
    const id = (payload as { id?: unknown })?.id;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
      return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });

    const { data, error } = await supabaseAdmin.from("ae_education_audio_versions")
      .select("id,storage_path,is_selected,status")
      .eq("id", id).eq("project_slug", LU_PROJECT).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Gravação não encontrada" }, { status: 404 });
    if (data.is_selected) return NextResponse.json({ error: "Escolha outra versão antes de excluir a gravação atual." }, { status: 409 });
    if (!data.storage_path.startsWith(`projects/${LU_PROJECT}/songs/`))
      return NextResponse.json({ error: "Caminho de armazenamento inválido" }, { status: 400 });

    // Não retirar metadados se a remoção física do objeto falhar.
    const { error: storageError } = await supabaseAdmin.storage.from(LU_BUCKET).remove([data.storage_path]);
    if (storageError) throw storageError;
    const { error: deleteError } = await supabaseAdmin.from("ae_education_audio_versions")
      .delete().eq("id", id).eq("project_slug", LU_PROJECT).eq("is_selected", false);
    if (deleteError) throw deleteError;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Falha ao excluir. Verifique o armazenamento e tente novamente; se persistir, procure o administrador." }, { status: 500 });
  }
}
