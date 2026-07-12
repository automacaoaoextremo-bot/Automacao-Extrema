import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type DraftItem = {
  slug: string;
  label: string;
  description?: string;
};

type PersonRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  notes: string | null;
  active: boolean | null;
  auth_user_id?: string | null;
};

type MembershipRecord = {
  id: string;
  person_id: string;
  active: boolean | null;
  status: string | null;
  module_slugs: string[] | null;
  agenda_viva_profile: Record<string, unknown> | null;
};

const DEFAULT_MODULE_SLUGS = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function onlyDigits(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function normalizeEmail(value: unknown) {
  return asText(value).toLowerCase();
}

function displayEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.endsWith("@organizacao-em-harmonia.local") ? "" : email;
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function asTextList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asDraftItems(value: unknown): DraftItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap<DraftItem>((item) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const slug = asText(record.slug);
    const label = asText(record.label);
    const description = asText(record.description);

    if (!slug || !label) return [];

    return [
      {
        slug,
        label,
        ...(description ? { description } : {}),
      },
    ];
  });
}

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id, name").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return { id: bySlug.id as string, name: asText(bySlug.name) || "Tucxa" };

  const { data: byName } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return byName?.id ? { id: byName.id as string, name: asText(byName.name) || "Tucxa" } : null;
}

async function currentFilho(request: Request, organizationId: string) {
  const token = bearerToken(request);
  if (!token) throw new Error("Sessão expirada. Entre novamente no painel do Filho da Corrente.");

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Sessão inválida. Entre novamente no painel do Filho da Corrente.");

  const user = userData.user;
  const email = user.email || "";

  let person: PersonRecord | null = null;

  const byAuth = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, notes, active, auth_user_id")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuth.error) throw byAuth.error;
  if (byAuth.data?.id) person = byAuth.data as PersonRecord;

  if (!person && email) {
    const byEmail = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, notes, active, auth_user_id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data?.id) person = byEmail.data as PersonRecord;
  }

  if (!person) throw new Error("Cadastro do Filho da Corrente não localizado.");

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, person_id, active, status, module_slugs, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", person.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership?.id || membership.active !== true || membership.status !== "ativo") {
    throw new Error("Seu acesso ainda não está liberado para atualização de dados.");
  }

  return { user, person, membership: membership as MembershipRecord };
}

function profilePayload(person: PersonRecord, membership: MembershipRecord) {
  const profile = asRecord(membership.agenda_viva_profile);
  return {
    person: {
      id: person.id,
      fullName: person.full_name || "",
      whatsapp: person.whatsapp || "",
      email: displayEmail(person.email),
      notes: person.notes || "",
    },
    status: membership.status || "ativo",
    modules: Array.isArray(membership.module_slugs) ? membership.module_slugs : DEFAULT_MODULE_SLUGS,
    functionSlugs: Array.isArray(profile.functionSlugs) ? profile.functionSlugs.map((item) => asText(item)).filter(Boolean) : [],
    agendaSlugs: Array.isArray(profile.agendaSlugs) ? profile.agendaSlugs.map((item) => asText(item)).filter(Boolean) : [],
    selectedFunctions: asDraftItems(profile.selectedFunctions),
    selectedAgenda: asDraftItems(profile.selectedAgenda),
    submittedAt: asText(profile.submittedAt),
    lastProfileUpdateAt: asText(profile.lastProfileUpdateAt),
    profileUpdateStatus: asText(profile.profileUpdateStatus),
  };
}

function statusToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function GET(request: Request) {
  try {
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");
    const current = await currentFilho(request, organization.id);
    return NextResponse.json({ ok: true, organization, ...profilePayload(current.person, current.membership) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar dados do Filho da Corrente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");
    const current = await currentFilho(request, organization.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const fullName = asText(body.fullName);
    const whatsapp = onlyDigits(body.whatsapp);
    const email = normalizeEmail(body.email);
    const notes = asText(body.notes);
    const functionSlugs = asTextList(body.functionSlugs);
    const agendaSlugs = asTextList(body.agendaSlugs);
    const selectedFunctions = asDraftItems(body.selectedFunctions);
    const selectedAgenda = asDraftItems(body.selectedAgenda);

    if (!fullName) throw new Error("Informe seu nome completo.");
    if (whatsapp.length < 10) throw new Error("Informe seu WhatsApp com DDD.");
    if (email && !email.includes("@")) throw new Error("Confira o e-mail informado.");

    const previousProfile = asRecord(current.membership.agenda_viva_profile);
    const now = new Date().toISOString();
    const updateToken = statusToken();

    const nextProfile = {
      ...previousProfile,
      source: "primeiro_acesso_filho_corrente",
      validationStatus: "ativo",
      profileUpdateStatus: "pendente_validacao",
      functionSlugs,
      agendaSlugs,
      selectedFunctions,
      selectedAgenda,
      lastProfileUpdateAt: now,
      pendingProfileUpdateAt: now,
    };

    const { error: personError } = await supabaseAdmin
      .from("oh_people")
      .update({
        full_name: fullName,
        whatsapp,
        email: email || current.person.email,
        notes: notes || null,
        updated_at: now,
      })
      .eq("id", current.person.id)
      .eq("organization_id", organization.id);
    if (personError) throw personError;

    const { error: membershipError } = await supabaseAdmin
      .from("oh_memberships")
      .update({
        active: true,
        status: "ativo",
        module_slugs: DEFAULT_MODULE_SLUGS,
        agenda_viva_profile: nextProfile,
        updated_at: now,
      })
      .eq("id", current.membership.id)
      .eq("organization_id", organization.id);
    if (membershipError) throw membershipError;

    const { error: validationError } = await supabaseAdmin.from("oh_first_access_validation_requests").insert({
      organization_id: organization.id,
      person_id: current.person.id,
      status: "pendente_validacao",
      full_name: fullName,
      whatsapp,
      email: displayEmail(email || current.person.email) || null,
      function_slugs: functionSlugs,
      agenda_slugs: agendaSlugs,
      summary: {
        requestType: "profile_update",
        statusToken: updateToken,
        notes,
        selectedFunctions,
        selectedAgenda,
        requestedAt: now,
      },
    });
    if (validationError) throw validationError;

    return NextResponse.json({
      ok: true,
      message: "Atualização enviada para validação do Tucxa.",
      statusUrl: `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/status?token=${encodeURIComponent(updateToken)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar atualização de dados.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
