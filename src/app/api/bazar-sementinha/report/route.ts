import { NextResponse } from "next/server";
import { getBazarEventFromRequest } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type AudienceFilter = "all" | "corrente" | "nao_corrente";

type OrderRow = {
  id: string;
  client_id?: string | null;
  code?: string | null;
  total_amount: number | string;
  payment_status: string;
  status: string;
  created_at: string;
  client?: {
    id?: string | null;
    name?: string | null;
    whatsapp?: string | null;
    is_corrente?: boolean | null;
  } | null;
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

type EventOption = {
  id: string;
  name: string;
  event_date: string;
  slug: string;
  status: string;
  is_public?: boolean;
};

const EXCLUDED_ORDER_STATUS = "excluido";
const CANCELED_ORDER_STATUS = "cancelado";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const audience = parseAudience(url.searchParams.get("audience"));
    const event = await getBazarEventFromRequest(request);

    const [eventsRes, ordersRes, paymentsRes, expensesRes] = await Promise.all([
      supabaseAdmin
        .from("bazar_events")
        .select("id,name,event_date,slug,status,is_public")
        .order("event_date", { ascending: false }),
      supabaseAdmin
        .from("bazar_orders")
        .select("*, client:bazar_clients(id,name,whatsapp,is_corrente), items:bazar_order_items(*)")
        .eq("event_id", event.id)
        .order("created_at"),
      supabaseAdmin.from("bazar_payments").select("*").eq("event_id", event.id).order("created_at"),
      supabaseAdmin.from("bazar_expenses").select("*").eq("event_id", event.id).order("created_at"),
    ]);

    if (eventsRes.error) throw eventsRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const allOrders = ((ordersRes.data || []) as OrderRow[]).filter((order) => order.status !== EXCLUDED_ORDER_STATUS);
    const allActiveOrders = allOrders.filter((order) => order.status !== CANCELED_ORDER_STATUS);
    const audienceCounts = buildAudienceCounts(allActiveOrders);

    const orders = allOrders.filter((order) => matchesAudience(order, audience));
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

    const uniqueClients = new Set(activeOrders.map((order) => order.client_id || order.client?.id).filter(Boolean));
    const metrics = {
      orders: activeOrders.length,
      clients: uniqueClients.size,
      itemQuantity: itemRows.reduce((sum, item) => sum + toNumber(item.quantity), 0),
      averageTicket: activeOrders.length > 0 ? totals.sold / activeOrders.length : 0,
      paidOrders: activePaidOrders.length,
      pendingOrders: activePendingOrders.length,
    };

    return NextResponse.json({
      event,
      events: (eventsRes.data || []) as EventOption[],
      audience,
      audienceCounts,
      expenseScope: audience === "all" ? "filtered-event" : "whole-event",
      expenseScopeNote:
        audience === "all"
          ? null
          : "As despesas são lançadas para o evento, não para um cliente. Por isso permanecem integrais neste filtro; receitas, pedidos, clientes, pagamentos e itens são filtrados pelo público selecionado.",
      orders,
      payments: activePayments,
      expenses,
      totals: { ...totals, result },
      metrics,
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

function parseAudience(value: string | null): AudienceFilter {
  if (value === "corrente" || value === "nao_corrente") return value;
  return "all";
}

function matchesAudience(order: OrderRow, audience: AudienceFilter) {
  if (audience === "all") return true;
  if (audience === "corrente") return order.client?.is_corrente === true;
  return order.client?.is_corrente === false;
}

function buildAudienceCounts(orders: OrderRow[]) {
  const byClient = new Map<string, boolean | null>();
  for (const order of orders) {
    const key = String(order.client_id || order.client?.id || `order:${order.id}`);
    if (byClient.has(key)) continue;
    byClient.set(key, typeof order.client?.is_corrente === "boolean" ? order.client.is_corrente : null);
  }

  let corrente = 0;
  let naoCorrente = 0;
  let unknown = 0;

  for (const value of byClient.values()) {
    if (value === true) corrente += 1;
    else if (value === false) naoCorrente += 1;
    else unknown += 1;
  }

  return {
    total: byClient.size,
    corrente,
    naoCorrente,
    unknown,
  };
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
  return items.map((item) => `${toNumber(item.quantity)}x ${item.name}`).join(", ");
}
