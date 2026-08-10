"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Payload = {
  canManage?: boolean;
  dashboard?: {
    pendingContributionConfirmations?: number;
  };
};

const SESSION_KEY = "oh_corrente_finance_pending_notice_v1";
const APPROVAL_HREF =
  "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/contribuicoes";

export function FinancePendingContributionsLoginModal() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [noticeKey, setNoticeKey] = useState(SESSION_KEY);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const session = data.session;
    const token = session?.access_token;
    if (!token || !session) return;

    const noticeKey = `${SESSION_KEY}:${session.user.id}:${session.expires_at ?? "session"}`;
    if (window.sessionStorage.getItem(noticeKey) === "closed") return;

    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia",
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!response.ok) return;

    const payload = (await response.json().catch(() => ({}))) as Payload;
    const pending = payload.dashboard?.pendingContributionConfirmations ?? 0;
    if (!payload.canManage || pending <= 0) return;

    setCount(pending);
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="finance-pending-title"
        className="w-full max-w-lg rounded-[1.5rem] bg-white p-4 shadow-2xl sm:rounded-[2rem] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">
              Tesouraria / Financeiro
            </p>
            <h2
              id="finance-pending-title"
              className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl"
            >
              Contribuições aguardando confirmação
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

        <p className="mt-3 rounded-2xl bg-amber-50 p-4 font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
          {count} contribuição{count === 1 ? "" : "ões"} com comprovante enviado aguardando conferência.
        </p>

        <Link
          href={APPROVAL_HREF}
          className="mt-3 block rounded-xl bg-[#123D2C] px-4 py-3 text-center font-black text-white"
        >
          Abrir tela de aprovação
        </Link>
      </section>
    </div>
  );
}
