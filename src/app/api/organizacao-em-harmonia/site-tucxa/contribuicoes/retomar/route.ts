import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  asNumber,
  asText,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeTrackingCode(value: unknown) {
  return asText(value).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function publicStatus(value: unknown) {
  const status = asText(value);

  if (status === "comprovante_enviado") return "comprovante_enviado";
  if (status === "aguardando_recepcao") return "aguardando_recepcao";
  if (["confirmado", "pago"].includes(status)) return "confirmado";
  if (status === "cancelado") return "cancelado";
  return "aguardando_comprovante";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const resumeToken = asText(body.resumeToken).trim();
    const trackingCode = normalizeTrackingCode(body.trackingCode);

    if (!resumeToken && !trackingCode) {
      return NextResponse.json(
        {
          error:
            "Informe o código de acompanhamento ou use o link salvo para retomar o envio.",
        },
        { status: 400 },
      );
    }

    const lookupColumn = resumeToken
      ? "receipt_resume_token_hash"
      : "public_tracking_code_hash";
    const lookupValue = sha256(resumeToken || trackingCode);

    const { data: contribution, error: contributionError } = await supabaseAdmin
      .from("oh_contributions")
      .select(
        "id, organization_id, amount, status, payment_method, due_date, proof_url, recurrence_type, recurrence_start_date, recurrence_occurrences, receipt_resume_expires_at, metadata",
      )
      .eq(lookupColumn, lookupValue)
      .maybeSingle();

    if (contributionError) throw contributionError;

    if (!contribution?.id) {
      return NextResponse.json(
        {
          error:
            "Não localizamos uma contribuição pendente com este código ou link.",
        },
        { status: 404 },
      );
    }

    const metadata = asObject(contribution.metadata);
    if (asText(metadata.source) !== "site_tucxa_contribuicao_publica") {
      return NextResponse.json(
        { error: "Esta contribuição não pode ser retomada por este acesso." },
        { status: 403 },
      );
    }

    if (contribution.proof_url || contribution.status === "comprovante_enviado") {
      return NextResponse.json(
        {
          ok: true,
          alreadyUploaded: true,
          contribution: {
            id: contribution.id,
            status: "comprovante_enviado",
            due_date: contribution.due_date,
            recurrence_start_date: contribution.recurrence_start_date,
            recurrence_occurrences: contribution.recurrence_occurrences,
          },
          message:
            "Este comprovante já foi enviado e está disponível para conferência da Tesouraria/Financeiro.",
        },
        { status: 200 },
      );
    }

    if (["confirmado", "pago", "cancelado"].includes(contribution.status)) {
      return NextResponse.json(
        {
          error:
            contribution.status === "cancelado"
              ? "Esta intenção foi cancelada e não aceita novo comprovante."
              : "Esta contribuição já foi concluída pela Tesouraria/Financeiro.",
        },
        { status: 409 },
      );
    }

    if (
      contribution.receipt_resume_expires_at &&
      new Date(contribution.receipt_resume_expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "O prazo deste acesso terminou. Use o botão Dúvidas? para falar com o Tucxa sem informar dados financeiros em público.",
        },
        { status: 410 },
      );
    }

    const uploadToken = randomUUID();
    const resumedAt = new Date().toISOString();
    const nextStatus =
      asText(contribution.payment_method) === "pix"
        ? "aguardando_comprovante"
        : asText(contribution.status) || "aguardando_recepcao";
    const { error: updateError } = await supabaseAdmin
      .from("oh_contributions")
      .update({
        status: nextStatus,
        metadata: {
          ...metadata,
          proofUploadToken: uploadToken,
          lastReceiptResumeAt: resumedAt,
          receiptResumeCount: Math.max(
            1,
            Math.trunc(asNumber(metadata.receiptResumeCount, 0)) + 1,
          ),
        },
        updated_at: resumedAt,
      })
      .eq("id", contribution.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      contribution: {
        id: contribution.id,
        status: publicStatus(nextStatus),
        due_date: contribution.due_date,
        recurrence_start_date: contribution.recurrence_start_date,
        recurrence_occurrences: contribution.recurrence_occurrences,
      },
      uploadToken,
      amount: asNumber(contribution.amount),
      paymentMethod: asText(contribution.payment_method) || "pix",
      message:
        "Contribuição localizada. Envie o comprovante abaixo para concluir a conferência.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível retomar o envio do comprovante.",
      },
      { status: 500 },
    );
  }
}
