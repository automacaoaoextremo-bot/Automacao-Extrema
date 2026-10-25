import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LU_PROJECT } from "@/lib/education/lu-storage";
import { luTracks } from "@/lib/education/lu-pilot";

/** Identificadores estaveis: a ordem nunca muda os IDs usados no QR Code. */
export const defaultLuOrder: string[] = luTracks.map((track) => track.id);

export function sanitizeLuOrder(values: unknown): string[] {
  if (!Array.isArray(values)) return [...defaultLuOrder];
  const valid = new Set(defaultLuOrder);
  const result = values.filter((id): id is string => typeof id === "string" && valid.has(id));
  if (result.length !== defaultLuOrder.length || new Set(result).size !== defaultLuOrder.length) {
    throw new Error("A sequência deve conter exatamente as 12 músicas, sem duplicações.");
  }
  return result;
}

export async function getLuTrackOrder(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("ae_education_track_order")
    .select("track_id, sort_order")
    .eq("project_slug", LU_PROJECT)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Não foi possível carregar a ordem das músicas: ${error.message}`);
  if (!data || data.length !== defaultLuOrder.length) return [...defaultLuOrder];
  return sanitizeLuOrder(data.map((row) => row.track_id));
}
