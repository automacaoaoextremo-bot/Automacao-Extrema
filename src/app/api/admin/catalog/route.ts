import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseNumber, requiredText, toSlug } from "@/lib/ae-utils";

const tableByKind = {
  target_audience: "ae_target_audiences",
  pain: "ae_pains",
  feature: "ae_features",
} as const;

type CatalogKind = keyof typeof tableByKind;

function isCatalogKind(value: unknown): value is CatalogKind {
  return typeof value === "string" && value in tableByKind;
}

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const [audiences, pains, features] = await Promise.all([
    supabaseAdmin.from("ae_target_audiences").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabaseAdmin.from("ae_pains").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabaseAdmin.from("ae_features").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
  ]);

  const firstError = audiences.error || pains.error || features.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    target_audiences: audiences.data ?? [],
    pains: pains.data ?? [],
    features: features.data ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const kind = body.kind as unknown;
  if (!isCatalogKind(kind)) {
    return NextResponse.json({ error: "Tipo de cadastro inválido." }, { status: 400 });
  }

  const name = requiredText(body.name);
  const slug = toSlug(requiredText(body.slug) || name);

  if (!name || !slug) {
    return NextResponse.json({ error: "Preencha nome e slug." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    name,
    slug,
    description: requiredText(body.description) || null,
    is_active: body.is_active !== false,
    sort_order: parseNumber(body.sort_order, 50),
  };

  if (kind === "target_audience") {
    payload.deep_dive_value = requiredText(body.deep_dive_value) || null;
  }

  if (kind === "pain") {
    payload.emotional_impact = requiredText(body.emotional_impact) || null;
  }

  if (kind === "feature") {
    payload.category = requiredText(body.category) || "Geral";
    payload.value_reason = requiredText(body.value_reason) || null;
    payload.deep_dive_benefit = requiredText(body.deep_dive_benefit) || null;
  }

  const { data, error } = await supabaseAdmin
    .from(tableByKind[kind])
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Já existe um cadastro com este slug." : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
