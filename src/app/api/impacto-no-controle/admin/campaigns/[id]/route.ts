/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";
import { impactoPixDefaults } from "@/lib/impacto-no-controle/config";

type RouteProps = { params: Promise<{ id: string }> };

async function getCampaignForAccess(supabase: any, id: string) {
  const { data: campaign, error } = await supabase
    .from("inc_campaigns")
    .select("*, clients:inc_clients(name, slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return campaign;
}

function toNullableString(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { supabase, appUser } = await requireAdminFromRequest(request);

    const campaignRaw = await getCampaignForAccess(supabase, id);
    if (!campaignRaw) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
    if (appUser.role !== "owner" && appUser.client_id !== campaignRaw.client_id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

    const pixDefaults = impactoPixDefaults();
    const campaign = {
      ...campaignRaw,
      client_name: campaignRaw.clients?.name,
      client_slug: campaignRaw.clients?.slug,
      pix_key: campaignRaw.pix_key || pixDefaults.key,
      pix_receiver_name: campaignRaw.pix_receiver_name || pixDefaults.receiverName,
      pix_city: campaignRaw.pix_city || pixDefaults.city,
    };

    const [numbersRes, contributionsRes, messagesRes, statsRes, quotasRes] = await Promise.all([
      supabase.from("inc_campaign_numbers").select("number,status,buyer_display_name").eq("campaign_id", id).order("number"),
      supabase.from("inc_admin_contributions").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
      supabase.from("inc_message_templates").select("id,title,body,channel,purpose").eq("campaign_id", id).order("sort_order"),
      supabase.from("inc_campaign_stats_public").select("*").eq("campaign_id", id).maybeSingle(),
      supabase.from("inc_campaign_quotas").select("id,title,description,amount_cents,impact_qty,is_active,sort_order").eq("campaign_id", id).order("sort_order"),
    ]);

    if (numbersRes.error) throw numbersRes.error;
    if (contributionsRes.error) throw contributionsRes.error;
    if (messagesRes.error) throw messagesRes.error;
    if (statsRes.error) throw statsRes.error;
    if (quotasRes.error) throw quotasRes.error;

    return NextResponse.json({ campaign, numbers: numbersRes.data || [], contributions: contributionsRes.data || [], messages: messagesRes.data || [], stats: statsRes.data, quotas: quotasRes.data || [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Acesso não autorizado ou erro ao carregar campanha." }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { supabase, appUser } = await requireAdminFromRequest(request);
    const campaign = await getCampaignForAccess(supabase, id);
    if (!campaign) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
    if (appUser.role !== "owner" && appUser.client_id !== campaign.client_id) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

    const body = await request.json();
    const payload: Record<string, unknown> = {
      title: String(body.title || campaign.title).trim(),
      subtitle: toNullableString(body.subtitle),
      story: toNullableString(body.story),
      prize_title: toNullableString(body.prize_title),
      prize_description: toNullableString(body.prize_description),
      main_image_url: toNullableString(body.main_image_url),
      prize_image_url: toNullableString(body.prize_image_url),
      gallery_images: Array.isArray(body.gallery_images)
        ? body.gallery_images.map((item: unknown) => String(item || "").trim()).filter(Boolean)
        : [],
      starts_at: toNullableString(body.starts_at),
      ends_at: toNullableString(body.ends_at),
      status: body.status || campaign.status,
      target_amount_cents: Math.max(0, Number(body.target_amount_cents || 0)),
      extended_amount_cents: Math.max(0, Number(body.extended_amount_cents || 0)),
      impact_unit: String(body.impact_unit || campaign.impact_unit || "participações").trim(),
      impact_value_cents: Math.max(0, Number(body.impact_value_cents || 0)),
      number_count: Math.max(0, Number(body.number_count || 0)),
      number_price_cents: Math.max(0, Number(body.number_price_cents || 0)),
      pix_key: toNullableString(body.pix_key),
      pix_receiver_name: toNullableString(body.pix_receiver_name),
      pix_city: toNullableString(body.pix_city),
      regulation_text: toNullableString(body.regulation_text),
      data_consent_text: toNullableString(body.data_consent_text),
      show_buyer_names: Boolean(body.show_buyer_names),
      reservation_minutes: Math.max(15, Number(body.reservation_minutes || 1440)),
      intro_modal_enabled: Boolean(body.intro_modal_enabled),
      intro_modal_title: toNullableString(body.intro_modal_title),
      intro_modal_body: toNullableString(body.intro_modal_body),
    };

    const numberCount = payload.number_count as number;
    if (numberCount !== campaign.number_count) {
      if (numberCount > campaign.number_count) {
        const rows = Array.from({ length: numberCount - campaign.number_count }, (_, idx) => ({ campaign_id: id, number: campaign.number_count + idx + 1 }));
        if (rows.length) {
          const { error: insertError } = await supabase.from("inc_campaign_numbers").insert(rows);
          if (insertError) throw insertError;
        }
      } else {
        const { data: locked, error: lockedError } = await supabase
          .from("inc_campaign_numbers")
          .select("number,status")
          .eq("campaign_id", id)
          .gt("number", numberCount)
          .neq("status", "available");
        if (lockedError) throw lockedError;
        if (locked?.length) return NextResponse.json({ error: "Não é possível reduzir a quantidade porque há números acima do novo limite já reservados ou confirmados." }, { status: 400 });
        const { error: deleteError } = await supabase.from("inc_campaign_numbers").delete().eq("campaign_id", id).gt("number", numberCount);
        if (deleteError) throw deleteError;
      }
    }

    const { error: updateError } = await supabase.from("inc_campaigns").update(payload).eq("id", id);
    if (updateError) throw updateError;

    await supabase.from("inc_audit_logs").insert({
      actor_user_id: appUser.id,
      client_id: campaign.client_id,
      campaign_id: id,
      action: "campaign_updated",
      payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao salvar configurações da campanha." }, { status: 500 });
  }
}
