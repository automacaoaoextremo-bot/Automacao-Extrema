"use client";
import Image from "next/image";
import { useCallback,useEffect,useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { LU_BASE_PATH,luTracks } from "@/lib/education/lu-pilot";
type Version={id:string;track_id:string;source_type:string;original_filename:string;status:string;is_selected:boolean;url?:string;};
type Data={project:{media_authorized:boolean;family_released:boolean};versions:Version[];error?:string};
const labels:Record<string,string>={celular:"Gravador do celular",whatsapp:"Áudio do WhatsApp",nova:"Nova gravação"};
export function LuCuration(){
 const [data,setData]=useState<Data|null>(null); const [err,setErr]=useState("");const [busy,setBusy]=useState("");
 const refresh=useCallback(async()=>{try{const r=await fetch(`${LU_BASE_PATH}/api`,{cache:"no-store"});const value=await r.json();if(!r.ok)throw new Error(value.error||"Falha no carregamento");setData(value);setErr("");}catch(e){setErr(e instanceof Error?e.message:"Erro ao consultar arquivos");}},[]);
 useEffect(()=>{let active=true;fetch(`${LU_BASE_PATH}/api`,{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Falha no carregamento");return d;}).then(d=>{if(active)setData(d);}).catch(e=>{if(active)setErr(e instanceof Error?e.message:"Erro no carregamento");});return()=>{active=false};},[]);
 async function action(id:string,verb:string){setBusy(id);setErr("");try{const r=await fetch(`${LU_BASE_PATH}/api/action`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action:verb})});const d=await r.json();if(!r.ok)throw new Error(d.error);await refresh();}catch(e){setErr(e instanceof Error?e.message:"Erro ao atualizar versão");}finally{setBusy("");}}
 async function upload(trackId:string,file:File|null){if(!file)return;setBusy(trackId);setErr("");try{
  const tokenRes=await fetch(`${LU_BASE_PATH}/api/upload-token`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({trackId,fileName:file.name,fileType:file.type,fileSize:file.size,sourceType:"nova"})});
  const signed=await tokenRes.json();if(!tokenRes.ok)throw new Error(signed.error||"Erro ao iniciar envio");
  if(!signed.url||!signed.anonKey)throw new Error("Supabase público não configurado");
  const client=createClient(signed.url,signed.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:uploadError}=await client.storage.from(signed.bucket).uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type});
  if(uploadError)throw uploadError;
  const done=await fetch(`${LU_BASE_PATH}/api/complete`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:signed.id})});const result=await done.json();if(!done.ok)throw new Error(result.error||"Arquivo enviado, mas não confirmado");
  await refresh();
 }catch(e){setErr(e instanceof Error?e.message:"Erro no envio");}finally{setBusy("");}}
 return <main className="lu-root lu-book"><header className="lu-brandhead"><div className="lu-brandtop"><span className="lu-brandicon">📖</span><div><strong>Nosso Livro Musical</strong><span>Curadoria das professoras • Projeto da Lu</span></div></div><div className="lu-brandbottom"><span>Desenvolvido por</span><Image src="/ae-logo-horizontal.png" alt="Automação Extrema" width={160} height={49}/><div className="lu-headbuttons"><a href={LU_BASE_PATH}>Voltar</a><form method="post" action={`${LU_BASE_PATH}/admin/sair`}><button type="submit">Sair</button></form></div></div></header>
 <div className="lu-container"><section className="lu-hero"><span className="lu-eyebrow">🎧 Homologação de gravações</span><h1>Escolha as vozes da turma</h1><p>Compare as duas origens de cada música, envie uma nova versão e escolha aquela que ficará no livro.</p></section>
 <aside className="lu-preview-alert"><span>🔒</span><div><strong>Somente curadoria, ainda não é a publicação para as famílias.</strong><p>A versão escolhida só aparece às famílias quando o responsável pelo projeto liberar a publicação no banco de dados, após as autorizações da escola.</p></div></aside>
 {data&&<div className="lu-curation-status"><span>Gravações autorizadas para armazenamento: <strong>{data.project.media_authorized?"Sim":"Ainda não"}</strong></span><span>Liberação para famílias: <strong>{data.project.family_released?"Sim":"Bloqueada"}</strong></span></div>}
 {err&&<div className="lu-alert" role="alert">{err}</div>}
 {!data&&!err&&<p>Carregando as gravações...</p>}
 <section className="lu-curation-grid">{luTracks.map((track)=>{const versions=(data?.versions||[]).filter(v=>v.track_id===track.id);return <article key={track.id} className="lu-curation-card"><div className="lu-curation-title"><span className="lu-curation-art">{track.art}</span><div><small>MÚSICA {track.id}</small><h2>{track.title}</h2></div></div>{versions.length===0?<p className="lu-curation-empty">Nenhuma gravação enviada.</p>:versions.map(v=><div className="lu-curation-version" key={v.id}><div><strong>{labels[v.source_type]||v.source_type}</strong>{v.is_selected&&<span className="lu-pill-ok">✓ Escolhida</span>}{v.status==="hidden"&&<span className="lu-pill-hide">Oculta</span>}<small title={v.original_filename}>{v.original_filename}</small></div>{v.url&&v.status!=="hidden"&&<audio controls preload="none" src={v.url} aria-label={`${track.title} - ${labels[v.source_type]||v.source_type}`}/>}<div className="lu-curation-actions">{v.status!=="hidden"?<><button type="button" onClick={()=>action(v.id,"choose")} disabled={busy!==""||v.is_selected}>Escolher esta</button><button type="button" onClick={()=>action(v.id,"hide")} disabled={busy!==""}>Ocultar</button></>:<button type="button" onClick={()=>action(v.id,"restore")} disabled={busy!==""}>Restaurar</button>}</div></div>)}
 <label className="lu-upload"><span>➕ Enviar outra gravação</span><input type="file" accept="audio/mp4,audio/x-m4a,audio/ogg,audio/mpeg,audio/wav,audio/x-wav,audio/webm,audio/aac,.m4a,.mp3,.ogg,.wav,.webm,.aac" disabled={busy!==""||!data?.project.media_authorized} onChange={e=>{void upload(track.id,e.target.files?.[0]||null);e.currentTarget.value="";}}/></label>{busy===track.id&&<small>Enviando gravação...</small>}</article>})}</section>
 <div className="lu-helptext"><strong>Como funciona:</strong> “Escolher esta” mantém uma única opção ativa por música. “Ocultar” tira a versão da curadoria sem apagar o arquivo original. Somente uma pessoa autorizada pela escola deve fazer as escolhas. Áudios autorizados ficam em bucket privado.</div>
 </div></main>;
}
