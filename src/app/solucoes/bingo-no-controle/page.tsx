import Link from "next/link";

const modules = [
  ["Eventos e rodadas", "Programação, regras e condução de cada bingo."],
  ["Galeria de prêmios", "Fotos, detalhes, valores estimados e doadores."],
  ["Cartelas e promoções", "Ofertas configuráveis por evento e rodada."],
  ["Sorteios auditáveis", "Histórico de números, reivindicações e ganhadores."],
  ["Financeiro", "Pagamentos, conciliação e prestação de contas."],
  ["Clientes independentes", "Acesso isolado para cada organização."],
];
export default function BingoNoControlePage() {
 return <main className="min-h-screen bg-[#00334e] px-5 py-12 text-white">
   <div className="mx-auto max-w-5xl">
    <Link href="/#solucoes" className="text-sm text-emerald-300 hover:underline">← Soluções da Automação Extrema</Link>
    <p className="mt-12 text-sm font-bold uppercase tracking-[.2em] text-emerald-300">Automação Extrema • Solução</p>
    <h1 className="mt-3 text-4xl font-black sm:text-6xl">Bingo no Controle</h1>
    <p className="mt-5 max-w-3xl text-lg text-white/80">Uma plataforma para planejar, realizar e prestar contas de bingos e eventos beneficentes, com identidade própria para cada organização.</p>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(([title,description]) => <article key={title} className="rounded-2xl border border-white/15 bg-white/10 p-6"><h2 className="text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-6 text-white/75">{description}</p></article>)}</div>
    <div className="mt-10 rounded-2xl bg-emerald-400/10 p-6 ring-1 ring-emerald-300/30"><h2 className="text-xl font-bold">Cliente fundador: TUCXA</h2><p className="mt-2 text-white/75">Conheça a experiência dedicada ao TUCXA. A operação de vendas será liberada após implantação e homologação técnica.</p><Link href="/solucoes/bingo-no-controle/cliente/tucxa" className="mt-5 inline-block rounded-xl bg-emerald-400 px-6 py-3 font-bold text-[#00334e]">Ver cliente fundador</Link></div>
   </div>
 </main>;
}
