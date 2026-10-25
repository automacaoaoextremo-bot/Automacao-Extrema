import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** QR permanente: não aponta para Preview e não usa posição na lista. */
const SITE_ORIGIN = "https://www.automacaoextrema.com";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("musica");
  if (id !== null && !luTracks.some((track) => track.id === id)) {
    return NextResponse.json({ error: "Música inválida" }, { status: 400 });
  }
  const url = new URL(LU_BASE_PATH, SITE_ORIGIN);
  if (id) url.searchParams.set("musica", id);
  const png = await QRCode.toBuffer(url.toString(), {
    type: "png", width: 720, margin: 3, errorCorrectionLevel: "H",
    color: { dark: "#073E43", light: "#FFFFFF" },
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="lu-2026-${id ? `musica-${id}` : "livro-completo"}.png"`,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
