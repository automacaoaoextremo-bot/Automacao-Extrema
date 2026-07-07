import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const features = [
  {
    title: "Entidades e linhas de atendimento",
    description: "Cadastre entidades, linhas, materiais e observações de cuidado para orientar recepção, cambonos e coordenação.",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/entidades",
  },
  {
    title: "Solicitações de atendimento",
    description: "Acompanhe pedidos de Consulentes / Filhos de Fora, retornos obrigatórios, encaminhamentos para Transformação e ajustes solicitados.",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos",
  },
  {
    title: "Responsáveis por aprovação",
    description: "Defina quem valida cadastros, agendamentos e encaminhamentos para que cada fluxo vá para a pessoa certa.",
    href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes/aprovacoes",
  },
  {
    title: "Agenda conectada",
    description: "Use a Agenda Viva para publicar datas disponíveis e controlar o que aparece para Filhos da Corrente e Consulentes.",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva",
  },
];

export default function AtendimentoEmHarmoniaPage() {
  return (
    <OrganizacaoClientShell title="Atendimento em Harmonia" description="Organize acolhimentos, entidades, retornos e encaminhamentos sem perder o cuidado humano de cada atendimento.">
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Módulo de atendimento</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Do cadastro ao retorno, tudo com clareza.</h2>
        <p className="mt-2 max-w-4xl leading-7 text-slate-600">
          Este módulo concentra informações que ajudam a recepção, cambonos, coordenação e responsáveis a orientar Consulentes / Filhos de Fora com segurança. A Agenda Viva define as datas; a Base Única guarda pessoas e entidades; as Configurações definem responsáveis por aprovação.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
            <h3 className="text-xl font-black text-[#00334E]">{feature.title}</h3>
            <p className="mt-2 leading-7 text-slate-600">{feature.description}</p>
          </Link>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}
