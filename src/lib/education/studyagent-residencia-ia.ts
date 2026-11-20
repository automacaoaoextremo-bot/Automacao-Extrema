export type StudyAgentLevelKey = "iniciante" | "basico" | "intermediario" | "avancado";

export type StudyAgentCompetency = {
  id: string;
  title: string;
  summary: string;
  category: string;
  whyItMatters: string;
  prerequisites: string[];
  reflectionSources: string[];
  evidence: string;
  studyHints: string[];
};

export const STUDYAGENT_PROGRAM_ID = "7a9f6b02-6c5b-4d41-9a2f-9c2a2f6d1001";

export const STUDYAGENT_PROGRAM = {
  slug: "residencia-ia",
  name: "Residência IA",
  description:
    "Trilha de aprendizagem orientada por competências, evidências e relações de pré-requisito. A primeira versão usa as reflections da Residência como base de conhecimento estruturada.",
  sourceLabel: "Reflections de 18/09, 25/09 e 02/10/2026",
};

export const STUDYAGENT_LEVELS: Array<{
  key: StudyAgentLevelKey;
  label: string;
  order: number;
  intent: string;
}> = [
  {
    key: "iniciante",
    label: "Iniciante",
    order: 1,
    intent: "Reconhecer conceitos, vocabulário e o propósito da competência.",
  },
  {
    key: "basico",
    label: "Básico",
    order: 2,
    intent: "Executar uma atividade simples com autonomia e explicar o resultado.",
  },
  {
    key: "intermediario",
    label: "Intermediário",
    order: 3,
    intent: "Resolver um mini-case, justificar decisões e reconhecer limitações.",
  },
  {
    key: "avancado",
    label: "Avançado",
    order: 4,
    intent: "Resolver um caso aberto, discutir trade-offs e produzir evidência reproduzível.",
  },
];

export const STUDYAGENT_GATE = {
  quizMin: 80,
  practiceMin: 2,
  explanationMin: 2,
  finalMin: 70,
};

