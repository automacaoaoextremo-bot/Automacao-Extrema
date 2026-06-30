import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  const text = asText(value).toLowerCase();
  if (!text) return fallback;
  return ["sim", "s", "yes", "true", "1", "ativo"].includes(text);
}

function normalizeModules(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function listPayload(organizationId: string) {
  const [organizationResult, peopleResult, rolesResult, membershipsResult, moduleSettingsResult] = await Promise.all([
    supabaseAdmin
      .from("oh_organizations")
      .select("id, name, slug, organization_type, email, whatsapp, enabled_modules, status")
      .eq("id", organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active, notes, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_roles")
      .select("id, name, slug, description, active, is_system")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("oh_memberships")
      .select("id, person_id, role_id, module_slugs, active, status, is_main_contact, can_receive_notifications")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_module_settings")
      .select("id, module_slug, enabled, settings")
      .eq("organization_id", organizationId)
      .order("module_slug", { ascending: true }),
  ]);

  for (const result of [organizationResult, peopleResult, rolesResult, membershipsResult, moduleSettingsResult]) {
    if (result.error) throw result.error;
  }

  return {
    organization: organizationResult.data,
    people: peopleResult.data ?? [],
    roles: rolesResult.data ?? [],
    memberships: membershipsResult.data ?? [],
    modules: moduleSettingsResult.data ?? [],
  };
}

async function upsertPerson(organizationId: string, body: Record<string, unknown>) {
  const personId = asText(body.personId ?? body.id);
  const fullName = asText(body.fullName ?? body.full_name);
  const email = asText(body.email).toLowerCase();
  const whatsapp = asText(body.whatsapp).replace(/\D/g, "");
  const notes = asText(body.notes ?? body.observacoes);
  const roleId = asText(body.roleId ?? body.role_id);
  const moduleSlugs = normalizeModules(body.moduleSlugs ?? body.module_slugs ?? body.modulos);
  const active = asBool(body.active, true);

  if (!fullName) throw new Error("Informe o nome completo do envolvido.");

  let selectedPersonId = personId;

  if (selectedPersonId) {
    const { error } = await supabaseAdmin
      .from("oh_people")
      .update({
        full_name: fullName,
        email: email || null,
        whatsapp: whatsapp || null,
        active,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedPersonId)
      .eq("organization_id", organizationId);
    if (error) throw error;
  } else {
    const { data: existingByEmail } = email
      ? await supabaseAdmin
          .from("oh_people")
          .select("id")
          .eq("organization_id", organizationId)
          .ilike("email", email)
          .maybeSingle()
      : { data: null };

    if (existingByEmail?.id) {
      selectedPersonId = existingByEmail.id as string;
      const { error } = await supabaseAdmin
        .from("oh_people")
        .update({
          full_name: fullName,
          whatsapp: whatsapp || null,
          active,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPersonId);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseAdmin
        .from("oh_people")
        .insert({
          organization_id: organizationId,
          full_name: fullName,
          email: email || null,
          whatsapp: whatsapp || null,
          active,
          notes: notes || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      selectedPersonId = data.id as string;
    }
  }

  if (selectedPersonId) {
    const { data: existingMembership } = await supabaseAdmin
      .from("oh_memberships")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("person_id", selectedPersonId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const membershipPayload = {
      organization_id: organizationId,
      person_id: selectedPersonId,
      role_id: roleId || null,
      module_slugs: moduleSlugs.length > 0 ? moduleSlugs : ["agenda-viva"],
      active,
      status: active ? "ativo" : "inativo",
      updated_at: new Date().toISOString(),
    };

    if (existingMembership?.id) {
      const { error } = await supabaseAdmin
        .from("oh_memberships")
        .update(membershipPayload)
        .eq("id", existingMembership.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("oh_memberships").insert(membershipPayload);
      if (error) throw error;
    }
  }

  return selectedPersonId;
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await listPayload(auth.context.organizationId);
    return NextResponse.json({ ...payload, currentPerson: auth.context.person });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar Base Única." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action) || "upsertPerson";

    if (action === "deletePerson") {
      const personId = asText(body.personId);
      if (!personId) throw new Error("Pessoa não informada.");
      const { error } = await supabaseAdmin
        .from("oh_people")
        .delete()
        .eq("id", personId)
        .eq("organization_id", auth.context.organizationId);
      if (error) throw error;
    } else if (action === "togglePerson") {
      const personId = asText(body.personId);
      const active = asBool(body.active, true);
      if (!personId) throw new Error("Pessoa não informada.");
      const { error: personError } = await supabaseAdmin
        .from("oh_people")
        .update({ active, updated_at: new Date().toISOString() })
        .eq("id", personId)
        .eq("organization_id", auth.context.organizationId);
      if (personError) throw personError;
      const { error: membershipError } = await supabaseAdmin
        .from("oh_memberships")
        .update({ active, status: active ? "ativo" : "inativo", updated_at: new Date().toISOString() })
        .eq("organization_id", auth.context.organizationId)
        .eq("person_id", personId);
      if (membershipError) throw membershipError;
    } else {
      await upsertPerson(auth.context.organizationId, body);
    }

    const payload = await listPayload(auth.context.organizationId);
    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar Base Única." }, { status: 500 });
  }
}
