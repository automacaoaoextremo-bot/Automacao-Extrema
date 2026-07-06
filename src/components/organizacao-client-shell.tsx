"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  description?: string;
};

type NavGroup = {
  label: string;
  description: string;
  items: NavItem[];
};

const topNav: NavItem[] = [
  { label: "Painel", href: "/solucoes/organizacao-em-harmonia/cliente" },
  { label: "Cadastro", href: "/solucoes/organizacao-em-harmonia/cliente/cadastro" },
  { label: "Base Única", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica" },
  { label: "Agenda Viva", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva" },
  { label: "Módulos", href: "/solucoes/organizacao-em-harmonia/cliente/modulos" },
  { label: "Configurações", href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes" },
  { label: "Relatórios", href: "/solucoes/organizacao-em-harmonia/cliente/relatorios" },
];

const sidebarGroups: NavGroup[] = [
  {
    label: "Geral",
    description: "Visão inicial e dados principais do cliente.",
    items: [
      { label: "Painel", href: "/solucoes/organizacao-em-harmonia/cliente", description: "Checklist, próximos passos e atalhos." },
      { label: "Cadastro", href: "/solucoes/organizacao-em-harmonia/cliente/cadastro", description: "Dados da organização, contatos e endereço." },
    ],
  },
  {
    label: "Base Única",
    description: "Pessoas, vínculos, permissões e informações de apoio.",
    items: [
      { label: "Visão geral", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica", description: "Resumo da estrutura cadastral." },
      { label: "Envolvidos", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos", description: "Pessoas, acessos e validações." },
      { label: "Funções", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/funcoes", description: "Papéis e responsabilidades." },
      { label: "Vínculos em lote", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos", description: "Aplicação rápida para grupos." },
      { label: "Grupos", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/grupos", description: "Agrupamentos e responsabilidades." },
      { label: "Localidades", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/localidades", description: "Sede, salas e locais externos." },
      { label: "Entidades", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/entidades", description: "Entidades, linhas e materiais." },
      { label: "Orientações", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/orientacoes", description: "Documentos e procedimentos." },
    ],
  },
  {
    label: "Agenda Viva",
    description: "Calendário, atividades e aprovações.",
    items: [{ label: "Calendário", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva", description: "Atividades, eventos e recorrências." }],
  },
  {
    label: "Módulos",
    description: "Soluções habilitadas para o cliente.",
    items: [{ label: "Módulos habilitados", href: "/solucoes/organizacao-em-harmonia/cliente/modulos", description: "Agenda Viva, Atendimento e Corrente em Dia." }],
  },
  {
    label: "Configurações",
    description: "Site público, regras, aprovações, LGPD, permissões e preferências.",
    items: [
      { label: "Site público do cliente", href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes/site", description: "Logo, cores, chamadas e menu do Tucxa." },
      { label: "Regras e permissões", href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes", description: "Aprovações, LGPD e preferências." },
    ],
  },
  {
    label: "Relatórios",
    description: "Indicadores e exportações.",
    items: [{ label: "Relatórios", href: "/solucoes/organizacao-em-harmonia/cliente/relatorios", description: "Acompanhamento e prestação interna." }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/solucoes/organizacao-em-harmonia/cliente") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OrganizacaoClientShell({ title, description, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.replace("/solucoes/organizacao-em-harmonia/login");
  }

  return (
    <main className="min-h-screen bg-[#F4FBF7] text-[#00334E]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/solucoes/organizacao-em-harmonia/cliente" className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-[#31C16B] shadow-lg shadow-emerald-100">
              <Image src="/clientes/tucxa/automacao-extrema-logo.svg" alt="Organização em Harmonia" fill sizes="48px" className="object-cover" unoptimized />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black sm:text-2xl">Organização em Harmonia</span>
            </span>
          </Link>
          <button type="button" onClick={signOut} className="rounded-full bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E] shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5">
            Sair
          </button>
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-2 sm:px-6 lg:px-8">
          <a href="https://www.automacaoextrema.com" target="_blank" rel="noreferrer" className="mx-auto flex max-w-7xl items-center justify-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-black text-[#00334E] shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
            <span>Desenvolvido por</span>
            <span className="relative h-8 w-32 overflow-hidden rounded-xl bg-[#00334E]">
              <Image src="/clientes/tucxa/automacao-extrema-logo.svg" alt="Automação Extrema" fill sizes="128px" className="object-contain" unoptimized />
            </span>
            <span className="hidden font-bold text-slate-500 sm:inline">Clique no logo e nos conheça</span>
          </a>
        </div>

        <nav className="bg-[#00334E] px-4 py-2 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-2 text-xs font-black uppercase tracking-wide text-white sm:justify-start">
            {topNav.map((item) => (
              <Link key={item.href} href={item.href} className={`rounded-full px-4 py-2 transition hover:-translate-y-0.5 ${isActive(pathname, item.href) ? "bg-[#31C16B] text-[#00334E]" : "bg-white/10 hover:bg-white/20"}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="self-start rounded-[2rem] bg-[#06451F] p-4 text-white shadow-xl shadow-emerald-900/10 lg:sticky lg:top-40 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
          <div className="mb-4 rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFF7DF]">Base Única</p>
            <h2 className="mt-1 text-xl font-black">Cadastros e permissões</h2>
            <p className="mt-2 text-xs leading-5 text-[#E8FFF0]">Pessoas, funções e módulos habilitados para o cliente.</p>
          </div>

          <div className="grid gap-3">
            {sidebarGroups.map((group) => (
              <section key={group.label} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#CFF7DF]">{group.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#DDFCE8]">{group.description}</p>
                <div className="mt-3 grid gap-2">
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} className={`rounded-2xl px-3 py-2 transition hover:bg-white/15 ${isActive(pathname, item.href) ? "bg-[#FFF2A8] text-[#06451F]" : "bg-transparent text-white"}`}>
                      <span className="block text-sm font-black">{item.label}</span>
                      {item.description && <span className={`mt-1 block text-[11px] leading-4 ${isActive(pathname, item.href) ? "text-[#06451F]/75" : "text-[#DDFCE8]"}`}>{item.description}</span>}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Organização em Harmonia</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">{title}</h1>
            {description && <p className="mt-3 max-w-4xl leading-7 text-slate-600">{description}</p>}
          </div>
          <div className="grid gap-5">{children}</div>
        </section>
      </div>
    </main>
  );
}
