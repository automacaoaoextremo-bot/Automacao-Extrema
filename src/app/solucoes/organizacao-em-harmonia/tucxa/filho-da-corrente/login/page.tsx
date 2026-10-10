import { redirect } from "next/navigation";

const UNIFIED_LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
const FILHO_PANEL = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/solucoes/organizacao-em-harmonia/") || value.startsWith("//")) return "";
  return value;
}

export default async function LegacyFilhoLoginRedirect({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(first(params.returnTo)) || FILHO_PANEL;
  const unified = new URLSearchParams({
    context: "portal",
    returnTo,
  });

  redirect(`${UNIFIED_LOGIN}?${unified.toString()}`);
}
