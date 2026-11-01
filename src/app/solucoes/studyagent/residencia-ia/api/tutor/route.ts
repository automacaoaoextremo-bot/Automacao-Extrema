import { NextResponse } from "next/server";
import {
  STUDYAGENT_COMPETENCY_BY_ID,
  STUDYAGENT_GATE,
  STUDYAGENT_LEVELS,
  STUDYAGENT_PROGRAM_ID,
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

type OfficialCompetency = {
  id: string;
  code: string;
  title: string;
  summary: string;
  why_it_matters: string;
  evidence_suggestion: string;
};

type OfficialEdge = {
  from_competency_id: string;
  to_competency_id: string;
  relation_type: string;
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

async function loadOfficialContext(requestedCodes: string[], completedCodes: string[]) {
  const { data: competencies } = await supabaseAdmin
    .from("ae_study_competencies")
    .select("id, code, title, summary, why_it_matters, evidence_suggestion")
    .eq("program_id", STUDYAGENT_PROGRAM_ID)
    .eq("active", true)
    .order("sort_order");

  const rows = (competencies ?? []) as OfficialCompetency[];
  if (!rows.length) {
    return {
      context: getCompetencyContext(requestedCodes.length ? requestedCodes : undefined),
      validCodes: requestedCodes.filter((code) => Boolean(STUDYAGENT_COMPETENCY_BY_ID[code])),
      nextStudies: "Use o Knowledge Graph exibido na interface.",
    };
  }

  const byId = Object.fromEntries(rows.map((item) => [item.id, item]));
  const byCode = Object.fromEntries(rows.map((item) => [item.code, item]));
  const validCodes = requestedCodes.filter((code) => Boolean(byCode[code]));

  const { data: edges } = await supabaseAdmin
    .from("ae_study_competency_edges")
    .select("from_competency_id, to_competency_id, relation_type")
    .eq("program_id", STUDYAGENT_PROGRAM_ID);

  const prerequisites = new Map<string, string[]>();
  ((edges ?? []) as OfficialEdge[]).forEach((edge) => {
    if (edge.relation_type !== "prerequisite_of") return;
    const from = byId[edge.from_competency_id]?.code;
    const to = byId[edge.to_competency_id]?.code;
    if (!from || !to) return;
    prerequisites.set(to, [...(prerequisites.get(to) ?? []), from]);
  });

  const selected = validCodes.length ? rows.filter((item) => validCodes.includes(item.code)) : rows;
  const context = selected
    .map((item) => `${item.code} — ${item.title}\nResumo: ${item.summary}\nPor que importa: ${item.why_it_matters}\nPré-requisitos: ${(prerequisites.get(item.code) ?? []).join(", ") || "nenhum"}\nEvidência: ${item.evidence_suggestion}`)
    .join("\n\n");

  const completed = new Set(completedCodes);
  const nextStudies = rows
    .filter((item) => !completed.has(item.code) && (prerequisites.get(item.code) ?? []).every((code) => completed.has(code)))
    .slice(0, 6)
    .map((item) => `${item.code} — ${item.title}`)
    .join("\n") || "nenhum";

  return { context, validCodes, nextStudies };
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

  const requestedCodes = (body.competencyIds ?? []).filter(Boolean);
  const completedCodes = (body.completedIds ?? []).filter(Boolean);
  const official = await loadOfficialContext(requestedCodes, completedCodes);
  const selectedCode = official.validCodes[0] ?? null;

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
    ? relevantPersonal.slice(0, 12).map((entry) => `[${entry.competency_code || "Geral"}] ${entry.title}: ${entry.content}`).join("\n\n")
    : "Nenhum conhecimento pessoal confirmado para este contexto.";

  const { data: levelPlanRows } = selectedCode
    ? await supabaseAdmin
        .from("ae_study_competency_level_plans")
        .select("level_label, objective, study_suggested, practical_exercise, assessment_suggested, evidence_expected")
        .eq("program_id", auth.context.programId)
        .eq("competency_code", selectedCode)
        .eq("active", true)
        .order("level_order")
    : { data: [] };

  const structuredPlan = (levelPlanRows ?? []).length
    ? (levelPlanRows ?? []).map((row) => `${row.level_label}: objetivo=${row.objective}; estudo=${row.study_suggested}; prática=${row.practical_exercise}; avaliação=${row.assessment_suggested}; evidência=${row.evidence_expected}`).join("\n")
    : "Plano detalhado ainda não disponível neste contexto.";

  const levels = STUDYAGENT_LEVELS.map((level) => `${level.label}: ${level.intent}`).join("\n");
  const instructions = `Você é o StudyAgent, tutor da Residência IA da Automação Extrema.
Use primeiro a BASE OFICIAL e o PLANO ESTRUTURADO. Considere a BASE PESSOAL apenas como memória confirmada pelo estudante.
Não trate a base pessoal como fonte oficial e não invente fatos para preencher lacunas.
Quando faltar evidência, diga claramente o que precisa ser verificado.
Não afirme que o estudante foi aprovado; a aprovação depende dos gates e de evidência verificável.
Responda de forma didática e objetiva.

Além da resposta, compare o conteúdo novo com a BASE PESSOAL e classifique a sugestão como:
- none: não há algo útil a adicionar/alterar;
- new: conhecimento novo relevante;
- complement: complementa algo já registrado;
- divergence: há conflito ou diferença que merece revisão.
A sugestão nunca é incorporada automaticamente.

GATES:
quiz >= ${STUDYAGENT_GATE.quizMin}%
prática >= ${STUDYAGENT_GATE.practiceMin}/3
explicação >= ${STUDYAGENT_GATE.explanationMin}/3
nota final >= ${STUDYAGENT_GATE.finalMin}%

NÍVEIS:
${levels}

PRÓXIMOS ESTUDOS LIBERADOS PELO GRAFO:
${official.nextStudies}

BASE OFICIAL:
${official.context}

PLANO ESTRUTURADO DA COMPETÊNCIA:
${structuredPlan}

BASE PESSOAL CONFIRMADA:
${personalContext}`;

  const model = process.env.STUDYAGENT_OPENAI_MODEL || "gpt-6-luna";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
      .insert({ user_id: auth.context.userId, program_id: auth.context.programId, competency_code: selectedCode, question, answer: result.answer, provider: `openai:${model}` })
      .select("id")
      .single();
    if (consultationError) console.error("StudyAgent consultation save error", consultationError.message);

    let suggestionPayload: (TutorStructuredResult["suggestion"] & { id?: string }) | null = null;
    if (result.suggestion.action !== "none" && result.suggestion.content.trim()) {
      const { data: suggestionRow, error: suggestionError } = await supabaseAdmin
        .from("ae_study_knowledge_suggestions")
        .insert({ user_id: auth.context.userId, program_id: auth.context.programId, competency_code: selectedCode, consultation_id: consultation?.id ?? null, suggestion_type: result.suggestion.action, proposed_title: result.suggestion.title.trim() || "Atualização sugerida pelo Tutor", proposed_content: result.suggestion.content.trim(), rationale: result.suggestion.rationale.trim(), status: "pending" })
        .select("id")
        .single();
      if (suggestionError) console.error("StudyAgent suggestion save error", suggestionError.message);
      else suggestionPayload = { ...result.suggestion, id: suggestionRow?.id };
    }

    return NextResponse.json({ answer: result.answer, consultationId: consultation?.id ?? null, suggestion: suggestionPayload ?? { ...result.suggestion } });
  } catch (error) {
    console.error("StudyAgent tutor exception", error);
    return NextResponse.json({ error: "Falha de comunicação com o Tutor integrado." }, { status: 502 });
  }
}
