import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { buildDaniela50ReminderMessage, buildPublicConfirmationUrl, DANIELA50_CAMPAIGNS, daniela50CampaignLabel, type Daniela50Campaign } from "@/lib/presenca-daniela50";
import { reminderTargets, type ReminderGuest } from "@/lib/presenca-reminder-targets";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// ID estável por evento/campanha/convidado: duas requisições simultâneas não criam duplicatas.
function campaignMessageId(eventId: string, guestId: string, campaign: Daniela50Campaign) {
  const hex = createHash("sha256").update(JSON.stringify(["pq-daniela50-2026", eventId, guestId, campaign])).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function POST(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;
  const { event, eventId } = auth.context;
  if (!["daniela-50-anos", "daniela-50-anos-demo"].includes(event.slug)) return NextResponse.json({ error: "Campanhas específicas da Daniela 50 anos." }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const campaign = body?.campaign as Daniela50Campaign;
  if (typeof campaign !== "string" || !Object.prototype.hasOwnProperty.call(DANIELA50_CAMPAIGNS, campaign)) return NextResponse.json({ error: "Selecione uma campanha válida." }, { status: 400 });
  if (campaign === "thank-you") return NextResponse.json({ error: "Agradecimento reservado para a etapa pós-festa, após conferência da presença real." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("pq_guests").select("id,full_name,individual_token,whatsapp,guest_status,primary_guest_id,is_invite_recipient,is_active").eq("event_id", eventId).eq("is_active", true).order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { targets, skippedNoRecipient } = reminderTargets((data ?? []) as ReminderGuest[], campaign);
  const phase = DANIELA50_CAMPAIGNS[campaign].phase;
  const label = daniela50CampaignLabel(campaign);
  const { data: existing, error: existingError } = await supabaseAdmin.from("pq_guest_messages").select("id,guest_id,approval_status,is_active,message_text,sent_at,status").eq("event_id", eventId).eq("message_phase", phase).eq("template_label", label);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const byAudience = { confirmado: 0, talvez: 0, pendente: 0 };
  const targetIds = new Set(targets.map((target) => target.recipient.id));
  let generated = 0, preserved = 0;
  const reviewIds: string[] = [];
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
  const { count, error: notesError } = await supabaseAdmin.from("pq_guest_messages").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("message_phase", "recado_convidado").eq("approval_status", "aprovado").eq("is_active", true);
  if (notesError) return NextResponse.json({ error: notesError.message }, { status: 500 });
  const previews = targets.map(({ recipient, audience, pendingNames, confirmedNames, mixed }) => {
    byAudience[audience] += 1;
    const text = buildDaniela50ReminderMessage({ guest: recipient, event, confirmationUrl: buildPublicConfirmationUrl({ baseUrl, event, token: recipient.individual_token! }), audience, campaign, pendingNames, confirmedNames, mixed, notesReady: Boolean(count) });
    return { recipient, text };
  });
  // Preserva aprovados e enviados. Qualquer mudança de elegibilidade ou texto exige revisão manual.
  for (const row of existing ?? []) {
    const preview = previews.find((item) => item.recipient.id === row.guest_id);
    if (!row.is_active) continue;
    if (!preview || row.message_text !== preview.text) {
      if (row.approval_status === "aprovado" || row.sent_at || row.status === "enviado" || !targetIds.has(row.guest_id)) reviewIds.push(row.id);
    }
  }
  if (body?.dryRun === true) return NextResponse.json({ ok: true, generated, byAudience, skippedNoRecipient, needsReview: reviewIds.length, reviewIds, targets: targets.length, eligibleGuestIds: [...targetIds] });
  for (const { recipient, text } of previews) {
    const rows = (existing ?? []).filter((row) => row.guest_id === recipient.id);
    if (rows.length > 1 || rows.some((row) => row.approval_status === "aprovado" || row.sent_at || row.status === "enviado" || row.is_active === false || row.approval_status === "reprovado")) { preserved += 1; continue; }
    const payload = { event_id: eventId, guest_id: recipient.id, message_phase: phase, channel: "whatsapp", template_label: label, message_text: text, status: "aguardando_aprovacao", approval_status: "pendente", is_active: true };
    const result = rows[0]
      ? await supabaseAdmin.from("pq_guest_messages").update(payload).eq("id", rows[0].id).eq("event_id", eventId).eq("approval_status", "pendente").is("sent_at", null).eq("is_active", true).select("id")
      : await supabaseAdmin.from("pq_guest_messages").insert({ ...payload, id: campaignMessageId(eventId, recipient.id, campaign) }).select("id");
    if (result.error?.code === "23505" && !rows[0]) { preserved += 1; continue; }
    if (result.error) return NextResponse.json({ error: result.error.message, generated }, { status: 500 });
    if (result.data?.length) generated += 1;
    else preserved += 1;
  }
  return NextResponse.json({ ok: true, generated, preserved, byAudience, skippedNoRecipient, needsReview: reviewIds.length, reviewIds, targets: targets.length, eligibleGuestIds: [...targetIds] });
}
