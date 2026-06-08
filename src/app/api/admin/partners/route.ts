import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseNumber, requiredText, toSlug } from "@/lib/ae-utils";

function normalizePercentage(value: unknown) {
  const percentage = parseNumber(value, 0);
  if (percentage < 0) return 0;
  if (percentage > 100) return 100;
  return percentage;
}

export async function GET(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("ae_partners")
    .select("*")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ partners: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const name = requiredText(body.name);
  const slug = toSlug(requiredText(body.slug) || name);

  if (!name || !slug) {
    return NextResponse.json({ error: "Preencha nome e slug." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ae_partners")
    .insert({
      name,
      slug,
      partner_type: requiredText(body.partner_type) || "parceiro",
      contact_name: requiredText(body.contact_name) || null,
      email: requiredText(body.email) || null,
      whatsapp: requiredText(body.whatsapp) || null,
      commission_percentage: normalizePercentage(body.commission_percentage),
      status: requiredText(body.status) || "ativo",
      notes: requiredText(body.notes) || null,
    })
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Já existe um parceiro com este slug." : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ partner: data }, { status: 201 });
}
