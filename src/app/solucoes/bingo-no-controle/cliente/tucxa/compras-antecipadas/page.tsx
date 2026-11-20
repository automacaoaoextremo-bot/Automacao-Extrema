import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const base = "/solucoes/bingo-no-controle/cliente/tucxa";
const options = [
  { title: "Cartelas", text: "Planeje sua participação nas rodadas. Cores, quantidades e validade ainda dependem de aprovação." },
  { title: "Combos", text: "Propostas combinando cartelas e alimentação, com regras a confirmar." },
  { title: "Comidas e bebidas", text: "Confira o cardápio publicado no evento; compras antecipadas ainda não foram liberadas." },
  { title: "Voucher de consumo", text: "Crédito para uso no dia do bingo, sujeito à implantação e homologação do controle de saldo." },
];
export default function ComprasAntecipadasPage() {
  return <div className="min-h-dvh bg-[#f4f8f4] text-[#173e2c]">
    <TucxaPublicHeader navLabel="Bingo no Controle — Compras antecipadas" showSupport={false}/>
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="rounded-3xl bg-[#14583e] p-6 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">Bingo do TUCXA</p>
        <h1 className="mt-3 text-3xl font-black">Mais tempo para celebrar. Menos preocupação no dia.</h1>
        <p className="mt-3 max-w-2xl leading-7">Estamos preparando alternativas para você planejar sua participação no bingo e aproveitar o encontro com tranquilidade, ajudando as atividades do TUCXA.</p>
        <p className="mt-5 rounded-xl border border-amber-200 bg-white p-3 text-sm font-bold text-amber-950">Compras ainda não disponíveis. Esta página não recebe pedidos, pagamentos nem emite vouchers ou cartelas.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{options.map(item => <section key={item.title} className="rounded-2xl border border-emerald-100 bg-white p-5"><h2 className="text-lg font-black">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-700">{item.text}</p></section>)}</div>
      <Link href={base} className="inline-block rounded-xl bg-[#14583e] px-5 py-3 font-bold text-white">Voltar ao Bingo do TUCXA</Link>
    </main>
  </div>;
}
