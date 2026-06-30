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
