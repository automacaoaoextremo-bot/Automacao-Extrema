import { NextResponse } from "next/server";
import { getCorrenteAuthContext } from "@/lib/corrente-auth";
import { CORRENTE_DEFAULT_PERMISSIONS, type CorrentePermissionKey } from "@/lib/corrente-em-dia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureDefaults() {
  const defaultRoles = [
    { name: "Presidente", slug: "presidente", is_manager: true, is_financial_role: true, sort_order: 1 },
    { name: "Coordenador", slug: "coordenador", is_manager: true, is_financial_role: false, sort_order: 2 },
    { name: "Cavalinho", slug: "cavalinho", is_manager: false, is_financial_role: false, sort_order: 10 },
    { name: "Cambono", slug: "cambono", is_manager: false, is_financial_role: false, sort_order: 11 },
    { name: "Filho da Corrente", slug: "filho-da-corrente", is_manager: false, is_financial_role: false, sort_order: 12 },
    { name: "Consulente", slug: "consulente", is_manager: false, is_financial_role: false, sort_order: 13 },
  ];

  await supabaseAdmin.from("ced_roles").upsert(defaultRoles, { onConflict: "slug" });

  const { data: roles } = await supabaseAdmin.from("ced_roles").select("id, slug").in("slug", defaultRoles.map((role) => role.slug));
  const managerSlugs = new Set(["presidente", "coordenador"]);

  const permissionRows = (roles ?? []).flatMap((role) => {
    const base = managerSlugs.has(role.slug)
      ? CORRENTE_DEFAULT_PERMISSIONS
      : ["contribuir.view", "contribuir.upload_receipt"];

    return base.map((permission) => ({
      role_id: role.id,
      permission_key: permission,
      enabled: true,
    }));
  });

  if (permissionRows.length > 0) {
    await supabaseAdmin.from("ced_role_permissions").upsert(permissionRows, { onConflict: "role_id,permission_key" });
  }
}

export async function GET(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;

  await ensureDefaults();

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("ced_roles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (rolesError) return NextResponse.json({ error: rolesError.message }, { status: 500 });

  const { data: permissions, error: permissionsError } = await supabaseAdmin
    .from("ced_role_permissions")
    .select("*");

  if (permissionsError) return NextResponse.json({ error: permissionsError.message }, { status: 500 });

  return NextResponse.json({ roles: roles ?? [], permissions: permissions ?? [], permissionKeys: CORRENTE_DEFAULT_PERMISSIONS });
}

export async function POST(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;
  if (!auth.context.isManager) {
    return NextResponse.json({ error: "Apenas responsáveis podem alterar configurações." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = text(body.name);
  if (!name) return NextResponse.json({ error: "Informe o nome da função." }, { status: 400 });

  const slug = slugify(name);
  const { data, error } = await supabaseAdmin
    .from("ced_roles")
    .upsert(
      {
        name,
        slug,
        applies_to: "todos",
        description: text(body.description),
        is_manager: Boolean(body.is_manager),
        is_financial_role: Boolean(body.is_financial_role),
        sort_order: 50,
      },
      { onConflict: "slug" },
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const permissions = Array.isArray(body.permissions) ? (body.permissions as string[]) : ["contribuir.view", "contribuir.upload_receipt"];
  const rows = CORRENTE_DEFAULT_PERMISSIONS.map((permission) => ({
    role_id: data.id,
    permission_key: permission,
    enabled: permissions.includes(permission),
  }));

  const { error: permissionError } = await supabaseAdmin.from("ced_role_permissions").upsert(rows, { onConflict: "role_id,permission_key" });
  if (permissionError) return NextResponse.json({ error: permissionError.message }, { status: 500 });

  return NextResponse.json({ role: data });
}

export async function PUT(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;
  if (!auth.context.isManager) {
    return NextResponse.json({ error: "Apenas responsáveis podem alterar permissões." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const roleId = text(body.role_id);
  const permissions = Array.isArray(body.permissions) ? (body.permissions as string[]) : [];

  if (!roleId) return NextResponse.json({ error: "Função não informada." }, { status: 400 });

  const rows = CORRENTE_DEFAULT_PERMISSIONS.map((permission) => ({
    role_id: roleId,
    permission_key: permission as CorrentePermissionKey,
    enabled: permissions.includes(permission),
  }));

  const { error } = await supabaseAdmin.from("ced_role_permissions").upsert(rows, { onConflict: "role_id,permission_key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
