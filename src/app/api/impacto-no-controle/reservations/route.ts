import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/impacto-no-controle/supabase/admin";
import { buyerDisplayName, normalizePhone } from "@/lib/impacto-no-controle/format";

export const runtime = "nodejs";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type CampaignNumberRow = {
  number: number;
  status: string | null;
};

type CampaignQuotaRow = {
  id: string;
  amount_cents: number | null;
};

function safeQuotaMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries: Array<[string, number]> = Object.entries(value as Record<string, unknown>)
    .map(([id, qty]): [string, number] => [id, Number(qty)])
    .filter(([, qty]) => Number.isFinite(qty) && qty > 0);

  return Object.fromEntries(entries);
}

function normalizeSelectedNumbers(value: unknown): number[] {
  const rawNumbers = Array.isArray(value) ? value : [];

  const parsedNumbers = rawNumbers
    .map((item: unknown): number => Number(item))
    .filter((number): number is number => Number.isInteger(number) && number > 0);

  return Array.from(new Set<number>(parsedNumbers)).sort((a: number, b: number) => a - b);
}

async function releaseExpiredReservations(supabase: SupabaseAdminClient, campaignId?: string) {
  const nowIso = new Date().toISOString();

  let numbersQuery = supabase
    .from("inc_campaign_numbers")
    .update({
      status: "available",
      participant_id: null,
      contribution_id: null,
      buyer_display_name: null,
      reserved_until: null,
    })
    .eq("status", "reserved")
    .lt("reserved_until", nowIso);

  if (campaignId) numbersQuery = numbersQuery.eq("campaign_id", campaignId);
  await numbersQuery;

  let contributionsQuery = supabase
    .from("inc_contributions")
    .update({ status: "canceled", note: "Reserva expirada automaticamente antes do envio do comprovante." })
    .eq("status", "awaiting_payment")
    .lt("reservation_expires_at", nowIso);

  if (campaignId) contributionsQuery = contributionsQuery.eq("campaign_id", campaignId);
  await contributionsQuery;
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();

    const campaignSlug = String(body.campaign_slug || "").trim();
    const name = String(body.name || "").trim();
    const phone = normalizePhone(String(body.phone || ""));
    const email = String(body.email || "").trim() || null;
    const uniqueNumbers = normalizeSelectedNumbers(body.selected_numbers);
    const selectedQuotas = safeQuotaMap(body.selected_quotas);

    if (!campaignSlug) return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Informe o nome." }, { status: 400 });
    if (phone.length < 10) return NextResponse.json({ error: "Informe um celular válido." }, { status: 400 });

    const { data: campaign, error: campaignError } = await supabase
      .from("inc_campaigns")
      .select("id, client_id, slug, title, status, number_price_cents, starts_at, ends_at, reservation_minutes")
      .eq("slug", campaignSlug)
      .maybeSingle();

    if (campaignError || !campaign || campaign.status !== "active") {
      return NextResponse.json({ error: "Campanha não encontrada ou indisponível." }, { status: 404 });
    }

    const now = Date.now();
    const startsAt = campaign.starts_at ? new Date(campaign.starts_at).getTime() : null;
    const endsAt = campaign.ends_at ? new Date(campaign.ends_at).getTime() : null;
    if ((startsAt && now < startsAt) || (endsAt && now > endsAt)) {
      return NextResponse.json({ error: "Esta campanha ainda não está aberta ou já foi encerrada." }, { status: 400 });
    }

    await releaseExpiredReservations(supabase, campaign.id);

    if (!uniqueNumbers.length && !Object.keys(selectedQuotas).length) {
      return NextResponse.json({ error: "Escolha pelo menos um número para reservar." }, { status: 400 });
    }

    if (uniqueNumbers.length) {
      const { data: available, error: numError } = await supabase
        .from("inc_campaign_numbers")
        .select("number,status")
        .eq("campaign_id", campaign.id)
        .in("number", uniqueNumbers);

      if (numError) throw numError;

      const availableNumbers = (available || []) as CampaignNumberRow[];
      const allNumbersAvailable =
        availableNumbers.length === uniqueNumbers.length &&
        availableNumbers.every((numberRow) => numberRow.status === "available");

      if (!allNumbersAvailable) {
        return NextResponse.json({ error: "Um ou mais números escolhidos já foram reservados. Atualize a página e escolha novamente." }, { status: 409 });
      }
    }

    const quotaArray = Object.entries(selectedQuotas)
      .map(([quotaId, qty]) => ({ quota_id: quotaId, qty: Number(qty) }))
      .filter((item) => item.qty > 0);

    const quotaIds = quotaArray.map((quota) => quota.quota_id);
    const { data: quotaRows, error: quotaError } = quotaIds.length
      ? await supabase.from("inc_campaign_quotas").select("id,amount_cents").eq("campaign_id", campaign.id).in("id", quotaIds)
      : { data: [], error: null };

    if (quotaError) throw quotaError;

    const quotaMap = Object.fromEntries(
      ((quotaRows || []) as CampaignQuotaRow[]).map((quota) => [quota.id, Number(quota.amount_cents || 0)])
    );
    const quotaAmountCents = quotaArray.reduce((sum, item) => sum + (Number(quotaMap[item.quota_id] || 0) * item.qty), 0);
    const amountCents = uniqueNumbers.length * Number(campaign.number_price_cents || 0) + quotaAmountCents;

    if (amountCents <= 0) return NextResponse.json({ error: "Valor inválido para a reserva." }, { status: 400 });

    const { data: participant, error: participantError } = await supabase
      .from("inc_participants")
      .upsert({ client_id: campaign.client_id, name, phone, email, consent_at: new Date().toISOString() }, { onConflict: "client_id,phone" })
      .select("id")
      .single();

    if (participantError) throw participantError;

    const reservationMinutes = Math.max(5, Number(campaign.reservation_minutes || 30));
    const reservationExpiresAt = new Date(Date.now() + reservationMinutes * 60 * 1000).toISOString();
    const contributionType = uniqueNumbers.length && quotaArray.length ? "mixed" : uniqueNumbers.length ? "numbers" : "quota";

    const { data: contribution, error: contributionError } = await supabase
      .from("inc_contributions")
      .insert({
        campaign_id: campaign.id,
        participant_id: participant.id,
        type: contributionType,
        status: "awaiting_payment",
        amount_cents: amountCents,
        selected_numbers: uniqueNumbers,
        selected_quotas: quotaArray,
        reservation_expires_at: reservationExpiresAt,
        note: "Reserva criada. Aguardando envio do comprovante do Pix.",
      })
      .select("id, acompanhamento_token")
      .single();

    if (contributionError) throw contributionError;

    if (uniqueNumbers.length) {
      const display = buyerDisplayName(name, phone);
      const { error: updateNumbersError } = await supabase
        .from("inc_campaign_numbers")
        .update({
          status: "reserved",
          participant_id: participant.id,
          contribution_id: contribution.id,
          buyer_display_name: display,
          reserved_until: reservationExpiresAt,
        })
        .eq("campaign_id", campaign.id)
        .in("number", uniqueNumbers);

      if (updateNumbersError) throw updateNumbersError;
    }

    return NextResponse.json({
      ok: true,
      token: contribution.acompanhamento_token,
      reservation_expires_at: reservationExpiresAt,
      redirect_url: `/solucoes/impacto-no-controle/reserva/${contribution.acompanhamento_token}`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao reservar números. Tente novamente." }, { status: 500 });
  }
}
