import { NextResponse } from "next/server";
import { getTucxaManagementAccess } from "@/lib/organizacao-em-harmonia/tucxa-management-access";
import {
  asTextList,
  normalize,
  record,
  reconcileExpiredAcervoReservations,
  offerAcervoCopyToNextReservation,
  slugify,
  text,
} from "@/lib/organizacao-em-harmonia/acervo-vivo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import QRCode from "qrcode";
import { sendAcervoMovementNotifications } from "@/lib/organizacao-em-harmonia/acervo-vivo-notifications";

export const dynamic = "force-dynamic";


type PersonRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  active?: boolean | null;
};

type TitleRow = {
  id: string;
  active?: boolean | null;
  cover_url?: string | null;
  cover_match_status?: string | null;
  [key: string]: unknown;
};

type CopyRow = {
  id: string;
  title_id: string;
  status: string;
  active?: boolean | null;
  [key: string]: unknown;
};

type LoanRow = {
  id: string;
  copy_id: string;
  person_id: string;
  due_at: string;
  returned_at?: string | null;
  [key: string]: unknown;
};

type CoverSearchCandidate = {
  externalId: string;
  title: string;
  subtitle: string;
  authors: string[];
  publisher: string;
  publicationYear: number | null;
  isbn13: string;
  isbn10: string;
  coverUrl: string;
  description: string;
  source: "google-books" | "open-library";
};

type ReservationRow = {
  id: string;
  title_id: string;
  person_id: string;
  status: string;
  [key: string]: unknown;
};

const MANAGEMENT_FUNCTIONS = [
  "biblioteca-acervo-vivo",
  "gestor-acervo-vivo-biblioteca",
  "gestor-acervo-vivo-folha-verde",
  "gestor-acervo-vivo-grupo-de-estudos",
  "gestor-acervo-vivo-clube-do-livro",
  "recepcao",
  "apoia-recepcao",
  "apoio-recepcao",
  "biblioteca",
  "bibliotecario",
  "presidente",
  "vice-presidente",
  "diretoria",
  "diretor",
  "secretario",
  "secretaria",
  "coordenacao",
  "coordenador",
];

type ManagementPermissions = {
  library: boolean;
  libraryRules: boolean;
  folhaVerde: boolean;
  grupoEstudos: boolean;
  clubeLivro: boolean;
  reception: boolean;
  systemAdmin: boolean;
};

function membershipTokens(membership: Record<string, unknown> | null) {
  const profile = record(membership?.agenda_viva_profile);
  const functionSlugs = Array.isArray(profile.functionSlugs)
    ? profile.functionSlugs.map((item) => normalize(item)).filter(Boolean)
    : [];
  const selectedFunctions = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions.flatMap((item) => {
        const current = record(item);
        return [current.slug, current.label, current.name].map((value) => normalize(value)).filter(Boolean);
      })
    : [];
  return Array.from(new Set([...functionSlugs, ...selectedFunctions]));
}

async function permissionsForContext(context: {
  membership: Record<string, unknown> | null;
}) {
  const membership = context.membership;
  const profile = record(membership?.agenda_viva_profile);
  const tokens = membershipTokens(membership);
  const roleId = text(membership?.role_id);
  if (roleId) {
    const { data: role, error } = await supabaseAdmin
      .from("oh_roles")
      .select("slug,name")
      .eq("id", roleId)
      .maybeSingle();
    if (error) throw error;
    if (role) tokens.push(normalize(role.slug), normalize(role.name));
  }

  const systemAdmin =
    profile.isClientAdmin === true ||
    normalize(membership?.status) === "gestor_cliente" ||
    tokens.some((token) => ["administrador-sistema", "gestor-cliente", "administrador"].includes(token));

  const has = (...needles: string[]) => needles.some((needle) => tokens.includes(normalize(needle)));

  const dedicatedLibrary = has("biblioteca-acervo-vivo", "gestor-acervo-vivo-biblioteca", "biblioteca", "bibliotecario");
  const legacyBroadManagement = has("presidente", "vice-presidente", "diretoria", "diretor", "secretario", "secretaria", "coordenacao", "coordenador");

  return {
    library: systemAdmin || dedicatedLibrary || legacyBroadManagement,
    libraryRules: systemAdmin || dedicatedLibrary,
    folhaVerde: systemAdmin || has("gestor-acervo-vivo-folha-verde"),
    grupoEstudos: systemAdmin || has("gestor-acervo-vivo-grupo-de-estudos"),
    clubeLivro: systemAdmin || has("gestor-acervo-vivo-clube-do-livro"),
    reception: systemAdmin || has("recepcao", "apoia-recepcao", "apoio-recepcao"),
    systemAdmin,
  } satisfies ManagementPermissions;
}

function forbiddenCapability(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = normalize(value);
  if (["1", "true", "sim", "yes"].includes(normalized)) return true;
  if (["0", "false", "nao", "no"].includes(normalized)) return false;
  return fallback;
}

