export type ConsulenteAtendimentoTopic = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  benefit: string;
  sourceLabel: string;
  sections: Array<{ title: string; body: string }>;
  checklist: string[];
};

export const consulenteTopicAnchorBySlug: Record<string, string> = {
  "horarios-dias-atendimento": "horarios",
  "chegada-senha-ficha": "chegada",
  "silencio-circulacao-acolhimento": "postura",
  "retorno-transformacao": "retorno",
  "sigilo-orientacoes": "cuidados",
};

export const consulenteTopicNavBySlug: Record<string, { firstSectionLabel: string; firstSectionAnchor: string; secondSectionLabel: string; secondSectionAnchor: string }> = {
  "horarios-dias-atendimento": { firstSectionLabel: "Dias", firstSectionAnchor: "dias", secondSectionLabel: "Horários", secondSectionAnchor: "horarios-praticos" },
  "chegada-senha-ficha": { firstSectionLabel: "Senha", firstSectionAnchor: "senha", secondSectionLabel: "Ficha", secondSectionAnchor: "ficha" },
  "silencio-circulacao-acolhimento": { firstSectionLabel: "Silêncio", firstSectionAnchor: "silencio", secondSectionLabel: "Circulação", secondSectionAnchor: "circulacao" },
  "retorno-transformacao": { firstSectionLabel: "Retorno", firstSectionAnchor: "retorno-obrigatorio", secondSectionLabel: "Transformação", secondSectionAnchor: "transformacao" },
  "sigilo-orientacoes": { firstSectionLabel: "Sigilo", firstSectionAnchor: "sigilo", secondSectionLabel: "Orientações", secondSectionAnchor: "orientacoes" },
};

