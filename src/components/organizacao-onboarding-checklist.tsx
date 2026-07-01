import Link from "next/link";

export type OrganizacaoOnboardingStep = {
  id: string;
  title: string;
  description: string;
  why: string;
  href: string;
  status?: "done" | "pending";
};

export const ORGANIZACAO_ONBOARDING_STEPS: OrganizacaoOnboardingStep[] = [
  {
    id: "organizacao",
    title: "Completar dados da organização",
    description: "Confirme nome, tipo, contato responsável, e-mail, WhatsApp e dados básicos.",
    why: "Evita dúvidas na comunicação e deixa claro quem responde pela configuração inicial.",
    href: "/solucoes/organizacao-em-harmonia/cliente/cadastro",
    status: "pending",
  },
  {
    id: "modulos",
    title: "Definir módulos habilitados",
    description: "Confirme se a validação começa por Agenda Viva e quais módulos entram depois.",
    why: "Ajuda a manter foco e evita tentar configurar tudo ao mesmo tempo.",
    href: "/solucoes/organizacao-em-harmonia/cliente/modulos",
    status: "pending",
  },
  {
    id: "envolvidos",
    title: "Cadastrar envolvidos",
    description: "Inclua diretoria, presidência, coordenadores, cambonos, recepção, tesouraria e demais pessoas.",
    why: "A Base Única evita duplicidade e permite usar as mesmas pessoas em todos os módulos.",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica#envolvidos",
    status: "pending",
  },
  {
    id: "funcoes",
    title: "Configurar funções e permissões",
    description: "Defina quem pode ver, criar, aprovar, editar, cancelar e exportar informações.",
    why: "Reduz risco operacional e respeita a hierarquia de cada organização.",
    href: "/solucoes/organizacao-em-harmonia/cliente/base-unica#funcoes",
    status: "pending",
  },
  {
    id: "agenda",
    title: "Montar calendário inicial no Agenda Viva",
    description: "Cadastre grupos, atendimentos, férias, mutirões, eventos e atividades recorrentes.",
    why: "Transforma conversas soltas em uma agenda clara e aprovada.",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva",
    status: "pending",
  },
  {
    id: "aprovacoes",
    title: "Definir aprovação de atividades",
    description: "Configure quem aprova inclusões e alterações de eventos, ações e atividades.",
    why: "Evita conflitos de calendário e mantém diretoria/presidência no controle.",
    href: "/solucoes/organizacao-em-harmonia/cliente/configuracoes",
    status: "pending",
  },
  {
    id: "treinamento",
    title: "Treinar envolvidos principais",
    description: "Faça um teste com responsáveis antes de iniciar a avaliação como Cliente Fundador.",
    why: "A avaliação de 30 dias deve começar com a solução pronta para ser usada.",
    href: "/solucoes/organizacao-em-harmonia/cliente/relatorios",
    status: "pending",
  },
];

export function OrganizacaoOnboardingChecklist({ steps = ORGANIZACAO_ONBOARDING_STEPS }: { steps?: OrganizacaoOnboardingStep[] }) {
  const completed = steps.filter((step) => step.status === "done").length;
  const percentage = Math.round((completed / Math.max(steps.length, 1)) * 100);

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#2F6B43] sm:text-sm">Configuração inicial</p>
          <h2 className="mt-2 text-2xl font-black text-[#00334E] sm:text-3xl">Checklist para começar com segurança</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            Complete os passos essenciais para a Organização em Harmonia funcionar com clareza para diretoria, responsáveis e envolvidos. A avaliação de Cliente Fundador deve começar somente após a configuração e treinamento mínimos.
          </p>
        </div>
        <div className="rounded-3xl bg-emerald-50 px-6 py-4 text-center ring-1 ring-emerald-100">
          <p className="text-3xl font-black text-[#00334E]">{percentage}%</p>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">concluído</p>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#31C16B]" style={{ width: `${percentage}%` }} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {steps.map((step) => {
          const done = step.status === "done";
          return (
            <article key={step.id} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
              <div className="flex gap-4">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${done ? "border-[#31C16B] bg-[#31C16B] text-[#00334E]" : "border-slate-200 bg-white text-slate-400"}`}>
                  {done ? "✓" : ""}
                </span>
                <div>
                  <h3 className="text-lg font-black text-[#00334E]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  <p className="mt-3 text-xs font-semibold leading-5 text-slate-500"><strong>Por que importa:</strong> {step.why}</p>
                  <Link href={step.href} className="mt-4 inline-flex font-black text-[#00334E] underline decoration-[#31C16B] decoration-2 underline-offset-4">
                    Resolver agora
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
