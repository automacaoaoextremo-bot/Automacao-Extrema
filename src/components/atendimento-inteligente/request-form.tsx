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

export function AiRequestForm({ initialOrg = 'reparos-rmc' }: { initialOrg?: Org }) {
  const [org, setOrg] = useState<Org>(initialOrg);
  const [isOperator, setIsOperator] = useState(false);
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
    }).catch(() => { /* Modo publico permanece disponivel. */ });
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

  if (result) return <section className="rounded-3xl border border-[#b7d7ca] bg-white p-7 shadow-lg" role="status">
    <span className="text-sm font-bold uppercase tracking-wide text-[#237353]">Solicitação registrada</span>
    <h2 className="mt-2 text-2xl font-black">As informações chegaram à fila de análise.</h2>
    <p className="mt-3 text-slate-600">O Anderson poderá avaliar os dados. Ainda não há preço, horário ou visita confirmados.</p>
    <p className="mt-3 break-all text-xs text-slate-500">Protocolo: {result.requestId}</p>
    {uploadFailures.length>0 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">O pedido foi salvo, mas estes anexos precisam ser reenviados pelo atendimento: {uploadFailures.join(', ')}.</p>}
    <div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={() => { setResult(null); setFiles([]); setDescription(''); setCategory(''); setConsent(false); }} className="rounded-xl bg-[#123e50] px-5 py-3 font-bold text-white">Registrar outro pedido</button><Link href="/solucoes/atendimento-inteligente" className="rounded-xl border px-5 py-3 font-semibold">Voltar</Link></div>
  </section>;

  return <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8">
    <div><h2 className="text-2xl font-black">Conte como podemos ajudar</h2><p className="mt-1 text-sm text-slate-600">Quanto mais contexto você fornecer, mais fácil será avaliar seu pedido.</p></div>
    {isOperator && <div className="rounded-xl border border-[#b3cfd8] bg-[#edf5f7] p-4">
      <label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" checked={assisted} onChange={e=>setAssisted(e.target.checked)} className="mt-1" />Registro assistido — estou cadastrando o pedido em nome do cliente como atendimento nível 1.</label>
      <p className="mt-2 text-xs text-slate-600">Origem ficará registrada como N1, com sua conta de operador. Não implica que o cliente usou o site ou que mensagens foram sincronizadas.</p>
    </div>}
    {!isOperator && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">O cadastro público está em homologação. Se ainda não estiver liberado, fale com a Reparos RMC pelo WhatsApp ou peça à equipe para registrar sua solicitação.</p>}
    <div><label htmlFor="org" className={label}>Empresa</label><select id="org" value={org} onChange={e=>{setOrg(e.target.value as Org);setCategory('');}} className={field}><option value="reparos-rmc">Reparos RMC</option><option value="piloto-automotivo">Piloto Elétrica e Baterias</option></select></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="name" className={label}>Nome do cliente *</label><input id="name" className={field} required maxLength={120} value={name} onChange={e=>setName(e.target.value)} /></div>
    <div><label htmlFor="phone" className={label}>WhatsApp com DDD *</label><input id="phone" className={field} inputMode="tel" type="tel" required placeholder="(19) 9XXXX-XXXX" value={phone} onChange={e=>setPhone(e.target.value)} /></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="category" className={label}>Qual serviço precisa? *</label><select id="category" className={field} required value={category} onChange={e=>setCategory(e.target.value)}><option value="">Escolha uma opção</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
    <div><label htmlFor="neighborhood" className={label}>Bairro / região *</label><input id="neighborhood" className={field} required value={neighborhood} onChange={e=>setNeighborhood(e.target.value)} maxLength={180} placeholder="Ex.: Jardim Nova Europa" /></div></div>
    <div><label htmlFor="address" className={label}>Endereço do serviço (opcional nesta triagem)</label><input id="address" className={field} value={address} onChange={e=>setAddress(e.target.value)} maxLength={300} placeholder="Rua e número, se necessário" /></div>
    <div><label htmlFor="description" className={label}>O que aconteceu e o que você precisa? *</label><textarea id="description" required minLength={12} maxLength={4000} rows={5} className={field} value={description} onChange={e=>setDescription(e.target.value)} placeholder={org==='reparos-rmc'?'Onde está o problema? Quando começou? O que já foi tentado? Quantos pontos precisam de reparo?':'Qual é o veículo (modelo/ano)? O que está acontecendo? O carro liga? Onde ele está?'} /><p className="mt-1 text-xs text-slate-500">Dica: localização exata do problema, sintomas e contexto ajudam a evitar novas perguntas.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="urgency" className={label}>Prioridade informada pelo cliente</label><select id="urgency" className={field} value={urgency} onChange={e=>setUrgency(e.target.value)}><option value="normal">Normal</option><option value="alta">Precisa de atenção prioritária</option></select></div><div><label htmlFor="preferred" className={label}>Preferência de contato</label><input id="preferred" className={field} value={preferredContact} onChange={e=>setPreferredContact(e.target.value)} maxLength={200} placeholder="Ex.: retorno depois das 16h" /></div></div>
    <div><label htmlFor="media" className={label}>Fotos e vídeo do problema (opcional)</label><input id="media" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="mt-2 block w-full text-sm" onChange={e=>setFiles(Array.from(e.target.files||[]))} /><p className="mt-2 text-xs text-slate-500">Até 3 fotos (5 MB cada) e 1 vídeo (15 MB). Arquivos serão armazenados em área privada. Não envie documentos pessoais ou imagens de terceiros desnecessárias.</p>{mediaValidation && <p role="alert" className="mt-2 text-sm text-red-700">{mediaValidation}</p>}</div>
    <label className="flex items-start gap-3 rounded-xl bg-[#f5f8f8] p-4 text-sm text-slate-700"><input type="checkbox" className="mt-1" checked={consent} onChange={e=>setConsent(e.target.checked)} required />{assisted ? 'Confirmo que informei o cliente sobre o registro dos dados e anexos no Atendimento Inteligente para elaboração e acompanhamento do orçamento, e recebi autorização para isso.' : 'Autorizo o uso dos dados e anexos informados para avaliação e contato sobre este serviço. Entendo que o orçamento e o agendamento dependem de confirmação humana.'}</label>
    {!assisted && turnstileSiteKey && <div className="space-y-2"><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile" data-sitekey={turnstileSiteKey} /></div>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <button type="submit" disabled={busy || Boolean(mediaValidation) || (isPublic && !turnstileSiteKey)} className="w-full rounded-xl bg-[#123e50] px-5 py-4 font-black text-white disabled:opacity-50">{busy?'Registrando e enviando anexos...':assisted?'Registrar pedido — N1':'Enviar solicitação'}</button>
    {isPublic && !turnstileSiteKey && <p className="text-center text-xs text-amber-800">Envio público desativado até configurar a proteção antispam. Atendimento assistido disponível após login de operador.</p>}
    <p className="text-xs text-slate-500">Esta solicitação não é confirmação de atendimento emergencial. Em risco à segurança, procure o serviço de emergência adequado.</p>
  </form>;
}
