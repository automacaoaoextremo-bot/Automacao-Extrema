"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export type MemberReceptionContact = {
  name: string;
  whatsapp: string;
  whatsappUrl: string;
};

export type MemberContributionSettings = {
  defaultMonthlyAmount: number;
  pixKey: string;
  pixReceiverName: string;
  recurringOptions: Array<{
    value: string;
    label: string;
    available: boolean;
    note?: string;
  }>;
};

export type MemberContributionPerson = {
  fullName: string;
  email: string | null;
  whatsapp: string | null;
};

type IntentResult = {
  contribution?: {
    id: string;
    status: string;
    due_date: string;
  };
  uploadToken?: string;
  trackingCode?: string;
  resumeUrl?: string;
  pixCopyPaste?: string | null;
  qrCodeDataUrl?: string | null;
  pix?: {
    key: string;
    receiverName: string;
    amount: number;
    identification: string;
  } | null;
  requiresReception?: boolean;
  receptionWhatsappUrl?: string | null;
  whatsappShareUrl?: string | null;
  emailUpdated?: boolean;
  notificationWarning?: string | null;
  message?: string;
  error?: string;
};

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Filho da Corrente";
}

function Modal({
  children,
  onClose,
  labelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/55 p-2 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-white p-3 shadow-2xl sm:max-h-[94vh] sm:rounded-[2rem] sm:p-6"
      >
        {children}
      </section>
    </div>
  );
}

