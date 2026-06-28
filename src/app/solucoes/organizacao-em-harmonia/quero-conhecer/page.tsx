import { normalizeOrganizacaoModulo } from "@/lib/organizacao-em-harmonia";
import { OrganizacaoLeadForm } from "./lead-form";

function asParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function OrganizacaoLeadPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const initialModule = normalizeOrganizacaoModulo(asParam(params.modulo));
  return <OrganizacaoLeadForm initialModule={initialModule} />;
}
