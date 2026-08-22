import { NextResponse } from "next/server";
import {
  enrichTitlesWithAcervoReviews,
  getAcervoReaderContext,
  handleAcervoReaderPost,
  normalize,
  record,
  text,
} from "@/lib/organizacao-em-harmonia/acervo-vivo";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const BUCKET = "tucxa-acervo-vivo";

function onlyDigits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function phoneCandidates(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return [];
  const local = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  return Array.from(new Set([digits, local, `55${local}`].filter(Boolean)));
}

async function tucxaOrganizationId() {
  const site = await supabaseAdmin
    .from("oh_client_site_settings")
    .select("organization_id")
    .eq("public_slug", "tucxa")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (site.error) throw site.error;
  if (site.data?.organization_id) return site.data.organization_id;

  const org = await supabaseAdmin
    .from("oh_organizations")
    .select("id")
    .or("slug.eq.tucxa,name.ilike.%tucxa%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (org.error) throw org.error;
  return text(org.data?.id);
}

async function signedVersions(rows: Array<Record<string, unknown>>) {
  return Promise.all(rows.map(async (row) => {
    const storagePath = text(row.storage_path);
    if (!storagePath) return row;
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
    if (error || !data?.signedUrl) return row;
    return { ...row, source_url: data.signedUrl };
  }));
}

function yearMonth(resource: Record<string, unknown>) {
  const metadata = record(resource.metadata);
  return {
    year: Number(metadata.year || 0),
    month: Number(metadata.month || 0),
  };
}

async function publicPayload(organizationId: string, qrToken?: string | null) {
  const [settings, titles, copies, trails, trailItems, resources, versions, years] = await Promise.all([
    supabaseAdmin.from("oh_acervo_settings").select("*").eq("organization_id", organizationId).maybeSingle(),
    supabaseAdmin.from("oh_acervo_titles").select("id,title,subtitle,authors,publisher,publication_year,isbn10,isbn13,description,subjects,cover_url,cover_source,active").eq("organization_id", organizationId).eq("active", true).order("title"),
    supabaseAdmin.from("oh_acervo_copies").select("id,title_id,asset_code,legacy_code,qr_token,shelf,shelf_position,condition,status,active").eq("organization_id", organizationId).eq("active", true).order("asset_code"),
    supabaseAdmin.from("oh_acervo_trails").select("id,name,slug,objective,description,level,official,sort_order,active").eq("organization_id", organizationId).eq("active", true).order("sort_order"),
    supabaseAdmin.from("oh_acervo_trail_items").select("id,trail_id,item_type,title_id,resource_id,sort_order,required,note").eq("organization_id", organizationId).order("sort_order"),
    supabaseAdmin.from("oh_acervo_resources").select("id,resource_type,title,description,subjects,governance_status,metadata,active").eq("organization_id", organizationId).eq("active", true).order("title"),
    supabaseAdmin.from("oh_acervo_resource_versions").select("id,resource_id,version_label,effective_date,source_url,storage_path,is_current,metadata").eq("organization_id", organizationId).eq("is_current", true),
    supabaseAdmin.from("oh_acervo_folha_years").select("year,summary,highlights,events,photos,active,updated_at").eq("organization_id", organizationId).eq("active", true).order("year", { ascending: false }),
  ]);

  for (const result of [settings, titles, copies, trails, trailItems, resources, versions]) {
    if (result.error) throw result.error;
  }

  const settingsData = settings.data ?? {};
  if (settingsData.public_catalog_enabled === false) {
    return { disabled: true };
  }

  const copyRows = copies.data ?? [];
  const reviewedTitles = await enrichTitlesWithAcervoReviews(
    organizationId,
    (titles.data ?? []) as Array<Record<string, unknown> & { id: string }>,
  );
  const titleRows = reviewedTitles.map((title) => {
    const related = copyRows.filter((copy) => copy.title_id === title.id && copy.active !== false);
    return {
      ...title,
      totalCopies: related.length,
      availableCopies: related.filter((copy) => copy.status === "disponivel").length,
    };
  });

  const resourceRows = (resources.data ?? []) as Array<Record<string, unknown>>;
  resourceRows.sort((left, right) => {
    if (text(left.resource_type) !== "folha_verde" || text(right.resource_type) !== "folha_verde") {
      return text(left.title).localeCompare(text(right.title), "pt-BR");
    }
    const a = yearMonth(left);
    const b = yearMonth(right);
    return b.year * 100 + b.month - (a.year * 100 + a.month);
  });

  const resourceVersions = await signedVersions((versions.data ?? []) as Array<Record<string, unknown>>);
  const selectedCopy = qrToken
    ? copyRows.find((copy) => text(copy.qr_token) === qrToken) ?? null
    : null;

  const metadata = record(settingsData.metadata);
  return {
    disabled: false,
    settings: {
      loan_days: settingsData.loan_days ?? 30,
      reservation_hold_days: settingsData.reservation_hold_days ?? 3,
      member_reservations_enabled: settingsData.member_reservations_enabled !== false,
      pickup_location: text(metadata.pickup_location) || "Tucxa 1",
      self_service_enabled: metadata.self_service_enabled !== false,
      loan_reminder_days_before_due: Number(metadata.loan_reminder_days_before_due ?? 3),
    },
    titles: titleRows,
    copies: copyRows,
    trails: trails.data ?? [],
    trailItems: trailItems.data ?? [],
    resources: resourceRows,
    resourceVersions,
    folhaYears: years.error ? [] : years.data ?? [],
    selectedCopy,
  };
}

async function resolveLogin(organizationId: string, identifier: string) {
  const value = identifier.trim();
  if (!value) return null;

  let person: { id: string; email?: string | null; auth_user_id?: string | null } | null = null;
  if (value.includes("@")) {
    const result = await supabaseAdmin
      .from("oh_people")
      .select("id,email,auth_user_id")
      .eq("organization_id", organizationId)
      .ilike("email", value.toLowerCase())
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (result.error) throw result.error;
    person = result.data;
  } else {
    const candidates = phoneCandidates(value);
    if (candidates.length) {
      const result = await supabaseAdmin
        .from("oh_people")
        .select("id,email,auth_user_id")
        .eq("organization_id", organizationId)
        .in("whatsapp", candidates)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (result.error) throw result.error;
      person = result.data;
    }
  }

  if (!person?.id || !person.email || !person.auth_user_id) return null;
  const membership = await supabaseAdmin
    .from("oh_memberships")
    .select("agenda_viva_profile,status")
    .eq("organization_id", organizationId)
    .eq("person_id", person.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membership.error) throw membership.error;
  const profile = record(membership.data?.agenda_viva_profile);
  const source = normalize(profile.oh_profile || profile.accessType || profile.publico || membership.data?.status);
  const kind = source.includes("consulente") || source.includes("filho-de-fora") ? "consulente" : "filho-da-corrente";
  return { authEmail: person.email, profile: kind };
}

export async function GET(request: Request) {
  try {
    const organizationId = await tucxaOrganizationId();
    if (!organizationId) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });
    const url = new URL(request.url);
    const qrToken = text(url.searchParams.get("exemplar"));
    const access = await getAcervoReaderContext(request);
    const reader = access.ok ? { authenticated: true, ...access.context } : { authenticated: false };
    return NextResponse.json({ ...(await publicPayload(organizationId, qrToken)), reader });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar o Acervo Vivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = record(await request.clone().json().catch(() => ({})));
  const action = text(body.action);

  if (action === "resolve-login") {
    try {
      const organizationId = await tucxaOrganizationId();
      if (!organizationId) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });
      const identifier = text(body.identifier);
      const found = await resolveLogin(organizationId, identifier);
      if (!found) return NextResponse.json({ found: false });
      return NextResponse.json({ found: true, ...found });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao localizar o cadastro." }, { status: 500 });
    }
  }

  return handleAcervoReaderPost(request);
}
