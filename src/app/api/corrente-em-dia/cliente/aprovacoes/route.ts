import { NextResponse } from "next/server";
import { getCorrenteAuthContext } from "@/lib/corrente-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;
  if (!auth.context.isManager) {
    return NextResponse.json({ error: "Apenas responsáveis podem acessar aprovações." }, { status: 403 });
  }

  const { data: contributions, error } = await supabaseAdmin
    .from("ced_contributions")
    .select(
      `
      id,
      reference_month,
      expected_amount,
      due_date,
      pix_key_expected,
      status,
      notes,
      person:ced_people(id, full_name, email, whatsapp),
      receipts:ced_payment_receipts(id, file_name, informed_amount, ocr_pix_key, validation_status, validation_notes, created_at)
    `,
    )
    .eq("organization_id", auth.context.organizationId)
    .order("reference_month", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contributions: contributions ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;
  if (!auth.context.isManager) {
    return NextResponse.json({ error: "Apenas responsáveis podem revisar contribuições." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const contributionId = text(body.contribution_id);
  const receiptId = text(body.receipt_id);
  const decision = text(body.decision) || "pedir_correcao";
  const notes = text(body.notes);

  if (!contributionId || !receiptId) {
    return NextResponse.json({ error: "Informe contribuição e comprovante." }, { status: 400 });
  }

  const statusByDecision: Record<string, string> = {
    aprovado: "aprovado",
    reprovado: "reprovado",
    pedir_correcao: "divergente",
  };

  const contributionStatus = statusByDecision[decision] ?? "divergente";

  const { error: reviewError } = await supabaseAdmin.from("ced_contribution_reviews").insert({
    receipt_id: receiptId,
    contribution_id: contributionId,
    reviewer_person_id: auth.context.person.id,
    reviewer_auth_user_id: auth.context.user.id,
    decision,
    notes,
  });

  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 });

  const { error: contributionError } = await supabaseAdmin
    .from("ced_contributions")
    .update({ status: contributionStatus, notes: notes || null })
    .eq("id", contributionId)
    .eq("organization_id", auth.context.organizationId);

  if (contributionError) return NextResponse.json({ error: contributionError.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: contributionStatus });
}
