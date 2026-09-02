import { NextResponse } from "next/server";
import { getBazarEvent, normalizeClientName, onlyDigits } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ClientRow = {
  id: string;
  event_id: string;
  name: string;
  normalized_name?: string | null;
  whatsapp?: string | null;
  public_token?: string | null;
  is_corrente?: boolean | null;
  corrente_identified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  slug: string;
};

function lookupKey(client: ClientRow) {
  const phone = onlyDigits(client.whatsapp || "");
  if (phone.length >= 10) return `phone:${phone}`;
  return `name:${client.normalized_name || normalizeClientName(client.name)}`;
}

function sanitizeIlikeTerm(value: string) {
  return value.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = String(searchParams.get("q") || "").trim();
    const phoneTerm = onlyDigits(raw);
    const normalizedTerm = sanitizeIlikeTerm(normalizeClientName(raw));
    const nameTerm = sanitizeIlikeTerm(raw);

    const canSearchName = normalizedTerm.length >= 3;
    const canSearchPhone = phoneTerm.length >= 4;

    if (!canSearchName && !canSearchPhone) {
      return NextResponse.json({ clients: [] });
    }

    const currentEvent = await getBazarEvent();

    const normalizedNameSearch = canSearchName
      ? supabaseAdmin
          .from("bazar_clients")
          .select("*")
          .neq("event_id", currentEvent.id)
          .ilike("normalized_name", `%${normalizedTerm}%`)
          .order("updated_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as ClientRow[], error: null });

    const displayNameSearch = canSearchName
      ? supabaseAdmin
          .from("bazar_clients")
          .select("*")
          .neq("event_id", currentEvent.id)
          .ilike("name", `%${nameTerm}%`)
          .order("updated_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as ClientRow[], error: null });

    const phoneSearch = canSearchPhone
      ? supabaseAdmin
          .from("bazar_clients")
          .select("*")
          .neq("event_id", currentEvent.id)
          .ilike("whatsapp", `%${phoneTerm}%`)
          .order("updated_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as ClientRow[], error: null });

    const [normalizedResult, nameResult, phoneResult, eventsResult] = await Promise.all([
      normalizedNameSearch,
      displayNameSearch,
      phoneSearch,
      supabaseAdmin
        .from("bazar_events")
        .select("id,name,event_date,slug")
        .order("event_date", { ascending: false }),
    ]);

    if (normalizedResult.error) throw normalizedResult.error;
    if (nameResult.error) throw nameResult.error;
    if (phoneResult.error) throw phoneResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const eventsById = new Map(
      ((eventsResult.data || []) as EventRow[]).map((event) => [event.id, event]),
    );

    const candidates = new Map<string, ClientRow>();

    for (const client of [
      ...((normalizedResult.data || []) as ClientRow[]),
      ...((nameResult.data || []) as ClientRow[]),
      ...((phoneResult.data || []) as ClientRow[]),
    ]) {
      const key = lookupKey(client);
      const existing = candidates.get(key);

      if (!existing) {
        candidates.set(key, client);
        continue;
      }

      const existingDate = eventsById.get(existing.event_id)?.event_date || "";
      const candidateDate = eventsById.get(client.event_id)?.event_date || "";

      if (
        candidateDate > existingDate ||
        (candidateDate === existingDate &&
          String(client.updated_at || "") > String(existing.updated_at || ""))
      ) {
        candidates.set(key, client);
      }
    }

    const clients = [...candidates.values()]
      .map((client) => {
        const event = eventsById.get(client.event_id);
        return {
          ...client,
          is_current_event: false,
          previous_event_name: event?.name || null,
          previous_event_date: event?.event_date || null,
          lookup_key: lookupKey(client),
        };
      })
      .sort((a, b) => {
        const eventCompare = String(b.previous_event_date || "").localeCompare(
          String(a.previous_event_date || ""),
        );
        if (eventCompare !== 0) return eventCompare;
        return a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, 8);

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("[bazar-sementinha/customers][GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao pesquisar clientes anteriores." },
      { status: 500 },
    );
  }
}
