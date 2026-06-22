import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type MessagePayload = Record<string, unknown>;

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function asNullableText(value: unknown) {
  const text = asText(value);
  return text ? text : null;
}

function asBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "sim", "s", "yes", "ativo"].includes(value.toLowerCase());
  return fallback;
}

function buildMessagePayload(body: MessagePayload, eventId: string) {
  return {
    event_id: eventId,
    guest_id: asNullableText(body.guest_id ?? body.guestId),
    message_phase: asText(body.message_phase ?? body.messagePhase) || "convite_oficial",
    channel: asText(body.channel) || "whatsapp",
    template_label: asNullableText(body.template_label ?? body.templateLabel),
    message_text: asText(body.message_text ?? body.messageText),
    status: asText(body.status) || "rascunho",
    approval_status: asText(body.approval_status ?? body.approvalStatus) || "pendente",
    is_active: asBoolean(body.is_active ?? body.isActive, true),
  };
}

export async function GET(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("pq_guest_messages")
    .select(
      `
      *,
      guest:pq_guests(id, full_name, whatsapp, group_name, relationship_label, relationship_context, invite_context, approval_status, is_active)
    `,
    )
    .eq("event_id", auth.context.eventId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, messages: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as MessagePayload;
  const id = asText(body.id);
  const payload = buildMessagePayload(body, auth.context.eventId);

  if (!payload.message_text) return NextResponse.json({ error: "Informe o texto da mensagem." }, { status: 400 });

  const query = id
    ? supabaseAdmin.from("pq_guest_messages").update(payload).eq("id", id).eq("event_id", auth.context.eventId)
    : supabaseAdmin.from("pq_guest_messages").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, message: data });
}

export async function PATCH(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as MessagePayload;
  const id = asText(body.id);
  const action = asText(body.action);
  if (!id) return NextResponse.json({ error: "Informe a mensagem." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if ("message_text" in body || "messageText" in body) patch.message_text = asText(body.message_text ?? body.messageText);
  if (action === "activate") patch.is_active = true;
  if (action === "inactivate") patch.is_active = false;
  if (action === "approve") {
    patch.status = "aprovado";
    patch.approval_status = "aprovado";
    patch.approved_at = new Date().toISOString();
    patch.approved_by_person_id = auth.context.person.id;
  }
  if (action === "pending") {
    patch.status = "rascunho";
    patch.approval_status = "pendente";
    patch.approved_at = null;
    patch.approved_by_person_id = null;
  }
  if (action === "reject") {
    patch.status = "revisar";
    patch.approval_status = "reprovado";
    patch.rejected_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("pq_guest_messages")
    .update(patch)
    .eq("id", id)
    .eq("event_id", auth.context.eventId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data.guest_id && patch.approval_status) {
    await supabaseAdmin
      .from("pq_guests")
      .update({ approval_status: patch.approval_status, message_preview: data.message_text })
      .eq("id", data.guest_id)
      .eq("event_id", auth.context.eventId);
  }

  return NextResponse.json({ ok: true, message: data });
}

export async function DELETE(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Informe a mensagem." }, { status: 400 });

  const { error } = await supabaseAdmin.from("pq_guest_messages").delete().eq("id", id).eq("event_id", auth.context.eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
