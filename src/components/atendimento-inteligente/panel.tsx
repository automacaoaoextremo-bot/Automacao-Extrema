"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";

type Organization = { id: string; slug: string; name: string; status: string; automation_enabled: boolean; segment: string };
type Contact = { phone: string; display_name: string | null };
type Conversation = { id: string; organization_id: string; contact_id: string; mode: "bot"|"human"|"closed"; stage: string; last_inbound_at: string|null; updated_at: string; contact: Contact|null };
type Message = { id: string; direction: string; message_type: string; body: string|null; media_id: string|null; created_at: string };
type Outbox = { id: string; body: string; source: string; status: string; error: string|null; created_at: string; sent_at: string|null };
type Request = { id: string; category: string; description: string; neighborhood: string; urgency: string; status: string; created_at: string };
type Details = { conversation: Conversation; contact: Contact; messages: Message[]; outbox: Outbox[]; requests: Request[] };
const date = (s: string | null | undefined) => s ? new Date(s).toLocaleString("pt-BR") : "—";
const statusClass = "rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-600";

export default function AeIntelligentPanel() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  // Mantemos os dados associados à empresa/conversa que os originou.
  // Assim, ao alternar empresas, o painel não exibe dados da anterior.
  const [conversationSnapshot, setConversationSnapshot] = useState<{
    organizationId: string;
    items: Conversation[];
  } | null>(null);
  const [selection, setSelection] = useState<{
    organizationId: string;
    conversationId: string;
  } | null>(null);
  const [detailsSnapshot, setDetailsSnapshot] = useState<{
    organizationId: string;
    conversationId: string;
    payload: Details;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const conversations = conversationSnapshot?.organizationId === organizationId
    ? conversationSnapshot.items
    : [];
  const selected = selection?.organizationId === organizationId &&
    conversations.some((conversation) => conversation.id === selection.conversationId)
      ? selection.conversationId
      : (conversations[0]?.id ?? "");
  const details = detailsSnapshot?.organizationId === organizationId &&
    detailsSnapshot.conversationId === selected
      ? detailsSnapshot.payload
      : null;

  useEffect(() => {
    let active = true;
    adminFetch<{ organizations: Organization[] }>("/api/atendimento-inteligente/organizations")
      .then((r) => {
        if (!active) return;
        setOrganizations(r.organizations);
        if (r.organizations[0]) {
          setOrganizationId((current) => current || r.organizations[0].id);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Erro ao listar empresas");
      });
    return () => { active = false; };
  }, []);
  const loadList = useCallback(async () => {
    if (!organizationId) return;
    const r = await adminFetch<{ conversations: Conversation[] }>(`/api/atendimento-inteligente/conversations?organizationId=${encodeURIComponent(organizationId)}`);
    setConversationSnapshot({ organizationId, items: r.conversations });
  }, [organizationId]);

  useEffect(() => {
    // A atualização ocorre somente depois da resposta assíncrona da API.
    // Não há mais reset síncrono de estado dentro do efeito.
    if (!organizationId) return;
    let active = true;
    adminFetch<{ conversations: Conversation[] }>(
      `/api/atendimento-inteligente/conversations?organizationId=${encodeURIComponent(organizationId)}`,
    )
      .then((r) => {
        if (active) setConversationSnapshot({ organizationId, items: r.conversations });
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Erro ao listar conversas");
      });
    return () => { active = false; };
  }, [organizationId]);

  const loadDetails = useCallback(async () => {
    if (!selected) return;
    const r = await adminFetch<Details>(`/api/atendimento-inteligente/conversations/${selected}`);
    setDetailsSnapshot({ organizationId, conversationId: selected, payload: r });
  }, [organizationId, selected]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    adminFetch<Details>(`/api/atendimento-inteligente/conversations/${selected}`)
      .then((r) => {
        if (active) setDetailsSnapshot({ organizationId, conversationId: selected, payload: r });
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Erro ao carregar conversa");
      });
    return () => { active = false; };
  }, [organizationId, selected]);
  async function refresh() { setError(""); setNotice(""); try { await loadList(); await loadDetails(); } catch(e) { setError(e instanceof Error?e.message:"Falha ao atualizar"); } }
  async function setMode(mode: "bot"|"human"|"closed") {
    if (!selected || busy) return;
    if (mode === "bot" && !window.confirm("Reiniciar a triagem automatica desta conversa? O historico sera preservado.")) return;
    setBusy(true); setError("");
    try {
      await adminFetch(`/api/atendimento-inteligente/conversations/${selected}`, { method: "PATCH", body: JSON.stringify({ mode }) });
      setNotice(mode === "bot" ? "Triagem reiniciada" : `Modo atualizado: ${mode}`);
      await loadDetails(); await loadList();
    } catch(e) { setError(e instanceof Error?e.message:"Erro ao atualizar modo"); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!selected || !message.trim() || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await adminFetch<{delivery:{status:string}}>("/api/atendimento-inteligente/send", { method:"POST",body: JSON.stringify({ conversationId:selected,text:message }) });
      setNotice(r.delivery.status === "sent" ? "Mensagem enviada" : `Status: ${r.delivery.status} (sem comprovacao de entrega)`);
      setMessage(""); await loadDetails();
    } catch(e) { setError(e instanceof Error?e.message:"Erro no envio"); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-4 text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-[#00334E]">AE Atendimento Inteligente</h1><p className="text-sm text-slate-500">Triagem por WhatsApp Cloud API • painel multiempresa</p></div>
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50" onClick={() => void refresh()}>Atualizar</button>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <label htmlFor="ae-ai-org" className="font-semibold">Empresa</label>
        <select id="ae-ai-org" className="rounded-lg border p-2" value={organizationId} disabled={busy} onChange={e => { setOrganizationId(e.target.value); setMessage(""); setError(""); setNotice(""); }}>
          {organizations.length === 0 && <option value="">Nenhuma empresa autorizada</option>}
          {organizations.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}
        </select>
        {organizations.find(o => o.id === organizationId) && <span className={statusClass}>Status: {organizations.find(o => o.id === organizationId)?.status} · Bot {organizations.find(o => o.id === organizationId)?.automation_enabled?"ligado":"desligado"}</span>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="rounded-2xl bg-white p-3 shadow-sm" aria-label="Lista de conversas">
          <h2 className="mb-3 px-2 font-bold">Conversas ({conversations.length})</h2>
          <div className="max-h-[660px] space-y-2 overflow-y-auto">
            {conversations.map(c => <button key={c.id} onClick={() => { setSelection({ organizationId, conversationId: c.id }); setMessage(""); setNotice(""); }} className={`w-full rounded-xl border p-3 text-left text-sm ${selected===c.id?"border-[#00A8CC] bg-blue-50":"border-slate-200 hover:bg-slate-50"}`}>
              <span className="block font-bold">{c.contact?.display_name || c.contact?.phone || "Contato"}</span>
              <span className="block text-xs text-slate-500">{c.contact?.phone} · {c.mode} · {c.stage}</span>
              <span className="block text-xs text-slate-400">{date(c.updated_at)}</span>
            </button>)}
            {conversations.length===0 && <p className="p-3 text-sm text-slate-500">Sem conversas. Verifique se o canal esta ativo e o webhook configurado.</p>}
          </div>
        </section>
        <section className="min-h-[350px] rounded-2xl bg-white p-4 shadow-sm" aria-label="Detalhes da conversa">
          {!details && <p className="text-slate-500">Selecione uma conversa.</p>}
          {details && <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div><h2 className="font-bold">{details.contact?.display_name || details.contact?.phone}</h2><p className="text-xs text-slate-500">{details.contact?.phone} · Ultima entrada: {date(details.conversation.last_inbound_at)}</p></div>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => void setMode("human")} className="rounded-lg bg-[#00334E] px-3 py-2 text-xs text-white disabled:opacity-50">Assumir atendimento</button>
                <button disabled={busy} onClick={() => void setMode("bot")} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50">Reiniciar bot</button>
                <button disabled={busy} onClick={() => void setMode("closed")} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50">Encerrar</button>
              </div>
            </div>
            {details.requests.length>0 && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
              <p className="font-semibold">Solicitacoes registradas</p>
              {details.requests.map(r => <p key={r.id} className="mt-2">{r.category} · {r.neighborhood} · urgencia {r.urgency}<span className="block text-slate-600">{r.description}</span></p>)}
            </div>}
            <div className="my-4 max-h-[450px] space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
              {[...details.messages.filter(m=>m.direction==="inbound").map(m=>({...m,kind:"inbound" as const})), ...details.outbox.map(o=>({ ...o,kind:"outbox" as const,message_type:"text",media_id:null, direction:"outbound"}))].sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)).map(m=><div key={`${m.kind}-${m.id}`} className={`max-w-[90%] rounded-xl p-3 text-sm ${m.kind === "outbox"?"ml-auto bg-green-50":"bg-white"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body || `[Anexo recebido: ${m.message_type}]`}</p>
                {m.kind==="inbound" && m.media_id && <p className="mt-1 text-xs text-amber-700">Anexo registrado pelo ID Meta; visualizacao sera implementada em fase posterior.</p>}
                <p className="mt-2 text-xs text-slate-500">{date(m.created_at)} · {m.kind==="outbox"?m.status:"cliente"}</p>
              </div>)}
              {details.messages.length===0 && details.outbox.length===0 && <p className="text-sm text-slate-500">Nenhuma mensagem.</p>}
            </div>
            <label htmlFor="ae-ai-msg" className="text-sm font-semibold">Responder como atendente</label>
            <textarea id="ae-ai-msg" value={message} onChange={e=>setMessage(e.target.value)} rows={3} maxLength={1000} placeholder="Escreva sua resposta..." className="mt-1 w-full rounded-xl border p-3 text-sm" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Envios reais bloqueados em Preview. Fora da janela de atendimento, use um template aprovado (fase futura).</p>
              <button disabled={busy || !message.trim() || details.conversation.mode==="closed"} onClick={() => void send()} className="rounded-xl bg-[#31C16B] px-4 py-2 text-sm font-bold text-[#00334E] disabled:opacity-50">{busy?"Processando...":"Enviar"}</button>
            </div>
          </>}
        </section>
      </div>
    </div>
  );
}
