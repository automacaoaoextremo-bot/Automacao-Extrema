import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StudyAgentKnowledgeMap } from "@/components/education/studyagent-knowledge-map";
import { STUDYAGENT_PROGRAM } from "@/lib/education/studyagent-residencia-ia";

export default function StudyAgentResidenciaIAPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="bg-[#00334E] px-4 py-6 text-white sm:py-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <Link
                href="/solucoes/studyagent"
                className="inline-flex text-sm font-bold text-[#31C16B] hover:underline"
              >
                ← StudyAgent
              </Link>

              <Image
                src="/studyagent/logo-residencia-ia.svg"
                alt="Residência IA — Cliente fundador do StudyAgent"
                width={650}
                height={190}
                className="mt-4 w-full max-w-lg rounded-3xl bg-white p-4 shadow-xl"
                priority
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#31C16B] sm:text-sm">
                {STUDYAGENT_PROGRAM.founderLabel}
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                Do conteúdo estudado para a competência demonstrada.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/80 sm:text-lg">
                {STUDYAGENT_PROGRAM.description}
              </p>
              <p className="mt-3 text-xs font-semibold text-white/60 sm:text-sm">
                Base inicial: {STUDYAGENT_PROGRAM.sourceLabel}
              </p>
            </div>
          </div>
        </section>

        <section className="px-3 py-4 sm:px-4 sm:py-6">
          <div className="mx-auto max-w-7xl">
            <StudyAgentKnowledgeMap />
          </div>
        </section>
      </main>
    </>
  );
}
