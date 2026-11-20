'use client';
import {useRef,useState} from 'react';
export function AiAudioRecorder({onFile,disabled=false}:{onFile:(file:File)=>void;disabled?:boolean}){
 const rec=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const chunks=useRef<Blob[]>([]);
 const [recording,setRecording]=useState(false);
 const [error,setError]=useState('');
 async function start(){
  setError('');
  try{
   if(typeof MediaRecorder==='undefined'||!navigator.mediaDevices?.getUserMedia)
     throw new Error('Este navegador nao oferece gravacao. Use Anexar audio.');
   const audio=await navigator.mediaDevices.getUserMedia({audio:true});
   stream.current=audio;chunks.current=[];
   const chosen=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus']
       .find(t=>MediaRecorder.isTypeSupported(t));
   const recorder=new MediaRecorder(audio,chosen?{mimeType:chosen}:undefined);
   rec.current=recorder;
   recorder.ondataavailable=e=>{if(e.data.size>0)chunks.current.push(e.data);};
   recorder.onerror=()=>setError('Erro na gravacao. Tente anexar um arquivo.');
   recorder.onstop=()=>{
    const mime=recorder.mimeType.split(';')[0]||'audio/webm';
    const extension=mime==='audio/mp4'?'m4a':mime==='audio/ogg'?'ogg':'webm';
    const result=new File(chunks.current,`gravacao-${Date.now()}.${extension}`,{type:mime});
    stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
    if(result.size>10*1024*1024){setError('Gravacao acima de 10 MB. Grave por menos tempo.');return;}
    if(result.size)onFile(result);
    setRecording(false);
   };
   recorder.start(1000);setRecording(true);
  }catch(e){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
   setError(e instanceof Error?e.message:'Nao foi possivel acessar o microfone.');}
 }
 function stop(){if(rec.current?.state==='recording'){rec.current.stop();setRecording(false);}}
 return <div className="space-y-1">
  <button type="button" disabled={disabled} onClick={()=>recording?stop():void start()}
   className="rounded-lg border border-orange-400 bg-orange-50 px-3 py-2 text-sm font-bold text-[#7a3e0b] disabled:opacity-50">
   {recording?'■ Parar e anexar gravacao':'🎙 Gravar audio'}
  </button>
  {recording&&<p role="status" className="text-xs text-rose-700">Gravando. Toque para finalizar.</p>}
  {error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}
 </div>;
}
