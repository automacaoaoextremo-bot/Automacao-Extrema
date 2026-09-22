"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, MessageCircle, TimerReset } from "@/components/impacto-no-controle/icons";
import QRCode from "qrcode";
import { buildPixPayload } from "@/lib/impacto-no-controle/pix";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";

type PaymentMethod = "pix" | "other";
type PaymentGuideStep = 0 | 1 | 2;

type ReservationPaymentProps = {
  reservation: {
    token: string;
    campaignTitle: string;
    campaignSlug: string;
    clientName: string;
    clientLogoUrl?: string | null;
    primaryColor: string;
    secondaryColor: string;
    amountCents: number;
    selectedNumbers: number[];
    pixKey: string;
    pixReceiverName: string;
    pixCity: string;
    reservationExpiresAt: string;
    status: string;
    participantName?: string | null;
    participantPhone?: string | null;
  };
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDeadline(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "o prazo indicado na reserva";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function whatsappPhoneLink(phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildReservationWhatsAppUrl(input: {
  phone?: string | null;
  name?: string | null;
  campaignTitle: string;
  reservationUrl: string;
  selectedNumbers: number[];
  amountCents: number;
}) {
  const phone = whatsappPhoneLink(input.phone);
  if (!phone) return "";

  const numbers = input.selectedNumbers.length
    ? input.selectedNumbers.map((n) => String(n).padStart(2, "0")).join(", ")
    : "sem números";

  const message = `Olá${input.name ? `, ${input.name}` : ""}! Sua reserva na ação ${input.campaignTitle} foi criada.

Números reservados: ${numbers}
Valor: ${formatMoneyFromCents(input.amountCents)}

Acesse este link para concluir o pagamento e enviar o comprovante:
${input.reservationUrl}

O pagamento pode ser feito por Pix ou por outra forma combinada com o Suporte. Depois do pagamento, volte por este mesmo link e envie o comprovante.`;

  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function ReservationPayment({ reservation }: ReservationPaymentProps) {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{
    target: "pix" | "key";
    text: string;
    tone: "success" | "error";
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [reservationLinkFeedback, setReservationLinkFeedback] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [paymentGuideStep, setPaymentGuideStep] = useState<PaymentGuideStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const expiresAt = useMemo(
    () => new Date(reservation.reservationExpiresAt).getTime(),
    [reservation.reservationExpiresAt],
  );
  const remainingMs = now === null ? null : Math.max(0, expiresAt - now);
  const expired = remainingMs !== null && remainingMs <= 0;
  const deadlineText = useMemo(
    () => formatDeadline(reservation.reservationExpiresAt),
    [reservation.reservationExpiresAt],
  );

  const reservationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/solucoes/impacto-no-controle/reserva/${reservation.token}`
      : `/solucoes/impacto-no-controle/reserva/${reservation.token}`;

  const supportText = encodeURIComponent(
    `Olá! Preciso de ajuda com a reserva da campanha ${reservation.campaignTitle}. Quero tirar uma dúvida sobre pagamento por Pix ou combinar outra forma de pagamento. Reserva: ${reservationUrl}`,
  );
  const supportHref = `https://wa.me/5519989848246?text=${supportText}`;

  const reservationWhatsAppUrl = buildReservationWhatsAppUrl({
    phone: reservation.participantPhone,
    name: reservation.participantName,
    campaignTitle: reservation.campaignTitle,
    reservationUrl,
    selectedNumbers: reservation.selectedNumbers,
    amountCents: reservation.amountCents,
  });

  const reservationWhatsAppMessage = `Reserva da ação ${reservation.campaignTitle}

Números: ${
    reservation.selectedNumbers.length
      ? reservation.selectedNumbers.map((n) => String(n).padStart(2, "0")).join(", ")
      : "sem números"
  }
Valor: ${formatMoneyFromCents(reservation.amountCents)}
Reservada até: ${deadlineText}

O pagamento pode ser feito por Pix ou por outra forma combinada com o Suporte.

Depois do pagamento, volte neste link para enviar o comprovante:
${reservationUrl}`;

  const pixPayload = useMemo(() => {
    if (reservation.amountCents <= 0) return "";

    return buildPixPayload({
      key: reservation.pixKey,
      merchantName: reservation.pixReceiverName || reservation.clientName,
      merchantCity: reservation.pixCity || "CAMPINAS",
      amount: reservation.amountCents / 100,
      txid: "IMPACTO",
      description: reservation.campaignTitle,
    });
  }, [reservation]);

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    updateClock();

    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pixPayload) return;

    QRCode.toDataURL(pixPayload, { margin: 1, width: 260 })
      .then(setQrCode)
      .catch(() => setQrCode(null));
  }, [pixPayload]);

  async function writeToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function copyPix() {
    try {
      await writeToClipboard(pixPayload);
      setCopyFeedback({
        target: "pix",
        tone: "success",
        text: "✅ Pix copia e cola copiado! Faça o pagamento no app do banco e depois avance para enviar o comprovante.",
      });
    } catch {
      setCopyFeedback({
        target: "pix",
        tone: "error",
        text: "Não foi possível copiar automaticamente. Abra a opção ‘Ver código Pix copia e cola’ e copie manualmente.",
      });
    }
  }

  async function copyPixKey() {
    try {
      await writeToClipboard(reservation.pixKey.trim());
      setCopyFeedback({
        target: "key",
        tone: "success",
        text: "✅ Chave Pix copiada! Cole a chave no app do banco para pagar.",
      });
    } catch {
      setCopyFeedback({
        target: "key",
        tone: "error",
        text: "Não foi possível copiar automaticamente. Copie manualmente a chave Pix exibida.",
      });
    }
  }

  async function copyReservationLink() {
    try {
      await writeToClipboard(reservationUrl);
      setReservationLinkFeedback(
        "✅ Link da reserva copiado. Guarde-o para voltar depois do pagamento e enviar o comprovante.",
      );
    } catch {
      setReservationLinkFeedback(
        "Não foi possível copiar automaticamente. Copie o link da barra do navegador.",
      );
    }
  }

  async function copyReservationMessage() {
    try {
      await writeToClipboard(reservationWhatsAppMessage);
      setReservationLinkFeedback(
        "✅ Mensagem copiada. Abra o WhatsApp e cole em uma conversa para guardar o link da reserva.",
      );
    } catch {
      setReservationLinkFeedback(
        "Não foi possível copiar automaticamente. Use o botão de abrir WhatsApp ou copie o link da barra do navegador.",
      );
    }
  }

  async function openReservationWhatsApp() {
    try {
      await writeToClipboard(reservationWhatsAppMessage);
      setReservationLinkFeedback(
        "✅ Mensagem copiada. Se o WhatsApp não abrir automaticamente, abra o app e cole a mensagem em uma conversa.",
      );
    } catch {
      setReservationLinkFeedback(
        "Se o WhatsApp não abrir automaticamente, copie o link da reserva pela barra do navegador.",
      );
    }

    if (reservationWhatsAppUrl) {
      window.location.href = reservationWhatsAppUrl;
    }
  }

  async function submitProof() {
    setError(null);

    if (expired) {
      setError("A reserva expirou. Volte para a campanha e escolha seus números novamente.");
      return;
    }

    if (!proof) {
      setError("Inclua o comprovante do pagamento para finalizar sua participação.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("reservation_token", reservation.token);
      formData.append("proof", proof);
      formData.append("payment_method", paymentMethod);

      const response = await fetch("/api/impacto-no-controle/participate", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Não foi possível enviar o comprovante.");
      }

      router.push(`/solucoes/impacto-no-controle/obrigado/${json.token}`);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erro inesperado.",
      );
      setLoading(false);
    }
  }

  function openPaymentGuide() {
    setError(null);
    setPaymentGuideStep(0);
  }

  function openProofOnly() {
    setError(null);
    setPaymentMethod("pix");
    setPaymentGuideStep(2);
  }

  function closePaymentGuide() {
    if (loading) return;
    setError(null);
    setPaymentGuideStep(null);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div
        className="card impacto-reservation-compact overflow-hidden"
        style={{
          borderColor: "var(--campaign-border)",
          background:
            "linear-gradient(180deg, #fffdf7 0%, var(--campaign-soft) 100%)",
        }}
      >
        <h1
          className="text-2xl font-black leading-tight md:text-3xl"
          style={{ color: "var(--campaign-primary)" }}
        >
          Reserva criada.
        </h1>

        <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
          Seus números ficam reservados até <strong>{deadlineText}</strong>.
          Escolha Pix ou combine outra forma de pagamento com o Suporte e envie
          o comprovante para confirmar a participação.
        </p>

        <div className="impacto-reservation-summary-grid">
          <div>
            <p>Números</p>
            <strong>
              {reservation.selectedNumbers.length
                ? reservation.selectedNumbers
                    .map((n) => String(n).padStart(2, "0"))
                    .join(", ")
                : "—"}
            </strong>
          </div>
          <div>
            <p>Valor</p>
            <strong>{formatMoneyFromCents(reservation.amountCents)}</strong>
          </div>
          <div>
            <p>Reserva válida até</p>
            <strong>{deadlineText}</strong>
          </div>
        </div>

        <a
          className="impacto-support-strong"
          href={supportHref}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle className="h-4 w-4" /> FALE COM O SUPORTE
        </a>

        <div
          className="mt-3 rounded-2xl border-2 bg-white px-3 py-2"
          style={{ borderColor: "var(--campaign-primary)" }}
        >
          <div className="flex items-center gap-3">
            <TimerReset
              className="h-5 w-5 shrink-0"
              style={{ color: "var(--campaign-primary)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--muted)]">
                Tempo restante
              </p>
              <p
                className="text-xl font-black leading-tight"
                style={{ color: "var(--campaign-primary)" }}
              >
                {remainingMs === null
                  ? "Calculando..."
                  : formatCountdown(remainingMs)}
              </p>
            </div>
          </div>

          {expired ? (
            <p className="mt-2 rounded-xl bg-red-50 p-2 text-xs font-bold text-red-700">
              Sua reserva expirou. Volte para a campanha e escolha seus números
              novamente.
            </p>
          ) : null}
        </div>

        <div className="impacto-reservation-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShareOpen(true)}
          >
            GUARDAR LINK
          </button>

          <button
            type="button"
            className="btn-secondary impacto-proof-only-button"
            onClick={openProofOnly}
            disabled={expired}
          >
            JÁ FIZ O PIX — ENVIAR COMPROVANTE
          </button>

          <button
            type="button"
            className="btn-primary impacto-payment-full-button"
            style={{ background: "var(--campaign-primary)" }}
            onClick={openPaymentGuide}
            disabled={expired}
          >
            PIX / COMPROVANTE
          </button>
        </div>
      </div>

      {shareOpen ? (
        <div
          className="impacto-reservation-share-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="impacto-reservation-share-title"
        >
          <div className="impacto-reservation-share-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="impacto-guide-kicker">LINK DA RESERVA</p>
                <h2
                  id="impacto-reservation-share-title"
                  className="text-xl font-black"
                  style={{ color: "var(--campaign-primary)" }}
                >
                  Guarde este link
                </h2>
              </div>
              <button
                type="button"
                className="impacto-guide-close"
                onClick={() => setShareOpen(false)}
              >
                FECHAR
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Use o link para voltar depois do pagamento e enviar ou consultar o
              comprovante.
            </p>

            <div className="mt-4 grid gap-2">
              {reservationWhatsAppUrl ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: "var(--campaign-primary)" }}
                  onClick={openReservationWhatsApp}
                >
                  <MessageCircle className="h-4 w-4" /> Abrir WhatsApp com o link
                </button>
              ) : null}

              <button
                type="button"
                className="btn-secondary"
                onClick={copyReservationMessage}
              >
                Copiar mensagem da reserva
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={copyReservationLink}
              >
                Copiar somente o link
              </button>
            </div>

            {reservationLinkFeedback ? (
              <div
                className="mt-3 rounded-2xl border-2 border-[#f59e0b] bg-[#fff1a8] p-3 text-xs font-black leading-5 text-[#3f2a00]"
                role="status"
                aria-live="polite"
              >
                {reservationLinkFeedback}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {paymentGuideStep !== null ? (
        <div
          className="impacto-guide-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="impacto-payment-guide-title"
        >
          <div className="impacto-guide-card">
            <div className="impacto-guide-header">
              <div>
                <p className="impacto-guide-kicker">
                  PAGAMENTO • PASSO {paymentGuideStep + 1} DE 3
                </p>
                <h2 id="impacto-payment-guide-title">
                  {paymentGuideStep === 0
                    ? "Resumo da reserva"
                    : paymentGuideStep === 1
                      ? "Faça o pagamento"
                      : "Envie o comprovante"}
                </h2>
              </div>

              <button
                type="button"
                className="impacto-guide-close"
                onClick={closePaymentGuide}
                disabled={loading}
              >
                FECHAR
              </button>
            </div>

            <div className="impacto-guide-body">
              {paymentGuideStep === 0 ? (
                <div className="grid gap-3">
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: "var(--campaign-card)" }}
                  >
                    <p className="text-sm font-bold text-[var(--muted)]">
                      Campanha
                    </p>
                    <p
                      className="mt-1 font-extrabold"
                      style={{ color: "var(--campaign-primary)" }}
                    >
                      {reservation.campaignTitle}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className="rounded-2xl p-4"
                      style={{ background: "var(--campaign-card)" }}
                    >
                      <p className="text-sm font-bold text-[var(--muted)]">
                        Valor
                      </p>
                      <p
                        className="mt-1 font-extrabold"
                        style={{ color: "var(--campaign-primary)" }}
                      >
                        {formatMoneyFromCents(reservation.amountCents)}
                      </p>
                    </div>

                    <div
                      className="rounded-2xl p-4"
                      style={{ background: "var(--campaign-card)" }}
                    >
                      <p className="text-sm font-bold text-[var(--muted)]">
                        Reservada até
                      </p>
                      <p
                        className="mt-1 font-extrabold"
                        style={{ color: "var(--campaign-primary)" }}
                      >
                        {deadlineText}
                      </p>
                    </div>
                  </div>

                  <div
                    className="rounded-2xl border bg-white p-4"
                    style={{ borderColor: "var(--campaign-border)" }}
                  >
                    <p
                      className="font-bold"
                      style={{ color: "var(--campaign-primary)" }}
                    >
                      Números reservados
                    </p>
                    <p className="mt-2 text-[var(--muted)]">
                      {reservation.selectedNumbers.length
                        ? reservation.selectedNumbers
                            .map((n) => String(n).padStart(2, "0"))
                            .join(", ")
                        : "Nenhum número escolhido."}
                    </p>
                  </div>

                  <p className="text-sm leading-6 text-[var(--muted)]">
                    O pagamento pode ser feito por Pix ou por outra forma
                    combinada diretamente com o Suporte. Em qualquer opção,
                    guarde e envie o comprovante para a organização confirmar
                    sua participação.
                  </p>
                </div>
              ) : null}

              {paymentGuideStep === 1 ? (
                <div className="grid gap-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label
                      className={`cursor-pointer rounded-2xl border-2 p-4 ${
                        paymentMethod === "pix"
                          ? "border-[var(--campaign-primary)] bg-[var(--campaign-soft)]"
                          : "border-[var(--border)] bg-white"
                      }`}
                    >
                      <input
                        className="mr-2"
                        type="radio"
                        name="payment-method"
                        checked={paymentMethod === "pix"}
                        onChange={() => setPaymentMethod("pix")}
                      />
                      <strong>Pix</strong>
                    </label>

                    <label
                      className={`cursor-pointer rounded-2xl border-2 p-4 ${
                        paymentMethod === "other"
                          ? "border-[var(--campaign-primary)] bg-[var(--campaign-soft)]"
                          : "border-[var(--border)] bg-white"
                      }`}
                    >
                      <input
                        className="mr-2"
                        type="radio"
                        name="payment-method"
                        checked={paymentMethod === "other"}
                        onChange={() => setPaymentMethod("other")}
                      />
                      <strong>Outra forma com o Suporte</strong>
                    </label>
                  </div>

                  {paymentMethod === "pix" ? (
                    <>
                      <p className="text-sm text-[var(--muted)]">
                        Chave Pix: <strong>{reservation.pixKey}</strong>
                      </p>

                      <button
                        className="btn-primary"
                        style={{ background: "var(--campaign-primary)" }}
                        onClick={copyPix}
                        disabled={expired || !pixPayload}
                      >
                        Copiar Pix copia e cola
                      </button>

                      {copyFeedback?.target === "pix" ? (
                        <div
                          className={`rounded-2xl border-2 p-4 text-sm font-black leading-6 ${
                            copyFeedback.tone === "success"
                              ? "border-[#f59e0b] bg-[#fff1a8] text-[#3f2a00]"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                          role="status"
                          aria-live="polite"
                        >
                          {copyFeedback.text}
                        </div>
                      ) : null}

                      <button
                        className="btn-secondary"
                        onClick={copyPixKey}
                        disabled={expired}
                      >
                        Copiar chave Pix
                      </button>

                      {copyFeedback?.target === "key" ? (
                        <div
                          className={`rounded-2xl border-2 p-4 text-sm font-black leading-6 ${
                            copyFeedback.tone === "success"
                              ? "border-[#f59e0b] bg-[#fff1a8] text-[#3f2a00]"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                          role="status"
                          aria-live="polite"
                        >
                          {copyFeedback.text}
                        </div>
                      ) : null}

                      <details className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm">
                        <summary
                          className="cursor-pointer font-extrabold"
                          style={{ color: "var(--campaign-primary)" }}
                        >
                          Ver código Pix copia e cola
                        </summary>
                        <textarea
                          className="input mt-3 min-h-28 text-xs"
                          readOnly
                          value={pixPayload}
                        />
                      </details>

                      {qrCode ? (
                        // eslint-disable-next-line @next/next/no-img-element -- QR Code gerado em data URL no cliente.
                        <img
                          src={qrCode}
                          alt="QR Code Pix"
                          className="mx-auto mt-2 rounded-2xl border border-[var(--border)] bg-white p-3"
                        />
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-[var(--border)] bg-[#fff8e8] p-4">
                      <p
                        className="font-black"
                        style={{ color: "var(--campaign-primary)" }}
                      >
                        Combine a forma de pagamento com o Suporte
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        Fale com a equipe antes de pagar. Depois, volte aqui e
                        envie o comprovante da forma de pagamento combinada.
                      </p>
                      <a
                        className="btn-primary mt-3"
                        style={{ background: "var(--campaign-primary)" }}
                        href={supportHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" /> Falar com o Suporte
                      </a>
                    </div>
                  )}
                </div>
              ) : null}

              {paymentGuideStep === 2 ? (
                <div className="grid gap-4">
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    Anexe o comprovante do pagamento realizado por{" "}
                    <strong>
                      {paymentMethod === "pix"
                        ? "Pix"
                        : "outra forma combinada com o Suporte"}
                    </strong>
                    . A organização fará a conferência antes da confirmação.
                  </p>

                  <div>
                    <label className="label">Comprovante do pagamento *</label>
                    <input
                      className="input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={expired}
                      onChange={(event) =>
                        setProof(event.target.files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[#fff8e8] p-4 text-sm leading-6 text-[var(--brand-dark)]">
                    <div className="flex gap-3">
                      <HelpCircle className="mt-1 h-5 w-5 shrink-0" />
                      <p>
                        <strong>Dica:</strong> envie um arquivo legível e que
                        mostre claramente o pagamento. Se a forma escolhida não
                        for Pix, a conferência será feita manualmente pela
                        organização.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div
                  className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
            </div>

            <div className="impacto-guide-footer">
              <a
                className="btn-secondary"
                href={supportHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> TIRAR DÚVIDA
              </a>

              {paymentGuideStep < 2 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    setPaymentGuideStep(
                      (paymentGuideStep + 1) as PaymentGuideStep,
                    )
                  }
                >
                  CONTINUAR
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={loading || expired}
                  onClick={submitProof}
                >
                  {loading ? "Enviando..." : "ENVIAR COMPROVANTE"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
