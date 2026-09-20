/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Home, MessageCircle, Star } from "@/components/impacto-no-controle/icons";
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
  const numbers = input.selectedNumbers.length ? input.selectedNumbers.map((n) => String(n).padStart(2, "0")).join(", ") : "sem números";
  const message = `Olá, ${input.name}! Sua participação na ação ${input.campaignTitle} foi registrada.\n\nNúmeros: ${numbers}\nValor: ${formatMoneyFromCents(input.amountCents)}\n\nPágina de obrigado:\n${input.thankYouUrl}\n\nAcompanhe a aprovação por este link:\n${input.trackUrl}`;
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

  const selectedQuotas = Array.isArray(data.selected_quotas) ? data.selected_quotas : [];
  const quotaIds = selectedQuotas.map((item) => item.quota_id).filter(Boolean);
  const { data: quotaRows } = quotaIds.length
    ? await supabase.from("inc_campaign_quotas").select("id,title,amount_cents").in("id", quotaIds)
    : { data: [] as any[] };

  const quotaMap = new Map((quotaRows || []).map((q: any) => [q.id, q]));
  const quotasText = selectedQuotas
    .map((item) => {
      const quota = quotaMap.get(item.quota_id);
      if (!quota) return null;
      return `${item.qty}x ${quota.title}`;
    })
    .filter(Boolean);

  const primaryColor = normalizeColor(data.client_primary_color, "#2F7D46");
  const secondaryColor = normalizeColor(data.client_secondary_color, "#8BB73E");
  const softBg = hexToRgba(secondaryColor, 0.11);
  const cardBg = hexToRgba(primaryColor, 0.07);
  const borderColor = hexToRgba(primaryColor, 0.18);
  const logoUrl = data.client_logo_url || null;

  const selectedNumbers = Array.isArray(data.selected_numbers) ? data.selected_numbers : [];
  const appUrl = impactoSiteUrl();
  const thankYouUrl = `${appUrl}/solucoes/impacto-no-controle/obrigado/${token}`;
  const trackUrl = `${appUrl}/solucoes/impacto-no-controle/acompanhar/${token}`;
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
    awaiting_payment: "Aguardando pagamento e envio do comprovante",
    pending_approval: "Aguardando conferência do pagamento",
    approved: "Pagamento aprovado",
    rejected: "Pagamento não aprovado",
    canceled: "Cancelado",
  };

  return (
    <>
      <PublicHeader showAccessLinks={false} />
      <main
        className="container-page py-4 md:py-6"
        style={{
          "--campaign-primary": primaryColor,
          "--campaign-secondary": secondaryColor,
          "--campaign-soft": softBg,
          "--campaign-card": cardBg,
          "--campaign-border": borderColor,
        } as CSSProperties}
      >
        <div className="mx-auto max-w-3xl">
          <div
            className="card overflow-hidden p-6 text-center md:p-8"
            style={{ borderColor: "var(--campaign-border)", background: "linear-gradient(180deg, #fffdf7 0%, var(--campaign-soft) 100%)" }}
          >
            <div className="mx-auto flex w-fit items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm" style={{ border: "1px solid var(--campaign-border)" }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do logo do cliente; não deve passar pelo otimizador do Next.
                <img src={logoUrl} alt={data.client_name} className="h-10 w-10 rounded-2xl object-cover" />
              ) : null}
              <span className="text-sm font-black" style={{ color: primaryColor }}>{data.client_name}</span>
            </div>

            <div
              className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full border-4 bg-white"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <span className="mt-4 inline-flex rounded-full px-4 py-2 text-sm font-black" style={{ background: softBg, color: primaryColor }}>
              Obrigado pela participação
            </span>

            <h1 className="mt-4 text-3xl font-black md:text-4xl" style={{ color: primaryColor }}>
              Sua participação foi registrada.
            </h1>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-[var(--muted)]">
              A organização da {data.client_name} irá conferir o pagamento/comprovante e confirmar a participação. Salve esta página para acompanhar tudo com facilidade.
            </p>
          </div>

          <div className="card mt-5 p-6" style={{ borderColor: "var(--campaign-border)" }}>
            <h2 className="text-2xl font-black" style={{ color: primaryColor }}>Resumo da aquisição</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl p-4" style={{ background: cardBg }}>
                <p className="text-sm font-bold text-[var(--muted)]">Campanha</p>
                <p className="mt-1 font-extrabold" style={{ color: primaryColor }}>{data.campaign_title}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: cardBg }}>
                <p className="text-sm font-bold text-[var(--muted)]">Participante</p>
                <p className="mt-1 font-extrabold" style={{ color: primaryColor }}>{data.participant_name}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: cardBg }}>
                <p className="text-sm font-bold text-[var(--muted)]">Valor</p>
                <p className="mt-1 font-extrabold" style={{ color: primaryColor }}>{formatMoneyFromCents(data.amount_cents)}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: cardBg }}>
                <p className="text-sm font-bold text-[var(--muted)]">Status</p>
                <p className="mt-1 font-extrabold" style={{ color: primaryColor }}>{statusLabel[data.status] || data.status}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border bg-white p-4" style={{ borderColor: borderColor }}>
              <p className="font-bold" style={{ color: primaryColor }}>Números escolhidos</p>
              <p className="mt-2 text-[var(--muted)]">
                {selectedNumbers.length ? selectedNumbers.map((n: number) => String(n).padStart(2, "0")).join(", ") : "Nenhum número escolhido."}
              </p>
            </div>

            {quotasText.length ? (
              <div className="mt-4 rounded-2xl border bg-white p-4" style={{ borderColor: borderColor }}>
                <p className="font-bold" style={{ color: primaryColor }}>Cotas escolhidas</p>
                <p className="mt-2 text-[var(--muted)]">{quotasText.join("; ")}</p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                className="btn-primary"
                href={`/solucoes/impacto-no-controle/acompanhar/${token}`}
                style={{ background: primaryColor }}
              >
                Acompanhar participação
              </Link>
              {whatsappTrackUrl ? (
                <a className="btn-primary" href={whatsappTrackUrl} target="_blank" rel="noreferrer" style={{ background: primaryColor }}>
                  <MessageCircle className="h-4 w-4" /> Enviar acompanhamento para meu WhatsApp
                </a>
              ) : null}
              <Link className="btn-secondary" href={`/solucoes/impacto-no-controle/acao/${data.campaign_slug}`}>Voltar para a campanha</Link>
            </div>
          </div>

          <div className="card mt-5 p-6" style={{ borderColor: "var(--campaign-border)" }}>
            <div className="flex gap-3">
              <Star className="mt-1 h-6 w-6 shrink-0" style={{ color: secondaryColor }} />
              <div>
                <h2 className="text-xl font-black" style={{ color: primaryColor }}>Salve esta página</h2>
                <p className="mt-2 leading-7 text-[var(--muted)]">
                  Para não perder o acompanhamento, salve esta página nos favoritos do navegador. No celular, você também pode tocar no menu do navegador e escolher “Adicionar à tela inicial” ou “Adicionar aos favoritos”.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-3 rounded-2xl p-4 text-sm leading-6" style={{ background: softBg, color: primaryColor }}>
              <Home className="mt-1 h-5 w-5 shrink-0" />
              <p>
                O link de acompanhamento mostra se o pagamento ainda está em conferência, aprovado ou se a organização precisa de algum ajuste no comprovante.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
