import { NextResponse } from "next/server";
import { PRESENCA_GUEST_STATUS_LABELS, type PresencaGuestStatus } from "@/lib/presenca-querida";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Params = { token: string };

type ConfirmationResponse = {
  id?: string;
  guestId?: string;
  status?: PresencaGuestStatus;
};

type ConfirmationBody = {
  status?: PresencaGuestStatus;
  dietaryNotes?: string;
  notes?: string;
  includeLinkedGuests?: boolean;
  responses?: ConfirmationResponse[];
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeStatus(value: unknown): PresencaGuestStatus {
  const status = String(value ?? "").trim() as PresencaGuestStatus;
  if (["pendente", "confirmado", "talvez", "nao_podera_ir"].includes(status)) return status;
  return "confirmado";
}

type GuestRow = Record<string, unknown> & {
  id: string;
  event_id: string;
  guest_status: PresencaGuestStatus;
  primary_guest_id?: string | null;
  event?: unknown;
  linked_guests?: GuestRow[];
};

const GUEST_SELECT = `
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
  primary_guest_id,
  household_label,
  is_invite_recipient,
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
`;

async function loadLinkedGuests(eventId: string, primaryGuestId: string) {
  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .select("id,event_id,full_name,email,whatsapp,group_name,relationship_type,relationship_label,relationship_context,invite_context,message_preview,approval_status,is_active,guest_status,adults_count,children_count,companions_allowed,companions_confirmed_count,primary_guest_id,household_label,is_invite_recipient,dietary_notes,notes,individual_token,invited_at,confirmed_at,created_at")
    .eq("event_id", eventId)
    .eq("primary_guest_id", primaryGuestId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as GuestRow[];
}

async function getGuestByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .select(GUEST_SELECT)
    .eq("individual_token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let guest = {
    ...(data as GuestRow),
    event: firstRelation((data as GuestRow).event),
  };

  if (guest.primary_guest_id) {
    const { data: primary, error: primaryError } = await supabaseAdmin
      .from("pq_guests")
      .select(GUEST_SELECT)
      .eq("id", guest.primary_guest_id)
      .eq("event_id", guest.event_id)
      .maybeSingle();

    if (primaryError) throw primaryError;
    if (primary) {
      guest = {
        ...(primary as GuestRow),
        event: firstRelation((primary as GuestRow).event),
      };
    }
  }

  const linkedGuests = await loadLinkedGuests(guest.event_id, guest.id);
  return {
    ...guest,
    linked_guests: linkedGuests,
  };
}

function buildResponseList(body: ConfirmationBody, guest: GuestRow) {
  const linkedGuests = Array.isArray(guest.linked_guests) ? guest.linked_guests : [];
  const allowedGuests = [guest, ...linkedGuests];
  const allowedIds = new Set(allowedGuests.map((item) => item.id));

  if (Array.isArray(body.responses) && body.responses.length > 0) {
    const responseMap = new Map<string, PresencaGuestStatus>();
    for (const response of body.responses) {
      const id = String(response.id ?? response.guestId ?? "").trim();
      if (!id || !allowedIds.has(id)) continue;
      responseMap.set(id, normalizeStatus(response.status));
    }

    if (responseMap.size > 0) {
      return Array.from(responseMap.entries()).map(([id, status]) => ({ id, status }));
    }
  }

  const includeLinkedGuests = body.includeLinkedGuests !== false;
  const fallbackStatus = normalizeStatus(body.status);
  const fallbackGuests = includeLinkedGuests ? allowedGuests : [guest];
  return fallbackGuests.map((item) => ({ id: item.id, status: fallbackStatus }));
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

  try {
    const guest = await getGuestByToken(token);
    if (!guest) return NextResponse.json({ error: "Convite não localizado." }, { status: 404 });

    const responses = buildResponseList(body, guest);
    if (responses.length === 0) return NextResponse.json({ error: "Informe pelo menos uma resposta." }, { status: 400 });

    const now = new Date().toISOString();

    for (const item of responses) {
      const { error: updateError } = await supabaseAdmin
        .from("pq_guests")
        .update({
          guest_status: item.status,
          companions_confirmed_count: 0,
          confirmed_at: item.status === "pendente" ? null : now,
        })
        .eq("event_id", guest.event_id)
        .eq("id", item.id);

      if (updateError) throw updateError;
    }

    const { error: primaryError } = await supabaseAdmin
      .from("pq_guests")
      .update({
        dietary_notes: String(body.dietaryNotes ?? "").trim() || null,
        notes: String(body.notes ?? "").trim() || null,
      })
      .eq("id", guest.id)
      .eq("event_id", guest.event_id);

    if (primaryError) throw primaryError;

    const updatedGuest = await getGuestByToken(token);

    return NextResponse.json({
      ok: true,
      guest: updatedGuest,
      responses,
      statusLabel: responses.length === 1 ? PRESENCA_GUEST_STATUS_LABELS[responses[0].status] ?? responses[0].status : "Respostas registradas",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao confirmar presença.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
