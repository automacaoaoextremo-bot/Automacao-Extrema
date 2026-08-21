import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import {
  TucxaInfoPopupGrid,
  type TucxaInfoPopupItem,
} from "@/components/organizacao-em-harmonia/tucxa-info-popup-grid";

const base = "/solucoes/organizacao-em-harmonia/tucxa";

const actions = [
  { label: "Início", href: "#inicio", variant: "primary" as const },
  {
    label: "Voltar",
    href: `${base}?abrir=atendimento-em-harmonia#modulos`,
    variant: "secondary" as const,
  },
  {
    label: "Ajuda",
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
    text: "Retornos, Escuta em Harmonia, Cursos em Harmonia e Acervo Vivo ajudam o cuidado, a formação e o conhecimento a continuarem além do atendimento.",
  },
];

const pageAccesses: TucxaInfoPopupItem[] = [
  {
    id: "fluxo-atendimento",
    eyebrow: "Antes, durante e depois",
    title: "Fluxo de Atendimento",
    summary: "Entenda como o Atendimento em Harmonia acompanha cada etapa.",
    description:
      "O Atendimento em Harmonia organiza informações e caminhos para apoiar a pessoa antes, durante e depois do atendimento.",
    details: stages,
  },
  {
    id: "acessos",
    eyebrow: "Escolha seu caminho",
    title: "Acessos",
    summary: "Entre pela opção que corresponde à sua relação com o Tucxa.",
    description:
      "Escolha abaixo se você é Filho da Corrente ou Consulente / Filho de Fora. Na página seguinte estarão as opções para quem já possui cadastro e para quem ainda precisa se cadastrar.",
    links: [
      {
        label: "Sou Consulente / Filho de Fora",
        href: `${base}/consulente`,
        variant: "secondary",
      },
      {
        label: "Sou Filho da Corrente",
        href: `${base}/filho-da-corrente`,
        variant: "primary",
      },
    ],
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
        className="mx-auto max-w-5xl scroll-mt-48 px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
      >
        <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Acolhimento, orientação e formação
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Atendimento em Harmonia
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            O Atendimento em Harmonia reúne o que ajuda Filhos de Fora/Consulentes e Filhos da Corrente antes, durante e depois do atendimento.
          </p>
        </div>

        <div className="mt-4 rounded-[1.75rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Escolha o que deseja consultar
          </p>
          <div className="mt-3">
            <TucxaInfoPopupGrid
              items={pageAccesses}
              ariaLabel="Fluxo e acessos do Atendimento em Harmonia"
              columns={2}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
