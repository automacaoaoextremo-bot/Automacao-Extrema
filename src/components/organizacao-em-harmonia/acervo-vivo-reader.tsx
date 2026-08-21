"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

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
  status: string;
  asset_code?: string | null;
  legacy_code?: string | null;
  shelf?: string | null;
  shelf_position?: string | null;
  condition?: string | null;
};

type LoanRow = {
  id: string;
  copy_id: string;
  due_at: string;
  returned_at?: string | null;
  status: string;
  renewed_count?: number;
  title?: TitleRow | null;
  copy?: CopyRow | null;
};

type ReservationRow = {
  id: string;
  title_id: string;
  status: string;
  requested_at: string;
  hold_until?: string | null;
  title?: TitleRow | null;
  copy?: CopyRow | null;
};

type ResourceRow = {
  id: string;
  resource_type: string;
  title: string;
  description?: string | null;
  governance_status?: string;
  metadata?: {
    year?: number | string;
    month?: number | string;
    [key: string]: unknown;
  } | null;
};

type ResourceVersion = {
  id: string;
  resource_id: string;
  version_label: string;
  source_url?: string | null;
  storage_path?: string | null;
  is_current: boolean;
};

type Trail = {
  id: string;
  name: string;
  slug?: string;
  objective?: string | null;
  description?: string | null;
  official?: boolean;
  level?: string;
};

type TrailItem = {
  id: string;
  trail_id: string;
  item_type: "title" | "resource";
  title_id?: string | null;
  resource_id?: string | null;
  required?: boolean;
  note?: string | null;
};

type Curation = {
  id: string;
  curation_type: string;
  title: string;
  description?: string | null;
  title_id?: string | null;
  resource_id?: string | null;
  starts_at?: string | null;
};

type Payload = {
  reader?: { personName?: string; profile?: string };
  catalogWarning?: string | null;
  settings?: {
    loan_days?: number;
    daily_late_fee?: number;
    max_active_loans?: number;
    renewal_limit?: number;
    reservation_hold_days?: number;
    member_loans_enabled?: boolean;
    member_reservations_enabled?: boolean;
    member_renewals_enabled?: boolean;
    block_new_loans_with_overdue?: boolean;
    block_new_loans_with_pending_fee?: boolean;
  };
  titles?: TitleRow[];
  copies?: CopyRow[];
  trails?: Trail[];
  trailItems?: TrailItem[];
  resources?: ResourceRow[];
  resourceVersions?: ResourceVersion[];
  curations?: Curation[];
  myLoans?: LoanRow[];
  myReservations?: ReservationRow[];
};

type Props = {
  api: string;
  backHref: string;
  homeHref: string;
  header: ReactNode;
  audienceLabel: string;
};

type View = "descobrir" | "trilhas" | "meus";
type MyView = "emprestimos" | "reservas";

const PAGE_SIZE = 4;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function typeLabel(value: string) {
  const labels: Record<string, string> = {
    regulamento: "Regulamento",
    procedimento: "Procedimento",
    manual: "Manual",
    folha_verde: "Folha Verde",
    apostila: "Apostila",
    video: "Vídeo",
    podcast: "Podcast",
    audio: "Áudio",
    memoria_da_casa: "Memória da Casa",
    outro: "Conteúdo",
  };
  return labels[value] ?? value;
}

function copyStatusLabel(value: string) {
  const labels: Record<string, string> = {
    disponivel: "Disponível",
    emprestado: "Emprestado",
    reservado: "Reservado",
    manutencao: "Em manutenção",
    perdido: "Não localizado",
    baixado: "Baixado",
  };
  return labels[value] ?? value;
}

function resourceChronology(resource?: ResourceRow | null) {
  const year = Number(resource?.metadata?.year ?? 0);
  const month = Number(resource?.metadata?.month ?? 0);
  return (Number.isFinite(year) ? year : 0) * 100 + (Number.isFinite(month) ? month : 0);
}

function initialKey(title: string) {
  const first = normalize(title.trim()).charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return "0-9";
  return "#";
}

