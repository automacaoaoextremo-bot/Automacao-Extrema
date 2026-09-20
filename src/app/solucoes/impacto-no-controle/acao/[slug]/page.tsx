import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { MessageCircle } from "@/components/impacto-no-controle/icons";
import { PublicHeader } from "@/components/impacto-no-controle/PublicHeader";
import { createSupabasePublicClient } from "@/lib/impacto-no-controle/supabase/public";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";
import { CampaignParticipation } from "@/components/impacto-no-controle/CampaignParticipation";
import { CampaignIntroModal } from "@/components/impacto-no-controle/CampaignIntroModal";
import { CampaignGallery } from "@/components/impacto-no-controle/CampaignGallery";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 0;

type CampaignPublicData = {
  number_count?: number | null;
  number_price_cents?: number | null;
  regulation_text?: string | null;
};

function publicRegulationText(campaign: CampaignPublicData) {
  const numberCount = Number(campaign.number_count || 0);
  const numberPrice = Number(campaign.number_price_cents || 0);
  const dynamicRule = numberCount > 0 && numberPrice > 0
    ? `Ação solidária com ${numberCount} números a ${formatMoneyFromCents(numberPrice)} cada. A participação só será confirmada após conferência do pagamento/comprovante pela organização. O pagamento pode ser feito por Pix ou por outra forma combinada com o Suporte. Caso algum número não seja aprovado, ele poderá voltar a ficar disponível.`
    : "A participação só será confirmada após conferência do pagamento/comprovante pela organização. O pagamento pode ser feito por Pix ou por outra forma combinada com o Suporte.";

  const extra = String(campaign.regulation_text || "")
    .replace(/Ação solidária com\s+\d+\s+números\s+a\s+R\$\s*[\d.,]+\s+cada\.\s*A participação só será confirmada após conferência (?:do Pix|do pagamento\/comprovante) pela organização\.(?:\s*O pagamento pode ser feito por Pix ou por outra forma combinada com o Suporte\.)?\s*Caso algum número não seja aprovado, ele poderá voltar a ficar disponível\.?/gi, "")
    .replace(/A campanha encerra-se em\s*\d{2}\/\d{2}\/\d{4}\.\s*O sorteio será feito em\s*\d{2}\/\d{2}\/\d{4}[^\n.]*(?:\.|$)/gi, "")
    .replace(/\s*Para ações públicas ou de maior alcance, recomenda-se validar as regras aplicáveis a sorteios, promoções e arrecadações\.?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return extra ? `${dynamicRule}\n\n${extra}` : dynamicRule;
}

function normalizeCampaignStatus(status: string) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["pausada", "pausado"].includes(normalized)) return "paused";
  if (["ativa", "ativo"].includes(normalized)) return "active";
  if (["encerrada", "encerrado"].includes(normalized)) return "closed";
  if (["prestacao_publicada", "prestação publicada"].includes(normalized)) return "accountability_published";
  if (["rascunho"].includes(normalized)) return "draft";
  return normalized;
}

function campaignStatusNotice(status: string) {
  const normalizedStatus = normalizeCampaignStatus(status);
  if (normalizedStatus === "paused") {
    return {
      title: "Campanha pausada no momento",
      text: "As novas participações estão temporariamente suspensas. Para saber quando a ação será retomada ou tirar dúvidas, fale com o Suporte pelo WhatsApp.",
    };
  }

  if (normalizedStatus === "closed") {
    return {
      title: "Campanha encerrada",
      text: "Esta ação já foi encerrada e não está recebendo novas participações. Acompanhe a prestação de contas ou fale com a organização para mais informações.",
    };
  }

  if (normalizedStatus === "accountability_published") {
    return {
      title: "Prestação de contas publicada",
      text: "Esta campanha foi encerrada e a prestação de contas já pode ser acompanhada pela organização. Obrigado a todos que ajudaram a transformar solidariedade em resultado real.",
    };
  }

  return null;
}

