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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
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

  if (kind === "target_audience") payload.deep_dive_value = requiredText(body.deep_dive_value) || null;
  if (kind === "pain") payload.emotional_impact = requiredText(body.emotional_impact) || null;
  if (kind === "feature") {
    payload.category = requiredText(body.category) || "Geral";
    payload.value_reason = requiredText(body.value_reason) || null;
    payload.deep_dive_benefit = requiredText(body.deep_dive_benefit) || null;
  }

  const { data, error } = await supabaseAdmin
    .from(tableByKind[kind])
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  if (!isCatalogKind(kind)) {
    return NextResponse.json({ error: "Tipo de cadastro inválido." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from(tableByKind[kind])
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
