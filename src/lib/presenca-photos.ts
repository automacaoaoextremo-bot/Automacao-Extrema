import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const PHOTO_BUCKET = "presenca-querida-fotos";
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
export const PHOTO_SELECT = "id,author_name,caption,share_allowed,status,created_at,byte_size,object_path";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PQ_PATH = "/solucoes/presenca-querida";
export type PhotoSettings = { event_id: string; upload_token: string; album_token: string; uploads_open: boolean; album_open: boolean };
export type PhotoRow = { id: string; author_name: string; caption: string; share_allowed: boolean; status: string; created_at: string; byte_size: number; object_path: string };
export function photoJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
}
export function photoLinks(slug: string, settings: PhotoSettings, origin = "https://www.automacaoextrema.com") {
  const base = `${origin}${PQ_PATH}/evento/${encodeURIComponent(slug)}`;
  return { upload: `${base}/fotos#chave=${settings.upload_token}`, album: `${base}/memorias#chave=${settings.album_token}` };
}
export async function loadPhotoSettings(eventId: string) {
  const { data, error } = await supabaseAdmin.from("pq_event_photo_settings").select("*").eq("event_id", eventId).maybeSingle();
  if (error) throw error;
  return data as PhotoSettings | null;
}
export async function signPhotoRows(rows: PhotoRow[], publicView = false) {
  if (!rows.length) return [];
  const { data, error } = await supabaseAdmin.storage.from(PHOTO_BUCKET).createSignedUrls(rows.map(row => row.object_path), 300);
  if (error) throw error;
  return rows.map((row, i) => ({ id: row.id, author_name: row.author_name, caption: row.caption, created_at: row.created_at,
    ...(!publicView ? { share_allowed: row.share_allowed, status: row.status, byte_size: row.byte_size } : {}),
    url: data?.[i]?.signedUrl || "" }));
}
