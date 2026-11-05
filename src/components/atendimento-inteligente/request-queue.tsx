'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { REQUEST_STAGES, type RequestStage } from '@/lib/atendimento-inteligente/intake';
import { AiQuoteEditor } from '@/components/atendimento-inteligente/quote-editor';

type Intake = {
  id: string; organization_id: string; conversation_id: string;
  category: string; description: string; neighborhood: string; urgency: string;
  status: string; created_at: string; customer_name: string | null;
  property_address: string | null; preferred_contact: string | null;
  intake_source: string; contact: { phone: string; display_name: string | null } | null;
};
type Media = { id: string; mimeType: string; name: string; url: string | null };
type Event = { id: string; status: string; note: string | null; created_at: string };
const stamp = (s: string) => new Date(s).toLocaleString('pt-BR');

export function AiRequestQueue({ organizationId, organizationSlug, canManageN2 = false }: { organizationId: string; organizationSlug?: string; canManageN2?: boolean }) {
  const [rows, setRows] = useState<Intake[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [nextStatus, setNextStatus] = useState<RequestStage>('in_review');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = useMemo(() => rows.find(x => x.id === selectedId) ?? rows[0] ?? null, [rows, selectedId]);
  const activeId = active?.id ?? '';
  const loadList = useCallback(async () => {
    if (!organizationId) return;
    const result = await adminFetch<{ requests: Intake[] }>(`/api/atendimento-inteligente/requests?organizationId=${encodeURIComponent(organizationId)}`);
    setRows(result.requests);
  }, [organizationId]);
  useEffect(() => {
    if (!organizationId) return;
    let mounted = true;
    adminFetch<{requests:Intake[]}>(`/api/atendimento-inteligente/requests?organizationId=${encodeURIComponent(organizationId)}`)
      .then(result => { if (mounted) setRows(result.requests); })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : 'Falha ao carregar pedidos.'); });
    return () => { mounted = false; };
  }, [organizationId]);
  useEffect(() => {
    if (!activeId) return;
    let mounted = true;
    Promise.all([
      adminFetch<{ events: Event[] }>(`/api/atendimento-inteligente/requests/${activeId}`),
      adminFetch<{ media: Media[] }>(`/api/atendimento-inteligente/requests/${activeId}/media`),
    ]).then(([h, m]) => { if (mounted) { setEvents(h.events); setMedia(m.media); } })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : 'Não foi possível abrir o pedido.'); });
    return () => { mounted = false; };
  }, [activeId]);
  async function save() {
    if (!active || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await adminFetch(`/api/atendimento-inteligente/requests/${active.id}`, {
        method: 'PATCH', body: JSON.stringify({ status: nextStatus, note }),
      });
      setNotice('Atualização registrada no histórico.'); setNote('');
      await loadList();
      const h = await adminFetch<{ events: Event[] }>(`/api/atendimento-inteligente/requests/${active.id}`);
      setEvents(h.events);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao atualizar pedido.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Fila de pedidos recebidos">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-[#123e50]">Pedidos e triagens</h2><p className="text-xs text-slate-500">Solicitações do site e do atendimento assistido N1, separadas por empresa.</p></div>
      <div className="flex gap-2">{organizationSlug === "reparos-rmc" && <Link href="/solucoes/atendimento-inteligente/rmc/solicitar" className="rounded-lg bg-[#ef8924] px-3 py-2 text-sm font-semibold text-[#1c2933]">+ Registrar N1</Link>}<button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={busy} onClick={() => void loadList().catch(err => setError(err instanceof Error ? err.message : 'Erro'))}>Atualizar</button></div>
    </div>
    {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_1fr]">
      <div className="max-h-[560px] space-y-2 overflow-y-auto">
        {rows.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Nenhum pedido registrado. Use “Registrar N1” para começar o piloto.</p>}
        {rows.map(item => <button type="button" key={item.id}
          onClick={() => { setSelectedId(item.id); setNextStatus('in_review'); setNote(''); setMedia([]); setEvents([]); }}
          className={`w-full rounded-xl border p-3 text-left text-sm ${active?.id === item.id ? 'border-[#2b7386] bg-[#edf7f9]' : 'border-slate-200 hover:bg-slate-50'}`}>
          <span className="block font-bold">{item.customer_name || item.contact?.display_name || 'Cliente'}</span>
          <span className="block text-xs text-slate-700">{item.category} • {item.neighborhood}</span>
          <span className="mt-1 block text-xs text-slate-500">{REQUEST_STAGES[item.status as RequestStage] ?? item.status} • {stamp(item.created_at)}</span>
          {item.intake_source === 'assisted_n1' && <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900">Cadastro assistido N1</span>}
        </button>)}
      </div>
      <article className="min-h-[250px] rounded-xl bg-[#f7fafb] p-4">
        {!active ? <p className="text-sm text-slate-500">Selecione um pedido.</p> : <>
          <div className="flex flex-wrap justify-between gap-2"><h3 className="text-lg font-black">{active.customer_name || active.contact?.display_name}</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{active.urgency === 'alta' ? 'Prioridade alta informada' : 'Prioridade normal'}</span></div>
          <p className="mt-1 text-sm">WhatsApp: <a className="font-bold underline" href={`https://wa.me/${active.contact?.phone ?? ''}`} rel="noopener noreferrer" target="_blank">{active.contact?.phone ?? '—'}</a></p>
          <p className="mt-1 text-sm">{active.neighborhood}{active.property_address ? ` • ${active.property_address}` : ''}</p>
          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm">{active.description}</p>
          <p className="mt-2 text-xs text-slate-500">Fonte: {active.intake_source === 'assisted_n1' ? 'Nível 1 (registro por operador autorizado)' : active.intake_source === 'web_self_service' ? 'Formulário preenchido pelo cliente' : 'WhatsApp Cloud API'} • {stamp(active.created_at)}</p>
          {active.preferred_contact && <p className="mt-2 text-xs text-slate-600">Preferência de contato: {active.preferred_contact}</p>}
          {media.length > 0 && <div className="mt-4"><h4 className="text-sm font-bold">Fotos e vídeos anexados</h4><div className="mt-2 flex flex-wrap gap-2">{media.map(file => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white p-2 text-xs underline">{file.mimeType.startsWith('video/') ? 'Vídeo: ' : 'Foto: '}{file.name}</a> : <span key={file.id} className="text-xs">Arquivo indisponível</span>)}</div><p className="mt-1 text-[11px] text-slate-500">Links privados temporários. Não encaminhe a terceiros sem autorização.</p></div>}
          {canManageN2 ? <div className="mt-5 border-t pt-4"><h4 className="text-sm font-bold">Tratativa do Anderson — N2</h4>
            <label className="mt-3 block text-xs font-semibold" htmlFor="ai-stage">Etapa do pedido</label>
            <select id="ai-stage" value={nextStatus} onChange={e=>setNextStatus(e.target.value as RequestStage)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm">{Object.entries(REQUEST_STAGES).map(([key,text]) => <option key={key} value={key}>{text}</option>)}</select>
            <label className="mt-3 block text-xs font-semibold" htmlFor="ai-note">Observação interna / informação faltante</label>
            <textarea id="ai-note" rows={3} value={note} onChange={e=>setNote(e.target.value)} maxLength={1500} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" placeholder="Ex.: solicitar foto da ligação hidráulica antes de montar orçamento." />
            <button type="button" disabled={busy} onClick={() => void save()} className="mt-2 rounded-lg bg-[#123e50] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Salvando...':'Salvar tratativa N2'}</button>
          </div>
          : <p className="mt-3 text-xs text-slate-600">O nível 1 prepara o pedido. O tratamento técnico e a atualização da etapa são exclusivos do N2.</p>}
          <AiQuoteEditor key={active.id} requestId={active.id} phone={active.contact?.phone || ""} customerName={active.customer_name || active.contact?.display_name || "Cliente"} />
          <div className="mt-5 border-t pt-4"><h4 className="text-sm font-bold">Histórico de decisões</h4><div className="mt-2 max-h-[230px] space-y-2 overflow-y-auto">{events.map(evt=><div key={evt.id} className="rounded-lg bg-white p-2 text-xs"><b>{REQUEST_STAGES[evt.status as RequestStage] ?? evt.status}</b> • {stamp(evt.created_at)}{evt.note && <p className="mt-1 whitespace-pre-wrap text-slate-600">{evt.note}</p>}</div>)}</div></div>
        </>}
      </article>
    </div>
  </section>;
}
