import Link from "next/link";
import { FinancialTransparencyPopup } from "@/components/organizacao-em-harmonia/financial-transparency-popup";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { getTucxaPublicContent } from "@/lib/organizacao-em-harmonia/tucxa-public-content";

export const dynamic = "force-dynamic";

const benefits = [
  "Menos mensagens perdidas nos grupos de WhatsApp.",
  "Dados atualizados uma única vez e usados nos três módulos.",
  "Mais segurança para liberar acesso apenas após validação do responsável.",
  "Uso simples no celular, pensando também nos filhos com pouca familiaridade tecnológica.",
];

const headerActions = [
  {
    label: "Início",
    href: "#inicio",
    variant: "primary" as const,
  },
  {
    label: "Visão",
    href: "#visao",
    variant: "secondary" as const,
  },
  {
    label: "Cadastro",
    href: "#cadastro",
    variant: "secondary" as const,
  },
  {
    label: "F. Corrente",
    href: "#corrente",
    variant: "secondary" as const,
  },
  {
    label: "Consulentes",
    href: "#consulentes",
    variant: "secondary" as const,
  },
  {
    label: "Módulos",
    href: "#modulos",
    variant: "secondary" as const,
  },
  {
    label: "Sementinha",
    href: "/solucoes/organizacao-em-harmonia/tucxa/sementinha",
    variant: "secondary" as const,
  },
  {
    label: "Prestação de Contas",
    href: "#prestacao-contas",
    variant: "secondary" as const,
  },
  {
    label: "Ajuda",
    href: "#duvidas",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const audienceButtonClass =
  "rounded-2xl px-4 py-3.5 text-center text-sm font-black transition hover:-translate-y-0.5 sm:text-base";

export default async function TucxaSitePage() {
  const content = await getTucxaPublicContent();
  const modules: Array<{
    title: string;
    text: string;
    href?: string;
    buttonLabel?: string;
  }> = [
    {
      title: "Agenda Viva",
      text: "Organiza atividades, grupos, escalas, estudos e eventos em um calendário simples para consulta pelo celular.",
      href: "/solucoes/organizacao-em-harmonia/tucxa/agenda-viva",
      buttonLabel: "Acessar",
    },
    {
      title: content.atendimentoEmHarmonia.title,
      text: content.atendimentoEmHarmonia.description,
      href: "/solucoes/organizacao-em-harmonia/tucxa/atendimento-em-harmonia",
      buttonLabel: "Acessar",
    },
    {
      title: content.correnteEmDia.title,
      text: content.correnteEmDia.description,
      href: "/solucoes/organizacao-em-harmonia/tucxa/corrente-em-dia",
      buttonLabel: "Acessar",
    },
    {
      title: "Sementinha em Harmonia",
      text: "Ações assistenciais do Sementinha conectadas ao Tucxa. A primeira solução é a Despensa Viva, com estoque por lote e validade, composição da cesta e entregas.",
      href: "/solucoes/organizacao-em-harmonia/tucxa/sementinha",
      buttonLabel: "Conhecer",
    },
  ];

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={headerActions}
        showSupport={false}
        mobileActionColumns={4}
        compactMobileActions
      />
      <FinancialTransparencyPopup />

      <section className="scroll-mt-48 mx-auto max-w-6xl px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8 lg:py-4">
        <div className="rounded-[1.75rem] bg-white p-4 shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="inline-flex rounded-full bg-[#E9F2E7] px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#2F6B43] ring-1 ring-[#123D2C]/10 sm:text-xs">
            Organização em Harmonia no Tucxa
          </p>
          <h1 className="mt-2.5 max-w-4xl text-[1.72rem] font-black leading-tight tracking-tight text-[#123D2C] sm:text-4xl lg:text-[2.8rem]">
            Um ponto simples para orientar, organizar e cuidar melhor da nossa corrente.
          </h1>
          <p className="mt-2.5 max-w-4xl text-[0.95rem] leading-6 text-slate-700 sm:text-[1.05rem] sm:leading-8">
            O Tucxa passa a ter um espaço próprio para que Filhos da Corrente e Filhos de Fora encontrem informações, atualizem seus dados e recebam orientações com mais clareza, sem depender de mensagens soltas ou cadastros duplicados.
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <Link
              href="#corrente"
              className="rounded-2xl bg-[#123D2C] px-5 py-3 text-center text-sm font-black text-white shadow-xl shadow-green-900/10 transition hover:-translate-y-1 sm:text-base"
            >
              Sou Filho da Corrente
            </Link>
            <Link
              href="#consulentes"
              className="rounded-2xl bg-[#E9F2E7] px-5 py-3 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-1 sm:text-base"
            >
              Sou Consulente / Filho de Fora
            </Link>
          </div>
        </div>
      </section>

      <section
        id="visao"
        className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7] sm:text-sm">
            Visão
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Tecnologia para servir à organização, não para complicar a rotina.
          </h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA] sm:text-lg sm:leading-8">
            A proposta é preservar o jeito do Tucxa trabalhar, oferecendo uma base mais clara para cadastros, agenda, orientações, estudos, eventos e contribuições. Tudo deve ser simples, acessível pelo celular e validado por responsáveis da casa.
          </p>
        </div>
      </section>

      <section
        id="cadastro"
        className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="rounded-[1.75rem] bg-white p-4 shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10 sm:p-6">
          <div className="rounded-[1.5rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Por que se cadastrar?
            </p>
            <h2 className="mt-2 text-xl font-black text-[#123D2C] sm:text-2xl">
              Para receber a orientação certa, no canal certo, sem retrabalho.
            </h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-2xl bg-white p-3 text-sm font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:p-4 sm:text-base"
                >
                  {benefit}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <Link
              href="#corrente"
              className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center text-sm font-black text-white shadow-xl shadow-green-900/10 transition hover:-translate-y-1 sm:text-base"
            >
              Sou Filho da Corrente
            </Link>
            <Link
              href="#consulentes"
              className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 transition hover:-translate-y-1 hover:bg-[#E9F2E7] sm:text-base"
            >
              Sou Consulente / Filho de Fora
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <article
            id="corrente"
            className="scroll-mt-48 flex h-full flex-col rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">
              Filhos da Corrente
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
              Compromisso, desenvolvimento e cuidado com a Corrente.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700 sm:leading-8">
              Os Filhos da Corrente são integrantes que assumem compromisso com o Tucxa, com o grupo e com os Trabalhos Espirituais. Participam do desenvolvimento mediúnico e podem servir em diferentes frentes, ajudando a manter a harmonia, a organização e o cuidado com todos.
            </p>
            <div className="mt-auto grid gap-2 pt-5">
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente"
                className={`${audienceButtonClass} bg-[#123D2C] text-white`}
              >
                Acessar página do Filho da Corrente
              </Link>
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/primeiro-acesso"
                className={`${audienceButtonClass} bg-[#E9F2E7] text-[#123D2C] ring-1 ring-[#123D2C]/10`}
              >
                Fazer primeiro acesso
              </Link>
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login"
                className={`${audienceButtonClass} bg-white text-[#123D2C] ring-1 ring-[#123D2C]/10 hover:bg-[#F7FAF2]`}
              >
                Já tenho acesso
              </Link>
            </div>
          </article>

          <article
            id="consulentes"
            className="scroll-mt-48 flex h-full flex-col rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">
              Consulentes / Filhos de Fora
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
              Acolhimento para quem busca auxílio e crescimento espiritual.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700 sm:leading-8">
              O Tucxa é aberto a pessoas que buscam auxílio espiritual. Aqui o consulente encontra uma explicação simples do atendimento e pode deixar seus dados para orientação, agendamento e contribuição.
            </p>
            <div className="mt-auto grid gap-2 pt-5">
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/consulente"
                className={`${audienceButtonClass} bg-[#123D2C] text-white`}
              >
                Acessar página do Consulente
              </Link>
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro"
                className={`${audienceButtonClass} bg-[#E9F2E7] text-[#123D2C] ring-1 ring-[#123D2C]/10`}
              >
                Fazer cadastro
              </Link>
              <Link
                href="/solucoes/organizacao-em-harmonia/tucxa/consulente/login"
                className={`${audienceButtonClass} bg-white text-[#123D2C] ring-1 ring-[#123D2C]/10 hover:bg-[#F7FAF2]`}
              >
                Já tenho cadastro
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section
        id="modulos"
        className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">
            Módulos do Tucxa
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">
            Quatro frentes conectadas pela mesma Base de Harmonia.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <article
              key={module.title}
              className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6"
            >
              <h3 className="text-lg font-black text-[#123D2C] sm:text-xl">
                {module.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                {module.text}
              </p>
              {module.href && (
                <Link
                  href={module.href}
                  className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2F6B43]"
                >
                  {module.buttonLabel || "Abrir módulo"}
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <section
        id="prestacao-contas"
        className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 pb-12 sm:px-6 lg:px-8"
      >
        <article className="overflow-hidden rounded-[1.75rem] bg-white shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10">
          <div className="bg-gradient-to-br from-[#123D2C] to-[#2F6B43] p-5 text-white sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7] sm:text-sm">
              Prestação de Contas
            </p>
            <h2 className="mt-2 max-w-4xl text-2xl font-black leading-tight sm:text-3xl">
              Clareza para transformar números em confiança e continuidade.
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA] sm:text-lg sm:leading-8">
              Cada atendimento e cada atividade dependem de uma estrutura que precisa continuar funcionando: água, energia, limpeza, segurança, manutenção, materiais e organização.
            </p>
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/transparencia"
              className="mt-5 inline-flex w-full justify-center rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-[#123D2C] shadow-lg shadow-green-950/10 transition hover:-translate-y-0.5 hover:bg-[#F7FAF2] sm:w-auto sm:text-base"
            >
              Acompanhar prestação de contas
            </Link>
            <p className="mt-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#CFE2C7] sm:w-fit sm:px-4 sm:text-xs">
              TOQUE PARA ABRIR
            </p>
          </div>

          <div className="grid gap-4 p-5 sm:p-7 md:grid-cols-3">
            <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="font-black text-[#123D2C]">O que aparece</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Receitas, despesas, resultado, saldo e evolução mensal em uma leitura simples para o celular.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="font-black text-[#123D2C]">Por que existe</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Para mostrar onde os recursos são utilizados e o que ainda precisa ser sustentado para a Casa continuar preparada.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <p className="font-black text-[#123D2C]">O que isso fortalece</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Compreensão, responsabilidade compartilhada e confiança no cuidado com o Tucxa e com todos que são acolhidos.
              </p>
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-7 sm:pb-7">
            <p className="max-w-4xl text-base leading-7 text-slate-700">
              Quando as informações são apresentadas com clareza, a contribuição deixa de parecer apenas um valor e passa a representar estrutura, continuidade e cuidado em movimento.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
