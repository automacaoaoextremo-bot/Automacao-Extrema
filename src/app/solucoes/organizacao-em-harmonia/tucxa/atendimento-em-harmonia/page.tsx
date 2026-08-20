import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import {
  TucxaInfoPopupGrid,
  type TucxaInfoPopupItem,
} from "@/components/organizacao-em-harmonia/tucxa-info-popup-grid";

const base = "/solucoes/organizacao-em-harmonia/tucxa";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "O que oferece", href: "#recursos", variant: "secondary" as const },
  { label: "Filhos de Fora", href: "#consulentes", variant: "secondary" as const },
  { label: "Filhos da Corrente", href: "#corrente", variant: "secondary" as const },
  { label: "Voltar", href: `${base}#modulos`, variant: "secondary" as const },
  {
    label: "Dúvidas?",
    href: "#duvidas",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

const stages = [
  {
    title: "Antes",
    text: "Orientações, calendário, preparo, acolhimento e materiais de estudo ajudam cada pessoa a chegar mais segura sobre o próximo passo.",
  },
  {
    title: "Durante",
    text: "Agendamentos, consultas autorizadas e informações ligadas à função de cada pessoa apoiam a organização sem substituir o cuidado humano.",
  },
  {
    title: "Depois",
    text: "Retornos, Escuta em Harmonia, cursos e Acervo Vivo ajudam o cuidado, a formação e o conhecimento a continuarem além do atendimento.",
  },
];

const features: TucxaInfoPopupItem[] = [
  {
    id: "orientacoes",
    title: "Orientações práticas",
    eyebrow: "Antes do atendimento",
    summary: "Informações essenciais para chegar preparado e entender como funciona o Tucxa.",
    description:
      "Reúne orientações sobre horários, chegada, silêncio, circulação, preparo e outras informações práticas que ajudam Filhos de Fora/Consulentes e Filhos da Corrente a entender o próximo passo.",
    highlights: [
      "Informações em linguagem simples.",
      "Consulta pelo celular.",
      "Menos dependência de mensagens antigas.",
    ],
  },
  {
    id: "agendamentos",
    title: "Acolhimento e agendamentos",
    eyebrow: "Organização do atendimento",
    summary: "Datas, solicitações e acompanhamento organizados no mesmo fluxo.",
    description:
      "Ajuda a consultar datas disponíveis, registrar solicitações e acompanhar orientações de atendimento ou presença conforme o perfil e as regras do Tucxa.",
    highlights: [
      "Agendamento de Filhos de Fora/Consulentes.",
      "Acolhimento e presença dos Filhos da Corrente.",
      "Regras e datas aplicadas pelo sistema.",
    ],
  },
  {
    id: "consultas",
    title: "Consulta de agendamentos",
    eyebrow: "Acesso conforme a função",
    summary: "Recepção, Cambonos e Cavalinhos consultam apenas o que sua função permite.",
    description:
      "A consulta reúne os atendimentos previstos e históricos necessários para a operação. O que cada pessoa visualiza ou pode alterar depende das funções e vínculos registrados na Base Única.",
    availability:
      "Disponível somente para funções autorizadas. As permissões preservam o acesso mínimo necessário para cada responsabilidade.",
  },
  {
    id: "escuta",
    title: "Escuta em Harmonia",
    eyebrow: "Ouvir para melhorar",
    summary: "Um espaço organizado para dúvidas, sugestões e preocupações dos Filhos da Corrente.",
    description:
      "Permite registrar uma dúvida, sugestão ou preocupação para a Diretoria, preservando o contexto e o acompanhamento do que foi compartilhado sem depender de mensagens dispersas.",
    availability: "Voltado aos Filhos da Corrente e aos responsáveis autorizados pela gestão.",
  },
  {
    id: "cursos",
    title: "Cursos em Harmonia",
    eyebrow: "Formação e acompanhamento",
    summary: "Curso Preparatório, aulas, professores, alunos, materiais e presenças conectados.",
    description:
      "Apoia a organização dos cursos do Tucxa, incluindo criação de curso e aulas, associação de professores, convites, materiais, códigos de presença, chamada e integração com a Agenda Viva.",
    availability:
      "As funções de gestão, professor e aluno visualizam somente as ações correspondentes ao seu papel.",
    highlights: [
      "Curso Preparatório e outros cursos.",
      "Professores, alunos e convites.",
      "Presença e chamada.",
      "Materiais e integração com Agenda Viva.",
    ],
  },
  {
    id: "acervo-vivo",
    title: "Acervo Vivo",
    eyebrow: "Biblioteca do Tucxa",
    summary: "Livros, trilhas e conteúdos para transformar o acervo em conhecimento em movimento.",
    description:
      "O Acervo Vivo conecta a Biblioteca do Tucxa ao Clube do Livro, Grupo de Estudos e Curso Preparatório. A pessoa pode pesquisar livros, descobrir trilhas, acompanhar disponibilidade e acessar conteúdos usando o mesmo cadastro já existente.",
    availability:
      "Filhos da Corrente e Filhos de Fora/Consulentes usam seu cadastro atual. Não é necessário criar um cadastro separado para a biblioteca.",
    highlights: [
      "Catálogo de livros e exemplares.",
      "Trilhas de estudo.",
      "Reservas e acompanhamento dos próprios empréstimos.",
      "Conteúdos como Folha Verde, manuais, vídeos e podcasts conforme disponibilidade.",
    ],
  },
];

const audienceCards = [
  {
    id: "consulentes",
    eyebrow: "Filhos de Fora / Consulentes",
    title: "Cuidar bem começa antes do atendimento.",
    description:
      "Use o mesmo cadastro para consultar orientações, organizar o atendimento e acessar o Acervo Vivo. Quando alguma função exigir identificação, o sistema direciona para cadastro ou login.",
    alreadyRegisteredHref: `${base}/consulente/login`,
    notRegisteredHref: `${base}/consulente/cadastro`,
  },
  {
    id: "corrente",
    eyebrow: "Filhos da Corrente",
    title: "Cuidado, formação e conhecimento no mesmo caminho.",
    description:
      "Além de orientações e agendamentos, o espaço conecta Escuta em Harmonia, Cursos em Harmonia, Acervo Vivo e consultas liberadas conforme as funções cadastradas na Base Única.",
    alreadyRegisteredHref: `${base}/filho-da-corrente/login`,
    notRegisteredHref: `${base}/filho-da-corrente/primeiro-acesso`,
  },
];

export default function AtendimentoEmHarmoniaPublicPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu do Atendimento em Harmonia"
        showSupport={false}
      />

      <section
        id="inicio"
        className="mx-auto grid max-w-6xl scroll-mt-48 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-8"
      >
        <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Atendimento em Harmonia
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Informação, cuidado, formação e conhecimento em um mesmo caminho.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#EEF7EA] sm:text-lg sm:leading-8">
            O Atendimento em Harmonia começou organizando orientações e agendamentos e evoluiu para conectar também Escuta em Harmonia, Cursos em Harmonia e o Acervo Vivo. A tecnologia apoia o que precisa ser lembrado, acompanhado e encontrado, sem substituir o contato humano do Tucxa.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
          {stages.map((stage) => (
            <article
              key={stage.title}
              className="rounded-[1.35rem] bg-white p-3.5 shadow ring-1 ring-[#123D2C]/10 sm:p-5"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43] sm:text-xs sm:tracking-[0.2em]">
                {stage.title}
              </p>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-700 sm:mt-2 sm:text-base sm:leading-6">
                {stage.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="recursos"
        className="mx-auto max-w-6xl scroll-mt-48 px-4 pb-6 sm:px-6 lg:px-8"
      >
        <div className="rounded-[1.75rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">
            O que já faz parte do Atendimento em Harmonia
          </p>
          <h2 className="mt-1.5 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">
            Toque em uma opção para conhecer sem precisar percorrer uma página longa.
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 sm:text-base">
            Alguns acessos dependem do tipo de cadastro e das funções registradas para a pessoa.
          </p>

          <div className="mt-4">
            <TucxaInfoPopupGrid
              items={features}
              ariaLabel="Funcionalidades do Atendimento em Harmonia"
              columns={3}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {audienceCards.map((card) => (
            <article
              key={card.id}
              id={card.id}
              className="scroll-mt-48 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7"
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">
                {card.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
                {card.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                {card.description}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link
                  href={card.alreadyRegisteredHref}
                  className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2F6B43] sm:text-base"
                >
                  Já tenho cadastro
                </Link>
                <Link
                  href={card.notRegisteredHref}
                  className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 sm:text-base"
                >
                  Ainda não tenho cadastro
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
