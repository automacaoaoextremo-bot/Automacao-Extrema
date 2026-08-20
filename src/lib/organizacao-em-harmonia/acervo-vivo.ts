import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
};

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

export async function loadAcervoReaderPayload(context: AcervoReaderContext) {
  const { organizationId, personId } = context;
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
  const titleMap = new Map(titleRows.map((title) => [title.id, title]));
  const copyMap = new Map(copies.map((copy) => [copy.id, copy]));
  const titles = titleRows.map((title) => ({
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
  }));

  return {
    reader: context,
    catalogWarning: titles.length === 0 || copies.length === 0
      ? "O catálogo do Acervo Vivo está em atualização. Se este aviso persistir, o responsável pela Biblioteca deve aplicar o reparo do catálogo do Ajuste 15."
      : null,
    settings: { ...defaultSettings(), ...(settingsResult.data ?? {}) },
    titles,
    copies,
    trails: trailsResult.data ?? [],
    trailItems: trailItemsResult.data ?? [],
    resources: resourcesResult.data ?? [],
    resourceVersions: versionsResult.data ?? [],
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
    .select("loan_days,daily_late_fee,max_active_loans,renewal_limit,reservation_hold_days,member_loans_enabled,member_reservations_enabled,member_renewals_enabled,block_new_loans_with_overdue,block_new_loans_with_pending_fee")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return { ...defaultSettings(), ...(data ?? {}) };
}

async function validateNewLoan(context: AcervoReaderContext, settings: AcervoSettings, copyId: string) {
  const { data: copy, error: copyError } = await supabaseAdmin
    .from("oh_acervo_copies")
    .select("id,title_id,status,active,asset_code")
    .eq("organization_id", context.organizationId)
    .eq("id", copyId)
    .maybeSingle();
  if (copyError) throw copyError;
  if (!copy?.id || copy.active === false || copy.status !== "disponivel") {
    throw new Error("Este exemplar não está disponível para empréstimo.");
  }

  const { data: activeLoans, error: activeLoansError } = await supabaseAdmin
    .from("oh_acervo_loans")
    .select("id,copy_id,due_at,status,late_fee_status")
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId)
    .is("returned_at", null)
    .in("status", ["ativo", "atrasado"]);
  if (activeLoansError) throw activeLoansError;

  if ((activeLoans ?? []).length >= Number(settings.max_active_loans ?? 3)) {
    throw new Error(`Você atingiu o limite de ${settings.max_active_loans ?? 3} empréstimo(s) ativo(s) definido pelo Acervo Vivo.`);
  }

  if (settings.block_new_loans_with_overdue !== false) {
    const hasOverdue = (activeLoans ?? []).some((loan) => new Date(loan.due_at).getTime() < Date.now() || loan.status === "atrasado");
    if (hasOverdue) {
      throw new Error("Existe um empréstimo em atraso. Regularize a devolução antes de realizar um novo empréstimo.");
    }
  }

  const activeCopyIds = (activeLoans ?? []).map((loan) => loan.copy_id).filter(Boolean);
  if (activeCopyIds.length > 0) {
    const { data: activeCopies, error: activeCopiesError } = await supabaseAdmin
      .from("oh_acervo_copies")
      .select("id,title_id")
      .eq("organization_id", context.organizationId)
      .in("id", activeCopyIds);
    if (activeCopiesError) throw activeCopiesError;
    if ((activeCopies ?? []).some((item) => item.title_id === copy.title_id)) {
      throw new Error("Você já possui um exemplar deste título em empréstimo.");
    }
  }

  if (settings.block_new_loans_with_pending_fee !== false) {
    const { count, error } = await supabaseAdmin
      .from("oh_acervo_loans")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organizationId)
      .eq("person_id", context.personId)
      .eq("late_fee_status", "pendente");
    if (error) throw error;
    if ((count ?? 0) > 0) {
      throw new Error("Existe uma pendência de atraso registrada no Acervo Vivo. Procure o responsável pela Biblioteca antes de realizar um novo empréstimo.");
    }
  }

  const { data: firstReservation, error: reservationError } = await supabaseAdmin
    .from("oh_acervo_reservations")
    .select("id,person_id,status,available_copy_id")
    .eq("organization_id", context.organizationId)
    .eq("title_id", copy.title_id)
    .in("status", ["aguardando", "disponivel"])
    .order("requested_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (reservationError) throw reservationError;
  if (firstReservation?.id && firstReservation.person_id !== context.personId) {
    throw new Error("Há outra pessoa na frente da fila para este título. Você pode entrar na fila de reserva.");
  }
  if (firstReservation?.id && firstReservation.person_id === context.personId && firstReservation.status === "disponivel" && firstReservation.available_copy_id && firstReservation.available_copy_id !== copy.id) {
    throw new Error("Sua reserva está vinculada a outro exemplar disponível. Abra Meus livros para conferir a retirada.");
  }

  return copy;
}