function Cover({ title, compact = false }: { title: TitleRow; compact?: boolean }) {
  const size = compact ? "h-16 w-11" : "h-28 w-20 sm:h-32 sm:w-24";
  if (title.cover_url) {
    return (
      <div
        role="img"
        aria-label={`Capa de ${title.title}`}
        className={`${size} shrink-0 rounded-lg bg-cover bg-center shadow ring-1 ring-black/10`}
        style={{ backgroundImage: `url(${title.cover_url})` }}
      />
    );
  }
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-lg bg-[#E6EFE3] p-1.5 text-center text-[9px] font-black leading-3 text-[#123D2C] ring-1 ring-[#123D2C]/10`}>
      {title.title}
    </div>
  );
}

function Modal({ title, eyebrow, onClose, children, z = 200 }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode; z?: number }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-4" style={{ zIndex: z }} role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button>
        </div>
        <div className="mt-3 min-h-0 flex-1">{children}</div>
      </section>
    </div>
  );
}

function Pager({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
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

export function AcervoVivoReader({ api, backHref, homeHref, header, audienceLabel }: Props) {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [myView, setMyView] = useState<MyView>("emprestimos");
  const [query, setQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [selectedLetter, setSelectedLetter] = useState("");
  const [letterPage, setLetterPage] = useState(1);
  const [trailPage, setTrailPage] = useState(1);
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [copyPage, setCopyPage] = useState(1);
  const [selectedTrailId, setSelectedTrailId] = useState("");
  const [trailItemPage, setTrailItemPage] = useState(1);
  const [myPage, setMyPage] = useState(1);

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(api, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const next = (await response.json().catch(() => ({}))) as Payload & { error?: string };
    if (!response.ok) throw new Error(next.error || "Não foi possível carregar o Acervo Vivo.");
    setPayload(next);
  }, [api]);

  useEffect(() => {
    let active = true;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!active) return;
      if (!accessToken) {
        setError("Sua sessão expirou. Entre novamente para acessar o Acervo Vivo.");
        setLoading(false);
        return;
      }
      setToken(accessToken);
      try {
        await load(accessToken);
      } catch (currentError) {
        if (active) setError(currentError instanceof Error ? currentError.message : "Erro ao carregar o Acervo Vivo.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    function closeTop(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (selectedTitleId) setSelectedTitleId("");
      else if (selectedTrailId) setSelectedTrailId("");
      else if (selectedLetter) setSelectedLetter("");
      else if (view) setView(null);
    }
    window.addEventListener("keydown", closeTop);
    return () => window.removeEventListener("keydown", closeTop);
  }, [selectedLetter, selectedTitleId, selectedTrailId, view]);

  const titles = useMemo(() => payload.titles ?? [], [payload.titles]);
  const copies = useMemo(() => payload.copies ?? [], [payload.copies]);
  const trails = useMemo(() => payload.trails ?? [], [payload.trails]);
  const trailItems = useMemo(() => payload.trailItems ?? [], [payload.trailItems]);
  const resources = useMemo(() => payload.resources ?? [], [payload.resources]);
  const versions = useMemo(() => payload.resourceVersions ?? [], [payload.resourceVersions]);
  const loans = useMemo(() => payload.myLoans ?? [], [payload.myLoans]);
  const reservations = useMemo(() => payload.myReservations ?? [], [payload.myReservations]);
  const titleMap = useMemo(() => new Map(titles.map((item) => [item.id, item])), [titles]);
  const resourceMap = useMemo(() => new Map(resources.map((item) => [item.id, item])), [resources]);

  const activeLoans = useMemo(() => loans.filter((item) => !item.returned_at && ["ativo", "atrasado"].includes(item.status)), [loans]);
  const activeReservations = useMemo(() => reservations.filter((item) => ["aguardando", "disponivel"].includes(item.status)), [reservations]);
  const selectedTitle = selectedTitleId ? titleMap.get(selectedTitleId) ?? null : null;
  const selectedTrail = selectedTrailId ? trails.find((item) => item.id === selectedTrailId) ?? null : null;

  const letters = useMemo<string[]>(() => Array.from(new Set<string>(titles.map((item) => initialKey(item.title)))).sort((a: string, b: string) => {
    if (a === "0-9") return -1;
    if (b === "0-9") return 1;
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b, "pt-BR");
  }), [titles]);

  const searchedTitles = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];
    return titles.filter((item) => normalize([
      item.title,
      item.subtitle || "",
      ...(item.authors ?? []),
      ...(item.subjects ?? []),
    ].join(" ")).includes(needle));
  }, [query, titles]);

  const letterTitles = useMemo(() => selectedLetter ? titles.filter((item) => initialKey(item.title) === selectedLetter) : [], [selectedLetter, titles]);
  const currentSearch = searchedTitles.slice((searchPage - 1) * PAGE_SIZE, searchPage * PAGE_SIZE);
  const currentLetter = letterTitles.slice((letterPage - 1) * PAGE_SIZE, letterPage * PAGE_SIZE);
  const currentTrails = trails.slice((trailPage - 1) * PAGE_SIZE, trailPage * PAGE_SIZE);
  const selectedTrailItems = useMemo(() => {
    if (!selectedTrail) return [];
    const items = trailItems.filter((item) => item.trail_id === selectedTrail.id);
    if (selectedTrail.slug !== "folha-verde-edicoes") return items;
    return [...items].sort((left, right) => {
      const leftResource = left.resource_id ? resourceMap.get(left.resource_id) : null;
      const rightResource = right.resource_id ? resourceMap.get(right.resource_id) : null;
      return resourceChronology(rightResource) - resourceChronology(leftResource);
    });
  }, [resourceMap, selectedTrail, trailItems]);
  const currentTrailItems = selectedTrailItems.slice((trailItemPage - 1) * PAGE_SIZE, trailItemPage * PAGE_SIZE);
  const myRows = myView === "emprestimos" ? activeLoans : activeReservations;
  const currentMyRows = myRows.slice((myPage - 1) * PAGE_SIZE, myPage * PAGE_SIZE);
  const selectedCopies = selectedTitle ? copies.filter((copy) => copy.title_id === selectedTitle.id) : [];
  const currentSelectedCopies = selectedCopies.slice((copyPage - 1) * PAGE_SIZE, copyPage * PAGE_SIZE);
  const hasSelectedTitleLoan = selectedTitle ? activeLoans.some((loan) => loan.title?.id === selectedTitle.id || loan.copy?.title_id === selectedTitle.id) : false;
  const hasSelectedTitleReservation = selectedTitle ? activeReservations.some((item) => item.title_id === selectedTitle.id) : false;

  async function run(body: Record<string, unknown>, message: string) {
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
      setSuccess(message);
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao concluir a operação.");
    } finally {
      setSaving(false);
    }
  }

  function openTitle(titleId: string) {
    setCopyPage(1);
    setSelectedTitleId(titleId);
  }

  function openView(next: View) {
    setView(next);
    setQuery("");
    setSearchPage(1);
    setSelectedLetter("");
    setTrailPage(1);
    setMyPage(1);
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      {header}

      <section className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7]">Acervo Vivo • {audienceLabel}</p>
          <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">O que você quer estudar hoje?</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-5 text-[#EEF7EA]">
            Encontre livros, materiais da Casa e trilhas que ajudem a transformar uma dúvida em próximo passo de estudo.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href={homeHref} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C]">Início</Link>
            <Link href={backHref} className="rounded-xl bg-[#D9E8D6] px-3 py-2 text-xs font-black text-[#123D2C]">Voltar</Link>
          </div>
        </section>

        {(error || success) && (
          <div className={`mt-3 rounded-2xl p-3 text-sm font-bold ring-1 ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}>
            {error || success}
          </div>
        )}

        {payload.catalogWarning && !error && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-5 text-amber-900 ring-1 ring-amber-200">{payload.catalogWarning}</div>
        )}

        {loading ? (
          <p className="mt-3 rounded-2xl bg-white p-4 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Carregando o Acervo Vivo...</p>
        ) : (
          <section className="mt-3 grid grid-cols-3 gap-2">
            <AccessButton title="Descobrir" detail={`${titles.length} títulos`} onClick={() => openView("descobrir")} />
            <AccessButton title="Trilhas" detail={`${trails.length} caminhos`} onClick={() => openView("trilhas")} />
            <AccessButton title="Meus livros" detail={`${activeLoans.length} empréstimo(s)`} onClick={() => openView("meus")} />
          </section>
        )}
      </section>

      {view === "descobrir" && (
        <Modal title="Descobrir o Acervo" eyebrow="Livros e exemplares" onClose={() => setView(null)}>
          <label className="grid gap-1 text-xs font-black text-[#123D2C]">
            Buscar por título, autor ou tema
            <input value={query} onChange={(event) => { setQuery(event.target.value); setSearchPage(1); }} className="rounded-xl border border-[#123D2C]/15 bg-[#F9FBF7] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#2F6B43]" placeholder="Ex.: mediunidade, Umbanda, cambono..." />
          </label>

          {query.trim() ? (
            <div className="mt-3">
              <div className="grid gap-2">
                {currentSearch.map((item) => (
                  <button key={item.id} type="button" onClick={() => openTitle(item.id)} className="flex items-center gap-3 rounded-2xl bg-[#F7FAF2] p-2.5 text-left ring-1 ring-[#123D2C]/10">
                    <Cover title={item} compact />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-[#123D2C]">{item.title}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">{item.totalCopies ?? 0} exemplar(es) • {item.availableCopies ?? 0} disponível(is)</span>
                    </span>
                    <span className="text-[10px] font-black text-[#2F6B43]">ABRIR</span>
                  </button>
                ))}
                {searchedTitles.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum título encontrado. Tente outro termo.</p>}
              </div>
              <Pager page={searchPage} total={searchedTitles.length} pageSize={PAGE_SIZE} onChange={setSearchPage} />
              <button type="button" onClick={() => setQuery("")} className="mt-3 w-full rounded-xl bg-[#E7F0E2] px-3 py-2 text-xs font-black text-[#123D2C]">Voltar ao alfabeto</button>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Ou toque na letra inicial</p>
              <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-9">
                {letters.map((letter) => (
                  <button key={letter} type="button" onClick={() => { setSelectedLetter(letter); setLetterPage(1); }} className="rounded-xl bg-[#E7F0E2] px-2 py-2.5 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{letter}</button>
                ))}
              </div>
              <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-5 text-slate-600">
                O índice mostra somente as iniciais existentes no cadastro. Cada letra abre os títulos e seus exemplares em páginas curtas, sem uma lista longa na tela.
              </p>
            </div>
          )}
        </Modal>
      )}

      {selectedLetter && (
        <Modal title={`Títulos com ${selectedLetter}`} eyebrow="Índice alfabético" onClose={() => setSelectedLetter("")} z={220}>
          <div className="grid gap-2">
            {currentLetter.map((item) => (
              <button key={item.id} type="button" onClick={() => { setSelectedLetter(""); openTitle(item.id); }} className="flex items-center gap-3 rounded-2xl bg-[#F7FAF2] p-2.5 text-left ring-1 ring-[#123D2C]/10">
                <Cover title={item} compact />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-[#123D2C]">{item.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{(item.authors ?? []).join(", ") || "Autor não informado"}</span>
                  <span className="mt-1 block text-[10px] font-black text-[#2F6B43]">{item.totalCopies ?? 0} exemplar(es) • {item.availableCopies ?? 0} disponível(is)</span>
                </span>
              </button>
            ))}
          </div>
          <Pager page={letterPage} total={letterTitles.length} pageSize={PAGE_SIZE} onChange={setLetterPage} />
        </Modal>
      )}

      {view === "trilhas" && (
        <Modal title="Trilhas de estudos" eyebrow="Conhecimento em movimento" onClose={() => setView(null)}>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentTrails.map((trail) => {
              const count = trailItems.filter((item) => item.trail_id === trail.id).length;
              return (
                <button key={trail.id} type="button" onClick={() => { setSelectedTrailId(trail.id); setTrailItemPage(1); }} className="rounded-2xl bg-[#F7FAF2] p-3 text-left ring-1 ring-[#123D2C]/10">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">{trail.official ? "Trilha oficial" : "Trilha em validação"}</p>
                  <h3 className="mt-1 text-base font-black leading-tight text-[#123D2C]">{trail.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{trail.objective || trail.description || "Sequência de conteúdos para apoiar seu estudo."}</p>
                  <p className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{count} item(ns) • TOQUE PARA ABRIR</p>
                </button>
              );
            })}
            {trails.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 sm:col-span-2">As trilhas ainda estão sendo configuradas.</p>}
          </div>
          <Pager page={trailPage} total={trails.length} pageSize={PAGE_SIZE} onChange={setTrailPage} />
        </Modal>
      )}

      {selectedTrail && (
        <Modal title={selectedTrail.name} eyebrow="Trilha de estudos" onClose={() => setSelectedTrailId("")} z={220}>
          <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{selectedTrail.objective || selectedTrail.description}</p>
          <div className="mt-3 grid gap-2">
            {currentTrailItems.map((item, index) => {
              const absoluteIndex = (trailItemPage - 1) * PAGE_SIZE + index;
              const title = item.title_id ? titleMap.get(item.title_id) : null;
              const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
              const currentVersion = resource ? versions.find((version) => version.resource_id === resource.id) : null;
              return (
                <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{absoluteIndex + 1}. {title ? "Livro" : resource ? typeLabel(resource.resource_type) : "Conteúdo"}{item.required ? " • recomendado" : ""}</p>
                  <p className="mt-1 truncate text-sm font-black text-[#123D2C]">{title?.title || resource?.title || "Item em configuração"}</p>
                  {item.note && <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-600">{item.note}</p>}
                  {title && <button type="button" onClick={() => { setSelectedTrailId(""); openTitle(title.id); }} className="mt-2 rounded-lg bg-white px-3 py-1.5 text-[10px] font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/20">Ver livro</button>}
                  {resource && currentVersion?.source_url && <a href={currentVersion.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg bg-white px-3 py-1.5 text-[10px] font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/20">{resource.resource_type === "folha_verde" ? "Abrir PDF" : "Abrir conteúdo vigente"}</a>}
                </article>
              );
            })}
            {selectedTrailItems.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Esta trilha está criada, mas sua curadoria ainda está em validação.</p>}
          </div>
          <Pager page={trailItemPage} total={selectedTrailItems.length} pageSize={PAGE_SIZE} onChange={setTrailItemPage} />
        </Modal>
      )}

      {view === "meus" && (
        <Modal title="Meus livros" eyebrow="Empréstimos e reservas" onClose={() => setView(null)}>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F7FAF2] p-1.5">
            <button type="button" onClick={() => { setMyView("emprestimos"); setMyPage(1); }} className={`rounded-xl px-3 py-2 text-xs font-black ${myView === "emprestimos" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>Empréstimos ({activeLoans.length})</button>
            <button type="button" onClick={() => { setMyView("reservas"); setMyPage(1); }} className={`rounded-xl px-3 py-2 text-xs font-black ${myView === "reservas" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>Reservas ({activeReservations.length})</button>
          </div>

          <div className="mt-3 grid gap-2">
            {myView === "emprestimos" ? currentMyRows.map((row) => {
              const loan = row as LoanRow;
              return (
                <article key={loan.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="truncate text-sm font-black text-[#123D2C]">{loan.title?.title || "Livro em empréstimo"}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{loan.copy?.asset_code ? `${loan.copy.asset_code} • ` : ""}Devolver até {formatDate(loan.due_at)}</p>
                  {payload.settings?.member_renewals_enabled !== false && (
                    <button disabled={saving} type="button" onClick={() => void run({ action: "renew", loanId: loan.id }, "Empréstimo renovado.")} className="mt-2 rounded-lg bg-[#123D2C] px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50">Solicitar renovação</button>
                  )}
                </article>
              );
            }) : currentMyRows.map((row) => {
              const reservation = row as ReservationRow;
              return (
                <article key={reservation.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="truncate text-sm font-black text-[#123D2C]">{reservation.title?.title || "Livro reservado"}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {reservation.status === "disponivel"
                      ? `Separado para retirada no Tucxa 2${reservation.hold_until ? ` até ${formatDate(reservation.hold_until)}` : ""}${reservation.copy?.asset_code ? ` • ${reservation.copy.asset_code}` : ""}.`
                      : `Na fila desde ${formatDate(reservation.requested_at)}.`}
                  </p>
                  {reservation.status === "disponivel" && (
                    <p className="mt-2 rounded-xl bg-[#E7F0E2] p-2 text-[10px] font-bold leading-4 text-[#123D2C]">
                      Ao retirar o exemplar físico, peça à Recepção ou ao Apoio Recepção para confirmar o empréstimo. O prazo de devolução começa somente nessa confirmação.
                    </p>
                  )}
                  <button disabled={saving} type="button" onClick={() => void run({ action: "cancel-reservation", reservationId: reservation.id }, "Reserva cancelada.")} className="mt-2 rounded-lg bg-white px-3 py-1.5 text-[10px] font-black text-[#7A2D2D] ring-1 ring-red-200 disabled:opacity-50">Cancelar reserva</button>
                </article>
              );
            })}
            {myRows.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum registro ativo nesta área.</p>}
          </div>
          <Pager page={myPage} total={myRows.length} pageSize={PAGE_SIZE} onChange={setMyPage} />
        </Modal>
      )}

      {selectedTitle && (
        <Modal title={selectedTitle.title} eyebrow="Livro do Acervo Vivo" onClose={() => setSelectedTitleId("")} z={240}>
          <div className="flex gap-3">
            <Cover title={selectedTitle} />
            <div className="min-w-0 flex-1">
              {(selectedTitle.authors ?? []).length > 0 && <p className="text-xs font-bold text-slate-500">{selectedTitle.authors?.join(", ")}</p>}
              {selectedTitle.description && <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-slate-600">{selectedTitle.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(selectedTitle.subjects ?? []).slice(0, 3).map((subject) => <span key={subject} className="rounded-full bg-[#E7F0E2] px-2 py-1 text-[9px] font-black text-[#2F6B43]">{subject}</span>)}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#123D2C]">{selectedCopies.length} exemplar(es)</p>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#2F6B43]">{selectedTitle.availableCopies ?? 0} disponível(is)</span>
            </div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {currentSelectedCopies.map((copy) => (
                <div key={copy.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-[#123D2C]/10">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[#123D2C]">{copy.asset_code || copy.legacy_code || "Exemplar"}</p>
                    <p className="text-[10px] font-semibold text-slate-500">{copyStatusLabel(copy.status)}{copy.shelf ? ` • ${copy.shelf}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
            <Pager page={copyPage} total={selectedCopies.length} pageSize={PAGE_SIZE} onChange={setCopyPage} />
            {hasSelectedTitleLoan && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-800">Você já possui este título em empréstimo.</p>}
            {hasSelectedTitleReservation && !hasSelectedTitleLoan && (
              <p className="mt-2 rounded-xl bg-[#E7F0E2] p-2 text-xs font-bold text-[#123D2C]">Você já possui uma reserva ativa para este título. Acompanhe em Meus livros.</p>
            )}
            {!hasSelectedTitleReservation && !hasSelectedTitleLoan && (selectedTitle.availableCopies ?? 0) > 0 && payload.settings?.member_loans_enabled !== false && (
              <button
                disabled={saving}
                type="button"
                onClick={() => void run(
                  { action: "reserve", titleId: selectedTitle.id },
                  `Solicitação registrada. Um exemplar disponível fica separado por até ${payload.settings?.reservation_hold_days ?? 3} dia(s). Retire no Tucxa 2 e peça a confirmação à Recepção.`,
                )}
                className="mt-2 w-full rounded-xl bg-[#123D2C] px-3 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                Reservar para retirada no Tucxa 2
              </button>
            )}
            {!hasSelectedTitleReservation && !hasSelectedTitleLoan && (selectedTitle.availableCopies ?? 0) === 0 && payload.settings?.member_reservations_enabled !== false && (
              <button
                disabled={saving}
                type="button"
                onClick={() => void run({ action: "reserve", titleId: selectedTitle.id }, "Reserva registrada. Você entrou na fila e poderá acompanhar em Meus livros.")}
                className="mt-2 w-full rounded-xl bg-[#123D2C] px-3 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                Entrar na fila de reserva
              </button>
            )}
            {!hasSelectedTitleReservation && !hasSelectedTitleLoan && (selectedTitle.availableCopies ?? 0) > 0 && payload.settings?.member_loans_enabled === false && (
              <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900 ring-1 ring-amber-200">As solicitações de retirada pelo leitor estão temporariamente desabilitadas. Procure a Biblioteca/Recepção.</p>
            )}
          </div>

          <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">
            Regras atuais: até {payload.settings?.max_active_loans ?? 3} empréstimo(s), prazo de {payload.settings?.loan_days ?? 30} dias e até {payload.settings?.renewal_limit ?? 1} renovação(ões). A retirada física é confirmada pela Recepção; só então começa o prazo de devolução. O sistema também verifica atrasos, pendências e fila de reserva conforme a configuração da Biblioteca.
          </p>
        </Modal>
      )}
    </main>
  );
}
