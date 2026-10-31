import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { getLuProject, LU_BUCKET, LU_PROJECT } from "@/lib/education/lu-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Operador habilita somente apos autorizacao especifica para processamento
// externo das vozes e para exibicao das transcricoes. Chave nunca vai ao browser.
const enabled = () =>
  process.env.LU_AUTO_CAPTIONS_ENABLED === "true" &&
  process.env.LU_AUTO_CAPTIONS_EXTERNAL_AUDIO_AUTHORIZED === "true" &&
  process.env.LU_AUTO_CAPTIONS_PUBLIC_TEXT_AUTHORIZED === "true" &&
  Boolean(process.env.OPENAI_API_KEY);

type Cue = { start: number; end: number; text: string };
type Segment = { start?: unknown; end?: unknown; text?: unknown };
type Stored = { status: "ready" | "processing" | "failed"; cues: Cue[]; attempts: number };

function json(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
const looksLikeUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function context(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("versionId") || "";
  if (!looksLikeUuid(id)) return null;
  const project = await getLuProject();
  if (!project.media_authorized || !project.family_released) return null;
  const { data: version, error } = await supabaseAdmin.from("ae_education_audio_versions")
    .select("id,project_slug,track_id,storage_path,mime_type,file_bytes,is_selected,status")
    .eq("id", id).eq("project_slug", LU_PROJECT).eq("status", "available").eq("is_selected", true).maybeSingle();
  if (error || !version) return null;
  return version;
}

async function read(versionId: string): Promise<Stored | null> {
  const { data, error } = await supabaseAdmin.from("ae_education_audio_captions")
    .select("status,cues,attempts").eq("version_id", versionId).maybeSingle();
  if (error) throw error;
  return data as Stored | null;
}

export async function GET(request: NextRequest) {
  // As transcricoes brutas ainda nao foram revisadas: somente docentes autenticados.
  if (!(await hasLuAdminAccess())) return json({ error: "Nao autorizado" }, 401);
  try {
    const version = await context(request);
    if (!version) return json({ error: "Gravacao indisponivel" }, 404);
    if (!enabled()) return json({ status: "disabled", cues: [], message: "Legendas automaticas ainda nao habilitadas." });
    const captions = await read(version.id);
    return json({ status: captions?.status || "missing", cues: captions?.status === "ready" ? captions.cues : [] });
  } catch { return json({ error: "Nao foi possivel consultar as legendas." }, 503); }
}

export async function POST(request: NextRequest) {
  // Impede que familias acionem um processamento externo ou leiam textos brutos.
  if (!(await hasLuAdminAccess())) return json({ error: "Nao autorizado" }, 401);
  if (!enabled()) return json({ error: "Legendas automaticas nao habilitadas." }, 503);
  let version: Awaited<ReturnType<typeof context>>;
  try { version = await context(request); }
  catch { return json({ error: "Nao foi possivel consultar a gravacao." }, 503); }
  if (!version) return json({ error: "Gravacao indisponivel." }, 404);
  try {
    const current = await read(version.id);
    if (current?.status === "ready") return json({ status: "ready", cues: current.cues });
    const { data: claimed, error: claimError } = await supabaseAdmin.rpc("ae_education_claim_auto_caption", { p_version: version.id });
    if (claimError) throw claimError;
    if (!claimed) return json({ status: current?.status || "processing", cues: [], message: "Geracao em andamento ou limite de tentativas atingido." }, 202);

    // Nunca enviar arquivos indisponiveis, rascunhos ou links assinados a terceiros.
    // Apenas bytes do objeto privado escolhido; memoria transitoria, sem gravar em public/.
    const maxBytes = 25 * 1024 * 1024;
    if (Number(version.file_bytes) > maxBytes) throw new Error("audio_too_large");
    const { data: audio, error: downloadError } = await supabaseAdmin.storage.from(LU_BUCKET).download(version.storage_path);
    if (downloadError || !audio || audio.size > maxBytes || audio.size < 100) throw new Error("audio_unavailable");
    const form = new FormData();
    const extension = ({ "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav", "audio/webm": "webm", "audio/aac": "aac" } as Record<string, string>)[version.mime_type] || "mp3";
    form.append("file", audio, `lu-${version.id}.${extension}`);
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`transcription_http_${response.status}`);
    const payload = await response.json() as { segments?: Segment[] };
    const cues: Cue[] = (payload.segments || [])
      .filter((s) => typeof s.start === "number" && Number.isFinite(s.start) && typeof s.end === "number" && Number.isFinite(s.end) && typeof s.text === "string")
      .map((s) => ({ start: Math.max(0, Number(s.start)), end: Math.max(0, Number(s.end)), text: String(s.text).trim().slice(0, 400) }))
      .filter((s) => s.text.length > 0 && s.end > s.start)
      .slice(0, 300);
    if (!cues.length) throw new Error("no_usable_segments");
    const { error: savedError } = await supabaseAdmin.from("ae_education_audio_captions")
      .update({ status: "ready", cues, error_code: null, updated_at: new Date().toISOString() })
      .eq("version_id", version.id).eq("status", "processing");
    if (savedError) throw savedError;
    return json({ status: "ready", cues });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 60) : "transcription_failed";
    await supabaseAdmin.from("ae_education_audio_captions")
      .update({ status: "failed", error_code: code, updated_at: new Date().toISOString() })
      .eq("version_id", version.id).eq("status", "processing");
    // Sem logar dados privados, transcricao, URL assinada ou chave.
    return json({ error: "A geracao automatica nao foi concluida. Tente novamente mais tarde.", status: "failed" }, 503);
  }
}
