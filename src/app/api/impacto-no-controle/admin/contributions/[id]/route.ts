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
        selected_quotas,
        proof_file_path,
        proof_file_hash,
        acompanhamento_token,
        approved_at,
        rejected_reason,
        note,
        created_at,
        campaigns:inc_campaigns(client_id)
      `)
      .eq("id", id)
      .maybeSingle();

    if (contributionError || !contribution) {
      return NextResponse.json(
        { error: "Pagamento/participação não encontrado." },
        { status: 404 },
      );
    }

    const clientId = campaignClientId(contribution);
    if (appUser.role !== "owner" && appUser.client_id !== clientId) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "inc_admin_delete_contribution",
      {
        p_contribution_id: id,
        p_actor_user_id: appUser.id,
      },
    );

    if (rpcError) throw rpcError;

    const result =
      rpcResult && typeof rpcResult === "object"
        ? (rpcResult as Record<string, unknown>)
        : {};

    const proofPath =
      typeof result.proof_file_path === "string"
        ? result.proof_file_path
        : contribution.proof_file_path;

    let storageCleanupWarning: string | null = null;

    if (proofPath) {
      const { error: storageError } = await supabase.storage
        .from("impacto-no-controle-proofs")
        .remove([proofPath]);

      if (storageError) {
        console.error(
          "Falha ao remover comprovante órfão do Storage após excluir participação:",
          storageError,
        );
        storageCleanupWarning =
          "A participação foi excluída, mas o arquivo do comprovante não pôde ser removido automaticamente do Storage.";
      }
    }

    return NextResponse.json({
      ok: true,
      previous_status: result.previous_status || contribution.status,
      released_numbers: result.released_numbers || contribution.selected_numbers || [],
      storage_cleanup_warning: storageCleanupWarning,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao excluir pagamento/participação." },
      { status: 500 },
    );
  }
}
