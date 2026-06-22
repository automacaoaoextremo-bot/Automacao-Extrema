import { NextResponse } from "next/server";
import { PRESENCA_GUEST_STATUS_LABELS, type PresencaGuestStatus } from "@/lib/presenca-querida";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Params = { token: string };

type ConfirmationBody = {
  status?: PresencaGuestStatus;
  adultsCount?: number;
  childrenCount?: number;
  companionsConfirmedCount?: number;
  dietaryNotes?: string;
  notes?: string;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeStatus(value: unknown): PresencaGuestStatus {
  const status = String(value ?? "").trim() as PresencaGuestStatus;
  if (["confirmado", "confirmado_com_acompanhantes", "talvez", "nao_podera_ir"].includes(status)) return status;
  return "confirmado";
}

function asNonNegativeInteger(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number);
}

async function getGuestByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .select(
      `
      id,
      event_id,
      full_name,
      email,
      whatsapp,
      group_name,
      relationship_type,
      relationship_label,
      relationship_context,
      invite_context,
      message_preview,
      approval_status,
      is_active,
      guest_status,
      adults_count,
      children_count,
      companions_allowed,
      companions_confirmed_count,
      dietary_notes,
      notes,
      individual_token,
      invited_at,
      confirmed_at,
      created_at,
      event:pq_events(
        id,
        name,
        slug,
        host_name,
        event_type,
        event_date,
        event_time,
        venue_name,
        address,
        city,
        state,
        public_headline,
        invitation_message,
        dress_code,
        parking_info,
        venue_instagram_url,
        map_url,
        location_notes,
        host_photo_url,
        host_photo_gallery,
        event_gallery,
        menu_gallery,
        attractions,
        menu_sections,
        buffet_name,
        buffet_instagram_url,
        drinks_provider_name,
        drinks_provider_instagram_url,
        cake_info,
        location_positive_points,
        event_positive_points,
        privacy_notes,
        landing_enabled,
        public_status,
        is_surprise,
        status
      )
    `,
    )
    .eq("individual_token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    event: firstRelation(data.event),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Token não informado." }, { status: 400 });

  try {
    const guest = await getGuestByToken(token);
    if (!guest) return NextResponse.json({ error: "Convite não localizado." }, { status: 404 });

    return NextResponse.json({ ok: true, guest, statusLabel: PRESENCA_GUEST_STATUS_LABELS[guest.guest_status as PresencaGuestStatus] ?? guest.guest_status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao localizar convite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Token não informado." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as ConfirmationBody;
  const status = normalizeStatus(body.status);

  try {
    const guest = await getGuestByToken(token);
    if (!guest) return NextResponse.json({ error: "Convite não localizado." }, { status: 404 });

    const companionsAllowed = Number(guest.companions_allowed ?? 0);
    const companionsConfirmedCount = Math.min(
      asNonNegativeInteger(body.companionsConfirmedCount, Number(guest.companions_confirmed_count ?? 0)),
      companionsAllowed,
    );

    const updatePayload = {
      guest_status: status,
      adults_count: asNonNegativeInteger(body.adultsCount, Number(guest.adults_count ?? 1)),
      children_count: asNonNegativeInteger(body.childrenCount, Number(guest.children_count ?? 0)),
      companions_confirmed_count: companionsConfirmedCount,
      dietary_notes: String(body.dietaryNotes ?? guest.dietary_notes ?? "").trim() || null,
      notes: String(body.notes ?? guest.notes ?? "").trim() || null,
      confirmed_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("pq_guests")
      .update(updatePayload)
      .eq("id", guest.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, guest: data, statusLabel: PRESENCA_GUEST_STATUS_LABELS[status] ?? status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao confirmar presença.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
