import { NextResponse } from "next/server";

const CONFIRMATION_BASE = "/solucoes/organizacao-em-harmonia/tucxa/confirmar-agendamento";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const safeToken = encodeURIComponent(token || "");
  const response = NextResponse.redirect(new URL(`${CONFIRMATION_BASE}/${safeToken}`, request.url), 302);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return response;
}
