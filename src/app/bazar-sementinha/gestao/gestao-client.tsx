"use client";

import { useEffect, useState } from "react";

type Price = { id: string; amount: number; label?: string | null; is_active: boolean };
type Category = { id: string; path: string; is_active: boolean; is_visible: boolean; is_required: boolean };
type MenuItem = { id: string; category: string; name: string; unit_label: string; price: number; is_active: boolean };

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function GestaoClient() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [message, setMessage] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [menu, setMenu] = useState({ category: "Salgados", name: "", unit_label: "unidade", price: "" });

  async function load() {
    const res = await fetch("/api/bazar-sementinha/config", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao carregar.");
    setPrices(data.prices || []);
    setCategories(data.categories || []);
    setMenuItems(data.menuItems || []);
  }

  useEffect(() => {
    let ignore = false;
    fetch("/api/bazar-sementinha/config", { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ignore) return;
        if (!ok) throw new Error(data.error || "Erro ao carregar.");
        setPrices(data.prices || []);
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
      })
      .catch((error) => {
        if (!ignore) setMessage(error instanceof Error ? error.message : "Erro ao carregar.");
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function save(body: unknown) {
    const res = await fetch("/api/bazar-sementinha/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
    await load();
  }

  async function patch(body: unknown) {
    const res = await fetch("/api/bazar-sementinha/config", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao alterar.");
    await load();
  }

  async function remove(kind: string, id: string) {
    if (!confirm("Excluir definitivamente este cadastro?")) return;
    const res = await fetch(`/api/bazar-sementinha/config?kind=${kind}&id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao excluir.");
    await load();
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

  return (
    <main className="min-h-screen bg-[#f9f7ef] px-4 py-6 text-[#214527]">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Cadastros do evento</p>
          <h1 className="mt-2 text-3xl font-black">Bazar do Sementinha · 04/07/2026</h1>
          <p className="mt-2 text-sm text-[#496451]">Ative, inative, copie, edite ou exclua valores, categorias e cardápio. Para reduzir fricção, deixe visível apenas o que será usado no dia.</p>
          {message && <p className="mt-4 rounded-2xl bg-[#f9f7ef] p-3 text-sm font-bold">{message}</p>}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Valores do Bazar</h2>
            <div className="mt-4 flex gap-2">
              <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Ex.: 55" className="min-w-0 flex-1 rounded-2xl border border-[#dfe8df] px-4 py-3" />
              <button onClick={() => handle(async () => { await save({ kind: "price", amount: newPrice }); setNewPrice(""); }, "Valor incluído.")} className="rounded-2xl bg-[#2f7d45] px-4 font-black text-white">Incluir</button>
            </div>
            <div className="mt-4 space-y-2">
              {prices.map((price) => (
                <div key={price.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                  <strong>{brl(Number(price.amount))}</strong>
                  <div className="flex gap-1 text-xs font-black">
                    <button onClick={() => handle(() => patch({ kind: "price", id: price.id, is_active: !price.is_active }), "Status alterado.")} className="rounded-full bg-white px-2 py-1">{price.is_active ? "Inativar" : "Ativar"}</button>
                    <button onClick={() => handle(() => save({ kind: "price", amount: price.amount, label: `${price.label || ""} cópia` }), "Copiado.")} className="rounded-full bg-white px-2 py-1">Copiar</button>
                    <button onClick={() => handle(() => remove("price", price.id), "Excluído.")} className="rounded-full bg-white px-2 py-1">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Categorias</h2>
            <div className="mt-4 flex gap-2">
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Roupas > Adulto > Masculino" className="min-w-0 flex-1 rounded-2xl border border-[#dfe8df] px-4 py-3" />
              <button onClick={() => handle(async () => { const parts = newCategory.split(">").map((p) => p.trim()); await save({ kind: "category", path: newCategory, level_1: parts[0], level_2: parts[1], level_3: parts[2] }); setNewCategory(""); }, "Categoria incluída.")} className="rounded-2xl bg-[#2f7d45] px-4 font-black text-white">Incluir</button>
            </div>
            <div className="mt-4 space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                  <strong>{category.path}</strong>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs font-black">
                    <button onClick={() => handle(() => patch({ kind: "category", id: category.id, is_active: !category.is_active }), "Status alterado.")} className="rounded-full bg-white px-2 py-1">{category.is_active ? "Inativar" : "Ativar"}</button>
                    <button onClick={() => handle(() => patch({ kind: "category", id: category.id, is_visible: !category.is_visible }), "Visibilidade alterada.")} className="rounded-full bg-white px-2 py-1">{category.is_visible ? "Ocultar" : "Mostrar"}</button>
                    <button onClick={() => handle(() => save({ kind: "category", path: `${category.path} cópia` }), "Copiado.")} className="rounded-full bg-white px-2 py-1">Copiar</button>
                    <button onClick={() => handle(() => remove("category", category.id), "Excluído.")} className="rounded-full bg-white px-2 py-1">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black">Cardápio</h2>
            <div className="mt-4 grid gap-2">
              <input value={menu.category} onChange={(e) => setMenu({ ...menu, category: e.target.value })} placeholder="Categoria" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
              <input value={menu.name} onChange={(e) => setMenu({ ...menu, name: e.target.value })} placeholder="Item" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
              <input value={menu.unit_label} onChange={(e) => setMenu({ ...menu, unit_label: e.target.value })} placeholder="Unidade" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
              <input value={menu.price} onChange={(e) => setMenu({ ...menu, price: e.target.value })} placeholder="Valor" className="rounded-2xl border border-[#dfe8df] px-4 py-3" />
              <button onClick={() => handle(async () => { await save({ kind: "menu", ...menu }); setMenu({ category: "Salgados", name: "", unit_label: "unidade", price: "" }); }, "Item incluído.")} className="rounded-2xl bg-[#2f7d45] px-4 py-3 font-black text-white">Incluir</button>
            </div>
            <div className="mt-4 space-y-2">
              {menuItems.map((item) => (
                <div key={item.id} className="rounded-2xl bg-[#fffdf7] p-3 ring-1 ring-[#dfe8df]">
                  <strong>{item.name}</strong>
                  <p className="text-sm text-[#496451]">{item.category} · {brl(Number(item.price))}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs font-black">
                    <button onClick={() => handle(() => patch({ kind: "menu", id: item.id, is_active: !item.is_active }), "Status alterado.")} className="rounded-full bg-white px-2 py-1">{item.is_active ? "Inativar" : "Ativar"}</button>
                    <button onClick={() => handle(() => save({ kind: "menu", category: item.category, name: `${item.name} cópia`, unit_label: item.unit_label, price: item.price }), "Copiado.")} className="rounded-full bg-white px-2 py-1">Copiar</button>
                    <button onClick={() => handle(() => remove("menu", item.id), "Excluído.")} className="rounded-full bg-white px-2 py-1">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
