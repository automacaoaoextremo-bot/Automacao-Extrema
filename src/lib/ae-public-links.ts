export const AE_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://automacaoextrema.com").replace(/\/+$/, "");

export const AE_INSTAGRAM_URL = "https://www.instagram.com/automacaoextrema/";

export const AE_DIAGNOSTIC_URL = `${AE_SITE_URL}/diagnostico?origem=site_principal`;

export const AE_BNI_DIAGNOSTIC_URL = `${AE_SITE_URL}/diagnostico?origem=bni_mais_20260610`;

export const AE_WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_AE_WHATSAPP_NUMBER || "").replace(/\D/g, "");

export const AE_WHATSAPP_DEFAULT_MESSAGE =
  "Olá! Vi a Automação Extrema e quero entender onde posso perder menos tempo, dinheiro ou controle com processos manuais.";

export function buildAeWhatsAppUrl(message = AE_WHATSAPP_DEFAULT_MESSAGE) {
  const text = encodeURIComponent(message);

  if (AE_WHATSAPP_NUMBER) {
    const number = AE_WHATSAPP_NUMBER.startsWith("55") ? AE_WHATSAPP_NUMBER : `55${AE_WHATSAPP_NUMBER}`;
    return `https://wa.me/${number}?text=${text}`;
  }

  return `https://api.whatsapp.com/send?text=${text}`;
}
