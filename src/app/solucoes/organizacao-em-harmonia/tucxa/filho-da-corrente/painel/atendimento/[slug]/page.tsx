import { notFound } from "next/navigation";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { atendimentoTopics, findAtendimentoTopic, topicNavBySlug } from "@/lib/organizacao-em-harmonia/filho-atendimento-content";

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

export function generateStaticParams() {
  return atendimentoTopics.map((topic) => ({ slug: topic.slug }));
}

export default async function AtendimentoTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = findAtendimentoTopic(slug);

  if (!topic) notFound();

  const nav = topicNavBySlug[slug] ?? {
    firstSectionLabel: "Por que existe",
    firstSectionAnchor: "por-que-existe",
    secondSectionLabel: "O que fazer",
    secondSectionAnchor: "o-que-fazer",
  };

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel={`Atendimento em Harmonia - ${topic.title}`}
        showSupport={false}
        actions={[
          { label: "Início", href: `${atendimentoHref}/${topic.slug}`, variant: "primary" },
          { label: nav.firstSectionLabel, href: `#${nav.firstSectionAnchor}`, variant: "secondary" },
          { label: nav.secondSectionLabel, href: `#${nav.secondSectionAnchor}`, variant: "secondary" },
          { label: "Checklist", href: "#checklist", variant: "secondary" },
          { label: "Voltar", href: orientacoesHref, variant: "secondary" },
          { label: "Atendimento em Harmonia", href: atendimentoHref, variant: "secondary" },
          filhoSupportAction,
          filhoSignOutAction,
        ]}
      />

      <section id="inicio" className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <article className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">{topic.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">{topic.title}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">{topic.summary}</p>
          <p className="mt-4 rounded-[1.5rem] bg-[#E9F2E7] p-4 text-sm font-black leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">{topic.benefit}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Fonte de referência: {topic.sourceLabel}</p>

          <div className="mt-6 grid gap-4">
            {topic.sections.map((section, index) => (
              <section
                key={section.title}
                id={index === 0 ? nav.firstSectionAnchor : nav.secondSectionAnchor}
                className="scroll-mt-44 rounded-[1.5rem] bg-[#F7FAF2] p-5 ring-1 ring-[#123D2C]/10"
              >
                <h2 className="text-xl font-black text-[#123D2C]">{section.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{section.body}</p>
              </section>
            ))}
          </div>

          <section id="checklist" className="mt-6 scroll-mt-44 rounded-[1.5rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
            <h2 className="text-xl font-black text-[#123D2C]">Checklist rápido</h2>
            <ul className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
              {topic.checklist.map((item) => (
                <li key={item} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">✓ {item}</li>
              ))}
            </ul>
          </section>
        </article>
      </section>
    </main>
  );
}
