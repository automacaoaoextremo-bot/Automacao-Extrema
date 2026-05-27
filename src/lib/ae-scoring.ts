export type DiagnosticPayload = {
  fullName?: string;
  whatsapp?: string;
  email?: string;
  origin?: string;
  profileType?: string;
  mainArea?: string;
  mainPain?: string;
  urgency?: string;
  hasBusiness?: boolean;
  businessStage?: string;
  ideaDescription?: string;
  consentContact: boolean;
  consentLgpd: boolean;
};

type SolutionScore = {
  slug: string;
  score: number;
  reason: string;
};

export function calculateScores(payload: DiagnosticPayload): SolutionScore[] {
  const text = [
    payload.profileType,
    payload.mainArea,
    payload.mainPain,
    payload.businessStage,
    payload.ideaDescription,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores: SolutionScore[] = [
    {
      slug: "caixa-claro",
      score: match(text, ["financeiro", "finanÃ§a", "conta", "gasto", "despesa", "dinheiro", "orÃ§amento", "planilha"]),
      reason: "IndÃ­cios de dor financeira, controle de gastos, contas futuras ou organizaÃ§Ã£o por planilha.",
    },
    {
      slug: "festa-no-controle",
      score: match(text, ["evento", "festa", "voluntÃ¡rio", "voluntarios", "pedido", "cardÃ¡pio", "cardapio", "caixa", "fila", "pix"]),
      reason: "IndÃ­cios de operaÃ§Ã£o de evento, voluntÃ¡rios, pedidos, caixa ou filas.",
    },
    {
      slug: "escuta-viva",
      score: match(text, ["pesquisa", "opiniÃ£o", "opiniao", "comunidade", "grupo", "decisÃ£o", "decisao", "priorizar", "melhoria"]),
      reason: "IndÃ­cios de necessidade de ouvir pessoas, priorizar melhorias ou tomar decisÃµes com dados.",
    },
    {
      slug: "familia-presente-60-mais",
      score: match(text, ["idoso", "idosa", "famÃ­lia", "familia", "rotina", "cuidado", "remÃ©dio", "remedio", "tecnologia", "digital"]),
      reason: "IndÃ­cios de apoio a idosos, rotina familiar ou dificuldade digital.",
    },
    {
      slug: "dna-de-valor",
      score: match(text, ["currÃ­culo", "curriculo", "profissional", "posicionamento", "diferencial", "consultoria", "serviÃ§o", "servico", "cliente"]),
      reason: "IndÃ­cios de necessidade de posicionamento, diferenciaÃ§Ã£o ou transformaÃ§Ã£o de histÃ³rico em oferta.",
    },
    {
      slug: "presenca-querida",
      score: match(text, ["convite", "convidado", "rsvp", "presenÃ§a", "presenca", "aniversÃ¡rio", "aniversario", "casamento"]),
      reason: "IndÃ­cios de organizaÃ§Ã£o de convidados, confirmaÃ§Ãµes e mensagens personalizadas.",
    },
    {
      slug: "discoteca-digital",
      score: match(text, ["disco", "vinil", "cd", "coleÃ§Ã£o", "colecao", "acervo", "catÃ¡logo", "catalogo"]),
      reason: "IndÃ­cios de coleÃ§Ã£o, acervo ou catÃ¡logo visual.",
    },
    {
      slug: "jornada-personal-extrema",
      score: match(text, ["aluno", "treino", "personal", "agenda", "follow", "acompanhamento", "evoluÃ§Ã£o", "evolucao"]),
      reason: "IndÃ­cios de acompanhamento recorrente de alunos/clientes e necessidade de CRM pessoal.",
    },
    {
      slug: "lacos-letras-papelaria-criativa",
      score: match(text, ["papelaria", "personalizado", "topo", "bolo", "festa infantil", "produto", "tema"]),
      reason: "IndÃ­cios de catÃ¡logo de produtos personalizados e organizaÃ§Ã£o comercial por tema/linha.",
    },
  ];

  const urgencyBonus = payload.urgency === "agora" ? 3 : payload.urgency === "30_dias" ? 2 : 0;

  return scores
    .map((item) => ({ ...item, score: item.score + urgencyBonus }))
    .sort((a, b) => b.score - a.score);
}

function match(text: string, terms: string[]) {
  return terms.reduce((total, term) => {
    return total + (text.includes(term) ? 2 : 0);
  }, 0);
}

export function calculateDiagnosticScore(payload: DiagnosticPayload, bestScore: number) {
  let score = bestScore;

  if (payload.consentContact) score += 2;
  if (payload.whatsapp) score += 2;
  if (payload.email) score += 1;
  if (payload.hasBusiness) score += 2;
  if (payload.urgency === "agora") score += 4;
  if (payload.urgency === "30_dias") score += 3;
  if (payload.ideaDescription && payload.ideaDescription.length > 40) score += 2;

  return score;
}
