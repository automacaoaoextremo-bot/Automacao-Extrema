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

export type SolutionScore = {
  slug: string;
  score: number;
  reason: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: Record<string, string>;
};

const REQUIRED_FIELDS: Array<keyof DiagnosticPayload> = [
  "fullName",
  "whatsapp",
  "email",
  "profileType",
  "mainArea",
  "mainPain",
  "urgency",
  "businessStage",
  "ideaDescription",
];

export function validateDiagnosticPayload(payload: DiagnosticPayload): ValidationResult {
  const errors: Record<string, string> = {};

  for (const field of REQUIRED_FIELDS) {
    const value = payload[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      errors[field] = "Campo obrigatório.";
    }
  }

  const text = payload.ideaDescription?.trim() ?? "";
  if (text && text.length < 30) {
    errors.ideaDescription = "Descreva a situação com pelo menos 30 caracteres.";
  }

  if (!payload.consentLgpd) {
    errors.consentLgpd = "É necessário aceitar o uso das respostas para enviar o diagnóstico.";
  }

  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email.trim())) {
    errors.email = "Informe um e-mail válido.";
  }

  if (payload.whatsapp && payload.whatsapp.replace(/\D/g, "").length < 10) {
    errors.whatsapp = "Informe um WhatsApp válido com DDD.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

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
      score: match(text, ["financeiro", "finança", "conta", "gasto", "despesa", "dinheiro", "orçamento", "planilha"]),
      reason: "Indícios de dor financeira, controle de gastos, contas futuras ou organização por planilha.",
    },
    {
      slug: "festa-no-controle",
      score: match(text, ["evento", "festa", "voluntário", "voluntarios", "pedido", "cardápio", "cardapio", "caixa", "fila", "pix"]),
      reason: "Indícios de operação de evento, voluntários, pedidos, caixa ou filas.",
    },
    {
      slug: "escuta-viva",
      score: match(text, ["pesquisa", "opinião", "opiniao", "comunidade", "grupo", "decisão", "decisao", "priorizar", "melhoria"]),
      reason: "Indícios de necessidade de ouvir pessoas, priorizar melhorias ou tomar decisões com dados.",
    },
    {
      slug: "familia-presente-60-mais",
      score: match(text, ["idoso", "idosa", "família", "familia", "rotina", "cuidado", "remédio", "remedio", "tecnologia", "digital"]),
      reason: "Indícios de apoio a idosos, rotina familiar ou dificuldade digital.",
    },
    {
      slug: "dna-de-valor",
      score: match(text, ["currículo", "curriculo", "profissional", "posicionamento", "diferencial", "consultoria", "serviço", "servico", "cliente"]),
      reason: "Indícios de necessidade de posicionamento, diferenciação ou transformação de histórico em oferta.",
    },
    {
      slug: "presenca-querida",
      score: match(text, ["convite", "convidado", "rsvp", "presença", "presenca", "aniversário", "aniversario", "casamento"]),
      reason: "Indícios de organização de convidados, confirmações e mensagens personalizadas.",
    },
    {
      slug: "discoteca-digital",
      score: match(text, ["disco", "vinil", "cd", "coleção", "colecao", "acervo", "catálogo", "catalogo"]),
      reason: "Indícios de coleção, acervo ou catálogo visual.",
    },
    {
      slug: "jornada-personal-extrema",
      score: match(text, ["aluno", "treino", "personal", "agenda", "follow", "acompanhamento", "evolução", "evolucao"]),
      reason: "Indícios de acompanhamento recorrente de alunos/clientes e necessidade de CRM pessoal.",
    },
    {
      slug: "lacos-letras-papelaria-criativa",
      score: match(text, ["papelaria", "personalizado", "topo", "bolo", "festa infantil", "produto", "tema"]),
      reason: "Indícios de catálogo de produtos personalizados e organização comercial por tema/linha.",
    },
  ];

  const urgencyBonus = payload.urgency === "agora" ? 3 : payload.urgency === "30_dias" ? 2 : 0;

  return scores
    .map((item) => ({ ...item, score: item.score + urgencyBonus }))
    .sort((a, b) => b.score - a.score);
}

function match(text: string, terms: string[]) {
  return terms.reduce((total, term) => total + (text.includes(term) ? 2 : 0), 0);
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
