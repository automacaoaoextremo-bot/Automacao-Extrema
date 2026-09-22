/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/impacto-no-controle/adminAuth";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ id: string }> };

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function proofHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function safeExtension(file: File) {
  const raw = file.name.split(".").pop()?.toLowerCase() || "";
  if (/^[a-z0-9]{2,5}$/.test(raw)) return raw;

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/pdf") return "pdf";
  return "bin";
}

function campaignClientId(contribution: any) {
  const campaign = Array.isArray(contribution?.campaigns)
    ? contribution.campaigns[0]
    : contribution?.campaigns;
  return campaign?.client_id || null;
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { supabase, appUser } = await requireAdminFromRequest(request);
    const formData = await request.formData();
    const proof = formData.get("proof");
    const paymentMethod =
      String(formData.get("payment_method") || "pix").trim().toLowerCase() === "other"
        ? "other"
        : "pix";
    const adminNote = String(formData.get("note") || "").trim();

    if (!(proof instanceof File)) {
      return NextResponse.json(
        { error: "Selecione o comprovante que será registrado." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(proof.type)) {
      return NextResponse.json(
        { error: "Formato não permitido. Use JPG, PNG, WEBP ou PDF." },
        { status: 400 },
      );
    }

    if (proof.size <= 0 || proof.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "O comprovante deve ter até 10 MB." },
        { status: 400 },
      );
    }

    const { data: contribution, error: contributionError } = await supabase
      .from("inc_contributions")
      .select(`
        id,
        campaign_id,
        participant_id,
        status,
        selected_numbers,
        proof_file_path,
        proof_file_hash,
        note,
        campaigns:inc_campaigns(client_id)
      `)
      .eq("id", id)
      .maybeSingle();

    if (contributionError || !contribution) {
      return NextResponse.json(
        { error: "Reserva/participação não encontrada." },
        { status: 404 },
      );
    }

    const clientId = campaignClientId(contribution);
    if (appUser.role !== "owner" && appUser.client_id !== clientId) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    if (!["awaiting_payment", "pending_approval"].includes(contribution.status)) {
      return NextResponse.json(
        {
          error:
            "O comprovante só pode ser registrado enquanto a reserva aguarda pagamento/comprovante ou conferência.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await proof.arrayBuffer());
    const hash = proofHash(buffer);

    const { data: duplicate, error: duplicateError } = await supabase
      .from("inc_contributions")
      .select("id")
      .eq("proof_file_hash", hash)
      .neq("id", id)
      .limit(1)
      .maybeSingle();

    if (duplicateError) throw duplicateError;

    if (duplicate) {
      return NextResponse.json(
        { error: "Este comprovante já está registrado em outra participação." },
        { status: 409 },
      );
    }

    const extension = safeExtension(proof);
    const filePath = `${contribution.campaign_id}/${contribution.id}-admin-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("impacto-no-controle-proofs")
      .upload(filePath, buffer, {
        contentType: proof.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "inc_admin_register_contribution_proof",
      {
        p_contribution_id: id,
        p_actor_user_id: appUser.id,
        p_proof_file_path: filePath,
        p_proof_file_hash: hash,
        p_payment_method: paymentMethod,
        p_admin_note: adminNote || null,
        p_reserved_until: reservedUntil,
      },
    );

    if (rpcError) {
      await supabase.storage
        .from("impacto-no-controle-proofs")
        .remove([filePath]);

      if (rpcError.code === "23505") {
        return NextResponse.json(
          { error: "Este comprovante já está registrado em outra participação." },
          { status: 409 },
        );
      }

      throw rpcError;
    }

    const result =
      rpcResult && typeof rpcResult === "object"
        ? (rpcResult as Record<string, unknown>)
        : {};
    const previousProofPath =
      typeof result.previous_proof_file_path === "string"
        ? result.previous_proof_file_path
        : contribution.proof_file_path;

    if (previousProofPath && previousProofPath !== filePath) {
      await supabase.storage
        .from("impacto-no-controle-proofs")
        .remove([previousProofPath]);
    }

    return NextResponse.json({
      ok: true,
      status: "pending_approval",
      proof_file_path: filePath,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao registrar comprovante pela Gestão." },
      { status: 500 },
    );
  }
}
