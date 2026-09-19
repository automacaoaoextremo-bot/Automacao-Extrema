"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, MessageCircle, TimerReset } from "@/components/impacto-no-controle/icons";
import QRCode from "qrcode";
import { buildPixPayload } from "@/lib/impacto-no-controle/pix";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";

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
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
  const numbers = input.selectedNumbers.length ? input.selectedNumbers.map((n) => String(n).padStart(2, "0")).join(", ") : "sem números";
  const message = `Olá${input.name ? `, ${input.name}` : ""}! Sua reserva na ação ${input.campaignTitle} foi criada.

Números reservados: ${numbers}
Valor: ${formatMoneyFromCents(input.amountCents)}

Acesse este link para fazer o Pix, enviar o comprovante e acompanhar sua participação:
${input.reservationUrl}

Depois de pagar no app do banco, volte por este mesmo link e envie o comprovante.`;
  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

export function ReservationPayment({ reservation }: ReservationPaymentProps) {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ target: "pix" | "key"; text: string; tone: "success" | "error" } | null>(null);
  const [showWhatsAppBox, setShowWhatsAppBox] = useState(false);
  const [reservationLinkFeedback, setReservationLinkFeedback] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const expiresAt = useMemo(() => new Date(reservation.reservationExpiresAt).getTime(), [reservation.reservationExpiresAt]);
  const remainingMs = now === null ? null : Math.max(0, expiresAt - now);
  const expired = remainingMs !== null && remainingMs <= 0;
  const reservationUrl = typeof window !== "undefined" ? `${window.location.origin}/solucoes/impacto-no-controle/reserva/${reservation.token}` : `/solucoes/impacto-no-controle/reserva/${reservation.token}`;
  const reservationWhatsAppUrl = buildReservationWhatsAppUrl({
    phone: reservation.participantPhone,
    name: reservation.participantName,
    campaignTitle: reservation.campaignTitle,
    reservationUrl,
    selectedNumbers: reservation.selectedNumbers,
    amountCents: reservation.amountCents,
  });
  const reservationWhatsAppMessage = `Reserva da ação ${reservation.campaignTitle}

Números: ${reservation.selectedNumbers.length ? reservation.selectedNumbers.map((n) => String(n).padStart(2, "0")).join(", ") : "sem números"}
Valor: ${formatMoneyFromCents(reservation.amountCents)}

Depois de fazer o Pix no banco, volte neste link para enviar o comprovante:
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
    const justCreated = window.sessionStorage.getItem(`impacto-reserva-criada-${reservation.token}`);
    if (justCreated) {
      setShowWhatsAppBox(true);
      window.sessionStorage.removeItem(`impacto-reserva-criada-${reservation.token}`);
    }
  }, [reservation.token]);

  useEffect(() => {
    if (!pixPayload) return;
    QRCode.toDataURL(pixPayload, { margin: 1, width: 260 }).then(setQrCode).catch(() => setQrCode(null));
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
        text: "✅ Pix copia e cola copiado! Agora abra o app do seu banco, escolha Pix Copia e Cola e cole o código para pagar. Depois volte para esta página e envie o comprovante.",
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
      setCopyFeedback({ target: "key", tone: "success", text: "✅ Chave Pix copiada! Cole a chave no app do banco para pagar." });
    } catch {
      setCopyFeedback({ target: "key", tone: "error", text: "Não foi possível copiar automaticamente. Copie manualmente a chave Pix exibida." });
    }
  }

  async function copyReservationLink() {
    try {
      await writeToClipboard(reservationUrl);
      setReservationLinkFeedback("✅ Link da reserva copiado. Você pode colar em uma conversa do WhatsApp para voltar depois do Pix.");
    } catch {
      setReservationLinkFeedback("Não foi possível copiar automaticamente. Copie o link da barra do navegador.");
    }
  }

  async function copyReservationMessage() {
    try {
      await writeToClipboard(reservationWhatsAppMessage);
      setReservationLinkFeedback("✅ Mensagem copiada. Abra o WhatsApp e cole em uma conversa para guardar o link da reserva.");
    } catch {
      setReservationLinkFeedback("Não foi possível copiar automaticamente. Use o botão de abrir WhatsApp ou copie o link da barra do navegador.");
    }
  }

  async function openReservationWhatsApp() {
    try {
      await writeToClipboard(reservationWhatsAppMessage);
      setReservationLinkFeedback("✅ Mensagem copiada. Se o WhatsApp não abrir automaticamente, abra o app e cole a mensagem em uma conversa.");
    } catch {
      setReservationLinkFeedback("Se o WhatsApp não abrir automaticamente, copie o link da reserva pela barra do navegador.");
    }

    if (reservationWhatsAppUrl) {
      window.location.href = reservationWhatsAppUrl;
    }
  }

  async function submitProof() {
    setError(null);
    if (expired) return setError("A reserva expirou. Volte para a campanha e escolha seus números novamente.");
    if (!proof) return setError("Inclua o comprovante do Pix para finalizar sua participação.");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("reservation_token", reservation.token);
      formData.append("proof", proof);

      const response = await fetch("/api/impacto-no-controle/participate", { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Não foi possível enviar o comprovante.");
      router.push(`/solucoes/impacto-no-controle/obrigado/${json.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card overflow-hidden p-6 md:p-8" style={{ borderColor: "var(--campaign-border)", background: "linear-gradient(180deg, #fffdf7 0%, var(--campaign-soft) 100%)" }}>
        <div className="flex flex-wrap items-center gap-3">
          {reservation.clientLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do logo do cliente.
            <img src={reservation.clientLogoUrl} alt={reservation.clientName} className="h-12 w-12 rounded-2xl border border-[var(--border)] bg-white object-cover p-1" />
          ) : null}
          <span className="rounded-full px-4 py-2 text-sm font-black" style={{ background: "var(--campaign-soft)", color: "var(--campaign-primary)" }}>{reservation.clientName}</span>
        </div>

        <h1 className="mt-5 text-3xl font-black leading-tight md:text-4xl" style={{ color: "var(--campaign-primary)" }}>Reserva criada. Agora faça o Pix.</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          Seus números ficam reservados temporariamente. Faça o Pix e envie o comprovante nesta página para finalizar sua participação.
        </p>

        <div className={`mt-5 rounded-2xl border-2 p-4 ${showWhatsAppBox ? "border-[#f59e0b] bg-[#fff1a8]" : "bg-white"}`} style={showWhatsAppBox ? undefined : { borderColor: "var(--campaign-border)" }}>
          <p className="font-black" style={{ color: "var(--campaign-primary)" }}>Guarde este link antes de ir ao banco</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            O link desta página permite voltar depois do Pix para enviar o comprovante. Para evitar perder a reserva ao abrir o app do banco, salve este link no WhatsApp ou copie a mensagem abaixo.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {reservationWhatsAppUrl ? (
              <button type="button" className="btn-primary" style={{ background: "var(--campaign-primary)" }} onClick={openReservationWhatsApp}>
                <MessageCircle className="h-4 w-4" /> Abrir WhatsApp com o link
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={copyReservationMessage}>Copiar mensagem da reserva</button>
            <button type="button" className="btn-secondary sm:col-span-2" onClick={copyReservationLink}>Copiar somente o link da reserva</button>
          </div>
          {reservationLinkFeedback ? (
            <div className="mt-3 rounded-2xl border-2 border-[#f59e0b] bg-[#fff1a8] p-4 text-sm font-black leading-6 text-[#3f2a00]" role="status" aria-live="polite">
              {reservationLinkFeedback}
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl border-2 bg-white p-4" style={{ borderColor: "var(--campaign-primary)" }}>
          <div className="flex items-center gap-3">
            <TimerReset className="h-6 w-6" style={{ color: "var(--campaign-primary)" }} />
            <div>
              <p className="text-sm font-bold text-[var(--muted)]">Tempo restante da reserva</p>
              <p className="text-2xl font-black" style={{ color: "var(--campaign-primary)" }}>
                {remainingMs === null ? "Calculando..." : formatCountdown(remainingMs)}
              </p>
            </div>
          </div>
          {expired ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">Sua reserva expirou. Volte para a campanha e escolha seus números novamente.</p> : null}
        </div>
      </div>

      <div className="card mt-5 p-5" style={{ borderColor: "var(--campaign-border)" }}>
        <h2 className="text-2xl font-black" style={{ color: "var(--campaign-primary)" }}>Resumo da reserva</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl p-4" style={{ background: "var(--campaign-card)" }}>
            <p className="text-sm font-bold text-[var(--muted)]">Campanha</p>
            <p className="mt-1 font-extrabold" style={{ color: "var(--campaign-primary)" }}>{reservation.campaignTitle}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--campaign-card)" }}>
            <p className="text-sm font-bold text-[var(--muted)]">Valor</p>
            <p className="mt-1 font-extrabold" style={{ color: "var(--campaign-primary)" }}>{formatMoneyFromCents(reservation.amountCents)}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-4" style={{ borderColor: "var(--campaign-border)" }}>
          <p className="font-bold" style={{ color: "var(--campaign-primary)" }}>Números reservados</p>
          <p className="mt-2 text-[var(--muted)]">{reservation.selectedNumbers.length ? reservation.selectedNumbers.map((n) => String(n).padStart(2, "0")).join(", ") : "Nenhum número escolhido."}</p>
        </div>
      </div>

      <div className="card mt-5 p-5" style={{ borderColor: "var(--campaign-border)" }}>
        <h2 className="text-2xl font-black" style={{ color: "var(--campaign-primary)" }}>1. Faça o Pix</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Chave Pix: <strong>{reservation.pixKey}</strong></p>
        <div className="mt-4 grid gap-3">
          <button className="btn-primary" style={{ background: "var(--campaign-primary)" }} onClick={copyPix} disabled={expired || !pixPayload}>Copiar Pix copia e cola</button>
          {copyFeedback?.target === "pix" ? (
            <div className={`rounded-2xl border-2 p-4 text-sm font-black leading-6 ${copyFeedback.tone === "success" ? "border-[#f59e0b] bg-[#fff1a8] text-[#3f2a00]" : "border-red-200 bg-red-50 text-red-700"}`} role="status" aria-live="polite">
              {copyFeedback.text}
            </div>
          ) : null}
          <button className="btn-secondary" onClick={copyPixKey} disabled={expired}>Copiar chave Pix</button>
          {copyFeedback?.target === "key" ? (
            <div className={`rounded-2xl border-2 p-4 text-sm font-black leading-6 ${copyFeedback.tone === "success" ? "border-[#f59e0b] bg-[#fff1a8] text-[#3f2a00]" : "border-red-200 bg-red-50 text-red-700"}`} role="status" aria-live="polite">
              {copyFeedback.text}
            </div>
          ) : null}
          <details className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm">
            <summary className="cursor-pointer font-extrabold" style={{ color: "var(--campaign-primary)" }}>Ver código Pix copia e cola</summary>
            <textarea className="input mt-3 min-h-28 text-xs" readOnly value={pixPayload} />
          </details>
          {qrCode ? (
            // eslint-disable-next-line @next/next/no-img-element -- QR Code gerado em data URL no cliente.
            <img src={qrCode} alt="QR Code Pix" className="mx-auto mt-2 rounded-2xl border border-[var(--border)] bg-white p-3" />
          ) : null}
        </div>
      </div>

      <div className="card mt-5 p-5" style={{ borderColor: "var(--campaign-border)" }}>
        <h2 className="text-2xl font-black" style={{ color: "var(--campaign-primary)" }}>2. Envie o comprovante</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Depois de pagar no app do banco, volte para esta página e anexe o comprovante para finalizar sua participação.</p>
        <a className="mt-3 inline-flex items-center gap-2 font-extrabold underline" style={{ color: "var(--campaign-primary)" }} href="https://wa.me/5519989848246?text=Ol%C3%A1%21%20Estou%20com%20d%C3%BAvida%20para%20enviar%20o%20comprovante%20no%20Impacto%20no%20Controle.%20Gostaria%20de%20falar%20com%20o%20Suporte." target="_blank" rel="noreferrer">
          <MessageCircle className="h-4 w-4" /> Preciso falar com o Suporte no WhatsApp
        </a>
        <div className="mt-4">
          <label className="label">Comprovante do Pix *</label>
          <input className="input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={expired} onChange={(e) => setProof(e.target.files?.[0] || null)} />
          <p className="mt-2 text-sm text-[var(--muted)]">O sistema bloqueia comprovantes já usados em outra participação. Quando o arquivo tiver texto legível, também tentará conferir valor, Pix/favorecido e status efetivado. Prints e imagens podem seguir para conferência manual da organização.</p>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        <button className="btn-primary mt-4" style={{ background: "var(--campaign-primary)" }} disabled={loading || expired} onClick={submitProof}>
          {loading ? "Enviando..." : "Enviar comprovante e finalizar"}
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[#fff8e8] p-4 text-sm leading-6 text-[var(--brand-dark)]">
        <div className="flex gap-3">
          <HelpCircle className="mt-1 h-5 w-5 shrink-0" />
          <p><strong>Dica:</strong> salve esta página ou mantenha a aba aberta até finalizar. Se o navegador fechar ao abrir o app do banco, volte pelo mesmo link da reserva.</p>
        </div>
      </div>
    </div>
  );
}
