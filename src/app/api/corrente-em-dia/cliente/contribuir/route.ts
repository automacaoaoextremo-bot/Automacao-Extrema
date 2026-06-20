import { NextResponse } from "next/server";
import { getCorrenteAuthContext } from "@/lib/corrente-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(".", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function currentMonthDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function dueDate(referenceMonth: string, dueDay: number | null) {
  if (!dueDay) return null;
  const [year, month] = referenceMonth.split("-");
  return `${year}-${month}-${String(Math.min(Math.max(dueDay, 1), 28)).padStart(2, "0")}`;
}

function pixPayload(input: { pixKey: string | null; amount: number | null; receiver: string | null }) {
  return `PIX para ${input.receiver ?? "organização"}: ${input.pixKey ?? "chave não configurada"} | Valor: ${Number(input.amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}

async function ensureContribution(input: { organizationId: string; personId: string }) {
  const referenceMonth = currentMonthDate();
  const { data: existing } = await supabaseAdmin
    .from("ced_contributions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("person_id", input.personId)
    .eq("reference_month", referenceMonth)
    .maybeSingle();

  if (existing) return existing;

  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("ced_organizations")
    .select("pix_key, pix_receiver_name, default_individual_amount, contribution_due_day, contribution_due_mode")
    .eq("id", input.organizationId)
    .single();

  if (organizationError) throw organizationError;

  const { data: rule } = await supabaseAdmin
    .from("ced_contribution_rules")
    .select("id, amount, due_day, due_mode")
    .eq("organization_id", input.organizationId)
    .eq("person_id", input.personId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const amount = rule?.amount ?? organization.default_individual_amount ?? 0;
  const day = rule?.due_day ?? organization.contribution_due_day ?? null;

  const { data, error } = await supabaseAdmin
    .from("ced_contributions")
    .insert({
      organization_id: input.organizationId,
      contribution_rule_id: rule?.id ?? null,
      person_id: input.personId,
      reference_month: referenceMonth,
      expected_amount: amount,
      due_date: dueDate(referenceMonth, day),
      pix_key_expected: organization.pix_key,
      pix_receiver_expected: organization.pix_receiver_name,
      pix_payload: pixPayload({ pixKey: organization.pix_key, amount, receiver: organization.pix_receiver_name }),
      status: "em_aberto",
      generated_by: "acesso_cliente",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const contribution = await ensureContribution({ organizationId: auth.context.organizationId, personId: auth.context.person.id });

    const { data: organization } = await supabaseAdmin
      .from("ced_organizations")
      .select("name, pix_key, pix_receiver_name")
      .eq("id", auth.context.organizationId)
      .maybeSingle();

    const { data: history } = await supabaseAdmin
      .from("ced_contributions")
      .select("id, reference_month, expected_amount, due_date, status, created_at")
      .eq("organization_id", auth.context.organizationId)
      .eq("person_id", auth.context.person.id)
      .order("reference_month", { ascending: false })
      .limit(12);

    return NextResponse.json({ contribution, organization, history: history ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar contribuição.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const contributionId = text(body.contribution_id);
  if (!contributionId) return NextResponse.json({ error: "Contribuição não informada." }, { status: 400 });

  const informedAmount = numberOrNull(body.informed_amount);
  const ocrPixKey = text(body.pix_key);
  const fileName = text(body.file_name) || "comprovante-informado-manualmente.pdf";
  const recurringPixUsed = Boolean(body.recurring_pix_used);
  const recurringPixUntil = text(body.recurring_pix_until) || null;

  const { data: contribution, error: contributionError } = await supabaseAdmin
    .from("ced_contributions")
    .select("id, expected_amount, pix_key_expected")
    .eq("id", contributionId)
    .eq("organization_id", auth.context.organizationId)
    .maybeSingle();

  if (contributionError) return NextResponse.json({ error: contributionError.message }, { status: 500 });
  if (!contribution) return NextResponse.json({ error: "Contribuição não encontrada." }, { status: 404 });

  const amountOk = informedAmount !== null && Number(informedAmount) === Number(contribution.expected_amount ?? 0);
  const pixOk = !ocrPixKey || !contribution.pix_key_expected || ocrPixKey === contribution.pix_key_expected;
  const validationStatus = amountOk && pixOk ? "pre_validado" : "divergente";

  const { data: receipt, error } = await supabaseAdmin
    .from("ced_payment_receipts")
    .insert({
      contribution_id: contributionId,
      uploaded_by_person_id: auth.context.person.id,
      file_name: fileName,
      informed_amount: informedAmount,
      ocr_amount: informedAmount,
      ocr_pix_key: ocrPixKey || null,
      validation_status: validationStatus,
      validation_notes: validationStatus === "pre_validado" ? "Valor e Pix conferem com o esperado." : "Comprovante precisa de revisão humana.",
      raw_text: recurringPixUsed ? `Pix recorrente informado até ${recurringPixUntil ?? "data não informada"}` : null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin
    .from("ced_contributions")
    .update({ status: validationStatus === "pre_validado" ? "pre_validado" : "divergente" })
    .eq("id", contributionId);

  return NextResponse.json({ receipt, validationStatus });
}
