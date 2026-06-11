import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser(request);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();

  const payload: Record<string, unknown> = {};

  if ("condition_label" in body) payload.condition_label = String(body.condition_label || "Cliente Fundador");
  if ("contract_status" in body) payload.contract_status = String(body.contract_status || "rascunho");
  if ("fee_status" in body) payload.fee_status = String(body.fee_status || "em_definicao");
  if ("setup_fee" in body) payload.setup_fee = numericOrNull(body.setup_fee) ?? 0;
  if ("monthly_fee" in body) payload.monthly_fee = numericOrNull(body.monthly_fee) ?? 0;
  if ("operational_fee_percentage" in body) payload.operational_fee_percentage = numericOrNull(body.operational_fee_percentage);
  if ("federation_percentage" in body) payload.federation_percentage = numericOrNull(body.federation_percentage) ?? 0;
  if ("ae_percentage" in body) payload.ae_percentage = numericOrNull(body.ae_percentage) ?? 0;
  if ("partner_percentage" in body) payload.partner_percentage = numericOrNull(body.partner_percentage) ?? 0;
  if ("unlinked_reserve_percentage" in body) payload.unlinked_reserve_percentage = numericOrNull(body.unlinked_reserve_percentage) ?? 0;
  if ("pilot_days" in body) payload.pilot_days = Number(body.pilot_days || 90);
  if ("allow_testimonial" in body) payload.allow_testimonial = body.allow_testimonial === true;
  if ("allow_logo_use" in body) payload.allow_logo_use = body.allow_logo_use === true;
  if ("revision_notes" in body) payload.revision_notes = body.revision_notes ? String(body.revision_notes) : null;
  if ("notes" in body) payload.notes = body.notes ? String(body.notes) : null;

  const { data, error } = await supabaseAdmin
    .from("ced_client_terms")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clientTerm: data });
}