export const STUDYAGENT_COMPETENCIES: StudyAgentCompetency[] = [
  {
    id: "K01",
    title: "Identificar problemas que podem ser resolvidos com IA",
    summary: "Separar problemas adequados para IA daqueles que pedem regra, automação tradicional, processo ou mudança operacional.",
    category: "Fundamentos e enquadramento",
    whyItMatters: "Evita começar pela tecnologia antes de compreender a decisão, o dado disponível e o valor esperado.",
    prerequisites: [],
    reflectionSources: ["02/10"],
    evidence: "Enquadramento de um problema real com objetivo, entrada, saída, restrições e justificativa para usar ou não IA.",
    studyHints: ["Problem framing", "Critérios de viabilidade", "Objetivo de negócio"],
  },
  {
    id: "K02",
    title: "Selecionar abordagem/paradigma de IA adequado",
    summary: "Escolher entre abordagens como supervisionado, não supervisionado, regras, busca, geração ou combinação delas.",
    category: "Fundamentos e enquadramento",
    whyItMatters: "Uma boa escolha de abordagem reduz complexidade e alinha o método ao tipo de resposta desejada.",
    prerequisites: ["K01"],
    reflectionSources: ["25/09"],
    evidence: "Comparação de alternativas para um mesmo problema, com justificativa da abordagem escolhida.",
    studyHints: ["Paradigmas de IA", "Trade-offs", "Tipo de dado e objetivo"],
  },
  {
    id: "K03",
    title: "Aplicar aprendizado supervisionado e não supervisionado",
    summary: "Reconhecer quando há rótulos, quando não há e implementar exemplos simples dos dois paradigmas.",
    category: "Fundamentos e enquadramento",
    whyItMatters: "É a ponte entre o enquadramento do problema e a implementação dos modelos de aprendizado.",
    prerequisites: ["K01", "K02"],
    reflectionSources: ["02/10"],
    evidence: "Notebook comparando um exemplo supervisionado e um não supervisionado sobre dados apropriados.",
    studyHints: ["Classificação/regressão", "Clustering", "Rótulos"],
  },
  {
    id: "K04",
    title: "Realizar análise exploratória de dados (EDA)",
    summary: "Investigar estrutura, distribuição, qualidade, padrões e anomalias antes da modelagem.",
    category: "Dados e entendimento",
    whyItMatters: "EDA reduz decisões baseadas em suposição e orienta limpeza, features, hipóteses e modelagem.",
    prerequisites: ["K05", "K06"],
    reflectionSources: ["18/09", "02/10"],
    evidence: "Notebook com perguntas, estatísticas descritivas, visualizações, achados e próximos passos.",
    studyHints: ["Pandas", "Describe", "Distribuições", "Outliers"],
  },
  {
    id: "K05",
    title: "Aplicar conceitos estatísticos básicos",
    summary: "Usar medidas de tendência, dispersão, distribuição e noções de amostragem para interpretar dados.",
    category: "Dados e entendimento",
    whyItMatters: "Fornece linguagem quantitativa para EDA, métricas, hipóteses e interpretação de resultados.",
    prerequisites: [],
    reflectionSources: ["18/09"],
    evidence: "Análise curta explicando média, mediana, dispersão e distribuição em um conjunto de dados.",
    studyHints: ["Média e mediana", "Variância/desvio", "Distribuições"],
  },
  {
    id: "K06",
    title: "Limpar e preparar dados (data cleaning)",
    summary: "Tratar ausências, duplicidades, tipos, inconsistências e formatos antes de análises e modelos.",
    category: "Dados e entendimento",
    whyItMatters: "A qualidade do dado influencia diretamente a confiabilidade das conclusões e dos modelos.",
    prerequisites: [],
    reflectionSources: ["18/09", "25/09"],
    evidence: "Pipeline reproduzível de limpeza com justificativa das decisões e comparação antes/depois.",
    studyHints: ["Missing values", "Duplicatas", "Tipos", "Padronização"],
  },
  {
    id: "K07",
    title: "Criar e selecionar features relevantes para modelos",
    summary: "Transformar dados brutos em atributos úteis e selecionar variáveis coerentes com o problema.",
    category: "Preparação para modelagem",
    whyItMatters: "Boas features podem melhorar desempenho, interpretabilidade e robustez mais do que trocar de algoritmo.",
    prerequisites: ["K04", "K06"],
    reflectionSources: ["25/09", "02/10"],
    evidence: "Comparação de conjunto base e conjunto com features, explicando impacto e risco de leakage.",
    studyHints: ["Feature engineering", "Seleção", "Leakage"],
  },
  {
    id: "K08",
    title: "Aplicar técnicas de visualização de dados",
    summary: "Escolher gráficos adequados à pergunta e comunicar padrões sem distorcer a interpretação.",
    category: "Dados e entendimento",
    whyItMatters: "Visualizações transformam padrões abstratos em evidência compreensível para análise e comunicação.",
    prerequisites: ["K04"],
    reflectionSources: ["18/09", "02/10"],
    evidence: "Conjunto de gráficos com pergunta, escolha do tipo, leitura e limitações.",
    studyHints: ["Matplotlib", "Escolha do gráfico", "Escalas e contexto"],
  },
  {
    id: "K09",
    title: "Formular e validar hipóteses com base em dados",
    summary: "Converter suspeitas em hipóteses testáveis, definir evidência esperada e interpretar resultados.",
    category: "Raciocínio analítico",
    whyItMatters: "Estrutura a investigação e reduz conclusões guiadas apenas por intuição.",
    prerequisites: ["K04", "K05"],
    reflectionSources: ["18/09"],
    evidence: "Hipótese explícita, método de validação, resultado e decisão com ressalvas.",
    studyHints: ["Hipótese nula", "Evidência", "Teste e interpretação"],
  },
  {
    id: "K10",
    title: "Interpretar correlação e causalidade em análises",
    summary: "Distinguir associação de relação causal e reconhecer confundidores e conclusões indevidas.",
    category: "Raciocínio analítico",
    whyItMatters: "Evita transformar padrões estatísticos em afirmações causais que os dados não sustentam.",
    prerequisites: ["K05", "K09"],
    reflectionSources: ["18/09"],
    evidence: "Análise de um caso com correlação, possíveis confundidores e limites para inferência causal.",
    studyHints: ["Correlação", "Confundimento", "Causalidade"],
  },
  {
    id: "K11",
    title: "Treinar modelos simples (ex.: sklearn)",
    summary: "Preparar dados, dividir conjuntos, treinar um baseline e obter previsões de forma reproduzível.",
    category: "Modelagem",
    whyItMatters: "Cria a primeira referência mensurável antes de aumentar a complexidade da solução.",
    prerequisites: ["K03", "K06"],
    reflectionSources: ["18/09"],
    evidence: "Notebook executável com split, baseline, treinamento, predição e avaliação inicial.",
    studyHints: ["scikit-learn", "Train/test split", "Baseline"],
  },
  {
    id: "K12",
    title: "Comparar e selecionar algoritmos de aprendizado",
    summary: "Comparar modelos usando métricas, custo, interpretabilidade, latência e requisitos do problema.",
    category: "Modelagem",
    whyItMatters: "O melhor algoritmo depende do contexto e não apenas da maior pontuação em uma métrica.",
    prerequisites: ["K11", "K13"],
    reflectionSources: ["18/09"],
    evidence: "Tabela comparativa de modelos com critérios técnicos e justificativa da escolha final.",
    studyHints: ["Baselines", "Comparação justa", "Trade-offs"],
  },
  {
    id: "K13",
    title: "Definir métricas de avaliação adequadas ao problema",
    summary: "Selecionar métricas coerentes com erro, classe, impacto e objetivo do caso.",
    category: "Avaliação e iteração",
    whyItMatters: "Uma métrica inadequada pode otimizar o comportamento errado mesmo quando o modelo parece bom.",
    prerequisites: ["K03", "K05"],
    reflectionSources: ["25/09", "02/10"],
    evidence: "Escolha justificada de métricas e interpretação de pelo menos duas alternativas.",
    studyHints: ["Accuracy/precision/recall", "MAE/RMSE", "Métrica de negócio"],
  },
  {
    id: "K14",
    title: "Detectar overfitting e underfitting",
    summary: "Reconhecer sinais de baixa capacidade ou baixa generalização usando treino, validação e curvas.",
    category: "Avaliação e iteração",
    whyItMatters: "Ajuda a decidir se o próximo passo é mais dados, regularização, novas features ou outro modelo.",
    prerequisites: ["K11", "K13"],
    reflectionSources: ["25/09", "02/10"],
    evidence: "Diagnóstico com resultados de treino/validação e recomendação de ação corretiva.",
    studyHints: ["Generalização", "Validation curve", "Learning curve"],
  },
  {
    id: "K15",
    title: "Aplicar ajuste básico de hiperparâmetros",
    summary: "Testar configurações do modelo de forma controlada, evitando otimização sobre o conjunto de teste.",
    category: "Avaliação e iteração",
    whyItMatters: "Permite melhorar modelos com método e sem confundir ajuste com capacidade de generalização.",
    prerequisites: ["K11", "K13", "K14"],
    reflectionSources: ["02/10"],
    evidence: "Busca simples documentada, comparação com baseline e avaliação em conjunto separado.",
    studyHints: ["GridSearchCV", "RandomizedSearchCV", "Validação cruzada"],
  },
  {
    id: "K16",
    title: "Iterar modelos com base em resultados experimentais",
    summary: "Transformar resultados e erros em uma próxima hipótese de experimento, mantendo comparação rastreável.",
    category: "Avaliação e iteração",
    whyItMatters: "Evita alterações aleatórias e cria um ciclo de melhoria baseado em evidências.",
    prerequisites: ["K12", "K14", "K15"],
    reflectionSources: ["25/09"],
    evidence: "Registro de pelo menos duas iterações com hipótese, mudança, resultado e decisão.",
    studyHints: ["Ciclo experimental", "Baseline", "Ablation"],
  },
  {
    id: "K17",
    title: "Identificar limitações técnicas e operacionais",
    summary: "Mapear restrições de dado, desempenho, custo, infraestrutura, segurança, operação e manutenção.",
    category: "Engenharia e limites",
    whyItMatters: "Uma solução útil precisa funcionar no ambiente real, não somente no notebook.",
    prerequisites: ["K11", "K16"],
    reflectionSources: ["02/10"],
    evidence: "Lista priorizada de limitações, impacto e estratégias de mitigação.",
    studyHints: ["Latência", "Custo", "Dados", "Operação"],
  },
  {
    id: "K18",
    title: "Documentar resultados experimentais",
    summary: "Registrar contexto, dados, parâmetros, métricas, artefatos e conclusões para permitir reprodução.",
    category: "Evidência e governança",
    whyItMatters: "Sem rastreabilidade, resultados ficam difíceis de comparar, reproduzir e revisar.",
    prerequisites: ["K04", "K11"],
    reflectionSources: ["18/09", "02/10"],
    evidence: "Experimento documentado com entradas, configuração, resultado, artefato e conclusão.",
    studyHints: ["Reprodutibilidade", "MLflow/DVC", "Experiment log"],
  },
  {
    id: "K19",
    title: "Justificar decisões técnicas utilizando evidências",
    summary: "Conectar decisão a resultados observáveis, critérios e limitações em vez de preferência pessoal.",
    category: "Evidência e governança",
    whyItMatters: "Decisões explicáveis são mais fáceis de revisar, defender e melhorar.",
    prerequisites: ["K18"],
    reflectionSources: ["02/10"],
    evidence: "Decisão técnica acompanhada de evidência, alternativa considerada e trade-off explícito.",
    studyHints: ["Decision record", "Trade-offs", "Evidência"],
  },
  {
    id: "K20",
    title: "Validar respostas geradas por IA",
    summary: "Checar factualidade, fonte, aderência ao contexto, consistência e risco antes de usar uma resposta gerada.",
    category: "Evidência e governança",
    whyItMatters: "Modelos generativos podem produzir respostas convincentes sem garantia de correção.",
    prerequisites: ["K19"],
    reflectionSources: ["02/10"],
    evidence: "Checklist aplicado a respostas de IA com identificação de falhas e correções fundamentadas.",
    studyHints: ["Grounding", "Verificação", "Fontes", "Incerteza"],
  },
  {
    id: "K21",
    title: "Avaliar impacto da solução nos objetivos do negócio",
    summary: "Relacionar resultado técnico a ganho, risco, custo, adoção e objetivo do problema original.",
    category: "Evidência e governança",
    whyItMatters: "Uma solução tecnicamente correta pode não gerar valor se não mudar o indicador que importa.",
    prerequisites: ["K01", "K13", "K19"],
    reflectionSources: ["02/10"],
    evidence: "Mapa de métricas técnicas versus métricas de impacto e recomendação de continuidade.",
    studyHints: ["KPI", "Impacto", "Custo/benefício", "Adoção"],
  },
  {
    id: "K22",
    title: "Comunicar de forma técnica e não técnica",
    summary: "Adaptar explicação, profundidade, vocabulário e evidência ao público sem perder precisão.",
    category: "Comunicação e evolução",
    whyItMatters: "Conhecimento só gera impacto quando diferentes públicos conseguem compreendê-lo e decidir.",
    prerequisites: ["K18", "K19"],
    reflectionSources: ["25/09", "02/10"],
    evidence: "Duas explicações do mesmo resultado: uma técnica e outra executiva/não técnica.",
    studyHints: ["Storytelling técnico", "Audiência", "Clareza"],
  },
  {
    id: "K23",
    title: "Compartilhar conhecimento técnico com colegas",
    summary: "Transferir aprendizado de forma estruturada, com exemplo, contexto e material reutilizável.",
    category: "Comunicação e evolução",
    whyItMatters: "Aumenta capacidade coletiva e reduz conhecimento concentrado em uma única pessoa.",
    prerequisites: ["K22"],
    reflectionSources: ["18/09"],
    evidence: "Mini-aula, documentação ou demonstração utilizada por outra pessoa para executar a atividade.",
    studyHints: ["Teaching", "Documentação", "Exemplo reproduzível"],
  },
  {
    id: "K24",
    title: "Dar e receber feedback construtivo",
    summary: "Oferecer feedback específico e acionável e transformar feedback recebido em melhoria observável.",
    category: "Comunicação e evolução",
    whyItMatters: "A aprendizagem em grupo depende de ciclos seguros de revisão, ajuste e colaboração.",
    prerequisites: ["K22"],
    reflectionSources: ["25/09"],
    evidence: "Registro de feedback dado/recebido, ação tomada e aprendizado resultante.",
    studyHints: ["Feedback acionável", "Revisão por pares", "Escuta"],
  },
  {
    id: "K25",
    title: "Identificar lacunas no próprio conhecimento e aplicá-lo em novos contextos",
    summary: "Reconhecer o que ainda não domina, planejar estudo e transferir aprendizado para um problema diferente.",
    category: "Comunicação e evolução",
    whyItMatters: "É a competência que sustenta evolução contínua depois que o conteúdo inicial muda.",
    prerequisites: ["K17", "K24"],
    reflectionSources: ["02/10"],
    evidence: "Autoavaliação baseada em evidências, plano de lacuna e aplicação em um novo contexto.",
    studyHints: ["Metacognição", "Plano de estudo", "Transferência"],
  },
];

