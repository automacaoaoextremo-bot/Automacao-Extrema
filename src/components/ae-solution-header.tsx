import Image from "next/image";
import Link from "next/link";

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
      className={`inline-flex min-h-11 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-black leading-tight shadow-sm transition sm:min-h-12 sm:px-5 sm:text-sm ${
        primary
          ? "border-[#31C16B] bg-[#31C16B] text-[#00334E] shadow-emerald-200 hover:-translate-y-0.5 hover:bg-[#43db7c] hover:shadow-lg"
          : "border-[#d8e2dc] bg-white text-[#173323] hover:-translate-y-0.5 hover:border-[#31C16B] hover:bg-[#f4fff8] hover:shadow-md"
      }`}
    >
      {action.label}
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
}: {
  solutionName: string;
  logoSrc: string;
  logoAlt: string;
  actions: SolutionHeaderAction[];
  sectionLinks?: SolutionSectionLink[];
  showBrandStrip?: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#dfe8df] bg-white/96 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <Link
          href="/solucoes/corrente-em-dia"
          className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
          aria-label={`Ir para ${solutionName}`}
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#2F6B43] shadow sm:h-16 sm:w-16">
            <Image src={logoSrc} alt={logoAlt} width={72} height={72} className="h-full w-full object-cover" priority />
          </span>
          <span className="min-w-0 max-w-[7rem] text-xl font-black leading-[1.05] text-[#173323] sm:max-w-none sm:text-3xl">
            {solutionName}
          </span>
        </Link>

        <nav className="grid shrink-0 grid-cols-1 gap-1.5 sm:flex sm:items-center sm:gap-2" aria-label="Ações da solução">
          {actions.map((action) => (
            <HeaderActionLink key={action.href + action.label} action={action} />
          ))}
        </nav>
      </div>

      {showBrandStrip && <AeBrandStrip compact />}

      {sectionLinks.length > 0 && (
        <nav className="border-t border-white/10 bg-[#00334E] px-3 py-2" aria-label="Menu de seções do Corrente em Dia">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sectionLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full bg-white/10 px-4 py-2 text-[0.72rem] font-black uppercase tracking-[0.08em] text-white shadow-sm ring-1 ring-white/10 transition hover:bg-[#31C16B] hover:text-[#00334E]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export function AeBrandStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bg-[#fffdf7] px-3 ${compact ? "py-2" : "py-3"}`}>
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#ded8ca] bg-white/85 px-3 py-2 text-center shadow-sm transition hover:bg-white sm:min-h-14 sm:gap-4 sm:px-4"
          aria-label="Conhecer a Automação Extrema"
        >
          <span className="shrink-0 text-base font-black text-[#173323] sm:text-2xl">Desenvolvido por</span>
          <Image
            src="/ae-logo-horizontal.png"
            alt="Automação Extrema"
            width={200}
            height={60}
            className="h-8 w-auto rounded-xl bg-[#00334E] object-contain px-1 sm:h-10"
          />
          <span className="text-sm font-semibold leading-snug text-slate-500 sm:text-xl">Clique no logo e nos conheça</span>
        </Link>
      </div>
    </div>
  );
}
