import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Atendimento Inteligente | Automação Extrema',
  description: 'Atendimento organizado para empresas, do primeiro contato à solução.',
};

export default function AtendimentoInteligenteHome() {
  return <main className="min-h-screen bg-[#f1f7f7] text-[#133c4e]">
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
      <Link href="/" className="flex items-center gap-2 font-black"><Image src="/ae-logo-horizontal.png" alt="Automação Extrema" width={122} height={44} className="h-11 w-auto object-contain" /> Atendimento Inteligente</Link>
      <Link href="/login" className="rounded-full border border-[#133c4e] px-4 py-2 text-sm font-semibold">Gestão AE</Link>
    </header>
    <section className="mx-auto max-w-5xl px-4 py-10 sm:py-20">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#317b77]">Uma solução multiempresa da Automação Extrema</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Mais tempo para atender bem. Menos pedidos perdidos.</h1>
      <p className="mt-5 max-w-2xl text-lg text-slate-600">Organizamos as necessidades de seus clientes, os orçamentos e os próximos passos, sem exigir que tudo dependa de uma única pessoa.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <Image src="/atendimento-inteligente/logo-rmc.png" alt="Logotipo Reparos RMC" width={180} height={100} className="h-20 w-auto object-contain" />
          <h2 className="mt-3 text-xl font-black">Reparos RMC</h2>
          <p className="mt-2 text-sm text-slate-600">Manutenção, reparos e atendimento assistido em Campinas e região.</p>
          <Link href="/solucoes/atendimento-inteligente/rmc" className="mt-5 inline-flex rounded-full bg-[#ee8b25] px-5 py-3 font-bold text-[#1e252b]">Conhecer o atendimento RMC</Link>
        </article>
        <article className="rounded-3xl border border-dashed bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Outras empresas</h2>
          <p className="mt-3 text-sm text-slate-600">Novos atendimentos serão disponibilizados após a homologação individual de cada negócio.</p>
          <p className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">Nenhum atendimento do Centro Automotivo Piloto é ativado automaticamente nesta fase.</p>
        </article>
      </div>
    </section>
  </main>;
}
