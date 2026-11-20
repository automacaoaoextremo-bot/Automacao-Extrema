export const RMC_CATEGORIES = [
  'Elétrica', 'Hidráulica', 'Vazamentos', 'Portas e janelas', 'Telhado',
  'Limpeza de caixa d’água', 'Jardinagem', 'Pintura',
  'Instalação de móveis', 'Instalação de eletrodomésticos',
  'Quadros, suportes e prateleiras', 'Outros serviços',
] as const;
export const PILOTO_CATEGORIES = [
  'Baterias', 'Autoelétrica', 'Motor de partida', 'Alternador', 'Socorro', 'Outros serviços',
] as const;
export const REQUEST_STAGES = {
  pending: 'Solicitado',
  need_info: 'Aguardando informações',
  in_review: 'Em orçamento',
  quoted: 'Aguardando cliente',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  in_progress: 'Em execução',
  awaiting_payment: 'Finalizado, aguardando pagamento',
  completed: 'Finalizado',
  declined: 'Recusado',
  cancelled: 'Cancelado',
  contacted: 'Cliente contatado (legado)',
  closed: 'Encerrado (legado)',
} as const;
export type RequestStage = keyof typeof REQUEST_STAGES;
export const BUCKET = 'ae-ai-request-media';
export const MEDIA_TYPES: Record<string, { suffix: string; maxBytes: number }> = {
  'image/jpeg': { suffix: '.jpg', maxBytes: 5 * 1024 * 1024 },
  'image/png': { suffix: '.png', maxBytes: 5 * 1024 * 1024 },
  'image/webp': { suffix: '.webp', maxBytes: 5 * 1024 * 1024 },
  'video/mp4': { suffix: '.mp4', maxBytes: 15 * 1024 * 1024 },
  'video/webm': { suffix: '.webm', maxBytes: 15 * 1024 * 1024 },
};
export const MAX_IMAGES = 3;
export const MAX_VIDEOS = 1;

export function normalizeBRPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  const raw = digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2) : digits;
  // DDD + numero de 8 ou 9 digitos; nao aceitar formato internacional incorreto.
  if (!/^\d{10,11}$/.test(raw) || raw.startsWith('00')) return null;
  return `55${raw}`;
}
export function stringField(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
