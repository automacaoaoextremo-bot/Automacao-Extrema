import { NextResponse } from "next/server";
import { getCorrenteAuthContext } from "@/lib/corrente-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(".", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPassword() {
  return `Ced@${Math.random().toString(36).slice(2, 8).toUpperCase()}${new Date().getFullYear()}`;
}

export async function GET(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const { data: links, error } = await supabaseAdmin
    .from("ced_person_organizations")
    .select(
      `
      id,
      role_id,
      contribution_enabled,
      person:ced_people(id, full_name, email, whatsapp, person_type, status, auth_user_id),
      role:ced_roles(id, name, slug)
    `,
    )
    .eq("organization_id", auth.context.organizationId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const personIds = (links ?? [])
    .map((link) => {
      const person = Array.isArray(link.person) ? link.person[0] : link.person;
      return person?.id as string | undefined;
    })
    .filter((id): id is string => Boolean(id));

  const { data: rules } = personIds.length
    ? await supabaseAdmin
        .from("ced_contribution_rules")
        .select("id, person_id, amount, due_day, due_mode, rule_type, is_active")
        .eq("organization_id", auth.context.organizationId)
        .in("person_id", personIds)
        .eq("is_active", true)
    : { data: [] };

  const ruleByPerson = new Map((rules ?? []).map((rule) => [rule.person_id as string, rule]));

  const contributors = (links ?? [])
    .map((link) => {
      const person = Array.isArray(link.person) ? link.person[0] : link.person;
      const role = Array.isArray(link.role) ? link.role[0] : link.role;
      const rule = person?.id ? ruleByPerson.get(person.id as string) : null;
      if (!person) return null;
      return {
        id: person.id,
        full_name: person.full_name,
        email: person.email,
        whatsapp: person.whatsapp,
        person_type: person.person_type,
        status: person.status,
        auth_user_id: person.auth_user_id,
        role_id: link.role_id,
        role_name: role?.name ?? null,
        contribution_rule_id: rule?.id ?? null,
        contribution_amount: rule?.amount ?? null,
        contribution_due_day: rule?.due_day ?? null,
        contribution_due_mode: rule?.due_mode ?? null,
        contribution_rule_type: rule?.rule_type ?? null,
        contribution_enabled: link.contribution_enabled,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => !query || item.full_name.toLowerCase().includes(query) || item.email?.toLowerCase().includes(query));

  const { data: roles } = await supabaseAdmin.from("ced_roles").select("id, name, slug").order("sort_order", { ascending: true });
  const { data: organization } = await supabaseAdmin
    .from("ced_organizations")
    .select("default_individual_amount, contribution_due_day, contribution_due_mode")
    .eq("id", auth.context.organizationId)
    .maybeSingle();
  const { data: options } = await supabaseAdmin
    .from("ced_contribution_options")
    .select("id, description, amount, is_active")
    .eq("organization_id", auth.context.organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return NextResponse.json({ contributors, roles: roles ?? [], organization, contributionOptions: options ?? [] });
}

export async function POST(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;
  if (!auth.context.isManager) {
    return NextResponse.json({ error: "Apenas responsáveis podem cadastrar contribuintes." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fullName = text(body.full_name);
  if (!fullName) return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });

  const email = text(body.email).toLowerCase() || null;
  const whatsapp = text(body.whatsapp).replace(/\D/g, "") || null;
  const roleId = text(body.role_id) || null;
  const status = text(body.status) || "ativo";
  const contributionAmount = numberOrNull(body.contribution_amount);
  const contributionDueDay = numberOrNull(body.contribution_due_day);
  const contributionDueMode = text(body.contribution_due_mode) || "until_day";
  const ruleType = text(body.rule_type) || "individual";

  let authUserId: string | null = null;
  let temporaryPassword: string | null = null;
  if (email && Boolean(body.create_login)) {
    temporaryPassword = buildPassword();
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, origem: "corrente_em_dia_contribuinte" },
    });
    if (!userError && userData.user?.id) authUserId = userData.user.id;
  }

  const { data: person, error: personError } = await supabaseAdmin
    .from("ced_people")
    .insert({
      full_name: fullName,
      email,
      whatsapp,
      auth_user_id: authUserId,
      person_type: "contribuinte",
      status,
      notes: "Cadastrado pela área logada Corrente em Dia.",
    })
    .select("id, full_name, email, whatsapp, auth_user_id")
    .single();

  if (personError) return NextResponse.json({ error: personError.message }, { status: 500 });

  const { error: linkError } = await supabaseAdmin.from("ced_person_organizations").insert({
    person_id: person.id,
    organization_id: auth.context.organizationId,
    role_id: roleId,
    is_manager: false,
    is_financial_responsible: false,
    contribution_enabled: status === "ativo",
  });

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  if (contributionAmount !== null || contributionDueDay !== null) {
    const { error: ruleError } = await supabaseAdmin.from("ced_contribution_rules").insert({
      organization_id: auth.context.organizationId,
      person_id: person.id,
      rule_type: ruleType,
      amount: contributionAmount,
      due_day: contributionDueMode === "free_month" ? null : contributionDueDay,
      due_mode: contributionDueMode,
      is_active: true,
    });
    if (ruleError) return NextResponse.json({ error: ruleError.message }, { status: 500 });
  }

  const accessMessage = [
    `Olá, ${fullName.split(/\s+/)[0] || "tudo bem"}!`,
    "Seu acesso ao Corrente em Dia foi criado para acompanhar suas contribuições, comprovantes e histórico com segurança.",
    `E-mail: ${email ?? "não informado"}`,
    temporaryPassword ? `Senha temporária: ${temporaryPassword}` : "Se você já tinha acesso, use sua senha atual ou a opção Esqueci minha senha.",
    "Link: https://www.automacaoextrema.com/solucoes/corrente-em-dia/login",
  ].join("\n");

  return NextResponse.json({ person, temporaryPassword, whatsappMessage: accessMessage });
}
