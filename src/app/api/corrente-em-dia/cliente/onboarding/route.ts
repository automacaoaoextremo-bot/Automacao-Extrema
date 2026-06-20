import { NextResponse } from "next/server";
import { getCorrenteAuthContext } from "@/lib/corrente-auth";
import { buildCorrenteOnboardingSteps, correnteOnboardingProgress } from "@/lib/corrente-em-dia";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function safeCount(table: string, filters: Record<string, string | boolean | number | null>) {
  let query = supabaseAdmin.from(table).select("id", { count: "exact", head: true });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined) query = query.eq(key, value);
  });

  const { count } = await query;
  return count ?? 0;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function GET(request: Request) {
  const auth = await getCorrenteAuthContext(request);
  if (!auth.ok) return auth.response;

  const organizationId = auth.context.organizationId;

  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("ced_organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (organizationError) return NextResponse.json({ error: organizationError.message }, { status: 500 });

  const [roleCount, permissionCount, contributorCount, contributionCount, approvedContributionCount, personLinksResult, contributionsResult] =
    await Promise.all([
      safeCount("ced_roles", {}),
      safeCount("ced_role_permissions", { enabled: true }),
      safeCount("ced_person_organizations", { organization_id: organizationId }),
      safeCount("ced_contributions", { organization_id: organizationId }),
      safeCount("ced_contributions", { organization_id: organizationId, status: "aprovado" }),
      supabaseAdmin
        .from("ced_person_organizations")
        .select("person:ced_people(id, auth_user_id)")
        .eq("organization_id", organizationId),
      supabaseAdmin.from("ced_contributions").select("id").eq("organization_id", organizationId),
    ]);

  const contributorWithLoginCount = (personLinksResult.data ?? []).filter((item) => {
    const person = firstRelation((item as { person?: { auth_user_id?: string | null } | { auth_user_id?: string | null }[] | null }).person);
    return Boolean(person?.auth_user_id);
  }).length;

  const contributionIds = (contributionsResult.data ?? []).map((item) => item.id as string);
  let receiptCount = 0;
  if (contributionIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("ced_payment_receipts")
      .select("id", { count: "exact", head: true })
      .in("contribution_id", contributionIds);
    receiptCount = count ?? 0;
  }

  const steps = buildCorrenteOnboardingSteps({
    organization,
    roleCount,
    permissionCount,
    contributorCount,
    contributorWithLoginCount,
    contributionCount,
    receiptCount,
    approvedContributionCount,
  });

  return NextResponse.json({
    organization,
    steps,
    progress: correnteOnboardingProgress(steps),
    counts: {
      roleCount,
      permissionCount,
      contributorCount,
      contributorWithLoginCount,
      contributionCount,
      receiptCount,
      approvedContributionCount,
    },
  });
}
