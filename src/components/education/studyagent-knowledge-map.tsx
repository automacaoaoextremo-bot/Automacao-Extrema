"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  STUDYAGENT_COMPETENCIES,
  STUDYAGENT_COMPETENCY_BY_ID,
  STUDYAGENT_GATE,
  STUDYAGENT_LEVELS,
  STUDYAGENT_PROGRAM_ID,
  type StudyAgentCompetency,
  type StudyAgentLevelKey,
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

const ITEMS_PER_PAGE = 4;

type ViewKey = "trilha" | "tutor" | "base" | "competencias" | "revalidar" | "niveis";

type KnowledgeEntry = {
  id: string;
  user_id?: string;
  competency_code: string | null;
  title: string;
  content: string;
  source_type: string;
  source_reference: string | null;
  visibility?: "private" | "shared";
  content_version?: number;
  created_at: string;
  updated_at: string;
};

type KnowledgeSuggestion = {
  id: string;
  competency_code: string | null;
  suggestion_type: "new" | "complement" | "divergence";
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

type LevelPlan = {
  competency_code: string;
  level_key: StudyAgentLevelKey;
  level_order: number;
  level_label: string;
  objective: string;
  criterion_original: string | null;
  practical_requirements: string | null;
  best_practices: string | null;
  study_suggested: string | null;
  practical_exercise: string | null;
  assessment_suggested: string | null;
  evidence_expected: string | null;
  market_differential: string | null;
  planned_hours: number | null;
  resource_1: string | null;
  resource_2: string | null;
  reflection_source: string | null;
};

type UserCompetency = {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  category: string;
  why_it_matters: string | null;
  evidence_suggestion: string | null;
  related_official_codes: string[];
  visibility: "private" | "shared";
  status: string;
  content_version: number;
  updated_at: string;
};

type RevalidationNotice = {
  id: string;
  source_kind: "official_competency" | "shared_competency" | "shared_knowledge";
  source_key: string;
  source_title: string;
  competency_code: string | null;
  from_version: number;
  to_version: number;
  reason: string;
  status: "pending" | "reviewed" | "revalidated" | "dismissed";
  created_at: string;
};

type DbCompetency = {
  id: string;
  code: string;
  title: string;
  summary: string;
  category: string;
  why_it_matters: string;
  evidence_suggestion: string;
  reflection_sources: string[] | null;
  sort_order: number;
};

type DbEdge = {
  from_competency_id: string;
  to_competency_id: string;
  relation_type: string;
};

const externalAssistants = [
  { name: "ChatGPT", href: "https://chatgpt.com/" },
  { name: "Gemini", href: "https://gemini.google.com/" },
  { name: "Claude", href: "https://claude.ai/" },
];

export function StudyAgentKnowledgeMap({ userId, displayName }: { userId: string; displayName?: string }) {
  const [competencies, setCompetencies] = useState<StudyAgentCompetency[]>(STUDYAGENT_COMPETENCIES);
  const [levelPlans, setLevelPlans] = useState<LevelPlan[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("K01");
  const [selectedCategory, setSelectedCategory] = useState(categoryOrder[0]);
  const [view, setView] = useState<ViewKey>("trilha");
  const [detailOpen, setDetailOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [sharedKnowledge, setSharedKnowledge] = useState<KnowledgeEntry[]>([]);
  const [suggestions, setSuggestions] = useState<KnowledgeSuggestion[]>([]);
  const [, setConsultations] = useState<Consultation[]>([]);
  const [userCompetencies, setUserCompetencies] = useState<UserCompetency[]>([]);
  const [revalidation, setRevalidation] = useState<RevalidationNotice[]>([]);
  const [subscribedCompetencyIds, setSubscribedCompetencyIds] = useState<string[]>([]);
  const [subscribedKnowledgeIds, setSubscribedKnowledgeIds] = useState<string[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseMessage, setBaseMessage] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualVisibility, setManualVisibility] = useState<"private" | "shared">("private");
  const [personalTitle, setPersonalTitle] = useState("");
  const [personalSummary, setPersonalSummary] = useState("");
  const [personalRelatedCode, setPersonalRelatedCode] = useState("K01");
  const [personalVisibility, setPersonalVisibility] = useState<"private" | "shared">("private");
  const [pages, setPages] = useState<Record<string, number>>({});

  const competencyById = useMemo(
    () => Object.fromEntries(competencies.map((item) => [item.id, item])) as Record<string, StudyAgentCompetency>,
    [competencies],
  );
  const selected = competencyById[selectedId] ?? competencies[0] ?? STUDYAGENT_COMPETENCIES[0];
  const completedIds = useMemo(() => new Set(completed), [completed]);
  const available = useMemo(
    () => competencies.filter((item) => !completedIds.has(item.id) && item.prerequisites.every((id) => completedIds.has(id))),
    [competencies, completedIds],
  );
  const availableIds = useMemo(() => new Set(available.map((item) => item.id)), [available]);
  const categories = useMemo(() => {
    const found = Array.from(new Set(competencies.map((item) => item.category)));
    return [...categoryOrder.filter((item) => found.includes(item)), ...found.filter((item) => !categoryOrder.includes(item))];
  }, [competencies]);
  const visibleCompetencies = useMemo(
    () => competencies.filter((item) => item.category === selectedCategory),
    [competencies, selectedCategory],
  );
  const selectedKnowledge = useMemo(
    () => knowledge.filter((entry) => !entry.competency_code || entry.competency_code === selected.id).slice(0, 6),
    [knowledge, selected.id],
  );
  const selectedPlans = useMemo(
    () => levelPlans.filter((plan) => plan.competency_code === selected.id).sort((a, b) => a.level_order - b.level_order),
    [levelPlans, selected.id],
  );
  const ownCompetencies = useMemo(() => userCompetencies.filter((item) => item.user_id === userId && item.status === "active"), [userCompetencies, userId]);
  const communityCompetencies = useMemo(() => userCompetencies.filter((item) => item.user_id !== userId && item.visibility === "shared" && item.status === "active"), [userCompetencies, userId]);
  const pendingRevalidation = useMemo(() => revalidation.filter((item) => item.status === "pending" || item.status === "reviewed"), [revalidation]);

  const externalPrompt = useMemo(
    () => [
      `Você é meu tutor de aprendizagem. Meu nome é ${displayName || "estudante"}.`,
      `Estou estudando a competência ${selected.id} — ${selected.title}.`,
      `Objetivo: ${selected.summary}`,
      `Por que importa: ${selected.whyItMatters}`,
      `Pré-requisitos: ${selected.prerequisites.join(", ") || "nenhum"}.`,
      `Evidência esperada: ${selected.evidence}`,
      "",
      "MINHA BASE PESSOAL JÁ CONFIRMADA:",
      selectedKnowledge.length ? selectedKnowledge.map((entry) => `- ${entry.title}: ${entry.content}`).join("\n") : "Ainda não há registros confirmados para este tema.",
      "",
      "Quero que você explique, faça perguntas, proponha uma prática, aponte lacunas e indique uma evidência de aprendizagem.",
      "Não invente informações para preencher lacunas. Diga explicitamente o que precisa ser verificado.",
    ].join("\n"),
    [selected, selectedKnowledge, displayName],
  );

  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadPersonalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadCatalog() {
    const [competencyResult, edgeResult, planResult] = await Promise.all([
      supabaseBrowser
        .from("ae_study_competencies")
        .select("id, code, title, summary, category, why_it_matters, evidence_suggestion, reflection_sources, sort_order")
        .eq("program_id", STUDYAGENT_PROGRAM_ID)
        .eq("active", true)
        .order("sort_order"),
      supabaseBrowser
        .from("ae_study_competency_edges")
        .select("from_competency_id, to_competency_id, relation_type")
        .eq("program_id", STUDYAGENT_PROGRAM_ID),
      supabaseBrowser
        .from("ae_study_competency_level_plans")
        .select("competency_code, level_key, level_order, level_label, objective, criterion_original, practical_requirements, best_practices, study_suggested, practical_exercise, assessment_suggested, evidence_expected, market_differential, planned_hours, resource_1, resource_2, reflection_source")
        .eq("program_id", STUDYAGENT_PROGRAM_ID)
        .eq("active", true)
        .order("level_order"),
    ]);

    const dbCompetencies = (competencyResult.data ?? []) as DbCompetency[];
    if (dbCompetencies.length) {
      const idToCode = Object.fromEntries(dbCompetencies.map((item) => [item.id, item.code]));
      const prerequisites = new Map<string, string[]>();
      ((edgeResult.data ?? []) as DbEdge[]).forEach((edge) => {
        if (edge.relation_type !== "prerequisite_of") return;
        const from = idToCode[edge.from_competency_id];
        const to = idToCode[edge.to_competency_id];
        if (!from || !to) return;
        prerequisites.set(to, [...(prerequisites.get(to) ?? []), from]);
      });

      const mapped = dbCompetencies.map((item) => {
        const fallback = STUDYAGENT_COMPETENCY_BY_ID[item.code];
        return {
          id: item.code,
          title: item.title,
          summary: item.summary,
          category: item.category,
          whyItMatters: item.why_it_matters,
          prerequisites: prerequisites.get(item.code) ?? [],
          reflectionSources: item.reflection_sources ?? [],
          evidence: item.evidence_suggestion,
          studyHints: fallback?.studyHints ?? [],
        } satisfies StudyAgentCompetency;
      });
      setCompetencies(mapped);
      if (!mapped.some((item) => item.id === selectedId)) setSelectedId(mapped[0]?.id ?? "K01");
      const firstCategory = mapped[0]?.category;
      if (firstCategory && !mapped.some((item) => item.category === selectedCategory)) setSelectedCategory(firstCategory);
    }

    if (planResult.data) setLevelPlans(planResult.data as LevelPlan[]);
  }

  async function loadPersonalData() {
    if (!userId) return;
    setBaseLoading(true);

    const results = await Promise.all([
      supabaseBrowser.from("ae_study_user_progress").select("competency_code, simulated_completed").eq("user_id", userId).eq("program_id", STUDYAGENT_PROGRAM_ID),
      supabaseBrowser.from("ae_study_personal_knowledge").select("id, user_id, competency_code, title, content, source_type, source_reference, visibility, content_version, created_at, updated_at").eq("user_id", userId).eq("program_id", STUDYAGENT_PROGRAM_ID).eq("status", "active").order("updated_at", { ascending: false }).limit(80),
      supabaseBrowser.from("ae_study_knowledge_suggestions").select("id, competency_code, suggestion_type, proposed_title, proposed_content, rationale, status, created_at").eq("user_id", userId).eq("program_id", STUDYAGENT_PROGRAM_ID).eq("status", "pending").order("created_at", { ascending: false }).limit(20),
      supabaseBrowser.from("ae_study_tutor_consultations").select("id, competency_code, question, answer, provider, created_at").eq("user_id", userId).eq("program_id", STUDYAGENT_PROGRAM_ID).order("created_at", { ascending: false }).limit(12),
      supabaseBrowser.from("ae_study_user_competencies").select("id, user_id, title, summary, category, why_it_matters, evidence_suggestion, related_official_codes, visibility, status, content_version, updated_at").eq("program_id", STUDYAGENT_PROGRAM_ID).order("updated_at", { ascending: false }).limit(100),
      supabaseBrowser.from("ae_study_revalidation_notices").select("id, source_kind, source_key, source_title, competency_code, from_version, to_version, reason, status, created_at").eq("user_id", userId).eq("program_id", STUDYAGENT_PROGRAM_ID).order("created_at", { ascending: false }).limit(50),
      supabaseBrowser.from("ae_study_user_competency_subscriptions").select("user_competency_id").eq("user_id", userId).eq("status", "active"),
      supabaseBrowser.from("ae_study_shared_knowledge_subscriptions").select("knowledge_id").eq("user_id", userId).eq("status", "active"),
      supabaseBrowser.from("ae_study_personal_knowledge").select("id, user_id, competency_code, title, content, source_type, source_reference, visibility, content_version, created_at, updated_at").eq("program_id", STUDYAGENT_PROGRAM_ID).eq("visibility", "shared").eq("status", "active").neq("user_id", userId).order("updated_at", { ascending: false }).limit(40),
    ]);

    const [progressResult, knowledgeResult, suggestionResult, consultationResult, userCompetencyResult, noticeResult, compSubscriptionResult, knowledgeSubscriptionResult, sharedKnowledgeResult] = results;

    if (progressResult.data) setCompleted(progressResult.data.filter((row) => row.simulated_completed).map((row) => row.competency_code).filter(Boolean));
    if (knowledgeResult.data) setKnowledge(knowledgeResult.data as KnowledgeEntry[]);
    if (suggestionResult.data) setSuggestions(suggestionResult.data as KnowledgeSuggestion[]);
    if (consultationResult.data) setConsultations(consultationResult.data as Consultation[]);
    if (userCompetencyResult.data) setUserCompetencies(userCompetencyResult.data as UserCompetency[]);
    if (noticeResult.data) setRevalidation(noticeResult.data as RevalidationNotice[]);
    if (compSubscriptionResult.data) setSubscribedCompetencyIds(compSubscriptionResult.data.map((row) => row.user_competency_id));
    if (knowledgeSubscriptionResult.data) setSubscribedKnowledgeIds(knowledgeSubscriptionResult.data.map((row) => row.knowledge_id));
    if (sharedKnowledgeResult.data) setSharedKnowledge(sharedKnowledgeResult.data as KnowledgeEntry[]);

    setBaseLoading(false);
  }

  function pageSlice<T>(key: string, items: T[]) {
    const page = pages[key] ?? 0;
    return {
      page,
      pages: Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE)),
      items: items.slice(page * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE + ITEMS_PER_PAGE),
    };
  }

  function changePage(key: string, page: number, totalPages: number) {
    setPages((current) => ({ ...current, [key]: Math.min(Math.max(0, page), Math.max(0, totalPages - 1)) }));
  }

  async function toggleCompleted(id: string) {
    const next = !completed.includes(id);
    setCompleted((current) => (next ? [...current, id] : current.filter((item) => item !== id)));
    const { error } = await supabaseBrowser.from("ae_study_user_progress").upsert({
      user_id: userId,
      program_id: STUDYAGENT_PROGRAM_ID,
      competency_code: id,
      current_level: "iniciante",
      status: next ? "simulado" : "em_estudo",
      simulated_completed: next,
    }, { onConflict: "user_id,program_id,competency_code" });
    if (error) setBaseMessage("Não foi possível salvar a simulação agora.");
  }

  function openCompetency(id: string) {
    const competency = competencyById[id];
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
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão não encontrada");
      const response = await fetch("/solucoes/studyagent/residencia-ia/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, competencyIds: [selected.id], completedIds: completed }),
      });
      const payload = (await response.json()) as { answer?: string; error?: string };
      setAnswer(payload.answer ?? payload.error ?? "Não foi possível obter uma resposta.");
      await loadPersonalData();
    } catch {
      setAnswer("O Tutor integrado não respondeu. Você pode copiar o contexto e usar a IA que já utiliza.");
    } finally {
      setAsking(false);
    }
  }

  async function saveManualKnowledge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) return;
    const { error } = await supabaseBrowser.from("ae_study_personal_knowledge").insert({
      user_id: userId,
      program_id: STUDYAGENT_PROGRAM_ID,
      competency_code: selected.id,
      title: manualTitle.trim(),
      content: manualContent.trim(),
      source_type: "manual",
      visibility: manualVisibility,
    });
    if (error) {
      setBaseMessage("Não foi possível salvar este conhecimento.");
      return;
    }
    setManualTitle("");
    setManualContent("");
    setBaseMessage("Conhecimento salvo na sua base.");
    await loadPersonalData();
  }

  async function toggleKnowledgeSharing(entry: KnowledgeEntry) {
    const visibility = entry.visibility === "shared" ? "private" : "shared";
    await supabaseBrowser.from("ae_study_personal_knowledge").update({ visibility, change_note: visibility === "shared" ? "Conhecimento disponibilizado para compartilhamento." : "Conhecimento voltou a ser privado." }).eq("id", entry.id).eq("user_id", userId);
    await loadPersonalData();
  }

  async function createPersonalCompetency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (personalTitle.trim().length < 3 || personalSummary.trim().length < 10) return;
    const { error } = await supabaseBrowser.from("ae_study_user_competencies").insert({
      user_id: userId,
      program_id: STUDYAGENT_PROGRAM_ID,
      title: personalTitle.trim(),
      summary: personalSummary.trim(),
      category: "Competência pessoal",
      related_official_codes: personalRelatedCode ? [personalRelatedCode] : [],
      visibility: personalVisibility,
    });
    if (error) {
      setBaseMessage("Não foi possível cadastrar a competência pessoal.");
      return;
    }
    setPersonalTitle("");
    setPersonalSummary("");
    setBaseMessage("Competência pessoal cadastrada.");
    await loadPersonalData();
  }

  async function togglePersonalCompetencySharing(item: UserCompetency) {
    const visibility = item.visibility === "shared" ? "private" : "shared";
    await supabaseBrowser.from("ae_study_user_competencies").update({ visibility, change_note: visibility === "shared" ? "Competência disponibilizada à comunidade." : "Competência voltou a ser privada." }).eq("id", item.id).eq("user_id", userId);
    await loadPersonalData();
  }

  async function subscribeCompetency(item: UserCompetency) {
    await supabaseBrowser.from("ae_study_user_competency_subscriptions").upsert({ user_id: userId, user_competency_id: item.id, subscribed_version: item.content_version, status: "active" }, { onConflict: "user_id,user_competency_id" });
    await loadPersonalData();
  }

  async function subscribeKnowledge(item: KnowledgeEntry) {
    await supabaseBrowser.from("ae_study_shared_knowledge_subscriptions").upsert({ user_id: userId, knowledge_id: item.id, subscribed_version: item.content_version ?? 1, status: "active" }, { onConflict: "user_id,knowledge_id" });
    await loadPersonalData();
  }

  async function acceptSuggestion(suggestion: KnowledgeSuggestion) {
    const { data: inserted, error } = await supabaseBrowser.from("ae_study_personal_knowledge").insert({
      user_id: userId,
      program_id: STUDYAGENT_PROGRAM_ID,
      competency_code: suggestion.competency_code,
      title: suggestion.proposed_title,
      content: suggestion.proposed_content,
      source_type: "tutor",
      source_reference: suggestion.id,
      visibility: "private",
    }).select("id").single();
    if (error) return;
    await supabaseBrowser.from("ae_study_knowledge_suggestions").update({ status: "accepted", accepted_knowledge_id: inserted?.id ?? null, reviewed_at: new Date().toISOString() }).eq("id", suggestion.id).eq("user_id", userId);
    await loadPersonalData();
  }

  async function rejectSuggestion(id: string) {
    await supabaseBrowser.from("ae_study_knowledge_suggestions").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
    await loadPersonalData();
  }

  async function updateRevalidation(id: string, status: "reviewed" | "revalidated" | "dismissed") {
    await supabaseBrowser.from("ae_study_revalidation_notices").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
    await loadPersonalData();
  }

  const visiblePage = pageSlice("trilha", visibleCompetencies);
  const ownCompPage = pageSlice("ownComp", ownCompetencies);
  const sharedCompPage = pageSlice("sharedComp", communityCompetencies);
  const basePage = pageSlice("base", knowledge);
  const sharedBasePage = pageSlice("sharedBase", sharedKnowledge);
  const noticePage = pageSlice("notices", pendingRevalidation);

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-4 gap-2">
        <Metric value={String(competencies.length)} label="competências" />
        <Metric value="4" label="níveis" />
        <Metric value={String(levelPlans.length || competencies.length * 4)} label="etapas" />
        <Metric value={`${completed.length}/${competencies.length}`} label="simuladas" />
      </section>

      {pendingRevalidation.length ? (
        <button type="button" onClick={() => setView("revalidar")} className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-950">
          ⚠ {pendingRevalidation.length} atualização(ões) podem exigir revisão do seu estudo. Toque para verificar.
        </button>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <nav className="grid grid-cols-3 gap-1.5 border-b border-slate-200 bg-white p-2" aria-label="Navegação do StudyAgent">
          <ViewButton active={view === "trilha"} onClick={() => setView("trilha")}>Trilha</ViewButton>
          <ViewButton active={view === "tutor"} onClick={() => setView("tutor")}>Tutor</ViewButton>
          <ViewButton active={view === "base"} onClick={() => setView("base")}>Minha Base</ViewButton>
          <ViewButton active={view === "competencias"} onClick={() => setView("competencias")}>Competências +</ViewButton>
          <ViewButton active={view === "revalidar"} onClick={() => setView("revalidar")}>Revalidar</ViewButton>
          <ViewButton active={view === "niveis"} onClick={() => setView("niveis")}>Níveis</ViewButton>
        </nav>

        {view === "trilha" ? (
          <Panel title="Knowledge Graph" subtitle="Escolha uma área e avance pelas relações de pré-requisito.">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => { setSelectedCategory(category); changePage("trilha", 0, 1); }} className={`shrink-0 rounded-full px-3 py-2 text-[0.68rem] font-bold ${selectedCategory === category ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-600"}`}>
                  {category}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visiblePage.items.map((item) => {
                const isDone = completedIds.has(item.id);
                const isAvailable = availableIds.has(item.id);
                return (
                  <button key={item.id} type="button" onClick={() => openCompetency(item.id)} className={`rounded-2xl border p-3 text-left ${isDone ? "border-emerald-300 bg-emerald-50" : isAvailable ? "border-cyan-300 bg-cyan-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[#00334E] px-2 py-1 text-xs font-black text-white">{item.id}</span><span className="text-[0.6rem] font-black uppercase text-slate-500">{isDone ? "simulado" : isAvailable ? "disponível" : "depende"}</span></div>
                    <p className="mt-2 text-sm font-bold leading-5 text-[#00334E]">{item.title}</p>
                  </button>
                );
              })}
            </div>
            <Pager page={visiblePage.page} pages={visiblePage.pages} onPage={(p) => changePage("trilha", p, visiblePage.pages)} />
            <div className="mt-3 rounded-2xl bg-[#00334E] p-3 text-white"><p className="text-xs font-black uppercase text-[#31C16B]">Próximos disponíveis</p><p className="mt-2 text-sm leading-6">{available.slice(0, 4).map((item) => `${item.id} · ${item.title}`).join(" • ") || "Revise as dependências pendentes."}</p></div>
          </Panel>
        ) : null}

        {view === "tutor" ? (
          <Panel title="Tutor" subtitle={`Contexto atual: ${selected.id} · ${selected.title}`}>
            <div className="grid gap-3 lg:grid-cols-2">
              <section className="rounded-2xl bg-[#00334E] p-4 text-white">
                <p className="text-sm leading-6 text-white/80">Copie o contexto estruturado e use o assistente que você já possui.</p>
                <button type="button" onClick={copyExternalPrompt} className="mt-3 w-full rounded-xl bg-[#31C16B] px-4 py-3 font-black text-[#00334E]">{copied ? "Contexto copiado" : "Copiar contexto"}</button>
                <div className="mt-2 grid grid-cols-3 gap-2">{externalAssistants.map((assistant) => <a key={assistant.name} href={assistant.href} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 px-2 py-2 text-center text-xs font-bold ring-1 ring-white/15">{assistant.name}</a>)}</div>
              </section>
              <form onSubmit={askTutor} className="rounded-2xl bg-slate-50 p-4">
                <label className="text-sm font-black text-[#00334E]">Pergunta para o Tutor integrado</label>
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#00A8CC]" placeholder="O que você quer entender ou praticar?" />
                <button disabled={asking || !question.trim()} className="mt-2 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">{asking ? "Consultando..." : "Perguntar"}</button>
                {answer ? <div className="mt-3 max-h-52 overflow-y-auto rounded-xl bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">{answer}</div> : null}
              </form>
            </div>
          </Panel>
        ) : null}

        {view === "base" ? (
          <Panel title="Minha Base" subtitle="Sua memória confirmada fica separada da base oficial.">
            <form onSubmit={saveManualKnowledge} className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
              <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Título do aprendizado" />
              <select value={manualVisibility} onChange={(event) => setManualVisibility(event.target.value as "private" | "shared")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="private">Privado</option><option value="shared">Compartilhar com outros estudantes</option></select>
              <textarea value={manualContent} onChange={(event) => setManualContent(event.target.value)} rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm sm:col-span-2" placeholder="O que você aprendeu e deseja preservar?" />
              <button className="rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white sm:col-span-2">Salvar na minha base</button>
            </form>
            {baseMessage ? <p className="mt-2 rounded-xl bg-cyan-50 p-2 text-xs font-semibold text-cyan-900">{baseMessage}</p> : null}
            {suggestions.length ? <div className="mt-3 space-y-2"><h3 className="font-black text-[#00334E]">Sugestões do Tutor</h3>{suggestions.slice(0, 3).map((suggestion) => <article key={suggestion.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="font-bold text-[#00334E]">{suggestion.proposed_title}</p><p className="mt-1 text-sm text-slate-700">{suggestion.proposed_content}</p><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => acceptSuggestion(suggestion)} className="rounded-lg bg-[#31C16B] px-3 py-2 text-xs font-black text-[#00334E]">Aceitar</button><button type="button" onClick={() => rejectSuggestion(suggestion.id)} className="rounded-lg bg-white px-3 py-2 text-xs font-black ring-1 ring-slate-200">Rejeitar</button></div></article>)}</div> : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{basePage.items.map((entry) => <article key={entry.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-[#00A8CC]">{entry.competency_code || "Geral"}</span><button type="button" onClick={() => toggleKnowledgeSharing(entry)} className="text-[0.65rem] font-black text-[#007C9B]">{entry.visibility === "shared" ? "Tornar privado" : "Compartilhar"}</button></div><p className="mt-1 font-bold text-[#00334E]">{entry.title}</p><p className="mt-1 line-clamp-3 text-sm text-slate-600">{entry.content}</p></article>)}</div>
            {!baseLoading && knowledge.length === 0 ? <p className="mt-3 text-sm text-slate-500">Sua base ainda está vazia.</p> : null}
            <Pager page={basePage.page} pages={basePage.pages} onPage={(p) => changePage("base", p, basePage.pages)} />
            {sharedKnowledge.length ? <div className="mt-5"><h3 className="font-black text-[#00334E]">Conhecimentos compartilhados pela comunidade</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{sharedBasePage.items.map((entry) => <article key={entry.id} className="rounded-xl border border-cyan-100 bg-cyan-50 p-3"><p className="font-bold text-[#00334E]">{entry.title}</p><p className="mt-1 line-clamp-3 text-sm text-slate-600">{entry.content}</p><button type="button" disabled={subscribedKnowledgeIds.includes(entry.id)} onClick={() => subscribeKnowledge(entry)} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#00334E] ring-1 ring-cyan-200 disabled:opacity-50">{subscribedKnowledgeIds.includes(entry.id) ? "Acompanhando" : "Acompanhar atualizações"}</button></article>)}</div><Pager page={sharedBasePage.page} pages={sharedBasePage.pages} onPage={(p) => changePage("sharedBase", p, sharedBasePage.pages)} /></div> : null}
          </Panel>
        ) : null}

        {view === "competencias" ? (
          <Panel title="Competências adicionais" subtitle="Crie competências pessoais e, se quiser, compartilhe com outros estudantes.">
            <form onSubmit={createPersonalCompetency} className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
              <input value={personalTitle} onChange={(event) => setPersonalTitle(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Nome da competência" />
              <select value={personalRelatedCode} onChange={(event) => setPersonalRelatedCode(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{competencies.map((item) => <option key={item.id} value={item.id}>Relacionar a {item.id}</option>)}</select>
              <textarea value={personalSummary} onChange={(event) => setPersonalSummary(event.target.value)} rows={3} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm sm:col-span-2" placeholder="O que você quer aprender e por quê?" />
              <select value={personalVisibility} onChange={(event) => setPersonalVisibility(event.target.value as "private" | "shared")} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="private">Somente para mim</option><option value="shared">Compartilhar com a comunidade</option></select>
              <button className="rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white">Cadastrar competência</button>
            </form>
            <div className="mt-4"><h3 className="font-black text-[#00334E]">Minhas competências</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{ownCompPage.items.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-[#00334E]">{item.title}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.summary}</p><p className="mt-1 text-xs text-slate-400">Relacionada a: {item.related_official_codes.join(", ") || "sem vínculo"} · v{item.content_version}</p><button type="button" onClick={() => togglePersonalCompetencySharing(item)} className="mt-2 text-xs font-black text-[#007C9B]">{item.visibility === "shared" ? "Tornar privada" : "Compartilhar"}</button></article>)}</div><Pager page={ownCompPage.page} pages={ownCompPage.pages} onPage={(p) => changePage("ownComp", p, ownCompPage.pages)} /></div>
            {communityCompetencies.length ? <div className="mt-5"><h3 className="font-black text-[#00334E]">Compartilhadas pela comunidade</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{sharedCompPage.items.map((item) => <article key={item.id} className="rounded-xl border border-cyan-100 bg-cyan-50 p-3"><p className="font-bold text-[#00334E]">{item.title}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.summary}</p><button type="button" disabled={subscribedCompetencyIds.includes(item.id)} onClick={() => subscribeCompetency(item)} className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-[#00334E] ring-1 ring-cyan-200 disabled:opacity-50">{subscribedCompetencyIds.includes(item.id) ? "Acompanhando" : "Acompanhar"}</button></article>)}</div><Pager page={sharedCompPage.page} pages={sharedCompPage.pages} onPage={(p) => changePage("sharedComp", p, sharedCompPage.pages)} /></div> : null}
          </Panel>
        ) : null}

        {view === "revalidar" ? (
          <Panel title="Revisão e revalidação" subtitle="Mudanças não apagam sua aprovação automaticamente; elas sinalizam o que merece nova revisão.">
            {noticePage.items.length ? <div className="space-y-2">{noticePage.items.map((notice) => <article key={notice.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase text-amber-900">{notice.source_kind.replaceAll("_", " ")}</span><span className="text-xs text-amber-800">v{notice.from_version} → v{notice.to_version}</span></div><h3 className="mt-1 font-black text-[#00334E]">{notice.source_title}</h3><p className="mt-1 text-sm leading-6 text-slate-700">{notice.reason}</p><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => updateRevalidation(notice.id, "reviewed")} className="rounded-lg bg-white px-2 py-2 text-[0.65rem] font-black ring-1 ring-amber-200">Revisei</button><button type="button" onClick={() => updateRevalidation(notice.id, "revalidated")} className="rounded-lg bg-[#31C16B] px-2 py-2 text-[0.65rem] font-black text-[#00334E]">Revalidado</button><button type="button" onClick={() => updateRevalidation(notice.id, "dismissed")} className="rounded-lg bg-white px-2 py-2 text-[0.65rem] font-black ring-1 ring-amber-200">Dispensar</button></div></article>)}</div> : <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">Nenhuma revisão pendente neste momento.</p>}
            <Pager page={noticePage.page} pages={noticePage.pages} onPage={(p) => changePage("notices", p, noticePage.pages)} />
          </Panel>
        ) : null}

        {view === "niveis" ? (
          <Panel title="Progressão por níveis" subtitle="O plano segue Estudar → Praticar → Avaliar → Evidenciar → Avançar.">
            <div className="grid gap-2 sm:grid-cols-2">{STUDYAGENT_LEVELS.map((level) => <div key={level.key} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-[#00A8CC]">Nível {level.order}</p><h3 className="mt-1 font-black text-[#00334E]">{level.label}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{level.intent}</p></div>)}</div>
            <div className="mt-3 grid grid-cols-4 gap-2"><Gate label="Quiz" value={`≥ ${STUDYAGENT_GATE.quizMin}%`} /><Gate label="Prática" value={`≥ ${STUDYAGENT_GATE.practiceMin}/3`} /><Gate label="Explicação" value={`≥ ${STUDYAGENT_GATE.explanationMin}/3`} /><Gate label="Final" value={`≥ ${STUDYAGENT_GATE.finalMin}%`} /></div>
            <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-950">Abra uma competência na Trilha para ver o plano estruturado dos quatro níveis: objetivo, estudo, prática, avaliação, evidência, horas e recursos.</p>
          </Panel>
        ) : null}
      </section>
    
      {detailOpen ? <CompetencyModal selected={selected} plans={selectedPlans} completed={completedIds.has(selected.id)} competencyById={competencyById} onClose={() => setDetailOpen(false)} onToggle={() => toggleCompleted(selected.id)} onOpenPrerequisite={openCompetency} onTutor={() => { setDetailOpen(false); setView("tutor"); }} /> : null}
    </div>
  );
}

function CompetencyModal({ selected, plans, completed, competencyById, onClose, onToggle, onOpenPrerequisite, onTutor }: {
  selected: StudyAgentCompetency;
  plans: LevelPlan[];
  completed: boolean;
  competencyById: Record<string, StudyAgentCompetency>;
  onClose: () => void;
  onToggle: () => void;
  onOpenPrerequisite: (id: string) => void;
  onTutor: () => void;
}) {
  const [levelKey, setLevelKey] = useState<StudyAgentLevelKey>(plans[0]?.level_key ?? "iniciante");
  const plan = plans.find((item) => item.level_key === levelKey);
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 pt-3 backdrop-blur-sm sm:p-4 sm:pt-8" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <article className="max-h-[calc(100svh-1.5rem)] w-full overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:max-w-3xl sm:p-7">
        <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#00334E] px-3 py-1 text-xs font-black text-white">{selected.id}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{selected.category}</span></div><h2 className="mt-3 text-xl font-black text-[#00334E] sm:text-2xl">{selected.title}</h2></div><button type="button" onClick={onClose} className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">✕</button></div>
        <p className="mt-2 text-sm leading-6 text-slate-700">{selected.summary}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2"><Detail title="Por que importa" text={selected.whyItMatters} /><Detail title="Evidência geral" text={selected.evidence} /></div>
        <div className="mt-3 rounded-2xl bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-500">Pré-requisitos</p><div className="mt-2 flex flex-wrap gap-2">{selected.prerequisites.length ? selected.prerequisites.map((id) => <button key={id} type="button" onClick={() => onOpenPrerequisite(id)} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#00334E] ring-1 ring-slate-200">{id} · {competencyById[id]?.title ?? id}</button>) : <span className="text-sm text-slate-600">Nenhum obrigatório.</span>}</div></div>
        <div className="mt-4"><p className="text-xs font-black uppercase tracking-wide text-[#00A8CC]">Plano estruturado por nível</p><div className="mt-2 grid grid-cols-4 gap-1">{STUDYAGENT_LEVELS.map((level) => <button key={level.key} type="button" onClick={() => setLevelKey(level.key)} className={`rounded-lg px-1.5 py-2 text-[0.6rem] font-black sm:text-xs ${levelKey === level.key ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-600"}`}>{level.label}</button>)}</div></div>
        {plan ? <div className="mt-3 space-y-2 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3"><PlanRow label="Objetivo" text={plan.objective} /><PlanRow label="Estudo sugerido" text={plan.study_suggested} /><PlanRow label="Prática" text={plan.practical_exercise} /><PlanRow label="Avaliação" text={plan.assessment_suggested} /><PlanRow label="Evidência esperada" text={plan.evidence_expected} /><div className="grid grid-cols-2 gap-2"><PlanRow label="Horas" text={plan.planned_hours ? `${plan.planned_hours} h` : null} /><PlanRow label="Origem" text={plan.reflection_source} /></div>{plan.resource_1 || plan.resource_2 ? <div><p className="text-[0.65rem] font-black uppercase text-slate-500">Recursos</p><div className="mt-1 flex flex-wrap gap-2">{[plan.resource_1, plan.resource_2].filter(Boolean).map((url) => <a key={url} href={url ?? "#"} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#007C9B] ring-1 ring-cyan-100">Abrir recurso ↗</a>)}</div></div> : null}</div> : <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">O plano detalhado deste nível estará disponível após aplicar a migration V3.</p>}
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={onToggle} className={`rounded-xl px-3 py-3 text-sm font-black ${completed ? "bg-slate-200 text-slate-800" : "bg-[#31C16B] text-[#00334E]"}`}>{completed ? "Desmarcar simulação" : "Simular concluída"}</button><button type="button" onClick={onTutor} className="rounded-xl bg-[#00334E] px-3 py-3 text-sm font-black text-white">Estudar com Tutor</button></div>
      </article>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="p-3 sm:p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8CC]">StudyAgent</p><h2 className="mt-1 text-xl font-black text-[#00334E] sm:text-2xl">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-600">{subtitle}</p><div className="mt-4">{children}</div></div>;
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-9 rounded-xl px-1.5 py-2 text-[0.62rem] font-black sm:text-sm ${active ? "bg-[#00334E] text-white" : "bg-slate-50 text-[#00334E]"}`}>{children}</button>;
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-[#00334E] px-2 py-3 text-center text-white"><strong className="block text-xl font-black text-[#31C16B] sm:text-2xl">{value}</strong><span className="mt-0.5 block text-[0.55rem] font-bold uppercase tracking-wide text-white/70 sm:text-xs">{label}</span></div>;
}

function Gate({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-2 text-center"><strong className="block text-sm font-black text-[#00334E]">{value}</strong><span className="text-[0.55rem] font-bold uppercase text-slate-500 sm:text-xs">{label}</span></div>;
}

function Detail({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[0.65rem] font-black uppercase text-slate-500">{title}</p><p className="mt-1 text-sm leading-5 text-slate-700">{text}</p></div>;
}

function PlanRow({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return <div><p className="text-[0.65rem] font-black uppercase text-slate-500">{label}</p><p className="mt-0.5 text-sm leading-5 text-slate-700">{text}</p></div>;
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return <div className="mt-3 flex items-center justify-between gap-2"><button type="button" disabled={page <= 0} onClick={() => onPage(page - 1)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-[#00334E] disabled:opacity-40">Anterior</button><span className="text-xs font-bold text-slate-500">{page + 1}/{pages}</span><button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className="rounded-lg bg-[#00334E] px-3 py-2 text-xs font-black text-white disabled:opacity-40">Próxima</button></div>;
}
