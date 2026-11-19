import { notFound, redirect } from "next/navigation";

/** Compatibilidade: /tc/<token> encaminha ao fluxo de confirmação já existente. */
export default async function TucxaShortConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // 32 bytes em base64url: 43 caracteres, não tentar encurtar ou decodificar.
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();

  redirect(`/solucoes/organizacao-em-harmonia/tucxa/confirmar-agendamento/${encodeURIComponent(token)}`);
}
