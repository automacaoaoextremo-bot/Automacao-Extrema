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

export type CorrenteEmDiaFunilCopyKey =
  | "primeiro_contato"
  | "lead_morno"
  | "lead_esfriando"
  | "cliente_fundador_curto";

export const CORRENTE_EM_DIA_FUNIL_COPIES: Record<CorrenteEmDiaFunilCopyKey, string> = {
  primeiro_contato:
    "Olá, [nome]. Recebemos o interesse da [nome_organizacao] no Corrente em Dia como Cliente Fundador. O próximo passo é acessar o painel inicial e começar a configuração da organização. A ideia é começar simples: contribuições mais claras, comprovantes organizados e menos retrabalho para quem cuida da casa.",
  lead_morno:
    "Oi, [nome]. Passando para confirmar se você conseguiu acessar o painel do Corrente em Dia. A primeira configuração é rápida e já ajuda a visualizar como a [nome_organizacao] pode organizar contribuições, comprovantes e pendências com mais clareza, sem depender só de grupo de WhatsApp ou memória. Quer que eu te acompanhe nesse primeiro acesso?",
  lead_esfriando:
    "Oi, [nome]. Sei que a rotina da casa é corrida, por isso deixo um lembrete respeitoso: a fase de Cliente Fundador é para poucas organizações que queiram validar o Corrente em Dia com acompanhamento mais próximo. O objetivo não é colocar mais uma tarefa na rotina, e sim reduzir conferência manual, dúvida sobre comprovantes e insegurança no fechamento das contribuições. Quer que eu mantenha a [nome_organizacao] nessa fase ou prefere que eu retome em outro momento?",
  cliente_fundador_curto:
    "Entre como Cliente Fundador e participe da fase inicial com condições especiais, prioridade nas melhorias e acompanhamento mais próximo.",
};

function isCorrenteEmDiaSolution(solutionName: string | null) {
  const normalized = (solutionName ?? "").toLowerCase();
  return normalized.includes("corrente em dia") || normalized.includes("arrecada") || normalized.includes("contribui");
}

function personalize(message: string, leadName: string | null) {
  const name = leadName?.trim() || "tudo bem";
  return message.replaceAll("[nome]", name);
}

function buildCorrenteEmDiaFollowupMessage(kind: FollowupKind, leadName: string | null) {
  if (kind === "whatsapp_5_15") {
    return personalize(CORRENTE_EM_DIA_FUNIL_COPIES.primeiro_contato, leadName);
  }

  if (kind === "followup_24h") {
    return personalize(
      "Oi, [nome]. Passando para reforçar: o Corrente em Dia foi pensado para organizar contribuições, Pix e comprovantes com respeito, clareza e proteção de dados. Quer que eu te envie uma visão simples de como funcionaria para a sua organização?",
      leadName,
    );
  }

  if (kind === "followup_3d") {
    return personalize(CORRENTE_EM_DIA_FUNIL_COPIES.lead_morno, leadName);
  }

  if (kind === "followup_7d") {
    return personalize(CORRENTE_EM_DIA_FUNIL_COPIES.lead_esfriando, leadName);
  }

  return personalize(
    "Diagnóstico recebido. O Corrente em Dia pode ser um caminho simples para organizar contribuições, Pix, comprovantes e pendências com mais clareza e cuidado.",
    leadName,
  );
}

export function buildFollowupMessage(kind: FollowupKind, leadName: string | null, solutionName: string | null) {
  if (isCorrenteEmDiaSolution(solutionName)) {
    return buildCorrenteEmDiaFollowupMessage(kind, leadName);
  }

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
