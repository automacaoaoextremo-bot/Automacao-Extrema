import { NextResponse } from "next/server";
import { getBazarEvent } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  code?: string | null;
  total_amount: number | string;
  payment_status: string;
  status: string;
  created_at: string;
  client?: { name?: string | null; whatsapp?: string | null } | null;
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

type SummaryRow = {
  label: string;
  quantity: number;
  revenue: number;
  expenses: number;
  result: number;
  resultPercent: number | null;
};

type PendingPaymentRow = {
  id: string;
  clientName: string;
  code: string;
  createdAt: string;
  items: string;
  total: number;
};

const EXCLUDED_ORDER_STATUS = "excluido";
const CANCELED_ORDER_STATUS = "cancelado";

export async function GET() {
  try {
    const event = await getBazarEvent();
    const [ordersRes, paymentsRes, expensesRes] = await Promise.all([
      supabaseAdmin
        .from("bazar_orders")
        .select("*, client:bazar_clients(name, whatsapp), items:bazar_order_items(*)")
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
    const menuItemRows = itemRows.filter((item) => item.kind === "menu");

    const byKind = groupSum(
      itemRows,
      (item) => (item.kind === "bazar" ? "Bazar" : "Alimentos e bebidas"),
      (item) => toNumber(item.total_price),
      (item) => toNumber(item.quantity),
    );

    const byCategorySummary = buildCategorySummary(byKind, confirmedExpenses);

    const byItem = groupSum(
      menuItemRows,
      (item) => item.name,
      (item) => toNumber(item.total_price),
      (item) => toNumber(item.quantity),
    );

    const byExpense = groupSum(
      confirmedExpenses,
      (expense) => expense.category || "Geral",
      (expense) => toNumber(expense.amount),
    );

    const pendingPayments: PendingPaymentRow[] = activePendingOrders
      .map((order) => ({
        id: order.id,
        clientName: order.client?.name?.trim() || "Sem cliente",
        code: order.code || order.id.slice(0, 8),
        createdAt: order.created_at,
        items: describeOrderItems(order.items || []),
        total: toNumber(order.total_amount),
      }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName, "pt-BR") || a.createdAt.localeCompare(b.createdAt));

    return NextResponse.json({
      event,
      orders,
      payments: activePayments,
      expenses,
      totals: { ...totals, result },
      byPayment,
      byKind,
      byCategorySummary,
      byItem,
      byExpense,
      pendingPayments,
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

function buildCategorySummary(salesRows: Array<{ label: string; quantity: number; total: number }>, expenses: ExpenseRow[]): SummaryRow[] {
  const map = new Map<string, SummaryRow>();

  for (const row of salesRows) {
    map.set(row.label, {
      label: row.label,
      quantity: row.quantity,
      revenue: row.total,
      expenses: 0,
      result: row.total,
      resultPercent: row.total > 0 ? 100 : null,
    });
  }

  for (const expense of expenses) {
    const label = summaryLabelForExpense(expense.category || expense.description || "");
    const previous = map.get(label) || {
      label,
      quantity: 0,
      revenue: 0,
      expenses: 0,
      result: 0,
      resultPercent: null,
    };

    previous.expenses += toNumber(expense.amount);
    previous.result = previous.revenue - previous.expenses;
    previous.resultPercent = previous.revenue > 0 ? (previous.result / previous.revenue) * 100 : null;
    map.set(label, previous);
  }

  const rows = [...map.values()].map((row) => ({
    ...row,
    result: row.revenue - row.expenses,
    resultPercent: row.revenue > 0 ? ((row.revenue - row.expenses) / row.revenue) * 100 : null,
  }));

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalExpenses = rows.reduce((sum, row) => sum + row.expenses, 0);
  const totalResult = totalRevenue - totalExpenses;

  return [
    ...rows.sort((a, b) => b.revenue - a.revenue || b.expenses - a.expenses),
    {
      label: "Total do evento",
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      revenue: totalRevenue,
      expenses: totalExpenses,
      result: totalResult,
      resultPercent: totalRevenue > 0 ? (totalResult / totalRevenue) * 100 : null,
    },
  ];
}

function summaryLabelForExpense(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (["alimenta", "bebida", "cozinha", "salgado", "bolo", "torta", "doce"].some((term) => normalized.includes(term))) {
    return "Alimentos e bebidas";
  }

  if (["bazar", "roupa", "sapato", "brinquedo", "bolsa", "acessorio", "bijuteria", "casa"].some((term) => normalized.includes(term))) {
    return "Bazar";
  }

  return "Despesas gerais";
}

function describeOrderItems(items: NonNullable<OrderRow["items"]>) {
  if (items.length === 0) return "Sem itens detalhados";
  return items
    .map((item) => `${toNumber(item.quantity)}x ${item.name}`)
    .join(", ");
}
