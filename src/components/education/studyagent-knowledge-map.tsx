"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  STUDYAGENT_COMPETENCIES,
  STUDYAGENT_COMPETENCY_BY_ID,
  STUDYAGENT_GATE,
  STUDYAGENT_LEVELS,
  STUDYAGENT_PROGRAM_ID,
  getAvailableCompetencies,
} from "@/lib/education/studyagent-residencia-ia";
import { supabaseBrowser } from "@/lib/supabase-browser";

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

type ViewKey = "mapa" | "tutor" | "base" | "niveis";

type KnowledgeEntry = {
  id: string;
  competency_code: string | null;
  title: string;
  content: string;
  source_type: string;
  source_reference: string | null;
  created_at: string;
  updated_at: string;
};

type KnowledgeSuggestion = {
  id: string;
  competency_code: string | null;
  suggestion_type: string;
  proposed_title: string;
  proposed_content: string;
  rationale: string;
  status: string;
  created_at: string;
};

type Consultation = {
  id: string;
  competency_code: string | null;
  question: string;
  answer: string;
  provider: string;
  created_at: string;
};

type TutorPayload = {
  answer?: string;
  error?: string;
  consultationId?: string;
  suggestion?: {
    id?: string;
    action: string;
    title: string;
    content: string;
    rationale: string;
  } | null;
};

const externalAssistants = [
  { name: "ChatGPT", href: "https://chatgpt.com/" },
  { name: "Gemini", href: "https://gemini.google.com/" },
  { name: "Claude", href: "https://claude.ai/" },
];

