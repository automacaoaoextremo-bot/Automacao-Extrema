"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { tucxaTheme } from "@/app/solucoes/organizacao-em-harmonia/tucxa/tucxa-content";

type TucxaHeaderLink = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  action?: "signOutFilhoCorrente" | "signOutConsulente" | "supportWhatsapp";
};

type TucxaPublicHeaderProps = {
  actions?: TucxaHeaderLink[];
  sectionLinks?: TucxaHeaderLink[];
  navLabel?: string;
  showSupport?: boolean;
  authenticatedName?: string;
  showSessionName?: boolean;
  mobileActionColumns?: 2 | 3 | 4;
  compactMobileActions?: boolean;
};

function getLocationMatchKey(href: string) {
  if (typeof window === "undefined") return href;

  if (href.startsWith("#")) return href;

  try {
    const url = new URL(href, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function getCurrentActiveHref(links: TucxaHeaderLink[]) {
  if (!links.length) return "";

  const primary = links.find((link) => link.variant === "primary")?.href ?? links[0]?.href ?? "";

  if (typeof window === "undefined") return primary;

  const currentHash = window.location.hash;
  if (currentHash) {
    const hashMatch = links.find((link) => link.href === currentHash || link.href.endsWith(currentHash));
    if (hashMatch) return hashMatch.href;
  }

  const currentPath = window.location.pathname;
  const currentPathWithSearch = `${window.location.pathname}${window.location.search}`;
  const currentPathWithSearchAndHash = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const exactMatch = links.find((link) => {
    if (link.href.startsWith("#")) return false;
    const key = getLocationMatchKey(link.href);
    return key === currentPathWithSearchAndHash || key === currentPathWithSearch || key === currentPath;
  });

  return exactMatch?.href ?? primary;
}

function scrollToHash(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("#")) return;

  const target = document.getElementById(href.slice(1));
  if (!target) return;

  event.preventDefault();

  const header = document.querySelector<HTMLElement>("[data-tucxa-public-header]");
  const headerHeight = header?.getBoundingClientRect().height ?? 0;
  const spacing = 16;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - spacing;

  window.history.pushState(null, "", href);
  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
}


const AE_WHATSAPP_NUMBER = "5519989848246";

function supportContextMessage() {
  if (typeof window === "undefined") {
    return "Olá! Vim do site do Tucxa e preciso de ajuda.";
  }

  const title = document.title || "Site do Tucxa";
  const url = window.location.href;
  return [
    "Olá! Vim do site do Tucxa e preciso de ajuda.",
    "",
    `Página: ${title}`,
    `Link: ${url}`,
    "Contexto: cliquei em Ajuda/WhatsApp no site.",
  ].join("\n");
}

function buildSupportWhatsappUrl() {
  return `https://wa.me/${AE_WHATSAPP_NUMBER}?text=${encodeURIComponent(supportContextMessage())}`;
}

function SupportLink({ href, active, onSelect, label = "Dúvidas?", compactMobile = false }: { href: string; active: boolean; onSelect: () => void; label?: string; compactMobile?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onSelect}
      className={headerActionClassName(active, compactMobile)}
      aria-label="Falar com a Automação Extrema pelo WhatsApp"
    >
      {label}
    </a>
  );
}

function headerActionClassName(active: boolean, compactMobile = false) {
  const mobileClass = compactMobile
    ? "min-h-7 w-auto flex-none whitespace-nowrap px-2 py-1 text-[0.6rem]"
    : "min-h-7 w-full px-2.5 py-1 text-[0.72rem]";

  return `inline-flex items-center justify-center rounded-full border text-center font-black leading-tight shadow-sm transition sm:min-h-10 sm:w-auto sm:px-5 sm:py-2 sm:text-sm ${mobileClass} ${
    active
      ? "border-[#123D2C] bg-[#123D2C] text-white shadow-green-950/10 hover:-translate-y-0.5 hover:bg-[#2F6B43] hover:shadow-lg"
      : "border-[#123D2C]/15 bg-white text-[#123D2C] shadow-none ring-1 ring-[#123D2C]/10 hover:-translate-y-0.5 hover:bg-[#E9F2E7]"
  }`;
}

function HeaderAction({ link, active, onSelect, compactMobile = false }: { link: TucxaHeaderLink; active: boolean; onSelect: (href: string) => void; compactMobile?: boolean }) {
  async function handleSpecialAction() {
    if (link.action === "signOutFilhoCorrente") {
      await supabaseBrowser.auth.signOut();
      window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login");
      return;
    }

    if (link.action === "signOutConsulente") {
      await supabaseBrowser.auth.signOut();
      window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/consulente/login");
      return;
    }

    if (link.action === "supportWhatsapp") {
      window.open(buildSupportWhatsappUrl(), "_blank", "noopener,noreferrer");
    }
  }

  if (link.action) {
    return (
      <button
        type="button"
        onClick={() => {
          onSelect(link.href);
          void handleSpecialAction();
        }}
        className={headerActionClassName(active, compactMobile)}
      >
        {link.label}
      </button>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={(event) => {
        onSelect(link.href);
        scrollToHash(event, link.href);
      }}
      aria-current={active ? "page" : undefined}
      className={headerActionClassName(active, compactMobile)}
    >
      {link.label}
    </Link>
  );
}

function SectionLink({ link, active, onSelect, compactMobile = false }: { link: TucxaHeaderLink; active: boolean; onSelect: (href: string) => void; compactMobile?: boolean }) {
  return (
    <Link
      href={link.href}
      onClick={(event) => {
        onSelect(link.href);
        scrollToHash(event, link.href);
      }}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center justify-center rounded-full text-center font-black shadow-sm ring-1 transition sm:min-h-10 sm:w-auto sm:px-5 sm:py-2 sm:text-sm ${compactMobile ? "min-h-7 w-auto flex-none whitespace-nowrap px-2 py-1 text-[0.6rem]" : "min-h-7 w-full px-2.5 py-1 text-[0.72rem]"} ${
        active
          ? "bg-[#123D2C] text-white ring-[#123D2C] hover:-translate-y-0.5 hover:bg-[#2F6B43]"
          : "bg-white text-[#123D2C] ring-[#123D2C]/10 hover:-translate-y-0.5 hover:bg-[#E9F2E7]"
      }`}
    >
      {link.label}
    </Link>
  );
}

function authenticatedNameFromUser(user: { user_metadata?: Record<string, unknown> } | null | undefined) {
  const metadata = user?.user_metadata ?? {};
  const candidates = [metadata.full_name, metadata.fullName, metadata.name];
  return candidates.find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.trim() ?? "";
}

export function TucxaPublicHeader({
  actions = [],
  sectionLinks = [],
  navLabel = "Menu do site do Tucxa",
  showSupport = true,
  authenticatedName = "",
  showSessionName = false,
  mobileActionColumns,
  compactMobileActions = true,
}: TucxaPublicHeaderProps) {
  const allLinks = useMemo(() => [...actions, ...sectionLinks], [actions, sectionLinks]);
  const [activeHref, setActiveHref] = useState(() => getCurrentActiveHref(allLinks));
  const [supportHref, setSupportHref] = useState("https://wa.me/5519989848246");
  const [sessionAuthenticatedName, setSessionAuthenticatedName] = useState("");

  useEffect(() => {
    const updateActiveHref = () => {
      setActiveHref(getCurrentActiveHref(allLinks));
      setSupportHref(buildSupportWhatsappUrl());
    };

    const timer = window.setTimeout(updateActiveHref, 0);

    window.addEventListener("hashchange", updateActiveHref);
    window.addEventListener("popstate", updateActiveHref);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", updateActiveHref);
      window.removeEventListener("popstate", updateActiveHref);
    };
  }, [allLinks]);

  useEffect(() => {
    if (!showSessionName) return;

    let active = true;
    void supabaseBrowser.auth.getSession().then(({ data }) => {
      if (active) setSessionAuthenticatedName(authenticatedNameFromUser(data.session?.user));
    });
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (active) setSessionAuthenticatedName(authenticatedNameFromUser(session?.user));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [showSessionName]);

  const effectiveAuthenticatedName = authenticatedName || (showSessionName ? sessionAuthenticatedName : "");

  const handleSelect = (href: string) => {
    setActiveHref(href);
  };

  return (
    <header data-tucxa-public-header className="sticky top-0 z-50 border-b border-[#dfe8df] bg-white/96 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-5 sm:py-2.5">
        <Link
          href="/solucoes/organizacao-em-harmonia/tucxa"
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label="Ir para o site do Tucxa"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow ring-1 ring-[#123D2C]/10 sm:h-13 sm:w-13">
            <Image src={tucxaTheme.logoSrc} alt="Logo do Tucxa" width={72} height={72} className="h-full w-full object-contain" priority />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-baseline gap-2 leading-[1.05] text-[#173323]">
              <span className="shrink-0 whitespace-nowrap text-[1.05rem] font-black sm:text-[1.45rem]">
                {tucxaTheme.organizationName}
              </span>
              {effectiveAuthenticatedName && (
                <span
                  className="min-w-0 truncate whitespace-nowrap text-[0.72rem] font-bold text-[#2F6B43] sm:text-[0.95rem]"
                  title={effectiveAuthenticatedName}
                  aria-label={`Pessoa logada: ${effectiveAuthenticatedName}`}
                >
                  {effectiveAuthenticatedName}
                </span>
              )}
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

      {(actions.length > 0 || sectionLinks.length > 0 || (showSupport && supportHref)) && (
        <nav className="border-t border-[#dfe8df] bg-[#F7FAF2]/95 px-2 py-1.5 sm:px-3 sm:py-1.5" aria-label={navLabel}>
          <div
            className={`mx-auto max-w-6xl justify-center gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5 ${
              compactMobileActions
                ? "flex flex-wrap items-center"
                : mobileActionColumns === 4
                  ? "grid grid-cols-4 items-stretch"
                  : mobileActionColumns === 3
                    ? "grid grid-cols-3 items-stretch"
                    : mobileActionColumns === 2
                      ? "grid grid-cols-2 items-stretch"
                      : "flex flex-wrap items-center"
            }`}
          >
            {actions.map((link) =>
              link.action === "supportWhatsapp" ? (
                <SupportLink
                  key={`${link.label}-${link.href}`}
                  href={supportHref}
                  active={activeHref === link.href}
                  label={link.label}
                  compactMobile={compactMobileActions}
                  onSelect={() => handleSelect(link.href)}
                />
              ) : (
                <HeaderAction key={`${link.label}-${link.href}`} link={link} active={activeHref === link.href} onSelect={handleSelect} compactMobile={compactMobileActions} />
              ),
            )}
            {sectionLinks.map((link) => (
              <SectionLink key={`${link.label}-${link.href}`} link={link} active={activeHref === link.href} onSelect={handleSelect} compactMobile={compactMobileActions} />
            ))}
            {showSupport && <SupportLink href={supportHref} active={activeHref === "#duvidas"} compactMobile={compactMobileActions} onSelect={() => handleSelect("#duvidas")} />}
          </div>
        </nav>
      )}
    </header>
  );
}
