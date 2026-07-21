"use client";

import { useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type ThankYouPayload = {
  message?: string;
  statusUrl?: string;
  whatsappUrl?: string;
  whatsappOpened?: boolean;
};

const STORAGE_KEY = "oh_tucxa_filho_corrente_obrigado";

export default function ObrigadoPrimeiroAcessoFilhoDaCorrentePage() {
  const [payload, setPayload] = useState<ThankYouPayload>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      let parsed: ThankYouPayload = {};

      if (stored) {
        try {
          parsed = JSON.parse(stored) as ThankYouPayload;
        } catch {
          parsed = {};
        }
      }

      const statusFromQuery = new URLSearchParams(window.location.search).get("status") || "";
      setPayload({
        ...parsed,
        statusUrl: parsed.statusUrl || statusFromQuery,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
          { label: "Entrar", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login", variant: "secondary" },
        ]}
        navLabel="Primeiro Acesso enviado"
      />

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <article className="rounded-[2rem] bg-white p-6 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2F6B43]">Obrigado</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#123D2C]">
            Sua solicitação foi enviada para validação.
          </h1>
          <p className="mt-4 leading-7 text-slate-700">
            {payload.message || "Agora é só aguardar o Tucxa conferir as informações e liberar o acesso quando tudo estiver correto."}
          </p>

          <div className="mt-6 grid gap-3">
            {payload.statusUrl && (
              <a
                href={payload.statusUrl}
                className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
              >
                Acompanhar andamento do pedido
              </a>
            )}

            {payload.whatsappUrl && !payload.whatsappOpened && (
              <a
                href={payload.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-[#25D366] px-5 py-4 text-center font-black text-[#073B1D]"
              >
                Abrir mensagem no WhatsApp
              </a>
            )}

            <a
              href="/solucoes/organizacao-em-harmonia/tucxa"
              className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
            >
              Voltar ao site do Tucxa
            </a>
          </div>

          <p className="mt-5 rounded-2xl bg-[#E9F2E7] p-4 text-sm font-semibold leading-6 text-[#123D2C]">
            Guarde o link de acompanhamento. Ele permite consultar o andamento sem preencher o cadastro novamente.
          </p>
        </article>
      </section>
    </main>
  );
}