export function StudyAgentKnowledgeMap({ userId, displayName }: { userId: string; displayName?: string }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("K01");
  const [selectedCategory, setSelectedCategory] = useState(categoryOrder[0]);
  const [view, setView] = useState<ViewKey>("mapa");
  const [detailOpen, setDetailOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [suggestions, setSuggestions] = useState<KnowledgeSuggestion[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseMessage, setBaseMessage] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");

  const selected = STUDYAGENT_COMPETENCY_BY_ID[selectedId] ?? STUDYAGENT_COMPETENCIES[0];
  const available = useMemo(() => getAvailableCompetencies(completed), [completed]);
  const availableIds = useMemo(() => new Set(available.map((item) => item.id)), [available]);
  const completedIds = useMemo(() => new Set(completed), [completed]);
  const visibleCompetencies = useMemo(
    () => STUDYAGENT_COMPETENCIES.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );

  const selectedKnowledge = useMemo(
    () => knowledge.filter((entry) => !entry.competency_code || entry.competency_code === selected.id).slice(0, 6),
    [knowledge, selected.id],
  );

  const externalPrompt = useMemo(
    () =>
      [
        `Você é meu tutor de aprendizagem. Meu nome é ${displayName || "estudante"}.`,
        `Estou estudando a competência ${selected.id} — ${selected.title}.`,
        `Objetivo: ${selected.summary}`,
        `Por que importa: ${selected.whyItMatters}`,
        `Pré-requisitos: ${selected.prerequisites.join(", ") || "nenhum"}.`,
        `Evidência esperada: ${selected.evidence}`,
        `Assuntos de apoio: ${selected.studyHints.join(", ")}.`,
        `Já marquei como estudadas nesta simulação: ${completed.join(", ") || "nenhuma"}.`,
        "",
        "MINHA BASE PESSOAL JÁ CONFIRMADA:",
        selectedKnowledge.length
          ? selectedKnowledge.map((entry) => `- ${entry.title}: ${entry.content}`).join("\n")
          : "Ainda não há registros confirmados para este tema.",
        "",
        "Quero que você:",
        "1. explique o conceito no nível adequado;",
        "2. faça 3 perguntas para verificar meu entendimento;",
        "3. proponha uma prática curta;",
        "4. aponte lacunas sem afirmar que fui aprovado;",
        "5. diga qual evidência eu deveria produzir para comprovar aprendizagem;",
        "6. indique claramente se sua resposta traz algo novo, complementa ou diverge da minha base pessoal.",
        "",
        "Não invente informações para preencher lacunas. Quando faltar base, diga o que precisa ser verificado.",
      ].join("\n"),
    [selected, completed, selectedKnowledge, displayName],
  );

  useEffect(() => {
    loadPersonalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadPersonalData() {
    if (!userId) return;
    setBaseLoading(true);

    const [progressResult, knowledgeResult, suggestionResult, consultationResult] = await Promise.all([
      supabaseBrowser
        .from("ae_study_user_progress")
        .select("competency_code, simulated_completed")
        .eq("user_id", userId)
        .eq("program_id", STUDYAGENT_PROGRAM_ID),
      supabaseBrowser
        .from("ae_study_personal_knowledge")
        .select("id, competency_code, title, content, source_type, source_reference, created_at, updated_at")
        .eq("user_id", userId)
        .eq("program_id", STUDYAGENT_PROGRAM_ID)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(60),
      supabaseBrowser
        .from("ae_study_knowledge_suggestions")
        .select("id, competency_code, suggestion_type, proposed_title, proposed_content, rationale, status, created_at")
        .eq("user_id", userId)
        .eq("program_id", STUDYAGENT_PROGRAM_ID)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseBrowser
        .from("ae_study_tutor_consultations")
        .select("id, competency_code, question, answer, provider, created_at")
        .eq("user_id", userId)
        .eq("program_id", STUDYAGENT_PROGRAM_ID)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    if (progressResult.data) {
      setCompleted(
        progressResult.data
          .filter((row) => row.simulated_completed)
          .map((row) => row.competency_code)
          .filter(Boolean),
      );
    }
    if (knowledgeResult.data) setKnowledge(knowledgeResult.data as KnowledgeEntry[]);
    if (suggestionResult.data) setSuggestions(suggestionResult.data as KnowledgeSuggestion[]);
    if (consultationResult.data) setConsultations(consultationResult.data as Consultation[]);
    setBaseLoading(false);
  }

  async function toggleCompleted(id: string) {
    const nextCompleted = !completedIds.has(id);
    setCompleted((current) => (nextCompleted ? [...current, id] : current.filter((item) => item !== id)));

    const { error } = await supabaseBrowser.from("ae_study_user_progress").upsert(
      {
        user_id: userId,
        program_id: STUDYAGENT_PROGRAM_ID,
        competency_code: id,
        simulated_completed: nextCompleted,
        status: nextCompleted ? "simulado" : "em_estudo",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,program_id,competency_code" },
    );

    if (error) {
      setCompleted((current) => (nextCompleted ? current.filter((item) => item !== id) : [...current, id]));
      setBaseMessage("Não foi possível salvar a simulação agora.");
    }
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
    setBaseMessage("");

    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");

      const response = await fetch("/solucoes/studyagent/residencia-ia/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          competencyIds: [selected.id],
          completedIds: completed,
        }),
      });

      const payload = (await response.json()) as TutorPayload;
      setAnswer(payload.answer ?? payload.error ?? "Não foi possível obter uma resposta.");
      if (payload.suggestion?.action && payload.suggestion.action !== "none") {
        setBaseMessage("O Tutor encontrou uma possível atualização para sua base pessoal. Revise em Minha Base.");
      }
      await loadPersonalData();
    } catch {
      setAnswer("O Tutor integrado não respondeu. Você pode copiar o contexto e usar o assistente de IA que já utiliza.");
    } finally {
      setAsking(false);
    }
  }

  async function addManualKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBaseMessage("");
    if (!manualTitle.trim() || !manualContent.trim()) return;

    const { error } = await supabaseBrowser.from("ae_study_personal_knowledge").insert({
      user_id: userId,
      program_id: STUDYAGENT_PROGRAM_ID,
      competency_code: selected.id,
      title: manualTitle.trim(),
      content: manualContent.trim(),
      source_type: "manual",
      status: "active",
    });

    if (error) {
      setBaseMessage("Não foi possível salvar este conhecimento.");
      return;
    }

    setManualTitle("");
    setManualContent("");
    setBaseMessage("Conhecimento adicionado à sua base pessoal.");
    await loadPersonalData();
  }

  async function acceptSuggestion(suggestion: KnowledgeSuggestion) {
    setBaseMessage("");
    const { data: inserted, error: insertError } = await supabaseBrowser
      .from("ae_study_personal_knowledge")
      .insert({
        user_id: userId,
        program_id: STUDYAGENT_PROGRAM_ID,
        competency_code: suggestion.competency_code,
        title: suggestion.proposed_title,
        content: suggestion.proposed_content,
        source_type: "tutor_suggestion",
        source_reference: suggestion.id,
        status: "active",
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      setBaseMessage("Não foi possível incorporar esta sugestão.");
      return;
    }

    await supabaseBrowser
      .from("ae_study_knowledge_suggestions")
      .update({ status: "accepted", accepted_knowledge_id: inserted.id, reviewed_at: new Date().toISOString() })
      .eq("id", suggestion.id)
      .eq("user_id", userId);

    setBaseMessage("Sugestão confirmada e incorporada à sua base pessoal.");
    await loadPersonalData();
  }

  async function rejectSuggestion(id: string) {
    await supabaseBrowser
      .from("ae_study_knowledge_suggestions")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    setBaseMessage("Sugestão descartada. Sua base não foi alterada.");
    await loadPersonalData();
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric value="25" label="competências" subtitle="TOQUE PARA VER" onClick={() => setView("mapa")} />
        <Metric value="4" label="níveis" subtitle="TOQUE PARA VER" onClick={() => setView("niveis")} />
        <Metric value="100" label="etapas" subtitle="TOQUE PARA VER" onClick={() => setView("niveis")} />
        <Metric value={`${completed.length}/25`} label="simuladas" subtitle="TOQUE PARA VER" onClick={() => setView("mapa")} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex gap-2 overflow-x-auto" aria-label="Navegação do StudyAgent">
            <ViewButton active={view === "mapa"} onClick={() => setView("mapa")}>Mapa e trilha</ViewButton>
            <ViewButton active={view === "tutor"} onClick={() => setView("tutor")}>Tutor</ViewButton>
            <ViewButton active={view === "base"} onClick={() => setView("base")}>Minha Base{suggestions.length ? ` (${suggestions.length})` : ""}</ViewButton>
            <ViewButton active={view === "niveis"} onClick={() => setView("niveis")}>Níveis e gates</ViewButton>
          </div>
        </div>

        {view === "mapa" ? (
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8CC]">Knowledge Graph</p>
                <h2 className="mt-1 text-2xl font-black text-[#00334E]">Escolha uma área e abra uma competência</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">O mapa mostra uma área por vez e mantém os detalhes em uma janela, reduzindo rolagem no celular.</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#00334E] px-4 py-2 text-xs font-black text-white">{available.length} próximos disponíveis</span>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {categoryOrder.map((category) => (
                <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${selectedCategory === category ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{category}</button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="max-h-[56vh] overflow-y-auto rounded-2xl bg-slate-50 p-3 sm:p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleCompetencies.map((item) => {
                    const isDone = completedIds.has(item.id);
                    const isAvailable = availableIds.has(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => openCompetency(item.id)} className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isDone ? "border-emerald-300 bg-emerald-50" : isAvailable ? "border-cyan-300 bg-cyan-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-[#00334E] px-2.5 py-1 text-xs font-black text-white">{item.id}</span>
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{isDone ? "simulado" : isAvailable ? "disponível" : "depende"}</span>
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
                    <button key={item.id} type="button" onClick={() => openCompetency(item.id)} className="w-full rounded-xl bg-white/10 p-3 text-left ring-1 ring-white/10 hover:bg-white/15">
                      <span className="text-[10px] font-black text-[#31C16B]">{item.id}</span>
                      <p className="mt-1 text-sm font-semibold leading-5">{item.title}</p>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        ) : null}

        {view === "tutor" ? (
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-2">
            <section className="rounded-3xl bg-[#00334E] p-5 text-white sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#31C16B]">Use a IA que você já utiliza</p>
              <h2 className="mt-2 text-2xl font-black">Leve seu contexto para o assistente</h2>
              <p className="mt-3 text-sm leading-6 text-white/80">O texto preparado inclui a competência selecionada e os registros confirmados da sua base pessoal.</p>
              <div className="mt-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs font-black text-[#31C16B]">{selected.id}</p>
                <p className="mt-1 font-bold">{selected.title}</p>
              </div>
              <button type="button" onClick={copyExternalPrompt} className="mt-4 w-full rounded-xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] hover:bg-[#4ce184]">{copied ? "Contexto copiado ✓" : "1. Copiar contexto para o tutor"}</button>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {externalAssistants.map((assistant) => <a key={assistant.name} href={assistant.href} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">{assistant.name}</a>)}
              </div>
              <p className="mt-3 text-xs leading-5 text-white/60">Depois, se quiser preservar o aprendizado obtido fora do StudyAgent, registre-o em Minha Base.</p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8CC]">Tutor integrado</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Pergunte com sua memória pessoal como contexto</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">Quando habilitado, o Tutor compara a nova resposta com sua base confirmada. Se houver novidade, complemento ou divergência, cria uma sugestão que você decide aceitar ou rejeitar.</p>
              <form onSubmit={askTutor} className="mt-5 space-y-3">
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={`Ex.: o que preciso demonstrar em ${selected.id}?`} rows={4} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00A8CC]" />
                <button type="submit" disabled={asking} className="w-full rounded-xl bg-[#00334E] px-5 py-3 font-bold text-white disabled:opacity-60">{asking ? "Consultando..." : "Perguntar ao Tutor integrado"}</button>
              </form>
              {answer ? <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{answer}</div> : null}
              {baseMessage ? <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900">{baseMessage}</p> : null}
            </section>
          </div>
        ) : null}

        {view === "base" ? (
          <div className="p-4 sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <section>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8CC]">Minha Base</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Conhecimento confirmado por você</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Esta área é pessoal. Sugestões do Tutor não entram automaticamente.</p>

                <form onSubmit={addManualKnowledge} className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-black text-[#00334E]">Adicionar aprendizado / resposta externa</p>
                  <select value={selectedId} onChange={(event) => { const id = event.target.value; setSelectedId(id); setSelectedCategory(STUDYAGENT_COMPETENCY_BY_ID[id]?.category || categoryOrder[0]); }} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">
                    {STUDYAGENT_COMPETENCIES.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}
                  </select>
                  <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} placeholder="Título curto" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  <textarea value={manualContent} onChange={(event) => setManualContent(event.target.value)} placeholder="Cole ou escreva o conhecimento que deseja preservar" rows={5} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  <button className="w-full rounded-xl bg-[#00334E] px-5 py-3 font-black text-white">Adicionar à minha base</button>
                </form>

                {baseMessage ? <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900">{baseMessage}</p> : null}
              </section>

              <section className="space-y-5">
                {suggestions.length ? (
                  <div>
                    <h3 className="text-lg font-black text-[#00334E]">Sugestões aguardando sua decisão</h3>
                    <div className="mt-3 space-y-3">
                      {suggestions.map((suggestion) => (
                        <article key={suggestion.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {suggestion.competency_code ? <span className="rounded-full bg-[#00334E] px-2.5 py-1 text-xs font-black text-white">{suggestion.competency_code}</span> : null}
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-900">{suggestion.suggestion_type}</span>
                          </div>
                          <h4 className="mt-3 font-black text-[#00334E]">{suggestion.proposed_title}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{suggestion.proposed_content}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500"><strong>Por que foi sugerido:</strong> {suggestion.rationale}</p>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => acceptSuggestion(suggestion)} className="rounded-xl bg-[#31C16B] px-4 py-2.5 text-sm font-black text-[#00334E]">Aceitar</button>
                            <button type="button" onClick={() => rejectSuggestion(suggestion.id)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200">Rejeitar</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-lg font-black text-[#00334E]">Registros confirmados</h3>
                  {baseLoading ? <p className="mt-3 text-sm text-slate-500">Carregando...</p> : null}
                  <div className="mt-3 space-y-3">
                    {knowledge.map((entry) => (
                      <article key={entry.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.competency_code ? <span className="rounded-full bg-[#00334E] px-2.5 py-1 text-xs font-black text-white">{entry.competency_code}</span> : null}
                          <span className="text-[10px] font-black uppercase text-slate-400">{entry.source_type}</span>
                        </div>
                        <h4 className="mt-2 font-black text-[#00334E]">{entry.title}</h4>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{entry.content}</p>
                      </article>
                    ))}
                    {!baseLoading && knowledge.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Sua base pessoal ainda está vazia. Registre um aprendizado ou use o Tutor.</p> : null}
                  </div>
                </div>

                {consultations.length ? (
                  <details className="rounded-2xl border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer font-black text-[#00334E]">Histórico recente do Tutor ({consultations.length})</summary>
                    <div className="mt-3 space-y-3">
                      {consultations.map((consultation) => (
                        <div key={consultation.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                          <p className="font-bold text-[#00334E]">{consultation.competency_code || "Geral"} · {consultation.question}</p>
                          <p className="mt-2 line-clamp-4 leading-6 text-slate-600">{consultation.answer}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </section>
            </div>
          </div>
        ) : null}

        {view === "niveis" ? (
          <div className="p-4 sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <section>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8CC]">Progressão</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Quatro níveis, sempre com evidência</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {STUDYAGENT_LEVELS.map((level) => <div key={level.key} className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black text-[#00A8CC]">Nível {level.order}</p><h3 className="mt-1 text-lg font-black text-[#00334E]">{level.label}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{level.intent}</p></div>)}
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
                <p className="mt-4 text-sm leading-6 text-white/70">A simulação serve para explorar a trilha. Aprovação real continua exigindo avaliação e evidência verificável.</p>
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
          onTutor={() => { setDetailOpen(false); setView("tutor"); }}
        />
      ) : null}
    </div>
  );
}

function CompetencyModal({ selected, completed, onClose, onToggle, onOpenPrerequisite, onTutor }: {
  selected: (typeof STUDYAGENT_COMPETENCIES)[number];
  completed: boolean;
  onClose: () => void;
  onToggle: () => void;
  onOpenPrerequisite: (id: string) => void;
  onTutor: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="studyagent-competency-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <article className="max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#00334E] px-3 py-1 text-sm font-black text-white">{selected.id}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{selected.category}</span></div>
            <h2 id="studyagent-competency-title" className="mt-4 text-2xl font-black text-[#00334E]">{selected.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-200" aria-label="Fechar detalhes">✕</button>
        </div>
        <p className="mt-3 leading-7 text-slate-700">{selected.summary}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><Detail title="Por que importa" text={selected.whyItMatters} /><Detail title="Evidência sugerida" text={selected.evidence} /></div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pré-requisitos</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.prerequisites.length === 0 ? <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">Nenhum pré-requisito obrigatório</span> : selected.prerequisites.map((id) => <button key={id} type="button" onClick={() => onOpenPrerequisite(id)} className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#00334E] shadow-sm ring-1 ring-slate-200">{id} · {STUDYAGENT_COMPETENCY_BY_ID[id]?.title}</button>)}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{selected.studyHints.map((hint) => <span key={hint} className="rounded-full bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900">{hint}</span>)}</div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onToggle} className={`rounded-xl px-5 py-3 font-black ${completed ? "bg-slate-200 text-slate-800" : "bg-[#31C16B] text-[#00334E] hover:bg-[#4ce184]"}`}>{completed ? "Desmarcar na simulação" : "Simular competência concluída"}</button>
          <button type="button" onClick={onTutor} className="rounded-xl bg-[#00334E] px-5 py-3 font-black text-white hover:bg-[#004765]">Estudar com o Tutor</button>
        </div>
      </article>
    </div>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${active ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{children}</button>;
}

function Metric({ value, label, subtitle, onClick }: { value: string; label: string; subtitle: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl bg-[#00334E] p-4 text-left text-white shadow-sm transition hover:-translate-y-0.5"><p className="text-2xl font-black text-[#31C16B] sm:text-3xl">{value}</p><p className="mt-1 text-xs font-semibold text-white/75 sm:text-sm">{label}</p><p className="mt-1 text-[0.5rem] font-black uppercase tracking-[0.12em] text-white/45">{subtitle}</p></button>;
}

function Detail({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p><p className="mt-2 text-sm leading-6 text-slate-700">{text}</p></div>;
}

function Gate({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return <div className={`rounded-2xl p-3 ${dark ? "bg-white/10 ring-1 ring-white/10" : "bg-slate-50"}`}><p className={`text-xs font-bold uppercase tracking-wide ${dark ? "text-white/60" : "text-slate-500"}`}>{label}</p><p className={`mt-1 text-xl font-black ${dark ? "text-white" : "text-[#00334E]"}`}>{value}</p></div>;
}
