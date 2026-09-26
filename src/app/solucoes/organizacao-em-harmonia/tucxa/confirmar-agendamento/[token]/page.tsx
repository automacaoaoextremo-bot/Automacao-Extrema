import ConfirmationClient from "./confirmation-client";
import { loadTucxaConfirmationAppointment } from "@/lib/organizacao-em-harmonia/tucxa-confirmation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ConfirmarAgendamentoTucxaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token = "" } = await params;

  let appointment: Awaited<ReturnType<typeof loadTucxaConfirmationAppointment>> = null;
  let initialError = "";

  try {
    appointment = await loadTucxaConfirmationAppointment(token);

    if (!appointment) {
      initialError = "Link de confirmação inválido ou não localizado.";
    }
  } catch (error) {
    console.error("[TUCXA confirmação page]", error);
    initialError = "Não foi possível validar este link agora. Tente novamente em instantes.";
  }

  return (
    <ConfirmationClient
      token={token}
      initialAppointment={appointment}
      initialError={initialError}
    />
  );
}
