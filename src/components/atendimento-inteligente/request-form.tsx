'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { BUCKET, MAX_IMAGES, MAX_VIDEOS, MEDIA_TYPES, PILOTO_CATEGORIES, RMC_CATEGORIES } from '@/lib/atendimento-inteligente/intake';

type Org = 'reparos-rmc' | 'piloto-automotivo';
type Created = { requestId: string; uploadSecret: string; message: string };
const field = 'mt-1 w-full rounded-xl border border-[#bfcfd4] bg-white px-3 py-3 text-[#16384b] outline-none focus:border-[#2b7386] focus:ring-2 focus:ring-[#bfdde3]';
const label = 'block text-sm font-bold text-[#16384b]';
const turnstileSiteKey = process.env.NEXT_PUBLIC_AE_AI_TURNSTILE_SITE_KEY;

export function AiRequestForm({ initialOrg = 'reparos-rmc', fixedOrg = false }: { initialOrg?: Org; fixedOrg?: boolean }) {
  const [org, setOrg] = useState<Org>(initialOrg);
  const [step, setStep] = useState(1);
  const [isOperator, setIsOperator] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [preferredContact, setPreferredContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Created | null>(null);
  const [uploadFailures, setUploadFailures] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!active) return;
      const logged = Boolean(data.session);
      setIsOperator(logged);
      setAssisted(logged);
      setSessionReady(true);
    }).catch(() => { if (active) setSessionReady(true); });
    return () => { active = false; };
  }, []);
  const categories = useMemo(() => org === 'reparos-rmc' ? RMC_CATEGORIES : PILOTO_CATEGORIES, [org]);
  const isPublic = !assisted;
  const mediaValidation = useMemo(() => {
    const photos = files.filter(file => file.type.startsWith('image/'));
    const videos = files.filter(file => file.type.startsWith('video/'));
    if (photos.length > MAX_IMAGES || videos.length > MAX_VIDEOS) return 'Limite: até 3 fotos e 1 vídeo.';
    for (const file of files) {
      const config = MEDIA_TYPES[file.type];
      if (!config || file.size > config.maxBytes) return 'Fotos: JPEG/PNG/WebP até 5 MB. Vídeo: MP4/WebM até 15 MB.';
    }
    return '';
  }, [files]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null); setUploadFailures([]);
    try {
      if (!consent) throw new Error('É necessário confirmar a autorização para o registro.');
      if (mediaValidation) throw new Error(mediaValidation);
      const token = document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value || '';
      if (isPublic && (!turnstileSiteKey || !token)) {
        throw new Error('O envio direto pelo cliente depende da ativação do formulário público. Solicite atendimento pelo WhatsApp.');
      }
      const payload = { organizationSlug: org, customerName: name, phone, category, description,
        neighborhood, address, urgency, preferredContact, consentConfirmed: true, assisted, turnstileToken: token };
      let data: Created;
      if (assisted && isOperator) {
        data = await adminFetch<Created>('/api/atendimento-inteligente/requests', {
          method: 'POST', body: JSON.stringify(payload),
        });
      } else {
        const response = await fetch('/api/atendimento-inteligente/requests', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await response.json() as Created & { error?: string };
        if (!response.ok) throw new Error(body.error || 'Não foi possível registrar o pedido.');
        data = body;
      }
      setResult(data);
      const failures: string[] = [];
      for (const file of files) {
        try {
          const base = `/api/atendimento-inteligente/requests/${data.requestId}/media`;
          const signedResponse = await fetch(base, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ae-intake-token': data.uploadSecret },
            body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size }),
          });
          const signed = await signedResponse.json() as { path?: string; token?: string; error?: string };
          if (!signedResponse.ok || !signed.path || !signed.token) throw new Error(signed.error || 'Não foi possível preparar envio.');
          const uploaded = await supabaseBrowser.storage.from(BUCKET)
            .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
          if (uploaded.error) throw uploaded.error;
          const confirmed = await fetch(base, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-ae-intake-token': data.uploadSecret },
            body: JSON.stringify({ path: signed.path }),
          });
          if (!confirmed.ok) throw new Error('O arquivo foi enviado, mas ainda não foi confirmado.');
        } catch { failures.push(file.name); }
      }
      setUploadFailures(failures);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a solicitação.');
    } finally { setBusy(false); }
  }

  function nextStep() {
    setError('');
    if (step === 1 && (name.trim().length < 2 || !/^\+?\d[\d\s()-]{9,}$/.test(phone))) {
      setError('Informe o nome e o celular com DDD antes de continuar.'); return;
    }
    if (step === 2 && (!category || neighborhood.trim().length < 2 || description.trim().length < 12)) {
      setError('Selecione o serviço, informe o bairro e descreva o problema com pelo menos 12 caracteres.'); return;
    }
    setStep(step === 1 ? 2 : 3);
  }
  if (!sessionReady) return <div className="rounded-2xl bg-white p-7 text-center text-sm">Verificando o acesso...</div>;
  if (!isOperator && !turnstileSiteKey) return <section className="rounded-3xl border bg-white p-6 shadow-lg">
    <p className="text-xs font-black uppercase tracking-widest text-[#ba6c24]">Solicitar serviço • Fase de homologação</p>
    <h2 className="mt-2 text-2xl font-black text-[#26475b]">Seu pedido será registrado pela equipe RMC</h2>
    <p className="mt-4 text-sm text-slate-600">Por enquanto, o cliente continua utilizando o WhatsApp de sempre. Um atendente autorizado organiza as informações e encaminha a solicitação ao Anderson.</p>
    <div className="mt-6 flex flex-col gap-3"><Link className="rounded-full bg-[#ef8924] px-5 py-3 text-center text-sm font-bold" href="/solucoes/atendimento-inteligente/rmc/entrar">Entrar como atendente N1/N2</Link><Link className="rounded-full border px-5 py-3 text-center text-sm font-semibold" href="/solucoes/atendimento-inteligente/rmc/cadastro">Sou cliente — como funciona o cadastro?</Link></div>
  </section>;
  if (result) return <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-lg" role="status">
    <p className="text-sm font-bold text-emerald-700">Solicitação registrada</p>
    <h2 className="mt-2 text-xl font-black">Recebemos as informações para avaliação humana.</h2>
    <p className="mt-2 text-sm text-slate-600">O orçamento e a data de atendimento ainda dependem de confirmação do Anderson.</p>
    <p className="mt-2 break-all text-xs text-slate-500">Protocolo: {result.requestId}</p>
    {uploadFailures.length > 0 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">Pedido salvo. Falha no envio destes anexos: {uploadFailures.join(', ')}.</p>}
    <div className="mt-5 flex gap-3"><button type="button" className="rounded-full bg-[#ef8924] px-4 py-2 font-bold" onClick={() => { setResult(null); setFiles([]); setName(''); setPhone(''); setCategory(''); setDescription(''); setConsent(false); setStep(1); }}>Novo pedido</button><Link className="rounded-full border px-4 py-2" href="/solucoes/atendimento-inteligente/rmc">Voltar</Link></div>
  </section>;
  return <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg sm:p-7">
    <p className="text-xs font-bold uppercase tracking-wider text-[#c36f17]">Reparos RMC • Atendimento {step} de 3</p>
    <h2 className="mt-2 text-xl font-black text-[#1d4055]">{step === 1 ? 'Quem precisa de ajuda?' : step === 2 ? 'Conte o que aconteceu' : 'Detalhes e autorização'}</h2>
    <div className="mt-3 flex gap-2">{[1,2,3].map(n => <div key={n} aria-label={`Etapa ${n}`} className={`h-1.5 flex-1 rounded-full ${n<=step ? 'bg-[#ef8924]':'bg-slate-200'}`} />)}</div>
    {isOperator && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Atendimento assistido N1: o registro fica associado ao operador autenticado.</p>}
    {!isOperator && <p className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-900">Nesta fase de testes, somente a equipe autorizada pode registrar solicitações. O cliente pode continuar usando o WhatsApp da RMC.</p>}
    {step===1 && <div className="mt-5 space-y-4">
      {!fixedOrg && <div><label className={label} htmlFor="org">Empresa</label><select className={field} value={org} id="org" onChange={e=>{setOrg(e.target.value as Org);setCategory('');}}><option value="reparos-rmc">Reparos RMC</option><option value="piloto-automotivo">Piloto Elétrica e Baterias</option></select></div>}
      <div><label className={label} htmlFor="name">Nome completo do cliente</label><input className={field} id="name" value={name} autoComplete="name" onChange={e=>setName(e.target.value)} maxLength={120} required /></div>
      <div><label className={label} htmlFor="phone">WhatsApp com DDD</label><input className={field} id="phone" type="tel" inputMode="tel" placeholder="(19) 99999-9999" value={phone} onChange={e=>setPhone(e.target.value)} required /></div>
      <p className="text-xs text-slate-500">O celular identifica o contato dentro da empresa. Não é criada senha compartilhada para o cliente.</p>
    </div>}
    {step===2 && <div className="mt-5 space-y-4">
      <div><label className={label} htmlFor="category">Serviço</label><select className={field} id="category" value={category} onChange={e=>setCategory(e.target.value)} required><option value="">Selecione</option>{categories.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
      <div><label className={label} htmlFor="neighborhood">Bairro / região</label><input className={field} id="neighborhood" value={neighborhood} onChange={e=>setNeighborhood(e.target.value)} required maxLength={180}/></div>
      <div><label className={label} htmlFor="description">Problema e informações importantes</label><textarea className={field} id="description" rows={4} value={description} onChange={e=>setDescription(e.target.value)} required minLength={12} maxLength={4000} placeholder="Onde é? Quando começou? O que já foi tentado? Envie detalhes que evitam novas perguntas." /></div>
    </div>}
    {step===3 && <div className="mt-5 space-y-4">
      <div><label className={label} htmlFor="address">Endereço (opcional na triagem)</label><input className={field} id="address" value={address} onChange={e=>setAddress(e.target.value)} maxLength={300}/></div>
      <div className="grid grid-cols-2 gap-3"><div><label className={label} htmlFor="urgency">Urgência percebida</label><select className={field} id="urgency" value={urgency} onChange={e=>setUrgency(e.target.value)}><option value="normal">Normal</option><option value="alta">Alta</option></select></div><div><label className={label} htmlFor="preferred">Melhor horário contato</label><input className={field} id="preferred" value={preferredContact} onChange={e=>setPreferredContact(e.target.value)} maxLength={200}/></div></div>
      <div><label className={label} htmlFor="media">Fotos/vídeo do problema</label><input id="media" className="mt-2 block w-full text-xs" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>setFiles(Array.from(e.target.files ?? []))}/><p className="mt-1 text-xs text-slate-500">Até 3 fotos (5 MB cada) e 1 vídeo (15 MB). Não anexe documentos pessoais.</p>{mediaValidation && <p role="alert" className="text-xs text-red-700">{mediaValidation}</p>}</div>
      <label className="flex gap-2 rounded-xl bg-slate-100 p-3 text-xs"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/>{assisted ? 'Confirmo que expliquei ao cliente o registro para avaliação e recebi autorização.' : 'Autorizo o tratamento dos dados e anexos exclusivamente para análise deste serviço e retorno da equipe.'}</label>
      {!assisted && turnstileSiteKey && <div><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive"/><div className="cf-turnstile" data-sitekey={turnstileSiteKey}/></div>}
      <p className="text-xs text-slate-500">Este formulário não confirma preço, visita nem atendimento de emergência.</p>
    </div>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    <div className="mt-5 flex items-center justify-between gap-3">
      {step > 1 ? <button type="button" className="rounded-full border px-5 py-3 text-sm font-bold" onClick={()=>{setError('');setStep(step === 3 ? 2 : 1);}}>Voltar</button> : <Link className="rounded-full border px-5 py-3 text-sm font-bold" href="/solucoes/atendimento-inteligente/rmc">Voltar</Link>}
      {step < 3 ? <button type="button" className="rounded-full bg-[#ef8924] px-6 py-3 text-sm font-black text-[#20272a]" onClick={nextStep}>Próximo</button> : <button type="submit" disabled={busy || Boolean(mediaValidation) || (!assisted && !turnstileSiteKey)} className="rounded-full bg-[#ef8924] px-5 py-3 text-sm font-black disabled:opacity-50">{busy ? 'Salvando...' : 'Registrar solicitação'}</button>}
    </div>
  </form>;
}
