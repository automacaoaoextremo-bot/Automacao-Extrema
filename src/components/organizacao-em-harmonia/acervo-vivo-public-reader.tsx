"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/site-tucxa/acervo-vivo";
const PUBLIC_PATH = "/solucoes/organizacao-em-harmonia/tucxa/acervo-vivo";
const PAGE_SIZE = 4;

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

type CopyRow = {
  id: string;
  title_id: string;
  asset_code: string;
  legacy_code?: string | null;
  qr_token: string;
  shelf?: string | null;
  shelf_position?: string | null;
  status: string;
  condition?: string | null;
};

type Trail = {
  id: string;
  name: string;
  slug: string;
  objective?: string | null;
  description?: string | null;
};

type TrailItem = {
  id: string;
  trail_id: string;
  item_type: "title" | "resource";
  title_id?: string | null;
  resource_id?: string | null;
  note?: string | null;
};

type Resource = {
  id: string;
  resource_type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ResourceVersion = {
  id: string;
  resource_id: string;
  version_label: string;
  effective_date?: string | null;
  source_url?: string | null;
};

type Payload = {
  disabled?: boolean;
  error?: string;
  reader?: {
    authenticated?: boolean;
    personName?: string;
    profile?: "filho-da-corrente" | "consulente" | "outro";
  };
  settings?: {
    loan_days?: number;
    reservation_hold_days?: number;
    pickup_location?: string;
    self_service_enabled?: boolean;
  };
  titles?: TitleRow[];
  copies?: CopyRow[];
  trails?: Trail[];
  trailItems?: TrailItem[];
  resources?: Resource[];
  resourceVersions?: ResourceVersion[];
  selectedCopy?: CopyRow | null;
};

type View = "descobrir" | "trilhas";
type PendingAction = "reserve" | "borrow-now" | "my-books";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function resourceYear(resource?: Resource | null) {
  const raw = Number(resource?.metadata?.year ?? 0);
  if (raw >= 1900 && raw <= 2200) return raw;
  const match = resource?.title.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : 0;
}

function resourceMonth(resource?: Resource | null) {
  const raw = Number(resource?.metadata?.month ?? 0);
  return raw >= 1 && raw <= 12 ? raw : 0;
}

function resourceChronology(resource?: Resource | null) {
  return resourceYear(resource) * 100 + resourceMonth(resource);
}

function monthLabel(month: number) {
  return ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][month] || "Edição";
}

function profileHref(profile?: string) {
  return profile === "consulente"
    ? "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/atendimento/acervo-vivo"
    : "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/acervo-vivo";
}

function Cover({ title, compact = false }: { title: TitleRow; compact?: boolean }) {
  const size = compact ? "h-16 w-11" : "h-28 w-20 sm:h-32 sm:w-24";
  if (!title.cover_url) {
    return <div className={`flex ${size} shrink-0 items-center justify-center rounded-lg bg-[#E6EFE3] p-1.5 text-center text-[9px] font-black leading-3 text-[#123D2C] ring-1 ring-[#123D2C]/10`}>{title.title}</div>;
  }
  return <div role="img" aria-label={`Capa de ${title.title}`} className={`${size} shrink-0 rounded-lg bg-cover bg-center shadow ring-1 ring-black/10`} style={{ backgroundImage: `url(${title.cover_url})` }} />;
}

function Modal({ title, eyebrow, onClose, children, z = 200 }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode; z?: number }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-4" style={{ zIndex: z }} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-xl bg-[#F4F8F1] px-3 py-2 text-xs font-black text-[#123D2C] disabled:opacity-35">Anterior</button>
      <span className="text-xs font-black text-slate-500">{page}/{pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-xl bg-[#F4F8F1] px-3 py-2 text-xs font-black text-[#123D2C] disabled:opacity-35">Próxima</button>
    </div>
  );
}