export default async function CampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createSupabasePublicClient();

  const { data: campaign, error } = await supabase
    .from("inc_campaigns_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const normalizedStatus = normalizeCampaignStatus(campaign?.status || "");

  if (error || !campaign || normalizedStatus === "draft") notFound();

  const [{ data: numbers }, { data: quotas }, { data: stats }] = await Promise.all([
    supabase.from("inc_campaign_numbers_public").select("number,status,buyer_display_name").eq("campaign_id", campaign.id).order("number"),
    supabase.from("inc_campaign_quotas_public").select("id,title,description,amount_cents,impact_qty,sort_order").eq("campaign_id", campaign.id).order("sort_order"),
    supabase.from("inc_campaign_stats_public").select("*").eq("campaign_id", campaign.id).maybeSingle(),
  ]);

  const raised = Number(stats?.confirmed_amount_cents || 0);
  const confirmedCount = Number(stats?.confirmed_count || 0);
  const target = Number(campaign.target_amount_cents || 0);
  const extendedTarget = Number(campaign.extended_amount_cents || 0);
  const progress = target > 0
    ? Math.min(100, Math.round((raised / target) * 100))
    : 0;
  const impactValueCents = Number(campaign.impact_value_cents || 0);
  const impactQuantity = impactValueCents > 0
    ? Math.floor((raised / impactValueCents) * 10) / 10
    : confirmedCount;
  const impactUnit = String(campaign.impact_unit || "participações");
  const galleryImages = Array.isArray(campaign.gallery_images)
    ? campaign.gallery_images.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const preferredFirstImage = campaign.slug === "rifa-bike-seminova-sementinha"
    ? "/impacto-no-controle/sementinha/bike-03.jpeg"
    : campaign.main_image_url;
  const campaignImages = Array.from(
    new Set(
      [preferredFirstImage, campaign.main_image_url, ...galleryImages]
        .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim()),
    ),
  );
  const supportMessage = encodeURIComponent(`Olá, Suporte! Tenho dúvidas sobre a campanha ${campaign.title}.`);
  const supportHref = `https://wa.me/5519989848246?text=${supportMessage}`;
  const regulation = publicRegulationText(campaign);
  const statusNotice = campaignStatusNotice(normalizedStatus);
  const canParticipate = normalizedStatus === "active";
  const campaignTheme = {
    "--brand": campaign.client_primary_color || "#A91583",
    "--brand-dark": campaign.client_primary_color || "#8A0F6B",
    "--accent": campaign.client_secondary_color || "#F45AC0",
  } as CSSProperties;

  return (
    <>
      <PublicHeader
        showAccessLinks={false}
        brandName={campaign.client_name}
        brandLogoUrl={campaign.client_logo_url}
        brandHref={`/solucoes/impacto-no-controle/acao/${campaign.slug}`}
        helpHref={supportHref}
        homeHref={`/solucoes/impacto-no-controle/acao/${campaign.slug}?inicio=1`}
      />
      <main className="container-page pb-6 pt-3 md:pb-10 md:pt-4" style={campaignTheme}>
        <CampaignIntroModal
          campaignSlug={campaign.slug}
          campaignTitle={campaign.title}
          enabled={Boolean(campaign.intro_modal_enabled)}
          title={campaign.intro_modal_title}
          body={campaign.intro_modal_body}
          numberCount={campaign.number_count}
          numberPriceCents={campaign.number_price_cents}
        />
        {statusNotice ? (
          <section className="mb-5 rounded-3xl border border-[var(--border)] bg-[#fff8e8] p-5 shadow-sm">
            <span className="badge">Atenção</span>
            <h1 className="mt-2 text-2xl font-black text-[var(--brand-dark)]">{statusNotice.title}</h1>
            <p className="mt-2 leading-7 text-[var(--muted)]">{statusNotice.text}</p>
            <a
              className="btn-primary mt-4 !w-auto"
              href={supportHref}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-4 w-4" /> Falar com o Suporte no WhatsApp
            </a>
          </section>
        ) : null}

        <section className="mx-auto grid max-w-3xl gap-4">
          <div className="card overflow-hidden">
            <div className="p-5 pb-3">
              <h1 className="text-3xl font-black leading-tight text-[var(--brand-dark)] md:text-4xl">
                {campaign.title}
              </h1>

              <div className="impacto-campaign-summary-row">
                {campaign.subtitle ? (
                  <p className="impacto-campaign-subtitle">
                    {campaign.subtitle}
                  </p>
                ) : <span />}

                <div className="impacto-campaign-meta-inline" aria-label="Informações da rifa">
                  <span className="badge">{campaign.number_count} números</span>
                  <span className="badge">
                    {formatMoneyFromCents(campaign.number_price_cents)} cada
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 pb-2 sm:px-5">
              <CampaignGallery
                images={campaignImages}
                altBase={campaign.prize_title || campaign.title}
              />
            </div>

            {canParticipate ? (
              <div className="px-4 pb-4 pt-1 sm:px-5">
                <CampaignParticipation
                  campaign={campaign}
                  numbers={numbers || []}
                  quotas={quotas || []}
                  regulation={regulation}
                  supportHref={supportHref}
                />
              </div>
            ) : null}
          </div>

          <div className="card impacto-progress-card p-5">
            <div className="impacto-progress-summary">
              <div>
                <p className="text-sm font-bold text-[var(--muted)]">
                  Andamento da arrecadação
                </p>
                <p className="mt-1 text-3xl font-black text-[var(--brand-dark)]">
                  {formatMoneyFromCents(raised)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-[var(--muted)]">
                  Impacto estimado
                </p>
                <p className="mt-1 text-2xl font-black text-[var(--brand-dark)]">
                  {impactQuantity} {impactUnit}
                </p>
              </div>
            </div>

            <div className="mt-4 progressbar" aria-label={`Progresso da meta: ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>

            <p className="mt-2 text-sm text-[var(--muted)]">
              {target > 0 ? (
                <>Meta ideal: {formatMoneyFromCents(target)}</>
              ) : (
                <>Meta ideal ainda não configurada</>
              )}
              {extendedTarget > 0 ? (
                <> • Meta estendida: {formatMoneyFromCents(extendedTarget)}</>
              ) : null}
            </p>
          </div>

          {canParticipate ? (
            <div className="card p-4 sm:p-5">
              <p className="text-center text-sm leading-6 text-[var(--muted)]">
                Precisa de ajuda com a participação, pagamento por Pix ou quer combinar outra forma de pagamento?
              </p>
              <a
                className="btn-secondary mt-3 !w-full"
                href={supportHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> Dúvidas? Fale com o Suporte
              </a>
            </div>
          ) : null}

          {!canParticipate ? (
            <div className="card p-5">
              <h2 className="text-2xl font-black text-[var(--brand-dark)]">
                Participações indisponíveis
              </h2>
              <p className="mt-2 leading-7 text-[var(--muted)]">
                No momento, esta campanha não está recebendo novas aquisições de números.
                Para mais informações, use o botão de WhatsApp e fale com o Suporte.
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