export function MemberContributionJourney({
  settings,
  person,
  receptionContacts,
  onCompleted,
  triggerLabel = "Contribuir",
  dueDate,
}: {
  settings: MemberContributionSettings;
  person: MemberContributionPerson;
  receptionContacts: MemberReceptionContact[];
  onCompleted?: () => Promise<void> | void;
  triggerLabel?: string;
  dueDate?: string;
}) {
  const [modal, setModal] = useState<"payment" | "result" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "recepcao">(
    "pix",
  );
  const [recurrenceType, setRecurrenceType] = useState("pontual");
  const [recurrenceStartDate, setRecurrenceStartDate] = useState("");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState("12");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState(person.email ?? "");
  const [updateEmail, setUpdateEmail] = useState(!person.email);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<IntentResult | null>(null);

  const recurring = recurrenceType === "pix_agendado";
  const amount = settings.defaultMonthlyAmount;
  const displayName = firstName(person.fullName);

  const paymentSummary = useMemo(() => {
    if (paymentMethod === "recepcao") {
      return "Cartão de Crédito, Débito ou Dinheiro";
    }
    return recurring
      ? "Pix recorrente agendado no banco"
      : "Pix — contribuição única";
  }, [paymentMethod, recurring]);

  async function accessToken() {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }

  function openPayment() {
    setError("");
    setMessage("");
    setEmail(person.email ?? email);
    setModal("payment");
  }

  async function registerIntent() {
    if (recurring) {
      if (!recurrenceStartDate) {
        setError("Informe a data da primeira contribuição recorrente.");
        return;
      }
      const occurrences = Number(recurrenceOccurrences);
      if (
        !Number.isInteger(occurrences) ||
        occurrences < 2 ||
        occurrences > 120
      ) {
        setError("Informe uma quantidade entre 2 e 120 contribuições.");
        return;
      }
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Informe um e-mail válido ou deixe o campo em branco.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = await accessToken();
      const response = await fetch(
        "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "createContributionIntent",
            paymentMethod,
            recurrenceType,
            recurrenceStartDate: recurring ? recurrenceStartDate : null,
            recurrenceOccurrences: recurring
              ? Number(recurrenceOccurrences)
              : null,
            dueDate: !recurring ? dueDate ?? null : null,
            notes,
            email,
            updateEmail: Boolean(email && updateEmail),
            contributionId: result?.contribution?.id ?? null,
            uploadToken: result?.uploadToken ?? null,
            trackingCode: result?.trackingCode ?? null,
            resumeUrl: result?.resumeUrl ?? null,
          }),
        },
      );
      const payload = (await response
        .json()
        .catch(() => ({}))) as IntentResult;
      if (!response.ok) {
        throw new Error(
          payload.error || "Não foi possível registrar a contribuição.",
        );
      }

      setResult(payload);
      setModal("result");
      setMessage(payload.message || "Intenção registrada.");

      if (payload.requiresReception && payload.receptionWhatsappUrl) {
        window.open(
          payload.receptionWhatsappUrl,
          "_blank",
          "noopener,noreferrer",
        );
      }

      await onCompleted?.();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao registrar a contribuição.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadReceipt() {
    if (!file || !result?.contribution?.id || !result.uploadToken) {
      setError("Selecione uma imagem ou PDF do comprovante.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("contributionId", result.contribution.id);
      form.set("uploadToken", result.uploadToken);
      form.set("file", file);

      const response = await fetch(
        "/api/organizacao-em-harmonia/site-tucxa/contribuicoes/comprovante",
        { method: "POST", body: form },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        notificationWarning?: string | null;
      };
      if (!response.ok) {
        throw new Error(
          payload.error || "Não foi possível enviar o comprovante.",
        );
      }

      setMessage(
        [payload.message || "Comprovante enviado.", payload.notificationWarning]
          .filter(Boolean)
          .join(" "),
      );
      setReceiptSent(true);
      setFile(null);
      await onCompleted?.();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao enviar o comprovante.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function copyPix() {
    if (!result?.pixCopyPaste) return;
    await navigator.clipboard.writeText(result.pixCopyPaste);
    setMessage("Pix Copia e Cola copiado.");
  }

  function closeResult() {
    setModal(null);
    setResult(null);
    setFile(null);
    setReceiptSent(false);
    setNotes("");
    setMessage("");
    setError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={openPayment}
        className="w-full rounded-xl bg-[#123D2C] px-3 py-2.5 text-center text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-base"
      >
        {triggerLabel}
      </button>

      {modal === "payment" && (
        <Modal onClose={() => setModal(null)} labelledBy="member-payment-title">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs sm:tracking-[0.2em]">
                Contribuição do Filho da Corrente
              </p>
              <h2
                id="member-payment-title"
                className="mt-0.5 text-xl font-black leading-tight text-[#123D2C] sm:mt-2 sm:text-2xl"
              >
                Forma de pagamento
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white sm:px-4"
            >
              Fechar
            </button>
          </div>

          <div className="mt-2.5 rounded-xl bg-[#E9F2E7] p-3 ring-1 ring-[#123D2C]/10 sm:mt-4 sm:rounded-2xl sm:p-4">
            <p className="text-xs font-black text-[#123D2C] sm:text-sm">
              Valor validado para você
            </p>
            <p className="mt-0.5 text-2xl font-black text-[#123D2C] sm:mt-1 sm:text-3xl">
              {money(amount)}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600 sm:mt-1 sm:text-sm sm:leading-6">
              Identificação sigilosa: Filho da Corrente — {displayName}.
            </p>
            {dueDate && (
              <p className="mt-1 text-xs font-bold text-[#2F6B43]">
                Data prevista: {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${dueDate}T12:00:00Z`))}
              </p>
            )}
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-4">
            <button
              type="button"
              onClick={() => setPaymentMethod("pix")}
              className={`rounded-xl px-3 py-3 text-sm font-black ring-1 sm:rounded-2xl sm:py-4 ${
                paymentMethod === "pix"
                  ? "bg-[#123D2C] text-white ring-[#123D2C]"
                  : "bg-white text-[#123D2C] ring-[#123D2C]/15"
              }`}
            >
              Pix
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("recepcao");
                setRecurrenceType("pontual");
              }}
              className={`rounded-xl px-2 py-3 text-xs font-black ring-1 sm:rounded-2xl sm:px-3 sm:py-4 sm:text-sm ${
                paymentMethod === "recepcao"
                  ? "bg-[#123D2C] text-white ring-[#123D2C]"
                  : "bg-white text-[#123D2C] ring-[#123D2C]/15"
              }`}
            >
              Cartão, Débito ou Dinheiro
            </button>
          </div>

          {paymentMethod === "pix" && (
            <div className="mt-2.5 grid gap-2 sm:mt-4">
              {(settings.recurringOptions ?? [])
                .filter((option) => option.available)
                .map((option) => (
                  <label
                    key={option.value}
                    className={`rounded-xl p-3 ring-1 sm:rounded-2xl sm:p-4 ${
                      recurrenceType === option.value
                        ? "bg-[#E9F2E7] ring-[#123D2C]/20"
                        : "bg-white ring-[#123D2C]/10"
                    }`}
                  >
                    <span className="flex items-start gap-2.5 sm:gap-3">
                      <input
                        type="radio"
                        checked={recurrenceType === option.value}
                        onChange={() => setRecurrenceType(option.value)}
                        className="mt-0.5 h-5 w-5"
                      />
                      <span>
                        <span className="block text-sm font-black text-[#123D2C]">
                          {option.label}
                        </span>
                        {option.note && (
                          <span className="mt-0.5 block text-xs leading-4 text-slate-500 sm:mt-1 sm:leading-5">
                            {option.note}
                          </span>
                        )}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          )}

          {paymentMethod === "pix" && recurring && (
            <div className="mt-2.5 grid gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-3">
              <label className="grid gap-1 text-sm font-black text-[#123D2C] sm:gap-2">
                Primeira contribuição
                <input
                  type="date"
                  value={recurrenceStartDate}
                  onChange={(event) => setRecurrenceStartDate(event.target.value)}
                  className="rounded-xl border border-slate-200 p-3 sm:rounded-2xl sm:p-4"
                />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C] sm:gap-2">
                Quantas vezes
                <input
                  type="number"
                  min="2"
                  max="120"
                  value={recurrenceOccurrences}
                  onChange={(event) => setRecurrenceOccurrences(event.target.value)}
                  className="rounded-xl border border-slate-200 p-3 sm:rounded-2xl sm:p-4"
                />
              </label>
            </div>
          )}

          {!person.email && (
            <div className="mt-2.5 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200 sm:mt-4 sm:rounded-2xl sm:p-4">
              <p className="text-sm font-black text-amber-900">
                E-mail para receber a confirmação
              </p>
              <p className="mt-0.5 text-xs leading-5 text-amber-900/80 sm:mt-1 sm:text-sm sm:leading-6">
                Seu cadastro ainda não possui e-mail. Você pode informar um endereço agora.
              </p>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                inputMode="email"
                placeholder="seuemail@exemplo.com"
                className="mt-2 w-full rounded-xl border border-amber-200 bg-white p-3 sm:mt-3 sm:rounded-2xl sm:p-4"
              />
              <label className="mt-2 flex items-start gap-2 text-xs font-bold text-amber-950 sm:mt-3 sm:gap-3 sm:text-sm">
                <input
                  type="checkbox"
                  checked={updateEmail}
                  onChange={(event) => setUpdateEmail(event.target.checked)}
                  className="mt-0.5 h-5 w-5"
                />
                Atualizar meu cadastro com este e-mail.
              </label>
            </div>
          )}

          <label className="mt-2.5 grid gap-1 text-sm font-black text-[#123D2C] sm:mt-4 sm:gap-2">
            Observação opcional
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Inclua uma observação somente quando considerar necessário"
              className="min-h-16 rounded-xl border border-slate-200 p-3 font-semibold sm:min-h-24 sm:rounded-2xl sm:p-4"
            />
          </label>

          <div className="mt-2.5 rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:mt-4 sm:rounded-2xl sm:p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-xs sm:tracking-[0.14em]">
              Resumo
            </p>
            <p className="mt-1 text-sm font-black text-[#123D2C] sm:mt-2 sm:text-base">
              {paymentSummary}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-slate-600 sm:mt-1 sm:text-sm">
              Valor considerado: {money(amount)}
            </p>
          </div>

          {error && (
            <p className="mt-2.5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 sm:mt-4 sm:rounded-2xl sm:p-4">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={registerIntent}
            disabled={saving}
            className="mt-2.5 w-full rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-60 sm:mt-4 sm:rounded-2xl sm:px-5 sm:py-4"
          >
            {saving
              ? "Registrando..."
              : paymentMethod === "recepcao"
                ? "Falar com Recepção"
                : "Confirmar forma de pagamento"}
          </button>

          {paymentMethod === "recepcao" && receptionContacts.length === 0 && (
            <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900 sm:mt-3 sm:rounded-2xl sm:text-sm">
              A Recepção ainda não possui WhatsApp configurado. A intenção será registrada para acompanhamento da Tesouraria/Financeiro.
            </p>
          )}
        </Modal>
      )}

      {modal === "result" && result && (
        <Modal onClose={closeResult} labelledBy="member-result-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                Intenção registrada
              </p>
              <h2
                id="member-result-title"
                className="mt-1 text-2xl font-black text-[#123D2C] sm:mt-2"
              >
                {result.requiresReception
                  ? "Fale com a Recepção para concluir"
                  : "Faça o Pix e envie o comprovante"}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeResult}
              className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white sm:px-4"
            >
              Fechar
            </button>
          </div>

          {message && (
            <p className="mt-3 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800 sm:mt-4 sm:rounded-2xl sm:p-4">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-700 sm:mt-4 sm:rounded-2xl sm:p-4">
              {error}
            </p>
          )}

          {result.pix && (
            <>
              <div className="mt-3 rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:mt-4 sm:rounded-2xl sm:p-4">
                <p className="text-sm font-black text-[#123D2C]">
                  PIX TUCXA | chave: {result.pix.key} | recebedor: {result.pix.receiverName} | valor: {money(result.pix.amount)} | identificação: {result.pix.identification}
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-[220px_1fr] sm:gap-4">
                {result.qrCodeDataUrl && (
                  <Image
                    src={result.qrCodeDataUrl}
                    alt="QR Code Pix Tucxa"
                    width={420}
                    height={420}
                    unoptimized
                    className="mx-auto h-auto w-full max-w-[200px] rounded-xl bg-white sm:max-w-[220px] sm:rounded-2xl"
                  />
                )}
                <div>
                  <p className="font-black text-[#123D2C]">Pix Copia e Cola</p>
                  <p className="mt-1 max-h-28 overflow-auto break-all rounded-xl bg-white p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 sm:mt-2 sm:max-h-32 sm:rounded-2xl">
                    {result.pixCopyPaste}
                  </p>
                  <button
                    type="button"
                    onClick={copyPix}
                    className="mt-2 w-full rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white sm:mt-3 sm:rounded-2xl"
                  >
                    Copiar Pix Copia e Cola
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:mt-5 sm:rounded-2xl sm:p-4">
                <h3 className="text-lg font-black text-[#123D2C]">
                  Enviar comprovante
                </h3>
                <p className="mt-0.5 text-xs leading-5 text-slate-600 sm:mt-1 sm:text-sm sm:leading-6">
                  A Tesouraria/Financeiro receberá o comprovante para validação e atualização do acompanhamento.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 sm:mt-3 sm:rounded-2xl"
                />
                <button
                  type="button"
                  onClick={uploadReceipt}
                  disabled={!file || uploading}
                  className="mt-2 w-full rounded-xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50 sm:mt-3 sm:rounded-2xl"
                >
                  {uploading ? "Enviando..." : "Enviar comprovante"}
                </button>
              </div>
            </>
          )}

          {result.requiresReception && (
            <div className="mt-3 rounded-xl bg-[#E9F2E7] p-3 ring-1 ring-[#123D2C]/10 sm:mt-4 sm:rounded-2xl sm:p-4">
              <p className="font-black text-[#123D2C]">
                Esta contribuição já aparece para a Tesouraria/Financeiro como aguardando pagamento com cartão, débito ou dinheiro.
              </p>
              {result.receptionWhatsappUrl && (
                <a
                  href={result.receptionWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block rounded-xl bg-[#123D2C] px-4 py-3 text-center font-black text-white sm:mt-4 sm:rounded-2xl sm:px-5 sm:py-4"
                >
                  Falar com Recepção
                </a>
              )}
            </div>
          )}

          <div
            className={`mt-3 grid gap-2 sm:mt-4 ${receiptSent ? "" : "sm:grid-cols-2"}`}
          >
            {!receiptSent && (
              <button
                type="button"
                onClick={() => setModal("payment")}
                className="rounded-xl bg-white px-4 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 sm:rounded-2xl"
              >
                Voltar e Editar
              </button>
            )}
            <button
              type="button"
              onClick={closeResult}
              className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white sm:rounded-2xl"
            >
              {receiptSent ? "Fechar" : "Fechar e enviar comprovante depois"}
            </button>
          </div>

          {result.whatsappShareUrl && (
            <a
              href={result.whatsappShareUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block rounded-xl bg-[#25D366] px-4 py-3 text-center font-black text-white sm:mt-3 sm:rounded-2xl"
            >
              Enviar confirmação pelo WhatsApp
            </a>
          )}

          {result.notificationWarning && (
            <p className="mt-2 text-xs font-semibold leading-5 text-amber-800 sm:mt-3">
              {result.notificationWarning}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
