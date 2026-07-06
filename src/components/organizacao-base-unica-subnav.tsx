"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const BASE_UNICA_SUBNAV_ITEMS = [
  { href: "/solucoes/organizacao-em-harmonia/cliente/base-unica", label: "Visão geral", description: "Indicadores e atalhos principais." },
  { href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos", label: "Envolvidos", description: "Pessoas, contatos e vínculos." },
  { href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/funcoes", label: "Funções", description: "Papéis e responsabilidades." },
  { href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/entidades", label: "Entidades", description: "Guias, linhas e vínculos." },
  { href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/grupos", label: "Grupos", description: "Grupos e dias de atuação." },
  { href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos", label: "Vínculos em lote", description: "Aplicar vínculos para várias pessoas." },
  { href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/localidades", label: "Localidades", description: "Sede, eventos e locais externos." },
  { href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/orientacoes", label: "Orientações", description: "Regulamento, procedimentos e manuais." },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OrganizacaoBaseUnicaSubnav() {
  const pathname = usePathname();

  return (
    <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.26em] text-[#2F6B43]">Base Única</p>
      <h2 className="mt-1 text-xl font-black text-[#00334E]">Cadastros separados para reduzir confusão</h2>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-4">
        {BASE_UNICA_SUBNAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-w-44 rounded-2xl px-4 py-3 text-sm transition ${
                active ? "bg-[#00334E] text-white" : "bg-emerald-50 text-[#00334E] ring-1 ring-emerald-100 hover:bg-emerald-100"
              }`}
            >
              <span className="block font-black">{item.label}</span>
              <span className="mt-1 block text-xs leading-4 opacity-75">{item.description}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
