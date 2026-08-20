"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/cliente/acervo-vivo";

type TitleRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  authors?: string[] | null;
  publisher?: string | null;
  publication_year?: number | null;
  isbn10?: string | null;
  isbn13?: string | null;
  description?: string | null;
  subjects?: string[] | null;
  cover_url?: string | null;
  cover_match_status?: string;
  active?: boolean;
};

type CopyRow = {
  id: string;
  title_id: string;
  legacy_code?: string | null;
  asset_code: string;
  qr_token: string;
  shelf?: string | null;
  shelf_position?: string | null;
  condition: string;
  status: string;
  active?: boolean;
};

type Person = { id: string; full_name?: string | null; email?: string | null; whatsapp?: string | null };
type Loan = {
  id: string;
  copy_id: string;
  person_id: string;
  due_at: string;
  returned_at?: string | null;
  status: string;
  late_fee_calculated?: number;
  late_fee_status?: string;
  person?: Person | null;
  title?: TitleRow | null;
  copy?: CopyRow | null;
  isOverdue?: boolean;
};
type Reservation = {
  id: string;
  title_id: string;
  person_id: string;
  status: string;
  requested_at: string;
  hold_until?: string | null;
  person?: Person | null;
  title?: TitleRow | null;
};
type Resource = { id: string; resource_type: string; title: string; governance_status: string; description?: string | null };
type ResourceVersion = { id: string; resource_id: string; version_label: string; source_url?: string | null; is_current: boolean };
type Trail = { id: string; name: string; slug: string; objective?: string | null; official?: boolean; active?: boolean };
type TrailItem = { id: string; trail_id: string; item_type: "title" | "resource"; title_id?: string | null; resource_id?: string | null; required?: boolean; note?: string | null };
type Course = { id: string; name: string };
type Lesson = { id: string; course_id: string; title: string; starts_at?: string | null };
type AgendaEvent = { id: string; title: string; starts_at?: string | null };
type InventorySession = { id: string; name: string; scope: string; status: string; started_at: string; closed_at?: string | null; metadata?: { expected?: number; scanned?: number; missing?: number } | null };
type InventoryScan = { id: string; session_id: string; copy_id: string; scanned_at: string; observed_shelf?: string | null };
type CoverCandidate = {
  externalId: string;
  title: string;
  authors: string[];
  publisher?: string | null;
  publicationYear?: number | null;
  isbn10?: string | null;
  isbn13?: string | null;
  coverUrl?: string;
};

type Payload = {
  permissions?: {
    library?: boolean;
    libraryRules?: boolean;
    folhaVerde?: boolean;
    grupoEstudos?: boolean;
    clubeLivro?: boolean;
    systemAdmin?: boolean;
  };
  organizationId?: string;
  catalogWarning?: string | null;
  settings?: {
    loan_days?: number;
    daily_late_fee?: number;
    max_active_loans?: number;
    renewal_limit?: number;
    reservation_hold_days?: number;
    public_catalog_enabled?: boolean;
    member_loans_enabled?: boolean;
    member_reservations_enabled?: boolean;
    member_renewals_enabled?: boolean;
    block_new_loans_with_overdue?: boolean;
    block_new_loans_with_pending_fee?: boolean;
  } | null;
  titles?: TitleRow[];
  copies?: CopyRow[];
  loans?: Loan[];
  reservations?: Reservation[];
  resources?: Resource[];
  resourceVersions?: ResourceVersion[];
  trails?: Trail[];
  trailItems?: TrailItem[];
  people?: Person[];
  courses?: Course[];
  lessons?: Lesson[];
  agendaEvents?: AgendaEvent[];
  inventorySessions?: InventorySession[];
  inventoryScans?: InventoryScan[];
  integrationsWarning?: string | null;
  metrics?: {
    titles?: number;
    copies?: number;
    available?: number;
    loaned?: number;
    overdue?: number;
    reservations?: number;
    pendingCovers?: number;
  };
};

type Tab = "visao" | "acervo" | "circulacao" | "inventario" | "conteudos" | "trilhas";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}

