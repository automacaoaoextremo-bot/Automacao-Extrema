"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PresencaClientShell } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";
import { supabaseBrowser } from "@/lib/supabase-browser";

type GuestSummary = {
  id: string;
  full_name: string;
  whatsapp: string | null;
  group_name: string | null;
};

type MessageRow = {
  id: string;
  guest_id: string | null;
  message_phase: string;
  channel: string;
  template_label: string | null;
  message_text: string;
  status: string;
  approval_status?: string | null;
  is_active?: boolean | null;
  guest?: GuestSummary | GuestSummary[] | null;
};

type MessageForm = {
  id: string;
  guest_id: string;
  message_phase: string;
  template_label: string;
  message_text: string;
  status: string;
  approval_status: string;
  is_active: boolean;
};

const emptyForm: MessageForm = {
  id: "",
  guest_id: "",
  message_phase: "convite_oficial",
  template_label: "Modelo geral",
  message_text: "",
  status: "rascunho",
  approval_status: "pendente",
  is_active: true,
};

const phaseLabels: Record<string, string> = {
  save_the_date: "Save the Date",
  convite_oficial: "Convite oficial",
  lembrete: "Lembrete carinhoso",
  lembrete_confirmados: "Lembrete para confirmados",
  lembrete_talvez: "Lembrete para talvez",
  lembrete_pendentes: "Lembrete para pendentes",
  prazo_final: "Prazo final",
  orientacao_final: "Orientação final",
  agradecimento: "Agradecimento pós-evento",
  recado_convidado: "Recado do convidado",
};

function getGuest(message: MessageRow) {
  if (Array.isArray(message.guest)) return message.guest[0] ?? null;
  return message.guest ?? null;
}

function messageToForm(message: MessageRow): MessageForm {
  return {
    id: message.id,
    guest_id: message.guest_id ?? "",
    message_phase: message.message_phase,
    template_label: message.template_label ?? "",
    message_text: message.message_text,
    status: message.status,
    approval_status: message.approval_status ?? "pendente",
    is_active: Boolean(message.is_active ?? true),
  };
}

