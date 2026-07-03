"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AE_SITE_URL } from "@/lib/ae-public-links";

type Price = { id: string; amount: number; label?: string | null; is_active: boolean };
type Category = { id: string; path: string; is_active: boolean; is_visible: boolean };
type MenuItem = { id: string; category: string; name: string; description?: string | null; unit_label: string; price: number; is_active: boolean };
type Client = { id: string; name: string; whatsapp?: string | null; public_token?: string | null; created_at?: string | null };
type CartItem = { key: string; kind: "bazar" | "menu"; name: string; quantity: number; unitPrice: number; categoryPath?: string | null; sourceId?: string | null };
type CreatedOrder = {
  id: string;
  code: string;
  public_token?: string | null;
  total_amount: number | string;
  created_at?: string | null;
  notes?: string | null;
  client?: Client | null;
  items?: Array<{
    id: string;
    kind?: "bazar" | "menu" | string | null;
    source_id?: string | null;
    name: string;
    quantity: number;
    unit_price?: number | string | null;
    total_price: number | string;
    category_path?: string | null;
  }>;
};
type OrderMode = "bazar" | "menu";
type EditableItem = {
  id: string;
  kind: "bazar" | "menu";
  sourceId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
  categoryPath: string;
};

type Bootstrap = {
  prices?: Price[];
  categories?: Category[];
  menuItems?: MenuItem[];
  clients?: Client[];
};

const menuCategoryOrder = ["Todos", "Tortas", "Salgados", "Bauru de Forno", "Doces", "Bebidas"];

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function priceLabel(price: Price) {
  const amount = Number(price.amount || 0);
  return price.label ? `${price.label} · ${brl(amount)}` : brl(amount);
}

function bazarItemName(amount: number) {
  return `Item Bazar ${brl(amount)}`;
}

function moneyInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unitValue(item: NonNullable<CreatedOrder["items"]>[number]) {
  const unit = Number(item.unit_price || 0);
  if (unit > 0) return unit;
  const quantity = Number(item.quantity || 0);
  return quantity > 0 ? Number(item.total_price || 0) / quantity : 0;
}

function getSessionHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("bazar_sementinha_session");
  return token ? { "x-bazar-session": token } : {};
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
  const [lastAttemptId, setLastAttemptId] = useState("");
  const [editingOrder, setEditingOrder] = useState<CreatedOrder | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const editableItemCounterRef = useRef(0);
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
  const createdOrderClientPublicToken = createdOrder?.client?.public_token || "";
  const createdOrderClientPublicUrl = createdOrderClientPublicToken ? `${AE_SITE_URL}/bazar-sementinha/cliente/${createdOrderClientPublicToken}` : "";

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

  const pricesById = useMemo(() => new Map(prices.map((price) => [price.id, price])), [prices]);
  const menuItemsById = useMemo(() => new Map(menuItems.map((item) => [item.id, item])), [menuItems]);
  const activeMenuCategories = useMemo(() => [...new Set(menuItems.map((item) => item.category))].sort((a, b) => a.localeCompare(b)), [menuItems]);

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
  }

  function nextEditableItemId() {
    editableItemCounterRef.current += 1;
    return `novo-${editableItemCounterRef.current}`;
  }

  function makeEditableItem(item: NonNullable<CreatedOrder["items"]>[number]): EditableItem {
    return {
      id: item.id || nextEditableItemId(),
      kind: item.kind === "menu" ? "menu" : "bazar",
      sourceId: item.source_id || null,
      name: item.name || "",
      quantity: String(item.quantity || 1),
      unitPrice: moneyInput(unitValue(item)),
      categoryPath: item.category_path || "",
    };
  }

  function makeDefaultEditableItem(kind: "bazar" | "menu" = "bazar"): EditableItem {
    const fallbackId = nextEditableItemId();

    if (kind === "menu" && menuItems[0]) {
      const menu = menuItems[0];
      return {
        id: fallbackId,
        kind: "menu",
        sourceId: menu.id,
        name: menu.name,
        quantity: "1",
        unitPrice: moneyInput(Number(menu.price || 0)),
        categoryPath: menu.category,
      };
    }

    const price = prices[0];
    const category = categories[0];
    const amount = Number(price?.amount || 0);
    return {
      id: fallbackId,
      kind: "bazar",
      sourceId: price?.id || null,
      name: price ? bazarItemName(amount) : "",
      quantity: "1",
      unitPrice: moneyInput(amount),
      categoryPath: category?.path || "",
    };
  }

  function startEditOrder(order: CreatedOrder) {
    setEditingOrder(order);
    setEditClientName(order.client?.name || "");
    setEditWhatsapp(order.client?.whatsapp || "");
    setEditNotes(order.notes || "");
    setEditItems((order.items || []).map((item) => makeEditableItem(item)));
  }

  function updateEditItem(id: string, patch: Partial<EditableItem>) {
    setEditItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addEditItem() {
    setEditItems((current) => [...current, makeDefaultEditableItem(menuItems.length > 0 && prices.length === 0 ? "menu" : "bazar")]);
  }

  function changeEditItemKind(id: string, kind: "bazar" | "menu") {
    const defaults = makeDefaultEditableItem(kind);
    setEditItems((current) => current.map((item) => (item.id === id ? { ...defaults, id } : item)));
  }

  function changeEditItemPrice(id: string, priceId: string) {
    const price = pricesById.get(priceId);
    if (!price) return;
    const amount = Number(price.amount || 0);
    updateEditItem(id, { sourceId: price.id, name: bazarItemName(amount), unitPrice: moneyInput(amount) });
  }

  function changeEditMenuItem(id: string, menuId: string) {
    const menu = menuItemsById.get(menuId);
    if (!menu) return;
    updateEditItem(id, { sourceId: menu.id, name: menu.name, unitPrice: moneyInput(Number(menu.price || 0)), categoryPath: menu.category });
  }

  function changeEditItemQuantity(id: string, delta: number) {
    setEditItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const quantity = Math.max(1, Number(item.quantity || 1) + delta);
        return { ...item, quantity: String(quantity) };
      }),
    );
  }

  function removeEditItem(id: string) {
    setEditItems((current) => current.filter((item) => item.id !== id));
  }

  const editTotal = useMemo(
    () => editItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)) * Math.max(0, parseMoneyInput(item.unitPrice)), 0),
    [editItems],
  );

  async function saveEdit() {
    if (!editingOrder || saving) return;
    setSaving(true);
    setMessage("");

    const payloadItems = editItems
      .map((item) => ({
        kind: item.kind,
        name: item.name.trim(),
        quantity: Number(item.quantity || 0),
        unitPrice: parseMoneyInput(item.unitPrice),
        categoryPath: item.categoryPath.trim() || null,
        sourceId: item.sourceId,
      }))
      .filter((item) => item.name && item.quantity > 0 && item.unitPrice >= 0);

    if (!editClientName.trim()) {
      setMessage("Informe o nome do cliente.");
      setSaving(false);
      return;
    }

    if (payloadItems.length === 0) {
      setMessage("Mantenha pelo menos um item válido no pedido.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/bazar-sementinha/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getSessionHeaders() },
        body: JSON.stringify({ id: editingOrder.id, attemptId: lastAttemptId, clientName: editClientName, whatsapp: editWhatsapp, notes: editNotes, items: payloadItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao editar pedido.");
      const order = data.order as CreatedOrder;
      setCreatedOrder(order);
      setEditingOrder(null);
      setMessage("Pedido atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao editar pedido.");
    } finally {
      setSaving(false);
    }
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
    setLastAttemptId(attemptId);
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
      setLastAttemptId(attemptId);
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
    <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] px-3 py-4 pb-36 text-[15px] text-[#214527] sm:px-4 sm:py-6 sm:text-base lg:pb-6">
      <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 space-y-4 sm:space-y-5">
          <div className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.18em]">Registro rápido</p>
            <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Pedidos do Bazar e do Cardápio</h1>
            <p className="mt-3 text-sm leading-6 text-[#496451]">Escolha primeiro o tipo do pedido: itens do bazar ou alimentos e bebidas.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#f9f7ef] p-2 sm:mt-5">
              <button onClick={() => switchMode("bazar")} className={`rounded-2xl px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.12em] ${mode === "bazar" ? "bg-[#2f7d45] text-white shadow" : "bg-white text-[#2f7d45]"}`}>
                Bazar
              </button>
              <button onClick={() => switchMode("menu")} className={`rounded-2xl px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.12em] ${mode === "menu" ? "bg-[#2f7d45] text-white shadow" : "bg-white text-[#2f7d45]"}`}>
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
                <h2 className="mt-5 text-2xl font-black leading-tight sm:text-4xl">Pedido {createdOrder.code}</h2>
                <p className="mt-3 text-base text-[#496451] sm:text-lg">Cliente: <strong>{createdOrder.client?.name || clientName}</strong></p>
                <p className="mt-1 text-sm text-[#7a8278]">{formatDateTime(createdOrder.created_at)}</p>
                <button onClick={() => startEditOrder(createdOrder)} className="mt-5 rounded-full bg-[#f4e7b3] px-5 py-3 text-sm font-black text-[#214527] shadow-sm">Editar pedido</button>
                {createdOrderClientPublicToken ? (
                  <div className="mt-5 grid gap-4 rounded-3xl bg-white p-4 ring-1 ring-[#dfe8df] sm:grid-cols-[180px_1fr] sm:items-center">
                    {createdOrderClientPublicUrl && (
                      <Image
                        src={`/api/bazar-sementinha/qrcode?text=${encodeURIComponent(createdOrderClientPublicUrl)}`}
                        alt={`QRCode para acompanhar os pedidos de ${createdOrder.client?.name || "cliente"}`}
                        width={180}
                        height={180}
                        unoptimized
                        className="rounded-2xl bg-white p-2 ring-1 ring-[#dfe8df]"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-black sm:text-xl">QRCode do cliente para acompanhar pelo celular</h3>
                      <p className="mt-2 text-sm leading-6 text-[#496451]">O cliente pode apontar a câmera para este QRCode e conferir todos os pedidos em seu nome, com itens, totais e status de pagamento.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/bazar-sementinha/cliente/${createdOrderClientPublicToken}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#2f7d45] px-4 py-2 text-sm font-black text-white shadow-sm">
                          Abrir acompanhamento do cliente
                        </Link>
                        {createdOrderClientPublicUrl && (
                          <button type="button" onClick={() => { void navigator.clipboard?.writeText(createdOrderClientPublicUrl); setMessage("Link de acompanhamento do cliente copiado."); }} className="rounded-full border border-[#dfe8df] bg-white px-4 py-2 text-sm font-black text-[#214527] shadow-sm">
                            Copiar link
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl bg-[#fff8dd] p-4 text-sm font-bold text-[#7a5a00]">Rode o SQL novo para liberar o token público do cliente e o QRCode de acompanhamento consolidado.</p>
                )}
              </div>
              <div className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-[#dfe8df]">
                <h3 className="text-xl font-black sm:text-2xl">Itens</h3>
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
                <strong className="block text-3xl text-[#0f3f23] sm:text-5xl">{brl(Number(createdOrder.total_amount || 0))}</strong>
              </div>
            </div>
          )}

          {mode === "bazar" ? (
            <div ref={catalogRef} className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-xl font-black sm:text-2xl">Catálogo do Bazar</h2>
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
            <div className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-3 shadow-sm sm:p-5">
              <h2 className="text-xl font-black sm:text-2xl">Cardápio</h2>
              <div className="mt-3 max-w-full overflow-hidden rounded-3xl border border-[#dfe8df] bg-white p-2.5 shadow-sm sm:mt-4 sm:p-3">
                <label className="block">
                  <span className="sr-only">Buscar item do cardápio</span>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar refrigerante, bolo salgado, bolo doce" className="w-full min-w-0 rounded-2xl border border-[#dfe8df] px-3 py-3 text-sm outline-none focus:border-[#2f7d45] sm:px-4 sm:text-base" />
                </label>
                <div className="mt-3 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]">
                  {menuCategoryOrder.map((category) => (
                    <button key={category} onClick={() => setMenuCategory(category)} className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] font-black sm:px-5 sm:py-3 sm:text-sm ${menuCategory === category ? "bg-[#006b35] text-white" : "bg-[#fffdf0] text-[#214527]"}`}>
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 min-w-0 space-y-5 sm:space-y-6">
                {groupedMenuItems.length === 0 && <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm text-[#496451]">Nenhum item encontrado.</p>}
                {groupedMenuItems.map((group) => (
                  <section key={group.category}>
                    <h3 className="mb-3 text-xl font-black sm:text-2xl">{group.category}</h3>
                    <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
                      {group.items.map((item) => {
                        const cartItem = cart.find((entry) => entry.key === `menu-${item.id}`);
                        return (
                          <article key={item.id} className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
                            <h4 className="text-lg font-black leading-tight sm:text-xl">{item.name}</h4>
                            <p className="mt-2 text-sm text-[#7a8278]">{item.description || `${item.name}.`}</p>
                            <strong className="mt-4 block text-lg text-[#006b35] sm:text-xl">{brl(Number(item.price))} / {item.unit_label}</strong>
                            <div className="mt-5 flex items-center justify-between gap-3">
                              <button onClick={() => updateQty(`menu-${item.id}`, -1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f4f1] text-xl font-black text-[#006b35] sm:h-14 sm:w-14 sm:text-2xl">−</button>
                              <span className="text-2xl font-black sm:text-3xl">{cartItem?.quantity || 0}</span>
                              <button onClick={() => addMenuItem(item)} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#006b35] text-xl font-black text-white sm:h-14 sm:w-14 sm:text-2xl">+</button>
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
          <div className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-xl font-black sm:text-2xl">Lista de clientes</h2>
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

        <aside className="fixed inset-x-3 bottom-3 z-40 h-fit rounded-3xl border border-[#dfe8df] bg-white/95 p-4 shadow-2xl backdrop-blur sm:inset-x-4 sm:bottom-4 sm:p-5 lg:sticky lg:inset-auto lg:top-48 lg:shadow-sm">
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
            <button disabled={saving || cart.length === 0} onClick={createOrder} className="min-w-32 rounded-2xl bg-[#2f7d45] px-4 py-3.5 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:bg-[#83a847] sm:min-w-36 sm:px-5 sm:py-4 sm:text-base">
              {saving ? "Registrando..." : "Criar pedido"}
            </button>
          </div>
          {message && <p className="mt-3 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold text-[#214527]">{message}</p>}
        </aside>
      </div>

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Editar pedido">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 text-[#214527] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Pedido #{editingOrder.code}</p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">Editar pedido</h2>
                <p className="mt-2 text-sm text-[#496451]">Use os cadastros ativos para ajustar item, categoria, valor e quantidade.</p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="rounded-full bg-[#f9f7ef] px-4 py-2 font-black">Fechar</button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block text-sm font-black">
                Cliente
                <input value={editClientName} onChange={(event) => setEditClientName(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#dfe8df] px-4 py-3 font-normal outline-none focus:border-[#2f7d45]" />
              </label>
              <label className="block text-sm font-black">
                WhatsApp
                <input value={editWhatsapp} onChange={(event) => setEditWhatsapp(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#dfe8df] px-4 py-3 font-normal outline-none focus:border-[#2f7d45]" />
              </label>
              <label className="block text-sm font-black">
                Observações
                <textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-[#dfe8df] px-4 py-3 font-normal outline-none focus:border-[#2f7d45]" />
              </label>

              <section className="rounded-2xl border border-[#dfe8df] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">Itens do pedido</h3>
                    <p className="text-xs text-[#496451]">Selecione item, categoria e valor nos cadastros ativos. Ajuste a quantidade com + e -.</p>
                  </div>
                  <button type="button" onClick={addEditItem} className="rounded-full bg-[#f4e7b3] px-3 py-2 text-xs font-black">Adicionar item</button>
                </div>
                <div className="mt-3 space-y-3">
                  {editItems.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-xs font-black">
                          Tipo
                          <select value={item.kind} onChange={(event) => changeEditItemKind(item.id, event.target.value === "menu" ? "menu" : "bazar")} className="mt-1 w-full rounded-xl border border-[#dfe8df] px-3 py-2 font-normal outline-none focus:border-[#2f7d45]">
                            <option value="bazar">Bazar</option>
                            <option value="menu">Cardápio</option>
                          </select>
                        </label>

                        {item.kind === "bazar" ? (
                          <>
                            <label className="text-xs font-black">
                              Valor cadastrado
                              <select value={item.sourceId || ""} onChange={(event) => changeEditItemPrice(item.id, event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe8df] px-3 py-2 font-normal outline-none focus:border-[#2f7d45]">
                                <option value="">Selecione o valor</option>
                                {prices.map((price) => (
                                  <option key={price.id} value={price.id}>{priceLabel(price)}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs font-black sm:col-span-2">
                              Categoria cadastrada
                              <select value={item.categoryPath} onChange={(event) => updateEditItem(item.id, { categoryPath: event.target.value })} className="mt-1 w-full rounded-xl border border-[#dfe8df] px-3 py-2 font-normal outline-none focus:border-[#2f7d45]">
                                <option value="">Sem categoria</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.path}>{category.path}</option>
                                ))}
                              </select>
                            </label>
                          </>
                        ) : (
                          <label className="text-xs font-black sm:col-span-2">
                            Item do cardápio
                            <select value={item.sourceId || ""} onChange={(event) => changeEditMenuItem(item.id, event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe8df] px-3 py-2 font-normal outline-none focus:border-[#2f7d45]">
                              <option value="">Selecione o item</option>
                              {activeMenuCategories.map((category) => (
                                <optgroup key={category} label={category}>
                                  {menuItems.filter((menu) => menu.category === category).map((menu) => (
                                    <option key={menu.id} value={menu.id}>{menu.name} · {brl(Number(menu.price || 0))}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </label>
                        )}

                        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_1fr]">
                          <div className="text-xs font-black">
                            Qtde
                            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-[#dfe8df] bg-white px-3 py-2">
                              <button type="button" onClick={() => changeEditItemQuantity(item.id, -1)} className="h-10 w-10 rounded-full bg-[#f9f7ef] text-lg font-black">−</button>
                              <strong className="text-base">{Math.max(1, Number(item.quantity || 1))}</strong>
                              <button type="button" onClick={() => changeEditItemQuantity(item.id, 1)} className="h-10 w-10 rounded-full bg-[#2f7d45] text-lg font-black text-white">+</button>
                            </div>
                          </div>
                          <div className="text-xs font-black">
                            Valor unit.
                            <div className="mt-1 rounded-xl border border-[#dfe8df] bg-[#f9f7ef] px-3 py-4 font-black">
                              {brl(parseMoneyInput(item.unitPrice))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-[#496451]">
                        <span>Subtotal: {brl(Math.max(0, Number(item.quantity || 0)) * Math.max(0, parseMoneyInput(item.unitPrice)))}</span>
                        <button type="button" onClick={() => removeEditItem(item.id)} className="rounded-full bg-[#fff0f0] px-3 py-2 font-black text-[#7d1b1b]">Remover</button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 rounded-2xl bg-[#f4e7b3] p-3 text-sm font-black">Total editado: {brl(editTotal)}</p>
              </section>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setEditingOrder(null)} className="rounded-2xl border border-[#dfe8df] px-5 py-4 font-black">Voltar</button>
              <button onClick={saveEdit} disabled={saving} className="rounded-2xl bg-[#2f7d45] px-5 py-4 font-black text-white disabled:bg-[#83a847]">
                {saving ? "Salvando..." : "Salvar edição"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cartReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Revisar itens do pedido">
          <div className="max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 text-[#214527] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Conferência</p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">Resumo dos itens</h2>
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
              <strong className="block text-2xl sm:text-3xl">{brl(total)}</strong>
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
