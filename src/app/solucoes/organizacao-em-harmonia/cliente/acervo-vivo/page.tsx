"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  metadata?: {
    last_inventory_at?: string | null;
    last_inventory_by_person_id?: string | null;
    last_inventory_observed_shelf?: string | null;
    inventory_status?: string | null;
    qr_label_confirmed_at?: string | null;
  } | null;
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
  availableCopy?: CopyRow | null;
};
type Resource = { id: string; resource_type: string; title: string; governance_status: string; description?: string | null; metadata?: Record<string, unknown> | null };
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
  description?: string | null;
  source?: "google-books" | "open-library";
};

type FolhaYear = {
  id?: string;
  year: number;
  summary?: string | null;
  highlights?: string[] | null;
  events?: Array<{ title?: string; date?: string; description?: string }> | null;
  photos?: Array<{ url?: string; caption?: string }> | null;
};

type Payload = {
  permissions?: {
    library?: boolean;
    libraryRules?: boolean;
    folhaVerde?: boolean;
    grupoEstudos?: boolean;
    clubeLivro?: boolean;
    reception?: boolean;
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
    metadata?: {
      pickup_location?: string;
      self_service_enabled?: boolean;
      notification_emails?: string[];
      loan_reminder_days_before_due?: number;
    } | null;
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
  folhaYears?: FolhaYear[];
  integrationsWarning?: string | null;
  metrics?: {
    titles?: number;
    copies?: number;
    available?: number;
    loaned?: number;
    overdue?: number;
    reservations?: number;
    pendingCovers?: number;
    pendingDescriptions?: number;
  };
};

type Tab = "visao" | "acervo" | "circulacao" | "inventario" | "conteudos" | "trilhas";

type PanelView =
  | ""
  | "visao-resumo"
  | "visao-regras"
  | "visao-fluxo"
  | "visao-alertas"
  | "acervo-catalogo"
  | "acervo-titulo"
  | "acervo-exemplar"
  | "acervo-capas"
  | "acervo-descricoes"
  | "acervo-qrs"
  | "circulacao-reservas"
  | "circulacao-emprestimos"
  | "circulacao-direto"
  | "inventario-categoria"
  | "inventario-iniciar"
  | "inventario-codigo"
  | "inventario-historico"
  | "conteudos-lista"
  | "conteudos-cadastrar"
  | "conteudos-folha"
  | "conteudos-versao"
  | "trilhas-lista"
  | "trilhas-criar"
  | "trilhas-item"
  | "trilhas-integracao";

type BatchQrLabel = {
  copyId: string;
  assetCode: string;
  legacyCode?: string | null;
  title: string;
  category: string;
  qrDataUrl: string;
};

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

function ActionTile({
  title,
  subtitle = "TOQUE PARA ABRIR",
  note,
  onClick,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  note?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-[78px] rounded-2xl bg-white px-3 py-3 text-left text-[#00334E] shadow-sm ring-1 ring-[#123D2C]/10 disabled:opacity-50"
    >
      <span className="block text-sm font-black leading-tight">{title}</span>
      {note && <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">{note}</span>}
      <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{subtitle}</span>
    </button>
  );
}

function CompactPager({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-[#123D2C]/10">
      <button
        type="button"
        disabled={page <= 0}
        onClick={() => onChange(Math.max(0, page - 1))}
        className="rounded-xl bg-[#F4FBF7] px-3 py-2 text-[10px] font-black text-[#00334E] disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-[10px] font-black text-slate-500">
        {Math.min(page + 1, pages)} / {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages - 1}
        onClick={() => onChange(Math.min(pages - 1, page + 1))}
        className="rounded-xl bg-[#F4FBF7] px-3 py-2 text-[10px] font-black text-[#00334E] disabled:opacity-40"
      >
        Próxima
      </button>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character] ?? character;
  });
}

function ManagementModal({
  title,
  onClose,
  onBack,
  children,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] bg-[#F6F8F3] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Gestão do Acervo Vivo</p>
            <h2 className="truncate text-lg font-black text-[#00334E] sm:text-xl">{title}</h2>
          </div>
          <div className="flex shrink-0 gap-2">
            {onBack && (
              <button type="button" onClick={onBack} className="rounded-xl bg-[#E7F0E2] px-3 py-2 text-xs font-black text-[#00334E]">
                Voltar
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-xl bg-[#00334E] px-4 py-2 text-xs font-black text-white">
              Fechar
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto p-3 sm:p-4">{children}</div>
      </section>
    </div>
  );
}

function parseSemicolonCsv(textValue: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < textValue.length; index += 1) {
    const char = textValue[index];
    const next = textValue[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === ";") {
      row.push(field);
      field = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export default function AcervoVivoGestaoPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("visao");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>("");
  const [query, setQuery] = useState("");
  const [catalogPage, setCatalogPage] = useState(0);
  const [loanPage, setLoanPage] = useState(0);
  const [reservationPage, setReservationPage] = useState(0);
  const [contentPage, setContentPage] = useState(0);
  const [trailPage, setTrailPage] = useState(0);
  const [inventoryHistoryPage, setInventoryHistoryPage] = useState(0);
  const [inventoryCategoryPage, setInventoryCategoryPage] = useState(0);
  const [inventoryCopyPage, setInventoryCopyPage] = useState(0);
  const [qrCategoryPage, setQrCategoryPage] = useState(0);

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
  const [pickupLocation, setPickupLocation] = useState("Tucxa 1");
  const [selfServiceEnabled, setSelfServiceEnabled] = useState(true);
  const [notificationEmails, setNotificationEmails] = useState("");
  const [loanReminderDays, setLoanReminderDays] = useState(3);

  const [editingTitleId, setEditingTitleId] = useState("");
  const [titleName, setTitleName] = useState("");
  const [titleAuthors, setTitleAuthors] = useState("");
  const [titlePublisher, setTitlePublisher] = useState("");
  const [titleYear, setTitleYear] = useState("");
  const [titleIsbn, setTitleIsbn] = useState("");
  const [titleSubjects, setTitleSubjects] = useState("");
  const [titleDescription, setTitleDescription] = useState("");
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [coverCandidates, setCoverCandidates] = useState<CoverCandidate[]>([]);
  const [descriptionOverwrite, setDescriptionOverwrite] = useState(false);

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
  const [inventoryCategory, setInventoryCategory] = useState("");
  const [inventoryCopyId, setInventoryCopyId] = useState("");
  const [inventoryObservedShelf, setInventoryObservedShelf] = useState("");
  const [inventoryQrConfirmed, setInventoryQrConfirmed] = useState(false);
  const [inventoryDateIso, setInventoryDateIso] = useState("");
  const [qrCategory, setQrCategory] = useState("");
  const [printingCategory, setPrintingCategory] = useState("");
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

  const [folhaYear, setFolhaYear] = useState("");
  const [folhaYearSummary, setFolhaYearSummary] = useState("");
  const [folhaYearHighlights, setFolhaYearHighlights] = useState("");
  const [folhaYearEvents, setFolhaYearEvents] = useState("[]");
  const [folhaYearPhotos, setFolhaYearPhotos] = useState("[]");

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
    if (next.permissions?.reception === true && next.permissions?.library !== true) {
      setTab("circulacao");
    }
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
    setPickupLocation(next.settings?.metadata?.pickup_location || "Tucxa 1");
    setSelfServiceEnabled(next.settings?.metadata?.self_service_enabled !== false);
    setNotificationEmails((next.settings?.metadata?.notification_emails ?? []).join("; "));
    setLoanReminderDays(Number(next.settings?.metadata?.loan_reminder_days_before_due ?? 3));
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
  const activeLoans = useMemo(() => loans.filter((item) => !item.returned_at && ["ativo", "atrasado"].includes(item.status)), [loans]);
  const activeReservations = useMemo(() => reservations.filter((item) => ["aguardando", "disponivel"].includes(item.status)), [reservations]);
  const availableCopies = useMemo(() => copies.filter((item) => item.active !== false && item.status === "disponivel"), [copies]);
  const inventorySessions = useMemo(() => payload.inventorySessions ?? [], [payload.inventorySessions]);
  const inventoryScans = useMemo(() => payload.inventoryScans ?? [], [payload.inventoryScans]);
  const openInventories = useMemo(() => inventorySessions.filter((item) => item.status === "aberto"), [inventorySessions]);

  const catalogCategories = useMemo(() => {
    const labels = new Map<string, string>();
    for (const title of titles) {
      for (const subject of title.subjects ?? []) {
        const label = subject.trim();
        if (!label) continue;
        const key = label.toLocaleLowerCase("pt-BR");
        if (!labels.has(key)) labels.set(key, label);
      }
    }
    return Array.from(labels.values()).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  }, [titles]);

  const inventoryCopies = useMemo(() => {
    if (!inventoryCategory) return [];
    const normalizedCategory = inventoryCategory.toLocaleLowerCase("pt-BR");
    const matchingTitleIds = new Set(
      titles
        .filter((item) => (item.subjects ?? []).some((subject) => subject.trim().toLocaleLowerCase("pt-BR") === normalizedCategory))
        .map((item) => item.id),
    );
    return copies
      .filter((copy) => copy.active !== false && matchingTitleIds.has(copy.title_id))
      .sort((a, b) =>
        (a.legacy_code || a.asset_code).localeCompare(b.legacy_code || b.asset_code, "pt-BR", {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [copies, inventoryCategory, titles]);

  const selectedInventoryCopy = useMemo(
    () => copies.find((copy) => copy.id === inventoryCopyId) ?? null,
    [copies, inventoryCopyId],
  );
  const selectedInventoryTitle = useMemo(
    () => (selectedInventoryCopy ? titleMap.get(selectedInventoryCopy.title_id) ?? null : null),
    [selectedInventoryCopy, titleMap],
  );

  const permissions = payload.permissions ?? {};
  const canManageLibrary = permissions.library === true;
  const canManageRules = permissions.libraryRules === true;
  const canManageFolhaVerde = permissions.folhaVerde === true || canManageLibrary;
  const canManageGrupoEstudos = permissions.grupoEstudos === true || canManageLibrary;
  const canManageClubeLivro = permissions.clubeLivro === true || canManageLibrary;
  const canConfirmPickup = permissions.reception === true || canManageLibrary;
  const receptionOnly =
    permissions.reception === true &&
    !canManageLibrary &&
    permissions.folhaVerde !== true &&
    permissions.grupoEstudos !== true &&
    permissions.clubeLivro !== true;

  const visibleTabs = useMemo<Array<[Tab, string]>>(() => {
    const items: Array<[Tab, string, boolean]> = [
      ["visao", "Visão geral", !receptionOnly],
      ["acervo", "Acervo", canManageLibrary],
      ["circulacao", "Circulação", canConfirmPickup],
      ["inventario", "Inventário", canManageLibrary],
      ["conteudos", "Conteúdos", canManageLibrary || canManageFolhaVerde],
      ["trilhas", "Trilhas + Integrações", canManageLibrary || canManageFolhaVerde || canManageGrupoEstudos || canManageClubeLivro],
    ];
    return items.filter((item) => item[2]).map(([value, label]) => [value, label]);
  }, [
    canConfirmPickup,
    canManageClubeLivro,
    canManageFolhaVerde,
    canManageGrupoEstudos,
    canManageLibrary,
    receptionOnly,
  ]);

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
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      candidates?: CoverCandidate[];
      enriched?: number;
      suggested?: number;
      checked?: number;
      qrDataUrl?: string;
      assetCode?: string;
      id?: string;
      summary?: { expected?: number; scanned?: number; missing?: number };
      copy?: CopyRow;
      labels?: BatchQrLabel[];
      updated?: number;
      skippedExisting?: number;
      notFound?: number;
    };
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
      pickupLocation,
      selfServiceEnabled,
      notificationEmails,
      loanReminderDaysBeforeDue: loanReminderDays,
    }, "Regras do Acervo Vivo atualizadas.");
  }

  function clearTitleForm() {
    setEditingTitleId("");
    setTitleName("");
    setTitleAuthors("");
    setTitlePublisher("");
    setTitleYear("");
    setTitleIsbn("");
    setTitleSubjects("");
    setTitleDescription("");
  }

  function startEditTitle(item: TitleRow) {
    setEditingTitleId(item.id);
    setTitleName(item.title);
    setTitleAuthors((item.authors ?? []).join("; "));
    setTitlePublisher(item.publisher ?? "");
    setTitleYear(item.publication_year ? String(item.publication_year) : "");
    setTitleIsbn(item.isbn13 ?? "");
    setTitleSubjects((item.subjects ?? []).join("; "));
    setTitleDescription(item.description ?? "");
    setTab("acervo");
    setPanelView("acervo-titulo");
    setPanelOpen(true);
  }

  async function createTitle(event: FormEvent) {
    event.preventDefault();
    const editing = Boolean(editingTitleId);
    await run({
      action: editing ? "update-title" : "create-title",
      titleId: editingTitleId || undefined,
      title: titleName,
      authors: titleAuthors,
      publisher: titlePublisher,
      publicationYear: titleYear,
      isbn13: titleIsbn,
      subjects: titleSubjects,
      description: titleDescription,
    }, editing ? "Informações do título atualizadas." : "Título cadastrado no Acervo Vivo.");
    clearTitleForm();
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
      const result = await post({ action: "enrich-covers", limit: 10 });
      setSuccess(`Capas pesquisadas: ${result.checked ?? 0}. Correspondências fortes: ${result.enriched ?? 0}. Sugestões para revisar: ${result.suggested ?? 0}.`);
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao pesquisar capas em lote.");
    } finally { setSaving(false); }
  }

  async function applyCover(candidate: CoverCandidate) {
    if (!selectedTitleId) return;
    await run({ action: "apply-cover", titleId: selectedTitleId, coverUrl: candidate.coverUrl, externalId: candidate.externalId, isbn10: candidate.isbn10, isbn13: candidate.isbn13, publisher: candidate.publisher, coverSource: candidate.source || "google-books", description: candidate.description }, "Capa confirmada e vinculada ao título.");
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

  async function confirmReservationLoan(reservationId: string) {
    await run(
      { action: "confirm-reservation-loan", reservationId },
      "Retirada confirmada. O empréstimo foi iniciado e a data de devolução calculada pelas regras vigentes.",
    );
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

  function downloadQrPng() {
    if (!qrDataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `QR-Acervo-Vivo-${qrAssetCode || "exemplar"}-1024x1024.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function printQrPng() {
    if (!qrDataUrl) return;
    const popup = window.open("", "_blank", "width=1100,height=1100");
    if (!popup) {
      setError("O navegador bloqueou a janela de impressão. Permita pop-ups para imprimir o QR Code.");
      return;
    }
    popup.opener = null;
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QR ${qrAssetCode || "Acervo Vivo"}</title><style>@page{margin:8mm}html,body{margin:0;padding:0}body{display:grid;place-items:center;min-height:100vh;background:#fff}img{display:block;width:1024px;height:1024px;max-width:100%;object-fit:contain}@media print{body{min-height:auto}}</style></head><body><img id="qr" alt="QR Code ${qrAssetCode || "Acervo Vivo"}" src="${qrDataUrl}"></body></html>`);
    popup.document.close();
    const image = popup.document.getElementById("qr") as HTMLImageElement | null;
    const print = () => {
      popup.focus();
      popup.print();
    };
    if (image?.complete) window.setTimeout(print, 100);
    else if (image) image.onload = print;
    else window.setTimeout(print, 300);
  }

  async function printCategoryQrs(category: string) {
    if (!token || saving || printingCategory) return;

    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) {
      setError("O navegador bloqueou a janela de impressão. Permita pop-ups para imprimir os QR Codes.");
      return;
    }

    popup.opener = null;
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QR Codes — ${escapeHtml(category)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#00334e}h1{font-size:22px}p{font-size:13px}</style></head><body><h1>Acervo Vivo — QR Codes</h1><p>Preparando a categoria <strong>${escapeHtml(category)}</strong>...</p></body></html>`);
    popup.document.close();

    setPrintingCategory(category);
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await post({ action: "generate-qr-category", category });
      const labels = result.labels ?? [];

      if (!labels.length) {
        popup.document.open();
        popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QR Codes — ${escapeHtml(category)}</title></head><body><p>Nenhum exemplar ativo foi encontrado para esta categoria.</p></body></html>`);
        popup.document.close();
        setSuccess(`Nenhum exemplar ativo foi encontrado em ${category}.`);
        return;
      }

      const cards = labels
        .map(
          (label) => `
            <article class="label">
              <img src="${label.qrDataUrl}" alt="QR ${escapeHtml(label.assetCode)}">
              <div class="code">${escapeHtml(label.legacyCode || label.assetCode)}</div>
              <div class="asset">${escapeHtml(label.assetCode)}</div>
              <div class="title">${escapeHtml(label.title)}</div>
            </article>`,
        )
        .join("");

      popup.document.open();
      popup.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>QR Codes — ${escapeHtml(category)}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #00334e; font-family: Arial, sans-serif; }
  body { padding: 4mm; }
  header { margin-bottom: 4mm; }
  h1 { margin: 0; font-size: 16pt; }
  header p { margin: 1mm 0 0; font-size: 9pt; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; align-items: start; }
  .label { break-inside: avoid; page-break-inside: avoid; min-height: 58mm; padding: 2mm; text-align: center; border: 0.2mm solid #d9e5da; border-radius: 2mm; }
  .label img { width: 42mm; height: 42mm; object-fit: contain; display: block; margin: 0 auto 1mm; }
  .code { font-size: 9pt; font-weight: 800; line-height: 1.15; }
  .asset { margin-top: .6mm; font-size: 7pt; font-weight: 700; color: #2f6b43; }
  .title { margin-top: 1mm; font-size: 7pt; font-weight: 700; line-height: 1.2; max-height: 17px; overflow: hidden; }
  @media print {
    body { padding: 0; }
    header { display: none; }
  }
</style>
</head>
<body>
<header>
  <h1>Acervo Vivo — ${escapeHtml(category)}</h1>
  <p>${labels.length} QR Code(s), ordenados pelo código físico/patrimonial. As imagens de origem são PNG 1024 × 1024.</p>
</header>
<section class="grid">${cards}</section>
</body>
</html>`);
      popup.document.close();

      const images = Array.from(popup.document.images);
      let loaded = 0;
      const triggerPrint = () => {
        loaded += 1;
        if (loaded >= images.length) {
          window.setTimeout(() => {
            popup.focus();
            popup.print();
          }, 150);
        }
      };

      if (!images.length) {
        window.setTimeout(() => popup.print(), 150);
      } else {
        images.forEach((image) => {
          if (image.complete) triggerPrint();
          else {
            image.addEventListener("load", triggerPrint, { once: true });
            image.addEventListener("error", triggerPrint, { once: true });
          }
        });
      }

      setSuccess(`${labels.length} QR Code(s) preparados para impressão na categoria ${category}.`);
    } catch (currentError) {
      popup.close();
      setError(currentError instanceof Error ? currentError.message : "Erro ao gerar QR Codes por categoria.");
    } finally {
      setPrintingCategory("");
      setSaving(false);
    }
  }

  function selectInventoryCopy(copy: CopyRow) {
    setInventoryCopyId(copy.id);
    setInventoryObservedShelf(copy.shelf ?? "");
    setInventoryQrConfirmed(copy.metadata?.inventory_status === "inventariado");
    setInventoryDateIso(new Date().toISOString());
  }

  function clearInventoryCopy() {
    setInventoryCopyId("");
    setInventoryObservedShelf("");
    setInventoryQrConfirmed(false);
    setInventoryDateIso("");
  }

  async function confirmInventoryCopy() {
    if (!selectedInventoryCopy || !inventoryQrConfirmed || saving) return;
    await run(
      {
        action: "inventory-copy",
        copyId: selectedInventoryCopy.id,
        observedShelf: inventoryObservedShelf,
        qrConfirmed: true,
      },
      `Exemplar ${selectedInventoryCopy.asset_code} inventariado e QR Code confirmado.`,
    );
    clearInventoryCopy();
  }

  function exportPendingCoversCsv() {
    const pending = titles.filter((item) => !item.cover_url || ["pendente", "sugerida"].includes(item.cover_match_status || ""));
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ["id", "titulo", "autor", "isbn10", "isbn13", "arquivo_sugerido"],
      ...pending.map((item) => [
        item.id,
        item.title,
        (item.authors ?? []).join("; "),
        item.isbn10 || "",
        item.isbn13 || "",
        `capa_${item.id}.jpg`,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => escapeCsv(String(value))).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "acervo-vivo-capas-pendentes.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportPendingDescriptionsCsv() {
    const pending = titles.filter((item) => item.active !== false && !(item.description ?? "").trim());
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ["id", "titulo", "autor", "description"],
      ...pending.map((item) => [
        item.id,
        item.title,
        (item.authors ?? []).join("; "),
        "",
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => escapeCsv(String(value))).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "acervo-vivo-descricoes-pendentes.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importDescriptionsCsv(file: File) {
    if (!token || saving) return;
    setSaving(true); setError(""); setSuccess("");

    try {
      const rows = parseSemicolonCsv(await file.text());
      if (rows.length < 2) throw new Error("O CSV não possui linhas de dados.");

      const header = rows[0].map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase());
      const idIndex = header.indexOf("id");
      const descriptionIndex = Math.max(header.indexOf("description"), header.indexOf("descricao"), header.indexOf("descrição"));

      if (idIndex < 0 || descriptionIndex < 0) {
        throw new Error("O CSV precisa das colunas id e description (ou descricao).");
      }

      const descriptions = rows.slice(1)
        .map((values) => ({
          id: (values[idIndex] ?? "").trim(),
          description: (values[descriptionIndex] ?? "").trim(),
        }))
        .filter((item) => item.id && item.description.length >= 20);

      if (!descriptions.length) throw new Error("Nenhuma descrição válida foi encontrada no CSV.");

      const result = await post({
        action: "bulk-update-descriptions",
        descriptions,
        overwrite: descriptionOverwrite,
      });

      setSuccess(`Descrições atualizadas: ${result.updated ?? 0}. Existentes preservadas: ${result.skippedExisting ?? 0}. IDs não localizados: ${result.notFound ?? 0}.`);
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao importar descrições.");
    } finally {
      setSaving(false);
    }
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

  async function saveFolhaYear(event: FormEvent) {
    event.preventDefault();
    let events: unknown[] = [];
    let photos: unknown[] = [];
    try {
      const parsedEvents = JSON.parse(folhaYearEvents || "[]");
      const parsedPhotos = JSON.parse(folhaYearPhotos || "[]");
      if (!Array.isArray(parsedEvents) || !Array.isArray(parsedPhotos)) throw new Error();
      events = parsedEvents;
      photos = parsedPhotos;
    } catch {
      setError('Eventos e fotos devem estar em JSON válido no formato de lista.');
      return;
    }
    await run({
      action: "save-folha-year",
      year: Number(folhaYear),
      summary: folhaYearSummary,
      highlights: folhaYearHighlights,
      events,
      photos,
    }, "Memória anual do Folha Verde atualizada.");
  }

  function editFolhaYear(item: FolhaYear) {
    setFolhaYear(String(item.year));
    setFolhaYearSummary(item.summary || "");
    setFolhaYearHighlights((item.highlights ?? []).join("; "));
    setFolhaYearEvents(JSON.stringify(item.events ?? [], null, 2));
    setFolhaYearPhotos(JSON.stringify(item.photos ?? [], null, 2));
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

  const panelViewTitles: Partial<Record<PanelView, string>> = {
    "visao-resumo": "Visão geral",
    "visao-regras": "Prazos e limites",
    "visao-fluxo": "Fluxo self-service",
    "visao-alertas": "Comunicação e lembretes",
    "acervo-catalogo": "Consultar catálogo",
    "acervo-titulo": editingTitleId ? "Editar título" : "Cadastrar título",
    "acervo-exemplar": "Adicionar exemplar",
    "acervo-capas": "Capas pendentes",
    "acervo-descricoes": "Descrições dos livros",
    "acervo-qrs": "QR Codes por categoria",
    "circulacao-reservas": "Reservas e retiradas",
    "circulacao-emprestimos": "Empréstimos ativos",
    "circulacao-direto": "Empréstimo direto",
    "inventario-categoria": "Inventariar por categoria",
    "inventario-iniciar": "Iniciar inventário",
    "inventario-codigo": "Conferir por código",
    "inventario-historico": "Histórico de inventários",
    "conteudos-lista": "Conteúdos cadastrados",
    "conteudos-cadastrar": "Cadastrar conteúdo",
    "conteudos-folha": "Folha Verde por ano",
    "conteudos-versao": "Registrar versão",
    "trilhas-lista": "Trilhas atuais",
    "trilhas-criar": "Criar trilha",
    "trilhas-item": "Adicionar à trilha",
    "trilhas-integracao": "Criar integração",
  };

  const panelTitle = panelView
    ? panelViewTitles[panelView] ?? "Gestão do Acervo"
    : visibleTabs.find(([value]) => value === tab)?.[1] ?? "Gestão do Acervo";

  const catalogPageSize = 3;
  const reservationPageSize = 4;
  const loanPageSize = 4;
  const contentPageSize = 6;
  const trailPageSize = 4;
  const inventoryHistoryPageSize = 4;
  const categoryPageSize = 6;
  const inventoryCopyPageSize = 6;

  const catalogItems = visibleTitles.slice(catalogPage * catalogPageSize, (catalogPage + 1) * catalogPageSize);
  const reservationItems = activeReservations.slice(reservationPage * reservationPageSize, (reservationPage + 1) * reservationPageSize);
  const loanItems = activeLoans.slice(loanPage * loanPageSize, (loanPage + 1) * loanPageSize);
  const contentItems = resources.slice(contentPage * contentPageSize, (contentPage + 1) * contentPageSize);
  const trailItemsPage = trails.slice(trailPage * trailPageSize, (trailPage + 1) * trailPageSize);
  const inventoryHistoryItems = inventorySessions.slice(
    inventoryHistoryPage * inventoryHistoryPageSize,
    (inventoryHistoryPage + 1) * inventoryHistoryPageSize,
  );
  const inventoryCategoryItems = catalogCategories.slice(
    inventoryCategoryPage * categoryPageSize,
    (inventoryCategoryPage + 1) * categoryPageSize,
  );
  const qrCategoryItems = catalogCategories.slice(qrCategoryPage * categoryPageSize, (qrCategoryPage + 1) * categoryPageSize);
  const inventoryCopyItems = inventoryCopies.slice(
    inventoryCopyPage * inventoryCopyPageSize,
    (inventoryCopyPage + 1) * inventoryCopyPageSize,
  );

  function openPanel(nextTab: Tab) {
    setTab(nextTab);
    setPanelView("");
    setPanelOpen(true);
    clearInventoryCopy();
  }

  function closePanel() {
    setPanelOpen(false);
    setPanelView("");
    clearTitleForm();
    clearInventoryCopy();
    setInventoryCategory("");
    setQrCategory("");
  }

  return (
    <OrganizacaoClientShell
      title="Acervo Vivo"
      description="Gestão da Biblioteca em telas curtas: escolha o que deseja fazer e abra somente a área necessária."
      simpleFinancialHeader
      simpleHeaderHideSignOut
      financialBackHref="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/acervo-vivo"
      simpleHeaderHelpMessage="Olá, preciso de ajuda na Gestão do Acervo Vivo do Tucxa em Harmonia."
    >
      {(error || success) && (
        <div className={`rounded-2xl p-3 text-sm font-bold ring-1 ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}>
          {error || success}
        </div>
      )}
      {payload.integrationsWarning && (
        <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
          {payload.integrationsWarning}
        </div>
      )}
      {payload.catalogWarning && (
        <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold leading-5 text-red-800 ring-1 ring-red-200">
          {payload.catalogWarning}
        </div>
      )}

      <section className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:gap-2">
        {[
          ["Títulos", payload.metrics?.titles ?? 0],
          ["Exemplares", payload.metrics?.copies ?? 0],
          ["Disponíveis", payload.metrics?.available ?? 0],
          ["Emprestados", payload.metrics?.loaned ?? 0],
          ["Atrasados", payload.metrics?.overdue ?? 0],
          ["Reservas", payload.metrics?.reservations ?? 0],
          ["Capas pendentes", payload.metrics?.pendingCovers ?? 0],
          ["Descrições pendentes", payload.metrics?.pendingDescriptions ?? 0],
        ].map(([label, value]) => (
          <article key={String(label)} className="min-w-0 rounded-2xl bg-white p-2.5 text-center shadow ring-1 ring-slate-100 sm:p-3">
            <p className="truncate text-[8px] font-black uppercase tracking-[0.08em] text-[#2F6B43] sm:text-[9px]">{label}</p>
            <p className="mt-1 text-lg font-black leading-none text-[#00334E] sm:text-xl">{value}</p>
          </article>
        ))}
      </section>

      {!loading && !canManageLibrary && (canManageFolhaVerde || canManageGrupoEstudos || canManageClubeLivro) && (
        <div className="rounded-2xl bg-sky-50 p-3 text-sm font-bold leading-5 text-sky-900 ring-1 ring-sky-200">
          Seu acesso é especializado: você pode atualizar apenas as áreas ligadas à sua função.
        </div>
      )}

      {!loading && receptionOnly && (
        <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold leading-5 text-emerald-900 ring-1 ring-emerald-200">
          A Recepção confirma a retirada física dos livros. O prazo começa somente após essa confirmação.
        </div>
      )}

      <nav className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-2 shadow ring-1 ring-slate-100 sm:grid-cols-3">
        {visibleTabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={loading}
            onClick={() => openPanel(value)}
            className="rounded-2xl bg-[#F4FBF7] px-3 py-3 text-left text-[#00334E] ring-1 ring-[#123D2C]/10 disabled:opacity-50"
          >
            <span className="block text-xs font-black sm:text-sm">{label}</span>
            <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
          </button>
        ))}
      </nav>

      {panelOpen && (
        <ManagementModal
          title={panelTitle}
          onClose={closePanel}
          onBack={panelView ? () => {
            if (panelView === "inventario-categoria" && inventoryCopyId) {
              clearInventoryCopy();
              return;
            }
            if (panelView === "inventario-categoria" && inventoryCategory) {
              setInventoryCategory("");
              setInventoryCopyPage(0);
              return;
            }
            if (panelView === "acervo-qrs" && qrCategory) {
              setQrCategory("");
              return;
            }
            setPanelView("");
            clearTitleForm();
            clearInventoryCopy();
          } : undefined}
        >
          {loading ? (
            <p className="rounded-3xl bg-white p-5 font-bold text-[#00334E] shadow ring-1 ring-slate-100">
              Carregando gestão do Acervo Vivo...
            </p>
          ) : panelView === "" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tab === "visao" && (
                <>
                  <ActionTile title="Propósito e conexões" onClick={() => setPanelView("visao-resumo")} />
                  {canManageRules && <ActionTile title="Prazos e limites" onClick={() => setPanelView("visao-regras")} />}
                  {canManageRules && <ActionTile title="Fluxo self-service" onClick={() => setPanelView("visao-fluxo")} />}
                  {canManageRules && <ActionTile title="Comunicação" onClick={() => setPanelView("visao-alertas")} />}
                </>
              )}

              {tab === "acervo" && (
                <>
                  <ActionTile title="Consultar catálogo" note={`${titles.length} título(s)`} onClick={() => setPanelView("acervo-catalogo")} />
                  <ActionTile title="Cadastrar título" onClick={() => { clearTitleForm(); setPanelView("acervo-titulo"); }} />
                  <ActionTile title="Adicionar exemplar" onClick={() => setPanelView("acervo-exemplar")} />
                  <ActionTile title="Capas pendentes" note={`${payload.metrics?.pendingCovers ?? 0} pendente(s)`} onClick={() => setPanelView("acervo-capas")} />
                  <ActionTile title="Descrições dos livros" note={`${payload.metrics?.pendingDescriptions ?? 0} pendente(s)`} onClick={() => setPanelView("acervo-descricoes")} />
                  <ActionTile title="QR Codes por categoria" note="Impressão para o inventário físico" onClick={() => { setQrCategory(""); setQrCategoryPage(0); setPanelView("acervo-qrs"); }} />
                </>
              )}

              {tab === "circulacao" && (
                <>
                  <ActionTile title="Reservas e retiradas" note={`${activeReservations.length} ativa(s)`} onClick={() => setPanelView("circulacao-reservas")} />
                  <ActionTile title="Empréstimos ativos" note={`${activeLoans.length} ativo(s)`} onClick={() => setPanelView("circulacao-emprestimos")} />
                  {canManageLibrary && <ActionTile title="Empréstimo direto" note="Uso excepcional no balcão" onClick={() => setPanelView("circulacao-direto")} />}
                </>
              )}

              {tab === "inventario" && (
                <>
                  <ActionTile title="Inventariar por categoria" note="Categoria → código crescente → exemplar" onClick={() => { setInventoryCategory(""); clearInventoryCopy(); setInventoryCategoryPage(0); setInventoryCopyPage(0); setPanelView("inventario-categoria"); }} />
                  <ActionTile title="Iniciar sessão" onClick={() => setPanelView("inventario-iniciar")} />
                  <ActionTile title="Conferir por código" note="QR ou código patrimonial" onClick={() => setPanelView("inventario-codigo")} />
                  <ActionTile title="Histórico" note={`${inventorySessions.length} sessão(ões)`} onClick={() => setPanelView("inventario-historico")} />
                </>
              )}

              {tab === "conteudos" && (
                <>
                  <ActionTile title="Conteúdos cadastrados" note={`${resources.length} conteúdo(s)`} onClick={() => setPanelView("conteudos-lista")} />
                  {canManageLibrary && <ActionTile title="Cadastrar conteúdo" onClick={() => setPanelView("conteudos-cadastrar")} />}
                  {canManageFolhaVerde && <ActionTile title="Folha Verde por ano" onClick={() => setPanelView("conteudos-folha")} />}
                  {canManageLibrary && <ActionTile title="Registrar versão" onClick={() => setPanelView("conteudos-versao")} />}
                </>
              )}

              {tab === "trilhas" && (
                <>
                  <ActionTile title="Trilhas atuais" note={`${trails.length} trilha(s)`} onClick={() => setPanelView("trilhas-lista")} />
                  {canManageLibrary && <ActionTile title="Criar trilha" onClick={() => setPanelView("trilhas-criar")} />}
                  {canManageLibrary && <ActionTile title="Adicionar livro/conteúdo" onClick={() => setPanelView("trilhas-item")} />}
                  <ActionTile title="Criar integração" note="Clube, Grupo, Curso, Aula ou destaque" onClick={() => setPanelView("trilhas-integracao")} />
                </>
              )}
            </div>
          ) : panelView === "visao-resumo" ? (
            <section className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Conhecimento em movimento</p>
              <h3 className="mt-1 text-xl font-black text-[#00334E]">Mais do que controlar livros</h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                O Acervo Vivo conecta Biblioteca, Clube do Livro, Grupo de Estudos, Curso de Entrada, Folha Verde e memória da Casa.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {["Biblioteca física + digital", "Livro do mês", "Grupo de Estudos", "Curso de Entrada", "Folha Verde", "Memória da Casa"].map((item) => (
                  <span key={item} className="rounded-xl bg-[#F4FBF7] px-3 py-2 text-[11px] font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/10">{item}</span>
                ))}
              </div>
            </section>
          ) : panelView === "visao-regras" ? (
            <form onSubmit={saveSettings} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Regras da Biblioteca</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[10px] font-black text-[#00334E]">Prazo (dias)<input type="number" min={1} value={loanDays} onChange={(e) => setLoanDays(Number(e.target.value))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /></label>
                <label className="grid gap-1 text-[10px] font-black text-[#00334E]">Taxa/dia (R$)<input type="number" min={0} step="0.01" value={dailyLateFee} onChange={(e) => setDailyLateFee(Number(e.target.value))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /></label>
                <label className="grid gap-1 text-[10px] font-black text-[#00334E]">Máx. empréstimos<input type="number" min={1} value={maxLoans} onChange={(e) => setMaxLoans(Number(e.target.value))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /></label>
                <label className="grid gap-1 text-[10px] font-black text-[#00334E]">Máx. renovações<input type="number" min={0} value={renewalLimit} onChange={(e) => setRenewalLimit(Number(e.target.value))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /></label>
                <label className="grid gap-1 text-[10px] font-black text-[#00334E] col-span-2">Reserva disponível por (dias)<input type="number" min={1} value={holdDays} onChange={(e) => setHoldDays(Number(e.target.value))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /></label>
              </div>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Salvar prazos e limites</button>
            </form>
          ) : panelView === "visao-fluxo" ? (
            <form onSubmit={saveSettings} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Fluxo self-service</p>
              <div className="mt-3 grid gap-2 text-[11px] font-black text-[#00334E]">
                <label className="flex items-center gap-2 rounded-xl bg-[#F4FBF7] px-3 py-2"><input type="checkbox" checked={memberLoans} onChange={(e) => setMemberLoans(e.target.checked)} />Permitir retirada pelo leitor</label>
                <label className="flex items-center gap-2 rounded-xl bg-[#F4FBF7] px-3 py-2"><input type="checkbox" checked={memberReservations} onChange={(e) => setMemberReservations(e.target.checked)} />Permitir reservas</label>
                <label className="flex items-center gap-2 rounded-xl bg-[#F4FBF7] px-3 py-2"><input type="checkbox" checked={memberRenewals} onChange={(e) => setMemberRenewals(e.target.checked)} />Permitir renovações</label>
                <label className="flex items-center gap-2 rounded-xl bg-[#E9F2E7] px-3 py-2"><input type="checkbox" checked={selfServiceEnabled} onChange={(e) => setSelfServiceEnabled(e.target.checked)} />Permitir autoempréstimo pelo QR</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-2 py-2"><input type="checkbox" checked={blockOverdue} onChange={(e) => setBlockOverdue(e.target.checked)} />Bloquear atraso</label>
                  <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-2 py-2"><input type="checkbox" checked={blockPendingFee} onChange={(e) => setBlockPendingFee(e.target.checked)} />Bloquear taxa</label>
                </div>
                <input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Local de retirada" />
              </div>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Salvar fluxo</button>
            </form>
          ) : panelView === "visao-alertas" ? (
            <form onSubmit={saveSettings} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Comunicação reservada</p>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-[10px] font-black text-[#00334E]">Lembrete antes da devolução (dias)<input type="number" min={0} max={30} value={loanReminderDays} onChange={(e) => setLoanReminderDays(Math.max(0, Math.min(30, Number(e.target.value) || 0)))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
                <label className="grid gap-1 text-[10px] font-black text-[#00334E]">E-mails dos responsáveis<input value={notificationEmails} onChange={(e) => setNotificationEmails(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="email1@...; email2@..." /></label>
              </div>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Salvar comunicação</button>
            </form>
          ) : panelView === "acervo-catalogo" ? (
            <div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setCatalogPage(0); }}
                  className="min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Título, autor ou categoria"
                />
                <button type="button" onClick={() => { clearTitleForm(); setPanelView("acervo-titulo"); }} className="rounded-xl bg-[#00334E] px-3 py-2 text-[10px] font-black text-white">Cadastrar</button>
              </div>
              <div className="mt-3 grid gap-2">
                {catalogItems.map((item) => {
                  const itemCopies = copies.filter((copy) => copy.title_id === item.id && copy.active !== false);
                  return (
                    <article key={item.id} className="flex gap-2 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-[#123D2C]/10">
                      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                        <Cover url={item.cover_url} title={item.title} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-black text-[#00334E]">{item.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] font-bold text-slate-500">{(item.authors ?? []).join(", ") || "Autor não informado"}</p>
                        <p className="mt-0.5 text-[10px] font-semibold text-[#2F6B43]">{item.subjects?.[0] || "Sem categoria"} • {itemCopies.length} exemplar(es)</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <button type="button" disabled={saving} onClick={() => startEditTitle(item)} className="rounded-lg bg-[#00334E] px-2 py-1 text-[9px] font-black text-white">Editar</button>
                          <button type="button" disabled={saving} onClick={() => void searchCover(item.id)} className="rounded-lg bg-white px-2 py-1 text-[9px] font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/20">{item.cover_url ? "Revisar capa" : "Buscar capa"}</button>
                          {itemCopies.slice(0, 2).map((copy) => (
                            <button key={copy.id} type="button" disabled={saving} onClick={() => void showQr(copy.id)} className="rounded-lg bg-[#F4FBF7] px-2 py-1 text-[9px] font-black text-[#00334E]">QR {copy.legacy_code || copy.asset_code}</button>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!catalogItems.length && <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">Nenhum título encontrado.</p>}
              </div>
              <CompactPager page={catalogPage} total={visibleTitles.length} pageSize={catalogPageSize} onChange={setCatalogPage} />
            </div>
          ) : panelView === "acervo-titulo" ? (
            <form onSubmit={createTitle} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <div className="grid gap-2">
                <input required value={titleName} onChange={(e) => setTitleName(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Título" />
                <input value={titleAuthors} onChange={(e) => setTitleAuthors(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Autores (separe por ; )" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={titlePublisher} onChange={(e) => setTitlePublisher(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2" placeholder="Editora" />
                  <input type="number" value={titleYear} onChange={(e) => setTitleYear(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2" placeholder="Ano" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={titleIsbn} onChange={(e) => setTitleIsbn(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2" placeholder="ISBN-13" />
                  <input value={titleSubjects} onChange={(e) => setTitleSubjects(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2" placeholder="Categorias ;" />
                </div>
                <textarea value={titleDescription} onChange={(e) => setTitleDescription(e.target.value)} rows={2} className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Resumo / descrição" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button disabled={saving} className="rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{editingTitleId ? "Salvar alterações" : "Cadastrar título"}</button>
                <button type="button" onClick={() => { clearTitleForm(); setPanelView("acervo-catalogo"); }} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#00334E] ring-1 ring-[#00334E]/20">Cancelar</button>
              </div>
            </form>
          ) : panelView === "acervo-exemplar" ? (
            <form onSubmit={createCopy} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <select required value={copyTitleId} onChange={(e) => setCopyTitleId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">Selecione a obra</option>
                {titles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input value={copyLegacyCode} onChange={(e) => setCopyLegacyCode(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2" placeholder="Código antigo" />
                <input value={copyShelf} onChange={(e) => setCopyShelf(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2" placeholder="Armário / estante" />
              </div>
              <input value={copyPosition} onChange={(e) => setCopyPosition(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Prateleira / posição" />
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Adicionar exemplar</button>
            </form>
          ) : panelView === "acervo-capas" ? (
            <section className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">{payload.metrics?.pendingCovers ?? 0} capa(s) ainda pendente(s)</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">A pesquisa automática prioriza ISBN e depois título + autor. O CSV fica como apoio para exceções.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={saving} onClick={() => void enrichPendingCovers()} className="rounded-xl bg-[#E7F0E2] px-3 py-3 text-xs font-black text-[#2F6B43] disabled:opacity-50">Buscar próximas 10 capas</button>
                <button type="button" onClick={exportPendingCoversCsv} className="rounded-xl bg-white px-3 py-3 text-xs font-black text-[#00334E] ring-1 ring-[#00334E]/20">Baixar CSV pendências</button>
              </div>
            </section>
          ) : panelView === "acervo-descricoes" ? (
            <section className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">{payload.metrics?.pendingDescriptions ?? 0} descrição(ões) ainda pendente(s)</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Baixe a planilha, preencha a coluna description e importe novamente. Por segurança, descrições já existentes são preservadas por padrão.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={exportPendingDescriptionsCsv} className="rounded-xl bg-white px-3 py-3 text-xs font-black text-[#00334E] ring-1 ring-[#00334E]/20">Baixar CSV pendências</button>
                <label className="flex cursor-pointer items-center justify-center rounded-xl bg-[#E7F0E2] px-3 py-3 text-center text-xs font-black text-[#2F6B43]">
                  {saving ? "Importando..." : "Importar CSV preenchido"}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={saving}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void importDescriptionsCsv(file);
                    }}
                  />
                </label>
              </div>
              <label className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-4 text-amber-900">
                <input type="checkbox" checked={descriptionOverwrite} onChange={(event) => setDescriptionOverwrite(event.target.checked)} className="mt-0.5" />
                Sobrescrever descrições que já existem no catálogo. Use somente quando o CSV tiver sido revisado.
              </label>
              <p className="mt-3 rounded-xl bg-[#F4FBF7] p-3 text-[10px] font-semibold leading-4 text-slate-600">Formato aceito: CSV separado por ponto e vírgula, com as colunas <strong>id</strong> e <strong>description</strong>. Até 500 livros por importação.</p>
            </section>
          ) : panelView === "acervo-qrs" ? (
            <div>
              {!qrCategory ? (
                <>
                  <div className="rounded-2xl bg-[#E9F2E7] p-3 text-xs font-semibold leading-5 text-[#00334E]">
                    Os QR Codes são organizados por categoria e, dentro dela, por código crescente para acompanhar a ordem física do armário.
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {qrCategoryItems.map((category) => {
                      const categoryTitleIds = new Set(titles.filter((item) => (item.subjects ?? []).includes(category)).map((item) => item.id));
                      const count = copies.filter((copy) => copy.active !== false && categoryTitleIds.has(copy.title_id)).length;
                      return <ActionTile key={category} title={category} note={`${count} exemplar(es)`} onClick={() => setQrCategory(category)} />;
                    })}
                  </div>
                  <CompactPager page={qrCategoryPage} total={catalogCategories.length} pageSize={categoryPageSize} onChange={setQrCategoryPage} />
                </>
              ) : (
                <section className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Categoria selecionada</p>
                  <h3 className="mt-1 text-xl font-black text-[#00334E]">{qrCategory}</h3>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">A impressão usa PNG 1024 × 1024 como origem e monta etiquetas A4 em 3 colunas, ordenadas pelo código do exemplar.</p>
                  <button type="button" disabled={saving || Boolean(printingCategory)} onClick={() => void printCategoryQrs(qrCategory)} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
                    {printingCategory ? "Preparando QR Codes..." : "Imprimir QR Codes desta categoria"}
                  </button>
                </section>
              )}
            </div>
          ) : panelView === "circulacao-reservas" ? (
            <div>
              <div className="grid gap-2">
                {reservationItems.map((reservation) => (
                  <article key={reservation.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#123D2C]/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-black text-[#00334E]">{reservation.title?.title || "Livro"}</p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-500">{reservation.person?.full_name || "Pessoa"} • {reservation.status === "disponivel" ? `até ${formatDate(reservation.hold_until)}` : "aguardando"}</p>
                        {reservation.availableCopy?.asset_code && <p className="mt-1 text-[10px] font-black text-[#2F6B43]">Exemplar: {reservation.availableCopy.asset_code}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${reservation.status === "disponivel" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{reservation.status === "disponivel" ? "Retirada" : "Fila"}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {reservation.status === "disponivel" && canConfirmPickup && <button disabled={saving || !reservation.availableCopy?.id} type="button" onClick={() => void confirmReservationLoan(reservation.id)} className="rounded-lg bg-[#00334E] px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Confirmar retirada</button>}
                      {canManageLibrary && <button disabled={saving} type="button" onClick={() => void run({ action: "cancel-reservation", reservationId: reservation.id }, "Reserva cancelada e exemplar liberado.")} className="rounded-lg bg-white px-3 py-2 text-[10px] font-black text-red-700 ring-1 ring-red-200 disabled:opacity-50">Cancelar</button>}
                    </div>
                  </article>
                ))}
                {!reservationItems.length && <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">Nenhuma reserva ativa.</p>}
              </div>
              <CompactPager page={reservationPage} total={activeReservations.length} pageSize={reservationPageSize} onChange={setReservationPage} />
            </div>
          ) : panelView === "circulacao-emprestimos" ? (
            <div>
              <div className="grid gap-2">
                {loanItems.map((loan) => {
                  const overdue = loan.isOverdue === true;
                  return (
                    <article key={loan.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#123D2C]/10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-black text-[#00334E]">{loan.title?.title || "Livro"}</p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">{loan.person?.full_name || "Pessoa"} • {loan.copy?.asset_code || "Exemplar"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${overdue ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{overdue ? "Atrasado" : formatDate(loan.due_at)}</span>
                      </div>
                      {canManageLibrary && (
                        <div className="mt-2 flex gap-2">
                          <button disabled={saving} type="button" onClick={() => void run({ action: "return", loanId: loan.id }, "Devolução registrada.")} className="rounded-lg bg-[#00334E] px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">Devolver</button>
                          <button
                            disabled={saving}
                            type="button"
                            onClick={() => {
                              if (!window.confirm(`Excluir definitivamente o empréstimo de "${loan.title?.title || "este livro"}"?`)) return;
                              void run({ action: "delete-loan", loanId: loan.id }, "Empréstimo excluído.");
                            }}
                            className="rounded-lg bg-white px-3 py-2 text-[10px] font-black text-red-700 ring-1 ring-red-200 disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
                {!loanItems.length && <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">Nenhum empréstimo ativo.</p>}
              </div>
              <CompactPager page={loanPage} total={activeLoans.length} pageSize={loanPageSize} onChange={setLoanPage} />
            </div>
          ) : panelView === "circulacao-direto" ? (
            <form onSubmit={createLoan} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-semibold leading-5 text-slate-500">Use somente quando não existir reserva prévia. O fluxo normal é self-service/reserva e confirmação da retirada.</p>
              <select required value={loanPersonId} onChange={(e) => setLoanPersonId(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">Pessoa da Base Única</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email || "Pessoa"}</option>)}
              </select>
              <select required value={loanCopyId} onChange={(e) => setLoanCopyId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">Exemplar disponível</option>
                {availableCopies.map((copy) => <option key={copy.id} value={copy.id}>{copy.asset_code} — {titleMap.get(copy.title_id)?.title || "Livro"}</option>)}
              </select>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Registrar empréstimo direto</button>
            </form>
          ) : panelView === "inventario-categoria" ? (
            <div>
              {!inventoryCategory ? (
                <>
                  <div className="rounded-2xl bg-[#E9F2E7] p-3 text-xs font-semibold leading-5 text-[#00334E]">
                    Escolha a categoria exatamente como o armário está organizado. Na próxima tela, os exemplares aparecem pelo código crescente.
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {inventoryCategoryItems.map((category) => {
                      const normalizedCategory = category.toLocaleLowerCase("pt-BR");
                      const titleIds = new Set(titles.filter((item) => (item.subjects ?? []).some((subject) => subject.trim().toLocaleLowerCase("pt-BR") === normalizedCategory)).map((item) => item.id));
                      const count = copies.filter((copy) => copy.active !== false && titleIds.has(copy.title_id)).length;
                      return <ActionTile key={category} title={category} note={`${count} exemplar(es)`} onClick={() => { setInventoryCategory(category); setInventoryCopyPage(0); }} />;
                    })}
                  </div>
                  <CompactPager page={inventoryCategoryPage} total={catalogCategories.length} pageSize={categoryPageSize} onChange={setInventoryCategoryPage} />
                </>
              ) : !selectedInventoryCopy ? (
                <>
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-[#123D2C]/10">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">Categoria</p>
                      <p className="text-sm font-black text-[#00334E]">{inventoryCategory}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{inventoryCopies.length} exemplar(es)</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {inventoryCopyItems.map((copy) => {
                      const title = titleMap.get(copy.title_id);
                      const inventoried = copy.metadata?.inventory_status === "inventariado";
                      return (
                        <button key={copy.id} type="button" onClick={() => selectInventoryCopy(copy)} className="rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-[#123D2C]/10">
                          <span className="block text-sm font-black text-[#00334E]">{copy.legacy_code || copy.asset_code}</span>
                          <span className="mt-1 block line-clamp-2 text-[10px] font-semibold leading-4 text-slate-600">{title?.title || "Livro"}</span>
                          <span className="mt-1 block text-[9px] font-black uppercase text-[#2F6B43]">{inventoried ? "✓ INVENTARIADO" : "TOQUE PARA INVENTARIAR"}</span>
                        </button>
                      );
                    })}
                  </div>
                  <CompactPager page={inventoryCopyPage} total={inventoryCopies.length} pageSize={inventoryCopyPageSize} onChange={setInventoryCopyPage} />
                </>
              ) : (
                <section className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">Inventário físico • {inventoryDateIso ? formatDate(inventoryDateIso) : "Hoje"}</p>
                      <h3 className="mt-1 line-clamp-2 text-lg font-black text-[#00334E]">{selectedInventoryTitle?.title || "Livro"}</h3>
                    </div>
                    <span className="shrink-0 rounded-xl bg-[#E9F2E7] px-2 py-1 text-[10px] font-black text-[#00334E]">{selectedInventoryCopy.legacy_code || selectedInventoryCopy.asset_code}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
                    {[
                      ["Código patrimonial", selectedInventoryCopy.asset_code],
                      ["Código antigo", selectedInventoryCopy.legacy_code || "—"],
                      ["Armário / estante", selectedInventoryCopy.shelf || "—"],
                      ["Prateleira / posição", selectedInventoryCopy.shelf_position || "—"],
                      ["Condição", selectedInventoryCopy.condition || "—"],
                      ["Status", selectedInventoryCopy.status || "—"],
                      ["Autor", (selectedInventoryTitle?.authors ?? []).join(", ") || "—"],
                      ["Editora / ano", `${selectedInventoryTitle?.publisher || "—"}${selectedInventoryTitle?.publication_year ? ` • ${selectedInventoryTitle.publication_year}` : ""}`],
                      ["ISBN", selectedInventoryTitle?.isbn13 || selectedInventoryTitle?.isbn10 || "—"],
                      ["Categoria", selectedInventoryTitle?.subjects?.[0] || inventoryCategory],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-[#F9FBF7] px-2 py-1.5 ring-1 ring-[#123D2C]/10">
                        <span className="block text-[8px] font-black uppercase text-[#2F6B43]">{label}</span>
                        <span className="mt-0.5 block line-clamp-2 font-bold text-[#00334E]">{value}</span>
                      </div>
                    ))}
                  </div>
                  <input value={inventoryObservedShelf} onChange={(e) => setInventoryObservedShelf(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Estante observada" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" disabled={saving} onClick={() => void showQr(selectedInventoryCopy.id)} className="rounded-xl bg-white px-3 py-2.5 text-[10px] font-black text-[#00334E] ring-1 ring-[#00334E]/20">Ver / imprimir QR</button>
                    <label className="flex items-center justify-center gap-2 rounded-xl bg-[#E9F2E7] px-2 py-2.5 text-[10px] font-black text-[#00334E]"><input type="checkbox" checked={inventoryQrConfirmed} onChange={(e) => setInventoryQrConfirmed(e.target.checked)} />QR correto colado/conferido</label>
                  </div>
                  <button type="button" disabled={saving || !inventoryQrConfirmed} onClick={() => void confirmInventoryCopy()} className="mt-2 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Confirmar e marcar como inventariado</button>
                </section>
              )}
            </div>
          ) : panelView === "inventario-iniciar" ? (
            <form onSubmit={createInventory} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <input value={inventoryName} onChange={(e) => setInventoryName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Ex.: Inventário geral Agosto/2026" />
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Iniciar inventário</button>
            </form>
          ) : panelView === "inventario-codigo" ? (
            <form onSubmit={scanInventory} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <select required value={inventorySessionId} onChange={(e) => setInventorySessionId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">Sessão aberta</option>
                {openInventories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input required value={inventoryCode} onChange={(e) => setInventoryCode(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Leia o QR ou digite ACV-..." />
              <input value={inventoryShelf} onChange={(e) => setInventoryShelf(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Estante observada" />
              <button disabled={saving || !inventorySessionId} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Conferir exemplar</button>
            </form>
          ) : panelView === "inventario-historico" ? (
            <div>
              <div className="grid gap-2">
                {inventoryHistoryItems.map((session) => {
                  const scanned = inventoryScans.filter((item) => item.session_id === session.id).length;
                  return (
                    <article key={session.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#123D2C]/10">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-[#00334E]">{session.name}</p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">{formatDate(session.started_at)} • {session.status === "aberto" ? `${scanned} conferidos` : `${session.metadata?.scanned ?? scanned}/${session.metadata?.expected ?? "—"}`}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[9px] font-black ${session.status === "aberto" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{session.status}</span>
                      </div>
                      {session.status === "aberto" && <button type="button" disabled={saving} onClick={() => void closeInventory(session.id)} className="mt-2 rounded-xl bg-[#00334E] px-3 py-2 text-[10px] font-black text-white">Concluir</button>}
                    </article>
                  );
                })}
                {!inventoryHistoryItems.length && <p className="rounded-2xl bg-white p-4 text-sm font-semibold text-slate-500">Nenhum inventário iniciado.</p>}
              </div>
              <CompactPager page={inventoryHistoryPage} total={inventorySessions.length} pageSize={inventoryHistoryPageSize} onChange={setInventoryHistoryPage} />
            </div>
          ) : panelView === "conteudos-lista" ? (
            <div>
              <div className="grid grid-cols-2 gap-2">
                {contentItems.map((item) => {
                  const current = versions.find((version) => version.resource_id === item.id && version.is_current);
                  return (
                    <article key={item.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#123D2C]/10">
                      <p className="line-clamp-2 text-sm font-black text-[#00334E]">{item.title}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase text-[#2F6B43]">{item.resource_type.replaceAll("_", " ")}</p>
                      {current && <p className="mt-1 line-clamp-1 text-[9px] font-semibold text-slate-500">Vigente: {current.version_label}</p>}
                    </article>
                  );
                })}
              </div>
              <CompactPager page={contentPage} total={resources.length} pageSize={contentPageSize} onChange={setContentPage} />
            </div>
          ) : panelView === "conteudos-cadastrar" ? (
            <form onSubmit={createResource} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm"><option value="regulamento">Regulamento</option><option value="procedimento">Procedimento</option><option value="manual">Manual</option><option value="folha_verde">Folha Verde</option><option value="apostila">Apostila</option><option value="video">Vídeo</option><option value="podcast">Podcast</option><option value="audio">Áudio</option><option value="memoria_da_casa">Memória da Casa</option><option value="outro">Outro</option></select>
                <select value={resourceGovernance} onChange={(e) => setResourceGovernance(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm"><option value="rascunho">Rascunho</option><option value="em_revisao">Em revisão</option><option value="vigente">Vigente</option><option value="arquivado">Arquivado</option></select>
              </div>
              <input required value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Título" />
              <input value={resourceSubjects} onChange={(e) => setResourceSubjects(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Temas separados por ;" />
              <textarea value={resourceDescription} onChange={(e) => setResourceDescription(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Descrição e objetivo" />
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Cadastrar conteúdo</button>
            </form>
          ) : panelView === "conteudos-folha" ? (
            <form onSubmit={saveFolhaYear} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min={1900} max={2200} required value={folhaYear} onChange={(e) => setFolhaYear(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2" placeholder="Ano" />
                <input value={folhaYearHighlights} onChange={(e) => setFolhaYearHighlights(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2" placeholder="Destaques ;" />
              </div>
              <textarea value={folhaYearSummary} onChange={(e) => setFolhaYearSummary(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Resumo do ano" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <textarea value={folhaYearEvents} onChange={(e) => setFolhaYearEvents(e.target.value)} rows={2} className="rounded-xl border border-slate-200 px-2 py-2 font-mono text-[10px]" placeholder='[{"title":"Evento"}]' />
                <textarea value={folhaYearPhotos} onChange={(e) => setFolhaYearPhotos(e.target.value)} rows={2} className="rounded-xl border border-slate-200 px-2 py-2 font-mono text-[10px]" placeholder='[{"url":"https://..."}]' />
              </div>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Salvar memória anual</button>
              <div className="mt-2 flex flex-wrap gap-1">
                {(payload.folhaYears ?? []).slice(0, 8).map((item) => <button key={item.year} type="button" onClick={() => editFolhaYear(item)} className="rounded-lg bg-[#F4FBF7] px-2 py-1 text-[9px] font-black text-[#00334E]">Editar {item.year}</button>)}
              </div>
            </form>
          ) : panelView === "conteudos-versao" ? (
            <form onSubmit={createVersion} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <select required value={versionResourceId} onChange={(e) => setVersionResourceId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Selecione o conteúdo</option>{resources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
              <input required value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Versão: ex. Março/2026 - Rev. 02" />
              <input value={versionUrl} onChange={(e) => setVersionUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Link do Drive/site" />
              <label className="mt-2 flex items-center gap-2 rounded-xl bg-[#F4FBF7] p-2 text-xs font-black text-[#00334E]"><input type="checkbox" checked={versionCurrent} onChange={(e) => setVersionCurrent(e.target.checked)} />Marcar como versão vigente</label>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Registrar versão</button>
            </form>
          ) : panelView === "trilhas-lista" ? (
            <div>
              <div className="grid grid-cols-2 gap-2">
                {trailItemsPage.map((trail) => (
                  <article key={trail.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#123D2C]/10">
                    <p className="line-clamp-2 text-sm font-black text-[#00334E]">{trail.name}</p>
                    <p className="mt-1 text-[9px] font-bold text-[#2F6B43]">{trail.official ? "Oficial" : "Aguardando validação"}</p>
                    <p className="mt-1 text-[9px] font-semibold text-slate-500">{trailItems.filter((item) => item.trail_id === trail.id).length} item(ns)</p>
                  </article>
                ))}
              </div>
              <CompactPager page={trailPage} total={trails.length} pageSize={trailPageSize} onChange={setTrailPage} />
            </div>
          ) : panelView === "trilhas-criar" ? (
            <form onSubmit={createTrail} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <input required value={trailName} onChange={(e) => setTrailName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Nome da trilha" />
              <textarea value={trailObjective} onChange={(e) => setTrailObjective(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Objetivo da trilha" />
              <input value={trailAudience} onChange={(e) => setTrailAudience(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Público" />
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Criar trilha</button>
            </form>
          ) : panelView === "trilhas-item" ? (
            <form onSubmit={addTrailItem} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <select required value={selectedTrailId} onChange={(e) => setSelectedTrailId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Selecione a trilha</option>{trails.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setTrailItemType("title"); setTrailItemId(""); }} className={`rounded-xl px-3 py-2 text-xs font-black ${trailItemType === "title" ? "bg-[#00334E] text-white" : "bg-[#F4FBF7] text-[#00334E]"}`}>Livro</button>
                <button type="button" onClick={() => { setTrailItemType("resource"); setTrailItemId(""); }} className={`rounded-xl px-3 py-2 text-xs font-black ${trailItemType === "resource" ? "bg-[#00334E] text-white" : "bg-[#F4FBF7] text-[#00334E]"}`}>Conteúdo</button>
              </div>
              <select required value={trailItemId} onChange={(e) => setTrailItemId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Selecione</option>{(trailItemType === "title" ? titles : resources).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
              <input value={trailItemNote} onChange={(e) => setTrailItemNote(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Por que este conteúdo está na trilha?" />
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#2F6B43] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Adicionar à trilha</button>
            </form>
          ) : panelView === "trilhas-integracao" ? (
            <form onSubmit={createCuration} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <select value={curationType} onChange={(e) => setCurationType(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm"><option value="clube_do_livro">Clube do Livro</option><option value="grupo_de_estudos">Grupo de Estudos</option><option value="curso_preparatorio">Curso de Entrada</option><option value="aula">Aula</option><option value="destaque">Destaque</option></select>
                <select value={curationTitleId} onChange={(e) => setCurationTitleId(e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm"><option value="">Livro (opcional)</option>{titles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
              </div>
              <input required value={curationTitle} onChange={(e) => setCurationTitle(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Título da integração" />
              <textarea value={curationDescription} onChange={(e) => setCurationDescription(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Por que este conteúdo foi recomendado?" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select value={curationCourseId} onChange={(e) => { setCurationCourseId(e.target.value); setCurationLessonId(""); }} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-sm"><option value="">Curso</option>{(payload.courses ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select value={curationLessonId} onChange={(e) => setCurationLessonId(e.target.value)} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-sm"><option value="">Aula</option>{(payload.lessons ?? []).filter((item) => !curationCourseId || item.course_id === curationCourseId).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
              </div>
              <select value={curationEventId} onChange={(e) => setCurationEventId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Evento da Agenda Viva (opcional)</option>{(payload.agendaEvents ?? []).map((item) => <option key={item.id} value={item.id}>{item.title}{item.starts_at ? ` — ${formatDate(item.starts_at)}` : ""}</option>)}</select>
              <button disabled={saving} className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">Criar integração</button>
            </form>
          ) : null}
        </ManagementModal>
      )}

      {qrDataUrl && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-[#10251C]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) setQrDataUrl(""); }}>
          <section className="w-full max-w-sm rounded-[2rem] bg-white p-4 text-center shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Etiqueta do exemplar • 1024 × 1024</p>
            <h2 className="mt-1 text-lg font-black text-[#00334E]">{qrAssetCode}</h2>
            <div role="img" aria-label={`QR Code do exemplar ${qrAssetCode}`} className="mx-auto mt-3 h-56 w-56 max-w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${qrDataUrl})` }} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button type="button" onClick={downloadQrPng} className="rounded-xl bg-[#123D2C] px-2 py-2.5 text-[10px] font-black text-white">Baixar PNG</button>
              <button type="button" onClick={printQrPng} className="rounded-xl bg-[#2F6B43] px-2 py-2.5 text-[10px] font-black text-white">Imprimir</button>
              <button type="button" onClick={() => setQrDataUrl("")} className="rounded-xl bg-[#00334E] px-2 py-2.5 text-[10px] font-black text-white">Fechar</button>
            </div>
          </section>
        </div>
      )}

      {selectedTitleId && coverCandidates.length > 0 && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) { setCoverCandidates([]); setSelectedTitleId(""); } }}>
          <section className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Enriquecimento de cadastro</p>
                <h2 className="mt-1 text-lg font-black text-[#00334E]">Confirme a edição antes de usar a capa</h2>
              </div>
              <button type="button" onClick={() => { setCoverCandidates([]); setSelectedTitleId(""); }} className="rounded-xl bg-[#00334E] px-3 py-2 text-xs font-black text-white">Fechar</button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {coverCandidates.map((candidate) => (
                <button key={candidate.externalId} type="button" disabled={saving || !candidate.coverUrl} onClick={() => void applyCover(candidate)} className="flex gap-3 rounded-2xl bg-[#F9FBF7] p-3 text-left ring-1 ring-[#123D2C]/10 disabled:opacity-50">
                  <Cover url={candidate.coverUrl} title={candidate.title} />
                  <span className="min-w-0">
                    <span className="block line-clamp-2 text-sm font-black text-[#00334E]">{candidate.title}</span>
                    <span className="mt-1 block line-clamp-1 text-[10px] font-semibold text-slate-500">{candidate.authors?.join(", ") || "Autor não informado"}</span>
                    <span className="mt-2 block text-[9px] font-black text-[#2F6B43]">{candidate.publisher || "Editora não informada"}{candidate.publicationYear ? ` • ${candidate.publicationYear}` : ""}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </OrganizacaoClientShell>
  );
}
