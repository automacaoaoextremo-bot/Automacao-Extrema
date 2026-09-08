"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  OrganizacaoPublicHeader,
  type OrganizacaoPublicHeaderAction,
} from "@/components/organizacao-em-harmonia/organizacao-public-header";

type LandingModule =
  | "organizacao-em-harmonia"
  | "atendimento-em-harmonia"
  | "agenda-viva"
  | "corrente-em-dia"
  | string;

type ModalKey =
  | "visao"
  | "modulos"
  | "base-unica"
  | "painel"
  | "contribuicao"
  | "beneficios"
  | "como-funciona"
  | "cliente-fundador"
  | "mais-informacoes";

type ModuleCard = {
  id: "atendimento-em-harmonia" | "agenda-viva" | "corrente-em-dia";
  title: string;
  summary: string;
  href: string;
};

type LandingContent = {
  solutionName: string;
  eyebrow: string;
  title: string;
  description: string;
  secondParagraph?: string;
  benefits: string[];
  howItWorks?: string[];
};

const MODULES: ModuleCard[] = [
  {
    id: "atendimento-em-harmonia",
    title: "Atendimento em Harmonia",
    summary: "Recepção, agenda, fila, retornos e responsáveis organizados com critérios claros e uso simples pelo celular.",
    href: "/solucoes/atendimento-em-harmonia",
  },
  {
    id: "agenda-viva",
    title: "Agenda Viva",
    summary: "Calendário único para atividades, grupos, mutirões, férias, reuniões, eventos, responsáveis, recorrências e aprovações.",
    href: "/solucoes/agenda-viva",
  },
  {
    id: "corrente-em-dia",
    title: "Corrente em Dia",
    summary: "Contribuições, Pix, comprovantes, pendências e visão financeira com privacidade, clareza e menos conferência manual.",
    href: "/solucoes/corrente-em-dia",
  },
];

