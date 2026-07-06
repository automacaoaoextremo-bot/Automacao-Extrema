import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";

const sections = [
  {
    title: "Manual de Cambonos",
    description:
      "O cambono é médium de desenvolvimento e sustentação energética, auxilia as entidades, apoia consulentes, mantém discrição e sigilo, observa procedimentos, reporta exceções à coordenação e ajuda a garantir segurança, firmeza e proteção durante os trabalhos.",
    items: [
      "Conhecer hábitos e materiais da entidade que irá cambonar.",
      "Ajudar na comunicação da entidade com consulentes, sem distorcer orientações.",
      "Manter sigilo sobre tudo que ouvir ou presenciar.",
      "Levar situações estranhas, exceções ou dúvidas aos coordenadores.",
      "Controlar quantidade e tempo de filhos da corrente para falar com a entidade.",
      "Anotar missões, guias, retornos, pertences e encaminhamentos importantes.",
    ],
  },
  {
    title: "Procedimentos e Orientações Básicas",
    description:
      "A rotina da casa envolve preparo material, alimentação leve, vestuário adequado, banho de defesa, silêncio, entrada no terreiro, defumação, saudação ao Congá, firmeza, respeito às linhas de trabalho e observância das regras durante os atendimentos.",
    items: [
      "Filhos da corrente devem manter silêncio absoluto e pensamento elevado.",
      "Roupa branca, larga, com nome nas costas e cuidado com objetos metálicos.",
      "Preparos como banho de defesa, saudação à ametista, entrada no terreiro e defumação podem virar checklists por atividade.",
      "Nos atendimentos a consulentes, filhos da corrente que estão trabalhando não devem marcar atendimento para si, salvo exceções previstas.",
      "Assuntos tratados com uma entidade não devem ser repetidos com outra para evitar cruzamento de linhas.",
    ],
  },
  {
    title: "Regulamento do Tucxa",
    description:
      "O regulamento define horários, dias de trabalhos, grupos, participação, frequência, regras de eventos, biblioteca, comunicação oficial e deveres de aviso de ausência.",
    items: [
      "Segundas e terças: atendimento aos filhos consulentes, das 18h às 22h, com regras de porta e abertura.",
      "Quartas: transformação, das 18h30 às 22h, mediante encaminhamento e agendamento.",
      "Quintas: filhos da corrente, Grupo I na 1ª e 3ª quinta e Grupo II na 2ª e 4ª quinta.",
      "Apenas cavalinhos, cambonos e equipe da organização participam dos trabalhos de segunda e terça voltados aos consulentes.",
      "Eventos como pizza, bingo e feijoada ajudam reformas, equipamentos, manutenção e confraternização.",
      "É obrigatório participar do grupo oficial Recados TUCXA para comunicações da Diretoria e Organização.",
    ],
  },
  {
    title: "Como isso vira sistema",
    description:
      "As orientações devem aparecer no contexto certo: no calendário, na função da pessoa, no evento, no atendimento e na preparação do dia.",
    items: [
      "Ao abrir uma pessoa com função Cambono, mostrar responsabilidades do cambono.",
      "Ao abrir segunda/terça, mostrar regras de filhos de fora, participantes permitidos e horários.",
      "Ao abrir quinta, mostrar Grupo 1 ou Grupo 2 e responsáveis escalados.",
      "Ao aprovar eventos, mostrar quem solicitou, localidade, finalidade, responsáveis e impacto na agenda.",
      "Ao consultar o dia, mostrar responsabilidades individuais por função, entidade, grupo e atividade.",
    ],
  },
];

export default function OrientacoesPage() {
  return (
    <OrganizacaoClientShell title="Orientações e documentos" description="Biblioteca interna para manter regulamento, procedimentos, manual de cambonos e responsabilidades acessíveis dentro do fluxo de trabalho.">
      <OrganizacaoBaseUnicaSubnav />
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Uso recomendado</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Conteúdo dos documentos dentro da operação</h2>
        <p className="mt-2 max-w-4xl leading-7 text-slate-600">
          A proposta não é esconder os documentos em PDFs soltos. O ideal é transformar cada regra em orientação contextual: no cadastro de função, no calendário, nas atividades, nos atendimentos e nas aprovações.
        </p>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Orientação</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">{section.title}</h2>
            <p className="mt-2 leading-7 text-slate-600">{section.description}</p>
            <ul className="mt-4 space-y-2">
              {section.items.map((item) => <li key={item} className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold leading-6 text-[#00334E] ring-1 ring-emerald-100">{item}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}
