"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ConsulentePanelHeader,
  consulenteSignOutAction,
} from "@/components/organizacao-em-harmonia/consulente-panel-header";

const panelBase = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";
const pilotHref = `${panelBase}/agendamento-piloto`;

type CardId = "agendar" | "consultar" | "orientacoes" | "agenda";

const cards = [
  {
    id: "agendar" as const,
    title: "Agendar atendimento",
    description:
      "Escolha uma data, veja as Entidades realmente disponíveis naquele dia e reserve sua vaga em poucos passos.",
    cta: "Escolher data e Entidade",
    href: `${pilotHref}?abrir=agendar`,
  },
  {
    id: "consultar" as const,
    title: "Consultar e confirmar",
    description:
      "Veja seus próximos atendimentos, confira data e Entidade e confirme sua presença dentro do prazo informado.",
    cta: "Ver meus agendamentos",
    href: `${pilotHref}?abrir=consultar`,
  },
  {
    id: "orientacoes" as const,
    title: "Chegar com tranquilidade",
    description:
      "Consulte as orientações do Tucxa antes de sair de casa e saiba como se preparar para o atendimento.",
    cta: "Ver orientações",
    href: `${panelBase}/atendimento/orientacoes`,
  },
  {
    id: "agenda" as const,
    title: "Agenda Viva",
    description:
      "Confira os próximos compromissos do Tucxa em uma visão simples e atualizada.",
    cta: "Abrir Agenda Viva",
    href: `${panelBase}/agenda-viva`,
  },
];

function TouchHint() {
  return (
    <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
      TOQUE PARA ABRIR
    </span>
  );
}

export default function AtendimentoEmHarmoniaConsulentePage() {
  const [selectedId, setSelectedId] = useState<CardId | null>(null);
  const selected = cards.find((card) => card.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <ConsulentePanelHeader
        navLabel="Atendimento em Harmonia"
        showSupport={false}
        actions={[
          { label: "Início", href: "#inicio", variant: "primary" },
          { label: "Voltar", href: `${panelBase}?abrir=modulos`, variant: "secondary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
          consulenteSignOutAction,
        ]}
      />

      <section id="inicio" className="mx-auto max-w-4xl px-3 py-4 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">
            Atendimento em Harmonia · Piloto
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            Seu atendimento mais claro do começo ao fim.
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            Você não precisa ficar em dúvida se o pedido foi anotado, qual Entidade estará disponível ou se sua presença ficou confirmada. Escolha, acompanhe e confirme em um só lugar — mantendo o acolhimento do Tucxa em cada etapa.
          </p>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedId(card.id)}
              className="min-h-28 rounded-[1.5rem] bg-white px-4 py-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#F7FAF2] hover:shadow-lg sm:min-h-32 sm:px-5"
            >
              <span className="block text-base font-black leading-tight text-[#123D2C] sm:text-lg">
                {card.title}
              </span>
              <TouchHint />
            </button>
          ))}
        </section>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedId(null);
          }}
        >
          <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#123D2C]/10 px-5 py-4">
              <h2 className="text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">{selected.title}</h2>
              <button type="button" onClick={() => setSelectedId(null)} className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">
                Fechar
              </button>
            </header>
            <div className="min-h-0 overflow-y-auto p-5">
              <p className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-[#123D2C]/10">
                {selected.description}
              </p>
              <Link href={selected.href} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center font-black text-white">
                {selected.cta}
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
