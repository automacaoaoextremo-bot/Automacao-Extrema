"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { getBncClient } from "@/lib/bingo-no-controle/client";

type Tab = "cardapio" | "combos" | "cartelas" | "prendas-gerais";
type Event = { id: string; title: string; status: string; organization_id: string };
type Round = { id: string; title: string; round_number: number; status: string };
type Menu = { id: string; category: string; title: string; price_cents: number; is_active: boolean; image_url: string | null };
type Combo = { id: string; title: string; kind: string; price_cents: number; card_quantity: number; food_credit_cents: number; credit_scope: string; status: string };
type Batch = { id: string; code: string; color_name: string; quantity: number; allowed_round_id: string | null; status: string };
type Prize = { id: string; title: string; description: string | null; image_url: string | null; is_confirmed: boolean };

type Props = {
  tab: Tab;
  event: Event | null;
  rounds: Round[];
  ownEvent: boolean;
  canManage: boolean;
  onReload: () => Promise<void>;
};
const field = "w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-[#17452f]";
const button = "rounded-xl bg-[#0c6543] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#084d34] disabled:opacity-50";
const box = "rounded-2xl border border-emerald-200 bg-emerald-50 p-4";
const brl = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function cents(text: string) {
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(text.trim())) throw new Error("Informe um valor em reais, por exemplo: 20,00.");
  return Math.round(Number(text.replace(",", ".")) * 100);
}

