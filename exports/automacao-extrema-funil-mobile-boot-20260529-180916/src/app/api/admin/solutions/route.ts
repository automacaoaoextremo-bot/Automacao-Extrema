import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  const rawSlug = requiredText(body.slug);
  const slug = toSlug(rawSlug || name);
  const currentStatus = requiredText(body.current_status) || "ideia";
  const stage = requiredText(body.stage) || "validacao";
  const sourceFile = requiredText(body.source_file);
  const priority = Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0;

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
      is_active: Boolean(body.is_active),
    })
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505"
      ? "Já existe uma solução cadastrada com este slug. Ajuste o slug e tente novamente."
      : error.message;

    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ solution: data }, { status: 201 });
}
