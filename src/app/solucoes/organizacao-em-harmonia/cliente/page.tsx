import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { ORGANIZACAO_CLIENT_NAV_ITEMS } from "@/lib/organizacao-em-harmonia";

const checklist = [
  "Confirmar dados principais da organização.",
  "Cadastrar ou revisar pessoas na Base Única.",
  "Definir funções e permissões por perfil.",
  "Escolher quais módulos serão habilitados na validação.",
  "Configurar regras de aprovação para agenda, atendimento e contribuições.",
];

export default function OrganizacaoClientePage() {
  return (
    <OrganizacaoClientShell
      title="Painel inicial da Organização em Harmonia"
      description="Comece pela Base Única. Depois habilite Corrente em Dia, Atendimento em Harmonia e Agenda Viva conforme a necessidade real da organização."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ORGANIZACAO_CLIENT_NAV_ITEMS.slice(1).map((item) => (
          <Link key={item.href} href={item.href} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-lg font-black text-[#00334E]">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Primeiros passos</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Checklist de implantação guiada</h2>
        <div className="mt-5 grid gap-3">
          {checklist.map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 font-semibold leading-7 text-slate-700">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}
