import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import {
  TucxaInfoPopupGrid,
  type TucxaInfoPopupItem,
} from "@/components/organizacao-em-harmonia/tucxa-info-popup-grid";

const base = "/solucoes/organizacao-em-harmonia/tucxa";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  { label: "Voltar", href: `${base}?abrir=atendimento-em-harmonia#modulos`, variant: "secondary" as const },
  { label: "Ajuda", href: "#duvidas", variant: "secondary" as const, action: "supportWhatsapp" as const },
];

const stages = [
  { title: "Antes", text: "Orientações, calendário, preparo, acolhimento e materiais de estudo ajudam cada pessoa a chegar mais segura sobre o próximo passo." },
  { title: "Durante", text: "Agendamentos, consultas autorizadas e informações ligadas à função de cada pessoa apoiam a organização sem substituir o cuidado humano." },
  { title: "Depois", text: "Retornos, Escuta em Harmonia, Cursos em Harmonia e Acervo Vivo ajudam o cuidado, a formação e o conhecimento a continuarem além do atendimento." },
];

const accessDetails: TucxaInfoPopupItem[] = [
  {
    id: "orientacoes-praticas",
    eyebrow: "Antes do atendimento",
    title: "Orientações práticas",
    summary: "Reúne orientações sobre horários, chegada, silêncio, circulação, preparo e outras informações práticas.",
    description: "Reúne orientações sobre horários, chegada, silêncio, circulação, preparo e outras informações práticas que ajudam Filhos de Fora/Consulentes e Filhos da Corrente a entender o próximo passo.",
    highlights: ["Informações em linguagem simples.", "Consulta pelo celular.", "Menos dependência de mensagens antigas."],
  },
  {
    id: "acolhimento-agendamentos",
    eyebrow: "Organização do atendimento",
    title: "Acolhimento e agendamentos",
    summary: "Datas disponíveis, solicitações e orientações de atendimento.",
    description: "Ajuda a consultar datas disponíveis, registrar solicitações e acompanhar orientações de atendimento ou presença conforme o perfil e as regras do Tucxa.",
    highlights: ["Agendamento de Filhos de Fora/Consulentes.", "Acolhimento e presença dos Filhos da Corrente.", "Regras e datas aplicadas pelo sistema."],
  },
  {
    id: "consulta-agendamentos",
    eyebrow: "Acesso conforme a função",
    title: "Consulta de agendamentos",
    summary: "Atendimentos previstos e históricos conforme as permissões de cada função.",
    description: "A consulta reúne os atendimentos previstos e históricos necessários para a operação. O que cada pessoa visualiza ou pode alterar depende das funções e vínculos registrados na Base Única.",
    availability: "Disponível somente para funções autorizadas. As permissões preservam o acesso mínimo necessário para cada responsabilidade.",
  },
  {
    id: "escuta-em-harmonia",
    eyebrow: "Ouvir para melhorar",
    title: "Escuta em Harmonia",
    summary: "Um canal organizado para dúvida, sugestão ou preocupação.",
    description: "Permite registrar uma dúvida, sugestão ou preocupação para a Diretoria, preservando o contexto e o acompanhamento do que foi compartilhado sem depender de mensagens dispersas.",
    availability: "Voltado aos Filhos da Corrente e aos Responsáveis autorizados pela gestão.",
  },
  {
    id: "cursos-em-harmonia",
    eyebrow: "Formação e acompanhamento",
    title: "Cursos em Harmonia",
    summary: "Organização dos cursos, aulas, professores, convites, materiais e presença.",
    description: "Apoia a organização dos cursos do Tucxa, incluindo criação de curso e aulas, associação de professores, convites, materiais, códigos de presença, chamada e integração com a Agenda Viva.",
    availability: "As funções de gestão, professor e aluno visualizam somente as ações correspondentes ao seu papel.",
    highlights: ["Curso Preparatório e outros cursos.", "Professores, alunos e convites.", "Presença e chamada.", "Materiais e integração com Agenda Viva."],
  },
  {
    id: "acervo-vivo",
    eyebrow: "Biblioteca do Tucxa",
    title: "Acervo Vivo",
    summary: "Livros, trilhas, reservas, Folha Verde e memória da Casa em um único ponto.",
    description: "O Acervo Vivo conecta a Biblioteca do Tucxa ao Clube do Livro, Grupo de Estudos e Curso Preparatório. A pessoa pode pesquisar livros, descobrir trilhas, acompanhar disponibilidade e acessar conteúdos sem precisar entrar antes.",
    href: `${base}/acervo-vivo`,
    ctaLabel: "CLIQUE PARA CONHECER",
    highlights: ["Catálogo de livros e exemplares.", "Trilhas de estudo.", "Reservas e acompanhamento dos próprios empréstimos.", "Conteúdos como Folha Verde, manuais, vídeos e podcasts conforme disponibilidade."],
  },
];

const pageAccesses: TucxaInfoPopupItem[] = [
  {
    id: "fluxo-atendimento",
    eyebrow: "Antes, durante e depois",
    title: "Fluxo de Atendimento",
    summary: "Entenda como o Atendimento em Harmonia acompanha cada etapa.",
    description: "O Atendimento em Harmonia organiza informações e caminhos para apoiar a pessoa antes, durante e depois do atendimento.",
    details: stages,
  },
  {
    id: "acessos",
    eyebrow: "Escolha seu caminho",
    title: "Acessos",
    summary: "Toque em uma opção para conhecer o que ela reúne e como funciona.",
    description: "Orientações, acolhimento, consultas autorizadas, escuta, cursos e o Acervo Vivo ficam reunidos aqui para reduzir a procura por mensagens antigas.",
    subItems: accessDetails,
  },
];

export default function AtendimentoEmHarmoniaPublicPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={actions} navLabel="Menu do Atendimento em Harmonia" showSupport={false} />
      <section id="inicio" className="mx-auto max-w-5xl scroll-mt-48 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Acolhimento, orientação e formação</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">Atendimento em Harmonia</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">O Atendimento em Harmonia reúne o que ajuda Filhos de Fora/Consulentes e Filhos da Corrente antes, durante e depois do atendimento.</p>
        </div>
        <div className="mt-4 rounded-[1.75rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Escolha o que deseja consultar</p>
          <div className="mt-3"><TucxaInfoPopupGrid items={pageAccesses} ariaLabel="Fluxo e acessos do Atendimento em Harmonia" columns={2} /></div>
        </div>
      </section>
    </main>
  );
}
