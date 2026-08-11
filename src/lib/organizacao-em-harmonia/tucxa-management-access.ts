import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function memberFunctionTokens(membership: Record<string, unknown> | null) {
  const profile = record(membership?.agenda_viva_profile);
  const functionSlugs = Array.isArray(profile.functionSlugs)
    ? profile.functionSlugs.map((item) => text(item)).filter(Boolean)
    : [];
  const selectedFunctions = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions.flatMap((item) => {
        const current = record(item);
        return [text(current.slug), text(current.label), text(current.name)].filter(Boolean);
      })
    : [];

  return [...functionSlugs, ...selectedFunctions].map(normalize).filter(Boolean);
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
  const allowed = allowedMemberFunctions
    .map(normalize)
    .filter(Boolean)
    .some((needle) => tokens.some((token) => token.includes(needle)));

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
