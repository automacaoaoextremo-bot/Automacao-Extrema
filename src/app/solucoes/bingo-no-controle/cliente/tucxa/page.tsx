import Link from "next/link";

export default function BingoTucxaPage() {
 return <main className="min-h-screen bg-[#fcfaf4] px-5 py-12 text-[#173b30]"><div className="mx-auto max-w-4xl">
 <Link href="/solucoes/bingo-no-controle" className="text-sm font-semibold underline">← Bingo no Controle</Link>
 <div className="mt-12 rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm sm:p-12">
 <p className="text-sm font-bold uppercase tracking-[.2em] text-emerald-700">Cliente fundador • TUCXA</p>
 <h1 className="mt-4 text-4xl font-black">Bingo do TUCXA</h1>
 <p className="mt-4 text-lg leading-8">Um encontro dedicado ao bingo beneficente, à convivência e ao apoio das atividades da casa.</p>
 <div className="mt-8 rounded-xl bg-amber-50 p-5 text-amber-900"><h2 className="font-bold">Próximo evento em preparação</h2><p className="mt-2 text-sm">Data, horário, local, rodadas, prêmios e ofertas serão publicados após cadastro e homologação. Não há vendas ativas nesta página.</p></div>
 <div className="mt-8 grid gap-4 sm:grid-cols-3">{[["Rodadas","Programação por evento"],["Prêmios","Fotos e informações confirmadas"],["Cartelas","Compra e promoções no próximo lançamento"]].map(([a,b])=><div key={a} className="rounded-xl border border-emerald-100 p-5"><h3 className="font-bold">{a}</h3><p className="mt-2 text-sm text-slate-600">{b}</p></div>)}</div>
 </div></div></main>;
}
