import { NextResponse } from "next/server";

export function middleware() {
  // A autorização das áreas privadas é feita pelas próprias páginas/rotas
  // com Supabase Auth + RLS. O middleware permanece sem redirecionamentos
  // para não quebrar links profundos e fluxos de recuperação de senha.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/solucoes/organizacao-em-harmonia/:path*",
    "/solucoes/caixa-claro/:path*",
  ],
};
