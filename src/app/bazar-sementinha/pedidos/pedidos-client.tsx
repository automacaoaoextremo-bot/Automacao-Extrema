"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Price = { id: string; amount: number; label?: string | null; is_active: boolean };
type Category = { id: string; path: string; is_active: boolean; is_visible: boolean };
type MenuItem = { id: string; category: string; name: string; description?: string | null; unit_label: string; price: number; is_active: boolean };
type Client = { id: string; name: string; whatsapp?: string | null; created_at?: string | null };
type CartItem = { key: string; kind: "bazar" | "menu"; name: string; quantity: number; unitPrice: number; categoryPath?: string | null; sourceId?: string | null };
type CreatedOrder = {
  id: string;
  code: string;
  total_amount: number | string;
  created_at?: string | null;
  client?: Client | null;
  items?: Array<{ id: string; name: string; quantity: number; unit_price?: number | string; total_price: number | string; category_path?: string | null }>;
};
type OrderMode = "bazar" | "menu";

type Bootstrap = {
  prices?: Price[];
  categories?: Category[];
  menuItems?: MenuItem[];
  clients?: Client[];
};

const menuCategoryOrder = ["Todos", "Salgados", "Bebidas", "Doces"];

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDateTime(value?: string | null) {
  if (!value) return "Pedido criado agora";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function PedidosClient() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientName, setClientName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [categoryPath, setCategoryPath] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<OrderMode>("bazar");
  const [menuCategory, setMenuCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [cartReviewOpen, setCartReviewOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/bazar-sementinha/bootstrap", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Bootstrap) => {
        setPrices((data.prices || []).filter((item) => item.is_active));
        setCategories((data.categories || []).filter((item) => item.is_active && item.is_visible));
        setMenuItems((data.menuItems || []).filter((item) => item.is_active));
        setClients([...(data.clients || [])].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setMessage("Não foi possível carregar o catálogo."));
  }, []);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [cart]);

  const visibleMenuItems = useMemo(() => {
    const term = normalize(search.trim());
    return menuItems.filter((item) => {
      const categoryOk = menuCategory === "Todos" || normalize(item.category) === normalize(menuCategory);
      const searchOk = !term || normalize(`${item.name} ${item.category} ${item.description || ""}`).includes(term);
      return categoryOk && searchOk;
    });
  }, [menuCategory, menuItems, search]);

  const groupedMenuItems = useMemo(() => {
    const groups = new Map<string, MenuItem[]>();
    for (const item of visibleMenuItems) {
      const list = groups.get(item.category) || [];
      list.push(item);
      groups.set(item.category, list);
    }
    const orderedCategories = [...groups.keys()].sort((a, b) => {
      const ai = menuCategoryOrder.indexOf(a);
      const bi = menuCategoryOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.localeCompare(b);
    });
    return orderedCategories.map((category) => ({ category, items: groups.get(category) || [] }));
  }, [visibleMenuItems]);

  const filteredClients = useMemo(() => {
    const term = normalize(clientSearch.trim());
    return clients
      .filter((client) => !term || normalize(client.name).includes(term) || normalize(client.whatsapp || "").includes(term))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 12);
  }, [clientSearch, clients]);

  function selectClient(client: Client) {
    setClientName(client.name);
    setWhatsapp(client.whatsapp || "");
    setMode("bazar");
    setCreatedOrder(null);
    setMessage(`Cliente selecionado: ${client.name}`);
    window.setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function startAnotherOrder(client?: Client | null) {
    setCreatedOrder(null);
    setCart([]);
    setMessage("");
    if (client?.name) {
      setClientName(client.name);
      setWhatsapp(client.whatsapp || "");
    }
  }

  function startNewOrder() {
    setCreatedOrder(null);
    setClientName("");
    setWhatsapp("");
    setCart([]);
    setMessage("");
  }

  function addBazarItem(price: Price) {
    setCreatedOrder(null);
    const key = `bazar-${price.id}-${categoryPath || "sem-categoria"}`;
    setCart((current) => {
      const found = current.find((item) => item.key === key);
      if (found) return current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item));
      return [...current, { key, kind: "bazar", name: `Item Bazar ${brl(Number(price.amount))}`, quantity: 1, unitPrice: Number(price.amount), categoryPath: categoryPath || null, sourceId: price.id }];
    });
  }

  function addMenuItem(menu: MenuItem) {
    setCreatedOrder(null);
    const key = `menu-${menu.id}`;
    setCart((current) => {
      const found = current.find((item) => item.key === key);
      if (found) return current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item));
      return [...current, { key, kind: "menu", name: menu.name, quantity: 1, unitPrice: Number(menu.price), categoryPath: menu.category, sourceId: menu.id }];
    });
  }

  function updateQty(key: string, delta: number) {
    setCreatedOrder(null);
    setCart((current) => current.map((item) => (item.key === key ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)).filter((item) => item.quantity > 0));
  }

  function switchMode(nextMode: OrderMode) {
    setMode(nextMode);
    setMessage("");
    setCreatedOrder(null);
    setCart((current) => current.filter((item) => item.kind === nextMode));
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
      const order = data.order as CreatedOrder;
      setCreatedOrder(order);
      setMessage(data.reused ? `Pedido já registrado e reaproveitado: ${order.code}` : `Pedido criado: ${order.code}`);
      setCart([]);
      setCartReviewOpen(false);
      setClientName("");
      setWhatsapp("");
      setCategoryPath("");
      setSearch("");
      if (order.client?.name) {
        setClients((current) => {
          const exists = current.some((client) => client.id === order.client?.id);
          const next = exists ? current.map((client) => (client.id === order.client?.id ? { ...client, ...order.client } as Client : client)) : [...current, order.client as Client];
          return next.sort((a, b) => a.name.localeCompare(b.name));
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao criar pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f9f7ef] px-4 py-6 pb-36 text-[#214527] lg:pb-6">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_390px]">
        <section className="space-y-5">
          <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Registro rápido</p>
            <h1 className="mt-2 text-3xl font-black">Pedidos do Bazar e do Cardápio</h1>
            <p className="mt-3 text-sm leading-6 text-[#496451]">Escolha primeiro o tipo do pedido: itens do bazar ou alimentos e bebidas.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#f9f7ef] p-2">
              <button onClick={() => switchMode("bazar")} className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.12em] ${mode === "bazar" ? "bg-[#2f7d45] text-white shadow" : "bg-white text-[#2f7d45]"}`}>
                Bazar
              </button>
              <button onClick={() => switchMode("menu")} className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.12em] ${mode === "menu" ? "bg-[#2f7d45] text-white shadow" : "bg-white text-[#2f7d45]"}`}>
                Cardápio
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="sm:col-span-2">
                <span className="text-sm font-bold">Cliente obrigatório e único</span>
                <input value={clientName} onChange={(e) => { setClientName(e.target.value); setCreatedOrder(null); }} placeholder="Ex.: Márcio Alex" className="mt-1 w-full rounded-2xl border border-[#dfe8df] px-4 py-3 outline-none focus:border-[#2f7d45]" />
              </label>
              <label>
                <span className="text-sm font-bold">WhatsApp</span>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="opcional" className="mt-1 w-full rounded-2xl border border-[#dfe8df] px-4 py-3 outline-none focus:border-[#2f7d45]" />
              </label>
            </div>
          </div>

          {createdOrder && (
            <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <button onClick={startNewOrder} className="rounded-full border border-[#dfe8df] bg-white px-5 py-3 text-sm font-black text-[#214527] shadow-sm">Novo pedido</button>
                <button onClick={() => startAnotherOrder(createdOrder.client)} className="rounded-full bg-[#0f6b35] px-5 py-3 text-sm font-black text-white shadow-sm">Fazer outro pedido para este cliente</button>
              </div>
              <div className="mt-5 rounded-3xl bg-[#fffdf7] p-5 ring-1 ring-[#dfe8df]">
                <span className="inline-flex rounded-full bg-[#e8fff0] px-4 py-2 text-sm font-black text-[#0f6b35]">Pedido criado</span>
                <h2 className="mt-5 text-4xl font-black">Pedido {createdOrder.code}</h2>
                <p className="mt-3 text-lg text-[#496451]">Cliente: <strong>{createdOrder.client?.name || clientName}</strong></p>
                <p className="mt-1 text-sm text-[#7a8278]">{formatDateTime(createdOrder.created_at)}</p>
              </div>
              <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-[#dfe8df]">
                <h3 className="text-2xl font-black">Itens</h3>
                <div className="mt-4 space-y-3">
                  {(createdOrder.items || []).map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl bg-[#fffdf7] p-4">
                      <div>
                        <strong>{item.name}</strong>
                        <p className="text-sm text-[#496451]">{item.quantity} × {brl(Number(item.unit_price || 0))}</p>
                        {item.category_path && <p className="text-xs font-bold text-[#83a847]">Categoria: {item.category_path}</p>}
                      </div>
                      <strong>{brl(Number(item.total_price || 0))}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-[#dfe8df]">
                <span className="text-sm text-[#496451]">Total</span>
                <strong className="block text-5xl text-[#0f3f23]">{brl(Number(createdOrder.total_amount || 0))}</strong>
              </div>
            </div>
          )}

          {mode === "bazar" ? (
            <div ref={catalogRef} className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black">Catálogo do Bazar</h2>
              <p className="mt-2 text-sm leading-6 text-[#496451]">Caso orientado pela coordenação, selecione a categoria do item e ao clicar no valor, é adicionado ao resumo. Ao finalizar os itens a serem incluidos no pedido, clicar em Criar pedido.</p>
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
          ) : (
            <div className="rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-2xl font-black">Cardápio</h2>
              <div className="mt-4 rounded-3xl border border-[#dfe8df] bg-white p-3 shadow-sm">
                <label className="block">
                  <span className="sr-only">Buscar item do cardápio</span>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cachorro-quente, batata, cerveja..." className="w-full rounded-2xl border border-[#dfe8df] px-4 py-3 outline-none focus:border-[#2f7d45]" />
                </label>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {menuCategoryOrder.map((category) => (
                    <button key={category} onClick={() => setMenuCategory(category)} className={`shrink-0 rounded-full px-5 py-3 text-sm font-black ${menuCategory === category ? "bg-[#006b35] text-white" : "bg-[#fffdf0] text-[#214527]"}`}>
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-6">
                {groupedMenuItems.length === 0 && <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm text-[#496451]">Nenhum item encontrado.</p>}
                {groupedMenuItems.map((group) => (
                  <section key={group.category}>
                    <h3 className="mb-3 text-2xl font-black">{group.category}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {group.items.map((item) => {
                        const cartItem = cart.find((entry) => entry.key === `menu-${item.id}`);
                        return (
                          <article key={item.id} className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
                            <h4 className="text-xl font-black">{item.name}</h4>
                            <p className="mt-2 text-sm text-[#7a8278]">{item.description || `${item.name}.`}</p>
                            <strong className="mt-4 block text-xl text-[#006b35]">{brl(Number(item.price))} / {item.unit_label}</strong>
                            <div className="mt-5 flex items-center justify-between gap-3">
                              <button onClick={() => updateQty(`menu-${item.id}`, -1)} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f4f1] text-2xl font-black text-[#006b35]">−</button>
                              <span className="text-3xl font-black">{cartItem?.quantity || 0}</span>
                              <button onClick={() => addMenuItem(item)} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#006b35] text-2xl font-black text-white">+</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Lista de clientes</h2>
            <p className="mt-2 text-sm leading-6 text-[#496451]">Busque um cliente já cadastrado e toque em “Fazer pedido” para preencher o nome automaticamente.</p>
            <input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Buscar cliente" className="mt-4 w-full rounded-2xl border border-[#dfe8df] px-4 py-3 outline-none focus:border-[#2f7d45]" />
            <div className="mt-4 rounded-3xl bg-[#eafff1] p-4">
              <div className="mb-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#0f6b35]">A-Z</div>
              <div className="space-y-3">
                {filteredClients.length === 0 && <p className="text-sm text-[#496451]">Nenhum cliente encontrado ainda.</p>}
                {filteredClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <div className="min-w-0">
                      <strong className="block truncate">{client.name}</strong>
                      {client.whatsapp && <span className="text-xs text-[#7a8278]">{client.whatsapp}</span>}
                    </div>
                    <button onClick={() => selectClient(client)} className="shrink-0 rounded-full bg-[#0f6b35] px-4 py-2 text-sm font-black text-white">Fazer pedido</button>
                  </div>
                ))}
              </div>
            </div>
          </div>


        </section>

        <aside className="fixed inset-x-4 bottom-4 z-40 h-fit rounded-3xl border border-[#dfe8df] bg-white/95 p-5 shadow-2xl backdrop-blur lg:sticky lg:inset-auto lg:top-48 lg:shadow-sm">
          <h2 className="text-sm font-bold text-[#7a8278] lg:text-2xl lg:font-black lg:text-[#214527]">Resumo</h2>
          <div className="mt-2 space-y-2 lg:mt-4 lg:space-y-3">
            {cart.length === 0 && <p className="hidden rounded-2xl bg-[#f9f7ef] p-4 text-sm text-[#496451] lg:block">Nenhum item selecionado.</p>}
            {cart.map((item) => (
              <div key={item.key} className="hidden rounded-2xl border border-[#dfe8df] p-3 lg:block">
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
          <div className="mt-2 flex items-end justify-between gap-4 lg:mt-5 lg:block lg:rounded-2xl lg:bg-[#f4e7b3] lg:p-4">
            <button type="button" onClick={() => setCartReviewOpen(true)} disabled={cart.length === 0} className="text-left disabled:cursor-not-allowed disabled:opacity-60">
              <span className="text-lg font-black lg:text-sm lg:font-bold">{cart.length} item(ns)</span>
              <strong className="block text-2xl lg:text-3xl">{brl(total)}</strong>
              {cart.length > 0 && <span className="mt-1 block text-xs font-bold text-[#2f7d45]">Toque para revisar/editar</span>}
            </button>
            <button disabled={saving || cart.length === 0} onClick={createOrder} className="min-w-36 rounded-2xl bg-[#2f7d45] px-5 py-4 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:bg-[#83a847]">
              {saving ? "Registrando..." : "Criar pedido"}
            </button>
          </div>
          {message && <p className="mt-3 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold text-[#214527]">{message}</p>}
        </aside>
      </div>

      {cartReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Revisar itens do pedido">
          <div className="max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 text-[#214527] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Conferência</p>
                <h2 className="mt-1 text-2xl font-black">Resumo dos itens</h2>
                <p className="mt-2 text-sm text-[#496451]">Revise, ajuste a quantidade ou remova itens antes de criar o pedido.</p>
              </div>
              <button onClick={() => setCartReviewOpen(false)} className="rounded-full bg-[#f9f7ef] px-4 py-2 font-black">Fechar</button>
            </div>

            <div className="mt-5 space-y-3">
              {cart.length === 0 ? (
                <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm text-[#496451]">Nenhum item selecionado.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-[#dfe8df] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong>{item.name}</strong>
                        <p className="text-sm text-[#496451]">{item.categoryPath || "Sem categoria"} · {brl(item.unitPrice)}</p>
                      </div>
                      <strong>{brl(item.quantity * item.unitPrice)}</strong>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.key, -1)} className="h-10 w-10 rounded-full bg-[#f9f7ef] text-xl font-black">−</button>
                        <span className="min-w-10 text-center text-xl font-black">{item.quantity}</span>
                        <button onClick={() => updateQty(item.key, 1)} className="h-10 w-10 rounded-full bg-[#2f7d45] text-xl font-black text-white">+</button>
                      </div>
                      <button onClick={() => updateQty(item.key, -item.quantity)} className="rounded-full bg-[#fff0f0] px-4 py-2 text-sm font-black text-[#7d1b1b]">Remover</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 rounded-2xl bg-[#f4e7b3] p-4">
              <span className="text-sm font-bold">Total revisado</span>
              <strong className="block text-3xl">{brl(total)}</strong>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setCartReviewOpen(false)} className="rounded-2xl border border-[#dfe8df] px-5 py-4 font-black">Continuar escolhendo</button>
              <button disabled={saving || cart.length === 0} onClick={createOrder} className="rounded-2xl bg-[#2f7d45] px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:bg-[#83a847]">
                {saving ? "Registrando..." : "Criar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
