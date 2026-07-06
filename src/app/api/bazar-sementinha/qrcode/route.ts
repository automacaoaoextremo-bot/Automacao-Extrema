import { NextResponse } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = String(searchParams.get("text") || "").trim();

  if (!text) {
    return NextResponse.json({ error: "Texto obrigatório para gerar QRCode." }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json({ error: "Texto muito longo para gerar QRCode." }, { status: 400 });
  }

  const png = await QRCode.toBuffer(text, {
    type: "png",
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
