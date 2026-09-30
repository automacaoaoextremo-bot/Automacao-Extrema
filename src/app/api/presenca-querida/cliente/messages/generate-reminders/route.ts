import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { buildDaniela50ReminderMessage, buildPublicConfirmationUrl, type Daniela50ReminderAudience } from "@/lib/presenca-daniela50";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

function audienceFor(status: unknown): Daniela50ReminderAudience | null {
  const value = String(status ?? "pendente").trim().toLowerCase();
  if (value === "confirmado" || value === "confirmado_com_acompanhantes") return "confirmado";
  if (value === "talvez") return "talvez";
  if (value === "pendente" || value === "reservou_data" || !value) return "pendente";
  return null;
}

export async function POST(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const { data: guests, error: guestsError } = await supabaseAdmin
    .from("pq_guests")
    .select("id,full_name,individual_token,guest_status,is_active,is_invite_recipient,primary_guest_id")
    .eq("event_id", auth.context.eventId)
    .eq("is_active", true)
    .eq("is_invite_recipient", true)
    .is("primary_guest_id", null)
    .order("full_name");
  if (guestsError) return NextResponse.json({ error: guestsError.message }, { status: 500 });

  let generated = 0;
  const byAudience = { confirmado: 0, talvez: 0, pendente: 0 };
  for (const guest of guests ?? []) {
    const audience = audienceFor(guest.guest_status);
    if (!audience || !guest.individual_token) continue;
    const confirmationUrl = buildPublicConfirmationUrl({ baseUrl: siteUrl(), event: auth.context.event, token: guest.individual_token });
    const messageText = buildDaniela50ReminderMessage({ guest, event: auth.context.event, confirmationUrl, audience });
    const phase = audience === "confirmado" ? "lembrete_confirmados" : audience === "talvez" ? "lembrete_talvez" : "lembrete_pendentes";
    const templateLabel = `Daniela 50 anos · lembrete ${audience} · Sky Bartenders`;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("pq_guest_messages")
      .select("id,approval_status")
      .eq("event_id", auth.context.eventId)
      .eq("guest_id", guest.id)
      .eq("message_phase", phase)
      .eq("template_label", templateLabel)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (String(existing?.approval_status ?? "").toLowerCase() === "aprovado") continue;

    const payload = { event_id: auth.context.eventId, guest_id: guest.id, message_phase: phase, channel: "whatsapp", template_label: templateLabel, message_text: messageText, status: "aguardando_aprovacao", approval_status: "pendente", is_active: true };
    const result = existing?.id
      ? await supabaseAdmin.from("pq_guest_messages").update(payload).eq("id", existing.id)
      : await supabaseAdmin.from("pq_guest_messages").insert(payload);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    generated += 1;
    byAudience[audience] += 1;
  }

  return NextResponse.json({ ok: true, generated, byAudience });
}
