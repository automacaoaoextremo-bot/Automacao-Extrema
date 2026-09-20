/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/impacto-no-controle/PublicHeader";
import { ReservationPayment } from "@/components/impacto-no-controle/ReservationPayment";
import { createSupabaseAdminClient } from "@/lib/impacto-no-controle/supabase/admin";
import { impactoPixDefaults } from "@/lib/impacto-no-controle/config";

export const revalidate = 0;

type PageProps = { params: Promise<{ token: string }> };

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

export default async function ReservationPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("inc_contributions")
    .select(`
      id,
      acompanhamento_token,
      status,
      amount_cents,
      selected_numbers,
      selected_quotas,
      reservation_expires_at,
      campaigns:inc_campaigns(
        id,
        title,
        slug,
        pix_key,
        pix_receiver_name,
        pix_city,
        clients:inc_clients(name, logo_url, primary_color, secondary_color, pix_key, pix_receiver_name, pix_city)
      ),
      participants:inc_participants(name, phone, email)
    `)
    .eq("acompanhamento_token", token)
    .maybeSingle();

  if (error || !data) notFound();

  const campaign = Array.isArray((data as any).campaigns) ? (data as any).campaigns[0] : (data as any).campaigns;
  const client = Array.isArray(campaign?.clients) ? campaign.clients[0] : campaign?.clients;
  const participant = Array.isArray((data as any).participants) ? (data as any).participants[0] : (data as any).participants;
  if (!campaign || !client) notFound();

  const primaryColor = normalizeColor(client.primary_color, "#A91583");
  const secondaryColor = normalizeColor(client.secondary_color, "#F45AC0");
  const softBg = hexToRgba(secondaryColor, 0.11);
  const cardBg = hexToRgba(primaryColor, 0.07);
  const borderColor = hexToRgba(primaryColor, 0.18);

  const theme = {
    "--campaign-primary": primaryColor,
    "--campaign-secondary": secondaryColor,
    "--campaign-soft": softBg,
    "--campaign-card": cardBg,
    "--campaign-border": borderColor,
    "--brand": primaryColor,
    "--brand-dark": primaryColor,
    "--accent": secondaryColor,
  } as CSSProperties;

  const selectedNumbers = Array.isArray(data.selected_numbers) ? data.selected_numbers : [];
  const pixDefaults = impactoPixDefaults();
  const campaignHref = `/solucoes/impacto-no-controle/acao/${campaign.slug}`;
  const campaignStartHref = campaignHref;
  const supportMessage = encodeURIComponent(
    `Olá, Suporte! Preciso de ajuda com a reserva da campanha ${campaign.title}.`,
  );
  const supportHref = `https://wa.me/5519989848246?text=${supportMessage}`;

  if (data.status === "pending_approval" || data.status === "approved") {
    return (
      <>
        <PublicHeader
          showAccessLinks={false}
          brandName={client.name}
          brandLogoUrl={client.logo_url}
          brandHref={campaignHref}
          helpHref={supportHref}
          homeHref={campaignStartHref}
          tutorialHref="/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.mp4"
        />
        <main className="container-page py-4 md:py-6" style={theme}>
          <div className="card mx-auto max-w-2xl p-6 text-center" style={{ borderColor }}>
            <h1 className="text-3xl font-black" style={{ color: primaryColor }}>Comprovante já enviado</h1>
            <p className="mt-3 leading-7 text-[var(--muted)]">Sua participação já foi registrada. Acompanhe o status pelo link abaixo.</p>
            <Link className="btn-primary mt-5" style={{ background: primaryColor }} href={`/solucoes/impacto-no-controle/acompanhar/${token}`}>Acompanhar participação</Link>
          </div>
        </main>
      </>
    );
  }

  if (data.status !== "awaiting_payment") {
    return (
      <>
        <PublicHeader
          showAccessLinks={false}
          brandName={client.name}
          brandLogoUrl={client.logo_url}
          brandHref={campaignHref}
          helpHref={supportHref}
          homeHref={campaignStartHref}
          tutorialHref="/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.mp4"
        />
        <main className="container-page py-4 md:py-6" style={theme}>
          <div className="card mx-auto max-w-2xl p-6 text-center" style={{ borderColor }}>
            <h1 className="text-3xl font-black" style={{ color: primaryColor }}>Reserva expirada ou indisponível</h1>
            <p className="mt-3 leading-7 text-[var(--muted)]">Essa reserva não está mais disponível para pagamento. Volte para a campanha e escolha seus números novamente.</p>
            <Link className="btn-primary mt-5" style={{ background: primaryColor }} href={`/solucoes/impacto-no-controle/acao/${campaign.slug}`}>Voltar para a campanha</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PublicHeader
        showAccessLinks={false}
        brandName={client.name}
        brandLogoUrl={client.logo_url}
        brandHref={campaignHref}
        helpHref={supportHref}
        homeHref={campaignStartHref}
        tutorialHref="/impacto-no-controle/sementinha/tutorial/passo-a-passo-participar-sementinha.mp4"
      />
      <main className="container-page py-4 md:py-6" style={theme}>
        <ReservationPayment
          reservation={{
            token,
            campaignTitle: campaign.title,
            campaignSlug: campaign.slug,
            clientName: client.name,
            clientLogoUrl: client.logo_url,
            primaryColor,
            secondaryColor,
            amountCents: data.amount_cents,
            selectedNumbers,
            pixKey: campaign.pix_key || client.pix_key || pixDefaults.key,
            pixReceiverName: campaign.pix_receiver_name || client.pix_receiver_name || pixDefaults.receiverName || client.name,
            pixCity: campaign.pix_city || client.pix_city || pixDefaults.city,
            reservationExpiresAt: data.reservation_expires_at,
            status: data.status,
            participantName: participant?.name || null,
            participantPhone: participant?.phone || null,
          }}
        />
      </main>
    </>
  );
}
