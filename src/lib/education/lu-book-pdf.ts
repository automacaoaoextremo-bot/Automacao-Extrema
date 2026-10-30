import "server-only";
import QRCode from "qrcode";
import { deflateSync } from "node:zlib";
import { LU_BASE_PATH, luTracks } from "@/lib/education/lu-pilot";

const W = 595.28;
const H = 841.89;
const BASE_URL = `https://www.automacaoextrema.com${LU_BASE_PATH}`;

type ImageForPdf = { trackId: string; jpeg: Buffer; width: number; height: number };
type BookPage = { content: string; images?: { ref: number; name: string }[]; links?: number[] };

const special: Record<string, number> = { "€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"•":149,"–":150,"—":151,"‘":145,"’":146,"“":147,"”":148 };
function hex(value: string): string {
  return Array.from(value).map((c) => {
    const code = c.codePointAt(0) || 63;
    return (code <= 255 ? code : special[c] ?? 63).toString(16).padStart(2, "0");
  }).join("");
}
function txt(value: string, x: number, y: number, size = 12, bold = false): string {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm <${hex(value)}> Tj ET\n`;
}
function box(x: number, y: number, w: number, h: number, fill = "0.94 0.97 0.94"): string {
  return `q ${fill} rg ${x} ${y} ${w} ${h} re f Q\n`;
}
function qr(url: string, x: number, y: number, size: number): string {
  const code = QRCode.create(url, { errorCorrectionLevel: "M" });
  const cells = code.modules.size;
  const padding = size * 0.115;
  const dim = size - padding * 2;
  const sq = dim / cells;
  let shape = box(x, y, size, size, "1 1 1");
  shape += "q 0.06 0.27 0.27 rg\n";
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      if (code.modules.get(col, row)) {
        shape += `${(x + padding + col * sq).toFixed(3)} ${(y + padding + (cells - row - 1) * sq).toFixed(3)} ${(sq + 0.003).toFixed(3)} ${(sq + 0.003).toFixed(3)} re\n`;
      }
    }
  }
  return shape + "f Q\n";
}
function linkAnnotation(url: string, x: number, y: number, w: number, h: number): string {
  // Destino gerado somente a partir de URL constante + ID validado.
  const safe = url.replace(/[()\\]/g, "");
  return `<< /Type /Annot /Subtype /Link /Rect [${x} ${y} ${x+w} ${y+h}] /Border [0 0 0] /A << /S /URI /URI (${safe}) >> >>`;
}

/** Livro A4: capa/apresentacao + indice (12 QRs) + uma pagina por cantiga. */
export function buildLuBookPdf(orderedIds: string[], pictures: ImageForPdf[]): Buffer {
  const allowed = new Set<string>(luTracks.map((t) => t.id));
  if (orderedIds.length !== 12 || new Set(orderedIds).size !== 12 || !orderedIds.every((id) => allowed.has(id))) {
    throw new Error("Ordem do livro invalida.");
  }
  const imageMap = new Map(pictures.map((p) => [p.trackId, p]));
  if (imageMap.size !== 12 || orderedIds.some((id) => !imageMap.has(id))) {
    throw new Error("Todas as 12 ilustracoes aprovadas sao obrigatorias para o PDF final.");
  }

  const objects: Buffer[] = [Buffer.alloc(0)];
  const add = (value: Buffer | string): number => {
    objects.push(typeof value === "string" ? Buffer.from(value, "latin1") : value);
    return objects.length - 1;
  };
  const catalog = add("");
  const rootPages = add("");
  const regular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageRefs: number[] = [];

  function page(arg: BookPage) {
    const content = deflateSync(Buffer.from(arg.content, "latin1"), { level: 8 });
    const contentsRef = add(Buffer.concat([
      Buffer.from(`<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`),
      content, Buffer.from("\nendstream")
    ]));
    const imgResources = (arg.images || []).map((it) => `/${it.name} ${it.ref} 0 R`).join(" ");
    const annots = arg.links?.length ? `/Annots [${arg.links.map((n) => `${n} 0 R`).join(" ")}]` : "";
    pageRefs.push(add(`<< /Type /Page /Parent ${rootPages} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> /XObject << ${imgResources} >> >> /Contents ${contentsRef} 0 R ${annots} >>`));
  }
  function annotation(url: string, x: number, y: number, w: number, h: number): number {
    return add(linkAnnotation(url, x, y, w, h));
  }
  function footer(current: number): string {
    return box(48, 61, 500, 1.5, "0.78 0.88 0.82") +
      txt("MEMORIAS QUE ENCANTAM  |  PROFESSORA LU - 2026", 48, 43, 9) +
      txt(`${current} / 14`, 505, 43, 9);
  }

  // Pagina 1: apresentacao + QR geral.
  let cover = box(0, 0, W, H, "0.99 0.99 0.96");
  cover += box(0, 700, W, 142, "0.86 0.95 0.89");
  cover += txt("NOSSO LIVRO MUSICAL", 86, 759, 27, true);
  cover += txt("Memorias que Encantam  |  Professora Lu - 2026", 90, 727, 12);
  cover += txt("Cada cantiga guarda um momento especial da nossa turma.", 74, 656, 13);
  cover += txt("As vozes e os desenhos tornam estas lembrancas ainda mais vivas.", 74, 633, 13);
  cover += txt("Aponte a camera do celular para ouvir as musicas do livro:", 74, 598, 12);
  cover += qr(BASE_URL, 191, 294, 213);
  cover += txt("Acesse as 12 cantigas no livro digital", 173, 264, 12, true);
  cover += txt("Produzido com carinho para guardar, ouvir e compartilhar.", 96, 196, 12);
  cover += footer(1);
  page({ content: cover, links: [annotation(BASE_URL, 191, 294, 213, 213)] });

  // Pagina 2: indice com doze QRs, cada um com sua URL permanente.
  let index = box(0, 0, W, H, "0.99 0.99 0.96");
  index += txt("INDICE DAS CANTIGAS", 155, 772, 23, true);
  index += txt("Escaneie o codigo de uma musica para ouvi-la no celular.", 116, 743, 11);
  const indexLinks: number[] = [];
  orderedIds.forEach((id, n) => {
    const track = luTracks.find((t) => t.id === id)!;
    const col = n % 3;
    const row = Math.floor(n / 3);
    const x = 48 + col * 173;
    const y = 592 - row * 160;
    const target = `${BASE_URL}?musica=${id}`;
    index += box(x, y - 35, 155, 160, "0.92 0.97 0.93");
    index += qr(target, x + 32, y + 16, 89);
    index += txt(`${n + 1}. ${track.title}`, x + 7, y - 8, 9.8, true);
    indexLinks.push(annotation(target, x + 32, y + 16, 89, 89));
  });
  index += footer(2);
  page({ content: index, links: indexLinks });

  // Paginas 3 a 14: uma ilustracao validada e um QR permanente por cantiga.
  orderedIds.forEach((id, n) => {
    const track = luTracks.find((t) => t.id === id)!;
    const picture = imageMap.get(id)!;
    if (picture.width < 1 || picture.height < 1 || picture.jpeg.length < 50) {
      throw new Error(`Ilustracao invalida: ${id}`);
    }
    const imageRef = add(Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${picture.width} /Height ${picture.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${picture.jpeg.length} >>\nstream\n`),
      picture.jpeg, Buffer.from("\nendstream")
    ]));
    let s = box(0, 0, W, H, "0.99 0.99 0.96");
    s += box(0, 723, W, 119, "0.86 0.95 0.89");
    s += txt(`${String(n + 1).padStart(2,"0")}  |  ${track.title}`, 57, 772, 22, true);
    s += txt("Desenho da turma", 59, 745, 11);
    const maxWidth = 475, maxHeight = 475;
    const zoom = Math.min(maxWidth / picture.width, maxHeight / picture.height);
    const width = picture.width * zoom, height = picture.height * zoom;
    const imgX = (W - width) / 2, imgY = 215 + (maxHeight - height) / 2;
    s += box(50, 211, 495, 485, "1 1 1");
    s += `q ${width.toFixed(3)} 0 0 ${height.toFixed(3)} ${imgX.toFixed(3)} ${imgY.toFixed(3)} cm /Im1 Do Q\n`;
    const destination = `${BASE_URL}?musica=${id}`;
    s += qr(destination, 72, 81, 111);
    s += txt("Escaneie para ouvir esta cantiga", 202, 153, 13, true);
    s += txt("A musica abre no livro digital da turma.", 202, 129, 10);
    s += footer(n + 3);
    page({ content: s, images: [{ ref: imageRef, name: "Im1" }], links: [annotation(destination, 72, 81, 111, 111)] });
  });

  objects[catalog] = Buffer.from(`<< /Type /Catalog /Pages ${rootPages} 0 R >>`);
  objects[rootPages] = Buffer.from(`<< /Type /Pages /Kids [${pageRefs.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
  const out: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [0];
  let length = out[0].length;
  objects.slice(1).forEach((object, i) => {
    offsets.push(length);
    const part = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), object, Buffer.from("\nendobj\n")]);
    out.push(part);
    length += part.length;
  });
  const xrefAt = length;
  out.push(Buffer.from([
    `xref\n0 ${objects.length}\n0000000000 65535 f \n`,
    ...offsets.slice(1).map((n) => `${String(n).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  ].join(""), "latin1"));
  return Buffer.concat(out);
}
