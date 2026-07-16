export type AtendimentoTopic = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  benefit: string;
  sourceLabel: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  checklist: string[];
};


export const topicAnchorBySlug: Record<string, string> = {
  "regulamento-horarios-grupos": "organizacao",
  "preparo-vestuario-banho": "antes-de-chegar",
  "silencio-firmeza-harmonia": "postura",
  "manual-cambonos": "cambonos",
  "retornos-atendimento-acolhimento": "cuidados",
  "comunicacao-presenca-recados": "compromisso",
};

export const topicNavBySlug: Record<
  string,
  { firstSectionLabel: string; firstSectionAnchor: string; secondSectionLabel: string; secondSectionAnchor: string }
> = {
  "regulamento-horarios-grupos": {
    firstSectionLabel: "Regra",
    firstSectionAnchor: "regra",
    secondSectionLabel: "Mudança",
    secondSectionAnchor: "mudanca",
  },
  "preparo-vestuario-banho": {
    firstSectionLabel: "Por que existe",
    firstSectionAnchor: "por-que-existe",
    secondSectionLabel: "Dia a dia",
    secondSectionAnchor: "dia-a-dia",
  },
  "silencio-firmeza-harmonia": {
    firstSectionLabel: "Por que importa",
    firstSectionAnchor: "por-que-importa",
    secondSectionLabel: "O que fazer",
    secondSectionAnchor: "o-que-fazer",
  },
  "manual-cambonos": {
    firstSectionLabel: "Por que existe",
    firstSectionAnchor: "por-que-existe",
    secondSectionLabel: "O que preservar",
    secondSectionAnchor: "o-que-preservar",
  },
  "retornos-atendimento-acolhimento": {
    firstSectionLabel: "Controle de Retorno",
    firstSectionAnchor: "controle-de-retorno",
    secondSectionLabel: "Ajuda a casa",
    secondSectionAnchor: "ajuda-a-casa",
  },
  "comunicacao-presenca-recados": {
    firstSectionLabel: "Cadastro e Comunicação",
    firstSectionAnchor: "cadastro-e-comunicacao",
    secondSectionLabel: "Módulo ajuda",
    secondSectionAnchor: "modulo-ajuda",
  },
};

