import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  BazarItemInput,
  BazarOrderInput,
  getBazarEvent,
  makeOrderCode,
  normalizeClientName,
  onlyDigits,
  orderSignature,
  orderTotal,
  requireBazarSession,
} from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderStatus = "aberto" | "cancelado" | "excluido";
type PaymentStatus = "pendente" | "pago";

type BazarOrderRow = {
  id: string;
  event_id: string;
  client_id: string;
  code: string;
  status: string;
  payment_status: string;
  total_amount: number | string;
  notes?: string | null;
  dedupe_signature?: string;
  created_at?: string;
  updated_at?: string;
};

type BazarClientRow = {
  id: string;
  name: string;
  whatsapp?: string | null;
  [key: string]: unknown;
};

type BazarOrderItemRow = {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  total_price: number | string;
  [key: string]: unknown;
};

type BazarPaymentRow = {
  id: string;
  order_ids?: string[] | null;
  [key: string]: unknown;
};

export async function GET() {
  try {
    await requireBazarSession();
    const event = await getBazarEvent();

    const { data, error } = await supabaseAdmin
      .from("bazar_orders")
      .select("*")
      .eq("event_id", event.id)
      .neq("status", "excluido")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const orders = await enrichOrders((data || []) as BazarOrderRow[], event.id);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[bazar-sementinha/orders][GET]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar pedidos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BazarOrderInput;
    const clientName = body.clientName?.trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!clientName) {
      return NextResponse.json({ error: "Informe o nome do cliente." }, { status: 400 });
    }

    const validItems: BazarItemInput[] = items
      .map((item): BazarItemInput => {
        const kind: BazarItemInput["kind"] = item.kind === "menu" ? "menu" : "bazar";

        return {
          kind,
          name: String(item.name || "").trim(),
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          categoryPath: item.categoryPath || null,
          sourceId: item.sourceId || null,
        };
      })
      .filter((item): item is BazarItemInput => item.name.length > 0 && item.quantity > 0 && item.unitPrice >= 0);

    if (validItems.length === 0) {
      return NextResponse.json({ error: "Inclua pelo menos um item no pedido." }, { status: 400 });
    }

    const event = await getBazarEvent();
    const normalizedName = normalizeClientName(clientName);
    const totalAmount = orderTotal(validItems);
    const signature = orderSignature({ ...body, clientName, items: validItems });
    const attemptId = body.attemptId?.trim() || randomUUID();

    const { data: attempt, error: attemptReadError } = await supabaseAdmin
      .from("bazar_order_attempts")
      .select("order_id")
      .eq("event_id", event.id)
      .eq("attempt_id", attemptId)
      .maybeSingle();

    if (attemptReadError) throw attemptReadError;

    if (attempt?.order_id) {
      const existing = await readOrder(attempt.order_id);
      return NextResponse.json({ order: existing, reused: true, reason: "attempt_id" });
    }

    const since = new Date(Date.now() - 15_000).toISOString();
    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from("bazar_orders")
      .select("id")
      .eq("event_id", event.id)
      .eq("dedupe_signature", signature)
      .gte("created_at", since)
      .neq("status", "cancelado")
      .neq("status", "excluido")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duplicateError) throw duplicateError;

    if (duplicate?.id) {
      const { error: attemptUpsertError } = await supabaseAdmin
        .from("bazar_order_attempts")
        .upsert({ event_id: event.id, attempt_id: attemptId, order_id: duplicate.id }, { onConflict: "event_id,attempt_id" });

      if (attemptUpsertError) throw attemptUpsertError;

      const existing = await readOrder(duplicate.id);
      return NextResponse.json({ order: existing, reused: true, reason: "identical_15s" });
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from("bazar_clients")
      .upsert(
        {
          event_id: event.id,
          name: clientName,
          normalized_name: normalizedName,
          whatsapp: body.whatsapp ? onlyDigits(body.whatsapp) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,normalized_name" },
      )
      .select("*")
      .single();

    if (clientError || !client) throw clientError || new Error("Não foi possível salvar o cliente.");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("bazar_orders")
      .insert({
        event_id: event.id,
        client_id: client.id,
        code: makeOrderCode(),
        status: "aberto",
        payment_status: "pendente",
        total_amount: totalAmount,
        notes: body.notes || null,
        dedupe_signature: signature,
      })
      .select("*")
      .single();

    if (orderError || !order) throw orderError || new Error("Não foi possível criar o pedido.");

    const rows = validItems.map((item) => ({
      event_id: event.id,
      order_id: order.id,
      kind: item.kind,
      source_id: item.sourceId || null,
      name: item.name,
      category_path: item.categoryPath || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice,
    }));

    const { error: itemsError } = await supabaseAdmin.from("bazar_order_items").insert(rows);
    if (itemsError) throw itemsError;

    const { error: attemptUpsertError } = await supabaseAdmin
      .from("bazar_order_attempts")
      .upsert({ event_id: event.id, attempt_id: attemptId, order_id: order.id }, { onConflict: "event_id,attempt_id" });

    if (attemptUpsertError) throw attemptUpsertError;

    const created = await readOrder(order.id);
    return NextResponse.json({ order: created, reused: false });
  } catch (error) {
    console.error("[bazar-sementinha/orders][POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao criar pedido." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireBazarSession();
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "ID do pedido obrigatório." }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("status" in body) {
      const status = String(body.status || "") as OrderStatus;
      if (!["aberto", "cancelado", "excluido"].includes(status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
      patch.status = status;
    }
    if ("payment_status" in body) {
      const paymentStatus = String(body.payment_status || "") as PaymentStatus;
      if (!["pendente", "pago"].includes(paymentStatus)) return NextResponse.json({ error: "Status de pagamento inválido." }, { status: 400 });
      patch.payment_status = paymentStatus;
    }
    if ("notes" in body) patch.notes = body.notes ? String(body.notes) : null;

    const { data: order, error: orderError } = await supabaseAdmin.from("bazar_orders").update(patch).eq("id", id).select("*").single();
    if (orderError || !order) throw orderError || new Error("Não foi possível atualizar o pedido.");

    if ("clientName" in body || "whatsapp" in body) {
      const clientName = String(body.clientName || "").trim();
      const clientPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (clientName) {
        clientPatch.name = clientName;
        clientPatch.normalized_name = normalizeClientName(clientName);
      }
      if ("whatsapp" in body) clientPatch.whatsapp = body.whatsapp ? onlyDigits(String(body.whatsapp)) : null;
      const { error: clientError } = await supabaseAdmin.from("bazar_clients").update(clientPatch).eq("id", order.client_id);
      if (clientError) throw clientError;
    }

    return NextResponse.json({ order: await readOrder(id) });
  } catch (error) {
    console.error("[bazar-sementinha/orders][PATCH]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao atualizar pedido." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireBazarSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do pedido obrigatório." }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("bazar_orders")
      .update({ status: "excluido", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) throw error || new Error("Não foi possível excluir o pedido.");
    return NextResponse.json({ ok: true, order: data });
  } catch (error) {
    console.error("[bazar-sementinha/orders][DELETE]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao excluir pedido." }, { status: 500 });
  }
}

async function readOrder(orderId: string) {
  const { data, error } = await supabaseAdmin.from("bazar_orders").select("*").eq("id", orderId).single();
  if (error) throw error;

  const [order] = await enrichOrders([data as BazarOrderRow], data.event_id);
  return order;
}

async function enrichOrders(orderRows: BazarOrderRow[], eventId: string) {
  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((order) => order.id);
  const clientIds = [...new Set(orderRows.map((order) => order.client_id).filter(Boolean))];

  const [clientsResult, itemsResult, paymentsResult] = await Promise.all([
    clientIds.length > 0
      ? supabaseAdmin.from("bazar_clients").select("*").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin.from("bazar_order_items").select("*").in("order_id", orderIds).order("created_at", { ascending: true }),
    supabaseAdmin.from("bazar_payments").select("*").eq("event_id", eventId).order("created_at", { ascending: false }).limit(1000),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  const clients = new Map((clientsResult.data || []).map((client) => [(client as BazarClientRow).id, client as BazarClientRow]));
  const itemsByOrder = new Map<string, BazarOrderItemRow[]>();
  const paymentsByOrder = new Map<string, BazarPaymentRow[]>();

  for (const item of (itemsResult.data || []) as BazarOrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  for (const payment of (paymentsResult.data || []) as BazarPaymentRow[]) {
    for (const orderId of payment.order_ids || []) {
      if (!orderIds.includes(orderId)) continue;
      const list = paymentsByOrder.get(orderId) || [];
      list.push(payment);
      paymentsByOrder.set(orderId, list);
    }
  }

  return orderRows.map((order) => ({
    ...order,
    client: clients.get(order.client_id) || null,
    items: itemsByOrder.get(order.id) || [],
    payments: paymentsByOrder.get(order.id) || [],
  }));
}
