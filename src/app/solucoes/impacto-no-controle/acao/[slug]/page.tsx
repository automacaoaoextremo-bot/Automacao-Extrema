import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { MessageCircle } from "@/components/impacto-no-controle/icons";
import { PublicHeader } from "@/components/impacto-no-controle/PublicHeader";
import { createSupabasePublicClient } from "@/lib/impacto-no-controle/supabase/public";
import { formatMoneyFromCents } from "@/lib/impacto-no-controle/format";
import { CampaignParticipation } from "@/components/impacto-no-controle/CampaignParticipation";
import { CampaignIntroModal } from "@/components/impacto-no-controle/CampaignIntroModal";

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
    ? `Ação solidária com ${numberCount} números a ${formatMoneyFromCents(numberPrice)} cada. A participação só será confirmada após conferência do Pix pela organização. Caso algum número não seja aprovado, ele poderá voltar a ficar disponível.`
    : "A participação só será confirmada após conferência do Pix pela organização.";

  const extra = String(campaign.regulation_text || "")
    .replace(/Ação solidária com\s+\d+\s+números\s+a\s+R\$\s*[\d.,]+\s+cada\.\s*A participação só será confirmada após conferência do Pix pela organização\.\s*Caso algum número não seja aprovado, ele poderá voltar a ficar disponível\.?/gi, "")
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

  const raised = stats?.confirmed_amount_cents || 0;
  const target = campaign.target_amount_cents || 1;
  const progress = Math.min(100, Math.round((raised / target) * 100));
  const impactValueCents = Number(campaign.impact_value_cents || 0);
  const impactQuantity = impactValueCents > 0
    ? Math.floor((raised / impactValueCents) * 10) / 10
    : null;
  const impactUnit = String(campaign.impact_unit || "participações");
  const galleryImages = Array.isArray(campaign.gallery_images)
    ? campaign.gallery_images.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
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
      <PublicHeader />
      <main className="container-page pb-6 pt-3 md:pb-10 md:pt-4" style={campaignTheme}>
        <CampaignIntroModal
          campaignSlug={campaign.slug}
          campaignTitle={campaign.title}
          clientName={campaign.client_name}
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

        <section className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div className="card overflow-hidden">
            <div className="p-5">
              <div className="campaign-client-row">
                {campaign.client_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={campaign.client_logo_url} alt={campaign.client_name} className="h-12 w-12 rounded-2xl border border-[var(--border)] bg-white object-contain p-1 md:h-14 md:w-14" />
                ) : null}
                <span className="badge">{campaign.client_name}</span>
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight text-[var(--brand-dark)] md:text-4xl">{campaign.title}</h1>
              {campaign.subtitle ? <p className="mt-2 text-base font-bold leading-7 text-[var(--muted)] md:text-lg">{campaign.subtitle}</p> : null}
              {canParticipate ? (
                <a
                  className="btn-primary mt-4 !w-auto"
                  href={supportHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Dúvidas: fale com o Suporte no WhatsApp
                </a>
              ) : null}
            </div>

            <div className="aspect-[4/3] bg-[#dfe8dd]">
              {campaign.main_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaign.main_image_url} alt={campaign.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center p-8 text-center text-[var(--brand-dark)]">
                  <div>
                    <p className="text-5xl">🎯</p>
                    <p className="mt-3 font-extrabold">Imagem da campanha</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5">
              {galleryImages.length > 1 ? (
                <section className="mb-5" aria-label="Fotos do prêmio">
                  <p className="mb-2 text-sm font-black text-[var(--brand-dark)]">Fotos do prêmio</p>
                  <div className="impacto-gallery">
                    {galleryImages.map((imageUrl: string, index: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${imageUrl}-${index}`} src={imageUrl} alt={`${campaign.prize_title || campaign.title} — foto ${index + 1}`} />
                    ))}
                  </div>
                </section>
              ) : null}
              <p className="leading-7 text-[var(--muted)]">{campaign.story}</p>
              {regulation ? (
                <details open className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4 text-sm leading-6 text-[var(--muted)]">
                  <summary className="cursor-pointer font-extrabold text-[var(--brand-dark)]">Regras e observações da ação</summary>
                  <p className="mt-2 whitespace-pre-line">{regulation}</p>
                </details>
              ) : null}
              <div className="mt-5 rounded-2xl bg-[#f7f2e4] p-4">
                <p className="text-sm font-bold text-[var(--brand-dark)]">Prêmio / reconhecimento da ação</p>
                <p className="mt-1 font-extrabold">{campaign.prize_title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{campaign.prize_description}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="card p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--muted)]">Andamento da arrecadação</p>
                  <p className="mt-1 text-3xl font-black text-[var(--brand-dark)]">{formatMoneyFromCents(raised)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--muted)]">{impactQuantity !== null ? "Impacto estimado" : "Participações confirmadas"}</p>
                  <p className="mt-1 text-2xl font-black text-[var(--brand-dark)]">
                    {impactQuantity !== null ? `${impactQuantity} ${impactUnit}` : Number(stats?.confirmed_count || 0)}
                  </p>
                </div>
              </div>
              <div className="mt-4 progressbar"><span style={{ width: `${progress}%` }} /></div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Meta ideal: {formatMoneyFromCents(campaign.target_amount_cents)} • Meta estendida: {formatMoneyFromCents(campaign.extended_amount_cents)}
              </p>
            </div>

            {canParticipate ? (
              <CampaignParticipation campaign={campaign} numbers={numbers || []} quotas={quotas || []} />
            ) : (
              <div className="card p-5">
                <h2 className="text-2xl font-black text-[var(--brand-dark)]">Participações indisponíveis</h2>
                <p className="mt-2 leading-7 text-[var(--muted)]">No momento, esta campanha não está recebendo novas aquisições de números. Para mais informações, use o botão de WhatsApp acima e fale com o Suporte.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
