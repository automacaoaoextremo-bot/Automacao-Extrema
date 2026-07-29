import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { defaultTucxaPublicContent, TucxaPublicContent } from "./tucxa-public-content-defaults";

const CONTENT_TYPE = "tucxa-publico-regulamento";

function mergeCards(defaultCards: TucxaPublicContent["consulenteGuidelines"], value: unknown) {
  if (!Array.isArray(value)) return defaultCards;
  const cards = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const description = typeof record.description === "string" ? record.description.trim() : "";
      return title && description ? { title, description } : null;
    })
    .filter((item): item is { title: string; description: string } => Boolean(item));
  return cards.length ? cards : defaultCards;
}

function mergeModule(defaultModule: TucxaPublicContent["atendimentoEmHarmonia"], value: unknown) {
  if (!value || typeof value !== "object") return defaultModule;
  const record = value as Record<string, unknown>;
  return {
    title: typeof record.title === "string" && record.title.trim() ? record.title.trim() : defaultModule.title,
    shortLabel: typeof record.shortLabel === "string" && record.shortLabel.trim() ? record.shortLabel.trim() : defaultModule.shortLabel,
    description: typeof record.description === "string" && record.description.trim() ? record.description.trim() : defaultModule.description,
    callToAction: typeof record.callToAction === "string" && record.callToAction.trim() ? record.callToAction.trim() : defaultModule.callToAction,
  };
}

export function normalizeTucxaPublicContent(value: unknown): TucxaPublicContent {
  if (!value || typeof value !== "object") return defaultTucxaPublicContent;
  const record = value as Record<string, unknown>;
  return {
    newHereIntro:
      typeof record.newHereIntro === "string" && record.newHereIntro.trim()
        ? record.newHereIntro.trim()
        : defaultTucxaPublicContent.newHereIntro,
    consulenteServices: mergeCards(defaultTucxaPublicContent.consulenteServices, record.consulenteServices),
    consulenteGuidelines: mergeCards(defaultTucxaPublicContent.consulenteGuidelines, record.consulenteGuidelines),
    atendimentoEmHarmonia: mergeModule(defaultTucxaPublicContent.atendimentoEmHarmonia, record.atendimentoEmHarmonia),
    agendaViva: mergeModule(defaultTucxaPublicContent.agendaViva, record.agendaViva),
    correnteEmDia: mergeModule(defaultTucxaPublicContent.correnteEmDia, record.correnteEmDia),
  };
}

async function findTucxaOrganizationId() {
  const { data: fromSiteSettings } = await supabaseAdmin
    .from("oh_client_site_settings")
    .select("organization_id")
    .eq("public_slug", "tucxa")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fromSiteSettings?.organization_id) return fromSiteSettings.organization_id as string;

  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return bySlug.id as string;

  const { data: byName } = await supabaseAdmin
    .from("oh_organizations")
    .select("id")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (byName?.id as string | undefined) ?? null;
}

export const getTucxaPublicContent = cache(async (): Promise<TucxaPublicContent> => {
  try {
    const organizationId = await findTucxaOrganizationId();
    if (!organizationId) return defaultTucxaPublicContent;

    const { data, error } = await supabaseAdmin
      .from("oh_client_public_content")
      .select("content")
      .eq("organization_id", organizationId)
      .eq("content_type", CONTENT_TYPE)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.content) return defaultTucxaPublicContent;
    return normalizeTucxaPublicContent(data.content);
  } catch {
    return defaultTucxaPublicContent;
  }
});

export { CONTENT_TYPE };
