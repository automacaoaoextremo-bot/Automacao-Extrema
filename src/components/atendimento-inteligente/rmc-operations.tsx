'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

export type RmcCatalogKind = 'service'|'material'|'tool'|'address'|'vehicle'|'supplier'|'contract';
type Kind=RmcCatalogKind;
type Field={key:string;label:string;type?:'text'|'number'|'textarea';hint?:string};
type RecordItem={id:string;kind:Kind;name:string;details:Record<string,string|number>;is_default:boolean;is_active:boolean;updated_at:string};
const endpoint='/api/atendimento-inteligente/rmc/operations';
const choices:{kind:Kind;label:string;fields:Field[]}[]=[
 {kind:'service',label:'Tipos de serviço',fields:[
  {key:'category',label:'Categoria do serviço'},{key:'scope',label:'Escopo / exemplos',type:'textarea'},
  {key:'laborCost',label:'Mão de obra média (R$)',type:'number'},{key:'estimatedHours',label:'Tempo típico (horas)',type:'number'},
  {key:'materials',label:'Materiais habituais (separados por vírgula)',type:'textarea'},
  {key:'tools',label:'Ferramentas necessárias (separadas por vírgula)',type:'textarea'},
  {key:'notes',label:'Observações',type:'textarea'}]},
 {kind:'address',label:'Endereços RMC',fields:[
  {key:'cep',label:'CEP'},{key:'street',label:'Rua / avenida'},{key:'number',label:'Número'},
  {key:'complement',label:'Complemento'},{key:'neighborhood',label:'Bairro'},
  {key:'city',label:'Cidade'},{key:'state',label:'UF'},
  {key:'notes',label:'Observações',type:'textarea'}]},
 {kind:'vehicle',label:'Veículos',fields:[
  {key:'model',label:'Marca e modelo'},{key:'fuel',label:'Combustível'},
  {key:'kmPerLiter',label:'Consumo médio (km/L)',type:'number'},
  {key:'fuelPrice',label:'Preço médio do combustível (R$/L)',type:'number'},
  {key:'otherCostKm',label:'Outros custos por km (R$/km)',type:'number'},
  {key:'notes',label:'Observações',type:'textarea'}]},
 {kind:'material',label:'Materiais',fields:[
  {key:'service',label:'Tipo de serviço associado'},
  {key:'quantity',label:'Quantidade típica'},{key:'unit',label:'Unidade'},
  {key:'price',label:'Preço unitário médio (R$)',type:'number'},
  {key:'supplier',label:'Fornecedor preferido'},{key:'notes',label:'Observações',type:'textarea'}]},
 {kind:'tool',label:'Ferramentas',fields:[
  {key:'service',label:'Tipo de serviço associado'},
  {key:'notes',label:'Observações / disponibilidade',type:'textarea'}]},
 {kind:'supplier',label:'Fornecedores',fields:[
  {key:'category',label:'Especialidade / material'}, {key:'phone',label:'Telefone comercial'},
  {key:'city',label:'Cidade'}, {key:'notes',label:'Observações',type:'textarea'}]},
 {kind:'contract',label:'Contratos recorrentes',fields:[
  {key:'customer',label:'Cliente (nome comercial)'},{key:'scope',label:'Serviços incluídos',type:'textarea'},
  {key:'frequency',label:'Periodicidade'}, {key:'locations',label:'Unidades / locais',type:'textarea'},
  {key:'contractValue',label:'Valor de referência (R$)',type:'number'},
  {key:'startDate',label:'Vigência inicial (AAAA-MM-DD)'},{key:'endDate',label:'Vigência final (AAAA-MM-DD)'},
  {key:'notes',label:'Observações contratuais',type:'textarea'}]},
];
const inputClass='mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#173b4c]';
const formatMoney=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);

