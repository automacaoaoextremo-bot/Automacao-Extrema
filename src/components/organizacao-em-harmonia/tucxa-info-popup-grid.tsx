"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type TucxaInfoPopupItem = {
  id: string;
  title: string;
  eyebrow?: string;
  summary: string;
  description?: string;
  href?: string;
  ctaLabel?: string;
  availability?: string;
  highlights?: string[];
};

type Props = {
  items: TucxaInfoPopupItem[];
  ariaLabel: string;
  columns?: 2 | 3 | 4;
};

function gridColumns(columns: Props["columns"]) {
  if (columns === 3) return "sm:grid-cols-3";
  if (columns === 2) return "sm:grid-cols-2";
  return "sm:grid-cols-4";
}

export function TucxaInfoPopupGrid({
  items,
  ariaLabel,
  columns = 4,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedId]);

  return (
    <>
      <div
        className={`grid grid-cols-2 gap-2.5 ${gridColumns(columns)} sm:gap-3`}
        aria-label={ariaLabel}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className="flex min-h-24 flex-col justify-between rounded-[1.35rem] bg-white p-3.5 text-left shadow-md shadow-green-900/5 ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#F7FAF2] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#123D2C]/15 sm:min-h-28 sm:rounded-[1.5rem] sm:p-4"
            aria-haspopup="dialog"
          >
            <span>
              {item.eyebrow && (
                <span className="block text-[9px] font-black uppercase tracking-[0.13em] text-[#2F6B43] sm:text-[10px]">
                  {item.eyebrow}
                </span>
              )}
              <span className="mt-1 block text-sm font-black leading-tight text-[#123D2C] sm:text-base">
                {item.title}
              </span>
            </span>
            <span className="mt-2 block text-[8px] font-black uppercase tracking-[0.14em] text-[#2F6B43] sm:text-[9px]">
              TOQUE PARA CONHECER
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[210] flex items-end justify-center bg-[#10251C]/78 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedId(null);
          }}
        >
          <section
            className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.7rem] bg-white shadow-2xl sm:rounded-[1.8rem]"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
          >
            <header className="shrink-0 border-b border-[#123D2C]/10 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-[10px]">
                    {selected.eyebrow ?? "Tucxa em Harmonia"}
                  </p>
                  <h3 className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">
                    {selected.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="shrink-0 rounded-xl bg-[#123D2C] px-3.5 py-2 text-xs font-black text-white sm:text-sm"
                >
                  Fechar
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <p className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10 sm:text-base sm:leading-7">
                {selected.description ?? selected.summary}
              </p>

              {selected.availability && (
                <p className="mt-3 rounded-2xl bg-[#FFF8E7] p-3 text-xs font-black leading-5 text-amber-950 ring-1 ring-amber-200 sm:text-sm">
                  {selected.availability}
                </p>
              )}

              {selected.highlights?.length ? (
                <ul className="mt-3 grid gap-2">
                  {selected.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex gap-2 rounded-xl bg-[#E9F2E7] px-3 py-2.5 text-sm font-bold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10"
                    >
                      <span aria-hidden="true">✓</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {selected.href && (
                <Link
                  href={selected.href}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2F6B43] sm:text-base"
                >
                  {selected.ctaLabel ?? "Abrir esta página"}
                </Link>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
