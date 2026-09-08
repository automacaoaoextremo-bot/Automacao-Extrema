"use client";

import Image from "next/image";
import Link from "next/link";

export type OrganizacaoPublicHeaderAction = {
  label: string;
  href?: string;
  actionId?: string;
  variant?: "primary" | "secondary";
};

type OrganizacaoPublicHeaderProps = {
  actions?: OrganizacaoPublicHeaderAction[];
  onAction?: (actionId: string) => void;
  backFallbackHref?: string;
  navLabel?: string;
  solutionName?: string;
  showBack?: boolean;
};

const actionClassName = (primary = false) =>
  `inline-flex min-h-7 flex-none items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-center text-[0.68rem] font-black shadow-sm ring-1 transition hover:-translate-y-0.5 sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm ${
    primary
      ? "bg-[#00334E] text-white ring-[#00334E] hover:bg-[#064862]"
      : "bg-white text-[#00334E] ring-[#00334E]/12 hover:bg-emerald-50"
  }`;

export function OrganizacaoPublicHeader({
  actions = [],
  onAction,
  backFallbackHref = "/solucoes/organizacao-em-harmonia",
  navLabel = "Navegação da Organização em Harmonia",
  solutionName = "Organização em Harmonia",
  showBack = true,
}: OrganizacaoPublicHeaderProps) {
  function goBack() {
    if (typeof window === "undefined") return;

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(backFallbackHref);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#dbe7e0] bg-white/96 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-5 sm:py-2.5">
        <Link
          href="/solucoes/organizacao-em-harmonia"
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label="Ir para a página da Organização em Harmonia"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow ring-1 ring-[#00334E]/10 sm:h-13 sm:w-13">
            <Image
              src="/organizacao-em-harmonia-logo.svg"
              alt="Logo Organização em Harmonia"
              width={72}
              height={72}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.02rem] font-black leading-tight text-[#00334E] sm:text-[1.35rem]">
              {solutionName}
            </span>
            <span className="block truncate text-[0.56rem] font-black uppercase tracking-[0.15em] text-[#2F6B43] sm:text-[0.7rem] sm:tracking-[0.2em]">
              Organização, clareza e cuidado
            </span>
          </span>
        </Link>
      </div>

      <div className="bg-[#fffdf7] px-3 py-1">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#ded8ca] bg-white/90 px-2.5 py-1 text-center shadow-sm transition hover:bg-white sm:min-h-11 sm:gap-4 sm:px-5"
            aria-label="Conhecer a Automação Extrema"
          >
            <span className="shrink-0 text-[0.72rem] font-black leading-none text-[#173323] sm:text-lg">Desenvolvido por</span>
            <Image
              src="/ae-logo-horizontal.png"
              alt="Automação Extrema"
              width={200}
              height={60}
              className="h-6 w-auto rounded-lg bg-[#00334E] object-contain px-2 py-1 sm:h-8 sm:rounded-xl"
              priority
            />
            <span className="truncate text-[0.62rem] font-semibold leading-tight text-slate-500 sm:text-base">Clique no logo e nos conheça</span>
          </Link>
        </div>
      </div>

      <nav className="border-t border-[#dbe7e0] bg-[#F6FBF8]/96 px-2 py-1.5" aria-label={navLabel}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1.5 px-0.5 sm:gap-2.5 sm:px-0">
          <a href="#inicio" className={actionClassName(true)}>
            Início
          </a>
          {showBack && (
            <button type="button" onClick={goBack} className={actionClassName(false)}>
              Voltar
            </button>
          )}
          {actions.map((action) => {
            const primary = action.variant === "primary";
            if (action.actionId) {
              return (
                <button
                  key={`${action.label}-${action.actionId}`}
                  type="button"
                  onClick={() => onAction?.(action.actionId as string)}
                  className={actionClassName(primary)}
                >
                  {action.label}
                </button>
              );
            }

            return (
              <Link
                key={`${action.label}-${action.href ?? "#"}`}
                href={action.href || "#inicio"}
                className={actionClassName(primary)}
              >
                {action.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
