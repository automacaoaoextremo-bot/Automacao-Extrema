import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { ReceptionAppointmentsCard } from "@/components/organizacao-em-harmonia/reception-appointments-card";

const filhoPanelBase = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const pageHref = `${filhoPanelBase}/atendimento`;

const filhoSupportAction = {
  label: "Dúvidas?",
  href: "#duvidas",
  variant: "secondary" as const,
  action: "supportWhatsapp" as const,
};

const filhoSignOutAction = {
  label: "Sair",
  href: "#sair",
  variant: "secondary" as const,
  action: "signOutFilhoCorrente" as const,
};

const cards = [
  {
    id: "orientacoes",
    eyebrow: "Orientações práticas do Tucxa",
    title: "Tudo que ajuda você a chegar preparado e seguro.",
    description:
      "Regulamento, preparo, silêncio, cambonos, presença e acolhimento reunidos em linguagem simples para consultar antes, durante ou depois dos trabalhos.",
    cta: "Abrir orientações",
    href: `${pageHref}/orientacoes`,
  },
  {
    id: "agendamentos",
    eyebrow: "Acolhimento e agendamentos",
    title: "Recepção com ordem, cuidado e continuidade.",
    description:
      "Confira grupos de atendimento, entidades ativas, vagas disponíveis e registros da recepção, sempre preservando a sequência e o cuidado humano.",
    cta: "Abrir agendamentos",
    href: `${pageHref}/agendamentos`,
  },
];

export default function AtendimentoEmHarmoniaPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Atendimento em Harmonia"
        showSupport={false}
        actions={[
          { label: "Atendimento em Harmonia", href: pageHref, variant: "primary" },
          { label: "Voltar", href: `${pageHref}/orientacoes`, variant: "secondary" },
          { label: "Orientações", href: "#orientacoes", variant: "secondary" },
          { label: "Acolhimento e Agendamentos", href: "#agendamentos", variant: "secondary" },
          filhoSupportAction,
          filhoSignOutAction,
        ]}
      />

      <section id="inicio" className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Atendimento em Harmonia</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Cuidar bem começa antes do atendimento.</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
              Este módulo organiza o que precisa ser lembrado, registrado e encaminhado para que a recepção, os cambonos e a corrente trabalhem com mais clareza, sem perder o cuidado humano do Tucxa.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {cards.map((card) => (
              <article key={card.href} id={card.id} className="scroll-mt-44 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-1 hover:shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">{card.eyebrow}</p>
                <h2 className="mt-2 text-xl font-black leading-tight text-[#123D2C]">{card.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{card.description}</p>
                <Link href={card.href} className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">
                  {card.cta}
                </Link>
              </article>
            ))}
            <ReceptionAppointmentsCard />
          </section>
        </div>
      </section>
    </main>
  );
}
