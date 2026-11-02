"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getBncClient } from "@/lib/bingo-no-controle/client";

type EventRow = { id: string; title: string; slug: string; starts_at: string | null; status: string; venue: string | null };
type RoundRow = { id: string; event_id: string; round_number: number; title: string; status: string };
type DrawRow = { round_id: string; number: number; is_voided: boolean };
type AwardRow = { round_id: string; label: string };

type View = "loading" | "setup" | "login" | "denied" | "ready" | "error";

const organizationSlug = "tucxa";
const bncEnvironment = process.env.NEXT_PUBLIC_BNC_ENV === "production" ? "Produção" : "Homologação";

function prettyDate(value: string | null) {
  if (!value) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default function BingoTucxaAdminPage() {
  const [view, setView] = useState<View>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState("");

  const load = useCallback(async () => {
    const supabase = getBncClient();
    if (!supabase) { setView("setup"); return; }
    // Captura uma referência não nula para o helper assíncrono de paginação.
    // O TypeScript não precisa reavaliar a nulidade dentro da função interna.
    const activeClient = supabase;
    setView("loading");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) { setView("login"); return; }
    setCurrentEmail(userData.user.email || "Usuário autenticado");
    const { data: org, error: orgError } = await supabase
      .from("bnc_organizations").select("id").eq("slug", organizationSlug).maybeSingle();
    if (orgError) { setMessage("Falha ao verificar a organização."); setView("error"); return; }
    if (!org) { setView("denied"); return; }
    const { data: member, error: memberError } = await supabase
      .from("bnc_members").select("role").eq("organization_id", org.id).eq("user_id", userData.user.id).maybeSingle();
    if (memberError) { setMessage("Não foi possível validar suas permissões."); setView("error"); return; }
    if (!member || !["owner", "manager", "operator", "finance", "viewer"].includes(member.role)) {
      setView("denied"); return;
    }
    const { data: eventData, error: eventError } = await supabase.from("bnc_events")
      .select("id,title,slug,starts_at,status,venue").eq("organization_id", org.id)
      .order("starts_at", { ascending: false });
    if (eventError) { setMessage("Não foi possível carregar eventos autorizados."); setView("error"); return; }
    const foundEvents = (eventData || []) as EventRow[];
    setEvents(foundEvents);
    setSelected((prev) => prev && foundEvents.some((e) => e.id === prev) ? prev : (foundEvents[0]?.id ?? null));
    const ids = foundEvents.map((e) => e.id);
    if (ids.length === 0) { setRounds([]); setDraws([]); setAwards([]); setView("ready"); return; }
    const { data: roundData, error: roundError } = await supabase.from("bnc_rounds")
      .select("id,event_id,round_number,title,status").in("event_id", ids).order("round_number");
    if (roundError) { setMessage("Falha ao consultar rodadas."); setView("error"); return; }
    const foundRounds = (roundData || []) as RoundRow[];
    setRounds(foundRounds);
    const roundIds = foundRounds.map((r) => r.id);
    if (roundIds.length === 0) { setDraws([]); setAwards([]); setView("ready"); return; }
    // Paginação explícita: a consulta de histórico não depende do limite padrão de 1000 linhas.
    async function allPages<T>(table: "bnc_draws" | "bnc_awards", columns: string): Promise<T[]> {
      const output: T[] = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await activeClient.from(table).select(columns).in("round_id", roundIds).order("id", { ascending: true }).range(start, start + 499);
        if (error) throw error;
        const page = (data ?? []) as unknown as T[];
        output.push(...page);
        if (page.length < 500) return output;
        if (start >= 49500) throw new Error("Limite de consulta atingido.");
      }
    }
    try {
      const [foundDraws, foundAwards] = await Promise.all([
        allPages<DrawRow>("bnc_draws", "round_id,number,is_voided"),
        allPages<AwardRow>("bnc_awards", "round_id,label"),
      ]);
      setDraws(foundDraws); setAwards(foundAwards); setView("ready");
    } catch {
      setMessage("Falha ao consultar o histórico de sorteios e premiações."); setView("error");
    }
  }, []);

  useEffect(() => {
    // Executa a carga inicial em uma continuação assíncrona, evitando
    // setState síncrono no corpo do effect (react-hooks/set-state-in-effect).
    let mounted = true;
    void Promise.resolve().then(() => {
      if (mounted) void load();
    });
    return () => { mounted = false; };
  }, [load]);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const client = getBncClient();
    if (!client) { setView("setup"); setBusy(false); return; }
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setPassword(""); setBusy(false);
    if (error) { setMessage("Não foi possível entrar. Confira suas credenciais e autorização."); return; }
    await load();
  }

  async function signOut() {
    await getBncClient()?.auth.signOut();
    setEvents([]); setRounds([]); setDraws([]); setAwards([]); setCurrentEmail(""); setView("login");
  }

  const event = events.find((e) => e.id === selected);
  const eventRounds = rounds.filter((r) => r.event_id === selected);
  const roundSet = new Set(eventRounds.map((r) => r.id));
  const totalDraws = draws.filter((d) => roundSet.has(d.round_id) && !d.is_voided).length;
  const totalAwards = awards.filter((a) => roundSet.has(a.round_id)).length;

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-[#173e2c]">
      <header className="border-b border-emerald-200 bg-white px-5 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Bingo no Controle · {bncEnvironment}</p><h1 className="text-2xl font-black">Administração do Bingo do TUCXA</h1></div>
          <div className="flex items-center gap-4 text-sm"><Link className="underline" href="/solucoes/bingo-no-controle/cliente/tucxa">Página pública</Link>{view === "ready" || view === "denied" ? <button type="button" className="rounded-lg bg-[#135038] px-4 py-2 font-semibold text-white" onClick={() => void signOut()}>Sair</button> : null}</div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-5 sm:py-10">
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Ambiente {bncEnvironment} · Consulta somente leitura. Não há cadastro, edição, sorteio ou venda de cartelas nesta etapa.</div>
        {view === "loading" && <p aria-live="polite">Verificando sua sessão e permissões...</p>}
        {view === "setup" && <p role="alert" className="rounded-xl bg-white p-6">Integração ainda não configurada. Defina as variáveis públicas BNC do ambiente correspondente na Vercel ou no ambiente local.</p>}
        {view === "login" && <form onSubmit={(e) => void signIn(e)} className="max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Entrar na administração</h2><p className="text-sm text-slate-600">Use uma conta cadastrada no Auth do ambiente atual e vinculada à organização TUCXA.</p>
          <label className="block text-sm font-semibold">E-mail<input className="mt-1 w-full rounded-lg border p-3" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm font-semibold">Senha<input className="mt-1 w-full rounded-lg border p-3" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-[#135038] p-3 font-bold text-white disabled:opacity-50">{busy ? "Aguarde..." : "Entrar"}</button>
        </form>}
        {view === "denied" && <p role="alert" className="rounded-xl bg-white p-6">Seu usuário não tem acesso à administração da organização TUCXA. Solicite autorização ao responsável.</p>}
        {view === "error" && <div role="alert" className="space-y-3 rounded-xl bg-white p-6"><p>{message}</p><button onClick={() => void load()} className="rounded-lg border p-2">Tentar novamente</button></div>}
        {view === "ready" && <div className="space-y-6"><p className="text-sm text-slate-600">Conectado como {currentEmail}. Exibindo exclusivamente eventos autorizados para o TUCXA.</p>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">Eventos</h2><span className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold">{events.length} cadastrado(s)</span></div>
          {events.length === 0 ? <p className="rounded-xl bg-white p-6">Nenhum evento disponível para esta organização.</p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{events.map((e) => <button key={e.id} type="button" onClick={() => setSelected(e.id)} className={`rounded-xl border p-5 text-left shadow-sm ${selected === e.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-bold uppercase text-emerald-700">{e.status}</p><h3 className="mt-2 text-lg font-extrabold">{e.title}</h3><p className="mt-2 text-sm">{prettyDate(e.starts_at)}</p><p className="mt-1 text-sm text-slate-600">{e.venue || "Local não informado"}</p></button>)}</div>}
          {event && <section className="rounded-2xl border border-emerald-200 bg-white p-5 sm:p-8"><p className="text-xs font-bold uppercase text-emerald-700">Evento selecionado</p><h2 className="mt-2 text-2xl font-black">{event.title}</h2><div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Rodadas",eventRounds.length],["Números sorteados válidos",totalDraws],["Premiações",totalAwards]].map(([label,value]) => <div key={String(label)} className="rounded-xl bg-emerald-50 p-4"><p className="text-sm">{label}</p><strong className="text-3xl">{value}</strong></div>)}</div><h3 className="mt-7 text-xl font-bold">Rodadas</h3><div className="mt-3 space-y-2">{eventRounds.map((r) => { const n = draws.filter((d) => d.round_id === r.id && !d.is_voided).length; const a = awards.filter((d) => d.round_id === r.id).length; return <div key={r.id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3"><span><strong>{r.round_number}. {r.title}</strong> <span className="text-xs text-slate-500">({r.status})</span></span><span className="text-sm">{n} sorteios · {a} premiações</span></div>; })}</div></section>}
        </div>}
      </main>
    </div>
  );
}
