import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const cards = [
  {
    title: "Configurações financeiras",
    description: "Valor padrão, valor familiar, dias de vencimento, Pix, lembretes antes do vencimento e lembretes em atraso.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/configuracoes",
  },
  {
    title: "Contribuições e conferência",
    description: "Acompanhe histórico, próximos vencimentos, comprovantes enviados, forma de pagamento e confirmação pela tesouraria.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/contribuicoes",
  },
  {
    title: "Filhos com regra diferenciada",
    description: "Use a Base Única para identificar Filhos da Corrente com valor familiar, dia diferenciado ou orientação específica.",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos",
  },
  {
    title: "Relatórios e prestação interna",
    description: "Consolide valores previstos, recebidos, pendentes, atrasados e formas de pagamento para a organização do Tucxa.",
    href: "/solucoes/organizacao-em-harmonia/cliente/relatorios",
  },
];

export default function CorrenteEmDiaClientePage() {
  return (
    <OrganizacaoClientShell title="Corrente em Dia" description="Configure e acompanhe contribuições dos Filhos da Corrente, Consulentes e Filhos de Fora.">
      <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Módulo financeiro-operacional</p>
        <h2 className="mt-2 text-2xl font-black">Mais previsibilidade para a casa, menos comprovante espalhado.</h2>
        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-[#EEF7EA]">
          O Corrente em Dia ajuda a organizar contribuições mensais, familiares, pontuais e campanhas. O objetivo é facilitar a vida do Filho da Corrente e dar clareza para a tesouraria, sem transformar a contribuição em cobrança fria.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
            <h3 className="text-xl font-black text-[#00334E]">{card.title}</h3>
            <p className="mt-2 leading-7 text-slate-600">{card.description}</p>
            <span className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Abrir</span>
          </Link>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}
