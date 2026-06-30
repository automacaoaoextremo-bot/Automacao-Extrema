import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type OrganizacaoAuthContext = {
  user: User;
  person: {
    id: string;
    organization_id: string | null;
    full_name: string;
    email: string | null;
    whatsapp: string | null;
    active: boolean;
  };
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    organization_type: string | null;
    email: string | null;
    whatsapp: string | null;
    enabled_modules: string[] | null;
    status: string | null;
  } | null;
  membership: {
    id: string;
    role_id: string | null;
    module_slugs: string[] | null;
    active: boolean;
    status: string | null;
  } | null;
};

type OrganizacaoAuthResult =
  | { ok: true; context: OrganizacaoAuthContext }
  | { ok: false; response: NextResponse };

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getOrganizacaoAuthContext(request: Request): Promise<OrganizacaoAuthResult> {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Acesso não autenticado." }, { status: 401 }) };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return { ok: false, response: NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 }) };
  }

  const user = authData.user;
  let person = null;

  const { data: personByAuth, error: personByAuthError } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, email, whatsapp, active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (personByAuthError) {
    return { ok: false, response: NextResponse.json({ error: personByAuthError.message }, { status: 500 }) };
  }

  person = personByAuth;

  if (!person && user.email) {
    const { data: personByEmail, error: personByEmailError } = await supabaseAdmin
      .from("oh_people")
      .select("id, organization_id, full_name, email, whatsapp, active")
      .ilike("email", user.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (personByEmailError) {
      return { ok: false, response: NextResponse.json({ error: personByEmailError.message }, { status: 500 }) };
    }

    person = personByEmail;
  }

  if (!person) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Este usuário ainda não está vinculado à Organização em Harmonia." },
        { status: 404 },
      ),
    };
  }

  const requestedOrganizationId = new URL(request.url).searchParams.get("organizationId")?.trim();

  let membership = null;
  if (requestedOrganizationId) {
    const { data: selectedMembership, error: selectedMembershipError } = await supabaseAdmin
      .from("oh_memberships")
      .select("id, organization_id, role_id, module_slugs, active, status")
      .eq("person_id", person.id)
      .eq("organization_id", requestedOrganizationId)
      .maybeSingle();

    if (selectedMembershipError) {
      return { ok: false, response: NextResponse.json({ error: selectedMembershipError.message }, { status: 500 }) };
    }

    membership = selectedMembership;
  }

  if (!membership) {
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from("oh_memberships")
      .select("id, organization_id, role_id, module_slugs, active, status")
      .eq("person_id", person.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (membershipsError) {
      return { ok: false, response: NextResponse.json({ error: membershipsError.message }, { status: 500 }) };
    }

    membership = firstRelation(memberships ?? null);
  }

  const organizationId = requestedOrganizationId || membership?.organization_id || person.organization_id;
  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Nenhuma organização vinculada foi encontrada para este usuário." },
        { status: 404 },
      ),
    };
  }

  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug, organization_type, email, whatsapp, enabled_modules, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    return { ok: false, response: NextResponse.json({ error: organizationError.message }, { status: 500 }) };
  }

  return {
    ok: true,
    context: {
      user,
      person,
      organizationId,
      organization,
      membership,
    },
  };
}
