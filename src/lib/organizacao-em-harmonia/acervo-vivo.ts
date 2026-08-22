import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAcervoMovementNotifications } from "@/lib/organizacao-em-harmonia/acervo-vivo-notifications";
import { getAcervoPickupDetails } from "@/lib/organizacao-em-harmonia/acervo-vivo-location";

export type AcervoReaderContext = {
  organizationId: string;
  personId: string;
  personName: string;
  profile: "filho-da-corrente" | "consulente" | "outro";
};

type AcervoSettings = {
  loan_days?: number | null;
  daily_late_fee?: number | null;
  max_active_loans?: number | null;
  renewal_limit?: number | null;
  reservation_hold_days?: number | null;
  member_loans_enabled?: boolean | null;
  member_reservations_enabled?: boolean | null;
  member_renewals_enabled?: boolean | null;
  block_new_loans_with_overdue?: boolean | null;
  block_new_loans_with_pending_fee?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

const ACERVO_STORAGE_BUCKET = "tucxa-acervo-vivo";
const DAY_MS = 86_400_000;

export function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `item-${crypto.randomUUID().slice(0, 8)}`;
}

export function asTextList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value)
    .split(/[;,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function realEmail(value: unknown) {
  const email = text(value).toLowerCase();
  return email.includes("@") && !email.endsWith("@organizacao-em-harmonia.local");
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

async function findPersonForUser(user: { id: string; email?: string | null }) {
  const byAuth = await supabaseAdmin
    .from("oh_people")
    .select("id,organization_id,full_name,email,active")
    .eq("auth_user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byAuth.error) throw byAuth.error;
  if (byAuth.data?.id) return byAuth.data;

  if (!user.email) return null;
  const byEmail = await supabaseAdmin
    .from("oh_people")
    .select("id,organization_id,full_name,email,active")
    .ilike("email", user.email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byEmail.error) throw byEmail.error;
  return byEmail.data?.id ? byEmail.data : null;
}

async function activeMembership(personId: string, preferredOrganizationId?: string | null) {
  if (preferredOrganizationId) {
    const exact = await supabaseAdmin
      .from("oh_memberships")
      .select("id,organization_id,person_id,active,status,role_id,agenda_viva_profile")
      .eq("organization_id", preferredOrganizationId)
      .eq("person_id", personId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (exact.error) throw exact.error;
    if (exact.data?.id) return exact.data;
  }

  const latest = await supabaseAdmin
    .from("oh_memberships")
    .select("id,organization_id,person_id,active,status,role_id,agenda_viva_profile")
    .eq("person_id", personId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) throw latest.error;
  return latest.data?.id ? latest.data : null;
}

async function isTucxaOrganization(organizationId: string) {
  const [{ data: organization, error: organizationError }, { data: site, error: siteError }] = await Promise.all([
    supabaseAdmin.from("oh_organizations").select("id,name,slug").eq("id", organizationId).maybeSingle(),
    supabaseAdmin
      .from("oh_client_site_settings")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("public_slug", "tucxa")
      .eq("active", true)
      .maybeSingle(),
  ]);
  if (organizationError) throw organizationError;
  if (siteError) throw siteError;
  if (site?.organization_id) return true;
  return normalize(organization?.slug) === "tucxa" || normalize(organization?.name).includes("tucxa");
}

export async function getAcervoReaderContext(
  request: Request,
): Promise<
  | { ok: true; context: AcervoReaderContext }
  | { ok: false; response: NextResponse }
> {
  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sessão expirada. Entre novamente para acessar o Acervo Vivo." }, { status: 401 }),
    };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sessão inválida. Entre novamente para acessar o Acervo Vivo." }, { status: 401 }),
    };
  }

  try {
    const person = await findPersonForUser({ id: user.id, email: user.email });
    if (!person?.id) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Seu cadastro não foi localizado na Base Única do Tucxa." },
          { status: 403 },
        ),
      };
    }

    const membership = await activeMembership(person.id, text(person.organization_id) || null);
    const organizationId = text(membership?.organization_id || person.organization_id);
    if (!membership?.id || !organizationId || membership.active !== true || !["ativo", "gestor_cliente"].includes(text(membership.status))) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Seu vínculo com o Tucxa ainda não está ativo para acessar o Acervo Vivo." },
          { status: 403 },
        ),
      };
    }

    if (!(await isTucxaOrganization(organizationId))) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Seu vínculo ativo não pertence ao Tucxa." }, { status: 403 }),
      };
    }

    const metadata = record(user.user_metadata);
    const profile = record(membership.agenda_viva_profile);
    const source = normalize(metadata.oh_profile || metadata.profile || profile.oh_profile || profile.accessType || profile.publico || membership.status);
    const kind: AcervoReaderContext["profile"] = source.includes("consulente") || source.includes("filho-de-fora")
      ? "consulente"
      : source.includes("filho-da-corrente") || source.includes("filho da corrente")
        ? "filho-da-corrente"
        : "outro";

    return {
      ok: true,
      context: {
        organizationId,
        personId: person.id,
        personName: text(person.full_name) || text(user.email) || "Pessoa",
        profile: kind,
      },
    };
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: error instanceof Error ? error.message : "Erro ao validar seu acesso ao Acervo Vivo." },
        { status: 500 },
      ),
    };
  }
}

