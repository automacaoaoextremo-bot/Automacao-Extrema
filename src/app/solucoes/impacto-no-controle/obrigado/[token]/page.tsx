/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle } from "@/components/impacto-no-controle/icons";
import { PublicHeader } from "@/components/impacto-no-controle/PublicHeader";
import { createSupabaseAdminClient } from "@/lib/impacto-no-controle/supabase/admin";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";
import { impactoSiteUrl } from "@/lib/impacto-no-controle/config";

type PageProps = { params: Promise<{ token: string }> };

type SelectedQuota = { quota_id: string; qty: number };

type TrackingData = {
  acompanhamento_token: string;
  campaign_id: string;
  status: string;
  amount_cents: number;
  selected_numbers: number[] | null;
  selected_quotas: SelectedQuota[] | null;
  created_at: string;
  participant_name: string;
  participant_phone?: string | null;
  participant_email?: string | null;
  campaign_title: string;
  campaign_slug: string;
  client_name: string;
  client_logo_url?: string | null;
  client_primary_color?: string | null;
  client_secondary_color?: string | null;
};

export const revalidate = 0;

function whatsappPhoneLink(phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildTrackingWhatsAppUrl(input: {
  phone?: string | null;
  name: string;
  campaignTitle: string;
  thankYouUrl: string;
  trackUrl: string;
  selectedNumbers: number[];
  amountCents: number;
}) {
  const phone = whatsappPhoneLink(input.phone);
  if (!phone) return "";

  const numbers = input.selectedNumbers.length
    ? input.selectedNumbers
        .map((n) => String(n).padStart(2, "0"))
        .join(", ")
    : "sem números";

  const message = `Olá, ${input.name}! Sua participação na ação ${input.campaignTitle} foi registrada.

Números: ${numbers}
Valor: ${formatMoneyFromCents(input.amountCents)}

Página de obrigado:
${input.thankYouUrl}

Acompanhe a aprovação por este link:
${input.trackUrl}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function normalizeColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default async function ThankYouPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: rawData, error } = await supabase
    .from("inc_contribution_tracking")
    .select("*")
    .eq("acompanhamento_token", token)
    .maybeSingle();

  const data = rawData as TrackingData | null;
  if (error || !data) notFound();

  const selectedQuotas = Array.isArray(data.selected_quotas)
    ? data.selected_quotas
    : [];
  const quotaIds = selectedQuotas.map((item) => item.quota_id).filter(Boolean);
  const { data: quotaRows } = quotaIds.length
    ? await supabase
        .from("inc_campaign_quotas")
        .select("id,title,amount_cents")
        .in("id", quotaIds)
    : { data: [] as any[] };

  const quotaMap = new Map((quotaRows || []).map((q: any) => [q.id, q]));
  const quotasText = selectedQuotas
    .map((item) => {
      const quota = quotaMap.get(item.quota_id);
      if (!quota) return null;
      return `${item.qty}x ${quota.title}`;
    })
    .filter(Boolean);

  const primaryColor = normalizeColor(
    data.client_primary_color,
    "#2F7D46",
  );
  const secondaryColor = normalizeColor(
    data.client_secondary_color,
    "#8BB73E",
  );
  const softBg = hexToRgba(secondaryColor, 0.11);
  const cardBg = hexToRgba(primaryColor, 0.07);
  const borderColor = hexToRgba(primaryColor, 0.18);

  const selectedNumbers = Array.isArray(data.selected_numbers)
    ? data.selected_numbers
    : [];
  const appUrl = impactoSiteUrl();
  const thankYouUrl = `${appUrl}/solucoes/impacto-no-controle/obrigado/${token}`;
  const trackUrl = `${appUrl}/solucoes/impacto-no-controle/acompanhar/${token}`;
  const campaignHref = `/solucoes/impacto-no-controle/acao/${data.campaign_slug}`;
  const campaignStartHref = campaignHref;
  const supportHref = `https://wa.me/5519989848246?text=${encodeURIComponent(
    `Olá, Suporte! Preciso de ajuda com minha participação na campanha ${data.campaign_title}.`,
  )}`;

  const whatsappTrackUrl = buildTrackingWhatsAppUrl({
    phone: data.participant_phone,
    name: data.participant_name,
    campaignTitle: data.campaign_title,
    thankYouUrl,
    trackUrl,
    selectedNumbers,
    amountCents: data.amount_cents,
  });

  const statusLabel: Record<string, string> = {
    awaiting_payment: "Aguardando pagamento/comprovante",
    pending_approval: "Aguardando conferência",
    approved: "Pagamento aprovado",
    rejected: "Pagamento não aprovado",
    canceled: "Cancelado",
  };

  return (
    <>
      <PublicHeader
        showAccessLinks={false}
        brandName={data.client_name}
        brandLogoUrl={data.client_logo_url}
        brandHref={campaignHref}
        helpHref={supportHref}
        homeHref={campaignStartHref}
        tutorialHref="/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.mp4"
      />

      <main
        className="container-page py-3 md:py-5"
        style={
          {
            "--campaign-primary": primaryColor,
            "--campaign-secondary": secondaryColor,
            "--campaign-soft": softBg,
            "--campaign-card": cardBg,
            "--campaign-border": borderColor,
            "--brand": primaryColor,
            "--brand-dark": primaryColor,
            "--accent": secondaryColor,
          } as CSSProperties
        }
      >
        <div className="mx-auto max-w-2xl">
          <section
            className="card impacto-compact-page-card"
            style={{
              borderColor,
              background:
                "linear-gradient(180deg, #fffdf7 0%, var(--campaign-soft) 100%)",
            }}
          >
            <div className="impacto-compact-primary text-center">
              <div
                className="mx-auto grid h-12 w-12 place-items-center rounded-full border-4 bg-white"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div>
                <span
                  className="inline-flex rounded-full px-3 py-1 text-xs font-black"
                  style={{ background: softBg, color: primaryColor }}
                >
                  Obrigado pela participação
                </span>
                <h1
                  className="mt-2 text-2xl font-black leading-tight md:text-3xl"
                  style={{ color: primaryColor }}
                >
                  Sua participação foi registrada.
                </h1>
                <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                  A organização irá conferir o pagamento/comprovante. Guarde o
                  acompanhamento para consultar a confirmação.
                </p>
              </div>
            </div>

            <div className="impacto-compact-metrics mt-3">
              <div>
                <p className="text-xs font-bold text-[var(--muted)]">Status</p>
                <p
                  className="mt-1 text-sm font-extrabold"
                  style={{ color: primaryColor }}
                >
                  {statusLabel[data.status] || data.status}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted)]">Valor</p>
                <p
                  className="mt-1 text-sm font-extrabold"
                  style={{ color: primaryColor }}
                >
                  {formatMoneyFromCents(data.amount_cents)}
                </p>
              </div>
            </div>

            <div className="mt-2 rounded-2xl border bg-white px-3 py-2" style={{ borderColor }}>
              <p className="text-xs font-bold" style={{ color: primaryColor }}>
                Números escolhidos
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {selectedNumbers.length
                  ? selectedNumbers
                      .map((n: number) => String(n).padStart(2, "0"))
                      .join(", ")
                  : "Nenhum número escolhido."}
              </p>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link
                className="btn-primary"
                href={`/solucoes/impacto-no-controle/acompanhar/${token}`}
                style={{ background: primaryColor }}
              >
                Acompanhar participação
              </Link>

              {whatsappTrackUrl ? (
                <a
                  className="btn-secondary"
                  href={whatsappTrackUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Enviar para WhatsApp
                </a>
              ) : null}
            </div>

            <details className="impacto-compact-details">
              <summary>Ver resumo completo</summary>
              <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                <p>
                  <strong>Campanha:</strong> {data.campaign_title}
                </p>
                <p>
                  <strong>Participante:</strong> {data.participant_name}
                </p>
                {quotasText.length ? (
                  <p>
                    <strong>Cotas:</strong> {quotasText.join("; ")}
                  </p>
                ) : null}
              </div>
            </details>

            <details className="impacto-compact-details">
              <summary>Como acompanhar depois</summary>
              <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
                Salve a página de acompanhamento nos favoritos ou envie o link
                para seu WhatsApp. Ela mostra se o pagamento está em conferência,
                aprovado ou se a organização precisa de algum ajuste.
              </p>
            </details>

            <Link
              className="btn-secondary mt-3"
              href={campaignHref}
            >
              Voltar para a campanha
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
