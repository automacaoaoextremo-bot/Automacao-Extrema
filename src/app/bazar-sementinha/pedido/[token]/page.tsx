import Link from "next/link";
import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acompanhar pedido | Bazar do Sementinha",
  robots: {
    index: false,
    follow: false,
  },
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

type ClientRow = {
  id: string;
  name: string;
  whatsapp?: string | null;
};

type OrderItemRow = {
  id: string;
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
  created_at?: string | null;
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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

function orderStatusLabel(order?: OrderRow | null) {
  if (!order) return "Pedido não encontrado";
  if (order.status === "cancelado") return "Pedido cancelado";
  if (order.status === "excluido") return "Pedido indisponível";
  if (order.payment_status === "pago") return "Pagamento confirmado";
  return "Aguardando pagamento no caixa";
}

async function getPublicOrder(token: string) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("bazar_orders")
    .select("id, event_id, client_id, code, status, payment_status, total_amount, notes, created_at, updated_at")
    .eq("public_token", token)
    .neq("status", "excluido")
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) return null;

  const orderRow = order as OrderRow;

  const [clientResult, itemsResult, paymentsResult] = await Promise.all([
    supabaseAdmin.from("bazar_clients").select("id, name, whatsapp").eq("id", orderRow.client_id).maybeSingle(),
    supabaseAdmin.from("bazar_order_items").select("id, name, category_path, quantity, unit_price, total_price").eq("order_id", orderRow.id).order("created_at", { ascending: true }),
    supabaseAdmin.from("bazar_payments").select("id, method, amount, created_at").contains("order_ids", [orderRow.id]).order("created_at", { ascending: false }),
  ]);

  if (clientResult.error) throw clientResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  return {
    order: orderRow,
    client: (clientResult.data || null) as ClientRow | null,
    items: (itemsResult.data || []) as OrderItemRow[],
    payments: (paymentsResult.data || []) as PaymentRow[],
  };
}

export default async function BazarPedidoPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let result: Awaited<ReturnType<typeof getPublicOrder>> = null;

  try {
    result = await getPublicOrder(decodeURIComponent(token));
  } catch {
    result = null;
  }

  return (
    <>
      <BazarHeader active="pedidos" />
      <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] px-3 py-6 text-[15px] text-[#214527] sm:px-4 sm:py-8 sm:text-base">
        <div className="mx-auto w-full max-w-3xl min-w-0">
          {!result ? (
            <section className="rounded-[2rem] border border-[#dfe8df] bg-white p-5 text-center shadow-sm sm:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Acompanhamento</p>
              <h1 className="mt-3 text-2xl font-black sm:text-3xl">Pedido não encontrado</h1>
              <p className="mt-4 leading-7 text-[#496451]">Confira se o QRCode foi lido corretamente ou peça ajuda para a equipe do Bazar Sementinha.</p>
              <Link href="/bazar-sementinha/cardapio" className="mt-6 inline-flex rounded-full bg-[#2f7d45] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white">
                Ver cardápio
              </Link>
            </section>
          ) : (
            <section className="min-w-0 rounded-[2rem] border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-6">
              <div className="rounded-3xl bg-[#fffdf7] p-5 ring-1 ring-[#dfe8df]">
                <span className="inline-flex rounded-full bg-[#e8fff0] px-4 py-2 text-sm font-black text-[#0f6b35]">{orderStatusLabel(result.order)}</span>
                <h1 className="mt-5 text-2xl font-black leading-tight sm:text-4xl">Pedido {result.order.code}</h1>
                <p className="mt-3 text-base text-[#496451] sm:text-lg">Cliente: <strong>{result.client?.name || "Cliente"}</strong></p>
                <p className="mt-1 text-sm text-[#7a8278]">Criado em {formatDateTime(result.order.created_at)}</p>
              </div>

              <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-[#dfe8df]">
                <h2 className="text-xl font-black sm:text-2xl">Itens do pedido</h2>
                <div className="mt-4 space-y-3">
                  {result.items.length === 0 && <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm text-[#496451]">Nenhum item vinculado ao pedido.</p>}
                  {result.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl bg-[#fffdf7] p-4">
                      <div>
                        <strong>{item.name}</strong>
                        <p className="text-sm text-[#496451]">{item.quantity} × {formatBRL(Number(item.unit_price || 0))}</p>
                        {item.category_path && <p className="text-xs font-bold text-[#83a847]">Categoria: {item.category_path}</p>}
                      </div>
                      <strong>{formatBRL(Number(item.total_price || 0))}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-[#f4e7b3] p-4">
                  <span className="text-sm font-bold text-[#496451]">Total</span>
                  <strong className="block text-3xl text-[#0f3f23] sm:text-4xl">{formatBRL(Number(result.order.total_amount || 0))}</strong>
                </div>
              </div>

              <div className="mt-5 rounded-3xl bg-[#fffdf7] p-5 ring-1 ring-[#dfe8df]">
                <h2 className="text-xl font-black sm:text-2xl">Pagamento</h2>
                {result.payments.length === 0 ? (
                  <p className="mt-3 leading-7 text-[#496451]">Pagamento ainda não localizado. Após passar no caixa, atualize esta página para conferir o status.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {result.payments.map((payment) => (
                      <div key={payment.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#dfe8df]">
                        <strong>{methodLabel(payment.method)}</strong>
                        <p className="text-sm text-[#496451]">{formatBRL(Number(payment.amount || 0))} · {formatDateTime(payment.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/bazar-sementinha/cardapio" className="rounded-full border border-[#dfe8df] bg-white px-5 py-3 text-sm font-black text-[#214527] shadow-sm">
                  Ver cardápio
                </Link>
                <Link href="/bazar-sementinha" className="rounded-full bg-[#2f7d45] px-5 py-3 text-sm font-black text-white shadow-sm">
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
