"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type TaskStatus = "" | "sozinho" | "com_ajuda" | "nao_concluiu";

type Props = {
  api: string;
  loanId: string;
  title?: string;
  onDone: () => void;
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
  ["duvida_inseguranca", "Teve dúvida ou insegurança durante o uso?", [["nao", "Não"], ["pouca", "Pouca"], ["muita", "Muita"]]],
  ["usaria_sozinho", "Usaria o Acervo Vivo novamente sozinho?", [["sim", "Sim"], ["talvez", "Talvez"], ["nao", "Não"]]],
  ["trilhas_ajudaram", "As Trilhas ajudaram na escolha?", [["sim", "Sim"], ["parcialmente", "Parcialmente"], ["nao", "Não"], ["nao_testado", "Não testei"]]],
  ["apoio_humano_claro", "Ficou claro que existe apoio humano?", [["sim", "Sim"], ["parcialmente", "Parcialmente"], ["nao", "Não"]]],
  ["recomendaria", "Recomendaria o Acervo Vivo para outra pessoa?", [["sim", "Sim"], ["talvez", "Talvez"], ["nao", "Não"]]],
] as const;

function blankTasks() {
  return Object.fromEntries(TASKS.map(([key]) => [key, ""])) as Record<string, TaskStatus>;
}

function blankFinalAnswers() {
  return Object.fromEntries(FINAL_QUESTIONS.map(([key]) => [key, ""])) as Record<string, string>;
}

export function AcervoVivoHomologacaoSelfForm({ api, loanId, title, onDone }: Props) {
  const [taskResults, setTaskResults] = useState<Record<string, TaskStatus>>(blankTasks);
  const [finalAnswers, setFinalAnswers] = useState<Record<string, string>>(blankFinalAnswers);
  const [hardestStage, setHardestStage] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (busy) return;

    for (const [key, label] of TASKS) {
      if (!taskResults[key]) {
        setError(`Responda a etapa: ${label}.`);
        return;
      }
    }
    for (const [key, label] of FINAL_QUESTIONS) {
      if (!finalAnswers[key]) {
        setError(`Responda: ${label}`);
        return;
      }
    }
    if (!hardestStage) {
      setError("Informe qual foi a etapa mais difícil ou marque Nenhuma.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token || "";
      if (!token) throw new Error("Sua sessão expirou. Entre novamente no Acervo Vivo para enviar as respostas.");

      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "save-self-homologation",
          loanId,
          taskResults,
          finalAnswers: { ...finalAnswers, etapa_mais_dificil: hardestStage },
          notes,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o teste de uso.");
      onDone();
    } catch (current) {
      setError(current instanceof Error ? current.message : "Não foi possível enviar o teste de uso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="rounded-2xl bg-[#E9F2E7] p-3 text-xs font-bold leading-5 text-[#123D2C] ring-1 ring-[#123D2C]/10">
        <p>Obrigado por ajudar a melhorar o Acervo Vivo{title ? <> após o empréstimo de <strong>{title}</strong></> : null}.</p>
        <p className="mt-1">Marque como cada etapa aconteceu com você. As respostas entram nos mesmos resultados acompanhados pelo Gestor Biblioteca.</p>
      </div>

      {error && <div className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-800 ring-1 ring-red-200">{error}</div>}

      <section className="mt-3 grid gap-2">
        {TASKS.map(([key, label], index) => (
          <div key={key} className="rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
            <p className="text-xs font-black leading-5 text-[#00334E]">{index + 1}. {label}</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {([['sozinho', 'Sozinho'], ['com_ajuda', 'Com ajuda'], ['nao_concluiu', 'Não concluí']] as const).map(([value, labelText]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTaskResults((current) => ({ ...current, [key]: value }))}
                  className={`rounded-xl px-1.5 py-2 text-[9px] font-black ${taskResults[key] === value ? "bg-[#123D2C] text-white" : "bg-[#F4FBF7] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}
                >
                  {labelText}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">Para finalizar</p>
        <div className="mt-2 grid gap-3">
          {FINAL_QUESTIONS.map(([key, label, options]) => (
            <label key={key} className="grid gap-1 text-xs font-black text-[#00334E]">
              {label}
              <select
                value={finalAnswers[key] || ""}
                onChange={(event) => setFinalAnswers((current) => ({ ...current, [key]: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
              >
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
            Observação adicional (opcional)
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="Conte algo que ajude a melhorar o Acervo Vivo." />
          </label>
        </div>
      </section>

      <button type="button" disabled={busy} onClick={() => void submit()} className="mt-4 w-full rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white shadow disabled:opacity-50">
        {busy ? "Enviando..." : "Enviar respostas"}
      </button>
    </div>
  );
}
