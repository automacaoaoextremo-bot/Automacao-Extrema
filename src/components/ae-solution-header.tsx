import Image from "next/image";
import Link from "next/link";

export type SolutionHeaderAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export function AeSolutionHeader({
  solutionName,
  logoSrc,
  logoAlt,
  actions,
}: {
  solutionName: string;
  logoSrc: string;
  logoAlt: string;
  actions: SolutionHeaderAction[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e5dfd2] bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4">
        <Link href="/solucoes/corrente-em-dia" className="flex min-w-0 items-center gap-3" aria-label={`Ir para ${solutionName}`}>
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#2F6B43] shadow sm:h-16 sm:w-16">
            <Image src={logoSrc} alt={logoAlt} width={64} height={64} className="h-full w-full object-cover" priority />
          </span>
          <span className="min-w-0 text-xl font-black leading-tight text-[#173323] sm:text-3xl">{solutionName}</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2" aria-label="Ações da solução">
          {actions.map((action) => {
            const primary = action.variant === "primary";
            return (
              <Link
                key={action.href + action.label}
                href={action.href}
                className={`rounded-full border px-3 py-2 text-center text-sm font-bold transition sm:px-5 sm:py-3 sm:text-lg ${
                  primary
                    ? "border-[#2F6B43] bg-[#2F6B43] text-white shadow-sm hover:bg-[#255536]"
                    : "border-[#ded8ca] bg-white text-[#173323] hover:bg-[#f7f4eb]"
                }`}
              >
                {action.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function AeBrandStrip() {
  return (
    <div className="border-b border-[#e5dfd2] bg-[#fffdf7] px-3 py-3">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="flex min-h-16 items-center justify-center gap-3 rounded-full border border-[#ded8ca] bg-white/80 px-4 py-3 text-center shadow-sm transition hover:bg-white sm:gap-5"
          aria-label="Conhecer a Automação Extrema"
        >
          <span className="shrink-0 text-lg font-black text-[#173323] sm:text-2xl">Desenvolvido por</span>
          <Image src="/ae-logo-azul.png" alt="Automação Extrema" width={210} height={80} className="h-10 w-auto rounded-2xl bg-[#00334E] object-contain sm:h-12" />
          <span className="text-base font-semibold text-slate-500 sm:text-2xl">Clique no logo e nos conheça</span>
        </Link>
      </div>
    </div>
  );
}
