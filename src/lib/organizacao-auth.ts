import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_MODULE_SLUGS = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];
const DEFAULT_CLIENT_ADMIN_EMAILS = ["tucxacentro@gmail.com", "automacao.ao.extremo@gmail.com"];

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

type OrganizacaoAuthContext = {
  user: AuthUser;
  organizationId: string;
  organization: Record<string, unknown> | null;
  person: Record<string, unknown> | null;
  membership: Record<string, unknown> | null;
};

type OrganizacaoAuthResult =
  | { ok: true; context: OrganizacaoAuthContext }
  | { ok: false; response: NextResponse };

function jsonError(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedEmail(value: unknown) {
  return asText(value).toLowerCase();
}

function allowedClientAdminEmails() {
  const fromEnv = asText(process.env.OH_CLIENT_ADMIN_EMAILS || process.env.OH_TUCXA_ADMIN_EMAILS)
    .split(/[;,|\s]+/)
    .map((email) => normalizedEmail(email))
    .filter(Boolean);

  return new Set([...DEFAULT_CLIENT_ADMIN_EMAILS, ...fromEnv]);
}

function isFilhoDaCorrenteUser(user: AuthUser) {
  const metadata = user.user_metadata ?? {};
  const appMetadata = user.app_metadata ?? {};
  const profile = normalizedEmail(metadata.oh_profile || metadata.profile || appMetadata.oh_profile || appMetadata.profile);
  const role = normalizedEmail(metadata.oh_role || metadata.role || appMetadata.oh_role || appMetadata.role);

  return profile === "filho-da-corrente" || role === "filho-da-corrente";
}

function fullNameFromUser(user: AuthUser) {
  const metadata = user.user_metadata ?? {};
  return (
    asText(metadata.full_name) ||
    asText(metadata.name) ||
    asText(metadata.nome) ||
    (user.email ? user.email.split("@")[0] : "Gestor Tucxa")
  );
}

function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function getAuthUser(token: string): Promise<AuthUser | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    user_metadata: (data.user.user_metadata ?? {}) as Record<string, unknown>,
    app_metadata: (data.user.app_metadata ?? {}) as Record<string, unknown>,
  };
}

async function findTucxaOrganization(email: string) {
  if (email) {
    const { data: byEmail } = await supabaseAdmin
      .from("oh_organizations")
      .select("id, name, slug, email, whatsapp, enabled_modules, status, settings")
      .ilike("email", email)
      .maybeSingle();
    if (byEmail?.id) return byEmail as Record<string, unknown>;
  }

  const { data: siteSettings } = await supabaseAdmin
    .from("oh_client_site_settings")
    .select("organization_id")
    .eq("public_slug", "tucxa")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (siteSettings?.organization_id) {
    const { data: bySite } = await supabaseAdmin
      .from("oh_organizations")
      .select("id, name, slug, email, whatsapp, enabled_modules, status, settings")
      .eq("id", siteSettings.organization_id)
      .maybeSingle();
    if (bySite?.id) return bySite as Record<string, unknown>;
  }

  const { data: bySlug } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug, email, whatsapp, enabled_modules, status, settings")
    .eq("slug", "tucxa")
    .maybeSingle();
  if (bySlug?.id) return bySlug as Record<string, unknown>;

  const { data: byName } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug, email, whatsapp, enabled_modules, status, settings")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (byName as Record<string, unknown> | null) ?? null;
}

async function findExistingContext(user: AuthUser) {
  const email = normalizedEmail(user.email);

  let person: Record<string, unknown> | null = null;
  const { data: byAuthUser } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, email, whatsapp, active, auth_user_id, notes")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuthUser?.id) {
    person = byAuthUser as Record<string, unknown>;
  } else if (email) {
    const { data: byEmail } = await supabaseAdmin
      .from("oh_people")
      .select("id, organization_id, full_name, email, whatsapp, active, auth_user_id, notes")
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byEmail?.id) {
      person = byEmail as Record<string, unknown>;
      if (!byEmail.auth_user_id) {
        await supabaseAdmin
          .from("oh_people")
          .update({ auth_user_id: user.id, updated_at: new Date().toISOString() })
          .eq("id", byEmail.id);
        person = { ...person, auth_user_id: user.id };
      }
    }
  }

  const personId = asText(person?.id);
  if (!personId) return null;

  const { data: membership } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, organization_id, person_id, role_id, module_slugs, active, status, is_main_contact, can_receive_notifications, agenda_viva_profile")
    .eq("person_id", personId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const organizationId = asText(membership?.organization_id || person?.organization_id);
  if (!organizationId) return null;

  const { data: organization } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug, email, whatsapp, enabled_modules, status, settings")
    .eq("id", organizationId)
    .maybeSingle();

  if (!organization?.id) return null;

  return {
    organizationId: organization.id as string,
    organization: organization as Record<string, unknown>,
    person,
    membership: (membership as Record<string, unknown> | null) ?? null,
  };
}

