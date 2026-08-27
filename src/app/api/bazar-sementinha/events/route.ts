import { NextResponse } from "next/server";
import { requireBazarSession, sessionErrorStatus } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type CopyOptions = {
  prices?: boolean;
  categories?: boolean;
  menu?: boolean;
};

type CreateEventBody = {
  name?: string;
  eventDate?: string;
  sourceEventId?: string | null;
  copy?: CopyOptions;
  makePublic?: boolean;
};

type PatchEventBody = {
  id?: string;
  name?: string;
  eventDate?: string;
  status?: string;
  makePublic?: boolean;
};

function eventSlug(eventDate: string) {
  return `bazar-sementinha-${eventDate}`;
}


async function setPublicEvent(eventId: string) {
  const { error: clearError } = await supabaseAdmin
    .from("bazar_events")
    .update({ is_public: false, status: "encerrado", updated_at: new Date().toISOString() })
    .eq("is_public", true)
    .neq("id", eventId);
  if (clearError) throw clearError;

  const { data, error } = await supabaseAdmin
    .from("bazar_events")
    .update({ is_public: true, status: "ativo", updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .select("*")
    .single();
  if (error || !data) throw error || new Error("Não foi possível definir o evento público.");
  return data;
}

async function copyEventData(sourceEventId: string, targetEventId: string, options: CopyOptions) {
  if (options.prices) {
    const source = await supabaseAdmin.from("bazar_price_points").select("amount,label,is_active,sort_order").eq("event_id", sourceEventId);
    if (source.error) throw source.error;
    if ((source.data || []).length > 0) {
      const { error } = await supabaseAdmin.from("bazar_price_points").upsert(
        (source.data || []).map((item) => ({ ...item, event_id: targetEventId })),
        { onConflict: "event_id,amount" },
      );
      if (error) throw error;
    }
  }

  if (options.categories) {
    const source = await supabaseAdmin
      .from("bazar_category_nodes")
      .select("path,level_1,level_2,level_3,is_active,is_required,is_visible,sort_order")
      .eq("event_id", sourceEventId);
    if (source.error) throw source.error;
    if ((source.data || []).length > 0) {
      const { error } = await supabaseAdmin.from("bazar_category_nodes").upsert(
        (source.data || []).map((item) => ({ ...item, event_id: targetEventId })),
        { onConflict: "event_id,path" },
      );
      if (error) throw error;
    }
  }

  if (options.menu) {
    const source = await supabaseAdmin
      .from("bazar_menu_items")
      .select("category,name,description,unit_label,price,is_active,sort_order")
      .eq("event_id", sourceEventId);
    if (source.error) throw source.error;
    if ((source.data || []).length > 0) {
      const { error } = await supabaseAdmin.from("bazar_menu_items").upsert(
        (source.data || []).map((item) => ({ ...item, event_id: targetEventId })),
        { onConflict: "event_id,category,name" },
      );
      if (error) throw error;
    }
  }
}

export async function GET(request: Request) {
  try {
    await requireBazarSession(request);
    const { data, error } = await supabaseAdmin
      .from("bazar_events")
      .select("*")
      .order("event_date", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ events: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar eventos." },
      { status: sessionErrorStatus(error) },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireBazarSession(request);
    const body = (await request.json()) as CreateEventBody;
    const eventDate = String(body.eventDate || "").trim();
    const name = String(body.name || "").trim() || (eventDate ? `Bazar do Sementinha — ${eventDate.split("-").reverse().join("/")}` : "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      return NextResponse.json({ error: "Informe a data do evento." }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "Informe o nome do evento." }, { status: 400 });

    const sourceEventId = String(body.sourceEventId || "").trim() || null;
    const slug = eventSlug(eventDate);

    const { data: sourceEvent, error: sourceEventError } = sourceEventId
      ? await supabaseAdmin.from("bazar_events").select("*").eq("id", sourceEventId).maybeSingle()
      : { data: null, error: null };
    if (sourceEventError) throw sourceEventError;

    const { data: event, error } = await supabaseAdmin
      .from("bazar_events")
      .insert({
        client_name: "Sementinha do Tucxa",
        name,
        slug,
        event_date: eventDate,
        status: "planejado",
        is_public: false,
        source_event_id: sourceEventId,
        pix_key: sourceEvent?.pix_key || "58.392.598/0001-91",
        pix_receiver: sourceEvent?.pix_receiver || "SEMENTINHA DO TUCXA",
        pix_city: sourceEvent?.pix_city || "CAMPINAS",
        primary_color: sourceEvent?.primary_color || "#2f7d45",
        accent_color: sourceEvent?.accent_color || "#83a847",
        notes: sourceEventId ? `Criado a partir de ${sourceEvent?.name || "outro evento"}.` : null,
      })
      .select("*")
      .single();

    if (error || !event) throw error || new Error("Não foi possível criar o evento.");

    try {
      if (sourceEventId) {
        await copyEventData(sourceEventId, event.id, body.copy || {});
      }
      const finalEvent = body.makePublic ? await setPublicEvent(event.id) : event;
      return NextResponse.json({ event: finalEvent }, { status: 201 });
    } catch (copyError) {
      await supabaseAdmin.from("bazar_events").delete().eq("id", event.id);
      throw copyError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar evento." },
      { status: sessionErrorStatus(error) },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireBazarSession(request);
    const body = (await request.json()) as PatchEventBody;
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "Informe o evento." }, { status: 400 });

    if (body.makePublic === true) {
      const event = await setPublicEvent(id);
      return NextResponse.json({ event });
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.eventDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)) patch.event_date = body.eventDate;
    if (typeof body.status === "string" && body.status.trim()) patch.status = body.status.trim();

    const { data, error } = await supabaseAdmin.from("bazar_events").update(patch).eq("id", id).select("*").single();
    if (error || !data) throw error || new Error("Não foi possível atualizar o evento.");
    return NextResponse.json({ event: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar evento." },
      { status: sessionErrorStatus(error) },
    );
  }
}
