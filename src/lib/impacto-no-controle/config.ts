export const IMPACTO_BASE_PATH = "/solucoes/impacto-no-controle";
export const IMPACTO_API_PATH = "/api/impacto-no-controle";
export const IMPACTO_SEMENTINHA_CAMPAIGN_SLUG = "rifa-bike-seminova-sementinha";

export function impactoSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

export function impactoBaseUrl() {
  return `${impactoSiteUrl()}${IMPACTO_BASE_PATH}`;
}

export function impactoPixDefaults() {
  return {
    key: (process.env.PIX_KEY || "").trim(),
    receiverName: (process.env.PIX_RECEIVER_NAME || "").trim(),
    city: (process.env.PIX_CITY || "Campinas").trim() || "Campinas",
  };
}
