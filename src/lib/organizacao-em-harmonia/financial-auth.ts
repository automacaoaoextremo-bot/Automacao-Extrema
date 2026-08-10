import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type FinancialAccessMode = "view" | "manage";

export type FinancialAuthContext = {
  organizationId: string;
  userId: string;
  personId: string | null;
  personName: string;
  roleSlug: string;
  roleName: string;
  canView: boolean;
  canManage: boolean;
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

export async function getFinancialAuthContext(
  request: Request,
  mode: FinancialAccessMode = "view",
): Promise<
  | { ok: true; context: FinancialAuthContext }
  | { ok: false; response: NextResponse }
> {
  const auth = await getOrganizacaoAuthContext(request, {
    allowFilhoDaCorrente: true,
  });
  if (!auth.ok) return auth;

  const membership = auth.context.membership ?? {};
  const roleId = text(membership.role_id);
  const profile =
    membership.agenda_viva_profile &&
    typeof membership.agenda_viva_profile === "object" &&
    !Array.isArray(membership.agenda_viva_profile)
      ? (membership.agenda_viva_profile as Record<string, unknown>)
      : {};

  let roleSlug = "";
  let roleName = "";
  let rolePermissions: string[] = [];

  if (roleId) {
    const { data: role, error } = await supabaseAdmin
      .from("oh_roles")
      .select("slug, name, active, recommended_permissions")
      .eq("organization_id", auth.context.organizationId)
      .eq("id", roleId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: error.message },
          { status: 500 },
        ),
      };
    }

    if (role?.active !== false) {
      roleSlug = text(role?.slug);
      roleName = text(role?.name);
      rolePermissions = Array.isArray(role?.recommended_permissions)
        ? role.recommended_permissions.map((item: unknown) => text(item)).filter(Boolean)
        : [];
    }
  }

  const selectedFunctions = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions
        .flatMap((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const current = item as Record<string, unknown>;
          return [text(current.slug), text(current.label), text(current.name)];
        })
        .filter(Boolean)
    : [];
  const functionSlugs = Array.isArray(profile.functionSlugs)
    ? profile.functionSlugs.map((item) => text(item)).filter(Boolean)
    : [];
  const roleToken = normalize(
    [roleSlug, roleName, ...rolePermissions, ...functionSlugs, ...selectedFunctions].join(" "),
  );
  const isClientAdmin =
    profile.isClientAdmin === true ||
    normalize(membership.status) === "gestor_cliente";

  const canManage =
    isClientAdmin ||
    roleToken.includes("tesour") ||
    roleToken.includes("finance") ||
    roleToken.includes("administrador-sistema");

  const canView =
    canManage ||
    roleToken.includes("diretor") ||
    roleToken.includes("president") ||
    roleToken.includes("conselho") ||
    roleToken.includes("fiscal");

  if (!canView || (mode === "manage" && !canManage)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            mode === "manage"
              ? "Somente a Tesouraria/Financeiro pode incluir ou alterar informações financeiras."
              : "Esta função não possui acesso às informações financeiras internas.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    context: {
      organizationId: auth.context.organizationId,
      userId: auth.context.user.id,
      personId: text(auth.context.person?.id) || null,
      personName:
        text(auth.context.person?.full_name) ||
        text(auth.context.user.user_metadata?.full_name) ||
        auth.context.user.email ||
        "Usuário",
      roleSlug,
      roleName,
      canView,
      canManage,
    },
  };
}

export async function writeFinancialAudit(input: {
  organizationId: string;
  personId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  justification?: string | null;
}) {
  const { error } = await supabaseAdmin
    .from("oh_financial_audit_logs")
    .insert({
      organization_id: input.organizationId,
      actor_person_id: input.personId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      before_data: input.beforeData ?? null,
      after_data: input.afterData ?? null,
      justification: input.justification || null,
    });

  if (error) throw error;
}
