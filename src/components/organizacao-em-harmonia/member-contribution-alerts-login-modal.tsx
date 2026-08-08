"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UpcomingContribution = {
  dueDate: string;
  amount: number;
  status: string;
  scheduled?: boolean;
};

type Contribution = {
  id: string;
  amount: number | string;
  due_date: string;
  status: string;
  payment_method: string | null;
};

type Props = {
  upcoming: UpcomingContribution[];
  contributions: Contribution[];
  showDue: boolean;
  dueDaysBefore: number;
  showOverdue: boolean;
};

const CORRENTE_HREF =
  "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/corrente-em-dia";
const SESSION_KEY = "oh_corrente_em_dia_contribution_alerts_v1";
const FINAL_STATUSES = ["confirmado", "aprovado", "pago", "cancelado"];

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

function localToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysFromToday(value: string) {
  const target = dateOnly(value);
  if (!target) return Number.POSITIVE_INFINITY;
  return Math.round((target.getTime() - localToday().getTime()) / 86400000);
}

export function MemberContributionAlertsLoginModal({
  upcoming,
  contributions,
  showDue,
  dueDaysBefore,
  showOverdue,
}: Props) {
  const [open, setOpen] = useState(false);

  const dueItems = useMemo(
    () =>
      showDue
        ? upcoming.filter((item) => {
            const days = daysFromToday(item.dueDate);
            return days >= 0 && days <= dueDaysBefore;
          })
        : [],
    [dueDaysBefore, showDue, upcoming],
  );

  const overdueItems = useMemo(
    () =>
      showOverdue
        ? contributions.filter(
            (item) =>
              daysFromToday(item.due_date) < 0 &&
              !FINAL_STATUSES.includes(item.status),
          )
        : [],
    [contributions, showOverdue],
  );

  const hasWarnings = dueItems.length > 0 || overdueItems.length > 0;

  useEffect(() => {
    if (!hasWarnings) return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "closed") return;

    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [hasWarnings]);

  function close() {
    window.sessionStorage.setItem(SESSION_KEY, "closed");
    setOpen(false);
  }

  if (!open || !hasWarnings) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-contribution-alerts-title"
        className="max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:rounded-[2rem] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">
              Corrente em Dia
            </p>
            <h2
              id="member-contribution-alerts-title"
              className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl"
            >
              Avisos de contribuição
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

        {overdueItems.length > 0 && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <p className="font-black text-amber-950">Contribuições vencidas</p>
            <div className="mt-2 grid gap-2">
              {overdueItems.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-xl bg-white p-3 text-sm">
                  <p className="font-black text-[#123D2C]">{money(item.amount)}</p>
                  <p className="font-semibold text-slate-600">
                    Prevista para {date(item.due_date)} · situação: {item.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {dueItems.length > 0 && (
          <div className="mt-3 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
            <p className="font-black text-[#123D2C]">Contribuições a vencer</p>
            <div className="mt-2 grid gap-2">
              {dueItems.slice(0, 4).map((item) => (
                <div key={`${item.dueDate}-${item.amount}`} className="rounded-xl bg-white p-3 text-sm">
                  <p className="font-black text-[#123D2C]">{money(item.amount)}</p>
                  <p className="font-semibold text-slate-600">
                    {date(item.dueDate)} · {item.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href={CORRENTE_HREF}
          className="mt-3 block rounded-xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white"
        >
          Abrir Corrente em Dia
        </Link>
      </section>
    </div>
  );
}
