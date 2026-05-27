import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calculateDiagnosticScore, calculateScores, DiagnosticPayload } from "@/lib/ae-scoring";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DiagnosticPayload;

    if (!payload.consentLgpd) {
      return NextResponse.json(
        { error: "Ã‰ necessÃ¡rio aceitar o uso dos dados para enviar o diagnÃ³stico." },
        { status: 400 }
      );
    }

    const scores = calculateScores(payload);
    const best = scores[0];

    const { data: solution } = await supabaseAdmin
      .from("ae_solutions")
      .select("id, name, slug")
      .eq("slug", best?.slug ?? "escuta-viva")
      .single();

    const diagnosticScore = calculateDiagnosticScore(payload, best?.score ?? 0);

    const { data: lead, error: leadError } = await supabaseAdmin
      .from("ae_leads")
      .insert({
        full_name: payload.fullName || null,
        whatsapp: payload.whatsapp || null,
        email: payload.email || null,
        origin: payload.origin || null,
        profile_type: payload.profileType || null,
        main_area: payload.mainArea || null,
        main_pain: payload.mainPain || null,
        urgency: payload.urgency || null,
        has_business: payload.hasBusiness ?? null,
        business_stage: payload.businessStage || null,
        idea_description: payload.ideaDescription || null,
        consent_contact: payload.consentContact,
        consent_lgpd: payload.consentLgpd,
        recommended_solution_id: solution?.id ?? null,
        diagnostic_score: diagnosticScore,
        status: "novo",
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: leadError?.message ?? "Erro ao salvar lead." }, { status: 500 });
    }

    const answers = [
      ["profile_type", "Qual perfil mais combina com vocÃª?", payload.profileType],
      ["main_area", "Onde vocÃª sente mais perda de tempo, confusÃ£o ou retrabalho?", payload.mainArea],
      ["main_pain", "Isso incomoda mais por quÃª?", payload.mainPain],
      ["urgency", "Qual a urgÃªncia para resolver?", payload.urgency],
      ["has_business", "VocÃª tem negÃ³cio, atende clientes ou pretende empreender?", String(payload.hasBusiness)],
      ["business_stage", "Em que fase estÃ¡?", payload.businessStage],
      ["idea_description", "Descreva rapidamente a situaÃ§Ã£o ou ideia.", payload.ideaDescription],
    ]
      .filter(([, , answer]) => answer !== undefined && answer !== null && answer !== "")
      .map(([question_key, question_text, answer]) => ({
        lead_id: lead.id,
        question_key,
        question_text,
        answer,
      }));

    if (answers.length > 0) {
      await supabaseAdmin.from("ae_lead_answers").insert(answers);
    }

    const activeSolutions = await supabaseAdmin
      .from("ae_solutions")
      .select("id, slug");

    const solutionMap = new Map((activeSolutions.data ?? []).map((item) => [item.slug, item.id]));

    const matches = scores
      .filter((item) => item.score > 0 && solutionMap.has(item.slug))
      .slice(0, 5)
      .map((item) => ({
        lead_id: lead.id,
        solution_id: solutionMap.get(item.slug),
        score: item.score,
        reason: item.reason,
      }));

    if (matches.length > 0) {
      await supabaseAdmin.from("ae_solution_matches").insert(matches);
    }

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      recommendedSolution: solution?.name ?? "Escuta Viva",
      score: diagnosticScore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
