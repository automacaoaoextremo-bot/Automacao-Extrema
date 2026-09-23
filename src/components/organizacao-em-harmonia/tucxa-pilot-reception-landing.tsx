"use client";

import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";

const filhoPanelBase = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const pilotHref = `${filhoPanelBase}/atendimento/agendamento-piloto`;

const supportAction = {
  label: "Ajuda",
  href: "#ajuda",
  variant: "secondary" as const,
  action: "supportWhatsapp" as const,
};

const signOutAction = {
  label: "Sair",
  href: "#sair",
  variant: "secondary" as const,
  action: "signOutFilhoCorrente" as const,
};

const actions = [
  {
    title: "Agendar",
    text: "Escolha a data, veja somente as Entidades daquele dia e reserve a vaga do Filho de Fora/Consulente.",
    href: `${pilotHref}?abrir=agendar`,
  },
  {
    title: "Consultar e confirmar",
    text: "Acompanhe os atendimentos do dia, veja quem confirmou e confirme manualmente quando for necessário.",
    href: `${pilotHref}?abrir=consultar`,
  },
  {
    title: "Disponibilidade das Entidades",
    text: "Ajuste capacidade, suspenda um atendimento por uma data ou período e volte a disponibilizá-lo com poucos toques.",
    href: `${pilotHref}?abrir=entidades`,
  },
];

export function TucxaPilotReceptionLanding() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Piloto de Agendamentos"
        showSupport={false}
        actions={[
          { label: "Início", href: pilotHref, variant: "primary" },
          { label: "Voltar", href: filhoPanelBase, variant: "secondary" },
          supportAction,
          signOutAction,
        ]}
        mobileActionColumns={4}
      />

      <section className="mx-auto max-w-4xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#CFE2C7] sm:text-xs">
            Atendimento em Harmonia · Recepção
          </p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight sm:text-4xl">
            Menos anotações soltas. Mais clareza para acolher cada pessoa.
          </h1>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#EEF7EA] sm:text-base sm:leading-7">
            Neste piloto, a Recepção concentra o essencial: agendar, consultar confirmações e cuidar da disponibilidade das Entidades. O sistema organiza a rotina para que o cuidado continue humano, mas sem depender do caderno para saber quem vem e com quem será atendido.
          </p>
        </section>

        <section className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
          {actions.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-[1.4rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="block text-lg font-black leading-tight text-[#123D2C]">{item.title}</span>
              <span className="mt-2 block text-sm font-semibold leading-5 text-slate-600">{item.text}</span>
              <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                TOQUE PARA ABRIR
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-3 rounded-[1.4rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:mt-4">
          <p className="text-sm font-black text-[#123D2C]">Como funciona neste primeiro piloto</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
            Depois que a Recepção reserva a vaga, o Filho de Fora/Consulente recebe um link de confirmação. A confirmação pode ser feita até o horário definido pelo Tucxa. Se o SMS ainda não estiver configurado, o mesmo link fica disponível para copiar e enviar por outro canal.
          </p>
        </section>
      </section>
    </main>
  );
}
