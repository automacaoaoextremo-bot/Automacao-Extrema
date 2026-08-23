"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/site-tucxa/acervo-vivo";
const PUBLIC_PATH = "/solucoes/organizacao-em-harmonia/tucxa/acervo-vivo";
const PAGE_SIZE = 4;

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
  official?: boolean;
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
    personEmail?: string | null;
    personWhatsapp?: string | null;
    hasValidEmail?: boolean;
    emailRequired?: boolean;
    activeLoanCount?: number;
    maxActiveLoans?: number;
    loanLimitReached?: boolean;
    profile?: "filho-da-corrente" | "consulente" | "outro";
  };
  settings?: {
    loan_days?: number;
    reservation_hold_days?: number;
    pickup_location?: string;
    pickup_address?: string;
    pickup_maps_url?: string;
    self_service_enabled?: boolean;
    loan_reminder_days_before_due?: number;
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
type ConfirmAction = Exclude<PendingAction, "my-books">;

type LoanThankYou = {
  title: string;
  dueAt: string;
  profile?: string;
};

type BlockingNotice = {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function initialKey(title: string) {
  const first = normalize(title.trim()).charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return "0-9";
  return "#";
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
    <div
      className="fixed inset-0 flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-4"
      style={{ zIndex: z }}
      role="presentation"
      onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl ${
          viewportFit
            ? "max-h-[calc(100dvh-0.75rem)] rounded-[1.35rem] p-3 sm:max-h-[92dvh] sm:rounded-[1.75rem] sm:p-5"
            : "max-h-[92dvh] rounded-[1.75rem] p-4 sm:p-5"
        }`}
      >
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

export function AcervoVivoPublicReader() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [query, setQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [selectedLetter, setSelectedLetter] = useState("");
  const [letterPage, setLetterPage] = useState(1);
  const [trailPage, setTrailPage] = useState(1);
  const [trailItemPage, setTrailItemPage] = useState(1);
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [selectedTrailId, setSelectedTrailId] = useState("");
  const [selectedFolhaYear, setSelectedFolhaYear] = useState<number | null>(null);
  const [identifierOpen, setIdentifierOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>("reserve");
  const [resolved, setResolved] = useState<{
    found: boolean;
    authEmail?: string;
    profile?: string;
    hasValidEmail?: boolean;
    personName?: string;
    whatsapp?: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [notifyIfNotPickedUp, setNotifyIfNotPickedUp] = useState(true);
  const [reserveAfterReturn, setReserveAfterReturn] = useState(true);
  const [confirmDueAt, setConfirmDueAt] = useState("");
  const [loanThankYou, setLoanThankYou] = useState<LoanThankYou | null>(null);
  const [signedInProfile, setSignedInProfile] = useState("");
  const [blockingNotice, setBlockingNotice] = useState<BlockingNotice | null>(null);

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

        const url = new URL(window.location.href);
        const continuation = url.searchParams.get("continuar");
        const continuationTitleId = url.searchParams.get("titulo") || "";

        setPayload(next);

        if (next.selectedCopy?.title_id) {
          setSelectedTitleId(next.selectedCopy.title_id);
        }

        if (
          next.reader?.authenticated &&
          continuationTitleId &&
          (continuation === "borrow-now" || continuation === "reserve")
        ) {
          setSelectedTitleId(continuationTitleId);
          setPendingAction(continuation);
          setSignedInProfile(next.reader.profile || "");

          if (continuation === "borrow-now") {
            const missingEmail = next.reader.emailRequired || next.reader.hasValidEmail === false;
            const limitReached = next.reader.loanLimitReached === true;
            if (missingEmail) {
              const returnTo = `${url.pathname}${url.search}${url.hash}`;
              const params = new URLSearchParams({ returnTo });
              const consulenteParams = new URLSearchParams({ returnTo });
              if (next.reader.personName) consulenteParams.set("name", next.reader.personName);
              if (next.reader.personWhatsapp) consulenteParams.set("whatsapp", next.reader.personWhatsapp);
              setBlockingNotice({
                title: "Atualize seu cadastro",
                message: "Para empréstimos de livros, é obrigatório ter um e-mail válido no cadastro. Atualize seus dados antes de continuar.",
                actionHref: next.reader.profile === "filho-da-corrente"
                  ? `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atualizar-dados?${params.toString()}`
                  : `/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?${consulenteParams.toString()}`,
                actionLabel: "Atualizar cadastro",
              });
            } else if (limitReached) {
              setBlockingNotice({
                title: "Limite de empréstimos atingido",
                message: `Você já possui ${Number(next.reader.activeLoanCount ?? 0)} empréstimo(s) ativo(s), que é o limite atual de ${Number(next.reader.maxActiveLoans ?? 3)}.`,
              });
            } else {
              setConfirmDueAt(duePreview(next.settings?.loan_days ?? 30));
              setConfirmAction(continuation);
            }
          } else {
            setConfirmDueAt("");
            setConfirmAction(continuation);
          }

          url.searchParams.delete("continuar");
          url.searchParams.delete("titulo");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
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

  const letters = useMemo<string[]>(() => Array.from(new Set<string>(titles.map((item) => initialKey(item.title)))).sort((a, b) => {
    if (a === "0-9") return -1;
    if (b === "0-9") return 1;
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b, "pt-BR");
  }), [titles]);

  const searchedTitles = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [] as TitleRow[];
    return titles.filter((item) => normalize([item.title, ...(item.authors ?? []), ...(item.subjects ?? [])].join(" ")).includes(needle));
  }, [query, titles]);
  const letterTitles = useMemo(() => selectedLetter ? titles.filter((item) => initialKey(item.title) === selectedLetter) : [], [selectedLetter, titles]);
  const currentSearch = searchedTitles.slice((searchPage - 1) * PAGE_SIZE, searchPage * PAGE_SIZE);
  const currentLetter = letterTitles.slice((letterPage - 1) * PAGE_SIZE, letterPage * PAGE_SIZE);
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
  const currentTrailItems = selectedTrailItems.slice((trailItemPage - 1) * PAGE_SIZE, trailItemPage * PAGE_SIZE);

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

  function continuationHref(action: ConfirmAction) {
    if (typeof window === "undefined") return PUBLIC_PATH;
    const url = new URL(window.location.href);
    url.searchParams.set("continuar", action);
    if (selectedTitle?.id) url.searchParams.set("titulo", selectedTitle.id);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function updateProfileHref(profile?: string, personName?: string, whatsapp?: string) {
    if (profile === "filho-da-corrente") {
      const params = new URLSearchParams({ returnTo: continuationHref("borrow-now") });
      return `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atualizar-dados?${params.toString()}`;
    }

    const params = new URLSearchParams();
    if (personName) params.set("name", personName);
    if (whatsapp) params.set("whatsapp", whatsapp);
    params.set("returnTo", continuationHref("borrow-now"));
    return `/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?${params.toString()}`;
  }

  function currentBorrowBlock(next: Payload = payload): BlockingNotice | null {
    if (next.reader?.emailRequired || next.reader?.hasValidEmail === false) {
      return {
        title: "Atualize seu cadastro",
        message: "Para empréstimos de livros, é obrigatório ter um e-mail válido no cadastro. Atualize seus dados antes de continuar.",
        actionHref: updateProfileHref(
          next.reader?.profile,
          next.reader?.personName,
          next.reader?.personWhatsapp || undefined,
        ),
        actionLabel: "Atualizar cadastro",
      };
    }

    if (next.reader?.loanLimitReached) {
      const active = Number(next.reader.activeLoanCount ?? 0);
      const limit = Number(next.reader.maxActiveLoans ?? 3);
      return {
        title: "Limite de empréstimos atingido",
        message: `Você já possui ${active} empréstimo(s) ativo(s), que é o limite atual de ${limit}. Devolva um livro antes de registrar outro empréstimo.`,
      };
    }

    return null;
  }

  async function prepareAction(action: ConfirmAction) {
    setPendingAction(action);
    setConfirmDueAt(action === "borrow-now" ? duePreview(payload.settings?.loan_days ?? 30) : "");

    const { data } = await supabaseBrowser.auth.getSession();
    if (data.session?.access_token) {
      setSignedInProfile(payload.reader?.profile || "");
      if (action === "borrow-now") {
        const block = currentBorrowBlock();
        if (block) {
          setBlockingNotice(block);
          return;
        }
      }
      setConfirmAction(action);
      return;
    }

    setResolved(null);
    setIdentifierOpen(true);
  }

  async function executeAction(action: ConfirmAction) {
    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setPendingAction(action);
      setConfirmAction(null);
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
        body: JSON.stringify(action === "borrow-now"
          ? { action, qrToken: selectedQrCopy?.qr_token, titleId: selectedTitle.id }
          : {
              action,
              titleId: selectedTitle.id,
              notifyIfNotPickedUp,
              reserveAfterReturn,
            }),
      });

      const result = await response.json().catch(() => ({})) as {
        error?: string;
        readyForPickup?: boolean;
        dueAt?: string;
      };

      if (!response.ok) {
        const message = result.error || "Não foi possível concluir a operação.";
        if (response.status === 409) {
          setConfirmAction(null);
          setIdentifierOpen(false);
          setBlockingNotice({
            title: message.toLowerCase().includes("limite")
              ? "Limite de empréstimos atingido"
              : message.toLowerCase().includes("e-mail") || message.toLowerCase().includes("email")
                ? "Atualize seu cadastro"
                : "Não foi possível concluir o empréstimo",
            message,
            ...(message.toLowerCase().includes("e-mail") || message.toLowerCase().includes("email")
              ? {
                  actionHref: updateProfileHref(
                    signedInProfile || payload.reader?.profile,
                    payload.reader?.personName,
                    payload.reader?.personWhatsapp || undefined,
                  ),
                  actionLabel: "Atualizar cadastro",
                }
              : {}),
          });
          return;
        }
        throw new Error(message);
      }

      setConfirmAction(null);

      if (action === "borrow-now") {
        setLoanThankYou({
          title: selectedTitle.title,
          dueAt: result.dueAt || confirmDueAt,
          profile: signedInProfile || payload.reader?.profile,
        });
        return;
      }

      setSuccess(
        result.readyForPickup
          ? `Reserva confirmada. O exemplar ficou separado para retirada em ${payload.settings?.pickup_location || "Tucxa 1"}.`
          : "Você entrou na fila e será avisado quando houver disponibilidade.",
      );
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
      const result = await response.json().catch(() => ({})) as {
        error?: string;
        found?: boolean;
        authEmail?: string;
        profile?: string;
        hasValidEmail?: boolean;
        personName?: string;
        whatsapp?: string;
      };
      if (!response.ok) throw new Error(result.error || "Não foi possível localizar o cadastro.");
      setResolved({
        found: result.found === true,
        authEmail: result.authEmail,
        profile: result.profile,
        hasValidEmail: result.hasValidEmail,
        personName: result.personName,
        whatsapp: result.whatsapp,
      });
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
      setSignedInProfile(resolved.profile || "");

      if (pendingAction === "borrow-now" && resolved.hasValidEmail === false) {
        window.location.assign(
          updateProfileHref(resolved.profile, resolved.personName, resolved.whatsapp),
        );
        return;
      }

      if (pendingAction === "my-books") {
        window.location.assign(profileHref(resolved.profile));
        return;
      }

      const next = await fetchPayload();
      setPayload(next);

      if (pendingAction === "borrow-now") {
        const block = currentBorrowBlock(next);
        if (block) {
          setBlockingNotice(block);
          return;
        }
      }

      setConfirmDueAt(
        pendingAction === "borrow-now"
          ? duePreview(next.settings?.loan_days ?? 30)
          : "",
      );
      setConfirmAction(pendingAction);
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

    let returnTo = PUBLIC_PATH;

    if (typeof window !== "undefined") {
      const returnUrl = new URL(window.location.href);

      if (pendingAction === "borrow-now" || pendingAction === "reserve") {
        returnUrl.searchParams.set("continuar", pendingAction);
        if (selectedTitle?.id) {
          returnUrl.searchParams.set("titulo", selectedTitle.id);
        }
      }

      returnTo = `${returnUrl.pathname}${returnUrl.search}`;
    }

    params.set("returnTo", returnTo);

    return kind === "consulente"
      ? `/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro?${params.toString()}`
      : `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/primeiro-acesso?${params.toString()}`;
  }

  function closeLoanThankYou() {
    const profile = loanThankYou?.profile || signedInProfile || payload.reader?.profile;
    setLoanThankYou(null);
    window.location.assign(profileHref(profile));
  }

  if (loading) return <section className="mx-auto max-w-5xl px-3 py-4 sm:px-6"><p className="rounded-2xl bg-white p-5 font-bold text-[#123D2C] shadow">Carregando o Acervo Vivo...</p></section>;
  if (payload.disabled) return <section className="mx-auto max-w-5xl px-3 py-4 sm:px-6"><p className="rounded-2xl bg-white p-5 font-bold text-[#123D2C] shadow">O catálogo público está temporariamente indisponível.</p></section>;

  const pickupLocation = payload.settings?.pickup_location || "Tucxa 1";
  const pickupAddress = payload.settings?.pickup_address || "Rua Talvino Egídio de Souza Aranha Júnior, 179 - Jardim Miranda - Campinas/SP - CEP 13034-611";
  const pickupMapsUrl = payload.settings?.pickup_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`;
  const reminderDays = payload.settings?.loan_reminder_days_before_due ?? 3;
  const availableCount = Number(selectedTitle?.availableCopies ?? 0);
  const category = selectedTitle?.subjects?.[0] || "Não informada";
  const audienceLabel = payload.reader?.profile === "filho-da-corrente"
    ? "Filho da Corrente"
    : payload.reader?.profile === "consulente"
      ? "Filho de Fora / Consulente"
      : "Biblioteca do Tucxa";
  const myBooksDetail = payload.reader?.authenticated
    ? `${Number(payload.reader.activeLoanCount ?? 0)} empréstimo(s)`
    : "empréstimos e reservas";

  return (
    <>
      <section className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7]">Acervo Vivo • {audienceLabel}</p>
          <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">O que você quer estudar hoje?</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-5 text-[#EEF7EA]">Encontre livros, materiais da Casa e trilhas que ajudem a transformar uma dúvida em próximo passo de estudo. Você só precisa se identificar quando decidir reservar ou emprestar.</p>
          {payload.reader?.authenticated && <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">Acesso identificado: {payload.reader.personName || "leitor(a)"}</p>}
        </section>

        {(error || success) && <div className={`mt-3 rounded-2xl p-3 text-sm font-bold ring-1 ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}`}>{error || success}</div>}

        {payload.reader?.authenticated && (payload.reader?.emailRequired || payload.reader?.hasValidEmail === false) && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">
            Para empréstimos de livros, inclua um e-mail válido no seu cadastro antes de continuar.
            <Link
              href={updateProfileHref(payload.reader.profile, payload.reader.personName, payload.reader.personWhatsapp || undefined)}
              className="mt-2 block rounded-xl bg-amber-900 px-3 py-2 text-center text-xs font-black text-white"
            >
              Atualizar cadastro
            </Link>
          </div>
        )}

        {payload.reader?.authenticated && payload.reader?.loanLimitReached && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold leading-6 text-red-800 ring-1 ring-red-200">
            Você atingiu o limite de {Number(payload.reader.maxActiveLoans ?? 3)} empréstimo(s) ativo(s). Devolva um livro antes de registrar outro empréstimo.
          </div>
        )}

        <section className="mt-3 grid grid-cols-3 gap-2">
          <AccessButton title="Descobrir" detail={`${titles.length} títulos`} onClick={() => { setView("descobrir"); setQuery(""); setSearchPage(1); setSelectedLetter(""); }} />
          <AccessButton title="Trilhas" detail={`${trails.length} caminhos`} onClick={() => { setView("trilhas"); setTrailPage(1); }} />
          <AccessButton title="Meus livros" detail={myBooksDetail} onClick={() => void openMyBooks()} />
        </section>
      </section>

      {view === "descobrir" && <Modal title="Descobrir o Acervo" eyebrow="Livros e exemplares" onClose={() => setView(null)}>
        <label className="grid gap-1 text-xs font-black text-[#123D2C]">
          Buscar por título, autor ou tema
          <input value={query} onChange={(event) => { setQuery(event.target.value); setSearchPage(1); }} className="rounded-xl border border-[#123D2C]/15 bg-[#F9FBF7] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#2F6B43]" placeholder="Ex.: mediunidade, Umbanda, cambono..." />
        </label>
        {query.trim() ? (
          <div className="mt-3">
            <div className="grid gap-2">
              {currentSearch.map((title) => <button key={title.id} type="button" onClick={() => setSelectedTitleId(title.id)} className="flex items-center gap-3 rounded-2xl bg-[#F7FAF2] p-2.5 text-left ring-1 ring-[#123D2C]/10"><Cover title={title} compact /><span className="min-w-0 flex-1"><span className="block font-black text-[#123D2C]">{title.title}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{title.totalCopies ?? 0} exemplar(es) • {title.availableCopies ?? 0} disponível(is)</span></span></button>)}
              {searchedTitles.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum título encontrado. Tente outro termo.</p>}
            </div>
            <Pager page={searchPage} total={searchedTitles.length} onChange={setSearchPage} />
            <button type="button" onClick={() => setQuery("")} className="mt-3 w-full rounded-xl bg-[#E7F0E2] px-3 py-2 text-xs font-black text-[#123D2C]">Voltar ao alfabeto</button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Ou toque na letra inicial</p>
            <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-9">
              {letters.map((letter) => <button key={letter} type="button" onClick={() => { setSelectedLetter(letter); setLetterPage(1); }} className="rounded-xl bg-[#E7F0E2] px-2 py-2.5 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{letter}</button>)}
            </div>
            <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-5 text-slate-600">O índice mostra somente as iniciais existentes no cadastro. Cada letra abre os títulos e seus exemplares em páginas curtas, sem uma lista longa na tela.</p>
          </div>
        )}
      </Modal>}

      {selectedLetter && <Modal title={`Títulos com ${selectedLetter}`} eyebrow="Índice alfabético" onClose={() => setSelectedLetter("")} z={220}>
        <div className="grid gap-2">
          {currentLetter.map((title) => <button key={title.id} type="button" onClick={() => { setSelectedLetter(""); setSelectedTitleId(title.id); }} className="flex items-center gap-3 rounded-2xl bg-[#F7FAF2] p-2.5 text-left ring-1 ring-[#123D2C]/10"><Cover title={title} compact /><span className="min-w-0 flex-1"><span className="block font-black text-[#123D2C]">{title.title}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{title.authors?.join(", ") || "Autor não informado"}</span><span className="mt-1 block text-[10px] font-black text-[#2F6B43]">{title.totalCopies ?? 0} exemplar(es) • {title.availableCopies ?? 0} disponível(is)</span></span></button>)}
        </div>
        <Pager page={letterPage} total={letterTitles.length} onChange={setLetterPage} />
      </Modal>}

      {view === "trilhas" && <Modal title="Trilhas de estudos" eyebrow="Conhecimento em movimento" onClose={() => setView(null)} viewportFit>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {currentTrails.map((trail) => {
            const count = trailItems.filter((item) => item.trail_id === trail.id).length;
            return (
              <button
                key={trail.id}
                type="button"
                onClick={() => { setSelectedTrailId(trail.id); setSelectedFolhaYear(null); setTrailItemPage(1); }}
                className="rounded-xl bg-[#F7FAF2] px-2.5 py-2 text-left ring-1 ring-[#123D2C]/10"
              >
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{trail.official ? "Trilha oficial" : "Trilha em validação"}</p>
                <h3 className="mt-0.5 text-sm font-black leading-4 text-[#123D2C]">{trail.name}</h3>
                <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold leading-4 text-slate-600">{trail.objective || trail.description || "Sequência de conteúdos para apoiar seu estudo."}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#2F6B43]">{count} item(ns) • TOQUE PARA ABRIR</p>
              </button>
            );
          })}
        </div>
        <Pager page={trailPage} total={trails.length} onChange={setTrailPage} />
      </Modal>}

      {selectedTrail && <Modal title={selectedTrail.name} eyebrow="Trilha de estudos" z={220} onClose={() => { setSelectedTrailId(""); setSelectedFolhaYear(null); }}>
        <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{selectedTrail.objective || selectedTrail.description}</p>
        {selectedTrail.slug === "folha-verde-edicoes" ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {folhaYears.map((year) => <button key={year} type="button" onClick={() => setSelectedFolhaYear(year)} className="min-h-20 rounded-2xl bg-[#E7F0E2] p-3 text-center text-xl font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{year}<span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">TOQUE PARA ABRIR</span></button>)}
          </div>
        ) : (
          <>
            <div className="mt-3 grid gap-2">
              {currentTrailItems.map((item, index) => {
                const absoluteIndex = (trailItemPage - 1) * PAGE_SIZE + index;
                const title = item.title_id ? titleMap.get(item.title_id) : null;
                const resource = item.resource_id ? resourceMap.get(item.resource_id) : null;
                const version = resource ? versionMap.get(resource.id) : null;
                const label = title?.title || resource?.title || "Conteúdo";
                return <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{absoluteIndex + 1}. {item.item_type === "title" ? "Livro" : "Material"}</p><p className="mt-1 font-black text-[#123D2C]">{label}</p>{item.note && <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.note}</p>}{title && <button type="button" onClick={() => setSelectedTitleId(title.id)} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Ver livro</button>}{version?.source_url && <Link href={version.source_url} target="_blank" className="mt-2 inline-flex rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Abrir PDF</Link>}</article>;
              })}
            </div>
            <Pager page={trailItemPage} total={selectedTrailItems.length} onChange={setTrailItemPage} />
          </>
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

      {selectedTitle && <Modal title={selectedTitle.title} eyebrow="Livro do Acervo Vivo" z={260} onClose={() => { setSelectedTitleId(""); setCommentsOpen(false); }}>
        <div className="flex gap-3">
          <Cover title={selectedTitle} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold leading-5 text-slate-600"><strong>Autor:</strong> {selectedTitle.authors?.join(", ") || "Não informado"} <span className="mx-1">•</span> <strong>Categoria:</strong> {category}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{selectedTitle.description || "Descrição ainda não cadastrada. O Gestor Acervo Vivo - Biblioteca pode incluir este resumo na gestão do catálogo."}</p>
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
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button disabled={saving || availableCount <= 0} type="button" onClick={() => void prepareAction("borrow-now")} className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-[#123D2C] px-3 py-3 text-center font-black text-white disabled:opacity-45">
              <span>Está com o livro em mãos</span>
              <span className="mt-1 text-[8px] uppercase tracking-[0.12em] text-white/75">CLIQUE PARA CONTINUAR</span>
            </button>
            <button disabled={saving} type="button" onClick={() => void prepareAction("reserve")} className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-white px-3 py-3 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-45">
              <span>Não estou com o livro em mãos</span>
              <span className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#2F6B43]">CLIQUE PARA CONTINUAR</span>
            </button>
          </div>
          {availableCount <= 0 && <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">Não há exemplar livre neste momento. Use a segunda opção para entrar na fila e receber aviso na próxima disponibilidade.</p>}
        </div>
      </Modal>}

      {commentsOpen && selectedTitle && <Modal title="Comentários" eyebrow={`Avaliações • ${selectedTitle.title}`} z={280} onClose={() => setCommentsOpen(false)}>
        {(selectedTitle.comments ?? []).length > 0 ? (
          <div className="grid gap-2">
            {(selectedTitle.comments ?? []).map((comment) => <article key={comment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="text-sm text-amber-500">{"★".repeat(Number(comment.rating ?? 0))}{"☆".repeat(Math.max(0, 5 - Number(comment.rating ?? 0)))}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{comment.comment}</p></article>)}
          </div>
        ) : <p className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold text-slate-600">Ainda não há comentários para este livro.</p>}
      </Modal>}

      {confirmAction && selectedTitle && <Modal title={confirmAction === "borrow-now" ? "Confirmar empréstimo" : "Confirmar reserva"} eyebrow="Acervo Vivo • confirmação" z={290} onClose={() => setConfirmAction(null)}>
        <div className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10">
          <p><strong>Livro:</strong> {selectedTitle.title}</p>
          {confirmAction === "borrow-now" ? (
            <>
              <p className="mt-2">Ao confirmar, o empréstimo começa agora e terá prazo de <strong>{payload.settings?.loan_days ?? 30} dias</strong>.</p>
              <p className="mt-2">A devolução deve ser feita no mesmo local da retirada: <strong>{pickupLocation}</strong>.</p>
              <a href={pickupMapsUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-xl bg-white p-2 text-xs font-black leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                📍 {pickupAddress}
                <span className="ml-1 underline underline-offset-2">Abrir no Google Maps</span>
              </a>
              <p className="mt-2">Se o livro não for devolvido antes, o sistema enviará um lembrete por e-mail <strong>{reminderDays} dia(s) antes</strong> da data máxima de devolução <strong>{formatDate(confirmDueAt)}</strong>.</p>
              {!selectedQrCopy && selectedCopies.filter((copy) => copy.status === "disponivel").length > 1 && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900">Há mais de um exemplar disponível. Sempre que possível, leia o QR Code colado no exemplar em suas mãos para identificar exatamente o livro retirado.</p>}
            </>
          ) : (
            <>
              <p className="mt-2">Se houver exemplar disponível, ele ficará reservado por <strong>{payload.settings?.reservation_hold_days ?? 3} dia(s)</strong> para retirada em <strong>{pickupLocation}</strong>.</p>
              <a href={pickupMapsUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-xl bg-white p-2 text-xs font-black leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">📍 {pickupAddress} <span className="underline underline-offset-2">Abrir no Google Maps</span></a>
              <p className="mt-2">Na retirada, leia o QR Code do livro para confirmar o empréstimo.</p>
              {availableCount <= 0 && <div className="mt-3 grid gap-2"><label className="flex gap-2 rounded-xl bg-white p-2"><input type="checkbox" checked={notifyIfNotPickedUp} onChange={(event) => setNotifyIfNotPickedUp(event.target.checked)} />Avisar se uma reserva anterior não for retirada no prazo.</label><label className="flex gap-2 rounded-xl bg-white p-2"><input type="checkbox" checked={reserveAfterReturn} onChange={(event) => setReserveAfterReturn(event.target.checked)} />Manter meu interesse para reservar quando o livro for devolvido.</label></div>}
            </>
          )}
        </div>
        <button disabled={saving} type="button" onClick={() => void executeAction(confirmAction)} className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Confirmar</button>
      </Modal>}

      {loanThankYou && <Modal title="Obrigado!" eyebrow="Acervo Vivo • empréstimo confirmado" z={310} onClose={closeLoanThankYou}>
        <div className="rounded-2xl bg-[#E9F2E7] p-4 text-sm font-semibold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">
          <p>O empréstimo do livro <strong>{loanThankYou.title}</strong> foi registrado com sucesso.</p>
          <p className="mt-2">Data máxima para devolução: <strong>{formatDate(loanThankYou.dueAt)}</strong>.</p>
          <p className="mt-2">De preferência, devolva exatamente no mesmo local onde retirou: <strong>{pickupLocation}</strong>.</p>
          <a href={pickupMapsUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-xl bg-white p-2 text-xs font-black leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">📍 {pickupAddress} <span className="underline underline-offset-2">Abrir no Google Maps</span></a>
          <p className="mt-3 font-bold">Isso ajuda a Biblioteca do Acervo Vivo do Tucxa a permanecer organizada e à disposição de todos.</p>
        </div>
        <button type="button" onClick={closeLoanThankYou} className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white">Fechar</button>
      </Modal>}

      {blockingNotice && <Modal title={blockingNotice.title} eyebrow="Acervo Vivo • atenção" z={330} onClose={() => setBlockingNotice(null)}>
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">
          {blockingNotice.message}
        </div>
        {blockingNotice.actionHref && (
          <Link href={blockingNotice.actionHref} className="mt-3 block rounded-2xl bg-[#123D2C] px-4 py-3 text-center font-black text-white">
            {blockingNotice.actionLabel || "Continuar"}
          </Link>
        )}
        <button type="button" onClick={() => setBlockingNotice(null)} className="mt-2 w-full rounded-2xl bg-white px-4 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">
          Fechar
        </button>
      </Modal>}

      {identifierOpen && <Modal title={`Finalize sua ${pendingAction === "borrow-now" ? "retirada" : pendingAction === "my-books" ? "identificação" : "reserva"}`} eyebrow="Agora precisamos identificar você" z={300} onClose={() => setIdentifierOpen(false)}>
        {!resolved && <form onSubmit={resolveIdentifier} className="grid gap-3"><label className="grid gap-1 text-sm font-black text-[#123D2C]">WhatsApp ou e-mail<input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-[#2F6B43]" placeholder="(19) 99999-9999 ou seu@email.com" /></label><button disabled={saving} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Continuar</button></form>}
        {resolved?.found && <form onSubmit={signInAndContinue} className="grid gap-3">
          <p className={`rounded-2xl p-3 text-sm font-bold leading-6 ring-1 ${resolved.hasValidEmail === false ? "bg-amber-50 text-amber-950 ring-amber-200" : "bg-[#E9F2E7] text-[#123D2C] ring-[#123D2C]/10"}`}>
            {resolved.hasValidEmail === false
              ? "Cadastro localizado, mas ainda sem e-mail válido. Confirme sua senha para entrar; em seguida vamos direcionar você para atualizar o cadastro antes do empréstimo."
              : "Cadastro localizado. Confirme sua senha para continuar."}
          </p>
          <label className="grid gap-1 text-sm font-black text-[#123D2C]">Senha<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-[#2F6B43]" /></label>
          <button disabled={saving || !resolved.authEmail} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">
            {resolved.hasValidEmail === false ? "Entrar para atualizar cadastro" : "Entrar e continuar"}
          </button>
          {!resolved.authEmail && (
            <div className="grid gap-2">
              <p className="rounded-xl bg-red-50 p-2 text-xs font-bold text-red-800">Este cadastro ainda não possui acesso de login utilizável. Atualize o cadastro para continuar.</p>
              <Link
                href={registrationHref(resolved.profile === "consulente" ? "consulente" : "filho")}
                className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
              >
                Atualizar cadastro / acesso
              </Link>
            </div>
          )}
        </form>}
        {resolved && !resolved.found && <div><p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-950 ring-1 ring-amber-200">Cadastro não localizado. O cadastro é necessário somente uma vez; depois você poderá usar o mesmo acesso no Acervo Vivo.</p><div className="mt-3 grid gap-2"><Link href={registrationHref("consulente")} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white">Sou Consulente / Filho de Fora</Link><Link href={registrationHref("filho")} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Sou Filho da Corrente</Link></div></div>}
      </Modal>}
    </>
  );
}
