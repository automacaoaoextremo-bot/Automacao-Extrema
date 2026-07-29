import { inflateRawSync } from "node:zlib";
import { asNumber, asText } from "@/lib/organizacao-em-harmonia/corrente-financeiro";

export type ParsedImport = {
  headers: string[];
  rows: Array<Record<string, string>>;
  sheetName?: string;
  warnings: string[];
};

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseDelimitedLine(line: string, separator: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === separator && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string): ParsedImport {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [], warnings: ["Arquivo sem linhas."] };

  const first = lines[0] ?? "";
  const separator = first.split(";").length > first.split(",").length ? ";" : ",";
  const rawHeaders = parseDelimitedLine(first, separator);
  const headers = rawHeaders.map((header, index) => normalizeHeader(header) || `coluna_${index + 1}`);

  const rows = lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, separator);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });

  return { headers, rows, warnings: [] };
}

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
};

function readZipEntries(buffer: Buffer) {
  let eocd = -1;
  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 65557); index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("Arquivo XLSX inválido: diretório ZIP não localizado.");

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map<string, ZipEntry>();
  let cursor = centralOffset;

  for (let count = 0; count < totalEntries; count += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Arquivo XLSX inválido: entrada central corrompida.");
    }
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");

    entries.set(name, { name, method, compressedSize, localOffset });
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  function extract(name: string) {
    const entry = entries.get(name);
    if (!entry) return null;
    const offset = entry.localOffset;
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      throw new Error(`Arquivo XLSX inválido: cabeçalho local ausente em ${name}.`);
    }
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const start = offset + 30 + fileNameLength + extraLength;
    const compressed = buffer.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method === 8) return inflateRawSync(compressed);
    throw new Error(`Compressão XLSX não suportada: método ${entry.method}.`);
  }

  return { entries, extract };
}

function columnIndex(reference: string) {
  const letters = reference.replace(/\d/g, "").toUpperCase();
  let result = 0;
  for (const char of letters) result = result * 26 + char.charCodeAt(0) - 64;
  return Math.max(0, result - 1);
}

function cellValue(cellXml: string, sharedStrings: string[]) {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1] ?? "";
  if (type === "inlineStr") {
    const text = Array.from(cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))
      .map((match) => decodeXml(match[1] ?? ""))
      .join("");
    return text;
  }

  const raw = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
  if (type === "s") return sharedStrings[Number(raw)] ?? "";
  if (type === "b") return raw === "1" ? "Sim" : "Não";
  return decodeXml(raw);
}

export function parseXlsx(buffer: Buffer): ParsedImport {
  const zip = readZipEntries(buffer);
  const sharedXml = zip.extract("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedMatches = Array.from(
    sharedXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g),
  ) as RegExpMatchArray[];
  const sharedStrings = sharedMatches.map((match) => {
    const textMatches = Array.from(
      (match[1] ?? "").matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g),
    ) as RegExpMatchArray[];
    return textMatches
      .map((part) => decodeXml(part[1] ?? ""))
      .join("");
  });

  const workbookXml = zip.extract("xl/workbook.xml")?.toString("utf8") ?? "";
  const relationshipsXml =
    zip.extract("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";

  const sheetMatch = workbookXml.match(
    /<sheet[^>]*name="([^"]+)"[^>]*(?:r:id|id)="([^"]+)"[^>]*\/?>/,
  );
  const sheetName = decodeXml(sheetMatch?.[1] ?? "Planilha 1");
  const relationshipId = sheetMatch?.[2] ?? "";

  let target = relationshipsXml.match(
    new RegExp(`<Relationship[^>]*Id="${relationshipId}"[^>]*Target="([^"]+)"`),
  )?.[1];

  if (!target) {
    target = Array.from(zip.entries.keys()).find((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  } else {
    target = target.replace(/^\//, "");
    if (!target.startsWith("xl/")) target = `xl/${target.replace(/^\.\//, "")}`;
  }

  if (!target) throw new Error("Arquivo XLSX sem planilha reconhecível.");

  const sheetXml = zip.extract(target)?.toString("utf8") ?? "";
  const rawRows: string[][] = [];

  for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    const rowXml = rowMatch[1] ?? "";
    for (const cellMatch of rowXml.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1] ?? "";
      const reference = attrs.match(/\br="([^"]+)"/)?.[1] ?? "";
      const index = reference ? columnIndex(reference) : row.length;
      while (row.length <= index) row.push("");
      row[index] = cellValue(`<c${attrs}>${cellMatch[2] ?? ""}</c>`, sharedStrings);
    }
    rawRows.push(row);
  }

  const rawHeaders = rawRows[0] ?? [];
  const headers = rawHeaders.map((header, index) => normalizeHeader(header) || `coluna_${index + 1}`);
  const rows = rawRows.slice(1).map((values) =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {}),
  );

  return { headers, rows, sheetName, warnings: [] };
}

function ofxTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
  return asText(match?.[1]);
}

function ofxDate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseOfx(text: string): ParsedImport {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const headers = ["data", "descricao", "valor", "tipo", "fitid"];
  const rows = blocks.map((block) => {
    const amount = asNumber(ofxTag(block, "TRNAMT"));
    const name = ofxTag(block, "NAME");
    const memo = ofxTag(block, "MEMO");
    return {
      data: ofxDate(ofxTag(block, "DTPOSTED")),
      descricao: [name, memo].filter(Boolean).join(" - "),
      valor: String(Math.abs(amount)),
      tipo: amount >= 0 ? "credito" : "debito",
      fitid: ofxTag(block, "FITID"),
    };
  });

  return {
    headers,
    rows,
    warnings: rows.length === 0 ? ["Nenhuma transação OFX localizada."] : [],
  };
}

export function parseFinancialFile(input: {
  fileName: string;
  mimeType?: string;
  buffer: Buffer;
}): ParsedImport {
  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "xlsx") return parseXlsx(input.buffer);
  if (extension === "ofx") return parseOfx(input.buffer.toString("utf8"));
  return parseCsv(input.buffer.toString("utf8"));
}

export function googleSheetsCsvUrl(value: string, tab?: string) {
  const url = new URL(value);
  if (url.hostname !== "docs.google.com") {
    throw new Error("Informe uma URL do Google Sheets.");
  }

  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match?.[1]) throw new Error("Não foi possível identificar a planilha.");

  const gid =
    url.searchParams.get("gid") ||
    url.hash.match(/gid=(\d+)/)?.[1] ||
    asText(tab) ||
    "0";

  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}
