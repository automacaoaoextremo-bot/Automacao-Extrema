import Image from "next/image";
import { BazarHeader } from "@/components/bazar-sementinha/bazar-header";
import { formatBazarDate, getBazarEvent } from "@/lib/bazar-sementinha";

export const dynamic = "force-dynamic";

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
    text: "Vendas, formas de pagamento, itens, despesas e resultado ficam organizados por evento para comparar julho, agosto e próximos bazares.",
  },
];

type BazarSementinhaPageProps = {
  searchParams?: Promise<{ cliente?: string }>;
};

export default async function BazarSementinhaPage({ searchParams }: BazarSementinhaPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const publicContextToken = typeof resolvedSearchParams.cliente === "string" ? resolvedSearchParams.cliente : "";
  const event = await getBazarEvent();
  const eventDate = formatBazarDate(event.event_date);

  return (
    <>
      <BazarHeader active="home" publicView={Boolean(publicContextToken)} publicContextToken={publicContextToken} />
      <main className="min-h-screen overflow-x-hidden bg-[#f9f7ef] text-[15px] text-[#214527] sm:text-base">
        <section className="border-b border-[#dfe8df] px-3 py-8 sm:px-4 sm:py-14">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 sm:gap-8 md:grid-cols-[minmax(0,1fr)_0.9fr] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#83a847] sm:text-sm sm:tracking-[0.2em]">Bazar do Sementinha · {eventDate}</p>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-6xl">O bazar ajuda mais quando o controle não fica para depois.</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#31543a] sm:mt-5 sm:text-lg sm:leading-8">
                Registre pedidos com mínimo de fricção, cobre com segurança no caixa e entregue uma prestação de contas simples, confiável e comparável por evento.
              </p>
            </div>
            <aside className="min-w-0 rounded-[2rem] border border-[#dfe8df] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-4">
                <Image src="/sementinha-logo.jpg" alt="Logo Bazar do Sementinha" width={96} height={96} className="h-24 w-24 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#83a847]">Evento atual</p>
                  <h2 className="text-xl font-black sm:text-2xl">Sementinha do Tucxa</h2>
                  <p className="mt-1 text-sm text-[#496451]">{event.name}.</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-[#f9f7ef] p-4 text-sm leading-6 text-[#31543a]">
                Cada bazar fica armazenado separadamente: cardápio, pedidos, caixa, despesas e prestação de contas permanecem no histórico mesmo quando um novo evento é publicado.
              </div>
            </aside>
          </div>
        </section>
        <section className="px-3 py-8 sm:px-4 sm:py-10">
          <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-[#dfe8df] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black sm:text-xl">{card.title}</h2>
                <p className="mt-3 leading-7 text-[#496451]">{card.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
