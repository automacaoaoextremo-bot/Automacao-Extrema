import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hasDespensaVivaManagement } from "@/lib/organizacao-em-harmonia/sementinha-functions";

export type SementinhaAccessRole = "gestor" | "consulta";

export type SementinhaAccessContext = {
  organizationId: string;
  personId: string;
  personName: string;
  accessRole: SementinhaAccessRole;
  isClientAdmin: boolean;
};

type SementinhaAccessResult =
  | { ok: true; context: SementinhaAccessContext }
  | { ok: false; response: NextResponse };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asTextList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

function jsonError(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status });
}

function bearerToken(request: Request) {
  const authorization =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isClientAdminMembership(membership: Record<string, unknown> | null) {
  if (!membership) return false;

  const status = text(membership.status).toLowerCase();
  const profile = asRecord(membership.agenda_viva_profile);

  return status === "gestor_cliente" || profile.isClientAdmin === true;
}

async function findPersonForUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const { data: byAuth, error: byAuthError } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, email, whatsapp, active, auth_user_id")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byAuthError) throw byAuthError;
  if (byAuth?.id) return byAuth;

  const email = text(user.email).toLowerCase();
  if (!email) return null;

  const { data: byEmail, error: byEmailError } = await supabaseAdmin
    .from("oh_people")
    .select("id, organization_id, full_name, email, whatsapp, active, auth_user_id")
    .ilike("email", email)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byEmailError) throw byEmailError;
  if (!byEmail?.id) return null;

  if (!byEmail.auth_user_id) {
    await supabaseAdmin
      .from("oh_people")
      .update({ auth_user_id: user.id, updated_at: new Date().toISOString() })
      .eq("id", byEmail.id);
  }

  return byEmail;
}

export async function getSementinhaAccess(
  request: Request,
  minimumRole: SementinhaAccessRole = "consulta",
): Promise<SementinhaAccessResult> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, response: jsonError("Acesso não autenticado.", 401) };
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      ok: false,
      response: jsonError("Sessão inválida ou expirada.", 401),
    };
  }

  try {
    const user = userData.user;
    const person = await findPersonForUser({
      id: user.id,
      email: user.email,
      user_metadata: (user.user_metadata ?? {}) as Record<string, unknown>,
    });

    if (!person?.id || !person.organization_id) {
      return {
        ok: false,
        response: jsonError(
          "Seu usuário ainda não está vinculado à Base Única do TUCXA.",
          403,
        ),
      };
    }

    const organizationId = text(person.organization_id);
    const personId = text(person.id);
    const personName =
      text(person.full_name) ||
      text(user.user_metadata?.full_name) ||
      text(user.user_metadata?.name) ||
      user.email?.split("@")[0] ||
      "Usuário";

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("oh_memberships")
      .select("id, status, active, agenda_viva_profile")
      .eq("organization_id", organizationId)
      .eq("person_id", personId)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membershipError) throw membershipError;

    const isClientAdmin = isClientAdminMembership(
      (membership as Record<string, unknown> | null) ?? null,
    );
    const profile = asRecord(membership?.agenda_viva_profile);
    const functionSlugs = asTextList(profile.functionSlugs);

    if (!hasDespensaVivaManagement(functionSlugs)) {
      return {
        ok: false,
        response: jsonError(
          "A Despensa Viva é exclusiva para quem possui a função Coordenador Sementinha e a sub-função Gestor Despensa Viva.",
          403,
        ),
      };
    }

    // Quem possui a combinação Coordenador Sementinha + Gestor Despensa Viva
    // recebe acesso de gestão. Mantemos o parâmetro para preservar a assinatura
    // utilizada pelas rotas de leitura/escrita, embora atualmente não exista um
    // perfil somente-consulta dentro da Despensa Viva.
    void minimumRole;
    const accessRole: SementinhaAccessRole = "gestor";

    return {
      ok: true,
      context: {
        organizationId,
        personId,
        personName,
        accessRole,
        isClientAdmin,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível validar seu acesso ao Sementinha.";

    return {
      ok: false,
      response: jsonError(message, 500),
    };
  }
}
