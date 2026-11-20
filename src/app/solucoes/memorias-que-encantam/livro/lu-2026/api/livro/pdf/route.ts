import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { hasLuAdminAccess } from "@/lib/education/lu-teacher-auth";
import { getLuProject } from "@/lib/education/lu-storage";
import { getLuTrackOrder } from "@/lib/education/lu-track-order";
import { getLuIllustrations } from "@/lib/education/lu-illustrations";
import { buildLuBookPdf } from "@/lib/education/lu-book-pdf";
import { luTracks } from "@/lib/education/lu-pilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!(await hasLuAdminAccess())) {
    return NextResponse.json({ error: "Acesso docente necessario." }, { status: 401 });
  }
  const pages = request.nextUrl.searchParams.get("paginas") || "14";
  if (pages !== "2" && pages !== "14") {
    return NextResponse.json({ error: "Informe paginas=2 ou paginas=14." }, { status: 400 });
  }
  try {
    const project = await getLuProject();
    if (!project.media_authorized) {
      return NextResponse.json({ error: "Autorize o material da escola antes de gerar o livro." }, { status: 409 });
    }
    const order = await getLuTrackOrder();

    // Versao curta: somente apresentacao e indice, sem buscar imagens privadas.
    if (pages === "2") {
      const pdf = buildLuBookPdf(order, [], "print");
      return new NextResponse(new Uint8Array(pdf), { headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="lu-2026-livro-musical-2-paginas.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      } });
    }

    // Versao completa: mantem a regra anterior de liberacao das ilustracoes.
    if (!project.illustrations_released) {
      return NextResponse.json({ error: "Libere as ilustracoes aprovadas antes de gerar o PDF completo." }, { status: 409 });
    }
    const illustrations = await getLuIllustrations({
      admin: false, publicView: true, authorized: project.media_authorized, released: project.illustrations_released
    });
    const chosen = order.map((id) => illustrations.find((item) => item.track_id === id && item.is_featured && item.url)
      || illustrations.find((item) => item.track_id === id && item.url));
    const missing = order.filter((_, i) => !chosen[i]);
    if (missing.length) {
      const titles = missing.map((id) => luTracks.find((t) => t.id === id)?.title || id);
      return NextResponse.json({ error: `Ilustracoes aprovadas ausentes: ${titles.join(", ")}.` }, { status: 409 });
    }
    // URL assinada emitida pelo Supabase; comparar a origem para nao realizar fetch arbitrario.
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://invalid.local").host;
    const pictures: { trackId: string; jpeg: Buffer; width: number; height: number }[] = [];
    // No maximo tres ilustracoes em paralelo: menor uso de memoria na Vercel.
    for (let offset = 0; offset < order.length; offset += 3) {
      const group = await Promise.all(order.slice(offset, offset + 3).map(async (id, localIndex) => {
      const selected = chosen[offset + localIndex]!;
      const imageUrl = new URL(selected.url!);
      if (imageUrl.protocol !== "https:" || imageUrl.host !== supabaseHost) {
        throw new Error("Origem da imagem nao autorizada");
      }
      const response = await fetch(imageUrl, { cache: "no-store", signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Falha ao obter imagem da musica ${id}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 20 || bytes.length > 10 * 1024 * 1024) throw new Error("Tamanho da imagem invalido");
      const { data, info } = await sharp(bytes, { limitInputPixels: 20_000_000 })
        .rotate().flatten({ background: "#ffffff" })
        .resize({ width: 1100, height: 1100, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 76 }).toBuffer({ resolveWithObject: true });
      return { trackId: id, jpeg: data, width: info.width, height: info.height };
      }));
      pictures.push(...group);
    }
    const pdf = buildLuBookPdf(order, pictures, "complete");
    return new NextResponse(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="lu-2026-livro-musical-14-paginas.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    } });
  } catch (error) {
    console.error("Livro Lu PDF:", error instanceof Error ? error.message : "erro interno");
    return NextResponse.json({ error: "Falha ao gerar o livro. Verifique as ilustracoes e tente novamente." }, { status: 500 });
  }
}
