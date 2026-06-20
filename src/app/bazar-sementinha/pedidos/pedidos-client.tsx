"use client";

import { useEffect, useMemo, useState } from "react";

type Price = { id: string; amount: number; label?: string | null; is_active: boolean };
type Category = { id: string; path: string; is_active: boolean; is_visible: boolean };
type MenuItem = { id: string; category: string; name: string; unit_label: string; price: number; is_active: boolean };
type CartItem = { key: string; kind: "bazar" | "menu"; name: string; quantity: number; unitPrice: number; categoryPath?: string | null; sourceId?: string | null };

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function PedidosClient() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [categoryPath, setCategoryPath] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/bazar-sementinha/bootstrap", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setPrices((data.prices || []).filter((item: Price) => item.is_active));
        setCategories((data.categories || []).filter((item: Category) => item.is_active && item.is_visible));
        setMenuItems((data.menuItems || []).filter((item: MenuItem) => item.is_active));
      })
      .catch(() => setMessage("Não foi possível carregar o catálogo."));
  }, []);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [cart]);

  function addBazarItem(price: Price) {
    const key = `bazar-${price.id}-${categoryPath || "sem-categoria"}`;
    setCart((current) => {
      const found = current.find((item) => item.key === key);
      if (found) return current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item));
      return [...current, { key, kind: "bazar", name: `Item Bazar ${brl(Number(price.amount))}`, quantity: 1, unitPrice: Number(price.amount), categoryPath: categoryPath || null, sourceId: price.id }];
    });
  }

  function addMenuItem(menu: MenuItem) {
    const key = `menu-${menu.id}`;
    setCart((current) => {
      const found = current.find((item) => item.key === key);
      if (found) return current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item));
      return [...current, { key, kind: "menu", name: menu.name, quantity: 1, unitPrice: Number(menu.price), categoryPath: menu.category, sourceId: menu.id }];
    });
  }

  function updateQty(key: string, delta: number) {
    setCart((current) => current.map((item) => (item.key === key ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)).filter((item) => item.quantity > 0));
  }

  async function createOrder() {
    if (saving) return;
    setMessage("");
    if (!clientName.trim()) {
      setMessage("Informe o cliente. Nome precisa ser único: se já existe Márcio, outro cliente deve ser Márcio Alex, por exemplo.");
      return;
    }
    if (cart.length === 0) {
      setMessage("Inclua pelo menos um item.");
      return;
    }
    setSaving(true);
    const attemptId = crypto.randomUUID();
    try {
      const res = await fetch("/api/bazar-sementinha/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, whatsapp, attemptId, items: cart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar pedido.");
      setMessage(data.reused ? `Pedido já registrado e reaproveitado: ${data.order.code}` : `Pedido criado: ${data.order.code}`);
      setCart([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao criar pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f9f7ef] px-4 py-6 text-[#214527]">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_390px]">
        <section className="space-y-5">
          <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Registro rápido</p>
            <h1 className="mt-2 text-3xl font-black">Pedidos do Bazar e Cardápio</h1>
            <p className="mt-3 text-sm leading-6 text-[#496451]">Depois do primeiro clique, o botão fica desabilitado e o servidor também bloqueia pedido idêntico do mesmo cliente por 15 segundos.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="sm:col-span-2">
                <span className="text-sm font-bold">Cliente obrigatório e único</span>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex.: Márcio Alex" className="mt-1 w-full rounded-2xl border border-[#dfe8df] px-4 py-3 outline-none focus:border-[#2f7d45]" />
              </label>
              <label>
                <span className="text-sm font-bold">WhatsApp</span>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="opcional" className="mt-1 w-full rounded-2xl border border-[#dfe8df] px-4 py-3 outline-none focus:border-[#2f7d45]" />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Catálogo do Bazar</h2>
            <label className="mt-4 block max-w-md">
              <span className="text-sm font-bold">Categoria, quando desejarem identificar</span>
              <select value={categoryPath} onChange={(e) => setCategoryPath(e.target.value)} className="mt-1 w-full rounded-2xl border border-[#dfe8df] px-4 py-3">
                <option value="">Sem categoria detalhada</option>
                {categories.map((category) => <option key={category.id} value={category.path}>{category.path}</option>)}
              </select>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {prices.map((price) => (
                <button key={price.id} onClick={() => addBazarItem(price)} className="rounded-2xl bg-[#2f7d45] px-4 py-5 text-lg font-black text-white shadow-sm hover:bg-[#246338]">
                  {brl(Number(price.amount))}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Alimentos e bebidas</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {menuItems.map((item) => (
                <button key={item.id} onClick={() => addMenuItem(item)} className="rounded-2xl border border-[#dfe8df] bg-[#fffdf7] p-4 text-left shadow-sm hover:border-[#2f7d45]">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#83a847]">{item.category}</span>
                  <strong className="mt-1 block text-lg">{item.name}</strong>
                  <span className="mt-1 block text-sm text-[#496451]">{item.unit_label} · {brl(Number(item.price))}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm lg:sticky lg:top-48">
          <h2 className="text-2xl font-black">Pedido atual</h2>
          <div className="mt-4 space-y-3">
            {cart.length === 0 && <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm text-[#496451]">Nenhum item selecionado.</p>}
            {cart.map((item) => (
              <div key={item.key} className="rounded-2xl border border-[#dfe8df] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="text-sm text-[#496451]">{item.categoryPath || "Sem categoria"} · {brl(item.unitPrice)}</p>
                  </div>
                  <strong>{brl(item.quantity * item.unitPrice)}</strong>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => updateQty(item.key, -1)} className="h-9 w-9 rounded-full bg-[#f9f7ef] font-black">-</button>
                  <span className="min-w-8 text-center font-black">{item.quantity}</span>
                  <button onClick={() => updateQty(item.key, 1)} className="h-9 w-9 rounded-full bg-[#f9f7ef] font-black">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-[#f4e7b3] p-4">
            <span className="text-sm font-bold">Total</span>
            <strong className="block text-3xl">{brl(total)}</strong>
          </div>
          <button disabled={saving} onClick={createOrder} className="mt-4 w-full rounded-2xl bg-[#2f7d45] px-5 py-4 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:bg-[#83a847]">
            {saving ? "Registrando..." : "Criar pedido"}
          </button>
          {message && <p className="mt-3 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold text-[#214527]">{message}</p>}
        </aside>
      </div>
    </main>
  );
}