const CONTENT: Record<string, LandingContent> = {
  "organizacao-em-harmonia": {
    solutionName: "Organização em Harmonia",
    eyebrow: "Suíte modular Automação Extrema",
    title: "Organização, atendimento, agenda e contribuições trabalhando na mesma base.",
    description:
      "Uma suíte modular para organizações que precisam reduzir desencontros, retrabalho e decisões soltas no WhatsApp, com processos configuráveis, permissões por função e uso simples pelo celular.",
    secondParagraph:
      "A proposta não é colocar mais um sistema na rotina. É começar pelas dores reais, organizar critérios, preservar o jeito humano da organização e criar uma base simples para melhorar com segurança.",
    benefits: [
      "Uma Base Única para pessoas, funções e permissões compartilhada entre todos os módulos.",
      "Menos tempo perdido procurando comprovante, escala, agenda ou decisão em conversas antigas.",
      "Regras configuráveis por organização: quem cria, aprova, edita e acompanha.",
      "Módulos independentes ou combinados, permitindo começar pequeno e evoluir sem recadastrar tudo.",
      "Fluxos mobile-first para diretoria, coordenação, recepção, voluntários e responsáveis.",
      "Mais clareza para decisões, menos retrabalho operacional e mais segurança na rotina.",
    ],
  },
  "atendimento-em-harmonia": {
    solutionName: "Atendimento em Harmonia",
    eyebrow: "Módulo da Organização em Harmonia",
    title: "Recepção, agenda, fila, retornos e cambonos organizados sem levar eletrônicos para o atendimento.",
    description:
      "Criado para organizar a recepção com critérios únicos entre presencial e WhatsApp, registrar retornos, prever capacidade e reduzir tensão operacional. Este módulo faz parte da Organização em Harmonia e usa a mesma Base Única de pessoas, funções e permissões.",
    secondParagraph:
      "A proposta não é colocar mais um sistema na rotina. É começar pelas dores reais, organizar critérios, preservar o jeito humano da organização e criar uma base simples para melhorar com segurança.",
    benefits: [
      "Recepção, fila, check-in, retornos e encaixes com critérios únicos entre presencial e WhatsApp.",
      "Capacidade organizada por dia, equipe, entidade, sala ou regra definida pela organização.",
      "Apoio aos responsáveis sem levar eletrônicos para o momento do atendimento.",
      "Status simples: aguardando, chamado, em atendimento, concluído, faltou ou encaminhado.",
      "Relatórios de atendidos, faltas, retornos, encaixes e gargalos da operação.",
      "Permissões por função sem expor dados desnecessários.",
    ],
  },
  "agenda-viva": {
    solutionName: "Agenda Viva",
    eyebrow: "Módulo da Organização em Harmonia",
    title: "Calendário único com responsáveis, recorrências, aprovações, conflitos e comunicação.",
    description:
      "Para transformar atividades, grupos, mutirões, férias, reuniões, eventos e trabalhos recorrentes em uma agenda viva, clara e aprovada. Este módulo faz parte da Organização em Harmonia e usa a mesma Base Única de pessoas, funções e permissões.",
    secondParagraph:
      "A proposta não é colocar mais um sistema na rotina. É começar pelas dores reais, organizar critérios, preservar o jeito humano da organização e criar uma base simples para melhorar com segurança.",
    benefits: [
      "Calendário único para atividades, grupos, mutirões, férias, estudos, reuniões e eventos.",
      "Aprovação configurável para inclusão, alteração, cancelamento e publicação.",
      "Recorrências, responsáveis, locais, público envolvido e checklist em um só lugar.",
      "Alertas de conflito por data, responsável, local, equipe ou período de férias.",
      "Visão mensal, anual e por tipo de atividade para reduzir desencontros.",
      "Integração natural com pessoas, funções e permissões da Base Única.",
    ],
  },
  "corrente-em-dia": {
    solutionName: "Corrente em Dia",
    eyebrow: "Solução para arrecadações",
    title: "A contribuição da casa organizada com respeito, clareza e custo fixo zero.",
    description:
      "O Corrente em Dia ajuda federações, associações e terreiros a organizar contribuições, Pix, comprovantes e pendências sem transformar cuidado coletivo em cobrança fria. A casa ganha previsibilidade, o gestor ganha clareza e o contribuinte resolve tudo pelo celular.",
    benefits: [
      "Implantação R$ 0,00 e mensalidade R$ 0,00 no período de Cliente Fundador.",
      "QR Code Pix e Pix copia e cola para facilitar a contribuição.",
      "Upload, pré-validação e aprovação humana de comprovantes.",
      "Painel simples para celular e página clara para computador.",
      "Relatórios de pagos, pendentes, em revisão e divergentes.",
      "Lembretes respeitosos, sem exposição e sem cobrança agressiva.",
    ],
    howItWorks: [
      "A organização cadastra sua chave Pix oficial e seus contribuintes.",
      "O sistema gera a contribuição do mês com QR Code e Pix copia e cola.",
      "O contribuinte paga pelo banco e envia o comprovante pelo celular.",
      "A organização confere e aprova o comprovante sem expor dados individuais.",
      "O painel mostra pagos, pendentes, em revisão e divergentes para facilitar o fechamento.",
    ],
  },
};

const HOW_IT_WORKS = [
  "O contato informa nome, WhatsApp, e-mail e módulo de interesse no Quero Conhecer único.",
  "A Automação Extrema entende a dor prioritária: contribuições, atendimento, agenda ou solução completa.",
  "A organização configura a Base Única com pessoas, funções, permissões e módulos habilitados.",
  "Cada módulo passa a usar a mesma base, evitando cadastros duplicados e regras desencontradas.",
  "A validação acompanha indicadores, dúvidas e ajustes antes de transformar o piloto em pacote definitivo.",
];

