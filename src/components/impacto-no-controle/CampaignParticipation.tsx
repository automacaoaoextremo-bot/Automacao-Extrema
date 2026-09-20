"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "@/components/impacto-no-controle/icons";
import { formatMoneyFromCents, normalizePhone } from "@/lib/impacto-no-controle/format";

type Campaign = {
  id: string;
  slug: string;
  client_name: string;
  title: string;
  number_price_cents: number;
  data_consent_text: string;
  status?: string;
  starts_at?: string | null;
  ends_at?: string | null;
};

type NumberItem = {
  number: number;
  status: string;
  buyer_display_name: string | null;
};

type Quota = {
  id: string;
  title: string;
  description: string | null;
  amount_cents: number;
  impact_qty: number | null;
};

type ParticipationDraft = {
  selectedNumbers?: number[];
  selectedQuotas?: Record<string, number>;
  name?: string;
  phone?: string;
  email?: string;
  consent?: boolean;
  updatedAt?: string;
};

type WizardStep = "rules" | "numbers" | "details";

type CampaignParticipationProps = {
  campaign: Campaign;
  numbers: NumberItem[];
  quotas: Quota[];
  regulation: string;
  supportHref: string;
};

export function CampaignParticipation({
  campaign,
  numbers,
  quotas,
  regulation,
  supportHref,
}: CampaignParticipationProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("rules");
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedQuotas, setSelectedQuotas] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const draftRestoredRef = useRef(false);

  const quotasEnabled = quotas.length > 0;
  const draftKey = useMemo(
    () => `impacto-participacao-rascunho-${campaign.slug}`,
    [campaign.slug],
  );

  const isOpen = useMemo(() => {
    if (campaign.status && campaign.status !== "active") return false;

    const starts = campaign.starts_at
      ? new Date(campaign.starts_at).getTime()
      : null;
    const ends = campaign.ends_at
      ? new Date(campaign.ends_at).getTime()
      : null;

    if (!starts && !ends) return true;
    if (currentTime === null) return false;

    return (!starts || currentTime >= starts) && (!ends || currentTime <= ends);
  }, [campaign.ends_at, campaign.starts_at, campaign.status, currentTime]);

  useEffect(() => {
    const updateClock = () => setCurrentTime(Date.now());
    updateClock();

    const timer = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;

    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) {
        setDraftReady(true);
        return;
      }

      const draft = JSON.parse(raw) as ParticipationDraft;
      const availableNumbers = new Set(
        numbers
          .filter((item) => item.status === "available")
          .map((item) => item.number),
      );
      const requestedNumbers = Array.isArray(draft.selectedNumbers)
        ? draft.selectedNumbers.filter((number) => Number.isFinite(number))
        : [];
      const restoredNumbers = requestedNumbers
        .filter((number) => availableNumbers.has(number))
        .sort((left, right) => left - right);
      const unavailableCount = requestedNumbers.length - restoredNumbers.length;
      const restoredQuotas =
        draft.selectedQuotas && typeof draft.selectedQuotas === "object"
          ? draft.selectedQuotas
          : {};

      setSelectedNumbers(restoredNumbers);
      setSelectedQuotas(quotasEnabled ? restoredQuotas : {});
      setName(draft.name || "");
      setPhone(draft.phone || "");
      setEmail(draft.email || "");
      setConsent(Boolean(draft.consent));

      const hasDraft =
        restoredNumbers.length > 0 ||
        Object.keys(restoredQuotas).length > 0 ||
        Boolean(draft.name) ||
        Boolean(draft.phone) ||
        Boolean(draft.email);

      if (hasDraft) {
        setDraftNotice(
          unavailableCount > 0
            ? "Restauramos sua seleção, mas alguns números escolhidos anteriormente não estão mais disponíveis. Confira os números atuais antes de continuar."
            : "Restauramos sua seleção anterior. Confira os números e seus dados antes de reservar.",
        );
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    } finally {
      setDraftReady(true);
    }
  }, [draftKey, numbers, quotasEnabled]);

  useEffect(() => {
    if (!draftReady) return;

    const hasDraftData =
      selectedNumbers.length > 0 ||
      Object.keys(selectedQuotas).length > 0 ||
      Boolean(name.trim()) ||
      Boolean(phone.trim()) ||
      Boolean(email.trim()) ||
      consent;

    if (!hasDraftData) {
      window.localStorage.removeItem(draftKey);
      return;
    }

    const draft: ParticipationDraft = {
      selectedNumbers,
      selectedQuotas: quotasEnabled ? selectedQuotas : {},
      name,
      phone,
      email,
      consent,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    consent,
    draftKey,
    draftReady,
    email,
    name,
    phone,
    quotasEnabled,
    selectedNumbers,
    selectedQuotas,
  ]);

  const totalCents = useMemo(() => {
    const numberAmount =
      selectedNumbers.length * campaign.number_price_cents;
    const quotaAmount = quotasEnabled
      ? Object.entries(selectedQuotas).reduce((sum, [id, quantity]) => {
          const quota = quotas.find((item) => item.id === id);
          return sum + (quota?.amount_cents || 0) * quantity;
        }, 0)
      : 0;

    return numberAmount + quotaAmount;
  }, [
    campaign.number_price_cents,
    quotas,
    quotasEnabled,
    selectedNumbers.length,
    selectedQuotas,
  ]);

  function toggleNumber(item: NumberItem) {
    if (item.status !== "available") return;

    setError(null);
    setSelectedNumbers((current) =>
      current.includes(item.number)
        ? current.filter((number) => number !== item.number)
        : [...current, item.number].sort((left, right) => left - right),
    );
  }

  function updateQuota(id: string, quantity: number) {
    setSelectedQuotas((current) => {
      const next = { ...current };

      if (quantity <= 0) {
        delete next[id];
      } else {
        next[id] = quantity;
      }

      return next;
    });
  }

  function clearDraft() {
    setSelectedNumbers([]);
    setSelectedQuotas({});
    setName("");
    setPhone("");
    setEmail("");
    setConsent(false);
    setDraftNotice(null);
    setError(null);
    window.localStorage.removeItem(draftKey);
  }

  function openWizard() {
    setError(null);
    setStep("rules");
    setOpen(true);
  }

  function closeWizard() {
    if (loading) return;
    setError(null);
    setOpen(false);
  }

  function continueToNumbers() {
    setError(null);
    setStep("numbers");
  }

  function continueToDetails() {
    setError(null);

    if (totalCents <= 0) {
      setError(
        quotasEnabled
          ? "Escolha pelo menos um número ou uma cota solidária para continuar."
          : "Escolha pelo menos um número para continuar.",
      );
      return;
    }

    setStep("details");
  }

  async function reserveNumbers() {
    setError(null);

    if (!isOpen) {
      setError("Esta campanha ainda não está aberta ou já foi encerrada.");
      return;
    }
    if (totalCents <= 0) {
      setError(
        quotasEnabled
          ? "Escolha pelo menos um número ou uma cota solidária."
          : "Escolha pelo menos um número para participar do sorteio.",
      );
      setStep("numbers");
      return;
    }
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (normalizePhone(phone).length < 10) {
      setError("Informe um celular válido com DDD.");
      return;
    }
    if (!consent) {
      setError("Confirme o aviso de uso dos dados para continuar.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/impacto-no-controle/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_slug: campaign.slug,
          name: name.trim(),
          phone: normalizePhone(phone),
          email: email.trim(),
          selected_numbers: selectedNumbers,
          selected_quotas: quotasEnabled ? selectedQuotas : {},
        }),
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error || "Não foi possível reservar seus números.",
        );
      }

      window.localStorage.removeItem(draftKey);
      window.sessionStorage.setItem(
        `impacto-reserva-criada-${json.token}`,
        "1",
      );
      router.push(
        `/solucoes/impacto-no-controle/reserva/${json.token}`,
      );
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erro inesperado.",
      );
      setLoading(false);
    }
  }

  const modalTitle =
    step === "rules"
      ? "Regras da ação"
      : step === "numbers"
        ? "Escolha seus números"
        : "Seus dados";

  return (
    <div id="participar" className="impacto-participation-root scroll-mt-28">
      <button
        type="button"
        className="btn-primary impacto-participate-trigger"
        onClick={openWizard}
        disabled={!isOpen}
      >
        PARTICIPE
      </button>

      {!isOpen ? (
        <p className="impacto-participation-closed">
          Esta campanha não está aberta para novas participações neste momento.
        </p>
      ) : null}

      {open ? (
        <div
          className="impacto-participation-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="impacto-participation-title"
        >
          <div className="impacto-participation-card">
            <div className="impacto-participation-header">
              <div>
                <p className="impacto-guide-kicker">GUIA DA RIFA</p>
                <h2 id="impacto-participation-title">{modalTitle}</h2>
              </div>

              <button
                type="button"
                className="impacto-guide-close"
                onClick={closeWizard}
                disabled={loading}
              >
                FECHAR
              </button>
            </div>

            <div className="impacto-participation-body">
              {draftNotice && step !== "rules" ? (
                <div
                  className="impacto-participation-draft"
                  role="status"
                  aria-live="polite"
                >
                  <p>{draftNotice}</p>
                  <button type="button" onClick={clearDraft}>
                    Limpar seleção e começar novamente
                  </button>
                </div>
              ) : null}

              {step === "rules" ? (
                <div className="impacto-participation-rules">
                  <p className="whitespace-pre-line">{regulation}</p>
                </div>
              ) : null}

              {step === "numbers" ? (
                <>
                  <div className="impacto-participation-step-heading">
                    <strong>1. Escolha seus números para o sorteio da campanha</strong>
                    <span>
                      Cada número custa{" "}
                      <strong>
                        {formatMoneyFromCents(campaign.number_price_cents)}
                      </strong>
                      . Números claros estão disponíveis; números escuros já estão
                      reservados ou confirmados.
                    </span>
                  </div>

                  <div className="impacto-participation-number-grid">
                    {numbers.map((item) => (
                      <button
                        key={item.number}
                        type="button"
                        onClick={() => toggleNumber(item)}
                        className={`number-button ${
                          selectedNumbers.includes(item.number)
                            ? "selected"
                            : ""
                        } ${
                          item.status === "confirmed"
                            ? "confirmed unavailable"
                            : ""
                        } ${
                          item.status !== "available" &&
                          item.status !== "confirmed"
                            ? "pending unavailable"
                            : ""
                        }`}
                        disabled={!isOpen || item.status !== "available"}
                        title={item.buyer_display_name || undefined}
                      >
                        {item.number.toString().padStart(2, "0")}
                      </button>
                    ))}
                  </div>

                  {quotasEnabled ? (
                    <div className="impacto-participation-quotas">
                      <strong>Colaboração extra opcional</strong>
                      <p>
                        Se desejar, você também pode ampliar sua colaboração
                        com cotas extras.
                      </p>
                      <div className="impacto-participation-quota-list">
                        {quotas.map((quota) => (
                          <label key={quota.id}>
                            <span>
                              <strong>{quota.title}</strong>
                              <small>
                                {formatMoneyFromCents(quota.amount_cents)}
                              </small>
                            </span>
                            <select
                              className="input"
                              disabled={!isOpen}
                              value={selectedQuotas[quota.id] || 0}
                              onChange={(event) =>
                                updateQuota(
                                  quota.id,
                                  Number(event.target.value),
                                )
                              }
                            >
                              {[0, 1, 2, 3, 4, 5, 10].map((quantity) => (
                                <option key={quantity} value={quantity}>
                                  {quantity}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="impacto-participation-total">
                    <p>Total da participação</p>
                    <strong>{formatMoneyFromCents(totalCents)}</strong>
                    <span>
                      Números:{" "}
                      {selectedNumbers.length
                        ? selectedNumbers.join(", ")
                        : "nenhum"}
                    </span>
                  </div>
                </>
              ) : null}

              {step === "details" ? (
                <>
                  <div className="impacto-participation-fields">
                    <div>
                      <label className="label" htmlFor="impacto-participant-name">
                        Nome *
                      </label>
                      <input
                        id="impacto-participant-name"
                        className="input"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Seu nome"
                        autoComplete="name"
                      />
                    </div>

                    <div>
                      <label
                        className="label"
                        htmlFor="impacto-participant-phone"
                      >
                        Celular com DDD *
                      </label>
                      <input
                        id="impacto-participant-phone"
                        className="input"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="(19) 99999-9999"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>

                    <div className="impacto-participation-email">
                      <label
                        className="label"
                        htmlFor="impacto-participant-email"
                      >
                        E-mail opcional
                      </label>
                      <input
                        id="impacto-participant-email"
                        className="input"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="seuemail@exemplo.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <label className="impacto-participation-consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                    />
                    <span>{campaign.data_consent_text}</span>
                  </label>

                  <div className="impacto-participation-next">
                    <strong>Próximo passo</strong>
                    <p>
                      Ao reservar, seus números ficam indisponíveis
                      temporariamente para outras pessoas. Na próxima tela você
                      poderá pagar por Pix ou combinar outra forma de pagamento
                      com o Suporte e depois enviar o comprovante.
                    </p>
                  </div>
                </>
              ) : null}

              {error ? (
                <div
                  className="impacto-participation-error"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
            </div>

            <div className="impacto-participation-footer">
              <a
                className="btn-secondary"
                href={supportHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> TIRAR DÚVIDA
              </a>

              {step === "rules" ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={continueToNumbers}
                >
                  CONTINUAR
                </button>
              ) : null}

              {step === "numbers" ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={continueToDetails}
                >
                  CONTINUAR
                </button>
              ) : null}

              {step === "details" ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={loading || !isOpen}
                  onClick={reserveNumbers}
                >
                  {loading
                    ? "Reservando..."
                    : "Reservar números e escolher pagamento"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
