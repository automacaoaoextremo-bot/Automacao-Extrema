"use client";

import { useEffect, useMemo, useState } from "react";
import { STUDYAGENT_COMPETENCIES, STUDYAGENT_LEVELS, STUDYAGENT_PROGRAM_ID, type StudyAgentCompetency } from "@/lib/education/studyagent-residencia-ia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ModalKey = "porque" | "como" | "conteudos" | null;
const ITEMS_PER_PAGE = 5;

export function StudyAgentResidenciaPublic() {
  const [modal, setModal] = useState<ModalKey>(null);
  const [page, setPage] = useState(0);
  const [competencies, setCompetencies] = useState<StudyAgentCompetency[]>(STUDYAGENT_COMPETENCIES);
  const competencyPages = Math.ceil(competencies.length / ITEMS_PER_PAGE);
  const visibleCompetencies = useMemo(
    () => competencies.slice(page * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE + ITEMS_PER_PAGE),
    [competencies, page],
  );

  useEffect(() => {
    let active = true;
    void supabaseBrowser
      .from("ae_study_competencies")
      .select("code, title, summary, category, why_it_matters, evidence_suggestion, reflection_sources, sort_order")
      .eq("program_id", STUDYAGENT_PROGRAM_ID)
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (!active || !data?.length) return;
        setCompetencies(
          data.map((item) => ({
            id: item.code,
            title: item.title,
            summary: item.summary,
            category: item.category,
            whyItMatters: item.why_it_matters,
            prerequisites: [],
            reflectionSources: item.reflection_sources ?? [],
            evidence: item.evidence_suggestion,
            studyHints: [],
          })),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  function openModal(next: Exclude<ModalKey, null>) {
    setPage(0);
    setModal(next);
  }

  return (
    <>
      <main id="inicio" className="min-h-[calc(100svh-7rem)] bg-[#f4fbfd] text-slate-900">
        <section className="mx-auto max-w-3xl px-3 py-3 sm:px-5 sm:py-6">
          <div className="overflow-hidden rounded-[1.7rem] bg-[#00334E] text-white shadow-xl sm:rounded-[2.25rem]">
            <div className="p-4 sm:p-7">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#31C16B] sm:text-xs">
                StudyAgent · Residência IA
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">
                Do conteúdo estudado para a competência demonstrada.
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/80 sm:text-lg sm:leading-8">
                Uma trilha para organizar o que estudar, enxergar relações entre conhecimentos e registrar evidências.
              </p>
            </div>

            <div className="space-y-2 bg-[#064862] p-3 sm:p-5">
              <PublicAction title="Por que usar" subtitle="TOQUE PARA VER" onClick={() => openModal("porque")} />
              <PublicAction title="Como funciona" subtitle="TOQUE PARA VER" onClick={() => openModal("como")} />
              <PublicAction title="O que você vai estudar" subtitle="TOQUE PARA VER" onClick={() => openModal("conteudos")} />
            </div>
          </div>
        </section>
      </main>

      {modal ? (
        <PublicModal
          modal={modal}
          page={page}
          pages={competencyPages}
          competencies={visibleCompetencies}
          onPage={setPage}
          onClose={() => setModal(null)}
        />
      ) : null}
    </>
  );
}

function PublicAction({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-white/95 px-4 py-3.5 text-center text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
    >
      <span className="block text-base font-black">{title}</span>
      <span className="mt-0.5 block text-[0.58rem] font-black uppercase tracking-[0.16em] text-[#007C9B]">{subtitle}</span>
    </button>
  );
}

function PublicModal({
  modal,
  page,
  pages,
  competencies,
  onPage,
  onClose,
}: {
  modal: Exclude<ModalKey, null>;
  page: number;
  pages: number;
  competencies: StudyAgentCompetency[];
  onPage: (page: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 pt-3 backdrop-blur-sm sm:p-4 sm:pt-8"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <article className="max-h-[calc(100svh-1.5rem)] w-full overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8CC]">Residência IA</p>
            <h2 className="mt-1 text-2xl font-black text-[#00334E]">
              {modal === "porque" ? "Por que usar o StudyAgent?" : modal === "como" ? "Como funciona?" : "O que você vai estudar?"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-200"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {modal === "porque" ? (
          <div className="mt-5 space-y-3">
            <InfoCard title="Enxergar conexões" text="O Knowledge Graph mostra pré-requisitos e relações para o estudo não virar uma sequência aleatória de conteúdos." />
            <InfoCard title="Retomar de onde parou" text="Seu cadastro guarda progresso, consultas e uma base pessoal de conhecimento para continuar o estudo depois." />
            <InfoCard title="Transformar estudo em evidência" text="A trilha conecta teoria, prática, explicação e evidências antes de considerar uma etapa realmente aprendida." />
          </div>
        ) : null}

        {modal === "como" ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["1", "Cadastre-se", "Crie seu perfil para que progresso e histórico fiquem associados a você."],
              ["2", "Escolha o próximo tema", "O grafo mostra dependências e sugere conhecimentos liberados."],
              ["3", "Estude por nível", "Cada competência possui objetivo, prática, avaliação e evidência esperada."],
              ["4", "Construa sua base", "Registre aprendizados e confirme sugestões de atualização da sua memória pessoal."],
            ].map(([number, title, text]) => (
              <div key={number} className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-black text-[#00A8CC]">{number}</span>
                <h3 className="mt-1 font-black text-[#00334E]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        ) : null}

        {modal === "conteudos" ? (
          <>
            <div className="mt-5 space-y-2">
              {competencies.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-full bg-[#00334E] px-2.5 py-1 text-xs font-black text-white">{item.id}</span>
                    <div>
                      <h3 className="font-black text-[#00334E]">{item.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{item.summary}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-[#00334E] disabled:opacity-40">Anterior</button>
              <span className="text-xs font-bold text-slate-500">Página {page + 1} de {pages}</span>
              <button type="button" disabled={page >= pages - 1} onClick={() => onPage(Math.min(pages - 1, page + 1))} className="rounded-xl bg-[#00334E] px-4 py-2 text-sm font-black text-white disabled:opacity-40">Próxima</button>
            </div>
          </>
        ) : null}

        <div className="mt-6 rounded-2xl bg-cyan-50 p-4">
          <p className="text-sm leading-6 text-cyan-950">
            <strong>Níveis:</strong> {STUDYAGENT_LEVELS.map((level) => level.label).join(" → ")}. O próximo nível só deve ser liberado depois da aprovação e da evidência exigidas pelo plano.
          </p>
        </div>
      </article>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <h3 className="font-black text-[#00334E]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
