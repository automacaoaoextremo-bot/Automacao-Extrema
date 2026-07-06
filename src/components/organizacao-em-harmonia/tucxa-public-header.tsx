"use client";

import Image from "next/image";
import Link from "next/link";
import { tucxaTheme } from "@/app/solucoes/organizacao-em-harmonia/tucxa/tucxa-content";

type TucxaHeaderLink = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

type TucxaPublicHeaderProps = {
  actions?: TucxaHeaderLink[];
  sectionLinks?: TucxaHeaderLink[];
  navLabel?: string;
};

function HeaderAction({ link }: { link: TucxaHeaderLink }) {
  const isPrimary = link.variant === "primary";

  return (
    <Link
      href={link.href}
      className={`inline-flex min-h-7 items-center justify-center rounded-full border px-2.5 py-1 text-center text-[0.72rem] font-black leading-tight shadow-sm transition sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm ${
        isPrimary
          ? "border-[#123D2C] bg-[#123D2C] text-white shadow-green-950/10 hover:-translate-y-0.5 hover:bg-[#2F6B43] hover:shadow-lg"
          : "border-[#123D2C]/15 bg-white text-[#123D2C] shadow-none ring-1 ring-[#123D2C]/10 hover:-translate-y-0.5 hover:bg-[#E9F2E7]"
      }`}
    >
      {link.label}
    </Link>
  );
}

function SectionLink({ link }: { link: TucxaHeaderLink }) {
  return (
    <Link
      href={link.href}
      className="inline-flex min-h-7 items-center justify-center rounded-full bg-white px-2.5 py-1 text-center text-[0.72rem] font-black text-[#123D2C] shadow-sm ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#E9F2E7] sm:min-h-10 sm:px-5 sm:py-2 sm:text-sm"
    >
      {link.label}
    </Link>
  );
}

export function TucxaPublicHeader({ actions = [], sectionLinks = [], navLabel = "Menu do site do Tucxa" }: TucxaPublicHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#dfe8df] bg-white/96 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-5 sm:py-2.5">
        <Link
          href="/solucoes/organizacao-em-harmonia/tucxa"
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label="Ir para o site do Tucxa"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow ring-1 ring-[#123D2C]/10 sm:h-13 sm:w-13">
            <Image src={tucxaTheme.logoSrc} alt="Logo do Tucxa" width={72} height={72} className="h-full w-full object-contain" priority />
          </span>
          <span className="min-w-0">
            <span className="block whitespace-nowrap text-[1.05rem] font-black leading-[1.05] text-[#173323] sm:text-[1.45rem]">
              {tucxaTheme.organizationName}
            </span>
            <span className="block truncate text-[0.56rem] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-[0.7rem] sm:tracking-[0.22em]">
              {tucxaTheme.fullName}
            </span>
          </span>
        </Link>
      </div>

      <div className="bg-[#fffdf7] px-4 py-1">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
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
          </Link>
        </div>
      </div>

      {(actions.length > 0 || sectionLinks.length > 0) && (
        <nav className="border-t border-[#dfe8df] bg-[#F7FAF2]/95 px-2 py-1.5 sm:px-3 sm:py-1.5" aria-label={navLabel}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1.5 sm:gap-2.5">
            {actions.map((link) => (
              <HeaderAction key={`${link.label}-${link.href}`} link={link} />
            ))}
            {sectionLinks.map((link) => (
              <SectionLink key={`${link.label}-${link.href}`} link={link} />
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
