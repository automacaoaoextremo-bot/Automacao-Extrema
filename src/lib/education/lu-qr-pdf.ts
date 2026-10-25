import "server-only";
import QRCode from "qrcode";
import { deflateSync } from "node:zlib";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";

type Page = { title: string; id?: string };
const ORIGIN = "https://www.automacaoextrema.com";
const PAGE_W = 595;
const PAGE_H = 842;
const QR_X = 105;
const QR_Y = 271;
const QR_SIZE = 385;

// Texto PDF WinAnsi (Helvetica): os titulos em portugues conservam acentos.
function pdfHex(text: string): string {
  const extra: Record<string, number> = { "€": 128, "‚": 130, "ƒ": 131, "„": 132, "…": 133, "†": 134, "‡": 135, "ˆ": 136, "‰": 137, "Š": 138, "‹": 139, "Œ": 140, "Ž": 142, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151, "˜": 152, "™": 153, "š": 154, "›": 155, "œ": 156, "ž": 158, "Ÿ": 159 };
  return Array.from(text).map((c) => {
    const cp = c.codePointAt(0) || 63;
    const value = cp <= 255 ? cp : (extra[c] ?? 63);
    return value.toString(16).padStart(2, "0");
  }).join("");
}
function line(text: string, x: number, y: number, size: number, bold: boolean): string {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm <${pdfHex(text)}> Tj ET\n`;
}

/** PDF vetorial, um QR por página: adequado à impressão sem pixelização. */
export function buildLuQrPdf(selection: "geral" | "todas" | string, orderedIds: string[] = luTracks.map((t) => t.id)): Buffer {
  const pages: Page[] = selection === "todas" ? orderedIds.map((id) => luTracks.find((t) => t.id === id)).filter((t): t is typeof luTracks[number] => Boolean(t)).map(({ id, title }) => ({ id, title })) :
    selection === "geral" ? [{ title: "Nosso Livro Musical" }] :
    luTracks.filter((t) => t.id === selection).map(({ id, title }) => ({ id, title }));
  if (!pages.length) throw new Error("Seleção inválida");

  const objects: Buffer[] = [Buffer.alloc(0)];
  const add = (value: string | Buffer) => { objects.push(typeof value === "string" ? Buffer.from(value, "latin1") : value); return objects.length - 1; };
  const catalogRef = add("");
  const pagesRef = add("");
  const font1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const font2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageRefs: number[] = [];

  pages.forEach(({ title, id }, pageIndex) => {
    const url = new URL(LU_BASE_PATH, ORIGIN);
    if (id) url.searchParams.set("musica", id);
    const code = QRCode.create(url.toString(), { errorCorrectionLevel: "H" });
    const dimension = code.modules.size;
    const square = QR_SIZE / dimension;
    let drawing = "q 0.02 0.24 0.26 rg\n";
    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        if (code.modules.get(x, y)) {
          drawing += `${(QR_X + x * square).toFixed(4)} ${(QR_Y + (dimension - y - 1) * square).toFixed(4)} ${(square + 0.001).toFixed(4)} ${(square + 0.001).toFixed(4)} re\n`;
        }
      }
    }
    drawing += "f Q\n";
    drawing += line("AUTOMACAO EXTREMA - MEMORIAS QUE ENCANTAM", 105, 758, 10, false);
    drawing += line(title, 105, 714, 22, true);
    drawing += line(id ? `Musica ${id} de 12` : "Livro completo - 12 cancoes", 105, 685, 12, false);
    drawing += line("Aponte a camera do celular para o codigo", 105, 239, 12, false);
    drawing += line("Projeto da Lu - 2026", 105, 210, 11, false);
    drawing += line(`${pageIndex + 1} / ${pages.length}`, 500, 70, 10, false);
    const stream = deflateSync(Buffer.from(drawing, "ascii"), { level: 9 });
    const contentRef = add(Buffer.concat([Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`), stream, Buffer.from("\nendstream")]));
    pageRefs.push(add(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentRef} 0 R >>`));
  });
  objects[catalogRef] = Buffer.from(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);
  objects[pagesRef] = Buffer.from(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);

  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.slice(1).forEach((obj, idx) => {
    offsets.push(length);
    const part = Buffer.concat([Buffer.from(`${idx + 1} 0 obj\n`), obj, Buffer.from("\nendobj\n")]);
    chunks.push(part); length += part.length;
  });
  const xrefStart = length;
  const xref = [`xref\n0 ${objects.length}\n0000000000 65535 f \n`, ...offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  chunks.push(Buffer.from(xref + `trailer\n<< /Size ${objects.length} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`));
  return Buffer.concat(chunks);
}
