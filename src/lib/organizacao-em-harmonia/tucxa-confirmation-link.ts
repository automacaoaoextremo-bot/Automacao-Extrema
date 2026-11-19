/** Link público curto de confirmação. Mantém o token original de alta entropia. */
export function buildTucxaConfirmationUrl(token: string): string {
  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  const base = process.env.VERCEL_ENV === "preview" && vercelUrl
    ? `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
    : (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
  return `${base}/tc/${encodeURIComponent(token)}`;
}
