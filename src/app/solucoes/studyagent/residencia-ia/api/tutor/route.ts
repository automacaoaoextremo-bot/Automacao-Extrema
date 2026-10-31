import { NextResponse } from "next/server";
import {
  STUDYAGENT_COMPETENCY_BY_ID,
  STUDYAGENT_GATE,
  STUDYAGENT_LEVELS,
  getAvailableCompetencies,
  getCompetencyContext,
} from "@/lib/education/studyagent-residencia-ia";

type TutorRequest = {
  question?: string;
  competencyIds?: string[];
  completedIds?: string[];
};

type OpenAITextPart = {
  type?: string;
  text?: string;
};

type OpenAIOutputItem = {
  type?: string;
  content?: OpenAITextPart[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string };
};

export async function POST(request: Request) {
  let body: TutorRequest;

  try {
    body = (await request.json()) as TutorRequest;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Informe uma pergunta." }, { status: 400 });
  }

  const competencyIds = (body.competencyIds ?? []).filter((id) => Boolean(STUDYAGENT_COMPETENCY_BY_ID[id]));
  const completedIds = (body.completedIds ?? []).filter((id) => Boolean(STUDYAGENT_COMPETENCY_BY_ID[id]));
  const available = getAvailableCompetencies(completedIds).slice(0, 6);

  if (process.env.STUDYAGENT_AI_ENABLED !== "true") {
    return NextResponse.json(
      {
        error:
          "O tutor integrado ainda não está disponível neste ambiente. Você pode continuar usando o mapa, a trilha e a opção de levar o contexto para o assistente de IA que já utiliza.",
      },
      { status: 503 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "O tutor integrado está temporariamente indisponível. Você pode continuar usando o mapa, a trilha e a opção de levar o contexto para o seu assistente.",
      },
      { status: 503 },
    );
  }

  const context = getCompetencyContext(competencyIds.length ? competencyIds : undefined);
  const levels = STUDYAGENT_LEVELS.map((level) => `${level.label}: ${level.intent}`).join("\n");
  const nextStudies = available.map((item) => `${item.id} — ${item.title}`).join("\n") || "nenhum";

  const instructions = `Você é o StudyAgent, tutor do piloto Residência IA da Automação Extrema.
Use prioritariamente a BASE DE CONHECIMENTO fornecida abaixo. Não invente que o estudante foi aprovado em um nível.
Quando faltar evidência na base, diga explicitamente que a base não sustenta a conclusão e proponha o que deve ser verificado.
Seja didático, objetivo e incentive prática + explicação + evidência.
Sempre que ajudar a compreensão, organize a resposta como: o que é -> por que importa -> o que muda na prática -> que evidência comprova aprendizagem.
Não use linguagem de venda nem prometa aprovação. Seja conciso e responda em até 350 palavras, salvo se o estudante pedir aprofundamento.\nOs gates provisórios são: quiz >= ${STUDYAGENT_GATE.quizMin}%, prática >= ${STUDYAGENT_GATE.practiceMin}/3, explicação >= ${STUDYAGENT_GATE.explanationMin}/3 e nota final >= ${STUDYAGENT_GATE.finalMin}%.

NÍVEIS:
${levels}

PRÓXIMOS ESTUDOS LIBERADOS PELO GRAFO:
${nextStudies}

BASE DE CONHECIMENTO:
${context}`;

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
      }),
    });

    const payload = (await response.json()) as OpenAIResponse;

    if (!response.ok) {
      console.error("StudyAgent OpenAI error", payload.error?.message ?? response.statusText);
      return NextResponse.json({ error: "Falha ao consultar o tutor IA." }, { status: 502 });
    }

    const outputText =
      payload.output_text ??
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .filter((part) => part.type === "output_text" && part.text)
        .map((part) => part.text)
        .join("\n") ??
      "";

    return NextResponse.json({ answer: outputText || "O tutor não retornou texto." });
  } catch (error) {
    console.error("StudyAgent tutor exception", error);
    return NextResponse.json({ error: "Falha de comunicação com o tutor IA." }, { status: 502 });
  }
}
