"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AeSolutionHeader } from "@/components/ae-solution-header";
import { ORGANIZACAO_CLIENT_NAV_ITEMS } from "@/lib/organizacao-em-harmonia";
import { supabaseBrowser } from "@/lib/supabase-browser";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OrganizacaoClientShell({
  title,
  eyebrow = "Organização em Harmonia",
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.replace("/solucoes/organizacao-em-harmonia/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <AeSolutionHeader
        solutionName="Organização em Harmonia"
        logoSrc="/organizacao-em-harmonia-logo.svg"
        logoAlt="Logo Organização em Harmonia"
        actions={[]}
        sectionLinks={ORGANIZACAO_CLIENT_NAV_ITEMS.map((item) => ({ label: item.label, href: item.href }))}
        homeHref="/solucoes/organizacao-em-harmonia/cliente"
        navLabel="Menu da área do cliente Organização em Harmonia"
        topAction={
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#31C16B]/30 bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:bg-[#43db7c]"
          >
            Sair
          </button>
        }
      />

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[270px_1fr] lg:py-7">
        <aside className="hidden rounded-[2rem] bg-[#064422] p-4 text-white shadow-xl lg:block">
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">Base Única</p>
            <p className="mt-1 text-xl font-black">Cadastros e permissões</p>
            <p className="mt-2 text-sm leading-6 text-white/70">Pessoas, funções e módulos habilitados para o cliente.</p>
          </div>
          <nav className="mt-4 space-y-2" aria-label="Menu lateral Organização em Harmonia">
            {ORGANIZACAO_CLIENT_NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    active ? "bg-[#fff0ae] text-[#173323]" : "text-white/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="block">{item.label}</span>
                  <span className="mt-0.5 block text-xs font-medium leading-5 opacity-70">{item.description}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-5">
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">{title}</h1>
            {description && <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">{description}</p>}
          </section>
          {children}
        </div>
      </section>
    </main>
  );
}
