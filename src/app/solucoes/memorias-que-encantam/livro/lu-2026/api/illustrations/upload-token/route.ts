import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { LU_IMAGE_BUCKET, songValid } from "@/lib/education/lu-illustrations";
import { getLuProject, LU_PROJECT } from "@/lib/education/lu-storage";

export const dynamic = "force-dynamic";
const TYPES: Record<string,string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
export async function POST(req: NextRequest) {
  if (!(await hasLuAdminAccess())) return fail("Não autorizado", 401);
  if (req.headers.get("origin") !== req.nextUrl.origin) return fail("Origem inválida", 403);
  try {
    const body: unknown = await req.json();
    const { trackId, fileName, fileType, fileSize } = (body || {}) as Record<string,unknown>;
    if (typeof trackId !== "string" || !songValid(trackId) || typeof fileName !== "string" || fileName.length > 180 || !fileName.trim()) return fail("Música ou arquivo inválido", 400);
    if (typeof fileType !== "string" || !TYPES[fileType] || typeof fileSize !== "number" || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > 10 * 1024 * 1024) return fail("Use JPEG, PNG ou WEBP, até 10 MB", 400);
    const project = await getLuProject();
    if (!project.media_authorized) return fail("A escola ainda não autorizou o armazenamento de materiais da turma", 403);
    const id = randomUUID();
    const storagePath = `projects/${LU_PROJECT}/illustrations/${trackId}/${id}.${TYPES[fileType]}`;
    const { error: insertError } = await supabaseAdmin.from("ae_education_illustration_versions").insert({
      id, project_slug: LU_PROJECT, track_id: trackId, original_filename: fileName,
      storage_path: storagePath, mime_type: fileType, file_bytes: fileSize, status: "pending",
    });
    if (insertError) throw insertError;
    const { data, error } = await supabaseAdmin.storage.from(LU_IMAGE_BUCKET).createSignedUploadUrl(storagePath);
    if (error) throw error;
    return NextResponse.json({ id, path: storagePath, bucket: LU_IMAGE_BUCKET,
      token: data.token, url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }, { headers: { "Cache-Control": "no-store" } });
  } catch { return fail("Falha ao preparar envio. Confira a migração SQL e o bucket privado", 500); }
}
