import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { buildPersonalizedInvitationMessage, buildPublicConfirmationUrl } from "@/lib/presenca-daniela50";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

export async function POST(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const { data: guests, error: guestsError } = await supabaseAdmin
    .from("pq_guests")
    .select("*")
    .eq("event_id", auth.context.eventId)
    .eq("is_active", true)
    .eq("is_invite_recipient", true)
    .is("primary_guest_id", null)
    .order("full_name", { ascending: true });

  if (guestsError) return NextResponse.json({ error: guestsError.message }, { status: 500 });

  let generated = 0;
  let skipped = 0;
  const baseUrl = siteUrl();

  for (const guest of guests ?? []) {
    const confirmationUrl = buildPublicConfirmationUrl({ baseUrl, event: auth.context.event, token: guest.individual_token });
    const messageText = buildPersonalizedInvitationMessage({ guest, event: auth.context.event, confirmationUrl });

    const { data: existing } = await supabaseAdmin
      .from("pq_guest_messages")
      .select("id, approval_status")
      .eq("event_id", auth.context.eventId)
      .eq("guest_id", guest.id)
      .eq("message_phase", "convite_oficial")
      .maybeSingle();

    if (existing?.approval_status === "aprovado") {
      skipped += 1;
      continue;
    }

    const payload = {
      event_id: auth.context.eventId,
      guest_id: guest.id,
      message_phase: "convite_oficial",
      channel: "whatsapp",
      template_label: "Convite curto com link da LP",
      message_text: messageText,
      status: "aguardando_aprovacao",
      approval_status: "pendente",
      is_active: true,
    };

    const result = existing?.id
      ? await supabaseAdmin.from("pq_guest_messages").update(payload).eq("id", existing.id)
      : await supabaseAdmin.from("pq_guest_messages").insert(payload);

    if (result.error) {
      skipped += 1;
      continue;
    }

    await supabaseAdmin
      .from("pq_guests")
      .update({ message_preview: messageText, approval_status: "pendente" })
      .eq("id", guest.id)
      .eq("event_id", auth.context.eventId);

    generated += 1;
  }

  return NextResponse.json({ ok: true, generated, skipped });
}