function dateOnly(value: unknown) {
  const raw = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function nowIso() {
  return new Date().toISOString();
}

function errorMessage(value: unknown, fallback: string) {
  if (value instanceof Error && value.message) return value.message;
  const current = record(value);
  return text(current.message) || text(current.details) || text(current.hint) || fallback;
}

async function audit(organizationId: string, personId: string | undefined, action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) {
  await supabaseAdmin.from("oh_acervo_audit").insert({
    organization_id: organizationId,
    actor_person_id: personId || null,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details: details ?? {},
  });
}

async function loadPayload(organizationId: string, permissions: ManagementPermissions) {
  await reconcileExpiredAcervoReservations(organizationId);
  const [
    settings,
    titles,
    copies,
    loans,
    reservations,
    resources,
    versions,
    trails,
    trailItems,
    curations,
    people,
    courses,
    lessons,
    inventorySessions,
    inventoryScans,
  ] = await Promise.all([
    supabaseAdmin.from("oh_acervo_settings").select("*").eq("organization_id", organizationId).maybeSingle(),
    supabaseAdmin.from("oh_acervo_titles").select("*").eq("organization_id", organizationId).order("title"),
    supabaseAdmin.from("oh_acervo_copies").select("*").eq("organization_id", organizationId).order("asset_code"),
    supabaseAdmin.from("oh_acervo_loans").select("*").eq("organization_id", organizationId).order("loaned_at", { ascending: false }),
    supabaseAdmin.from("oh_acervo_reservations").select("*").eq("organization_id", organizationId).order("requested_at", { ascending: true }),
    supabaseAdmin.from("oh_acervo_resources").select("*").eq("organization_id", organizationId).order("title"),
    supabaseAdmin.from("oh_acervo_resource_versions").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabaseAdmin.from("oh_acervo_trails").select("*").eq("organization_id", organizationId).order("sort_order"),
    supabaseAdmin.from("oh_acervo_trail_items").select("*").eq("organization_id", organizationId).order("sort_order"),
    supabaseAdmin.from("oh_acervo_curations").select("*").eq("organization_id", organizationId).order("sort_order"),
    supabaseAdmin.from("oh_people").select("id,full_name,email,whatsapp,active").eq("organization_id", organizationId).eq("active", true).order("full_name"),
    supabaseAdmin.from("oh_courses").select("id,name,status,active").eq("organization_id", organizationId).order("name"),
    supabaseAdmin.from("oh_course_lessons").select("id,course_id,title,starts_at,ends_at,status").eq("organization_id", organizationId).order("starts_at"),
    supabaseAdmin.from("oh_acervo_inventory_sessions").select("*").eq("organization_id", organizationId).order("started_at", { ascending: false }),
    supabaseAdmin.from("oh_acervo_inventory_scans").select("*").eq("organization_id", organizationId).order("scanned_at", { ascending: false }),
  ]);

  for (const result of [settings, titles, copies, loans, reservations, resources, versions, trails, trailItems, curations, people, inventorySessions, inventoryScans]) {
    if (result.error) throw result.error;
  }

  const events = await supabaseAdmin
    .from("agv_events")
    .select("id,title,starts_at,ends_at,status,active,event_type,group_slug,metadata")
    .eq("organization_id", organizationId)
    .neq("active", false)
    .order("starts_at", { ascending: false });

  const titleRows = (titles.data ?? []) as TitleRow[];
  const copyRows = (copies.data ?? []) as CopyRow[];
  const loanRows = (loans.data ?? []) as LoanRow[];
  const reservationRows = (reservations.data ?? []) as ReservationRow[];
  const peopleRows = (people.data ?? []) as PersonRow[];
  const receptionOnly =
    permissions.reception &&
    !permissions.library &&
    !permissions.folhaVerde &&
    !permissions.grupoEstudos &&
    !permissions.clubeLivro;
  const personMap = new Map(peopleRows.map((person) => [person.id, person]));
  const titleMap = new Map(titleRows.map((title) => [title.id, title]));
  const copyMap = new Map(copyRows.map((copy) => [copy.id, copy]));

  const enrichedLoans = loanRows.map((loan) => {
    const copy = copyMap.get(loan.copy_id);
    return {
      ...loan,
      person: receptionOnly
        ? (() => { const person = personMap.get(loan.person_id); return person ? { id: person.id, full_name: person.full_name } : null; })()
        : personMap.get(loan.person_id) ?? null,
      copy: copy ?? null,
      title: copy ? titleMap.get(copy.title_id) ?? null : null,
      isOverdue: !loan.returned_at && new Date(loan.due_at).getTime() < Date.now(),
    };
  });

  const enrichedReservations = reservationRows.map((reservation) => ({
    ...reservation,
    person: receptionOnly
      ? (() => { const person = personMap.get(reservation.person_id); return person ? { id: person.id, full_name: person.full_name } : null; })()
      : personMap.get(reservation.person_id) ?? null,
    title: titleMap.get(reservation.title_id) ?? null,
    availableCopy: text(reservation.available_copy_id)
      ? copyMap.get(text(reservation.available_copy_id)) ?? null
      : null,
  }));

  const metrics = {
    titles: titleRows.filter((row) => row.active !== false).length,
    copies: copyRows.filter((row) => row.active !== false).length,
    available: copyRows.filter((row) => row.active !== false && row.status === "disponivel").length,
    loaned: copyRows.filter((row) => row.active !== false && row.status === "emprestado").length,
    overdue: loanRows.filter((row) => !row.returned_at && new Date(row.due_at).getTime() < Date.now()).length,
    reservations: reservationRows.filter((row) => ["aguardando", "disponivel"].includes(row.status)).length,
    pendingCovers: titleRows.filter((row) => !row.cover_url || ["pendente", "sugerida"].includes(row.cover_match_status ?? "")).length,
  };

  let catalogWarning: string | null = null;
  if (metrics.titles === 0 || metrics.copies === 0) {
    const [otherTitles, otherCopies] = await Promise.all([
      supabaseAdmin.from("oh_acervo_titles").select("organization_id").limit(5000),
      supabaseAdmin.from("oh_acervo_copies").select("organization_id").limit(5000),
    ]);
    if (!otherTitles.error && !otherCopies.error) {
      const titleCounts = new Map<string, number>();
      const copyCounts = new Map<string, number>();
      for (const row of otherTitles.data ?? []) {
        const key = text(row.organization_id);
        if (key) titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
      }
      for (const row of otherCopies.data ?? []) {
        const key = text(row.organization_id);
        if (key) copyCounts.set(key, (copyCounts.get(key) ?? 0) + 1);
      }
      const candidates = Array.from(new Set([...titleCounts.keys(), ...copyCounts.keys()]))
        .filter((id) => id !== organizationId)
        .map((id) => ({ id, titles: titleCounts.get(id) ?? 0, copies: copyCounts.get(id) ?? 0 }))
        .sort((left, right) => (right.titles + right.copies) - (left.titles + left.copies));
      const candidate = candidates[0];
      catalogWarning = candidate && (candidate.titles > 0 || candidate.copies > 0)
        ? `O Acervo desta organização está vazio, mas foram encontrados ${candidate.titles} título(s) e ${candidate.copies} exemplar(es) vinculados a outro cadastro de organização. Aplique a migration de reparo do Ajuste 15.`
        : "O Acervo desta organização está vazio. Aplique a migration de reparo do catálogo do Ajuste 15 e confirme o projeto Supabase usado pelo Vercel.";
    }
  }

  const folhaYears = await supabaseAdmin
    .from("oh_acervo_folha_years")
    .select("id,year,summary,highlights,events,photos,active,updated_at")
    .eq("organization_id", organizationId)
    .order("year", { ascending: false });

  return {
    permissions,
    organizationId,
    catalogWarning,
    settings: settings.data ?? null,
    titles: titleRows,
    copies: copyRows,
    loans: enrichedLoans,
    reservations: enrichedReservations,
    resources: receptionOnly ? [] : resources.data ?? [],
    resourceVersions: receptionOnly ? [] : versions.data ?? [],
    trails: receptionOnly ? [] : trails.data ?? [],
    trailItems: receptionOnly ? [] : trailItems.data ?? [],
    curations: receptionOnly ? [] : curations.data ?? [],
    people: receptionOnly ? [] : peopleRows,
    courses: receptionOnly ? [] : courses.error ? [] : courses.data ?? [],
    lessons: receptionOnly ? [] : lessons.error ? [] : lessons.data ?? [],
    agendaEvents: receptionOnly ? [] : events.error ? [] : events.data ?? [],
    inventorySessions: receptionOnly ? [] : inventorySessions.data ?? [],
    inventoryScans: receptionOnly ? [] : inventoryScans.data ?? [],
    folhaYears: receptionOnly || folhaYears.error ? [] : folhaYears.data ?? [],
    integrationsWarning: [
      courses.error ? `Cursos: ${errorMessage(courses.error, "indisponível")}` : "",
      lessons.error ? `Aulas: ${errorMessage(lessons.error, "indisponível")}` : "",
      events.error ? `Agenda Viva: ${errorMessage(events.error, "indisponível")}` : "",
    ].filter(Boolean).join(" • ") || null,
    metrics,
  };
}

export async function GET(request: Request) {
  const access = await getTucxaManagementAccess(request, MANAGEMENT_FUNCTIONS);
  if (!access.ok) return access.response;

  try {
    const permissions = await permissionsForContext(access.context);
    const url = new URL(request.url);
    if (url.searchParams.get("accessOnly") === "1") {
      return NextResponse.json({ permissions });
    }
    return NextResponse.json(await loadPayload(access.context.organizationId, permissions));
  } catch (error) {
    const current = record(error);
    const schemaMissing = text(current.code).toUpperCase() === "42P01" || text(current.code).toUpperCase() === "PGRST205";
    return NextResponse.json(
      {
        error: schemaMissing
          ? "A estrutura do Acervo Vivo ainda não está disponível no banco. Aplique a migration 20260819030000_oh_tucxa_acervo_vivo_v1.sql no Supabase."
          : errorMessage(error, "Erro ao carregar o Acervo Vivo."),
      },
      { status: schemaMissing ? 503 : 500 },
    );
  }
}

async function fetchGoogleBookCandidates(query: string) {
  if (!query) return [] as CoverSearchCandidate[];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books`,
      {
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error(`Google Books respondeu ${response.status}.`);
    const payload = record(await response.json());
    const items: unknown[] = Array.isArray(payload.items) ? payload.items : [];
    return items
      .map((item: unknown): CoverSearchCandidate => {
        const current = record(item);
        const volume = record(current.volumeInfo);
        const images = record(volume.imageLinks);
        const identifiers: unknown[] = Array.isArray(volume.industryIdentifiers)
          ? volume.industryIdentifiers
          : [];
        const normalizedIdentifiers = identifiers.map((identifier: unknown) => record(identifier));
        const isbn13 = normalizedIdentifiers.find(
          (id: Record<string, unknown>) => text(id.type) === "ISBN_13",
        );
        const isbn10 = normalizedIdentifiers.find(
          (id: Record<string, unknown>) => text(id.type) === "ISBN_10",
        );
        const image = text(
          images.extraLarge ||
            images.large ||
            images.medium ||
            images.small ||
            images.thumbnail ||
            images.smallThumbnail,
        ).replace(/^http:/, "https:");
        return {
          externalId: text(current.id),
          title: text(volume.title),
          subtitle: text(volume.subtitle),
          authors: asTextList(volume.authors),
          publisher: text(volume.publisher),
          publicationYear: Number.parseInt(text(volume.publishedDate).slice(0, 4), 10) || null,
          isbn13: text(isbn13?.identifier),
          isbn10: text(isbn10?.identifier),
          coverUrl: image,
          description: text(volume.description),
          source: "google-books",
        };
      })
      .filter((item: CoverSearchCandidate) => item.coverUrl || item.title);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOpenLibraryCandidates(title: string, authors: string[]) {
  if (!title) return [] as CoverSearchCandidate[];
  const params = new URLSearchParams({ title, limit: "10", fields: "key,title,author_name,first_publish_year,isbn,cover_i,publisher" });
  if (authors[0]) params.set("author", authors[0]);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return [] as CoverSearchCandidate[];
    const payload = record(await response.json());
    const docs: unknown[] = Array.isArray(payload.docs) ? payload.docs : [];
    return docs.map((item): CoverSearchCandidate => {
      const current = record(item);
      const isbns = asTextList(current.isbn);
      const coverId = Number(current.cover_i || 0);
      return {
        externalId: text(current.key),
        title: text(current.title),
        subtitle: "",
        authors: asTextList(current.author_name),
        publisher: asTextList(current.publisher)[0] || "",
        publicationYear: numberValue(current.first_publish_year, 0) || null,
        isbn13: isbns.find((value) => value.length === 13) || "",
        isbn10: isbns.find((value) => value.length === 10) || "",
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
        description: "",
        source: "open-library",
      };
    }).filter((item) => item.coverUrl || item.title);
  } finally {
    clearTimeout(timer);
  }
}

async function searchGoogleBooks(title: string, authors: string[], isbn10?: string | null, isbn13?: string | null) {
  const isbn = (text(isbn13) || text(isbn10)).replace(/[^0-9X]/gi, "");
  const byIsbn = isbn
    ? await fetchGoogleBookCandidates(`isbn:${isbn}`).catch(() => [] as CoverSearchCandidate[])
    : [];
  const preciseQuery = [title ? `intitle:${title}` : "", authors[0] ? `inauthor:${authors[0]}` : ""].filter(Boolean).join(" ");
  const precise = preciseQuery
    ? await fetchGoogleBookCandidates(preciseQuery).catch(() => [] as CoverSearchCandidate[])
    : [];
  const broadQuery = [title, authors[0] || ""].filter(Boolean).join(" ");
  const broad = broadQuery && broadQuery !== preciseQuery
    ? await fetchGoogleBookCandidates(broadQuery).catch(() => [] as CoverSearchCandidate[])
    : [];
  const titleOnlyQuery = title ? `intitle:${title}` : "";
  const titleOnly = titleOnlyQuery && titleOnlyQuery !== preciseQuery
    ? await fetchGoogleBookCandidates(titleOnlyQuery).catch(() => [] as CoverSearchCandidate[])
    : [];
  const openLibraryPrecise = await fetchOpenLibraryCandidates(title, authors).catch(() => [] as CoverSearchCandidate[]);
  const openLibraryTitleOnly = authors.length
    ? await fetchOpenLibraryCandidates(title, []).catch(() => [] as CoverSearchCandidate[])
    : [];
  const seen = new Set<string>();
  return [...byIsbn, ...precise, ...broad, ...titleOnly, ...openLibraryPrecise, ...openLibraryTitleOnly].filter((candidate) => {
    const key = `${candidate.source}|${candidate.externalId || `${normalize(candidate.title)}|${candidate.coverUrl}`}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(candidate.coverUrl);
  });
}

