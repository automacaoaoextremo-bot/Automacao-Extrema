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

type ViewKey = "mapa" | "tutor" | "niveis";

const externalAssistants = [
  { name: "ChatGPT", href: "https://chatgpt.com/" },
  { name: "Gemini", href: "https://gemini.google.com/" },
  { name: "Claude", href: "https://claude.ai/" },
];

export function StudyAgentKnowledgeMap() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("K01");
  const [selectedCategory, setSelectedCategory] = useState(categoryOrder[0]);
  const [view, setView] = useState<ViewKey>("mapa");
  const [detailOpen, setDetailOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = STUDYAGENT_COMPETENCY_BY_ID[selectedId] ?? STUDYAGENT_COMPETENCIES[0];
  const available = useMemo(() => getAvailableCompetencies(completed), [completed]);
  const availableIds = useMemo(() => new Set(available.map((item) => item.id)), [available]);
  const completedIds = useMemo(() => new Set(completed), [completed]);

  const visibleCompetencies = useMemo(
    () => STUDYAGENT_COMPETENCIES.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );

  const externalPrompt = useMemo(
    () =>
      [
        "Você é meu tutor de aprendizagem.",
        `Estou estudando a competência ${selected.id} — ${selected.title}.`,
        `Objetivo: ${selected.summary}`,
        `Por que importa: ${selected.whyItMatters}`,
        `Pré-requisitos: ${selected.prerequisites.join(", ") || "nenhum"}.`,
        `Evidência esperada: ${selected.evidence}`,
        `Assuntos de apoio: ${selected.studyHints.join(", ")}.`,
        `Já marquei como estudadas nesta simulação: ${completed.join(", ") || "nenhuma"}.`,
        "",
        "Quero que você:",
        "1. explique o conceito no nível adequado;",
        "2. faça 3 perguntas para verificar meu entendimento;",
        "3. proponha uma prática curta;",
        "4. aponte lacunas sem afirmar que fui aprovado;",
        "5. diga qual evidência eu deveria produzir para comprovar aprendizagem.",
        "",
        "Comece perguntando o que eu já consigo explicar sobre essa competência.",
      ].join("\n"),
    [selected, completed],
  );

  function toggleCompleted(id: string) {
    setCompleted((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function openCompetency(id: string) {
    const competency = STUDYAGENT_COMPETENCY_BY_ID[id];
    if (!competency) return;

    setSelectedId(id);
    setSelectedCategory(competency.category);
    setDetailOpen(true);
  }

  async function copyExternalPrompt() {
    try {
      await navigator.clipboard.writeText(externalPrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
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
      setAnswer(
        "O tutor integrado não respondeu. Você pode continuar usando o mapa ou copiar o contexto para o assistente de IA que já utiliza.",
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric value="25" label="competências" />
        <Metric value="4" label="níveis" />
        <Metric value="100" label="etapas" />
        <Metric value={`${completed.length}/25`} label="simuladas" />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex gap-2 overflow-x-auto" aria-label="Navegação do StudyAgent">
            <ViewButton active={view === "mapa"} onClick={() => setView("mapa")}>
              Mapa e trilha
            </ViewButton>
            <ViewButton active={view === "tutor"} onClick={() => setView("tutor")}>
              Tutor
            </ViewButton>
            <ViewButton active={view === "niveis"} onClick={() => setView("niveis")}>
              Níveis e gates
            </ViewButton>
          </div>
        </div>

        {view === "mapa" ? (
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8CC]">
                  Knowledge Graph
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">Escolha uma área e abra uma competência</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Em vez de mostrar todas as 25 competências de uma vez, o mapa exibe uma área por vez. Os detalhes
                  abrem em uma janela, reduzindo rolagem principalmente no celular.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#00334E] px-4 py-2 text-xs font-black text-white">
                {available.length} próximos disponíveis
              </span>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {categoryOrder.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                    selectedCategory === category
                      ? "bg-[#00334E] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="max-h-[56vh] overflow-y-auto rounded-2xl bg-slate-50 p-3 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleCompetencies.map((item) => {
                    const isDone = completedIds.has(item.id);
                    const isAvailable = availableIds.has(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openCompetency(item.id)}
                        className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                          isDone
                            ? "border-emerald-300 bg-emerald-50"
                            : isAvailable
                              ? "border-cyan-300 bg-cyan-50"
                              : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-[#00334E] px-2.5 py-1 text-xs font-black text-white">
                            {item.id}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                            {isDone ? "simulado" : isAvailable ? "disponível" : "depende"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-bold leading-6 text-[#00334E]">{item.title}</p>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{item.summary}</p>
                        <span className="mt-3 inline-flex text-xs font-black text-[#007C9B]">Abrir competência →</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-2xl bg-[#00334E] p-4 text-white sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31C16B]">Próximos estudos</p>
                <h3 className="mt-2 text-xl font-black">Trilha calculada pelo grafo</h3>
                <div className="mt-4 space-y-2">
                  {available.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openCompetency(item.id)}
                      className="w-full rounded-xl bg-white/10 p-3 text-left ring-1 ring-white/10 hover:bg-white/15"
                    >
                      <span className="text-[10px] font-black text-[#31C16B]">{item.id}</span>
                      <p className="mt-1 text-sm font-semibold leading-5">{item.title}</p>
                    </button>
                  ))}
                  {available.length === 0 && completed.length < STUDYAGENT_COMPETENCIES.length ? (
                    <p className="text-sm leading-6 text-white/70">Revise as dependências ainda pendentes.</p>
                  ) : null}
                </div>
              </aside>
            </div>
          </div>
        ) : null}

        {view === "tutor" ? (
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-2">
            <section className="rounded-3xl bg-[#00334E] p-5 text-white sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31C16B]">
                Use a IA que você já utiliza
              </p>
              <h2 className="mt-2 text-2xl font-black">Leve o contexto do StudyAgent para o seu assistente</h2>
              <p className="mt-3 text-sm leading-6 text-white/80">
                Esta opção não exige uma chave de API da Automação Extrema. O StudyAgent prepara o contexto da
                competência; você copia e usa no ChatGPT, Gemini, Claude ou outro assistente em que já tenha acesso.
              </p>

              <div className="mt-5 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs font-black uppercase tracking-wide text-[#31C16B]">Competência atual</p>
                <p className="mt-2 font-bold">
                  {selected.id} · {selected.title}
                </p>
              </div>

              <button
                type="button"
                onClick={copyExternalPrompt}
                className="mt-4 w-full rounded-xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] hover:bg-[#4ce184]"
              >
                {copied ? "Contexto copiado ✓" : "1. Copiar contexto para o tutor"}
              </button>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {externalAssistants.map((assistant) => (
                  <a
                    key={assistant.name}
                    href={assistant.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/20 px-3 py-3 text-center text-sm font-bold hover:bg-white/10"
                  >
                    {assistant.name}
                  </a>
                ))}
              </div>

              <p className="mt-3 text-xs leading-5 text-white/60">
                2. Abra o assistente desejado e cole o contexto. Nenhuma senha ou conta do seu assistente é enviada ao
                StudyAgent.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8CC]">Tutor integrado · piloto</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Pergunte sem sair da plataforma</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Quando o tutor integrado estiver disponível para este ambiente, ele usa a competência selecionada e a
                trilha como contexto. Se não estiver disponível, use a opção ao lado sem perder o restante da
                experiência.
              </p>

              <form onSubmit={askTutor} className="mt-5 space-y-3">
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={`Ex.: o que preciso demonstrar em ${selected.id}?`}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC]"
                />
                <button
                  type="submit"
                  disabled={asking}
                  className="w-full rounded-xl bg-[#00334E] px-5 py-3 font-bold text-white disabled:opacity-60"
                >
                  {asking ? "Consultando..." : "Perguntar ao tutor integrado"}
                </button>
              </form>

              {answer ? (
                <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {answer}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {view === "niveis" ? (
          <div className="p-4 sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <section>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8CC]">Progressão</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Quatro níveis, sempre com evidência</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {STUDYAGENT_LEVELS.map((level) => (
                    <div key={level.key} className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-xs font-black text-[#00A8CC]">Nível {level.order}</p>
                      <h3 className="mt-1 text-lg font-black text-[#00334E]">{level.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{level.intent}</p>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="rounded-3xl bg-[#00334E] p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31C16B]">Gate atual</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <Gate label="Quiz" value={`≥ ${STUDYAGENT_GATE.quizMin}%`} dark />
                  <Gate label="Prática" value={`≥ ${STUDYAGENT_GATE.practiceMin}/3`} dark />
                  <Gate label="Explicação" value={`≥ ${STUDYAGENT_GATE.explanationMin}/3`} dark />
                  <Gate label="Nota final" value={`≥ ${STUDYAGENT_GATE.finalMin}%`} dark />
                </div>
                <p className="mt-4 text-sm leading-6 text-white/70">
                  A simulação serve apenas para explorar a trilha. A aprovação real continua exigindo avaliação e
                  evidência verificável.
                </p>
              </aside>
            </div>
          </div>
        ) : null}
      </section>

      {detailOpen ? (
        <CompetencyModal
          selected={selected}
          completed={completedIds.has(selected.id)}
          onClose={() => setDetailOpen(false)}
          onToggle={() => toggleCompleted(selected.id)}
          onOpenPrerequisite={openCompetency}
          onTutor={() => {
            setDetailOpen(false);
            setView("tutor");
          }}
        />
      ) : null}
    </div>
  );
}

function CompetencyModal({
  selected,
  completed,
  onClose,
  onToggle,
  onOpenPrerequisite,
  onTutor,
}: {
  selected: (typeof STUDYAGENT_COMPETENCIES)[number];
  completed: boolean;
  onClose: () => void;
  onToggle: () => void;
  onOpenPrerequisite: (id: string) => void;
  onTutor: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studyagent-competency-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <article className="max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#00334E] px-3 py-1 text-sm font-black text-white">{selected.id}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {selected.category}
              </span>
            </div>
            <h2 id="studyagent-competency-title" className="mt-4 text-2xl font-black text-[#00334E]">
              {selected.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-200"
            aria-label="Fechar detalhes"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 leading-7 text-slate-700">{selected.summary}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Detail title="Por que importa" text={selected.whyItMatters} />
          <Detail title="Evidência sugerida" text={selected.evidence} />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pré-requisitos</p>
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
                  onClick={() => onOpenPrerequisite(id)}
                  className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#00334E] shadow-sm ring-1 ring-slate-200"
                >
                  {id} · {STUDYAGENT_COMPETENCY_BY_ID[id]?.title}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {selected.studyHints.map((hint) => (
            <span key={hint} className="rounded-full bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900">
              {hint}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onToggle}
            className={`rounded-xl px-5 py-3 font-black ${
              completed
                ? "bg-slate-200 text-slate-800"
                : "bg-[#31C16B] text-[#00334E] hover:bg-[#4ce184]"
            }`}
          >
            {completed ? "Desmarcar na simulação" : "Simular competência concluída"}
          </button>
          <button
            type="button"
            onClick={onTutor}
            className="rounded-xl bg-[#00334E] px-5 py-3 font-black text-white hover:bg-[#004765]"
          >
            Estudar com o Tutor
          </button>
        </div>
      </article>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
        active ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-[#00334E] p-4 text-white shadow-sm">
      <p className="text-2xl font-black text-[#31C16B] sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-semibold text-white/75 sm:text-sm">{label}</p>
    </div>
  );
}

function Detail({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{text}</p>
    </div>
  );
}

function Gate({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? "bg-white/10 ring-1 ring-white/10" : "bg-slate-50"}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${dark ? "text-white/60" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-1 text-xl font-black ${dark ? "text-white" : "text-[#00334E]"}`}>{value}</p>
    </div>
  );
}
