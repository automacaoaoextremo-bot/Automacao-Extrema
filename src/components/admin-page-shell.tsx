"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  group: string;
};

const navItems: NavItem[] = [
  { href: "/admin/ae", label: "Visão geral", group: "Dashboard" },
  { href: "/admin/ae/funil", label: "Funil / CRM", group: "Comercial" },
  { href: "/admin/ae/solucoes", label: "Soluções", group: "Produtos" },
  { href: "/admin/ae/catalogo", label: "Públicos, dores e funcionalidades", group: "Produtos" },
  { href: "/admin/ae/sites-clientes", label: "Sites / páginas de clientes", group: "Clientes" },
  { href: "/admin/ae/corrente-em-dia", label: "Corrente em Dia", group: "Clientes" },
  { href: "/admin/ae/organizacao-em-harmonia", label: "Organização em Harmonia", group: "Clientes" },
  { href: "/admin/ae/parceiros", label: "Parceiros", group: "Comercial" },
  { href: "/admin/ae/relatorios", label: "Relatórios", group: "Indicadores" },
];

export function AdminPageShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = Array.from(new Set(navItems.map((item) => item.group)));

  function isActive(href: string) {
    if (href === "/admin/ae") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden rounded-3xl bg-[#00334E] p-4 text-white shadow lg:block">
          <p className="px-3 text-xs font-bold uppercase tracking-[0.25em] text-[#31C16B]">Gestão AE</p>
          <nav className="mt-4 space-y-5">
            {groups.map((group) => (
              <div key={group}>
                <p className="px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">{group}</p>
                <div className="mt-2 space-y-1">
                  {navItems.filter((item) => item.group === group).map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-2xl px-3 py-2 text-sm font-bold transition ${
                          active ? "bg-white text-[#00334E]" : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-4 shadow sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => setOpen((current) => !current)}
                  className="mb-3 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-[#00334E] lg:hidden"
                >
                  {open ? "Fechar menu" : "Abrir menu"}
                </button>
                <h1 className="text-2xl font-bold text-[#00334E] sm:text-3xl">{title}</h1>
                {description && <p className="mt-1 max-w-3xl text-sm text-slate-600 sm:text-base">{description}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>

            {open && (
              <nav className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2 lg:hidden">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold ${active ? "bg-[#00334E] text-white" : "bg-white text-slate-700"}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}

