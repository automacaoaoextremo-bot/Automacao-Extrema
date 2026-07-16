import Link from "next/link";
import {
  FilhoCorrentePanelHeader,
  filhoPanelBase,
  filhoSignOutAction,
  filhoSupportAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";

const atendimentoHref = `${filhoPanelBase}/atendimento`;
const agendamentosHref = `${atendimentoHref}/agendamentos`;

const filhosForaGroups = [
  {
    slug: "segunda-feira",
    label: "Grupo de Segunda-Feira",
    color: "bg-[#F8D7D4] text-[#5C211E] ring-[#D9827C]",
    description: "Atendimento destinado aos Filhos Consulentes/Filhos de Fora, com acolhimento por ordem e entidade disponível.",
  },
  {
    slug: "terca-feira",
    label: "Grupo de Terça-feira",
    color: "bg-[#D7EDF8] text-[#17445B] ring-[#6AAECE]",
    description: "Fluxo semelhante ao de segunda, mantendo ordem de chegada, fichas individuais e orientação da recepção.",
  },
  {
    slug: "tratamento-espiritual",
    label: "Tratamento espiritual",
    color: "bg-[#DDEFD7] text-[#234D2C] ring-[#7BB77D]",
    description: "Atendimento de quarta-feira, normalmente encaminhado por entidade ou coordenação, com registro mais cuidadoso.",
  },
];

const filhosCorrenteGroups = [
  {
    slug: "grupo-1",
    label: "Grupo 1",
    color: "bg-[#DDEFD7] text-[#173D25] ring-[#2F6B43]",
    description: "Primeira e terceira quinta-feira do mês, conforme calendário anual e organização da casa.",
  },
  {
    slug: "grupo-2",
    label: "Grupo 2",
    color: "bg-[#CBE7F7] text-[#0F4E6A] ring-[#2C8FBE]",
    description: "Segunda e quarta quinta-feira do mês, respeitando grupo, presença e encaminhamentos da casa.",
  },
];

export default function AgendamentosAtendimentoPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Agendamentos do Atendimento"
        showSupport={false}
        actions={[
          { label: "Início", href: agendamentosHref, variant: "primary" },
          { label: "Atendimento Filhos de Fora", href: "#filhos-de-fora", variant: "secondary" },
          { label: "Atendimento Filhos da Corrente", href: "#filhos-da-corrente", variant: "secondary" },
          { label: "Atendimento em Harmonia", href: atendimentoHref, variant: "secondary" },
          filhoSupportAction,
          filhoSignOutAction,
        ]}
      />

      <section id="inicio" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Acolhimento e agendamentos</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Fila clara, entidade certa e cuidado preservado.</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[#EEF7EA]">
            A recepção pode conferir entidades ativas, próximos dias de atendimento, vagas e registros. Os demais Filhos da Corrente visualizam a organização para apoiar sem gerar retrabalho.
          </p>
        </div>

        <section id="filhos-de-fora" className="mt-5 scroll-mt-44 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Atendimento Filhos de Fora/Consulentes</p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C]">Segunda, terça e tratamento espiritual.</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            Nos trabalhos de atendimento, os consulentes recebem orientação por ordem e fichas individuais. Para quarta-feira, o encaminhamento precisa preservar nome, idade, doença/motivo e entidade que indicou o atendimento.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {filhosForaGroups.map((group) => (
              <Link key={group.slug} href={`${agendamentosHref}/${group.slug}`} className={`rounded-[1.5rem] p-4 font-black shadow-sm ring-2 transition hover:-translate-y-1 hover:shadow-xl ${group.color}`}>
                <span className="block text-lg">{group.label}</span>
                <span className="mt-2 block text-sm font-semibold leading-6 opacity-90">{group.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="filhos-da-corrente" className="mt-5 scroll-mt-44 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Atendimento Filhos da Corrente</p>
          <h2 className="mt-2 text-2xl font-black text-[#123D2C]">Quintas-feiras com Grupo 1 e Grupo 2.</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            O atendimento dos Filhos da Corrente deve respeitar o grupo, a ordem de chegada e as orientações das entidades. A visualização por grupo facilita busca por nome, entidade e próximos dias.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filhosCorrenteGroups.map((group) => (
              <Link key={group.slug} href={`${agendamentosHref}/${group.slug}`} className={`rounded-[1.5rem] p-4 font-black shadow-sm ring-2 transition hover:-translate-y-1 hover:shadow-xl ${group.color}`}>
                <span className="block text-lg">{group.label}</span>
                <span className="mt-2 block text-sm font-semibold leading-6 opacity-90">{group.description}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
