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
type ServiceItem = {id:string;position:number;category:string;description:string;answers:Record<string,string>};
const stamp = (s: string) => new Date(s).toLocaleString('pt-BR');

export function AiRequestQueue({ organizationId, organizationSlug, canManageN2 = false }: { organizationId: string; organizationSlug?: string; canManageN2?: boolean }) {
  const [rows, setRows] = useState<Intake[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [serviceItems,setServiceItems]=useState<ServiceItem[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [statusDraft,setStatusDraft]=useState<{requestId:string;value:RequestStage}|null>(null);
  const [note, setNote] = useState('');
  const [statusFilter,setStatusFilter]=useState('all');
  const [sortOrder,setSortOrder]=useState('newest');
  const [page,setPage]=useState(1);
  const [mobileView,setMobileView]=useState<'list'|'detail'>('list');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const visibleRows=useMemo(()=>{
    const filtered=rows.filter(x=>statusFilter==='all'||x.status===statusFilter);
    return [...filtered].sort((a,b)=>{
      if(sortOrder==='priority')return (a.urgency==='alta'?-1:1)-(b.urgency==='alta'?-1:1) || Date.parse(b.created_at)-Date.parse(a.created_at);
      return sortOrder==='oldest'?Date.parse(a.created_at)-Date.parse(b.created_at):Date.parse(b.created_at)-Date.parse(a.created_at);
    });
  },[rows,statusFilter,sortOrder]);
  const pageSize=8;
  const pages=Math.max(1,Math.ceil(visibleRows.length/pageSize));
  const currentPage=Math.min(page,pages);
  const pageRows=useMemo(()=>visibleRows.slice((currentPage-1)*pageSize,currentPage*pageSize),[visibleRows,currentPage]);
  const active = useMemo(() => pageRows.find(x => x.id === selectedId) ?? pageRows[0] ?? null, [pageRows, selectedId]);
  const activeId = active?.id ?? '';
  const nextStatus:RequestStage = statusDraft?.requestId===activeId ? statusDraft.value : ((active?.status ?? 'in_review') as RequestStage);
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
      adminFetch<{ events: Event[];items:ServiceItem[] }>(`/api/atendimento-inteligente/requests/${activeId}`),
      adminFetch<{ media: Media[] }>(`/api/atendimento-inteligente/requests/${activeId}/media`),
    ]).then(([h, m]) => { if (mounted) { setEvents(h.events);setServiceItems(h.items??[]);setMedia(m.media); } })
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
      const h = await adminFetch<{ events: Event[];items:ServiceItem[] }>(`/api/atendimento-inteligente/requests/${active.id}`);
      setEvents(h.events);setServiceItems(h.items??[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao atualizar pedido.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Fila de pedidos recebidos">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-[#123e50]">Pedidos e atendimentos</h2><p className="text-xs text-slate-500">Solicitações do site e do atendimento assistido N1, separadas por empresa.</p></div>
      <div className="flex gap-2">{organizationSlug === "reparos-rmc" && <Link href="/solucoes/atendimento-inteligente/rmc/solicitar" className="rounded-lg bg-[#ef8924] px-3 py-2 text-sm font-semibold text-[#1c2933]">+ Registrar N1</Link>}<button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={busy} onClick={() => void loadList().catch(err => setError(err instanceof Error ? err.message : 'Erro'))}>Atualizar</button></div>
    </div>
    {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="mb-4 grid gap-2 sm:grid-cols-2">
      <label className="text-xs font-semibold">Filtrar por status
        <select className="mt-1 w-full rounded-lg border p-2" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);setMobileView('list');}}>
          <option value="all">Todos os status</option>
          {Object.entries(REQUEST_STAGES).map(([value,text])=><option key={value} value={value}>{text}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold">Ordenar pedidos
        <select className="mt-1 w-full rounded-lg border p-2" value={sortOrder} onChange={e=>{setSortOrder(e.target.value);setPage(1);}}>
          <option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="priority">Prioridade alta primeiro</option>
        </select>
      </label>
    </div>
    <div className="mb-3 flex gap-2 lg:hidden" role="group" aria-label="Visualizacao do atendimento">
      <button type="button" className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${mobileView==='list'?'bg-[#143e31] text-white':''}`} onClick={()=>setMobileView('list')}>Lista de pedidos</button>
      <button type="button" className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold ${mobileView==='detail'?'bg-[#143e31] text-white':''}`} onClick={()=>setMobileView('detail')} disabled={!active}>Detalhes</button>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_1fr]">
      <div className={`${mobileView==='detail'?'hidden lg:block':''} max-h-[62svh] space-y-2 overflow-y-auto lg:max-h-[560px]`}>

        {visibleRows.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Nenhum pedido registrado. Use “Registrar N1” para começar o piloto.</p>}
        {pageRows.map(item => <button type="button" key={item.id}
          onClick={() => { setSelectedId(item.id);setMobileView('detail');setStatusDraft(null);setNote('');setMedia([]);setEvents([]);setServiceItems([]); }}
          className={`w-full rounded-xl border p-3 text-left text-sm ${active?.id === item.id ? 'border-[#2b7386] bg-[#edf7f9]' : 'border-slate-200 hover:bg-slate-50'}`}>
          <span className="block font-bold">{item.customer_name || item.contact?.display_name || 'Cliente'}</span>
          <span className="block text-xs text-slate-700">{item.category} • {item.neighborhood}</span>
          <span className="mt-1 block text-xs text-slate-500">{REQUEST_STAGES[item.status as RequestStage] ?? item.status} • {stamp(item.created_at)}</span>
          {item.intake_source === 'assisted_n1' && <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900">Cadastro assistido</span>}
        </button>)}
        {visibleRows.length>pageSize&&<div className="flex items-center justify-between gap-2 border-t pt-3 text-xs">
          <button type="button" disabled={currentPage<=1} onClick={()=>{setPage(p=>Math.max(1,p-1));setSelectedId('');}} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button>
          <span>Página {currentPage} de {pages} · {visibleRows.length} pedidos</span>
          <button type="button" disabled={currentPage>=pages} onClick={()=>{setPage(p=>Math.min(pages,p+1));setSelectedId('');}} className="rounded-lg border px-3 py-2 disabled:opacity-40">Próxima</button>
        </div>}
      </div>
      <article className={`${mobileView==='list'?'hidden lg:block':''} min-h-[250px] max-h-[72svh] overflow-y-auto rounded-xl bg-[#f7fafb] p-4 lg:max-h-none`}>

        {!active ? <p className="text-sm text-slate-500">Selecione um pedido.</p> : <>
          <div className="flex flex-wrap justify-between gap-2"><h3 className="text-lg font-black">{active.customer_name || active.contact?.display_name}</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{active.urgency === 'alta' ? 'Prioridade alta informada' : 'Prioridade normal'}</span></div>
          <p className="mt-1 text-sm">WhatsApp: <a className="font-bold underline" href={`https://wa.me/${active.contact?.phone ?? ''}`} rel="noopener noreferrer" target="_blank">{active.contact?.phone ?? '—'}</a></p>
          <p className="mt-1 text-sm">{active.neighborhood}{active.property_address ? ` • ${active.property_address}` : ''}</p>
          {serviceItems.length>0?<div className="mt-3 space-y-2">{serviceItems.map(s=><div key={s.id} className="rounded-xl bg-white p-3 text-sm">
            <b>{s.position}. {s.category}</b><p className="mt-1 whitespace-pre-wrap">{s.description}</p>
            {s.answers?.specific&&<p className="mt-1 text-xs text-slate-600">Detalhes: {s.answers.specific}</p>}
          </div>)}</div>:<p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm">{active.description}</p>}
          <p className="mt-2 text-xs text-slate-500">Fonte: {active.intake_source === 'assisted_n1' ? 'Registro assistido pela equipe' : active.intake_source === 'web_self_service' ? 'Formulário preenchido pelo cliente' : 'WhatsApp Cloud API'} • {stamp(active.created_at)}</p>
          {active.preferred_contact && <p className="mt-2 text-xs text-slate-600">Preferência de contato: {active.preferred_contact}</p>}
          {media.length > 0 && <div className="mt-4"><h4 className="text-sm font-bold">Fotos e vídeos anexados</h4><div className="mt-2 flex flex-wrap gap-2">{media.map(file => file.url ? <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-white p-2 text-xs underline">{file.mimeType.startsWith('video/') ? 'Vídeo: ' : 'Foto: '}{file.name}</a> : <span key={file.id} className="text-xs">Arquivo indisponível</span>)}</div><p className="mt-1 text-[11px] text-slate-500">Links privados temporários. Não encaminhe a terceiros sem autorização.</p></div>}
          {canManageN2 ? <div className="mt-5 border-t pt-4"><h4 className="text-sm font-bold">Análise e andamento do pedido</h4>
            <label className="mt-3 block text-xs font-semibold" htmlFor="ai-stage">Etapa do pedido</label>
            <select id="ai-stage" value={nextStatus} onChange={e=>setStatusDraft({requestId:activeId,value:e.target.value as RequestStage})} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm">{Object.entries(REQUEST_STAGES).map(([key,text]) => <option key={key} value={key}>{text}</option>)}</select>
            <label className="mt-3 block text-xs font-semibold" htmlFor="ai-note">Observação interna / informação faltante</label>
            <textarea id="ai-note" rows={3} value={note} onChange={e=>setNote(e.target.value)} maxLength={1500} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" placeholder="Ex.: solicitar foto da ligação hidráulica antes de montar orçamento." />
            <button type="button" disabled={busy} onClick={() => void save()} className="mt-2 rounded-lg bg-[#123e50] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Salvando...':'Salvar tratativa N2'}</button>
          </div>
          : <p className="mt-3 text-xs text-slate-600">O registro do pedido é realizado pela equipe. A atualização técnica é restrita ao responsável autorizado.</p>}
          <AiQuoteEditor key={active.id} requestId={active.id} phone={active.contact?.phone || ""} customerName={active.customer_name || active.contact?.display_name || "Cliente"} />
          <div className="mt-5 border-t pt-4"><h4 className="text-sm font-bold">Histórico de decisões</h4><div className="mt-2 max-h-[230px] space-y-2 overflow-y-auto">{events.map(evt=><div key={evt.id} className="rounded-lg bg-white p-2 text-xs"><b>{REQUEST_STAGES[evt.status as RequestStage] ?? evt.status}</b> • {stamp(evt.created_at)}{evt.note && <p className="mt-1 whitespace-pre-wrap text-slate-600">{evt.note}</p>}</div>)}</div></div>
        </>}
      </article>
    </div>
  </section>;
}
