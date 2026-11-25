"use client";
import { useEffect, useState, type FormEvent } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";

type Photo = { id: string; url: string; author_name: string; caption: string };
type Payload = { name: string; open: boolean; photos?: Photo[]; more?: boolean; error?: string };
type Item = { id: string; file: File; status: "waiting" | "sending" | "done" | "failed"; error?: string };
async function jpeg(file: File) {
  if (file.size > 35*1024*1024) throw new Error("Arquivo acima de 35 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    const factor = Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1,Math.round(image.naturalWidth*factor)); canvas.height = Math.max(1,Math.round(image.naturalHeight*factor));
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Não foi possível preparar a foto.");
    ctx.fillStyle = "white"; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for (const q of [.85,.7,.55,.4]) {
      const blob = await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",q));
      if (blob && blob.size <= 3*1024*1024) return blob;
    }
    throw new Error("Foto muito grande. Selecione uma versão menor.");
  } finally { URL.revokeObjectURL(url); }
}
const button = "rounded-xl bg-[#00334E] px-4 py-3 text-white font-bold disabled:opacity-50";
export function PresencaPhotoPublic({slug, album=false}:{slug:string;album?:boolean}) {
  const [key,setKey]=useState(""); const [data,setData]=useState<Payload|null>(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  const [items,setItems]=useState<Item[]>([]); const [author,setAuthor]=useState(""); const [caption,setCaption]=useState(""); const [consent,setConsent]=useState(false); const [share,setShare]=useState(false); const [busy,setBusy]=useState(false); const [page,setPage]=useState(0);
  const endpoint=`/api/presenca-querida/public/photos/${encodeURIComponent(slug)}`;
  useEffect(()=>{ let active=true; async function load(){
    const token=new URLSearchParams(window.location.hash.slice(1)).get("chave") || "";
    try { if (!token) throw new Error("Use o QR Code da mesa ou solicite o link à organização.");
      const response=await fetch(`${endpoint}?mode=${album?"album":"upload"}&page=${page}`,{headers:{"x-pq-photo-key":token},cache:"no-store"});
      const payload=await response.json() as Payload; if(!response.ok) throw new Error(payload.error||"Link indisponível.");
      if(active){setKey(token);setData(payload);setError("");}
    } catch(e){if(active)setError(e instanceof Error?e.message:"Falha na consulta.");} finally{if(active)setLoading(false);}
  } void load();return()=>{active=false;};},[endpoint,album,page]);
  function select(files: FileList|null) { if(!files)return; setItems(old=>[...old.filter(x=>x.status!=="done"),...Array.from(files).slice(0,20).map(file=>({id:crypto.randomUUID(),file,status:"waiting" as const}))].slice(0,20)); }
  async function send(e:FormEvent){ e.preventDefault(); if(busy||!consent||!data?.open)return; setBusy(true);setError("");
    for(const item of items.filter(x=>x.status!=="done")) {
      setItems(old=>old.map(x=>x.id===item.id?{...x,status:"sending",error:undefined}:x));
      try { const blob=await jpeg(item.file); const form=new FormData(); form.set("photo",blob,"foto.jpg");form.set("author",author);form.set("caption",caption);form.set("consent","yes");form.set("share",share?"yes":"no");
        const r=await fetch(endpoint,{method:"POST",headers:{"x-pq-photo-key":key},body:form});const p=await r.json();if(!r.ok)throw new Error(p.error||"Falha no envio.");
        setItems(old=>old.map(x=>x.id===item.id?{...x,status:"done"}:x));
      } catch(e){setItems(old=>old.map(x=>x.id===item.id?{...x,status:"failed",error:e instanceof Error?e.message:"Falha no envio."}:x));}
    } setBusy(false);
  }
  return <main className="min-h-screen bg-[#fffaf8] text-[#00334E]"><AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Presença Querida" homeHref="/solucoes/presenca-querida" actions={[]} sectionLinks={[]}/><section className="mx-auto max-w-3xl space-y-5 px-4 py-8"><p className="text-sm font-bold uppercase tracking-widest text-[#a83e59]">{data?.name || "Presença Querida"}</p><h1 className="text-3xl font-black">{album?"Álbum de memórias":"Uma festa. Muitos olhares. Infinitas lembranças."}</h1>
  {loading?<p>Carregando…</p>:error?<p role="alert" className="rounded-xl bg-rose-100 p-4">{error}</p>:!data?.open?<p className="rounded-xl bg-white p-5">{album?"O álbum ainda não foi liberado pela organização.":"O recebimento de fotos está fechado neste momento."}</p>:album?<><p>Momentos compartilhados com carinho pelos convidados e selecionados pela organização.</p><div className="grid grid-cols-2 gap-3">{data.photos?.map(p=><figure key={p.id} className="overflow-hidden rounded-xl bg-white p-2">
    {/* URLs assinadas: acesso direto, sem passar pelo otimizador público. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={p.url} alt={p.caption||"Memória do evento"} loading="lazy" referrerPolicy="no-referrer" className="aspect-square w-full object-cover"/>
    <figcaption className="break-words text-sm">{p.caption}{p.author_name&&<p>— {p.author_name}</p>}</figcaption></figure>)}</div>{!data.photos?.length&&<p>Nenhuma foto publicada nesta página.</p>}<div className="flex gap-2"><button className={button} disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><button className={button} disabled={!data.more} onClick={()=>setPage(p=>p+1)}>Próxima</button><button className={button} onClick={()=>window.location.reload()}>Atualizar</button></div></>:<><p className="text-lg">Que tal ajudar a guardar essa história através do seu olhar? Compartilhe os abraços, sorrisos e reencontros que você registrar.</p><form onSubmit={send} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm"><fieldset disabled={busy} className="space-y-4"><label className="block font-bold">Seu nome (opcional)<input className="mt-1 w-full rounded-lg border p-3" value={author} maxLength={80} onChange={e=>setAuthor(e.target.value)}/></label><label className="block font-bold">Legenda para este lote (opcional)<input className="mt-1 w-full rounded-lg border p-3" value={caption} maxLength={240} onChange={e=>setCaption(e.target.value)}/></label><label className="block rounded-xl border-2 border-dashed border-[#E85D75] p-4 font-bold">Escolha até 20 fotos<input type="file" multiple accept="image/*" className="mt-2 block w-full text-sm" onChange={e=>{select(e.target.files);e.target.value="";}}/></label><label className="block text-sm">Ou tire uma foto<input type="file" accept="image/*" capture="environment" className="mt-2 block w-full" onChange={e=>{select(e.target.files);e.target.value="";}}/></label><label className="flex gap-2 text-sm"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo o armazenamento e acesso pela organização para compor as memórias privadas do evento. Tenho autorização das pessoas retratadas, especialmente responsáveis por menores.</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)}/> Autorizo também a divulgação destas fotos, nome e legenda no álbum de convidados, após curadoria. Opcional; não inclui divulgação comercial.</label></fieldset><ul className="space-y-2" aria-live="polite">{items.map(x=><li key={x.id} className="flex items-start justify-between gap-2 break-all rounded-lg bg-slate-50 p-2 text-sm"><span>{x.file.name} — {({waiting:"Aguardando",sending:"Enviando…",done:"Enviada",failed:"Falhou"})[x.status]}{x.error&&<span className="block text-red-700">{x.error} (HEIC não suportado? Exporte como JPEG.)</span>}</span>{!busy&&x.status!=="done"&&<button type="button" onClick={()=>setItems(old=>old.filter(i=>i.id!==x.id))}>Remover</button>}</li>)}</ul><button className={`${button} w-full`} disabled={busy||!consent||!items.some(x=>x.status!=="done")}>{busy?"Enviando fotos…":"Compartilhar minhas fotos"}</button>{items.some(x=>x.status==="done")&&<p role="status" className="rounded-lg bg-green-50 p-3">Obrigada por ajudar a guardar esse momento! {items.filter(x=>x.status==="done").length} foto(s) recebida(s).</p>}<p className="text-xs text-slate-600">Sem cadastro. Para solicitar remoção, procure a organização. Não feche a página durante o envio.</p></form></>}
  </section></main>;
}
