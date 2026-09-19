"use client";

import { useMemo, useState } from "react";

export type AcervoHomologationPerson = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
};

export type AcervoHomologationRecord = {
  id: string;
  participant_person_id: string;
  conducted_at: string;
  source_type: "manual" | "foto" | "audio";
  task_results?: Record<string, string> | null;
  final_answers?: Record<string, string> | null;
  notes?: string | null;
  loan_id?: string | null;
  ai_metadata?: Record<string, unknown> | null;
  participant?: AcervoHomologationPerson | null;
  conductedBy?: AcervoHomologationPerson | null;
};

type Props = {
  api: string;
  token: string;
  people: AcervoHomologationPerson[];
  homologations: AcervoHomologationRecord[];
  postLoanHomologationEnabled: boolean;
  onSaved: () => Promise<void> | void;
};

type TaskStatus = "" | "sozinho" | "com_ajuda" | "nao_concluiu";
type SourceType = "manual" | "foto" | "audio";

type Draft = {
  taskResults?: Record<string, string>;
  finalAnswers?: Record<string, string>;
  notes?: string;
};

const TASKS = [
  ["acessar_acervo", "Acessar o Acervo Vivo"],
  ["entender_inicio", "Entender o que é o Acervo e por onde começar"],
  ["realizar_cadastro", "Fazer o cadastro necessário para o empréstimo"],
  ["procurar_livro", "Procurar um livro por título ou assunto"],
  ["abrir_detalhe", "Abrir o detalhe do livro"],
  ["entender_codigo_lombada", "Entender o código da lombada"],
  ["localizar_livro", "Localizar o exemplar físico no armário"],
  ["registrar_emprestimo", "Registrar o empréstimo"],
  ["encontrar_meus_livros", "Encontrar Meus livros"],
  ["entender_data_devolucao", "Identificar a data prevista de devolução"],
  ["encontrar_trilhas", "Encontrar e entender as Trilhas"],
  ["encontrar_ajuda", "Encontrar a opção de ajuda e saber quem procurar"],
  ["entender_devolucao", "Entender o próximo passo para devolver o livro"],
] as const;

const FINAL_QUESTIONS = [
  ["facilidade_geral", "Como foi a experiência geral?", [["facil", "Fácil"], ["razoavel", "Razoável"], ["dificil", "Difícil"]]],
  ["duvida_inseguranca", "Teve dúvida ou insegurança durante o teste?", [["nao", "Não"], ["pouca", "Pouca"], ["muita", "Muita"]]],
  ["usaria_sozinho", "Usaria o Acervo Vivo novamente sozinho?", [["sim", "Sim"], ["talvez", "Talvez"], ["nao", "Não"]]],
  ["trilhas_ajudaram", "As Trilhas ajudaram na escolha?", [["sim", "Sim"], ["parcialmente", "Parcialmente"], ["nao", "Não"], ["nao_testado", "Não testou"]]],
  ["apoio_humano_claro", "Ficou claro que existe apoio humano?", [["sim", "Sim"], ["parcialmente", "Parcialmente"], ["nao", "Não"]]],
  ["recomendaria", "Recomendaria o Acervo Vivo para outra pessoa?", [["sim", "Sim"], ["talvez", "Talvez"], ["nao", "Não"]]],
] as const;

function blankTasks() {
  return Object.fromEntries(TASKS.map(([key]) => [key, ""])) as Record<string, TaskStatus>;
}

function blankFinalAnswers() {
  return Object.fromEntries(FINAL_QUESTIONS.map(([key]) => [key, ""])) as Record<string, string>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function statusLabel(value: string) {
  if (value === "sozinho") return "Sozinho";
  if (value === "com_ajuda") return "Com ajuda";
  if (value === "nao_concluiu") return "Não concluiu";
  return "—";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });
}

