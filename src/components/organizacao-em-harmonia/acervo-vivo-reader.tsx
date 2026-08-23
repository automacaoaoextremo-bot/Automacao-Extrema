"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ReviewComment = {
  id: string;
  rating?: number | null;
  comment?: string | null;
  created_at: string;
};

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
  averageRating?: number;
  reviewCount?: number;
  comments?: ReviewComment[];
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
  reader?: {
    personName?: string;
    personEmail?: string | null;
    personWhatsapp?: string | null;
    hasValidEmail?: boolean;
    emailRequired?: boolean;
    activeLoanCount?: number;
    maxActiveLoans?: number;
    loanLimitReached?: boolean;
    profile?: string;
  };
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
    metadata?: {
      pickup_location?: string;
      pickup_address?: string;
      pickup_maps_url?: string;
      loan_reminder_days_before_due?: number;
    } | null;
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
  header: ReactNode;
  audienceLabel: string;
};

type View = "descobrir" | "trilhas" | "meus";
type MyView = "emprestimos" | "reservas";

type LoanThankYou = {
  title: string;
  dueAt?: string | null;
};

const PAGE_SIZE = 4;
const PUBLIC_ACERVO_PATH = "/solucoes/organizacao-em-harmonia/tucxa/acervo-vivo";
const MANAGEMENT_ACERVO_PATH = "/solucoes/organizacao-em-harmonia/cliente/acervo-vivo";
const MANAGEMENT_ACCESS_API = "/api/organizacao-em-harmonia/cliente/acervo-vivo?accessOnly=1";

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

function duePreview(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, days));
  return date.toISOString();
}


function resourceChronology(resource?: ResourceRow | null) {
  const year = Number(resource?.metadata?.year ?? 0);
  const month = Number(resource?.metadata?.month ?? 0);
  return (Number.isFinite(year) ? year : 0) * 100 + (Number.isFinite(month) ? month : 0);
}

function monthLabel(month: number) {
  return ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][month] || "Edição";
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

