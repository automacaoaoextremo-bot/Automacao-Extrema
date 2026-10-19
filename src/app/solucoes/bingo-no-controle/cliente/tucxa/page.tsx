import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const vantagens = [
  { titulo: "Uma tarde para viver junto", texto: "Compartilhe bons momentos com amigos, familiares e pessoas que fazem parte da história do TUCXA." },
  { titulo: "Prêmios com transparência", texto: "Confira as prendas confirmadas, as regras e as rodadas diretamente na página de cada evento." },
  { titulo: "Sua participação faz diferença", texto: "Apoie as atividades da casa e acompanhe a prestação de contas do evento." },
];

export default function BingoTucxaPage() {
  return (
    <div className="min-h-screen bg-[#fffdf7] text-[#153d2d]">
      <TucxaPublicHeader navLabel="Bingo do TUCXA" actions={[
        { label: "Por que participar", href: "#participar", variant: "secondary" },
        { label: "Próximo bingo", href: "#proximo", variant: "secondary" },
        { label: "Início", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "primary" },
        { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
      ]} />
      <main className="mx-auto max-w-6xl px-4 py-7 sm:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#124c35] px-6 py-10 text-white shadow-xl sm:px-12 sm:py-14">
          <p className="text-xs font-black uppercase tracking-[.22em] text-[#cceac0]">Bingo do TUCXA · Cliente fundador</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">A alegria de estar junto. A satisfação de apoiar nossa casa.</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#e7f1e9] sm:text-lg">Mais do que uma cartela: uma oportunidade de se reunir, torcer, conhecer as prendas e contribuir com o TUCXA de forma consciente.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#proximo" className="rounded-xl bg-[#f4e6ae] px-6 py-3 font-bold text-[#153d2d] hover:bg-white">Conhecer o próximo bingo</a>
            <a href="#participar" className="rounded-xl border border-white/60 px-6 py-3 font-bold hover:bg-white/10">Por que participar?</a>
          </div>
        </section>
        <section id="participar" className="scroll-mt-48 py-10">
          <h2 className="text-2xl font-black sm:text-3xl">O que torna esse encontro especial?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">{vantagens.map((v) => (
            <article key={v.titulo} className="rounded-2xl border border-[#d9e7d9] bg-white p-6 shadow-sm"><h3 className="text-lg font-extrabold">{v.titulo}</h3><p className="mt-3 leading-7 text-[#4d665a]">{v.texto}</p></article>
          ))}</div>
        </section>
        <section id="proximo" className="scroll-mt-48 rounded-3xl border border-[#d9e7d9] bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Próximo evento</p>
          <h2 className="mt-2 text-2xl font-black">Em preparação</h2>
          <p className="mt-3 leading-7 text-[#4d665a]">Em breve: data, horário, local, regulamento, galeria de prêmios confirmados e opções de cartelas. As vendas serão disponibilizadas após a implantação e homologação do sistema de pagamentos e entrega.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">{[
            ["Rodadas", "Programação e regras do evento"], ["Prêmios", "Fotos reais e doadores confirmados"], ["Cartelas", "Valores e ofertas devidamente publicados"],
          ].map(([t,d]) => <div key={t} className="rounded-xl bg-[#f2f7ef] p-4"><h3 className="font-extrabold">{t}</h3><p className="mt-1 text-sm text-[#4d665a]">{d}</p></div>)}</div>
        </section>
        <section id="ajuda" className="scroll-mt-48 mt-8 text-center text-sm text-[#4d665a]">Dúvidas? Utilize o botão Ajuda no topo da página.</section>
        <footer className="mt-10 text-center text-sm"><Link className="underline" href="/solucoes/bingo-no-controle">Conheça o Bingo no Controle, da Automação Extrema</Link></footer>
      </main>
    </div>
  );
}