export const STUDYAGENT_COMPETENCY_BY_ID = Object.fromEntries(
  STUDYAGENT_COMPETENCIES.map((competency) => [competency.id, competency]),
) as Record<string, StudyAgentCompetency>;

export type StudyAgentEdge = {
  from: string;
  to: string;
  relation: "prerequisite_of";
};

export const STUDYAGENT_EDGES: StudyAgentEdge[] = STUDYAGENT_COMPETENCIES.flatMap((competency) =>
  competency.prerequisites.map((from) => ({
    from,
    to: competency.id,
    relation: "prerequisite_of" as const,
  })),
);

export function getAvailableCompetencies(completedIds: string[]) {
  const completed = new Set(completedIds);

  return STUDYAGENT_COMPETENCIES.filter(
    (competency) =>
      !completed.has(competency.id) && competency.prerequisites.every((id) => completed.has(id)),
  );
}

export function getBlockedCompetencies(completedIds: string[]) {
  const completed = new Set(completedIds);

  return STUDYAGENT_COMPETENCIES.filter(
    (competency) =>
      !completed.has(competency.id) && competency.prerequisites.some((id) => !completed.has(id)),
  );
}

export function getCompetencyContext(ids?: string[]) {
  const selected = ids?.length
    ? STUDYAGENT_COMPETENCIES.filter((competency) => ids.includes(competency.id))
    : STUDYAGENT_COMPETENCIES;

  return selected
    .map(
      (competency) =>
        `${competency.id} — ${competency.title}\nResumo: ${competency.summary}\nPré-requisitos: ${competency.prerequisites.join(", ") || "nenhum"}\nEvidência: ${competency.evidence}`,
    )
    .join("\n\n");
}
