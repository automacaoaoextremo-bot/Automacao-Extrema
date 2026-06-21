"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const actions = [
  { label: "Painel", href: "/solucoes/presenca-querida/cliente", variant: "secondary" as const },
  { label: "Primeiros passos", href: "/solucoes/presenca-querida/cliente/primeiros-passos", variant: "secondary" as const },
];

const sectionLinks = [
  { label: "Cadastro", href: "/solucoes/presenca-querida/cliente/cadastro" },
  { label: "Convidados", href: "/solucoes/presenca-querida/cliente/convidados" },
  { label: "Mensagens", href: "/solucoes/presenca-querida/cliente/mensagens" },
  { label: "Confirmações", href: "/solucoes/presenca-querida/cliente/confirmacoes" },
  { label: "Relatórios", href: "/solucoes/presenca-querida/cliente/relatorios" },
];

export function PresencaClientHeader() {
  const router = useRouter();

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.push("/solucoes/presenca-querida/login");
  }

  return (
    <AeSolutionHeader
      solutionName="Presença Querida"
      logoSrc="/presenca-querida-logo.svg"
      logoAlt="Logo Presença Querida"
      homeHref="/solucoes/presenca-querida"
      navLabel="Menu do Presença Querida"
      actions={actions}
      sectionLinks={sectionLinks}
      topAction={
        <button
          type="button"
          onClick={logout}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E85D75]/30 bg-white px-4 py-2 text-sm font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50"
        >
          Sair
        </button>
      }
    />
  );
}

export function PresencaBackToDashboard() {
  return (
    <Link
      href="/solucoes/presenca-querida/cliente"
      className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#00334E] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      ← Painel
    </Link>
  );
}
