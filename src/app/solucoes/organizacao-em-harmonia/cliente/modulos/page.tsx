import Link from "next/link";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { ORGANIZACAO_MODULOS_COMERCIAIS } from "@/lib/organizacao-em-harmonia";

export default function OrganizacaoModulosPage() {
  return (
    <OrganizacaoClientShell
      title="Módulos habilitados"
      description="Defina quais módulos a organização vai usar na validação e quais funções terão acesso a cada área."
    >
      <section className="grid gap-4 md:grid-cols-3">
        {ORGANIZACAO_MODULOS_COMERCIAIS.map((item) => (
          <Link key={item.slug} href={item.href} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-xl font-black text-[#00334E]">{item.name}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            <p className="mt-4 text-sm font-black text-[#2F6B43]">Ver página pública do módulo</p>
          </Link>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}
