import { NextResponse } from "next/server";
import { buildLiveFinancialTransparency } from "@/lib/organizacao-em-harmonia/live-financial-transparency";
import { getFinancialAuthContext } from "@/lib/organizacao-em-harmonia/financial-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "view");
    if (!auth.ok) return auth.response;

    return NextResponse.json({
      canManage: auth.context.canManage,
      live: await buildLiveFinancialTransparency(auth.context.organizationId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao preparar a prestação de contas.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "A prestação de contas agora usa os dados financeiros em tempo real. Não é mais necessário publicar snapshots manualmente.",
    },
    { status: 410 },
  );
}
