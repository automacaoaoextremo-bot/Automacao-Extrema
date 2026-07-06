"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type OrderItem = {
  id: string;
  kind?: "bazar" | "menu" | string | null;
  source_id?: string | null;
  name: string;
  quantity: number;
  unit_price?: number | string | null;
  total_price: number | string;
  category_path?: string | null;
};

type Order = {
  id: string;
  code: string;
  total_amount: number | string;
  payment_status: string;
  status: string;
  created_at?: string | null;
  notes?: string | null;
  client?: { id: string; name: string; whatsapp?: string | null } | null;
  items?: OrderItem[];
};

type PricePoint = { id: string; amount: number | string; label?: string | null; is_active: boolean };
type CategoryNode = { id: string; path: string; is_active: boolean; is_visible: boolean };
type MenuItemConfig = { id: string; category: string; name: string; description?: string | null; unit_label?: string | null; price: number | string; is_active: boolean };
type Bootstrap = {
  orders: Order[];
  pix?: { payload: string; dataUrl: string };
  prices?: PricePoint[];
  categories?: CategoryNode[];
  menuItems?: MenuItemConfig[];
};
type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro";

type ClientGroup = {
  clientKey: string;
  clientId: string | null;
  name: string;
  whatsapp?: string | null;
  orders: Order[];
  pendingOrders: Order[];
  paidOrders: Order[];
  total: number;
  pendingTotal: number;
  paidTotal: number;
};

type EditableItem = {
  id: string;
  kind: "bazar" | "menu";
  sourceId: string | null;
  name: string;
  quantity: string;
  unitPrice: string;
  categoryPath: string;
};

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function priceLabel(price: PricePoint) {
  const amount = Number(price.amount || 0);
  return price.label ? `${price.label} · ${brl(amount)}` : brl(amount);
}

function bazarItemName(amount: number) {
  return `Item Bazar ${brl(amount)}`;
}

function moneyInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function orderValue(order: Order) {
  return Number(order.total_amount || 0);
}

function unitValue(item: OrderItem) {
  const unit = Number(item.unit_price || 0);
  if (unit > 0) return unit;
  const quantity = Number(item.quantity || 0);
  return quantity > 0 ? Number(item.total_price || 0) / quantity : 0;
}

function itemValue(item: OrderItem) {
  return Number(item.total_price || 0);
}

function paymentLabel(status: string) {
  return status === "pago" ? "pago" : "pendente";
}

function getSessionHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("bazar_sementinha_session");
  return token ? { "x-bazar-session": token } : {};
}

function orderClientKey(order: Order) {
  return order.client?.id || `sem-cliente-${order.client?.name || "geral"}`;
}

