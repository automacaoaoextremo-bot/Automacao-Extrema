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
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-[2rem] sm:p-6"
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
}: {
  settings: MemberContributionSettings;
  person: MemberContributionPerson;
  receptionContacts: MemberReceptionContact[];
  onCompleted?: () => Promise<void> | void;
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

  const paymentSummary = useMemo(() => {
    if (paymentMethod === "recepcao") {
      return "Cartão de Crédito, Débito ou Dinheiro";
    }
    return recurring ? "Pix recorrente agendado no banco" : "Pix — contribuição única";
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
      if (!Number.isInteger(occurrences) || occurrences < 2 || occurrences > 120) {
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
      const payload = (await response.json().catch(() => ({}))) as IntentResult;
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível registrar a contribuição.");
      }

      setResult(payload);
      setModal("result");
      setMessage(payload.message || "Intenção registrada.");

      if (payload.requiresReception && payload.receptionWhatsappUrl) {
        window.open(payload.receptionWhatsappUrl, "_blank", "noopener,noreferrer");
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
        throw new Error(payload.error || "Não foi possível enviar o comprovante.");
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
        className="w-full rounded-2xl bg-white px-5 py-4 text-center text-base font-black text-[#123D2C] shadow-lg ring-1 ring-white/30 transition hover:-translate-y-0.5"
      >
        Contribuir
      </button>

      {modal === "payment" && (
        <Modal onClose={() => setModal(null)} labelledBy="member-payment-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                Contribuição do Filho da Corrente
              </p>
              <h2 id="member-payment-title" className="mt-2 text-2xl font-black text-[#123D2C]">
                Escolha a forma de pagamento
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
            >
              Fechar
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
            <p className="text-sm font-black text-[#123D2C]">Valor validado para você</p>
            <p className="mt-1 text-3xl font-black text-[#123D2C]">{money(amount)}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Identificação sigilosa: Filho da Corrente — {person.fullName}.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("pix")}
              className={`rounded-2xl px-3 py-4 text-sm font-black ring-1 ${
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
              className={`rounded-2xl px-3 py-4 text-sm font-black ring-1 ${
                paymentMethod === "recepcao"
                  ? "bg-[#123D2C] text-white ring-[#123D2C]"
                  : "bg-white text-[#123D2C] ring-[#123D2C]/15"
              }`}
            >
              Cartão, Débito ou Dinheiro
            </button>
          </div>

          {paymentMethod === "pix" && (
            <div className="mt-4 grid gap-2">
              {(settings.recurringOptions ?? [])
                .filter((option) => option.available)
                .map((option) => (
                  <label
                    key={option.value}
                    className={`rounded-2xl p-4 ring-1 ${
                      recurrenceType === option.value
                        ? "bg-[#E9F2E7] ring-[#123D2C]/20"
                        : "bg-white ring-[#123D2C]/10"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        checked={recurrenceType === option.value}
                        onChange={() => setRecurrenceType(option.value)}
                        className="mt-1 h-5 w-5"
                      />
                      <span>
                        <span className="block font-black text-[#123D2C]">
                          {option.label}
                        </span>
                        {option.note && (
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#123D2C]">
                Primeira contribuição
                <input
                  type="date"
                  value={recurrenceStartDate}
                  onChange={(event) => setRecurrenceStartDate(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#123D2C]">
                Quantas vezes
                <input
                  type="number"
                  min="2"
                  max="120"
                  value={recurrenceOccurrences}
                  onChange={(event) => setRecurrenceOccurrences(event.target.value)}
                  className="rounded-2xl border border-slate-200 p-4"
                />
              </label>
            </div>
          )}

          {!person.email && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="font-black text-amber-900">E-mail para receber a confirmação</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Seu cadastro ainda não possui e-mail. Você pode informar um endereço agora.
              </p>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                inputMode="email"
                placeholder="seuemail@exemplo.com"
                className="mt-3 w-full rounded-2xl border border-amber-200 bg-white p-4"
              />
              <label className="mt-3 flex items-start gap-3 text-sm font-bold text-amber-950">
                <input
                  type="checkbox"
                  checked={updateEmail}
                  onChange={(event) => setUpdateEmail(event.target.checked)}
                  className="mt-1 h-5 w-5"
                />
                Atualizar meu cadastro com este e-mail.
              </label>
            </div>
          )}

          <label className="mt-4 grid gap-2 text-sm font-black text-[#123D2C]">
            Observação opcional
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Inclua uma observação somente quando considerar necessário"
              className="min-h-24 rounded-2xl border border-slate-200 p-4 font-semibold"
            />
          </label>

          <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
              Resumo
            </p>
            <p className="mt-2 font-black text-[#123D2C]">{paymentSummary}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Valor considerado: {money(amount)}
            </p>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={registerIntent}
            disabled={saving}
            className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-60"
          >
            {saving
              ? "Registrando..."
              : paymentMethod === "recepcao"
                ? "Falar com Recepção"
                : "Confirmar forma de pagamento"}
          </button>

          {paymentMethod === "recepcao" && receptionContacts.length === 0 && (
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
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
              <h2 id="member-result-title" className="mt-2 text-2xl font-black text-[#123D2C]">
                {result.requiresReception
                  ? "Fale com a Recepção para concluir"
                  : "Faça o Pix e envie o comprovante"}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeResult}
              className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
            >
              Fechar
            </button>
          </div>

          {message && (
            <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
              {error}
            </p>
          )}

          {result.pix && (
            <>
              <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">
                  PIX TUCXA | chave: {result.pix.key} | recebedor: {result.pix.receiverName} | valor: {money(result.pix.amount)} | identificação: {result.pix.identification}
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
                {result.qrCodeDataUrl && (
                  <Image
                    src={result.qrCodeDataUrl}
                    alt="QR Code Pix Tucxa"
                    width={420}
                    height={420}
                    unoptimized
                    className="mx-auto h-auto w-full max-w-[220px] rounded-2xl bg-white"
                  />
                )}
                <div>
                  <p className="font-black text-[#123D2C]">Pix Copia e Cola</p>
                  <p className="mt-2 max-h-32 overflow-auto break-all rounded-2xl bg-white p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {result.pixCopyPaste}
                  </p>
                  <button
                    type="button"
                    onClick={copyPix}
                    className="mt-3 w-full rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white"
                  >
                    Copiar Pix Copia e Cola
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <h3 className="text-lg font-black text-[#123D2C]">Enviar comprovante</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  A Tesouraria/Financeiro receberá o comprovante para validação e atualização do acompanhamento.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="mt-3 w-full rounded-2xl border border-slate-200 p-3"
                />
                <button
                  type="button"
                  onClick={uploadReceipt}
                  disabled={!file || uploading}
                  className="mt-3 w-full rounded-2xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50"
                >
                  {uploading ? "Enviando..." : "Enviar comprovante"}
                </button>
              </div>
            </>
          )}

          {result.requiresReception && (
            <div className="mt-4 rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
              <p className="font-black text-[#123D2C]">
                Esta contribuição já aparece para a Tesouraria/Financeiro como aguardando pagamento com cartão, débito ou dinheiro.
              </p>
              {result.receptionWhatsappUrl && (
                <a
                  href={result.receptionWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
                >
                  Falar com Recepção
                </a>
              )}
            </div>
          )}

          <div className={`mt-4 grid gap-2 ${receiptSent ? "" : "sm:grid-cols-2"}`}>
            {!receiptSent && (
              <button
                type="button"
                onClick={() => setModal("payment")}
                className="rounded-2xl bg-white px-4 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
              >
                Voltar e Editar
              </button>
            )}
            <button
              type="button"
              onClick={closeResult}
              className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white"
            >
              {receiptSent ? "Fechar" : "Fechar e enviar comprovante depois"}
            </button>
          </div>

          {result.whatsappShareUrl && (
            <a
              href={result.whatsappShareUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block rounded-2xl bg-[#25D366] px-4 py-3 text-center font-black text-white"
            >
              Enviar confirmação pelo WhatsApp
            </a>
          )}

          {result.notificationWarning && (
            <p className="mt-3 text-xs font-semibold leading-5 text-amber-800">
              {result.notificationWarning}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
