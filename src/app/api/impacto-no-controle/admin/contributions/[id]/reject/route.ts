/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";

type RouteProps = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { reason } = await request.json().catch(() => ({ reason: "Pagamento não localizado." }));
    const { supabase, appUser } = await requireAdminFromRequest(request);

    const { data: contribution, error: cError } = await supabase
      .from("inc_contributions")
      .select("id,campaign_id,selected_numbers,campaigns:inc_campaigns(client_id)")
      .eq("id", id)
      .maybeSingle();
    if (cError || !contribution) return NextResponse.json({ error: "Participação não encontrada." }, { status: 404 });

    const campaignClientId = (contribution.campaigns as any)?.client_id;
    if (appUser.role !== "owner" && appUser.client_id !== campaignClientId) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

    const { error: updateError } = await supabase
      .from("inc_contributions")
      .update({ status: "rejected", rejected_reason: reason || "Pagamento não localizado." })
      .eq("id", id);
    if (updateError) throw updateError;

    if (contribution.selected_numbers?.length) {
      const { error: numbersError } = await supabase
        .from("inc_campaign_numbers")
        .update({ status: "available", participant_id: null, contribution_id: null, buyer_display_name: null, reserved_until: null, confirmed_at: null })
        .eq("campaign_id", contribution.campaign_id)
        .eq("contribution_id", id);
      if (numbersError) throw numbersError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao rejeitar participação." }, { status: 500 });
  }
}
