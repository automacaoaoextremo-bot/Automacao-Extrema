import { normalizeText } from "@/lib/caixa-claro";

export type BtgImportTransaction = {
  occurredAt: string;
  categoryRaw: string | null;
  transactionRaw: string | null;
  description: string;
  amountCents: number;
  kind: "income" | "expense" | "transfer" | "uncategorized";
  externalHash: string;
};

export type BtgBalanceSnapshot = {
  snapshotDate: string;
  balanceCents: number;
};

export type BtgImportResult = {
  transactions: BtgImportTransaction[];
  balances: BtgBalanceSnapshot[];
  ignoredRows: number;
  statementPeriod: string | null;
  holderName: string | null;
};

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function readUInt16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function readUInt32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function findEndOfCentralDirectory(view: DataView) {
  const signature = 0x06054b50;
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (readUInt32(view, offset) === signature) return offset;
  }
  throw new Error("Arquivo XLSX inválido: diretório ZIP não encontrado.");
}

function listZipEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const eocd = findEndOfCentralDirectory(view);
  const totalEntries = readUInt16(view, eocd + 10);
  let offset = readUInt32(view, eocd + 16);
  const decoder = new TextDecoder("utf-8");
  const entries = new Map<string, ZipEntry>();

  for (let index = 0; index < totalEntries; index += 1) {
    if (readUInt32(view, offset) !== 0x02014b50) {
      throw new Error("Arquivo XLSX inválido: cabeçalho ZIP central inconsistente.");
    }
    const compression = readUInt16(view, offset + 10);
    const compressedSize = readUInt32(view, offset + 20);
    const fileNameLength = readUInt16(view, offset + 28);
    const extraLength = readUInt16(view, offset + 30);
    const commentLength = readUInt16(view, offset + 32);
    const localHeaderOffset = readUInt32(view, offset + 42);
    const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
    const name = decoder.decode(nameBytes);

    entries.set(name, { name, compression, compressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflateRaw(data: Uint8Array) {
  if (!("DecompressionStream" in globalThis)) {
    throw new Error("Seu navegador não oferece descompressão nativa necessária para ler XLSX. Use Chrome ou Edge atualizado para importar o XLSX.");
  }

  // Cria uma cópia com buffer garantidamente do tipo ArrayBuffer.
  // Em TypeScript 5.8+, Uint8Array pode usar ArrayBufferLike
  // (incluindo SharedArrayBuffer), que não é aceito diretamente como BlobPart.
  const blobData = new Uint8Array(data.byteLength);
  blobData.set(data);

  const stream = new Blob([blobData.buffer])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntry(buffer: ArrayBuffer, entry: ZipEntry) {
  const view = new DataView(buffer);
  const offset = entry.localHeaderOffset;
  if (readUInt32(view, offset) !== 0x04034b50) {
    throw new Error(`Arquivo XLSX inválido ao abrir ${entry.name}.`);
  }
  const fileNameLength = readUInt16(view, offset + 26);
  const extraLength = readUInt16(view, offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraLength;
  const compressed = new Uint8Array(buffer, dataOffset, entry.compressedSize);

  if (entry.compression === 0) return compressed.slice();
  if (entry.compression === 8) return inflateRaw(compressed);
  throw new Error(`Método de compressão ZIP não suportado (${entry.compression}).`);
}

function columnIndex(cellRef: string) {
  const letters = cellRef.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let value = 0;
  for (const char of letters) value = value * 26 + (char.charCodeAt(0) - 64);
  return value - 1;
}

function xmlText(xml: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("XML inválido dentro do arquivo XLSX.");
  return document;
}

function sharedStringsFromXml(xml: string | null) {
  if (!xml) return [];
  const document = xmlText(xml);
  return Array.from(document.getElementsByTagNameNS("*", "si")).map((node) => node.textContent ?? "");
}

function rowsFromSheetXml(xml: string, sharedStrings: string[]) {
  const document = xmlText(xml);
  const output: unknown[][] = [];
  const rowNodes = Array.from(document.getElementsByTagNameNS("*", "row"));

  for (const rowNode of rowNodes) {
    const rowNumber = Number(rowNode.getAttribute("r") ?? output.length + 1);
    const rowIndex = Math.max(0, rowNumber - 1);
    const row: unknown[] = output[rowIndex] ?? [];

    for (const cell of Array.from(rowNode.getElementsByTagNameNS("*", "c"))) {
      const ref = cell.getAttribute("r") ?? "A1";
      const index = columnIndex(ref);
      const type = cell.getAttribute("t") ?? "n";
      const valueNode = cell.getElementsByTagNameNS("*", "v")[0];
      const inlineNode = cell.getElementsByTagNameNS("*", "is")[0];
      const raw = valueNode?.textContent ?? "";

      let value: unknown = null;
      if (type === "inlineStr") value = inlineNode?.textContent ?? "";
      else if (type === "s") value = sharedStrings[Number(raw)] ?? "";
      else if (type === "str") value = raw;
      else if (raw !== "") {
        const numeric = Number(raw);
        value = Number.isFinite(numeric) ? numeric : raw;
      }
      row[index] = value;
    }

    output[rowIndex] = row;
  }

  return output;
}

function valueToDate(value: unknown) {
  if (value instanceof Date) return value;
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (match) {
    const [, dd, mm, yyyy, hh = "00", min = "00"] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const milliseconds = Math.round(value * 86_400_000);
    return new Date(excelEpoch + milliseconds);
  }
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function moneyToCents(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  const text = String(value ?? "")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const number = Number(text);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function classify(category: string, transaction: string, description: string, cents: number) {
  const raw = normalizeText(`${category} ${transaction} ${description}`);

  if (raw.includes("saldo diario")) return "balance" as const;
  if (raw.includes("pagamento de fatura") || raw.includes("fatura do cartao")) return "expense" as const;
  if (
    raw.includes("pix") ||
    raw.includes("transferencia") ||
    raw.includes("investimento") ||
    raw.includes("aplicacao") ||
    raw.includes("resgate")
  ) {
    return "transfer" as const;
  }
  if (cents < 0) return "expense" as const;
  if (cents > 0) return "income" as const;
  return "uncategorized" as const;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function findHeaderIndex(row: unknown[], label: string) {
  const normalized = normalizeText(label);
  return row.findIndex((cell) => normalizeText(String(cell ?? "")) === normalized);
}

function findMeta(rows: unknown[][], label: string) {
  const normalized = normalizeText(label);
  for (const row of rows.slice(0, 12)) {
    for (let index = 0; index < row.length; index += 1) {
      if (normalizeText(String(row[index] ?? "")) === normalized) {
        return String(row[index + 1] ?? "").trim() || null;
      }
    }
  }
  return null;
}

export async function parseBtgStatement(file: File): Promise<BtgImportResult> {
  const buffer = await file.arrayBuffer();
  const entries = listZipEntries(buffer);
  const worksheetEntry = [...entries.values()]
    .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))[0];

  if (!worksheetEntry) throw new Error("Nenhuma planilha foi encontrada dentro do XLSX.");

  const decoder = new TextDecoder("utf-8");
  const sheetXml = decoder.decode(await readZipEntry(buffer, worksheetEntry));
  const sharedEntry = entries.get("xl/sharedStrings.xml");
  const sharedXml = sharedEntry ? decoder.decode(await readZipEntry(buffer, sharedEntry)) : null;
  const rows = rowsFromSheetXml(sheetXml, sharedStringsFromXml(sharedXml));

  const headerRowIndex = rows.findIndex((row) => {
    const values = row.map((cell) => normalizeText(String(cell ?? "")));
    return values.includes("data e hora") && values.includes("descricao") && values.includes("valor");
  });

  if (headerRowIndex < 0) {
    throw new Error("Não encontrei o cabeçalho do extrato BTG (Data e hora / Descrição / Valor).");
  }

  const header = rows[headerRowIndex];
  const dateIndex = findHeaderIndex(header, "Data e hora");
  const categoryIndex = findHeaderIndex(header, "Categoria");
  const transactionIndex = findHeaderIndex(header, "Transação");
  const descriptionIndex = findHeaderIndex(header, "Descrição");
  const valueIndex = findHeaderIndex(header, "Valor");

  const transactions: BtgImportTransaction[] = [];
  const balances: BtgBalanceSnapshot[] = [];
  let ignoredRows = 0;

  const dataRows = rows.slice(headerRowIndex + 1);
  for (let dataIndex = 0; dataIndex < dataRows.length; dataIndex += 1) {
    const row = dataRows[dataIndex];
    const sourceRowNumber = headerRowIndex + 2 + dataIndex;
    const date = valueToDate(row[dateIndex]);
    const description = String(row[descriptionIndex] ?? "").trim();
    const cents = moneyToCents(row[valueIndex]);

    if (!date || (!description && cents === 0)) {
      ignoredRows += 1;
      continue;
    }

    const category = String(row[categoryIndex] ?? "").trim();
    const transaction = String(row[transactionIndex] ?? "").trim();
    const kind = classify(category, transaction, description, cents);

    if (kind === "balance") {
      balances.push({ snapshotDate: date.toISOString(), balanceCents: cents });
      continue;
    }

    if (cents === 0) {
      ignoredRows += 1;
      continue;
    }

    const occurredAt = date.toISOString();
    const externalHash = await sha256([sourceRowNumber, occurredAt, category, transaction, description, cents].join("|"));

    transactions.push({
      occurredAt,
      categoryRaw: category || null,
      transactionRaw: transaction || null,
      description: description || transaction || category || "Movimento BTG",
      amountCents: cents,
      kind,
      externalHash,
    });
  }

  return {
    transactions,
    balances,
    ignoredRows,
    statementPeriod: findMeta(rows, "Período do extrato:"),
    holderName: findMeta(rows, "Cliente:"),
  };
}
