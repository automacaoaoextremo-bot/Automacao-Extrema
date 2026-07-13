import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { atendimentoTopics } from "@/lib/organizacao-em-harmonia/filho-atendimento-content";

export default function AtendimentoEmHarmoniaPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Atendimento em Harmonia" />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Atendimento em Harmonia</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Orientações práticas do Tucxa</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">
            Os documentos do Tucxa foram organizados em cards objetivos para consulta rápida. Cada orientação mostra o que fazer, por que aquilo existe e como isso ajuda a manter ordem, respeito e harmonia nos trabalhos.
          </p>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {atendimentoTopics.map((topic) => (
              <Link key={topic.slug} href={`/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/${topic.slug}`} className="rounded-[1.75rem] bg-[#F7FAF2] p-5 ring-1 ring-[#123D2C]/10 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">{topic.eyebrow}</p>
                <h2 className="mt-2 text-xl font-black text-[#123D2C]">{topic.title}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{topic.summary}</p>
                <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">{topic.benefit}</p>
                <span className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Abrir orientação</span>
              </Link>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
