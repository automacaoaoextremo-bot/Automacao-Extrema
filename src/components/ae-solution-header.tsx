import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type SolutionHeaderAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export type SolutionSectionLink = {
  label: string;
  href: string;
};

const defaultSolutionLinks: SolutionSectionLink[] = [
  { label: "Solução", href: "#solucao" },
  { label: "Painel", href: "#painel" },
  { label: "Contribuição", href: "#contribuicao" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Cliente Fundador", href: "#cliente-fundador" },
];

function HeaderActionLink({ action }: { action: SolutionHeaderAction }) {
  const primary = action.variant === "primary";

  return (
    <Link
      href={action.href}
      className={`inline-flex min-h-7 items-center justify-center rounded-full border px-2.5 py-1 text-center text-[0.62rem] font-black leading-tight shadow-sm transition sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm ${
        primary
          ? "border-[#31C16B] bg-[#31C16B] text-[#00334E] shadow-emerald-950/10 hover:-translate-y-0.5 hover:bg-[#43db7c] hover:shadow-lg"
          : "border-white/15 bg-white/10 text-white shadow-none ring-1 ring-white/10 hover:-translate-y-0.5 hover:bg-white hover:text-[#00334E]"
      }`}
    >
      {action.label}
    </Link>
  );
}

function SectionMenuLink({ link }: { link: SolutionSectionLink }) {
  return (
    <Link
      href={link.href}
      className="inline-flex min-h-7 items-center justify-center rounded-full bg-white/10 px-2.5 py-1 text-center text-[0.6rem] font-black uppercase tracking-[0.04em] text-white shadow-sm ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#31C16B] hover:text-[#00334E] sm:min-h-10 sm:px-5 sm:py-2 sm:text-xs sm:tracking-[0.08em]"
    >
      {link.label}
    </Link>
  );
}

export function AeSolutionHeader({
  solutionName,
  logoSrc,
  logoAlt,
  actions,
  sectionLinks = defaultSolutionLinks,
  showBrandStrip = true,
  topAction,
  homeHref,
  navLabel,
  subHeader,
  fixed = false,
}: {
  solutionName: string;
  logoSrc: string;
  logoAlt: string;
  actions: SolutionHeaderAction[];
  sectionLinks?: SolutionSectionLink[];
  showBrandStrip?: boolean;
  topAction?: ReactNode;
  homeHref?: string;
  navLabel?: string;
  subHeader?: ReactNode;
  fixed?: boolean;
}) {
  return (
    <header className={`${fixed ? "fixed inset-x-0 top-0" : "sticky top-0"} z-50 border-b border-[#dfe8df] bg-white/96 shadow-sm backdrop-blur`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
        <Link
          href={homeHref ?? "/solucoes/corrente-em-dia"}
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label={`Ir para ${solutionName}`}
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#2F6B43] shadow sm:h-14 sm:w-14">
            <Image src={logoSrc} alt={logoAlt} width={72} height={72} className="h-full w-full object-cover" priority />
          </span>
          <span className="min-w-0 whitespace-nowrap text-[1.2rem] font-black leading-[1.05] text-[#173323] sm:text-[1.65rem]">
            {solutionName}
          </span>
        </Link>

        {topAction && <div className="shrink-0">{topAction}</div>}
      </div>

      {showBrandStrip && <AeBrandStrip compact />}

      {subHeader && <div className="border-t border-[#f4e2df] bg-[#fffaf8]/95">{subHeader}</div>}

      {(actions.length > 0 || sectionLinks.length > 0) && (
        <nav className="border-t border-white/10 bg-[#00334E] px-2 py-1.5 sm:px-3 sm:py-2" aria-label={navLabel ?? `Menu do ${solutionName}`}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1.5 sm:gap-2.5">
            {actions.map((action) => (
              <HeaderActionLink key={action.href + action.label} action={action} />
            ))}
            {sectionLinks.map((link) => (
              <SectionMenuLink key={link.href} link={link} />
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function AeBrandStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bg-[#fffdf7] px-4 ${compact ? "py-1.5" : "py-2.5"}`}>
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#ded8ca] bg-white/90 px-3 py-1.5 text-center shadow-sm transition hover:bg-white sm:min-h-12 sm:gap-4 sm:px-5"
          aria-label="Conhecer a Automação Extrema"
        >
          <span className="shrink-0 text-sm font-black leading-none text-[#173323] sm:text-xl">Desenvolvido por</span>
          <Image
            src="/ae-logo-horizontal.png"
            alt="Automação Extrema"
            width={200}
            height={60}
            className="h-7 w-auto rounded-xl bg-[#00334E] object-contain px-2 py-1 sm:h-8"
            priority
          />
          <span className="text-xs font-semibold leading-tight text-slate-500 sm:text-lg">Clique no logo e nos conheça</span>
        </Link>
      </div>
    </div>
  );
}
