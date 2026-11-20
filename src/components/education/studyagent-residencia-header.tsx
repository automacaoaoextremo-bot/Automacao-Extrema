import Image from "next/image";
import Link from "next/link";

export type StudyAgentHeaderAction = {
  label: string;
  href: string;
  primary?: boolean;
};

export function StudyAgentResidenciaHeader({
  actions = [],
}: {
  actions?: StudyAgentHeaderAction[];
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#d8e6ea] bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5">
        <Link
          href="/solucoes/studyagent/residencia-ia"
          className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
          aria-label="Ir para Residência IA no StudyAgent"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00334E] text-xs font-black text-[#31C16B] shadow-sm ring-1 ring-[#00334E]/10 sm:h-14 sm:w-14 sm:text-sm">
            IA
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.98rem] font-black leading-tight text-[#00334E] sm:text-[1.35rem]">
              Residência IA
            </span>
            <span className="block max-w-[15rem] text-[0.43rem] font-black uppercase leading-[1.15] tracking-[0.08em] text-[#007C9B] sm:max-w-none sm:text-[0.66rem] sm:tracking-[0.16em]">
              StudyAgent · aprendizagem orientada por competências
            </span>
          </span>
        </Link>

        {actions.length > 0 ? (
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Acesso do StudyAgent Residência IA">
            {actions.map((action) => (
              <Link
                key={`${action.label}-${action.href}`}
                href={action.href}
                className={`inline-flex min-h-8 items-center justify-center rounded-full px-2.5 py-1.5 text-[0.58rem] font-black leading-none shadow-sm ring-1 transition sm:min-h-10 sm:px-4 sm:text-sm ${
                  action.primary
                    ? "bg-[#00334E] text-white ring-[#00334E] hover:bg-[#064862]"
                    : "bg-white text-[#00334E] ring-[#00334E]/15 hover:bg-cyan-50"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="bg-[#fffdf7] px-3 py-1">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#ded8ca] bg-white/90 px-2.5 py-1 text-center shadow-sm transition hover:bg-white sm:min-h-11 sm:gap-4 sm:px-5"
            aria-label="Conhecer a Automação Extrema"
          >
            <span className="shrink-0 text-[0.7rem] font-black leading-none text-[#173323] sm:text-lg">
              Desenvolvido por
            </span>
            <Image
              src="/ae-logo-horizontal.png"
              alt="Automação Extrema"
              width={200}
              height={60}
              className="h-6 w-auto rounded-lg bg-[#00334E] object-contain px-2 py-1 sm:h-8 sm:rounded-xl"
              priority
            />
            <span className="truncate text-[0.6rem] font-semibold leading-tight text-slate-500 sm:text-base">
              Clique no logo e nos conheça
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