function coverCandidateScore(title: string, authors: string[], isbn10: string | null | undefined, isbn13: string | null | undefined, candidate: CoverSearchCandidate) {
  const wantedIsbns = [text(isbn10), text(isbn13)].map((value) => value.replace(/[^0-9X]/gi, "")).filter(Boolean);
  const candidateIsbns = [candidate.isbn10, candidate.isbn13].map((value) => value.replace(/[^0-9X]/gi, "")).filter(Boolean);
  if (wantedIsbns.some((isbn) => candidateIsbns.includes(isbn))) return 100;

  const wantedTitle = normalize(title);
  const candidateTitle = normalize(candidate.title);
  let score = 0;
  if (wantedTitle && candidateTitle === wantedTitle) score += 75;
  else if (wantedTitle && candidateTitle && (candidateTitle.includes(wantedTitle) || wantedTitle.includes(candidateTitle))) score += 50;

  const wantedAuthors = authors.map(normalize).filter(Boolean);
  const candidateAuthors = normalize(candidate.authors.join(" "));
  if (!wantedAuthors.length) score += 10;
  else if (wantedAuthors.some((author) => author.split(/\s+/).filter((token) => token.length >= 4).some((token) => candidateAuthors.includes(token)))) score += 20;

  if (candidate.coverUrl) score += 5;
  return score;
}

