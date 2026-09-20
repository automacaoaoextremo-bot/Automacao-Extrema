"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "@/components/impacto-no-controle/icons";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";

type CampaignIntroModalProps = {
  campaignSlug: string;
  campaignTitle: string;
  enabled?: boolean | null;
  title?: string | null;
  body?: string | null;
  numberCount?: number | null;
  numberPriceCents?: number | null;
};

const SUPPORT_HREF =
  "https://wa.me/5519989848246?text=Ol%C3%A1%21%20Estou%20com%20d%C3%BAvida%20para%20participar%20da%20rifa%20do%20Sementinha.%20Gostaria%20de%20falar%20com%20o%20Suporte.";

export function CampaignIntroModal({
  campaignSlug,
  campaignTitle,
  enabled,
  title,
  body,
  numberCount,
  numberPriceCents,
}: CampaignIntroModalProps) {
  const storageKey = useMemo(
    () => `impacto-intro-modal-hidden-${campaignSlug}`,
    [campaignSlug],
  );
  const skipOnceKey = useMemo(
    () => `impacto-intro-modal-skip-once-${campaignSlug}`,
    [campaignSlug],
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const currentUrl = new URL(window.location.href);
    const forceOpen = currentUrl.searchParams.get("inicio") === "1";

    if (forceOpen) {
      window.sessionStorage.removeItem(skipOnceKey);
      setOpen(true);

      currentUrl.searchParams.delete("inicio");
      const cleanUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      window.history.replaceState(null, "", cleanUrl);
      return;
    }

    const skipOnce = window.sessionStorage.getItem(skipOnceKey) === "true";
    if (skipOnce) {
      window.sessionStorage.removeItem(skipOnceKey);
      return;
    }

    const hidden = window.localStorage.getItem(storageKey) === "true";
    if (!hidden) setOpen(true);
  }, [enabled, skipOnceKey, storageKey]);

  if (!enabled || !open) return null;

  function close() {
    setOpen(false);
  }

  function closeAndRemember() {
    window.localStorage.setItem(storageKey, "true");
    setOpen(false);
  }

  function startParticipation() {
    window.sessionStorage.setItem(skipOnceKey, "true");
    window.location.assign(
      `/solucoes/impacto-no-controle/acao/${encodeURIComponent(campaignSlug)}`,
    );
  }

  const headline = title || `Bem-vindo à ação ${campaignTitle}`;
  const numberInfo =
    numberCount && numberPriceCents
      ? `${numberCount} números • ${formatMoneyFromCents(numberPriceCents)} cada`
      : "Escolha seus números e faça sua reserva pelo celular.";

  const purposeText =
    body?.trim() ||
    "Ao escolher um número, você ajuda o Sementinha a arrecadar recursos para as ações do Dia das Crianças e ainda concorre à bicicleta seminova.";

  return (
    <div
      className="impacto-intro-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-campaign-title"
    >
      <div className="impacto-intro-card">
        <div className="impacto-intro-header">
          <div className="min-w-0">
            <h2 id="intro-campaign-title" className="impacto-intro-title">
              {headline}
            </h2>
            <p className="impacto-intro-number-info">{numberInfo}</p>
          </div>

          <button
            className="impacto-intro-close"
            type="button"
            onClick={close}
            aria-label="Fechar aviso inicial"
          >
            FECHAR
          </button>
        </div>

        <p className="impacto-intro-purpose">{purposeText}</p>

        <div className="impacto-intro-steps">
          <div className="impacto-intro-step">
            <strong>1. Participe</strong>
            <span>
              Sua participação ajuda a fortalecer a arrecadação para as ações do
              Dia das Crianças.
            </span>
          </div>

          <div className="impacto-intro-step">
            <strong>2. Reserve e pague</strong>
            <span>
              Escolha seus números. O pagamento pode ser por Pix ou por outra
              forma combinada com o Suporte.
            </span>
          </div>

          <div className="impacto-intro-step">
            <strong>3. Comprove</strong>
            <span>
              Envie o comprovante para a organização conferir e confirmar sua
              participação.
            </span>
          </div>

          <div className="impacto-intro-step">
            <strong>4. Acompanhe</strong>
            <span>
              O sorteio será em data a confirmar e terá gravação em vídeo com a
              evidência do número ganhador. O vídeo será disponibilizado junto
              da prestação de contas da ação.
            </span>
          </div>
        </div>

        <div className="impacto-intro-actions">
          <button className="btn-primary" type="button" onClick={startParticipation}>
            COMEÇAR
          </button>

          <a
            className="btn-secondary"
            href={SUPPORT_HREF}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-4 w-4" /> Suporte
          </a>
        </div>

        <button
          className="impacto-intro-remember"
          type="button"
          onClick={closeAndRemember}
        >
          Não mostrar novamente neste navegador
        </button>
      </div>
    </div>
  );
}
