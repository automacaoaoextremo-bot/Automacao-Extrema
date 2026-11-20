import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { BINGO_LEGACY_EVENTS } from "@/lib/bingo-no-controle/historico-legado";

// Histórico público apenas agregado: sem nomes, telefones ou dados dos ganhadores.
export default function BingoTucxaHistoricoPage() {
  const events = BINGO_LEGACY_EVENTS.filter((item) => item.owner === "tucxa");
  return (
    <main className="min-h-screen bg-[#fcfaf4] text-[#153e2e]">
      <TucxaPublicHeader navLabel="Bingo do TUCXA" actions={[
        { label: "Início", href: "/solucoes/bingo-no-controle/cliente/tucxa", variant: "primary" },
        { label: "Histórico", href: "/solucoes/bingo-no-controle/cliente/tucxa/historico" },
        { label: "TUCXA", href: "/solucoes/organizacao-em-harmonia/tucxa" },
      ]} />
      <section className="mx-auto max-w-5xl px-5 py-12">
        <p className="text-sm font-extrabold uppercase tracking-widest text-emerald-700">Memória dos nossos encontros</p>
        <h1 className="mt-3 text-4xl font-black">Histórico do Bingo do TUCXA</h1>
        <p className="mt-4 max-w-3xl text-base leading-7">Cada rodada reúne pessoas e histórias. Aqui compartilhamos dados consolidados de eventos anteriores com transparência.</p>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-emerald-700">{event.date.split("-").reverse().join("/")}</p>
              <h2 className="mt-2 text-2xl font-extrabold">{event.name}</h2>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-center">
                {[["Rodadas",event.rounds],["Números sorteados",event.draws],["Premiações",event.awards],["Ganhadores registrados",event.winners]].map(([label,value])=>(
                  <div key={label} className="rounded-xl bg-emerald-50 p-4"><dt className="text-xs text-emerald-900">{label}</dt><dd className="mt-1 text-2xl font-bold">{value}</dd></div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm text-slate-600">Fonte: auditoria do banco de origem em 18/10/2026. Histórico ainda não importado para o novo banco; os indicadores não são dados em tempo real. O evento de testes foi excluído.</p>
        <Link className="mt-8 inline-flex rounded-xl bg-[#14523b] px-5 py-3 font-semibold text-white" href="/solucoes/bingo-no-controle/cliente/tucxa">Voltar ao Bingo do TUCXA</Link>
      </section>
    </main>
  );
}
