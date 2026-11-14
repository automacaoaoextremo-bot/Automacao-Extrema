'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { BUCKET, MAX_IMAGES, MAX_VIDEOS, MEDIA_TYPES, RMC_CATEGORIES } from '@/lib/atendimento-inteligente/intake';

type Address = {id:string;label:string;cep:string;street:string;number:string;complement:string|null;neighborhood:string;city:string;state:string};
type Customer = {id:string;fullName:string;phone:string;addresses:Address[]};
type Actor = {role:'operator'|'customer';name:string;portalEnabled:boolean;mustChangePassword:boolean;canSubmitRequest:boolean};
type Service = {category:string;description:string;specific:string};
type Created={requestId:string;uploadSecret:string;message:string};
const startService=():Service=>({category:'',description:'',specific:''});
const blankAddress=()=>({label:'Principal',cep:'',street:'',number:'',complement:'',neighborhood:'',city:'',state:'SP'});
const field='mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-[#173e53] focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100';
const label='block text-sm font-semibold text-[#173e53]';
const prompts:Record<string,string>={
 'Elétrica':'Qual aparelho, tomada, circuito ou cômodo apresenta o problema?',
 'Hidráulica':'Em qual ponto ocorre o problema (pia, vaso, chuveiro, registro)?',
 'Vazamentos':'Onde aparece a água e há quanto tempo?',
 'Portas e janelas':'Qual material e o que deixou de funcionar?',
 'Telhado':'Há infiltração, telha danificada ou calha obstruída?',
 'Limpeza de caixa d’água':'Qual a capacidade aproximada e como é o acesso?',
 'Jardinagem':'Qual área precisa de atenção?',
 'Pintura':'Qual ambiente, área aproximada e condição da superfície?',
 'Instalação de móveis':'Qual móvel e onde será instalado?',
 'Instalação de eletrodomésticos':'Qual equipamento e o que já está preparado?',
 'Quadros, suportes e prateleiras':'Qual objeto, peso aproximado e tipo de parede?',
 'Outros serviços':'O que precisa ser feito e onde?',
};

