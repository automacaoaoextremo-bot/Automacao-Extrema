import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { OrganizacaoOnboardingChecklist } from "@/components/organizacao-onboarding-checklist";
import { ORGANIZACAO_CLIENT_NAV_ITEMS } from "@/lib/organizacao-em-harmonia";

export default function OrganizacaoClientePage() {
  return (
    <OrganizacaoClientShell
      title="Painel inicial da Organização em Harmonia"
      description="Comece pelo checklist. A recomendação para o Tucxa é validar primeiro o Agenda Viva, com Base Única, funções, permissões, calendário, eventos e aprovações antes de iniciar a avaliação de 30 dias."
    >
      <OrganizacaoOnboardingChecklist />

      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Site específico do cliente</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">Tucxa com identidade própria</h2>
            <p className="mt-2 max-w-3xl leading-7 text-slate-600">
              Configure logo, cores, menu e chamadas públicas para Filhos da Corrente e Consulentes, mantendo a Organização em Harmonia como solução de base.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80 lg:grid-cols-1">
            <Link href="/solucoes/organizacao-em-harmonia/cliente/configuracoes/site" className="rounded-2xl bg-[#31C16B] px-5 py-4 text-center font-black text-[#00334E] shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5">
              Configurar site
            </Link>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa" target="_blank" className="rounded-2xl bg-slate-100 px-5 py-4 text-center font-black text-[#00334E] transition hover:-translate-y-0.5">
              Ver site do Tucxa
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ORGANIZACAO_CLIENT_NAV_ITEMS.slice(1).map((item) => (
          <Link key={item.href} href={item.href} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-lg font-black text-[#00334E]">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}
