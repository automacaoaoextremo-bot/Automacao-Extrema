import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { getTucxaPublicContent } from "@/lib/organizacao-em-harmonia/tucxa-public-content";

export const dynamic = "force-dynamic";

const commitments = [
  {
    id: "compromisso",
    title: "Compromisso com a Casa e com a Corrente",
    description:
      "Ser Filho da Corrente é assumir responsabilidade com o Tucxa, com o grupo e com os Trabalhos Espirituais. Assiduidade, disciplina, respeito às orientações e comunicação com a coordenação ajudam a preservar a ordem e a harmonia da Casa.",
  },
  {
    id: "desenvolvimento",
    title: "Desenvolvimento, estudo e autoconhecimento",
    description:
      "A participação na Corrente envolve estudo, reflexão, fé, humildade e desenvolvimento constante. O aprendizado não se limita aos dias de trabalho: ele também acontece na forma de cuidar, servir e conviver com responsabilidade.",
  },
  {
    id: "funcoes",
    title: "Serviço em diferentes frentes",
    description:
      "Cada Filho pode atuar em uma ou mais frentes, como cambono, cavalinho, recepção, coordenação, organização, estudos, eventos e outras atividades. Manter os vínculos atualizados ajuda o Tucxa a orientar cada pessoa conforme sua atuação.",
  },
];

const preparation = [
  "Mantenha seus dados pessoais, funções e vínculos com a Casa sempre atualizados.",
  "Acompanhe o calendário, o grupo de desenvolvimento e as orientações da coordenação.",
  "Conheça e respeite os regulamentos, os procedimentos e as orientações espirituais do Tucxa.",
  "Atue com responsabilidade, discrição, silêncio, respeito e cuidado com todos os envolvidos.",
];

const moduleButtonClass =
  "mt-auto inline-flex w-full items-center justify-center rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2F6B43]";

export default async function FilhoDaCorrentePublicPage() {
  const content = await getTucxaPublicContent();

  const headerActions = [
    {
      label: "Início",
      href: "#inicio",
      variant: "primary" as const,
    },
    {
      label: "Voltar",
      href: "/solucoes/organizacao-em-harmonia/tucxa#corrente",
      variant: "secondary" as const,
    },
    {
      label: "Compromisso",
      href: "#compromisso",
      variant: "secondary" as const,
    },
    {
      label: "Desenvolvimento",
      href: "#desenvolvimento",
      variant: "secondary" as const,
    },
    {
      label: "Funções",
      href: "#funcoes",
      variant: "secondary" as const,
    },
    {
      label: "Módulos",
      href: "#modulos",
      variant: "secondary" as const,
    },
    {
      label: "Preparação",
      href: "#preparacao",
      variant: "secondary" as const,
    },
  ];

  const modules = [
    {
      title: content.atendimentoEmHarmonia.title,
      description: content.atendimentoEmHarmonia.description,
      href: "/solucoes/organizacao-em-harmonia/tucxa/atendimento-em-harmonia",
    },
    {
      title: content.agendaViva.title,
      description: content.agendaViva.description,
      href: "/solucoes/organizacao-em-harmonia/tucxa/agenda-viva",
    },
    {
      title: content.correnteEmDia.title,
      description: content.correnteEmDia.description,
      href: "/solucoes/organizacao-em-harmonia/tucxa/corrente-em-dia",
    },
  ];

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={headerActions}
        navLabel="Menu público dos Filhos da Corrente do Tucxa"
      />

      <section className="scroll-mt-48 mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-4 lg:px-8 lg:py-6">
        <div className="rounded-[1.5rem] bg-[#123D2C] p-4 text-white shadow-xl shadow-green-900/10 sm:rounded-[1.75rem] sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7] sm:text-sm">
            Filhos da Corrente
          </p>
          <h1 className="mt-1.5 max-w-4xl text-2xl font-black leading-tight sm:mt-2 sm:text-4xl lg:text-[2.8rem]">
            Um espaço para quem assumiu compromisso com a Casa e com a Corrente.
          </h1>
          <p className="mt-2.5 max-w-4xl text-sm leading-5 text-[#EEF7EA] sm:mt-4 sm:text-[1.05rem] sm:leading-8">
            Os Filhos da Corrente participam do desenvolvimento mediúnico, ajudam a sustentar a harmonia dos Trabalhos Espirituais e podem servir em diferentes frentes do Tucxa. Este espaço reúne orientações, módulos e acessos para que cada pessoa cuide de seus dados e acompanhe sua participação com mais clareza.
          </p>
          <div className="mt-3 grid gap-2 sm:mt-5 sm:grid-cols-2">
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/primeiro-acesso"
              className="rounded-2xl bg-white px-4 py-2.5 text-center text-sm font-black text-[#123D2C] transition hover:-translate-y-0.5 sm:px-5 sm:py-3.5 sm:text-base"
            >
              Fazer primeiro acesso
            </Link>
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login"
              className="rounded-2xl bg-[#E9F2E7] px-4 py-2.5 text-center text-sm font-black text-[#123D2C] ring-1 ring-white/20 transition hover:-translate-y-0.5 sm:px-5 sm:py-3.5 sm:text-base"
            >
              Já tenho acesso
            </Link>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-4 md:grid-cols-3">
          {commitments.map((item) => (
            <article
              key={item.id}
              id={item.id}
              className="scroll-mt-48 rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6"
            >
              <h2 className="text-lg font-black text-[#123D2C] sm:text-xl">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <div id="modulos" className="scroll-mt-48 mt-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">
              Módulos do Tucxa
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">
              Informações e rotinas reunidas em um único acesso.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {modules.map((module) => (
              <article
                key={module.title}
                className="flex min-h-full flex-col rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6"
              >
                <h3 className="text-lg font-black text-[#123D2C] sm:text-xl">
                  {module.title}
                </h3>
                <p className="mt-3 pb-5 text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
                  {module.description}
                </p>
                <Link href={module.href} className={moduleButtonClass}>
                  Acessar
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div
          id="preparacao"
          className="scroll-mt-48 mt-5 rounded-[1.75rem] bg-white p-5 shadow-lg shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43] sm:text-sm">
            Como participar com harmonia
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl">
            Orientações simples para cuidar da sua participação na Corrente.
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {preparation.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-[#F7FAF2] p-4 text-sm font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-base sm:leading-7"
              >
                {item}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-[#E9F2E7] p-4 text-sm font-semibold leading-6 text-[#123D2C]">
            As orientações detalhadas, documentos, funções, grupos e atividades ficam disponíveis conforme o cadastro validado e as permissões de cada Filho da Corrente.
          </p>
        </div>
      </section>
    </main>
  );
}