export function RmcOperations({ focusedKind, onClose }: { focusedKind?: RmcCatalogKind; onClose?: () => void } = {}){
 const [kind,setKind]=useState<Kind>(focusedKind ?? 'service');
 const [page,setPage]=useState(1);
 const [editorPage,setEditorPage]=useState(0);
 const [items,setItems]=useState<RecordItem[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [name,setName]=useState('');
 const [details,setDetails]=useState<Record<string,string>>({});
 const [isDefault,setIsDefault]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [showEditor,setShowEditor]=useState(false);
 const definition=choices.find(x=>x.kind===kind)!;
 const visible=useMemo(()=>items.filter(i=>i.kind===kind),[items,kind]);
 // Ajustes 19: quatro tipos de servico por pagina; outros catalogos preservam a paginacao anterior.
 const pageSize=kind==='service'?4:6;
 const pages=Math.max(1,Math.ceil(visible.length/pageSize));
 const currentPage=Math.min(page,pages);
 const rows=visible.slice((currentPage-1)*pageSize,currentPage*pageSize);
 const fieldsPerPage=2;
 const editorPages=Math.max(1,Math.ceil(definition.fields.length/fieldsPerPage));
 const load=useCallback(async()=>{
  const r=await adminFetch<{items:RecordItem[]}>(endpoint);setItems(r.items);
 },[]);
 useEffect(()=>{let active=true;
  adminFetch<{items:RecordItem[]}>(endpoint).then(r=>{if(active)setItems(r.items);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'Falha ao carregar cadastros.');});
  return()=>{active=false;};
 },[]);
 function changeKind(value:Kind){setKind(value);setEditing(null);setName('');setDetails({});setIsDefault(false);setShowEditor(false);setPage(1);setEditorPage(0);setError('');setNotice('');}
 function edit(row:RecordItem){setKind(row.kind);setEditing(row.id);setName(row.name);
  setDetails(Object.fromEntries(Object.entries(row.details||{}).map(([k,v])=>[k,String(v??'')])));
  setIsDefault(row.is_default);setShowEditor(true);setEditorPage(0);setError('');setNotice('');}
 function newItem(){setEditing(null);setName('');setDetails({});setIsDefault(false);setShowEditor(true);setEditorPage(0);setError('');}
 async function save(){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   await adminFetch(endpoint,{method:'POST',body:JSON.stringify({id:editing??undefined,kind,name,details,isDefault})});
   await load();setShowEditor(false);setEditing(null);setNotice('Cadastro salvo. Os preços são referências para orçamento, não valores finais.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}
 }
 async function toggleActive(row:RecordItem){
  if(busy || row.kind!=='service')return;
  const nextActive=!row.is_active;
  if(!nextActive && !window.confirm(`Inativar “${row.name}”? O cadastro será preservado para uma futura reativação.`))return;
  setBusy(true);setError('');setNotice('');
  try{
   await adminFetch(endpoint,{method:'PATCH',body:JSON.stringify({id:row.id,isActive:nextActive})});
   await load();setNotice(nextActive?'Serviço ativado.':'Serviço inativado.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar a situação do serviço.');}
  finally{setBusy(false);}
 }
 async function remove(row:RecordItem){
  if(busy||!window.confirm(`Excluir “${row.name}”? Esta ação não altera orçamentos já realizados.`))return;
  setBusy(true);setError('');setNotice('');
  try{
   await adminFetch(`${endpoint}?id=${encodeURIComponent(row.id)}`,{method:'DELETE'});
   await load();setNotice('Registro excluído.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível excluir.');}finally{setBusy(false);}
 }
 const km=Number(details.kmPerLiter||0),fuel=Number(details.fuelPrice||0),other=Number(details.otherCostKm||0);
 const cost=km>0&&fuel>0?fuel/km+(other>=0?other:0):null;
 return <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5" aria-label="Cadastros operacionais N2">
  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
   <h2 className="text-lg font-black leading-tight text-[#292424]">{focusedKind ? (kind==='service'?'Serviços e Custos':definition.label) : 'Configurações e custos — RMC'}</h2>
   <div className="ml-auto flex shrink-0 items-center gap-2">
    {!showEditor && <button type="button" onClick={newItem} className="rounded-lg bg-[#ef8924] px-3 py-2 text-sm font-bold text-[#242122]">+ Novo</button>}
    {(onClose || showEditor) && <button type="button" className="rounded-lg bg-[#242122] px-4 py-2 text-sm font-bold text-white" onClick={()=>{if(showEditor){setShowEditor(false);setEditorPage(0);}else{onClose?.();}}}>Fechar</button>}
   </div>
  </div>
  {!focusedKind && <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Cadastros da RMC">
   {choices.map(c=><button key={c.kind} type="button" role="tab" aria-selected={kind===c.kind} onClick={()=>changeKind(c.kind)}
    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${kind===c.kind?'bg-[#d87416] text-white':'bg-white text-slate-700'}`}>{c.label}</button>)}
  </div>}
  {error&&<p role="alert" className="my-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="my-2 rounded bg-green-50 p-2 text-sm text-green-800">{notice}</p>}
  <div className="mb-2 mt-1"><h3 className="font-semibold leading-tight">{definition.label} ({visible.length})</h3></div>
  {!showEditor && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
   {rows.map(row=><article key={row.id} className="min-w-0 rounded-xl border bg-[#fff8f0] p-3">
    <p className="break-words font-bold">{row.name}{row.is_default&&<span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-[10px]">Origem padrão</span>}</p>
    {row.kind==='vehicle'&&Number(row.details.kmPerLiter)>0&&Number(row.details.fuelPrice)>0&&
      <p className="mt-1 text-xs">Combustível: {formatMoney(Number(row.details.fuelPrice)/Number(row.details.kmPerLiter))}/km</p>}
    <p className="mt-1 text-xs text-slate-500">Atualizado {new Date(row.updated_at).toLocaleDateString('pt-BR')}</p>
    {!row.is_active && <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-950">Inativo</span>}
    <div className="mt-2 flex flex-wrap gap-1.5">
      <button type="button" disabled={busy} onClick={()=>edit(row)} className="rounded-md border border-[#c8b6a5] px-2 py-1 text-[11px] font-semibold disabled:opacity-50">Editar</button>
      <button type="button" disabled={busy} onClick={()=>void remove(row)} className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50">Excluir</button>
      {row.kind==='service' && <button type="button" disabled={busy} aria-label={`${row.is_active?'Inativar':'Ativar'} serviço ${row.name}`} onClick={()=>void toggleActive(row)} className="rounded-md border border-[#e6a15e] px-2 py-1 text-[11px] font-semibold text-[#8b440f] disabled:opacity-50">{row.is_active?'Inativar':'Ativar'}</button>}
    </div>
   </article>)}
   {visible.length===0&&<p className="col-span-full rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Nenhum registro ainda. Use “+ Novo” ou confira a planilha preparada para Anderson.</p>}
  </div>}
  {!showEditor && visible.length>pageSize && <nav className="mt-3 flex items-center justify-between gap-2 text-xs" aria-label="Páginas dos cadastros">
    <button type="button" disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button>
    <span>Página {currentPage} de {pages}</span>
    <button type="button" disabled={currentPage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Próxima</button>
  </nav>}
  {showEditor&&<div className="mt-4 rounded-xl border border-[#ebcdad] bg-[#fff8f0] p-3 sm:p-4">
   <h3 className="font-bold">{editing?'Editar':'Adicionar'} — {definition.label}</h3>
   <p className="mt-2 text-xs text-slate-500">Etapa {editorPage+1} de {editorPages}. Os dados são mantidos ao avançar.</p>
   <div className="mt-2 grid gap-3 sm:grid-cols-2">
    {editorPage===0 && <label className="block text-xs font-semibold sm:col-span-2">Identificação / nome *
      <input className={inputClass} maxLength={120} value={name} onChange={e=>setName(e.target.value)} required /></label>}
    {definition.fields.slice(editorPage*fieldsPerPage,(editorPage+1)*fieldsPerPage).map(f=><label key={f.key} className={`block text-xs font-semibold ${f.type==='textarea'?'sm:col-span-2':''}`}>{f.label}
      {f.type==='textarea'?<textarea className={inputClass} maxLength={1000} rows={2} value={details[f.key]??''} onChange={e=>setDetails(d=>({...d,[f.key]:e.target.value}))}/>
      :<input className={inputClass} type={f.type==='number'?'number':'text'} min={f.type==='number'?0:undefined}
       step={f.type==='number'?'any':undefined} value={details[f.key]??''} onChange={e=>setDetails(d=>({...d,[f.key]:e.target.value}))}/>}</label>)}
   </div>
   {editorPage===editorPages-1 && kind==='address'&&<label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={isDefault} onChange={e=>setIsDefault(e.target.checked)}/>Origem padrão para os orçamentos</label>}
   {editorPage===editorPages-1 && kind==='vehicle'&&<p className="mt-3 rounded-lg bg-white p-3 text-sm">Custo operacional configurado: <b>{cost===null?'Informe consumo e combustível':`${formatMoney(cost)}/km`}</b>. Para estimar um deslocamento, será necessário informar distância e considerar ida/volta, pedágio e tempo de serviço.</p>}
   <div className="mt-4 flex justify-end gap-2">
     {editorPage>0&&<button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>setEditorPage(p=>p-1)}>Anterior</button>}
     {editorPage<editorPages-1?<button type="button" className="rounded-lg bg-[#242122] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={name.trim().length<2} onClick={()=>setEditorPage(p=>p+1)}>Próxima</button>
     :<button className="rounded-lg bg-[#f28a20] px-4 py-2 text-sm font-bold text-[#242122] disabled:opacity-50" type="button" disabled={busy||name.trim().length<2} onClick={()=>void save()}>{busy?'Salvando...':'Salvar'}</button>}
   </div>
  </div>}
 </section>;
}
