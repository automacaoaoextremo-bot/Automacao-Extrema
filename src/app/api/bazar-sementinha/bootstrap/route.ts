import { NextResponse } from "next/server";
import { buildPixQrDataUrl, getBazarEvent, isBazarSessionValid, normalizeClientName, onlyDigits } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  event_id: string;
  client_id: string | null;
  status: string;
  payment_status: string;
  total_amount: number | string;
  [key: string]: unknown;
};

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
  [key: string]: unknown;
};

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  slug: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  [key: string]: unknown;
};

function clientLookupKey(client: ClientRow) {
  const phone = onlyDigits(client.whatsapp || "");
  if (phone.length >= 10) return `phone:${phone}`;
  return `name:${client.normalized_name || normalizeClientName(client.name)}`;
}

export async function GET(request: Request) {
  try {
    const event = await getBazarEvent();
    const eventId = event.id;
    const authenticatedOperator = await isBazarSessionValid(request);

    const [prices, categories, menu, currentClients, orders] = await Promise.all([
      supabaseAdmin.from("bazar_price_points").select("*").eq("event_id", eventId).order("amount"),
      supabaseAdmin.from("bazar_category_nodes").select("*").eq("event_id", eventId).order("sort_order"),
      supabaseAdmin.from("bazar_menu_items").select("*").eq("event_id", eventId).order("category").order("name"),
      supabaseAdmin.from("bazar_clients").select("*").eq("event_id", eventId).order("name", { ascending: true }).limit(5000),
      supabaseAdmin
        .from("bazar_orders")
        .select("*")
        .eq("event_id", eventId)
        .neq("status", "excluido")
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

    if (prices.error) throw prices.error;
    if (categories.error) throw categories.error;
    if (menu.error) throw menu.error;
    if (currentClients.error) throw currentClients.error;
    if (orders.error) throw orders.error;

    const orderRows = (orders.data || []) as OrderRow[];
    const orderIds = orderRows.map((order) => order.id);

    const items = orderIds.length > 0
      ? await supabaseAdmin.from("bazar_order_items").select("*").in("order_id", orderIds).order("created_at", { ascending: true })
      : { data: [] as OrderItemRow[], error: null };

    if (items.error) throw items.error;

    const currentRows = (currentClients.data || []) as ClientRow[];
    const clientsById = new Map(currentRows.map((client) => [client.id, client]));
    const itemsByOrder = new Map<string, OrderItemRow[]>();

    for (const item of (items.data || []) as OrderItemRow[]) {
      const list = itemsByOrder.get(item.order_id) || [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }

    const enrichedOrders = orderRows.map((order) => ({
      ...order,
      client: order.client_id ? clientsById.get(order.client_id) || null : null,
      items: itemsByOrder.get(order.id) || [],
    }));

    let clients: Array<ClientRow & {
      is_current_event: boolean;
      previous_event_name?: string | null;
      previous_event_date?: string | null;
      lookup_key: string;
    }> = [];

    // Somente operadores autenticados recebem sugestões de clientes de bazares anteriores.
    // Isso agiliza o balcão sem publicar histórico de nomes/WhatsApp na página aberta.
    if (authenticatedOperator) {
      const [allClientsResult, eventsResult] = await Promise.all([
        supabaseAdmin
          .from("bazar_clients")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(10000),
        supabaseAdmin.from("bazar_events").select("id,name,event_date,slug").order("event_date", { ascending: false }),
      ]);
      if (allClientsResult.error) throw allClientsResult.error;
      if (eventsResult.error) throw eventsResult.error;

      const eventsById = new Map(((eventsResult.data || []) as EventRow[]).map((item) => [item.id, item]));
      const suggestions = new Map<string, ClientRow & {
        is_current_event: boolean;
        previous_event_name?: string | null;
        previous_event_date?: string | null;
        lookup_key: string;
      }>();

      for (const client of (allClientsResult.data || []) as ClientRow[]) {
        const key = clientLookupKey(client);
        const eventRow = eventsById.get(client.event_id);
        const candidate = {
          ...client,
          is_current_event: client.event_id === eventId,
          previous_event_name: client.event_id === eventId ? null : eventRow?.name || null,
          previous_event_date: client.event_id === eventId ? null : eventRow?.event_date || null,
          lookup_key: key,
        };
        const existing = suggestions.get(key);
        if (!existing || candidate.is_current_event || (!existing.is_current_event && String(client.updated_at || "") > String(existing.updated_at || ""))) {
          suggestions.set(key, candidate);
        }
      }

      clients = [...suggestions.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }

    const unpaidTotal = enrichedOrders
      .filter((order) => order.status !== "cancelado" && order.status !== "excluido" && order.payment_status !== "pago")
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const pix = await buildPixQrDataUrl(Math.max(unpaidTotal, 1), "BAZARSEM");

    return NextResponse.json({
      event,
      prices: prices.data || [],
      categories: categories.data || [],
      menuItems: menu.data || [],
      clients,
      operatorClientHistoryEnabled: authenticatedOperator,
      orders: enrichedOrders,
      pix,
    });
  } catch (error) {
    console.error("[bazar-sementinha/bootstrap][GET]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar dados." }, { status: 500 });
  }
}