export const atendimentoTopics: AtendimentoTopic[] = [
  {
    slug: "regulamento-horarios-grupos",
    title: "Regulamento, horários e grupos",
    eyebrow: "Organização da casa",
    summary: "Entenda quando cada trabalho acontece, como funcionam os grupos e por que a organização protege a harmonia da corrente.",
    benefit: "Evita dúvidas de última hora e ajuda cada Filho da Corrente a chegar preparado, no dia correto e com clareza do seu papel.",
    sourceLabel: "Regulamento do Tucxa 2025",
    sections: [
      {
        title: "Por que existe essa regra?",
        body: "O Tucxa organiza trabalhos distintos para consulentes, transformação e desenvolvimento dos Filhos da Corrente. Essa separação reduz cruzamento de funções, melhora o fluxo da casa e preserva a finalidade espiritual de cada dia.",
      },
      {
        title: "O que isso muda na prática?",
        body: "O Filho da Corrente visualiza horários, grupos, restrições e orientações de presença de forma simples, sem precisar procurar informações espalhadas em mensagens antigas.",
      },
    ],
    checklist: [
      "Conferir seu grupo e o tipo de trabalho do dia.",
      "Chegar com antecedência e respeitar horários de fechamento da porta.",
      "Comunicar ausência conforme orientação da casa.",
    ],
  },
  {
    slug: "preparo-vestuario-banho",
    title: "Preparo, vestuário e banho de defesa",
    eyebrow: "Antes de chegar ao templo",
    summary: "Relembre alimentação, roupa branca, fitas, calçado, banho de defesa e postura de chegada para entrar em sintonia com a corrente.",
    benefit: "Transforma o preparo em uma rotina fácil de seguir e diminui esquecimentos que podem atrapalhar a participação no trabalho.",
    sourceLabel: "Procedimentos e Orientações Básicas do Tucxa 2025",
    sections: [
      {
        title: "Por que existe essa orientação?",
        body: "O preparo material apoia o equilíbrio energético e mental. Alimentação leve, roupa adequada e banho de defesa ajudam o Filho da Corrente a entrar no trabalho com mais atenção, respeito e firmeza.",
      },
      {
        title: "Como usar no dia a dia?",
        body: "Use este card como uma lista de revisão antes de sair de casa: vestuário, banho, silêncio, concentração e materiais necessários.",
      },
    ],
    checklist: [
      "Alimentação leve e sem bebida alcoólica.",
      "Roupa branca, larga e adequada ao regulamento.",
      "Banho de defesa quando indicado ou necessário.",
      "Chegada em silêncio e com pensamento elevado.",
    ],
  },
  {
    slug: "silencio-firmeza-harmonia",
    title: "Silêncio, firmeza e harmonia",
    eyebrow: "Postura durante o trabalho",
    summary: "O silêncio absoluto e a firmeza mental sustentam a corrente e ajudam a manter o campo vibratório do trabalho.",
    benefit: "Dá clareza sobre o motivo espiritual e prático das regras, aumentando adesão sem precisar de cobranças constantes.",
    sourceLabel: "Procedimentos e Regulamento do Tucxa 2025",
    sections: [
      {
        title: "Por que isso importa?",
        body: "O trabalho espiritual depende da harmonia de todos. Conversas inadequadas, circulação sem necessidade ou distrações podem quebrar a concentração coletiva e prejudicar o ambiente preparado para o atendimento.",
      },
      {
        title: "O que fazer quando houver dúvida?",
        body: "Procure orientação da coordenação de forma discreta. A ideia é resolver sem expor pessoas, sem gerar ruído e sem desorganizar o trabalho em andamento.",
      },
    ],
    checklist: [
      "Manter silêncio desde a chegada.",
      "Evitar celular ligado durante os trabalhos.",
      "Circular apenas quando necessário e pelo local indicado.",
      "Firmar pensamento e colaborar com a corrente.",
    ],
  },
  {
    slug: "manual-cambonos",
    title: "Manual para Cambonos",
    eyebrow: "Apoio às entidades e consulentes",
    summary: "Resumo do papel do Cambono como sustentação energética, apoio à entidade, anotação de orientações e proteção do sigilo.",
    benefit: "Ajuda Cambonos novos e experientes a lembrarem o que fazer, por que fazer e como agir com discrição e responsabilidade.",
    sourceLabel: "Manual para Cambonos 2025",
    sections: [
      {
        title: "Por que existe essa função?",
        body: "O Cambono apoia a entidade, facilita a comunicação com o consulente, prepara materiais e sustenta o trabalho sem confundir sua função com a do médium incorporado.",
      },
      {
        title: "O que precisa ser preservado?",
        body: "Sigilo, respeito, discrição e responsabilidade. Assuntos ouvidos no atendimento não devem ser comentados, satirizados ou tratados fora do contexto apropriado.",
      },
    ],
    checklist: [
      "Preparar materiais básicos e específicos da entidade.",
      "Anotar nomes, missões, retornos e orientações necessárias.",
      "Ajudar consulentes a compreenderem a orientação recebida.",
      "Reportar situações fora do procedimento à coordenação.",
    ],
  },
  {
    slug: "retornos-atendimento-acolhimento",
    title: "Retornos, atendimento e acolhimento",
    eyebrow: "Cuidado com as pessoas",
    summary: "Orientações para acolher consulentes, organizar retornos obrigatórios e preservar continuidade no atendimento espiritual.",
    benefit: "Reduz perda de informação e ajuda a garantir que quem precisa retornar seja acompanhado com responsabilidade.",
    sourceLabel: "Manual para Cambonos e Regulamento do Tucxa 2025",
    sections: [
      {
        title: "Por que existe controle de retorno?",
        body: "Quando uma entidade orienta retorno obrigatório ou encaminhamento, a informação precisa chegar à coordenação para que o cuidado não dependa apenas de memória ou mensagens soltas.",
      },
      {
        title: "Como isso ajuda a casa?",
        body: "Aumenta previsibilidade, fortalece o acolhimento e evita que consulentes, cambonos ou cavalinhos fiquem sem direção sobre o próximo passo.",
      },
    ],
    checklist: [
      "Registrar nome do consulente quando necessário.",
      "Anotar missão, retorno e entidade envolvida.",
      "Comunicar retorno obrigatório à coordenação.",
      "Orientar saída e deslocamento com respeito e cuidado.",
    ],
  },
  {
    slug: "comunicacao-presenca-recados",
    title: "Comunicação, presença e Recados Tucxa",
    eyebrow: "Compromisso com a corrente",
    summary: "Regras de presença, aviso de ausência, participação no grupo de recados e atualização cadastral.",
    benefit: "Ajuda o Filho da Corrente a manter compromisso com a casa sem depender de lembranças informais.",
    sourceLabel: "Regulamento do Tucxa 2025",
    sections: [
      {
        title: "Por que manter cadastro e comunicação em dia?",
        body: "A casa precisa saber como orientar, avisar e organizar cada Filho da Corrente. Dados desatualizados, ausência não comunicada ou falta de leitura dos recados prejudicam a organização geral.",
      },
      {
        title: "Como o módulo ajuda?",
        body: "Centraliza orientação e encaminha o Filho da Corrente para atualizar dados, funções e agendas quando algo mudar.",
      },
    ],
    checklist: [
      "Manter dados cadastrais atualizados.",
      "Acompanhar comunicações oficiais do Tucxa.",
      "Avisar ausência com antecedência.",
      "Usar o Cadastro para solicitar atualização de função ou agenda.",
    ],
  },
];

export function findAtendimentoTopic(slug: string) {
  return atendimentoTopics.find((topic) => topic.slug === slug) ?? null;
}