const FOUNDER_BENEFITS = [
  "Participar da construção da solução com prioridade nas melhorias mais importantes.",
  "Receber acompanhamento inicial para configurar Base Única, módulos, responsáveis e permissões.",
  "Validar os módulos separadamente ou como solução completa.",
  "Manter condição especial de lançamento durante o período combinado.",
  "Ganhar destaque como Cliente Fundador somente com autorização expressa.",
  "Trocar feedback prático por acesso preferencial a evoluções futuras.",
];

function InfoModal({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#00263A]/70 p-2 backdrop-blur-sm sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.35rem] bg-white p-3 shadow-2xl sm:max-h-[92dvh] sm:rounded-[1.75rem] sm:p-5"
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-[10px]">{eyebrow}</p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-[#00334E] sm:text-2xl">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-xl bg-[#00334E] px-3 py-2 text-xs font-black text-white">
            Fechar
          </button>
        </div>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </section>
    </div>
  );
}

function TouchButton({ label, detail, onClick }: { label: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-20 rounded-2xl bg-white px-2.5 py-2.5 text-center shadow ring-1 ring-[#00334E]/10 transition active:scale-[0.98] sm:min-h-24"
    >
      <span className="block text-sm font-black leading-tight text-[#00334E]">{label}</span>
      <span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-500">{detail}</span>
      <span className="mt-1.5 block text-[8px] font-black uppercase tracking-[0.11em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
    </button>
  );
}

function ModalCtas({ interestHref, whatsappHref }: { interestHref: string; whatsappHref: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link
        href={interestHref}
        className="rounded-xl bg-[#31C16B] px-3 py-2.5 text-center text-xs font-black leading-tight text-[#00334E] shadow-sm"
      >
        Quero Conhecer
        <span className="mt-1 block text-[8px] uppercase tracking-[0.1em] text-[#00334E]/70">TOQUE PARA CONTINUAR</span>
      </Link>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="rounded-xl bg-[#00334E] px-3 py-2.5 text-center text-xs font-black leading-tight text-white shadow-sm"
      >
        Falar no WhatsApp
        <span className="mt-1 block text-[8px] uppercase tracking-[0.1em] text-white/70">TOQUE PARA CONTINUAR</span>
      </a>
    </div>
  );
}

function moduleParam(module: LandingModule) {
  return module === "organizacao-em-harmonia" ? "organizacao-em-harmonia" : module;
}

export function OrganizacaoEmHarmoniaLanding({ module = "organizacao-em-harmonia" }: { module?: LandingModule }) {
  const normalizedModule = CONTENT[module] ? module : "organizacao-em-harmonia";
  const content = CONTENT[normalizedModule];
  const [modal, setModal] = useState<ModalKey | null>(null);
  const isSuite = normalizedModule === "organizacao-em-harmonia";
  const isCorrente = normalizedModule === "corrente-em-dia";
  const interestHref = `/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=${encodeURIComponent(moduleParam(normalizedModule))}`;
  const loginHref = "/solucoes/organizacao-em-harmonia/login?returnTo=%2Fsolucoes%2Forganizacao-em-harmonia%2Fcliente";
  const aeWhatsapp = (process.env.NEXT_PUBLIC_AE_WHATSAPP_NUMBER || "5519989848246").replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${aeWhatsapp}?text=${encodeURIComponent(`Olá, quero saber mais sobre ${content.solutionName}.`)}`;

  const headerActions: OrganizacaoPublicHeaderAction[] = isCorrente
    ? [
        { label: "Solução", actionId: "visao" },
        { label: "Painel", actionId: "painel" },
        { label: "Contribuição", actionId: "contribuicao" },
        { label: "Benefícios", actionId: "beneficios" },
        { label: "Como Funciona", actionId: "como-funciona" },
        { label: "Cliente Fundador", actionId: "cliente-fundador" },
        { label: "Quero Conhecer", href: interestHref },
        { label: "Já sou Cliente", href: loginHref },
      ]
    : [
        { label: "Visão", actionId: "visao" },
        { label: "Módulos", actionId: "modulos" },
        { label: "Base Única", actionId: "base-unica" },
        { label: "Benefícios", actionId: "beneficios" },
        { label: "Como Funciona", actionId: "como-funciona" },
        { label: "Cliente Fundador", actionId: "cliente-fundador" },
        { label: "Quero Conhecer", href: interestHref },
        { label: "Já sou Cliente", href: loginHref },
      ];

  const modalTitles: Record<ModalKey, { title: string; eyebrow: string }> = {
    visao: {
      title: isCorrente
        ? "Contribuições organizadas sem transformar cuidado em cobrança"
        : isSuite
          ? "Uma memória operacional para a organização"
          : "Visão do módulo",
      eyebrow: isCorrente ? "Solução" : "Visão",
    },
    modulos: { title: "Módulos conectados pela mesma base", eyebrow: "Módulos" },
    "base-unica": { title: "Pessoas, funções e permissões compartilhadas", eyebrow: "Base Única" },
    painel: { title: "Visão simples para quem organiza", eyebrow: "Painel" },
    contribuicao: { title: "Pix e comprovante pelo celular", eyebrow: "Contribuição" },
    beneficios: { title: "Mais clareza e menos retrabalho", eyebrow: "Benefícios" },
    "como-funciona": { title: "Um caminho simples para começar", eyebrow: "Como funciona" },
    "cliente-fundador": { title: "Construa a solução junto com a Automação Extrema", eyebrow: "Cliente Fundador" },
    "mais-informacoes": { title: "Mais informações", eyebrow: "Organização em Harmonia" },
  };

  return (
    <main id="inicio" className="min-h-screen bg-[#F6FBF8] text-slate-800">
      <OrganizacaoPublicHeader
        actions={headerActions}
        onAction={(actionId) => setModal(actionId as ModalKey)}
        backFallbackHref={isSuite ? "/" : "/solucoes/organizacao-em-harmonia"}
        solutionName={content.solutionName}
        showBack={!isSuite}
      />

      <section className="mx-auto max-w-6xl px-3 py-2.5 sm:px-6 sm:py-5 lg:px-8">
        <div className="rounded-[1.45rem] bg-white p-3.5 shadow-xl shadow-emerald-900/10 ring-1 ring-[#00334E]/10 sm:rounded-[1.75rem] sm:p-6">
          <p className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#2F6B43] ring-1 ring-emerald-100 sm:text-xs sm:tracking-[0.2em]">
            {content.eyebrow}
          </p>
          <h1 className="mt-1.5 max-w-5xl text-[1.45rem] font-black leading-[1.1] tracking-tight text-[#00334E] sm:mt-2.5 sm:text-4xl lg:text-[2.75rem]">
            {content.title}
          </h1>
          <p className="mt-1.5 max-w-5xl text-[0.82rem] font-semibold leading-[1.22rem] text-slate-700 sm:mt-2.5 sm:text-base sm:leading-7">
            {content.description}
          </p>
          {content.secondParagraph && (
            <p className="mt-1.5 max-w-5xl rounded-xl bg-[#F7FAF2] px-2.5 py-1.5 text-[0.7rem] font-semibold leading-[1.05rem] text-[#00334E] ring-1 ring-[#00334E]/8 sm:mt-2.5 sm:px-3 sm:py-2.5 sm:text-sm sm:leading-6">
              {content.secondParagraph}
            </p>
          )}

          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-4 sm:max-w-2xl sm:gap-3">
            <Link
              href={interestHref}
              className="rounded-xl bg-[#31C16B] px-2.5 py-2.5 text-center text-[0.78rem] font-black leading-tight text-[#00334E] shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
            >
              Quero Conhecer
              <span className="mt-1 block text-[8px] uppercase tracking-[0.1em] text-[#00334E]/70">TOQUE PARA CONTINUAR</span>
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#00334E] px-2.5 py-2.5 text-center text-[0.78rem] font-black leading-tight text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
            >
              Falar no WhatsApp
              <span className="mt-1 block text-[8px] uppercase tracking-[0.1em] text-white/70">TOQUE PARA CONTINUAR</span>
            </a>
            {isSuite && (
              <>
                <Link
                  href={loginHref}
                  className="rounded-xl bg-white px-2.5 py-2.5 text-center text-[0.78rem] font-black leading-tight text-[#00334E] shadow-lg shadow-slate-900/5 ring-1 ring-[#00334E]/15 transition hover:-translate-y-0.5 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
                >
                  Já sou Cliente
                  <span className="mt-1 block text-[8px] uppercase tracking-[0.1em] text-[#2F6B43]">TOQUE PARA CONTINUAR</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setModal("mais-informacoes")}
                  className="rounded-xl bg-[#EAF6EF] px-2.5 py-2.5 text-center text-[0.78rem] font-black leading-tight text-[#00334E] shadow-lg shadow-emerald-900/5 ring-1 ring-[#00334E]/10 transition hover:-translate-y-0.5 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
                >
                  MAIS INFORMAÇÕES
                  <span className="mt-1 block text-[8px] uppercase tracking-[0.1em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
                </button>
              </>
            )}
          </div>
          {!isSuite && (
            <Link
              href="/solucoes/organizacao-em-harmonia"
              className="mt-2 inline-flex rounded-xl bg-[#F7FAF2] px-3 py-2 text-[10px] font-black text-[#00334E] ring-1 ring-[#00334E]/10 sm:mt-3 sm:text-xs"
            >
              Ver a solução completa Organização em Harmonia
            </Link>
          )}
        </div>

        {!isSuite && (
          <section className="mt-2.5 rounded-[1.45rem] bg-[#EAF6EF] p-2.5 ring-1 ring-emerald-100 sm:mt-4 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {isCorrente ? (
                <>
                  <TouchButton label="Solução" detail="entenda a proposta" onClick={() => setModal("visao")} />
                  <TouchButton label="Painel" detail="acompanhe o mês" onClick={() => setModal("painel")} />
                  <TouchButton label="Contribuição" detail="Pix e comprovante" onClick={() => setModal("contribuicao")} />
                </>
              ) : (
                <>
                  <TouchButton label="Visão" detail="entenda a proposta" onClick={() => setModal("visao")} />
                  <TouchButton label="Módulos" detail="veja os caminhos" onClick={() => setModal("modulos")} />
                  <TouchButton label="Base Única" detail="pessoas e permissões" onClick={() => setModal("base-unica")} />
                </>
              )}
              <TouchButton label="Benefícios" detail="ganhos práticos" onClick={() => setModal("beneficios")} />
              <TouchButton label="Como funciona" detail="passo a passo" onClick={() => setModal("como-funciona")} />
              <TouchButton label="Cliente Fundador" detail="participe da evolução" onClick={() => setModal("cliente-fundador")} />
            </div>
          </section>
        )}

        <p className="mt-2.5 px-1 text-center text-[10px] font-semibold leading-4 text-slate-500 sm:mt-4 sm:text-xs">
          {content.solutionName} — uma solução Automação Extrema. Organização, clareza e cuidado para manter a rotina mais previsível, sem perder o jeito humano de funcionar.
        </p>
      </section>

      {modal && (
        <InfoModal
          title={modalTitles[modal].title}
          eyebrow={modalTitles[modal].eyebrow}
          onClose={() => setModal(null)}
        >
          {modal === "visao" && (
            <div className="grid gap-2">
              <p className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold leading-5 text-slate-700 ring-1 ring-emerald-100 sm:text-sm sm:leading-6">
                {content.description}
              </p>
              {isCorrente ? (
                <div className="grid grid-cols-2 gap-2">
                  {["Pix · simples", "Comprovantes · organizados", "Pendências · visíveis", "Privacidade · preservada"].map((item) => (
                    <div key={item} className="rounded-xl bg-[#F7FAF2] p-2.5 text-center text-[11px] font-black leading-4 text-[#00334E] ring-1 ring-[#00334E]/8 sm:text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {["Pessoas · Base Única", "Funções · Permissões", "Módulos · Habilitados", "Aprovações · Por perfil"].map((item) => (
                      <div key={item} className="rounded-xl bg-[#F7FAF2] p-2.5 text-center text-[11px] font-black leading-4 text-[#00334E] ring-1 ring-[#00334E]/8 sm:text-sm">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "1. Cadastra pessoas, funções e permissões.",
                      "2. Ativa os módulos daquele cliente.",
                      "3. Define quem aprova, edita e acompanha.",
                      "4. Opera pelo celular ou computador.",
                    ].map((item) => (
                      <p key={item} className="rounded-xl bg-white p-2 text-[10px] font-semibold leading-4 text-slate-700 ring-1 ring-[#00334E]/10 sm:text-xs">
                        {item}
                      </p>
                    ))}
                  </div>
                </>
              )}
              {isSuite ? (
                <ModalCtas interestHref={interestHref} whatsappHref={whatsappHref} />
              ) : (
                <p className="rounded-xl bg-white p-3 text-xs font-bold leading-5 text-[#2F6B43] ring-1 ring-[#00334E]/10">
                  Mobile-first: no celular, as informações principais ficam em botões e pop-ups; no computador, a gestão pode usar mais espaço sem perder clareza.
                </p>
              )}
            </div>
          )}

          {modal === "modulos" && (
            <div className="grid gap-2 sm:grid-cols-3">
              {MODULES.map((item) => (
                <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#00334E]/10">
                  <h3 className="text-sm font-black text-[#00334E]">{item.title}</h3>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-600">{item.summary}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-1">
                    <Link href={item.href} className="rounded-xl bg-[#00334E] px-2 py-2 text-center text-[10px] font-black text-white">
                      Abrir módulo
                    </Link>
                    <Link href={`/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=${item.id}`} className="rounded-xl bg-white px-2 py-2 text-center text-[10px] font-black text-[#00334E] ring-1 ring-[#00334E]/10">
                      Quero conhecer
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {modal === "base-unica" && (
            <div className="grid gap-2">
              {[
                "A Base Única sustenta os módulos e evita cadastro repetido de pessoas, funções, permissões e responsáveis.",
                "Uma pessoa cadastrada uma vez pode participar de diferentes processos conforme suas funções.",
                "Cada cliente define quais módulos usa e quem pode ver, criar, aprovar, editar, cancelar ou acompanhar informações.",
                "A mesma base reduz retrabalho e inconsistência entre Atendimento em Harmonia, Agenda Viva e Corrente em Dia.",
              ].map((item) => (
                <p key={item} className="rounded-xl bg-[#F7FAF2] p-2.5 text-xs font-semibold leading-5 text-slate-700 ring-1 ring-[#00334E]/8 sm:text-sm">
                  {item}
                </p>
              ))}
              {isSuite && <ModalCtas interestHref={interestHref} whatsappHref={whatsappHref} />}
            </div>
          )}

          {modal === "painel" && (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Arrecadado", "R$ 1.840"],
                  ["Pendentes", "12"],
                  ["Em revisão", "8"],
                  ["Divergentes", "2"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#F7FAF2] p-3 text-center ring-1 ring-[#00334E]/8">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{label}</p>
                    <p className="mt-1 text-xl font-black text-[#00334E]">{value}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold leading-5 text-slate-700 ring-1 ring-emerald-100">
                A visão resume o mês sem expor detalhes individuais para quem não possui permissão.
              </p>
            </div>
          )}

          {modal === "contribuicao" && (
            <div className="grid gap-2">
              <div className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#00334E]/10">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">Minha contribuição</p>
                <p className="mt-1 text-base font-black text-[#00334E]">Valor: R$ 50,00 · Até dia 10</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="flex min-h-20 items-center justify-center rounded-xl bg-white text-center text-xs font-black text-[#00334E] ring-1 ring-[#00334E]/10">QR Code Pix</div>
                  <div className="flex min-h-20 items-center justify-center rounded-xl bg-white text-center text-xs font-black text-[#00334E] ring-1 ring-[#00334E]/10">Pix copia e cola</div>
                </div>
                <button type="button" className="mt-2 w-full rounded-xl bg-[#00334E] px-3 py-2.5 text-xs font-black text-white">Enviar comprovante</button>
              </div>
              <p className="rounded-xl bg-emerald-50 p-3 text-[11px] font-semibold leading-4 text-slate-700 ring-1 ring-emerald-100 sm:text-xs sm:leading-5">
                Privacidade e LGPD: valores, comprovantes, WhatsApp, e-mail e histórico ficam disponíveis somente conforme as permissões e a necessidade operacional.
              </p>
            </div>
          )}

          {modal === "beneficios" && (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                {content.benefits.map((benefit) => (
                  <div key={benefit} className="rounded-xl bg-[#F7FAF2] p-2.5 text-[11px] font-semibold leading-4 text-slate-700 ring-1 ring-[#00334E]/8 sm:text-sm sm:leading-5">
                    <span className="mr-1 font-black text-[#2F6B43]">✓</span>
                    {benefit}
                  </div>
                ))}
              </div>
              {isSuite && <ModalCtas interestHref={interestHref} whatsappHref={whatsappHref} />}
            </div>
          )}

          {modal === "como-funciona" && (
            <div className="grid gap-2">
              {(content.howItWorks ?? HOW_IT_WORKS).map((step, index) => (
                <div key={step} className="flex gap-2 rounded-xl bg-[#F7FAF2] p-2.5 ring-1 ring-[#00334E]/8">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00334E] text-[10px] font-black text-white">{index + 1}</span>
                  <p className="text-[11px] font-semibold leading-4 text-slate-700 sm:text-sm sm:leading-5">{step}</p>
                </div>
              ))}
              {isSuite && <ModalCtas interestHref={interestHref} whatsappHref={whatsappHref} />}
            </div>
          )}

          {modal === "mais-informacoes" && (
            <div className="rounded-[1.25rem] bg-[#EAF6EF] p-2.5 ring-1 ring-emerald-100 sm:p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <TouchButton label="Visão" detail="entenda a proposta" onClick={() => setModal("visao")} />
                <TouchButton label="Módulos" detail="veja os caminhos" onClick={() => setModal("modulos")} />
                <TouchButton label="Base Única" detail="pessoas e permissões" onClick={() => setModal("base-unica")} />
                <TouchButton label="Benefícios" detail="ganhos práticos" onClick={() => setModal("beneficios")} />
                <TouchButton label="Como funciona" detail="passo a passo" onClick={() => setModal("como-funciona")} />
                <TouchButton label="Cliente Fundador" detail="participe da evolução" onClick={() => setModal("cliente-fundador")} />
              </div>
            </div>
          )}

          {modal === "cliente-fundador" && (
            <div className="grid gap-2">
              <p className="rounded-xl bg-emerald-50 p-2.5 text-xs font-bold leading-5 text-[#00334E] ring-1 ring-emerald-100">
                Sua organização participa da fase inicial com acompanhamento mais próximo, prioridade nas melhorias e validação prática dos módulos que realmente fazem diferença na rotina.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FOUNDER_BENEFITS.map((item) => (
                  <p key={item} className="rounded-xl bg-[#F7FAF2] p-2 text-[10px] font-semibold leading-4 text-slate-700 ring-1 ring-[#00334E]/8 sm:text-xs">
                    ✓ {item}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={interestHref} className="rounded-xl bg-[#31C16B] px-3 py-2.5 text-center text-xs font-black text-[#00334E]">
                  Quero ser Cliente Fundador
                </Link>
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-xl bg-[#00334E] px-3 py-2.5 text-center text-xs font-black text-white">
                  Tirar dúvidas no WhatsApp
                </a>
              </div>
            </div>
          )}
        </InfoModal>
      )}
    </main>
  );
}
