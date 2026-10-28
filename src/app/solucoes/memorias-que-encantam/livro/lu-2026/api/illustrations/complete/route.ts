import { NextRequest, NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LU_IMAGE_BUCKET } from "@/lib/education/lu-illustrations";
import { LU_PROJECT } from "@/lib/education/lu-storage";

export async function POST(req: NextRequest) {
  if (!(await hasLuAdminAccess())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  try {
    const payload: unknown = await req.json();
    const id = (payload as { id?: unknown })?.id;
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("ae_education_illustration_versions")
      .select("storage_path,status").eq("project_slug", LU_PROJECT).eq("id", id).maybeSingle();
    if (error || !data || data.status !== "pending" || !data.storage_path.startsWith(`projects/${LU_PROJECT}/illustrations/`)) return NextResponse.json({ error: "Envio não encontrado" }, { status: 404 });
    const directory = data.storage_path.slice(0, data.storage_path.lastIndexOf("/"));
    const filename = data.storage_path.slice(data.storage_path.lastIndexOf("/") + 1);
    const { data: files, error: listError } = await supabaseAdmin.storage.from(LU_IMAGE_BUCKET).list(directory, { search: filename, limit: 20 });
    if (listError || !files?.some((file) => file.name === filename)) return NextResponse.json({ error: "A imagem ainda não foi recebida" }, { status: 409 });
    const { error: updateError } = await supabaseAdmin.from("ae_education_illustration_versions")
      .update({ status: "available" }).eq("project_slug", LU_PROJECT).eq("id", id).eq("status", "pending");
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Falha ao confirmar a imagem" }, { status: 500 }); }
}