function Cover({ url, title }: { url?: string | null; title: string }) {
  if (!url) return <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-lg bg-[#E7F0E2] p-2 text-center text-[10px] font-black text-[#123D2C]">{title}</div>;
  return <div role="img" aria-label={`Capa de ${title}`} className="h-28 w-20 shrink-0 rounded-lg bg-cover bg-center shadow ring-1 ring-black/10" style={{ backgroundImage: `url(${url})` }} />;
}

export default function AcervoVivoGestaoPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("visao");
  const [query, setQuery] = useState("");

  const [loanDays, setLoanDays] = useState(30);
  const [dailyLateFee, setDailyLateFee] = useState(1);
  const [maxLoans, setMaxLoans] = useState(3);
  const [renewalLimit, setRenewalLimit] = useState(1);
  const [holdDays, setHoldDays] = useState(3);
  const [memberLoans, setMemberLoans] = useState(true);
  const [memberReservations, setMemberReservations] = useState(true);
  const [memberRenewals, setMemberRenewals] = useState(true);
  const [blockOverdue, setBlockOverdue] = useState(true);
  const [blockPendingFee, setBlockPendingFee] = useState(true);

  const [titleName, setTitleName] = useState("");
  const [titleAuthors, setTitleAuthors] = useState("");
  const [titlePublisher, setTitlePublisher] = useState("");
  const [titleYear, setTitleYear] = useState("");
  const [titleIsbn, setTitleIsbn] = useState("");
  const [titleSubjects, setTitleSubjects] = useState("");
  const [titleDescription, setTitleDescription] = useState("");
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [coverCandidates, setCoverCandidates] = useState<CoverCandidate[]>([]);

  const [copyTitleId, setCopyTitleId] = useState("");
  const [copyLegacyCode, setCopyLegacyCode] = useState("");
  const [copyShelf, setCopyShelf] = useState("");
  const [copyPosition, setCopyPosition] = useState("");

  const [loanCopyId, setLoanCopyId] = useState("");
  const [loanPersonId, setLoanPersonId] = useState("");

  const [inventoryName, setInventoryName] = useState("");
  const [inventorySessionId, setInventorySessionId] = useState("");
  const [inventoryCode, setInventoryCode] = useState("");
  const [inventoryShelf, setInventoryShelf] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrAssetCode, setQrAssetCode] = useState("");

  const [resourceType, setResourceType] = useState("manual");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [resourceSubjects, setResourceSubjects] = useState("");
  const [resourceGovernance, setResourceGovernance] = useState("rascunho");
  const [versionResourceId, setVersionResourceId] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [versionUrl, setVersionUrl] = useState("");
  const [versionCurrent, setVersionCurrent] = useState(true);

  const [trailName, setTrailName] = useState("");
  const [trailObjective, setTrailObjective] = useState("");
  const [trailAudience, setTrailAudience] = useState("");
  const [selectedTrailId, setSelectedTrailId] = useState("");
  const [trailItemType, setTrailItemType] = useState<"title" | "resource">("title");
  const [trailItemId, setTrailItemId] = useState("");
  const [trailItemNote, setTrailItemNote] = useState("");

  const [curationType, setCurationType] = useState("clube_do_livro");
  const [curationTitle, setCurationTitle] = useState("");
  const [curationDescription, setCurationDescription] = useState("");
  const [curationTitleId, setCurationTitleId] = useState("");
  const [curationCourseId, setCurationCourseId] = useState("");
  const [curationLessonId, setCurationLessonId] = useState("");
  const [curationEventId, setCurationEventId] = useState("");

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(API, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const next = (await response.json().catch(() => ({}))) as Payload & { error?: string };
    if (!response.ok) throw new Error(next.error || "Não foi possível carregar o Acervo Vivo.");
    setPayload(next);
    setLoanDays(next.settings?.loan_days ?? 30);
    setDailyLateFee(Number(next.settings?.daily_late_fee ?? 1));
    setMaxLoans(next.settings?.max_active_loans ?? 3);
    setRenewalLimit(next.settings?.renewal_limit ?? 1);
    setHoldDays(next.settings?.reservation_hold_days ?? 3);
    setMemberLoans(next.settings?.member_loans_enabled !== false);
    setMemberReservations(next.settings?.member_reservations_enabled !== false);
    setMemberRenewals(next.settings?.member_renewals_enabled !== false);
    setBlockOverdue(next.settings?.block_new_loans_with_overdue !== false);
    setBlockPendingFee(next.settings?.block_new_loans_with_pending_fee !== false);
  }, []);

  useEffect(() => {
    let active = true;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!active) return;
      setToken(accessToken);
      if (!accessToken) {
        setError("Sessão expirada. Entre novamente na área cliente.");
        setLoading(false);
        return;
      }
      try {
        await load(accessToken);
      } catch (currentError) {
        if (active) setError(currentError instanceof Error ? currentError.message : "Erro ao carregar.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [load]);

  const titles = useMemo(() => payload.titles ?? [], [payload.titles]);
  const copies = useMemo(() => payload.copies ?? [], [payload.copies]);
  const loans = useMemo(() => payload.loans ?? [], [payload.loans]);
  const reservations = useMemo(() => payload.reservations ?? [], [payload.reservations]);
  const people = useMemo(() => payload.people ?? [], [payload.people]);
  const resources = useMemo(() => payload.resources ?? [], [payload.resources]);
  const versions = useMemo(() => payload.resourceVersions ?? [], [payload.resourceVersions]);
  const trails = useMemo(() => payload.trails ?? [], [payload.trails]);
  const trailItems = useMemo(() => payload.trailItems ?? [], [payload.trailItems]);
  const titleMap = useMemo(() => new Map(titles.map((item) => [item.id, item])), [titles]);
  const resourceMap = useMemo(() => new Map(resources.map((item) => [item.id, item])), [resources]);
  const activeLoans = useMemo(() => loans.filter((item) => !item.returned_at && ["ativo", "atrasado"].includes(item.status)), [loans]);
  const activeReservations = useMemo(() => reservations.filter((item) => ["aguardando", "disponivel"].includes(item.status)), [reservations]);
  const availableCopies = useMemo(() => copies.filter((item) => item.active !== false && item.status === "disponivel"), [copies]);
  const inventorySessions = useMemo(() => payload.inventorySessions ?? [], [payload.inventorySessions]);
  const inventoryScans = useMemo(() => payload.inventoryScans ?? [], [payload.inventoryScans]);
  const openInventories = useMemo(() => inventorySessions.filter((item) => item.status === "aberto"), [inventorySessions]);

  const permissions = payload.permissions ?? {};
  const canManageLibrary = permissions.library === true;
  const canManageRules = permissions.libraryRules === true;
  const canManageFolhaVerde = permissions.folhaVerde === true || canManageLibrary;
  const canManageGrupoEstudos = permissions.grupoEstudos === true || canManageLibrary;
  const canManageClubeLivro = permissions.clubeLivro === true || canManageLibrary;

  const visibleTitles = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    if (!needle) return titles;
    return titles.filter((item) => [item.title, ...(item.authors ?? []), ...(item.subjects ?? [])].join(" ").toLocaleLowerCase("pt-BR").includes(needle));
  }, [query, titles]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; candidates?: CoverCandidate[]; enriched?: number; suggested?: number; checked?: number; qrDataUrl?: string; assetCode?: string; id?: string; summary?: { expected?: number; scanned?: number; missing?: number }; copy?: CopyRow };
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
    return result;
  }

  async function run(body: Record<string, unknown>, message: string) {
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await post(body);
      setSuccess(message);
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await run({
      action: "save-settings",
      loanDays,
      dailyLateFee,
      maxActiveLoans: maxLoans,
      renewalLimit,
      reservationHoldDays: holdDays,
      publicCatalogEnabled: true,
      memberLoansEnabled: memberLoans,
      memberReservationsEnabled: memberReservations,
      memberRenewalsEnabled: memberRenewals,
      blockNewLoansWithOverdue: blockOverdue,
      blockNewLoansWithPendingFee: blockPendingFee,
    }, "Regras do Acervo Vivo atualizadas.");
  }

  async function createTitle(event: FormEvent) {
    event.preventDefault();
    await run({ action: "create-title", title: titleName, authors: titleAuthors, publisher: titlePublisher, publicationYear: titleYear, isbn13: titleIsbn, subjects: titleSubjects, description: titleDescription }, "Título cadastrado no Acervo Vivo.");
    setTitleName(""); setTitleAuthors(""); setTitlePublisher(""); setTitleYear(""); setTitleIsbn(""); setTitleSubjects(""); setTitleDescription("");
  }

  async function searchCover(titleId: string) {
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess(""); setSelectedTitleId(titleId); setCoverCandidates([]);
    try {
      const result = await post({ action: "search-cover", titleId });
      setCoverCandidates(result.candidates ?? []);
      if (!(result.candidates ?? []).length) setSuccess("Nenhuma capa candidata encontrada. Você poderá manter o título sem capa ou revisar os metadados.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao pesquisar capa.");
    } finally { setSaving(false); }
  }

  async function enrichPendingCovers() {
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await post({ action: "enrich-covers", limit: 6 });
      setSuccess(`Capas pesquisadas: ${result.checked ?? 0}. Correspondências fortes: ${result.enriched ?? 0}. Sugestões para revisar: ${result.suggested ?? 0}.`);
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao pesquisar capas em lote.");
    } finally { setSaving(false); }
  }

  async function applyCover(candidate: CoverCandidate) {
    if (!selectedTitleId) return;
    await run({ action: "apply-cover", titleId: selectedTitleId, coverUrl: candidate.coverUrl, externalId: candidate.externalId, isbn10: candidate.isbn10, isbn13: candidate.isbn13, publisher: candidate.publisher, coverSource: "google-books" }, "Capa confirmada e vinculada ao título.");
    setCoverCandidates([]);
  }

  async function createCopy(event: FormEvent) {
    event.preventDefault();
    await run({ action: "create-copy", titleId: copyTitleId, legacyCode: copyLegacyCode, shelf: copyShelf, shelfPosition: copyPosition, condition: "bom", status: "disponivel", acquisitionType: "acervo_historico" }, "Exemplar cadastrado com código patrimonial e QR token.");
    setCopyLegacyCode(""); setCopyShelf(""); setCopyPosition("");
  }

  async function createLoan(event: FormEvent) {
    event.preventDefault();
    await run({ action: "loan", copyId: loanCopyId, personId: loanPersonId }, "Empréstimo registrado. A data de devolução foi calculada pelas regras vigentes.");
    setLoanCopyId(""); setLoanPersonId("");
  }

  async function showQr(copyId: string) {
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await post({ action: "generate-qr", copyId });
      setQrDataUrl(result.qrDataUrl ?? "");
      setQrAssetCode(result.assetCode ?? "");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao gerar QR Code.");
    } finally { setSaving(false); }
  }

  async function createInventory(event: FormEvent) {
    event.preventDefault();
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await post({ action: "create-inventory-session", name: inventoryName, scope: "todo_acervo" });
      setInventoryName("");
      if (result.id) setInventorySessionId(result.id);
      setSuccess("Sessão de inventário iniciada. Leia os códigos patrimoniais ou QR Codes dos exemplares encontrados.");
      await load(token);
    } catch (currentError) { setError(currentError instanceof Error ? currentError.message : "Erro ao iniciar inventário."); }
    finally { setSaving(false); }
  }

  async function scanInventory(event: FormEvent) {
    event.preventDefault();
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await post({ action: "inventory-scan", sessionId: inventorySessionId, code: inventoryCode, observedShelf: inventoryShelf });
      setSuccess(`Exemplar ${result.copy?.asset_code ?? inventoryCode} conferido no inventário.`);
      setInventoryCode("");
      await load(token);
    } catch (currentError) { setError(currentError instanceof Error ? currentError.message : "Erro ao conferir exemplar."); }
    finally { setSaving(false); }
  }

  async function closeInventory(sessionId: string) {
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await post({ action: "close-inventory-session", sessionId });
      const summary = result.summary ?? {};
      setSuccess(`Inventário concluído: ${summary.scanned ?? 0} encontrados de ${summary.expected ?? 0}; ${summary.missing ?? 0} não conferidos.`);
      if (inventorySessionId === sessionId) setInventorySessionId("");
      await load(token);
    } catch (currentError) { setError(currentError instanceof Error ? currentError.message : "Erro ao concluir inventário."); }
    finally { setSaving(false); }
  }

  async function createResource(event: FormEvent) {
    event.preventDefault();
    await run({ action: "create-resource", resourceType, title: resourceTitle, description: resourceDescription, subjects: resourceSubjects, governanceStatus: resourceGovernance }, "Conteúdo cadastrado no Acervo Vivo.");
    setResourceTitle(""); setResourceDescription(""); setResourceSubjects("");
  }

  async function createVersion(event: FormEvent) {
    event.preventDefault();
    await run({ action: "create-resource-version", resourceId: versionResourceId, versionLabel, sourceUrl: versionUrl, isCurrent: versionCurrent }, "Versão registrada. Se marcada como vigente, a versão anterior foi preservada no histórico.");
    setVersionLabel(""); setVersionUrl("");
  }

  async function createTrail(event: FormEvent) {
    event.preventDefault();
    await run({ action: "create-trail", name: trailName, objective: trailObjective, audience: trailAudience, official: false, level: "livre" }, "Trilha criada como sugestão para validação.");
    setTrailName(""); setTrailObjective(""); setTrailAudience("");
  }

  async function addTrailItem(event: FormEvent) {
    event.preventDefault();
    await run({ action: "add-trail-item", trailId: selectedTrailId, itemType: trailItemType, titleId: trailItemType === "title" ? trailItemId : "", resourceId: trailItemType === "resource" ? trailItemId : "", note: trailItemNote, required: false }, "Conteúdo adicionado à trilha.");
    setTrailItemId(""); setTrailItemNote("");
  }

  async function createCuration(event: FormEvent) {
    event.preventDefault();
    await run({ action: "create-curation", curationType, title: curationTitle, description: curationDescription, titleId: curationTitleId, courseId: curationCourseId, lessonId: curationLessonId, agendaEventId: curationEventId }, "Integração/curadoria criada.");
    setCurationTitle(""); setCurationDescription(""); setCurationTitleId(""); setCurationCourseId(""); setCurationLessonId(""); setCurationEventId("");
  }

  return (
    <OrganizacaoClientShell
      title="Acervo Vivo"
      description="Mais do que controlar livros: organize o conhecimento da Casa, conecte Biblioteca, Clube do Livro, Grupo de Estudos e Curso Preparatório, e ajude cada pessoa a encontrar o próximo conteúdo que faz sentido para sua caminhada."
    >
      {(error || success) && <div className={`rounded-2xl p-4 text-sm font-bold ring-1 ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}>{error || success}</div>}
      {payload.integrationsWarning && <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-200">{payload.integrationsWarning}</div>}
      {payload.catalogWarning && <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-800 ring-1 ring-red-200">{payload.catalogWarning}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          ["Títulos", payload.metrics?.titles ?? 0],
          ["Exemplares", payload.metrics?.copies ?? 0],
          ["Disponíveis", payload.metrics?.available ?? 0],
          ["Emprestados", payload.metrics?.loaned ?? 0],
          ["Atrasados", payload.metrics?.overdue ?? 0],
          ["Reservas", payload.metrics?.reservations ?? 0],
          ["Capas pendentes", payload.metrics?.pendingCovers ?? 0],
        ].map(([label, value]) => <article key={String(label)} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{label}</p><p className="mt-2 text-3xl font-black text-[#00334E]">{value}</p></article>)}
      </section>

      {!loading && !canManageLibrary && (canManageFolhaVerde || canManageGrupoEstudos || canManageClubeLivro) && (
        <div className="rounded-2xl bg-sky-50 p-4 text-sm font-bold leading-6 text-sky-900 ring-1 ring-sky-200">Seu acesso é especializado: você pode atualizar apenas as áreas ligadas à sua função. As regras de circulação e a Biblioteca física ficam sob responsabilidade do Gestor Acervo Vivo - Biblioteca.</div>
      )}

      <nav className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-2 shadow ring-1 ring-slate-100 sm:grid-cols-6">
        {([
          ["visao", "Visão geral"], ["acervo", "Acervo"], ["circulacao", "Circulação"], ["inventario", "Inventário"], ["conteudos", "Conteúdos"], ["trilhas", "Trilhas + Integrações"],
        ] as Array<[Tab, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-2xl px-3 py-3 text-xs font-black sm:text-sm ${tab === value ? "bg-[#00334E] text-white" : "bg-[#F4FBF7] text-[#00334E]"}`}>{label}</button>)}
      </nav>

      {loading ? <p className="rounded-3xl bg-white p-5 font-bold text-[#00334E] shadow ring-1 ring-slate-100">Carregando gestão do Acervo Vivo...</p> : tab === "visao" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Deep Dive aplicado ao produto</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">Não começar pelo “controle de livros”</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">A característica é catálogo, QR, empréstimo e reserva. O motivo é reduzir trabalho manual. O resultado que buscamos é outro: fazer o conhecimento certo chegar à pessoa certa no momento certo, apoiando formação, pertencimento e continuidade do conhecimento da Casa.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Biblioteca física + digital", "Livro do mês", "Grupo de Estudos", "Curso Preparatório", "Folha Verde versionado", "Memória da Casa"].map((item) => <span key={item} className="rounded-xl bg-[#F4FBF7] px-3 py-2 text-sm font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/10">{item}</span>)}
            </div>
          </section>

          {canManageRules ? (
            <form onSubmit={saveSettings} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Regras vigentes</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Circulação configurável</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Somente quem possui a função <strong>Gestor Acervo Vivo - Biblioteca</strong> (ou administração do cliente) pode alterar estas regras.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-black text-[#00334E]">Prazo (dias)<input type="number" min={1} value={loanDays} onChange={(e) => setLoanDays(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                <label className="grid gap-1 text-xs font-black text-[#00334E]">Taxa/dia (R$)<input type="number" min={0} step="0.01" value={dailyLateFee} onChange={(e) => setDailyLateFee(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                <label className="grid gap-1 text-xs font-black text-[#00334E]">Máx. empréstimos<input type="number" min={1} value={maxLoans} onChange={(e) => setMaxLoans(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                <label className="grid gap-1 text-xs font-black text-[#00334E]">Máx. renovações<input type="number" min={0} value={renewalLimit} onChange={(e) => setRenewalLimit(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                <label className="grid gap-1 text-xs font-black text-[#00334E]">Reserva disponível por (dias)<input type="number" min={1} value={holdDays} onChange={(e) => setHoldDays(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label>
                <div className="grid gap-2 text-xs font-black text-[#00334E]">
                  <label className="flex items-center gap-2 rounded-xl bg-[#F4FBF7] px-3 py-2"><input type="checkbox" checked={memberLoans} onChange={(e) => setMemberLoans(e.target.checked)} />Permitir empréstimos pelo leitor</label>
                  <label className="flex items-center gap-2 rounded-xl bg-[#F4FBF7] px-3 py-2"><input type="checkbox" checked={memberReservations} onChange={(e) => setMemberReservations(e.target.checked)} />Permitir reservas</label>
                  <label className="flex items-center gap-2 rounded-xl bg-[#F4FBF7] px-3 py-2"><input type="checkbox" checked={memberRenewals} onChange={(e) => setMemberRenewals(e.target.checked)} />Permitir renovações</label>
                  <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2"><input type="checkbox" checked={blockOverdue} onChange={(e) => setBlockOverdue(e.target.checked)} />Bloquear novo empréstimo com atraso</label>
                  <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2"><input type="checkbox" checked={blockPendingFee} onChange={(e) => setBlockPendingFee(e.target.checked)} />Bloquear novo empréstimo com taxa pendente</label>
                </div>
              </div>
              <button disabled={saving} className="mt-4 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Salvar regras</button>
            </form>
          ) : (
            <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Regras vigentes</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Circulação definida pela Biblioteca</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Você pode consultar as regras atuais. Apenas a função <strong>Gestor Acervo Vivo - Biblioteca</strong> pode alterá-las.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-[#00334E]">
                <span className="rounded-xl bg-[#F4FBF7] p-3">Prazo: {loanDays} dias</span>
                <span className="rounded-xl bg-[#F4FBF7] p-3">Limite: {maxLoans} empréstimo(s)</span>
                <span className="rounded-xl bg-[#F4FBF7] p-3">Renovações: {renewalLimit}</span>
                <span className="rounded-xl bg-[#F4FBF7] p-3">Taxa/dia: R$ {dailyLateFee.toFixed(2).replace(".", ",")}</span>
              </div>
            </section>
          )}
        </div>
      ) : tab === "acervo" ? (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
          <div className="grid gap-4">
            <form onSubmit={createTitle} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Obra / Título</p>
              <h2 className="mt-1 text-xl font-black text-[#00334E]">Cadastrar título</h2>
              <div className="mt-3 grid gap-2">
                <input required value={titleName} onChange={(e) => setTitleName(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Título" />
                <input value={titleAuthors} onChange={(e) => setTitleAuthors(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Autores (separe por ; )" />
                <div className="grid grid-cols-2 gap-2"><input value={titlePublisher} onChange={(e) => setTitlePublisher(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Editora" /><input type="number" value={titleYear} onChange={(e) => setTitleYear(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Ano" /></div>
                <input value={titleIsbn} onChange={(e) => setTitleIsbn(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="ISBN-13 (se houver)" />
                <input value={titleSubjects} onChange={(e) => setTitleSubjects(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Temas (separe por ; )" />
                <textarea value={titleDescription} onChange={(e) => setTitleDescription(e.target.value)} rows={3} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Resumo / por que este livro pode ajudar" />
              </div>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Cadastrar título</button>
            </form>

            <form onSubmit={createCopy} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Exemplar físico</p>
              <h2 className="mt-1 text-xl font-black text-[#00334E]">Adicionar exemplar</h2>
              <select required value={copyTitleId} onChange={(e) => setCopyTitleId(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Selecione a obra</option>{titles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
              <div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={copyLegacyCode} onChange={(e) => setCopyLegacyCode(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Código antigo" /><input value={copyShelf} onChange={(e) => setCopyShelf(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Estante" /><input value={copyPosition} onChange={(e) => setCopyPosition(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2" placeholder="Prateleira / posição" /></div>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50">Adicionar exemplar</button>
            </form>
          </div>

          <section className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Catálogo</p><h2 className="mt-1 text-2xl font-black text-[#00334E]">Títulos e capas</h2></div><div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Buscar título, autor ou tema" /><button type="button" disabled={saving} onClick={() => void enrichPendingCovers()} className="rounded-xl bg-[#E7F0E2] px-3 py-2 text-xs font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/20 disabled:opacity-50">Buscar próximas 6 capas</button></div></div>
            <div className="mt-4 grid gap-2">
              {visibleTitles.map((item) => {
                const itemCopies = copies.filter((copy) => copy.title_id === item.id && copy.active !== false);
                return <article key={item.id} className="flex gap-3 rounded-2xl bg-[#F9FBF7] p-3 ring-1 ring-[#123D2C]/10"><Cover url={item.cover_url} title={item.title} /><div className="min-w-0 flex-1"><p className="font-black text-[#00334E]">{item.title}</p>{(item.authors ?? []).length > 0 && <p className="text-xs font-bold text-slate-500">{item.authors?.join(", ")}</p>}<p className="mt-2 text-xs font-semibold text-slate-600">{itemCopies.length} exemplar(es) • {itemCopies.filter((copy) => copy.status === "disponivel").length} disponível(is)</p><div className="mt-2 flex flex-wrap gap-1">{itemCopies.slice(0, 6).map((copy) => <button key={copy.id} type="button" disabled={saving} onClick={() => void showQr(copy.id)} className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#00334E] ring-1 ring-[#00334E]/15">QR {copy.asset_code}</button>)}</div><button disabled={saving} type="button" onClick={() => void searchCover(item.id)} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/20 disabled:opacity-50">{item.cover_url ? "Revisar capa" : "Buscar capa"}</button></div></article>;
              })}
            </div>
          </section>
        </div>
      ) : tab === "circulacao" ? (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-4">
            <form onSubmit={createLoan} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Balcão da biblioteca</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Registrar empréstimo</h2><select required value={loanPersonId} onChange={(e) => setLoanPersonId(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Pessoa da Base Única</option>{people.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email || "Pessoa"}</option>)}</select><select required value={loanCopyId} onChange={(e) => setLoanCopyId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Exemplar disponível</option>{availableCopies.map((copy) => <option key={copy.id} value={copy.id}>{copy.asset_code} — {titleMap.get(copy.title_id)?.title || "Livro"}</option>)}</select><button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Emprestar</button></form>
            <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Fila de reservas</p><div className="mt-3 grid gap-2">{activeReservations.map((reservation) => <article key={reservation.id} className="rounded-2xl bg-[#F9FBF7] p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#00334E]">{reservation.title?.title || "Livro"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{reservation.person?.full_name || "Pessoa"} • {reservation.status === "disponivel" ? `Disponível até ${formatDate(reservation.hold_until)}` : `Aguardando desde ${formatDate(reservation.requested_at)}`}</p><button disabled={saving} type="button" onClick={() => void run({ action: "cancel-reservation", reservationId: reservation.id }, "Reserva cancelada.")} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-200 disabled:opacity-50">Cancelar</button></article>)}{activeReservations.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhuma reserva ativa.</p>}</div></section>
          </div>
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Empréstimos ativos</p><div className="mt-3 grid gap-2">{activeLoans.map((loan) => { const overdue = loan.isOverdue === true; return <article key={loan.id} className="rounded-2xl bg-[#F9FBF7] p-4 ring-1 ring-[#123D2C]/10"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-[#00334E]">{loan.title?.title || "Livro"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{loan.person?.full_name || "Pessoa"} • {loan.copy?.asset_code || "Exemplar"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${overdue ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{overdue ? "Atrasado" : `Até ${formatDate(loan.due_at)}`}</span></div><button disabled={saving} type="button" onClick={() => void run({ action: "return", loanId: loan.id }, "Devolução registrada e próxima reserva, se houver, disponibilizada automaticamente.")} className="mt-3 rounded-xl bg-[#00334E] px-4 py-2 text-xs font-black text-white disabled:opacity-50">Registrar devolução</button></article>; })}{activeLoans.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhum empréstimo ativo.</p>}</div></section>
        </div>
      ) : tab === "inventario" ? (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-4">
            <form onSubmit={createInventory} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Inventário físico</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Iniciar conferência</h2>
              <input value={inventoryName} onChange={(e) => setInventoryName(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Ex.: Inventário geral Agosto/2026" />
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Iniciar inventário</button>
            </form>
            <form onSubmit={scanInventory} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Conferir exemplar</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Código patrimonial ou QR</h2>
              <select required value={inventorySessionId} onChange={(e) => setInventorySessionId(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Sessão aberta</option>{openInventories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input required autoFocus value={inventoryCode} onChange={(e) => setInventoryCode(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Leia o QR ou digite ACV-..." />
              <input value={inventoryShelf} onChange={(e) => setInventoryShelf(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Estante observada (opcional)" />
              <button disabled={saving || !inventorySessionId} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50">Conferir exemplar</button>
            </form>
          </div>
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Sessões</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Histórico de inventários</h2><div className="mt-3 grid gap-2">{inventorySessions.map((session) => { const scanned = inventoryScans.filter((item) => item.session_id === session.id).length; return <article key={session.id} className="rounded-2xl bg-[#F9FBF7] p-4 ring-1 ring-[#123D2C]/10"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-[#00334E]">{session.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">Iniciado em {formatDate(session.started_at)} • {session.status === "aberto" ? `${scanned} conferidos` : `${session.metadata?.scanned ?? scanned} de ${session.metadata?.expected ?? "—"} conferidos`}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${session.status === "aberto" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{session.status}</span></div>{session.status === "aberto" && <button type="button" disabled={saving} onClick={() => void closeInventory(session.id)} className="mt-3 rounded-xl bg-[#00334E] px-4 py-2 text-xs font-black text-white disabled:opacity-50">Concluir inventário</button>}{session.status === "concluido" && <p className="mt-2 text-xs font-bold text-slate-600">Não conferidos: {session.metadata?.missing ?? 0}</p>}</article>; })}{inventorySessions.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Nenhum inventário iniciado.</p>}</div></section>
        </div>
      ) : tab === "conteudos" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <form onSubmit={createResource} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Acervo além dos livros</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Cadastrar conteúdo</h2><div className="mt-3 grid gap-2"><select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="regulamento">Regulamento</option><option value="procedimento">Procedimento</option><option value="manual">Manual</option><option value="folha_verde">Folha Verde</option><option value="apostila">Apostila</option><option value="video">Vídeo</option><option value="podcast">Podcast</option><option value="audio">Áudio</option><option value="memoria_da_casa">Memória da Casa</option><option value="outro">Outro</option></select><input required value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Título" /><textarea value={resourceDescription} onChange={(e) => setResourceDescription(e.target.value)} rows={3} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Descrição e objetivo" /><input value={resourceSubjects} onChange={(e) => setResourceSubjects(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3" placeholder="Temas separados por ;" /><select value={resourceGovernance} onChange={(e) => setResourceGovernance(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="rascunho">Rascunho</option><option value="em_revisao">Em revisão</option><option value="vigente">Vigente</option><option value="arquivado">Arquivado</option></select></div><button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Cadastrar conteúdo</button></form>
          <form onSubmit={createVersion} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Governança</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Registrar nova versão</h2><select required value={versionResourceId} onChange={(e) => setVersionResourceId(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Selecione o conteúdo</option>{resources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input required value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Versão: ex. Março/2026 - Rev. 02" /><input value={versionUrl} onChange={(e) => setVersionUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Link do Drive/site, quando houver" /><label className="mt-2 flex items-center gap-2 rounded-xl bg-[#F4FBF7] p-3 text-sm font-black text-[#00334E]"><input type="checkbox" checked={versionCurrent} onChange={(e) => setVersionCurrent(e.target.checked)} />Marcar como versão vigente</label><button disabled={saving} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50">Registrar versão</button></form>
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 xl:col-span-2"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Conteúdos cadastrados</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{resources.map((item) => { const current = versions.find((version) => version.resource_id === item.id && version.is_current); return <article key={item.id} className="rounded-2xl bg-[#F9FBF7] p-4 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#00334E]">{item.title}</p><p className="mt-1 text-xs font-bold text-[#2F6B43]">{item.resource_type.replaceAll("_", " ")} • {item.governance_status.replaceAll("_", " ")}</p>{current && <p className="mt-2 text-xs font-semibold text-slate-500">Vigente: {current.version_label}</p>}</article>; })}</div></section>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <form onSubmit={createTrail} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Trilhas de estudo</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Criar trilha para validação</h2><input required value={trailName} onChange={(e) => setTrailName(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Nome da trilha" /><textarea value={trailObjective} onChange={(e) => setTrailObjective(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="O que a pessoa deve conseguir compreender ou fazer depois desta trilha?" /><input value={trailAudience} onChange={(e) => setTrailAudience(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Público: ingressantes; cambonos; filhos da corrente" /><button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Criar trilha</button></form>
          <form onSubmit={addTrailItem} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Curadoria da trilha</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Adicionar livro ou conteúdo</h2><select required value={selectedTrailId} onChange={(e) => setSelectedTrailId(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Selecione a trilha</option>{trails.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setTrailItemType("title"); setTrailItemId(""); }} className={`rounded-xl px-3 py-2 text-sm font-black ${trailItemType === "title" ? "bg-[#00334E] text-white" : "bg-[#F4FBF7] text-[#00334E]"}`}>Livro</button><button type="button" onClick={() => { setTrailItemType("resource"); setTrailItemId(""); }} className={`rounded-xl px-3 py-2 text-sm font-black ${trailItemType === "resource" ? "bg-[#00334E] text-white" : "bg-[#F4FBF7] text-[#00334E]"}`}>Conteúdo</button></div><select required value={trailItemId} onChange={(e) => setTrailItemId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"><option value="">Selecione</option>{(trailItemType === "title" ? titles : resources).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><input value={trailItemNote} onChange={(e) => setTrailItemNote(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" placeholder="Por que este conteúdo está na trilha?" /><button disabled={saving} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50">Adicionar à trilha</button></form>
          <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 xl:col-span-2"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Trilhas atuais</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{trails.map((trail) => <article key={trail.id} className="rounded-2xl bg-[#F9FBF7] p-4 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#00334E]">{trail.name}</p><p className="mt-1 text-xs font-bold text-[#2F6B43]">{trail.official ? "Oficial" : "Aguardando validação"}</p><div className="mt-2 grid gap-1">{trailItems.filter((item) => item.trail_id === trail.id).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-600"><span>{item.title_id ? titleMap.get(item.title_id)?.title : item.resource_id ? resourceMap.get(item.resource_id)?.title : "Item"}</span><button type="button" disabled={saving} onClick={() => void run({ action: "remove-trail-item", itemId: item.id }, "Item removido da trilha.")} className="font-black text-red-700">×</button></div>)}</div></article>)}</div></section>
          <form onSubmit={createCuration} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 xl:col-span-2"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Integrações</p><h2 className="mt-1 text-xl font-black text-[#00334E]">Conectar conhecimento às atividades do Tucxa</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><select value={curationType} onChange={(e) => setCurationType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="clube_do_livro">Clube do Livro</option><option value="grupo_de_estudos">Grupo de Estudos</option><option value="curso_preparatorio">Curso Preparatório</option><option value="aula">Aula</option><option value="destaque">Destaque do Acervo</option></select><input required value={curationTitle} onChange={(e) => setCurationTitle(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-1 lg:col-span-2" placeholder="Título da integração / recomendação" /><textarea value={curationDescription} onChange={(e) => setCurationDescription(e.target.value)} rows={2} className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2 lg:col-span-3" placeholder="Por que este conteúdo foi recomendado e como se conecta à atividade?" /><select value={curationTitleId} onChange={(e) => setCurationTitleId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="">Livro (opcional)</option>{titles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select value={curationCourseId} onChange={(e) => { setCurationCourseId(e.target.value); setCurationLessonId(""); }} className="rounded-xl border border-slate-200 px-3 py-3"><option value="">Curso (opcional)</option>{(payload.courses ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={curationLessonId} onChange={(e) => setCurationLessonId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3"><option value="">Aula (opcional)</option>{(payload.lessons ?? []).filter((item) => !curationCourseId || item.course_id === curationCourseId).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select value={curationEventId} onChange={(e) => setCurationEventId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 sm:col-span-2 lg:col-span-3"><option value="">Evento da Agenda Viva (opcional)</option>{(payload.agendaEvents ?? []).map((item) => <option key={item.id} value={item.id}>{item.title}{item.starts_at ? ` — ${formatDate(item.starts_at)}` : ""}</option>)}</select></div><button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Criar integração</button></form>
        </div>
      )}

      {qrDataUrl && <div className="fixed inset-0 z-[230] flex items-center justify-center bg-[#10251C]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) setQrDataUrl(""); }}><section className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-center shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Etiqueta do exemplar</p><h2 className="mt-1 text-xl font-black text-[#00334E]">{qrAssetCode}</h2><div role="img" aria-label={`QR Code do exemplar ${qrAssetCode}`} className="mx-auto mt-4 h-64 w-64 max-w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${qrDataUrl})` }} /><p className="mt-2 text-xs font-semibold text-slate-500">Este QR identifica exclusivamente o exemplar físico. Imprima junto do código patrimonial.</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => window.print()} className="rounded-xl bg-[#2F6B43] px-4 py-3 font-black text-white">Imprimir</button><button type="button" onClick={() => setQrDataUrl("")} className="rounded-xl bg-[#00334E] px-4 py-3 font-black text-white">Fechar</button></div></section></div>}

      {selectedTitleId && coverCandidates.length > 0 && <div className="fixed inset-0 z-[220] flex items-end justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) { setCoverCandidates([]); setSelectedTitleId(""); } }}><section className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Enriquecimento de cadastro</p><h2 className="mt-1 text-2xl font-black text-[#00334E]">Confirme a edição antes de usar a capa</h2><p className="mt-1 text-sm font-semibold text-slate-600">A busca sugere candidatos. A escolha é humana porque edições diferentes podem ter capas diferentes.</p></div><button type="button" onClick={() => { setCoverCandidates([]); setSelectedTitleId(""); }} className="rounded-xl bg-[#00334E] px-3 py-2 text-xs font-black text-white">Fechar</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{coverCandidates.map((candidate) => <button key={candidate.externalId} type="button" disabled={saving || !candidate.coverUrl} onClick={() => void applyCover(candidate)} className="flex gap-3 rounded-2xl bg-[#F9FBF7] p-3 text-left ring-1 ring-[#123D2C]/10 disabled:opacity-50"><Cover url={candidate.coverUrl} title={candidate.title} /><span className="min-w-0"><span className="block font-black text-[#00334E]">{candidate.title}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{candidate.authors?.join(", ") || "Autor não informado"}</span><span className="mt-2 block text-[10px] font-black text-[#2F6B43]">{candidate.publisher || "Editora não informada"}{candidate.publicationYear ? ` • ${candidate.publicationYear}` : ""}</span></span></button>)}</div></section></div>}
    </OrganizacaoClientShell>
  );
}
