"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, X } from "@/components/impacto-no-controle/icons";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";

type CampaignIntroModalProps = {
  campaignSlug: string;
  campaignTitle: string;
  clientName: string;
  enabled?: boolean | null;
  title?: string | null;
  body?: string | null;
  numberCount?: number | null;
  numberPriceCents?: number | null;
};

export function CampaignIntroModal({
  campaignSlug,
  campaignTitle,
  clientName,
  enabled,
  title,
  body,
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

  const headline = title || `Bem-vindo à ação ${campaignTitle}`;
  const intro = body ||
    `Aqui você escolhe seus números, reserva sua participação, faz o Pix com segurança e envia o comprovante em uma página própria. A equipe da ${clientName} confere tudo antes de confirmar a participação.`;
  const numberInfo = numberCount && numberPriceCents
    ? `${numberCount} números disponíveis, ${formatMoneyFromCents(numberPriceCents)} cada.`
    : "Escolha seus números, reserve e finalize pelo link da reserva.";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="intro-campaign-title">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-[#fffdf7] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-5">
          <span className="badge">Primeira visita</span>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[#fff8e8] text-[var(--brand-dark)]" type="button" onClick={close} aria-label="Fechar aviso inicial">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          <h2 id="intro-campaign-title" className="text-3xl font-black leading-tight text-[var(--brand-dark)] md:text-4xl">{headline}</h2>
          <p className="mt-4 leading-7 text-[var(--muted)]">{intro}</p>
          <p className="mt-3 text-sm font-black text-[var(--brand-dark)]">{numberInfo}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <h3 className="font-black text-[var(--brand-dark)]">1. Reserve</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Escolha seus números, informe seus dados e toque em <strong>Reservar números e gerar Pix</strong>.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <h3 className="font-black text-[var(--brand-dark)]">2. Salve o link</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">A página da reserva pode ser enviada para o seu WhatsApp, evitando perder o link ao abrir o app do banco.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <h3 className="font-black text-[var(--brand-dark)]">3. Comprove</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Faça o Pix, volte pelo link salvo e envie o comprovante. A organização confere e confirma.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[#fff8e8] p-5 sm:flex-row sm:items-center sm:justify-between">
          <button className="btn-primary sm:!w-auto" type="button" onClick={close}>Participar agora</button>
          <a className="btn-secondary sm:!w-auto" href="https://wa.me/5519989848246?text=Ol%C3%A1%21%20Estou%20com%20d%C3%BAvida%20para%20participar%20da%20a%C3%A7%C3%A3o%20no%20Impacto%20no%20Controle.%20Gostaria%20de%20falar%20com%20o%20Suporte." target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" /> Falar com o Suporte
          </a>
          <button className="text-sm font-black text-[var(--brand-dark)] underline" type="button" onClick={closeAndRemember}>Não mostrar novamente neste navegador</button>
        </div>
      </div>
    </div>
  );
}
