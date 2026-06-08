import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseNumber, parseStringArray, requiredText, toSlug } from "@/lib/ae-utils";

async function replaceSolutionRelations(solutionId: string, body: Record<string, unknown>): Promise<{ message: string } | null> {
  const targetAudienceIds = parseStringArray(body.target_audience_ids);
  const painIds = parseStringArray(body.pain_ids);
  const featureIds = parseStringArray(body.feature_ids);

  const deleteResults = await Promise.all([
    supabaseAdmin.from("ae_solution_target_audiences").delete().eq("solution_id", solutionId),
    supabaseAdmin.from("ae_solution_pains").delete().eq("solution_id", solutionId),
    supabaseAdmin.from("ae_solution_features").delete().eq("solution_id", solutionId),
  ]);

  const deleteError = deleteResults.find((result) => result.error)?.error;
  if (deleteError) return { message: deleteError.message };

  if (targetAudienceIds.length > 0) {
    const { error } = await supabaseAdmin.from("ae_solution_target_audiences").insert(
      targetAudienceIds.map((targetAudienceId, index) => ({
        solution_id: solutionId,
        target_audience_id: targetAudienceId,
        is_primary: index === 0,
      }))
    );
    if (error) return { message: error.message };
  }

  if (painIds.length > 0) {
    const { error } = await supabaseAdmin.from("ae_solution_pains").insert(
      painIds.map((painId, index) => ({
        solution_id: solutionId,
        pain_id: painId,
        intensity: index === 0 ? "alta" : "media",
      }))
    );
    if (error) return { message: error.message };
  }

  if (featureIds.length > 0) {
    const { error } = await supabaseAdmin.from("ae_solution_features").insert(
      featureIds.map((featureId, index) => ({
        solution_id: solutionId,
        feature_id: featureId,
        is_core: index < 3,
        is_visible: true,
      }))
    );
    if (error) return { message: error.message };
  }

  return null;
}

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("ae_solutions")
    .select("id, name, slug, short_description, target_audience, main_pains, current_status, stage, priority, source_file, is_active, created_at, updated_at")
    .order("priority", { ascending: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ solutions: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const body = await request.json();

  const name = requiredText(body.name);
  const shortDescription = requiredText(body.short_description);
  const targetAudience = requiredText(body.target_audience);
  const mainPains = requiredText(body.main_pains);
  const slug = toSlug(requiredText(body.slug) || name);
  const currentStatus = requiredText(body.current_status) || "ideia";
  const stage = requiredText(body.stage) || "validacao";
  const sourceFile = requiredText(body.source_file);
  const priority = parseNumber(body.priority, 0);

  const missingFields = [
    !name ? "Nome" : null,
    !slug ? "Slug" : null,
    !shortDescription ? "Descrição curta" : null,
    !targetAudience ? "Público-alvo" : null,
    !mainPains ? "Dores principais" : null,
  ].filter(Boolean);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Preencha os campos obrigatórios: ${missingFields.join(", ")}.` },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("ae_solutions")
    .insert({
      name,
      slug,
      short_description: shortDescription,
      target_audience: targetAudience,
      main_pains: mainPains,
      current_status: currentStatus,
      stage,
      priority,
      source_file: sourceFile || null,
      is_active: body.is_active !== false,
    })
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505"
      ? "Já existe uma solução cadastrada com este slug. Ajuste o slug e tente novamente."
      : error.message;

    return NextResponse.json({ error: message }, { status: 500 });
  }

  const relationError = await replaceSolutionRelations(data.id, body);
  if (relationError) return NextResponse.json({ error: relationError.message }, { status: 500 });

  return NextResponse.json({ solution: data }, { status: 201 });
}
