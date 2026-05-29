import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  calculateDiagnosticScore,
  calculateScores,
  DiagnosticPayload,
  validateDiagnosticPayload,
} from "@/lib/ae-scoring";
import { sendDiagnosticEmail } from "@/lib/mail";

type SolutionRecord = {
  id: string;
  name: string;
  slug: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DiagnosticPayload;
    const validation = validateDiagnosticPayload(payload);

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "Existem perguntas pendentes ou inválidas no diagnóstico.",
          fields: validation.errors,
        },
        { status: 400 }
      );
    }

    const scores = calculateScores(payload);
    const best = scores[0];

    const { data: solution } = await supabaseAdmin
      .from("ae_solutions")
      .select("id, name, slug")
      .eq("slug", best?.slug ?? "escuta-viva")
      .single<SolutionRecord>();

    const diagnosticScore = calculateDiagnosticScore(payload, best?.score ?? 0);

    const { data: lead, error: leadError } = await supabaseAdmin
      .from("ae_leads")
      .insert({
        full_name: payload.fullName?.trim() || null,
        whatsapp: payload.whatsapp?.trim() || null,
        email: payload.email?.trim() || null,
        origin: payload.origin || null,
        profile_type: payload.profileType || null,
        main_area: payload.mainArea || null,
        main_pain: payload.mainPain || null,
        urgency: payload.urgency || null,
        has_business: payload.hasBusiness ?? null,
        business_stage: payload.businessStage || null,
        idea_description: payload.ideaDescription?.trim() || null,
        consent_contact: payload.consentContact,
        consent_lgpd: payload.consentLgpd,
        recommended_solution_id: solution?.id ?? null,
        diagnostic_score: diagnosticScore,
        status: "novo",
      })
      .select("id")
      .single<{ id: string }>();

    if (leadError || !lead) {
      return NextResponse.json({ error: leadError?.message ?? "Erro ao salvar lead." }, { status: 500 });
    }

    const answers = [
      ["profile_type", "Qual perfil mais combina com você?", payload.profileType],
      ["main_area", "Onde você sente mais perda de tempo, confusão ou retrabalho?", payload.mainArea],
      ["main_pain", "Isso incomoda mais por quê?", payload.mainPain],
      ["urgency", "Qual a urgência para resolver?", payload.urgency],
      ["has_business", "Você tem negócio, atende clientes ou pretende empreender?", String(payload.hasBusiness)],
      ["business_stage", "Em que fase está?", payload.businessStage],
      ["idea_description", "Descreva rapidamente a situação ou ideia.", payload.ideaDescription],
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

    const activeSolutions = await supabaseAdmin.from("ae_solutions").select("id, slug");
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

    const followups = buildFollowups(lead.id, payload.consentContact);
    if (followups.length > 0) {
      await supabaseAdmin.from("ae_lead_followups").insert(followups);
    }

    const emailResult = await sendDiagnosticEmail({
      leadName: payload.fullName ?? null,
      leadEmail: payload.email ?? null,
      leadWhatsapp: payload.whatsapp ?? null,
      solutionName: solution?.name ?? "Escuta Viva",
      diagnosticScore,
      mainArea: payload.mainArea ?? null,
      mainPain: payload.mainPain ?? null,
      urgency: payload.urgency ?? null,
      ideaDescription: payload.ideaDescription ?? null,
    });

    await supabaseAdmin
      .from("ae_lead_followups")
      .update({
        status: emailResult.sent ? "enviado" : "pendente",
        sent_at: emailResult.sent ? new Date().toISOString() : null,
        notes: emailResult.reason,
      })
      .eq("lead_id", lead.id)
      .eq("kind", "email_immediate");

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      recommendedSolution: solution?.name ?? "Escuta Viva",
      score: diagnosticScore,
      email: emailResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildFollowups(leadId: string, consentContact: boolean) {
  const now = new Date().toISOString();
  const items = [
    { lead_id: leadId, kind: "email_immediate", channel: "email", scheduled_at: now, status: "pendente" },
  ];

  if (consentContact) {
    items.push(
      { lead_id: leadId, kind: "whatsapp_5_15", channel: "whatsapp", scheduled_at: minutesFromNow(10), status: "pendente" },
      { lead_id: leadId, kind: "followup_24h", channel: "whatsapp", scheduled_at: daysFromNow(1), status: "pendente" },
      { lead_id: leadId, kind: "followup_3d", channel: "whatsapp", scheduled_at: daysFromNow(3), status: "pendente" },
      { lead_id: leadId, kind: "followup_7d", channel: "whatsapp", scheduled_at: daysFromNow(7), status: "pendente" }
    );
  }

  return items;
}
