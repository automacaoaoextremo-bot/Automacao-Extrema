import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  asNumber,
  asText,
  monthKey,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import {
  googleSheetsCsvUrl,
  parseFinancialFile,
} from "@/lib/organizacao-em-harmonia/financial-import";
import {
  getFinancialAuthContext,
  writeFinancialAudit,
} from "@/lib/organizacao-em-harmonia/financial-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Mapping = {
  date?: string;
  description?: string;
  amount?: string;
  entryType?: string;
  category?: string;
  paymentMethod?: string;
  account?: string;
  status?: string;
};

function validCalendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function dateParts(year: string, month: string, day: string) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!validCalendarDate(y, m, d)) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeDate(value: unknown) {
  const text = asText(value);
  if (!text) return "";

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return dateParts(iso[1], iso[2], iso[3]);

  const br = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (br) return dateParts(br[3], br[2], br[1]);

  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30 + serial));
    return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

function rowValue(row: Record<string, unknown>, key: string | undefined) {
  return key ? row[key] : undefined;
}

function autoColumn(headers: string[], candidates: string[]) {
  return (
    headers.find((header) =>
      candidates.some(
        (candidate) =>
          header === candidate ||
          header.includes(candidate) ||
          candidate.includes(header),
      ),
    ) ?? ""
  );
}

function suggestedMapping(headers: string[]): Mapping {
  return {
    date: autoColumn(headers, [
      "data",
      "entry_date",
      "date",
      "dtposted",
      "competencia",
    ]),
    description: autoColumn(headers, [
      "descricao",
      "historico",
      "memo",
      "name",
      "description",
      "fornecedor",
      "origem",
    ]),
    amount: autoColumn(headers, [
      "valor",
      "amount",
      "trnamt",
      "total",
      "receita",
      "despesa",
    ]),
    entryType: autoColumn(headers, [
      "tipo",
      "entry_type",
      "natureza",
      "credito_debito",
    ]),
    category: autoColumn(headers, [
      "categoria",
      "category",
      "grupo",
      "classificacao",
    ]),
    paymentMethod: autoColumn(headers, [
      "forma_pagamento",
      "payment_method",
      "forma",
      "meio",
    ]),
    account: autoColumn(headers, [
      "conta",
      "account",
      "banco",
      "carteira",
    ]),
    status: autoColumn(headers, ["status", "situacao"]),
  };
}

