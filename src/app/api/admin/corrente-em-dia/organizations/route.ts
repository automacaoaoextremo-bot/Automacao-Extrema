import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requiredText, toSlug } from "@/lib/ae-utils";

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("ced_organizations")
    .select("*")
    .order("organization_type", { ascending: true })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organizations: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const name = requiredText(body.name);
  const organizationType = requiredText(body.organization_type) || "terreiro";
  const slug = toSlug(requiredText(body.slug) || name);

  if (!name || !slug) {
    return NextResponse.json({ error: "Preencha nome e slug." }, { status: 400 });
  }

  const payload = {
    organization_type: organizationType,
    name,
    slug,
    legal_name: requiredText(body.legal_name) || null,
    email: requiredText(body.email) || null,
    whatsapp: requiredText(body.whatsapp) || null,
    city: requiredText(body.city) || null,
    state: requiredText(body.state) || null,
    pix_key: requiredText(body.pix_key) || null,
    pix_key_type: requiredText(body.pix_key_type) || "email",
    pix_receiver_name: requiredText(body.pix_receiver_name) || name,
    default_individual_amount: Number(body.default_individual_amount || 0) || null,
    default_family_amount: Number(body.default_family_amount || 0) || null,
    contribution_due_day: Number(body.contribution_due_day || 0) || null,
    contribution_due_mode: requiredText(body.contribution_due_mode) || "until_day",
    public_headline: requiredText(body.public_headline) || null,
    deep_dive_text: requiredText(body.deep_dive_text) || null,
    public_status: requiredText(body.public_status) || "ativo",
    is_demo: body.is_demo === true,
  };

  const { data, error } = await supabaseAdmin.from("ced_organizations").insert(payload).select("*").single();
  if (error) {
    const message = error.code === "23505" ? "Já existe uma entidade com este slug." : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ organization: data }, { status: 201 });
}