export const consulenteAtendimentoTopics: ConsulenteAtendimentoTopic[] = [
  {
    slug: "horarios-dias-atendimento",
    title: "Dias e horários de atendimento",
    eyebrow: "Organização do atendimento",
    summary: "Consulte quando acontecem os trabalhos destinados aos Filhos de Fora/Consulentes e planeje sua chegada sem desencontros.",
    benefit: "Ajuda você a comparecer no dia correto e a compreender que cada dia do Tucxa possui uma finalidade específica.",
    sourceLabel: "Regulamento do Tucxa 2025, itens 1, 3 e 20",
    sections: [
      { title: "Quais são os dias destinados ao consulente?", body: "Os atendimentos aos Filhos de Fora/Consulentes acontecem às segundas e terças-feiras, conforme o calendário anual publicado pelo Tucxa. As quintas-feiras são destinadas ao desenvolvimento dos Filhos da Corrente e não fazem parte do atendimento regular do consulente." },
      { title: "Quais horários precisam ser observados?", body: "Nas segundas e terças, o funcionamento previsto é das 18h às 22h, com abertura do trabalho às 18h30. A porta fecha às 19h20 e reabre às 20h. Consulte sempre a Agenda Viva, pois datas, férias ou orientações extraordinárias podem alterar o calendário." },
    ],
    checklist: ["Conferir a Agenda Viva antes de sair.", "Chegar com antecedência.", "Observar o horário de fechamento da porta.", "Não utilizar a quinta-feira como alternativa ao atendimento regular."],
  },
  {
    slug: "chegada-senha-ficha",
    title: "Chegada, senha e ficha individual",
    eyebrow: "Ordem de atendimento",
    summary: "Entenda como funciona a recepção, a distribuição de senhas e a ficha que orienta seu atendimento.",
    benefit: "Preserva a ordem de chegada e evita reservas ou retiradas de senha em nome de outras pessoas.",
    sourceLabel: "Regulamento do Tucxa 2025, itens 23 e 25",
    sections: [
      { title: "Como funciona a senha?", body: "Ao entrar no Centro, cada consulente recebe uma senha individual por ordem de chegada. Não é permitido retirar senha para outra pessoa, ainda que seja familiar ou acompanhante." },
      { title: "Para que serve a ficha individual?", body: "Depois da senha, a recepção entrega uma ficha individual correspondente à numeração. Essa ficha ajuda a organização a indicar a entidade responsável pelo atendimento e a manter o fluxo do trabalho." },
    ],
    checklist: ["Levar seus próprios dados de contato atualizados.", "Retirar apenas a sua senha.", "Guardar a ficha até receber orientação da organização.", "Seguir a ordem e o local de espera informados."],
  },
  {
    slug: "silencio-circulacao-acolhimento",
    title: "Silêncio, circulação e acolhimento",
    eyebrow: "Postura dentro do templo",
    summary: "O silêncio e o deslocamento pelo caminho indicado colaboram com a harmonia e a segurança do trabalho espiritual.",
    benefit: "Ajuda a preservar o ambiente preparado para o atendimento e torna a experiência mais tranquila para todas as pessoas.",
    sourceLabel: "Regulamento do Tucxa 2025, item 14; Manual para Cambonos 2025, páginas 4 e 5",
    sections: [
      { title: "Por que o silêncio é importante?", body: "Dentro do Templo é necessário manter silêncio. O trabalho espiritual começa antes do atendimento individual, e conversas, celular ou movimentações desnecessárias podem interferir na concentração e no acolhimento." },
      { title: "Como circular com segurança?", body: "Siga sempre o percurso indicado pela organização e pelos cambonos, especialmente nas áreas demarcadas. Ao final do atendimento, utilize a saída e o trajeto orientados pela equipe." },
    ],
    checklist: ["Manter o celular silencioso ou desligado.", "Falar somente quando necessário.", "Aguardar no local indicado.", "Seguir as orientações de entrada, circulação e saída."],
  },
  {
    slug: "retorno-transformacao",
    title: "Retorno obrigatório e Transformação",
    eyebrow: "Continuidade do cuidado",
    summary: "Saiba o que fazer quando uma entidade orientar retorno ou encaminhar você para o trabalho de Transformação.",
    benefit: "Evita que uma orientação importante se perca e permite que a coordenação prepare corretamente o próximo atendimento.",
    sourceLabel: "Regulamento do Tucxa 2025, item 19; Manual para Cambonos 2025, observações importantes",
    sections: [
      { title: "O que fazer quando houver retorno obrigatório?", body: "Quando a entidade solicitar retorno obrigatório, confirme com o cambono ou com a coordenação se a informação foi registrada. O novo comparecimento deve seguir a orientação recebida e a disponibilidade da organização." },
      { title: "Como funciona o trabalho de Transformação?", body: "A Transformação acontece às quartas-feiras e somente pode ser realizada por quem foi previamente encaminhado por uma entidade e agendado com a coordenação. Na confirmação do agendamento, serão explicados os preparos necessários." },
    ],
    checklist: ["Guardar a orientação recebida.", "Confirmar o registro do retorno com a organização.", "Não comparecer à quarta-feira sem encaminhamento e agendamento.", "Cumprir o preparo informado na confirmação."],
  },
  {
    slug: "sigilo-orientacoes",
    title: "Sigilo e orientações recebidas",
    eyebrow: "Respeito ao atendimento",
    summary: "O atendimento trata de questões pessoais e deve ser conduzido com respeito, discrição e atenção às orientações transmitidas.",
    benefit: "Protege sua privacidade, a privacidade de outras pessoas e a confiança necessária para o acolhimento espiritual.",
    sourceLabel: "Manual para Cambonos 2025, páginas 1, 3 e 5",
    sections: [
      { title: "Como o sigilo protege o atendimento?", body: "Os assuntos tratados entre consulente, entidade e equipe de apoio são particulares. Evite solicitar, divulgar ou comentar informações de outros atendimentos e compartilhe seus próprios dados apenas pelos canais indicados." },
      { title: "Como guardar as orientações?", body: "Confira se compreendeu a missão, o retorno ou o preparo informado. Quando necessário, peça ao cambono que explique de forma simples ou registre a orientação, sem expor detalhes além do necessário." },
    ],
    checklist: ["Não comentar atendimentos de outras pessoas.", "Registrar somente as orientações necessárias.", "Confirmar dúvidas antes de deixar o local.", "Procurar a coordenação quando houver situação fora do procedimento."],
  },
];

export function findConsulenteAtendimentoTopic(slug: string) {
  return consulenteAtendimentoTopics.find((topic) => topic.slug === slug) ?? null;
}
