import { NextResponse } from "next/server";
import { buildFinancialAnalysisBase } from "@/lib/organizacao-em-harmonia/financial-analysis";
import { getFinancialAuthContext } from "@/lib/organizacao-em-harmonia/financial-auth";
import { buildLiveFinancialTransparency } from "@/lib/organizacao-em-harmonia/live-financial-transparency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getFinancialAuthContext(request, "manage");
  if (!auth.ok) return auth.response;

  try {
    const [live, analysisBase] = await Promise.all([
      buildLiveFinancialTransparency(auth.context.organizationId),
      buildFinancialAnalysisBase(auth.context.organizationId),
    ]);

    return NextResponse.json({
      live,
      analysisBase,
      currentPerson: {
        fullName: auth.context.personName,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as análises financeiras.",
      },
      { status: 500 },
    );
  }
}
