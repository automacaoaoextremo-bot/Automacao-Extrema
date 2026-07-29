"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PublicSettings = {
  popupFrequency?:
    | "every_access"
    | "once_per_session"
    | "once_per_day"
    | "once_per_month"
    | "on_update"
    | "disabled";
  headline?: string;
  message?: string;
};

type Monthly = {
  month: string;
  revenues: number;
  expenses: number;
  result: number;
  provisional: boolean;
};

type PublicPayload = {
  settings?: PublicSettings;
  latest?: Monthly;
  confirmedPercentage?: number;
  provisionalNotice?: string | null;
};

type Snapshot = {
  id: string;
  published_at: string | null;
  payload: PublicPayload;
};

type ApiPayload = {
  snapshot?: Snapshot | null;
};

function money(value: number | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function storageKey(snapshot: Snapshot) {
  return `tucxa-transparencia:${snapshot.id}`;
}

function shouldOpen(snapshot: Snapshot) {
  const frequency = snapshot.payload.settings?.popupFrequency ?? "once_per_session";
  if (frequency === "disabled") return false;
  if (frequency === "every_access") return true;
  if (typeof window === "undefined") return false;

  const key = storageKey(snapshot);
  if (frequency === "once_per_session") {
    return window.sessionStorage.getItem(key) !== "seen";
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const stored = window.localStorage.getItem(key);

  if (frequency === "once_per_day") return stored !== today;
  if (frequency === "once_per_month") return stored !== month;
  if (frequency === "on_update") return stored !== snapshot.id;
  return true;
}

function markSeen(snapshot: Snapshot) {
  const frequency = snapshot.payload.settings?.popupFrequency ?? "once_per_session";
  if (typeof window === "undefined") return;

  const key = storageKey(snapshot);
  if (frequency === "once_per_session") {
    window.sessionStorage.setItem(key, "seen");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (frequency === "once_per_day") {
    window.localStorage.setItem(key, today);
  } else if (frequency === "once_per_month") {
    window.localStorage.setItem(key, today.slice(0, 7));
  } else if (frequency === "on_update") {
    window.localStorage.setItem(key, snapshot.id);
  }
}

export function FinancialTransparencyPopup() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void fetch(
        "/api/organizacao-em-harmonia/site-tucxa/transparencia",
        { cache: "no-store" },
      )
        .then(async (response) => {
          const result = (await response.json()) as ApiPayload;
          if (!response.ok || !result.snapshot || !active) return;
          setSnapshot(result.snapshot);
          setOpen(shouldOpen(result.snapshot));
        })
        .catch(() => {
          // A prestação pública não deve impedir o carregamento do site.
        });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const latest = snapshot?.payload.latest;
  const resultTone = useMemo(
    () => ((latest?.result ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]"),
    [latest?.result],
  );

  const currentSnapshot = snapshot;
  if (!currentSnapshot || !open) return null;

  const close = () => {
    markSeen(currentSnapshot);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#10251C]/65 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transparencia-popup-title"
    >
      <section className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white shadow-2xl ring-1 ring-white/30">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">
              Transparência em Harmonia
            </p>
            <h2
              id="transparencia-popup-title"
              className="mt-1 text-xl font-black leading-tight text-[#123D2C]"
            >
              {currentSnapshot.payload.settings?.headline ||
                "Transparência fortalece a confiança."}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white"
          >
            Fechar
          </button>
        </header>

        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-700">
            {currentSnapshot.payload.settings?.message ||
              "Acompanhe a aplicação coletiva dos recursos, sem exposição de quem contribuiu."}
          </p>

          {latest && (
            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                  Receitas do mês
                </p>
                <p className="mt-2 text-lg font-black text-[#123D2C]">
                  {money(latest.revenues)}
                </p>
              </article>
              <article className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                  Despesas do mês
                </p>
                <p className="mt-2 text-lg font-black text-[#123D2C]">
                  {money(latest.expenses)}
                </p>
              </article>
              <article className="col-span-2 rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                  Resultado do mês
                </p>
                <p className={`mt-2 text-2xl font-black ${resultTone}`}>
                  {money(latest.result)}
                </p>
                {latest.provisional && (
                  <p className="mt-2 text-xs font-bold text-amber-800">
                    Dados provisórios — precisam ser atualizados pela Tesouraria.
                  </p>
                )}
              </article>
            </div>
          )}

          <p className="rounded-2xl bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-900">
            Nenhum nome, contato ou valor individual é mostrado neste painel.
          </p>

          <div className="grid gap-2">
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/transparencia"
              onClick={close}
              className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
            >
              Ver prestação de contas
            </Link>
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/consulente/contribuicao"
              onClick={close}
              className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
            >
              Quero contribuir
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
