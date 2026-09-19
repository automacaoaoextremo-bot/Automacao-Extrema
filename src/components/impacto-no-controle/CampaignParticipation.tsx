"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, MessageCircle } from "@/components/impacto-no-controle/icons";
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

type NumberItem = { number: number; status: string; buyer_display_name: string | null };
type Quota = { id: string; title: string; description: string | null; amount_cents: number; impact_qty: number | null };

type ParticipationDraft = {
  selectedNumbers?: number[];
  selectedQuotas?: Record<string, number>;
  name?: string;
  phone?: string;
  email?: string;
  consent?: boolean;
  updatedAt?: string;
};

export function CampaignParticipation({ campaign, numbers, quotas }: { campaign: Campaign; numbers: NumberItem[]; quotas: Quota[] }) {
  const router = useRouter();
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
  const draftKey = useMemo(() => `impacto-participacao-rascunho-${campaign.slug}`, [campaign.slug]);

  const isOpen = useMemo(() => {
    if (campaign.status && campaign.status !== "active") return false;
    const starts = campaign.starts_at ? new Date(campaign.starts_at).getTime() : null;
    const ends = campaign.ends_at ? new Date(campaign.ends_at).getTime() : null;

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
      const availableNumbers = new Set(numbers.filter((item) => item.status === "available").map((item) => item.number));
      const requestedNumbers = Array.isArray(draft.selectedNumbers) ? draft.selectedNumbers.filter((n) => Number.isFinite(n)) : [];
      const restoredNumbers = requestedNumbers.filter((n) => availableNumbers.has(n)).sort((a, b) => a - b);
      const unavailableCount = requestedNumbers.length - restoredNumbers.length;
      const restoredQuotas = draft.selectedQuotas && typeof draft.selectedQuotas === "object" ? draft.selectedQuotas : {};

      setSelectedNumbers(restoredNumbers);
      setSelectedQuotas(quotasEnabled ? restoredQuotas : {});
      setName(draft.name || "");
      setPhone(draft.phone || "");
      setEmail(draft.email || "");
      setConsent(Boolean(draft.consent));

      const hasDraft = restoredNumbers.length > 0 || Object.keys(restoredQuotas).length > 0 || Boolean(draft.name) || Boolean(draft.phone) || Boolean(draft.email);

      if (hasDraft) {
        setDraftNotice(
          unavailableCount > 0
            ? "Restauramos sua seleção, mas alguns números escolhidos anteriormente não estão mais disponíveis. Confira os números atuais antes de reservar."
            : "Restauramos sua seleção. Confira seus dados e toque em ‘Reservar números e gerar Pix’ para continuar."
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

    const hasDraftData = selectedNumbers.length > 0 || Object.keys(selectedQuotas).length > 0 || name.trim() || phone.trim() || email.trim() || consent;

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
  }, [consent, draftKey, draftReady, email, name, phone, quotasEnabled, selectedNumbers, selectedQuotas]);

  const totalCents = useMemo(() => {
    const numberAmount = selectedNumbers.length * campaign.number_price_cents;
    const quotaAmount = quotasEnabled
      ? Object.entries(selectedQuotas).reduce((sum, [id, qty]) => {
          const quota = quotas.find((q) => q.id === id);
          return sum + (quota?.amount_cents || 0) * qty;
        }, 0)
      : 0;
    return numberAmount + quotaAmount;
  }, [campaign.number_price_cents, quotas, quotasEnabled, selectedNumbers.length, selectedQuotas]);

  function toggleNumber(item: NumberItem) {
    if (item.status !== "available") return;
    setSelectedNumbers((current) => current.includes(item.number) ? current.filter((n) => n !== item.number) : [...current, item.number].sort((a, b) => a - b));
  }

  function updateQuota(id: string, qty: number) {
    setSelectedQuotas((current) => {
      const next = { ...current };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
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
    window.localStorage.removeItem(draftKey);
  }

  async function reserveNumbers() {
    setError(null);

    if (!isOpen) return setError("Esta campanha ainda não está aberta ou já foi encerrada.");
    if (totalCents <= 0) return setError(quotasEnabled ? "Escolha pelo menos um número ou uma cota solidária." : "Escolha pelo menos um número para participar do sorteio.");
    if (!name.trim()) return setError("Informe seu nome.");
    if (normalizePhone(phone).length < 10) return setError("Informe um celular válido com DDD.");
    if (!consent) return setError("Confirme o aviso de uso dos dados para continuar.");

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
      if (!response.ok) throw new Error(json.error || "Não foi possível reservar seus números.");

      window.localStorage.removeItem(draftKey);
      window.sessionStorage.setItem(`impacto-reserva-criada-${json.token}`, "1");
      router.push(`/solucoes/impacto-no-controle/reserva/${json.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-2xl font-black text-[var(--brand-dark)]">Participe da ação</h2>
      <p className="mt-2 text-[var(--muted)]">
        {quotasEnabled
          ? "Escolha seu número para o sorteio da campanha. Depois, se desejar, aumente sua colaboração com cotas extras."
          : "Escolha um ou mais números disponíveis para participar do sorteio da campanha."}
      </p>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[#fff8e8] p-4 text-sm leading-6 text-[var(--brand-dark)]">
        <div className="flex gap-3">
          <HelpCircle className="mt-1 h-5 w-5 shrink-0" />
          <div>
            <p className="font-extrabold">Como funciona</p>
            <p className="mt-1">
              1) Escolha seus números. 2) Informe seus dados. 3) Toque em Reservar números e gerar Pix. 4) Na próxima tela, salve o link da reserva no WhatsApp. 5) Faça o Pix e salve o comprovante. 6) Volte pelo link da reserva e envie o comprovante. A organização irá conferir o pagamento e confirmar sua participação.
            </p>
            <a className="mt-3 inline-flex items-center gap-2 font-extrabold underline" href="https://wa.me/5519989848246?text=Ol%C3%A1%21%20Estou%20com%20d%C3%BAvida%20para%20participar%20de%20uma%20a%C3%A7%C3%A3o%20no%20Impacto%20no%20Controle.%20Gostaria%20de%20falar%20com%20o%20Suporte." target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" /> Preciso falar com o Suporte no WhatsApp
            </a>
          </div>
        </div>
      </div>

      {draftNotice ? (
        <div className="mt-4 rounded-2xl border-2 border-[#f59e0b] bg-[#fff1a8] p-4 text-sm font-extrabold leading-6 text-[#3f2a00]" role="status" aria-live="polite">
          <p>{draftNotice}</p>
          <button type="button" className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-black text-[#7c2d12] shadow-sm" onClick={clearDraft}>
            Limpar seleção e começar novamente
          </button>
        </div>
      ) : null}

      {!isOpen ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Esta campanha não está aberta para novas aquisições neste momento.
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="font-extrabold text-[var(--brand-dark)]">1. Escolha seus números para o sorteio da campanha</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Cada número custa <strong>{formatMoneyFromCents(campaign.number_price_cents)}</strong>. Números claros estão disponíveis; números escuros já estão reservados ou confirmados.</p>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {numbers.map((item) => (
            <button
              key={item.number}
              type="button"
              onClick={() => toggleNumber(item)}
              className={`number-button ${selectedNumbers.includes(item.number) ? "selected" : ""} ${item.status === "confirmed" ? "confirmed unavailable" : ""} ${item.status !== "available" && item.status !== "confirmed" ? "pending unavailable" : ""}`}
              disabled={!isOpen || item.status !== "available"}
              title={item.buyer_display_name || undefined}
            >
              {item.number.toString().padStart(2, "0")}
              {item.buyer_display_name ? <small>{item.buyer_display_name}</small> : null}
            </button>
          ))}
        </div>
      </div>

      {quotasEnabled ? (
        <div className="mt-7 border-t border-[var(--border)] pt-6">
          <span className="badge">Colaboração extra opcional</span>
          <h3 className="mt-3 font-extrabold text-[var(--brand-dark)]">2. Quer aumentar sua colaboração?</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            A participação no sorteio da campanha é feita pelos números de <strong>{formatMoneyFromCents(campaign.number_price_cents)}</strong>.
            As cotas abaixo são opcionais e servem para ampliar o impacto da ação.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {quotas.map((quota) => (
              <div key={quota.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                <p className="font-extrabold">{quota.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{quota.description}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <strong>{formatMoneyFromCents(quota.amount_cents)}</strong>
                  <select className="input max-w-24" disabled={!isOpen} value={selectedQuotas[quota.id] || 0} onChange={(e) => updateQuota(quota.id, Number(e.target.value))}>
                    {[0, 1, 2, 3, 4, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-7 rounded-2xl bg-[#eef5ec] p-4">
        <p className="text-sm font-bold text-[var(--muted)]">Total da participação</p>
        <p className="mt-1 text-3xl font-black text-[var(--brand-dark)]">{formatMoneyFromCents(totalCents)}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Números: {selectedNumbers.length ? selectedNumbers.join(", ") : "nenhum"}</p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nome *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </div>
        <div>
          <label className="label">Celular com DDD *</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(19) 99999-9999" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">E-mail opcional</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" />
        </div>
      </div>

      <label className="mt-4 flex gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 text-sm leading-6 text-[var(--muted)]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>{campaign.data_consent_text}</span>
      </label>

      <div className="mt-6 rounded-2xl border-2 border-[var(--brand)] bg-white p-4">
        <p className="text-sm font-extrabold text-[var(--brand-dark)]">Próximo passo</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Ao reservar, seus números ficam indisponíveis temporariamente para outras pessoas. Na próxima tela você verá o QR Code, o Pix copia e cola e o envio do comprovante.
        </p>
        {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        <button className="btn-primary mt-4" disabled={loading || !isOpen} onClick={reserveNumbers}>
          {loading ? "Reservando..." : "Reservar números e gerar Pix"}
        </button>
      </div>
    </div>
  );
}
