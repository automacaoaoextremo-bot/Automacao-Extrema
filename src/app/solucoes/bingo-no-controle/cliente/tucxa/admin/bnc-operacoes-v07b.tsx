"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { getBncClient } from "@/lib/bingo-no-controle/client";

export type BncEvent = {
  id: string; title: string; slug: string; starts_at: string | null;
  status: string; is_public: boolean; organization_id: string;
};
export type BncRound = { id: string; round_number: number; title: string; status: string };
export type Bnc07BTab = "eventos" | "configuracoes" | "premios" | "cardapio" | "qrcodes" | "operacao" | "chamados" | "previa";

type Award = { id: string; label: string; award_type: string; round_id: string };
type Claim = { id: string; claimant_name: string | null; card_serial: string | null; status: string; award_id: string | null; review_reason: string | null };
type MenuItem = { id: string; category: string; title: string; price_cents: number; is_active: boolean };

type Props = {
  tab: Bnc07BTab;
  event: BncEvent | null;
  sourceEvents: BncEvent[];
  rounds: BncRound[];
  selectedRound: BncRound | null;
  onSelectRound: (id: string) => void;
  canManage: boolean;
  canOperate: boolean;
  ownEvent: boolean;
  onReload: () => Promise<void>;
};

const button = "rounded-lg bg-[#10623f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0d5035] disabled:cursor-not-allowed disabled:opacity-50";
const field = "w-full rounded-lg border border-emerald-200 bg-white p-2.5 text-sm text-[#173e2c]";
const publicBase = "/solucoes/bingo-no-controle/cliente/tucxa/evento";

