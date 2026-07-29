import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const modules = [
  {
    name: "Agenda Viva",
    description: "Configure eventos, calendário, recorrências, localidade, público, aprovações e o preview do Primeiro Acesso.",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva",
    cta: "Configurar Agenda Viva",
  },
  {
    name: "Atendimento em Harmonia",
    description: "Configure acolhimentos, entidades, encaminhamentos, retornos obrigatórios e responsáveis por validação.",
    href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia",
    cta: "Configurar Atendimento",
  },
  {
    name: "Corrente em Dia",
    description: "Configure contribuições identificadas/anônimas, comprovantes, dinheiro, Pix, crédito/débito e conferência financeira.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia",
    cta: "Configurar Corrente em Dia",
  },
];

export default function OrganizacaoModulosPage() {
  return (
    <OrganizacaoClientShell
      title="Módulos habilitados"
      description="Use esta tela como central interna de configurações dos módulos. Links públicos ficam nas configurações do site, não na gestão operacional."
    >
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Configurações internas</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Cada módulo com suas próprias regras</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Defina a operação interna de cada módulo: permissões, responsáveis, visibilidade, aprovações e o que aparece para Filhos da Corrente ou Consulentes / Filhos de Fora.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {modules.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-xl font-black text-[#00334E]">{item.name}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            <p className="mt-4 text-sm font-black text-[#2F6B43]">{item.cta}</p>
          </Link>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}
