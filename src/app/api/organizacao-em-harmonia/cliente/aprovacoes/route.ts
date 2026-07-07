import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ApprovalRuleBody = {
  scope?: string;
  label?: string;
  responsiblePersonId?: string;
  fallbackEmail?: string;
  fallbackWhatsapp?: string;
  active?: boolean;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  const text = asText(value).toLowerCase();
  if (!text) return fallback;
  return ["sim", "s", "true", "1", "yes"].includes(text);
}

async function listPayload(organizationId: string) {
  const [peopleResult, rulesResult] = await Promise.all([
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_approval_rules")
      .select("id, scope, label, responsible_person_id, fallback_email, fallback_whatsapp, active, updated_at")
      .eq("organization_id", organizationId)
      .order("scope", { ascending: true }),
  ]);

  if (peopleResult.error) throw peopleResult.error;
  if (rulesResult.error) throw rulesResult.error;

  return {
    people: peopleResult.data ?? [],
    rules: rulesResult.data ?? [],
  };
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await listPayload(auth.context.organizationId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar aprovações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as ApprovalRuleBody;
    const scope = asText(body.scope);
    const label = asText(body.label);

    if (!scope) return NextResponse.json({ error: "Informe o tipo de aprovação." }, { status: 400 });
    if (!label) return NextResponse.json({ error: "Informe uma descrição para o responsável." }, { status: 400 });

    const payload = {
      organization_id: auth.context.organizationId,
      scope,
      label,
      responsible_person_id: asText(body.responsiblePersonId) || null,
      fallback_email: asText(body.fallbackEmail) || null,
      fallback_whatsapp: asText(body.fallbackWhatsapp).replace(/\D/g, "") || null,
      active: asBool(body.active, true),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("oh_approval_rules")
      .upsert(payload, { onConflict: "organization_id,scope" });

    if (error) throw error;

    return NextResponse.json({ ok: true, ...(await listPayload(auth.context.organizationId)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar aprovações." }, { status: 500 });
  }
}
