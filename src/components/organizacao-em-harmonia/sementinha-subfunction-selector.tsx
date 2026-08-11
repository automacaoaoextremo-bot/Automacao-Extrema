"use client";

import { useMemo, useState } from "react";
import { SEMENTINHA_SUBFUNCTIONS } from "@/lib/organizacao-em-harmonia/sementinha-functions";

type Props = {
  selectedSlugs: string[];
  onChange: (selectedSlugs: string[]) => void;
};

export function SementinhaSubfunctionSelector({
  selectedSlugs,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selectedSlugs);

  const selectedLabels = useMemo(
    () =>
      SEMENTINHA_SUBFUNCTIONS.filter((item) =>
        selectedSlugs.includes(item.slug),
      ).map((item) => item.label),
    [selectedSlugs],
  );

  function openSelector() {
    setDraft(selectedSlugs);
    setOpen(true);
  }

  function toggle(slug: string) {
    setDraft((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  return (
    <>
      <button
        id="sementinha-subfunction-selector-button"
        type="button"
        onClick={openSelector}
        className="mt-3 w-full rounded-2xl border-2 border-[#123D2C] bg-[#E9F2E7] px-4 py-3 text-left text-sm font-black text-[#123D2C] shadow-sm"
      >
        <span className="block">Funções dentro da Coordenação do Sementinha</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">
          {selectedLabels.length > 0
            ? selectedLabels.join(" • ")
            : "Nenhuma sub-função selecionada — toque para definir"}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sementinha-subfunction-title"
            className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl"
          >
            <header className="shrink-0 border-b border-slate-100 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Função Coordenador Sementinha
              </p>
              <h2
                id="sementinha-subfunction-title"
                className="mt-1 text-xl font-black text-[#123D2C]"
              >
                Qual função você exerce no Sementinha?
              </h2>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                A escolha é opcional. Você pode marcar mais de uma ou informar que
                não possui nenhuma sub-função.
              </p>
            </header>

            <div className="min-h-0 overflow-y-auto p-3">
              <button
                type="button"
                onClick={() => setDraft([])}
                className={`w-full rounded-2xl p-3 text-left ring-1 ${
                  draft.length === 0
                    ? "bg-[#E9F2E7] text-[#123D2C] ring-[#123D2C]/30"
                    : "bg-white text-slate-700 ring-slate-200"
                }`}
              >
                <span className="font-black">○ Nenhuma sub-função</span>
                <span className="mt-1 block text-xs font-semibold text-slate-500">
                  Continuo como Coordenador Sementinha, sem uma responsabilidade
                  específica entre as opções abaixo.
                </span>
              </button>

              <div className="mt-3 grid gap-2">
                {SEMENTINHA_SUBFUNCTIONS.map((item) => (
                  <label
                    key={item.slug}
                    className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10"
                  >
                    <input
                      type="checkbox"
                      checked={draft.includes(item.slug)}
                      onChange={() => toggle(item.slug)}
                      className="mt-0.5 h-5 w-5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-[#123D2C]">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">
                        {item.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white p-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="rounded-xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white"
              >
                Continuar
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