async function imageFileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem válida.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const current = new Image();
      current.onload = () => resolve(current);
      current.onerror = () => reject(new Error("Não foi possível abrir a imagem selecionada."));
      current.src = objectUrl;
    });
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a foto.");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function AcervoVivoHomologacaoManager({
  api,
  token,
  people,
  homologations,
  postLoanHomologationEnabled,
  onSaved,
}: Props) {
  const [view, setView] = useState<"menu" | "registrar" | "resultados">("menu");
  const [participantPersonId, setParticipantPersonId] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [taskResults, setTaskResults] = useState<Record<string, TaskStatus>>(blankTasks);
  const [finalAnswers, setFinalAnswers] = useState<Record<string, string>>(blankFinalAnswers);
  const [hardestStage, setHardestStage] = useState("");
  const [notes, setNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceStoragePath, setEvidenceStoragePath] = useState("");
  const [evidenceFileName, setEvidenceFileName] = useState("");
  const [evidenceMimeType, setEvidenceMimeType] = useState("");
  const [extractionModel, setExtractionModel] = useState("");
  const [transcriptionModel, setTranscriptionModel] = useState("");
  const [transcript, setTranscript] = useState("");
  const [extractedAutomatically, setExtractedAutomatically] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [postLoanEnabledDraft, setPostLoanEnabledDraft] = useState<boolean | null>(null);
  const effectivePostLoanEnabled = postLoanEnabledDraft ?? postLoanHomologationEnabled;
  const [settingBusy, setSettingBusy] = useState(false);
  const [settingMessage, setSettingMessage] = useState("");
  const [settingError, setSettingError] = useState("");


  const sortedPeople = useMemo(
    () => people.slice().sort((left, right) => (left.full_name || "").localeCompare(right.full_name || "", "pt-BR")),
    [people],
  );

  const metrics = useMemo(() => {
    const allTasks = homologations.flatMap((item) => Object.values(item.task_results ?? {}));
    const autonomous = allTasks.filter((value) => value === "sozinho").length;
    const completed = allTasks.filter((value) => value === "sozinho" || value === "com_ajuda").length;
    const peopleWithHelp = homologations.filter((item) => Object.values(item.task_results ?? {}).includes("com_ajuda")).length;
    const supportClear = homologations.filter((item) => item.final_answers?.apoio_humano_claro === "sim").length;
    const wouldUseAlone = homologations.filter((item) => item.final_answers?.usaria_sozinho === "sim").length;
    return {
      total: homologations.length,
      autonomousRate: percent(autonomous, allTasks.length),
      completionRate: percent(completed, allTasks.length),
      helpRate: percent(peopleWithHelp, homologations.length),
      supportClearRate: percent(supportClear, homologations.length),
      wouldUseAloneRate: percent(wouldUseAlone, homologations.length),
    };
  }, [homologations]);

  async function savePostLoanHomologationSetting() {
    if (!token || settingBusy) return;
    setSettingBusy(true);
    setSettingError("");
    setSettingMessage("");
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "save-settings",
          postLoanHomologationEnabled: effectivePostLoanEnabled,
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar a configuração.");
      setSettingMessage(
        effectivePostLoanEnabled
          ? "Teste de uso após o empréstimo habilitado."
          : "Teste de uso após o empréstimo desabilitado.",
      );
      await onSaved();
      setPostLoanEnabledDraft(null);
    } catch (current) {
      setSettingError(current instanceof Error ? current.message : "Erro ao atualizar a configuração.");
    } finally {
      setSettingBusy(false);
    }
  }

  function resetForm() {
    setParticipantPersonId("");
    setSourceType("manual");
    setTaskResults(blankTasks());
    setFinalAnswers(blankFinalAnswers());
    setHardestStage("");
    setNotes("");
    setEvidenceFile(null);
    setEvidenceStoragePath("");
    setEvidenceFileName("");
    setEvidenceMimeType("");
    setExtractionModel("");
    setTranscriptionModel("");
    setTranscript("");
    setExtractedAutomatically(false);
    setMessage("");
    setError("");
  }

  function applyDraft(draft?: Draft) {
    if (!draft) return;
    setTaskResults((current) => {
      const next = { ...current };
      for (const [key] of TASKS) {
        const value = draft.taskResults?.[key];
        if (value === "sozinho" || value === "com_ajuda" || value === "nao_concluiu") next[key] = value;
      }
      return next;
    });
    setFinalAnswers((current) => {
      const next = { ...current };
      for (const [key, , options] of FINAL_QUESTIONS) {
        const value = draft.finalAnswers?.[key] || "";
        if ((options as readonly (readonly [string, string])[]).some(([option]) => option === value)) next[key] = value;
      }
      return next;
    });
    const hardest = draft.finalAnswers?.etapa_mais_dificil || "";
    if (hardest === "nenhuma" || TASKS.some(([key]) => key === hardest)) setHardestStage(hardest);
    if (draft.notes) setNotes(draft.notes);
  }

  async function processEvidence() {
    if (!evidenceFile || sourceType === "manual" || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let dataUrl = "";
      if (sourceType === "foto") {
        dataUrl = await imageFileToDataUrl(evidenceFile);
      } else {
        if (evidenceFile.size > 3_000_000) throw new Error("Para a leitura automática, use um áudio de até aproximadamente 3 MB.");
        dataUrl = await readFileAsDataUrl(evidenceFile);
      }
      if (!dataUrl || dataUrl.length > 4_200_000) throw new Error("O arquivo ficou grande demais para envio. Reduza o tamanho e tente novamente.");

      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "extract-homologation-evidence",
          sourceType,
          fileName: evidenceFile.name,
          mimeType: evidenceFile.type,
          dataUrl,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        draft?: Draft;
        evidenceStoragePath?: string;
        evidenceFileName?: string;
        evidenceMimeType?: string;
        extractionModel?: string;
        transcriptionModel?: string;
        transcript?: string;
        manualProcessingRequired?: boolean;
        message?: string;
      };
      if (!response.ok) throw new Error(result.error || "Não foi possível processar a evidência.");

      setEvidenceStoragePath(result.evidenceStoragePath || "");
      setEvidenceFileName(result.evidenceFileName || evidenceFile.name);
      setEvidenceMimeType(result.evidenceMimeType || evidenceFile.type);
      setExtractionModel(result.extractionModel || "");
      setTranscriptionModel(result.transcriptionModel || "");
      setTranscript(result.transcript || "");
      setExtractedAutomatically(Boolean(result.draft) && result.manualProcessingRequired !== true);
      applyDraft(result.draft);
      setMessage(result.message || "Evidência processada. Revise as respostas antes de salvar.");
    } catch (current) {
      setError(current instanceof Error ? current.message : "Erro ao processar a evidência.");
    } finally {
      setBusy(false);
    }
  }

  async function saveHomologation() {
    if (busy) return;
    setError("");
    setMessage("");
    if (!participantPersonId) {
      setError("Selecione a pessoa cadastrada que realizou o teste.");
      return;
    }
    const missingTask = TASKS.find(([key]) => !taskResults[key]);
    if (missingTask) {
      setError(`Preencha a etapa: ${missingTask[1]}.`);
      return;
    }
    const missingFinal = FINAL_QUESTIONS.find(([key]) => !finalAnswers[key]);
    if (missingFinal) {
      setError(`Responda: ${missingFinal[1]}.`);
      return;
    }
    if (!hardestStage) {
      setError("Informe qual foi a etapa mais difícil, ou marque Nenhuma.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "save-homologation",
          participantPersonId,
          sourceType,
          taskResults,
          finalAnswers: { ...finalAnswers, etapa_mais_dificil: hardestStage },
          notes,
          evidenceStoragePath,
          evidenceFileName,
          evidenceMimeType,
          extractedAutomatically,
          extractionModel,
          transcriptionModel,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar a homologação.");
      await onSaved();
      resetForm();
      setView("resultados");
      setMessage("Homologação registrada e contabilizada.");
    } catch (current) {
      setError(current instanceof Error ? current.message : "Erro ao salvar a homologação.");
    } finally {
      setBusy(false);
    }
  }

  if (view === "menu") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="sm:col-span-2 rounded-2xl bg-[#E7F2FF] p-4 text-[#00334E] ring-1 ring-[#00334E]/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">Teste após o empréstimo</p>
              <p className="mt-1 text-sm font-black">Oferecer homologação ao usuário após o empréstimo</p>
              <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-600">
                Quando habilitado, a pessoa poderá responder as mesmas questões estruturadas logo após concluir um empréstimo. A participação é opcional e entra nos Resultados da Homologação.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${effectivePostLoanEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
              {effectivePostLoanEnabled ? "Habilitado" : "Desabilitado"}
            </span>
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black ring-1 ring-[#00334E]/10">
            <input
              type="checkbox"
              checked={effectivePostLoanEnabled}
              onChange={(event) => {
                setPostLoanEnabledDraft(event.target.checked);
                setSettingMessage("");
                setSettingError("");
              }}
            />
            Permitir que o participante responda após concluir um empréstimo
          </label>
          {(settingError || settingMessage) && (
            <div className={`mt-2 rounded-xl p-2 text-[10px] font-bold ring-1 ${settingError ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-900 ring-emerald-200"}`}>
              {settingError || settingMessage}
            </div>
          )}
          <button
            type="button"
            disabled={settingBusy || effectivePostLoanEnabled === postLoanHomologationEnabled}
            onClick={() => void savePostLoanHomologationSetting()}
            className="mt-3 w-full rounded-xl bg-[#00334E] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40"
          >
            {settingBusy ? "Salvando..." : "Salvar configuração"}
          </button>
        </section>

        <button type="button" onClick={() => { resetForm(); setView("registrar"); }} className="rounded-2xl bg-[#F4FBF7] p-4 text-left text-[#00334E] ring-1 ring-[#123D2C]/10">
          <span className="block text-base font-black">Registrar teste</span>
          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">Selecione uma pessoa cadastrada, una roteiro + ficha e registre as respostas estruturadas.</span>
          <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
        </button>
        <button type="button" onClick={() => setView("resultados")} className="rounded-2xl bg-[#F4FBF7] p-4 text-left text-[#00334E] ring-1 ring-[#123D2C]/10">
          <span className="block text-base font-black">Resultados</span>
          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{homologations.length} teste(s) registrados, incluindo respostas enviadas pelo próprio participante quando a opção pós-empréstimo estiver habilitada.</span>
          <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
        </button>
      </div>
    );
  }

  if (view === "resultados") {
    return (
      <div>
        <button type="button" onClick={() => setView("menu")} className="mb-3 rounded-xl bg-[#F4FBF7] px-3 py-2 text-xs font-black text-[#00334E] ring-1 ring-[#123D2C]/10">← Voltar</button>
        {message && <div className="mb-3 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">{message}</div>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["Testes", metrics.total, ""],
            ["Autonomia", metrics.autonomousRate, "%"],
            ["Etapas concluídas", metrics.completionRate, "%"],
            ["Precisaram de ajuda", metrics.helpRate, "%"],
            ["Apoio ficou claro", metrics.supportClearRate, "%"],
            ["Usariam sozinhos", metrics.wouldUseAloneRate, "%"],
          ].map(([label, value, suffix]) => (
            <article key={String(label)} className="rounded-2xl bg-white p-3 text-center ring-1 ring-[#123D2C]/10">
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#2F6B43]">{label}</p>
              <p className="mt-1 text-xl font-black text-[#00334E]">{value}{suffix}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-2">
          {homologations.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-200">Nenhuma homologação registrada ainda.</p>
          ) : homologations.map((item) => {
            const tasks = item.task_results ?? {};
            const alone = Object.values(tasks).filter((value) => value === "sozinho").length;
            const helped = Object.values(tasks).filter((value) => value === "com_ajuda").length;
            const failed = Object.values(tasks).filter((value) => value === "nao_concluiu").length;
            return (
              <article key={item.id} className="rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-[#00334E]">{item.participant?.full_name || "Participante"}</p>
                    <p className="text-[10px] font-bold text-slate-500">
                      {formatDate(item.conducted_at)} • origem: {item.ai_metadata?.submitted_by_participant === true ? "participante após empréstimo" : item.source_type}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#E9F2E7] px-2.5 py-1 text-[9px] font-black text-[#123D2C]">{alone} sozinho • {helped} ajuda • {failed} não concluiu</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-600">Cadastro: <strong>{statusLabel(tasks.realizar_cadastro || "")}</strong> • Empréstimo: <strong>{statusLabel(tasks.registrar_emprestimo || "")}</strong> • Apoio claro: <strong>{item.final_answers?.apoio_humano_claro || "—"}</strong></p>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => setView("menu")} className="mb-3 rounded-xl bg-[#F4FBF7] px-3 py-2 text-xs font-black text-[#00334E] ring-1 ring-[#123D2C]/10">← Voltar</button>
      <div className="rounded-2xl bg-[#FFF8E7] p-3 text-xs font-bold leading-5 text-amber-900 ring-1 ring-amber-200">
        O participante deve realizar o fluxo praticamente sozinho. O cadastro faz parte do teste: registre se foi concluído sozinho, com ajuda ou se não foi concluído. O Gestor Biblioteca revisa tudo antes de salvar.
      </div>

      {(error || message) && <div className={`mt-3 rounded-2xl p-3 text-xs font-bold ring-1 ${error ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-900 ring-emerald-200"}`}>{error || message}</div>}

      <label className="mt-4 grid gap-1 text-xs font-black text-[#00334E]">
        Pessoa cadastrada que realizou o teste
        <select value={participantPersonId} onChange={(event) => setParticipantPersonId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">
          <option value="">Selecione...</option>
          {sortedPeople.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email || person.whatsapp || person.id}</option>)}
        </select>
      </label>

      <section className="mt-4 rounded-2xl bg-[#F4FBF7] p-3 ring-1 ring-[#123D2C]/10">
        <p className="text-xs font-black text-[#00334E]">Como registrar as respostas?</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([['manual', 'Digitar'], ['foto', 'Foto da ficha'], ['audio', 'Áudio']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setSourceType(value); setEvidenceFile(null); }} className={`rounded-xl px-2 py-2 text-[10px] font-black ${sourceType === value ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>{label}</button>
          ))}
        </div>
        {sourceType !== "manual" && (
          <div className="mt-3">
            <input
              type="file"
              accept={sourceType === "foto" ? "image/jpeg,image/png,image/webp" : "audio/*"}
              onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
              className="block w-full text-xs font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-[10px] file:font-black file:text-[#123D2C]"
            />
            <button type="button" disabled={!evidenceFile || busy} onClick={() => void processEvidence()} className="mt-2 w-full rounded-xl bg-[#00334E] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40">
              {busy ? "Processando..." : sourceType === "foto" ? "Ler foto e preencher rascunho" : "Transcrever áudio e preencher rascunho"}
            </button>
            <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">A leitura automática cria apenas um rascunho. Revise todas as respostas antes de salvar. Se a IA não estiver configurada, a evidência é guardada e o preenchimento continua manual.</p>
          </div>
        )}
      </section>

      {transcript && (
        <details className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <summary className="cursor-pointer text-xs font-black text-[#00334E]">Ver transcrição do áudio</summary>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{transcript}</p>
        </details>
      )}

      <section className="mt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">Roteiro + ficha unificados</p>
        <h3 className="mt-1 text-lg font-black text-[#00334E]">Etapas do teste</h3>
        <div className="mt-2 grid gap-2">
          {TASKS.map(([key, label], index) => (
            <div key={key} className="rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
              <p className="text-xs font-black leading-5 text-[#00334E]">{index + 1}. {label}</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {([['sozinho', 'Sozinho'], ['com_ajuda', 'Com ajuda'], ['nao_concluiu', 'Não concluiu']] as const).map(([value, textLabel]) => (
                  <button key={value} type="button" onClick={() => setTaskResults((current) => ({ ...current, [key]: value }))} className={`rounded-xl px-1.5 py-2 text-[9px] font-black ${taskResults[key] === value ? "bg-[#123D2C] text-white" : "bg-[#F4FBF7] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>{textLabel}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">Perguntas finais fechadas</p>
        <div className="mt-2 grid gap-3">
          {FINAL_QUESTIONS.map(([key, label, options]) => (
            <label key={key} className="grid gap-1 text-xs font-black text-[#00334E]">
              {label}
              <select value={finalAnswers[key] || ""} onChange={(event) => setFinalAnswers((current) => ({ ...current, [key]: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
                <option value="">Selecione...</option>
                {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
              </select>
            </label>
          ))}
          <label className="grid gap-1 text-xs font-black text-[#00334E]">
            Qual foi a etapa mais difícil?
            <select value={hardestStage} onChange={(event) => setHardestStage(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
              <option value="">Selecione...</option>
              <option value="nenhuma">Nenhuma</option>
              {TASKS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black text-[#00334E]">
            Observações adicionais (opcional)
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Registre algo importante que não ficou representado pelas respostas fechadas." />
          </label>
        </div>
      </section>

      <button type="button" disabled={busy} onClick={() => void saveHomologation()} className="mt-4 w-full rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white shadow disabled:opacity-50">
        {busy ? "Salvando..." : "Revisar concluído — salvar e contabilizar"}
      </button>
    </div>
  );
}
