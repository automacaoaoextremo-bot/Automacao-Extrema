import Image from "next/image";
import Link from "next/link";
import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { AE_SITE_URL } from "@/lib/ae-public-links";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { BazarClienteShareActions } from "./share-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acompanhar cliente | Bazar do Sementinha",
  robots: {
    index: false,
    follow: false,
  },
};

type ClientRow = {
  id: string;
  event_id: string;
  name: string;
  whatsapp?: string | null;
};

type OrderRow = {
  id: string;
  event_id: string;
  client_id: string;
  code: string;
  status: string;
  payment_status: string;
  total_amount: number | string;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  kind?: string | null;
  name: string;
  category_path?: string | null;
  quantity: number;
  unit_price?: number | string | null;
  total_price: number | string;
};

type PaymentRow = {
  id: string;
  method: string;
  amount: number | string;
  order_ids?: string[] | null;
  created_at?: string | null;
};

type ClientOrdersResult = {
  client: ClientRow;
  orders: OrderRow[];
  itemsByOrder: Map<string, OrderItemRow[]>;
  paymentsByOrder: Map<string, PaymentRow[]>;
  totals: {
    geral: number;
    pago: number;
    pendente: number;
    cancelado: number;
  };
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatWhatsapp(value?: string | null) {
  const digits = onlyDigits(value || "");
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  if (national.length === 11) return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  if (national.length === 10) return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  return value || "";
}

function methodLabel(method: string) {
  const labels: Record<string, string> = {
    pix: "Pix",
    credito: "Crédito",
    debito: "Débito",
    dinheiro: "Dinheiro",
  };
  return labels[method] || method;
}

function orderStatusLabel(order: OrderRow) {
  if (order.status === "cancelado") return "Pedido cancelado";
  if (order.payment_status === "pago") return "Pagamento confirmado";
  return "Aguardando pagamento no caixa";
}

function orderStatusClass(order: OrderRow) {
  if (order.status === "cancelado") return "bg-[#fff0f0] text-[#7d1b1b]";
  if (order.payment_status === "pago") return "bg-[#e8fff0] text-[#0f6b35]";
  return "bg-[#fff8dd] text-[#7a5a00]";
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getClientOrders(token: string): Promise<ClientOrdersResult | null> {
  const { data: client, error: clientError } = await supabaseAdmin
    .from("bazar_clients")
    .select("id, event_id, name, whatsapp")
    .eq("public_token", token)
    .maybeSingle();

  if (clientError) throw clientError;
  if (!client) return null;

  const clientRow = client as ClientRow;

  const { data: ordersData, error: ordersError } = await supabaseAdmin
    .from("bazar_orders")
    .select("id, event_id, client_id, code, status, payment_status, total_amount, notes, created_at, updated_at")
    .eq("event_id", clientRow.event_id)
    .eq("client_id", clientRow.id)
    .neq("status", "excluido")
    .order("created_at", { ascending: true });

  if (ordersError) throw ordersError;

  const orders = (ordersData || []) as OrderRow[];
  const orderIds = orders.map((order) => order.id);

  const [itemsResult, paymentsResult] = await Promise.all([
    orderIds.length > 0
      ? supabaseAdmin.from("bazar_order_items").select("id, order_id, kind, name, category_path, quantity, unit_price, total_price").in("order_id", orderIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as OrderItemRow[], error: null }),
    supabaseAdmin.from("bazar_payments").select("id, method, amount, order_ids, created_at").eq("event_id", clientRow.event_id).eq("client_id", clientRow.id).order("created_at", { ascending: false }),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of (itemsResult.data || []) as OrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const paymentsByOrder = new Map<string, PaymentRow[]>();
  for (const payment of (paymentsResult.data || []) as PaymentRow[]) {
    for (const orderId of payment.order_ids || []) {
      if (!orderIds.includes(orderId)) continue;
      const list = paymentsByOrder.get(orderId) || [];
      list.push(payment);
      paymentsByOrder.set(orderId, list);
    }
  }

  const totals = orders.reduce(
    (acc, order) => {
      const value = toNumber(order.total_amount);
      if (order.status === "cancelado") {
        acc.cancelado += value;
        return acc;
      }

      acc.geral += value;
      if (order.payment_status === "pago") acc.pago += value;
      else acc.pendente += value;
      return acc;
    },
    { geral: 0, pago: 0, pendente: 0, cancelado: 0 },
  );

  return { client: clientRow, orders, itemsByOrder, paymentsByOrder, totals };
}

export default async function BazarClientePublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const decodedToken = decodeURIComponent(token);
  const publicUrl = `${AE_SITE_URL}/bazar-sementinha/cliente/${encodeURIComponent(decodedToken)}`;
  const whatsappText = `Olá! Acompanhe seus pedidos do Bazar Sementinha por este link: ${publicUrl}`;
  let result: ClientOrdersResult | null = null;

  try {
    result = await getClientOrders(decodedToken);
  } catch {
    result = null;
  }

  return (
    <>
      <BazarHeader active="pedidos" publicView publicContextToken={decodedToken} />
      <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] px-3 py-6 text-[15px] text-[#214527] sm:px-4 sm:py-8 sm:text-base">
        <div className="mx-auto w-full max-w-3xl min-w-0">
          {!result ? (
            <section className="rounded-[2rem] border border-[#dfe8df] bg-white p-5 text-center shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.18em]">Acompanhamento</p>
              <h1 className="mt-3 text-2xl font-black sm:text-3xl">Cliente não encontrado</h1>
              <p className="mt-4 leading-7 text-[#496451]">Confira se o QRCode foi lido corretamente ou peça ajuda para a equipe do Bazar Sementinha.</p>
              <Link href={`/bazar-sementinha/cardapio?cliente=${encodeURIComponent(decodedToken)}`} className="mt-6 inline-flex rounded-full bg-[#2f7d45] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white">
                Ver cardápio
              </Link>
            </section>
          ) : (
            <section className="min-w-0 rounded-[2rem] border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-6">
              <div className="rounded-3xl bg-[#fffdf7] p-4 ring-1 ring-[#dfe8df] sm:p-5">
                <span className="inline-flex rounded-full bg-[#e8fff0] px-4 py-2 text-sm font-black text-[#0f6b35]">Acompanhamento do cliente</span>
                <h1 className="mt-5 text-2xl font-black leading-tight sm:text-4xl">{result.client.name}</h1>
                <p className="mt-3 text-sm leading-6 text-[#496451] sm:text-base">
                  Acompanhe aqui todos os pedidos, totais e status de pagamento deste cliente no Bazar Sementinha.
                </p>
                {result.client.whatsapp && (
                  <p className="mt-3 rounded-2xl bg-[#e8fff0] px-4 py-3 text-sm font-bold text-[#0f6b35]">
                    WhatsApp cadastrado: <span className="font-black">{formatWhatsapp(result.client.whatsapp)}</span>
                  </p>
                )}
                <BazarClienteShareActions publicUrl={publicUrl} whatsappText={whatsappText} clientWhatsapp={result.client.whatsapp} />
              </div>

              <div className="mt-5 grid gap-4 rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df] sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:p-5">
                <Image
                  src={`/api/bazar-sementinha/qrcode?text=${encodeURIComponent(publicUrl)}`}
                  alt={`QRCode para acompanhar pedidos de ${result.client.name}`}
                  width={170}
                  height={170}
                  unoptimized
                  className="mx-auto rounded-2xl bg-white p-2 ring-1 ring-[#dfe8df] sm:mx-0"
                />
                <div className="min-w-0">
                  <h2 className="text-xl font-black sm:text-2xl">Link de acompanhamento</h2>
                  <p className="mt-2 break-words rounded-2xl bg-[#f9f7ef] p-3 text-xs font-bold text-[#496451] sm:text-sm">{publicUrl}</p>
                  <p className="mt-3 text-sm leading-6 text-[#496451]">Use o botão de WhatsApp para salvar ou enviar este link ao cliente.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-[#f4e7b3] p-4 ring-1 ring-[#e6d791]">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#496451]">Total ativo</span>
                  <strong className="mt-2 block text-2xl text-[#0f3f23] sm:text-3xl">{formatBRL(result.totals.geral)}</strong>
                </div>
                <div className="rounded-3xl bg-[#e8fff0] p-4 ring-1 ring-[#ccebd6]">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#496451]">Pago</span>
                  <strong className="mt-2 block text-2xl text-[#0f6b35] sm:text-3xl">{formatBRL(result.totals.pago)}</strong>
                </div>
                <div className="rounded-3xl bg-[#fff8dd] p-4 ring-1 ring-[#efe3af]">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#496451]">Pendente</span>
                  <strong className="mt-2 block text-2xl text-[#7a5a00] sm:text-3xl">{formatBRL(result.totals.pendente)}</strong>
                </div>
              </div>

              <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df] sm:p-5">
                <h2 className="text-xl font-black sm:text-2xl">Pedidos do cliente</h2>
                <div className="mt-4 space-y-4">
                  {result.orders.length === 0 && <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm text-[#496451]">Nenhum pedido registrado para este cliente.</p>}
                  {result.orders.map((order) => {
                    const items = result.itemsByOrder.get(order.id) || [];
                    const payments = result.paymentsByOrder.get(order.id) || [];

                    return (
                      <article key={order.id} className="min-w-0 rounded-3xl border border-[#dfe8df] bg-[#fffdf7] p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${orderStatusClass(order)}`}>{orderStatusLabel(order)}</span>
                            <h3 className="mt-3 text-xl font-black sm:text-2xl">Pedido {order.code}</h3>
                            <p className="mt-1 text-xs text-[#7a8278] sm:text-sm">Criado em {formatDateTime(order.created_at)}</p>
                          </div>
                          <strong className="text-2xl text-[#0f3f23] sm:text-3xl">{formatBRL(toNumber(order.total_amount))}</strong>
                        </div>

                        <div className="mt-4 space-y-2">
                          {items.length === 0 && <p className="rounded-2xl bg-white p-3 text-sm text-[#496451] ring-1 ring-[#dfe8df]">Nenhum item vinculado ao pedido.</p>}
                          {items.map((item) => (
                            <div key={item.id} className="flex min-w-0 items-start justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#dfe8df]">
                              <div className="min-w-0">
                                <strong className="block break-words text-sm sm:text-base">{item.name}</strong>
                                <p className="text-xs text-[#496451] sm:text-sm">{item.quantity} × {formatBRL(toNumber(item.unit_price))}</p>
                                {item.category_path && <p className="text-xs font-bold text-[#83a847]">Categoria: {item.category_path}</p>}
                              </div>
                              <strong className="shrink-0 text-sm sm:text-base">{formatBRL(toNumber(item.total_price))}</strong>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-[#dfe8df]">
                          <h4 className="text-sm font-black">Pagamento</h4>
                          {payments.length === 0 ? (
                            <p className="mt-2 text-sm leading-6 text-[#496451]">Pagamento ainda não localizado. Após passar no caixa, atualize esta página.</p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {payments.map((payment) => (
                                <p key={payment.id} className="text-sm text-[#496451]">
                                  <strong className="text-[#214527]">{methodLabel(payment.method)}</strong> · {formatBRL(toNumber(payment.amount))} · {formatDateTime(payment.created_at)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-3xl bg-[#fffdf7] p-4 ring-1 ring-[#dfe8df] sm:p-5">
                <h2 className="text-lg font-black sm:text-xl">Salvar este acompanhamento</h2>
                <p className="mt-2 text-sm leading-6 text-[#496451]">Envie o link pelo WhatsApp ou copie para colar em uma mensagem.</p>
                <BazarClienteShareActions publicUrl={publicUrl} whatsappText={whatsappText} clientWhatsapp={result.client.whatsapp} compact />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/bazar-sementinha/cardapio?cliente=${encodeURIComponent(decodedToken)}`} className="rounded-full border border-[#dfe8df] bg-white px-5 py-3 text-sm font-black text-[#214527] shadow-sm">
                  Ver cardápio
                </Link>
                <Link href={`/bazar-sementinha?cliente=${encodeURIComponent(decodedToken)}`} className="rounded-full bg-[#2f7d45] px-5 py-3 text-sm font-black text-white shadow-sm">
                  Voltar ao início
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
