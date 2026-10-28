import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LU_PROJECT, songValid } from "@/lib/education/lu-storage";

export const LU_IMAGE_BUCKET = "education-illustrations-private";
export type LuIllustration = {
  id: string; track_id: string; original_filename: string; storage_path: string;
  mime_type: string; status: "pending" | "available" | "hidden";
  is_featured: boolean; is_published: boolean; created_at: string;
  url?: string;
};
export { songValid };

/** Chamada exclusiva no servidor. Nunca retorna path ou metadados privados ao público. */
export async function getLuIllustrations(options: {
  admin: boolean; publicView: boolean; authorized: boolean; released: boolean;
}): Promise<LuIllustration[]> {
  if (!options.admin && (!options.authorized || !options.released)) return [];
  const isAdminCuration = options.admin && !options.publicView;
  const allowedPreview = options.admin && options.publicView && options.authorized;
  if (!isAdminCuration && !allowedPreview && (!options.authorized || !options.released)) return [];
  let query = supabaseAdmin.from("ae_education_illustration_versions")
    .select("id,track_id,original_filename,storage_path,mime_type,status,is_featured,is_published,created_at")
    .eq("project_slug", LU_PROJECT).order("created_at", { ascending: true });
  if (!isAdminCuration) query = query.eq("status", "available").eq("is_published", true);
  const { data, error } = await query;
  if (error) throw new Error(`Ilustrações indisponíveis: ${error.message}`);
  return Promise.all(((data || []) as LuIllustration[]).map(async (item) => {
    if (item.status !== "available") return { ...item, url: undefined };
    const { data: signed, error: storageError } = await supabaseAdmin.storage
      .from(LU_IMAGE_BUCKET).createSignedUrl(item.storage_path, 300);
    return { ...item, url: storageError ? undefined : signed?.signedUrl };
  }));
}
