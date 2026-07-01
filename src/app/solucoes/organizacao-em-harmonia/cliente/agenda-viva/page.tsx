import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import {
  AGENDA_VIVA_TUCXA_EVENT_TYPES,
  AGENDA_VIVA_TUCXA_INITIAL_RULES,
  TUCXA_WEEKDAY_SERVICE_RULES,
} from "@/lib/organizacao-em-harmonia";

const agendaSteps = [
  {
    title: "1. Confirmar calendário base",
    description: "Cadastrar ano, grupos, dias de trabalho, períodos de férias, mutirões e encerramentos antes de publicar a agenda.",
  },
  {
    title: "2. Configurar envolvidos por função",
    description: "Associar cavalinhos, cambonos, recepção, organização, entidades e grupos para que cada atividade já mostre quem deve participar.",
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

const nextActivities = [
  { date: "Segunda", label: "Atendimento filhos de fora", detail: "Cavalinhos, cambonos e organização", chip: "bg-rose-100 text-rose-900" },
  { date: "Terça", label: "Atendimento filhos de fora", detail: "Recepção, senhas e fichas individuais", chip: "bg-sky-100 text-sky-900" },
  { date: "Quarta", label: "Transformação", detail: "Apenas encaminhados e agendados", chip: "bg-emerald-100 text-emerald-900" },
  { date: "Quinta", label: "Grupo 1 / Grupo 2", detail: "Conforme 1ª/3ª ou 2ª/4ª quinta", chip: "bg-blue-100 text-blue-900" },
];

const annualLegend = [
  { slug: "fora", label: "Filhos de fora", className: "bg-rose-100 text-rose-900" },
  { slug: "transformacao", label: "Transformação", className: "bg-emerald-100 text-emerald-900" },
  { slug: "grupo1", label: "Grupo 1", className: "bg-green-100 text-green-900" },
  { slug: "grupo2", label: "Grupo 2", className: "bg-sky-100 text-sky-900" },
  { slug: "evento", label: "Evento / mutirão", className: "bg-amber-100 text-amber-900" },
  { slug: "ferias", label: "Férias", className: "bg-slate-100 text-slate-700" },
];

function eventClassForDay(date: Date) {
  const day = date.getDay();
  const dateNumber = date.getDate();
  const month = date.getMonth();
  if (month === 0 && dateNumber <= 28) return "bg-slate-100 text-slate-500";
  if (month === 6 && dateNumber <= 29) return "bg-slate-100 text-slate-500";
  if (month === 11 && dateNumber >= 21) return "bg-slate-100 text-slate-500";
  if (month === 0 && dateNumber === 24) return "bg-amber-100 text-amber-900";
  if (month === 11 && dateNumber === 20) return "bg-amber-100 text-amber-900";
  if (day === 1 || day === 2) return "bg-rose-100 text-rose-900";
  if (day === 3) return "bg-emerald-100 text-emerald-900";
  if (day === 4) {
    const weekOfMonth = Math.ceil(dateNumber / 7);
    return weekOfMonth === 1 || weekOfMonth === 3 ? "bg-green-100 text-green-900" : "bg-sky-100 text-sky-900";
  }
  return "bg-white text-slate-700";
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; className: string }> = [];
  for (let index = 0; index < first.getDay(); index += 1) {
    cells.push({ day: null, className: "bg-transparent" });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ day, className: eventClassForDay(new Date(year, month, day)) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, className: "bg-transparent" });
  }
  return cells;
}

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function OrganizacaoAgendaVivaPage() {
  const year = 2026;

  return (
    <OrganizacaoClientShell
      eyebrow="Agenda Viva"
      title="Calendário vivo, aprovado e fácil de acompanhar"
      description="Comece pelo calendário do Tucxa: grupos, atendimentos, transformação, férias, mutirões, eventos beneficentes e aprovações da diretoria em uma rotina mobile-first."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {agendaSteps.map((item) => (
          <div key={item.title} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
            <h2 className="text-xl font-black text-[#00334E]">{item.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{item.description}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Mobile-first</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">Primeira visão: o que vem agora</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No celular, a agenda deve abrir com os próximos compromissos e permitir tocar no dia para ver responsáveis, cavalinhos, cambonos, recepção, pendências e status de aprovação.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {nextActivities.map((item) => (
            <article key={`${item.date}-${item.label}`} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${item.chip}`}>{item.date}</span>
              <h3 className="mt-3 text-lg font-black text-[#00334E]">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
            </article>
          ))}
        </div>
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
        <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Vínculos operacionais</p>
        <h2 className="mt-2 text-2xl font-black text-[#00334E]">O calendário depende da Base Única</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Cada envolvido pode ser associado como cavalinho, cambono, apoio da recepção, organização, Grupo 1, Grupo 2 ou ambos. Assim, cada atividade já nasce com as pessoas certas vinculadas.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {TUCXA_WEEKDAY_SERVICE_RULES.map((item) => (
            <article key={item.slug} className={`rounded-2xl p-4 text-sm font-semibold leading-6 ring-1 ${item.colorClass}`}>
              <p className="font-black">{item.label}</p>
              <p className="mt-1 font-black">{item.title}</p>
              <p className="mt-2 opacity-80">{item.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[#2F6B43]">Calendário {year}</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">Visão anual compacta</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Mantém a familiaridade com o calendário impresso, mas em formato clicável e filtrável. No mobile, esta visão fica abaixo dos próximos dias e da visão mensal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {annualLegend.map((item) => (
              <span key={item.slug} className={`rounded-full px-3 py-1 text-xs font-black ${item.className}`}>{item.label}</span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {months.map((month, monthIndex) => (
            <article key={month} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <h3 className="text-center text-sm font-black uppercase tracking-[0.18em] text-[#00334E]">{month}</h3>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.68rem] font-black text-slate-400">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthMatrix(year, monthIndex).map((cell, index) => (
                  <span key={`${month}-${index}`} className={`flex aspect-square items-center justify-center rounded-lg text-xs font-bold ring-1 ring-slate-100 ${cell.className}`}>
                    {cell.day ?? ""}
                  </span>
                ))}
              </div>
            </article>
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
    </OrganizacaoClientShell>
  );
}
