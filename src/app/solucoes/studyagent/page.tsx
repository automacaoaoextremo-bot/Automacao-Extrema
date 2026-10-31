import Link from "next/link";

export default function StudyAgentPage() {
  return (
    <main className="min-h-screen bg-[#00334E] text-white">
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#31C16B]">Automação Extrema · Educação</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight sm:text-6xl">StudyAgent</h1>
          <p className="mt-5 max-w-3xl text-xl leading-8 text-white/80">
            Plataforma de aprendizagem orientada por competências: organiza a base de conhecimento em um grafo,
            recomenda trilhas, propõe prática, apoia avaliações e registra evidências antes de liberar o próximo nível.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/solucoes/studyagent/residencia-ia"
              className="rounded-xl bg-[#31C16B] px-6 py-4 font-black text-[#00334E] hover:bg-[#4ce184]"
            >
              Abrir cliente fundador · Residência IA
            </Link>
            <Link
              href="/#solucoes"
              className="rounded-xl border border-white/20 px-6 py-4 font-bold text-white hover:bg-white/10"
            >
              Voltar para soluções
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 text-slate-950">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-3">
            <Card
              title="Base compartilhável"
              text="Competências, relações, pré-requisitos e evidências ficam visíveis; o conhecimento não precisa ficar escondido dentro do agente."
            />
            <Card
              title="Trilha guiada pelo grafo"
              text="O próximo estudo pode ser calculado a partir das competências já demonstradas e das dependências ainda pendentes."
            />
            <Card
              title="IA com evidência"
              text="O tutor explica, pratica e dá feedback, mas a aprovação de nível continua vinculada a critérios e evidências verificáveis."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#00334E]">{title}</h2>
      <p className="mt-3 leading-7 text-slate-700">{text}</p>
    </article>
  );
}
