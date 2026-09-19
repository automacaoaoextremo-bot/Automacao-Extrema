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
  numberCount?: number | null;
  numberPriceCents?: number | null;
};

export function CampaignIntroModal({
  campaignSlug,
  campaignTitle,
  enabled,
  title,
  numberCount,
  numberPriceCents,
}: CampaignIntroModalProps) {
  const storageKey = useMemo(() => `impacto-intro-modal-hidden-${campaignSlug}`, [campaignSlug]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const hidden = window.localStorage.getItem(storageKey) === "true";
    if (!hidden) setOpen(true);
  }, [enabled, storageKey]);

  if (!enabled || !open) return null;

  function close() {
    setOpen(false);
  }

  function closeAndRemember() {
    window.localStorage.setItem(storageKey, "true");
    setOpen(false);
  }

  function startParticipation() {
    setOpen(false);
    window.setTimeout(() => {
      document.getElementById("participar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const headline = title || `Bem-vindo à ação ${campaignTitle}`;
  const numberInfo = numberCount && numberPriceCents
    ? `${numberCount} números • ${formatMoneyFromCents(numberPriceCents)} cada`
    : "Escolha seus números e faça sua reserva pelo celular.";

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

        <div className="impacto-intro-steps">
          <div className="impacto-intro-step">
            <strong>1. Reserve</strong>
            <span>Escolha os números e informe seus dados.</span>
          </div>
          <div className="impacto-intro-step">
            <strong>2. Faça o Pix</strong>
            <span>Salve o link da reserva e efetue o pagamento.</span>
          </div>
          <div className="impacto-intro-step">
            <strong>3. Comprove</strong>
            <span>Envie o comprovante e acompanhe a confirmação.</span>
          </div>
        </div>

        <div className="impacto-intro-actions">
          <button className="btn-primary" type="button" onClick={startParticipation}>
            COMEÇAR
          </button>
          <a
            className="btn-secondary"
            href="https://wa.me/5519989848246?text=Ol%C3%A1%21%20Estou%20com%20d%C3%BAvida%20para%20participar%20de%20uma%20a%C3%A7%C3%A3o%20no%20Impacto%20no%20Controle.%20Gostaria%20de%20falar%20com%20o%20Suporte."
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
