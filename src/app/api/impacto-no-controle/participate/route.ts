/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/impacto-no-controle/supabase/admin";
import { impactoPixDefaults, impactoSiteUrl } from "@/lib/impacto-no-controle/config";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";
import { escapeHtml, sendEmail } from "@/lib/impacto-no-controle/email";

export const runtime = "nodejs";

type EmailStatus = {
  participant?: { sent: boolean; skipped?: boolean; error?: string };
  admin?: { sent: boolean; skipped?: boolean; error?: string };
};

function getAppUrl() {
  return impactoSiteUrl();
}

function numbersText(numbers: number[]) {
  return numbers.length ? numbers.map((n) => String(n).padStart(2, "0")).join(", ") : "Nenhum número escolhido";
}

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function amountPattern(amountCents: number) {
  const amount = (amountCents / 100).toFixed(2);
  const [integer, decimal] = amount.split(".");
  const integerWithDots = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const integerWithCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const escaped = [
    `${integer},${decimal}`,
    `${integer}.${decimal}`,
    `${integerWithDots},${decimal}`,
    `${integerWithCommas}.${decimal}`,
  ].map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  return new RegExp(`(?:r\\$\\s*)?(?:${escaped.join("|")})`, "i");
}

function extractReadableText(buffer: Buffer, mimeType: string, fileName: string) {
  const type = `${mimeType || ""} ${fileName || ""}`.toLowerCase();

  if (type.includes("image/")) {
    return { text: "", canValidate: false, reason: "image_without_ocr" };
  }

  const utf8 = buffer.toString("utf8");
  const latin1 = buffer.toString("latin1");
  const combined = `${utf8}\n${latin1}`
    .replace(/\0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalized = normalizeText(combined);
  const hasPaymentContext = /(pix|comprovante|pagamento|transferencia|transacao|favorecido|beneficiario|destinatario|efetivado|concluido|realizado)/i.test(normalized);
  const canValidate = combined.length >= 80 && hasPaymentContext;

  return { text: combined, canValidate, reason: canValidate ? "readable" : "unreadable" };
}

function validateProofFile(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  expectedAmountCents: number;
  expectedPixKey?: string | null;
  expectedReceiver?: string | null;
}) {
  const extracted = extractReadableText(input.buffer, input.mimeType, input.fileName);

  if (!extracted.canValidate) {
    return {
      ok: true,
      manualReview: true,
      warning: "Não foi possível validar automaticamente todos os dados do comprovante. Ele seguirá para conferência manual da organização.",
    };
  }

  const text = extracted.text;
  const normalized = normalizeText(text);
  const digits = onlyDigits(text);
  const divergences: string[] = [];

  if (!amountPattern(input.expectedAmountCents).test(text)) {
    divergences.push(`valor esperado ${formatMoneyFromCents(input.expectedAmountCents)}`);
  }

  const expectedKeyDigits = onlyDigits(input.expectedPixKey || "");
  const receiverTokens = normalizeText(input.expectedReceiver || "")
    .split(/\s+/)
    .filter((part) => part.length >= 4);

  const keyFound = expectedKeyDigits.length >= 5 && digits.includes(expectedKeyDigits);
  const receiverFound = receiverTokens.length > 0 && receiverTokens.some((token) => normalized.includes(token));

  if (!keyFound && !receiverFound) divergences.push("favorecido ou chave Pix esperada");

  const negativeStatus = /(agendad[oa]|pendente|cancelad[oa]|falhou|estornad[oa]|recusad[oa]|nao efetivad[oa]|não efetivad[oa])/i.test(normalized);
  const positiveStatus = /(efetivad[oa]|concluid[oa]|realizad[oa]|aprovad[oa]|pago|sucesso|confirmad[oa]|transacao concluida|pagamento efetuado)/i.test(normalized);

  if (negativeStatus || !positiveStatus) divergences.push("status de pagamento efetivado/concluído");

  if (divergences.length) {
    return {
      ok: false,
      manualReview: false,
      warning: `O comprovante enviado não bateu com: ${divergences.join(", ")}. Confira o Pix, envie o comprovante correto e tente novamente. Se o problema persistir, fale com o Suporte pelo WhatsApp.`,
    };
  }

  return { ok: true, manualReview: false, warning: null };
}

function proofHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function buildAcquisitionEmailContent(input: {
  participantName: string;
  participantPhone: string;
  participantEmail: string | null;
  campaignTitle: string;
  clientName: string;
  clientAdminEmail?: string | null;
  amountCents: number;
  numbers: number[];
  quotas: string[];
  thanksUrl: string;
  trackUrl: string;
  systemUrl: string;
  isAdmin: boolean;
}) {
  const nText = numbersText(input.numbers);
  const statusText = "aguardando conferência do pagamento/comprovante pela organização";

  const subject = input.isAdmin ? `Nova aquisição registrada - ${input.campaignTitle}` : `Participação registrada - ${input.campaignTitle}`;
  const intro = input.isAdmin ? `Uma nova aquisição foi registrada na campanha ${input.campaignTitle}.` : `Sua participação foi registrada na campanha ${input.campaignTitle}.`;

  const text = `${intro}\n\nCliente: ${input.clientName}\nParticipante: ${input.participantName}\nCelular: ${input.participantPhone}\nE-mail: ${input.participantEmail || "não informado"}\nValor: ${formatMoneyFromCents(input.amountCents)}\nNúmeros: ${nText}\nStatus: ${statusText}\n\nPágina de obrigado: ${input.thanksUrl}\nAcompanhamento: ${input.trackUrl}\n${input.isAdmin ? `Sistema/Gestão: ${input.systemUrl}\n` : ""}\nSalve o link de acompanhamento nos favoritos do navegador ou crie um atalho na tela inicial do celular.`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#1d2a1f">
      <h2>${input.isAdmin ? "Nova aquisição registrada" : "Participação registrada"}</h2>
      <p>${escapeHtml(intro)}</p>
      <ul>
        <li><strong>Cliente:</strong> ${escapeHtml(input.clientName)}</li>
        <li><strong>Participante:</strong> ${escapeHtml(input.participantName)}</li>
        <li><strong>Celular:</strong> ${escapeHtml(input.participantPhone)}</li>
        <li><strong>E-mail:</strong> ${escapeHtml(input.participantEmail || "não informado")}</li>
        <li><strong>Valor:</strong> ${escapeHtml(formatMoneyFromCents(input.amountCents))}</li>
        <li><strong>Números:</strong> ${escapeHtml(nText)}</li>
        <li><strong>Status:</strong> ${escapeHtml(statusText)}</li>
      </ul>
      <p><a href="${escapeHtml(input.thanksUrl)}">Abrir página de obrigado</a></p>
      <p><a href="${escapeHtml(input.trackUrl)}">Acompanhar participação</a></p>
      ${input.isAdmin ? `<p><a href="${escapeHtml(input.systemUrl)}">Abrir no sistema</a></p>` : ""}
      <p>Salve o link de acompanhamento nos favoritos do navegador ou crie um atalho na tela inicial do celular.</p>
    </div>
  `;

  return { subject, text, html };
}

async function sendAcquisitionEmails(input: {
  participantEmail: string | null;
  participantName: string;
  participantPhone: string;
  campaignId: string;
  campaignTitle: string;
  clientName: string;
  clientAdminEmail?: string | null;
  amountCents: number;
  numbers: number[];
  quotas: string[];
  token: string;
}) {
  const appUrl = getAppUrl();
  const ownerEmail = process.env.IMPACTO_ADMIN_EMAIL || process.env.EMAIL_COPY_TO || "impactonocontrole@gmail.com";
  const adminEmail = input.clientAdminEmail || ownerEmail;
  const adminCc = ownerEmail && ownerEmail !== adminEmail ? [ownerEmail] : [];
  const thanksUrl = `${appUrl}/solucoes/impacto-no-controle/obrigado/${input.token}`;
  const trackUrl = `${appUrl}/solucoes/impacto-no-controle/acompanhar/${input.token}`;
  const systemUrl = `${appUrl}/solucoes/impacto-no-controle/gestao/campanhas/${input.campaignId}`;
  const status: EmailStatus = {};

  if (input.participantEmail) {
    try {
      const participantContent = buildAcquisitionEmailContent({ ...input, participantEmail: input.participantEmail, participantPhone: input.participantPhone, thanksUrl, trackUrl, systemUrl, isAdmin: false });
      const result = await sendEmail({ to: input.participantEmail, subject: participantContent.subject, text: participantContent.text, html: participantContent.html });
      status.participant = { sent: true, skipped: Boolean((result as any)?.skipped) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida ao enviar e-mail.";
      status.participant = { sent: false, error: message };
      console.warn("Falha ao enviar e-mail para participante", error);
    }
  } else {
    status.participant = { sent: false, skipped: true };
  }

  try {
    const adminContent = buildAcquisitionEmailContent({ ...input, participantEmail: input.participantEmail, participantPhone: input.participantPhone, thanksUrl, trackUrl, systemUrl, isAdmin: true });
    const result = await sendEmail({ to: adminEmail, cc: adminCc, subject: adminContent.subject, text: adminContent.text, html: adminContent.html });
    status.admin = { sent: true, skipped: Boolean((result as any)?.skipped) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida ao enviar e-mail.";
    status.admin = { sent: false, error: message };
    console.warn("Falha ao enviar e-mail administrativo", error);
  }

  return status;
}

function formatSelectedQuotas(selectedQuotas: any[], quotaMap: Record<string, { title: string; amount_cents: number }>) {
  return (selectedQuotas || [])
    .map((item) => {
      const quota = quotaMap[item.quota_id];
      if (!quota || Number(item.qty) <= 0) return null;
      return `${item.qty}x ${quota.title} (${formatMoneyFromCents(quota.amount_cents * Number(item.qty))})`;
    })
    .filter(Boolean) as string[];
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    const formData = await request.formData();
    const reservationToken = String(formData.get("reservation_token") || "").trim();
    const proof = formData.get("proof");
    const paymentMethod = String(formData.get("payment_method") || "pix").trim().toLowerCase() === "other"
      ? "other"
      : "pix";

    if (!reservationToken) {
      return NextResponse.json({ error: "Fluxo atualizado: primeiro reserve os números e depois envie o comprovante pela página da reserva." }, { status: 400 });
    }

    if (!(proof instanceof File)) return NextResponse.json({ error: "Comprovante obrigatório." }, { status: 400 });

    const { data: contribution, error: contributionError } = await supabase
      .from("inc_contributions")
      .select(`
        id,
        campaign_id,
        participant_id,
        status,
        amount_cents,
        selected_numbers,
        selected_quotas,
        acompanhamento_token,
        reservation_expires_at,
        campaigns:inc_campaigns(id,title,slug,pix_key,pix_receiver_name,clients:inc_clients(name,pix_key,pix_receiver_name,responsible_email)),
        participants:inc_participants(name,phone,email)
      `)
      .eq("acompanhamento_token", reservationToken)
      .maybeSingle();

    if (contributionError || !contribution) return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
    if (contribution.status !== "awaiting_payment") return NextResponse.json({ error: "Esta reserva já foi finalizada ou não está disponível." }, { status: 400 });

    const expiresAt = contribution.reservation_expires_at ? new Date(contribution.reservation_expires_at).getTime() : 0;
    if (!expiresAt || Date.now() > expiresAt) {
      await supabase.from("inc_contributions").update({ status: "canceled", note: "Reserva expirada antes do envio do comprovante." }).eq("id", contribution.id);
      await supabase
        .from("inc_campaign_numbers")
        .update({ status: "available", participant_id: null, contribution_id: null, buyer_display_name: null, reserved_until: null })
        .eq("contribution_id", contribution.id)
        .eq("status", "reserved");
      return NextResponse.json({ error: "Sua reserva expirou. Volte para a campanha e escolha seus números novamente." }, { status: 400 });
    }

    const proofBuffer = Buffer.from(await proof.arrayBuffer());
    const fileHash = proofHash(proofBuffer);

    const { data: duplicate, error: duplicateError } = await supabase
      .from("inc_contributions")
      .select("id,acompanhamento_token")
      .eq("proof_file_hash", fileHash)
      .neq("id", contribution.id)
      .limit(1)
      .maybeSingle();

    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return NextResponse.json({ error: "Este comprovante já foi enviado em outra participação. Verifique se selecionou o arquivo correto. Se precisar de ajuda, fale com o Suporte no WhatsApp." }, { status: 409 });
    }

    const campaign = Array.isArray((contribution as any).campaigns) ? (contribution as any).campaigns[0] : (contribution as any).campaigns;
    const client = Array.isArray(campaign?.clients) ? campaign.clients[0] : campaign?.clients;
    const participant = Array.isArray((contribution as any).participants) ? (contribution as any).participants[0] : (contribution as any).participants;

    const pixDefaults = impactoPixDefaults();
    const expectedPixKey = campaign?.pix_key || client?.pix_key || pixDefaults.key;
    const expectedReceiver = campaign?.pix_receiver_name || client?.pix_receiver_name || pixDefaults.receiverName || client?.name || "";
    const proofValidation = paymentMethod === "other"
      ? {
          ok: true,
          manualReview: true,
          warning: "Pagamento realizado por outra forma combinada com o Suporte. O comprovante seguirá para conferência manual da organização.",
        }
      : validateProofFile({
          buffer: proofBuffer,
          fileName: proof.name,
          mimeType: proof.type || "application/octet-stream",
          expectedAmountCents: contribution.amount_cents,
          expectedPixKey,
          expectedReceiver,
        });

    if (!proofValidation.ok) {
      return NextResponse.json({ error: proofValidation.warning }, { status: 400 });
    }

    const fileExt = proof.name.split(".").pop()?.toLowerCase() || "bin";
    const filePath = `${contribution.campaign_id}/${contribution.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("impacto-no-controle-proofs").upload(filePath, proofBuffer, { contentType: proof.type || "application/octet-stream", upsert: false });
    if (uploadError) throw uploadError;

    const { error: updateContributionError } = await supabase
      .from("inc_contributions")
      .update({
        status: "pending_approval",
        proof_file_path: filePath,
        proof_file_hash: fileHash,
        note: paymentMethod === "other"
          ? "Comprovante enviado para pagamento por outra forma combinada com o Suporte; seguir para conferência manual."
          : proofValidation.manualReview
            ? "Comprovante enviado. Validação automática inconclusiva; seguir para conferência manual."
            : "Comprovante enviado e passou pela validação automática inicial.",
      })
      .eq("id", contribution.id);

    if (updateContributionError) throw updateContributionError;

    const selectedNumbers = Array.isArray(contribution.selected_numbers) ? contribution.selected_numbers : [];
    if (selectedNumbers.length) {
      const reservedUntil = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const { error: updateNumbersError } = await supabase
        .from("inc_campaign_numbers")
        .update({ status: "pending_approval", reserved_until: reservedUntil })
        .eq("contribution_id", contribution.id)
        .in("number", selectedNumbers);
      if (updateNumbersError) throw updateNumbersError;
    }

    const selectedQuotas = Array.isArray(contribution.selected_quotas) ? contribution.selected_quotas : [];
    const quotaIds = selectedQuotas.map((q: any) => q.quota_id).filter(Boolean);
    const { data: quotaRows, error: quotaError } = quotaIds.length
      ? await supabase.from("inc_campaign_quotas").select("id,title,amount_cents").eq("campaign_id", contribution.campaign_id).in("id", quotaIds)
      : { data: [], error: null };
    if (quotaError) throw quotaError;

    const quotaMap = Object.fromEntries((quotaRows || []).map((q: any) => [q.id, { title: q.title, amount_cents: q.amount_cents }]));
    const quotaMessages = formatSelectedQuotas(selectedQuotas, quotaMap);

    const emailStatus = await sendAcquisitionEmails({
      participantEmail: participant?.email || null,
      participantName: participant?.name || "Participante",
      participantPhone: participant?.phone || "",
      campaignId: contribution.campaign_id,
      campaignTitle: campaign?.title || "Campanha",
      clientName: client?.name || "Impacto no Controle",
      clientAdminEmail: client?.responsible_email || null,
      amountCents: contribution.amount_cents,
      numbers: selectedNumbers,
      quotas: quotaMessages,
      token: contribution.acompanhamento_token,
    });

    return NextResponse.json({
      ok: true,
      token: contribution.acompanhamento_token,
      email: emailStatus,
      proof_validation: proofValidation.manualReview ? "manual_review" : "validated",
      payment_method: paymentMethod,
      message: proofValidation.manualReview
        ? "Comprovante enviado. Ele seguirá para conferência manual da organização."
        : "Comprovante enviado. Ele passou pela validação inicial e a organização irá conferir o pagamento.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao enviar comprovante. Tente novamente." }, { status: 500 });
  }
}
