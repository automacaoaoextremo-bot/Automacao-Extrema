import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { buildRelationshipLine } from "@/lib/presenca-daniela50";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type GuestPayload = Record<string, unknown>;

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function asNullableText(value: unknown) {
  const text = asText(value);
  return text ? text : null;
}

function asNumber(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number);
}

function asBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "sim", "s", "yes", "ativo", "recebe"].includes(value.toLowerCase());
  return fallback;
}

function normalizePhone(value: unknown) {
  const phone = asText(value).replace(/\D/g, "");
  return phone || null;
}

function normalizeStatus(value: unknown) {
  const status = asText(value) || "pendente";
  if (["pendente", "reservou_data", "talvez", "confirmado", "confirmado_com_acompanhantes", "nao_podera_ir", "remover"].includes(status)) return status;
  return "pendente";
}

function buildGuestPayload(body: GuestPayload, eventId: string) {
  const fullName = asText(body.full_name ?? body.fullName ?? body.nome);
  const primaryGuestId = asNullableText(body.primary_guest_id ?? body.primaryGuestId ?? body.convidado_principal_id);
  const relationshipType = asText(body.relationship_type ?? body.relationshipType ?? body.parentesco) ? "parentesco" : asText(body.relationship_context ?? body.relationshipContext) ? "relacionamento" : null;
  const payload = {
    event_id: eventId,
    full_name: fullName,
    email: asNullableText(body.email),
    whatsapp: normalizePhone(body.whatsapp),
    group_name: asNullableText(body.group_name ?? body.groupName ?? body.grupo),
    relationship_type: asNullableText(body.relationship_type ?? relationshipType),
    relationship_label: asNullableText(body.relationship_label ?? body.relationshipLabel ?? body.parentesco),
    relationship_context: asNullableText(body.relationship_context ?? body.relationshipContext ?? body.origem_relacionamento),
    invite_context: asNullableText(body.invite_context ?? body.inviteContext),
    guest_status: normalizeStatus(body.guest_status ?? body.guestStatus),
    adults_count: asNumber(body.adults_count ?? body.adultsCount ?? body.adultos, 1),
    children_count: asNumber(body.children_count ?? body.childrenCount ?? body.criancas, 0),
    companions_allowed: 0,
    companions_confirmed_count: 0,
    primary_guest_id: primaryGuestId,
    household_label: asNullableText(body.household_label ?? body.householdLabel ?? body.grupo_familiar),
    is_invite_recipient: asBoolean(body.is_invite_recipient ?? body.isInviteRecipient ?? body.recebe_convite, !primaryGuestId),
    dietary_notes: asNullableText(body.dietary_notes ?? body.dietaryNotes ?? body.observacao_alimentar),
    notes: asNullableText(body.notes ?? body.observacoes),
    is_active: asBoolean(body.is_active ?? body.isActive, true),
  };

  return {
    ...payload,
    invite_context: payload.invite_context ?? buildRelationshipLine(payload),
  };
}

export async function GET(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .select("*")
    .eq("event_id", auth.context.eventId)
    .order("is_invite_recipient", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, guests: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as GuestPayload;
  const id = asText(body.id);
  const payload = buildGuestPayload(body, auth.context.eventId);

  if (!payload.full_name) {
    return NextResponse.json({ error: "Informe o nome do convidado." }, { status: 400 });
  }

  if (payload.primary_guest_id && payload.primary_guest_id === id) {
    return NextResponse.json({ error: "O convidado não pode ser vinculado a ele mesmo." }, { status: 400 });
  }

  if (payload.primary_guest_id) {
    const { data: primary, error: primaryError } = await supabaseAdmin
      .from("pq_guests")
      .select("id")
      .eq("id", payload.primary_guest_id)
      .eq("event_id", auth.context.eventId)
      .maybeSingle();

    if (primaryError) return NextResponse.json({ error: primaryError.message }, { status: 500 });
    if (!primary) return NextResponse.json({ error: "Convidado principal não localizado para este evento." }, { status: 400 });
  }

  const query = id
    ? supabaseAdmin.from("pq_guests").update(payload).eq("id", id).eq("event_id", auth.context.eventId)
    : supabaseAdmin.from("pq_guests").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, guest: data });
}

export async function PATCH(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as GuestPayload;
  const id = asText(body.id);
  const action = asText(body.action);

  if (!id) return NextResponse.json({ error: "Informe o convidado." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (action === "activate") patch.is_active = true;
  if (action === "inactivate") patch.is_active = false;
  if (action === "make_recipient") {
    patch.is_invite_recipient = true;
    patch.primary_guest_id = null;
  }
  if (action === "approve") {
    patch.approval_status = "aprovado";
    patch.approved_at = new Date().toISOString();
    patch.approved_by_person_id = auth.context.person.id;
  }
  if (action === "pending") {
    patch.approval_status = "pendente";
    patch.approved_at = null;
    patch.approved_by_person_id = null;
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .update(patch)
    .eq("id", id)
    .eq("event_id", auth.context.eventId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, guest: data });
}

export async function DELETE(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Informe o convidado." }, { status: 400 });

  const { error } = await supabaseAdmin.from("pq_guests").delete().eq("id", id).eq("event_id", auth.context.eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
