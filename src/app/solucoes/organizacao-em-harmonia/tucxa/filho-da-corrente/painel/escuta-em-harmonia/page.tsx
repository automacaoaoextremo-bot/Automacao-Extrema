"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PANEL_BASE = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const API = "/api/organizacao-em-harmonia/filhos-corrente/escuta-em-harmonia";

const headerActions: PanelHeaderAction[] = [
  { label: "Início", href: PANEL_BASE },
  { label: "Voltar", href: PANEL_BASE, variant: "primary" },
  filhoSignOutAction,
  filhoSupportAction,
];

type InstitutionalAction = {
  id: string;
  action_type: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: string;
  completion_notes?: string | null;
};

type ListeningRequest = {
  id: string;
  protocol: string;
  anonymous_to_directorate: boolean;
  category: string;
  subject: string;
  message: string;
  status: string;
  due_at: string;
  director_response?: string | null;
  responded_at?: string | null;
  requester_resolution?: string | null;
  requester_feedback?: string | null;
  created_at: string;
  actions?: InstitutionalAction[];
};

type Payload = {
  currentPerson?: { fullName?: string };
  settings?: {
    response_due_days?: number;
    allow_anonymous?: boolean;
    action_followup_enabled?: boolean;
  };
  requests?: ListeningRequest[];
};

const categoryOptions = [
  ["questionamento", "Questionamento"],
  ["sugestao", "Sugestão"],
  ["procedimento", "Procedimento / regra"],
  ["treinamento", "Treinamento / orientação"],
  ["outro", "Outro"],
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    aberto: "Aguardando resposta",
    respondido: "Respondido",
    aguardando_confirmacao: "Aguardando sua confirmação",
    nao_resolvido: "Não resolvido",
    resolvido: "Resolvido",
    encerrado: "Encerrado",
  };
  return labels[value] ?? value;
}

function actionLabel(value: string) {
  const labels: Record<string, string> = {
    plano_acao: "Plano de ação",
    procedimento: "Atualização de procedimento",
    treinamento: "Treinamento / orientação",
    comunicacao: "Comunicação",
    outro: "Outra ação",
  };
  return labels[value] ?? value;
}

export default function EscutaEmHarmoniaFilhoPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [category, setCategory] = useState("questionamento");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(API, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const next = (await response.json().catch(() => ({}))) as Payload & { error?: string };
    if (!response.ok) throw new Error(next.error || "Não foi possível carregar a Escuta em Harmonia.");
    setPayload(next);
  }, []);

  useEffect(() => {
    let active = true;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) {
        window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login");
        return;
      }
      if (!active) return;
      setToken(accessToken);
      try {
        await load(accessToken);
      } catch (currentError) {
        if (active) setError(currentError instanceof Error ? currentError.message : "Erro ao carregar.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTimeMs(Date.now());
    const initialTimer = window.setTimeout(updateCurrentTime, 0);
    const intervalTimer = window.setInterval(updateCurrentTime, 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, []);

  const requests = useMemo(() => payload.requests ?? [], [payload.requests]);
  const dueDays = payload.settings?.response_due_days ?? 5;
  const allowAnonymous = payload.settings?.allow_anonymous !== false;

  async function post(body: Record<string, unknown>) {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; request?: { protocol?: string } };
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
    return result;
  }

  async function submitQuestion(event: FormEvent) {
    event.preventDefault();
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await post({ action: "create", category, subject, message, anonymous });
      setSubject("");
      setMessage("");
      setAnonymous(false);
      setSuccess(`Questionamento registrado${result.request?.protocol ? ` — protocolo ${result.request.protocol}` : ""}.`);
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao enviar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmResolution(requestId: string, resolution: "resolvido" | "nao_resolvido") {
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await post({
        action: "confirm-resolution",
        requestId,
        resolution,
        feedback: feedbackById[requestId] || "",
      });
      setSuccess(
        resolution === "resolvido"
          ? "Obrigado. A resposta foi marcada como resolvida."
          : "Registrado. A Diretoria poderá complementar a resposta e/ou criar ações de acompanhamento.",
      );
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao confirmar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader actions={headerActions} mobileActionColumns={4} />

      <section className="mx-auto grid max-w-5xl gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <header className="rounded-[1.75rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs">Escuta em Harmonia</p>
          <h1 className="mt-2 text-3xl font-black">Uma pergunta não deve se perder no caminho.</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base">
            Envie um questionamento ou sugestão para a Diretoria, acompanhe o prazo de resposta e diga depois se a orientação resolveu. Quando o assunto revelar uma melhoria necessária, a Diretoria pode registrar o plano de ação correspondente.
          </p>
        </header>

        <section className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Novo questionamento</p>
              <h2 className="mt-1 text-xl font-black text-[#123D2C]">Fale com a Diretoria</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Prazo configurado de resposta: <strong>{dueDays} dia{dueDays === 1 ? "" : "s"}</strong>. O protocolo permite acompanhar o andamento sem depender de mensagens soltas.
              </p>
            </div>
            {allowAnonymous && (
              <span className="rounded-full bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C]">Pode ser anônimo</span>
            )}
          </div>

          <form onSubmit={submitQuestion} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Tipo
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 font-semibold text-slate-700">
                {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Assunto
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} required className="rounded-xl border border-slate-200 px-3 py-3 font-semibold text-slate-700" placeholder="Ex.: dúvida sobre um procedimento" />
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              O que você gostaria de perguntar ou sugerir?
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={4000} required rows={5} className="rounded-xl border border-slate-200 px-3 py-3 font-semibold leading-6 text-slate-700" placeholder="Descreva com suas palavras. Não registre detalhes sigilosos de atendimentos espirituais." />
            </label>
            {allowAnonymous && (
              <label className="flex items-start gap-3 rounded-xl bg-[#F7FAF2] p-3 text-sm font-semibold leading-5 text-slate-700 ring-1 ring-[#123D2C]/10">
                <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="mt-1 h-4 w-4" />
                <span>
                  <strong className="text-[#123D2C]">Enviar de forma anônima para a Diretoria.</strong><br />
                  O sistema mantém apenas o vínculo técnico necessário para que você acompanhe a resposta; seu nome, e-mail e WhatsApp não são mostrados à Diretoria nesse chamado.
                </span>
              </label>
            )}
            <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">
              {saving ? "Enviando..." : "Enviar e gerar protocolo"}
            </button>
          </form>
        </section>

        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-200">{error}</p>}
        {success && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">{success}</p>}

        <section className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Acompanhar</p>
          <h2 className="mt-1 text-xl font-black text-[#123D2C]">Meus questionamentos</h2>

          {loading ? (
            <p className="mt-4 text-sm font-semibold text-slate-600">Carregando...</p>
          ) : requests.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[#F7FAF2] p-4 text-sm font-semibold text-slate-600">Você ainda não enviou nenhum questionamento.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {requests.map((item) => {
                const overdue = currentTimeMs !== null
                  && !["resolvido", "encerrado"].includes(item.status)
                  && new Date(item.due_at).getTime() < currentTimeMs
                  && !item.responded_at;
                const canConfirm = Boolean(item.director_response) && !item.requester_resolution;
                return (
                  <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">{item.protocol}</p>
                        <h3 className="mt-1 text-lg font-black text-[#123D2C]">{item.subject}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${overdue ? "bg-red-100 text-red-700" : "bg-white text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>
                        {overdue ? "Prazo vencido" : statusLabel(item.status)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-4">
                      <span>Enviado: {formatDate(item.created_at)}</span>
                      <span>Prazo: {formatDate(item.due_at)}</span>
                      <span>{item.anonymous_to_directorate ? "Anônimo" : "Identificado"}</span>
                      <span>{categoryOptions.find(([value]) => value === item.category)?.[1] ?? item.category}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>

                    {item.director_response && (
                      <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-[#123D2C]/10">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Resposta da Diretoria</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{item.director_response}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">Respondido em {formatDate(item.responded_at)}</p>
                      </div>
                    )}

                    {canConfirm && (
                      <div className="mt-3 rounded-xl border border-dashed border-[#123D2C]/30 bg-white p-3">
                        <p className="text-sm font-black text-[#123D2C]">A resposta resolveu seu questionamento?</p>
                        <textarea value={feedbackById[item.id] || ""} onChange={(event) => setFeedbackById((current) => ({ ...current, [item.id]: event.target.value }))} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Comentário opcional" />
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button type="button" disabled={saving} onClick={() => void confirmResolution(item.id, "resolvido")} className="rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white disabled:opacity-50">Sim, resolveu</button>
                          <button type="button" disabled={saving} onClick={() => void confirmResolution(item.id, "nao_resolvido")} className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-900 disabled:opacity-50">Ainda não</button>
                        </div>
                      </div>
                    )}

                    {(item.actions?.length ?? 0) > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Ações geradas a partir deste assunto</p>
                        <div className="mt-2 grid gap-2">
                          {item.actions?.map((action) => (
                            <div key={action.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200">
                              <div className="flex flex-wrap justify-between gap-2">
                                <strong className="text-[#123D2C]">{action.title}</strong>
                                <span className="text-xs font-black text-slate-500">{action.status.replaceAll("_", " ")}</span>
                              </div>
                              <p className="mt-1 text-xs font-bold text-[#2F6B43]">{actionLabel(action.action_type)}{action.due_date ? ` • prazo ${new Date(`${action.due_date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p>
                              {action.description && <p className="mt-2 leading-5 text-slate-600">{action.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
