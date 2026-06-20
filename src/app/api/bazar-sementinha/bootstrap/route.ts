import { NextResponse } from "next/server";
import { buildPixQrDataUrl, getBazarEvent } from "@/lib/bazar-sementinha";
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
  name: string;
  whatsapp?: string | null;
  [key: string]: unknown;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  [key: string]: unknown;
};

export async function GET() {
  try {
    const event = await getBazarEvent();
    const eventId = event.id;

    const [prices, categories, menu, clients, orders] = await Promise.all([
      supabaseAdmin.from("bazar_price_points").select("*").eq("event_id", eventId).order("amount"),
      supabaseAdmin.from("bazar_category_nodes").select("*").eq("event_id", eventId).order("sort_order"),
      supabaseAdmin.from("bazar_menu_items").select("*").eq("event_id", eventId).order("category").order("name"),
      supabaseAdmin.from("bazar_clients").select("*").eq("event_id", eventId).order("name", { ascending: true }).limit(500),
      supabaseAdmin
        .from("bazar_orders")
        .select("*")
        .eq("event_id", eventId)
        .neq("status", "excluido")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (prices.error) throw prices.error;
    if (categories.error) throw categories.error;
    if (menu.error) throw menu.error;
    if (clients.error) throw clients.error;
    if (orders.error) throw orders.error;

    const orderRows = (orders.data || []) as OrderRow[];
    const orderIds = orderRows.map((order) => order.id);

    const items = orderIds.length > 0
      ? await supabaseAdmin.from("bazar_order_items").select("*").in("order_id", orderIds).order("created_at", { ascending: true })
      : { data: [] as OrderItemRow[], error: null };

    if (items.error) throw items.error;

    const clientsById = new Map((clients.data || []).map((client) => [(client as ClientRow).id, client as ClientRow]));
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

    const unpaidTotal = enrichedOrders
      .filter((order) => order.status !== "cancelado" && order.status !== "excluido" && order.payment_status !== "pago")
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const pix = await buildPixQrDataUrl(Math.max(unpaidTotal, 1), "BAZARSEM");

    return NextResponse.json({
      event,
      prices: prices.data || [],
      categories: categories.data || [],
      menuItems: menu.data || [],
      clients: clients.data || [],
      orders: enrichedOrders,
      pix,
    });
  } catch (error) {
    console.error("[bazar-sementinha/bootstrap][GET]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar dados." }, { status: 500 });
  }
}
