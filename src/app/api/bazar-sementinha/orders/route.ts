import { NextResponse } from "next/server";
import {
  BazarOrderInput,
  getBazarEvent,
  makeOrderCode,
  normalizeClientName,
  onlyDigits,
  orderSignature,
  orderTotal,
} from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BazarOrderInput;
    const clientName = body.clientName?.trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!clientName) {
      return NextResponse.json({ error: "Informe o nome do cliente." }, { status: 400 });
    }

    const validItems = items
      .map((item) => ({
        ...item,
        name: item.name?.trim(),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      }))
      .filter((item) => item.name && item.quantity > 0 && item.unitPrice >= 0);

    if (validItems.length === 0) {
      return NextResponse.json({ error: "Inclua pelo menos um item no pedido." }, { status: 400 });
    }

    const event = await getBazarEvent();
    const normalizedName = normalizeClientName(clientName);
    const totalAmount = orderTotal(validItems);
    const signature = orderSignature({ ...body, clientName, items: validItems });
    const attemptId = body.attemptId?.trim() || crypto.randomUUID();

    const { data: attempt } = await supabaseAdmin
      .from("bazar_order_attempts")
      .select("order_id")
      .eq("event_id", event.id)
      .eq("attempt_id", attemptId)
      .maybeSingle();

    if (attempt?.order_id) {
      const existing = await readOrder(attempt.order_id);
      return NextResponse.json({ order: existing, reused: true, reason: "attempt_id" });
    }

    const since = new Date(Date.now() - 15_000).toISOString();
    const { data: duplicate } = await supabaseAdmin
      .from("bazar_orders")
      .select("id")
      .eq("event_id", event.id)
      .eq("dedupe_signature", signature)
      .gte("created_at", since)
      .neq("status", "cancelado")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duplicate?.id) {
      await supabaseAdmin.from("bazar_order_attempts").upsert({ event_id: event.id, attempt_id: attemptId, order_id: duplicate.id });
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

    await supabaseAdmin.from("bazar_order_attempts").upsert({ event_id: event.id, attempt_id: attemptId, order_id: order.id });

    const created = await readOrder(order.id);
    return NextResponse.json({ order: created, reused: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao criar pedido." }, { status: 500 });
  }
}

async function readOrder(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("bazar_orders")
    .select("*, client:bazar_clients(*), items:bazar_order_items(*), payments:bazar_payments(*)")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data;
}
