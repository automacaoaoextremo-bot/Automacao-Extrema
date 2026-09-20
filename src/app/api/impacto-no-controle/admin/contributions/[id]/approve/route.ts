/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";

type RouteProps = { params: Promise<{ id: string }> };

function normalizePayerMatch(value: unknown) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { supabase, appUser } = await requireAdminFromRequest(request);
    const body = await request.json().catch(() => ({}));

    const paymentOccurredAtRaw = String(body.payment_occurred_at || "").trim();
    const paymentOccurredAt = paymentOccurredAtRaw ? new Date(paymentOccurredAtRaw) : null;
    const payerMatchesParticipant = normalizePayerMatch(body.payer_matches_participant);
    const payerNameInput = String(body.payer_name || "").trim();

    if (!paymentOccurredAt || Number.isNaN(paymentOccurredAt.getTime())) {
      return NextResponse.json(
        { error: "Informe a data e o horário que constam no comprovante." },
        { status: 400 },
      );
    }

    if (paymentOccurredAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "A data/hora do pagamento não pode estar no futuro." },
        { status: 400 },
      );
    }

    if (payerMatchesParticipant === null) {
      return NextResponse.json(
        { error: "Confirme se o nome do pagador é o mesmo do participante." },
        { status: 400 },
      );
    }

    const { data: contribution, error: cError } = await supabase
      .from("inc_contributions")
      .select(`
        id,
        campaign_id,
        participant_id,
        selected_numbers,
        status,
        proof_file_path,
        payment_method,
        campaigns:inc_campaigns(client_id),
        participants:inc_participants(name)
      `)
      .eq("id", id)
      .maybeSingle();

    if (cError || !contribution) {
      return NextResponse.json({ error: "Participação não encontrada." }, { status: 404 });
    }

    const campaign = Array.isArray((contribution as any).campaigns)
      ? (contribution as any).campaigns[0]
      : (contribution as any).campaigns;
    const participant = Array.isArray((contribution as any).participants)
      ? (contribution as any).participants[0]
      : (contribution as any).participants;

    const campaignClientId = campaign?.client_id;
    if (appUser.role !== "owner" && appUser.client_id !== campaignClientId) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    if (contribution.status !== "pending_approval") {
      return NextResponse.json(
        { error: "Somente participações aguardando conferência podem ser aprovadas." },
        { status: 400 },
      );
    }

    if (!contribution.proof_file_path) {
      return NextResponse.json(
        { error: "A participação ainda não possui comprovante registrado." },
        { status: 400 },
      );
    }

    const participantName = String(participant?.name || "Participante").trim();
    const payerName = payerMatchesParticipant ? participantName : payerNameInput;

    if (!payerMatchesParticipant && !payerName) {
      return NextResponse.json(
        { error: "Informe o nome que consta no comprovante." },
        { status: 400 },
      );
    }

    const { data: approvalResult, error: approvalError } = await supabase.rpc(
      "inc_admin_approve_contribution",
      {
        p_contribution_id: id,
        p_actor_user_id: appUser.id,
        p_payment_occurred_at: paymentOccurredAt.toISOString(),
        p_payer_matches_participant: payerMatchesParticipant,
        p_payer_name: payerName,
      },
    );

    if (approvalError) {
      if (approvalError.code === "P0001") {
        return NextResponse.json(
          { error: approvalError.message || "Não foi possível aprovar a participação." },
          { status: 400 },
        );
      }
      throw approvalError;
    }

    return NextResponse.json({ ok: true, approval: approvalResult });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao aprovar participação." }, { status: 500 });
  }
}
