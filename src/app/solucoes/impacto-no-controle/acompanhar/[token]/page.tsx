/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/impacto-no-controle/PublicHeader";
import { createSupabaseAdminClient } from "@/lib/impacto-no-controle/supabase/admin";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";

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

export default async function TrackPage({ params }: PageProps) {
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

  const selectedNumbers = Array.isArray(data.selected_numbers)
    ? data.selected_numbers
    : [];
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
  const campaignHref = `/solucoes/impacto-no-controle/acao/${data.campaign_slug}`;
  const campaignStartHref = campaignHref;
  const supportHref = `https://wa.me/5519989848246?text=${encodeURIComponent(
    `Olá, Suporte! Preciso de ajuda com o acompanhamento da campanha ${data.campaign_title}.`,
  )}`;

  const statusLabel: Record<string, string> = {
    awaiting_payment: "Aguardando pagamento/comprovante",
    pending_approval: "Aguardando conferência",
    approved: "Pagamento aprovado",
    rejected: "Pagamento não aprovado",
    canceled: "Cancelado",
  };

  const statusDescription: Record<string, string> = {
    awaiting_payment:
      "Finalize o pagamento e envie o comprovante dentro do prazo da reserva.",
    pending_approval:
      "A organização irá conferir o comprovante enviado.",
    approved:
      "Seu pagamento foi conferido e sua participação está confirmada.",
    rejected:
      "A organização identificou uma divergência. Fale com o Suporte.",
    canceled:
      "Esta participação foi cancelada. Fale com o Suporte se precisar de ajuda.",
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
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-black"
              style={{ background: softBg, color: primaryColor }}
            >
              Acompanhamento
            </span>

            <h1
              className="mt-2 text-2xl font-black leading-tight md:text-3xl"
              style={{ color: primaryColor }}
            >
              {data.campaign_title}
            </h1>

            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
              Olá, {data.participant_name}. Veja abaixo o status da sua
              participação.
            </p>

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

            <p
              className="mt-3 rounded-2xl px-3 py-2 text-sm leading-5"
              style={{ background: softBg, color: primaryColor }}
            >
              {statusDescription[data.status] ||
                "Acompanhe as atualizações da sua participação."}
            </p>

            <details className="impacto-compact-details">
              <summary>Ver detalhes da participação</summary>
              <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                <p>
                  <strong>Participante:</strong> {data.participant_name}
                </p>
                {quotasText.length ? (
                  <p>
                    <strong>Cotas:</strong> {quotasText.join("; ")}
                  </p>
                ) : null}
                <p>
                  Quando o pagamento for aprovado, os números ficam confirmados
                  para a ação.
                </p>
              </div>
            </details>

            <details className="impacto-compact-details">
              <summary>Dica para acompanhar depois</summary>
              <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
                Salve esta página nos favoritos ou adicione-a à tela inicial do
                celular para consultar o status até o encerramento da ação.
              </p>
            </details>

            <Link
              className="btn-primary mt-3"
              href={campaignHref}
              style={{ background: primaryColor }}
            >
              Voltar para a campanha
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
