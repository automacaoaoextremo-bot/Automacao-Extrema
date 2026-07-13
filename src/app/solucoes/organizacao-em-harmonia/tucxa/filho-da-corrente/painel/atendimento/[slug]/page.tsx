import Link from "next/link";
import { notFound } from "next/navigation";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { atendimentoTopics, findAtendimentoTopic } from "@/lib/organizacao-em-harmonia/filho-atendimento-content";

export function generateStaticParams() {
  return atendimentoTopics.map((topic) => ({ slug: topic.slug }));
}

export default async function AtendimentoTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = findAtendimentoTopic(slug);

  if (!topic) notFound();

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel={`Atendimento em Harmonia - ${topic.title}`} />

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <article className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">{topic.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">{topic.title}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">{topic.summary}</p>
          <p className="mt-4 rounded-[1.5rem] bg-[#E9F2E7] p-4 text-sm font-black leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">{topic.benefit}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Fonte de referência: {topic.sourceLabel}</p>

          <div className="mt-6 grid gap-4">
            {topic.sections.map((section) => (
              <section key={section.title} className="rounded-[1.5rem] bg-[#F7FAF2] p-5 ring-1 ring-[#123D2C]/10">
                <h2 className="text-xl font-black text-[#123D2C]">{section.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{section.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-6 rounded-[1.5rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
            <h2 className="text-xl font-black text-[#123D2C]">Checklist rápido</h2>
            <ul className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
              {topic.checklist.map((item) => (
                <li key={item} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">✓ {item}</li>
              ))}
            </ul>
          </section>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento" className="rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">Voltar para Atendimento</Link>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atualizar-dados" className="rounded-2xl bg-white px-5 py-3 font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Atualizar cadastro</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
