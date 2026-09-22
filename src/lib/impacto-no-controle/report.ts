import { Buffer } from "node:buffer";

export type ContributionReportRow = {
  createdAt: string | null;
  participantName: string;
  phone: string | null;
  email: string | null;
  numbers: string;
  amount: string;
  paymentMethod: string;
  paymentOccurredAt: string | null;
  payerMatchesParticipant: string;
  payerName: string | null;
  status: string;
  approvedAt: string | null;
};

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function makeZip(entries: Array<{ name: string; data: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // store, sem compressao
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuffer, end]);
}

export function buildContributionXlsx(rows: ContributionReportRow[]) {
  const headers = [
    "Data da reserva",
    "Participante",
    "Celular",
    "E-mail",
    "Números",
    "Valor",
    "Forma de pagamento",
    "Data/hora do pagamento",
    "Pagador é o participante?",
    "Nome do pagador",
    "Status",
    "Data da aprovação",
  ];

  const values = rows.map((row) => [
    row.createdAt || "",
    row.participantName,
    row.phone || "",
    row.email || "",
    row.numbers,
    row.amount,
    row.paymentMethod,
    row.paymentOccurredAt || "",
    row.payerMatchesParticipant,
    row.payerName || "",
    row.status,
    row.approvedAt || "",
  ]);

  const allRows = [headers, ...values];
  const xmlRows = allRows
    .map((cells, rowIndex) => {
      const xmlCells = cells
        .map((cell, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          const style = rowIndex === 0 ? ' s="1"' : "";
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${xmlCells}</row>`;
    })
    .join("");

  const widths = [19, 28, 17, 30, 18, 14, 21, 22, 23, 28, 24, 22];
  const cols = widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("");

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${xmlRows}</sheetData>
  <autoFilter ref="A1:L${Math.max(1, allRows.length)}"/>
</worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const entries = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`, "utf8"),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`, "utf8"),
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Contribuicoes" sheetId="1" r:id="rId1"/></sheets>
</workbook>`, "utf8"),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`, "utf8"),
    },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(worksheet, "utf8") },
    { name: "xl/styles.xml", data: Buffer.from(styles, "utf8") },
  ];

  return makeZip(entries);
}

function pdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(value: string, maxChars: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildContributionPdf(input: {
  campaignTitle: string;
  generatedAt: string;
  rows: ContributionReportRow[];
}) {
  const pageWidth = 842;
  const pageHeight = 595;
  const marginX = 42;
  const top = 548;
  const lineHeight = 13;
  const rowsPerPage = 12;
  const pages: string[][] = [];

  for (let start = 0; start < input.rows.length || start === 0; start += rowsPerPage) {
    const slice = input.rows.slice(start, start + rowsPerPage);
    const lines: string[] = [
      `Relatorio de contribuicoes - ${input.campaignTitle}`,
      `Gerado em: ${input.generatedAt}`,
      "",
    ];

    if (!slice.length) {
      lines.push("Nenhuma contribuicao encontrada.");
    }

    for (const row of slice) {
      lines.push(`${row.createdAt || "-"} | ${row.participantName} | ${row.amount} | ${row.status}`);
      lines.push(`Numeros: ${row.numbers || "-"} | Pagamento: ${row.paymentMethod} | Data/hora: ${row.paymentOccurredAt || "-"}`);
      lines.push(`Pagador: ${row.payerName || "-"} | Mesmo participante: ${row.payerMatchesParticipant} | Aprovacao: ${row.approvedAt || "-"}`);
      lines.push("");
    }

    pages.push(lines.flatMap((line) => wrapLine(line, 116)));
  }

  const objects: Buffer[] = [];
  const pageObjectNumbers: number[] = [];
  let nextObject = 4;

  for (const lines of pages) {
    const pageObject = nextObject;
    const contentObject = nextObject + 1;
    nextObject += 2;
    pageObjectNumbers.push(pageObject);

    const y = top;
    const commands = ["BT", "/F1 9 Tf", `1 0 0 1 ${marginX} ${y} Tm`];
    lines.forEach((line, index) => {
      if (index > 0) commands.push(`0 -${lineHeight} Td`);
      commands.push(`(${pdfText(line)}) Tj`);
    });
    commands.push("ET");
    const stream = Buffer.from(commands.join("\n"), "latin1");

    objects[pageObject] = Buffer.from(
      `${pageObject} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>\nendobj\n`,
      "latin1",
    );
    objects[contentObject] = Buffer.concat([
      Buffer.from(`${contentObject} 0 obj\n<< /Length ${stream.length} >>\nstream\n`, "latin1"),
      stream,
      Buffer.from("\nendstream\nendobj\n", "latin1"),
    ]);
  }

  objects[1] = Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "latin1");
  objects[2] = Buffer.from(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>\nendobj\n`,
    "latin1",
  );
  objects[3] = Buffer.from("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n", "latin1");

  const header = Buffer.from("%PDF-1.4\n%âãÏÓ\n", "latin1");
  const ordered = objects.map((object, index) => (index === 0 ? null : object)).filter(Boolean) as Buffer[];
  const offsets: number[] = [0];
  let cursor = header.length;
  for (let index = 1; index < objects.length; index += 1) {
    const object = objects[index];
    if (!object) continue;
    offsets[index] = cursor;
    cursor += object.length;
  }

  const body = Buffer.concat(ordered);
  const xrefOffset = header.length + body.length;
  const size = objects.length;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let index = 1; index < size; index += 1) {
    const offset = offsets[index] || 0;
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.concat([header, body, Buffer.from(xref + trailer, "latin1")]);
}
