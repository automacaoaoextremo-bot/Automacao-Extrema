import { NextResponse } from "next/server";
import { getBazarEvent } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  client?: { name?: string } | null;
  items?: Array<{ kind: string; name: string; category_path?: string | null; quantity: number; total_price: number; unit_price: number }>;
};

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

    const orders = (ordersRes.data || []) as OrderRow[];
    const payments = paymentsRes.data || [];
    const expenses = expensesRes.data || [];
    const validOrders = orders.filter((order) => order.status !== "cancelado" && order.status !== "excluido");

    const totals = {
      sold: validOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      paid: payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      pending: validOrders.filter((order) => order.payment_status !== "pago").reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      canceled: orders.filter((order) => order.status === "cancelado").reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      expenses: expenses.filter((expense) => expense.status !== "cancelada").reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    };
    const result = totals.paid - totals.expenses;

    const byPayment = groupSum(payments, (payment) => payment.method, (payment) => Number(payment.amount || 0));
    const itemRows = validOrders.flatMap((order) => order.items || []);
    const byKind = groupSum(itemRows, (item) => item.kind === "bazar" ? "Bazar" : "Alimentos e bebidas", (item) => Number(item.total_price || 0), (item) => Number(item.quantity || 0));
    const byItem = groupSum(itemRows, (item) => item.name, (item) => Number(item.total_price || 0), (item) => Number(item.quantity || 0));
    const byExpense = groupSum(expenses.filter((expense) => expense.status !== "cancelada"), (expense) => expense.category || "Geral", (expense) => Number(expense.amount || 0));

    return NextResponse.json({ event, orders, payments, expenses, totals: { ...totals, result }, byPayment, byKind, byItem, byExpense });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar relatório." }, { status: 500 });
  }
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
