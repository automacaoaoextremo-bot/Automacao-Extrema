import Link from "next/link";
import { ConsulentePanelHeader, consulenteSignOutAction, consulenteSupportAction } from "@/components/organizacao-em-harmonia/consulente-panel-header";

const panelBase = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";
const pageHref = `${panelBase}/atendimento`;

const cards = [
  {
    id: "orientacoes",
    eyebrow: "Orientações práticas do Tucxa",
    title: "Tudo que ajuda você a chegar preparado e seguro.",
    description: "Dias, horários, senha, ficha individual, silêncio, circulação, retorno, Transformação e sigilo reunidos em linguagem simples.",
    cta: "Abrir orientações",
    href: `${pageHref}/orientacoes`,
  },
  {
    id: "agendamentos",
    eyebrow: "Acolhimento e atendimento",
    title: "Consulte datas e organize sua solicitação.",
    description: "Abra o calendário de atendimento para verificar dias disponíveis, entidades, orientações e registrar sua solicitação quando o fluxo estiver habilitado.",
    cta: "Abrir atendimento",
    href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/agendar",
  },
];

export default function AtendimentoEmHarmoniaConsulentePage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <ConsulentePanelHeader
        navLabel="Atendimento em Harmonia do Filho de Fora/Consulente"
        showSupport={false}
        actions={[
          { label: "Atendimento em Harmonia", href: pageHref, variant: "primary" },
          { label: "Orientações", href: "#orientacoes", variant: "secondary" },
          { label: "Acolhimento e Atendimento", href: "#agendamentos", variant: "secondary" },
          consulenteSupportAction,
          consulenteSignOutAction,
        ]}
      />

      <section id="inicio" className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Atendimento em Harmonia</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Cuidar bem começa antes do atendimento.</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
              Este módulo organiza as informações que o Filho de Fora/Consulente precisa conhecer para chegar, aguardar, receber seu atendimento e seguir corretamente uma orientação de retorno ou Transformação.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {cards.map((card) => (
              <article key={card.href} id={card.id} className="scroll-mt-44 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-1 hover:shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">{card.eyebrow}</p>
                <h2 className="mt-2 text-xl font-black leading-tight text-[#123D2C]">{card.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
                <Link href={card.href} className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">{card.cta}</Link>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
