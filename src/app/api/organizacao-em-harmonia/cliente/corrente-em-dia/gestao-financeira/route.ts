import { NextResponse } from "next/server";
import { buildLiveFinancialTransparency } from "@/lib/organizacao-em-harmonia/live-financial-transparency";
import { getFinancialAuthContext } from "@/lib/organizacao-em-harmonia/financial-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
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
            : "Erro ao carregar a Gestão Financeira.",
      },
      { status: 500 },
    );
  }
}
