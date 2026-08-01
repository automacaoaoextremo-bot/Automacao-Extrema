import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { asText } from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const BUCKET = "oh-financial-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "comprovante";
}

function extensionFor(file: File) {
  const fileName = safeFileName(file.name);
  const current = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";

  if (current) return current;

  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  };

  return extensions[file.type] || "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const contributionId = asText(formData.get("contributionId"));
    const uploadToken = asText(formData.get("uploadToken"));
    const fileValue = formData.get("file");

    if (!contributionId || !uploadToken) {
      return NextResponse.json(
        { error: "Contribuição ou autorização de envio não informada." },
        { status: 400 },
      );
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Selecione uma imagem ou PDF do comprovante." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(fileValue.type)) {
      return NextResponse.json(
        { error: "Envie um arquivo JPG, PNG, WEBP ou PDF." },
        { status: 400 },
      );
    }

    if (fileValue.size <= 0 || fileValue.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "O comprovante deve ter até 10 MB." },
        { status: 400 },
      );
    }

    const { data: contribution, error: contributionError } =
      await supabaseAdmin
        .from("oh_contributions")
        .select("id, organization_id, metadata, proof_url")
        .eq("id", contributionId)
        .maybeSingle();

    if (contributionError) throw contributionError;

    if (!contribution?.id) {
      return NextResponse.json(
        { error: "Contribuição não localizada." },
        { status: 404 },
      );
    }

    const metadata = asObject(contribution.metadata);
    if (asText(metadata.proofUploadToken) !== uploadToken) {
      return NextResponse.json(
        { error: "A autorização para enviar o comprovante é inválida." },
        { status: 403 },
      );
    }

    const extension = extensionFor(fileValue);
    const storagePath = [
      "public-contributions",
      contribution.organization_id,
      contribution.id,
      `${Date.now()}-${randomUUID()}${extension}`,
    ].join("/");

    const bytes = Buffer.from(await fileValue.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: fileValue.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: documentError } = await supabaseAdmin
      .from("oh_financial_documents")
      .insert({
        organization_id: contribution.organization_id,
        contribution_id: contribution.id,
        storage_path: storagePath,
        original_file_name: safeFileName(fileValue.name),
        mime_type: fileValue.type,
        document_type: "comprovante_contribuicao",
        ocr_status: "nao_solicitado",
        validation_status: "aguardando_validacao",
        extracted_data: {
          source: "site_tucxa_contribuicao_publica",
        },
      });

    if (documentError) {
      await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
      throw documentError;
    }

    const { error: updateError } = await supabaseAdmin
      .from("oh_contributions")
      .update({
        proof_url: storagePath,
        status: "comprovante_enviado",
        receipt_uploaded_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          proofUploadToken: null,
          proofUploadedAt: new Date().toISOString(),
          proofStoragePath: storagePath,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      message:
        "Comprovante enviado com sigilo para conferência da Tesouraria/Financeiro.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o comprovante.",
      },
      { status: 500 },
    );
  }
}
