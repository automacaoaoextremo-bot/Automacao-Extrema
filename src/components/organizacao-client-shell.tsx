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
  { label: "Atendimento", href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia" },
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
    items: [
      { label: "Visão geral", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva", description: "Resumo do módulo e preview do Primeiro Acesso." },
      { label: "Eventos", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/eventos", description: "Cadastro, edição, localidade, público e recorrência." },
      { label: "Aprovações", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/aprovacoes", description: "Validação pela organização antes de publicar." },
      { label: "Calendário", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/calendario", description: "Filtros por período, evento, pessoa e público." },
    ],
  },
  {
    label: "Atendimento em Harmonia",
    description: "Acolhimentos, entidades e encaminhamentos.",
    items: [{ label: "Atendimentos", href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia", description: "Fluxos de atendimento e orientação." }],
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
      { label: "Regulamento e horários", href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes/regulamento", description: "Textos públicos, horários e orientações para consulentes." },
      { label: "Responsáveis por aprovação", href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes/aprovacoes", description: "Quem valida cadastros, eventos, atendimentos e contribuições." },
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
      <header className="sticky top-0 z-40 border-b border-[#123D2C]/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/solucoes/organizacao-em-harmonia/cliente" className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white shadow ring-1 ring-[#123D2C]/10">
              <Image src="/clientes/tucxa/tucxa-logo.jpg" alt="TUCXA" fill sizes="56px" className="object-cover" unoptimized />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-2xl font-black tracking-wide text-[#123D2C] sm:text-3xl">TUCXA</span>
              <span className="block truncate text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43] sm:text-sm">Organização em Harmonia</span>
            </span>
          </Link>
          <button type="button" onClick={signOut} className="rounded-full bg-[#123D2C] px-4 py-2 text-sm font-black text-white shadow transition hover:-translate-y-0.5">
            Sair
          </button>
        </div>

        <div className="border-t border-[#123D2C]/10 bg-white px-4 py-2 sm:px-6 lg:px-8">
          <a href="https://www.automacaoextrema.com" target="_blank" rel="noreferrer" className="mx-auto flex max-w-5xl items-center justify-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-black text-[#123D2C] shadow-sm ring-1 ring-[#123D2C]/15 transition hover:-translate-y-0.5 hover:shadow-md">
            <span>Desenvolvido por</span>
            <span className="relative h-8 w-32 overflow-hidden rounded-xl bg-[#00334E]">
              <Image src="/clientes/tucxa/automacao-extrema-logo.svg" alt="Automação Extrema" fill sizes="128px" className="object-contain" unoptimized />
            </span>
            <span className="hidden font-bold text-slate-500 sm:inline">Clique no logo e nos conheça</span>
          </a>
        </div>

        <nav className="border-t border-[#123D2C]/10 bg-[#F7FAF2] px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-2 text-sm font-black text-[#123D2C] sm:justify-start">
            {topNav.map((item) => (
              <Link key={item.href} href={item.href} className={`rounded-full px-4 py-2 shadow-sm ring-1 ring-[#123D2C]/15 transition hover:-translate-y-0.5 ${isActive(pathname, item.href) ? "bg-[#123D2C] text-white" : "bg-white hover:bg-[#E9F2E7]"}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[300px_1fr] lg:px-8">
        <aside className="hidden self-start lg:block rounded-[2rem] bg-[#06451F] p-4 text-white shadow-xl shadow-emerald-900/10 lg:sticky lg:top-44 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
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
