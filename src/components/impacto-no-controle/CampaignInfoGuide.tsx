"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "@/components/impacto-no-controle/icons";

type GuideMode = "steps" | "prize" | "rules" | null;

type CampaignInfoGuideProps = {
  story?: string | null;
  prizeTitle?: string | null;
  prizeDescription?: string | null;
  regulation?: string | null;
  supportHref: string;
  showParticipationSteps?: boolean;
};

const participationSteps = [
  {
    title: "Escolha seus números",
    text: "Veja os números disponíveis e selecione aqueles com que deseja participar.",
  },
  {
    title: "Informe seus dados",
    text: "Preencha nome e celular. O e-mail é opcional, mas ajuda no acompanhamento.",
  },
  {
    title: "Reserve e faça o Pix",
    text: "Toque em Reservar números e gerar Pix. Salve o link da reserva antes de abrir o banco.",
  },
  {
    title: "Envie o comprovante",
    text: "Volte pelo link salvo, envie o comprovante e acompanhe a confirmação da organização.",
  },
];

export function CampaignInfoGuide({
  story,
  prizeTitle,
  prizeDescription,
  regulation,
  supportHref,
  showParticipationSteps = true,
}: CampaignInfoGuideProps) {
  const [mode, setMode] = useState<GuideMode>(null);
  const [step, setStep] = useState(0);

  const currentStep = participationSteps[step];
  const hasPrizeInfo = Boolean(prizeTitle || prizeDescription || story);
  const hasRules = Boolean(regulation?.trim());

  const modalTitle = useMemo(() => {
    if (mode === "steps") return `Como participar • passo ${step + 1} de ${participationSteps.length}`;
    if (mode === "prize") return "Sobre a bicicleta";
    if (mode === "rules") return "Regras da ação";
    return "";
  }, [mode, step]);

  function openSteps() {
    setStep(0);
    setMode("steps");
  }

  function close() {
    setMode(null);
  }

  function goToParticipation() {
    setMode(null);
    window.setTimeout(() => {
      document.getElementById("participar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <>
      <div className="impacto-info-actions">
        {showParticipationSteps ? (
          <button type="button" className="impacto-info-button destaque" onClick={openSteps}>
            <span>Como participar</span>
            <small>Veja o passo a passo</small>
          </button>
        ) : null}

        {hasPrizeInfo ? (
          <button type="button" className="impacto-info-button" onClick={() => setMode("prize")}>
            <span>Sobre a bicicleta</span>
            <small>Prêmio e informações</small>
          </button>
        ) : null}

        {hasRules ? (
          <button type="button" className="impacto-info-button" onClick={() => setMode("rules")}>
            <span>Regulamento</span>
            <small>Regras e observações</small>
          </button>
        ) : null}
      </div>

      {mode ? (
        <div className="impacto-guide-overlay" role="dialog" aria-modal="true" aria-labelledby="impacto-guide-title">
          <div className="impacto-guide-card">
            <div className="impacto-guide-header">
              <div>
                <p className="impacto-guide-kicker">GUIA DA RIFA</p>
                <h2 id="impacto-guide-title">{modalTitle}</h2>
              </div>
              <button type="button" className="impacto-guide-close" onClick={close}>
                FECHAR
              </button>
            </div>

            <div className="impacto-guide-body">
              {mode === "steps" ? (
                <>
                  <div className="impacto-guide-progress" aria-hidden="true">
                    {participationSteps.map((_, itemIndex) => (
                      <span key={itemIndex} className={itemIndex <= step ? "active" : ""} />
                    ))}
                  </div>
                  <div className="impacto-guide-step">
                    <span className="impacto-guide-step-number">{step + 1}</span>
                    <h3>{currentStep.title}</h3>
                    <p>{currentStep.text}</p>
                  </div>
                </>
              ) : null}

              {mode === "prize" ? (
                <div className="impacto-guide-copy">
                  {prizeTitle ? <h3>{prizeTitle}</h3> : null}
                  {prizeDescription ? <p>{prizeDescription}</p> : null}
                  {story ? <p>{story}</p> : null}
                </div>
              ) : null}

              {mode === "rules" ? (
                <div className="impacto-guide-copy">
                  <p className="whitespace-pre-line">{regulation}</p>
                </div>
              ) : null}
            </div>

            <div className="impacto-guide-footer">
              {mode === "steps" ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={step === 0}
                    onClick={() => setStep((current) => Math.max(0, current - 1))}
                  >
                    VOLTAR
                  </button>

                  {step < participationSteps.length - 1 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setStep((current) => Math.min(participationSteps.length - 1, current + 1))}
                    >
                      SEGUIR
                    </button>
                  ) : (
                    <button type="button" className="btn-primary" onClick={goToParticipation}>
                      PARTICIPAR AGORA
                    </button>
                  )}
                </>
              ) : (
                <>
                  <a className="btn-secondary" href={supportHref} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" /> TIRAR DÚVIDA
                  </a>
                  <button type="button" className="btn-primary" onClick={close}>
                    FECHAR
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
