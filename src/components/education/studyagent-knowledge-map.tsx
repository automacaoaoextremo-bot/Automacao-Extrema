"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  STUDYAGENT_COMPETENCIES,
  STUDYAGENT_COMPETENCY_BY_ID,
  STUDYAGENT_GATE,
  STUDYAGENT_LEVELS,
  getAvailableCompetencies,
} from "@/lib/education/studyagent-residencia-ia";

const categoryOrder = [
  "Fundamentos e enquadramento",
  "Dados e entendimento",
  "Raciocínio analítico",
  "Preparação para modelagem",
  "Modelagem",
  "Avaliação e iteração",
  "Engenharia e limites",
  "Evidência e governança",
  "Comunicação e evolução",
];

export function StudyAgentKnowledgeMap() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("K01");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  const selected = STUDYAGENT_COMPETENCY_BY_ID[selectedId] ?? STUDYAGENT_COMPETENCIES[0];
  const available = useMemo(() => getAvailableCompetencies(completed), [completed]);
  const availableIds = useMemo(() => new Set(available.map((item) => item.id)), [available]);
  const completedIds = useMemo(() => new Set(completed), [completed]);

  const grouped = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          items: STUDYAGENT_COMPETENCIES.filter((item) => item.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [],
  );

  function toggleCompleted(id: string) {
    setCompleted((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function askTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    setAnswer("");

    try {
      const response = await fetch("/solucoes/studyagent/residencia-ia/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          competencyIds: [selected.id],
          completedIds: completed,
        }),
      });

      const payload = (await response.json()) as { answer?: string; error?: string };
      setAnswer(payload.answer ?? payload.error ?? "Não foi possível obter uma resposta.");
    } catch {
      setAnswer("O tutor IA não respondeu. O mapa e a trilha continuam disponíveis sem IA.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric value="25" label="competências" />
        <Metric value="4" label="níveis" />
        <Metric value="100" label="etapas avaliáveis" />
        <Metric value={`${completed.length}/25`} label="marcadas nesta simulação" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8CC]">Knowledge Graph</p>
            <h2 className="mt-2 text-3xl font-bold text-[#00334E]">Mapa de competências e pré-requisitos</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Cada nó representa uma competência. As dependências determinam o que fica disponível como próximo estudo.
              Clique em um nó para ver sua base de conhecimento; marque como concluído apenas para simular a trilha nesta V1.
            </p>
          </div>
          <div className="rounded-2xl bg-[#00334E] px-4 py-3 text-sm font-semibold text-white">
            Próximos nós disponíveis: {available.length}
          </div>
        </div>

        <div className="mt-7 overflow-x-auto pb-2">
          <div className="grid min-w-[980px] grid-cols-9 gap-3">
            {grouped.map((group) => (
              <div key={group.category} className="space-y-3">
                <div className="min-h-16 rounded-2xl bg-slate-100 p-3 text-center text-xs font-black uppercase tracking-wide text-slate-600">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  const isDone = completedIds.has(item.id);
                  const isAvailable = availableIds.has(item.id);
                  const isSelected = selected.id === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? "border-[#00A8CC] bg-cyan-50 shadow-md"
                          : isDone
                            ? "border-emerald-300 bg-emerald-50"
                            : isAvailable
                              ? "border-blue-200 bg-blue-50"
                              : "border-slate-200 bg-slate-50 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-[#00334E]">{item.id}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {isDone ? "concluído" : isAvailable ? "disponível" : "depende"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-800">{item.title}</p>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#00334E] px-3 py-1 text-sm font-black text-white">{selected.id}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {selected.category}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-[#00334E]">{selected.title}</h2>
          <p className="mt-3 leading-7 text-slate-700">{selected.summary}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Detail title="Por que importa" text={selected.whyItMatters} />
            <Detail title="Evidência sugerida" text={selected.evidence} />
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">Pré-requisitos</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.prerequisites.length === 0 ? (
                <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  Nenhum pré-requisito obrigatório
                </span>
              ) : (
                selected.prerequisites.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#00334E] shadow-sm ring-1 ring-slate-200"
                  >
                    {id} · {STUDYAGENT_COMPETENCY_BY_ID[id]?.title}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {selected.studyHints.map((hint) => (
              <span key={hint} className="rounded-full bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900">
                {hint}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => toggleCompleted(selected.id)}
            className={`mt-6 rounded-xl px-5 py-3 font-bold ${
              completedIds.has(selected.id)
                ? "bg-slate-200 text-slate-800"
                : "bg-[#31C16B] text-[#00334E] hover:bg-[#4ce184]"
            }`}
          >
            {completedIds.has(selected.id) ? "Desmarcar na simulação" : "Simular competência concluída"}
          </button>
        </article>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-[#00334E] p-6 text-white shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#31C16B]">Próximos estudos</p>
            <h2 className="mt-2 text-2xl font-bold">Trilha calculada pelo grafo</h2>
            <div className="mt-5 space-y-3">
              {available.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="w-full rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 hover:bg-white/15"
                >
                  <span className="text-xs font-black text-[#31C16B]">{item.id}</span>
                  <p className="mt-1 font-semibold">{item.title}</p>
                </button>
              ))}
              {available.length === 0 && completed.length < STUDYAGENT_COMPETENCIES.length ? (
                <p className="text-sm leading-6 text-white/75">
                  Nenhum nó novo foi liberado. Revise as dependências marcadas como pendentes.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8CC]">Gate atual</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <Gate label="Quiz" value={`≥ ${STUDYAGENT_GATE.quizMin}%`} />
              <Gate label="Prática" value={`≥ ${STUDYAGENT_GATE.practiceMin}/3`} />
              <Gate label="Explicação" value={`≥ ${STUDYAGENT_GATE.explanationMin}/3`} />
              <Gate label="Nota final" value={`≥ ${STUDYAGENT_GATE.finalMin}%`} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              A marcação acima é apenas uma simulação de navegação. Aprovação real exige avaliação e evidência.
            </p>
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8CC]">Tutor StudyAgent — piloto</p>
        <h2 className="mt-2 text-2xl font-bold text-[#00334E]">Pergunte usando a competência selecionada como contexto</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          O tutor só é habilitado quando a variável <code className="rounded bg-slate-100 px-1">STUDYAGENT_AI_ENABLED=true</code>
          e uma chave da API são configuradas no servidor. Sem isso, todo o mapa, base e recomendação continuam funcionando.
        </p>

        <form onSubmit={askTutor} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={`Ex.: o que preciso demonstrar em ${selected.id}?`}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC]"
          />
          <button
            type="submit"
            disabled={asking}
            className="rounded-xl bg-[#00334E] px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {asking ? "Consultando..." : "Perguntar"}
          </button>
        </form>

        {answer ? (
          <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 leading-7 text-slate-700">{answer}</div>
        ) : null}
      </section>

      <section className="rounded-3xl bg-slate-100 p-6">
        <h2 className="text-2xl font-bold text-[#00334E]">Progressão por nível</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {STUDYAGENT_LEVELS.map((level) => (
            <div key={level.key} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-black text-[#00A8CC]">{level.order}</p>
              <h3 className="mt-1 text-lg font-bold text-[#00334E]">{level.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{level.intent}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl bg-[#00334E] p-5 text-white shadow-sm">
      <p className="text-3xl font-black text-[#31C16B]">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/80">{label}</p>
    </div>
  );
}

function Detail({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}

function Gate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-[#00334E]">{value}</p>
    </div>
  );
}
