import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { buildPixQrDataUrl, getBazarEvent, PaymentInput } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PaymentInput;
    const orderIds = [...new Set((body.orderIds || []).filter(Boolean))];
    if (orderIds.length === 0) return NextResponse.json({ error: "Selecione pelo menos um pedido." }, { status: 400 });
    if (!body.method) return NextResponse.json({ error: "Informe a forma de pagamento." }, { status: 400 });

    const event = await getBazarEvent();
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("bazar_orders")
      .select("id,total_amount,payment_status")
      .eq("event_id", event.id)
      .in("id", orderIds);

    if (ordersError) throw ordersError;
    const amount = Number(body.amount || 0) || (orders || []).reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const groupCode = randomUUID().slice(0, 8).toUpperCase();

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("bazar_payments")
      .insert({
        event_id: event.id,
        client_id: body.clientId || null,
        order_ids: orderIds,
        method: body.method,
        amount,
        notes: body.notes || null,
        group_code: groupCode,
      })
      .select("*")
      .single();

    if (paymentError || !payment) throw paymentError || new Error("Não foi possível registrar o pagamento.");

    const { error: updateError } = await supabaseAdmin
      .from("bazar_orders")
      .update({ payment_status: "pago", status: "fechado", updated_at: new Date().toISOString() })
      .in("id", orderIds);

    if (updateError) throw updateError;

    return NextResponse.json({ payment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao registrar pagamento." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = Number(searchParams.get("amount") || 1);
    const txid = searchParams.get("txid") || "BAZARSEM";
    const pix = await buildPixQrDataUrl(amount, txid);
    return NextResponse.json(pix);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar Pix." }, { status: 500 });
  }
}
