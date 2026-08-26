"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const base = "/solucoes/organizacao-em-harmonia/tucxa";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  {
    label: "Voltar",
    href: `${base}?semPopup=1&abrir=corrente-em-dia#modulos`,
    variant: "secondary" as const,
  },
  {
    label: "Ajuda",
    href: "#ajuda",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const transparencyFeatures = [
  "Visão resumida, por grupos ou por grupos e itens.",
  "Histórico dos últimos 12 meses, receitas, despesas e resultado.",
  "Saldo acumulado, comparação mensal e destaques positivos ou negativos.",
  "Drilldown, maiores despesas, melhores receitas e dados provisórios sinalizados.",
  "Última atualização, popup de transparência e frequência configurável.",
];

const expenseExamples = [
  "Energia, água, telefone e manutenção do espaço.",
  "Segurança, limpeza e conservação.",
  "Materiais usados nos trabalhos espirituais.",
  "Despesas bancárias, institucionais e administrativas.",
  "Ações assistenciais, eventos e apoio ao Sementinha.",
];

type PopupKey =
  | "transparencia"
  | "manutencao"
  | "painel"
  | "significado"
  | "consulentes"
  | "corrente"
  | null;

function InfoButton({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[5.4rem] flex-col items-center justify-center rounded-[1.35rem] bg-white px-3 py-2.5 text-center shadow-sm ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA] active:scale-[0.99]"
    >
      <span className="text-sm font-black leading-tight text-[#123D2C]">{title}</span>
      <span className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-500">{detail}</span>
      <span className="mt-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">
        TOQUE PARA ABRIR
      </span>
    </button>
  );
}

