/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";

type RouteProps = { params: Promise<{ id: string }> };

function campaignClientId(contribution: any) {
  const campaign = Array.isArray(contribution?.campaigns)
    ? contribution.campaigns[0]
    : contribution?.campaigns;
  return campaign?.client_id || null;
}

export async function DELETE(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { supabase, appUser } = await requireAdminFromRequest(request);

    const { data: contribution, error: contributionError } = await supabase
      .from("inc_contributions")
      .select(`
        id,
        campaign_id,
        participant_id,
        status,
        amount_cents,
        selected_numbers,
        proof_file_path,
        acompanhamento_token,
        campaigns:inc_campaigns(client_id)
      `)
      .eq("id", id)
      .maybeSingle();

    if (contributionError || !contribution) {
      return NextResponse.json(
        { error: "Reserva não encontrada." },
        { status: 404 },
      );
    }

    const clientId = campaignClientId(contribution);
    if (appUser.role !== "owner" && appUser.client_id !== clientId) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    if (contribution.status !== "awaiting_payment") {
      return NextResponse.json(
        {
          error:
            "Somente reservas com status aguardando pagamento/comprovante podem ser excluídas.",
        },
        { status: 400 },
      );
    }

    if (contribution.proof_file_path) {
      return NextResponse.json(
        {
          error:
            "Esta reserva já possui comprovante. Faça a conferência/rejeição em vez de excluí-la.",
        },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase.rpc(
      "inc_admin_delete_awaiting_reservation",
      {
        p_contribution_id: id,
        p_actor_user_id: appUser.id,
      },
    );

    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao excluir reserva." },
      { status: 500 },
    );
  }
}