export function BncCatalogosV07C({ tab, event, rounds, ownEvent, canManage, onReload }: Props) {
  const [items, setItems] = useState<Menu[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [menuCategory, setMenuCategory] = useState("Alimentação");
  const [menuTitle, setMenuTitle] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuPhoto, setMenuPhoto] = useState<File | null>(null);
  const [comboTitle, setComboTitle] = useState("");
  const [comboKind, setComboKind] = useState("cards");
  const [comboPrice, setComboPrice] = useState("");
  const [comboCards, setComboCards] = useState("3");
  const [comboCredit, setComboCredit] = useState("0");
  const [comboScope, setComboScope] = useState("food");
  const [batchCode, setBatchCode] = useState("");
  const [batchColor, setBatchColor] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("100");
  const [batchRound, setBatchRound] = useState("");
  const [prizeTitle, setPrizeTitle] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("");
  const [prizeUrl, setPrizeUrl] = useState("");
  const [attachPrizeId, setAttachPrizeId] = useState("");
  const [attachRoundId, setAttachRoundId] = useState("");
  const [attachType, setAttachType] = useState("other");
  const eventId = event?.id ?? "";
  const editable = canManage && ownEvent && !!event && ["draft", "ready"].includes(event.status);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      const client = getBncClient();
      if (!client) { if (active) setMsg("Cliente Supabase não configurado."); return; }
      if (active) { setLoading(true); setMsg(""); setItems([]); setCombos([]); setBatches([]); setPrizes([]); }
      try {
        if (tab === "prendas-gerais") {
          const { data, error } = await client.from("bnc_prizes").select("id,title,description,image_url,is_confirmed")
            .eq("organization_id", await getTucxaOrganizationId(client)).order("created_at", { ascending: false }).limit(250);
          if (error) throw error;
          if (active) setPrizes((data ?? []) as Prize[]);
        } else if (eventId) {
          if (tab === "cardapio") {
            const { data, error } = await client.from("bnc_menu_items").select("id,category,title,price_cents,is_active,image_url")
              .eq("event_id", eventId).order("category").order("title");
            if (error) throw error;
            if (active) setItems((data ?? []) as Menu[]);
          }
          if (tab === "combos") {
            const { data, error } = await client.from("bnc_v07c_combos").select("id,title,kind,price_cents,card_quantity,food_credit_cents,credit_scope,status")
              .eq("event_id", eventId).order("created_at", { ascending: false });
            if (error) throw error;
            if (active) setCombos((data ?? []) as Combo[]);
          }
          if (tab === "cartelas") {
            const { data, error } = await client.from("bnc_v07c_card_batches").select("id,code,color_name,quantity,allowed_round_id,status")
              .eq("event_id", eventId).order("created_at", { ascending: false });
            if (error) throw error;
            if (active) setBatches((data ?? []) as Batch[]);
          }
        }
      } catch (error) { if (active) setMsg(`Consulta indisponível: ${error instanceof Error ? error.message : "erro não identificado"}. Confirme a migration V07C.`); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [eventId, tab]);

  async function rpc(fn: string, args: Record<string, unknown>) {
    const client = getBncClient();
    if (!client) throw new Error("Supabase indisponível");
    const { data, error } = await client.rpc(fn, args);
    if (error) throw error;
    return data as string;
  }
  async function submit(e: FormEvent<HTMLFormElement> | null, operation: () => Promise<void>) {
    e?.preventDefault(); setBusy(true); setMsg("");
    try { await operation(); setMsg("Registro salvo. Reabra esta seção para atualizar a listagem."); await onReload(); }
    catch (error) { setMsg(`Falha: ${error instanceof Error ? error.message : "erro desconhecido"}`); }
    finally { setBusy(false); }
  }

  async function uploadMenuPhoto(itemId: string, file: File) {
    const client = getBncClient();
    if (!client || !eventId) throw new Error("Projeto Supabase não configurado");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024)
      throw new Error("Envie JPEG, PNG ou WebP com até 3 MB.");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = `tucxa/${eventId}/menu/${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage.from("bnc-public-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Envio da foto falhou: ${error.message}`);
    const { data } = client.storage.from("bnc-public-images").getPublicUrl(path);
    await rpc("bnc_v07c_menu_set_image", { p_item: itemId, p_image_url: data.publicUrl });
    setItems(previous => previous.map(item => item.id === itemId ? { ...item, image_url: data.publicUrl } : item));
  }

  async function createMenu() {
    if (!eventId) return;
    const client = getBncClient();
    if (!client) throw new Error("Supabase indisponível");
    if (menuPhoto && (!["image/jpeg", "image/png", "image/webp"].includes(menuPhoto.type) || menuPhoto.size > 3 * 1024 * 1024))
      throw new Error("Envie JPEG, PNG ou WebP com até 3 MB.");
    const itemId = await rpc("bnc_v07b_add_menu_item", { p_event: eventId, p_category: menuCategory, p_title: menuTitle, p_price_cents: cents(menuPrice), p_description: null });
    setMenuTitle(""); setMenuPrice("");
    if (menuPhoto) {
      try { await uploadMenuPhoto(itemId, menuPhoto); }
      catch (error) { throw new Error(`Item cadastrado; foto pendente: ${error instanceof Error ? error.message : "erro inesperado"}`); }
      setMenuPhoto(null);
    }
    const { data, error } = await client.from("bnc_menu_items").select("id,category,title,price_cents,is_active,image_url")
      .eq("event_id", eventId).order("category").order("title");
    if (!error) setItems((data ?? []) as Menu[]);
  }

  if (tab !== "prendas-gerais" && !event) return <p className="text-sm">Selecione um evento para continuar.</p>;
  return <div className="space-y-4">
    {loading && <p role="status" className="text-sm">Carregando informações...</p>}
    {msg && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{msg}</p>}
    {tab === "cardapio" && <>
      <h3 className="text-xl font-black">Cardápio do evento, com fotos</h3>
      <p className="text-sm text-slate-600">Cadastro informativo. Fotos enviadas ao armazenamento público BNC; não envie dados pessoais. Pedidos e pagamentos não estão habilitados.</p>
      <div className="grid gap-3 sm:grid-cols-2">{items.map(item => <div key={item.id} className="flex gap-3 rounded-xl border p-3 text-sm">
        {item.image_url ? <Image unoptimized src={item.image_url} width={96} height={96} alt={`Foto de ${item.title}`} className="h-24 w-24 rounded-lg object-cover"/> : <div className="grid h-24 w-24 shrink-0 place-content-center rounded-lg bg-slate-100 text-xs text-slate-600">Sem foto</div>}
        <div className="min-w-0 flex-1"><p className="font-bold">{item.title}</p><p>{item.category}</p><p className="font-bold">{brl(item.price_cents)}</p>
          {editable && <label className="mt-2 block text-xs">{item.image_url ? "Trocar foto" : "Adicionar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs"
              onChange={e => { const file = e.target.files?.[0]; if (file) void submit(null, () => uploadMenuPhoto(item.id, file)); }}/>
          </label>}
        </div>
      </div>)}</div>
      {editable && <form className={`${box} grid gap-3 sm:grid-cols-2`} onSubmit={e => void submit(e, createMenu)}>
        <label>Categoria<input className={field} value={menuCategory} onChange={e => setMenuCategory(e.target.value)} maxLength={80} required/></label>
        <label>Item<input className={field} value={menuTitle} onChange={e => setMenuTitle(e.target.value)} maxLength={140} required/></label>
        <label>Preço (R$)<input className={field} inputMode="decimal" value={menuPrice} onChange={e => setMenuPrice(e.target.value)} placeholder="6,00" required/></label>
        <label>Foto (JPEG, PNG ou WebP, até 3 MB)<input className={`${field} mt-1`} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setMenuPhoto(e.target.files?.[0] ?? null)}/></label>
        <button disabled={busy} className={button}>Cadastrar item{menuPhoto ? " e foto" : ""}</button>
      </form>}
    </>}
    {tab === "combos" && <>
      <h3 className="text-xl font-black">Combos e créditos — planejamento</h3>
      <p className="text-sm text-amber-900">Apenas rascunhos. Não existe checkout, reserva, recebimento, quitação ou emissão de cartelas nesta versão.</p>
      {combos.map(c => <div key={c.id} className="rounded-xl border p-3 text-sm"><strong>{c.title}</strong> · {brl(c.price_cents)} · {c.kind} · {c.card_quantity} cartelas · crédito {brl(c.food_credit_cents)} · {c.status}</div>)}
      {editable && <form className={`${box} grid gap-3 sm:grid-cols-2`} onSubmit={e => void submit(e, async () => {
        await rpc("bnc_v07c_combo_create", { p_event: eventId, p_title: comboTitle, p_kind: comboKind,
          p_price_cents: cents(comboPrice), p_card_quantity: Number(comboCards), p_food_credit_cents: cents(comboCredit), p_credit_scope: comboScope, p_description: null });
        setComboTitle("");
      })}>
        <label>Nome da oferta<input required className={field} value={comboTitle} onChange={e => setComboTitle(e.target.value)}/></label>
        <label>Tipo<select className={field} value={comboKind} onChange={e => {
          const kind = e.target.value; setComboKind(kind);
          setComboCards(kind === "cards" || kind === "mixed" ? "3" : "0");
          setComboCredit(kind === "food" || kind === "mixed" || kind === "credit" ? "20,00" : "0");
        }}><option value="cards">Cartelas</option><option value="food">Alimentação</option><option value="mixed">Cartelas + alimentação</option><option value="credit">Crédito fixo</option></select></label>
        <label>Preço planejado (R$)<input className={field} inputMode="decimal" required value={comboPrice} onChange={e => setComboPrice(e.target.value)} placeholder="20,00"/></label>
        <label>Quantidade de cartelas<input className={field} min={0} max={100} type="number" required value={comboCards} onChange={e => setComboCards(e.target.value)}/></label>
        <label>Crédito previsto (R$)<input className={field} inputMode="decimal" value={comboCredit} onChange={e => setComboCredit(e.target.value)} required/></label>
        <label>Uso do crédito<select className={field} value={comboScope} onChange={e => setComboScope(e.target.value)}><option value="food">Alimentação</option><option value="cards">Cartelas</option><option value="either">Ambos (definir regras)</option></select></label>
        <button className={button} disabled={busy}>Salvar rascunho de combo</button>
      </form>}
    </>}
    {tab === "cartelas" && <>
      <h3 className="text-xl font-black">Lotes de cartelas físicas — planejamento</h3>
      <p className="text-sm text-amber-900">Lotes e cores cadastrados são rascunhos; não habilitam uma cartela nem substituem sua conferência e controle de numeração.</p>
      {batches.map(b => <div key={b.id} className="rounded-xl border p-3 text-sm"><strong>{b.code}</strong> · {b.color_name} · {b.quantity} cartelas · {b.allowed_round_id ? `Rodada ${rounds.find(r => r.id === b.allowed_round_id)?.round_number ?? "específica"}` : "Válidas para todas as rodadas (proposta)"} · {b.status}</div>)}
      {editable && <form className={`${box} grid gap-3 sm:grid-cols-2`} onSubmit={e => void submit(e, async () => {
        await rpc("bnc_v07c_batch_create", { p_event: eventId, p_code: batchCode, p_color_name: batchColor,
          p_quantity: Number(batchQuantity), p_round: batchRound || null });
        setBatchCode("");
      })}>
        <label>Código do lote<input required className={field} value={batchCode} onChange={e => setBatchCode(e.target.value)}/></label>
        <label>Cor<input required className={field} value={batchColor} onChange={e => setBatchColor(e.target.value)}/></label>
        <label>Quantidade de cartelas<input required min={1} max={100000} type="number" className={field} value={batchQuantity} onChange={e => setBatchQuantity(e.target.value)}/></label>
        <label>Rodadas permitidas<select className={field} value={batchRound} onChange={e => setBatchRound(e.target.value)}><option value="">Todas (a validar pela Diretoria)</option>{rounds.filter(r => r.status === "planned").map(r => <option key={r.id} value={r.id}>Somente {r.round_number}. {r.title}</option>)}</select></label>
        <button className={button} disabled={busy}>Salvar lote em rascunho</button>
      </form>}
    </>}
    {tab === "prendas-gerais" && <>
      <h3 className="text-xl font-black">Catálogo geral de prendas do TUCXA</h3>
      <p className="text-sm text-slate-600">Cadastre uma prenda uma vez e associe-a a uma rodada. Ela só aparece publicamente depois da confirmação.</p>
      <div className="grid gap-3 sm:grid-cols-2">{prizes.map(p => <div key={p.id} className="rounded-xl border p-3 text-sm">
        {p.image_url && <a href={p.image_url} rel="noopener noreferrer" target="_blank" className="font-bold underline">Ver foto ↗</a>}
        <p className="font-bold">{p.title}</p><p>{p.description}</p><p>{p.is_confirmed ? "Prenda confirmada" : "Aguardando confirmação"}</p>
        {canManage && <button className="mt-2 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-bold" disabled={busy} onClick={() => void submit(null, async () => { await rpc("bnc_v07c_confirm_prize", { p_prize: p.id, p_confirm: !p.is_confirmed }); })}>{p.is_confirmed ? "Desmarcar confirmação" : "Confirmar doação recebida"}</button>}
      </div>)}</div>
      {canManage && <form className={`${box} grid gap-3 sm:grid-cols-2`} onSubmit={e => void submit(e, async () => {
        await rpc("bnc_v07c_catalog_prize", { p_title: prizeTitle, p_description: prizeDescription || null, p_image_url: prizeUrl || null });
        setPrizeTitle(""); setPrizeDescription(""); setPrizeUrl("");
      })}>
        <label>Nome da prenda<input className={field} required value={prizeTitle} onChange={e => setPrizeTitle(e.target.value)}/></label>
        <label>Descrição<input className={field} value={prizeDescription} onChange={e => setPrizeDescription(e.target.value)}/></label>
        <label>URL HTTPS de foto autorizada<input className={field} type="url" value={prizeUrl} onChange={e => setPrizeUrl(e.target.value)}/></label>
        <button disabled={busy} className={button}>Adicionar ao catálogo</button>
      </form>}
      {editable && <form className={`${box} grid gap-3 sm:grid-cols-2`} onSubmit={e => void submit(e, async () => {
        await rpc("bnc_v07c_attach_prize", { p_event: eventId, p_round: attachRoundId, p_prize: attachPrizeId, p_award_type: attachType });
      })}>
        <p className="sm:col-span-2 font-bold">Associar prenda existente ao evento selecionado</p>
        <label>Prenda<select className={field} required value={attachPrizeId} onChange={e => setAttachPrizeId(e.target.value)}><option value="">Selecione...</option>{prizes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>Rodada<select className={field} required value={attachRoundId} onChange={e => setAttachRoundId(e.target.value)}><option value="">Selecione...</option>{rounds.filter(r => r.status === "planned").map(r => <option key={r.id} value={r.id}>{r.round_number}. {r.title}</option>)}</select></label>
        <label>Tipo<select className={field} value={attachType} onChange={e => setAttachType(e.target.value)}><option value="other">Outra</option><option value="quina">Quina</option><option value="full_card">Cartela cheia</option></select></label>
        <button disabled={busy} className={button}>Vincular prenda à rodada</button>
      </form>}
    </>}
  </div>;
}

async function getTucxaOrganizationId(client: NonNullable<ReturnType<typeof getBncClient>>) {
  const { data, error } = await client.from("bnc_organizations").select("id").eq("slug", "tucxa").single();
  if (error || !data) throw error ?? new Error("Organização não encontrada");
  return data.id as string;
}
