"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBncClient } from "@/lib/bingo-no-controle/client";
import { BncOperacoesV07B, type Bnc07BTab } from "./bnc-operacoes-v07b";
import { BncCatalogosV07C } from "./bnc-catalogos-v07c";
import { BncMateriaisV07C } from "./bnc-materiais-v07c";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const orgSlug = "tucxa";
const publicPath = "/solucoes/bingo-no-controle/cliente/tucxa";
const environment = process.env.NEXT_PUBLIC_BNC_ENV === "production" ? "Produção" : "Homologação";

type Mode = "loading" | "setup" | "login" | "denied" | "ready" | "error";
type Tab = "eventos" | "novo-evento" | "resumo" | "configuracoes" | "rodadas" | "premios" | "chamados" | "qrcodes" | "financeiro" | "relatorios" | "previa" | "operacao" | "cardapio" | "materiais" | "combos" | "cartelas" | "prendas-gerais";
type EventRow = { id: string; organization_id: string; title: string; slug: string; description: string | null; starts_at: string | null; ends_at: string | null; status: string; venue: string | null; is_public: boolean; sales_enabled: boolean };
type RoundRow = { id: string; event_id: string; round_number: number; title: string; status: string; starts_at: string | null; card_price_cents: number | null };
type DrawRow = { round_id: string; number: number; is_voided: boolean; draw_sequence: number };
type AwardRow = { round_id: string; label: string; award_type: string };
type EventDraft = { title: string; slug: string; description: string; venue: string; starts_at: string; ends_at: string; status: "draft" | "ready" };
const eventStatusLabel = (row: { status: string; is_public: boolean }) => ["completed", "closed"].includes(row.status) ? "Finalizado" : (row.is_public && ["ready", "active"].includes(row.status)) ? "Publicado" : "Rascunho";
type RoundDraft = { title: string; card_price: string };

const initialEventDraft: EventDraft = { title: "", slug: "", description: "", venue: "", starts_at: "", ends_at: "", status: "draft" };
const initialRoundDraft: RoundDraft = { title: "", card_price: "" };
const editRoles = ["owner", "manager"];

function niceDate(value: string | null) {
  if (!value) return "Data a definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data a definir";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}

function localInput(value: string | null) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(dt).replace(" ", "T");
}

