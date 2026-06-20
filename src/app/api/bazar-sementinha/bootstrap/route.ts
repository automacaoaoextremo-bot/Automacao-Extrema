import { NextResponse } from "next/server";
import { buildPixQrDataUrl, getBazarEvent } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const event = await getBazarEvent();
    const eventId = event.id;

    const [prices, categories, menu, clients, orders] = await Promise.all([
      supabaseAdmin.from("bazar_price_points").select("*").eq("event_id", eventId).order("amount"),
      supabaseAdmin.from("bazar_category_nodes").select("*").eq("event_id", eventId).order("sort_order"),
      supabaseAdmin.from("bazar_menu_items").select("*").eq("event_id", eventId).order("category").order("name"),
      supabaseAdmin.from("bazar_clients").select("*").eq("event_id", eventId).order("created_at", { ascending: false }).limit(300),
      supabaseAdmin
        .from("bazar_orders")
        .select("*, client:bazar_clients(*), items:bazar_order_items(*), payments:bazar_payments(*)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const unpaidTotal = (orders.data || [])
      .filter((order) => order.status !== "cancelado" && order.status !== "excluido" && order.payment_status !== "pago")
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const pix = await buildPixQrDataUrl(Math.max(unpaidTotal, 1), "BAZARSEM");

    return NextResponse.json({
      event,
      prices: prices.data || [],
      categories: categories.data || [],
      menuItems: menu.data || [],
      clients: clients.data || [],
      orders: orders.data || [],
      pix,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar dados." }, { status: 500 });
  }
}
