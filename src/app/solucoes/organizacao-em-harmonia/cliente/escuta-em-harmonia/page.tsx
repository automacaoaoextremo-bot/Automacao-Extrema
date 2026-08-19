"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/cliente/escuta-em-harmonia";

type ActionRow = {
  id: string;
  request_id: string;
  action_type: string;
  title: string;
  description?: string | null;
  responsible_person_id?: string | null;
  due_date?: string | null;
  status: string;
  completion_notes?: string | null;
};

type RequestRow = {
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
  requester_confirmed_at?: string | null;
  created_at: string;
  requesterName: string;
  requesterEmail: string;
  requesterWhatsapp: string;
  actions: ActionRow[];
};

type Person = { id: string; full_name?: string | null };

type Payload = {
  settings?: {
    response_due_days?: number;
    action_followup_enabled?: boolean;
    allow_anonymous?: boolean;
  };
  requests?: RequestRow[];
  people?: Person[];
};

const actionOptions = [
  ["plano_acao", "Plano de ação"],
  ["procedimento", "Atualizar procedimento"],
  ["treinamento", "Prover treinamento / orientação"],
  ["comunicacao", "Realizar comunicação"],
  ["outro", "Outra ação"],
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
    aguardando_confirmacao: "Aguardando confirmação",
    nao_resolvido: "Não resolvido",
    resolvido: "Resolvido",
    encerrado: "Encerrado",
  };
  return labels[value] ?? value;
}

export default function EscutaEmHarmoniaGestaoPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("abertos");
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [dueDays, setDueDays] = useState(5);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [actionType, setActionType] = useState("plano_acao");
  const [actionTitle, setActionTitle] = useState("");
  const [actionDescription, setActionDescription] = useState("");
  const [actionResponsible, setActionResponsible] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(API, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const next = (await response.json().catch(() => ({}))) as Payload & { error?: string };
    if (!response.ok) throw new Error(next.error || "Não foi possível carregar a Escuta em Harmonia.");
    setPayload(next);
    setDueDays(next.settings?.response_due_days ?? 5);
    setAllowAnonymous(next.settings?.allow_anonymous !== false);
    setSelectedId((current) => current || next.requests?.[0]?.id || "");
  }, []);

  useEffect(() => {
    let active = true;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!accessToken) return;
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
  const people = useMemo(() => payload.people ?? [], [payload.people]);
  const selected = useMemo(() => requests.find((item) => item.id === selectedId) ?? null, [requests, selectedId]);

  const metrics = useMemo(() => ({
    open: requests.filter((item) => ["aberto", "nao_resolvido"].includes(item.status)).length,
    overdue: currentTimeMs === null
      ? 0
      : requests.filter((item) => !item.responded_at && new Date(item.due_at).getTime() < currentTimeMs).length,
    waiting: requests.filter((item) => item.status === "aguardando_confirmacao").length,
    resolved: requests.filter((item) => ["resolvido", "encerrado"].includes(item.status)).length,
  }), [currentTimeMs, requests]);

  const visibleRequests = useMemo(() => {
    if (filter === "todos") return requests;
    if (filter === "atrasados") {
      if (currentTimeMs === null) return [];
      return requests.filter((item) => !item.responded_at && new Date(item.due_at).getTime() < currentTimeMs);
    }
    if (filter === "resolvidos") return requests.filter((item) => ["resolvido", "encerrado"].includes(item.status));
    return requests.filter((item) => !["resolvido", "encerrado"].includes(item.status));
  }, [currentTimeMs, filter, requests]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
  }

  async function run(body: Record<string, unknown>, message: string) {
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await post(body);
      setSuccess(message);
      await load(token);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await run(
      { action: "update-settings", responseDueDays: dueDays, allowAnonymous, actionFollowupEnabled: true },
      "Prazo e regras da Escuta em Harmonia atualizados.",
    );
  }

  async function sendResponse(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    await run(
      { action: "respond", requestId: selected.id, response: responseText },
      "Resposta registrada. Agora o solicitante poderá dizer se o questionamento foi resolvido.",
    );
    setResponseText("");
  }

  async function createAction(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    await run(
      {
        action: "create-action",
        requestId: selected.id,
        actionType,
        title: actionTitle,
        description: actionDescription,
        responsiblePersonId: actionResponsible,
        dueDate: actionDueDate,
      },
      "Ação institucional criada e vinculada ao questionamento.",
    );
    setActionTitle("");
    setActionDescription("");
    setActionResponsible("");
    setActionDueDate("");
  }

  return (
    <OrganizacaoClientShell
      title="Escuta em Harmonia"
      description="Não é apenas um SAC: o ciclo termina quando o Filho da Corrente confirma se a resposta resolveu e, quando necessário, a Diretoria transforma o aprendizado em plano de ação, procedimento, treinamento ou comunicação."
    >
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Aguardando", metrics.open],
          ["Prazo vencido", metrics.overdue],
          ["Aguardando confirmação", metrics.waiting],
          ["Resolvidos", metrics.resolved],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">{label}</p>
            <p className="mt-2 text-3xl font-black text-[#00334E]">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
        <form onSubmit={saveSettings} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1 text-sm font-black text-[#00334E]">
            Prazo de resposta da Diretoria (dias corridos)
            <input type="number" min={1} max={90} value={dueDays} onChange={(event) => setDueDays(Number(event.target.value))} className="rounded-xl border border-slate-200 px-3 py-3" />
          </label>
          <label className="flex min-h-12 flex-1 items-center gap-2 rounded-xl bg-[#F4FBF7] px-3 text-sm font-bold text-slate-700 ring-1 ring-[#2F6B43]/10">
            <input type="checkbox" checked={allowAnonymous} onChange={(event) => setAllowAnonymous(event.target.checked)} />
            Permitir envio anônimo para a Diretoria
          </label>
          <button disabled={saving} className="rounded-xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-50">Salvar regras</button>
        </form>
      </section>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-200">{error}</p>}
      {success && <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">{success}</p>}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black text-[#00334E]">Questionamentos</h2>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
              <option value="abertos">Em acompanhamento</option>
              <option value="atrasados">Prazo vencido</option>
              <option value="resolvidos">Resolvidos</option>
              <option value="todos">Todos</option>
            </select>
          </div>

          {loading ? <p className="mt-4 text-sm font-semibold text-slate-500">Carregando...</p> : (
            <div className="mt-4 grid gap-2">
              {visibleRequests.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum registro neste filtro.</p>}
              {visibleRequests.map((item) => {
                const overdue = currentTimeMs !== null
                  && !item.responded_at
                  && new Date(item.due_at).getTime() < currentTimeMs;
                return (
                  <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setResponseText(item.director_response || ""); }} className={`rounded-2xl p-4 text-left ring-1 transition ${selectedId === item.id ? "bg-[#E8F6ED] ring-[#2F6B43]/30" : "bg-white ring-slate-200 hover:bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">{item.protocol}</span>
                      {overdue && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">Atrasado</span>}
                    </div>
                    <p className="mt-1 font-black text-[#00334E]">{item.subject}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.requesterName} • {statusLabel(item.status)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow ring-1 ring-slate-100 sm:p-5">
          {!selected ? (
            <p className="text-sm font-semibold text-slate-500">Selecione um questionamento para acompanhar.</p>
          ) : (
            <div className="grid gap-4">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">{selected.protocol}</p>
                    <h2 className="mt-1 text-2xl font-black text-[#00334E]">{selected.subject}</h2>
                  </div>
                  <span className="rounded-full bg-[#F4FBF7] px-3 py-2 text-xs font-black text-[#2F6B43] ring-1 ring-[#2F6B43]/10">{statusLabel(selected.status)}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-slate-500">Solicitante: {selected.requesterName}{selected.anonymous_to_directorate ? " — identidade protegida" : ""}</p>
                {!selected.anonymous_to_directorate && (selected.requesterEmail || selected.requesterWhatsapp) && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">{[selected.requesterWhatsapp, selected.requesterEmail].filter(Boolean).join(" • ")}</p>
                )}
                <p className="mt-1 text-xs font-semibold text-slate-500">Recebido: {formatDate(selected.created_at)} • Prazo: {formatDate(selected.due_at)}</p>
                <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[#F7FAF2] p-4 text-sm font-semibold leading-6 text-slate-700">{selected.message}</p>
              </div>

              <form onSubmit={sendResponse} className="rounded-2xl border border-dashed border-[#2F6B43]/30 p-4">
                <p className="text-sm font-black text-[#00334E]">Resposta da Diretoria</p>
                <textarea value={responseText} onChange={(event) => setResponseText(event.target.value)} rows={5} minLength={3} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6" placeholder="Responda de forma clara e orientada ao próximo passo." />
                <button disabled={saving} className="mt-2 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50">Registrar resposta</button>
              </form>

              {selected.requester_resolution && (
                <div className={`rounded-2xl p-4 ring-1 ${selected.requester_resolution === "resolvido" ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}>
                  <p className="text-sm font-black">Retorno do solicitante: {selected.requester_resolution === "resolvido" ? "a resposta resolveu" : "a resposta ainda não resolveu"}.</p>
                  {selected.requester_feedback && <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{selected.requester_feedback}</p>}
                </div>
              )}

              <section className="rounded-2xl bg-[#F4FBF7] p-4 ring-1 ring-[#2F6B43]/10">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Transformar escuta em melhoria</p>
                <h3 className="mt-1 text-lg font-black text-[#00334E]">Ações institucionais</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Mesmo quando a resposta resolve a dúvida, avalie se o assunto indica necessidade de plano de ação, revisão de procedimento, treinamento ou comunicação para evitar recorrência.</p>

                {(selected.actions?.length ?? 0) > 0 && (
                  <div className="mt-3 grid gap-2">
                    {selected.actions.map((item) => (
                      <article key={item.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-black text-[#00334E]">{item.title}</p>
                            <p className="text-xs font-bold text-[#2F6B43]">{actionOptions.find(([value]) => value === item.action_type)?.[1] ?? item.action_type}{item.due_date ? ` • ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p>
                          </div>
                          <select value={item.status} disabled={saving} onChange={(event) => void run({ action: "update-action", actionId: item.id, status: event.target.value, completionNotes: completionNotes[item.id] || item.completion_notes || "" }, "Ação atualizada.")} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold">
                            <option value="planejada">Planejada</option>
                            <option value="em_andamento">Em andamento</option>
                            <option value="concluida">Concluída</option>
                            <option value="cancelada">Cancelada</option>
                          </select>
                        </div>
                        {item.description && <p className="mt-2 text-sm leading-5 text-slate-600">{item.description}</p>}
                        <textarea value={completionNotes[item.id] ?? item.completion_notes ?? ""} onChange={(event) => setCompletionNotes((current) => ({ ...current, [item.id]: event.target.value }))} rows={2} className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs" placeholder="Observação de andamento/conclusão" />
                      </article>
                    ))}
                  </div>
                )}

                <form onSubmit={createAction} className="mt-4 grid gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-black text-[#00334E]">Tipo de ação
                    <select value={actionType} onChange={(event) => setActionType(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
                      {actionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#00334E]">Responsável
                    <select value={actionResponsible} onChange={(event) => setActionResponsible(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
                      <option value="">A definir</option>
                      {people.map((person) => <option key={person.id} value={person.id}>{person.full_name || "Pessoa"}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#00334E] sm:col-span-2">Título
                    <input value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} required minLength={3} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="Ex.: revisar procedimento de entrada" />
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#00334E] sm:col-span-2">Descrição
                    <textarea value={actionDescription} onChange={(event) => setActionDescription(event.target.value)} rows={2} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" />
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#00334E]">Prazo
                    <input type="date" value={actionDueDate} onChange={(event) => setActionDueDate(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" />
                  </label>
                  <button disabled={saving} className="self-end rounded-lg bg-[#2F6B43] px-3 py-2 text-sm font-black text-white disabled:opacity-50">Criar ação</button>
                </form>
              </section>
            </div>
          )}
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}