export async function handleAcervoReaderPost(
  request: Request,
  expectedProfile?: "filho-da-corrente" | "consulente",
) {
  const access = await getAcervoReaderContext(request);
  if (!access.ok) return access.response;
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
    const settings = await settingsForReader(context.organizationId);

    if (action === "borrow") {
      if (settings.member_loans_enabled === false) {
        return NextResponse.json({ error: "Os empréstimos pelo próprio leitor estão temporariamente desabilitados." }, { status: 409 });
      }
      const copyId = text(body.copyId);
      if (!copyId) return NextResponse.json({ error: "Exemplar não informado." }, { status: 400 });

      const copy = await validateNewLoan(context, settings, copyId);
      const loanDays = Number(settings.loan_days ?? 30);
      const dueAt = new Date(Date.now() + loanDays * 86_400_000).toISOString();

      const { data: loan, error: loanError } = await supabaseAdmin
        .from("oh_acervo_loans")
        .insert({
          organization_id: context.organizationId,
          copy_id: copy.id,
          person_id: context.personId,
          due_at: dueAt,
          created_by_person_id: context.personId,
          metadata: { source: "acervo-vivo-autoatendimento" },
        })
        .select("id")
        .single();
      if (loanError) throw loanError;

      const { error: copyUpdateError } = await supabaseAdmin
        .from("oh_acervo_copies")
        .update({ status: "emprestado", updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", copy.id)
        .eq("status", "disponivel");
      if (copyUpdateError) throw copyUpdateError;

      const { data: reservation } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("title_id", copy.title_id)
        .eq("person_id", context.personId)
        .in("status", ["aguardando", "disponivel"])
        .order("requested_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (reservation?.id) {
        await supabaseAdmin
          .from("oh_acervo_reservations")
          .update({ status: "atendida", fulfilled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", reservation.id);
      }

      await audit(context, "emprestimo_autoatendimento", "loan", loan.id, { copyId: copy.id, dueAt });
      return NextResponse.json({ ok: true, loanId: loan.id, dueAt });
    }

    if (action === "reserve") {
      if (settings.member_reservations_enabled === false) {
        return NextResponse.json({ error: "As reservas estão temporariamente desabilitadas." }, { status: 409 });
      }
      const titleId = text(body.titleId);
      if (!titleId) return NextResponse.json({ error: "Livro não informado." }, { status: 400 });

      const { data: title, error: titleError } = await supabaseAdmin
        .from("oh_acervo_titles")
        .select("id,title,active")
        .eq("organization_id", context.organizationId)
        .eq("id", titleId)
        .maybeSingle();
      if (titleError) throw titleError;
      if (!title?.id || title.active === false) return NextResponse.json({ error: "Livro não encontrado." }, { status: 404 });

      const { data: existing } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .select("id")
        .eq("organization_id", context.organizationId)
        .eq("title_id", titleId)
        .eq("person_id", context.personId)
        .in("status", ["aguardando", "disponivel"])
        .maybeSingle();
      if (existing?.id) return NextResponse.json({ error: "Você já possui uma reserva ativa para este título." }, { status: 409 });

      const { data, error } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .insert({ organization_id: context.organizationId, title_id: titleId, person_id: context.personId })
        .select("id")
        .single();
      if (error) throw error;
      await audit(context, "reserva_criada", "reservation", data.id, { titleId });
      return NextResponse.json({ ok: true });
    }

    if (action === "cancel-reservation") {
      const reservationId = text(body.reservationId);
      const { error } = await supabaseAdmin
        .from("oh_acervo_reservations")
        .update({ status: "cancelada", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", reservationId)
        .eq("person_id", context.personId)
        .in("status", ["aguardando", "disponivel"]);
      if (error) throw error;
      await audit(context, "reserva_cancelada", "reservation", reservationId);
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
