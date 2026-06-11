import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type {
  CorrenteContribution,
  CorrenteOrganization,
  CorrentePaymentReceipt,
  CorrentePersonOrganizationLink,
  CorrenteRole,
} from "@/lib/corrente-em-dia";

type RawPersonOrganizationLink = Omit<
  CorrentePersonOrganizationLink,
  "role" | "organization"
> & {
  role: CorrenteRole | CorrenteRole[] | null;
  organization: CorrenteOrganization | CorrenteOrganization[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeLink(
  link: RawPersonOrganizationLink,
): CorrentePersonOrganizationLink {
  return {
    ...link,
    role: firstRelation(link.role),
    organization: firstRelation(link.organization),
  };
}


type RawContribution = Omit<CorrenteContribution, "person" | "family"> & {
  person: CorrenteContribution["person"] | CorrenteContribution["person"][] | null;
  family: CorrenteContribution["family"] | CorrenteContribution["family"][] | null;
};

function normalizeContribution(item: RawContribution): CorrenteContribution {
  return {
    ...item,
    person: firstRelation(item.person),
    family: firstRelation(item.family),
  };
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!token) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Acesso não autenticado." },
        { status: 401 },
      ),
    };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Sessão inválida ou expirada." },
        { status: 401 },
      ),
    };
  }

  return { user: data.user, error: null };
}

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;

  const user = auth.user;
  if (!user)
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 401 },
    );

  let person = null;
  const { data: personByAuth, error: personByAuthError } = await supabaseAdmin
    .from("ced_people")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (personByAuthError)
    return NextResponse.json(
      { error: personByAuthError.message },
      { status: 500 },
    );
  person = personByAuth;

  if (!person && user.email) {
    const { data: personByEmail, error: personByEmailError } =
      await supabaseAdmin
        .from("ced_people")
        .select("*")
        .ilike("email", user.email)
        .maybeSingle();

    if (personByEmailError)
      return NextResponse.json(
        { error: personByEmailError.message },
        { status: 500 },
      );
    person = personByEmail;
  }

  if (!person) {
    return NextResponse.json(
      {
        error:
          "Este usuário ainda não está vinculado a um cliente Corrente em Dia. Verifique o e-mail do usuário no Supabase ou vincule o auth_user_id na tabela ced_people.",
      },
      { status: 404 },
    );
  }

  const { data: links, error: linksError } = await supabaseAdmin
    .from("ced_person_organizations")
    .select(
      `
      id,
      is_manager,
      is_financial_responsible,
      contribution_enabled,
      role:ced_roles(id, name, slug, is_manager, is_financial_role),
      organization:ced_organizations(
        id,
        ae_client_id,
        organization_type,
        name,
        slug,
        email,
        whatsapp,
        city,
        state,
        pix_key,
        pix_receiver_name,
        default_individual_amount,
        default_family_amount,
        contribution_due_day,
        contribution_due_mode,
        public_headline,
        deep_dive_text,
        public_status,
        is_demo
      )
    `,
    )
    .eq("person_id", person.id);

  if (linksError)
    return NextResponse.json({ error: linksError.message }, { status: 500 });

  const normalizedLinks = ((links ?? []) as RawPersonOrganizationLink[]).map(
    normalizeLink,
  );
  const organizations = normalizedLinks
    .map((link) => link.organization)
    .filter((organization): organization is CorrenteOrganization =>
      Boolean(organization),
    );

  const organizationIds = organizations.map((organization) => organization.id);
  const isAnyManager = normalizedLinks.some(
    (link) =>
      link.is_manager ||
      link.is_financial_responsible ||
      Boolean(link.role?.is_manager) ||
      Boolean(link.role?.is_financial_role),
  );

  if (organizationIds.length === 0) {
    return NextResponse.json({
      person,
      links: [],
      organizations: [],
      dashboard: [],
      contributions: [],
      receipts: [],
      splitEstimates: [],
      clientTerms: [],
    });
  }

  const dashboardPromise = supabaseAdmin
    .from("ced_v_dashboard_month")
    .select("*")
    .in("organization_id", organizationIds)
    .order("reference_month", { ascending: false });

  let contributionsQuery = supabaseAdmin
    .from("ced_contributions")
    .select(
      `
      id,
      organization_id,
      person_id,
      family_id,
      reference_month,
      expected_amount,
      due_date,
      pix_key_expected,
      pix_receiver_expected,
      pix_payload,
      status,
      notes,
      created_at,
      person:ced_people(full_name, email),
      family:ced_families(name)
    `,
    )
    .in("organization_id", organizationIds)
    .order("reference_month", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (!isAnyManager) {
    contributionsQuery = contributionsQuery.eq("person_id", person.id);
  }

  const splitPromise = supabaseAdmin
    .from("ced_v_monthly_split_estimate")
    .select("*")
    .in("organization_id", organizationIds)
    .order("reference_month", { ascending: false });

  const termsPromise = supabaseAdmin
    .from("ced_client_terms")
    .select("*")
    .in("organization_id", organizationIds)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const [dashboardResult, contributionsResult, splitResult, termsResult] =
    await Promise.all([
      dashboardPromise,
      contributionsQuery,
      splitPromise,
      termsPromise,
    ]);

  const firstError =
    dashboardResult.error || contributionsResult.error || splitResult.error;
  if (firstError)
    return NextResponse.json({ error: firstError.message }, { status: 500 });

  const contributions = ((contributionsResult.data ?? []) as unknown as RawContribution[]).map(normalizeContribution);
  const contributionIds = contributions.map((item) => item.id);
  let receipts: CorrentePaymentReceipt[] = [];
  if (contributionIds.length > 0) {
    const { data: receiptData, error: receiptError } = await supabaseAdmin
      .from("ced_payment_receipts")
      .select("*")
      .in("contribution_id", contributionIds)
      .order("created_at", { ascending: false });

    if (receiptError)
      return NextResponse.json(
        { error: receiptError.message },
        { status: 500 },
      );
    receipts = (receiptData ?? []) as CorrentePaymentReceipt[];
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    person,
    links: normalizedLinks,
    organizations,
    is_manager: isAnyManager,
    dashboard: dashboardResult.data ?? [],
    contributions,
    receipts,
    splitEstimates: splitResult.data ?? [],
    clientTerms: termsResult.error ? [] : (termsResult.data ?? []),
    termsError: termsResult.error ? termsResult.error.message : null,
  });
}
