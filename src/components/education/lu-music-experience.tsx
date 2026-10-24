"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { LU_BASE_PATH,luTracks } from "@/lib/education/lu-pilot";
import { LuHeader } from "@/components/education/lu-header";
const PAGE_SIZE=4;
const fmt=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,"0")}`;
type PublicVersion={id:string;track_id:string;url?:string};
type Dialog="closed"|"list"|"player";
export function LuMusicExperience({initialTrackId}:{initialTrackId?:string}){
 const initial=Math.max(0,luTracks.findIndex(s=>s.id===initialTrackId));
 const [current,setCurrent]=useState(initial);
 const [dialog,setDialog]=useState<Dialog>(initialTrackId?"player":"closed");
 const [page,setPage]=useState(Math.floor(initial/PAGE_SIZE));
 const [playing,setPlaying]=useState(false);
 const [duration,setDuration]=useState(0);
 const [time,setTime]=useState(0);
 const [lyrics,setLyrics]=useState(false);
 const [versions,setVersions]=useState<PublicVersion[]>([]);
 const [familyReleased,setFamilyReleased]=useState(false);
 const [feedback,setFeedback]=useState("");
 const audio=useRef<HTMLAudioElement>(null);
 const song=luTracks[current];
 const active=versions.find(v=>v.track_id===song.id&&v.url);
 const source=active?.url||`/education-demo/audio/musica-${song.id}.mp3`;
 const load=useCallback(()=>{fetch(`${LU_BASE_PATH}/api`,{cache:"no-store"}).then(r=>r.json()).then(d=>{setVersions(d.versions||[]);setFamilyReleased(!!d.project?.family_released);}).catch(()=>{});},[]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{if(dialog==="closed")return;const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setDialog("closed");};document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey);},[dialog]);
 useEffect(()=>{if(dialog!=="player"&&audio.current)audio.current.pause();},[dialog]);
 const select=(index:number)=>{setCurrent(index);setTime(0);setDuration(0);setPlaying(false);setLyrics(false);setDialog("player");load();};
 useEffect(()=>{const p=audio.current;if(!p)return;p.pause();p.load();},[current,source]);
 const play=async()=>{if(!audio.current)return;if(audio.current.paused){try{await audio.current.play();}catch{setPlaying(false);}}else audio.current.pause();};
 const close=()=>{audio.current?.pause();setDialog("closed");setPlaying(false);};
 const choosePage=(n:number)=>setPage(Math.min(2,Math.max(0,n)));
 const openList=()=>{audio.current?.pause();setPlaying(false);setDialog("list");};
 async function shareFeedback(){const text=`Livro Musical da Lu — feedback:\n${feedback||"Sem observações."}`;if(navigator.share){try{await navigator.share({text,title:"Livro Musical — sugestões"});return;}catch{}}window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");}
 return <main className="lu-root lu-book"><LuHeader/>
 <div className="lu-container">
  <section className="lu-hero"><span className="lu-eyebrow">✨ Uma recordação que ganha voz</span><h1>Nosso Livro <em>Musical!</em> 🎶</h1><p>Uma página para guardar músicas, desenhos e momentos especiais vividos na escola. Feita para ouvir e cantar em família!</p><div className="lu-hero-tags"><span>🎵 12 músicas</span><span>🎨 desenhos da turma em breve</span><span>📱 feito para o celular</span></div></section>
  <section className="lu-collection-entry"><span className="lu-collection-caption">✨ NOSSA COLEÇÃO</span><button type="button" className="lu-open-card" onClick={openList}><span><strong>Escolha uma música</strong><small>CLIQUE PARA ABRIR</small></span><span className="lu-track-count">12 canções</span><span aria-hidden="true">›</span></button></section>
  <section className="lu-note"><span>💚</span><div><strong>Feito com carinho</strong><p>O livro físico é a estrela! Esta página complementa a experiência e convida a família a cantar junto com as crianças.</p></div></section>
  <section className="lu-feedback"><h2>Lu, conte o que achou!</h2><p>O que podemos melhorar no livro musical? Seu texto é compartilhado pelo WhatsApp, sem ser armazenado na página.</p><textarea aria-label="Sugestões para o projeto" maxLength={1500} rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Suas sugestões..."/><button type="button" className="lu-button lu-button-primary" onClick={shareFeedback}>💬 Compartilhar sugestões</button></section>
  <footer className="lu-footer"><strong>Memórias que Encantam</strong><span>Uma experiência da Automação Extrema</span></footer>
 </div>
 {dialog!=="closed"&&<div className="lu-dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><section className="lu-dialog" role="dialog" aria-modal="true" aria-label={dialog==="list"?"Escolha uma música":song.title}>
  <div className="lu-dialog-head"><strong>{dialog==="list"?"🎶 Escolha uma música":`🎧 Música ${song.id} de 12`}</strong><button type="button" aria-label="Fechar janela" className="lu-dialog-close" onClick={close}>✕</button></div>
  {dialog==="list"?<><div className="lu-dialog-list">{luTracks.slice(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE).map((t,index)=><button type="button" key={t.id} className="lu-track" onClick={()=>select(page*PAGE_SIZE+index)}><span className="lu-art" aria-hidden="true">{t.art}</span><span className="lu-track-main"><small>MÚSICA {t.id}</small><strong>{t.title}</strong><small>{versions.some(v=>v.track_id===t.id&&v.url)?"Ouvir gravação escolhida":"Ouvir demonstração"}</small></span><span className="lu-track-arrow" aria-hidden="true">›</span></button>)}</div>
   <div className="lu-pager"><button type="button" onClick={()=>choosePage(page-1)} disabled={page===0}>‹ Anterior</button><span>Página {page+1} de 3</span><button type="button" onClick={()=>choosePage(page+1)} disabled={page===2}>Próxima ›</button></div></>:
   <div className="lu-dialog-player"><div className={`lu-player-illustration lu-tint-${song.tint}`} aria-hidden="true"><span>{song.art}</span></div><h2>{song.title}</h2><p>{active?.url?"Gravação escolhida pela escola":familyReleased?"Gravação ainda não selecionada — demonstração instrumental":"Demonstração instrumental até a liberação da escola"}</p>
   <audio ref={audio} preload="metadata" src={source} onLoadedMetadata={e=>setDuration(e.currentTarget.duration||0)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}/>
   <label className="lu-sr-only" htmlFor="lu-seek-v3">Posição da música</label><input id="lu-seek-v3" type="range" className="lu-seek" min="0" max={Math.max(duration,1)} step="0.1" value={Math.min(time,Math.max(duration,1))} onChange={e=>{if(audio.current)audio.current.currentTime=Number(e.target.value);}}/>
   <div className="lu-time"><span>{fmt(time)}</span><span>{fmt(duration)}</span></div><div className="lu-controls"><button type="button" aria-label="Música anterior" onClick={()=>select((current+11)%12)}>⏮</button><button type="button" aria-label={playing?"Pausar":"Reproduzir"} className="lu-play" onClick={play}>{playing?"Ⅱ":"▶"}</button><button type="button" aria-label="Próxima música" onClick={()=>select((current+1)%12)}>⏭</button></div>
   <button type="button" className="lu-lyrics-toggle" onClick={()=>setLyrics(v=>!v)} aria-expanded={lyrics}>📖 {lyrics?"Ocultar espaço da letra":"Ver espaço da letra"}<span>{lyrics?"−":"+"}</span></button>
   {lyrics&&<div className="lu-lyrics"><p>As letras e as ilustrações originais aparecerão aqui após a conferência e autorização da escola.</p></div>}
   <button type="button" className="lu-list-back" onClick={openList}>← Voltar à lista de músicas</button></div>}
 </section></div>}
 </main>;
}
