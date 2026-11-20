'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

type Quote = {
  id:string;summary:string; materials_cents:number; labor_cents:number; other_cents:number;
  total_cents:number;valid_until:string;proposed_dates:string[];chosen_date:string|null;
  status:'draft'|'sent'|'accepted'|'declined'|'expired'|'superseded';sent_at:string|null;reminder_sent_at:string|null;
};
type Response = { quote: Quote|null;canManage:boolean;settings:{default_validity_days:number;reminder_hours:number} };
const money=(c:number) => (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const toCents=(v:string) => Math.round(Number(v || '0')*100);
const datePt=(d:string) => d.split('-').reverse().join('/');
const api=(id:string)=>`/api/atendimento-inteligente/requests/${id}/quote`;
function whatsapp(phone:string,text:string) {
  const digits=phone.replace(/\D/g,'');
  if(!/^55\d{10,11}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
export function AiQuoteEditor({requestId,phone,customerName}:{requestId:string;phone:string;customerName:string}) {
  const [data,setData]=useState<Response|null>(null);
  const [summary,setSummary]=useState('');
  const [materials,setMaterials]=useState('0.00');
  const [labor,setLabor]=useState('0.00');
  const [other,setOther]=useState('0.00');
  const [validity,setValidity]=useState(7);
  const [dates,setDates]=useState(['','','']);
  const [chosen,setChosen]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  // O relogio e atualizado fora do render para respeitar react-hooks/purity.
  const [now,setNow]=useState<number|null>(null);
  useEffect(()=>{
    const updateClock=()=>setNow(Date.now());
    const initialTimer=window.setTimeout(updateClock,0);
    const intervalTimer=window.setInterval(updateClock,30_000);
    return ()=>{
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  },[]);
  const load=useCallback(async()=> {
    const result=await adminFetch<Response>(api(requestId));setData(result);
    if(result.settings) setValidity(result.settings.default_validity_days);
  },[requestId]);
  useEffect(()=>{
    let active=true;
    adminFetch<Response>(api(requestId)).then(r=>{if(active){setData(r);setValidity(r.settings.default_validity_days);}})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:'Falha ao consultar orçamentos.');});
    return ()=>{active=false;};
  },[requestId]);
  async function save() {
    setBusy(true);setError('');setNotice('');
    try {
      const submittedDates=dates.filter(Boolean);
      if(submittedDates.length<2||submittedDates.length>3||new Set(submittedDates).size!==submittedDates.length)
        throw new Error('Informe duas ou três datas diferentes.');
      const cents=[materials,labor,other].map(toCents);
      if(cents.some(x=>!Number.isSafeInteger(x)||x<0))throw new Error('Informe valores não negativos válidos.');
      await adminFetch(api(requestId),{method:'POST',body:JSON.stringify({summary,materialsCents:cents[0],laborCents:cents[1],otherCents:cents[2],validityDays:validity,dates:submittedDates})});
      setNotice('Minuta salva. Nenhuma mensagem foi enviada. Confira os dados e abra o WhatsApp quando estiver pronto.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar orçamento.');}
    finally{setBusy(false);}
  }
  async function action(kind:'sent'|'accepted'|'declined'|'expired'|'reminded'|'settings') {
    const q=data?.quote;
    if(kind!=='settings'&&!q)return;
    const confirmation=kind==='sent'?'Você realmente enviou a mensagem no WhatsApp Business? Abrir o link não comprova envio.':
      kind==='accepted'?'O cliente confirmou o aceite e a data escolhida diretamente com você?':
      kind==='reminded'?'Você enviou manualmente o lembrete ao cliente?':
      kind==='settings'?'Salvar a validade padrão para os próximos orçamentos desta empresa?':'Confirmar mudança de status?';
    if(!window.confirm(confirmation))return;
    setBusy(true);setError('');setNotice('');
    try {
      await adminFetch(api(requestId),{method:'PATCH',body:JSON.stringify({action:kind,quoteId:q?.id,chosenDate:chosen||null,defaultValidityDays:validity})});
      setNotice('Registro atualizado.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Falha ao atualizar orçamento.');}
    finally{setBusy(false);}
  }
  const q=data?.quote;
  const expires=q?Date.parse(q.valid_until):0;
  const reminderDue=now!==null&&q?.status==='sent'&&!q.reminder_sent_at&&now>=expires-24*3600*1000&&now<expires;
  const quotedText=q?`Olá, ${customerName}! Segue o orçamento da Reparos RMC.\n\nServiço: ${q.summary}\nMateriais: ${money(q.materials_cents)}\nMão de obra: ${money(q.labor_cents)}\nOutros: ${money(q.other_cents)}\nTOTAL: ${money(q.total_cents)}\nVálido até: ${new Date(q.valid_until).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}\n\nDatas sugeridas para a execução (sujeitas a confirmação): ${q.proposed_dates.map(datePt).join(', ')}.\n\nPor favor, confirme se aprova e qual data prefere. Obrigado!`:'';
  const reminderText=q?`Olá, ${customerName}! Só para lembrar: o orçamento da Reparos RMC de ${money(q.total_cents)} vence em ${new Date(q.valid_until).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}. Podemos ajudar a esclarecer alguma dúvida?`:'';
  const linkQuote=q?whatsapp(phone,quotedText):null;
  const linkReminder=q?whatsapp(phone,reminderText):null;
  return <section className="mt-5 rounded-xl border border-orange-200 bg-white p-4" aria-label="Orçamentos e agendamento RMC">
    <h4 className="font-black text-[#283f50]">Orçamento e datas — N2</h4>
    <p className="mt-1 text-xs text-slate-600">Na Fase 0, as mensagens são preparadas pelo sistema, mas o envio é realizado e confirmado manualmente pelo operador no WhatsApp Business.</p>
    {error&&<p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">{error}</p>}
    {notice&&<p role="status" className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{notice}</p>}
    {!data&&<p className="mt-2 text-sm text-slate-500">Carregando orçamento...</p>}
    {q&&<div className="mt-3 rounded-xl bg-[#f7fafb] p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><b>Orçamento: {q.status}</b><span className="font-black text-[#b56920]">{money(q.total_cents)}</span></div>
      <p className="mt-2 whitespace-pre-wrap text-slate-700">{q.summary}</p>
      <p className="mt-2 text-xs">Validade: {new Date(q.valid_until).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · Opções: {q.proposed_dates.map(datePt).join(', ')}</p>
      {q.chosen_date&&<p className="mt-1 text-xs font-semibold">Data escolhida: {datePt(q.chosen_date)} (horário ainda a confirmar)</p>}
      {data?.canManage&&<div className="mt-3 flex flex-wrap gap-2">
        {q.status==='draft'&&<><a href={linkQuote||undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!linkQuote} className={`rounded-lg bg-[#ef8924] px-3 py-2 text-xs font-bold ${!linkQuote?'pointer-events-none opacity-50':''}`}>Abrir mensagem no WhatsApp</a><button type="button" disabled={busy} onClick={()=>void action('sent')} className="rounded-lg border px-3 py-2 text-xs font-semibold">Confirmar que enviei</button></>}
        {q.status==='sent'&&<>
          <label className="text-xs font-semibold">Data escolhida <select className="ml-2 rounded border p-2" value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Selecione</option>{q.proposed_dates.map(d=><option key={d} value={d}>{datePt(d)}</option>)}</select></label>
          <button type="button" disabled={busy||!chosen||now===null||now>=expires} onClick={()=>void action('accepted')} className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold">Registrar aceite</button>
          <button type="button" disabled={busy} onClick={()=>void action('declined')} className="rounded-lg border px-3 py-2 text-xs">Registrar recusa</button>
          {now!==null&&now>=expires&&<button type="button" disabled={busy} onClick={()=>void action('expired')} className="rounded-lg border px-3 py-2 text-xs">Marcar vencido</button>}
        </>}
        {reminderDue&&<><a href={linkReminder||undefined} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold">Abrir lembrete (24h antes)</a><button type="button" disabled={busy} onClick={()=>void action('reminded')} className="rounded-lg border px-3 py-2 text-xs">Confirmar lembrete enviado</button></>}
      </div>}
      {reminderDue&&<p className="mt-2 text-xs font-bold text-amber-800">Lembrete manual pendente. Nenhum envio automático está configurado.</p>}
    </div>}
    {data?.canManage&&<div className="mt-4 space-y-3 border-t pt-4">
      <label className="block text-xs font-bold">Validade padrão (dias)
        <span className="mt-1 flex gap-2"><input type="number" className="w-20 rounded-lg border p-2" min={1} max={30} value={validity} onChange={e=>setValidity(Number(e.target.value))}/><button type="button" disabled={busy} onClick={()=>void action('settings')} className="rounded-lg border px-3 text-xs">Salvar padrão da empresa</button></span>
      </label>
      <p className="text-xs font-bold">Nova minuta {q?'(substitui minuta ou orçamento pendente anterior)':''}</p>
      <label className="block text-xs font-semibold">Descrição do serviço<textarea className="mt-1 w-full rounded-lg border p-2" rows={3} maxLength={3000} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Serviço, materiais e condições da avaliação técnica."/></label>
      <div className="grid grid-cols-3 gap-2">{([['Materiais',materials,setMaterials],['Mão de obra',labor,setLabor],['Outros',other,setOther]] as const).map(([l,v,set])=><label key={l} className="text-xs font-semibold">{l} (R$)<input className="mt-1 w-full rounded-lg border p-2" type="number" step="0.01" min="0" value={v} onChange={e=>set(e.target.value)}/></label>)}</div>
      <div><p className="mb-2 text-xs font-semibold">Ofereça duas ou três datas, sujeitas a confirmação de horário</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{dates.map((d,i)=><label key={i} className="text-xs">Data {i+1}{i===2?' (opcional)':''}<input type="date" className="mt-1 w-full rounded-lg border p-2" value={d} onChange={e=>setDates(old=>old.map((x,j)=>j===i?e.target.value:x))}/></label>)}</div></div>
      <button type="button" disabled={busy||!summary.trim()} onClick={()=>void save()} className="rounded-lg bg-[#28495c] px-4 py-2 text-xs font-black text-white">{busy?'Salvando...':'Salvar nova minuta'}</button>
      <p className="text-xs text-slate-500">Ao salvar uma nova minuta, um orçamento anterior ainda pendente será marcado como substituído. Valores não constituem nota fiscal.</p>
    </div>}
    {data&&!data.canManage&&<p className="mt-3 text-xs text-slate-600">A criação e confirmação de orçamentos são exclusivas do proprietário N2 ou administrador AE.</p>}
  </section>;
}
