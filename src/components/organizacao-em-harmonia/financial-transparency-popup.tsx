"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PopupFrequency =
  | "every_access"
  | "once_per_session"
  | "once_per_day"
  | "once_per_month"
  | "on_update"
  | "disabled";

type MonthSummary = {
  month: string;
  finalized: boolean;
  current: boolean;
  revenues: number | null;
  expenses: number | null;
  result: number | null;
  closingBalance: number | null;
  realizedRevenues: number;
  realizedExpenses: number;
  estimatedRevenues: number;
  estimatedExpenses: number;
};

type LivePayload = {
  updateToken: string;
  settings: {
    popupAutoOpen: boolean;
    popupFrequency: PopupFrequency;
    headline: string;
    message: string;
  };
  latestFinalized: MonthSummary | null;
  currentForecast: MonthSummary;
};

type ApiPayload = {
  live?: LivePayload;
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function storageKey(live: LivePayload) {
  return `tucxa-transparencia-live:${live.updateToken || "sem-atualizacao"}`;
}

function shouldOpen(live: LivePayload) {
  if (!live.settings.popupAutoOpen) return false;

  const frequency = live.settings.popupFrequency;
  if (frequency === "disabled") return false;
  if (frequency === "every_access") return true;
  if (typeof window === "undefined") return false;

  const key = storageKey(live);
  if (frequency === "once_per_session") {
    return window.sessionStorage.getItem(key) !== "seen";
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const stored = window.localStorage.getItem(key);

  if (frequency === "once_per_day") return stored !== today;
  if (frequency === "once_per_month") return stored !== today.slice(0, 7);
  if (frequency === "on_update") return stored !== live.updateToken;
  return true;
}

function markSeen(live: LivePayload) {
  if (typeof window === "undefined") return;

  const frequency = live.settings.popupFrequency;
  const key = storageKey(live);
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
    window.localStorage.setItem(key, live.updateToken);
  }
}

function SummaryCard({
  title,
  month,
  summary,
  forecast = false,
}: {
  title: string;
  month: string;
  summary: MonthSummary;
  forecast?: boolean;
}) {
  return (
    <article className="rounded-[1.5rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
        {title}
      </p>
      <h3 className="mt-1 text-lg font-black capitalize text-[#123D2C]">
        {monthLabel(month)}
      </h3>
      {forecast && (
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          Valores registrados até esta consulta, incluindo estimativas cadastradas.
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white p-3">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500">
            Receitas
          </p>
          <p className="mt-1 font-black text-emerald-800">
            {money(summary.revenues)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500">
            Despesas
          </p>
          <p className="mt-1 font-black text-amber-800">
            {money(summary.expenses)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500">
            Resultado
          </p>
          <p
            className={`mt-1 font-black ${
              (summary.result ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]"
            }`}
          >
            {money(summary.result)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-500">
            Saldo
          </p>
          <p
            className={`mt-1 font-black ${
              (summary.closingBalance ?? 0) < 0
                ? "text-red-700"
                : "text-[#123D2C]"
            }`}
          >
            {money(summary.closingBalance)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function FinancialTransparencyPopup() {
  const [live, setLive] = useState<LivePayload | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void fetch("/api/organizacao-em-harmonia/site-tucxa/transparencia", {
        cache: "no-store",
      })
        .then(async (response) => {
          const result = (await response.json()) as ApiPayload;
          if (!response.ok || !result.live || !active) return;
          setLive(result.live);
          setOpen(shouldOpen(result.live));
        })
        .catch(() => {
          // A transparência não deve impedir o carregamento do site.
        });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (!live || !open) return null;

  const close = () => {
    markSeen(live);
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#10251C]/65 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transparencia-popup-title"
    >
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl ring-1 ring-white/30">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">
              Transparência em Harmonia
            </p>
            <h2
              id="transparencia-popup-title"
              className="mt-1 text-xl font-black leading-tight text-[#123D2C]"
            >
              {live.settings.headline || "Fortalecendo a confiança"}
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
            {live.settings.message ||
              "Acompanhe o último mês finalizado e a previsão do mês atual."}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {live.latestFinalized ? (
              <SummaryCard
                title="Último mês finalizado"
                month={live.latestFinalized.month}
                summary={live.latestFinalized}
              />
            ) : (
              <article className="rounded-[1.5rem] bg-amber-50 p-4 font-bold leading-6 text-amber-900 ring-1 ring-amber-200">
                A Tesouraria ainda não finalizou uma competência para exibição pública.
              </article>
            )}
            <SummaryCard
              title="Previsão do mês atual"
              month={live.currentForecast.month}
              summary={live.currentForecast}
              forecast
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
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
