import { supabaseAdmin } from "@/lib/supabase-admin";

export type FilhoFunctionOption = {
  id?: string;
  slug: string;
  label: string;
  description?: string;
  parentRoleId?: string | null;
};

type RoleRow = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  active?: boolean | null;
  is_system?: boolean | null;
  parent_role_id?: string | null;
};

const RESERVED_ACCESS_ROLE_SLUGS = new Set([
  "filho-da-corrente",
  "filho-corrente",
  "consulente",
  "filho-de-fora",
  "cliente",
  "gestor-cliente",
]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function canonicalSlug(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function filhoFunctionOptionsFromRoles(
  roles: RoleRow[],
): FilhoFunctionOption[] {
  const unique = new Map<string, FilhoFunctionOption>();

  for (const role of roles) {
    if (role.active === false) continue;

    const slug = canonicalSlug(role.slug || role.name);
    const label = text(role.name);
    if (!slug || !label || RESERVED_ACCESS_ROLE_SLUGS.has(slug)) continue;

    unique.set(slug, {
      ...(text(role.id) ? { id: text(role.id) } : {}),
      slug,
      label,
      ...(text(role.description)
        ? { description: text(role.description) }
        : {}),
      parentRoleId: text(role.parent_role_id) || null,
    });
  }

  return Array.from(unique.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR", { sensitivity: "base" }),
  );
}

export async function loadFilhoFunctionOptions(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_roles")
    .select(
      "id, name, slug, description, active, is_system, parent_role_id",
    )
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return filhoFunctionOptionsFromRoles((data ?? []) as RoleRow[]);
}
