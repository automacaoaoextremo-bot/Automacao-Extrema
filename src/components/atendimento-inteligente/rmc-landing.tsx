'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AiBrandHeader } from './brand-header';
const root = '/solucoes/atendimento-inteligente/rmc';
const cards = [
  { title: 'Por que usar', body: 'Você explica o problema com calma, reúne fotos e evita repetir as mesmas informações em várias mensagens. O Anderson recebe um pedido mais completo.' },
  { title: 'Como funciona', body: 'O nível 1 organiza seu pedido, o Anderson verifica os detalhes e decide sobre orçamento, visita ou informações adicionais. Preço e horário só são confirmados depois da análise.' },
  { title: 'Serviços atendidos', body: 'Hidráulica, elétrica, vazamentos, portas, janelas, telhado, pintura, instalações e pequenos reparos, conforme disponibilidade e capacidade técnica.' },
];
export function RmcLanding() {
  const [open, setOpen] = useState<number|null>(null);
  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(null); }
    window.addEventListener('keydown',onKey);
    return () => window.removeEventListener('keydown',onKey);
  },[open]);
  return <div className="min-h-screen bg-[#f2f5f7] text-[#223d50]"><AiBrandHeader />
    <main className="mx-auto flex min-h-[calc(100svh-132px)] max-w-4xl flex-col px-3 py-4 sm:px-5 sm:py-8">
      <section className="flex flex-1 flex-col justify-center rounded-[28px] bg-gradient-to-br from-[#203d52] to-[#2b6073] px-5 py-6 text-white shadow-lg sm:px-9 sm:py-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffae52] sm:text-xs">Reparos RMC • Campinas e região</p>
        <h1 className="mt-3 max-w-xl text-3xl font-black leading-tight sm:text-5xl">Seu problema merece atenção. Seu tempo, também.</h1>
        <p className="mt-3 max-w-xl text-sm text-slate-100 sm:text-base">Conte o que aconteceu uma vez. Nossa equipe organiza as informações para uma avaliação humana mais ágil e clara.</p>
        <Link className="mt-5 inline-flex w-fit rounded-full bg-[#f3912b] px-5 py-3 text-sm font-black text-[#1d2d35]" href={`${root}/solicitar`}>Quero solicitar um serviço</Link>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">{cards.map((item,i)=><button type="button" key={item.title} onClick={()=>setOpen(i)} className="rounded-xl border border-white/40 bg-white p-3 text-left text-sm font-black text-[#254355] shadow-sm hover:bg-[#fff1e1]">{item.title}<span className="block text-[10px] font-bold uppercase tracking-wide text-[#d07b23]">Toque para ver</span></button>)}</div>
        <p className="mt-3 text-xs text-slate-200">Solicitar não garante prazo, preço ou visita. Atendimento humano sujeito a disponibilidade.</p>
      </section>
    </main>
    {open!==null&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(null);}}>
      <section role="dialog" aria-modal="true" aria-labelledby="rmc-modal-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><h2 id="rmc-modal-title" className="text-xl font-black">{cards[open].title}</h2><button type="button" autoFocus aria-label="Fechar" onClick={()=>setOpen(null)} className="rounded-full border px-3 py-1">×</button></div>
        <p className="mt-4 text-sm leading-relaxed text-slate-700">{cards[open].body}</p>
        <Link href={`${root}/solicitar`} className="mt-6 inline-flex rounded-full bg-[#f3912b] px-5 py-3 text-sm font-bold" onClick={()=>setOpen(null)}>Solicitar atendimento</Link>
      </section>
    </div>}
  </div>;
}
