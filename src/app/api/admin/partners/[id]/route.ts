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

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await request.json();
  const name = requiredText(body.name);
  const slug = toSlug(requiredText(body.slug) || name);

  if (!name || !slug) {
    return NextResponse.json({ error: "Preencha nome e slug." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ae_partners")
    .update({
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
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ partner: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const { error } = await supabaseAdmin
    .from("ae_partners")
    .update({ status: "arquivado" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
