"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Order = { id: string; code: string; total_amount: number; payment_status: string; status: string; client?: { id: string; name: string } | null; items?: Array<{ id: string; name: string; quantity: number; total_price: number }> };

type Bootstrap = { orders: Order[]; pix?: { payload: string; dataUrl: string } };

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function CaixaClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<"pix" | "credito" | "debito" | "dinheiro">("pix");
  const [pix, setPix] = useState<{ payload: string; dataUrl: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/bazar-sementinha/bootstrap", { cache: "no-store" });
    const data = (await res.json()) as Bootstrap;
    setOrders(data.orders || []);
    setPix(data.pix || null);
  }

  useEffect(() => {
    let ignore = false;
    fetch("/api/bazar-sementinha/bootstrap", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Bootstrap) => {
        if (ignore) return;
        setOrders(data.orders || []);
        setPix(data.pix || null);
      })
      .catch(() => {
        if (!ignore) setMessage("Não foi possível carregar os pedidos.");
      });
    return () => {
      ignore = true;
    };
  }, []);

  const openOrders = orders.filter((order) => order.status !== "cancelado" && order.payment_status !== "pago");
  const grouped = useMemo(() => {
    const map = new Map<string, { clientId: string | null; name: string; orders: Order[]; total: number }>();
    for (const order of openOrders) {
      const key = order.client?.id || "sem-cliente";
      const previous = map.get(key) || { clientId: order.client?.id || null, name: order.client?.name || "Sem cliente", orders: [], total: 0 };
      previous.orders.push(order);
      previous.total += Number(order.total_amount || 0);
      map.set(key, previous);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [openOrders]);

  const selectedOrders = openOrders.filter((order) => selected.includes(order.id));
  const selectedTotal = selectedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  async function refreshPix(total: number) {
    const res = await fetch(`/api/bazar-sementinha/payments?amount=${encodeURIComponent(String(Math.max(total, 1)))}&txid=BAZARSEM`, { cache: "no-store" });
    const data = await res.json();
    setPix(data);
  }

  function toggle(orderId: string) {
    setSelected((current) => {
      const next = current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId];
      const total = openOrders.filter((order) => next.includes(order.id)).reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      refreshPix(total).catch(() => null);
      return next;
    });
  }

  function selectGroup(orderIds: string[]) {
    setSelected(orderIds);
    const total = openOrders.filter((order) => orderIds.includes(order.id)).reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    refreshPix(total).catch(() => null);
  }

  async function pay() {
    if (saving) return;
    setMessage("");
    if (selected.length === 0) {
      setMessage("Selecione um ou mais pedidos.");
      return;
    }
    setSaving(true);
    try {
      const clientId = selectedOrders[0]?.client?.id || null;
      const res = await fetch("/api/bazar-sementinha/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selected, method, amount: selectedTotal, clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao registrar pagamento.");
      setMessage(`Pagamento registrado: ${brl(selectedTotal)}.`);
      setSelected([]);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao registrar pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function copyPix() {
    if (!pix?.payload) return;
    await navigator.clipboard.writeText(pix.payload);
    setMessage("Pix copia e cola copiado.");
  }

  return (
    <main className="min-h-screen bg-[#f9f7ef] px-4 py-6 text-[#214527]">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Fechamento</p>
              <h1 className="mt-2 text-3xl font-black">Caixa por cliente</h1>
            </div>
            <button onClick={() => load()} className="rounded-full border border-[#2f7d45]/20 px-4 py-2 text-sm font-black text-[#2f7d45]">Atualizar</button>
          </div>
          <div className="mt-5 space-y-4">
            {grouped.length === 0 && <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm">Nenhum pedido pendente.</p>}
            {grouped.map((group) => (
              <article key={group.clientId || group.name} className="rounded-3xl border border-[#dfe8df] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black">{group.name}</h2>
                    <p className="text-sm text-[#496451]">{group.orders.length} pedido(s) · {brl(group.total)}</p>
                  </div>
                  <button onClick={() => selectGroup(group.orders.map((order) => order.id))} className="rounded-full bg-[#f4e7b3] px-4 py-2 text-sm font-black text-[#214527]">Selecionar todos</button>
                </div>
                <div className="mt-4 space-y-2">
                  {group.orders.map((order) => (
                    <label key={order.id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                      <input type="checkbox" checked={selected.includes(order.id)} onChange={() => toggle(order.id)} className="mt-1 h-5 w-5" />
                      <span className="flex-1">
                        <strong>#{order.code} · {brl(Number(order.total_amount))}</strong>
                        <span className="mt-1 block text-sm text-[#496451]">{(order.items || []).map((item) => `${item.quantity}x ${item.name}`).join(" · ")}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm lg:sticky lg:top-48">
          <h2 className="text-2xl font-black">Pagamento</h2>
          <div className="mt-4 rounded-2xl bg-[#f4e7b3] p-4">
            <span className="text-sm font-bold">Selecionado</span>
            <strong className="block text-3xl">{brl(selectedTotal)}</strong>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["pix", "credito", "debito", "dinheiro"] as const).map((item) => (
              <button key={item} onClick={() => setMethod(item)} className={`rounded-2xl px-3 py-3 text-sm font-black uppercase ${method === item ? "bg-[#2f7d45] text-white" : "bg-[#f9f7ef] text-[#214527]"}`}>{item}</button>
            ))}
          </div>
          {method === "pix" && pix && (
            <div className="mt-4 rounded-2xl border border-[#dfe8df] p-3 text-center">
              <Image src={pix.dataUrl} alt="QR Code Pix" width={260} height={260} className="mx-auto h-auto w-56" unoptimized />
              <p className="mt-2 text-xs text-[#496451]">Chave Pix Tucxa: 58.392.598/0001-91</p>
              <button onClick={copyPix} className="mt-3 w-full rounded-2xl bg-[#f4e7b3] px-4 py-3 text-sm font-black">Copiar Pix copia e cola</button>
            </div>
          )}
          <button disabled={saving || selected.length === 0} onClick={pay} className="mt-4 w-full rounded-2xl bg-[#2f7d45] px-5 py-4 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:bg-[#83a847]">
            {saving ? "Registrando..." : "Registrar pagamento"}
          </button>
          {message && <p className="mt-3 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold">{message}</p>}
        </aside>
      </div>
    </main>
  );
}
