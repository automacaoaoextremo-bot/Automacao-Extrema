import { NextRequest, NextResponse } from "next/server";
import { buildAeWhatsAppUrl } from "@/lib/ae-public-links";

export const dynamic = "force-dynamic";

const defaultMessage =
  "Olá! Conheci a Automação Extrema e quero fazer um diagnóstico rápido para entender onde meu negócio perde tempo, dinheiro ou controle.";

const messages: Record<string, string> = {
  bni: defaultMessage,
  site: defaultMessage,
  diagnostico: defaultMessage,
};

export function GET(request: NextRequest) {
  const origem = request.nextUrl.searchParams.get("origem") || "site";
  const message = messages[origem] ?? defaultMessage;

  return NextResponse.redirect(buildAeWhatsAppUrl(message));
}
