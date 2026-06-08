import { NextRequest, NextResponse } from "next/server";
import { buildAeWhatsAppUrl } from "@/lib/ae-public-links";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  bni: "Olá! Conheci a Automação Extrema no contexto do BNI e quero fazer um diagnóstico rápido para entender onde meu negócio perde tempo, dinheiro ou controle.",
  site: "Olá! Vi o site da Automação Extrema e quero entender onde posso perder menos tempo, dinheiro ou controle com processos manuais.",
};

export function GET(request: NextRequest) {
  const origem = request.nextUrl.searchParams.get("origem") || "site";
  const message = messages[origem] ?? messages.site;

  return NextResponse.redirect(buildAeWhatsAppUrl(message));
}