function makeEditableItem(item: OrderItem): EditableItem {
  return {
    id: item.id,
    kind: item.kind === "menu" ? "menu" : "bazar",
    sourceId: item.source_id || null,
    name: item.name || "",
    quantity: String(item.quantity || 1),
    unitPrice: String(unitValue(item).toFixed(2)).replace(".", ","),
    categoryPath: item.category_path || "",
  };
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CaixaClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [pix, setPix] = useState<{ payload: string; dataUrl: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemConfig[]>([]);
  const editableItemCounterRef = useRef(0);

  function nextEditableItemId() {
    editableItemCounterRef.current += 1;
    return `novo-${editableItemCounterRef.current}`;
  }

  async function load() {
    const res = await fetch("/api/bazar-sementinha/bootstrap", { cache: "no-store" });
    const data = (await res.json()) as Bootstrap;
    if (!res.ok) throw new Error("Não foi possível carregar os pedidos.");
    setOrders(data.orders || []);
    setPix(data.pix || null);
    setPrices((data.prices || []).filter((item) => item.is_active));
    setCategories((data.categories || []).filter((item) => item.is_active && item.is_visible));
    setMenuItems((data.menuItems || []).filter((item) => item.is_active));
  }

  useEffect(() => {
    let ignore = false;
    fetch("/api/bazar-sementinha/bootstrap", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Bootstrap) => {
        if (ignore) return;
        setOrders(data.orders || []);
        setPix(data.pix || null);
        setPrices((data.prices || []).filter((item) => item.is_active));
        setCategories((data.categories || []).filter((item) => item.is_active && item.is_visible));
        setMenuItems((data.menuItems || []).filter((item) => item.is_active));
      })
      .catch(() => {
        if (!ignore) setMessage("Não foi possível carregar os pedidos.");
      });
    return () => {
      ignore = true;
    };
  }, []);

  const validOrders = useMemo(
    () => orders.filter((order) => order.status !== "cancelado" && order.status !== "excluido"),
    [orders],
  );

  const pendingOrders = useMemo(
    () => validOrders.filter((order) => order.payment_status !== "pago"),
    [validOrders],
  );

  const pricesById = useMemo(() => new Map(prices.map((price) => [price.id, price])), [prices]);
  const menuItemsById = useMemo(() => new Map(menuItems.map((item) => [item.id, item])), [menuItems]);

  const activeMenuCategories = useMemo(() => {
    return [...new Set(menuItems.map((item) => item.category))].sort((a, b) => a.localeCompare(b));
  }, [menuItems]);

  const grouped = useMemo<ClientGroup[]>(() => {
    const map = new Map<string, ClientGroup>();

    for (const order of validOrders) {
      const clientKey = orderClientKey(order);
      const previous = map.get(clientKey) || {
        clientKey,
        clientId: order.client?.id || null,
        name: order.client?.name || "Sem cliente",
        whatsapp: order.client?.whatsapp || null,
        orders: [],
        pendingOrders: [],
        paidOrders: [],
        total: 0,
        pendingTotal: 0,
        paidTotal: 0,
      };

      const value = orderValue(order);
      previous.orders.push(order);
      previous.total += value;

      if (order.payment_status === "pago") {
        previous.paidOrders.push(order);
        previous.paidTotal += value;
      } else {
        previous.pendingOrders.push(order);
        previous.pendingTotal += value;
      }

      map.set(clientKey, previous);
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [validOrders]);

  const selectedOrders = useMemo(() => pendingOrders.filter((order) => selected.includes(order.id)), [pendingOrders, selected]);
  const selectedTotal = useMemo(() => selectedOrders.reduce((sum, order) => sum + orderValue(order), 0), [selectedOrders]);
  const selectedClientKey = selectedOrders[0] ? orderClientKey(selectedOrders[0]) : "";
  const selectedClientName = selectedOrders[0]?.client?.name || "";

  async function refreshPix(total: number) {
    const res = await fetch(`/api/bazar-sementinha/payments?amount=${encodeURIComponent(String(Math.max(total, 1)))}&txid=BAZARSEM`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setPix(data);
  }

  function toggleExpanded(clientKey: string) {
    setExpandedGroups((current) => (current.includes(clientKey) ? current.filter((id) => id !== clientKey) : [...current, clientKey]));
  }

  function canSelectOrder(order: Order) {
    if (order.payment_status === "pago" || order.status === "cancelado" || order.status === "excluido") return false;
    if (!selectedClientKey) return true;
    return orderClientKey(order) === selectedClientKey || selected.includes(order.id);
  }

  function setSelection(next: string[]) {
    const total = pendingOrders.filter((order) => next.includes(order.id)).reduce((sum, order) => sum + orderValue(order), 0);
    setSelected(next);
    refreshPix(total).catch(() => null);
  }

  function toggle(order: Order) {
    if (order.payment_status === "pago") return;
    const nextOrderClientKey = orderClientKey(order);

    if (selected.includes(order.id)) {
      setSelection(selected.filter((id) => id !== order.id));
      return;
    }

    const currentOrders = pendingOrders.filter((item) => selected.includes(item.id));
    const currentClientKey = currentOrders[0] ? orderClientKey(currentOrders[0]) : "";

    if (currentClientKey && currentClientKey !== nextOrderClientKey) {
      setMessage("Para evitar erro no caixa, selecione pedidos de apenas um cliente por vez. A seleção foi trocada para este cliente.");
      setSelection([order.id]);
      return;
    }

    setMessage("");
    setSelection([...selected, order.id]);
  }

  function toggleGroupSelection(group: ClientGroup) {
    const ids = group.pendingOrders.map((order) => order.id);
    if (ids.length === 0) {
      setMessage("Este cliente não tem pedidos pendentes para pagamento.");
      return;
    }

    const allSelected = ids.every((id) => selected.includes(id));
    setMessage("");
    setSelection(allSelected ? [] : ids);
  }

  function goToPayment(group: ClientGroup) {
    if (group.pendingOrders.length === 0) {
      setMessage("Este cliente não tem pedidos pendentes para pagamento.");
      return;
    }

    const groupSelectedIds = selectedOrders.filter((order) => orderClientKey(order) === group.clientKey).map((order) => order.id);
    if (groupSelectedIds.length === 0) {
      setMessage("Selecione pelo menos um pedido pendente deste cliente antes de ir para pagamento.");
      return;
    }

    setMessage("");
    window.setTimeout(() => document.getElementById("pagamento-bazar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function pay() {
    if (saving) return;
    setMessage("");

    if (selected.length === 0) {
      setMessage("Selecione um ou mais pedidos de um único cliente.");
      return;
    }

    const clientKeys = new Set(selectedOrders.map((order) => orderClientKey(order)));
    if (clientKeys.size > 1) {
      setMessage("Selecione pedidos de apenas um cliente por vez.");
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
      setMessage(`Pagamento registrado para ${selectedClientName || "cliente"}: ${brl(selectedTotal)}.`);
      setSelected([]);
      setExpandedGroups([]);
      await load();
      setExpandedGroups([]);
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

  function startEdit(order: Order) {
    if (order.payment_status === "pago") return;
    setEditingOrder(order);
    setEditClientName(order.client?.name || "");
    setEditWhatsapp(order.client?.whatsapp || "");
    setEditNotes(order.notes || "");
    setEditItems((order.items || []).map((item) => makeEditableItem(item)));
  }

  function updateEditItem(id: string, patch: Partial<EditableItem>) {
    setEditItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
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
        body: JSON.stringify({ id: editingOrder.id, clientName: editClientName, whatsapp: editWhatsapp, notes: editNotes, items: payloadItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao editar pedido.");
      setEditingOrder(null);
      setMessage("Pedido atualizado.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao editar pedido.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(order: Order) {
    if (order.payment_status === "pago") return;
    const ok = window.confirm(`Cancelar o pedido #${order.code}?`);
    if (!ok) return;

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/bazar-sementinha/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getSessionHeaders() },
        body: JSON.stringify({ id: order.id, status: "cancelado" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cancelar pedido.");
      setSelected((current) => current.filter((id) => id !== order.id));
      setMessage(`Pedido #${order.code} cancelado.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao cancelar pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f9f7ef] px-4 py-6 text-[#214527]">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Fechamento</p>
            <h1 className="mt-2 text-3xl font-black">Caixa por cliente</h1>
            <p className="mt-2 text-sm leading-6 text-[#496451]">Selecione pedidos de um único cliente por vez para registrar o pagamento com segurança.</p>
          </div>

          <div className="mt-5 space-y-4">
            {grouped.length === 0 && <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm">Nenhum pedido encontrado.</p>}
            {grouped.map((group) => {
              const expanded = expandedGroups.includes(group.clientKey);
              const groupSelected = group.pendingOrders.length > 0 && group.pendingOrders.every((order) => selected.includes(order.id));
              const groupSelectedCount = selectedOrders.filter((order) => orderClientKey(order) === group.clientKey).length;

              return (
                <article key={group.clientKey} className={`rounded-3xl border p-4 ${selectedClientKey === group.clientKey ? "border-[#2f7d45] bg-[#fbfff9]" : "border-[#dfe8df] bg-white"}`}>
                  <button type="button" onClick={() => toggleExpanded(group.clientKey)} className="w-full min-w-0 text-left">
                    <h2 className="truncate text-xl font-black">{group.name}</h2>
                    {group.whatsapp && <p className="text-xs font-bold text-[#7a8278]">{group.whatsapp}</p>}
                    <p className="mt-1 text-sm leading-6 text-[#496451]">
                      {group.orders.length} pedido(s) · total {brl(group.total)} · pagos {group.paidOrders.length} / {brl(group.paidTotal)} · pendentes {group.pendingOrders.length} / {brl(group.pendingTotal)}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-[#f9f7ef] px-3 py-1 text-xs font-black text-[#2f7d45]">
                      {expanded ? "Recolher detalhes" : "Ver detalhes"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="mt-4 space-y-3">
                      {group.orders.map((order) => {
                        const isPaid = order.payment_status === "pago";
                        const selectable = canSelectOrder(order);
                        return (
                          <div key={order.id} className="rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                            <label className={`flex items-start gap-3 ${selectable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                              <input
                                type="checkbox"
                                checked={selected.includes(order.id)}
                                disabled={!selectable}
                                onChange={() => toggle(order)}
                                className="mt-1 h-5 w-5"
                              />
                              <span className="flex-1">
                                <strong>#{order.code} · {brl(orderValue(order))}</strong>
                                <span className="ml-2 rounded-full bg-[#f9f7ef] px-2 py-1 text-xs font-bold text-[#496451]">{paymentLabel(order.payment_status)}</span>
                                <span className="mt-2 block space-y-1 text-sm text-[#496451]">
                                  {(order.items || []).map((item) => (
                                    <span key={item.id} className="block">
                                      {item.quantity}x {item.name}{item.category_path ? ` · ${item.category_path}` : ""} · {brl(itemValue(item))}
                                    </span>
                                  ))}
                                </span>
                              </span>
                            </label>
                            {!isPaid && (
                              <div className="mt-3 flex flex-wrap gap-2 pl-8">
                                <button onClick={() => startEdit(order)} className="rounded-full bg-[#f9f7ef] px-4 py-2 text-xs font-black text-[#214527]">Editar</button>
                                <button onClick={() => cancelOrder(order)} className="rounded-full bg-[#fff0f0] px-4 py-2 text-xs font-black text-[#7d1b1b]">Cancelar</button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {group.pendingOrders.length > 0 && (
                        <div className="grid gap-2 border-t border-[#dfe8df] pt-3 sm:grid-cols-2">
                          <button
                            onClick={() => toggleGroupSelection(group)}
                            className="rounded-full bg-[#f4e7b3] px-4 py-3 text-sm font-black text-[#214527]"
                          >
                            {groupSelected ? "Deselecionar" : "Selecionar"}
                          </button>
                          <button
                            onClick={() => goToPayment(group)}
                            disabled={groupSelectedCount === 0}
                            className="rounded-full bg-[#2f7d45] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#83a847]"
                          >
                            Ir para pagamento
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside id="pagamento-bazar" className="h-fit rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm lg:sticky lg:top-48">
          <h2 className="text-2xl font-black">Pagamento</h2>
          <p className="mt-2 text-sm leading-6 text-[#496451]">O card aceita apenas pedidos de um único cliente por vez.</p>
          <div className="mt-4 rounded-2xl bg-[#f4e7b3] p-4">
            <span className="text-sm font-bold">Cliente selecionado</span>
            <strong className="block text-xl">{selectedClientName || "Nenhum cliente"}</strong>
            <span className="mt-3 block text-sm font-bold">Total selecionado</span>
            <strong className="block text-3xl">{brl(selectedTotal)}</strong>
          </div>

          <div className="mt-4 rounded-2xl border border-[#dfe8df] p-3">
            <strong className="text-sm">Pedidos no pagamento</strong>
            {selectedOrders.length === 0 ? (
              <p className="mt-2 text-sm text-[#496451]">Selecione um pedido pendente para registrar o pagamento.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {selectedOrders.map((order) => (
                  <div key={order.id} className="rounded-xl bg-[#f9f7ef] p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <strong>#{order.code}</strong>
                      <strong>{brl(orderValue(order))}</strong>
                    </div>
                    <p className="mt-1 text-xs text-[#496451]">
                      {(order.items || []).map((item) => `${item.quantity}x ${item.name}${item.category_path ? ` (${item.category_path})` : ""}`).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
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

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Editar pedido">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 text-[#214527] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Pedido #{editingOrder.code}</p>
                <h2 className="mt-1 text-2xl font-black">Editar pedido</h2>
                <p className="mt-2 text-sm text-[#496451]">Altere cliente, WhatsApp, observações, itens, categorias, quantidades ou valores antes de salvar.</p>
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
                          <>
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
                          </>
                        )}

                        <div className="sm:col-span-2 grid gap-2 sm:grid-cols-[1fr_1fr]">
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
    </main>
  );
}
