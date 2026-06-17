"use client";

import Link from "next/link";
import { AeSolutionHeader, type SolutionSectionLink } from "@/components/ae-solution-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const clientLinks: SolutionSectionLink[] = [
  { label: "Cadastro", href: "/solucoes/corrente-em-dia/cliente/cadastro" },
  { label: "Configurações", href: "/solucoes/corrente-em-dia/cliente/configuracoes" },
  { label: "Contribuintes", href: "/solucoes/corrente-em-dia/cliente/contribuintes" },
  { label: "Contribuir", href: "/solucoes/corrente-em-dia/cliente/contribuir" },
  { label: "Aprovações", href: "/solucoes/corrente-em-dia/cliente/aprovacoes" },
];

export function CorrenteClientHeader() {
  async function signOut() {
    await supabaseBrowser.auth.signOut();
    window.location.href = "/solucoes/corrente-em-dia/login";
  }

  return (
    <AeSolutionHeader
      solutionName="Corrente em Dia"
      logoSrc="/corrente-em-dia-logo.svg"
      logoAlt="Logo Corrente em Dia"
      actions={[]}
      sectionLinks={clientLinks}
      topAction={
        <button
          type="button"
          onClick={signOut}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#00334E]/10 bg-[#00334E] px-4 py-2 text-sm font-black text-white shadow-md shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-[#064766]"
        >
          Sair
        </button>
      }
    />
  );
}

export function CorrenteBackToPanelLink() {
  return (
    <Link
      href="/solucoes/corrente-em-dia/cliente"
      className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#00334E]/10 bg-white px-4 py-2 text-sm font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      ← Painel
    </Link>
  );
}
