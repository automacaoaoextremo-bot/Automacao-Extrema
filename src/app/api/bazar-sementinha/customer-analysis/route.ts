import { NextResponse } from "next/server";
import { getBazarEventFromRequest, requireBazarSession, sessionErrorStatus } from "@/lib/bazar-sementinha";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  slug: string;
  status: string;
  is_public?: boolean;
};

type ClientRow = {
  id: string;
  event_id: string;
  name: string;
  normalized_name?: string | null;
  whatsapp?: string | null;
  is_corrente?: boolean | null;
  corrente_identified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ItemRow = {
  id: string;
  kind: string;
  name: string;
  category_path?: string | null;
  quantity: number | string;
  unit_price: number | string;
  total_price: number | string;
  created_at?: string | null;
};

type OrderRow = {
  id: string;
  event_id: string;
  client_id?: string | null;
  code?: string | null;
  status: string;
  payment_status: string;
  total_amount: number | string;
  created_at: string;
  notes?: string | null;
  items?: ItemRow[];
};

type PaymentRow = {
  id: string;
  event_id: string;
  method?: string | null;
  amount?: number | string | null;
  order_ids?: string[] | null;
  status?: string | null;
  created_at?: string | null;
};

type CustomerGroup = {
  key: string;
  name: string;
  whatsapp: string | null;
  registrations: Array<{
    clientId: string;
    eventId: string;
    eventName: string;
    eventDate: string;
    isCorrente: boolean | null;
    correnteIdentifiedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  orders: Array<{
    id: string;
    eventId: string;
    eventName: string;
    eventDate: string;
    code: string;
    status: string;
    paymentStatus: string;
    paymentMethods: string[];
    createdAt: string;
    total: number;
    notes: string | null;
    items: Array<{
      id: string;
      kind: string;
      name: string;
      categoryPath: string | null;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  }>;
};

const EXCLUDED_ORDER_STATUS = "excluido";
const CANCELED_ORDER_STATUS = "cancelado";

export async function GET(request: Request) {
  try {
    await requireBazarSession(request);
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") === "all" ? "all" : "event";

    const eventsResult = await supabaseAdmin
      .from("bazar_events")
      .select("id,name,event_date,slug,status,is_public")
      .order("event_date", { ascending: false });

    if (eventsResult.error) throw eventsResult.error;

    const events = (eventsResult.data || []) as EventRow[];
    let selectedEvent: EventRow | null = null;
    let eventIds = events.map((event) => event.id);

    if (scope === "event") {
      const resolved = await getBazarEventFromRequest(request);
      selectedEvent = events.find((event) => event.id === resolved.id) || {
        id: resolved.id,
        name: resolved.name,
        event_date: resolved.event_date,
        slug: resolved.slug,
        status: resolved.status,
        is_public: resolved.is_public,
      };
      eventIds = [resolved.id];
    }

    if (eventIds.length === 0) {
      return NextResponse.json({
        scope,
        selectedEvent,
        events,
        customers: [],
        totals: emptyTotals(),
      });
    }

    const [clientsResult, ordersResult, paymentsResult] = await Promise.all([
      supabaseAdmin
        .from("bazar_clients")
        .select("id,event_id,name,normalized_name,whatsapp,is_corrente,corrente_identified_at,created_at,updated_at")
        .in("event_id", eventIds)
        .order("name", { ascending: true })
        .limit(10000),
      supabaseAdmin
        .from("bazar_orders")
        .select("id,event_id,client_id,code,status,payment_status,total_amount,created_at,notes,items:bazar_order_items(id,kind,name,category_path,quantity,unit_price,total_price,created_at)")
        .in("event_id", eventIds)
        .neq("status", EXCLUDED_ORDER_STATUS)
        .order("created_at", { ascending: true })
        .limit(10000),
      supabaseAdmin
        .from("bazar_payments")
        .select("id,event_id,method,amount,order_ids,status,created_at")
        .in("event_id", eventIds)
        .order("created_at", { ascending: true })
        .limit(10000),
    ]);

    if (clientsResult.error) throw clientsResult.error;
    if (ordersResult.error) throw ordersResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const clients = (clientsResult.data || []) as ClientRow[];
    const orders = (ordersResult.data || []) as OrderRow[];
    const payments = (paymentsResult.data || []) as PaymentRow[];
    const eventsById = new Map(events.map((event) => [event.id, event]));
    const paymentsByOrder = buildPaymentsByOrder(payments);

    const groups = new Map<string, CustomerGroup>();
    const groupKeyByClientId = new Map<string, string>();

    for (const client of clients) {
      const key = customerKey(client);
      groupKeyByClientId.set(client.id, key);
      const event = eventsById.get(client.event_id);
      const current = groups.get(key) || {
        key,
        name: client.name,
        whatsapp: client.whatsapp || null,
        registrations: [],
        orders: [],
      };

      if ((!current.whatsapp || current.whatsapp.length < 8) && client.whatsapp) current.whatsapp = client.whatsapp;
      if (client.updated_at && (!current.registrations[0]?.updatedAt || client.updated_at > current.registrations[0].updatedAt)) {
        current.name = client.name;
      }

      current.registrations.push({
        clientId: client.id,
        eventId: client.event_id,
        eventName: event?.name || "Evento não encontrado",
        eventDate: event?.event_date || "",
        isCorrente: typeof client.is_corrente === "boolean" ? client.is_corrente : null,
        correnteIdentifiedAt: client.corrente_identified_at || null,
        createdAt: client.created_at || null,
        updatedAt: client.updated_at || null,
      });
      groups.set(key, current);
    }

    for (const order of orders) {
      if (!order.client_id) continue;
      const key = groupKeyByClientId.get(order.client_id);
      if (!key) continue;
      const group = groups.get(key);
      if (!group) continue;
      const event = eventsById.get(order.event_id);
      const methods = [...new Set((paymentsByOrder.get(order.id) || []).map((payment) => payment.method || "Não informado"))];

      group.orders.push({
        id: order.id,
        eventId: order.event_id,
        eventName: event?.name || "Evento não encontrado",
        eventDate: event?.event_date || "",
        code: order.code || order.id.slice(0, 8),
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethods: methods,
        createdAt: order.created_at,
        total: toNumber(order.total_amount),
        notes: order.notes || null,
        items: (order.items || []).map((item) => ({
          id: item.id,
          kind: item.kind,
          name: item.name,
          categoryPath: item.category_path || null,
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unit_price),
          total: toNumber(item.total_price),
        })),
      });
    }

    const customers = [...groups.values()]
      .map((customer) => ({
        ...customer,
        registrations: customer.registrations.sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
        orders: customer.orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        summary: buildCustomerSummary(customer.orders),
      }))
      .sort((a, b) => b.summary.total - a.summary.total || a.name.localeCompare(b.name, "pt-BR"));

    return NextResponse.json({
      scope,
      selectedEvent,
      events,
      customers,
      totals: buildGlobalTotals(customers),
    });
  } catch (error) {
    console.error("[bazar-sementinha/customer-analysis][GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao analisar compras por cliente." },
      { status: sessionErrorStatus(error) },
    );
  }
}

function customerKey(client: ClientRow) {
  const phone = onlyDigits(client.whatsapp || "");
  if (phone.length >= 10) return `phone:${phone}`;
  return `name:${client.normalized_name || normalizeName(client.name)}`;
}

function buildPaymentsByOrder(payments: PaymentRow[]) {
  const map = new Map<string, PaymentRow[]>();
  for (const payment of payments) {
    if (payment.status === "cancelado" || payment.status === "cancelada") continue;
    for (const orderId of payment.order_ids || []) {
      const rows = map.get(orderId) || [];
      rows.push(payment);
      map.set(orderId, rows);
    }
  }
  return map;
}

function buildCustomerSummary(orders: CustomerGroup["orders"]) {
  const active = orders.filter((order) => order.status !== CANCELED_ORDER_STATUS);
  const paid = active.filter((order) => order.paymentStatus === "pago");
  const pending = active.filter((order) => order.paymentStatus !== "pago");
  const itemQuantity = active.flatMap((order) => order.items).reduce((sum, item) => sum + item.quantity, 0);
  const eventIds = new Set(active.map((order) => order.eventId));

  return {
    orders: active.length,
    events: eventIds.size,
    itemQuantity,
    total: active.reduce((sum, order) => sum + order.total, 0),
    paid: paid.reduce((sum, order) => sum + order.total, 0),
    pending: pending.reduce((sum, order) => sum + order.total, 0),
    firstOrderAt: active[0]?.createdAt || null,
    lastOrderAt: active[active.length - 1]?.createdAt || null,
  };
}

function buildGlobalTotals(customers: Array<CustomerGroup & { summary: ReturnType<typeof buildCustomerSummary> }>) {
  return customers.reduce(
    (totals, customer) => ({
      customers: totals.customers + 1,
      orders: totals.orders + customer.summary.orders,
      itemQuantity: totals.itemQuantity + customer.summary.itemQuantity,
      total: totals.total + customer.summary.total,
      paid: totals.paid + customer.summary.paid,
      pending: totals.pending + customer.summary.pending,
    }),
    emptyTotals(),
  );
}

function emptyTotals() {
  return { customers: 0, orders: 0, itemQuantity: 0, total: 0, paid: 0, pending: 0 };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
