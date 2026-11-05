'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { AiBrandHeader } from './brand-header';
const root='/solucoes/atendimento-inteligente/rmc';
const cards=[
 {title:'Por que usar',body:'Seu tempo importa. Conte o que está acontecendo uma única vez e reúna as informações que ajudam nossa equipe a entender o serviço. Menos mensagens repetidas, mais clareza no acompanhamento.'},
 {title:'Como funciona',body:'Você descreve o problema e, se puder, anexa fotos. A equipe avalia as informações, esclarece o que faltar e retorna com os próximos passos. Valores e datas só são confirmados após análise.'},
 {title:'Serviços atendidos',body:'A Reparos RMC atende demandas de elétrica, hidráulica, vazamentos, portas, janelas, telhados, pintura, jardinagem, instalações e outros pequenos reparos, conforme disponibilidade e avaliação técnica.'},
];
export function RmcLanding(){
 const [open,setOpen]=useState<number|null>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(open===null)return;
  function esc(e:KeyboardEvent){if(e.key==='Escape')setOpen(null);}
  window.addEventListener('keydown',esc);closeRef.current?.focus();
  return()=>window.removeEventListener('keydown',esc);
 },[open]);
 return <div className="min-h-screen bg-[#f2f5f7] text-[#223d50]"><AiBrandHeader/>
   <main className="mx-auto flex min-h-[calc(100svh-140px)] max-w-4xl flex-col p-3 sm:p-5">
     <section className="flex flex-1 flex-col justify-center rounded-[28px] bg-gradient-to-br from-[#203d52] to-[#2b6073] p-5 text-white shadow-lg sm:p-9">
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffae52]">Reparos RMC • Campinas e região</p>
       <h1 className="mt-3 max-w-xl text-3xl font-black leading-tight sm:text-5xl">Seu problema merece atenção. Seu tempo, também.</h1>
       <p className="mt-3 max-w-xl text-sm text-slate-100 sm:text-base">Descreva o que precisa ser resolvido e ajude nossa equipe a organizar uma avaliação mais clara, com menos idas e vindas.</p>
       <Link className="mt-5 inline-flex w-fit rounded-full bg-[#f3912b] px-5 py-3 text-sm font-black text-[#1d2d35]" href={`${root}/solicitar`}>Quero solicitar um serviço</Link>
       <div className="mt-5 grid gap-2 sm:grid-cols-3">{cards.map((c,i)=><button type="button" key={c.title} onClick={()=>setOpen(i)} className="rounded-xl border border-white/40 bg-white p-3 text-left text-sm font-black text-[#254355] shadow-sm hover:bg-orange-50">{c.title}<span className="block text-[10px] font-bold uppercase tracking-wide text-[#d07b23]">Toque para ver</span></button>)}</div>
       <p className="mt-3 text-xs text-slate-200">O pedido não confirma preço, prazo ou visita. A avaliação depende da disponibilidade da equipe.</p>
     </section>
   </main>
   {open!==null&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(null);}}>
     <section role="dialog" aria-modal="true" aria-labelledby="rmc-title" className="w-full max-w-md rounded-3xl bg-white p-6 text-[#254355] shadow-2xl">
       <h2 id="rmc-title" className="text-xl font-black">{cards[open].title}</h2>
       <p className="mt-4 text-sm leading-relaxed">{cards[open].body}</p>
       <div className="mt-6 flex flex-wrap gap-3"><button ref={closeRef} type="button" onClick={()=>setOpen(null)} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-bold">Fechar</button>
         <Link href={`${root}/solicitar`} className="rounded-full bg-[#f3912b] px-5 py-2 text-sm font-bold" onClick={()=>setOpen(null)}>Solicitar serviço</Link></div>
     </section></div>}
 </div>;
}
