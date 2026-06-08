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

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  const [solution, targetAudiences, pains, features, clientSites] = await Promise.all([
    supabaseAdmin.from("ae_solutions").select("*").eq("id", id).single(),
    supabaseAdmin.from("ae_solution_target_audiences").select("target_audience_id, is_primary, ae_target_audiences(*)").eq("solution_id", id),
    supabaseAdmin.from("ae_solution_pains").select("pain_id, intensity, ae_pains(*)").eq("solution_id", id),
    supabaseAdmin.from("ae_solution_features").select("feature_id, is_core, is_visible, ae_features(*)").eq("solution_id", id),
    supabaseAdmin.from("ae_client_sites").select("*").eq("solution_id", id).order("client_name", { ascending: true }),
  ]);

  const firstError = solution.error || targetAudiences.error || pains.error || features.error || clientSites.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    solution: solution.data,
    target_audiences: targetAudiences.data ?? [],
    pains: pains.data ?? [],
    features: features.data ?? [],
    client_sites: clientSites.data ?? [],
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await request.json();

  const name = requiredText(body.name);
  const shortDescription = requiredText(body.short_description);
  const targetAudience = requiredText(body.target_audience);
  const mainPains = requiredText(body.main_pains);
  const slug = toSlug(requiredText(body.slug) || name);

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
    .update({
      name,
      slug,
      short_description: shortDescription,
      target_audience: targetAudience,
      main_pains: mainPains,
      current_status: requiredText(body.current_status) || "ideia",
      stage: requiredText(body.stage) || "validacao",
      priority: parseNumber(body.priority, 0),
      source_file: requiredText(body.source_file) || null,
      is_active: body.is_active !== false,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const relationError = await replaceSolutionRelations(id, body);
  if (relationError) return NextResponse.json({ error: relationError.message }, { status: 500 });

  return NextResponse.json({ solution: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const { error } = await supabaseAdmin
    .from("ae_solutions")
    .update({ is_active: false, current_status: "arquivada" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
