"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/site-tucxa/acervo-vivo";
const PUBLIC_PATH = "/solucoes/organizacao-em-harmonia/tucxa/acervo-vivo";

type TitleRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  authors?: string[] | null;
  publisher?: string | null;
  publication_year?: number | null;
  description?: string | null;
  subjects?: string[] | null;
  cover_url?: string | null;
  totalCopies?: number;
  availableCopies?: number;
};
type CopyRow = { id: string; title_id: string; asset_code: string; legacy_code?: string | null; qr_token: string; shelf?: string | null; shelf_position?: string | null; status: string; condition?: string | null };
type Trail = { id: string; name: string; slug: string; objective?: string | null; description?: string | null };
type TrailItem = { id: string; trail_id: string; item_type: "title" | "resource"; title_id?: string | null; resource_id?: string | null; note?: string | null };
type Resource = { id: string; resource_type: string; title: string; description?: string | null; metadata?: Record<string, unknown> | null };
type ResourceVersion = { id: string; resource_id: string; version_label: string; effective_date?: string | null; source_url?: string | null };
type FolhaYear = { year: number; summary?: string | null; highlights?: string[] | null; events?: Array<{ title?: string; date?: string; description?: string }> | null; photos?: Array<{ url?: string; caption?: string }> | null };
type Payload = {
  disabled?: boolean;
  error?: string;
  reader?: { authenticated?: boolean; personName?: string };
  settings?: { loan_days?: number; reservation_hold_days?: number; pickup_location?: string; self_service_enabled?: boolean };
  titles?: TitleRow[];
  copies?: CopyRow[];
  trails?: Trail[];
  trailItems?: TrailItem[];
  resources?: Resource[];
  resourceVersions?: ResourceVersion[];
  folhaYears?: FolhaYear[];
  selectedCopy?: CopyRow | null;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function resourceYear(resource: Resource) {
  const raw = Number(resource.metadata?.year ?? 0);
  if (raw >= 1900 && raw <= 2200) return raw;
  const match = resource.title.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : 0;
}

function resourceMonth(resource: Resource) {
  const raw = Number(resource.metadata?.month ?? 0);
  return raw >= 1 && raw <= 12 ? raw : 0;
}

function Cover({ title }: { title: TitleRow }) {
  if (!title.cover_url) {
    return <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-xl bg-[#E7F0E2] p-2 text-center text-[10px] font-black leading-4 text-[#123D2C]">{title.title}</div>;
  }
  return <div role="img" aria-label={`Capa de ${title.title}`} className="h-36 w-24 shrink-0 rounded-xl bg-cover bg-center shadow ring-1 ring-black/10" style={{ backgroundImage: `url(${title.cover_url})` }} />;
}

export function AcervoVivoPublicReader() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [identifierOpen, setIdentifierOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<"reserve" | "borrow-now">("reserve");
  const [resolved, setResolved] = useState<{ found: boolean; authEmail?: string; profile?: string } | null>(null);

  const fetchPayload = useCallback(async (): Promise<Payload> => {
    const exemplar = typeof window === "undefined" ? "" : new URL(window.location.href).searchParams.get("exemplar") || "";
    const { data } = await supabaseBrowser.auth.getSession();
    const headers: HeadersInit = data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    const response = await fetch(`${API}${exemplar ? `?exemplar=${encodeURIComponent(exemplar)}` : ""}`, { headers, cache: "no-store" });
    const next = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) throw new Error(next.error || "Não foi possível carregar o Acervo Vivo.");
    return next;
  }, []);

  const load = useCallback(async () => {
    const next = await fetchPayload();
    setPayload(next);
    if (next.selectedCopy?.title_id) setSelectedTitleId(next.selectedCopy.title_id);
  }, [fetchPayload]);

  useEffect(() => {
    let active = true;

    void fetchPayload()
      .then((next) => {
        if (!active) return;
        setPayload(next);
        if (next.selectedCopy?.title_id) setSelectedTitleId(next.selectedCopy.title_id);
      })
      .catch((current) => {
        if (active) setError(current instanceof Error ? current.message : "Erro ao carregar o Acervo Vivo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchPayload]);

  const titles = useMemo(() => payload.titles ?? [], [payload.titles]);
  const copies = useMemo(() => payload.copies ?? [], [payload.copies]);
  const trails = useMemo(() => payload.trails ?? [], [payload.trails]);
  const trailItems = useMemo(() => payload.trailItems ?? [], [payload.trailItems]);
  const resources = useMemo(() => payload.resources ?? [], [payload.resources]);
  const versions = useMemo(() => payload.resourceVersions ?? [], [payload.resourceVersions]);
  const selectedTitle = titles.find((item) => item.id === selectedTitleId) ?? null;
  const selectedCopies = selectedTitle ? copies.filter((copy) => copy.title_id === selectedTitle.id) : [];
  const selectedQrCopy = payload.selectedCopy?.title_id === selectedTitle?.id ? payload.selectedCopy : null;

  const visibleTitles = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return titles;
    return titles.filter((item) => normalize([item.title, ...(item.authors ?? []), ...(item.subjects ?? [])].join(" ")).includes(needle));
  }, [query, titles]);

  const titleMap = useMemo(() => new Map(titles.map((item) => [item.id, item])), [titles]);
  const resourceMap = useMemo(() => new Map(resources.map((item) => [item.id, item])), [resources]);
  const versionMap = useMemo(() => new Map(versions.map((item) => [item.resource_id, item])), [versions]);
  const folhaResources = useMemo(() => resources.filter((item) => item.resource_type === "folha_verde").sort((a, b) => (resourceYear(b) * 100 + resourceMonth(b)) - (resourceYear(a) * 100 + resourceMonth(a))), [resources]);
  const folhaYears = useMemo(() => Array.from(new Set(folhaResources.map(resourceYear).filter(Boolean))).sort((a, b) => b - a), [folhaResources]);

  async function authenticatedAction(action: "reserve" | "borrow-now") {
    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      setPendingAction(action);
      setIdentifierOpen(true);
      setResolved(null);
      return;
    }
    if (!selectedTitle) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(action === "borrow-now"
          ? { action, qrToken: selectedQrCopy?.qr_token }
          : { action, titleId: selectedTitle.id }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; readyForPickup?: boolean; holdUntil?: string; dueAt?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
      setSuccess(action === "borrow-now"
        ? `Empréstimo confirmado. ${result.dueAt ? `Devolução prevista para ${new Date(result.dueAt).toLocaleDateString("pt-BR")}.` : ""}`
        : result.readyForPickup
          ? `Reserva confirmada. O exemplar ficou separado para retirada em ${payload.settings?.pickup_location || "Tucxa"}.`
          : "Você entrou na fila. O Acervo Vivo vai acompanhar a próxima disponibilidade.");
      await load();
    } catch (current) {
      setError(current instanceof Error ? current.message : "Erro ao concluir a operação.");
    } finally { setSaving(false); }
  }

  async function resolveIdentifier(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setResolved(null);
    try {
      const response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resolve-login", identifier }) });
      const result = await response.json().catch(() => ({})) as { error?: string; found?: boolean; authEmail?: string; profile?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível localizar o cadastro.");
      setResolved({ found: result.found === true, authEmail: result.authEmail, profile: result.profile });
    } catch (current) {
      setError(current instanceof Error ? current.message : "Erro ao localizar o cadastro.");
    } finally { setSaving(false); }
  }

  async function signInAndContinue(event: FormEvent) {
    event.preventDefault();
    if (!resolved?.authEmail || !password) return;
    setSaving(true); setError("");
    try {
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: resolved.authEmail, password });
      if (authError) throw new Error("Senha incorreta ou acesso indisponível. Confira os dados ou use a recuperação de senha.");
      setIdentifierOpen(false);
      setPassword("");
      await authenticatedAction(pendingAction);
    } catch (current) {
      setError(current instanceof Error ? current.message : "Não foi possível entrar.");
    } finally { setSaving(false); }
  }

  function registrationHref(kind: "consulente" | "filho") {
    const params = new URLSearchParams();
    if (identifier.includes("@")) params.set("email", identifier.trim());
    else params.set("whatsapp", identifier.trim());
    const returnTo = typeof window === "undefined" ? PUBLIC_PATH : `${window.location.pathname}${window.location.search}`;
    params.set("returnTo", returnTo);
    return kind === "consulente"
      ? `/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?${params.toString()}`
      : `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/primeiro-acesso?${params.toString()}`;
  }

  if (loading) return <section className="mx-auto max-w-6xl px-4 py-8"><p className="rounded-2xl bg-white p-5 font-bold text-[#123D2C] shadow">Carregando o Acervo Vivo...</p></section>;
  if (payload.disabled) return <section className="mx-auto max-w-6xl px-4 py-8"><p className="rounded-2xl bg-white p-5 font-bold text-[#123D2C] shadow">O catálogo público está temporariamente indisponível.</p></section>;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Biblioteca do Tucxa</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Acervo Vivo</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">Pesquise livros, descubra trilhas, consulte o Folha Verde e acompanhe a disponibilidade. Você só precisa se identificar quando decidir reservar ou emprestar um livro.</p>
          {payload.reader?.authenticated && <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">Acesso identificado: {payload.reader.personName || "leitor(a)"}</p>}
        </div>
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800 ring-1 ring-red-200">{error}</p>}
        {success && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200">{success}</p>}
      </section>

      <section id="catalogo" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Catálogo</p><h2 className="mt-1 text-2xl font-black text-[#123D2C]">Encontre o livro pelo celular</h2></div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2F6B43] sm:max-w-sm" placeholder="Título, autor ou tema" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTitles.map((title) => <button key={title.id} type="button" onClick={() => setSelectedTitleId(title.id)} className="flex gap-3 rounded-2xl bg-[#F7FAF2] p-3 text-left ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA]"><Cover title={title} /><span className="min-w-0"><span className="block font-black leading-tight text-[#123D2C]">{title.title}</span><span className="mt-1 block text-xs font-semibold text-slate-600">{title.authors?.join(", ") || "Autor não informado"}</span><span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${Number(title.availableCopies) > 0 ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{Number(title.availableCopies) > 0 ? `${title.availableCopies} disponível(is)` : "Fila de reserva"}</span></span></button>)}
          </div>
        </div>
      </section>

      <section id="trilhas" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Trilhas de estudo</p><h2 className="mt-1 text-2xl font-black text-[#123D2C]">Caminhos para começar e aprofundar</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{trails.map((trail) => <article key={trail.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10"><h3 className="font-black text-[#123D2C]">{trail.name}</h3><p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{trail.objective || trail.description}</p><div className="mt-3 grid gap-1.5">{trailItems.filter((item) => item.trail_id === trail.id).map((item) => { const resource = item.resource_id ? resourceMap.get(item.resource_id) : null; const version = resource ? versionMap.get(resource.id) : null; const label = item.title_id ? titleMap.get(item.title_id)?.title : resource?.title || "Conteúdo"; return version?.source_url ? <Link key={item.id} href={version.source_url} target="_blank" className="rounded-xl bg-[#F7FAF2] px-3 py-2 text-xs font-black text-[#123D2C] underline decoration-[#2F6B43]/30 underline-offset-2">{label} • abrir PDF</Link> : <div key={item.id} className="rounded-xl bg-[#F7FAF2] px-3 py-2 text-xs font-bold text-[#123D2C]">{label}</div>; })}</div></article>)}</div></div>
      </section>

      <section id="folha-verde" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-5 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Memória e formação</p><h2 className="mt-1 text-2xl font-black text-[#123D2C]">Folha Verde por ano</h2><div className="mt-4 grid gap-4">{folhaYears.map((year) => { const memory = (payload.folhaYears ?? []).find((item) => item.year === year); const items = folhaResources.filter((item) => resourceYear(item) === year); return <article key={year} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><h3 className="text-xl font-black text-[#123D2C]">{year}</h3>{memory?.summary && <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{memory.summary}</p>}{memory?.highlights?.length ? <ul className="mt-2 grid gap-1 text-sm font-semibold text-[#123D2C]">{memory.highlights.map((item) => <li key={item}>• {item}</li>)}</ul> : null}{memory?.events?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{memory.events.map((event, index) => <article key={`${event.title || "evento"}-${event.date || index}`} className="rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10"><p className="text-xs font-black text-[#123D2C]">{event.title || "Evento"}</p>{event.date && <p className="mt-1 text-[10px] font-bold text-[#2F6B43]">{event.date}</p>}{event.description && <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{event.description}</p>}</article>)}</div> : null}<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map((resource) => { const version = versionMap.get(resource.id); return <article key={resource.id} className="rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">{resource.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{version?.version_label || "Versão vigente"}</p>{version?.source_url && <Link target="_blank" href={version.source_url} className="mt-2 inline-flex rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Abrir PDF</Link>}</article>; })}</div>{memory?.photos?.length ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{memory.photos.filter((photo) => photo.url).map((photo) => <div key={`${photo.url}-${photo.caption}`} className="overflow-hidden rounded-xl bg-white ring-1 ring-[#123D2C]/10"><div className="aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${photo.url})` }} />{photo.caption && <p className="p-2 text-[10px] font-bold text-[#123D2C]">{photo.caption}</p>}</div>)}</div> : null}</article>; })}</div></div>
      </section>

      {selectedTitle && <div className="fixed inset-0 z-[220] flex items-end justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedTitleId(""); }}><section role="dialog" aria-modal="true" aria-label={selectedTitle.title} className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><Cover title={selectedTitle} /><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Livro do Acervo Vivo</p><h2 className="mt-1 text-xl font-black text-[#123D2C]">{selectedTitle.title}</h2><p className="mt-1 text-xs font-semibold text-slate-600">{selectedTitle.authors?.join(", ") || "Autor não informado"}</p></div></div><button type="button" onClick={() => setSelectedTitleId("")} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button></div>{selectedTitle.description && <p className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700">{selectedTitle.description}</p>}<div className="mt-3 rounded-2xl bg-[#E9F2E7] p-4"><p className="font-black text-[#123D2C]">Disponibilidade</p><p className="mt-1 text-sm font-semibold text-slate-700">{selectedCopies.filter((item) => item.status === "disponivel").length} disponível(is) de {selectedCopies.length} exemplar(es).</p>{selectedQrCopy && <p className="mt-2 text-xs font-bold text-[#2F6B43]">Você abriu o QR do exemplar {selectedQrCopy.asset_code}. Se estiver fisicamente no {payload.settings?.pickup_location || "Tucxa"}, pode registrar a retirada agora.</p>}</div><div className="mt-4 grid gap-2">{selectedQrCopy?.status === "disponivel" && payload.settings?.self_service_enabled !== false && <button disabled={saving} type="button" onClick={() => void authenticatedAction("borrow-now")} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Estou no Tucxa — emprestar agora</button>}<button disabled={saving} type="button" onClick={() => void authenticatedAction("reserve")} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 disabled:opacity-50">{Number(selectedTitle.availableCopies) > 0 ? `Reservar para retirada em ${payload.settings?.pickup_location || "Tucxa"}` : "Entrar na fila e ser avisado"}</button></div></section></div>}

      {identifierOpen && <div className="fixed inset-0 z-[240] flex items-end justify-center bg-[#10251C]/80 p-2 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setIdentifierOpen(false); }}><section role="dialog" aria-modal="true" aria-label="Identificação para empréstimo ou reserva" className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Só agora precisamos identificar você</p><h2 className="mt-1 text-xl font-black text-[#123D2C]">Finalize sua {pendingAction === "borrow-now" ? "retirada" : "reserva"}</h2></div><button type="button" onClick={() => setIdentifierOpen(false)} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button></div>{!resolved && <form onSubmit={resolveIdentifier} className="mt-4 grid gap-3"><label className="grid gap-1 text-sm font-black text-[#123D2C]">WhatsApp ou e-mail<input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-[#2F6B43]" placeholder="(19) 99999-9999 ou seu@email.com" /></label><button disabled={saving} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Continuar</button></form>}{resolved?.found && <form onSubmit={signInAndContinue} className="mt-4 grid gap-3"><p className="rounded-2xl bg-[#E9F2E7] p-3 text-sm font-bold text-[#123D2C]">Cadastro localizado. Confirme sua senha para concluir. Em empréstimos, o cadastro precisa conter nome, WhatsApp e e-mail válido.</p><label className="grid gap-1 text-sm font-black text-[#123D2C]">Senha<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-[#2F6B43]" /></label><button disabled={saving} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Entrar e finalizar</button></form>}{resolved && !resolved.found && <div className="mt-4"><p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">Cadastro não localizado. O cadastro é necessário somente uma vez; depois você poderá usar o mesmo acesso no Acervo Vivo.</p><div className="mt-3 grid gap-2"><Link href={registrationHref("consulente")} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white">Sou Consulente / Filho de Fora</Link><Link href={registrationHref("filho")} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Sou Filho da Corrente</Link></div></div>}</section></div>}
    </>
  );
}
