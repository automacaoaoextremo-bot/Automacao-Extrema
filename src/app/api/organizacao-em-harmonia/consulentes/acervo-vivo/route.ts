import { NextResponse } from "next/server";
import {
  getAcervoReaderContext,
  handleAcervoReaderPost,
  loadAcervoReaderPayload,
} from "@/lib/organizacao-em-harmonia/acervo-vivo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await getAcervoReaderContext(request);
  if (!access.ok) return access.response;
  if (access.context.profile !== "consulente") {
    return NextResponse.json({ error: "Este acesso não pertence ao painel do Filho de Fora/Consulente." }, { status: 403 });
  }

  try {
    return NextResponse.json(await loadAcervoReaderPayload(access.context));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar o Acervo Vivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleAcervoReaderPost(request, "consulente");
}
