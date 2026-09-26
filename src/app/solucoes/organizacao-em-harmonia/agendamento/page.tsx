"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const LOGIN_HREF = "/solucoes/organizacao-em-harmonia/agendamento/login";

type ModalKind = "horarios" | "porque" | null;

const headerActions = [
  {
    label: "Por que usar",
    href: "#por-que-usar",
    variant: "secondary" as const,
    action: "openAgendamentoWhy" as const,
  },
  {
    label: "Horários",
    href: "#horarios",
    variant: "secondary" as const,
    action: "openAgendamentoHours" as const,
  },
  {
    label: "Agendamento",
    href: LOGIN_HREF,
    variant: "primary" as const,
  },
  {
    label: "Ajuda",
    href: "#ajuda",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const benefits = [
  {
    title: "Para quem busca atendimento",
    text: "Receba a confirmação do atendimento por SMS e confirme sua presença com clareza, sem depender de anotações paralelas.",
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
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        navLabel="Agendamento do Tucxa"
        showSupport={false}
        actions={headerActions}
        mobileActionColumns={4}
        compactMobileActions={false}
      />

      <section className="mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4">
        <section className="rounded-[1.45rem] bg-[#123D2C] p-3.5 text-white shadow-xl shadow-green-900/10 sm:rounded-[1.75rem] sm:p-6">
          <p className="inline-flex rounded-full bg-[#E9F2E7] px-2.5 py-1 text-[0.64rem] font-black uppercase tracking-[0.15em] text-[#2F6B43] ring-1 ring-white/20 sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.22em]">
            Atendimento em Harmonia · Agendamento
          </p>

          <h1 className="mt-1.5 max-w-4xl text-[1.48rem] font-black leading-[1.12] tracking-tight text-white sm:mt-2.5 sm:text-4xl sm:leading-tight lg:text-[2.8rem]">
            Menos dúvida no caminho. Mais clareza para acolher.
          </h1>

          <p className="mt-1.5 max-w-4xl text-[0.86rem] leading-[1.28rem] text-[#EEF7EA] sm:mt-2.5 sm:text-[1.05rem] sm:leading-8">
            O agendamento do Tucxa reúne em um só lugar o pedido do Consulente, a disponibilidade das Entidades e o acompanhamento da Recepção. A proposta é simples: cada pessoa saber o que precisa fazer, quando precisa fazer e qual informação está valendo.
          </p>

          <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:mt-4 sm:grid-cols-3 sm:gap-2.5">
            <button
              type="button"
              onClick={() => {
                window.history.replaceState(null, "", "#por-que-usar");
                window.dispatchEvent(new Event("hashchange"));
                setModal("porque");
              }}
              className="flex min-h-11 flex-col items-center justify-center rounded-xl bg-[#E9F2E7] px-2.5 py-2 text-center text-[0.78rem] font-black leading-tight text-[#123D2C] ring-1 ring-white/15 transition hover:-translate-y-0.5 sm:min-h-12 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
            >
              <span>Por que usar</span>
              <TouchHint />
            </button>

            <button
              type="button"
              onClick={() => {
                window.history.replaceState(null, "", "#horarios");
                window.dispatchEvent(new Event("hashchange"));
                setModal("horarios");
              }}
              className="flex min-h-11 flex-col items-center justify-center rounded-xl bg-[#E9F2E7] px-2.5 py-2 text-center text-[0.78rem] font-black leading-tight text-[#123D2C] ring-1 ring-white/15 transition hover:-translate-y-0.5 sm:min-h-12 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
            >
              <span>Horários</span>
              <TouchHint />
            </button>

            <Link
              href={LOGIN_HREF}
              className="flex min-h-11 flex-col items-center justify-center rounded-xl bg-white px-2.5 py-2 text-center text-[0.78rem] font-black leading-tight text-[#123D2C] shadow-lg shadow-green-950/10 ring-1 ring-white/20 transition hover:-translate-y-0.5 sm:min-h-12 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
            >
              <span>Agendamento</span>
              <TouchHint />
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

function TouchHint() {
  return (
    <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.13em] text-[#2F6B43] sm:text-[10px] sm:tracking-[0.18em]">
      TOQUE PARA CONTINUAR
    </span>
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