async function createImport(input: {
  organizationId: string;
  personId: string | null;
  importType: string;
  sourceName: string;
  fileName: string;
  mimeType: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  warnings: string[];
  sheetName?: string;
}) {
  const mapping = suggestedMapping(input.headers);

  const { data: imported, error } = await supabaseAdmin
    .from("oh_financial_imports")
    .insert({
      organization_id: input.organizationId,
      import_type: input.importType,
      source_name: input.sourceName || input.fileName,
      original_file_name: input.fileName,
      original_mime_type: input.mimeType || null,
      status: "aguardando_mapeamento",
      mapping,
      totals: {
        rows: input.rows.length,
        headers: input.headers,
        sheetName: input.sheetName ?? null,
      },
      error_log: input.warnings,
      created_by: input.personId,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (input.rows.length > 0) {
    const chunks: Array<Array<Record<string, unknown>>> = [];
    for (let index = 0; index < input.rows.length; index += 250) {
      chunks.push(
        input.rows.slice(index, index + 250).map((row, innerIndex) => ({
          organization_id: input.organizationId,
          import_id: imported.id,
          row_number: index + innerIndex + 2,
          source_data: row,
          normalized_data: {},
          validation_status: "pendente",
          validation_messages: [],
        })),
      );
    }

    for (const chunk of chunks) {
      const { error: rowError } = await supabaseAdmin
        .from("oh_financial_import_rows")
        .insert(chunk);
      if (rowError) throw rowError;
    }
  }

  return {
    import: imported,
    headers: input.headers,
    previewRows: input.rows.slice(0, 20),
    suggestedMapping: mapping,
    warnings: input.warnings,
  };
}

async function categoryIdFor(
  organizationId: string,
  type: "receita" | "despesa",
  value: string,
) {
  const safeValue = value
    .replace(/[(),.%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  if (safeValue) {
    const { data: found } = await supabaseAdmin
      .from("oh_financial_categories")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("entry_type", type)
      .or(
        `name.ilike.%${safeValue}%,public_name.ilike.%${safeValue}%,slug.ilike.%${safeValue}%`,
      )
      .limit(1)
      .maybeSingle();

    if (found?.id) return found.id as string;
  }

  const fallbackSlug =
    type === "receita" ? "outras-receitas" : "despesas-consolidadas";
  const { data } = await supabaseAdmin
    .from("oh_financial_categories")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("entry_type", type)
    .eq("slug", fallbackSlug)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

async function periodIdFor(
  organizationId: string,
  month: string,
  status: string,
) {
  const provisional = status === "provisorio";
  const { data, error } = await supabaseAdmin
    .from("oh_financial_periods")
    .upsert(
      {
        organization_id: organizationId,
        competence_month: month,
        status: provisional ? "provisorio" : "importado",
        needs_update: provisional,
        source_label: "Importação financeira",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,competence_month" },
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

function normalizedEntryType(
  value: unknown,
  defaultType: string,
  amount: number,
): "receita" | "despesa" {
  const normalized = asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalized.includes("receita") ||
    normalized.includes("credito") ||
    normalized === "c"
  ) {
    return "receita";
  }
  if (
    normalized.includes("despesa") ||
    normalized.includes("debito") ||
    normalized === "d"
  ) {
    return "despesa";
  }
  if (defaultType === "receita" || defaultType === "despesa") {
    return defaultType;
  }
  return amount < 0 ? "despesa" : "receita";
}

async function commitRows(input: {
  organizationId: string;
  personId: string | null;
  importId: string;
  mapping: Mapping;
  defaultType: string;
  importMode: string;
}) {
  const { data: rows, error: rowsError } = await supabaseAdmin
    .from("oh_financial_import_rows")
    .select("id, row_number, source_data")
    .eq("organization_id", input.organizationId)
    .eq("import_id", input.importId)
    .order("row_number", { ascending: true });

  if (rowsError) throw rowsError;

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    const source =
      row.source_data &&
      typeof row.source_data === "object" &&
      !Array.isArray(row.source_data)
        ? (row.source_data as Record<string, unknown>)
        : {};

    const rawAmount = asNumber(rowValue(source, input.mapping.amount));
    const amount = Math.abs(rawAmount);
    const date = normalizeDate(rowValue(source, input.mapping.date));
    const description =
      asText(rowValue(source, input.mapping.description)) ||
      `Linha ${row.row_number}`;
    const type = normalizedEntryType(
      rowValue(source, input.mapping.entryType),
      input.defaultType,
      rawAmount,
    );

    const messages: string[] = [];
    if (!date) messages.push("Data não reconhecida.");
    if (amount <= 0) messages.push("Valor não reconhecido.");

    if (messages.length > 0) {
      skipped += 1;
      errors.push(`Linha ${row.row_number}: ${messages.join(" ")}`);
      await supabaseAdmin
        .from("oh_financial_import_rows")
        .update({
          validation_status: "erro",
          validation_messages: messages,
        })
        .eq("id", row.id);
      continue;
    }

    if (input.importMode === "extrato") {
      const externalId = createHash("sha256")
        .update(
          [
            input.organizationId,
            input.importId,
            row.row_number,
            date,
            description,
            rawAmount,
          ].join("|"),
        )
        .digest("hex");

      const { error } = await supabaseAdmin
        .from("oh_bank_transactions")
        .upsert(
          {
            organization_id: input.organizationId,
            import_id: input.importId,
            external_id: externalId,
            transaction_date: date,
            description,
            amount,
            transaction_type:
              type === "receita" ? "credito" : "debito",
            account_label:
              asText(rowValue(source, input.mapping.account)) || null,
            fit_id: asText(source.fitid) || null,
            status: "nao_conciliado",
            metadata: source,
          },
          { onConflict: "organization_id,external_id" },
        );

      if (error) {
        skipped += 1;
        errors.push(`Linha ${row.row_number}: ${error.message}`);
        continue;
      }

      created += 1;
      await supabaseAdmin
        .from("oh_financial_import_rows")
        .update({
          validation_status: "importado",
          normalized_data: {
            date,
            description,
            amount,
            type,
            destination: "oh_bank_transactions",
          },
        })
        .eq("id", row.id);
      continue;
    }

    const month = monthKey(date);
    const status =
      asText(rowValue(source, input.mapping.status)) === "provisorio"
        ? "provisorio"
        : "importado";
    const categoryId = await categoryIdFor(
      input.organizationId,
      type,
      asText(rowValue(source, input.mapping.category)),
    );
    const periodId = await periodIdFor(
      input.organizationId,
      month,
      status,
    );
    const sourceReference = `${input.importId}:${row.row_number}`;

    const { data: entry, error } = await supabaseAdmin
      .from("oh_financial_entries")
      .upsert(
        {
          organization_id: input.organizationId,
          period_id: periodId,
          category_id: categoryId,
          import_id: input.importId,
          entry_type: type,
          entry_date: date,
          competence_month: month,
          description_internal: description,
          description_public: description,
          amount,
          payment_method:
            asText(rowValue(source, input.mapping.paymentMethod)) || null,
          financial_account:
            asText(rowValue(source, input.mapping.account)) || null,
          source_type: "importacao",
          source_reference: sourceReference,
          status,
          is_provisional: status === "provisorio",
          needs_update: status === "provisorio",
          public_visible: true,
          metadata: source,
          created_by: input.personId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "organization_id,source_type,source_reference",
        },
      )
      .select("id")
      .single();

    if (error) {
      skipped += 1;
      errors.push(`Linha ${row.row_number}: ${error.message}`);
      continue;
    }

    created += 1;
    await supabaseAdmin
      .from("oh_financial_import_rows")
      .update({
        validation_status: "importado",
        normalized_data: {
          date,
          description,
          amount,
          type,
          categoryId,
        },
        created_entry_id: entry.id,
      })
      .eq("id", row.id);
  }

  const status = errors.length > 0 ? "concluido_com_erros" : "concluido";
  const { error: importError } = await supabaseAdmin
    .from("oh_financial_imports")
    .update({
      status,
      mapping: input.mapping,
      totals: {
        totalRows: rows?.length ?? 0,
        created,
        skipped,
      },
      error_log: errors,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.importId);

  if (importError) throw importError;

  return { created, skipped, errors, status };
}

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
    if (!auth.ok) return auth.response;

    const { data: imports, error } = await supabaseAdmin
      .from("oh_financial_imports")
      .select(
        "id, import_type, source_name, original_file_name, status, mapping, totals, error_log, processed_at, created_at",
      )
      .eq("organization_id", auth.context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ imports: imports ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar importações.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
    if (!auth.ok) return auth.response;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const importType = asText(form.get("importType")) || "lancamentos";
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Selecione um arquivo." },
          { status: 400 },
        );
      }
      if (file.size > 12 * 1024 * 1024) {
        return NextResponse.json(
          { error: "O arquivo deve ter no máximo 12 MB." },
          { status: 400 },
        );
      }

      const parsed = parseFinancialFile({
        fileName: file.name,
        mimeType: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
      });

      const result = await createImport({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        importType,
        sourceName: file.name,
        fileName: file.name,
        mimeType: file.type,
        headers: parsed.headers,
        rows: parsed.rows,
        warnings: parsed.warnings,
        sheetName: parsed.sheetName,
      });

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "importacao_pre_visualizada",
        entityType: "oh_financial_imports",
        entityId: result.import.id,
        afterData: {
          importType,
          fileName: file.name,
          rows: parsed.rows.length,
        },
      });

      return NextResponse.json({ ok: true, ...result });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = asText(body.action);

    if (action === "googleSheetsPreview") {
      const sheetUrl = asText(body.url);
      const csvUrl = googleSheetsCsvUrl(sheetUrl, asText(body.tab));
      const response = await fetch(csvUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          "Não foi possível ler a planilha. Confirme se ela está publicada ou compartilhada para leitura.",
        );
      }

      const text = await response.text();
      const parsed = parseFinancialFile({
        fileName: "google-sheets.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(text, "utf8"),
      });

      const result = await createImport({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        importType: asText(body.importType) || "google_sheets",
        sourceName: sheetUrl,
        fileName: "google-sheets.csv",
        mimeType: "text/csv",
        headers: parsed.headers,
        rows: parsed.rows,
        warnings: parsed.warnings,
      });

      await supabaseAdmin
        .from("oh_financial_settings")
        .update({
          google_sheets_url: sheetUrl,
          google_sheets_tab: asText(body.tab) || null,
          google_sheets_last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId);

      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "commitImport") {
      const importId = asText(body.importId);
      if (!importId) {
        return NextResponse.json(
          { error: "Importação não informada." },
          { status: 400 },
        );
      }

      const mapping =
        body.mapping &&
        typeof body.mapping === "object" &&
        !Array.isArray(body.mapping)
          ? (body.mapping as Mapping)
          : {};

      const result = await commitRows({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        importId,
        mapping,
        defaultType: asText(body.defaultType),
        importMode: asText(body.importMode) || "lancamentos",
      });

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "importacao_concluida",
        entityType: "oh_financial_imports",
        entityId: importId,
        afterData: result,
      });

      return NextResponse.json({
        ok: true,
        ...result,
        message: `${result.created} registro(s) importado(s).`,
      });
    }

    if (action === "cancelImport") {
      const importId = asText(body.importId);
      const { error } = await supabaseAdmin
        .from("oh_financial_imports")
        .update({
          status: "cancelado",
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", importId);

      if (error) throw error;
      return NextResponse.json({
        ok: true,
        message: "Importação cancelada.",
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar importação.",
      },
      { status: 500 },
    );
  }
}