export default function PresencaMensagensPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [form, setForm] = useState<MessageForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [publicApprovalUrl, setPublicApprovalUrl] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function getToken() {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sessão expirada.");
    return token;
  }

  async function loadMessages() {
    const token = await getToken();
    const response = await fetch("/api/presenca-querida/cliente/messages", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar mensagens.");
    setMessages(result.messages ?? []);
    setPublicApprovalUrl(result.publicApprovalUrl ?? "");
  }

  useEffect(() => {
    let active = true;
    window.setTimeout(() => {
      loadMessages()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar mensagens.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
    };
    // Carregamento inicial controlado por sessão Supabase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    return messages.reduce(
      (acc, item) => {
        const isGuestNote = item.message_phase === "recado_convidado";
        if (item.guest_id && isGuestNote) acc.guestNotes += 1;
        if (item.guest_id && !isGuestNote) acc.personalized += 1;
        if (item.approval_status === "aprovado") acc.approved += 1;
        if ((item.approval_status ?? "pendente") === "pendente") acc.pending += 1;
        if (isGuestNote && item.approval_status === "aprovado" && item.is_active !== false) acc.guestNotesPublished += 1;
        if (isGuestNote && (item.approval_status ?? "pendente") === "pendente") acc.guestNotesPending += 1;
        if (item.is_active === false) acc.inactive += 1;
        return acc;
      },
      { personalized: 0, approved: 0, pending: 0, inactive: 0, guestNotes: 0, guestNotesPublished: 0, guestNotesPending: 0 },
    );
  }, [messages]);

  function update<K extends keyof MessageForm>(field: K, value: MessageForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditingMessage(item: MessageRow) {
    const guest = getGuest(item);
    setForm(messageToForm(item));
    setError("");
    setMessage(`Editando mensagem${guest?.full_name ? ` de ${guest.full_name}` : ""}. Faça os ajustes e clique em Salvar alterações.`);
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/presenca-querida/cliente/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar mensagem.");
      setMessage(form.id ? "Mensagem atualizada." : "Mensagem criada.");
      setForm(emptyForm);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar mensagem.");
    } finally {
      setSaving(false);
    }
  }

  async function generateInvitations() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/presenca-querida/cliente/messages/generate-invitations", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível gerar convites.");
      setMessage(`Convites gerados/atualizados: ${result.generated ?? 0} (${result.created ?? 0} novos, ${result.updated ?? 0} atualizados). Preservados por já estarem aprovados: ${result.skippedApproved ?? 0}. Ignorados: ${result.skipped ?? 0}.`);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar convites.");
    } finally {
      setSaving(false);
    }
  }

  async function actionMessage(id: string, action: string, messageText?: string, kindLabel = "Mensagem") {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/presenca-querida/cliente/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action, message_text: messageText }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar mensagem.");
      const successMessage = action === "approve" ? `${kindLabel} aprovado com sucesso.` : action === "reject" ? `${kindLabel} reprovado e mantido fora da LP.` : "Mensagem atualizada.";
      setMessage(successMessage);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar mensagem.");
    } finally {
      setSaving(false);
    }
  }

  async function copyMessageText(text: string, guestName?: string | null) {
    setError("");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const element = document.createElement("textarea");
        element.value = text;
        element.style.position = "fixed";
        element.style.left = "-9999px";
        document.body.appendChild(element);
        element.select();
        document.execCommand("copy");
        document.body.removeChild(element);
      }
      setMessage(`Mensagem${guestName ? ` de ${guestName}` : ""} copiada para enviar no WhatsApp.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível copiar a mensagem.");
    }
  }

  async function copyPublicApprovalUrl() {
    if (!publicApprovalUrl) return;
    setError("");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicApprovalUrl);
      } else {
        const element = document.createElement("textarea");
        element.value = publicApprovalUrl;
        element.style.position = "fixed";
        element.style.left = "-9999px";
        document.body.appendChild(element);
        element.select();
        document.execCommand("copy");
        document.body.removeChild(element);
      }
      setMessage("Link público de acompanhamento copiado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível copiar o link público.");
    }
  }


  async function deleteMessage(id: string) {
    if (!window.confirm("Excluir definitivamente esta mensagem?")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch(`/api/presenca-querida/cliente/messages?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir.");
      setMessage("Mensagem excluída.");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir mensagem.");
    } finally {
      setSaving(false);
    }
  }

  const guestNotes = messages.filter((item) => item.guest_id && item.message_phase === "recado_convidado");
  const personalizedMessages = messages.filter((item) => item.guest_id && item.message_phase !== "recado_convidado");
  const templateMessages = messages.filter((item) => !item.guest_id && item.message_phase !== "recado_convidado");

  return (
    <PresencaClientShell>
      <section className="grid gap-5 xl:grid-cols-[1fr_0.34fr]">
        <div className="grid gap-5">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Mensagens</p>
                <h1 className="mt-2 text-3xl font-black text-[#00334E]">Aprovação de convites e recados</h1>
                <p className="mt-3 max-w-3xl leading-7 text-slate-600">Gere convites personalizados, revise os textos antes de enviar pelo WhatsApp e aprove os recados que podem aparecer na LP. Convites já aprovados são preservados; recados só aparecem publicamente depois de aprovados e ativos.</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <button type="button" onClick={generateInvitations} disabled={saving} className="rounded-2xl bg-[#E85D75] px-4 py-3 text-sm font-black text-white disabled:opacity-60">Gerar convites personalizados</button>
                {publicApprovalUrl && (
                  <button type="button" onClick={copyPublicApprovalUrl} className="rounded-2xl bg-[#00334E] px-4 py-3 text-sm font-black text-white">Copiar link público</button>
                )}
              </div>
            </div>

            {publicApprovalUrl && (
              <div className="mt-4 rounded-2xl bg-[#f4fbf7] p-4 ring-1 ring-emerald-100">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Acompanhamento público</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Link somente leitura para acompanhar as aprovações sem login. Não permite editar, aprovar, reprovar ou excluir.</p>
                <p className="mt-2 break-all rounded-xl bg-white p-3 text-xs font-bold text-[#00334E] ring-1 ring-emerald-100">{publicApprovalUrl}</p>
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Convites</p><p className="text-2xl font-black text-[#00334E]">{totals.personalized}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Aprovados</p><p className="text-2xl font-black text-[#00334E]">{totals.approved}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">Pendentes</p><p className="text-2xl font-black text-[#00334E]">{totals.pending}</p></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Recados</p><p className="text-2xl font-black text-[#00334E]">{totals.guestNotes}</p></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Na LP</p><p className="text-2xl font-black text-[#00334E]">{totals.guestNotesPublished}</p></div>
              <div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Inativas</p><p className="text-2xl font-black text-[#00334E]">{totals.inactive}</p></div>
            </div>
            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}
            {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
          </div>

          <form ref={formRef} onSubmit={onSubmit} className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">{form.id ? "Editar e salvar mensagem" : "Criar modelo de mensagem"}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Fase</span><select value={form.message_phase} onChange={(item) => update("message_phase", item.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">{Object.entries(phaseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Rótulo</span><input value={form.template_label} onChange={(item) => update("template_label", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
            </div>
            <label className="mt-4 grid gap-1"><span className="text-sm font-black text-[#00334E]">Texto</span><textarea value={form.message_text} onChange={(item) => update("message_text", item.target.value)} className="min-h-40 rounded-2xl border border-slate-200 p-3" /></label>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button disabled={saving} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{form.id ? "Salvar alterações" : "Salvar modelo"}</button>{form.id && <button type="button" onClick={() => { setForm(emptyForm); setMessage(""); }} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}</div>
          </form>


          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">Recados para aprovação na LP</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Aqui entram as mensagens enviadas no campo “Curiosidade ou recado para a Daniela”. Somente recados aprovados e ativos aparecem na seção pública “Recados para a Dani”.
            </p>
            <div className="mt-5 grid gap-4">
              {loading && <p className="font-bold text-slate-500">Carregando...</p>}
              {!loading && guestNotes.map((item) => {
                const guest = getGuest(item);
                const approved = item.approval_status === "aprovado";
                const rejected = item.approval_status === "reprovado";
                return (
                  <article key={item.id} className="rounded-3xl bg-[#f4fbf7] p-5 ring-1 ring-emerald-100">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black text-[#00334E]">{guest?.full_name || "Convidado"}</p>
                        <p className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${approved ? "bg-emerald-100 text-emerald-800" : rejected ? "bg-amber-100 text-amber-800" : "bg-white text-slate-500"}`}>
                          {approved ? "Aprovado para LP" : rejected ? "Reprovado / oculto" : "Pendente de aprovação"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${item.is_active === false ? "bg-slate-200 text-slate-600" : "bg-white text-[#00334E]"}`}>{item.is_active === false ? "Inativo" : "Ativo"}</span>
                    </div>
                    <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">{item.message_text}</pre>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditingMessage(item)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#00334E]">Editar texto</button>
                      <button type="button" onClick={() => actionMessage(item.id, approved ? "reject" : "approve", undefined, "Recado")} className={`rounded-xl px-3 py-2 text-sm font-black text-white ${approved ? "bg-amber-600" : "bg-emerald-600"}`}>{approved ? "Retirar da LP" : "Aprovar para LP"}</button>
                      {!approved && <button type="button" onClick={() => actionMessage(item.id, "pending", undefined, "Recado")} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#00334E]">Voltar para pendente</button>}
                      <button type="button" onClick={() => actionMessage(item.id, item.is_active === false ? "activate" : "inactivate", undefined, "Recado")} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#00334E]">{item.is_active === false ? "Ativar" : "Ocultar sem reprovar"}</button>
                      <button type="button" onClick={() => deleteMessage(item.id)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">Excluir</button>
                    </div>
                  </article>
                );
              })}
              {!loading && guestNotes.length === 0 && <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">Nenhum recado de convidado recebido ainda.</p>}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">Convites para aprovação</h2>
            <div className="mt-5 grid gap-4">
              {loading && <p className="font-bold text-slate-500">Carregando...</p>}
              {!loading && personalizedMessages.map((item) => {
                const guest = getGuest(item);
                const approved = item.approval_status === "aprovado";
                return (
                  <article key={item.id} className="rounded-3xl bg-[#fff7f4] p-5 ring-1 ring-rose-100">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black text-[#00334E]">{guest?.full_name || "Convidado"}</p>
                        <p className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${approved ? "bg-emerald-100 text-emerald-800" : item.approval_status === "reprovado" ? "bg-amber-100 text-amber-800" : "bg-white text-slate-500"}`}>
                          {phaseLabels[item.message_phase] || item.message_phase} · {approved ? "Aprovado" : item.approval_status === "reprovado" ? "Reprovado" : "Pendente"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${item.is_active === false ? "bg-slate-200 text-slate-600" : "bg-white text-[#00334E]"}`}>{item.is_active === false ? "Inativa" : "Ativa"}</span>
                    </div>
                    <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">{item.message_text}</pre>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditingMessage(item)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#00334E]">Editar</button>
                      <button type="button" onClick={() => copyMessageText(item.message_text, guest?.full_name)} className="rounded-xl bg-[#00334E] px-3 py-2 text-sm font-black text-white">Copiar WhatsApp</button>
                      <button type="button" onClick={() => actionMessage(item.id, approved ? "reject" : "approve", undefined, "Convite")} className={`rounded-xl px-3 py-2 text-sm font-black text-white ${approved ? "bg-amber-600" : "bg-emerald-600"}`}>{approved ? "Reprovar" : "Aprovar"}</button>
                      {!approved && <button type="button" onClick={() => actionMessage(item.id, "pending", undefined, "Convite")} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#00334E]">Voltar para pendente</button>}
                      <button type="button" onClick={() => actionMessage(item.id, item.is_active === false ? "activate" : "inactivate", undefined, "Convite")} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#00334E]">{item.is_active === false ? "Ativar" : "Inativar"}</button>
                      <button type="button" onClick={() => deleteMessage(item.id)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">Excluir</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">Modelos por fase</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {templateMessages.map((item) => (
                <article key={item.id} className="rounded-2xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                  <h3 className="font-black text-[#00334E]">{item.template_label || phaseLabels[item.message_phase] || item.message_phase}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.message_text}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => startEditingMessage(item)} className="text-sm font-black text-[#00334E] underline">Editar</button><button type="button" onClick={() => copyMessageText(item.message_text)} className="text-sm font-black text-[#00334E] underline">Copiar</button><button type="button" onClick={() => deleteMessage(item.id)} className="text-sm font-black text-red-700 underline">Excluir</button></div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <PresencaContextualHelp title="Deep Dive no convite" href="/solucoes/presenca-querida/cliente/convidados" actionLabel="Revisar convidados">
          <p>O convite e os recados aprovados devem reforçar vínculo, pertencimento e memória afetiva, sem publicar nada automaticamente e sem expor dados privados.</p>
        </PresencaContextualHelp>
      </section>
    </PresencaClientShell>
  );
}
