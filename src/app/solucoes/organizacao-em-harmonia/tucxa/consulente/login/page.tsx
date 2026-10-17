import { redirect } from "next/navigation";

const UNIFIED_LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
const CONSULENTE_PANEL = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";
const AGENDA = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/agenda-viva";
const CONTRIBUTION = "/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao?tipo=identificada";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function safeReturnTo(value: string) {
  if (!value.startsWith("/solucoes/organizacao-em-harmonia/") || value.startsWith("//")) return "";
  return value;
}

export default async function LegacyConsulenteLoginRedirect({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedReturnTo = safeReturnTo(first(params.returnTo));
  const destination = first(params.destino);
  const fallback = destination === "contribuicao" ? CONTRIBUTION : destination === "agenda" ? AGENDA : CONSULENTE_PANEL;

  const unified = new URLSearchParams({
    context: "portal",
    returnTo: requestedReturnTo || fallback,
  });

  redirect(`${UNIFIED_LOGIN}?${unified.toString()}`);
}
