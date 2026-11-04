import Link from 'next/link';
import type { Metadata } from 'next';
import { AiBrandHeader } from '@/components/atendimento-inteligente/brand-header';

export const metadata: Metadata = {
  title: 'Reparos RMC | Atendimento Inteligente',
  description: 'Solicite manutenção ou reparo com informações organizadas para avaliação da Reparos RMC em Campinas e região.',
};

const benefits = [
  ['Mais clareza', 'Explique o problema uma vez e informe os detalhes que facilitam a avaliação.'],
  ['Menos idas e vindas', 'Envie contexto, localização e imagens para reduzir perguntas repetidas.'],
  ['Atendimento humano', 'O Anderson avalia a solicitação e confirma os próximos passos.'],
];

export default function AtendimentoInteligenteLanding() {
  return <div className="min-h-screen bg-[#f5f8f8] text-[#16384b]">
    <AiBrandHeader />
    <main>
      <section className="bg-gradient-to-br from-[#123e50] via-[#174e61] to-[#236175] px-4 py-12 text-white sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#f3c778]">Reparos RMC • Campinas e região</p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Seu problema merece atenção. Seu tempo, também.</h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-100">Conte o que precisa ser resolvido e ajude nossa equipe a entender o serviço antes da avaliação. Sem repetir sua história a cada mensagem.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-[#f3c778] px-6 py-3 font-bold text-[#123e50] hover:bg-[#ffe0a4]" href="/solucoes/atendimento-inteligente/solicitar">Quero solicitar um serviço</Link>
            <a className="rounded-full border border-white/50 px-6 py-3 font-bold hover:bg-white/10" href="https://www.reparosrmc.com.br/servicos/" target="_blank" rel="noopener noreferrer">Ver serviços oferecidos</a>
          </div>
          <p className="mt-6 text-sm text-slate-200">Solicitar não confirma preço, prazo ou visita. Você receberá retorno após análise humana.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-black sm:text-3xl">Por que usar o Atendimento Inteligente?</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">{benefits.map(([title, body]) =>
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p></article>)}</div>
      </section>
      <section className="bg-white px-4 py-12"><div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-black sm:text-3xl">Como funciona</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">{[
          ['1', 'Descreva', 'Escolha o serviço, informe o problema e a região do atendimento.'],
          ['2', 'Compartilhe detalhes', 'Fotos e vídeos ajudam a entender o contexto antes do orçamento.'],
          ['3', 'Receba a avaliação', 'A equipe verifica os dados e informa os próximos passos.'],
        ].map(([n, t, desc]) => <div className="rounded-2xl bg-[#eef5f6] p-5" key={n}><span className="text-2xl font-black text-[#b47c26]">{n}</span><h3 className="mt-2 font-bold">{t}</h3><p className="mt-2 text-sm text-slate-600">{desc}</p></div>)}</div>
        <div className="mt-9 flex flex-wrap gap-3"><Link className="rounded-full bg-[#123e50] px-6 py-3 font-bold text-white" href="/solucoes/atendimento-inteligente/solicitar">Registrar solicitação</Link><Link className="rounded-full border px-6 py-3 font-semibold" href="/solucoes/atendimento-inteligente/entrar">Área da equipe</Link></div>
        <p className="mt-6 text-sm text-slate-600">Durante o piloto, o cadastro pode ser realizado pela equipe de atendimento, com autorização do cliente.</p>
      </div></section>
    </main>
    <footer className="px-4 py-5 text-center text-xs text-slate-500">Reparos RMC • Atendimento humano e serviço sujeito a análise e disponibilidade.</footer>
  </div>;
}