// A aplicação registra datas do Bingo na zona de Campinas/São Paulo.
// Se houver necessidade de eventos em outros fusos, este conversor deverá ser ampliado.
function dateToIso(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Informe uma data e horário válidos.");
  const date = new Date(`${value}:00-03:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Data inválida.");
  return date.toISOString();
}

function priceInCents(value: string) {
  if (!value.trim()) return null;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error("Informe um valor válido em reais.");
  const cents = Math.round(Number(value.replace(",", ".")) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Valor inválido.");
  return cents;
}

async function readPages<T>(client: SupabaseClient, table: "bnc_draws" | "bnc_awards", columns: string, roundIds: string[]): Promise<T[]> {
  const output: T[] = [];
  for (let start = 0; start <= 49500; start += 500) {
    const { data, error } = await client.from(table).select(columns).in("round_id", roundIds).order("id").range(start, start + 499);
    if (error) throw error;
    const rows = (data ?? []) as unknown as T[];
    output.push(...rows);
    if (rows.length < 500) return output;
  }
  throw new Error("Limite de paginação excedido.");
}

function NavigationItem({ label, active, disabled, onClick }: { label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick}
    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${active ? "bg-white text-[#0d5938] shadow-sm" : "text-emerald-50 hover:bg-white/15"} disabled:cursor-not-allowed disabled:opacity-40`}>{label}</button>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-[#174735]">{label}<span className="mt-1 block">{children}</span></label>;
}

const inputClass = "w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-[#173e2c] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export default function BingoTucxaAdminPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedEmail, setSignedEmail] = useState("");
  const [role, setRole] = useState("");
  const [orgId, setOrgId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("eventos");
  const [eventForm, setEventForm] = useState<"none" | "new" | "edit">("none");
  const [eventDraft, setEventDraft] = useState<EventDraft>(initialEventDraft);
  const [copySourceId, setCopySourceId] = useState("");
  const [roundDraft, setRoundDraft] = useState<RoundDraft>(initialRoundDraft);
  const [roundForm, setRoundForm] = useState<"none" | "new" | "edit">("none");
  const [editingRound, setEditingRound] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = getBncClient();
    if (!client) { setMode("setup"); return; }
    setMode("loading");
    setMessage("");
    try {
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user) { setMode("login"); return; }
      const { data: org, error: orgError } = await client.from("bnc_organizations").select("id").eq("slug", orgSlug).maybeSingle();
      if (orgError) throw orgError;
      if (!org) { setMode("denied"); return; }
      const { data: membership, error: memberError } = await client.from("bnc_members").select("role").eq("organization_id", org.id).eq("user_id", auth.user.id).maybeSingle();
      if (memberError) throw memberError;
      if (!membership || ![...editRoles, "finance", "operator", "viewer"].includes(membership.role)) { setMode("denied"); return; }
      // O Sementinha integra o TUCXA. A migration V07B autoriza consulta
      // ao historico do grupo para gestores/operadores do TUCXA.
      let permittedOrgIds = [org.id];
      if (["owner", "manager", "operator"].includes(membership.role)) {
        const { data: group, error: groupError } = await client.from("bnc_organizations")
          .select("id").eq("slug", "sementinha").maybeSingle();
        if (groupError) throw groupError;
        if (group) permittedOrgIds = [...permittedOrgIds, group.id];
      }
      const { data: eventData, error: eventError } = await client.from("bnc_events")
        .select("id,organization_id,title,slug,description,starts_at,ends_at,status,venue,is_public,sales_enabled")
        .in("organization_id", permittedOrgIds).order("starts_at", { ascending: false });
      if (eventError) throw eventError;
      const foundEvents = (eventData ?? []) as EventRow[];
      const ids = foundEvents.map((item) => item.id);
      let foundRounds: RoundRow[] = [];
      let foundDraws: DrawRow[] = [];
      let foundAwards: AwardRow[] = [];
      if (ids.length) {
        const { data: roundData, error: roundError } = await client.from("bnc_rounds")
          .select("id,event_id,round_number,title,status,starts_at,card_price_cents").in("event_id", ids).order("round_number");
        if (roundError) throw roundError;
        foundRounds = (roundData ?? []) as RoundRow[];
        const roundIds = foundRounds.map((item) => item.id);
        if (roundIds.length) {
          [foundDraws, foundAwards] = await Promise.all([
            readPages<DrawRow>(client, "bnc_draws", "round_id,number,is_voided,draw_sequence", roundIds),
            readPages<AwardRow>(client, "bnc_awards", "round_id,label,award_type", roundIds),
          ]);
        }
      }
      setSignedEmail(auth.user.email ?? "Usuário autenticado");
      setRole(membership.role);
      setOrgId(org.id);
      setEvents(foundEvents); setRounds(foundRounds); setDraws(foundDraws); setAwards(foundAwards);
      setSelectedEvent((current) => current && foundEvents.some((item) => item.id === current) ? current : foundEvents[0]?.id ?? null);
      setMode("ready");
    } catch {
      setMessage("Não foi possível carregar o painel. Confira sua sessão e as políticas de acesso do Bingo.");
      setMode("error");
    }
  }, []);

  useEffect(() => {
    // A chamada inicia em uma microtarefa para evitar setState síncrono no efeito.
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getBncClient();
    if (!client) { setMode("setup"); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      setPassword("");
      if (error) { setMessage("Não foi possível entrar. Confira e-mail e senha."); return; }
      await load();
    } catch {
      setMessage("Falha de conexão ao autenticar. Tente novamente.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try { await getBncClient()?.auth.signOut(); }
    finally {
      setBusy(false); setMode("login"); setSignedEmail(""); setRole(""); setOrgId("");
      setEvents([]); setRounds([]); setDraws([]); setAwards([]); setSelectedEvent(null);
      setTab("eventos"); setEventForm("none"); setRoundForm("none");
    }
  }

  const selected = useMemo(() => events.find((item) => item.id === selectedEvent) ?? null, [events, selectedEvent]);
  const eventRounds = useMemo(() => rounds.filter((item) => item.event_id === selectedEvent), [rounds, selectedEvent]);
  const selectedIds = useMemo(() => new Set(eventRounds.map((item) => item.id)), [eventRounds]);
  const eventDraws = useMemo(() => draws.filter((item) => selectedIds.has(item.round_id) && !item.is_voided), [draws, selectedIds]);
  const eventAwards = useMemo(() => awards.filter((item) => selectedIds.has(item.round_id)), [awards, selectedIds]);
  const mayManage = editRoles.includes(role);
  const canOperate = [...editRoles, "operator"].includes(role);
  const ownEvent = selected?.organization_id === orgId;
  const activeRound = eventRounds.find(item => item.id === selectedRound) ?? eventRounds[0] ?? null;
  const editableEvent = mayManage && ownEvent && selected && !selected.is_public && ["draft", "ready"].includes(selected.status);

  function selectEvent(id: string, target: Tab = "resumo") {
    setSelectedEvent(id); setSelectedRound(null); setTab(target); setEventForm("none"); setRoundForm("none"); setMessage("");
  }

  function newEvent() {
    setEventDraft(initialEventDraft); setCopySourceId(""); setEventForm("new"); setTab("novo-evento"); setMessage("");
  }

  function editEvent() {
    if (!selected || !editableEvent) return;
    setEventDraft({ title: selected.title, slug: selected.slug, description: selected.description ?? "", venue: selected.venue ?? "", starts_at: localInput(selected.starts_at), ends_at: localInput(selected.ends_at), status: selected.status as "draft" | "ready" });
    setEventForm("edit"); setTab("configuracoes"); setMessage("");
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getBncClient();
    if (!client || !orgId || !mayManage) return;
    setBusy(true); setMessage("");
    try {
      const slug = eventDraft.slug.trim().toLowerCase();
      if (!/^[a-z0-9-]{3,80}$/.test(slug)) throw new Error("O identificador deve conter entre 3 e 80 caracteres: letras minúsculas, números ou hífen.");
      if (eventDraft.title.trim().length < 3 || eventDraft.title.trim().length > 160) throw new Error("Título deve ter de 3 a 160 caracteres.");
      const fields = { slug, title: eventDraft.title.trim(), description: eventDraft.description.trim() || null, venue: eventDraft.venue.trim() || null, starts_at: dateToIso(eventDraft.starts_at), ends_at: dateToIso(eventDraft.ends_at) };
      if (fields.ends_at && (!fields.starts_at || fields.ends_at <= fields.starts_at)) throw new Error("O término precisa ser posterior ao início.");
      let nextId: string | null = null;
      if (eventForm === "new") {
        if (copySourceId) {
          if (!fields.starts_at || !fields.ends_at) throw new Error("Informe início e término ao copiar um evento.");
          const { data, error } = await client.rpc("bnc_v07e_clone_from_form", {
            p_source: copySourceId, p_title: fields.title, p_slug: fields.slug,
            p_starts_at: fields.starts_at, p_ends_at: fields.ends_at,
            p_description: fields.description, p_venue: fields.venue,
          });
          if (error) throw error;
          nextId = String(data);
        } else {
          const { data, error } = await client.from("bnc_events").insert({ ...fields, organization_id: orgId }).select("id").single();
          if (error) throw error;
          nextId = data.id;
        }
      } else {
        if (!selected || !editableEvent) throw new Error("O evento não pode ser alterado.");
        const { data, error } = await client.from("bnc_events").update(fields)
          .eq("id", selected.id).eq("organization_id", orgId).in("status", ["draft", "ready"]).select("id").single();
        if (error) throw error;
        nextId = data.id;
      }
      if (nextId) setSelectedEvent(nextId);
      setEventForm("none"); setTab("resumo");
      await load();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Erro desconhecido";
      setMessage(`Não foi possível salvar o evento. Verifique as permissões, o identificador e os campos. ${reason.includes("identificador") || reason.includes("Título") ? reason : ""}`);
    } finally { setBusy(false); }
  }

  async function togglePublish(nextPublic: boolean) {
    const client = getBncClient();
    if (!client || !selected || !mayManage || !ownEvent || selected.sales_enabled || !["draft", "ready"].includes(selected.status)) return;
    if (!window.confirm(nextPublic ? "Publicar programação, cardápio ativo e prendas confirmadas na área pública? As vendas permanecerão desativadas." : "Retirar este evento da página pública?")) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await client.rpc("bnc_v07b_publish_event", { p_event: selected.id, p_publish: nextPublic });
      if (error) throw error;
      await load();
      setMessage(nextPublic ? "Evento publicado. Confira a página pública." : "Evento retirado da página pública.");
    } catch (error) {
      setMessage(`Publicação não concluída: ${error instanceof Error ? error.message : "verifique políticas e rodadas"}`);
    } finally { setBusy(false); }
  }

  function newRound() {
    setEditingRound(null); setRoundDraft(initialRoundDraft); setRoundForm("new"); setTab("rodadas"); setMessage("");
  }

  function editRound(round: RoundRow) {
    if (!editableEvent || round.status !== "planned") return;
    setEditingRound(round.id);
    setRoundDraft({ title: round.title, card_price: round.card_price_cents === null ? "" : (round.card_price_cents / 100).toFixed(2).replace(".", ",") });
    setRoundForm("edit"); setTab("rodadas"); setMessage("");
  }

  async function saveRound(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getBncClient();
    if (!client || !selected || !editableEvent) return;
    setBusy(true); setMessage("");
    try {
      if (roundDraft.title.trim().length < 2 || roundDraft.title.trim().length > 160) throw new Error("Informe um título válido.");
      const payload = { title: roundDraft.title.trim(), card_price_cents: priceInCents(roundDraft.card_price) };
      if (roundForm === "new") {
        const nextNumber = Math.max(0, ...eventRounds.map((item) => item.round_number)) + 1;
        const { error } = await client.from("bnc_rounds").insert({ ...payload, event_id: selected.id, round_number: nextNumber });
        if (error) throw error;
      } else {
        if (!editingRound) throw new Error("Rodada não selecionada.");
        const { error } = await client.rpc("bnc_v07b_update_planned_round", {p_round:editingRound,p_title:payload.title,p_price:payload.card_price_cents});
        if (error) throw error;
      }
      setRoundForm("none"); await load();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      setMessage(`Não foi possível salvar a rodada. Confira se o evento está em rascunho ou preparado e se não houve alteração concorrente. ${reason.startsWith("Informe") ? reason : ""}`);
    } finally { setBusy(false); }
  }

  function exportSummary() {
    if (!selected) return;
    const csv = ["Rodada;Título;Sorteios válidos;Premiações", ...eventRounds.map((round) => {
      const n = eventDraws.filter((draw) => draw.round_id === round.id).length;
      const a = eventAwards.filter((award) => award.round_id === round.id).length;
      return [round.round_number, `"${round.title.replaceAll('"', '""')}"`, n, a].join(";");
    })].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `bingo-tucxa-rodadas-${selected.slug}.csv`; anchor.click();
    URL.revokeObjectURL(url);
  }

  const shell = "rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm";
  const action = "rounded-xl bg-[#11623f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0c5033] disabled:opacity-50";

  return (
    <div className="min-h-dvh bg-[#f5f8f4] text-[#173e2c]">
      <TucxaPublicHeader navLabel="Bingo no Controle — Administração" showSupport={false}
        topAction={(mode === "ready" || mode === "denied") ? <button type="button" disabled={busy} onClick={() => void signOut()}
          className="rounded-full bg-[#14513a] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50">Sair</button> : undefined}/>
      <div className="mx-auto max-w-[90rem] px-4 py-2 text-xs font-bold text-emerald-800">Área administrativa · {environment} · <Link href={publicPath} className="underline">Página pública</Link></div>
      {mode !== "ready" ? <main className="mx-auto max-w-lg px-4 py-12">
        {mode === "loading" && <p role="status">Verificando sessão e permissões...</p>}
        {mode === "setup" && <div role="alert" className={shell}>Variáveis BNC não configuradas ou ambiente Supabase incorreto. Confira a configuração do Preview ou Production.</div>}
        {mode === "denied" && <div role="alert" className={shell}>Sua conta não está autorizada para o Bingo do TUCXA.</div>}
        {mode === "error" && <div role="alert" className={shell}>{message}<button type="button" onClick={() => void load()} className={`mt-4 block ${action}`}>Tentar novamente</button></div>}
        {mode === "login" && <form onSubmit={(event) => void signIn(event)} className={`${shell} space-y-4`}>
          <h2 className="text-xl font-bold">Entrar no administrativo</h2>
          <p className="text-sm text-slate-600">Use sua conta Supabase autorizada para o TUCXA.</p>
          <Field label="E-mail"><input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
          <Field label="Senha"><input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
          <button type="submit" disabled={busy} className={`w-full ${action}`}>{busy ? "Entrando..." : "Entrar"}</button>
        </form>}
      </main> : <div className="mx-auto grid max-w-[90rem] gap-5 p-3 sm:p-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="rounded-2xl bg-[#0b6041] p-3 text-white shadow-md lg:self-start">
          <div className="rounded-xl bg-white/10 px-3 py-4"><p className="text-xl font-black">Bingo TUCXA</p><p className="break-all text-xs text-emerald-100">{signedEmail}</p><p className="mt-1 text-xs text-emerald-100">Acesso: {role}</p></div>
          <nav aria-label="Navegação administrativa" className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            <p className="col-span-full px-3 pt-2 text-xs font-black uppercase tracking-wider text-emerald-200">Geral</p>
            <NavigationItem label="Eventos" active={tab === "eventos"} onClick={() => { setTab("eventos"); setEventForm("none"); }}/>
            <NavigationItem label="Novo evento" active={tab === "novo-evento"} disabled={!mayManage} onClick={newEvent}/>
            <NavigationItem label="Materiais de apoio" active={tab === "materiais"} onClick={() => { setTab("materiais"); setEventForm("none"); }}/>
            <NavigationItem label="Catálogo geral de prendas" active={tab === "prendas-gerais"} onClick={() => { setTab("prendas-gerais"); setEventForm("none"); }}/>
            <p className="col-span-full px-3 pt-3 text-xs font-black uppercase tracking-wider text-emerald-200">Evento selecionado</p>
            {([ ["resumo", "Resumo"], ["configuracoes", "Configurações"], ["rodadas", "Rodadas"], ["premios", "Prêmios"], ["cardapio", "Cardápio e fotos"], ["combos", "Combos (rascunhos)"], ["cartelas", "Lotes de cartelas"], ["chamados", "Bingos chamados"], ["qrcodes", "QR Codes"], ["financeiro", "Financeiro"], ["relatorios", "Relatórios"], ["previa", "Prévia pública"], ["operacao", "Operar sorteios"] ] as [Tab, string][]).map(([id,label]) =>
              <NavigationItem key={id} label={label} active={tab === id} disabled={!selected} onClick={() => { setTab(id); setMessage(""); setEventForm("none"); setRoundForm("none"); }}/>
            )}
            {selected && <div className="col-span-full mt-3 rounded-xl bg-[#073c2b] p-2">
              <p className="px-2 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-100">Rodada selecionada</p>
              <select className="mb-2 w-full rounded-lg bg-white p-2 text-xs font-bold text-emerald-900" value={activeRound?.id ?? ""} onChange={e=>setSelectedRound(e.target.value)}>
                {eventRounds.map(r=><option key={r.id} value={r.id}>{r.round_number}. {r.title}</option>)}
              </select>
              <NavigationItem label="Detalhes da rodada" active={tab==="rodadas"} onClick={()=>setTab("rodadas")}/>
              <NavigationItem label="Operar sorteio" active={tab==="operacao"} onClick={()=>setTab("operacao")}/>
              <NavigationItem label="Premiação" active={tab==="premios"} onClick={()=>setTab("premios")}/>
            </div>}
          </nav>
        </aside>
        <main className="min-w-0 space-y-5">
          {message && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</div>}

          {tab === "materiais" && <BncMateriaisV07C/>}
          {tab === "prendas-gerais" && <section className={shell}><BncCatalogosV07C tab="prendas-gerais" event={null} rounds={[]} ownEvent={false} canManage={mayManage} onReload={load}/></section>}
          {tab === "novo-evento" && mayManage && <section className={`${shell} space-y-5`}>
            <div><p className="text-xs font-bold uppercase text-emerald-700">Eventos</p><h2 className="text-2xl font-black">Novo evento</h2><p className="text-sm text-slate-600">Crie um bingo do zero ou copie a configuração de um evento concluído.</p></div>
            <form className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4" onSubmit={(event) => void saveEvent(event)}>
              <h3 className="text-lg font-black">Cadastrar evento em rascunho</h3>
              <Field label="Copiar configuração de evento encerrado? (opcional)">
                <select className={inputClass} value={copySourceId} onChange={(e) => {
                  const sourceId = e.target.value;
                  setCopySourceId(sourceId);
                  const template = events.find((candidate) => candidate.id === sourceId);
                  if (template) setEventDraft((current) => ({ ...current,
                    description: template.description ?? "", venue: template.venue ?? "",
                    title: current.title || `${template.title} — nova edição` }));
                }}>
                  <option value="">Não copiar — criar do zero</option>
                  {events.filter((event) => ["completed", "closed"].includes(event.status)).map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                </select>
              </Field>
              <p className="text-xs text-slate-600">A cópia cria rodadas planejadas e modelos de premiações; não inclui sorteios, reivindicações nem ganhadores.</p>
              <EventFields value={eventDraft} onChange={setEventDraft} inputClass={inputClass}/>
              <div className="flex gap-2"><button type="submit" disabled={busy} className={action}>{copySourceId ? "Copiar e criar rascunho" : "Criar evento"}</button><button type="button" onClick={() => { setEventForm("none");setTab("eventos"); }} className="rounded-lg border px-3 py-2">Cancelar</button></div>
            </form>
          </section>}

          {tab === "eventos" && <section className={`${shell} space-y-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-emerald-700">Eventos</p><h2 className="text-2xl font-black">Lista de dias de bingo</h2><p className="text-sm text-slate-600">Escolha uma ação para abrir as informações ou consultar as rodadas.</p></div>{mayManage && <button type="button" className={action} onClick={newEvent}>+ Novo evento</button>}</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{events.map((item) =>
              <article key={item.id} className={`rounded-xl border p-4 transition ${selectedEvent === item.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-2"><span className="text-xs font-bold uppercase text-emerald-700">{item.organization_id === orgId ? "TUCXA" : "Sementinha · TUCXA"}</span><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-900">{eventStatusLabel(item)}</span></div>
                <h3 className="mt-2 text-lg font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">Início: {niceDate(item.starts_at)}</p>
                <p className="mt-1 text-sm text-slate-600">Término: {item.ends_at ? niceDate(item.ends_at) : "Não informado"}</p>
                <p className="mt-1 text-sm text-slate-600">{item.venue ?? "Local não informado"}</p>
                {item.description && <p className="mt-2 text-xs text-slate-600">{item.description.slice(0, 145)}</p>}
                <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={action} onClick={() => selectEvent(item.id, "resumo")}>Abrir evento</button><button type="button" className="rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-bold text-emerald-800" onClick={() => selectEvent(item.id, "rodadas")}>Ver rodadas</button></div>
              </article>
            )}</div>
            {events.length === 0 && <p className="text-sm">Nenhum evento disponível para este usuário.</p>}
          </section>}

          {selected && !["eventos", "novo-evento", "materiais", "prendas-gerais"].includes(tab) && <section className={`${shell} space-y-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Evento selecionado · {eventStatusLabel(selected)}</p><h2 className="text-2xl font-black">{selected.title}</h2><p className="text-sm text-slate-600">{niceDate(selected.starts_at)} · {selected.venue ?? "Local a confirmar"}</p></div><button type="button" className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-bold" onClick={() => setTab("eventos")}>Trocar evento</button></div>
            <div className="grid gap-3 sm:grid-cols-3"><Metric label="Rodadas" value={eventRounds.length}/><Metric label="Números sorteados válidos" value={eventDraws.length}/><Metric label="Premiações" value={eventAwards.length}/></div>

            {tab === "resumo" && <div className="space-y-4"><h3 className="text-xl font-black">Resumo</h3><p className="text-sm text-slate-600">{selected.description ?? "Evento sem descrição cadastrada."}</p><p className="text-sm">Vendas: <strong>{selected.sales_enabled ? "Configuradas no banco (não operadas nesta interface)" : "Desativadas"}</strong> · Publicação: <strong>{selected.is_public ? "Marcado público" : "Privado"}</strong></p><h4 className="font-bold">Rodadas do evento</h4><RoundList rounds={eventRounds} draws={eventDraws} awards={eventAwards}/></div>}

            {tab === "configuracoes" && <div className="space-y-4"><h3 className="text-xl font-black">Configurações</h3>{selected.status === "completed" ? <p className="rounded-lg bg-amber-50 p-4 text-sm">Evento histórico concluído: alterações bloqueadas para preservar a auditoria.</p> : editableEvent ? <button type="button" className={action} onClick={editEvent}>Editar informações do evento</button> : <p className="text-sm">Somente owner/manager podem alterar eventos em rascunho ou preparados.</p>}
              {mayManage && ownEvent && ["draft", "ready"].includes(selected.status) && !selected.sales_enabled && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <h4 className="font-bold">Publicação da programação</h4>
                <p className="text-sm">O nome “Publicado” corresponde ao evento com status pronto e divulgação pública ativa. Não habilita compras ou pagamentos.</p>
                <button type="button" className={action} disabled={busy} onClick={() => void togglePublish(!selected.is_public)}>{selected.is_public ? "Retirar da área pública" : "Publicar evento"}</button>
              </div>}
              {eventForm === "edit" && <form onSubmit={(event) => void saveEvent(event)} className="space-y-3 rounded-xl bg-emerald-50 p-4"><EventFields value={eventDraft} onChange={setEventDraft} inputClass={inputClass}/><div className="flex gap-2"><button type="submit" disabled={busy} className={action}>Salvar alterações</button><button type="button" className="rounded-lg border px-3 py-2" onClick={() => setEventForm("none")}>Cancelar</button></div></form>}
            </div>}

            {tab === "rodadas" && <div className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><h3 className="text-xl font-black">Rodadas</h3>{editableEvent && <button type="button" onClick={newRound} className={action}>+ Nova rodada</button>}</div>
              {roundForm !== "none" && <form onSubmit={(event) => void saveRound(event)} className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h4 className="font-bold">{roundForm === "new" ? "Nova rodada planejada" : "Editar rodada planejada"}</h4><Field label="Título"><input className={inputClass} value={roundDraft.title} onChange={(e) => setRoundDraft((old) => ({ ...old, title: e.target.value }))} maxLength={160} required /></Field><Field label="Valor de referência da cartela (R$; opcional)"><input className={inputClass} inputMode="decimal" value={roundDraft.card_price} onChange={(e) => setRoundDraft((old) => ({ ...old, card_price: e.target.value }))} placeholder="Ex.: 7,00" /></Field><p className="text-xs text-amber-900">O valor é apenas referência; esta versão não comercializa cartelas.</p><div className="flex gap-2"><button type="submit" disabled={busy} className={action}>Salvar rodada</button><button type="button" className="rounded-lg border px-3 py-2" onClick={() => setRoundForm("none")}>Cancelar</button></div></form>}
              <RoundList rounds={eventRounds} draws={eventDraws} awards={eventAwards} onEdit={editableEvent ? editRound : undefined}/>
              <p className="text-sm text-slate-600">Use o seletor “Rodada selecionada” no menu para escolher a operação ou a premiação.</p>
            </div>}

            {tab === "premios" && <div className="space-y-3"><h3 className="text-xl font-black">Prêmios e premiações</h3>
              <div className="grid gap-2 sm:grid-cols-2">{eventAwards.map((a,i)=><p key={`${a.round_id}-${i}`} className="rounded-xl border p-3 text-sm">{a.label} · {a.award_type}</p>)}</div>
              <BncCatalogosV07C key={`${selected.id}-premios-${activeRound?.id ?? ""}`} tab="premios" event={selected} rounds={eventRounds} selectedRoundId={activeRound?.id ?? null} ownEvent={ownEvent} canManage={mayManage} onReload={load}/>
            </div>}
            {(["cardapio", "combos", "cartelas"] as Tab[]).includes(tab) && <BncCatalogosV07C key={`${selected.id}-${tab}`} tab={tab as "cardapio" | "combos" | "cartelas"} event={selected} rounds={eventRounds} ownEvent={ownEvent} canManage={mayManage} onReload={load}/>}

            {tab === "relatorios" && <div className="space-y-3"><h3 className="text-xl font-black">Relatório de rodadas</h3><p className="text-sm text-slate-600">Estatísticas dos números válidos sorteados, sem informações de participantes.</p><button type="button" className={action} onClick={exportSummary}>Exportar CSV de rodadas</button><BncNumeroStatsV07C draws={eventDraws} rounds={eventRounds}/><RoundList rounds={eventRounds} draws={eventDraws} awards={eventAwards}/></div>}

            {(["chamados", "qrcodes", "operacao", "previa"] as Bnc07BTab[]).includes(tab as Bnc07BTab) && <BncOperacoesV07B tab={tab as Bnc07BTab} event={selected} sourceEvents={events} rounds={eventRounds} selectedRound={activeRound} onSelectRound={setSelectedRound} canManage={mayManage} canOperate={canOperate} ownEvent={ownEvent} onReload={load}/>}
            {tab === "financeiro" && <div className="rounded-xl bg-amber-50 p-4 text-sm">Módulo de pagamentos e vendas não liberado. Nenhum dado financeiro será alterado por esta integração.</div>}
          </section>}
        </main>
      </div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-900">{label}</p><p className="mt-2 text-3xl font-black">{value.toLocaleString("pt-BR")}</p></div>;
}

function RoundList({ rounds, draws, awards, onEdit }: { rounds: RoundRow[]; draws: DrawRow[]; awards: AwardRow[]; onEdit?: (round: RoundRow) => void }) {
  return <div className="space-y-2">{rounds.map((round) => <div key={round.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 p-3"><div><p className="font-bold">{round.round_number}. {round.title}</p><p className="text-xs text-slate-500">{round.status} · {draws.filter((d) => d.round_id === round.id && !d.is_voided).length} sorteios válidos · {awards.filter((a) => a.round_id === round.id).length} premiações</p></div>{onEdit && round.status === "planned" && <button type="button" onClick={() => onEdit(round)} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-bold">Editar rodada</button>}</div>)}{rounds.length === 0 && <p className="text-sm text-slate-500">Nenhuma rodada cadastrada.</p>}</div>;
}

function EventFields({ value, onChange, inputClass }: { value: EventDraft; onChange: (draft: EventDraft) => void; inputClass: string }) {
  const update = (field: keyof EventDraft, content: string) => onChange({ ...value, [field]: content });
  return <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Nome do evento"><input className={inputClass} value={value.title} onChange={(e) => update("title", e.target.value)} maxLength={160} required /></Field>
    <Field label="Identificador da URL"><input className={inputClass} value={value.slug} onChange={(e) => update("slug", e.target.value)} pattern="[a-z0-9-]{3,80}" placeholder="bingo-tucxa-2027" required /></Field>
    <Field label="Início (Campinas/SP)"><input type="datetime-local" className={inputClass} value={value.starts_at} onChange={(e) => update("starts_at", e.target.value)} /></Field>
    <Field label="Término (Campinas/SP)"><input type="datetime-local" className={inputClass} min={value.starts_at || undefined} value={value.ends_at} onChange={(e) => update("ends_at", e.target.value)} /></Field>
    <Field label="Local"><input className={inputClass} value={value.venue} onChange={(e) => update("venue", e.target.value)} maxLength={220} /></Field>
    <div className="sm:col-span-2"><Field label="Descrição"><textarea className={inputClass} rows={3} value={value.description} onChange={(e) => update("description", e.target.value)} maxLength={3000}/></Field></div>
    <p className="self-end text-xs text-amber-900">Eventos novos são privados, sem venda ou sorteio ativo.</p>
  </div>;
}

function BncNumeroStatsV07C({ draws, rounds }: { draws: DrawRow[]; rounds: RoundRow[] }) {
  const totals = Array.from({ length: 75 }, (_, i) => ({ number: i + 1, count: draws.filter(d => d.number === i + 1).length }));
  const top = [...totals].sort((a, b) => b.count - a.count || a.number - b.number).slice(0, 10);
  const max = Math.max(1, ...top.map(t => t.count));
  const letters = ["B (1–15)", "I (16–30)", "N (31–45)", "G (46–60)", "O (61–75)"];
  const completed = rounds.filter(r => r.status === "completed" || r.status === "closed").length;
  return <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
    <h4 className="font-bold">Estatísticas do sorteio</h4>
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <Metric label="Rodadas encerradas" value={completed}/>
      <Metric label="Pedras válidas" value={draws.length}/>
      <Metric label="Média de pedras por rodada" value={rounds.length ? Math.round((draws.length / rounds.length) * 10) / 10 : 0}/>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div><p className="mb-2 text-sm font-bold">Números mais sorteados</p>{top.map(row => <div key={row.number} className="mb-1 flex items-center gap-2 text-xs"><span className="w-8">{String(row.number).padStart(2, "0")}</span><div className="h-3 flex-1 rounded-full bg-white"><div className="h-3 rounded-full bg-emerald-600" style={{width:`${(row.count / max) * 100}%`}}/></div><span className="w-7 text-right">{row.count}</span></div>)}</div>
      <div><p className="mb-2 text-sm font-bold">Distribuição por letra</p>{letters.map((label, i) => <div key={label} className="flex justify-between border-b border-emerald-100 py-2 text-sm"><span>{label}</span><strong>{totals.slice(i * 15, i * 15 + 15).reduce((sum, item) => sum + item.count, 0)}</strong></div>)}</div>
    </div>
    <p className="mt-3 text-xs text-slate-600">A distribuição considera somente o evento selecionado e exclui pedras marcadas como anuladas.</p>
  </div>;
}