export function BncOperacoesV07B({tab,event,sourceEvents,rounds,selectedRound,onSelectRound,canManage,canOperate,ownEvent,onReload}: Props) {
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [cloneSource,setCloneSource] = useState("");
  const [cloneTitle,setCloneTitle] = useState("Bingo do TUCXA — 12/12/2026");
  const [cloneSlug,setCloneSlug] = useState("bingo-tucxa-2026-12-12");
  const [cloneDay,setCloneDay] = useState("2026-12-12");
  const [cloneTime,setCloneTime] = useState("");
  const [prizeTitle,setPrizeTitle] = useState("");
  const [prizeDescription,setPrizeDescription] = useState("");
  const [prizeImage,setPrizeImage] = useState("");
  const [prizeType,setPrizeType] = useState("other");
  const [menuCategory,setMenuCategory] = useState("Alimentação");
  const [menuName,setMenuName] = useState("");
  const [menuPrice,setMenuPrice] = useState("");
  const [menuItems,setMenuItems] = useState<MenuItem[]>([]);
  const [drawNumber,setDrawNumber] = useState("");
  const [undoReason,setUndoReason] = useState("");
  const [awards,setAwards] = useState<Award[]>([]);
  const [claims,setClaims] = useState<Claim[]>([]);
  const [claimName,setClaimName] = useState("");
  const [cardSerial,setCardSerial] = useState("");
  const [claimAward,setClaimAward] = useState("");
  const [reviewReason,setReviewReason] = useState("");
  const [cardChecked,setCardChecked] = useState(false);
  const [qrUrl,setQrUrl] = useState("");

  async function invoke<T>(fn: string, args: Record<string,unknown>, reload = true): Promise<T | null> {
    const client=getBncClient();
    if (!client) {setMessage("Cliente Supabase não configurado."); return null;}
    setBusy(true); setMessage("");
    try {
      const {data,error}=await client.rpc(fn,args);
      if(error) throw error;
      setMessage("Operação concluída. Confira o resultado antes de continuar.");
      if(reload) await onReload();
      return data as T;
    } catch(error) {
      setMessage(`Não foi possível concluir: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      return null;
    } finally {setBusy(false);}
  }

  async function cloneEvent(e: FormEvent) {
    e.preventDefault();
    if(!cloneSource || !cloneDay || !cloneTime) {setMessage("Selecione evento-modelo, data e horário.");return;}
    const dt=new Date(`${cloneDay}T${cloneTime}:00-03:00`);
    if(Number.isNaN(dt.valueOf())) {setMessage("Data/hora inválida.");return;}
    if(!window.confirm("Criar rascunho TUCXA copiando rodadas e configuração de premiações, sem dados de ganhadores e sorteios?")) return;
    await invoke("bnc_v07b_clone_event",{p_source:cloneSource,p_title:cloneTitle,p_slug:cloneSlug,p_starts_at:dt.toISOString()});
  }

  async function createPrize(e: FormEvent) {
    e.preventDefault();
    if(!event || !selectedRound) return;
    const result=await invoke<string>("bnc_v07b_add_prize",{p_event:event.id,p_round:selectedRound.id,p_title:prizeTitle,p_description:prizeDescription||null,p_image_url:prizeImage||null,p_award_type:prizeType});
    if(result) {setPrizeTitle("");setPrizeDescription("");setPrizeImage("");}
  }

  async function createMenuItem(e: FormEvent) {
    e.preventDefault(); if(!event) return;
    if(!/^\d+(?:[,.]\d{1,2})?$/.test(menuPrice.trim())) {setMessage("Informe preço válido, por exemplo 6,00.");return;}
    const cents=Math.round(Number(menuPrice.replace(",","."))*100);
    const result=await invoke<string>("bnc_v07b_add_menu_item",{p_event:event.id,p_category:menuCategory,p_title:menuName,p_price_cents:cents,p_description:null},false);
    if(result) {setMenuName("");setMenuPrice("");await loadMenu();}
  }

  async function loadMenu() {
    if(!event) return;
    const client=getBncClient();if(!client)return;
    const {data,error}=await client.from("bnc_menu_items").select("id,category,title,price_cents,is_active").eq("event_id",event.id).order("category").order("title");
    if(error) setMessage(error.message);else setMenuItems((data??[]) as MenuItem[]);
  }

  async function loadClaims() {
    if(!selectedRound) return;
    const client=getBncClient();if(!client)return;
    setBusy(true);
    const [a,c]=await Promise.all([
      client.from("bnc_awards").select("id,label,award_type,round_id").eq("round_id",selectedRound.id).order("award_number"),
      client.from("bnc_winner_claims").select("id,claimant_name,card_serial,status,award_id,review_reason").eq("round_id",selectedRound.id).order("submitted_at",{ascending:false}),
    ]);
    setBusy(false);
    if(a.error||c.error){setMessage(a.error?.message??c.error?.message??"Falha ao consultar reivindicações");return;}
    setAwards((a.data??[]) as Award[]);setClaims((c.data??[]) as Claim[]);
  }

  async function createClaim(e: FormEvent) {
    e.preventDefault();if(!selectedRound||!claimAward)return;
    const result=await invoke<string>("bnc_v07b_create_claim",{p_round:selectedRound.id,p_award:claimAward,p_claimant:claimName,p_serial:cardSerial},false);
    if(result){setClaimName("");setCardSerial("");await loadClaims();}
  }

  async function reviewClaim(id:string,accept:boolean) {
    if(!reviewReason.trim()){setMessage("Informe uma justificativa.");return;}
    if(!window.confirm(accept?"Confirmar aceitação após conferência física/manual da cartela?":"Rejeitar reivindicação?"))return;
    const result=await invoke<boolean>("bnc_v07b_review_claim",{p_claim:id,p_accept:accept,p_reason:reviewReason,p_card_checked:cardChecked},false);
    if(result){setReviewReason("");setCardChecked(false);await loadClaims();}
  }

  async function makeQr() {
    if(!event)return;
    const url=`${window.location.origin}${publicBase}/${encodeURIComponent(event.slug)}`;
    const qr=await import("qrcode");
    try {setQrUrl(await qr.toDataURL(url,{width:440,margin:2,errorCorrectionLevel:"M"}));setMessage("");}
    catch {setMessage("Não foi possível gerar o QR Code.");}
  }

  if(tab==="eventos") return <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <h3 className="font-black">Criar novo bingo a partir de um evento encerrado</h3>
    <p className="mt-1 text-sm">O Sementinha é grupo do TUCXA. A cópia cria evento TUCXA privado, rodadas planejadas e modelos de premiação. Não copia números sorteados, reivindicações ou ganhadores.</p>
    {canManage ? <form onSubmit={(e)=>void cloneEvent(e)} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Bingo usado como modelo<select className={field} value={cloneSource} onChange={e=>setCloneSource(e.target.value)} required><option value="">Selecione...</option>{sourceEvents.filter(x=>x.status==="completed").map(x=><option key={x.id} value={x.id}>{x.title} ({x.starts_at?.slice(0,10)??"sem data"})</option>)}</select></label>
      <label className="text-sm font-semibold">Nome do novo bingo<input className={field} value={cloneTitle} onChange={e=>setCloneTitle(e.target.value)} required/></label>
      <label className="text-sm font-semibold">Slug<input className={field} pattern="[a-z0-9-]{3,80}" value={cloneSlug} onChange={e=>setCloneSlug(e.target.value)} required/></label>
      <label className="text-sm font-semibold">Data<input className={field} type="date" value={cloneDay} onChange={e=>setCloneDay(e.target.value)} required/></label>
      <label className="text-sm font-semibold">Horário (não presumido)<input className={field} type="time" value={cloneTime} onChange={e=>setCloneTime(e.target.value)} required/></label>
      <div className="self-end"><button className={button} disabled={busy||!cloneSource}>Copiar como rascunho</button></div>
    </form>:<p className="mt-2 text-sm">Somente owner ou manager pode criar o evento-modelo.</p>}
    {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;

  if(!event)return null;
  const editable=canManage&&ownEvent&&["draft","ready"].includes(event.status);
  const roundEditable=editable&&selectedRound?.status==="planned";
  const live=canOperate&&ownEvent&&event.is_public&&event.status==="active";

  if(tab==="configuracoes")return <section className="rounded-xl border p-4">
    <h3 className="font-bold">Publicação do evento</h3>
    <p className="mt-1 text-sm">Publicado significa visível na área pública. Não habilita vendas de cartelas.</p>
    <p className="my-2 text-sm">Situação atual: <strong>{event.is_public?"Publicado":"Privado"}</strong></p>
    {editable&&<button className={button} disabled={busy} onClick={()=>void invoke("bnc_v07b_publish_event",{p_event:event.id,p_publish:!event.is_public})}>{event.is_public?"Retirar da área pública":"Publicar programação"}</button>}
    {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;

  if(tab==="premios")return <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <h3 className="font-black">Cadastrar e associar prenda à rodada</h3>
    <p className="text-sm">Escolha uma rodada planejada. Para o evento antigo, as premiações históricas continuam apenas para consulta.</p>
    <RoundPicker rounds={rounds} selected={selectedRound} onSelect={onSelectRound}/>
    {roundEditable?<form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>void createPrize(e)}>
      <label className="text-sm">Nome da prenda<input className={field} required value={prizeTitle} onChange={e=>setPrizeTitle(e.target.value)}/></label>
      <label className="text-sm">Tipo<select className={field} value={prizeType} onChange={e=>setPrizeType(e.target.value)}><option value="other">Outra premiação</option><option value="quina">Quina</option><option value="full_card">Cartela cheia</option></select></label>
      <label className="text-sm">Descrição<input className={field} value={prizeDescription} onChange={e=>setPrizeDescription(e.target.value)}/></label>
      <label className="text-sm">Imagem HTTPS (opcional)<input type="url" className={field} value={prizeImage} onChange={e=>setPrizeImage(e.target.value)}/></label>
      <button disabled={busy} className={button}>Cadastrar prenda</button>
    </form>:<p className="text-sm">Cadastro disponível apenas para rodada planejada de evento TUCXA em rascunho/preparado.</p>}
    {message&&<p role="status" className="text-sm">{message}</p>}
  </section>;

  if(tab==="cardapio")return <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <h3 className="font-black">Cardápio do evento</h3><p className="text-sm">Itens e preços informativos vinculados exclusivamente ao evento; não abre pedidos nem pagamentos.</p>
    <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>void loadMenu()}>Consultar itens cadastrados</button>
    {menuItems.map(m=><div key={m.id} className="flex justify-between rounded-lg bg-white p-3 text-sm"><span>{m.category} · {m.title}</span><strong>{(m.price_cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong></div>)}
    {editable&&<form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>void createMenuItem(e)}>
      <label className="text-sm">Categoria<input className={field} value={menuCategory} onChange={e=>setMenuCategory(e.target.value)} required/></label>
      <label className="text-sm">Item<input className={field} value={menuName} onChange={e=>setMenuName(e.target.value)} required/></label>
      <label className="text-sm">Valor (R$)<input className={field} inputMode="decimal" placeholder="6,00" value={menuPrice} onChange={e=>setMenuPrice(e.target.value)} required/></label>
      <button className={button} disabled={busy}>Cadastrar item</button>
    </form>}
    {message&&<p role="status" className="text-sm">{message}</p>}
  </section>;

  if(tab==="operacao")return <section className="space-y-4 rounded-xl border border-emerald-200 p-4">
    <h3 className="text-lg font-black">Operação de sorteios (1–75)</h3>
    <RoundPicker rounds={rounds} selected={selectedRound} onSelect={onSelectRound}/>
    {selectedRound&&<p className="text-sm">Rodada {selectedRound.round_number}: <strong>{selectedRound.status}</strong></p>}
    {canOperate&&ownEvent&&selectedRound&&<div className="flex flex-wrap gap-2">
      {selectedRound.status==="planned"&&<button className={button} disabled={busy||!event.is_public} onClick={()=>void invoke("bnc_v07b_round_state",{p_round:selectedRound.id,p_action:"open"})}>Abrir rodada</button>}
      {selectedRound.status==="open"&&<button className="rounded-lg border px-4 py-2 text-sm font-bold" disabled={busy} onClick={()=>void invoke("bnc_v07b_round_state",{p_round:selectedRound.id,p_action:"close"})}>Encerrar rodada</button>}
    </div>}
    {live&&selectedRound?.status==="open"&&<div className="grid gap-4 sm:grid-cols-2">
      <form onSubmit={e=>{e.preventDefault();void invoke("bnc_v07b_draw",{p_round:selectedRound.id,p_number:Number(drawNumber)}).then(()=>setDrawNumber(""));}} className="space-y-2 rounded-lg bg-emerald-50 p-3"><label className="block text-sm font-bold">Pedra sorteada (1 a 75)<input type="number" min={1} max={75} required className={field} value={drawNumber} onChange={e=>setDrawNumber(e.target.value)}/></label><button className={button} disabled={busy}>Registrar pedra</button></form>
      <form onSubmit={e=>{e.preventDefault();if(window.confirm("Desfazer a última pedra válida?"))void invoke("bnc_v07b_undo_draw",{p_round:selectedRound.id,p_reason:undoReason}).then(()=>setUndoReason(""));}} className="space-y-2 rounded-lg bg-amber-50 p-3"><label className="block text-sm font-bold">Motivo da reversão<input className={field} minLength={4} required value={undoReason} onChange={e=>setUndoReason(e.target.value)}/></label><button className="rounded-lg border border-amber-500 px-4 py-2.5 text-sm font-bold" disabled={busy}>Desfazer última pedra</button></form>
    </div>}
    <p className="text-xs text-slate-600">Apenas eventos TUCXA publicados e não históricos podem operar. A operação possui bloqueio transacional e registro de auditoria.</p>
    {message&&<p role="status" className="text-sm">{message}</p>}
  </section>;

  if(tab==="chamados")return <section className="space-y-3 rounded-xl border p-4">
    <h3 className="text-lg font-black">Reivindicações e ganhadores — validação manual</h3>
    <p className="text-sm text-amber-900">A aprovação exige conferência física/manual da cartela. Esta etapa não executa validação algorítmica de combinações de bingo.</p>
    <RoundPicker rounds={rounds} selected={selectedRound} onSelect={onSelectRound}/>
    <button type="button" onClick={()=>void loadClaims()} className="rounded-lg border px-3 py-2 text-sm" disabled={busy}>Carregar reivindicações da rodada</button>
    {canOperate&&ownEvent&&selectedRound&&["open","closed"].includes(selectedRound.status)&&<form className="grid gap-2 sm:grid-cols-2" onSubmit={e=>void createClaim(e)}>
      <select className={field} required value={claimAward} onChange={e=>setClaimAward(e.target.value)}><option value="">Premiação...</option>{awards.map(a=><option value={a.id} key={a.id}>{a.label}</option>)}</select>
      <input className={field} placeholder="Nome do participante" required value={claimName} onChange={e=>setClaimName(e.target.value)}/>
      <input className={field} placeholder="Código/serial da cartela" required value={cardSerial} onChange={e=>setCardSerial(e.target.value)}/>
      <button className={button} disabled={busy}>Registrar reivindicação pendente</button>
    </form>}
    <label className="block text-sm">Justificativa da revisão<input className={field} value={reviewReason} onChange={e=>setReviewReason(e.target.value)} placeholder="Conferi a cartela física..."/></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cardChecked} onChange={e=>setCardChecked(e.target.checked)}/> Confirmo que conferi a cartela manualmente</label>
    {claims.map(c=><div key={c.id} className="rounded-lg border p-3 text-sm"><strong>{c.claimant_name??"Participante"}</strong> · cartela {c.card_serial??"não informada"} · <span>{c.status}</span>
      {c.status==="pending"&&canManage&&ownEvent&&<div className="mt-2 flex gap-2"><button disabled={busy} onClick={()=>void reviewClaim(c.id,true)} className={button}>Aceitar</button><button disabled={busy} onClick={()=>void reviewClaim(c.id,false)} className="rounded-lg border border-red-300 px-3 py-2 text-red-700">Rejeitar</button></div>}
    </div>)}
    {message&&<p role="status" className="text-sm">{message}</p>}
  </section>;

  if(tab==="qrcodes")return <section className="space-y-3 rounded-xl border p-4">
    <h3 className="text-lg font-black">QR Code do evento</h3><p className="text-sm">O código aponta para a página pública do evento. Não é um comprovante de pagamento ou cartela.</p>
    <button type="button" className={button} onClick={()=>void makeQr()}>Gerar QR Code</button>
    {qrUrl&&<div className="flex flex-col items-start gap-2"><Image unoptimized width={220} height={220} src={qrUrl} alt="QR Code para página pública do evento"/><a className="underline" download={`bingo-${event.slug}.png`} href={qrUrl}>Salvar imagem PNG</a></div>}
    <Link className="text-sm underline" target="_blank" href={`${publicBase}/${encodeURIComponent(event.slug)}`}>Abrir página do evento ↗</Link>
    {message&&<p role="status" className="text-sm">{message}</p>}
  </section>;

  if(tab==="previa")return <Link className={button} target="_blank" href={`${publicBase}/${encodeURIComponent(event.slug)}`}>Abrir prévia do evento ↗</Link>;
  return null;
}

function RoundPicker({rounds,selected,onSelect}:{rounds:BncRound[];selected:BncRound|null;onSelect:(id:string)=>void}){
  return <label className="block text-sm font-semibold">Rodada selecionada<select className={`${field} mt-1`} value={selected?.id??""} onChange={e=>onSelect(e.target.value)}>{rounds.map(r=><option value={r.id} key={r.id}>{r.round_number}. {r.title} ({r.status})</option>)}</select></label>;
}
