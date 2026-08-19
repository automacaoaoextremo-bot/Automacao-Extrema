import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type AcervoReaderContext = {
  organizationId: string;
  personId: string;
  personName: string;
  profile: "filho-da-corrente" | "consulente" | "outro";
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

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin
    .from("oh_organizations")
    .select("id")
    .eq("slug", "tucxa")
    .maybeSingle();
  if (bySlug?.id) return bySlug.id as string;

  const { data: byName } = await supabaseAdmin
    .from("oh_organizations")
    .select("id")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return text(byName?.id);
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

  const organizationId = await findTucxaOrganizationId();
  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 }),
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

  let person: { id: string; full_name?: string | null } | null = null;
  const byAuth = await supabaseAdmin
    .from("oh_people")
    .select("id,full_name")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (byAuth.error) {
    return { ok: false, response: NextResponse.json({ error: byAuth.error.message }, { status: 500 }) };
  }
  if (byAuth.data?.id) person = byAuth.data;

  if (!person && user.email) {
    const byEmail = await supabaseAdmin
      .from("oh_people")
      .select("id,full_name")
      .eq("organization_id", organizationId)
      .ilike("email", user.email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail.error) {
      return { ok: false, response: NextResponse.json({ error: byEmail.error.message }, { status: 500 }) };
    }
    if (byEmail.data?.id) person = byEmail.data;
  }

  if (!person?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Seu cadastro não foi localizado na Base Única do Tucxa." },
        { status: 403 },
      ),
    };
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id,active,status,agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", person.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membershipError) {
    return { ok: false, response: NextResponse.json({ error: membershipError.message }, { status: 500 }) };
  }
  if (!membership?.id || membership.active !== true || membership.status !== "ativo") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Seu vínculo com o Tucxa ainda não está ativo para acessar o Acervo Vivo." },
        { status: 403 },
      ),
    };
  }

  const metadata = record(user.user_metadata);
  const profile = record(membership.agenda_viva_profile);
  const source = normalize(metadata.oh_profile || metadata.profile || profile.accessType || profile.publico);
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
    supabaseAdmin.from("oh_acervo_copies").select("id,title_id,status,active,asset_code,shelf,shelf_position").eq("organization_id", organizationId).eq("active", true),
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

  const copies = (copiesResult.data ?? []) as Array<{ id: string; title_id: string; status: string; active?: boolean | null; asset_code?: string | null; shelf?: string | null; shelf_position?: string | null }>;
  const titleRows = (titlesResult.data ?? []) as Array<Record<string, unknown> & { id: string }>;
  const titles = titleRows.map((title) => ({
    ...title,
    ...titleAvailability(title.id, copies),
  }));

  return {
    reader: context,
    settings: settingsResult.data ?? {
      loan_days: 30,
      daily_late_fee: 1,
      max_active_loans: 3,
      renewal_limit: 1,
      reservation_hold_days: 3,
      member_reservations_enabled: true,
      member_renewals_enabled: true,
    },
    titles,
    copies,
    trails: trailsResult.data ?? [],
    trailItems: trailItemsResult.data ?? [],
    resources: resourcesResult.data ?? [],
    resourceVersions: versionsResult.data ?? [],
    curations: curationsResult.data ?? [],
    myLoans: loansResult.data ?? [],
    myReservations: reservationsResult.data ?? [],
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
    const { data: settings } = await supabaseAdmin
      .from("oh_acervo_settings")
      .select("loan_days,renewal_limit,member_reservations_enabled,member_renewals_enabled")
      .eq("organization_id", context.organizationId)
      .maybeSingle();

    if (action === "reserve") {
      if (settings?.member_reservations_enabled === false) {
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
      if (settings?.member_renewals_enabled === false) {
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
      if ((loan.renewed_count ?? 0) >= (settings?.renewal_limit ?? 1)) {
        return NextResponse.json({ error: "O limite de renovações deste empréstimo foi atingido." }, { status: 409 });
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

      const loanDays = settings?.loan_days ?? 30;
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
