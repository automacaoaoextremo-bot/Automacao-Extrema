"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { FinancePendingContributionsLoginModal } from "@/components/organizacao-em-harmonia/finance-pending-contributions-login-modal";

type ShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  simpleFinancialHeader?: boolean;
  financialBackHref?: string;
  simpleFinancialActive?: "inicio" | "voltar" | null;
  simpleFinancialHeaderControl?: ReactNode;
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
  { label: "Início", href: "/solucoes/organizacao-em-harmonia/cliente" },
  { label: "Cadastro", href: "/solucoes/organizacao-em-harmonia/cliente/cadastro" },
  { label: "Base Única", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica" },
  { label: "Documentos", href: "/solucoes/organizacao-em-harmonia/cliente/documentos" },
  { label: "Validações", href: "/solucoes/organizacao-em-harmonia/cliente/validacoes" },
  { label: "Agenda Viva", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva" },
  { label: "Atendimento", href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia" },
  { label: "Módulos", href: "/solucoes/organizacao-em-harmonia/cliente/modulos" },
  { label: "Configurações", href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes" },
  { label: "Relatórios", href: "/solucoes/organizacao-em-harmonia/cliente/relatorios" },
];

const MEMBER_PANEL =
  "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const FINANCE_BASE = "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia";

const financialMemberTopNav: NavItem[] = [
  { label: "Painel", href: MEMBER_PANEL },
  { label: "Corrente em Dia", href: FINANCE_BASE },
  { label: "Contribuições", href: `${FINANCE_BASE}/contribuicoes` },
  { label: "Lançamentos", href: `${FINANCE_BASE}/lancamentos` },
  { label: "Gestão Financeira", href: `${FINANCE_BASE}/gestao-financeira` },
];

const financialMemberSidebarGroups: NavGroup[] = [
  {
    label: "Tesouraria / Financeiro",
    description: "Acesso financeiro autorizado pela função do Filho da Corrente.",
    items: [
      { label: "Corrente em Dia", href: FINANCE_BASE, description: "Visão financeira e pendências." },
      { label: "Contribuições", href: `${FINANCE_BASE}/contribuicoes`, description: "Comprovantes, validações e contribuições pendentes." },
      { label: "Lançamentos", href: `${FINANCE_BASE}/lancamentos`, description: "Receitas e despesas." },
      { label: "Gestão Financeira", href: `${FINANCE_BASE}/gestao-financeira`, description: "Indicadores e gestão financeira." },
      { label: "Balancete mensal", href: `${FINANCE_BASE}/balancetes`, description: "Fechamento mensal." },
    ],
  },
];

const sidebarGroups: NavGroup[] = [
  {
    label: "Geral",
    description: "Visão inicial e dados principais do cliente.",
    items: [
      { label: "Início", href: "/solucoes/organizacao-em-harmonia/cliente", description: "Checklist, próximos passos e atalhos." },
      { label: "Cadastro", href: "/solucoes/organizacao-em-harmonia/cliente/cadastro", description: "Dados da organização, contatos e endereço." },
    ],
  },
  {
    label: "Base Única",
    description: "Pessoas, vínculos, permissões e informações de apoio.",
    items: [
      { label: "Visão geral", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica", description: "Resumo da estrutura cadastral." },
      { label: "Envolvidos", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos", description: "Pessoas, acessos e validações." },
      { label: "Validações", href: "/solucoes/organizacao-em-harmonia/cliente/validacoes", description: "Aprovar Primeiro Acesso e simular visão do usuário." },
      { label: "Simular acesso", href: "/solucoes/organizacao-em-harmonia/cliente/simular-acesso", description: "Ver o sistema como cada Filho da Corrente." },
      { label: "Funções", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/funcoes", description: "Papéis e responsabilidades." },
      { label: "Vínculos em lote", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/vinculos", description: "Aplicação rápida para grupos." },
      { label: "Grupos", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/grupos", description: "Agrupamentos e responsabilidades." },
      { label: "Localidades", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/localidades", description: "Sede, salas e locais externos." },
      { label: "Entidades", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/entidades", description: "Entidades, linhas e materiais." },
      { label: "Orientações", href: "/solucoes/organizacao-em-harmonia/cliente/base-unica/orientacoes", description: "Documentos e procedimentos." },
      { label: "Documentos editáveis", href: "/solucoes/organizacao-em-harmonia/cliente/documentos", description: "Regulamento, procedimentos e manuais como cadastros vivos." },
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
      { label: "Presenças", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/presencas", description: "Confirmações, pendentes e check-in dos Filhos da Corrente." },
      { label: "Configurações", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/configuracoes", description: "Regras de recorrência, ausências e quarta-feira." },
    ],
  },
  {
    label: "Atendimento em Harmonia",
    description: "Acolhimentos, entidades e encaminhamentos.",
    items: [
      { label: "Visão geral", href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia", description: "Fluxos de atendimento e orientação." },
      { label: "Configurações", href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia/configuracoes", description: "Recorrência, ausências, troca de entidade e quarta-feira." },
      { label: "Agendamentos", href: "/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia/agendamentos", description: "Fila, filtros, impressão e status por entidade." },
    ],
  },
  {
    label: "Módulos",
    description: "Soluções habilitadas para o cliente.",
    items: [
      { label: "Módulos habilitados", href: "/solucoes/organizacao-em-harmonia/cliente/modulos", description: "Configurações internas dos módulos." },
      { label: "Corrente em Dia", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia", description: "Visão financeira, indicadores e pendências." },
      { label: "Lançamentos", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos", description: "Receitas, despesas, documentos e aprovação." },
      { label: "Gestão Financeira", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/gestao-financeira", description: "Indicadores, cenários, competência, vencimentos e fluxo de caixa." },
      { label: "Balancete mensal", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/balancetes", description: "Fechamento mensal de receitas, despesas e saldo bancário." },
      { label: "Importações", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/importacoes", description: "CSV, XLSX, OFX, Google Sheets e OCR." },
      { label: "Conciliação", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/reconciliacao", description: "Associe movimentos bancários ou crie lançamentos." },
      { label: "Contribuições", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/contribuicoes", description: "Pontuais, recorrentes, identificadas ou não." },
      { label: "Famílias", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/familias", description: "Grupos, parentescos e responsáveis financeiros." },
      { label: "Prestação pública", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/prestacao-contas", description: "Valide o popup e o painel público em tempo real." },
      { label: "Configurações financeiras", href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/configuracoes", description: "Valor padrão, vencimentos, lembretes e sigilo." },
    ],
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


function clientLoginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function sessionDisplayName(
  user:
    | {
        email?: string | null;
        user_metadata?: Record<string, unknown>;
      }
    | null
    | undefined,
) {
  const metadata = user?.user_metadata ?? {};
  const values = [
    metadata.full_name,
    metadata.fullName,
    metadata.name,
    metadata.nome,
  ];

  const fromMetadata = values.find(
    (value): value is string =>
      typeof value === "string" && Boolean(value.trim()),
  );

  if (fromMetadata) return fromMetadata.trim();
  return user?.email?.split("@")[0]?.trim() ?? "";
}

export function OrganizacaoClientShell({
  title,
  description,
  children,
  simpleFinancialHeader = false,
  financialBackHref = `${MEMBER_PANEL}/corrente-em-dia?financeiro=1`,
  simpleFinancialActive = null,
  simpleFinancialHeaderControl,
}: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [accessGate, setAccessGate] = useState<
    "checking" | "client" | "financialMember" | "blocked"
  >("checking");
  const [authenticatedName, setAuthenticatedName] = useState("");

  useEffect(() => {
    let active = true;

    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      const session = data.session;
      const user = session?.user;
      if (!user) {
        router.replace(clientLoginUrl());
        return;
      }

      setAuthenticatedName(sessionDisplayName(user));

      const metadata = user.user_metadata ?? {};
      if (metadata.oh_profile !== "filho-da-corrente") {
        setAccessGate("client");
        return;
      }

      if (!pathname.startsWith(FINANCE_BASE)) {
        setAccessGate("blocked");
        router.replace(MEMBER_PANEL);
        return;
      }

      const accessToken = session.access_token;
      if (!accessToken) {
        setAccessGate("blocked");
        router.replace(MEMBER_PANEL);
        return;
      }

      try {
        const response = await fetch(
          "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          canManageFinance?: boolean;
          currentPerson?: { fullName?: string };
        };

        if (!active) return;
        if (payload.currentPerson?.fullName) {
          setAuthenticatedName(payload.currentPerson.fullName);
        }
        if (response.ok && payload.canManageFinance === true) {
          setAccessGate("financialMember");
          return;
        }
      } catch {
        // O bloqueio abaixo mantém a sessão do Filho da Corrente ativa.
      }

      if (!active) return;
      setAccessGate("blocked");
      router.replace(MEMBER_PANEL);
    });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  async function signOut() {
    const wasFinancialMember = accessGate === "financialMember";
    await supabaseBrowser.auth.signOut();
    router.replace(
      wasFinancialMember
        ? "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login"
        : "/solucoes/organizacao-em-harmonia/login",
    );
  }

  const isFinancialMember = accessGate === "financialMember";
  const effectiveTopNav = isFinancialMember ? financialMemberTopNav : topNav;
  const effectiveSidebarGroups = isFinancialMember
    ? financialMemberSidebarGroups
    : sidebarGroups;
  const activeGroup =
    effectiveSidebarGroups.find((group) =>
      group.items.some((item) => isActive(pathname, item.href)),
    ) ?? effectiveSidebarGroups[0];
  const orderedSidebarGroups = [
    activeGroup,
    ...effectiveSidebarGroups.filter((group) => group.label !== activeGroup.label),
  ];

  if (accessGate === "checking" || accessGate === "blocked") {
    return (
      <main className="min-h-screen bg-[#F4FBF7] p-6 text-[#00334E]">
        <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-6 shadow ring-1 ring-slate-100">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Organização em Harmonia</p>
          <h1 className="mt-2 text-2xl font-black">{accessGate === "blocked" ? "Acesso de gestão bloqueado" : "Verificando acesso..."}</h1>
          <p className="mt-3 leading-7 text-slate-600">
            {accessGate === "blocked"
              ? "Este acesso não possui função Tesouraria/Financeiro para a área solicitada. Você será direcionado de volta ao painel do Filho da Corrente."
              : "Estamos conferindo se este usuário tem permissão para esta área."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4FBF7] text-[#00334E]">
      <header className="sticky top-0 z-40 border-b border-[#123D2C]/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-5 sm:py-2.5">
          <Link
            href={isFinancialMember ? MEMBER_PANEL : "/solucoes/organizacao-em-harmonia/cliente"}
            className="flex min-w-0 flex-1 items-center gap-3"
            aria-label="Ir para o início da área logada do Tucxa"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow ring-1 ring-[#123D2C]/10 sm:h-13 sm:w-13">
              <Image src="/clientes/tucxa/tucxa-logo.jpg" alt="Logo do Tucxa" width={72} height={72} className="h-full w-full object-contain" priority />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-baseline gap-1 leading-[1.05] text-[#173323]">
                <span className="shrink-0 whitespace-nowrap text-[1.05rem] font-black sm:text-[1.45rem]">
                  TUCXA
                </span>
                {authenticatedName && (
                  <span
                    className="min-w-0 truncate text-[0.72rem] font-bold text-[#2F6B43] sm:text-sm"
                    title={authenticatedName}
                  >
                    {authenticatedName}
                  </span>
                )}
              </span>
              <span className="block truncate text-[0.56rem] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-[0.7rem] sm:tracking-[0.22em]">
                TEMPLO DE UMBANDA CABOCLO SETE FLEXA
              </span>
            </span>
          </Link>
        </div>

        <div className="bg-[#fffdf7] px-4 py-1">
          <div className="mx-auto max-w-6xl">
            <a
              href="https://www.automacaoextrema.com"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#ded8ca] bg-white/90 px-3 py-1.5 text-center shadow-sm transition hover:bg-white sm:min-h-11 sm:gap-4 sm:px-5"
              aria-label="Conhecer a Automação Extrema"
            >
              <span className="shrink-0 text-sm font-black leading-none text-[#173323] sm:text-lg">Desenvolvido por</span>
              <Image
                src="/ae-logo-horizontal.png"
                alt="Automação Extrema"
                width={200}
                height={60}
                className="h-7 w-auto rounded-xl bg-[#00334E] object-contain px-2 py-1 sm:h-8"
                priority
              />
              <span className="text-xs font-semibold leading-tight text-slate-500 sm:text-base">Clique no logo e nos conheça</span>
            </a>
          </div>
        </div>

        <nav className="border-t border-[#dfe8df] bg-[#F7FAF2]/95 px-2 py-1.5 sm:px-3 sm:py-1.5">
          {simpleFinancialHeader ? (
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1.5 sm:gap-2.5">
              <a
                href="#inicio"
                aria-current={simpleFinancialActive === "inicio" ? "page" : undefined}
                className={`inline-flex min-h-7 items-center justify-center rounded-full px-2.5 py-1 text-center text-[0.72rem] font-black shadow-sm ring-1 transition hover:-translate-y-0.5 sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm ${
                  simpleFinancialActive === "inicio"
                    ? "bg-[#123D2C] text-white ring-[#123D2C] hover:bg-[#2F6B43]"
                    : "bg-white text-[#123D2C] ring-[#123D2C]/10 hover:bg-[#E9F2E7]"
                }`}
              >
                Início
              </a>
              <Link
                href={financialBackHref}
                aria-current={simpleFinancialActive === "voltar" ? "page" : undefined}
                className={`inline-flex min-h-7 items-center justify-center rounded-full px-2.5 py-1 text-center text-[0.72rem] font-black shadow-sm ring-1 transition hover:-translate-y-0.5 sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm ${
                  simpleFinancialActive === "voltar"
                    ? "bg-[#123D2C] text-white ring-[#123D2C] hover:bg-[#2F6B43]"
                    : "bg-white text-[#123D2C] ring-[#123D2C]/10 hover:bg-[#E9F2E7]"
                }`}
              >
                Voltar
              </Link>
              <button type="button" onClick={signOut} className="inline-flex min-h-7 items-center justify-center rounded-full bg-white px-2.5 py-1 text-center text-[0.72rem] font-black text-[#123D2C] shadow-sm ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#E9F2E7] sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm">
                Sair
              </button>
              <a href="https://wa.me/5519989848246?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20na%20%C3%A1rea%20financeira%20do%20Tucxa%20em%20Harmonia." target="_blank" rel="noreferrer" className="inline-flex min-h-7 items-center justify-center rounded-full bg-white px-2.5 py-1 text-center text-[0.72rem] font-black text-[#123D2C] shadow-sm ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#E9F2E7] sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm">
                Ajuda
              </a>
            </div>
          ) : (
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1.5 sm:gap-2.5">
              {effectiveTopNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={`inline-flex min-h-7 items-center justify-center rounded-full px-2.5 py-1 text-center text-[0.72rem] font-black shadow-sm ring-1 transition sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm ${
                    isActive(pathname, item.href)
                      ? "bg-[#123D2C] text-white ring-[#123D2C] hover:-translate-y-0.5 hover:bg-[#2F6B43]"
                      : "bg-white text-[#123D2C] ring-[#123D2C]/10 hover:-translate-y-0.5 hover:bg-[#E9F2E7]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button type="button" onClick={signOut} className="inline-flex min-h-7 items-center justify-center rounded-full bg-white px-2.5 py-1 text-center text-[0.72rem] font-black text-[#123D2C] shadow-sm ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#E9F2E7] sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm">
                Sair
              </button>
            </div>
          )}
        </nav>
      </header>

      <div id="inicio" className={`mx-auto max-w-7xl gap-5 px-3 py-3 sm:px-6 sm:py-5 lg:px-8 ${simpleFinancialHeader ? "block" : "grid lg:grid-cols-[300px_1fr]"}`}>
        {!simpleFinancialHeader && (
        <aside className="hidden self-start lg:block rounded-[2rem] bg-[#06451F] p-4 text-white shadow-xl shadow-emerald-900/10 lg:sticky lg:top-44 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
          <div className="mb-4 rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFF7DF]">Contexto atual</p>
            <h2 className="mt-1 text-xl font-black">{activeGroup.label}</h2>
            <p className="mt-2 text-xs leading-5 text-[#E8FFF0]">{activeGroup.description}</p>
          </div>

          <div className="grid gap-3">
            {orderedSidebarGroups.map((group) => (
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
        )}

        <section className="min-w-0">
          <div className={`${simpleFinancialHeader ? "mb-3 rounded-[1.5rem] p-4 sm:p-5" : "mb-5 rounded-[2rem] p-5 sm:p-7"} bg-white shadow ring-1 ring-slate-100`}>
            {!simpleFinancialHeader && (
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2F6B43]">Organização em Harmonia</p>
            )}
            {simpleFinancialHeader && simpleFinancialHeaderControl ? (
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                <h1 className="text-2xl font-black text-[#00334E] sm:text-3xl">{title}</h1>
                <div className="shrink-0">{simpleFinancialHeaderControl}</div>
              </div>
            ) : (
              <h1 className={`${simpleFinancialHeader ? "text-2xl sm:text-3xl" : "mt-2 text-3xl"} font-black text-[#00334E]`}>{title}</h1>
            )}
            {description && <p className="mt-3 max-w-4xl leading-7 text-slate-600">{description}</p>}
          </div>
          <div className="grid gap-5">{children}</div>
        </section>
      </div>
      {!simpleFinancialHeader && <FinancePendingContributionsLoginModal />}
    </main>
  );
}
