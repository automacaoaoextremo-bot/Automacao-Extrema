import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CorrenteOrganization, CorrentePerson, CorrentePersonOrganizationLink, CorrenteRole } from "@/lib/corrente-em-dia";

type ImportContributorRow = {
  nome_completo?: string;
  email?: string;
  whatsapp?: string;
  tipo_pessoa?: string;
  funcao?: string;
  valor_contribuicao?: string;
  dia_vencimento?: string;
  modo_vencimento?: string;
  contribuicao_habilitada?: string;
  gestor?: string;
  financeiro?: string;
  observacoes?: string;
};

type ImportRequestBody = {
  organization_id?: string;
  rows?: ImportContributorRow[];
};

type RawPersonOrganizationLink = Omit<CorrentePersonOrganizationLink, "role" | "organization"> & {
  role: CorrenteRole | CorrenteRole[] | null;
  organization: CorrenteOrganization | CorrenteOrganization[] | null;
};

type ExistingContributionRule = {
  id: string;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeBoolean(value: string | undefined) {
  return ["sim", "s", "true", "1", "yes"].includes((value ?? "").trim().toLowerCase());
}

function normalizeAmount(value: string | undefined) {
  const normalized = (value ?? "").trim().replace("R$", "").replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeDueDay(value: string | undefined) {
  const number = Number((value ?? "").trim());
  if (!Number.isInteger(number) || number < 1 || number > 28) return null;
  return number;
}

function normalizeMode(value: string | undefined) {
  const mode = (value ?? "").trim();
  if (["fixed_day", "until_day", "free_month"].includes(mode)) return mode;
  return "until_day";
}

function normalizePersonType(value: string | undefined) {
  const type = (value ?? "contribuinte").trim().toLowerCase();
  if (["gestor", "contribuinte", "consulente", "familiar", "parceiro", "outro"].includes(type)) return type;
  return "contribuinte";
}

function roleSlugFromName(value: string | undefined) {
  const lower = (value ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    presidente: "presidente",
    tesoureiro: "tesoureiro",
    "tesoureiro(a)": "tesoureiro",
    dirigente: "dirigente",
    "pai ou mãe de santo": "dirigente",
    coordenador: "coordenador",
    cambono: "cambono",
    "cambono(a)": "cambono",
    "cavalo/médium": "cavalo-medium",
    "cavalo/medium": "cavalo-medium",
    médium: "cavalo-medium",
    medium: "cavalo-medium",
    consulente: "consulente-contribuinte",
    "consulente contribuinte": "consulente-contribuinte",
    família: "familia-contribuinte",
    familia: "familia-contribuinte",
    "família contribuinte": "familia-contribuinte",
    "familia contribuinte": "familia-contribuinte",
  };
  return map[lower] ?? "cambono";
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return { user: null, error: NextResponse.json({ error: "Acesso não autenticado." }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 }) };
  }

  return { user: data.user, error: null };
}

