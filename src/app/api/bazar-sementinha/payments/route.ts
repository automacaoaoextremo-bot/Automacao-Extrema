import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { buildPixQrDataUrl, getBazarEvent, PaymentInput } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type PaymentOrderRow = {
  id: string;
  client_id: string | null;
  total_amount: number | string;
  payment_status: string;
  status: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PaymentInput;
    const orderIds = [...new Set((body.orderIds || []).filter(Boolean))];

    if (orderIds.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos um pedido." }, { status: 400 });
    }

    if (!body.method) {
      return NextResponse.json({ error: "Informe a forma de pagamento." }, { status: 400 });
    }

    const event = await getBazarEvent();
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from("bazar_orders")
      .select("id,client_id,total_amount,payment_status,status")
      .eq("event_id", event.id)
      .in("id", orderIds);

    if (ordersError) throw ordersError;

    const orders = (ordersData || []) as PaymentOrderRow[];

    if (orders.length !== orderIds.length) {
      return NextResponse.json({ error: "Um ou mais pedidos selecionados não foram encontrados." }, { status: 400 });
    }

    const unavailableOrder = orders.find((order) => order.status === "cancelado" || order.status === "excluido" || order.payment_status === "pago");
    if (unavailableOrder) {
      return NextResponse.json({ error: "Há pedido cancelado, excluído ou já pago na seleção. Atualize o caixa e tente novamente." }, { status: 400 });
    }

    const clientIds = [...new Set(orders.map((order) => order.client_id || "sem-cliente"))];
    if (clientIds.length > 1) {
      return NextResponse.json({ error: "Selecione pedidos de apenas um cliente por vez." }, { status: 400 });
    }

    const clientId = orders[0]?.client_id || null;
    if (body.clientId && clientId && body.clientId !== clientId) {
      return NextResponse.json({ error: "Os pedidos selecionados não pertencem ao cliente informado." }, { status: 400 });
    }

    const amount = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    if (amount <= 0) {
      return NextResponse.json({ error: "O valor do pagamento precisa ser maior que zero." }, { status: 400 });
    }

    const groupCode = randomUUID().slice(0, 8).toUpperCase();

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("bazar_payments")
      .insert({
        event_id: event.id,
        client_id: clientId,
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
      .eq("event_id", event.id)
      .in("id", orderIds);

    if (updateError) throw updateError;

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("[bazar-sementinha/payments][POST]", error);
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
    console.error("[bazar-sementinha/payments][GET]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar Pix." }, { status: 500 });
  }
}
