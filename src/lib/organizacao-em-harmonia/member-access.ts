import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";

export type MemberAccessContext = {
  organizationId: string;
  userId: string;
  personId: string;
  personName: string;
  email: string;
  whatsapp: string;
  functionSlugs: string[];
  selectedFunctions: string[];
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function profileRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getMemberAccessContext(
  request: Request,
): Promise<
  | { ok: true; context: MemberAccessContext }
  | { ok: false; response: NextResponse }
> {
  const auth = await getOrganizacaoAuthContext(request, {
    allowFilhoDaCorrente: true,
  });
  if (!auth.ok) return auth;

  const membership = auth.context.membership ?? {};
  if (membership.active === false) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Seu vínculo com o Tucxa não está ativo." },
        { status: 403 },
      ),
    };
  }

  const personId = text(auth.context.person?.id);
  if (!personId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Não foi possível identificar seu cadastro no Tucxa." },
        { status: 403 },
      ),
    };
  }

  const profile = profileRecord(membership.agenda_viva_profile);
  const functionSlugs = Array.isArray(profile.functionSlugs)
    ? profile.functionSlugs.map((item) => text(item)).filter(Boolean)
    : [];
  const selectedFunctions = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions.flatMap((item) => {
        const record = profileRecord(item);
        return [text(record.slug), text(record.label), text(record.name)].filter(Boolean);
      })
    : [];

  return {
    ok: true,
    context: {
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      personId,
      personName:
        text(auth.context.person?.full_name) ||
        text(auth.context.user.user_metadata?.full_name) ||
        auth.context.user.email ||
        "Filho da Corrente",
      email: text(auth.context.person?.email) || text(auth.context.user.email),
      whatsapp: text(auth.context.person?.whatsapp),
      functionSlugs,
      selectedFunctions,
    },
  };
}

export function memberHasFunction(
  context: MemberAccessContext,
  tokens: string[],
) {
  const haystack = normalize(
    [...context.functionSlugs, ...context.selectedFunctions].join(" "),
  );
  return tokens.some((token) => haystack.includes(normalize(token)));
}
