import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function functionTokenVariants(value: unknown) {
  const normalized = normalize(value);
  if (!normalized) return [];
  const withoutConnectors = normalized
    .replace(/-(?:de|da|do|das|dos)-/g, "-")
    .replace(/^-+|-+$/g, "");
  return Array.from(new Set([normalized, withoutConnectors].filter(Boolean)));
}

function memberFunctionTokens(membership: Record<string, unknown> | null) {
  const profile = record(membership?.agenda_viva_profile);
  const functionSlugs = Array.isArray(profile.functionSlugs)
    ? profile.functionSlugs.flatMap((item) => functionTokenVariants(item))
    : [];
  const selectedFunctions = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions.flatMap((item) => {
        const current = record(item);
        return [current.slug, current.label, current.name].flatMap((value) => functionTokenVariants(value));
      })
    : [];

  return Array.from(new Set([...functionSlugs, ...selectedFunctions]));
}

function isMemberProfile(
  user: { user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> },
  membership: Record<string, unknown> | null,
) {
  const metadata = user.user_metadata ?? {};
  const appMetadata = user.app_metadata ?? {};
  const profile = record(membership?.agenda_viva_profile);
  const values = [
    metadata.oh_profile,
    metadata.profile,
    appMetadata.oh_profile,
    appMetadata.profile,
    membership?.status,
    profile.oh_profile,
  ].map(normalize);

  return values.includes("filho-da-corrente");
}

export async function getTucxaManagementAccess(
  request: Request,
  allowedMemberFunctions: string[],
) {
  const auth = await getOrganizacaoAuthContext(request, {
    allowFilhoDaCorrente: true,
  });
  if (!auth.ok) return auth;

  if (!isMemberProfile(auth.context.user, auth.context.membership)) {
    return auth;
  }

  const tokens = memberFunctionTokens(auth.context.membership);
  const roleId = text(auth.context.membership?.role_id);
  if (roleId) {
    const { data: role, error: roleError } = await supabaseAdmin
      .from("oh_roles")
      .select("slug,name")
      .eq("id", roleId)
      .maybeSingle();
    if (roleError) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Não foi possível validar sua função atual no Tucxa." },
          { status: 500 },
        ),
      };
    }
    if (role) tokens.push(...functionTokenVariants(role.slug), ...functionTokenVariants(role.name));
  }

  const allowedTokens = new Set(allowedMemberFunctions.flatMap((item) => functionTokenVariants(item)));
  const allowed = tokens.some((token) => allowedTokens.has(token));

  if (!allowed) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error:
            "Sua função atual no Tucxa não possui permissão para administrar esta área.",
        },
        { status: 403 },
      ),
    };
  }

  return auth;
}