export function AiRequestForm({initialOrg='reparos-rmc',fixedOrg=true}:{initialOrg?:'reparos-rmc';fixedOrg?:boolean}) {
  void initialOrg;void fixedOrg;
  const [actor,setActor]=useState<Actor|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [customerId,setCustomerId]=useState('');
  const [myAddresses,setMyAddresses]=useState<Address[]>([]);
  const [activeStep,setActiveStep]=useState<1|2|3|null>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const [services,setServices]=useState<Service[]>([startService()]);
  const [files,setFiles]=useState<File[]>([]);
  const [urgency,setUrgency]=useState('normal');
  const [preferredContact,setPreferredContact]=useState('');
  const [addressId,setAddressId]=useState('');
  const [address,setAddress]=useState(blankAddress);
  const [consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [uploadFailures,setUploadFailures]=useState<string[]>([]);

  useEffect(()=>{
    let active=true;
    async function initialize(){
      const {data:session}=await supabaseBrowser.auth.getSession();
      if(!session.session) return;
      const info=await adminFetch<Actor>('/api/atendimento-inteligente/actor');
      if(!active)return;
      setActor(info);
      if(info.role==='customer' && info.portalEnabled && !info.mustChangePassword){
        const result=await adminFetch<{addresses:Address[]}>('/api/atendimento-inteligente/my/addresses');
        if(active)setMyAddresses(result.addresses);
      }
      if(info.role==='operator'){
        const orgs=await adminFetch<{organizations:{id:string;slug:string}[]}>('/api/atendimento-inteligente/organizations');
        const org=orgs.organizations.find(o=>o.slug==='reparos-rmc');
        if(!org)throw new Error('Seu usuario nao esta autorizado para a RMC.');
        const result=await adminFetch<{customers:Customer[]}>(`/api/atendimento-inteligente/customers?organizationId=${org.id}`);
        if(active){
          setCustomers(result.customers);
          const requestedId = new URLSearchParams(window.location.search).get('cliente');
          if(requestedId && result.customers.some(customer => customer.id === requestedId)) setCustomerId(requestedId);
        }
      }
    }
    initialize().catch(e=>{if(active)setError(e instanceof Error?e.message:'Falha ao consultar cadastro.');})
      .finally(()=>{if(active)setLoaded(true);});
    return ()=>{active=false;};
  },[]);
  const customer=customers.find(c=>c.id===customerId);
  const knownAddresses=actor?.role==='customer'?myAddresses:(customer?.addresses??[]);
  const imageFiles=useMemo(()=>files.filter(f=>f.type.startsWith('image/')),[files]);
  const videoFiles=useMemo(()=>files.filter(f=>f.type.startsWith('video/')),[files]);
  const mediaError= useMemo(()=>{
    if(imageFiles.length>MAX_IMAGES||videoFiles.length>MAX_VIDEOS)return 'Limite de 3 fotos e 1 video.';
    if(files.some(f=>!MEDIA_TYPES[f.type]||f.size>MEDIA_TYPES[f.type].maxBytes))return 'Use fotos JPEG/PNG/WebP (5 MB) ou video MP4/WebM (15 MB).';
    return '';
  },[files,imageFiles.length,videoFiles.length]);
  function editService(index:number,key:keyof Service,value:string){
    setServices(list=>list.map((item,i)=>i===index?{...item,[key]:value}:item));
  }
  const servicesReady=services.every(s=>Boolean(s.category)&&s.description.trim().length>=12);
  const addressReady=Boolean(addressId)||(
    /^\d{8}$/.test(address.cep.replace(/\D/g,'')) &&
    Boolean(address.street.trim()) && Boolean(address.number.trim()) &&
    Boolean(address.neighborhood.trim()) && Boolean(address.city.trim()) &&
    /^[A-Z]{2}$/.test(address.state)
  );
  // O dialog nativo faz a gestao de foco, Escape e bloqueio da tela de fundo.
  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    if(activeStep!==null&&!dialog.open)dialog.showModal();
    if(activeStep===null&&dialog.open)dialog.close();
  },[activeStep]);
  function openStep(n:1|2|3){setError('');setActiveStep(n);}
  function closeStep(){setError('');setActiveStep(null);}
  function validateStage(stage:1|2|3):boolean{
    if(stage===1&&!servicesReady){setError('Escolha cada serviço e descreva o problema com pelo menos 12 caracteres.');return false;}
    if(stage===2&&mediaError){setError(mediaError);return false;}
    if(stage===3){
      if(actor?.role==='operator'&&!customer){setError('Selecione um cliente cadastrado antes de enviar.');return false;}
      if(!addressReady){setError('Preencha CEP, rua, numero, bairro, cidade e UF.');return false;}
      if(!consent){setError('Confirme a autorizacao para registrar este pedido.');return false;}
    }
    setError('');return true;
  }
  function nextStage(){
    if(activeStep===null||activeStep===3)return;
    if(validateStage(activeStep))setActiveStep((activeStep+1) as 2|3);
  }
  async function searchCep(){
    const cep=address.cep.replace(/\D/g,'');
    if(!/^\d{8}$/.test(cep)){setError('Digite um CEP com oito numeros.');return;}
    setBusy(true);setError('');
    try{
      const r=await fetch(`/api/atendimento-inteligente/cep/${cep}`);
      const d=await r.json() as Partial<typeof address>&{error?:string};
      if(!r.ok)throw new Error(d.error||'CEP nao encontrado');
      setAddress(a=>({...a,cep,street:d.street||'',neighborhood:d.neighborhood||'',city:d.city||'',state:d.state||'SP'}));
    }catch(e){setError((e instanceof Error?e.message:'Falha no CEP')+'; complete o endereco manualmente.');}
    finally{setBusy(false);}
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!servicesReady){openStep(1);setError('Confira os tipos de serviços e suas descricoes.');return;}
    if(mediaError){openStep(2);setError(mediaError);return;}
    if(!addressReady||!consent||(actor?.role==='operator'&&!customer)){
      openStep(3);setError('Confira cliente, endereco e autorizacao antes de enviar.');return;
    }
    setBusy(true);setError('');setMessage('');setUploadFailures([]);
    try{
      if(!actor||!consent||mediaError)throw new Error('Confira sua sessao, autorizacao e anexos.');
      if(actor.role==='operator'&&!customer)throw new Error('Cadastre e escolha o cliente antes de registrar o pedido.');
      const payload={
        organizationSlug:'reparos-rmc',assisted:actor.role==='operator',customerId:customer?.id,
        phone:customer?.phone,customerName:customer?.fullName,
        services:services.map(s=>({category:s.category,description:s.description,answers:{specific:s.specific}})),
        urgency,preferredContact,consentConfirmed:true,
        addressId:addressId||undefined,addressData:addressId?undefined:address,
      };
      const created=await adminFetch<Created>('/api/atendimento-inteligente/requests',{
        method:'POST',body:JSON.stringify(payload),
      });
      const failures:string[]=[];
      for(const file of files){
        try{
          const url=`/api/atendimento-inteligente/requests/${created.requestId}/media`;
          const prepare=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-ae-intake-token':created.uploadSecret},
            body:JSON.stringify({fileName:file.name,mimeType:file.type,size:file.size})});
          const signed=await prepare.json() as {path?:string;token?:string;error?:string};
          if(!prepare.ok||!signed.path||!signed.token)throw new Error(signed.error||'Upload indisponivel');
          const result=await supabaseBrowser.storage.from(BUCKET).uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type});
          if(result.error)throw result.error;
          const confirm=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json','x-ae-intake-token':created.uploadSecret},body:JSON.stringify({path:signed.path})});
          if(!confirm.ok)throw new Error('Arquivo ainda nao confirmado');
        }catch{failures.push(file.name);}
      }
      setUploadFailures(failures);
      setMessage(`Solicitação registrada! Protocolo: ${created.requestId.slice(0,8).toUpperCase()}. Preço e data dependem de avaliação.`);
      setActiveStep(null);setServices([startService()]);setFiles([]);setConsent(false);
      // Mantem cliente e endereco para simplificar um segundo pedido do mesmo cliente.
    }catch(e){setError(e instanceof Error?e.message:'Nao foi possivel salvar o pedido.');}
    finally{setBusy(false);}
  }
  if(!loaded)return <section className="rounded-xl bg-white p-6 text-sm">Verificando seu acesso...</section>;
  if(!actor || (actor.role==='customer'&&!actor.portalEnabled))return <section className="rounded-3xl border bg-white p-6 shadow">
    <h1 className="text-xl font-black text-[#193d52]">Solicitar um serviço</h1>
    <p className="mt-3 text-sm text-slate-600">Entre com sua conta RMC para solicitar. Durante a homologação, nossa equipe registra os pedidos assistidos. Seu acesso individual será liberado após verificação.</p>
    <div className="mt-5 flex flex-wrap gap-3"><Link href="/solucoes/atendimento-inteligente/rmc/entrar" className="rounded-full bg-[#ef8924] px-5 py-3 text-sm font-bold">Entrar</Link>
      <Link href="/solucoes/atendimento-inteligente/rmc/cadastro" className="rounded-full border px-5 py-3 text-sm font-bold">Como me cadastrar</Link></div>
    {error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
  </section>;
  if(actor.role==='customer'&&actor.mustChangePassword)return <div className="rounded-xl bg-white p-5 text-sm">Troque sua senha antes de solicitar. <Link className="underline" href="/solucoes/atendimento-inteligente/rmc/trocar-senha">Alterar senha</Link></div>;

  if(actor.role==='customer'&&!actor.canSubmitRequest)return <section className="rounded-3xl border bg-white p-6 shadow">
    <h1 className="text-xl font-black text-[#173e51]">Seu acesso foi identificado</h1>
    <p className="mt-3 text-sm text-slate-700">Estamos validando o registro de pedidos com a equipe. Você pode acompanhar seus pedidos existentes; o envio direto será liberado quando esta etapa estiver concluída.</p>
    <Link className="mt-4 inline-flex rounded-xl bg-[#143e31] px-4 py-3 text-sm font-bold text-white" href="/solucoes/atendimento-inteligente/rmc/meus-pedidos">Ver meus pedidos</Link>
  </section>;

  return <form noValidate onSubmit={submit} className="rounded-3xl border bg-white p-4 shadow sm:p-6">
    <p className="text-xs font-bold uppercase tracking-wider text-[#b36b23]">Reparos RMC • Solicitar serviço</p>
    <h1 className="mt-1 text-2xl font-black text-[#183d51]">Conte o que precisa ser resolvido</h1>
    <p className="mt-2 text-sm text-slate-600">Preencha cada etapa pelo botão correspondente. Os dados são mantidos ao fechar ou reabrir uma etapa.</p>
    {actor.role==='operator'&&<div className="mt-4 rounded-xl bg-orange-50 p-3">
      <label htmlFor="rmc-client" className={label}>Cliente do atendimento assistido</label>
      <select id="rmc-client" className={field} value={customerId} onChange={e=>{setCustomerId(e.target.value);setAddressId('');}}>
        <option value="">Selecione um cliente cadastrado</option>
        {customers.map(c=><option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>)}
      </select>
      <Link href="/solucoes/atendimento-inteligente/rmc/cadastro" className="mt-2 inline-block text-xs font-bold underline">Cadastrar novo cliente</Link>
    </div>}
    <div className="mt-5 grid gap-3" aria-label="Etapas da solicitação">
      <button type="button" onClick={()=>openStep(1)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-left shadow-sm transition-colors hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
        <span className="flex items-center gap-3"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-[#8d4e10]">1</span><span><strong className="block text-sm text-[#173e53]">Serviços e problema</strong><span className="text-xs text-slate-600">Tipo de serviço, descrição e detalhes</span></span></span>
        <span className="shrink-0 text-xs font-bold text-[#173e53]">{servicesReady?'✓ Preenchido':'Preencher'}</span>
      </button>
      <button type="button" onClick={()=>openStep(2)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-left shadow-sm transition-colors hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
        <span className="flex items-center gap-3"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-[#8d4e10]">2</span><span><strong className="block text-sm text-[#173e53]">Fotos e preferências</strong><span className="text-xs text-slate-600">Anexos opcionais e urgência</span></span></span>
        <span className="shrink-0 text-xs font-bold text-[#173e53]">Opcional</span>
      </button>
      <button type="button" onClick={()=>openStep(3)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-left shadow-sm transition-colors hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
        <span className="flex items-center gap-3"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-[#8d4e10]">3</span><span><strong className="block text-sm text-[#173e53]">Endereço e autorização</strong><span className="text-xs text-slate-600">Local de atendimento e confirmação</span></span></span>
        <span className="shrink-0 text-xs font-bold text-[#173e53]">{addressReady&&consent?'✓ Preenchido':'Preencher'}</span>
      </button>
    </div>
    {message&&<div role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><p>{message}</p>{uploadFailures.length>0&&<p>Alguns anexos falharam: {uploadFailures.join(', ')}. Avise a equipe.</p>}</div>}
    <p className="mt-4 text-xs text-slate-500">O envio só acontece na última etapa. O pedido não confirma preço, visita ou disponibilidade.</p>
    <dialog ref={dialogRef} onCancel={e=>{if(busy)e.preventDefault();}} onClose={()=>setActiveStep(null)} aria-labelledby="rmc-step-title" aria-describedby="rmc-step-help"
      className="fixed inset-0 m-auto h-[calc(100dvh-1rem)] max-h-[820px] w-[calc(100vw-1rem)] max-w-2xl rounded-2xl border-0 bg-white p-0 text-[#183d51] shadow-2xl backdrop:bg-black/65 sm:h-auto sm:max-h-[calc(100dvh-3rem)]">
      <div className="flex max-h-[calc(100dvh-1rem)] flex-col sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-4 py-3 sm:px-6">
          <div><p className="text-xs font-semibold text-[#9e5b1a]">Etapa {activeStep} de 3</p><h2 id="rmc-step-title" className="text-lg font-black">{activeStep===1?'Serviços e problema':activeStep===2?'Fotos e preferências':'Endereço e autorização'}</h2></div>
          <button type="button" className="rounded-full border px-3 py-2 text-sm font-bold" onClick={closeStep} aria-label="Fechar etapa">Fechar</button>
        </div>
        <p id="rmc-step-help" className="sr-only">Preencha os campos e avance. Use Escape ou Fechar para voltar sem perder as informações.</p>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-8 sm:px-6">
    {activeStep===1&&<div className="mt-5 space-y-4">
      {services.map((item,i)=><fieldset key={i} className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-bold">Serviço {i+1}</legend>
        <label className={label} htmlFor={`cat-${i}`}>Tipo de serviço</label>
        <select id={`cat-${i}`} className={field} value={item.category} onChange={e=>editService(i,'category',e.target.value)} required>
          <option value="">Selecione uma opção</option>{RMC_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {item.category&&<><label className={`${label} mt-3`} htmlFor={`extra-${i}`}>{prompts[item.category]||'Qual a situação?'}</label>
          <input id={`extra-${i}`} className={field} value={item.specific} onChange={e=>editService(i,'specific',e.target.value)} maxLength={500}/></>}
        <label className={`${label} mt-3`} htmlFor={`description-${i}`}>Descreva o problema</label>
        <textarea id={`description-${i}`} className={field} rows={3} minLength={12} maxLength={4000} value={item.description} onChange={e=>editService(i,'description',e.target.value)}
          placeholder="Onde ocorre, quando começou, tamanho ou modelo aproximado e o que já tentou fazer?" required/>
        {services.length>1&&<button type="button" className="mt-3 text-xs font-bold text-rose-700 underline" onClick={()=>setServices(list=>list.filter((_,j)=>j!==i))}>Remover serviço</button>}
      </fieldset>)}
      {services.length<5&&<button type="button" className="rounded-full border border-orange-400 px-4 py-2 text-sm font-bold text-[#9c5a19]" onClick={()=>setServices(list=>[...list,startService()])}>+ Adicionar outro serviço</button>}
    </div>}
    {activeStep===2&&<div className="mt-5 space-y-4">
      <label className={label} htmlFor="file">Fotos e vídeos (opcionais)</label>
      <p className="text-sm text-slate-600">Uma foto do local e outra do problema ajudam a equipe a avaliar melhor, evitando perguntas e deslocamentos desnecessários. Não anexe documentos pessoais.</p>
      <input id="file" type="file" className={field} multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>setFiles(Array.from(e.target.files??[]))}/>
      <p className="text-xs text-slate-500">Até 3 fotos (5 MB cada) e um vídeo (15 MB).</p>
      {files.length>0&&<p role="status" className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{files.length} anexo(s) mantido(s) neste pedido: {files.map(f=>f.name).join(', ')}</p>}
      {mediaError&&<p role="alert" className="text-xs text-rose-700">{mediaError}</p>}
      <label className={label} htmlFor="urgency">Urgência percebida</label>
      <select id="urgency" className={field} value={urgency} onChange={e=>setUrgency(e.target.value)}><option value="normal">Normal</option><option value="alta">Alta</option></select>
      <label className={label} htmlFor="contact">Melhor período para contato (opcional)</label>
      <input id="contact" className={field} value={preferredContact} onChange={e=>setPreferredContact(e.target.value)} maxLength={200}/>
    </div>}
    {activeStep===3&&<div className="mt-5 space-y-3">
      <h2 className="text-lg font-black text-[#16384b]">Onde será realizado o serviço?</h2>
      {knownAddresses.length>0&&<><label className={label} htmlFor="existing-addr">Usar endereço já cadastrado</label>
        <select id="existing-addr" className={field} value={addressId} onChange={e=>setAddressId(e.target.value)}>
          <option value="">Cadastrar outro endereço</option>
          {knownAddresses.map(a=><option value={a.id} key={a.id}>{a.label}: {a.street}, {a.number} — {a.city}/{a.state}</option>)}
        </select></>}
      {!addressId&&<div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>CEP (obrigatório)<div className="flex gap-2"><input className={field} value={address.cep} inputMode="numeric" maxLength={9} onChange={e=>setAddress(a=>({...a,cep:e.target.value}))}/><button type="button" disabled={busy} onClick={()=>void searchCep()} className="mt-1 shrink-0 rounded-xl bg-[#163e51] px-3 text-xs text-white">Buscar</button></div></label>
        <label className={label}>Rua<input className={field} value={address.street} onChange={e=>setAddress(a=>({...a,street:e.target.value}))}/></label>
        <label className={label}>Número<input className={field} value={address.number} onChange={e=>setAddress(a=>({...a,number:e.target.value}))}/></label>
        <label className={label}>Complemento<input className={field} value={address.complement} onChange={e=>setAddress(a=>({...a,complement:e.target.value}))}/></label>
        <label className={label}>Bairro<input className={field} value={address.neighborhood} onChange={e=>setAddress(a=>({...a,neighborhood:e.target.value}))}/></label>
        <label className={label}>Cidade<input className={field} value={address.city} onChange={e=>setAddress(a=>({...a,city:e.target.value}))}/></label>
        <label className={label}>UF<input className={field} value={address.state} maxLength={2} onChange={e=>setAddress(a=>({...a,state:e.target.value.toUpperCase()}))}/></label>
      </div>}
      <label className="flex items-start gap-3 rounded-xl bg-slate-100 p-3 text-xs leading-relaxed"><input type="checkbox" className="mt-0.5" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
        {actor.role==='operator'?'Confirmo que recebi autorização do cliente para registrar seus dados e materiais para avaliação e retorno.':'Autorizo o uso dos dados para avaliação e contato sobre este pedido.'}</label>
      <p className="text-xs text-slate-500">O pedido não confirma orçamento, visita, valor ou disponibilidade.</p>
    </div>}
          {error&&<p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-white px-4 py-3 sm:px-6">
          {activeStep!==null&&activeStep>1?<button type="button" className="rounded-full border px-4 py-2 text-sm font-semibold" disabled={busy} onClick={()=>{setError('');setActiveStep((activeStep-1) as 1|2);}}>Anterior</button>
            :<button type="button" className="rounded-full border px-4 py-2 text-sm font-semibold" disabled={busy} onClick={closeStep}>Salvar e fechar</button>}
          {activeStep!==3?<button type="button" className="rounded-full bg-[#ef8924] px-5 py-2.5 text-sm font-black" disabled={busy} onClick={nextStage}>Salvar e continuar</button>
            :<button type="submit" disabled={busy||!consent||!!mediaError} className="rounded-full bg-[#ef8924] px-4 py-2.5 text-sm font-black disabled:opacity-50">{busy?'Registrando...':'Enviar solicitação'}</button>}
        </div>
      </div>
    </dialog>
  </form>;
}
