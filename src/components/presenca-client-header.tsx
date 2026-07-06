"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
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

const sidebarLinks = [
  { label: "Painel", href: "/solucoes/presenca-querida/cliente", description: "Resumo e indicadores" },
  { label: "Primeiros passos", href: "/solucoes/presenca-querida/cliente/primeiros-passos", description: "Checklist de lançamento" },
  { label: "Cadastro", href: "/solucoes/presenca-querida/cliente/cadastro", description: "Evento, local e landing" },
  { label: "Convidados", href: "/solucoes/presenca-querida/cliente/convidados", description: "Lista, CSV e vínculos" },
  { label: "Mensagens", href: "/solucoes/presenca-querida/cliente/mensagens", description: "Convites para aprovação" },
  { label: "Confirmações", href: "/solucoes/presenca-querida/cliente/confirmacoes", description: "Status e pendências" },
  { label: "Relatórios", href: "/solucoes/presenca-querida/cliente/relatorios", description: "Buffet, recepção e exportações" },
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

export function PresencaClientSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[1.5rem] bg-[#00334E] p-4 text-white shadow-xl lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-2xl bg-white/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-rose-100">Presença Querida</p>
        <p className="mt-2 text-xl font-black">Daniela 50 anos</p>
      </div>
      <nav className="mt-4 grid gap-2">
        {sidebarLinks.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-3 transition hover:bg-white/15 ${active ? "bg-rose-100 text-[#00334E]" : "text-white"}`}
            >
              <span className="block text-sm font-black">{item.label}</span>
              <span className={`mt-1 block text-xs leading-4 ${active ? "text-[#00334E]/70" : "text-white/70"}`}>{item.description}</span>
            </Link>
          );
        })}
      </nav>
      <Link href="/solucoes/presenca-querida/evento/daniela-50-anos" className="mt-4 inline-flex w-full min-h-12 items-center justify-center rounded-2xl bg-[#E85D75] px-4 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5">
        Ver landing pública
      </Link>
    </aside>
  );
}

export function PresencaClientShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <PresencaClientHeader />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:py-8 lg:grid-cols-[17rem_1fr]">
        <PresencaClientSidebar />
        <div className="min-w-0">{children}</div>
      </section>
    </main>
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
