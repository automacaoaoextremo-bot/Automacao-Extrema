import Link from "next/link";

type PublicHeaderProps = {
  showAccessLinks?: boolean;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  brandHref?: string;
  helpHref?: string | null;
  homeHref?: string | null;
};

export function PublicHeader({
  showAccessLinks = true,
  brandName,
  brandLogoUrl,
  brandHref = "/solucoes/impacto-no-controle",
  helpHref,
  homeHref,
}: PublicHeaderProps) {
  const resolvedBrandName = brandName?.trim() || "Impacto no Controle";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="container-page public-header py-2">
        <div className="public-header-main">
          <Link
            href={brandHref}
            className="brand-link font-extrabold text-[var(--brand-dark)]"
            aria-label={`Ir para a página inicial do ${resolvedBrandName}`}
          >
            {brandLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo configurado dinamicamente por cliente/campanha.
              <img
                src={brandLogoUrl}
                alt={resolvedBrandName}
                className="brand-client-logo"
              />
            ) : (
              <span className="brand-mark">IC</span>
            )}
            <span className="brand-title">{resolvedBrandName}</span>
          </Link>

          {helpHref || homeHref || showAccessLinks ? (
            <nav className="header-access-nav" aria-label="Acessos">
              {helpHref ? (
                <a
                  className="btn-secondary header-access-button"
                  href={helpHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  AJUDA?
                </a>
              ) : null}

              {homeHref ? (
                <Link className="btn-secondary header-access-button" href={homeHref}>
                  INÍCIO
                </Link>
              ) : null}

              {showAccessLinks ? (
                <>
                  <Link
                    className="btn-secondary header-access-button"
                    href="/solucoes/impacto-no-controle/cliente/login"
                  >
                    Cliente
                  </Link>
                  <Link
                    className="btn-secondary header-access-button"
                    href="/solucoes/impacto-no-controle/gestao/login"
                  >
                    Gestão
                  </Link>
                </>
              ) : null}
            </nav>
          ) : null}
        </div>

        <Link
          href="/"
          className="ae-header-badge"
          aria-label="Abrir site da Automação Extrema"
          title="Clique no logo e conheça a Automação Extrema"
        >
          <span className="ae-label">Desenvolvido por</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ae-logo-horizontal.png" alt="Automação Extrema" />
          <span className="ae-click-hint">Clique no logo e nos conheça</span>
        </Link>
      </div>
    </header>
  );
}
