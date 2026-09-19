export const ACERVO_VIVO_SUPPORT_NAME = "Mariana Mattano Silva";
export const ACERVO_VIVO_SUPPORT_WHATSAPP = "5519993213935";

const DEFAULT_SUPPORT_MESSAGE = [
  "Olá, Mariana!",
  "Estou usando o Acervo Vivo - Biblioteca do Tucxa e gostaria de uma orientação.",
  "Se for mais fácil, posso enviar um áudio explicando minha dúvida.",
].join("\n");

function whatsappUrl(message: string) {
  return `https://wa.me/${ACERVO_VIVO_SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export function acervoVivoSupportWhatsappUrl(message = DEFAULT_SUPPORT_MESSAGE) {
  return whatsappUrl(message);
}
