import { NextResponse } from "next/server";
import {
  STUDYAGENT_COMPETENCY_BY_ID,
  STUDYAGENT_GATE,
  STUDYAGENT_LEVELS,
  getAvailableCompetencies,
  getCompetencyContext,
} from "@/lib/education/studyagent-residencia-ia";
import { requireStudyAgentUser } from "@/lib/education/studyagent-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type TutorRequest = {
  question?: string;
  competencyIds?: string[];
  completedIds?: string[];
};

type TutorStructuredResult = {
  answer: string;
  suggestion: {
    action: "none" | "new" | "complement" | "divergence";
    title: string;
    content: string;
    rationale: string;
  };
};

type OpenAITextPart = { type?: string; text?: string };
type OpenAIOutputItem = { type?: string; content?: OpenAITextPart[] };
type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string };
};

function responseText(payload: OpenAIResponse) {
  return (
    payload.output_text ??
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text" && part.text)
      .map((part) => part.text)
      .join("\n") ??
    ""
  );
}

export async function POST(request: Request) {
  const auth = await requireStudyAgentUser(request);
  if (!auth.ok) return auth.response;

  let body: TutorRequest;
  try {
    body = (await request.json()) as TutorRequest;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: "Informe uma pergunta." }, { status: 400 });

  const competencyIds = (body.competencyIds ?? []).filter((id) => Boolean(STUDYAGENT_COMPETENCY_BY_ID[id]));
  const completedIds = (body.completedIds ?? []).filter((id) => Boolean(STUDYAGENT_COMPETENCY_BY_ID[id]));
  const selectedCode = competencyIds[0] ?? null;
  const available = getAvailableCompetencies(completedIds).slice(0, 6);

  if (process.env.STUDYAGENT_AI_ENABLED !== "true") {
    return NextResponse.json(
      {
        error:
          "O Tutor integrado ainda não está habilitado neste ambiente. Você pode copiar o contexto e usar a IA que já utiliza, depois registrar o aprendizado em Minha Base.",
      },
      { status: 503 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "O Tutor integrado está temporariamente indisponível." }, { status: 503 });
  }

  const configuredLimit = Number(process.env.STUDYAGENT_TUTOR_DAILY_LIMIT || "20");
  const dailyLimit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? Math.floor(configuredLimit) : 20;
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count: consultationsToday } = await supabaseAdmin
    .from("ae_study_tutor_consultations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.context.userId)
    .eq("program_id", auth.context.programId)
    .gte("created_at", startOfDay.toISOString())
    .like("provider", "openai:%");

  if ((consultationsToday ?? 0) >= dailyLimit) {
    return NextResponse.json(
      { error: `Você atingiu o limite diário de ${dailyLimit} consultas no Tutor integrado. Continue com o mapa ou use a opção de levar o contexto para a IA que já utiliza.` },
      { status: 429 },
    );
  }

  const { data: personalRows } = await supabaseAdmin
    .from("ae_study_personal_knowledge")
    .select("competency_code, title, content, source_type, updated_at")
    .eq("user_id", auth.context.userId)
    .eq("program_id", auth.context.programId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(30);

  const relevantPersonal = (personalRows ?? []).filter(
    (entry) => !selectedCode || !entry.competency_code || entry.competency_code === selectedCode,
  );

  const personalContext = relevantPersonal.length
    ? relevantPersonal
        .slice(0, 12)
        .map((entry) => `[${entry.competency_code || "Geral"}] ${entry.title}: ${entry.content}`)
        .join("\n\n")
    : "Nenhum conhecimento pessoal confirmado para este contexto.";

  const officialContext = getCompetencyContext(competencyIds.length ? competencyIds : undefined);
  const levels = STUDYAGENT_LEVELS.map((level) => `${level.label}: ${level.intent}`).join("\n");
  const nextStudies = available.map((item) => `${item.id} — ${item.title}`).join("\n") || "nenhum";

  const instructions = `Você é o StudyAgent, tutor da Residência IA da Automação Extrema.
Use primeiro a BASE OFICIAL e considere a BASE PESSOAL apenas como memória confirmada pelo estudante.
Não trate a base pessoal como fonte oficial e não invente fatos para preencher lacunas.
Quando faltar evidência, diga claramente o que precisa ser verificado.
Não afirme que o estudante foi aprovado; a aprovação depende dos gates e de evidência verificável.
Responda de forma didática e objetiva.

Além da resposta, compare o conteúdo novo com a BASE PESSOAL e classifique a sugestão como:
- none: não há algo útil a adicionar/alterar;
- new: conhecimento novo relevante;
- complement: complementa algo já registrado;
- divergence: há conflito ou diferença que merece revisão.
A sugestão nunca é incorporada automaticamente. Ela será apresentada ao estudante para aceitar ou rejeitar.

GATES PROVISÓRIOS:
quiz >= ${STUDYAGENT_GATE.quizMin}%
prática >= ${STUDYAGENT_GATE.practiceMin}/3
explicação >= ${STUDYAGENT_GATE.explanationMin}/3
nota final >= ${STUDYAGENT_GATE.finalMin}%

NÍVEIS:
${levels}

PRÓXIMOS ESTUDOS LIBERADOS PELO GRAFO:
${nextStudies}

BASE OFICIAL:
${officialContext}

BASE PESSOAL CONFIRMADA:
${personalContext}`;

  const model = process.env.STUDYAGENT_OPENAI_MODEL || "gpt-6-luna";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input: question,
        text: {
          format: {
            type: "json_schema",
            name: "studyagent_tutor_result",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answer: { type: "string" },
                suggestion: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    action: { type: "string", enum: ["none", "new", "complement", "divergence"] },
                    title: { type: "string" },
                    content: { type: "string" },
                    rationale: { type: "string" },
                  },
                  required: ["action", "title", "content", "rationale"],
                },
              },
              required: ["answer", "suggestion"],
            },
          },
        },
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;
    if (!response.ok) {
      console.error("StudyAgent OpenAI error", payload.error?.message ?? response.statusText);
      return NextResponse.json({ error: "Falha ao consultar o Tutor integrado." }, { status: 502 });
    }

    const rawText = responseText(payload);
    let result: TutorStructuredResult;
    try {
      result = JSON.parse(rawText) as TutorStructuredResult;
    } catch {
      console.error("StudyAgent structured output parse error", rawText);
      return NextResponse.json({ error: "O Tutor retornou um formato inesperado." }, { status: 502 });
    }

    const { data: consultation, error: consultationError } = await supabaseAdmin
      .from("ae_study_tutor_consultations")
      .insert({
        user_id: auth.context.userId,
        program_id: auth.context.programId,
        competency_code: selectedCode,
        question,
        answer: result.answer,
        provider: `openai:${model}`,
      })
      .select("id")
      .single();

    if (consultationError) console.error("StudyAgent consultation save error", consultationError.message);

    let suggestionPayload: (TutorStructuredResult["suggestion"] & { id?: string }) | null = null;
    if (result.suggestion.action !== "none" && result.suggestion.content.trim()) {
      const { data: suggestionRow, error: suggestionError } = await supabaseAdmin
        .from("ae_study_knowledge_suggestions")
        .insert({
          user_id: auth.context.userId,
          program_id: auth.context.programId,
          competency_code: selectedCode,
          consultation_id: consultation?.id ?? null,
          suggestion_type: result.suggestion.action,
          proposed_title: result.suggestion.title.trim() || "Atualização sugerida pelo Tutor",
          proposed_content: result.suggestion.content.trim(),
          rationale: result.suggestion.rationale.trim(),
          status: "pending",
        })
        .select("id")
        .single();

      if (suggestionError) {
        console.error("StudyAgent suggestion save error", suggestionError.message);
      } else {
        suggestionPayload = { ...result.suggestion, id: suggestionRow?.id };
      }
    }

    return NextResponse.json({
      answer: result.answer,
      consultationId: consultation?.id ?? null,
      suggestion: suggestionPayload ?? { ...result.suggestion },
    });
  } catch (error) {
    console.error("StudyAgent tutor exception", error);
    return NextResponse.json({ error: "Falha de comunicação com o Tutor integrado." }, { status: 502 });
  }
}
