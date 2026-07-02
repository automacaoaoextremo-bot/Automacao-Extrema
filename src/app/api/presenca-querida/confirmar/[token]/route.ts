import { NextResponse } from "next/server";
import { buildPublicConfirmationUrl } from "@/lib/presenca-daniela50";
import { sendPresencaGuestNoteApprovalEmail, sendPresencaGuestResponseEmail } from "@/lib/mail";
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
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  guest_status: PresencaGuestStatus;
  primary_guest_id?: string | null;
  event?: unknown;
  linked_guests?: GuestRow[];
};


function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

function getEventRecord(guest: GuestRow) {
  const event = firstRelation(guest.event);
  return event && typeof event === "object" ? (event as Record<string, unknown>) : {};
}

function guestNameMap(guest: GuestRow) {
  const linkedGuests = Array.isArray(guest.linked_guests) ? guest.linked_guests : [];
  const map = new Map<string, GuestRow>();
  for (const item of [guest, ...linkedGuests]) map.set(item.id, item);
  return map;
}

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
    email,
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


async function saveGuestNoteForApproval(input: { eventId: string; guestId: string; noteText: string }) {
  const noteText = input.noteText.trim();
  if (!noteText) return { created: false, messageId: null as string | null, noteText: null as string | null };

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("pq_guest_messages")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("guest_id", input.guestId)
    .eq("message_phase", "recado_convidado")
    .eq("message_text", noteText)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return { created: false, messageId: String(existing.id), noteText };

  const { data, error } = await supabaseAdmin
    .from("pq_guest_messages")
    .insert({
      event_id: input.eventId,
      guest_id: input.guestId,
      message_phase: "recado_convidado",
      channel: "landing_page",
      template_label: "Recado enviado pelo convidado",
      message_text: noteText,
      status: "aguardando_aprovacao",
      approval_status: "pendente",
      is_active: true,
      sort_order: 30,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { created: true, messageId: String(data.id), noteText };
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

    const beforeById = guestNameMap(guest);

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
    const eventRecord = getEventRecord(guest);
    const baseUrl = siteUrl();
    const confirmationUrl = buildPublicConfirmationUrl({ baseUrl, event: eventRecord, token });
    const noteText = String(body.notes ?? "").trim();
    const guestNote = await saveGuestNoteForApproval({ eventId: guest.event_id, guestId: guest.id, noteText });

    const noteEmailResult = guestNote.created && guestNote.noteText
      ? await sendPresencaGuestNoteApprovalEmail({
          eventName: String(eventRecord.name ?? "").trim() || null,
          eventSlug: String(eventRecord.slug ?? "").trim() || null,
          hostName: String(eventRecord.host_name ?? "Daniela").trim() || "Daniela",
          approverEmail: String(eventRecord.email ?? "").trim() || null,
          principalGuestName: String(guest.full_name ?? "Convidado").trim() || "Convidado",
          principalGuestWhatsapp: String(guest.whatsapp ?? "").trim() || null,
          principalGuestEmail: String(guest.email ?? "").trim() || null,
          noteText: guestNote.noteText,
          confirmationUrl,
          managementUrl: `${baseUrl}/solucoes/presenca-querida/cliente/mensagens`,
        }).catch((error) => ({ sent: false, reason: error instanceof Error ? error.message : "Erro ao enviar e-mail de recado." }))
      : { sent: false, reason: guestNote.noteText ? "Recado já registrado anteriormente." : "Nenhum recado informado." };

    const emailResult = await sendPresencaGuestResponseEmail({
      eventName: String(eventRecord.name ?? "").trim() || null,
      eventSlug: String(eventRecord.slug ?? "").trim() || null,
      principalGuestName: String(guest.full_name ?? "Convidado").trim() || "Convidado",
      principalGuestWhatsapp: String(guest.whatsapp ?? "").trim() || null,
      principalGuestEmail: String(guest.email ?? "").trim() || null,
      responses: responses.map((item) => {
        const before = beforeById.get(item.id);
        return {
          id: item.id,
          name: String(before?.full_name ?? item.id).trim() || item.id,
          previousStatus: before?.guest_status ?? null,
          newStatus: item.status,
        };
      }),
      dietaryNotes: String(body.dietaryNotes ?? "").trim() || null,
      notes: String(body.notes ?? "").trim() || null,
      confirmationUrl,
    }).catch((error) => ({ sent: false, reason: error instanceof Error ? error.message : "Erro ao enviar e-mail." }));

    return NextResponse.json({
      ok: true,
      guest: updatedGuest,
      responses,
      email: emailResult,
      noteMessage: guestNote,
      noteEmail: noteEmailResult,
      redirectUrl: `/solucoes/presenca-querida/evento/${encodeURIComponent(String(eventRecord.slug ?? "daniela-50-anos"))}/obrigado?convite=${encodeURIComponent(token)}`,
      statusLabel: responses.length === 1 ? PRESENCA_GUEST_STATUS_LABELS[responses[0].status] ?? responses[0].status : "Respostas registradas",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao confirmar presença.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
