"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type PendingProof = {
  id: string;
  amount: number | string;
  dueDate: string;
  uploadToken: string;
  trackingCode?: string | null;
};

type Payload = {
  pendingProofs?: PendingProof[];
  error?: string;
};

const SESSION_KEY = "oh_corrente_em_dia_pending_proof_notice_v1";
const CORRENTE_HREF =
  "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/corrente-em-dia";

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

export function MemberPendingProofLoginModal() {
  const [items, setItems] = useState<PendingProof[]>([]);
  const [open, setOpen] = useState(false);
  const [noticeKey, setNoticeKey] = useState(SESSION_KEY);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadingId, setUploadingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const session = data.session;
    const token = session?.access_token;
    if (!token || !session) return;

    const noticeKey = `${SESSION_KEY}:${session.user.id}:${session.expires_at ?? "session"}`;
    if (window.sessionStorage.getItem(noticeKey) === "closed") return;

    const response = await fetch(
      "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) return;

    const pending = (payload.pendingProofs ?? []).filter(
      (item) => item.id && item.uploadToken,
    );
    if (pending.length === 0) return;

    setItems(pending);
    setNoticeKey(noticeKey);
    setOpen(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
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

  if (!open) return null;

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
          Há contribuição por Pix aguardando comprovante. Você pode enviar o arquivo agora ou abrir o Corrente em Dia.
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
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"
            >
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="block font-black text-[#123D2C]">
                    {money(item.amount)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Prevista para {date(item.dueDate)}
                  </span>
                </span>
                {item.trackingCode && (
                  <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#2F6B43]">
                    {item.trackingCode}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) =>
                  setFiles((current) => ({
                    ...current,
                    [item.id]: event.target.files?.[0] ?? null,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
              />
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
            </article>
          ))}

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
