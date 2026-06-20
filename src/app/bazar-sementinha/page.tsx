import Link from "next/link";
import Image from "next/image";
import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";

const cards = [
  {
    title: "Menos fila e menos confusão",
    text: "Pedidos do bazar e do cardápio ficam em nome do cliente, com controle para evitar pessoas duplicadas e pedidos repetidos por clique duplo.",
  },
  {
    title: "Caixa mais seguro",
    text: "O pagamento pode ser feito por pedido separado ou agrupando todos os pedidos da mesma pessoa, com Pix, crédito, débito ou dinheiro.",
  },
  {
    title: "Prestação de contas clara",
    text: "Vendas, formas de pagamento, itens, despesas e resultado ficam organizados por evento para comparar julho, setembro e próximos bazares.",
  },
];

export default function BazarSementinhaPage() {
  return (
    <>
      <BazarHeader active="home" />
      <main className="min-h-screen bg-[#f9f7ef] text-[#214527]">
        <section className="border-b border-[#dfe8df] px-4 py-10 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#83a847]">Bazar do Sementinha · 04/07/2026</p>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">O bazar ajuda mais quando o controle não fica para depois.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#31543a]">
                A primeira versão do Bazar no Controle foi pensada para o Sementinha do Tucxa: registrar pedidos com mínimo de fricção,
                cobrar com segurança no caixa e entregar uma prestação de contas simples, confiável e comparável por evento.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/bazar-sementinha/pedidos" className="rounded-2xl bg-[#2f7d45] px-6 py-4 text-center font-black text-white shadow-lg hover:bg-[#246338]">
                  Abrir Pedidos
                </Link>
                <Link href="/bazar-sementinha/caixa" className="rounded-2xl border border-[#2f7d45]/30 bg-white px-6 py-4 text-center font-black text-[#2f7d45] shadow-sm hover:bg-[#fffdf7]">
                  Abrir Caixa
                </Link>
              </div>
            </div>
            <aside className="rounded-[2rem] border border-[#dfe8df] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <Image src="/sementinha-logo.jpg" alt="Logo Bazar do Sementinha" width={96} height={96} className="h-24 w-24 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Cliente fundador</p>
                  <h2 className="text-2xl font-black">Sementinha do Tucxa</h2>
                  <p className="mt-1 text-sm text-[#496451]">Primeiro evento cadastrado: Bazar de 04/07/2026.</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-[#f9f7ef] p-4 text-sm leading-6 text-[#31543a]">
                Não é “só um sistema”: é uma forma de evitar perda de dinheiro, retrabalho, dúvida no caixa e desgaste entre voluntários.
              </div>
            </aside>
          </div>
        </section>
        <section className="px-4 py-10">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">{card.title}</h2>
                <p className="mt-3 leading-7 text-[#496451]">{card.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
