import { NextResponse } from "next/server";
import { asText } from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import {
  getFinancialAuthContext,
  writeFinancialAudit,
} from "@/lib/organizacao-em-harmonia/financial-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

async function callOcrProvider(input: {
  file: File;
  buffer: Buffer;
}) {
  const endpoint = asText(process.env.FINANCIAL_OCR_ENDPOINT);
  const apiKey = asText(process.env.FINANCIAL_OCR_API_KEY);

  if (!endpoint) {
    return {
      provider: "manual_validation",
      status: "aguardando_configuracao",
      extractedData: {},
      message:
        "Documento armazenado. Configure FINANCIAL_OCR_ENDPOINT para extração automática ou preencha os dados manualmente.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      fileName: input.file.name,
      mimeType: input.file.type,
      contentBase64: input.buffer.toString("base64"),
      requestedFields: [
        "data",
        "valor",
        "fornecedor",
        "descricao",
        "numero_documento",
        "forma_pagamento",
        "categoria_sugerida",
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `O provedor de OCR respondeu com status ${response.status}.`,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return {
    provider: asText(payload.provider) || "external_adapter",
    status: "processado",
    extractedData:
      payload.extractedData &&
      typeof payload.extractedData === "object" &&
      !Array.isArray(payload.extractedData)
        ? payload.extractedData
        : payload,
    message: "Extração concluída. Revise todos os campos antes de salvar.",
  };
}

export async function POST(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
    if (!auth.ok) return auth.response;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Selecione um documento." },
          { status: 400 },
        );
      }

      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { error: "O documento deve ter no máximo 15 MB." },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const path = [
        auth.context.organizationId,
        new Date().toISOString().slice(0, 10),
        `${crypto.randomUUID()}-${safeFileName(file.name)}`,
      ].join("/");

      const { error: uploadError } = await supabaseAdmin.storage
        .from("oh-financial-documents")
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      let ocr;
      try {
        ocr = await callOcrProvider({ file, buffer });
      } catch (error) {
        ocr = {
          provider: "external_adapter",
          status: "falha",
          extractedData: {},
          message:
            error instanceof Error
              ? `${error.message} O documento continua disponível para validação manual.`
              : "Falha no OCR. O documento continua disponível para validação manual.",
        };
      }

      const { data: document, error } = await supabaseAdmin
        .from("oh_financial_documents")
        .insert({
          organization_id: auth.context.organizationId,
          storage_path: path,
          original_file_name: file.name,
          mime_type: file.type || null,
          document_type: asText(form.get("documentType")) || "comprovante",
          ocr_status: ocr.status,
          ocr_provider: ocr.provider,
          extracted_data: ocr.extractedData,
          validation_status: "aguardando_validacao",
          created_by: auth.context.personId,
        })
        .select("*")
        .single();

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "documento_financeiro_enviado",
        entityType: "oh_financial_documents",
        entityId: document.id,
        afterData: {
          fileName: file.name,
          mimeType: file.type,
          ocrStatus: ocr.status,
        },
      });

      return NextResponse.json({
        ok: true,
        document,
        extractedData: ocr.extractedData,
        message: ocr.message,
      });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = asText(body.action);

    if (action === "validate") {
      const documentId = asText(body.documentId);
      if (!documentId) {
        return NextResponse.json(
          { error: "Documento não informado." },
          { status: 400 },
        );
      }

      const extractedData =
        body.extractedData &&
        typeof body.extractedData === "object" &&
        !Array.isArray(body.extractedData)
          ? body.extractedData
          : {};

      const { data, error } = await supabaseAdmin
        .from("oh_financial_documents")
        .update({
          entry_id: asText(body.entryId) || null,
          extracted_data: extractedData,
          validation_status: "validado",
          validated_by: auth.context.personId,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", documentId)
        .select("*")
        .single();

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "ocr_validado",
        entityType: "oh_financial_documents",
        entityId: documentId,
        afterData: data,
      });

      return NextResponse.json({
        ok: true,
        document: data,
        message: "Dados do documento validados.",
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar documento.",
      },
      { status: 500 },
    );
  }
}
