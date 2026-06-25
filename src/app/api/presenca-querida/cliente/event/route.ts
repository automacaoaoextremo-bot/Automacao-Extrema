import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { DANIELA50_EXTRAS } from "@/lib/presenca-daniela50";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type EventPatchPayload = Record<string, unknown>;

const textFields = [
  "name",
  "event_type",
  "host_name",
  "event_time",
  "venue_name",
  "address",
  "city",
  "state",
  "whatsapp",
  "email",
  "public_headline",
  "invitation_message",
  "dress_code",
  "parking_info",
  "venue_instagram_url",
  "map_url",
  "location_notes",
  "host_photo_url",
  "buffet_name",
  "buffet_instagram_url",
  "drinks_provider_name",
  "drinks_provider_instagram_url",
  "cake_info",
  "privacy_notes",
  "public_status",
  "status",
] as const;

const jsonArrayFields = [
  "host_photo_gallery",
  "event_gallery",
  "menu_gallery",
  "attractions",
  "menu_sections",
  "location_positive_points",
  "event_positive_points",
] as const;

function asNullableText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "sim", "s", "yes"].includes(value.toLowerCase());
  return fallback;
}

function asDateOrNull(value: unknown) {
  const text = asNullableText(value);
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function buildPatch(body: EventPatchPayload) {
  const patch: Record<string, unknown> = {};

  for (const field of textFields) {
    if (field in body) patch[field] = asNullableText(body[field]);
  }

  for (const field of jsonArrayFields) {
    if (field in body) patch[field] = asArray(body[field]);
  }

  if ("event_date" in body) patch.event_date = asDateOrNull(body.event_date);
  if ("is_surprise" in body) patch.is_surprise = asBoolean(body.is_surprise);
  if ("landing_enabled" in body) patch.landing_enabled = asBoolean(body.landing_enabled, true);
  if ("primary_color" in body) patch.primary_color = asNullableText(body.primary_color) ?? "#E85D75";
  if ("accent_color" in body) patch.accent_color = asNullableText(body.accent_color) ?? "#31C16B";

  return patch;
}

export async function GET(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin.from("pq_events").select("*").eq("id", auth.context.eventId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  return NextResponse.json({ ok: true, event: data });
}

export async function PATCH(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as EventPatchPayload;
  const patch = buildPatch(body);

  if (body.applyDaniela50Defaults === true) {
    patch.event_type = "aniversario";
    patch.name = "Daniela 50 anos";
    patch.host_name = "Daniela";
    patch.event_date = "2026-12-19";
    patch.event_time = "12h30 às 17h30";
    patch.venue_name = "Chácara Piloto";
    patch.address = "Valinhos, Campinas - SP";
    patch.city = "Valinhos";
    patch.state = "SP";
    patch.public_headline = "Sua presença é muito querida nos meus 50 anos.";
    patch.invitation_message =
      "Quero celebrar meus 50 anos com pessoas que fazem parte da minha história.\nEsta página reúne detalhes da festa e também permite a confirmação da sua presença.";
    patch.dress_code = "Venha confortável para um almoço de celebração, música ao vivo e momentos especiais.";
    patch.parking_info = "Confira o endereço pelo Google Maps antes de sair e chegue com tranquilidade.";
    patch.venue_instagram_url = DANIELA50_EXTRAS.venueInstagramUrl;
    patch.map_url = DANIELA50_EXTRAS.mapUrl;
    patch.host_photo_url = DANIELA50_EXTRAS.hostPhotoUrl;
    patch.host_photo_gallery = DANIELA50_EXTRAS.hostPhotoGallery;
    patch.event_gallery = DANIELA50_EXTRAS.venueGallery;
    patch.menu_gallery = DANIELA50_EXTRAS.menuGallery;
    patch.attractions = DANIELA50_EXTRAS.attractions;
    patch.menu_sections = DANIELA50_EXTRAS.menuSections;
    patch.buffet_name = DANIELA50_EXTRAS.buffetName;
    patch.buffet_instagram_url = DANIELA50_EXTRAS.buffetInstagramUrl;
    patch.drinks_provider_name = DANIELA50_EXTRAS.drinksProviderName;
    patch.drinks_provider_instagram_url = DANIELA50_EXTRAS.drinksProviderInstagramUrl;
    patch.cake_info = DANIELA50_EXTRAS.cakeInfo;
    patch.location_positive_points = DANIELA50_EXTRAS.locationPositivePoints;
    patch.event_positive_points = DANIELA50_EXTRAS.eventPositivePoints;
    patch.landing_enabled = true;
    patch.public_status = "publicado";
  }

  const { data, error } = await supabaseAdmin
    .from("pq_events")
    .update(patch)
    .eq("id", auth.context.eventId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, event: data });
}
