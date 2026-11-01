import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { STUDYAGENT_PROGRAM_ID } from "@/lib/education/studyagent-residencia-ia";

export type StudyAgentAuthContext = {
  userId: string;
  email: string | null;
  programId: string;
};

type StudyAgentAuthResult =
  | { ok: true; context: StudyAgentAuthContext }
  | { ok: false; response: NextResponse };

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

export async function requireStudyAgentUser(request: Request): Promise<StudyAgentAuthResult> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Sessão não encontrada." }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: NextResponse.json({ error: "Sessão expirada ou inválida." }, { status: 401 }) };
  }

  const { data: enrollment } = await supabaseAdmin
    .from("ae_study_enrollments")
    .select("id, status")
    .eq("user_id", data.user.id)
    .eq("program_id", STUDYAGENT_PROGRAM_ID)
    .maybeSingle();

  if (!enrollment?.id || enrollment.status !== "active") {
    return { ok: false, response: NextResponse.json({ error: "Seu acesso ao programa ainda não está ativo." }, { status: 403 }) };
  }

  return {
    ok: true,
    context: {
      userId: data.user.id,
      email: data.user.email ?? null,
      programId: STUDYAGENT_PROGRAM_ID,
    },
  };
}
