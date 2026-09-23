import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

const LOGIN_HREF = "/solucoes/organizacao-em-harmonia/agendamento/login";

const benefits = [
  {
    title: "Para quem busca atendimento",
    text: "Veja as datas disponíveis, escolha a Entidade quando permitido, acompanhe a reserva e confirme sua presença sem depender de anotações paralelas.",
  },
  {
    title: "Para a Recepção",
    text: "Agende, consulte vagas, ajuste Entidades, confirme chegadas e mantenha a mesma informação disponível para toda a equipe.",
  },
  {
    title: "Para os Cavalinhos",
    text: "O sistema cria uma base única para consultar os atendimentos vinculados às suas Entidades e reduzir desencontros de informação.",
  },
];

export default function AgendamentoTucxaPublicPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        navLabel="Agendamento do Tucxa"
        showSupport={false}
        actions={[
          { label: "Início", href: "#inicio", variant: "primary" },
          { label: "Como funciona", href: "#como-funciona", variant: "secondary" },
          { label: "Agendamento", href: LOGIN_HREF, variant: "secondary" },
        ]}
        mobileActionColumns={3}
        compactMobileActions
      />

      <section id="inicio" className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-950/10 sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.23em] text-[#CFE2C7] sm:text-xs">
            Atendimento em Harmonia · Piloto de agendamentos
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
            Menos dúvida no caminho. Mais clareza para acolher.
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            O agendamento do Tucxa reúne em um só lugar o pedido do Consulente, a disponibilidade das Entidades e o acompanhamento da Recepção. A proposta é simples: cada pessoa saber o que precisa fazer, quando precisa fazer e qual informação está valendo.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href={LOGIN_HREF}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 py-3 text-center font-black text-[#123D2C] shadow-lg transition hover:-translate-y-0.5"
            >
              Acessar Agendamento
            </Link>
            <a
              href="#horarios"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-center font-black text-white transition hover:bg-white/15"
            >
              Ver horários de segunda e terça
            </a>
          </div>
        </section>

        <section id="horarios" className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
          <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Chegada</p>
            <p className="mt-1 text-2xl font-black text-[#123D2C]">18h30 às 19h20</p>
            <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">Segundas e terças: todos devem chegar dentro dessa janela.</p>
          </article>
          <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Início dos trabalhos</p>
            <p className="mt-1 text-2xl font-black text-[#123D2C]">Porta fecha às 19h20</p>
            <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">A porta fecha para o início dos trabalhos e reabre às 20h.</p>
          </article>
          <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Atendimentos</p>
            <p className="mt-1 text-2xl font-black text-[#123D2C]">20h às 21h40</p>
            <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">Horário previsto para os atendimentos de segunda e terça.</p>
          </article>
        </section>

        <section id="como-funciona" className="mt-3 rounded-[2rem] bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 sm:mt-4 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Por que usar</p>
          <h2 className="mt-1 text-2xl font-black text-[#123D2C] sm:text-3xl">A informação certa precisa chegar à pessoa certa.</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700 sm:text-base sm:leading-7">
            O objetivo do piloto não é trocar o acolhimento humano por uma tela. É reduzir retrabalho, mensagens desencontradas e incerteza para que Consulentes, Recepção e Filhos da Corrente possam dedicar mais atenção ao que realmente importa no atendimento.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-[1.4rem] bg-white p-4 ring-1 ring-[#123D2C]/10">
                <h3 className="font-black text-[#123D2C]">{benefit.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-[2rem] bg-white p-5 text-center shadow ring-1 ring-[#123D2C]/10 sm:mt-4 sm:p-7">
          <h2 className="text-2xl font-black text-[#123D2C]">Já faz parte desse fluxo?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            O mesmo acesso atende Filhos de Fora/Consulentes e Filhos da Corrente. Informe seu WhatsApp ou e-mail e sua senha; o sistema direciona você para a área correta.
          </p>
          <Link href={LOGIN_HREF} className="mt-4 inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white shadow sm:w-auto sm:min-w-64">
            Entrar no Agendamento
          </Link>
        </section>
      </section>
    </main>
  );
}