function AccessButton({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-24 rounded-2xl bg-white px-2 py-3 text-center shadow ring-1 ring-[#123D2C]/10 transition active:scale-[0.98]">
      <span className="block text-sm font-black leading-tight text-[#123D2C]">{title}</span>
      <span className="mt-1 block text-[10px] font-bold leading-4 text-slate-500">{detail}</span>
      <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
    </button>
  );
}

export function AcervoVivoPublicReader() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [query, setQuery] = useState("");
  const [titlePage, setTitlePage] = useState(1);
  const [trailPage, setTrailPage] = useState(1);
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [selectedTrailId, setSelectedTrailId] = useState("");
  const [selectedFolhaYear, setSelectedFolhaYear] = useState<number | null>(null);
  const [identifierOpen, setIdentifierOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>("reserve");
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
    return () => { active = false; };
  }, [fetchPayload]);

  const titles = useMemo(() => payload.titles ?? [], [payload.titles]);
  const copies = useMemo(() => payload.copies ?? [], [payload.copies]);
  const trails = useMemo(() => payload.trails ?? [], [payload.trails]);
  const trailItems = useMemo(() => payload.trailItems ?? [], [payload.trailItems]);
  const resources = useMemo(() => payload.resources ?? [], [payload.resources]);
  const versions = useMemo(() => payload.resourceVersions ?? [], [payload.resourceVersions]);
  const titleMap = useMemo(() => new Map(titles.map((item) => [item.id, item])), [titles]);
  const resourceMap = useMemo(() => new Map(resources.map((item) => [item.id, item])), [resources]);
  const versionMap = useMemo(() => new Map(versions.map((item) => [item.resource_id, item])), [versions]);
  const selectedTitle = selectedTitleId ? titleMap.get(selectedTitleId) ?? null : null;
  const selectedCopies = selectedTitle ? copies.filter((copy) => copy.title_id === selectedTitle.id) : [];
  const selectedQrCopy = payload.selectedCopy?.title_id === selectedTitle?.id ? payload.selectedCopy : null;
  const selectedTrail = selectedTrailId ? trails.find((item) => item.id === selectedTrailId) ?? null : null;

  const filteredTitles = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return titles;
    return titles.filter((item) => normalize([item.title, ...(item.authors ?? []), ...(item.subjects ?? [])].join(" ")).includes(needle));
  }, [query, titles]);
  const currentTitles = filteredTitles.slice((titlePage - 1) * PAGE_SIZE, titlePage * PAGE_SIZE);
  const currentTrails = trails.slice((trailPage - 1) * PAGE_SIZE, trailPage * PAGE_SIZE);

  const selectedTrailItems = useMemo(() => {
    if (!selectedTrail) return [] as TrailItem[];
    const items = trailItems.filter((item) => item.trail_id === selectedTrail.id);
    if (selectedTrail.slug !== "folha-verde-edicoes") return items;
    return [...items].sort((left, right) => {
      const leftResource = left.resource_id ? resourceMap.get(left.resource_id) : null;
      const rightResource = right.resource_id ? resourceMap.get(right.resource_id) : null;
      return resourceChronology(rightResource) - resourceChronology(leftResource);
    });
  }, [resourceMap, selectedTrail, trailItems]);

  const folhaYears = useMemo(() => {
    if (selectedTrail?.slug !== "folha-verde-edicoes") return [] as number[];
    return Array.from(new Set(selectedTrailItems.map((item) => {
      const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
      return resourceYear(resource);
    }).filter((year) => year >= 1900 && year <= 2200))).sort((a, b) => b - a);
  }, [resourceMap, selectedTrail?.slug, selectedTrailItems]);

  const selectedFolhaYearItems = useMemo(() => {
    if (!selectedFolhaYear) return [] as TrailItem[];
    return selectedTrailItems.filter((item) => {
      const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
      return resourceYear(resource) === selectedFolhaYear;
    }).sort((left, right) => {
      const leftResource = left.resource_id ? resourceMap.get(left.resource_id) : null;
      const rightResource = right.resource_id ? resourceMap.get(right.resource_id) : null;
      return resourceChronology(rightResource) - resourceChronology(leftResource);
    });
  }, [resourceMap, selectedFolhaYear, selectedTrailItems]);

  async function authenticatedAction(action: "reserve" | "borrow-now") {
    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      setPendingAction(action);
      setResolved(null);
      setIdentifierOpen(true);
      return;
    }
    if (!selectedTitle) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(action === "borrow-now" ? { action, qrToken: selectedQrCopy?.qr_token } : { action, titleId: selectedTitle.id }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; readyForPickup?: boolean; dueAt?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
      setSuccess(action === "borrow-now"
        ? `Empréstimo confirmado. ${result.dueAt ? `Devolução prevista para ${new Date(result.dueAt).toLocaleDateString("pt-BR")}.` : ""}`
        : result.readyForPickup
          ? `Reserva confirmada. O exemplar ficou separado para retirada em ${payload.settings?.pickup_location || "Tucxa 1"}.`
          : "Você entrou na fila e será avisado quando houver disponibilidade.");
      await load();
    } catch (current) {
      setError(current instanceof Error ? current.message : "Erro ao concluir a operação.");
    } finally {
      setSaving(false);
    }
  }

  async function openMyBooks() {
    const { data } = await supabaseBrowser.auth.getSession();
    if (data.session?.access_token) {
      window.location.assign(profileHref(payload.reader?.profile));
      return;
    }
    setPendingAction("my-books");
    setResolved(null);
    setIdentifierOpen(true);
  }

  async function resolveIdentifier(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setResolved(null);
    try {
      const response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resolve-login", identifier }) });
      const result = await response.json().catch(() => ({})) as { error?: string; found?: boolean; authEmail?: string; profile?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível localizar o cadastro.");
      setResolved({ found: result.found === true, authEmail: result.authEmail, profile: result.profile });
    } catch (current) {
      setError(current instanceof Error ? current.message : "Erro ao localizar o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  async function signInAndContinue(event: FormEvent) {
    event.preventDefault();
    if (!resolved?.authEmail || !password) return;
    setSaving(true);
    setError("");
    try {
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email: resolved.authEmail, password });
      if (authError) throw new Error("Senha incorreta ou acesso indisponível. Confira os dados ou use a recuperação de senha.");
      setIdentifierOpen(false);
      setPassword("");
      if (pendingAction === "my-books") {
        window.location.assign(profileHref(resolved.profile));
        return;
      }
      await authenticatedAction(pendingAction);
    } catch (current) {
      setError(current instanceof Error ? current.message : "Não foi possível entrar.");
    } finally {
      setSaving(false);
    }
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

  if (loading) return <section className="mx-auto max-w-5xl px-3 py-4 sm:px-6"><p className="rounded-2xl bg-white p-5 font-bold text-[#123D2C] shadow">Carregando o Acervo Vivo...</p></section>;
  if (payload.disabled) return <section className="mx-auto max-w-5xl px-3 py-4 sm:px-6"><p className="rounded-2xl bg-white p-5 font-bold text-[#123D2C] shadow">O catálogo público está temporariamente indisponível.</p></section>;

  return (
    <>
      <section className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7]">Acervo Vivo • Biblioteca do Tucxa</p>
          <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">O que você quer estudar hoje?</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-5 text-[#EEF7EA]">Encontre livros, materiais da Casa e trilhas que ajudem a transformar uma dúvida em próximo passo de estudo. Você só precisa se identificar quando decidir reservar ou emprestar.</p>
          {payload.reader?.authenticated && <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">Acesso identificado: {payload.reader.personName || "leitor(a)"}</p>}
        </section>

        {(error || success) && <div className={`mt-3 rounded-2xl p-3 text-sm font-bold ring-1 ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}>{error || success}</div>}

        <section className="mt-3 grid grid-cols-3 gap-2">
          <AccessButton title="Descobrir" detail={`${titles.length} títulos`} onClick={() => { setView("descobrir"); setTitlePage(1); }} />
          <AccessButton title="Trilhas" detail={`${trails.length} caminhos`} onClick={() => { setView("trilhas"); setTrailPage(1); }} />
          <AccessButton title="Meus livros" detail="empréstimos e reservas" onClick={() => void openMyBooks()} />
        </section>
      </section>

      {view === "descobrir" && <Modal title="Descobrir o Acervo" eyebrow="Livros e exemplares" onClose={() => setView(null)}>
        <label className="grid gap-1 text-xs font-black text-[#123D2C]">Buscar por título, autor ou tema<input value={query} onChange={(event) => { setQuery(event.target.value); setTitlePage(1); }} className="rounded-xl border border-[#123D2C]/15 bg-[#F9FBF7] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#2F6B43]" placeholder="Ex.: mediunidade, Umbanda, cambono..." /></label>
        <div className="mt-3 grid gap-2">
          {currentTitles.map((title) => <button key={title.id} type="button" onClick={() => setSelectedTitleId(title.id)} className="flex items-center gap-3 rounded-2xl bg-[#F7FAF2] p-2.5 text-left ring-1 ring-[#123D2C]/10"><Cover title={title} compact /><span className="min-w-0 flex-1"><span className="block font-black text-[#123D2C]">{title.title}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{title.authors?.join(", ") || "Autor não informado"}</span><span className="mt-1 block text-[10px] font-black text-[#2F6B43]">{Number(title.availableCopies) > 0 ? `${title.availableCopies} disponível(is)` : "Fila de reserva"}</span></span></button>)}
          {filteredTitles.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum título encontrado.</p>}
        </div>
        <Pager page={titlePage} total={filteredTitles.length} onChange={setTitlePage} />
      </Modal>}

      {view === "trilhas" && <Modal title="Trilhas de estudo" eyebrow="Caminhos para começar e aprofundar" onClose={() => setView(null)}>
        <div className="grid gap-2 sm:grid-cols-2">
          {currentTrails.map((trail) => <button key={trail.id} type="button" onClick={() => { setSelectedTrailId(trail.id); setSelectedFolhaYear(null); }} className="rounded-2xl bg-[#F7FAF2] p-4 text-left ring-1 ring-[#123D2C]/10"><span className="font-black text-[#123D2C]">{trail.name}</span><span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{trail.objective || trail.description}</span><span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">TOQUE PARA ABRIR</span></button>)}
        </div>
        <Pager page={trailPage} total={trails.length} onChange={setTrailPage} />
      </Modal>}

      {selectedTrail && <Modal title={selectedTrail.name} eyebrow="Trilha de estudos" z={220} onClose={() => { setSelectedTrailId(""); setSelectedFolhaYear(null); }}>
        <p className="rounded-2xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-6 text-slate-600">{selectedTrail.objective || selectedTrail.description || "Conteúdos selecionados para esta trilha."}</p>
        {selectedTrail.slug === "folha-verde-edicoes" ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {folhaYears.map((year) => <button key={year} type="button" onClick={() => setSelectedFolhaYear(year)} className="min-h-20 rounded-2xl bg-[#E7F0E2] p-3 text-center text-xl font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{year}<span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">TOQUE PARA ABRIR</span></button>)}
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            {selectedTrailItems.map((item, index) => {
              const title = item.title_id ? titleMap.get(item.title_id) : null;
              const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
              const version = resource ? versionMap.get(resource.id) : null;
              const label = title?.title || resource?.title || "Conteúdo";
              return <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{index + 1}. {item.item_type === "title" ? "Livro" : "Material"}</p><p className="mt-1 font-black text-[#123D2C]">{label}</p>{item.note && <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.note}</p>}{title && <button type="button" onClick={() => setSelectedTitleId(title.id)} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Ver livro</button>}{version?.source_url && <Link href={version.source_url} target="_blank" className="mt-2 inline-flex rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Abrir PDF</Link>}</article>;
            })}
          </div>
        )}
      </Modal>}

      {selectedFolhaYear && <Modal title={`${selectedFolhaYear}`} eyebrow="Folha Verde • edições" z={240} onClose={() => setSelectedFolhaYear(null)}>
        <p className="rounded-2xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-6 text-slate-600">Edições em ordem das mais recentes para as mais antigas.</p>
        <div className="mt-3 grid gap-2">
          {selectedFolhaYearItems.map((item) => {
            const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
            const version = resource ? versionMap.get(resource.id) : null;
            const startMonth = resourceMonth(resource);
            const endMonth = Number(resource?.metadata?.month_end ?? startMonth);
            const label = endMonth > startMonth ? `${monthLabel(startMonth)}-${monthLabel(endMonth)}` : monthLabel(startMonth);
            return <article key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><div><p className="font-black text-[#123D2C]">{label}</p><p className="mt-1 text-xs font-semibold text-slate-500">{version?.version_label || "Versão vigente"}</p></div>{version?.source_url ? <Link href={version.source_url} target="_blank" className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Abrir PDF</Link> : <span className="text-xs font-bold text-slate-400">PDF pendente</span>}</article>;
          })}
        </div>
      </Modal>}

      {selectedTitle && <Modal title={selectedTitle.title} eyebrow="Livro do Acervo Vivo" z={260} onClose={() => setSelectedTitleId("")}>
        <div className="flex gap-3"><Cover title={selectedTitle} /><div className="min-w-0"><p className="text-xs font-semibold text-slate-600">{selectedTitle.authors?.join(", ") || "Autor não informado"}</p>{selectedTitle.description && <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{selectedTitle.description}</p>}</div></div>
        <div className="mt-3 rounded-2xl bg-[#E9F2E7] p-4"><p className="font-black text-[#123D2C]">Disponibilidade</p><p className="mt-1 text-sm font-semibold text-slate-700">{selectedCopies.filter((item) => item.status === "disponivel").length} disponível(is) de {selectedCopies.length} exemplar(es).</p>{selectedQrCopy && <p className="mt-2 text-xs font-bold text-[#2F6B43]">Você abriu o QR do exemplar {selectedQrCopy.asset_code}. Se estiver fisicamente em {payload.settings?.pickup_location || "Tucxa 1"}, pode registrar a retirada agora.</p>}</div>
        <div className="mt-4 grid gap-2">
          {selectedQrCopy?.status === "disponivel" && payload.settings?.self_service_enabled !== false && <button disabled={saving} type="button" onClick={() => void authenticatedAction("borrow-now")} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Estou no {payload.settings?.pickup_location || "Tucxa 1"} — emprestar agora</button>}
          <button disabled={saving} type="button" onClick={() => void authenticatedAction("reserve")} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 disabled:opacity-50">{Number(selectedTitle.availableCopies) > 0 ? `Reservar para retirada em ${payload.settings?.pickup_location || "Tucxa 1"}` : "Quero ser avisado e entrar na fila"}</button>
          {Number(selectedTitle.availableCopies) <= 0 && <p className="text-xs font-semibold leading-5 text-slate-500">Se uma reserva anterior não for retirada no prazo ou quando o livro for devolvido, o sistema oferece o exemplar à próxima pessoa da fila e envia o aviso configurado.</p>}
        </div>
      </Modal>}

      {identifierOpen && <Modal title={`Finalize sua ${pendingAction === "borrow-now" ? "retirada" : pendingAction === "my-books" ? "identificação" : "reserva"}`} eyebrow="Só agora precisamos identificar você" z={300} onClose={() => setIdentifierOpen(false)}>
        {!resolved && <form onSubmit={resolveIdentifier} className="grid gap-3"><label className="grid gap-1 text-sm font-black text-[#123D2C]">WhatsApp ou e-mail<input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-[#2F6B43]" placeholder="(19) 99999-9999 ou seu@email.com" /></label><button disabled={saving} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Continuar</button></form>}
        {resolved?.found && <form onSubmit={signInAndContinue} className="grid gap-3"><p className="rounded-2xl bg-[#E9F2E7] p-3 text-sm font-bold text-[#123D2C]">Cadastro localizado. Confirme sua senha para concluir. Para empréstimos, o cadastro precisa conter nome, WhatsApp e e-mail válido.</p><label className="grid gap-1 text-sm font-black text-[#123D2C]">Senha<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-[#2F6B43]" /></label><button disabled={saving} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Entrar e finalizar</button></form>}
        {resolved && !resolved.found && <div><p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">Cadastro não localizado. O cadastro é necessário somente uma vez; depois você poderá usar o mesmo acesso no Acervo Vivo.</p><div className="mt-3 grid gap-2"><Link href={registrationHref("consulente")} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white">Sou Consulente / Filho de Fora</Link><Link href={registrationHref("filho")} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Sou Filho da Corrente</Link></div></div>}
      </Modal>}
    </>
  );
}
