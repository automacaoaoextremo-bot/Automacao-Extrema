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
    label: "Cadastro",
    href: "#cadastro",
    variant: "secondary" as const,
  },
  {
    label: "Visão",
    href: "#visao",
    variant: "secondary" as const,
  },
  {
    label: "Módulos",
    href: "#modulos",
    variant: "secondary" as const,
  },
  {
    label: "Dúvidas?",
    href: "#duvidas",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
  {
    label: "Filhos da Corrente",
    href: "#corrente",
    variant: "secondary" as const,
  },
  {
    label: "Consulente",
    href: "#consulentes",
    variant: "secondary" as const,
  },
  {
    label: "Como funciona",
    href: "#como-funciona",
    variant: "secondary" as const,
  },
];

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
      buttonLabel: "Abrir Agenda Viva",
    },
    {
      title: content.atendimentoEmHarmonia.title,
      text: content.atendimentoEmHarmonia.description,
    },
    {
      title: content.correnteEmDia.title,
      text: content.correnteEmDia.description,
      href: "/solucoes/organizacao-em-harmonia/tucxa/transparencia",
      buttonLabel: "Ver Transparência em Harmonia",
    },
  ];

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} showSupport={false} />
      <FinancialTransparencyPopup />

      <section className="scroll-mt-48 mx-auto grid max-w-6xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-6">
        <div className="space-y-4">
          <p className="inline-flex rounded-full bg-[#E9F2E7] px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#2F6B43] ring-1 ring-[#123D2C]/10 sm:text-xs">
            Organização em Harmonia no Tucxa
          </p>
          <h1 className="text-3xl font-black leading-tight tracking-tight text-[#123D2C] sm:text-4xl lg:text-[2.8rem]">
            Um ponto simples para orientar, organizar e cuidar melhor da nossa corrente.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700 sm:text-[1.05rem] sm:leading-8">
            O Tucxa passa a ter um espaço próprio para que Filhos da Corrente e Filhos de Fora encontrem informações, atualizem seus dados e recebam orientações com mais clareza, sem depender de mensagens soltas ou cadastros duplicados.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="#cadastro" className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center text-sm font-black text-white shadow-xl shadow-green-900/10 transition hover:-translate-y-1 sm:text-base">
              Sou Filho da Corrente
            </Link>
            <Link href="#consulentes" className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 transition hover:-translate-y-1 hover:bg-[#E9F2E7] sm:text-base">
              Sou Consulente / Filho de Fora
            </Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white p-4 shadow-xl shadow-green-900/10 ring-1 ring-[#123D2C]/10 sm:p-6">
          <div id="cadastro" className="scroll-mt-48 rounded-[1.5rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Por que atualizar os dados?</p>
            <h2 className="mt-2 text-xl font-black text-[#123D2C] sm:text-2xl">Para receber a orientação certa, no canal certo, sem retrabalho.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
              Nome completo e WhatsApp ajudam a casa a reconhecer cada filho. O e-mail é opcional, mas recomendado para reforçar comunicados importantes e evitar que uma orientação se perca no volume de mensagens.
            </p>
          </div>
          <div className="mt-4 grid gap-2.5">
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/primeiro-acesso" className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center text-sm font-black text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 sm:text-base">
              Começar Primeiro Acesso do Filho da Corrente
            </Link>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login" className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 transition hover:-translate-y-0.5 hover:bg-[#F7FAF2] sm:text-base">
              Já tenho acesso liberado
            </Link>
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-[#123D2C]/10 bg-[#F7FAF2] p-3 text-sm font-bold text-[#123D2C] sm:p-4 sm:text-base">
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="visao" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7] sm:text-sm">Visão</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">Tecnologia para servir à organização, não para complicar a rotina.</h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA] sm:text-lg sm:leading-8">
            A proposta é preservar o jeito do Tucxa trabalhar, oferecendo uma base mais clara para cadastros, agenda, orientações, estudos, eventos e contribuições. Tudo deve ser simples, acessível pelo celular e validado por responsáveis da casa.
          </p>
        </div>
      </section>

      <section id="modulos" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">Módulos do Tucxa</p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Três frentes conectadas pela mesma Base de Harmonia.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <article key={module.title} className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
              <h3 className="text-lg font-black text-[#123D2C] sm:text-xl">{module.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">{module.text}</p>
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

      <section id="corrente" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">Filhos da Corrente</p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Atualize todos os vínculos que você possui com a casa.</h2>
            <p className="mt-3 text-base leading-7 text-slate-700 sm:leading-8">
              Quem atua em mais de uma frente deve marcar todas elas: cambono, cavalinho, coordenação, recepção, atendimento de segunda, terça e/ou quarta, Sementinha, estudos, clube do livro, organização de eventos e grupos de quinta. Assim o Tucxa consegue orientar cada pessoa com mais cuidado.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10 sm:p-6">
            <h3 className="text-xl font-black text-[#123D2C] sm:text-2xl">Primeiro acesso</h3>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Ao preencher os dados, o cadastro fica aguardando validação. Depois da conferência, o responsável libera o acesso e envia as orientações por e-mail, quando informado, e por WhatsApp.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/primeiro-acesso" className="inline-flex rounded-2xl bg-[#123D2C] px-5 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 sm:text-base">
                Fazer Primeiro Acesso
              </Link>
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login" className="inline-flex rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 sm:text-base">
                Acesso liberado
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="consulentes" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">Consulentes / Filhos de Fora</p>
              <h2 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">Acolhimento para quem busca auxílio e crescimento espiritual.</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 sm:leading-8">
                O Tucxa é aberto a pessoas que buscam auxílio espiritual. Aqui o consulente encontra uma explicação simples do atendimento e pode deixar seus dados para orientação, agendamento e contribuição.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80 lg:grid-cols-1">
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente" className="rounded-2xl bg-[#123D2C] px-5 py-3.5 text-center text-sm font-black text-white transition hover:-translate-y-0.5 sm:text-base">
                Acessar página do Consulente
              </Link>
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro" className="rounded-2xl bg-[#E9F2E7] px-5 py-3.5 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 sm:text-base">
                Fazer cadastro / contribuição
              </Link>
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/consulente/login" className="rounded-2xl bg-white px-5 py-3.5 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#F7FAF2] sm:text-base">
                Já tenho cadastro
              </Link>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {content.consulenteServices.map((service) => (
              <article key={service.title} className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
                <h3 className="font-black text-[#123D2C]">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-48 mx-auto max-w-6xl px-4 py-6 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "A pessoa informa WhatsApp ou e-mail", "Se já houver cadastro, os dados podem ser conferidos pela organização. Se não houver, a pessoa preenche de forma guiada."],
            ["2", "O responsável valida", "A Base Única não libera automaticamente. O Tucxa confere as informações antes de conceder acesso."],
            ["3", "A orientação chega pelo canal certo", "Após liberar ou solicitar ajuste, o responsável pode responder por WhatsApp e por e-mail com cópia interna."],
          ].map(([step, title, text]) => (
            <article key={step} className="rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#123D2C] text-lg font-black text-white">{step}</span>
              <h3 className="mt-4 text-lg font-black text-[#123D2C] sm:text-xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
