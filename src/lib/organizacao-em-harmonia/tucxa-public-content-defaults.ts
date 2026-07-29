export type TucxaPublicCard = {
  title: string;
  description: string;
};

export type TucxaPublicContent = {
  newHereIntro: string;
  consulenteServices: TucxaPublicCard[];
  consulenteGuidelines: TucxaPublicCard[];
  atendimentoEmHarmonia: {
    title: string;
    shortLabel: string;
    description: string;
    callToAction: string;
  };
  agendaViva: {
    title: string;
    shortLabel: string;
    description: string;
    callToAction: string;
  };
  correnteEmDia: {
    title: string;
    shortLabel: string;
    description: string;
    callToAction: string;
  };
};

export const defaultTucxaPublicContent: TucxaPublicContent = {
  newHereIntro:
    "Este espaço resume as orientações mais importantes para quem ainda não conhece a casa. A ideia é evitar desencontros e ajudar você a chegar com mais tranquilidade, sabendo qual caminho seguir.",
  atendimentoEmHarmonia: {
    title: "Atendimento em Harmonia",
    shortLabel: "Atendimento em Harmonia",
    description:
      "Consulte orientações, entre com seu cadastro validado e solicite agendamento, alteração ou cancelamento de atendimento conforme calendário da casa.",
    callToAction: "Entrar no Atendimento em Harmonia",
  },
  agendaViva: {
    title: "Agenda Viva",
    shortLabel: "Agenda Viva",
    description:
      "Consulte calendário, eventos, grupos, atividades culturais e orientações divulgadas pelo Tucxa de acordo com seu cadastro e permissões.",
    callToAction: "Acessar Agenda Viva",
  },
  correnteEmDia: {
    title: "Corrente em Dia",
    shortLabel: "Corrente em Dia",
    description:
      "Escolha uma contribuição identificada ou anônima, defina o valor e a forma de pagamento, com mais clareza para a casa e menos retrabalho para a tesouraria.",
    callToAction: "Acessar Corrente em Dia",
  },
  consulenteServices: [
    {
      title: "Atendimento espiritual com acolhimento",
      description:
        "Nas segundas e terças, o Tucxa recebe Filhos de Fora que buscam auxílio, crescimento espiritual e orientação, sempre com respeito, ordem e cuidado.",
    },
    {
      title: "Transformação e encaminhamentos",
      description:
        "Quando há orientação espiritual, alguns casos podem ser encaminhados para trabalhos específicos às quartas, com preparo e agendamento orientado pela coordenação.",
    },
    {
      title: "Biblioteca e estudo",
      description:
        "A casa também estimula estudo, responsabilidade e crescimento, mantendo uma biblioteca aberta aos Filhos de Fora e Filhos da Corrente.",
    },
  ],
  consulenteGuidelines: [
    {
      title: "A casa é aberta a quem busca auxílio",
      description:
        "O Tucxa é uma sociedade civil religiosa sem fins lucrativos, voltada à prática da fé, do amor e da ajuda ao próximo. O atendimento existe para acolher quem busca orientação e crescimento espiritual.",
    },
    {
      title: "Atendimentos de segunda, terça e/ou quarta",
      description:
        "Segunda e terça: atendimento aos Filhos de Fora das 18h às 22h, com abertura às 18h30, fechamento da porta às 19h20 e reabertura às 20h. Quarta: trabalhos de Transformação das 18h30 às 22h, com abertura às 18h45 e fechamento da porta às 19h, sem reabertura, quando houver encaminhamento e agendamento pela coordenação.",
    },
    {
      title: "Senha, ficha e orientação individual",
      description:
        "Ao chegar, cada consulente segue a orientação da recepção. A organização pode usar senhas e fichas individuais para preservar a ordem, a segurança e o cuidado no atendimento.",
    },
    {
      title: "Respeito, silêncio e cuidado com o ambiente",
      description:
        "O silêncio e a disciplina ajudam a manter a harmonia dos trabalhos. A tecnologia deve apenas facilitar a orientação, sem substituir o acolhimento humano da casa.",
    },
  ],
};
