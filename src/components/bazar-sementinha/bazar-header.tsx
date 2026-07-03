import Image from "next/image";
import Link from "next/link";
import { AeBrandStrip } from "@/components/ae-solution-header";

type BazarHeaderActive = "home" | "cardapio" | "pedidos" | "caixa" | "relatorio" | "gestao";

type BazarHeaderProps = {
  active?: BazarHeaderActive;
  logged?: boolean;
  publicView?: boolean;
  publicContextToken?: string | null;
};

export function BazarHeader({ active = "home", logged = false, publicView = false, publicContextToken = null }: BazarHeaderProps) {
  const links = [
    { key: "home", label: "Início", href: "/bazar-sementinha", public: true },
    { key: "cardapio", label: "Cardápio", href: "/bazar-sementinha/cardapio", public: true },
    { key: "pedidos", label: "Pedidos", href: "/bazar-sementinha/pedidos", public: true },
    { key: "caixa", label: "Caixa", href: "/bazar-sementinha/caixa", public: false },
    { key: "relatorio", label: "Prestação", href: "/bazar-sementinha/prestacao-contas", public: false },
  ] as const;

  function withPublicContext(href: string, isPublicLink: boolean, key?: BazarHeaderActive) {
    if (!publicView || !isPublicLink || !publicContextToken) return href;
    if (key === "pedidos") return `/bazar-sementinha/cliente/${encodeURIComponent(publicContextToken)}`;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}cliente=${encodeURIComponent(publicContextToken)}`;
  }

  const visibleLinks = publicView ? links.filter((link) => link.public) : links;
  const homeHref = withPublicContext("/bazar-sementinha", true, "home");

  return (
    <header className="sticky top-0 z-50 border-b border-[#dfe8df] bg-[#fffdf7]/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
        <Link href={homeHref} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3" aria-label="Ir para Bazar no Controle">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#2f7d45] shadow sm:h-16 sm:w-16">
            <Image src="/bazar-no-controle-logo.svg" alt="Logo Bazar no Controle" width={72} height={72} className="h-full w-full object-cover" priority />
          </span>
          <span className="min-w-0 truncate text-lg font-black leading-[1.05] text-[#214527] sm:text-3xl">
            Bazar no Controle
          </span>
        </Link>
        {!publicView && (
          <nav className="flex shrink-0 items-center gap-2">
            {logged ? (
              <Link href="/api/bazar-sementinha/auth?logout=1" className="rounded-full border border-[#2f7d45]/20 bg-white px-3 py-2 text-xs font-black text-[#2f7d45] shadow-sm sm:px-4 sm:text-sm">
                Sair
              </Link>
            ) : (
              <Link href="/bazar-sementinha/login" className="rounded-full border border-[#2f7d45]/20 bg-white px-3 py-2 text-xs font-black text-[#2f7d45] shadow-sm sm:px-4 sm:text-sm">
                Gestão
              </Link>
            )}
          </nav>
        )}
      </div>
      <AeBrandStrip compact />
      <nav className="border-t border-[#dfe8df] bg-[#2f7d45] px-2 py-2 sm:px-3" aria-label="Menu do Bazar no Controle">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-1.5 sm:gap-2 sm:justify-start">
          {visibleLinks.map((link) => (
            <Link
              key={link.key}
              href={withPublicContext(link.href, link.public, link.key)}
              className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.06em] ring-1 transition sm:px-4 sm:text-xs sm:tracking-[0.08em] ${
                active === link.key ? "bg-[#f4e7b3] text-[#214527] ring-[#f4e7b3]" : "bg-white/10 text-white ring-white/15 hover:bg-white hover:text-[#214527]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {logged && !publicView && (
            <Link href="/bazar-sementinha/gestao" className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.06em] ring-1 sm:px-4 sm:text-xs sm:tracking-[0.08em] ${active === "gestao" ? "bg-[#f4e7b3] text-[#214527] ring-[#f4e7b3]" : "bg-white/10 text-white ring-white/15"}`}>
              Cadastros
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
