"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type PendingProof = {
  id: string;
  amount: number | string;
  dueDate: string;
  scheduledDates?: string[];
  uploadToken: string;
  paymentMethod?: string | null;
  pixCopyPaste?: string | null;
  qrCodeDataUrl?: string | null;
  receptionName?: string | null;
  receptionWhatsappUrl?: string | null;
  canDelete?: boolean;
};

type Payload = {
  pendingProofs?: PendingProof[];
  error?: string;
};

type Props = {
  enabled?: boolean;
};

const SESSION_KEY = "oh_corrente_em_dia_pending_proof_notice_v2";
const CORRENTE_HREF =
  "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/corrente-em-dia";
const API = "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia";

function money(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

export function MemberPendingProofLoginModal({ enabled = true }: Props) {
  const [items, setItems] = useState<PendingProof[]>([]);
  const [open, setOpen] = useState(false);
  const [noticeKey, setNoticeKey] = useState(SESSION_KEY);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadingId, setUploadingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [paymentDetailsId, setPaymentDetailsId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) return;

    const { data } = await supabaseBrowser.auth.getSession();
    const session = data.session;
    const token = session?.access_token;
    if (!token || !session) return;

    const sessionNoticeKey = `${SESSION_KEY}:${session.user.id}:${session.expires_at ?? "session"}`;
    if (window.sessionStorage.getItem(sessionNoticeKey) === "closed") return;

    const response = await fetch(API, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) return;

    const pending = (payload.pendingProofs ?? []).filter(
      (item) => item.id && item.uploadToken,
    );
    if (pending.length === 0) return;

    setItems(pending);
    setNoticeKey(sessionNoticeKey);
    setOpen(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, load]);

  function close() {
    window.sessionStorage.setItem(noticeKey, "closed");
    setOpen(false);
  }

  async function upload(item: PendingProof) {
    const file = files[item.id];
    if (!file) {
      setError("Selecione uma imagem ou PDF do comprovante.");
      return;
    }

    setUploadingId(item.id);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("contributionId", item.id);
      form.set("uploadToken", item.uploadToken);
      form.set("file", file);

      const response = await fetch(
        "/api/organizacao-em-harmonia/site-tucxa/contribuicoes/comprovante",
        { method: "POST", body: form },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível enviar o comprovante.");
      }

      setMessage(payload.message || "Comprovante enviado para conferência.");
      setFiles((current) => ({ ...current, [item.id]: null }));
      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao enviar o comprovante.",
      );
    } finally {
      setUploadingId("");
    }
  }

  async function copyPix(item: PendingProof) {
    if (!item.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(item.pixCopyPaste);
      setMessage("Pix Copia e Cola copiado.");
      setError("");
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o código e copie manualmente.");
    }
  }

  async function deleteContribution(item: PendingProof) {
    const dates = (item.scheduledDates ?? []).filter(Boolean);
    const detail =
      dates.length > 1
        ? ` Esta ação exclui a programação das datas ${dates.map(date).join(", ")}.`
        : "";
    if (
      !window.confirm(
        `Excluir esta contribuição ainda não validada?${detail}`,
      )
    ) {
      return;
    }

    setDeletingId(item.id);
    setError("");
    setMessage("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Sessão não encontrada.");

      const response = await fetch(API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancelContribution",
          contributionId: item.id,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível excluir a contribuição.");
      }

      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
      setMessage(payload.message || "Contribuição excluída.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao excluir a contribuição.",
      );
    } finally {
      setDeletingId("");
    }
  }

  if (!enabled || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-proof-title"
        className="max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:rounded-[2rem] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">
              Corrente em Dia
            </p>
            <h2
              id="pending-proof-title"
              className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl"
            >
              Comprovante de pagamento pendente
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white"
          >
            Fechar
          </button>
        </div>

        <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">
          Cada programação recorrente aparece uma única vez. Quando ela reúne
          várias datas, um único envio fica associado à programação completa.
        </p>

        {message && (
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-3 grid gap-3">
          {items.map((item) => {
            const scheduledDates = (item.scheduledDates ?? []).filter(Boolean);
            return (
              <article
                key={item.id}
                className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-black text-[#123D2C]">
                      {money(item.amount)}
                    </span>
                    {scheduledDates.length > 1 ? (
                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">
                        Datas desta programação: {scheduledDates.map(date).join(" · ")}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600">
                        Prevista para {date(item.dueDate)}
                      </span>
                    )}
                  </span>

                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {item.paymentMethod === "recepcao" ? (
                    item.receptionWhatsappUrl ? (
                      <a
                        href={item.receptionWhatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E9F2E7] px-3 py-2 text-center text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-sm"
                      >
                        Falar com a Recepção
                      </a>
                    ) : (
                      <span className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-black text-amber-900 ring-1 ring-amber-200 sm:text-sm">
                        Recepção sem WhatsApp
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentDetailsId((current) =>
                          current === item.id ? "" : item.id,
                        )
                      }
                      className="min-h-11 rounded-xl bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-sm"
                    >
                      QR Code / PIX
                    </button>
                  )}

                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/20 sm:text-sm">
                    Incluir Comprovante
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(event) =>
                        setFiles((current) => ({
                          ...current,
                          [item.id]: event.target.files?.[0] ?? null,
                        }))
                      }
                      className="sr-only"
                    />
                  </label>
                </div>

                {item.paymentMethod !== "recepcao" &&
                  paymentDetailsId === item.id && (
                    <div className="mt-2 rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                      <p className="text-sm font-black text-[#123D2C]">
                        Pagamento por PIX
                      </p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-[150px_1fr]">
                        {item.qrCodeDataUrl && (
                          <Image
                            src={item.qrCodeDataUrl}
                            alt="QR Code PIX da contribuição"
                            width={360}
                            height={360}
                            unoptimized
                            className="mx-auto h-auto w-full max-w-[150px] rounded-xl bg-white"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#2F6B43]">
                            PIX Copia e Cola
                          </p>
                          <p className="mt-1 max-h-24 overflow-auto break-all rounded-lg bg-[#F7FAF2] p-2 text-[11px] font-semibold text-slate-600">
                            {item.pixCopyPaste || "PIX indisponível."}
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyPix(item)}
                            disabled={!item.pixCopyPaste}
                            className="mt-2 w-full rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-black text-white disabled:opacity-40"
                          >
                            Copiar PIX Copia e Cola
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {files[item.id] && (
                  <p className="mt-2 truncate rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    Arquivo: {files[item.id]?.name}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void upload(item)}
                  disabled={!files[item.id] || uploadingId === item.id}
                  className="mt-2 w-full rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {uploadingId === item.id
                    ? "Enviando..."
                    : "Enviar comprovante"}
                </button>

                {item.canDelete && (
                  <button
                    type="button"
                    onClick={() => void deleteContribution(item)}
                    disabled={deletingId === item.id || uploadingId === item.id}
                    className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-black text-red-700 ring-1 ring-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deletingId === item.id
                      ? "Excluindo..."
                      : scheduledDates.length > 1
                        ? "Excluir programação"
                        : "Excluir contribuição"}
                  </button>
                )}
              </article>
            );
          })}

          {items.length === 0 && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              Não há mais comprovantes pendentes nesta sessão.
            </div>
          )}
        </div>

        <Link
          href={CORRENTE_HREF}
          className="mt-3 block rounded-xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
        >
          Abrir Corrente em Dia
        </Link>
      </section>
    </div>
  );
}
