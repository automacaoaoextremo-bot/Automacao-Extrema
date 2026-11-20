import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const outcomes = [
  {
    feature: "Knowledge Graph",
    why: "Mostra pré-requisitos, relações e dependências entre competências.",
    outcome: "Você entende o que estudar agora e o que precisa vir antes.",
  },
  {
    feature: "Trilha por evidências",
    why: "O próximo passo depende do que já foi demonstrado, não apenas do que foi visto em aula.",
    outcome: "Menos estudo aleatório e mais clareza sobre a evolução.",
  },
  {
    feature: "Gate de aprendizagem",
    why: "Cada nível pede teoria, prática, explicação e evidência.",
    outcome: "Você avança com mais segurança de que realmente aprendeu.",
  },
];

export default function StudyAgentPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#00334E] text-white">
        <section className="px-4 py-8 sm:py-12">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#31C16B] sm:text-sm">
                Automação Extrema · Educação
              </p>

              <Image
                src="/studyagent/logo-studyagent.svg"
                alt="StudyAgent"
                width={760}
                height={210}
                className="mt-5 w-full max-w-xl rounded-3xl bg-white p-4 shadow-2xl"
                priority
              />

              <h1 className="mt-7 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                Pare de acumular conteúdo. Transforme estudo em competência demonstrada.
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
                O StudyAgent organiza conhecimentos em um grafo, recomenda o próximo passo, apoia prática e avaliação
                e mantém a evidência visível antes de liberar a progressão.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/solucoes/studyagent/residencia-ia"
                  className="rounded-xl bg-[#31C16B] px-6 py-4 text-center font-black text-[#00334E] hover:bg-[#4ce184]"
                >
                  Abrir Residência IA
                </Link>
                <Link
                  href="/#solucoes"
                  className="rounded-xl border border-white/20 px-6 py-4 text-center font-black text-white hover:bg-white/10"
                >
                  Voltar para soluções
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl bg-white p-5 text-slate-950 shadow-2xl sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8CC] sm:text-sm">
                O que muda para quem estuda
              </p>
              <h2 className="mt-3 text-2xl font-black text-[#00334E]">
                A tecnologia aparece depois da necessidade real.
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                A base fica compartilhável, o caminho fica visível e cada etapa precisa produzir algo que possa ser
                explicado, praticado ou comprovado.
              </p>

              <div className="mt-5 space-y-3">
                {outcomes.map((item) => (
                  <article key={item.feature} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-black text-[#00334E]">{item.feature}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.why}</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#007C9B]">{item.outcome}</p>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#00263A] px-4 py-10">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
            <Card
              title="Base compartilhável"
              text="Competências, pré-requisitos, relações, fontes e evidências podem ser consultados sem depender do chat."
            />
            <Card
              title="Trilha guiada pelo grafo"
              text="A recomendação considera dependências e o que já foi demonstrado para sugerir próximos estudos."
            />
            <Card
              title="IA sem aprisionar o conhecimento"
              text="O aluno pode usar o tutor integrado ou levar o contexto estruturado para o assistente de IA que já utiliza."
            />
          </div>
        </section>
      </main>
    </>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-3 leading-7 text-white/75">{text}</p>
    </article>
  );
}
