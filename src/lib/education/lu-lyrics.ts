import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LU_PROJECT } from "@/lib/education/lu-storage";

export type LuLyrics = {
  track_id: string;
  body: string;
  is_published: boolean;
};

/** Sem exposicao publica de rascunhos ou letras nao liberadas. */
export async function getLuLyrics(options: {
  admin: boolean;
  publicView: boolean;
  mediaAuthorized: boolean;
  familyReleased: boolean;
}): Promise<LuLyrics[]> {
  if (!options.admin && !(options.mediaAuthorized && options.familyReleased)) return [];
  const { data, error } = await supabaseAdmin.from("ae_education_track_lyrics")
    .select("track_id,body,is_published")
    .eq("project_slug", LU_PROJECT)
    .order("track_id", { ascending: true });
  if (error) throw new Error(`Letras indisponiveis: ${error.message}`);
  const records = (data || []) as LuLyrics[];
  if (options.admin && !options.publicView) return records;
  // Preview da professora ainda pode visualizar a letra aprovada, sem expor rascunhos.
  return records.filter((item) => item.is_published && (options.mediaAuthorized && (options.admin || options.familyReleased)))
    .map(({ track_id, body, is_published }) => ({ track_id, body, is_published }));
}