function Popup({
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
      className="fixed inset-0 z-[240] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-2xl sm:max-h-[92dvh] sm:rounded-[1.75rem] sm:p-5"
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white"
          >
            Fechar
          </button>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

export default function CorrenteEmDiaPublicPage() {
  const [popup, setPopup] = useState<PopupKey>(null);

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu do Corrente em Dia"
        showSupport={false}
      />

      <section className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="rounded-[1.6rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:rounded-[2rem] sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs">
            Corrente em Dia
          </p>
          <h1 className="mt-1.5 max-w-4xl text-2xl font-black leading-tight sm:mt-2 sm:text-4xl">
            Contribuir não é pagar por um atendimento. É ajudar a Casa a continuar cuidando.
          </h1>
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-5 text-[#EEF7EA] sm:mt-3 sm:text-base sm:leading-7">
            O Corrente em Dia transforma números dispersos em informação clara, sigilosa e útil para quem administra e para quem deseja contribuir com consciência.
          </p>
        </div>

        <section className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3" aria-label="Acessos do Corrente em Dia">
          <InfoButton
            title="Transparência"
            detail="Entenda como os recursos ajudam a manter a Casa."
            onClick={() => setPopup("transparencia")}
          />
          <InfoButton
            title="O que mantém a Casa"
            detail="Veja exemplos das despesas que sustentam o trabalho."
            onClick={() => setPopup("manutencao")}
          />
          <InfoButton
            title="Como o painel apresenta"
            detail="Conheça as visões e indicadores disponíveis."
            onClick={() => setPopup("painel")}
          />
          <InfoButton
            title="Por que isso importa"
            detail="Dados organizados, clareza para decidir e segurança."
            onClick={() => setPopup("significado")}
          />
          <InfoButton
            title="Filhos de Fora"
            detail="Contribuição identificada ou não identificada."
            onClick={() => setPopup("consulentes")}
          />
          <InfoButton
            title="Filhos da Corrente"
            detail="Acompanhe e organize sua contribuição mensal."
            onClick={() => setPopup("corrente")}
          />
        </section>
      </section>

      {popup === "transparencia" && (
        <Popup title="Transparência em Harmonia" eyebrow="Corrente em Dia" onClose={() => setPopup(null)}>
          <p className="text-sm font-semibold leading-6 text-slate-700">
            O painel público mostra, de forma agregada e sem expor nomes ou valores individuais, como os recursos ajudam a manter a Casa funcionando. A transparência permite compreender por que a participação de cada pessoa importa.
          </p>
          <Link
            href={`${base}/transparencia`}
            className="mt-4 block rounded-2xl bg-[#123D2C] px-5 py-3 text-center text-sm font-black text-white"
          >
            Acessar painel público
          </Link>
        </Popup>
      )}

      {popup === "manutencao" && (
        <Popup title="O que precisa ser mantido" eyebrow="Estrutura da Casa" onClose={() => setPopup(null)}>
          <ul className="grid gap-2 text-sm font-semibold leading-6 text-slate-700">
            {expenseExamples.map((item) => (
              <li key={item} className="flex gap-2 rounded-xl bg-[#F7FAF2] p-3">
                <span aria-hidden="true" className="font-black text-[#2F6B43]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Popup>
      )}

      {popup === "painel" && (
        <Popup title="Como o painel apresenta" eyebrow="Transparência em Harmonia" onClose={() => setPopup(null)}>
          <ul className="grid gap-2 text-sm font-semibold leading-6 text-slate-700">
            {transparencyFeatures.map((item) => (
              <li key={item} className="flex gap-2 rounded-xl bg-[#F7FAF2] p-3">
                <span aria-hidden="true" className="font-black text-[#2F6B43]">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Popup>
      )}

      {popup === "significado" && (
        <Popup title="Por que isso importa" eyebrow="Da característica ao significado" onClose={() => setPopup(null)}>
          <div className="grid gap-2">
            <article className="rounded-2xl bg-[#F7FAF2] p-4">
              <h3 className="font-black text-[#123D2C]">Dados organizados</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                Receitas, despesas, documentos e competências ficam reunidos em uma única base, com revisão da Tesouraria/Financeiro.
              </p>
            </article>
            <article className="rounded-2xl bg-[#F7FAF2] p-4">
              <h3 className="font-black text-[#123D2C]">Para decidir com clareza</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                A Diretoria acompanha pendências, compara meses e identifica onde a Casa precisa de atenção antes que um problema se torne maior.
              </p>
            </article>
            <article className="rounded-2xl bg-[#E9F2E7] p-4">
              <h3 className="font-black text-[#123D2C]">Segurança para contribuir</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                Quem contribui entende o impacto coletivo de sua participação e pode ajudar com confiança, sem exposição e sem transformar a espiritualidade em uma relação comercial.
              </p>
            </article>
          </div>
        </Popup>
      )}

      {popup === "consulentes" && (
        <Popup title="Filhos de Fora / Consulentes" eyebrow="Contribuição consciente" onClose={() => setPopup(null)}>
          <p className="text-sm font-semibold leading-6 text-slate-700">
            Contribua de forma identificada ou não identificada. Escolha um valor, registre uma contribuição pontual ou organize um Pix agendado. O atendimento não depende da contribuição, e os dados individuais permanecem sigilosos.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href={`${base}/consulente/contribuicao`} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white">
              Quero contribuir
            </Link>
            <Link href={`${base}/consulente/login`} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C]">
              Já tenho cadastro
            </Link>
          </div>
        </Popup>
      )}

      {popup === "corrente" && (
        <Popup title="Filhos da Corrente" eyebrow="Contribuição mensal" onClose={() => setPopup(null)}>
          <p className="text-sm font-semibold leading-6 text-slate-700">
            Consulte sua situação, escolha o melhor dia, configure lembretes e, quando autorizado, organize uma contribuição familiar. Somente a Tesouraria/Financeiro e a Diretoria autorizada acessam valores individuais.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href={`${base}/filho-da-corrente/login`} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-center text-sm font-black text-white">
              Já tenho cadastro
            </Link>
            <Link href={`${base}/filho-da-corrente/primeiro-acesso`} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-center text-sm font-black text-[#123D2C]">
              Ainda não tenho cadastro
            </Link>
          </div>
        </Popup>
      )}
    </main>
  );
}
