export type FollowupKind =
  | "email_immediate"
  | "whatsapp_5_15"
  | "followup_24h"
  | "followup_3d"
  | "followup_7d";

export const FOLLOWUP_LABELS: Record<FollowupKind, string> = {
  email_immediate: "E-mail imediato",
  whatsapp_5_15: "WhatsApp 5 a 15 minutos",
  followup_24h: "Follow-up 24 horas",
  followup_3d: "Follow-up 3 dias",
  followup_7d: "Último follow-up 7 dias",
};

export function buildFollowupMessage(kind: FollowupKind, leadName: string | null, solutionName: string | null) {
  const name = leadName?.trim() || "tudo bem";
  const solution = solutionName || "uma solução sugerida pela Automação Extrema";

  if (kind === "whatsapp_5_15") {
    return `Oi, ${name}. Obrigado por responder o Diagnóstico AE. Pelas suas respostas, parece que ${solution} pode ser um bom caminho inicial para o seu caso. Posso te mandar uma sugestão prática de próximo passo?`;
  }

  if (kind === "followup_24h") {
    return `Oi, ${name}. Passando para não deixar seu diagnóstico parado. Quer que eu te envie um resumo simples do que poderia ser melhorado primeiro, sem compromisso?`;
  }

  if (kind === "followup_3d") {
    return `Oi, ${name}. Revendo seu diagnóstico, acredito que ${solution} pode ajudar a reduzir retrabalho e trazer mais clareza. Faz sentido conversarmos por 10 minutos?`;
  }

  if (kind === "followup_7d") {
    return `Oi, ${name}. Último contato sobre o Diagnóstico AE. Caso ainda faça sentido, posso te devolver uma sugestão prática para transformar essa dor em melhoria simples de processo ou automação.`;
  }

  return `Diagnóstico recebido. Solução sugerida: ${solution}.`;
}
