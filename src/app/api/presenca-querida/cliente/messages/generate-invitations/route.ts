import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { buildPersonalizedInvitationMessage, buildPublicConfirmationUrl } from "@/lib/presenca-daniela50";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ApprovalStatus = "aprovado" | "pendente" | "reprovado" | "rascunho" | "revisar" | "";

type ExistingMessage = {
  id: string;
  approval_status: string | null;
  status: string | null;
  message_text: string | null;
};

type GuestForInvitation = {
  id: string;
  full_name: string | null;
  individual_token: string | null;
  approval_status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

function normalizeStatus(value: unknown): ApprovalStatus {
  return String(value ?? "").trim().toLowerCase() as ApprovalStatus;
}

function isApproved(value: unknown) {
  return normalizeStatus(value) === "aprovado";
}

async function loadExistingMessage(eventId: string, guestId: string) {
  const { data, error } = await supabaseAdmin
    .from("pq_guest_messages")
    .select("id, approval_status, status, message_text")
    .eq("event_id", eventId)
    .eq("guest_id", guestId)
    .eq("message_phase", "convite_oficial")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as ExistingMessage | null;
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
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let skippedApproved = 0;
  let skippedWithoutToken = 0;
  const generatedGuests: string[] = [];
  const skippedApprovedGuests: string[] = [];
  const skippedWithoutTokenGuests: string[] = [];
  const baseUrl = siteUrl();

  for (const rawGuest of guests ?? []) {
    const guest = rawGuest as GuestForInvitation;
    const guestName = String(guest.full_name ?? "Convidado").trim() || "Convidado";

    if (!guest.individual_token) {
      skipped += 1;
      skippedWithoutToken += 1;
      skippedWithoutTokenGuests.push(guestName);
      continue;
    }

    let existing: ExistingMessage | null = null;
    try {
      existing = await loadExistingMessage(auth.context.eventId, guest.id);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Erro ao consultar mensagem existente." }, { status: 500 });
    }

    if (isApproved(existing?.approval_status) || isApproved(existing?.status) || isApproved(guest.approval_status)) {
      skipped += 1;
      skippedApproved += 1;
      skippedApprovedGuests.push(guestName);
      continue;
    }

    const confirmationUrl = buildPublicConfirmationUrl({ baseUrl, event: auth.context.event, token: guest.individual_token });
    const messageText = buildPersonalizedInvitationMessage({ guest, event: auth.context.event, confirmationUrl });

    const payload = {
      event_id: auth.context.eventId,
      guest_id: guest.id,
      message_phase: "convite_oficial",
      channel: "whatsapp",
      template_label: "Convite oficial WhatsApp - Daniela 50 anos",
      message_text: messageText,
      status: "aguardando_aprovacao",
      approval_status: "pendente",
      is_active: true,
    };

    const result = existing?.id
      ? await supabaseAdmin.from("pq_guest_messages").update(payload).eq("id", existing.id).eq("event_id", auth.context.eventId)
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
    generatedGuests.push(guestName);
    if (existing?.id) updated += 1;
    else created += 1;
  }

  return NextResponse.json({
    ok: true,
    generated,
    created,
    updated,
    skipped,
    skippedApproved,
    skippedWithoutToken,
    generatedGuests,
    skippedApprovedGuests,
    skippedWithoutTokenGuests,
  });
}