async function ensureAdminRole(organizationId: string) {
  const { data: existing } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .in("slug", ["administrador-sistema", "gestor-cliente", "administrador"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data, error } = await supabaseAdmin
    .from("oh_roles")
    .insert({
      organization_id: organizationId,
      name: "Administrador do sistema",
      slug: "administrador-sistema",
      description: "Pode administrar configurações, acessos e validações da Organização em Harmonia.",
      active: true,
      is_system: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function ensureClientAdminContext(user: AuthUser) {
  const email = normalizedEmail(user.email);
  const organization = await findTucxaOrganization(email);
  const organizationId = asText(organization?.id);
  if (!organization || !organizationId) return null;

  const roleId = await ensureAdminRole(organizationId);
  const fullName = fullNameFromUser(user);

  let personId = "";
  const { data: existingByAuth } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, email, whatsapp, active, auth_user_id, notes")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingByAuth?.id) {
    personId = existingByAuth.id as string;
  } else if (email) {
    const { data: existingByEmail } = await supabaseAdmin
      .from("oh_people")
      .select("id, organization_id, full_name, email, whatsapp, active, auth_user_id, notes")
      .eq("organization_id", organizationId)
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingByEmail?.id) personId = existingByEmail.id as string;
  }

  if (personId) {
    const { error } = await supabaseAdmin
      .from("oh_people")
      .update({
        full_name: fullName,
        email: email || null,
        active: true,
        auth_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId)
      .eq("organization_id", organizationId);
    if (error) throw error;
  } else {
    const { data, error } = await supabaseAdmin
      .from("oh_people")
      .insert({
        organization_id: organizationId,
        full_name: fullName,
        email: email || null,
        whatsapp: null,
        active: true,
        auth_user_id: user.id,
        notes: "Gestor vinculado automaticamente para acesso à área cliente da Organização em Harmonia.",
      })
      .select("id")
      .single();
    if (error) throw error;
    personId = data.id as string;
  }

  const { data: existingMembership } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, organization_id, person_id, role_id, module_slugs, active, status, is_main_contact, can_receive_notifications, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const membershipPayload = {
    organization_id: organizationId,
    person_id: personId,
    role_id: roleId,
    module_slugs: DEFAULT_MODULE_SLUGS,
    active: true,
    status: "gestor_cliente",
    is_main_contact: true,
    can_receive_notifications: true,
    agenda_viva_profile: {
      source: "cliente_tucxa",
      validationStatus: "gestor_cliente",
      isClientAdmin: true,
      repairedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };

  if (existingMembership?.id) {
    const { error } = await supabaseAdmin.from("oh_memberships").update(membershipPayload).eq("id", existingMembership.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from("oh_memberships").insert(membershipPayload);
    if (error) throw error;
  }

  const { data: person } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, email, whatsapp, active, auth_user_id, notes")
    .eq("id", personId)
    .maybeSingle();

  const { data: membership } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, organization_id, person_id, role_id, module_slugs, active, status, is_main_contact, can_receive_notifications, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    organizationId,
    organization,
    person: (person as Record<string, unknown> | null) ?? null,
    membership: (membership as Record<string, unknown> | null) ?? null,
  };
}

export async function getOrganizacaoAuthContext(request: Request): Promise<OrganizacaoAuthResult> {
  const token = tokenFromRequest(request);
  if (!token) return { ok: false, response: jsonError("Acesso não autenticado.", 401) };

  const user = await getAuthUser(token);
  if (!user) return { ok: false, response: jsonError("Sessão inválida ou expirada.", 401) };

  if (isFilhoDaCorrenteUser(user)) {
    return { ok: false, response: jsonError("Este acesso é exclusivo da área cliente/gestão.", 403) };
  }

  const email = normalizedEmail(user.email);
  const allowedEmails = allowedClientAdminEmails();

  try {
    const existingContext = await findExistingContext(user);
    if (existingContext) {
      const membershipStatus = normalizedEmail(existingContext.membership?.status);
      const profile = existingContext.membership?.agenda_viva_profile;
      const profileRecord = profile && typeof profile === "object" && !Array.isArray(profile) ? (profile as Record<string, unknown>) : {};
      const isClientAdmin = Boolean(profileRecord.isClientAdmin) || membershipStatus === "gestor_cliente";
      const isAllowedFallback = email ? allowedEmails.has(email) : false;

      if (membershipStatus === "filho-da-corrente" || normalizedEmail(profileRecord.oh_profile) === "filho-da-corrente") {
        return { ok: false, response: jsonError("Este acesso é exclusivo da área cliente/gestão.", 403) };
      }

      if (isClientAdmin || isAllowedFallback || existingContext.membership?.active === true) {
        return { ok: true, context: { user, ...existingContext } };
      }
    }

    if (email && allowedEmails.has(email)) {
      const repairedContext = await ensureClientAdminContext(user);
      if (repairedContext) return { ok: true, context: { user, ...repairedContext } };
    }

    return { ok: false, response: jsonError("Este usuário ainda não está vinculado à Organização em Harmonia.", 403) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao validar acesso à Organização em Harmonia.";
    return { ok: false, response: jsonError(message, 500) };
  }
}
