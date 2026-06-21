import { NextResponse } from "next/server";
import { getBazarEvent } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  total_amount: number | string;
  payment_status: string;
  status: string;
  created_at: string;
  client?: { name?: string } | null;
  items?: Array<{
    kind: string;
    name: string;
    category_path?: string | null;
    quantity: number | string;
    total_price: number | string;
    unit_price: number | string;
  }>;
};

type PaymentRow = {
  id: string;
  method?: string | null;
  amount?: number | string | null;
  order_ids?: string[] | null;
  status?: string | null;
};

type ExpenseRow = {
  id: string;
  category?: string | null;
  description?: string | null;
  amount?: number | string | null;
  status?: string | null;
};

const EXCLUDED_ORDER_STATUS = "excluido";
const CANCELED_ORDER_STATUS = "cancelado";

export async function GET() {
  try {
    const event = await getBazarEvent();
    const [ordersRes, paymentsRes, expensesRes] = await Promise.all([
      supabaseAdmin
        .from("bazar_orders")
        .select("*, client:bazar_clients(name), items:bazar_order_items(*)")
        .eq("event_id", event.id)
        .order("created_at"),
      supabaseAdmin.from("bazar_payments").select("*").eq("event_id", event.id).order("created_at"),
      supabaseAdmin.from("bazar_expenses").select("*").eq("event_id", event.id).order("created_at"),
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const orders = ((ordersRes.data || []) as OrderRow[]).filter((order) => order.status !== EXCLUDED_ORDER_STATUS);
    const payments = (paymentsRes.data || []) as PaymentRow[];
    const expenses = (expensesRes.data || []) as ExpenseRow[];

    const activeOrders = orders.filter((order) => order.status !== CANCELED_ORDER_STATUS);
    const canceledOrders = orders.filter((order) => order.status === CANCELED_ORDER_STATUS);
    const activeOrderById = new Map(activeOrders.map((order) => [order.id, order]));
    const activePaidOrders = activeOrders.filter((order) => order.payment_status === "pago");
    const activePendingOrders = activeOrders.filter((order) => order.payment_status !== "pago");

    const activePayments = payments
      .map((payment) => {
        const activePaymentOrders = (payment.order_ids || [])
          .map((orderId) => activeOrderById.get(orderId))
          .filter((order): order is OrderRow => Boolean(order));

        return {
          ...payment,
          activeAmount: activePaymentOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0),
          activeOrderCount: activePaymentOrders.length,
        };
      })
      .filter((payment) => payment.activeOrderCount > 0 && payment.activeAmount > 0);

    const confirmedExpenses = expenses.filter((expense) => expense.status !== "cancelada");

    const totals = {
      sold: activeOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0),
      paid: activePaidOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0),
      pending: activePendingOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0),
      canceled: canceledOrders.reduce((sum, order) => sum + toNumber(order.total_amount), 0),
      expenses: confirmedExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0),
    };
    const result = totals.paid - totals.expenses;

    const byPayment = groupSum(
      activePayments,
      (payment) => payment.method || "Não informado",
      (payment) => payment.activeAmount,
    );

    const itemRows = activeOrders.flatMap((order) => order.items || []);
    const byKind = groupSum(
      itemRows,
      (item) => (item.kind === "bazar" ? "Bazar" : "Alimentos e bebidas"),
      (item) => toNumber(item.total_price),
      (item) => toNumber(item.quantity),
    );
    const byItem = groupSum(
      itemRows,
      (item) => (item.kind === "bazar" ? `${item.name} · ${item.category_path || "Sem categoria"}` : item.name),
      (item) => toNumber(item.total_price),
      (item) => toNumber(item.quantity),
    );
    const byExpense = groupSum(
      confirmedExpenses,
      (expense) => expense.category || "Geral",
      (expense) => toNumber(expense.amount),
    );

    return NextResponse.json({
      event,
      orders,
      payments: activePayments,
      expenses,
      totals: { ...totals, result },
      byPayment,
      byKind,
      byItem,
      byExpense,
    });
  } catch (error) {
    console.error("[bazar-sementinha/report][GET]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar relatório." }, { status: 500 });
  }
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function groupSum<T>(rows: T[], labelFn: (row: T) => string, amountFn: (row: T) => number, quantityFn?: (row: T) => number) {
  const map = new Map<string, { label: string; quantity: number; total: number }>();
  for (const row of rows) {
    const label = labelFn(row) || "Não informado";
    const previous = map.get(label) || { label, quantity: 0, total: 0 };
    previous.total += amountFn(row);
    previous.quantity += quantityFn ? quantityFn(row) : 1;
    map.set(label, previous);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
