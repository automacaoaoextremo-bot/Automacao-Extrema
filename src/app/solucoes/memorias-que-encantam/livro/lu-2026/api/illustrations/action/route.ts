import { NextRequest, NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LU_IMAGE_BUCKET, songValid } from "@/lib/education/lu-illustrations";
import { getLuProject, LU_PROJECT } from "@/lib/education/lu-storage";

export const dynamic = "force-dynamic";
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(req: NextRequest) {
  if (!(await hasLuAdminAccess())) return fail("Não autorizado", 401);
  if (req.headers.get("origin") !== req.nextUrl.origin) return fail("Origem inválida", 403);
  try {
    const body: unknown = await req.json();
    const { id, action, trackId, confirmed } = (body || {}) as Record<string,unknown>;
    if (action === "release" || action === "unrelease") {
      if (confirmed !== true) return fail("Confirme a revisão da escola e dos dados pessoais", 400);
      const project = await getLuProject();
      if (action === "release" && !project.media_authorized) return fail("Liberação da escola pendente", 403);
      const { error } = await supabaseAdmin.from("ae_education_projects")
        .update({ illustrations_released: action === "release" }).eq("slug", LU_PROJECT);
      if (error) throw error;
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return fail("Identificador inválido", 400);
    if (typeof action !== "string" || !["feature","unfeature","publish","unpublish","hide","restore","delete","assign"].includes(action)) return fail("Ação inválida", 400);
    const { data: item, error: readError } = await supabaseAdmin.from("ae_education_illustration_versions")
      .select("id,track_id,storage_path,status,is_featured,is_published")
      .eq("project_slug", LU_PROJECT).eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!item) return fail("Imagem não localizada", 404);
    if (action === "feature") {
      if (item.status !== "available") return fail("Restaure a imagem antes de escolhê-la", 409);
      const { error } = await supabaseAdmin.rpc("ae_education_feature_illustration", { p_id: id });
      if (error) throw error;
    } else if (action === "unfeature") {
      const { error } = await supabaseAdmin.from("ae_education_illustration_versions")
        .update({ is_featured: false }).eq("project_slug", LU_PROJECT).eq("id", id);
      if (error) throw error;
    } else if (action === "delete") {
      if (item.is_featured || item.is_published) return fail("Retire a imagem da publicação e escolha outra principal antes de excluir", 409);
      if (!item.storage_path.startsWith(`projects/${LU_PROJECT}/illustrations/`)) return fail("Caminho inválido", 400);
      const { error: storageError } = await supabaseAdmin.storage.from(LU_IMAGE_BUCKET).remove([item.storage_path]);
      if (storageError) throw storageError;
      const { error } = await supabaseAdmin.from("ae_education_illustration_versions")
        .delete().eq("project_slug", LU_PROJECT).eq("id", id).eq("is_published", false).eq("is_featured", false);
      if (error) throw error;
    } else if (action === "assign") {
      if (typeof trackId !== "string" || !songValid(trackId)) return fail("Música inválida", 400);
      if (item.is_featured || item.is_published) return fail("Despublique e retire a seleção principal antes de trocar a música", 409);
      const { error } = await supabaseAdmin.from("ae_education_illustration_versions")
        .update({ track_id: trackId }).eq("id", id).eq("project_slug", LU_PROJECT);
      if (error) throw error;
    } else {
      if (item.status === "pending") return fail("Envio ainda não finalizado", 409);
      if ((action === "publish" || action === "unpublish") && item.status !== "available") return fail("Restaure a imagem antes de publicar", 409);
      if (action === "publish" && !(await getLuProject()).media_authorized) return fail("Autorização da escola pendente", 403);
      const patch: Record<string, unknown> = action === "publish" ? { is_published: true }
        : action === "unpublish" ? { is_published: false }
        : action === "hide" ? { status: "hidden", is_published: false, is_featured: false }
        : { status: "available" };
      const { error } = await supabaseAdmin.from("ae_education_illustration_versions")
        .update(patch).eq("project_slug", LU_PROJECT).eq("id", id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return fail("Não foi possível concluir a ação; confira a migração e tente novamente", 500); }
}
