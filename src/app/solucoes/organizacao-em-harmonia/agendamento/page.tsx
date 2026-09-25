"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const LOGIN_HREF = "/solucoes/organizacao-em-harmonia/agendamento/login";

type ModalKind = "horarios" | "porque" | null;

const benefits = [
  {
    title: "Para quem busca atendimento",
    text: "Receba a confirmação do atendimento pelo SMS e confirme sua presença com clareza, sem depender de anotações paralelas.",
  },
  {
    title: "Para a Recepção",
    text: "Agende, consulte vagas, ajuste Entidades, confirme chegadas e mantenha a mesma informação disponível para toda a equipe.",
  },
  {
    title: "Para os Filhos da Corrente",
    text: "Uma base única reduz desencontros e ajuda Recepção, Cavalinhos, Cambonos e Coordenadores a trabalhar com a mesma informação.",
  },
];

export default function AgendamentoTucxaPublicPage() {
  const [modal, setModal] = useState<ModalKind>(null);

  useEffect(() => {
    const openWhy = () => setModal("porque");
    const openHours = () => setModal("horarios");

    window.addEventListener("tucxa:open-agendamento-why", openWhy);
    window.addEventListener("tucxa:open-agendamento-hours", openHours);

    return () => {
      window.removeEventListener("tucxa:open-agendamento-why", openWhy);
      window.removeEventListener("tucxa:open-agendamento-hours", openHours);
    };
  }, []);

  useEffect(() => {
    if (!modal) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [modal]);

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[#F7FAF2] text-[#10251C] sm:min-h-screen sm:h-auto sm:overflow-visible">
      <TucxaPublicHeader
        navLabel="Agendamento do Tucxa"
        showSupport={false}
        actions={[
          { label: "Por que usar", href: "#por-que-usar", variant: "secondary", action: "openAgendamentoWhy" },
          { label: "Horários", href: "#horarios", variant: "secondary", action: "openAgendamentoHours" },
          { label: "Agendamento", href: LOGIN_HREF, variant: "secondary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
        ]}
        mobileActionColumns={4}
        compactMobileActions={false}
        autoHighlightCurrent={false}
      />

      <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 items-stretch px-3 py-1.5 sm:block sm:px-6 sm:py-7 lg:px-8">
        <section className="flex h-full w-full flex-col justify-center overflow-hidden rounded-[1.5rem] bg-[#123D2C] p-3.5 text-white shadow-xl shadow-green-950/10 sm:h-auto sm:rounded-[2rem] sm:p-8">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs">
            Atendimento em Harmonia · Agendamento
          </p>

          <h1 className="mt-1 max-w-3xl text-[1.5rem] font-black leading-[1.05] sm:mt-2 sm:text-5xl">
            Menos dúvida no caminho. Mais clareza para acolher.
          </h1>

          <p className="mt-1.5 max-w-3xl text-[0.72rem] font-semibold leading-[1.15rem] text-[#EEF7EA] sm:mt-3 sm:text-base sm:leading-7">
            O agendamento do Tucxa reúne em um só lugar o pedido do Consulente, a disponibilidade das Entidades e o acompanhamento da Recepção. A proposta é simples: cada pessoa saber o que precisa fazer, quando precisa fazer e qual informação está valendo.
          </p>

          <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:mt-5 sm:grid-cols-3 sm:gap-2">
            <button
              type="button"
              onClick={() => setModal("porque")}
              className="flex min-h-11 flex-col items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-1.5 text-center text-white transition hover:bg-white/15 sm:min-h-12 sm:py-2"
            >
              <span className="text-sm font-black sm:text-base">Por que usar</span>
              <span className="mt-0.5 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#DDEED8] sm:text-[0.65rem]">Clique para abrir</span>
            </button>

            <button
              type="button"
              onClick={() => setModal("horarios")}
              className="flex min-h-11 flex-col items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-1.5 text-center text-white transition hover:bg-white/15 sm:min-h-12 sm:py-2"
            >
              <span className="text-sm font-black sm:text-base">Horários</span>
              <span className="mt-0.5 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#DDEED8] sm:text-[0.65rem]">Clique para abrir</span>
            </button>

            <Link
              href={LOGIN_HREF}
              className="group flex min-h-11 flex-col items-center justify-center rounded-2xl bg-white px-4 py-1.5 text-center text-[#123D2C] shadow-lg transition hover:-translate-y-0.5 sm:min-h-12 sm:py-2"
            >
              <span className="text-sm font-black sm:text-base">Agendamento</span>
              <span className="mt-0.5 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#2F6B43] sm:text-[0.65rem]">Clique para abrir</span>
            </Link>
          </div>
        </section>
      </section>

      {modal === "horarios" && (
        <CompactModal title="Horários de segunda e terça" onClose={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-3">
            <InfoCard eyebrow="Chegada" title="18h30 às 19h20">
              Todos devem chegar dentro dessa janela.
            </InfoCard>
            <InfoCard eyebrow="Início dos trabalhos" title="19h20">
              A porta fecha às 19h20 e reabre às 20h.
            </InfoCard>
            <InfoCard eyebrow="Atendimentos" title="20h às 21h40">
              Horário previsto para os atendimentos.
            </InfoCard>
          </div>
        </CompactModal>
      )}

      {modal === "porque" && (
        <CompactModal title="Por que usar o Agendamento" onClose={() => setModal(null)}>
          <section className="rounded-2xl bg-[#E9F2E7] p-2.5 ring-1 ring-[#123D2C]/10 sm:p-4">
            <p className="text-[0.56rem] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">Por que usar</p>
            <h3 className="mt-0.5 text-[1.05rem] font-black leading-tight text-[#123D2C] sm:text-2xl">
              A informação certa precisa chegar à pessoa certa.
            </h3>
            <p className="mt-1 text-[0.62rem] font-semibold leading-4 text-slate-700 sm:text-sm sm:leading-5">
              O objetivo não é trocar o acolhimento humano por uma tela. É reduzir retrabalho, mensagens desencontradas e incerteza para que todos possam dedicar mais atenção ao atendimento.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-3">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-xl bg-white p-2 ring-1 ring-[#123D2C]/10 sm:rounded-2xl sm:p-3">
                  <h4 className="text-[0.7rem] font-black text-[#123D2C] sm:text-sm">{benefit.title}</h4>
                  <p className="mt-0.5 text-[0.6rem] font-semibold leading-[0.95rem] text-slate-600 sm:text-xs sm:leading-5">{benefit.text}</p>
                </article>
              ))}
            </div>
          </section>
        </CompactModal>
      )}
    </main>
  );
}

function CompactModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-[#10251C]/75 p-1.5 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.4rem] bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#123D2C]/10 px-3.5 py-2.5 sm:px-5 sm:py-4">
          <h2 className="text-sm font-black text-[#123D2C] sm:text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl bg-[#123D2C] px-3 py-1.5 text-[0.68rem] font-black text-white sm:px-4 sm:py-2 sm:text-sm">
            Fechar
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden p-2.5 sm:p-5">{children}</div>
      </section>
    </div>
  );
}

function InfoCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl bg-[#F7FAF2] p-2.5 text-center ring-1 ring-[#123D2C]/10 sm:rounded-2xl sm:p-4">
      <p className="text-[0.55rem] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-xs">{eyebrow}</p>
      <p className="mt-0.5 text-lg font-black text-[#123D2C] sm:text-2xl">{title}</p>
      <p className="mt-0.5 text-[0.62rem] font-semibold leading-4 text-slate-600 sm:text-sm sm:leading-5">{children}</p>
    </article>
  );
}