export async function POST(request: Request) {
  const access = await getTucxaManagementAccess(request, MANAGEMENT_FUNCTIONS);
  if (!access.ok) return access.response;

  const { organizationId } = access.context;
  const actorPersonId = text(access.context.person?.id);
  const body = record(await request.json().catch(() => ({})));
  const action = text(body.action);

  try {
    const permissions = await permissionsForContext(access.context);
    await reconcileExpiredAcervoReservations(organizationId);
    if (action === "save-settings") {
      if (!permissions.libraryRules) {
        return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode atualizar as regras de empréstimo, renovação, reservas e pendências.");
      }
      const { data: currentSettings, error: currentSettingsError } = await supabaseAdmin
        .from("oh_acervo_settings")
        .select("metadata")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (currentSettingsError) throw currentSettingsError;
      const currentMetadata = record(currentSettings?.metadata);
      const notificationEmails = asTextList(body.notificationEmails).filter((value) => value.includes("@"));
      const payload = {
        organization_id: organizationId,
        loan_days: Math.max(1, Math.min(365, numberValue(body.loanDays, 30))),
        daily_late_fee: Math.max(0, numberValue(body.dailyLateFee, 1)),
        max_active_loans: Math.max(1, Math.min(50, numberValue(body.maxActiveLoans, 3))),
        renewal_limit: Math.max(0, Math.min(20, numberValue(body.renewalLimit, 1))),
        reservation_hold_days: Math.max(1, Math.min(30, numberValue(body.reservationHoldDays, 3))),
        public_catalog_enabled: boolValue(body.publicCatalogEnabled, true),
        member_loans_enabled: boolValue(body.memberLoansEnabled, true),
        member_reservations_enabled: boolValue(body.memberReservationsEnabled, true),
        member_renewals_enabled: boolValue(body.memberRenewalsEnabled, true),
        block_new_loans_with_overdue: boolValue(body.blockNewLoansWithOverdue, true),
        block_new_loans_with_pending_fee: boolValue(body.blockNewLoansWithPendingFee, true),
        metadata: {
          ...currentMetadata,
          pickup_location: text(body.pickupLocation) || text(currentMetadata.pickup_location) || "Tucxa 1",
          self_service_enabled: boolValue(body.selfServiceEnabled, currentMetadata.self_service_enabled !== false),
          loan_reminder_days_before_due: Math.max(0, Math.min(30, numberValue(
            body.loanReminderDaysBeforeDue,
            numberValue(currentMetadata.loan_reminder_days_before_due, 3),
          ))),
          notification_emails: Object.prototype.hasOwnProperty.call(body, "notificationEmails") ? notificationEmails : asTextList(currentMetadata.notification_emails),
        },
        updated_at: nowIso(),
      };
      const { error } = await supabaseAdmin.from("oh_acervo_settings").upsert(payload, { onConflict: "organization_id" });
      if (error) throw error;
      await audit(organizationId, actorPersonId, "configuracoes_atualizadas", "settings", undefined, payload);
      return NextResponse.json({ ok: true });
    }

    if (action === "create-title" || action === "update-title") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode cadastrar ou atualizar livros.");
      const title = text(body.title);
      if (title.length < 2) return NextResponse.json({ error: "Informe o título da obra." }, { status: 400 });
      const publicationYear = numberValue(body.publicationYear, 0);
      const payload = {
        organization_id: organizationId,
        title,
        normalized_title: normalize(title),
        subtitle: text(body.subtitle) || null,
        authors: asTextList(body.authors),
        publisher: text(body.publisher) || null,
        edition: text(body.edition) || null,
        publication_year: publicationYear >= 1000 && publicationYear <= 2200 ? publicationYear : null,
        isbn10: text(body.isbn10) || null,
        isbn13: text(body.isbn13) || null,
        language: text(body.language) || "pt-BR",
        description: text(body.description) || null,
        subjects: asTextList(body.subjects),
        keywords: asTextList(body.keywords),
        audience: asTextList(body.audience),
        active: body.active === undefined ? true : boolValue(body.active, true),
        updated_at: nowIso(),
      };

      if (action === "create-title") {
        const { data, error } = await supabaseAdmin
          .from("oh_acervo_titles")
          .insert({ ...payload, created_by_person_id: actorPersonId || null })
          .select("id")
          .single();
        if (error) throw error;
        await audit(organizationId, actorPersonId, "titulo_criado", "title", data.id, { title });
        return NextResponse.json({ ok: true, id: data.id });
      }

      const titleId = text(body.titleId);
      const { error } = await supabaseAdmin.from("oh_acervo_titles").update(payload).eq("organization_id", organizationId).eq("id", titleId);
      if (error) throw error;
      await audit(organizationId, actorPersonId, "titulo_atualizado", "title", titleId, { title });
      return NextResponse.json({ ok: true });
    }

    if (action === "enrich-covers") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode enriquecer capas do catálogo.");
      const limit = Math.max(1, Math.min(20, numberValue(body.limit, 10)));
      const { data: pending, error: pendingError } = await supabaseAdmin
        .from("oh_acervo_titles")
        .select("id,title,authors,isbn10,isbn13,description,cover_url,cover_match_status")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .or("cover_url.is.null,cover_match_status.eq.pendente")
        .order("title")
        .limit(limit);
      if (pendingError) throw pendingError;

      let enriched = 0;
      let suggested = 0;
      for (const current of pending ?? []) {
        try {
          const candidates = await searchGoogleBooks(current.title, current.authors ?? [], current.isbn10, current.isbn13);
          if (!candidates.length) continue;
          const ranked = candidates
            .map((candidate) => ({ candidate, score: coverCandidateScore(current.title, current.authors ?? [], current.isbn10, current.isbn13, candidate) }))
            .sort((left, right) => right.score - left.score);
          const best = ranked[0];
          if (!best?.candidate.coverUrl) continue;
          const selected = best.candidate;
          const status = best.score >= 80 ? "confirmada" : "sugerida";
          const { error } = await supabaseAdmin.from("oh_acervo_titles").update({
            cover_url: selected.coverUrl,
            cover_source: selected.source,
            cover_external_id: selected.externalId || null,
            cover_match_status: status,
            cover_match_confidence: best.score,
            isbn10: selected.isbn10 || null,
            isbn13: selected.isbn13 || null,
            publisher: selected.publisher || null,
            description: text(current.description) || text(selected.description) || null,
            updated_at: nowIso(),
          }).eq("organization_id", organizationId).eq("id", current.id);
          if (error) throw error;
          if (best.score >= 80) enriched += 1;
          else suggested += 1;
        } catch {
          // Um título sem correspondência não deve interromper o lote inteiro.
        }
      }
      await audit(organizationId, actorPersonId, "capas_enriquecidas_em_lote", "title", undefined, { enriched, suggested, checked: (pending ?? []).length });
      return NextResponse.json({ ok: true, enriched, suggested, checked: (pending ?? []).length });
    }

    if (action === "search-cover") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode pesquisar capas para o catálogo.");
      const titleId = text(body.titleId);
      const { data: title, error } = await supabaseAdmin
        .from("oh_acervo_titles")
        .select("id,title,authors,isbn10,isbn13")
        .eq("organization_id", organizationId)
        .eq("id", titleId)
        .maybeSingle();
      if (error) throw error;
      if (!title?.id) return NextResponse.json({ error: "Título não localizado." }, { status: 404 });
      const candidates = await searchGoogleBooks(title.title, title.authors ?? [], title.isbn10, title.isbn13);
      return NextResponse.json({ ok: true, candidates });
    }

    if (action === "apply-cover") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode confirmar capas do catálogo.");
      const titleId = text(body.titleId);
      const coverUrl = text(body.coverUrl);
      if (!coverUrl) return NextResponse.json({ error: "Capa não informada." }, { status: 400 });
      const { data: currentTitle, error: currentTitleError } = await supabaseAdmin
        .from("oh_acervo_titles")
        .select("description")
        .eq("organization_id", organizationId)
        .eq("id", titleId)
        .maybeSingle();
      if (currentTitleError) throw currentTitleError;

      const { error } = await supabaseAdmin.from("oh_acervo_titles").update({
        cover_url: coverUrl,
        cover_source: text(body.coverSource) || "google-books",
        cover_external_id: text(body.externalId) || null,
        cover_match_status: body.manual === true ? "manual" : "confirmada",
        isbn10: text(body.isbn10) || null,
        isbn13: text(body.isbn13) || null,
        publisher: text(body.publisher) || null,
        description: text(currentTitle?.description) || text(body.description) || null,
        updated_at: nowIso(),
      }).eq("organization_id", organizationId).eq("id", titleId);
      if (error) throw error;
      await audit(organizationId, actorPersonId, "capa_confirmada", "title", titleId, { coverUrl });
      return NextResponse.json({ ok: true });
    }

    if (action === "create-copy" || action === "update-copy") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode cadastrar ou atualizar exemplares.");
      const titleId = text(body.titleId);
      if (!titleId) return NextResponse.json({ error: "Selecione uma obra para o exemplar." }, { status: 400 });
      let assetCode = text(body.assetCode);
      if (!assetCode) {
        const { count, error: countError } = await supabaseAdmin
          .from("oh_acervo_copies")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId);
        if (countError) throw countError;
        assetCode = `ACV-${String((count ?? 0) + 1).padStart(6, "0")}`;
      }
      const payload = {
        organization_id: organizationId,
        title_id: titleId,
        legacy_code: text(body.legacyCode) || null,
        asset_code: assetCode,
        shelf: text(body.shelf) || null,
        shelf_position: text(body.shelfPosition) || null,
        condition: text(body.condition) || "bom",
        status: text(body.status) || "disponivel",
        acquisition_type: text(body.acquisitionType) || "acervo_historico",
        donor_person_id: text(body.donorPersonId) || null,
        acquired_at: dateOnly(body.acquiredAt),
        notes: text(body.notes) || null,
        active: body.active === undefined ? true : boolValue(body.active, true),
        updated_at: nowIso(),
      };

      if (action === "create-copy") {
        const { data, error } = await supabaseAdmin.from("oh_acervo_copies").insert(payload).select("id,asset_code,qr_token").single();
        if (error) throw error;
        await audit(organizationId, actorPersonId, "exemplar_criado", "copy", data.id, { assetCode: data.asset_code });
        return NextResponse.json({ ok: true, copy: data });
      }

      const copyId = text(body.copyId);
      const { error } = await supabaseAdmin.from("oh_acervo_copies").update(payload).eq("organization_id", organizationId).eq("id", copyId);
      if (error) throw error;
      await audit(organizationId, actorPersonId, "exemplar_atualizado", "copy", copyId, { assetCode });
      return NextResponse.json({ ok: true });
    }

    if (action === "confirm-reservation-loan") {
      if (!(permissions.library || permissions.reception)) {
        return forbiddenCapability(
          "Somente o Gestor Acervo Vivo - Biblioteca, Recepção ou Apoio Recepção pode confirmar a retirada física do livro.",
        );
      }

      const reservationId = text(body.reservationId);
      if (!reservationId) {
        return NextResponse.json({ error: "Reserva não informada." }, { status: 400 });
      }

      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .select("id,title_id,person_id,status,available_copy_id,hold_until")
        .eq("organization_id", organizationId)
        .eq("id", reservationId)
        .maybeSingle();
      if (reservationError) throw reservationError;
      if (!reservation?.id || reservation.status !== "disponivel" || !reservation.available_copy_id) {
        return NextResponse.json(
          { error: "A reserva não está pronta para retirada ou já foi atendida." },
          { status: 409 },
        );
      }
      if (reservation.hold_until && new Date(reservation.hold_until).getTime() < Date.now()) {
        await reconcileExpiredAcervoReservations(organizationId);
        return NextResponse.json(
          { error: "O prazo desta reserva expirou. O exemplar foi liberado para a próxima pessoa da fila." },
          { status: 409 },
        );
      }

      const [{ data: settings }, { data: copy, error: copyError }, activeLoans, membership, pendingFees, personResult] =
        await Promise.all([
          supabaseAdmin
            .from("oh_acervo_settings")
            .select("loan_days,max_active_loans,block_new_loans_with_overdue,block_new_loans_with_pending_fee")
            .eq("organization_id", organizationId)
            .maybeSingle(),
          supabaseAdmin
            .from("oh_acervo_copies")
            .select("id,title_id,status,active,asset_code")
            .eq("organization_id", organizationId)
            .eq("id", reservation.available_copy_id)
            .maybeSingle(),
          supabaseAdmin
            .from("oh_acervo_loans")
            .select("id,copy_id,due_at,status")
            .eq("organization_id", organizationId)
            .eq("person_id", reservation.person_id)
            .is("returned_at", null)
            .in("status", ["ativo", "atrasado"]),
          supabaseAdmin
            .from("oh_memberships")
            .select("id,active,status")
            .eq("organization_id", organizationId)
            .eq("person_id", reservation.person_id)
            .eq("active", true)
            .in("status", ["ativo", "gestor_cliente"])
            .limit(1)
            .maybeSingle(),
          supabaseAdmin
            .from("oh_acervo_loans")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .eq("person_id", reservation.person_id)
            .eq("late_fee_status", "pendente"),
          supabaseAdmin
            .from("oh_people")
            .select("full_name,email,whatsapp")
            .eq("organization_id", organizationId)
            .eq("id", reservation.person_id)
            .maybeSingle(),
        ]);

      if (copyError || activeLoans.error || membership.error || pendingFees.error || personResult.error) {
        throw copyError || activeLoans.error || membership.error || pendingFees.error || personResult.error;
      }
      const loanPerson = personResult.data;
      const loanEmail = text(loanPerson?.email).toLowerCase();
      if (!text(loanPerson?.full_name) || !text(loanPerson?.whatsapp) || !loanEmail.includes("@") || loanEmail.endsWith("@organizacao-em-harmonia.local")) {
        return NextResponse.json({ error: "Para emprestar um livro, a pessoa precisa ter nome, WhatsApp e e-mail válido no cadastro." }, { status: 409 });
      }
      if (!membership.data?.id) {
        return NextResponse.json(
          { error: "A pessoa não possui vínculo ativo com o Tucxa para realizar empréstimos." },
          { status: 409 },
        );
      }
      if (
        !copy?.id ||
        copy.active === false ||
        copy.status !== "reservado" ||
        copy.title_id !== reservation.title_id
      ) {
        return NextResponse.json(
          { error: "O exemplar reservado não está disponível para confirmação de retirada." },
          { status: 409 },
        );
      }

      const maxActive = Number(settings?.max_active_loans ?? 3);
      if ((activeLoans.data ?? []).length >= maxActive) {
        return NextResponse.json(
          { error: `A pessoa atingiu o limite de ${maxActive} empréstimo(s) ativo(s).` },
          { status: 409 },
        );
      }
      if (
        settings?.block_new_loans_with_overdue !== false &&
        (activeLoans.data ?? []).some(
          (loan) => loan.status === "atrasado" || new Date(loan.due_at).getTime() < Date.now(),
        )
      ) {
        return NextResponse.json(
          { error: "A pessoa possui empréstimo em atraso. Regularize antes de confirmar a retirada." },
          { status: 409 },
        );
      }
      if (
        settings?.block_new_loans_with_pending_fee !== false &&
        (pendingFees.count ?? 0) > 0
      ) {
        return NextResponse.json(
          { error: "A pessoa possui pendência de atraso registrada. Regularize antes de confirmar a retirada." },
          { status: 409 },
        );
      }

      const activeCopyIds = (activeLoans.data ?? []).map((loan) => loan.copy_id).filter(Boolean);
      if (activeCopyIds.length > 0) {
        const { data: activeCopies, error: activeCopiesError } = await supabaseAdmin
          .from("oh_acervo_copies")
          .select("title_id")
          .eq("organization_id", organizationId)
          .in("id", activeCopyIds);
        if (activeCopiesError) throw activeCopiesError;
        if ((activeCopies ?? []).some((item) => item.title_id === reservation.title_id)) {
          return NextResponse.json(
            { error: "A pessoa já possui um exemplar deste título em empréstimo." },
            { status: 409 },
          );
        }
      }

      const loanDays = Number(settings?.loan_days ?? 30);
      const dueAt = new Date(Date.now() + loanDays * 86_400_000).toISOString();
      const { data: loan, error: loanError } = await supabaseAdmin
        .from("oh_acervo_loans")
        .insert({
          organization_id: organizationId,
          copy_id: copy.id,
          person_id: reservation.person_id,
          due_at: dueAt,
          created_by_person_id: actorPersonId || null,
          metadata: {
            source: "retirada-tucxa2",
            reservation_id: reservation.id,
            confirmed_by_reception: permissions.reception,
          },
        })
        .select("id")
        .single();
      if (loanError) throw loanError;

      const confirmedAt = nowIso();
      const [{ error: copyUpdateError }, { error: reservationUpdateError }] = await Promise.all([
        supabaseAdmin
          .from("oh_acervo_copies")
          .update({ status: "emprestado", updated_at: confirmedAt })
          .eq("organization_id", organizationId)
          .eq("id", copy.id)
          .eq("status", "reservado"),
        supabaseAdmin
          .from("oh_acervo_reservations")
          .update({
            status: "atendida",
            fulfilled_at: confirmedAt,
            updated_at: confirmedAt,
          })
          .eq("organization_id", organizationId)
          .eq("id", reservation.id),
      ]);
      if (copyUpdateError || reservationUpdateError) {
        throw copyUpdateError || reservationUpdateError;
      }

      await audit(
        organizationId,
        actorPersonId,
        "retirada_confirmada_emprestimo",
        "loan",
        loan.id,
        {
          reservationId: reservation.id,
          copyId: copy.id,
          personId: reservation.person_id,
          dueAt,
        },
      );
      await sendAcervoMovementNotifications({ organizationId, personId: reservation.person_id, titleId: reservation.title_id, copyId: copy.id, kind: "emprestimo", dueAt }).catch(() => undefined);
      return NextResponse.json({ ok: true, loanId: loan.id, dueAt });
    }

    if (action === "loan") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode registrar empréstimos pela gestão.");
      const copyId = text(body.copyId);
      const personId = text(body.personId);
      if (!copyId || !personId) return NextResponse.json({ error: "Informe o exemplar e a pessoa." }, { status: 400 });

      const [{ data: settings }, { data: copy, error: copyError }, activeLoans, membership, pendingFees, personResult] = await Promise.all([
        supabaseAdmin.from("oh_acervo_settings").select("loan_days,max_active_loans,block_new_loans_with_overdue,block_new_loans_with_pending_fee").eq("organization_id", organizationId).maybeSingle(),
        supabaseAdmin.from("oh_acervo_copies").select("id,title_id,status,active").eq("organization_id", organizationId).eq("id", copyId).maybeSingle(),
        supabaseAdmin.from("oh_acervo_loans").select("id,copy_id,due_at,status").eq("organization_id", organizationId).eq("person_id", personId).is("returned_at", null).in("status", ["ativo", "atrasado"]),
        supabaseAdmin.from("oh_memberships").select("id,active,status").eq("organization_id", organizationId).eq("person_id", personId).eq("active", true).in("status", ["ativo", "gestor_cliente"]).limit(1).maybeSingle(),
        supabaseAdmin.from("oh_acervo_loans").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("person_id", personId).eq("late_fee_status", "pendente"),
        supabaseAdmin.from("oh_people").select("full_name,email,whatsapp").eq("organization_id", organizationId).eq("id", personId).maybeSingle(),
      ]);
      if (copyError || activeLoans.error || membership.error || pendingFees.error || personResult.error) throw copyError || activeLoans.error || membership.error || pendingFees.error || personResult.error;
      const manualPerson = personResult.data;
      const manualEmail = text(manualPerson?.email).toLowerCase();
      if (!text(manualPerson?.full_name) || !text(manualPerson?.whatsapp) || !manualEmail.includes("@") || manualEmail.endsWith("@organizacao-em-harmonia.local")) return NextResponse.json({ error: "Para emprestar um livro, a pessoa precisa ter nome, WhatsApp e e-mail válido no cadastro." }, { status: 409 });
      if (!membership.data?.id) return NextResponse.json({ error: "A pessoa não possui vínculo ativo com o Tucxa para realizar empréstimos." }, { status: 409 });
      if (!copy?.id || copy.active === false || copy.status !== "disponivel") return NextResponse.json({ error: "Este exemplar não está disponível para empréstimo." }, { status: 409 });
      if ((activeLoans.data ?? []).length >= (settings?.max_active_loans ?? 3)) return NextResponse.json({ error: "A pessoa atingiu o limite de empréstimos ativos." }, { status: 409 });
      if (settings?.block_new_loans_with_overdue !== false && (activeLoans.data ?? []).some((loan) => loan.status === "atrasado" || new Date(loan.due_at).getTime() < Date.now())) {
        return NextResponse.json({ error: "A pessoa possui empréstimo em atraso. Regularize antes de registrar um novo empréstimo." }, { status: 409 });
      }
      if (settings?.block_new_loans_with_pending_fee !== false && (pendingFees.count ?? 0) > 0) {
        return NextResponse.json({ error: "A pessoa possui pendência de atraso registrada. Regularize antes de registrar um novo empréstimo." }, { status: 409 });
      }
      const activeCopyIds = (activeLoans.data ?? []).map((loan) => loan.copy_id).filter(Boolean);
      if (activeCopyIds.length > 0) {
        const { data: activeCopies, error: activeCopiesError } = await supabaseAdmin
          .from("oh_acervo_copies")
          .select("title_id")
          .eq("organization_id", organizationId)
          .in("id", activeCopyIds);
        if (activeCopiesError) throw activeCopiesError;
        if ((activeCopies ?? []).some((item) => item.title_id === copy.title_id)) {
          return NextResponse.json({ error: "A pessoa já possui um exemplar deste título em empréstimo." }, { status: 409 });
        }
      }

      const loanDays = settings?.loan_days ?? 30;
      const dueAt = new Date(Date.now() + loanDays * 86_400_000).toISOString();
      const { data: loan, error: loanError } = await supabaseAdmin.from("oh_acervo_loans").insert({
        organization_id: organizationId,
        copy_id: copyId,
        person_id: personId,
        due_at: dueAt,
        created_by_person_id: actorPersonId || null,
      }).select("id").single();
      if (loanError) throw loanError;
      const { error: copyUpdateError } = await supabaseAdmin.from("oh_acervo_copies").update({ status: "emprestado", updated_at: nowIso() }).eq("id", copyId);
      if (copyUpdateError) throw copyUpdateError;

      const { data: reservation } = await supabaseAdmin.from("oh_acervo_reservations").select("id").eq("organization_id", organizationId).eq("title_id", copy.title_id).eq("person_id", personId).in("status", ["aguardando", "disponivel"]).order("requested_at").limit(1).maybeSingle();
      if (reservation?.id) {
        await supabaseAdmin.from("oh_acervo_reservations").update({ status: "atendida", fulfilled_at: nowIso(), updated_at: nowIso() }).eq("id", reservation.id);
      }
      await audit(organizationId, actorPersonId, "emprestimo_registrado", "loan", loan.id, { copyId, personId, dueAt });
      await sendAcervoMovementNotifications({ organizationId, personId, titleId: copy.title_id, copyId, kind: "emprestimo", dueAt }).catch(() => undefined);
      return NextResponse.json({ ok: true, loanId: loan.id, dueAt });
    }

    if (action === "return") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode registrar devoluções.");
      const loanId = text(body.loanId);
      const { data: loan, error: loanError } = await supabaseAdmin.from("oh_acervo_loans").select("id,copy_id,person_id,due_at,returned_at").eq("organization_id", organizationId).eq("id", loanId).maybeSingle();
      if (loanError) throw loanError;
      if (!loan?.id || loan.returned_at) return NextResponse.json({ error: "Empréstimo ativo não localizado." }, { status: 404 });

      const { data: settings } = await supabaseAdmin.from("oh_acervo_settings").select("daily_late_fee,reservation_hold_days").eq("organization_id", organizationId).maybeSingle();
      const returnedAt = new Date();
      const dueAt = new Date(loan.due_at);
      const lateDays = Math.max(0, Math.ceil((returnedAt.getTime() - dueAt.getTime()) / 86_400_000));
      const lateFee = Number((lateDays * Number(settings?.daily_late_fee ?? 1)).toFixed(2));
      const { error: updateLoanError } = await supabaseAdmin.from("oh_acervo_loans").update({
        returned_at: returnedAt.toISOString(),
        status: "devolvido",
        late_fee_calculated: lateFee,
        late_fee_status: lateFee > 0 ? "pendente" : "nao_aplicavel",
        returned_by_person_id: actorPersonId || null,
        updated_at: nowIso(),
      }).eq("id", loan.id);
      if (updateLoanError) throw updateLoanError;

      const { data: copy, error: copyError } = await supabaseAdmin.from("oh_acervo_copies").select("title_id").eq("id", loan.copy_id).single();
      if (copyError) throw copyError;
      await supabaseAdmin
        .from("oh_acervo_copies")
        .update({ status: "reservado", updated_at: nowIso() })
        .eq("organization_id", organizationId)
        .eq("id", loan.copy_id);
      await offerAcervoCopyToNextReservation(
        organizationId,
        copy.title_id,
        loan.copy_id,
        Number(settings?.reservation_hold_days ?? 3),
      );
      await audit(organizationId, actorPersonId, "devolucao_registrada", "loan", loan.id, { lateDays, lateFee });
      await sendAcervoMovementNotifications({ organizationId, personId: loan.person_id, titleId: copy.title_id, copyId: loan.copy_id, kind: "devolucao" }).catch(() => undefined);
      return NextResponse.json({ ok: true, lateDays, lateFee });
    }

    if (action === "update-late-fee") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode atualizar pendências e taxas.");
      const loanId = text(body.loanId);
      const status = text(body.status);
      if (!["pendente", "pago", "isento", "nao_aplicavel"].includes(status)) return NextResponse.json({ error: "Situação da taxa inválida." }, { status: 400 });
      const { error } = await supabaseAdmin.from("oh_acervo_loans").update({ late_fee_status: status, late_fee_notes: text(body.notes) || null, updated_at: nowIso() }).eq("organization_id", organizationId).eq("id", loanId);
      if (error) throw error;
      await audit(organizationId, actorPersonId, "taxa_atualizada", "loan", loanId, { status });
      return NextResponse.json({ ok: true });
    }

    if (action === "generate-qr") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode gerar etiquetas de exemplares.");
      const copyId = text(body.copyId);
      const { data: copy, error } = await supabaseAdmin
        .from("oh_acervo_copies")
        .select("id,asset_code,qr_token")
        .eq("organization_id", organizationId)
        .eq("id", copyId)
        .maybeSingle();
      if (error) throw error;
      if (!copy?.id) return NextResponse.json({ error: "Exemplar não localizado." }, { status: 404 });
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
      const value = `${baseUrl}/solucoes/organizacao-em-harmonia/tucxa/acervo-vivo?exemplar=${encodeURIComponent(copy.qr_token)}`;
      const qrDataUrl = await QRCode.toDataURL(value, { width: 1024, margin: 2, errorCorrectionLevel: "M" });
      return NextResponse.json({ ok: true, qrDataUrl, assetCode: copy.asset_code, qrValue: value });
    }

    if (action === "create-inventory-session") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode iniciar inventários.");
      const name = text(body.name) || `Inventário ${new Date().toLocaleDateString("pt-BR")}`;
      const { data, error } = await supabaseAdmin.from("oh_acervo_inventory_sessions").insert({
        organization_id: organizationId,
        name,
        scope: text(body.scope) || "todo_acervo",
        started_by_person_id: actorPersonId || null,
        notes: text(body.notes) || null,
      }).select("id").single();
      if (error) throw error;
      await audit(organizationId, actorPersonId, "inventario_iniciado", "inventory_session", data.id, { name });
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (action === "inventory-scan") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode conferir inventários.");
      const sessionId = text(body.sessionId);
      let code = text(body.code);
      if (code.toLowerCase().startsWith("acervo-vivo:")) code = code.slice("acervo-vivo:".length);
      if (!sessionId || !code) return NextResponse.json({ error: "Informe a sessão e o código/QR do exemplar." }, { status: 400 });

      const { data: session, error: sessionError } = await supabaseAdmin
        .from("oh_acervo_inventory_sessions")
        .select("id,status")
        .eq("organization_id", organizationId)
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!session?.id || session.status !== "aberto") return NextResponse.json({ error: "A sessão de inventário não está aberta." }, { status: 409 });

      const fields = ["asset_code", "legacy_code", "qr_token"] as const;
      let copy: { id: string; asset_code: string; legacy_code?: string | null; title_id: string; shelf?: string | null; shelf_position?: string | null; status: string } | null = null;
      for (const field of fields) {
        const result = await supabaseAdmin
          .from("oh_acervo_copies")
          .select("id,asset_code,legacy_code,title_id,shelf,shelf_position,status")
          .eq("organization_id", organizationId)
          .eq(field, code)
          .limit(2);
        if (result.error) throw result.error;
        if ((result.data ?? []).length > 1) {
          return NextResponse.json({ error: "Mais de um exemplar corresponde ao código informado. Revise os códigos legados." }, { status: 409 });
        }
        if (result.data?.[0]) {
          copy = result.data[0];
          break;
        }
      }
      if (!copy?.id) return NextResponse.json({ error: `Nenhum exemplar localizado para o código ${code}.` }, { status: 404 });

      const { error } = await supabaseAdmin.from("oh_acervo_inventory_scans").upsert({
        organization_id: organizationId,
        session_id: sessionId,
        copy_id: copy.id,
        scanned_by_person_id: actorPersonId || null,
        scanned_at: nowIso(),
        observed_shelf: text(body.observedShelf) || null,
        note: text(body.note) || null,
      }, { onConflict: "session_id,copy_id" });
      if (error) throw error;
      await audit(organizationId, actorPersonId, "inventario_exemplar_lido", "copy", copy.id, { sessionId, code });
      return NextResponse.json({ ok: true, copy });
    }

    if (action === "close-inventory-session") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode concluir inventários.");
      const sessionId = text(body.sessionId);
      const [{ count: expected, error: expectedError }, { count: scanned, error: scannedError }] = await Promise.all([
        supabaseAdmin.from("oh_acervo_copies").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("active", true).neq("status", "baixado"),
        supabaseAdmin.from("oh_acervo_inventory_scans").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("session_id", sessionId),
      ]);
      if (expectedError || scannedError) throw expectedError || scannedError;
      const { error } = await supabaseAdmin.from("oh_acervo_inventory_sessions").update({
        status: "concluido",
        closed_by_person_id: actorPersonId || null,
        closed_at: nowIso(),
        updated_at: nowIso(),
        metadata: { expected: expected ?? 0, scanned: scanned ?? 0, missing: Math.max(0, (expected ?? 0) - (scanned ?? 0)) },
      }).eq("organization_id", organizationId).eq("id", sessionId).eq("status", "aberto");
      if (error) throw error;
      const summary = { expected: expected ?? 0, scanned: scanned ?? 0, missing: Math.max(0, (expected ?? 0) - (scanned ?? 0)) };
      await audit(organizationId, actorPersonId, "inventario_concluido", "inventory_session", sessionId, summary);
      return NextResponse.json({ ok: true, summary });
    }

    if (action === "save-folha-year") {
      if (!(permissions.folhaVerde || permissions.library)) return forbiddenCapability("Somente a gestão do Folha Verde ou da Biblioteca pode atualizar a memória anual.");
      const year = Math.trunc(numberValue(body.year, 0));
      if (year < 1900 || year > 2200) return NextResponse.json({ error: "Informe um ano válido." }, { status: 400 });
      const parseJsonArray = (value: unknown) => {
        if (Array.isArray(value)) return value;
        const raw = text(value);
        if (!raw) return [];
        try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
      };
      const payload = {
        organization_id: organizationId,
        year,
        summary: text(body.summary) || null,
        highlights: asTextList(body.highlights),
        events: parseJsonArray(body.events),
        photos: parseJsonArray(body.photos),
        active: true,
        updated_at: nowIso(),
      };
      const { error } = await supabaseAdmin.from("oh_acervo_folha_years").upsert(payload, { onConflict: "organization_id,year" });
      if (error) throw error;
      await audit(organizationId, actorPersonId, "memoria_folha_verde_atualizada", "folha_year", undefined, { year });
      return NextResponse.json({ ok: true });
    }

    if (action === "create-resource" || action === "update-resource") {
      let targetResourceType = text(body.resourceType) || "outro";
      if (action === "update-resource" && !text(body.resourceType)) {
        const { data: existingResource, error: existingResourceError } = await supabaseAdmin
          .from("oh_acervo_resources")
          .select("resource_type")
          .eq("organization_id", organizationId)
          .eq("id", text(body.resourceId))
          .maybeSingle();
        if (existingResourceError) throw existingResourceError;
        targetResourceType = text(existingResource?.resource_type) || targetResourceType;
      }
      const canManageResource = targetResourceType === "folha_verde"
        ? permissions.folhaVerde || permissions.library
        : permissions.library;
      if (!canManageResource) {
        return forbiddenCapability(targetResourceType === "folha_verde"
          ? "Somente o Gestor Acervo Vivo - Folha Verde ou o Gestor Acervo Vivo - Biblioteca pode atualizar o Folha Verde."
          : "Somente o Gestor Acervo Vivo - Biblioteca pode cadastrar ou atualizar este conteúdo.");
      }

      const title = text(body.title);
      if (!title) return NextResponse.json({ error: "Informe o título do conteúdo." }, { status: 400 });
      const payload = {
        organization_id: organizationId,
        resource_type: targetResourceType,
        title,
        description: text(body.description) || null,
        subjects: asTextList(body.subjects),
        audience: asTextList(body.audience),
        owner_person_id: text(body.ownerPersonId) || null,
        governance_status: text(body.governanceStatus) || "rascunho",
        active: body.active === undefined ? true : boolValue(body.active, true),
        updated_at: nowIso(),
      };
      if (action === "create-resource") {
        const { data, error } = await supabaseAdmin.from("oh_acervo_resources").insert(payload).select("id").single();
        if (error) throw error;
        await audit(organizationId, actorPersonId, "conteudo_criado", "resource", data.id, { title });
        return NextResponse.json({ ok: true, id: data.id });
      }
      const resourceId = text(body.resourceId);
      const { error } = await supabaseAdmin.from("oh_acervo_resources").update(payload).eq("organization_id", organizationId).eq("id", resourceId);
      if (error) throw error;
      await audit(organizationId, actorPersonId, "conteudo_atualizado", "resource", resourceId, { title });
      return NextResponse.json({ ok: true });
    }

    if (action === "create-resource-version") {
      const resourceId = text(body.resourceId);
      const versionLabel = text(body.versionLabel);
      if (!resourceId || !versionLabel) return NextResponse.json({ error: "Informe o conteúdo e a versão." }, { status: 400 });
      const { data: versionResource, error: versionResourceError } = await supabaseAdmin
        .from("oh_acervo_resources")
        .select("resource_type")
        .eq("organization_id", organizationId)
        .eq("id", resourceId)
        .maybeSingle();
      if (versionResourceError) throw versionResourceError;
      const versionResourceType = text(versionResource?.resource_type);
      const canVersion = versionResourceType === "folha_verde"
        ? permissions.folhaVerde || permissions.library
        : permissions.library;
      if (!canVersion) {
        return forbiddenCapability(versionResourceType === "folha_verde"
          ? "Somente o Gestor Acervo Vivo - Folha Verde ou o Gestor Acervo Vivo - Biblioteca pode versionar o Folha Verde."
          : "Somente o Gestor Acervo Vivo - Biblioteca pode versionar este conteúdo.");
      }
      if (boolValue(body.isCurrent, false)) {
        const { error } = await supabaseAdmin.from("oh_acervo_resource_versions").update({ is_current: false }).eq("organization_id", organizationId).eq("resource_id", resourceId);
        if (error) throw error;
      }
      const { data, error } = await supabaseAdmin.from("oh_acervo_resource_versions").insert({
        organization_id: organizationId,
        resource_id: resourceId,
        version_label: versionLabel,
        effective_date: dateOnly(body.effectiveDate),
        source_url: text(body.sourceUrl) || null,
        storage_path: text(body.storagePath) || null,
        is_current: boolValue(body.isCurrent, false),
        approved_by_person_id: text(body.approvedByPersonId) || null,
        approved_at: boolValue(body.isCurrent, false) ? nowIso() : null,
        notes: text(body.notes) || null,
      }).select("id").single();
      if (error) throw error;
      await audit(organizationId, actorPersonId, "versao_conteudo_criada", "resource_version", data.id, { resourceId, versionLabel });
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (action === "create-trail" || action === "update-trail") {
      if (!(permissions.library || permissions.grupoEstudos || permissions.folhaVerde)) {
        return forbiddenCapability("Sua função não possui permissão para criar ou atualizar trilhas de estudos.");
      }
      const name = text(body.name);
      if (!name) return NextResponse.json({ error: "Informe o nome da trilha." }, { status: 400 });
      const payload = {
        organization_id: organizationId,
        name,
        slug: text(body.slug) || slugify(name),
        objective: text(body.objective) || null,
        description: text(body.description) || null,
        audience: asTextList(body.audience),
        level: text(body.level) || "livre",
        curator_person_id: text(body.curatorPersonId) || null,
        official: boolValue(body.official, false),
        active: body.active === undefined ? true : boolValue(body.active, true),
        sort_order: numberValue(body.sortOrder, 100),
        updated_at: nowIso(),
      };
      if (action === "create-trail") {
        const { data, error } = await supabaseAdmin.from("oh_acervo_trails").insert(payload).select("id").single();
        if (error) throw error;
        await audit(organizationId, actorPersonId, "trilha_criada", "trail", data.id, { name });
        return NextResponse.json({ ok: true, id: data.id });
      }
      const trailId = text(body.trailId);
      const { error } = await supabaseAdmin.from("oh_acervo_trails").update(payload).eq("organization_id", organizationId).eq("id", trailId);
      if (error) throw error;
      await audit(organizationId, actorPersonId, "trilha_atualizada", "trail", trailId, { name });
      return NextResponse.json({ ok: true });
    }

    if (action === "add-trail-item") {
      if (!(permissions.library || permissions.grupoEstudos || permissions.folhaVerde)) {
        return forbiddenCapability("Sua função não possui permissão para atualizar trilhas de estudos.");
      }
      const trailId = text(body.trailId);
      const itemType = text(body.itemType);
      if (!trailId || !["title", "resource"].includes(itemType)) return NextResponse.json({ error: "Item da trilha inválido." }, { status: 400 });
      const payload = {
        organization_id: organizationId,
        trail_id: trailId,
        item_type: itemType,
        title_id: itemType === "title" ? text(body.titleId) || null : null,
        resource_id: itemType === "resource" ? text(body.resourceId) || null : null,
        sort_order: numberValue(body.sortOrder, 100),
        required: boolValue(body.required, false),
        note: text(body.note) || null,
      };
      const { data, error } = await supabaseAdmin.from("oh_acervo_trail_items").insert(payload).select("id").single();
      if (error) throw error;
      await audit(organizationId, actorPersonId, "item_trilha_adicionado", "trail_item", data.id, payload);
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (action === "remove-trail-item") {
      if (!(permissions.library || permissions.grupoEstudos || permissions.folhaVerde)) {
        return forbiddenCapability("Sua função não possui permissão para atualizar trilhas de estudos.");
      }
      const itemId = text(body.itemId);
      const { error } = await supabaseAdmin.from("oh_acervo_trail_items").delete().eq("organization_id", organizationId).eq("id", itemId);
      if (error) throw error;
      await audit(organizationId, actorPersonId, "item_trilha_removido", "trail_item", itemId);
      return NextResponse.json({ ok: true });
    }

    if (action === "create-curation") {
      const curationType = text(body.curationType) || "destaque";
      const allowedCuration =
        curationType === "clube_do_livro"
          ? permissions.clubeLivro || permissions.library
          : curationType === "grupo_de_estudos"
            ? permissions.grupoEstudos || permissions.library
            : permissions.library || permissions.grupoEstudos;
      if (!allowedCuration) {
        return forbiddenCapability(
          curationType === "clube_do_livro"
            ? "Somente o Gestor Acervo Vivo - Clube do Livro ou o Gestor Acervo Vivo - Biblioteca pode atualizar esta curadoria."
            : curationType === "grupo_de_estudos"
              ? "Somente o Gestor Acervo Vivo - Grupo de Estudos ou o Gestor Acervo Vivo - Biblioteca pode atualizar esta curadoria."
              : "Sua função não possui permissão para criar esta integração.",
        );
      }
      const title = text(body.title);
      if (!title) return NextResponse.json({ error: "Informe o título da curadoria." }, { status: 400 });
      const { data, error } = await supabaseAdmin.from("oh_acervo_curations").insert({
        organization_id: organizationId,
        curation_type: curationType,
        title,
        description: text(body.description) || null,
        title_id: text(body.titleId) || null,
        resource_id: text(body.resourceId) || null,
        course_id: text(body.courseId) || null,
        lesson_id: text(body.lessonId) || null,
        agenda_event_id: text(body.agendaEventId) || null,
        starts_at: text(body.startsAt) || null,
        ends_at: text(body.endsAt) || null,
        active: true,
        sort_order: numberValue(body.sortOrder, 100),
      }).select("id").single();
      if (error) throw error;
      await audit(organizationId, actorPersonId, "curadoria_criada", "curation", data.id, { title });
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (action === "cancel-reservation") {
      if (!permissions.library) return forbiddenCapability("Somente o Gestor Acervo Vivo - Biblioteca pode cancelar reservas pela gestão.");
      const reservationId = text(body.reservationId);
      const { data: reservation, error: reservationError } = await supabaseAdmin.from("oh_acervo_reservations").select("id,title_id,available_copy_id,status").eq("organization_id", organizationId).eq("id", reservationId).maybeSingle();
      if (reservationError) throw reservationError;
      if (!reservation?.id) return NextResponse.json({ error: "Reserva não localizada." }, { status: 404 });
      const { error } = await supabaseAdmin.from("oh_acervo_reservations").update({ status: "cancelada", cancelled_at: nowIso(), updated_at: nowIso() }).eq("id", reservationId);
      if (error) throw error;
      if (reservation.available_copy_id) {
        const { data: settings } = await supabaseAdmin
          .from("oh_acervo_settings")
          .select("reservation_hold_days")
          .eq("organization_id", organizationId)
          .maybeSingle();
        await offerAcervoCopyToNextReservation(
          organizationId,
          text(reservation.title_id),
          text(reservation.available_copy_id),
          Number(settings?.reservation_hold_days ?? 3),
        );
      }
      await audit(organizationId, actorPersonId, "reserva_cancelada_gestao", "reservation", reservationId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Erro ao atualizar o Acervo Vivo.") }, { status: 500 });
  }
}