function titleAvailability(
  titleId: string,
  copies: Array<{ title_id: string; status: string; active?: boolean | null }>,
) {
  const related = copies.filter((copy) => copy.title_id === titleId && copy.active !== false);
  return {
    totalCopies: related.length,
    availableCopies: related.filter((copy) => copy.status === "disponivel").length,
  };
}

function defaultSettings() {
  return {
    loan_days: 30,
    daily_late_fee: 1,
    max_active_loans: 3,
    renewal_limit: 1,
    reservation_hold_days: 3,
    member_loans_enabled: true,
    member_reservations_enabled: true,
    member_renewals_enabled: true,
    block_new_loans_with_overdue: true,
    block_new_loans_with_pending_fee: true,
  };
}


export async function offerAcervoCopyToNextReservation(
  organizationId: string,
  titleId: string,
  copyId: string,
  holdDays: number,
) {
  const { data: waiting, error: waitingError } = await supabaseAdmin
    .from("oh_acervo_reservations")
    .select("id,person_id")
    .eq("organization_id", organizationId)
    .eq("title_id", titleId)
    .eq("status", "aguardando")
    .order("requested_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (waitingError) throw waitingError;

  if (!waiting?.id) {
    const { error: releaseError } = await supabaseAdmin
      .from("oh_acervo_copies")
      .update({ status: "disponivel", updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("id", copyId)
      .eq("status", "reservado");
    if (releaseError) throw releaseError;
    return null;
  }

  const availableAt = new Date();
  const holdUntil = new Date(availableAt.getTime() + Math.max(1, holdDays) * DAY_MS);
  const { error: reservationError } = await supabaseAdmin
    .from("oh_acervo_reservations")
    .update({
      status: "disponivel",
      available_copy_id: copyId,
      available_at: availableAt.toISOString(),
      hold_until: holdUntil.toISOString(),
      updated_at: availableAt.toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", waiting.id)
    .eq("status", "aguardando");
  if (reservationError) throw reservationError;

  const { error: copyError } = await supabaseAdmin
    .from("oh_acervo_copies")
    .update({ status: "reservado", updated_at: availableAt.toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", copyId);
  if (copyError) throw copyError;

  if (waiting.person_id) {
    await sendAcervoMovementNotifications({
      organizationId,
      personId: waiting.person_id,
      titleId,
      copyId,
      kind: "reserva_disponivel",
      holdUntil: holdUntil.toISOString(),
    }).catch(() => undefined);
  }

  return waiting.id;
}

export async function reconcileExpiredAcervoReservations(organizationId: string) {
  const settings = await settingsForReader(organizationId);
  const holdDays = Number(settings.reservation_hold_days ?? 3);
  const now = new Date();

  const { data: expired, error } = await supabaseAdmin
    .from("oh_acervo_reservations")
    .select("id,title_id,available_copy_id")
    .eq("organization_id", organizationId)
    .eq("status", "disponivel")
    .lt("hold_until", now.toISOString());
  if (error) throw error;

  for (const reservation of expired ?? []) {
    const { error: expireError } = await supabaseAdmin
      .from("oh_acervo_reservations")
      .update({
        status: "expirada",
        cancelled_at: now.toISOString(),
        updated_at: now.toISOString(),
        metadata: { expiration_reason: "prazo_retirada_encerrado" },
      })
      .eq("organization_id", organizationId)
      .eq("id", reservation.id)
      .eq("status", "disponivel");
    if (expireError) throw expireError;

    if (reservation.available_copy_id) {
      await offerAcervoCopyToNextReservation(
        organizationId,
        reservation.title_id,
        reservation.available_copy_id,
        holdDays,
      );
    }
  }

  return expired?.length ?? 0;
}

async function signedResourceVersions(
  rows: Array<Record<string, unknown>>,
) {
  return Promise.all(
    rows.map(async (version) => {
      const storagePath = text(version.storage_path);
      if (!storagePath) return version;

      const { data, error } = await supabaseAdmin.storage
        .from(ACERVO_STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60);

      if (error || !data?.signedUrl) return version;
      return { ...version, source_url: data.signedUrl };
    }),
  );
}

export async function enrichTitlesWithAcervoReviews(
  organizationId: string,
  titles: Array<Record<string, unknown> & { id: string }>,
) {
  if (!titles.length) return titles;

  const { data: reviews, error } = await supabaseAdmin
    .from("oh_acervo_reviews")
    .select("id,title_id,rating,comment,created_at")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const grouped = new Map<string, Array<{ id: string; rating: number | null; comment: string | null; created_at: string }>>();
  for (const row of reviews ?? []) {
    const list = grouped.get(row.title_id) ?? [];
    list.push({
      id: row.id,
      rating: row.rating == null ? null : Number(row.rating),
      comment: text(row.comment) || null,
      created_at: row.created_at,
    });
    grouped.set(row.title_id, list);
  }

  return titles.map((title) => {
    const rows = grouped.get(title.id) ?? [];
    const rated = rows.filter((row) => Number.isFinite(row.rating) && Number(row.rating) >= 1);
    const averageRating = rated.length
      ? Number((rated.reduce((sum, row) => sum + Number(row.rating), 0) / rated.length).toFixed(1))
      : 0;
    return {
      ...title,
      reviewCount: rated.length,
      averageRating,
      comments: rows
        .filter((row) => Boolean(row.comment))
        .slice(0, 20),
    };
  });
}

export async function loadAcervoReaderPayload(context: AcervoReaderContext) {
  const { organizationId, personId } = context;
  await reconcileExpiredAcervoReservations(organizationId);
  const [
    settingsResult,
    titlesResult,
    copiesResult,
    trailsResult,
    trailItemsResult,
    resourcesResult,
    versionsResult,
    curationsResult,
    loansResult,
    reservationsResult,
  ] = await Promise.all([
    supabaseAdmin.from("oh_acervo_settings").select("*").eq("organization_id", organizationId).maybeSingle(),
    supabaseAdmin.from("oh_acervo_titles").select("*").eq("organization_id", organizationId).eq("active", true).order("title"),
    supabaseAdmin.from("oh_acervo_copies").select("id,title_id,status,active,asset_code,legacy_code,shelf,shelf_position,condition").eq("organization_id", organizationId).eq("active", true).order("asset_code"),
    supabaseAdmin.from("oh_acervo_trails").select("*").eq("organization_id", organizationId).eq("active", true).order("sort_order"),
    supabaseAdmin.from("oh_acervo_trail_items").select("*").eq("organization_id", organizationId).order("sort_order"),
    supabaseAdmin.from("oh_acervo_resources").select("*").eq("organization_id", organizationId).eq("active", true).order("title"),
    supabaseAdmin.from("oh_acervo_resource_versions").select("*").eq("organization_id", organizationId).eq("is_current", true),
    supabaseAdmin.from("oh_acervo_curations").select("*").eq("organization_id", organizationId).eq("active", true).order("sort_order"),
    supabaseAdmin.from("oh_acervo_loans").select("*").eq("organization_id", organizationId).eq("person_id", personId).order("loaned_at", { ascending: false }),
    supabaseAdmin.from("oh_acervo_reservations").select("*").eq("organization_id", organizationId).eq("person_id", personId).order("requested_at", { ascending: false }),
  ]);

  for (const result of [
    settingsResult,
    titlesResult,
    copiesResult,
    trailsResult,
    trailItemsResult,
    resourcesResult,
    versionsResult,
    curationsResult,
    loansResult,
    reservationsResult,
  ]) {
    if (result.error) throw result.error;
  }

  const copies = (copiesResult.data ?? []) as Array<{
    id: string;
    title_id: string;
    status: string;
    active?: boolean | null;
    asset_code?: string | null;
    legacy_code?: string | null;
    shelf?: string | null;
    shelf_position?: string | null;
    condition?: string | null;
  }>;
  const titleRows = (titlesResult.data ?? []) as Array<Record<string, unknown> & { id: string }>;
  const reviewedTitles = await enrichTitlesWithAcervoReviews(organizationId, titleRows);
  const titleMap = new Map(reviewedTitles.map((title) => [title.id, title] as const));
  const copyMap = new Map(copies.map((copy) => [copy.id, copy] as const));
  const titles = reviewedTitles.map((title) => ({
    ...title,
    ...titleAvailability(title.id, copies),
  }));

  const myLoans = (loansResult.data ?? []).map((loan) => {
    const copy = copyMap.get(loan.copy_id);
    const title = copy ? titleMap.get(copy.title_id) ?? null : null;
    return { ...loan, copy: copy ?? null, title };
  });
  const myReservations = (reservationsResult.data ?? []).map((reservation) => ({
    ...reservation,
    title: titleMap.get(reservation.title_id) ?? null,
    copy: reservation.available_copy_id ? copyMap.get(reservation.available_copy_id) ?? null : null,
  }));
  const resourceVersions = await signedResourceVersions(
    (versionsResult.data ?? []) as Array<Record<string, unknown>>,
  );

  const rawSettings = { ...defaultSettings(), ...(settingsResult.data ?? {}) };
  const rawMetadata = record(rawSettings.metadata);
  const pickup = await getAcervoPickupDetails(
    organizationId,
    text(rawMetadata.pickup_location) || "Tucxa 1",
  );
  const settings = {
    ...rawSettings,
    metadata: {
      ...rawMetadata,
      pickup_location: pickup.label,
      pickup_address: pickup.address,
      pickup_maps_url: pickup.mapsUrl,
    },
  };

  return {
    reader: context,
    catalogWarning: titles.length === 0 || copies.length === 0
      ? "O catálogo do Acervo Vivo está em atualização. Se este aviso persistir, o responsável pela Biblioteca deve aplicar o reparo do catálogo do Ajuste 15."
      : null,
    settings,
    titles,
    copies,
    trails: trailsResult.data ?? [],
    trailItems: trailItemsResult.data ?? [],
    resources: resourcesResult.data ?? [],
    resourceVersions,
    curations: curationsResult.data ?? [],
    myLoans,
    myReservations,
  };
}

async function audit(context: AcervoReaderContext, action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) {
  await supabaseAdmin.from("oh_acervo_audit").insert({
    organization_id: context.organizationId,
    actor_person_id: context.personId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details: details ?? {},
  });
}

async function settingsForReader(organizationId: string): Promise<AcervoSettings> {
  const { data, error } = await supabaseAdmin
    .from("oh_acervo_settings")
    .select("loan_days,daily_late_fee,max_active_loans,renewal_limit,reservation_hold_days,member_loans_enabled,member_reservations_enabled,member_renewals_enabled,block_new_loans_with_overdue,block_new_loans_with_pending_fee,metadata")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return { ...defaultSettings(), ...(data ?? {}) };
}

export async function handleAcervoReaderPost(
  request: Request,
  expectedProfile?: "filho-da-corrente" | "consulente",
) {
  const access = await getAcervoReaderContext(request);
  if (access.ok === false) return access.response;
  const context = access.context;

  if (expectedProfile && context.profile !== expectedProfile) {
    return NextResponse.json(
      { error: "Este acesso ao Acervo Vivo não corresponde ao seu perfil ativo no Tucxa." },
      { status: 403 },
    );
  }

  const body = record(await request.json().catch(() => ({})));
  const action = text(body.action);

  try {
    await reconcileExpiredAcervoReservations(context.organizationId);
    const settings = await settingsForReader(context.organizationId);

    if (action === "borrow-now") {
      if (settings.member_loans_enabled === false) {
        return NextResponse.json({ error: "As retiradas pelo leitor estão temporariamente desabilitadas." }, { status: 409 });
      }
      const qrToken = text(body.qrToken);
      const requestedTitleId = text(body.titleId);
      if (!qrToken && !requestedTitleId) {
        return NextResponse.json({ error: "Informe o exemplar pelo QR Code ou o livro que está em suas mãos." }, { status: 400 });
      }

      const metadata = record(settings.metadata);
      if (metadata.self_service_enabled === false) {
        return NextResponse.json({ error: "O autoempréstimo está temporariamente desabilitado. Faça a reserva para retirada." }, { status: 409 });
      }

      const [personResult, copyResult, activeLoansResult, pendingFeesResult] = await Promise.all([
        supabaseAdmin
          .from("oh_people")
          .select("id,full_name,email,whatsapp")
          .eq("organization_id", context.organizationId)
          .eq("id", context.personId)
          .maybeSingle(),
        (() => {
          let query = supabaseAdmin
            .from("oh_acervo_copies")
            .select("id,title_id,asset_code,status,active")
            .eq("organization_id", context.organizationId)
            .eq("active", true);
          query = qrToken ? query.eq("qr_token", qrToken) : query.eq("title_id", requestedTitleId).eq("status", "disponivel");
          return query.order("asset_code").limit(1).maybeSingle();
        })(),
        supabaseAdmin
          .from("oh_acervo_loans")
          .select("id,copy_id,due_at,status")
          .eq("organization_id", context.organizationId)
          .eq("person_id", context.personId)
          .is("returned_at", null)
          .in("status", ["ativo", "atrasado"]),
        supabaseAdmin
          .from("oh_acervo_loans")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", context.organizationId)
          .eq("person_id", context.personId)
          .eq("late_fee_status", "pendente"),
      ]);
      for (const result of [personResult, copyResult, activeLoansResult, pendingFeesResult]) {
        if (result.error) throw result.error;
      }
      const person = personResult.data;
      const copy = copyResult.data;
      if (!person?.id || !text(person.full_name) || !text(person.whatsapp) || !realEmail(person.email)) {
        return NextResponse.json({ error: "Para emprestar um livro, confirme no cadastro seu nome, WhatsApp e um e-mail válido." }, { status: 409 });
      }
      if (!copy?.id || copy.active === false || copy.status !== "disponivel") {
        return NextResponse.json({ error: "Este exemplar não está disponível para autoempréstimo. Você pode entrar na fila de reserva." }, { status: 409 });
      }
      if ((activeLoansResult.data ?? []).length >= Number(settings.max_active_loans ?? 3)) {
        return NextResponse.json({ error: "Você atingiu o limite de empréstimos ativos." }, { status: 409 });
      }
      if (settings.block_new_loans_with_overdue !== false && (activeLoansResult.data ?? []).some((loan) => loan.status === "atrasado" || new Date(loan.due_at).getTime() < Date.now())) {
        return NextResponse.json({ error: "Existe empréstimo em atraso. Regularize a situação antes de retirar outro livro." }, { status: 409 });
      }
      if (settings.block_new_loans_with_pending_fee !== false && (pendingFeesResult.count ?? 0) > 0) {
        return NextResponse.json({ error: "Existe uma pendência de empréstimo. Procure o responsável pela Biblioteca." }, { status: 409 });
      }

      const activeCopyIds = (activeLoansResult.data ?? []).map((loan) => loan.copy_id).filter(Boolean);
      if (activeCopyIds.length) {
        const activeCopies = await supabaseAdmin
          .from("oh_acervo_copies")
          .select("title_id")
          .eq("organization_id", context.organizationId)
          .in("id", activeCopyIds);
        if (activeCopies.error) throw activeCopies.error;
        if ((activeCopies.data ?? []).some((item) => item.title_id === copy.title_id)) {
          return NextResponse.json({ error: "Você já possui um exemplar deste título em empréstimo." }, { status: 409 });
        }
      }

      const loanedAt = new Date();
      const dueAt = new Date(loanedAt.getTime() + Number(settings.loan_days ?? 30) * DAY_MS);
      const { data: claimedCopy, error: claimError } = await supabaseAdmin
        .from("oh_acervo_copies")
        .update({ status: "emprestado", updated_at: loanedAt.toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", copy.id)
        .eq("status", "disponivel")
        .select("id")
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimedCopy?.id) return NextResponse.json({ error: "O exemplar acabou de ficar indisponível. Atualize e tente reservar." }, { status: 409 });

      const { data: loan, error: loanError } = await supabaseAdmin.from("oh_acervo_loans").insert({
        organization_id: context.organizationId,
        copy_id: copy.id,
        person_id: context.personId,
        loaned_at: loanedAt.toISOString(),
        due_at: dueAt.toISOString(),
        status: "ativo",
        created_by_person_id: context.personId,
        metadata: { source: "acervo-vivo-qr-autoemprestimo", pickup_location: text(metadata.pickup_location) || "Tucxa 1" },
      }).select("id").single();
      if (loanError) {
        await supabaseAdmin.from("oh_acervo_copies").update({ status: "disponivel", updated_at: new Date().toISOString() }).eq("id", copy.id);
        throw loanError;
      }

      await audit(context, "autoemprestimo_qr", "loan", loan.id, { copyId: copy.id, titleId: copy.title_id, dueAt: dueAt.toISOString() });
      await sendAcervoMovementNotifications({ organizationId: context.organizationId, personId: context.personId, titleId: copy.title_id, copyId: copy.id, kind: "emprestimo", dueAt: dueAt.toISOString() }).catch(() => undefined);
      return NextResponse.json({ ok: true, loanId: loan.id, dueAt: dueAt.toISOString() });
    }

    if (action === "borrow") {
      return NextResponse.json(
        {
          error:
            "O empréstimo físico precisa ser confirmado pela Recepção no momento da retirada. Use a opção Reservar para retirada.",
        },
        { status: 409 },
      );
    }

    if (action === "reserve") {
      const titleId = text(body.titleId);
      if (!titleId) return NextResponse.json({ error: "Livro não informado." }, { status: 400 });

      const [{ data: title, error: titleError }, { data: existing, error: existingError }, activeLoansResult] =
        await Promise.all([
          supabaseAdmin
            .from("oh_acervo_titles")
            .select("id,title,active")
            .eq("organization_id", context.organizationId)
            .eq("id", titleId)
            .maybeSingle(),
          supabaseAdmin
            .from("oh_acervo_reservations")
            .select("id")
            .eq("organization_id", context.organizationId)
            .eq("title_id", titleId)
            .eq("person_id", context.personId)
            .in("status", ["aguardando", "disponivel"])
            .maybeSingle(),
          supabaseAdmin
            .from("oh_acervo_loans")
            .select("id,copy_id")
            .eq("organization_id", context.organizationId)
            .eq("person_id", context.personId)
            .is("returned_at", null)
            .in("status", ["ativo", "atrasado"]),
        ]);
      if (titleError) throw titleError;
      if (existingError) throw existingError;
      if (activeLoansResult.error) throw activeLoansResult.error;
      if (!title?.id || title.active === false) {
        return NextResponse.json({ error: "Livro não encontrado." }, { status: 404 });
      }
      if (existing?.id) {
        return NextResponse.json(
          { error: "Você já possui uma reserva ativa para este título." },
          { status: 409 },
        );
      }

      const activeCopyIds = (activeLoansResult.data ?? []).map((loan) => loan.copy_id).filter(Boolean);
      if (activeCopyIds.length > 0) {
        const { data: activeCopies, error: activeCopiesError } = await supabaseAdmin
          .from("oh_acervo_copies")
          .select("title_id")
          .eq("organization_id", context.organizationId)
          .in("id", activeCopyIds);
        if (activeCopiesError) throw activeCopiesError;
        if ((activeCopies ?? []).some((copy) => copy.title_id === titleId)) {
          return NextResponse.json(
            { error: "Você já possui um exemplar deste título em empréstimo." },
            { status: 409 },
          );
        }
      }

      const { data: availableCopy, error: availableCopyError } = await supabaseAdmin
        .from("oh_acervo_copies")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("title_id", titleId)
        .eq("active", true)
        .eq("status", "disponivel")
        .order("asset_code")
        .limit(1)
        .maybeSingle();
      if (availableCopyError) throw availableCopyError;

      if (availableCopy?.id && settings.member_loans_enabled === false) {
        return NextResponse.json(
          { error: "As solicitações de retirada pelo leitor estão temporariamente desabilitadas." },
          { status: 409 },
        );
      }
      if (!availableCopy?.id && settings.member_reservations_enabled === false) {
        return NextResponse.json(
          { error: "Não há exemplar disponível e a fila de reservas está temporariamente desabilitada." },
          { status: 409 },
        );
      }

      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .insert({
          organization_id: context.organizationId,
          title_id: titleId,
          person_id: context.personId,
          status: "aguardando",
          metadata: {
            source: "acervo-vivo-leitor",
            notify_if_not_picked_up: body.notifyIfNotPickedUp !== false,
            reserve_after_return: body.reserveAfterReturn !== false,
          },
        })
        .select("id")
        .single();
      if (reservationError) throw reservationError;

      let readyForPickup = false;
      let holdUntil: string | null = null;

      if (availableCopy?.id) {
        const claimedAt = new Date();
        const { data: claimedCopy, error: claimError } = await supabaseAdmin
          .from("oh_acervo_copies")
          .update({ status: "reservado", updated_at: claimedAt.toISOString() })
          .eq("organization_id", context.organizationId)
          .eq("id", availableCopy.id)
          .eq("status", "disponivel")
          .select("id")
          .maybeSingle();
        if (claimError) throw claimError;

        if (claimedCopy?.id) {
          const holdDays = Number(settings.reservation_hold_days ?? 3);
          holdUntil = new Date(claimedAt.getTime() + Math.max(1, holdDays) * DAY_MS).toISOString();
          const { error: readyError } = await supabaseAdmin
            .from("oh_acervo_reservations")
            .update({
              status: "disponivel",
              available_copy_id: claimedCopy.id,
              available_at: claimedAt.toISOString(),
              hold_until: holdUntil,
              updated_at: claimedAt.toISOString(),
            })
            .eq("id", reservation.id);
          if (readyError) throw readyError;
          readyForPickup = true;
        }
      }

      await audit(context, readyForPickup ? "retirada_solicitada" : "reserva_criada", "reservation", reservation.id, {
        titleId,
        readyForPickup,
        holdUntil,
      });
      await sendAcervoMovementNotifications({
        organizationId: context.organizationId,
        personId: context.personId,
        titleId,
        copyId: availableCopy?.id || null,
        kind: readyForPickup ? "reserva" : "fila",
        holdUntil,
      }).catch(() => undefined);
      return NextResponse.json({ ok: true, readyForPickup, holdUntil });
    }

    if (action === "return-book") {
      const loanId = text(body.loanId);
      if (!loanId) return NextResponse.json({ error: "Empréstimo não informado." }, { status: 400 });

      const { data: loan, error: loanError } = await supabaseAdmin
        .from("oh_acervo_loans")
        .select("id,copy_id,person_id,due_at,returned_at,status,metadata")
        .eq("organization_id", context.organizationId)
        .eq("id", loanId)
        .eq("person_id", context.personId)
        .maybeSingle();
      if (loanError) throw loanError;
      if (!loan?.id || loan.returned_at || !["ativo", "atrasado"].includes(loan.status)) {
        return NextResponse.json({ error: "Empréstimo ativo não localizado." }, { status: 404 });
      }

      const { data: copy, error: copyError } = await supabaseAdmin
        .from("oh_acervo_copies")
        .select("id,title_id")
        .eq("organization_id", context.organizationId)
        .eq("id", loan.copy_id)
        .single();
      if (copyError) throw copyError;

      const returnedAt = new Date();
      const dueAt = new Date(loan.due_at);
      const lateDays = Math.max(0, Math.ceil((returnedAt.getTime() - dueAt.getTime()) / DAY_MS));
      const lateFee = Number((lateDays * Number(settings.daily_late_fee ?? 1)).toFixed(2));

      const { error: updateLoanError } = await supabaseAdmin
        .from("oh_acervo_loans")
        .update({
          returned_at: returnedAt.toISOString(),
          status: "devolvido",
          late_fee_calculated: lateFee,
          late_fee_status: lateFee > 0 ? "pendente" : "nao_aplicavel",
          returned_by_person_id: context.personId,
          metadata: {
            ...record(loan.metadata),
            source: "acervo-vivo-auto-devolucao",
            return_location_confirmed: true,
          },
          updated_at: returnedAt.toISOString(),
        })
        .eq("organization_id", context.organizationId)
        .eq("id", loan.id);
      if (updateLoanError) throw updateLoanError;

      await supabaseAdmin
        .from("oh_acervo_copies")
        .update({ status: "reservado", updated_at: returnedAt.toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", loan.copy_id);

      await offerAcervoCopyToNextReservation(
        context.organizationId,
        copy.title_id,
        loan.copy_id,
        Number(settings.reservation_hold_days ?? 3),
      );

      const rating = Math.max(0, Math.min(5, Number(body.rating) || 0));
      const comment = text(body.comment);
      if (rating > 0 || comment) {
        const { data: existingReview, error: existingReviewError } = await supabaseAdmin
          .from("oh_acervo_reviews")
          .select("id")
          .eq("organization_id", context.organizationId)
          .eq("loan_id", loan.id)
          .eq("active", true)
          .limit(1)
          .maybeSingle();
        if (existingReviewError) throw existingReviewError;

        const reviewPayload = {
          organization_id: context.organizationId,
          title_id: copy.title_id,
          person_id: context.personId,
          loan_id: loan.id,
          rating: rating > 0 ? rating : null,
          comment: comment || null,
          active: true,
          updated_at: returnedAt.toISOString(),
        };
        const reviewResult = existingReview?.id
          ? await supabaseAdmin.from("oh_acervo_reviews").update(reviewPayload).eq("id", existingReview.id)
          : await supabaseAdmin.from("oh_acervo_reviews").insert(reviewPayload);
        if (reviewResult.error) throw reviewResult.error;
      }

      await audit(context, "devolucao_registrada_pelo_leitor", "loan", loan.id, { lateDays, lateFee, rating });
      await sendAcervoMovementNotifications({
        organizationId: context.organizationId,
        personId: context.personId,
        titleId: copy.title_id,
        copyId: loan.copy_id,
        kind: "devolucao",
      }).catch(() => undefined);

      return NextResponse.json({ ok: true, lateDays, lateFee });
    }

    if (action === "cancel-reservation") {
      const reservationId = text(body.reservationId);
      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .select("id,title_id,status,available_copy_id")
        .eq("organization_id", context.organizationId)
        .eq("id", reservationId)
        .eq("person_id", context.personId)
        .in("status", ["aguardando", "disponivel"])
        .maybeSingle();
      if (reservationError) throw reservationError;
      if (!reservation?.id) {
        return NextResponse.json({ error: "Reserva ativa não localizada." }, { status: 404 });
      }

      const cancelledAt = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .update({
          status: "cancelada",
          cancelled_at: cancelledAt,
          updated_at: cancelledAt,
        })
        .eq("organization_id", context.organizationId)
        .eq("id", reservation.id);
      if (error) throw error;

      if (reservation.available_copy_id) {
        await offerAcervoCopyToNextReservation(
          context.organizationId,
          reservation.title_id,
          reservation.available_copy_id,
          Number(settings.reservation_hold_days ?? 3),
        );
      }

      await audit(context, "reserva_cancelada", "reservation", reservation.id);
      return NextResponse.json({ ok: true });
    }

    if (action === "renew") {
      if (settings.member_renewals_enabled === false) {
        return NextResponse.json({ error: "As renovações estão temporariamente desabilitadas." }, { status: 409 });
      }
      const loanId = text(body.loanId);
      const { data: loan, error: loanError } = await supabaseAdmin
        .from("oh_acervo_loans")
        .select("id,copy_id,due_at,renewed_count,status,returned_at")
        .eq("organization_id", context.organizationId)
        .eq("id", loanId)
        .eq("person_id", context.personId)
        .maybeSingle();
      if (loanError) throw loanError;
      if (!loan?.id || loan.returned_at || !["ativo", "atrasado"].includes(loan.status)) {
        return NextResponse.json({ error: "Empréstimo ativo não localizado." }, { status: 404 });
      }
      if ((loan.renewed_count ?? 0) >= Number(settings.renewal_limit ?? 1)) {
        return NextResponse.json({ error: "O limite de renovações deste empréstimo foi atingido." }, { status: 409 });
      }
      if (settings.block_new_loans_with_overdue !== false && new Date(loan.due_at).getTime() < Date.now()) {
        return NextResponse.json({ error: "Empréstimos em atraso não podem ser renovados. Procure o responsável pela Biblioteca." }, { status: 409 });
      }

      const { data: copy, error: copyError } = await supabaseAdmin
        .from("oh_acervo_copies")
        .select("title_id")
        .eq("organization_id", context.organizationId)
        .eq("id", loan.copy_id)
        .single();
      if (copyError) throw copyError;

      const { data: waiting, error: waitingError } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("title_id", copy.title_id)
        .neq("person_id", context.personId)
        .in("status", ["aguardando", "disponivel"])
        .limit(1);
      if (waitingError) throw waitingError;
      if ((waiting ?? []).length) {
        return NextResponse.json({ error: "Há outra pessoa aguardando este título; a renovação não está disponível." }, { status: 409 });
      }

      const loanDays = Number(settings.loan_days ?? 30);
      const base = new Date(loan.due_at);
      const nextDue = new Date(Math.max(base.getTime(), Date.now()) + loanDays * 86_400_000);
      const { error } = await supabaseAdmin
        .from("oh_acervo_loans")
        .update({ due_at: nextDue.toISOString(), renewed_count: (loan.renewed_count ?? 0) + 1, status: "ativo", updated_at: new Date().toISOString() })
        .eq("id", loan.id);
      if (error) throw error;
      await audit(context, "emprestimo_renovado", "loan", loan.id, { dueAt: nextDue.toISOString() });
      return NextResponse.json({ ok: true, dueAt: nextDue.toISOString() });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar o Acervo Vivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
