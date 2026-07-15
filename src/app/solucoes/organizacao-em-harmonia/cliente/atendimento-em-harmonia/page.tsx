import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const cards = [
  {
    title: "Configurações de atendimento",
    description: "Defina recorrência, regras de ausência, troca de entidade, quarta-feira por responsáveis e orientação de retorno.",
    href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia/configuracoes",
  },
  {
    title: "Agendamentos e recepção",
    description: "Consulte fila por data, entidade e status, marque ausências, confirme atendimentos e prepare impressão para a recepção.",
    href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia/agendamentos",
  },
  {
    title: "Entidades e capacidades",
    description: "Ajuste entidades, dias de atendimento, capacidade diária e observações usadas nos agendamentos.",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/entidades",
  },
  {
    title: "Orientações práticas",
    description: "Mantenha regulamento, manual de cambonos e procedimentos como uma base viva para consulta dos Filhos da Corrente.",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/orientacoes",
  },
];

export default function AtendimentoEmHarmoniaPage() {
  return (
    <OrganizacaoClientShell title="Atendimento em Harmonia" description="Organize acolhimentos, entidades, retornos e encaminhamentos sem perder o cuidado humano de cada atendimento.">
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Módulo de atendimento</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Da chegada ao retorno, tudo com clareza.</h2>
        <p className="mt-2 max-w-4xl leading-7 text-slate-600">
          Configure as regras que orientam a recepção, os responsáveis, as entidades disponíveis e a sequência de atendimento. A ideia é reduzir mensagens soltas, proteger o cuidado com o consulente e dar previsibilidade para a casa.
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
