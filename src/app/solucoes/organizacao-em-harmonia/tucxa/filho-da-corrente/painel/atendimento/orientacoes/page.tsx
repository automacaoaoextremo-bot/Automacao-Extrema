import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { atendimentoTopics, topicAnchorBySlug } from "@/lib/organizacao-em-harmonia/filho-atendimento-content";

const filhoPanelBase = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const atendimentoHref = `${filhoPanelBase}/atendimento`;

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
const orientacoesHref = `${atendimentoHref}/orientacoes`;

const navItems = [
  { label: "Início", href: orientacoesHref, variant: "primary" as const },
  { label: "Organização", href: "#organizacao", variant: "secondary" as const },
  { label: "Antes de Chegar", href: "#antes-de-chegar", variant: "secondary" as const },
  { label: "Postura", href: "#postura", variant: "secondary" as const },
  { label: "Cambonos", href: "#cambonos", variant: "secondary" as const },
  { label: "Cuidados", href: "#cuidados", variant: "secondary" as const },
  { label: "Compromisso", href: "#compromisso", variant: "secondary" as const },
  { label: "Atendimento em Harmonia", href: atendimentoHref, variant: "secondary" as const },
  filhoSupportAction,
  filhoSignOutAction,
];

export default function OrientacoesAtendimentoPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Orientações práticas" actions={navItems} showSupport={false} />

      <section id="inicio" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Orientações práticas do Tucxa</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Consulta rápida para servir com segurança.</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">
            Cada card transforma regra em orientação prática: o que fazer, por que isso existe e como essa postura protege a harmonia da corrente.
          </p>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {atendimentoTopics.map((topic) => (
              <article key={topic.slug} id={topicAnchorBySlug[topic.slug] ?? topic.slug} className="scroll-mt-44 rounded-[1.75rem] bg-[#F7FAF2] p-5 ring-1 ring-[#123D2C]/10 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">{topic.eyebrow}</p>
                <h2 className="mt-2 text-xl font-black text-[#123D2C]">{topic.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{topic.summary}</p>
                <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">{topic.benefit}</p>
                <Link href={`${atendimentoHref}/${topic.slug}`} className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">
                  Abrir orientação
                </Link>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