async function findPersonByUser(userId: string, email?: string | null): Promise<CorrentePerson | null> {
  const { data: personByAuth, error: authError } = await supabaseAdmin
    .from("ced_people")
    .select("*")
    .eq("auth_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (authError) throw new Error(authError.message);
  if (personByAuth) return personByAuth as CorrentePerson;

  if (!email) return null;

  const { data: personByEmail, error: emailError } = await supabaseAdmin
    .from("ced_people")
    .select("*")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (emailError) throw new Error(emailError.message);
  return (personByEmail ?? null) as CorrentePerson | null;
}

async function ensureRole(slug: string) {
  const { data: role, error } = await supabaseAdmin
    .from("ced_roles")
    .select("id, name, slug, is_manager, is_financial_role")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return role as Pick<CorrenteRole, "id" | "name" | "slug" | "is_manager" | "is_financial_role"> | null;
}

async function findExistingPerson(email: string) {
  const { data, error } = await supabaseAdmin
    .from("ced_people")
    .select("*")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as CorrentePerson | null;
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth.error) return auth.error;
    const user = auth.user;
    if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });

    const body = (await request.json()) as ImportRequestBody;
    const organizationId = body.organization_id;
    const rows = body.rows ?? [];

    if (!organizationId) return NextResponse.json({ error: "Organização não informada." }, { status: 400 });
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "Nenhum contribuinte informado." }, { status: 400 });

    const person = await findPersonByUser(user.id, user.email);
    if (!person) return NextResponse.json({ error: "Usuário sem vínculo no Corrente em Dia." }, { status: 403 });

    const { data: links, error: linksError } = await supabaseAdmin
      .from("ced_person_organizations")
      .select(`
        id,
        is_manager,
        is_financial_responsible,
        contribution_enabled,
        role:ced_roles(id, name, slug, is_manager, is_financial_role),
        organization:ced_organizations(id, organization_type, name, slug, email, whatsapp, city, state, pix_key, pix_receiver_name, default_individual_amount, default_family_amount, contribution_due_day, contribution_due_mode, public_headline, deep_dive_text, public_status, is_demo)
      `)
      .eq("person_id", person.id)
      .eq("organization_id", organizationId);

    if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });

    const normalizedLinks = ((links ?? []) as RawPersonOrganizationLink[]).map((link) => ({
      ...link,
      role: firstRelation(link.role),
      organization: firstRelation(link.organization),
    }));

    const canImport = normalizedLinks.some((link) => link.is_manager || link.is_financial_responsible || Boolean(link.role?.is_manager) || Boolean(link.role?.is_financial_role));
    if (!canImport) return NextResponse.json({ error: "Apenas responsáveis da organização podem importar acessos." }, { status: 403 });

    let imported = 0;
    let skipped = 0;
    const messages: string[] = [];

    for (const row of rows) {
      const fullName = (row.nome_completo ?? "").trim();
      const email = (row.email ?? "").trim().toLowerCase();
      const whatsapp = (row.whatsapp ?? "").trim();

      if (!fullName || !email) {
        skipped += 1;
        messages.push(`Linha ignorada: nome e e-mail são obrigatórios (${fullName || "sem nome"}).`);
        continue;
      }

      const roleSlug = roleSlugFromName(row.funcao);
      const role = await ensureRole(roleSlug);
      const existingPerson = await findExistingPerson(email);
      const isManager = normalizeBoolean(row.gestor) || Boolean(role?.is_manager);
      const isFinancial = normalizeBoolean(row.financeiro) || Boolean(role?.is_financial_role);
      const contributionEnabled = row.contribuicao_habilitada ? normalizeBoolean(row.contribuicao_habilitada) : !isManager;

      let personId = existingPerson?.id;
      if (personId) {
        const { error: updateError } = await supabaseAdmin
          .from("ced_people")
          .update({
            full_name: fullName,
            whatsapp,
            person_type: normalizePersonType(row.tipo_pessoa),
            notes: row.observacoes ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", personId);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { data: insertedPerson, error: insertError } = await supabaseAdmin
          .from("ced_people")
          .insert({
            full_name: fullName,
            email,
            whatsapp,
            person_type: normalizePersonType(row.tipo_pessoa),
            status: "ativo",
            notes: row.observacoes ?? null,
            is_demo: false,
          })
          .select("id")
          .single();
        if (insertError) throw new Error(insertError.message);
        personId = insertedPerson.id as string;
      }

      const { data: existingLink, error: existingLinkError } = await supabaseAdmin
        .from("ced_person_organizations")
        .select("id")
        .eq("person_id", personId)
        .eq("organization_id", organizationId)
        .eq("role_id", role?.id ?? null)
        .limit(1)
        .maybeSingle();
      if (existingLinkError) throw new Error(existingLinkError.message);

      if (existingLink?.id) {
        const { error: linkUpdateError } = await supabaseAdmin
          .from("ced_person_organizations")
          .update({
            is_manager: isManager,
            is_financial_responsible: isFinancial,
            contribution_enabled: contributionEnabled,
          })
          .eq("id", existingLink.id);
        if (linkUpdateError) throw new Error(linkUpdateError.message);
      } else {
        const { error: linkInsertError } = await supabaseAdmin
          .from("ced_person_organizations")
          .insert({
            person_id: personId,
            organization_id: organizationId,
            role_id: role?.id ?? null,
            is_manager: isManager,
            is_financial_responsible: isFinancial,
            contribution_enabled: contributionEnabled,
          });
        if (linkInsertError) throw new Error(linkInsertError.message);
      }

      const amount = normalizeAmount(row.valor_contribuicao);
      if (contributionEnabled && amount !== null) {
        const { data: existingRule, error: ruleLookupError } = await supabaseAdmin
          .from("ced_contribution_rules")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("person_id", personId)
          .limit(1)
          .maybeSingle();
        if (ruleLookupError) throw new Error(ruleLookupError.message);

        const rulePayload = {
          organization_id: organizationId,
          person_id: personId,
          rule_type: normalizePersonType(row.tipo_pessoa) === "consulente" ? "eventual" : "individual",
          amount,
          due_day: normalizeDueDay(row.dia_vencimento),
          due_mode: normalizeMode(row.modo_vencimento),
          notes: row.observacoes ?? "Importado pela área de acessos.",
        };

        if ((existingRule as ExistingContributionRule | null)?.id) {
          const { error: ruleUpdateError } = await supabaseAdmin
            .from("ced_contribution_rules")
            .update(rulePayload)
            .eq("id", (existingRule as ExistingContributionRule).id);
          if (ruleUpdateError) throw new Error(ruleUpdateError.message);
        } else {
          const { error: ruleInsertError } = await supabaseAdmin
            .from("ced_contribution_rules")
            .insert(rulePayload);
          if (ruleInsertError) throw new Error(ruleInsertError.message);
        }
      }

      imported += 1;
    }

    return NextResponse.json({
      imported,
      skipped,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado na importação." },
      { status: 500 },
    );
  }
}
