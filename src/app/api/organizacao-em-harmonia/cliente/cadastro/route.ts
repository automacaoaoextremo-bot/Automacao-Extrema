import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function normalizeModules(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("oh_organizations")
      .select("id, name, slug, organization_type, email, whatsapp, city, state, address, number, complement, zip_code, status, enabled_modules, settings, notes")
      .eq("id", auth.context.organizationId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      organization: data,
      currentPerson: auth.context.person,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar cadastro da organização." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const enabledModules = normalizeModules(body.enabledModules ?? body.enabled_modules);

    const updatePayload = {
      name: asText(body.name) || auth.context.organization?.name || "Organização sem nome",
      organization_type: asText(body.organizationType ?? body.organization_type) || null,
      email: asText(body.email).toLowerCase() || null,
      whatsapp: normalizePhone(body.whatsapp) || null,
      city: asText(body.city) || null,
      state: asText(body.state) || null,
      address: asText(body.address) || null,
      number: asText(body.number) || null,
      complement: asText(body.complement) || null,
      zip_code: asText(body.zipCode ?? body.zip_code).replace(/\D/g, "") || null,
      enabled_modules: enabledModules.length > 0 ? enabledModules : ["agenda-viva"],
      notes: asText(body.notes) || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("oh_organizations")
      .update(updatePayload)
      .eq("id", auth.context.organizationId);

    if (error) throw error;

    const { data, error: reloadError } = await supabaseAdmin
      .from("oh_organizations")
      .select("id, name, slug, organization_type, email, whatsapp, city, state, address, number, complement, zip_code, status, enabled_modules, settings, notes")
      .eq("id", auth.context.organizationId)
      .maybeSingle();

    if (reloadError) throw reloadError;

    return NextResponse.json({ ok: true, organization: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar cadastro da organização." }, { status: 500 });
  }
}
