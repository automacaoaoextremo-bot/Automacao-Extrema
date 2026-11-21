'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {MEDIA_TYPES} from '@/lib/atendimento-inteligente/intake';
type Phase='idle'|'starting'|'recording'|'paused'|'finishing'|'preview';
export function AiAudioRecorder({onFile,disabled=false}:{onFile:(file:File)=>void;disabled?:boolean}){
 const recorder=useRef<MediaRecorder|null>(null), stream=useRef<MediaStream|null>(null);
 const context=useRef<AudioContext|null>(null), frame=useRef(0), mounted=useRef(true), cancelled=useRef(false);
 const seconds=useRef(0), segment=useRef(0), meter=useRef<number[]>(Array(32).fill(3));
 const [phase,setPhase]=useState<Phase>('idle'),[error,setError]=useState(''),[elapsed,setElapsed]=useState(0);
 const objectUrl=useRef('');
 const [wave,setWave]=useState<number[]>(Array(32).fill(3)),[preview,setPreview]=useState<File|null>(null),[url,setUrl]=useState('');
 const release=useCallback(()=>{cancelAnimationFrame(frame.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;void context.current?.close().catch(()=>{});context.current=null;},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;cancelled.current=true;if(recorder.current&&recorder.current.state!=='inactive')recorder.current.stop();recorder.current=null;release();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);};},[release]);
 function discard(){cancelled.current=true;if(recorder.current&&recorder.current.state!=='inactive')recorder.current.stop();recorder.current=null;release();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current='';setPreview(null);setUrl('');setPhase('idle');setElapsed(0);}
 async function start(){
  setError('');setPhase('starting');cancelled.current=false;seconds.current=0;segment.current=0;setElapsed(0);meter.current=Array(32).fill(3);setWave(meter.current);
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Gravação indisponível. Use Anexar áudio.');
   const audio=await navigator.mediaDevices.getUserMedia({audio:true});if(!mounted.current||cancelled.current){audio.getTracks().forEach(t=>t.stop());return;}
   stream.current=audio;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
   const r=new MediaRecorder(audio,mime?{mimeType:mime}:undefined);recorder.current=r;
   const chunks:Blob[]=[];let size=0;
   r.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;}if(size>10*1024*1024&&r.state!=='inactive')r.stop();};
   r.onerror=()=>{if(recorder.current!==r)return;cancelled.current=true;release();if(mounted.current){setError('Falha na gravação. Tente novamente.');setPhase('idle');}};
   r.onstop=()=>{if(recorder.current!==r)return;release();recorder.current=null;if(!mounted.current||cancelled.current)return;
    const type=(r.mimeType||chunks[0]?.type||'').split(';')[0];const format=MEDIA_TYPES[type];
    if(!format||!type.startsWith('audio/')||!size||size>format.maxBytes){setError('Áudio vazio, acima de 10 MB ou formato não aceito.');setPhase('idle');return;}
    const file=new File(chunks,`gravacao-${Date.now()}${format.suffix}`,{type});objectUrl.current=URL.createObjectURL(file);setUrl(objectUrl.current);setPreview(file);setPhase('preview');};
   let analyser:AnalyserNode|null=null;let samples:Uint8Array<ArrayBuffer>|null=null;
   try{const c=new AudioContext();context.current=c;analyser=c.createAnalyser();analyser.fftSize=256;c.createMediaStreamSource(audio).connect(analyser);samples=new Uint8Array(new ArrayBuffer(analyser.fftSize));void c.resume().catch(()=>{});}catch{/* contador permanece funcional */}
   let last=0;function tick(now:number){if(r.state==='inactive'||cancelled.current)return;
    if(r.state==='recording'&&now-last>=100){last=now;const total=seconds.current+(performance.now()-segment.current)/1000;setElapsed(Math.floor(total));
     if(analyser&&samples){analyser.getByteTimeDomainData(samples);let sum=0;for(const v of samples)sum+=((v-128)/128)**2;meter.current=[...meter.current.slice(1),Math.max(3,Math.min(38,Math.sqrt(sum/samples.length)*180))];setWave(meter.current);}}
    frame.current=requestAnimationFrame(tick);}
   r.start(250);segment.current=performance.now();setPhase('recording');frame.current=requestAnimationFrame(tick);
  }catch(e){release();if(mounted.current){setPhase('idle');setError(e instanceof Error?e.message:'Não foi possível usar o microfone.');}}
 }
 function toggle(){const r=recorder.current;if(!r)return;if(r.state==='recording'){seconds.current+=(performance.now()-segment.current)/1000;r.pause();setPhase('paused');}else if(r.state==='paused'){segment.current=performance.now();r.resume();setPhase('recording');}}
 function finish(){const r=recorder.current;if(r&&r.state!=='inactive'){setPhase('finishing');r.stop();}}
 const active=phase==='recording'||phase==='paused';
 return <div className="space-y-2">
  {phase==='idle'&&<button type="button" disabled={disabled} onClick={()=>void start()} className="rounded-full bg-[#123b30] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">🎙 Gravar áudio</button>}
  {phase==='starting'&&<p role="status" className="text-xs">Aguardando microfone…</p>}
  {(active||phase==='finishing'||phase==='preview')&&<div className="rounded-2xl border bg-white p-3 text-[#173e53]">
   <div className="flex items-center gap-3"><span role="timer" className="font-semibold tabular-nums">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</span><svg viewBox="0 0 160 42" className="h-10 min-w-0 flex-1" aria-hidden="true">{wave.map((h,i)=><rect key={i} x={i*5} y={21-h/2} width="3" height={h} rx="1.5" fill="#54766b"/>)}</svg></div>
   {active&&<div className="mt-2 flex items-center justify-between gap-2"><button type="button" aria-label="Excluir gravação" onClick={discard} className="rounded-full bg-rose-100 px-3 py-3 text-rose-800">✕</button><button type="button" onClick={toggle} className="rounded-full bg-slate-100 px-3 py-3 text-sm font-bold">{phase==='paused'?'▶ Retomar':'Ⅱ Pausar'}</button><button type="button" onClick={finish} className="rounded-full bg-[#16734d] px-3 py-3 text-sm font-bold text-white">✓ Revisar</button></div>}
   {phase==='finishing'&&<p role="status" className="text-xs">Finalizando…</p>}
   {phase==='preview'&&preview&&<><audio controls preload="metadata" src={url||undefined} className="mt-2 w-full"/><div className="mt-2 flex justify-between gap-2"><button type="button" onClick={discard} className="rounded-full bg-rose-100 px-3 py-2 text-sm font-bold text-rose-800">Excluir</button><button type="button" disabled={disabled} onClick={()=>{onFile(preview);discard();}} className="rounded-full bg-[#16734d] px-4 py-2 text-sm font-bold text-white">✓ Anexar áudio</button></div></>}
  </div>}
  {error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}
 </div>;
}
