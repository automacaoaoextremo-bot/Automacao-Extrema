import Link from "next/link";
import { StudyAgentKnowledgeMap } from "@/components/education/studyagent-knowledge-map";
import { STUDYAGENT_PROGRAM } from "@/lib/education/studyagent-residencia-ia";

export default function StudyAgentResidenciaIAPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-[#00334E] px-4 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/solucoes/studyagent" className="text-sm font-bold text-[#31C16B] hover:underline">
              ← StudyAgent
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/80">
              {STUDYAGENT_PROGRAM.founderLabel}
            </span>
          </div>
          <p className="mt-7 text-sm font-black uppercase tracking-[0.22em] text-[#31C16B]">{STUDYAGENT_PROGRAM.name}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
            Do conteúdo estudado para a competência demonstrada.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/80">{STUDYAGENT_PROGRAM.description}</p>
          <p className="mt-4 text-sm font-semibold text-white/60">Base inicial: {STUDYAGENT_PROGRAM.sourceLabel}</p>
        </div>
      </section>

      <section className="px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <StudyAgentKnowledgeMap />
        </div>
      </section>
    </main>
  );
}
