import { NextResponse } from "next/server";

const CONFIRMATION_BASE = "/solucoes/organizacao-em-harmonia/tucxa/confirmar-agendamento";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const safeToken = encodeURIComponent(token || "");
  return NextResponse.redirect(new URL(`${CONFIRMATION_BASE}/${safeToken}`, request.url), 307);
}
