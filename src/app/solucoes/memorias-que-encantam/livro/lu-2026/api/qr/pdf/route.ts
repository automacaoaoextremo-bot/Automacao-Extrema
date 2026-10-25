import { NextRequest, NextResponse } from "next/server";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { buildLuQrPdf } from "@/lib/education/lu-qr-pdf";
import { luTracks } from "@/lib/education/lu-pilot";
import { getLuTrackOrder } from "@/lib/education/lu-track-order";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!(await hasLuAdminAccess())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const selection = request.nextUrl.searchParams.get("selecao") || "geral";
  if (selection !== "geral" && selection !== "todas" && !luTracks.some((t) => t.id === selection))
    return NextResponse.json({ error: "Seleção inválida" }, { status: 400 });
  try {
    const orderedIds = selection === "todas" ? await getLuTrackOrder() : undefined;
    const pdf = buildLuQrPdf(selection, orderedIds);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lu-2026-qr-${selection}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o PDF" }, { status: 500 });
  }
}
