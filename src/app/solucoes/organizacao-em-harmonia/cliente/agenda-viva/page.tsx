import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { AGENDA_VIVA_TUCXA_EVENT_TYPES, AGENDA_VIVA_TUCXA_INITIAL_RULES } from "@/lib/organizacao-em-harmonia";

const agendaSteps = [
  {
    title: "1. Confirmar calendário base",
    description: "Cadastrar ano, grupos, dias de trabalho, períodos de férias, mutirões e encerramentos antes de publicar a agenda.",
  },
  {
    title: "2. Configurar tipos de atividade",
    description: "Separar atendimentos, grupos, transformação, estudos, campanhas, eventos beneficentes e reuniões para filtrar e aprovar melhor.",
  },
  {
    title: "3. Definir aprovação",
    description: "Indicar quais funções podem criar, alterar, cancelar e aprovar eventos, com histórico e justificativa nas mudanças importantes.",
  },
  {
    title: "4. Validar conflitos",
    description: "Sinalizar sobreposição de data, local, responsável, período de férias e capacidade da equipe antes de confirmar a atividade.",
  },
];

const views = [
  "Visão anual semelhante ao calendário atual do Tucxa.",
  "Visão mensal mobile-first com filtros por grupo, tipo, responsável e status.",
  "Lista de pendências de aprovação para diretoria e presidência.",
  "Linha do tempo de alterações e decisões para evitar dúvidas em conversas antigas.",
];

export default function OrganizacaoAgendaVivaPage() {
  return (
    <OrganizacaoClientShell
      eyebrow="Agenda Viva"
      title="Calendário vivo, aprovado e fácil de acompanhar"
      description="Comece pelo calendário do Tucxa: grupos, atendimentos, transformação, férias, mutirões, eventos beneficentes e aprovações da diretoria em uma rotina mobile-first."
    >
      <section className="grid gap-4 md:grid-cols-2">
        {agendaSteps.map((item) => (
          <div key={item.title} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
            <h2 className="text-xl font-black text-[#00334E]">{item.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] bg-[#00334E] p-5 text-white shadow sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">Tucxa — validação inicial</p>
        <h2 className="mt-2 text-2xl font-black">Regras mínimas para cadastrar antes dos eventos</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {AGENDA_VIVA_TUCXA_INITIAL_RULES.map((item) => (
            <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 text-white/85">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Tipos de atividade</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Cadastros iniciais sugeridos</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {AGENDA_VIVA_TUCXA_EVENT_TYPES.map((item) => (
            <span key={item} className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-[#17442a] ring-1 ring-emerald-100">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {views.map((item) => (
          <div key={item} className="rounded-3xl bg-white p-5 text-sm font-bold leading-6 text-slate-700 shadow ring-1 ring-slate-100">
            {item}
          </div>
        ))}
      </section>
    </OrganizacaoClientShell>
  );
}
