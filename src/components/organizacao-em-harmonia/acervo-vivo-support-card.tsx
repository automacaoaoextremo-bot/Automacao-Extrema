"use client";

import { useEffect, useState } from "react";
import {
  ACERVO_VIVO_SUPPORT_NAME,
  acervoVivoSupportWhatsappUrl,
} from "@/lib/organizacao-em-harmonia/acervo-vivo-support";

export function AcervoVivoSupportCard() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openSupport = () => setOpen(true);
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href="#apoio-acervo"]') : null;
      if (target) setOpen(true);
    };

    window.addEventListener("acervo-vivo:open-support", openSupport);
    document.addEventListener("click", handleDocumentClick, true);

    if (window.location.hash === "#apoio-acervo") {
      const timer = window.setTimeout(openSupport, 0);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("acervo-vivo:open-support", openSupport);
        document.removeEventListener("click", handleDocumentClick, true);
      };
    }

    return () => {
      window.removeEventListener("acervo-vivo:open-support", openSupport);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  return (
    <>
      <section id="apoio-acervo" className="mt-2 scroll-mt-44 sm:mt-3" aria-label="Apoio humano do Acervo Vivo">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border-2 border-[#2F6B43] bg-[#E9F2E7] px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#DDECD9] hover:shadow-md sm:min-h-14 sm:px-4 sm:py-3"
          aria-haspopup="dialog"
        >
          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[#2F6B43] sm:text-[10px]">Apoio humano</span>
            <span className="block text-sm font-black leading-tight text-[#123D2C] sm:mt-0.5 sm:text-base">Precisa de ajuda? Fale com a Mariana</span>
          </span>
          <span className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-white sm:text-[10px]">ABRIR</span>
        </button>
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-[650] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="apoio-acervo-titulo"
            className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-2xl sm:max-h-[90dvh] sm:p-5"
          >
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Apoio humano</p>
                <h2 id="apoio-acervo-titulo" className="mt-1 text-xl font-black leading-tight text-[#123D2C]">Precisa de ajuda para usar o Acervo Vivo?</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button>
            </div>

            <div className="mt-3 min-h-0 overflow-y-auto">
              <p className="text-sm font-semibold leading-6 text-slate-700">
                O celular continua sendo o caminho principal, mas você não precisa usar o Acervo sozinho. Se tiver dificuldade, pouca familiaridade com tecnologia ou preferir orientação, fale com {ACERVO_VIVO_SUPPORT_NAME}.
              </p>
              <p className="mt-2 rounded-2xl bg-[#F7FAF2] p-3 text-xs font-bold leading-5 text-slate-600 ring-1 ring-[#123D2C]/10">
                Ela pode orientar você para encontrar um livro, entender o código da lombada, fazer ou atualizar seu cadastro, acompanhar o empréstimo e combinar a melhor forma de usar o Acervo.
              </p>

              <a
                href={acervoVivoSupportWhatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-[#2F6B43]"
                aria-label={`Falar com ${ACERVO_VIVO_SUPPORT_NAME} pelo WhatsApp`}
              >
                Falar com a Mariana pelo WhatsApp
              </a>

              <p className="mt-3 text-center text-[10px] font-bold leading-4 text-slate-500">
                O registro da homologação do Acervo Vivo é feito somente pelo Gestor Biblioteca dentro da área de gestão.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
