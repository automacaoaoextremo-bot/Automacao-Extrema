import { NextResponse } from "next/server";

export function middleware() {
  // A autorização da Organização em Harmonia é feita nas páginas/rotas com Supabase.
  // Este middleware fica intencionalmente sem redirecionamentos para não quebrar links
  // profundos como /cliente/simular-acesso/[personId].
  return NextResponse.next();
}

export const config = {
  matcher: ["/solucoes/organizacao-em-harmonia/:path*"],
};
