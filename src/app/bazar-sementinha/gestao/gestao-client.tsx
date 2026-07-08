"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Price = { id: string; amount: number; label?: string | null; is_active: boolean };
type Category = { id: string; path: string; is_active: boolean; is_visible: boolean; is_required: boolean };
type MenuItem = { id: string; category: string; name: string; unit_label: string; price: number; is_active: boolean; description?: string | null };
type Order = {
  id: string;
  code: string;
  status: string;
  payment_status: string;
  total_amount: number;
  notes?: string | null;
  created_at?: string;
  client?: { id: string; name: string; whatsapp?: string | null } | null;
  items?: Array<{ id: string; name: string; quantity: number; total_price: number }>;
};
type Expense = { id: string; category: string; description: string; amount: number; status: string; notes?: string | null; created_at?: string | null };
type Section = "valores" | "categorias" | "cardapio" | "pedidos" | "despesas";

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function shortDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function bazarAuthHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};

  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("bazar_sementinha_session");
    if (token) headers["x-bazar-session"] = token;
  }

  if (extra) {
    new Headers(extra).forEach((value, key) => {
      headers[key] = value;
    });
  }

  return headers;
}

export function GestaoClient() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [section, setSection] = useState<Section>("valores");
  const [message, setMessage] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [menu, setMenu] = useState({ category: "Salgados", name: "", unit_label: "unidade", price: "" });
  const [newExpense, setNewExpense] = useState({ category: "Geral", description: "", amount: "", status: "confirmada", notes: "" });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "excluido"), [orders]);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/bazar-sementinha/config", { cache: "no-store", credentials: "same-origin", headers: bazarAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao carregar cadastros.");
    setPrices(data.prices || []);
    setCategories(data.categories || []);
    setMenuItems(data.menuItems || []);
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/bazar-sementinha/orders", { cache: "no-store", credentials: "same-origin", headers: bazarAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao carregar pedidos.");
    setOrders(data.orders || []);
  }, []);

  const loadExpenses = useCallback(async () => {
    const res = await fetch("/api/bazar-sementinha/expenses", { cache: "no-store", credentials: "same-origin", headers: bazarAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao carregar despesas.");
    setExpenses(data.expenses || []);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadConfig(), loadOrders(), loadExpenses()]);
  }, [loadConfig, loadExpenses, loadOrders]);

  useEffect(() => {
    let ignore = false;
    const timer = window.setTimeout(() => {
      loadAll().catch((error) => {
        if (!ignore) {
          setMessage(error instanceof Error ? error.message : "Erro ao carregar.");
        }
      });
    }, 0);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [loadAll]);

  async function save(body: unknown) {
    const res = await fetch("/api/bazar-sementinha/config", { method: "POST", credentials: "same-origin", headers: bazarAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
    await loadConfig();
  }

  async function patch(body: unknown) {
    const res = await fetch("/api/bazar-sementinha/config", { method: "PATCH", credentials: "same-origin", headers: bazarAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao alterar.");
    await loadConfig();
  }

  async function remove(kind: string, id: string) {
    if (!confirm("Excluir definitivamente este cadastro?")) return;
    const res = await fetch(`/api/bazar-sementinha/config?kind=${kind}&id=${id}`, { method: "DELETE", credentials: "same-origin", headers: bazarAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao excluir.");
    await loadConfig();
  }

  async function updateOrder(body: unknown) {
    const res = await fetch("/api/bazar-sementinha/orders", { method: "PATCH", credentials: "same-origin", headers: bazarAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar pedido.");
    await loadOrders();
  }

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setNewExpense({ category: "Geral", description: "", amount: "", status: "confirmada", notes: "" });
  }

  function startEditExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setNewExpense({
      category: expense.category || "Geral",
      description: expense.description || "",
      amount: String(Number(expense.amount || 0)).replace(".", ","),
      status: expense.status || "confirmada",
      notes: expense.notes || "",
    });
  }

  async function saveExpense() {
    const method = editingExpenseId ? "PATCH" : "POST";
    const body = editingExpenseId ? { id: editingExpenseId, ...newExpense } : newExpense;
    const res = await fetch("/api/bazar-sementinha/expenses", {
      method,
      credentials: "same-origin",
      headers: bazarAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || (editingExpenseId ? "Erro ao editar despesa." : "Erro ao salvar despesa."));
    resetExpenseForm();
    await loadExpenses();
  }

  async function deleteOrder(id: string) {
    if (!confirm("Excluir este pedido da visualização da gestão? Esta ação não remove fisicamente do banco, mas marca como excluído.")) return;
    const res = await fetch(`/api/bazar-sementinha/orders?id=${id}`, { method: "DELETE", credentials: "same-origin", headers: bazarAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao excluir pedido.");
    await loadOrders();
  }

  async function editOrder(order: Order) {
    const clientName = prompt("Cliente do pedido:", order.client?.name || "");
    if (clientName === null) return;
    const notes = prompt("Observações do pedido:", order.notes || "");
    if (notes === null) return;
    await updateOrder({ id: order.id, clientName, notes });
  }

  async function handle<T>(fn: () => Promise<T>, ok: string) {
    setMessage("");
    try {
      await fn();
      setMessage(ok);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro.");
    }
  }

  const menuLinks: Array<{ id: Section; label: string }> = [
    { id: "valores", label: "Valores do Bazar" },
    { id: "categorias", label: "Categorias" },
    { id: "cardapio", label: "Cardápio" },
    { id: "pedidos", label: "Pedidos" },
    { id: "despesas", label: "Despesas" },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] text-[15px] text-[#214527] sm:text-base">
      <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-4 px-3 py-4 sm:gap-5 sm:px-4 sm:py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl bg-[#073f20] p-3 text-white shadow-sm lg:sticky lg:top-48">
          <div className="rounded-2xl bg-[#0f552d] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f4e7b3]">Sementinha</p>
            <h2 className="mt-1 text-lg font-black leading-tight">Bazar 04/07/2026</h2>
          </div>
          <nav className="mt-3 space-y-1" aria-label="Menu lateral da gestão">
            {menuLinks.map((link) => (
              <button key={link.id} onClick={() => setSection(link.id)} className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-black transition ${section === link.id ? "bg-[#f4e7b3] text-[#073f20]" : "text-white hover:bg-white/10"}`}>
                {link.label}
              </button>
            ))}
          </nav>
          <button onClick={() => handle(loadAll, "Dados atualizados.")} className="mt-4 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/20">
            Atualizar dados
          </button>
        </aside>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.18em]">Cadastros do evento</p>
            <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">Bazar do Sementinha · 04/07/2026</h1>
            <p className="mt-2 text-sm text-[#496451]">Ative, inative, copie, edite ou exclua valores, categorias e cardápio. Use o menu lateral para navegar.</p>
            {message && <p className="mt-4 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold">{message}</p>}
          </section>

          {section === "valores" && (
            <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-xl font-black sm:text-2xl">Valores do Bazar</h2>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Ex.: 55" className="min-w-0 flex-1 rounded-2xl border border-[#dfe8df] px-4 py-3" />
                <button onClick={() => handle(async () => { await save({ kind: "price", amount: newPrice }); setNewPrice(""); }, "Valor incluído.")} className="rounded-2xl bg-[#2f7d45] px-4 py-3 font-black text-white">Incluir</button>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {prices.map((price) => (
                  <div key={price.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                    <strong>{brl(Number(price.amount))}</strong>
                    <div className="flex flex-wrap gap-1 text-xs font-black">
                      <button onClick={() => handle(() => patch({ kind: "price", id: price.id, is_active: !price.is_active }), "Status alterado.")} className="rounded-full bg-white px-2 py-1">{price.is_active ? "Inativar" : "Ativar"}</button>
                      <button onClick={() => handle(async () => { const amount = prompt("Novo valor:", String(price.amount)); if (amount) await patch({ kind: "price", id: price.id, amount }); }, "Valor editado.")} className="rounded-full bg-white px-2 py-1">Editar</button>
                      <button onClick={() => handle(() => save({ kind: "price", amount: price.amount, label: `${price.label || ""} cópia` }), "Copiado.")} className="rounded-full bg-white px-2 py-1">Copiar</button>
                      <button onClick={() => handle(() => remove("price", price.id), "Excluído.")} className="rounded-full bg-white px-2 py-1">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === "categorias" && (
            <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-xl font-black sm:text-2xl">Categorias</h2>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Roupas > Adulto > Masculino" className="min-w-0 flex-1 rounded-2xl border border-[#dfe8df] px-4 py-3" />
                <button onClick={() => handle(async () => { const parts = newCategory.split(">").map((p) => p.trim()); await save({ kind: "category", path: newCategory, level_1: parts[0], level_2: parts[1], level_3: parts[2] }); setNewCategory(""); }, "Categoria incluída.")} className="rounded-2xl bg-[#2f7d45] px-4 py-3 font-black text-white">Incluir</button>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {categories.map((category) => (
                  <div key={category.id} className="rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                    <strong>{category.path}</strong>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs font-black">
                      <button onClick={() => handle(() => patch({ kind: "category", id: category.id, is_active: !category.is_active }), "Status alterado.")} className="rounded-full bg-white px-2 py-1">{category.is_active ? "Inativar" : "Ativar"}</button>
                      <button onClick={() => handle(() => patch({ kind: "category", id: category.id, is_visible: !category.is_visible }), "Visibilidade alterada.")} className="rounded-full bg-white px-2 py-1">{category.is_visible ? "Ocultar" : "Mostrar"}</button>
                      <button onClick={() => handle(async () => { const path = prompt("Categoria:", category.path); if (path) await patch({ kind: "category", id: category.id, path }); }, "Categoria editada.")} className="rounded-full bg-white px-2 py-1">Editar</button>
                      <button onClick={() => handle(() => save({ kind: "category", path: `${category.path} cópia` }), "Copiado.")} className="rounded-full bg-white px-2 py-1">Copiar</button>
                      <button onClick={() => handle(() => remove("category", category.id), "Excluído.")} className="rounded-full bg-white px-2 py-1">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === "cardapio" && (
            <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-xl font-black sm:text-2xl">Cardápio</h2>
              <div className="mt-4 grid min-w-0 gap-2 md:grid-cols-[1fr_1.4fr_1fr_1fr_auto]">
                <input value={menu.category} onChange={(e) => setMenu({ ...menu, category: e.target.value })} placeholder="Categoria" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
                <input value={menu.name} onChange={(e) => setMenu({ ...menu, name: e.target.value })} placeholder="Item" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
                <input value={menu.unit_label} onChange={(e) => setMenu({ ...menu, unit_label: e.target.value })} placeholder="Unidade" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
                <input value={menu.price} onChange={(e) => setMenu({ ...menu, price: e.target.value })} placeholder="Valor" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
                <button onClick={() => handle(async () => { await save({ kind: "menu", ...menu }); setMenu({ category: "Salgados", name: "", unit_label: "unidade", price: "" }); }, "Item incluído.")} className="rounded-2xl bg-[#2f7d45] px-4 py-3 font-black text-white">Incluir</button>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {menuItems.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                    <strong>{item.name}</strong>
                    <p className="text-sm text-[#496451]">{item.category} · {brl(Number(item.price))}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs font-black">
                      <button onClick={() => handle(() => patch({ kind: "menu", id: item.id, is_active: !item.is_active }), "Status alterado.")} className="rounded-full bg-white px-2 py-1">{item.is_active ? "Inativar" : "Ativar"}</button>
                      <button onClick={() => handle(async () => { const name = prompt("Nome do item:", item.name); if (!name) return; const price = prompt("Valor:", String(item.price)); if (!price) return; await patch({ kind: "menu", id: item.id, name, price }); }, "Item editado.")} className="rounded-full bg-white px-2 py-1">Editar</button>
                      <button onClick={() => handle(() => save({ kind: "menu", category: item.category, name: `${item.name} cópia`, unit_label: item.unit_label, price: item.price }), "Copiado.")} className="rounded-full bg-white px-2 py-1">Copiar</button>
                      <button onClick={() => handle(() => remove("menu", item.id), "Excluído.")} className="rounded-full bg-white px-2 py-1">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === "pedidos" && (
            <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">Pedidos</h2>
                  <p className="mt-1 text-sm text-[#496451]">Edite, cancele ou exclua pedidos do evento.</p>
                </div>
                <button onClick={() => handle(loadOrders, "Pedidos atualizados.")} className="rounded-full bg-[#f4e7b3] px-4 py-2 text-sm font-black">Atualizar</button>
              </div>
              <div className="mt-4 space-y-3">
                {activeOrders.length === 0 && <p className="rounded-2xl bg-[#f9f7ef] p-4 text-sm">Nenhum pedido encontrado.</p>}
                {activeOrders.map((order) => (
                  <article key={order.id} className="min-w-0 rounded-3xl border border-[#dfe8df] bg-[#fffdf7] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-lg font-black">#{order.code} · {order.client?.name || "Sem cliente"}</h3>
                        <p className="mt-1 text-sm text-[#496451]">{shortDate(order.created_at)} · {order.status} · pagamento {order.payment_status} · {brl(Number(order.total_amount))}</p>
                        <p className="mt-2 text-sm text-[#496451]">{(order.items || []).map((item) => `${item.quantity}x ${item.name}`).join(" · ")}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-black">
                        <button onClick={() => handle(() => editOrder(order), "Pedido editado.")} className="rounded-full bg-white px-3 py-2 text-[#214527]">Editar</button>
                        <button onClick={() => handle(() => updateOrder({ id: order.id, status: order.status === "cancelado" ? "aberto" : "cancelado" }), order.status === "cancelado" ? "Pedido reaberto." : "Pedido cancelado.")} className="rounded-full bg-[#f4e7b3] px-3 py-2 text-[#214527]">{order.status === "cancelado" ? "Reabrir" : "Cancelar"}</button>
                        <button onClick={() => handle(() => deleteOrder(order.id), "Pedido excluído.")} className="rounded-full bg-[#7f1d1d] px-3 py-2 text-white">Excluir</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}


          {section === "despesas" && (
            <section className="min-w-0 rounded-3xl border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">Despesas</h2>
                  <p className="mt-1 text-sm text-[#496451]">Inclua despesas somente pela área de Gestão. A página de prestação fica apenas para consulta e impressão.</p>
                </div>
                <button onClick={() => handle(loadExpenses, "Despesas atualizadas.")} className="rounded-full bg-[#f4e7b3] px-4 py-2 text-sm font-black">Atualizar</button>
              </div>

              <div className="mt-4 rounded-3xl bg-[#fffdf7] p-4 ring-1 ring-[#dfe8df]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-black">{editingExpenseId ? "Editar despesa" : "Incluir despesa"}</h3>
                    <p className="text-sm text-[#496451]">Altere categoria, descrição, valor, status e observações sem precisar acessar a prestação pública.</p>
                  </div>
                  {editingExpenseId && (
                    <button onClick={resetExpenseForm} className="w-fit rounded-full bg-white px-4 py-2 text-sm font-black text-[#214527] ring-1 ring-[#dfe8df]">
                      Cancelar edição
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.4fr_0.8fr_0.9fr]">
                  <input value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} placeholder="Categoria" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
                  <input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Descrição" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
                  <input value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="Valor" inputMode="decimal" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
                  <select value={newExpense.status} onChange={(e) => setNewExpense({ ...newExpense, status: e.target.value })} className="rounded-2xl border border-[#dfe8df] bg-white px-4 py-3">
                    <option value="confirmada">confirmada</option>
                    <option value="pendente">pendente</option>
                    <option value="cancelada">cancelada</option>
                  </select>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input value={newExpense.notes} onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })} placeholder="Observações opcionais" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
                  <button onClick={() => handle(saveExpense, editingExpenseId ? "Despesa editada." : "Despesa incluída.")} className="rounded-2xl bg-[#2f7d45] px-5 py-3 font-black text-white">
                    {editingExpenseId ? "Salvar alterações" : "Incluir despesa"}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 && <tr><td className="p-3 text-[#496451]" colSpan={6}>Nenhuma despesa registrada.</td></tr>}
                    {expenses.map((expenseItem) => (
                      <tr key={expenseItem.id} className="border-b">
                        <td className="p-3">{expenseItem.category}</td>
                        <td className="p-3">{expenseItem.description}</td>
                        <td className="p-3">{expenseItem.status}</td>
                        <td className="p-3 font-bold">{brl(Number(expenseItem.amount))}</td>
                        <td className="p-3 text-[#496451]">{shortDate(expenseItem.created_at || undefined)}</td>
                        <td className="p-3">
                          <button onClick={() => startEditExpense(expenseItem)} className="rounded-full bg-[#f4e7b3] px-3 py-2 text-xs font-black text-[#214527]">
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
