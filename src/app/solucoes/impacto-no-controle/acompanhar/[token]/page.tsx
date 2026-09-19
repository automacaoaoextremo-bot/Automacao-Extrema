/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeartHandshake, Home, ShieldCheck } from "@/components/impacto-no-controle/icons";
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

  const selectedNumbers = Array.isArray(data.selected_numbers) ? data.selected_numbers : [];
  const primaryColor = normalizeColor(data.client_primary_color, "#2F7D46");
  const secondaryColor = normalizeColor(data.client_secondary_color, "#8BB73E");
  const softBg = hexToRgba(secondaryColor, 0.11);
  const cardBg = hexToRgba(primaryColor, 0.07);
  const borderColor = hexToRgba(primaryColor, 0.18);
  const logoUrl = data.client_logo_url || null;

  const statusLabel: Record<string, string> = {
    awaiting_payment: "Aguardando pagamento e envio do comprovante",
    pending_approval: "Aguardando conferência do Pix",
    approved: "Pagamento aprovado",
    rejected: "Pagamento não aprovado",
    canceled: "Cancelado",
  };

  const statusDescription: Record<string, string> = {
    pending_approval: "A organização irá conferir o comprovante enviado e confirmar sua participação.",
    approved: "Seu pagamento foi conferido e sua participação está confirmada.",
    rejected: "A organização identificou uma divergência. Entre em contato para regularizar sua participação.",
    canceled: "Esta participação foi cancelada. Entre em contato se precisar de ajuda.",
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
            className="card overflow-hidden p-6 md:p-8"
            style={{ borderColor: "var(--campaign-border)", background: "linear-gradient(180deg, #fffdf7 0%, var(--campaign-soft) 100%)" }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do logo do cliente; não deve passar pelo otimizador do Next.
                  <img src={logoUrl} alt={data.client_name} className="h-14 w-14 rounded-2xl border border-white object-cover shadow-sm" />
                ) : null}
                <div>
                  <span className="inline-flex rounded-full px-4 py-2 text-sm font-black" style={{ background: softBg, color: primaryColor }}>
                    Acompanhamento
                  </span>
                  <p className="mt-2 text-sm font-black" style={{ color: primaryColor }}>{data.client_name}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold shadow-sm" style={{ border: "1px solid var(--campaign-border)", color: primaryColor }}>
                Link salvo para consulta
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-black md:text-4xl" style={{ color: primaryColor }}>
              {data.campaign_title}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
              Olá, {data.participant_name}. Aqui você acompanha sua participação, o status do Pix e os números escolhidos.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl p-4" style={{ background: cardBg }}>
                <p className="text-sm font-bold text-[var(--muted)]">Status</p>
                <p className="mt-1 font-extrabold" style={{ color: primaryColor }}>{statusLabel[data.status] || data.status}</p>
                <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{statusDescription[data.status] || "Acompanhe as atualizações da sua participação."}</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: cardBg }}>
                <p className="text-sm font-bold text-[var(--muted)]">Valor</p>
                <p className="mt-1 font-extrabold" style={{ color: primaryColor }}>{formatMoneyFromCents(data.amount_cents)}</p>
                <p className="mt-2 text-sm leading-5 text-[var(--muted)]">Valor registrado para conferência da organização.</p>
              </div>
            </div>
          </div>

          <div className="card mt-5 p-6" style={{ borderColor: "var(--campaign-border)" }}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0" style={{ color: primaryColor }} />
              <div>
                <h2 className="text-2xl font-black" style={{ color: primaryColor }}>Detalhes da participação</h2>
                <p className="mt-2 leading-7 text-[var(--muted)]">Confira abaixo os dados registrados para sua participação nesta ação.</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border bg-white p-4" style={{ borderColor }}>
              <p className="font-bold" style={{ color: primaryColor }}>Números escolhidos</p>
              <p className="mt-2 text-[var(--muted)]">
                {selectedNumbers.length ? selectedNumbers.map((n: number) => String(n).padStart(2, "0")).join(", ") : "Nenhum número escolhido."}
              </p>
            </div>

            {quotasText.length ? (
              <div className="mt-4 rounded-2xl border bg-white p-4" style={{ borderColor }}>
                <p className="font-bold" style={{ color: primaryColor }}>Cotas escolhidas</p>
                <p className="mt-2 text-[var(--muted)]">{quotasText.join("; ")}</p>
              </div>
            ) : null}

            <div className="mt-5 flex gap-3 rounded-2xl p-4 text-sm leading-6" style={{ background: softBg, color: primaryColor }}>
              <HeartHandshake className="mt-1 h-5 w-5 shrink-0" />
              <p>
                Quando o pagamento for aprovado, os números ficam confirmados para a ação. Guarde este link para consultar o status até o encerramento.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary" href={`/solucoes/impacto-no-controle/acao/${data.campaign_slug}`} style={{ background: primaryColor }}>
                Voltar para a campanha
              </Link>
              <Link className="btn-secondary" href="/solucoes/impacto-no-controle" style={{ borderColor }}>
                Página inicial
              </Link>
            </div>
          </div>

          <div className="card mt-5 p-6" style={{ borderColor: "var(--campaign-border)" }}>
            <div className="flex gap-3">
              <Home className="mt-1 h-6 w-6 shrink-0" style={{ color: secondaryColor }} />
              <div>
                <h2 className="text-xl font-black" style={{ color: primaryColor }}>Dica para acompanhar depois</h2>
                <p className="mt-2 leading-7 text-[var(--muted)]">
                  Salve esta página nos favoritos do navegador. No celular, você também pode tocar no menu do navegador e escolher “Adicionar à tela inicial” ou “Adicionar aos favoritos”.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