function Modal({
  title,
  eyebrow,
  onClose,
  children,
  z = 200,
  viewportFit = false,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
  z?: number;
  viewportFit?: boolean;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#10251C]/75 p-1.5 backdrop-blur-sm sm:p-4" style={{ zIndex: z }} role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className={`flex w-full max-w-3xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl ${viewportFit ? "max-h-[calc(100dvh-0.75rem)] p-3" : "max-h-[92dvh] p-4 sm:p-5"}`}>
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`${viewportFit ? "text-[9px]" : "text-[10px]"} font-black uppercase tracking-[0.16em] text-[#2F6B43]`}>{eyebrow}</p>
            <h2 className={`${viewportFit ? "mt-0.5 text-lg" : "mt-1 text-xl"} font-black leading-tight text-[#123D2C] sm:text-2xl`}>{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button>
        </div>
        <div className={`${viewportFit ? "mt-2 overflow-hidden" : "mt-3 overflow-y-auto"} min-h-0 flex-1`}>{children}</div>
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

function ManagementAccess() {
  return (
    <Link
      href={MANAGEMENT_ACERVO_PATH}
      className="flex min-h-20 items-center justify-between gap-3 rounded-2xl bg-[#FFF8E7] px-4 py-3 text-left shadow ring-1 ring-amber-200 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span className="min-w-0">
        <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-amber-800">Gestor Acervo Vivo - Biblioteca</span>
        <span className="mt-1 block text-base font-black leading-tight text-[#123D2C]">Gestão da Biblioteca</span>
        <span className="mt-1 block text-[10px] font-bold leading-4 text-slate-600">Regras, relatórios, circulação e exclusões de empréstimos.</span>
      </span>
      <span className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-white">GERENCIAR</span>
    </Link>
  );
}

function CommunityAccess({
  title,
  detail,
  href,
  imageSrc,
}: {
  title: string;
  detail: string;
  href: string;
  imageSrc: string;
}) {
  return (
    <Link
      href={href}
      className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[16/8] w-full bg-[#E7F0E2]">
        <Image
          src={imageSrc}
          alt={`Logo ${title}`}
          fill
          sizes="(max-width: 640px) 50vw, 320px"
          className="object-cover"
        />
      </div>
      <div className="p-2.5 text-center">
        <span className="block text-sm font-black leading-tight text-[#123D2C]">{title}</span>
        <span className="mt-1 block text-[10px] font-bold leading-4 text-slate-500">{detail}</span>
        <span className="mt-1.5 block text-[8px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">
          TOQUE PARA ABRIR
        </span>
      </div>
    </Link>
  );
}


function RatingLine({ title }: { title: TitleRow }) {
  const count = Number(title.reviewCount ?? 0);
  const average = Number(title.averageRating ?? 0);
  const rounded = count > 0 ? Math.round(average) : 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-lg tracking-[0.1em] text-amber-500" aria-label={`${count} avaliações`}>
        {[1, 2, 3, 4, 5].map((star) => <span key={star}>{star <= rounded ? "★" : "☆"}</span>)}
      </span>
      <span className="text-xs font-bold text-slate-500">
        {count > 0 ? `${average.toFixed(1)} • ${count} avaliação(ões)` : "Sem avaliações ainda"}
      </span>
    </div>
  );
}

export function AcervoVivoReader({ api, header, audienceLabel }: Props) {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManageLibrary, setCanManageLibrary] = useState(false);
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
  const [selectedTrailId, setSelectedTrailId] = useState("");
  const [trailItemPage, setTrailItemPage] = useState(1);
  const [selectedFolhaYear, setSelectedFolhaYear] = useState<number | null>(null);
  const [myPage, setMyPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<"borrow-now" | "reserve" | null>(null);
  const [confirmDueAt, setConfirmDueAt] = useState("");
  const [loanThankYou, setLoanThankYou] = useState<LoanThankYou | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [notifyIfNotPickedUp, setNotifyIfNotPickedUp] = useState(true);
  const [reserveAfterReturn, setReserveAfterReturn] = useState(true);
  const [returnLoanId, setReturnLoanId] = useState("");
  const [returnRating, setReturnRating] = useState(0);
  const [returnComment, setReturnComment] = useState("");

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

        try {
          const managementResponse = await fetch(MANAGEMENT_ACCESS_API, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          });
          const managementPayload = (await managementResponse.json().catch(() => ({}))) as {
            permissions?: { library?: boolean };
          };
          if (active) {
            setCanManageLibrary(managementResponse.ok && managementPayload.permissions?.library === true);
          }
        } catch {
          if (active) setCanManageLibrary(false);
        }
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
  const resourceVersionMap = useMemo(() => new Map(versions.filter((item) => item.is_current !== false).map((item) => [item.resource_id, item])), [versions]);

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
  const folhaYears = useMemo(() => {
    if (selectedTrail?.slug !== "folha-verde-edicoes") return [] as number[];
    const years = selectedTrailItems.map((item) => {
      const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
      return Number(resource?.metadata?.year ?? 0);
    }).filter((year): year is number => Number.isFinite(year) && year >= 1900 && year <= 2200);
    return Array.from(new Set<number>(years)).sort((a, b) => b - a);
  }, [resourceMap, selectedTrail?.slug, selectedTrailItems]);
  const selectedFolhaYearItems = useMemo(() => {
    if (!selectedFolhaYear) return [] as TrailItem[];
    return selectedTrailItems.filter((item) => {
      const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
      return Number(resource?.metadata?.year ?? 0) === selectedFolhaYear;
    }).sort((left, right) => {
      const leftResource = left.resource_id ? resourceMap.get(left.resource_id) : null;
      const rightResource = right.resource_id ? resourceMap.get(right.resource_id) : null;
      return resourceChronology(rightResource) - resourceChronology(leftResource);
    });
  }, [resourceMap, selectedFolhaYear, selectedTrailItems]);
  const pickupLocation = payload.settings?.metadata?.pickup_location || "Tucxa 1";
  const pickupAddress = payload.settings?.metadata?.pickup_address || "Rua Talvino Egídio de Souza Aranha Júnior, 179 - Jardim Miranda - Campinas/SP - CEP 13034-611";
  const pickupMapsUrl = payload.settings?.metadata?.pickup_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`;
  const reminderDays = payload.settings?.metadata?.loan_reminder_days_before_due ?? 3;
  const selectedCategory = selectedTitle?.subjects?.[0] || "Não informada";
  const borrowBlockedByEmail = payload.reader?.emailRequired === true || payload.reader?.hasValidEmail === false;
  const borrowBlockedByLimit = payload.reader?.loanLimitReached === true;

  const updateProfileHref = (() => {
    const profile = payload.reader?.profile || "";
    if (profile === "filho-da-corrente") {
      return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atualizar-dados";
    }

    const params = new URLSearchParams();
    if (payload.reader?.personName) params.set("name", payload.reader.personName);
    if (payload.reader?.personWhatsapp) params.set("whatsapp", payload.reader.personWhatsapp);
    params.set(
      "returnTo",
      "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/atendimento/acervo-vivo",
    );
    return `/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?${params.toString()}`;
  })();
  const myRows = myView === "emprestimos" ? activeLoans : activeReservations;
  const currentMyRows = myRows.slice((myPage - 1) * PAGE_SIZE, myPage * PAGE_SIZE);
  const selectedCopies = selectedTitle ? copies.filter((copy) => copy.title_id === selectedTitle.id) : [];
  const hasSelectedTitleLoan = selectedTitle ? activeLoans.some((loan) => loan.title?.id === selectedTitle.id || loan.copy?.title_id === selectedTitle.id) : false;
  const hasSelectedTitleReservation = selectedTitle ? activeReservations.some((item) => item.title_id === selectedTitle.id) : false;

  async function run(body: Record<string, unknown>, message: string): Promise<Record<string, unknown> | null> {
    if (!token || saving) return null;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
      setSuccess(message);
      await load(token);
      return result;
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao concluir a operação.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function confirmSelectedAction() {
    if (!confirmAction || !selectedTitle) return;
    const action = confirmAction;
    const message = action === "borrow-now"
      ? `Empréstimo confirmado. Devolva no mesmo local da retirada: ${pickupLocation}.`
      : (selectedTitle.availableCopies ?? 0) > 0
        ? `Reserva confirmada. Retire em ${pickupLocation} no prazo configurado.`
        : "Você entrou na fila de reserva e será avisado quando houver disponibilidade.";

    const result = await run(
      action === "borrow-now"
        ? { action, titleId: selectedTitle.id }
        : {
            action,
            titleId: selectedTitle.id,
            notifyIfNotPickedUp,
            reserveAfterReturn,
          },
      message,
    );
    if (!result) return;

    setConfirmAction(null);
    if (action === "borrow-now") {
      setLoanThankYou({
        title: selectedTitle.title,
        dueAt: typeof result.dueAt === "string" ? result.dueAt : confirmDueAt,
      });
    }
  }

  async function confirmReturn() {
    if (!returnLoanId) return;
    const ok = await run(
      {
        action: "return-book",
        loanId: returnLoanId,
        rating: returnRating || undefined,
        comment: returnComment.trim() || undefined,
      },
      `Devolução registrada em ${pickupLocation}. Obrigado por ajudar o Acervo Vivo a circular.`,
    );
    if (ok) {
      setReturnLoanId("");
      setReturnRating(0);
      setReturnComment("");
    }
  }

  function openTitle(titleId: string) {
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
            Encontre livros, materiais da Casa, trilhas de estudo, o Clube do Livro e o Grupo de Estudos. O Acervo Vivo reúne caminhos para estudar, trocar experiências e continuar aprendendo.
          </p>
        </section>

        {(error || success) && (
          <div className={`mt-3 rounded-2xl p-3 text-sm font-bold ring-1 ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}>
            {error || success}
          </div>
        )}

        {borrowBlockedByEmail && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">
            Para empréstimos de livros, é obrigatório ter um e-mail válido no cadastro. Atualize seus dados antes de retirar outro livro.
            <a href={updateProfileHref} className="mt-2 block rounded-xl bg-amber-900 px-3 py-2 text-center text-xs font-black text-white">
              Atualizar cadastro
            </a>
          </div>
        )}

        {borrowBlockedByLimit && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold leading-6 text-red-800 ring-1 ring-red-200">
            Você atingiu o limite de {Number(payload.reader?.maxActiveLoans ?? payload.settings?.max_active_loans ?? 3)} empréstimo(s) ativo(s). Devolva um livro antes de registrar outro empréstimo.
          </div>
        )}

        {payload.catalogWarning && !error && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-5 text-amber-900 ring-1 ring-amber-200">{payload.catalogWarning}</div>
        )}

        {loading ? (
          <p className="mt-3 rounded-2xl bg-white p-4 font-bold text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Carregando o Acervo Vivo...</p>
        ) : (
          <>
            <section className="mt-3 grid grid-cols-3 gap-2">
              <AccessButton title="Descobrir" detail={`${titles.length} títulos`} onClick={() => openView("descobrir")} />
              <AccessButton title="Trilhas" detail={`${trails.length} caminhos`} onClick={() => openView("trilhas")} />
              <AccessButton title="Meus livros" detail={`${activeLoans.length} empréstimo(s)`} onClick={() => openView("meus")} />
            </section>

            {canManageLibrary ? (
              <section className="mt-2">
                <ManagementAccess />
              </section>
            ) : null}

            <section className="mt-2 grid grid-cols-2 gap-2">
              <CommunityAccess
                title="Clube do Livro"
                detail="leituras, encontros e livros já estudados"
                href={`${PUBLIC_ACERVO_PATH}/clube-do-livro`}
                imageSrc="/organizacao-em-harmonia/tucxa/acervo-vivo/clube-do-livro.jpeg"
              />
              <CommunityAccess
                title="Grupo de Estudos"
                detail="espiritualidade, reflexão e conhecimento"
                href={`${PUBLIC_ACERVO_PATH}/grupo-de-estudos`}
                imageSrc="/organizacao-em-harmonia/tucxa/acervo-vivo/grupo-de-estudos.jpg"
              />
            </section>
          </>
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
        <Modal title="Trilhas de estudos" eyebrow="Conhecimento em movimento" onClose={() => setView(null)} viewportFit>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {currentTrails.map((trail) => {
              const count = trailItems.filter((item) => item.trail_id === trail.id).length;
              return (
                <button key={trail.id} type="button" onClick={() => { setSelectedTrailId(trail.id); setTrailItemPage(1); setSelectedFolhaYear(null); }} className="rounded-xl bg-[#F7FAF2] p-2.5 text-left ring-1 ring-[#123D2C]/10">
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{trail.official ? "Trilha oficial" : "Trilha em validação"}</p>
                  <h3 className="mt-0.5 text-sm font-black leading-tight text-[#123D2C]">{trail.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold leading-4 text-slate-600">{trail.objective || trail.description || "Sequência de conteúdos para apoiar seu estudo."}</p>
                  <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#2F6B43]">{count} item(ns) • TOQUE PARA ABRIR</p>
                </button>
              );
            })}
            {trails.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 sm:col-span-2">As trilhas ainda estão sendo configuradas.</p>}
          </div>
          <Pager page={trailPage} total={trails.length} pageSize={PAGE_SIZE} onChange={setTrailPage} />
        </Modal>
      )}

      {selectedTrail && (
        <Modal title={selectedTrail.name} eyebrow="Trilha de estudos" onClose={() => { setSelectedTrailId(""); setSelectedFolhaYear(null); }} z={220}>
          <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{selectedTrail.objective || selectedTrail.description}</p>
          {selectedTrail.slug === "folha-verde-edicoes" ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {folhaYears.map((year) => (
                <button key={year} type="button" onClick={() => setSelectedFolhaYear(year)} className="min-h-20 rounded-2xl bg-[#E7F0E2] p-3 text-center text-xl font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  {year}
                  <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
                </button>
              ))}
              {folhaYears.length === 0 && <p className="col-span-full rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhuma edição do Folha Verde foi vinculada a esta trilha.</p>}
            </div>
          ) : (
            <>
              <div className="mt-3 grid gap-2">
                {currentTrailItems.map((item, index) => {
                  const absoluteIndex = (trailItemPage - 1) * PAGE_SIZE + index;
                  const title = item.title_id ? titleMap.get(item.title_id) : null;
                  const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
                  const version = resource ? resourceVersionMap.get(resource.id) : null;
                  return (
                    <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{absoluteIndex + 1}. {item.item_type === "title" ? "Livro" : "Material"}</p>
                      <p className="mt-1 text-sm font-black text-[#123D2C]">{title?.title || resource?.title || "Conteúdo"}</p>
                      {item.note && <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.note}</p>}
                      {title && <button type="button" onClick={() => openTitle(title.id)} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Ver livro</button>}
                      {version?.source_url && <a href={version.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Abrir PDF</a>}
                    </article>
                  );
                })}
                {selectedTrailItems.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Esta trilha está criada, mas sua curadoria ainda está em validação.</p>}
              </div>
              <Pager page={trailItemPage} total={selectedTrailItems.length} pageSize={PAGE_SIZE} onChange={setTrailItemPage} />
            </>
          )}
        </Modal>
      )}

      {selectedFolhaYear && (
        <Modal title={`${selectedFolhaYear}`} eyebrow="Folha Verde • edições" onClose={() => setSelectedFolhaYear(null)} z={240}>
          <p className="rounded-2xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-6 text-slate-600">Edições em ordem das mais recentes para as mais antigas.</p>
          <div className="mt-3 grid gap-2">
            {selectedFolhaYearItems.map((item) => {
              const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
              const version = resource ? resourceVersionMap.get(resource.id) : null;
              const month = Number(resource?.metadata?.month ?? 0);
              const monthEnd = Number(resource?.metadata?.month_end ?? month);
              const label = monthEnd > month ? `${monthLabel(month)}-${monthLabel(monthEnd)}` : monthLabel(month);
              return (
                <article key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <div>
                    <p className="font-black text-[#123D2C]">{label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{version?.version_label || "Versão vigente"}</p>
                  </div>
                  {version?.source_url ? <a href={version.source_url} target="_blank" rel="noreferrer" className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Abrir PDF</a> : <span className="text-xs font-bold text-slate-400">PDF pendente</span>}
                </article>
              );
            })}
          </div>
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {payload.settings?.member_renewals_enabled !== false && (
                      <button disabled={saving} type="button" onClick={() => void run({ action: "renew", loanId: loan.id }, "Empréstimo renovado.")} className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50">Solicitar renovação</button>
                    )}
                    <button disabled={saving} type="button" onClick={() => { setReturnLoanId(loan.id); setReturnRating(0); setReturnComment(""); }} className="rounded-lg bg-[#123D2C] px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50">Registrar devolução</button>
                  </div>
                </article>
              );
            }) : currentMyRows.map((row) => {
              const reservation = row as ReservationRow;
              return (
                <article key={reservation.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="truncate text-sm font-black text-[#123D2C]">{reservation.title?.title || "Livro reservado"}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {reservation.status === "disponivel"
                      ? `Separado para retirada em ${pickupLocation}${reservation.hold_until ? ` até ${formatDate(reservation.hold_until)}` : ""}${reservation.copy?.asset_code ? ` • ${reservation.copy.asset_code}` : ""}.`
                      : `Na fila desde ${formatDate(reservation.requested_at)}.`}
                  </p>
                  {reservation.status === "disponivel" && (
                    <p className="mt-2 rounded-xl bg-[#E7F0E2] p-2 text-[10px] font-bold leading-4 text-[#123D2C]">
                      Ao retirar o exemplar físico, leia o QR Code colado no livro para confirmar o empréstimo. O prazo de devolução começa somente nessa confirmação.
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
        <Modal title={selectedTitle.title} eyebrow="Livro do Acervo Vivo" onClose={() => { setSelectedTitleId(""); setCommentsOpen(false); setConfirmAction(null); }} z={240}>
          <div className="flex gap-3">
            <Cover title={selectedTitle} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-5 text-slate-600">
                <strong>Autor:</strong> {selectedTitle.authors?.join(", ") || "Não informado"}
                <span className="mx-1">•</span>
                <strong>Categoria:</strong> {selectedCategory}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                {selectedTitle.description || "Descrição ainda não cadastrada. O Gestor Acervo Vivo - Biblioteca pode incluir este resumo na gestão do catálogo."}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">Avaliações</p>
                <RatingLine title={selectedTitle} />
              </div>
              <button type="button" onClick={() => setCommentsOpen(true)} className="flex min-h-12 flex-col items-center justify-center rounded-xl bg-white px-4 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">
                <span>Comentários</span>
                <span className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#2F6B43]">CLIQUE PARA VER</span>
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-[#E9F2E7] p-3 ring-1 ring-[#123D2C]/10">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">EMPRESTAR</p>
            {hasSelectedTitleLoan && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-800">Você já possui este título em empréstimo. A devolução pode ser registrada em Meus livros.</p>}
            {hasSelectedTitleReservation && !hasSelectedTitleLoan && <p className="mt-2 rounded-xl bg-white p-2 text-xs font-bold text-[#123D2C]">Você já possui uma reserva ativa para este título. Acompanhe em Meus livros.</p>}
            {!hasSelectedTitleLoan && !hasSelectedTitleReservation && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  disabled={
                    saving ||
                    (selectedTitle.availableCopies ?? 0) <= 0 ||
                    payload.settings?.member_loans_enabled === false ||
                    borrowBlockedByEmail ||
                    borrowBlockedByLimit
                  }
                  type="button"
                  onClick={() => { setConfirmDueAt(duePreview(payload.settings?.loan_days ?? 30)); setConfirmAction("borrow-now"); }}
                  className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-[#123D2C] px-3 py-3 text-center font-black text-white disabled:opacity-45"
                >
                  <span>Está com o livro em mãos</span>
                  <span className="mt-1 text-[8px] uppercase tracking-[0.12em] text-white/75">CLIQUE PARA CONTINUAR</span>
                </button>
                <button
                  disabled={saving || payload.settings?.member_reservations_enabled === false}
                  type="button"
                  onClick={() => { setConfirmDueAt(""); setConfirmAction("reserve"); }}
                  className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-white px-3 py-3 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-45"
                >
                  <span>Não estou com o livro em mãos</span>
                  <span className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#2F6B43]">CLIQUE PARA CONTINUAR</span>
                </button>
              </div>
            )}
            {(selectedTitle.availableCopies ?? 0) <= 0 && !hasSelectedTitleLoan && !hasSelectedTitleReservation && (
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">Não há exemplar livre neste momento. Use a segunda opção para entrar na fila e receber aviso sobre a próxima disponibilidade.</p>
            )}
          </div>

          <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">
            Regras atuais: até {payload.settings?.max_active_loans ?? 3} empréstimo(s), prazo de {payload.settings?.loan_days ?? 30} dias e até {payload.settings?.renewal_limit ?? 1} renovação(ões). A devolução deve ocorrer no mesmo local da retirada: {pickupLocation}.
          </p>
        </Modal>
      )}

      {commentsOpen && selectedTitle && (
        <Modal title="Comentários" eyebrow={`Avaliações • ${selectedTitle.title}`} z={260} onClose={() => setCommentsOpen(false)}>
          {(selectedTitle.comments ?? []).length > 0 ? (
            <div className="grid gap-2">
              {(selectedTitle.comments ?? []).map((comment) => (
                <article key={comment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="text-sm text-amber-500">{"★".repeat(Number(comment.rating ?? 0))}{"☆".repeat(Math.max(0, 5 - Number(comment.rating ?? 0)))}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{comment.comment}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold text-slate-600">Ainda não há comentários para este livro.</p>
          )}
        </Modal>
      )}

      {confirmAction && selectedTitle && (
        <Modal title={confirmAction === "borrow-now" ? "Confirmar empréstimo" : "Confirmar reserva"} eyebrow="Acervo Vivo • confirmação" z={270} onClose={() => setConfirmAction(null)}>
          <div className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10">
            <p><strong>Livro:</strong> {selectedTitle.title}</p>
            {confirmAction === "borrow-now" ? (
              <>
                <p className="mt-2">Ao confirmar, o empréstimo começa agora e terá prazo de <strong>{payload.settings?.loan_days ?? 30} dias</strong>.</p>
                <p className="mt-2">A devolução deve ser feita de preferência exatamente no mesmo local da retirada: <strong>{pickupLocation}</strong>.</p>
                <a href={pickupMapsUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-xl bg-white p-2 text-xs font-black leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">📍 {pickupAddress} <span className="underline underline-offset-2">Abrir no Google Maps</span></a>
                <p className="mt-2">Se o livro não for devolvido antes, o sistema enviará um lembrete por e-mail <strong>{reminderDays} dia(s) antes</strong> da data máxima de devolução <strong>{formatDate(confirmDueAt)}</strong>.</p>
                {selectedCopies.filter((copy) => copy.status === "disponivel").length > 1 && (
                  <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900">Há mais de um exemplar disponível. Para maior precisão, prefira iniciar o empréstimo pelo QR Code colado no exemplar que está em suas mãos.</p>
                )}
              </>
            ) : (
              <>
                <p className="mt-2">Se houver exemplar disponível, ele ficará reservado por <strong>{payload.settings?.reservation_hold_days ?? 3} dia(s)</strong> para retirada em <strong>{pickupLocation}</strong>.</p>
                <a href={pickupMapsUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-xl bg-white p-2 text-xs font-black leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">📍 {pickupAddress} <span className="underline underline-offset-2">Abrir no Google Maps</span></a>
                <p className="mt-2">Na retirada, leia o QR Code do livro para confirmar o empréstimo.</p>
                {(selectedTitle.availableCopies ?? 0) <= 0 && (
                  <div className="mt-3 grid gap-2">
                    <label className="flex gap-2 rounded-xl bg-white p-2"><input type="checkbox" checked={notifyIfNotPickedUp} onChange={(event) => setNotifyIfNotPickedUp(event.target.checked)} />Avisar se uma reserva anterior não for retirada no prazo.</label>
                    <label className="flex gap-2 rounded-xl bg-white p-2"><input type="checkbox" checked={reserveAfterReturn} onChange={(event) => setReserveAfterReturn(event.target.checked)} />Manter meu interesse para reservar quando o livro for devolvido.</label>
                  </div>
                )}
              </>
            )}
          </div>
          <button disabled={saving} type="button" onClick={() => void confirmSelectedAction()} className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Confirmar</button>
        </Modal>
      )}

      {loanThankYou && (
        <Modal title="Obrigado!" eyebrow="Acervo Vivo • empréstimo confirmado" z={285} onClose={() => setLoanThankYou(null)}>
          <div className="rounded-2xl bg-[#E9F2E7] p-4 text-sm font-semibold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
            <p>Seu empréstimo do livro <strong>{loanThankYou.title}</strong> foi confirmado.</p>
            <p className="mt-2">Data máxima para devolução: <strong>{formatDate(loanThankYou.dueAt)}</strong>.</p>
            <p className="mt-2">Devolva de preferência exatamente no mesmo local de onde retirou o livro para ajudar a Biblioteca do Acervo Vivo do Tucxa a permanecer organizada e à disposição de todos.</p>
            <p className="mt-2"><strong>{pickupLocation}</strong></p>
            <a href={pickupMapsUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-xl bg-white p-2 text-xs font-black leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">📍 {pickupAddress} <span className="underline underline-offset-2">Abrir no Google Maps</span></a>
          </div>
          <button type="button" onClick={() => setLoanThankYou(null)} className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white">Fechar</button>
        </Modal>
      )}

      {returnLoanId && (
        <Modal title="Registrar devolução" eyebrow="Acervo Vivo • devolução" z={280} onClose={() => { setReturnLoanId(""); setReturnRating(0); setReturnComment(""); }}>
          <div className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10">
            <p>A devolução deve ser feita no mesmo local da retirada: <strong>{pickupLocation}</strong>.</p>
            <p className="mt-2">A avaliação é opcional e ajuda outras pessoas a escolherem suas próximas leituras.</p>
          </div>
          <div className="mt-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">Sua avaliação (opcional)</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setReturnRating(star === returnRating ? 0 : star)} className="text-3xl leading-none text-amber-500" aria-label={`${star} estrela(s)`}>{star <= returnRating ? "★" : "☆"}</button>
              ))}
            </div>
            <label className="mt-3 grid gap-1 text-xs font-black text-[#123D2C]">
              Comentário (opcional)
              <textarea value={returnComment} onChange={(event) => setReturnComment(event.target.value)} rows={4} maxLength={1000} className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#2F6B43]" placeholder="Conte, se quiser, o que achou da leitura." />
            </label>
          </div>
          <button disabled={saving} type="button" onClick={() => void confirmReturn()} className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Confirmar devolução</button>
        </Modal>
      )}
    </main>
  );
}
