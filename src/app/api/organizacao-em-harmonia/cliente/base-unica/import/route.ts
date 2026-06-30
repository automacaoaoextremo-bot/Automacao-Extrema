import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function parseCsv(text: string) {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2) return [];

  const separator = rows[0].includes(";") && !rows[0].includes(",") ? ";" : ",";
  const headers = rows[0].split(separator).map((item) => item.trim().toLowerCase());

  return rows.slice(1).map((row) => {
    const columns = row.split(separator).map((item) => item.trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = columns[index] ?? "";
      return acc;
    }, {});
  });
}

function asBool(value: string) {
  const text = value.trim().toLowerCase();
  if (!text) return true;
  return ["sim", "s", "yes", "true", "1", "ativo"].includes(text);
}

function normalizeModules(value: string) {
  const modules = value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return modules.length > 0 ? modules : ["agenda-viva"];
}

async function roleIdFor(organizationId: string, slug: string) {
  const normalizedSlug = slug.trim().toLowerCase() || "filho-da-corrente";
  const { data: existing } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const name = normalizedSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const { data, error } = await supabaseAdmin
    .from("oh_roles")
    .insert({ organization_id: organizationId, slug: normalizedSlug, name, active: true, is_system: false })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as { csv?: string };
    const rows = parseCsv(body.csv ?? "");
    let imported = 0;

    for (const row of rows) {
      const fullName = row.nome_completo || row.nome || row.full_name;
      if (!fullName) continue;

      const email = (row.email ?? "").trim().toLowerCase();
      const whatsapp = (row.whatsapp ?? row.telefone ?? "").replace(/\D/g, "");
      const active = asBool(row.ativo ?? "sim");
      const notes = row.observacoes || row.observação || row.notes || "Importado por CSV na Base Única.";
      const roleId = await roleIdFor(auth.context.organizationId, row.funcao_slug || row.funcao || row.função || "filho-da-corrente");
      const moduleSlugs = normalizeModules(row.modulos || row.módulos || row.module_slugs || "agenda-viva");

      let personId = "";
      const { data: existing } = email
        ? await supabaseAdmin
            .from("oh_people")
            .select("id")
            .eq("organization_id", auth.context.organizationId)
            .ilike("email", email)
            .maybeSingle()
        : { data: null };

      if (existing?.id) {
        personId = existing.id as string;
        const { error } = await supabaseAdmin
          .from("oh_people")
          .update({ full_name: fullName, whatsapp: whatsapp || null, active, notes, updated_at: new Date().toISOString() })
          .eq("id", personId);
        if (error) throw error;
      } else {
        const { data, error } = await supabaseAdmin
          .from("oh_people")
          .insert({
            organization_id: auth.context.organizationId,
            full_name: fullName,
            email: email || null,
            whatsapp: whatsapp || null,
            active,
            notes,
          })
          .select("id")
          .single();
        if (error) throw error;
        personId = data.id as string;
      }

      const { data: membership } = await supabaseAdmin
        .from("oh_memberships")
        .select("id")
        .eq("organization_id", auth.context.organizationId)
        .eq("person_id", personId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const membershipPayload = {
        organization_id: auth.context.organizationId,
        person_id: personId,
        role_id: roleId,
        module_slugs: moduleSlugs,
        active,
        status: active ? "ativo" : "inativo",
        updated_at: new Date().toISOString(),
      };

      if (membership?.id) {
        const { error } = await supabaseAdmin.from("oh_memberships").update(membershipPayload).eq("id", membership.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("oh_memberships").insert(membershipPayload);
        if (error) throw error;
      }

      imported += 1;
    }

    return NextResponse.json({ ok: true, imported });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao importar envolvidos." }, { status: 500 });
  }
}
