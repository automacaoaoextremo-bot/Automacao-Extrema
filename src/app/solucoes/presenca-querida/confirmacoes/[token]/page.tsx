import { AeSolutionHeader } from "@/components/ae-solution-header";
import { DANIELA50_REMINDER_SCHEDULE } from "@/lib/presenca-daniela50";
import { formatDateBR, PRESENCA_GUEST_STATUS_LABELS, type PresencaGuestStatus } from "@/lib/presenca-querida";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Params = { token: string };

type EventRow = {
  id: string;
  name: string | null;
  slug: string | null;
  host_name: string | null;
  event_date: string | null;
  event_time: string | null;
  venue_name: string | null;
  public_confirmation_enabled?: boolean | null;
};

type GuestRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  group_name: string | null;
  relationship_label: string | null;
  relationship_context: string | null;
  guest_status: PresencaGuestStatus | string | null;
  adults_count: number | null;
  children_count: number | null;
  primary_guest_id: string | null;
  household_label: string | null;
  is_invite_recipient: boolean | null;
  confirmed_at: string | null;
  updated_at?: string | null;
  is_active: boolean | null;
};

type PublicGuestItem = {
  id: string;
  name: string;
  phoneLabel: string;
  groupLabel: string;
  relationshipLabel: string;
  invitationType: string;
  status: PresencaGuestStatus;
  statusLabel: string;
  confirmedAt: string | null;
  adults: number;
  children: number;
};

type ReminderTarget = "todos" | "confirmado" | "talvez" | "pendente";

type ReminderPlan = {
  date: string;
  label: string;
  targetStatus: ReminderTarget;
  audience: string;
};

type StatusSection = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  count: number;
  items: PublicGuestItem[];
  cardClassName: string;
  badgeClassName: string;
};

const STATUS_STYLE: Record<string, string> = {
  confirmado: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  confirmado_com_acompanhantes: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  talvez: "bg-amber-50 text-amber-800 ring-amber-100",
  pendente: "bg-slate-50 text-slate-700 ring-slate-200",
  reservou_data: "bg-slate-50 text-slate-700 ring-slate-200",
  nao_podera_ir: "bg-red-50 text-red-700 ring-red-100",
  remover: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

const REMINDER_STYLE: Record<ReminderTarget, string> = {
  todos: "bg-sky-50 text-sky-800 ring-sky-100",
  confirmado: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  talvez: "bg-amber-50 text-amber-800 ring-amber-100",
  pendente: "bg-slate-50 text-slate-700 ring-slate-200",
};

function normalizeStatus(status: unknown): PresencaGuestStatus {
  const value = String(status ?? "pendente").trim() as PresencaGuestStatus;
  if (["pendente", "reservou_data", "talvez", "confirmado", "confirmado_com_acompanhantes", "nao_podera_ir", "remover"].includes(value)) return value;
  return "pendente";
}

function isConfirmed(status: PresencaGuestStatus) {
  return status === "confirmado" || status === "confirmado_com_acompanhantes";
}

function isPending(status: PresencaGuestStatus) {
  return status === "pendente" || status === "reservou_data";
}

function hasAnswered(status: PresencaGuestStatus) {
  return isConfirmed(status) || status === "talvez" || status === "nao_podera_ir";
}

function integerBR(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function percentBR(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)}%`;
}

function formatDateTimeBR(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maskPhone(value: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "Sem WhatsApp";
  if (digits.length <= 4) return "WhatsApp cadastrado";
  return `WhatsApp ••••${digits.slice(-4)}`;
}

function reminderPlans(): ReminderPlan[] {
  const plans: ReminderPlan[] = [
    {
      date: "2026-07-01",
      label: "Envio do primeiro convite oficial para todos",
      targetStatus: "todos",
      audience: "Todos os convidados ativos que recebem convite",
    },
    ...DANIELA50_REMINDER_SCHEDULE.confirmed.map((item): ReminderPlan => ({
      date: item.date,
      label: item.label,
      targetStatus: "confirmado",
      audience: "Convidados confirmados",
    })),
    ...DANIELA50_REMINDER_SCHEDULE.maybe.map((item): ReminderPlan => ({
      date: item.date,
      label: item.label,
      targetStatus: "talvez",
      audience: "Convidados marcados como talvez",
    })),
    ...DANIELA50_REMINDER_SCHEDULE.pending.map((item): ReminderPlan => ({
      date: item.date,
      label: item.label,
      targetStatus: "pendente",
      audience: "Convidados pendentes",
    })),
  ];

  return plans.sort((a, b) => a.date.localeCompare(b.date));
}

function countReminderTarget(plan: ReminderPlan, guests: GuestRow[]) {
  const activeGuests = guests.filter((guest) => guest.is_active !== false);
  if (plan.targetStatus === "todos") return activeGuests.filter((guest) => guest.is_invite_recipient !== false || Boolean(guest.whatsapp)).length;
  if (plan.targetStatus === "confirmado") return activeGuests.filter((guest) => isConfirmed(normalizeStatus(guest.guest_status))).length;
  if (plan.targetStatus === "talvez") return activeGuests.filter((guest) => normalizeStatus(guest.guest_status) === "talvez").length;
  return activeGuests.filter((guest) => isPending(normalizeStatus(guest.guest_status))).length;
}

function buildItems(guests: GuestRow[]) {
  return guests
    .filter((guest) => guest.is_active !== false)
    .map((guest): PublicGuestItem => {
      const status = normalizeStatus(guest.guest_status);
      return {
        id: guest.id,
        name: guest.full_name || "Convidado",
        phoneLabel: maskPhone(guest.whatsapp),
        groupLabel: guest.household_label || guest.group_name || "Sem grupo",
        relationshipLabel: guest.relationship_label || guest.relationship_context || "—",
        invitationType: guest.primary_guest_id ? "Vinculado" : "Principal",
        status,
        statusLabel: PRESENCA_GUEST_STATUS_LABELS[status] ?? "Pendente",
        confirmedAt: guest.confirmed_at,
        adults: Number(guest.adults_count ?? 1),
        children: Number(guest.children_count ?? 0),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function summarize(items: PublicGuestItem[]) {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;
      acc.adults += item.adults;
      acc.children += item.children;
      if (isConfirmed(item.status)) acc.confirmed += 1;
      else if (item.status === "talvez") acc.maybe += 1;
      else if (item.status === "nao_podera_ir") acc.declined += 1;
      else acc.pending += 1;
      return acc;
    },
    { total: 0, confirmed: 0, maybe: 0, pending: 0, declined: 0, adults: 0, children: 0 },
  );
}

function buildStatusSections(items: PublicGuestItem[]): StatusSection[] {
  const confirmed = items.filter((item) => isConfirmed(item.status));
  const maybe = items.filter((item) => item.status === "talvez");
  const pending = items.filter((item) => isPending(item.status));
  const declined = items.filter((item) => item.status === "nao_podera_ir");

  return [
    {
      id: "confirmados",
      title: "Confirmados",
      shortTitle: "Sim",
      description: "Pessoas que já confirmaram presença.",
      count: confirmed.length,
      items: confirmed,
      cardClassName: "bg-emerald-50 ring-emerald-100",
      badgeClassName: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    },
    {
      id: "talvez",
      title: "Talvez",
      shortTitle: "Talvez",
      description: "Pessoas que ainda podem retornar.",
      count: maybe.length,
      items: maybe,
      cardClassName: "bg-amber-50 ring-amber-100",
      badgeClassName: "bg-amber-100 text-amber-900 ring-amber-200",
    },
    {
      id: "pendentes",
      title: "Pendentes",
      shortTitle: "Pend.",
      description: "Pessoas que ainda não responderam.",
      count: pending.length,
      items: pending,
      cardClassName: "bg-slate-50 ring-slate-200",
      badgeClassName: "bg-white text-slate-800 ring-slate-200",
    },
    {
      id: "nao-irao",
      title: "Não poderão ir",
      shortTitle: "Não",
      description: "Pessoas que avisaram que não poderão comparecer.",
      count: declined.length,
      items: declined,
      cardClassName: "bg-red-50 ring-red-100",
      badgeClassName: "bg-red-100 text-red-900 ring-red-200",
    },
  ];
}

function GuestCard({ guest, compact = false }: { guest: PublicGuestItem; compact?: boolean }) {
  return (
    <article className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-base font-black leading-snug text-[#00334E]">{guest.name}</h3>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">
            {guest.invitationType} • {guest.groupLabel}
          </p>
          {!compact && <p className="mt-1 break-words text-xs text-slate-500">{guest.relationshipLabel}</p>}
        </div>
        <span className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ${STATUS_STYLE[guest.status] ?? STATUS_STYLE.pendente}`}>{guest.statusLabel}</span>
      </div>
      {!compact && (
        <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-2">
          <p>Resposta: {formatDateTimeBR(guest.confirmedAt)}</p>
          <p>{guest.phoneLabel}</p>
        </div>
      )}
    </article>
  );
}

async function loadPublicConfirmationData(token: string) {
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from("pq_events")
    .select("id, name, slug, host_name, event_date, event_time, venue_name, public_confirmation_enabled")
    .eq("public_confirmation_token", token)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  const event = eventData as EventRow | null;
  if (!event || event.public_confirmation_enabled === false) return null;

  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .select("id,full_name,whatsapp,group_name,relationship_label,relationship_context,guest_status,adults_count,children_count,primary_guest_id,household_label,is_invite_recipient,confirmed_at,is_active")
    .eq("event_id", event.id)
    .order("is_invite_recipient", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);

  const guests = (data ?? []) as GuestRow[];
  const items = buildItems(guests);
  const summary = summarize(items);
  const responseRate = summary.total > 0 ? Math.round(((summary.confirmed + summary.maybe + summary.declined) / summary.total) * 100) : 0;
  const reminders = reminderPlans().map((plan) => ({ ...plan, targetCount: countReminderTarget(plan, guests) }));

  return { event, items, summary, responseRate, reminders };
}

export default async function PresencaConfirmacoesPublicasPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const data = await loadPublicConfirmationData(token);

  if (!data) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#fffaf8] text-slate-800">
        <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Confirmações" actions={[]} sectionLinks={[]} />
        <section className="mx-auto w-full max-w-3xl px-4 py-12">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-rose-100">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#E85D75]">Confirmações</p>
            <h1 className="mt-2 break-words text-3xl font-black text-[#00334E]">Link não localizado</h1>
            <p className="mt-3 leading-7 text-slate-600">Confira se o link foi copiado corretamente ou solicite um novo link para a pessoa responsável pelo evento.</p>
          </div>
        </section>
      </main>
    );
  }

  const { event, items, summary, responseRate, reminders } = data;
  const statusSections = buildStatusSections(items);
  const respondedItems = items.filter((item) => hasAnswered(item.status));
  const latestRespondedItems = [...respondedItems].sort((a, b) => String(b.confirmedAt ?? "").localeCompare(String(a.confirmedAt ?? ""))).slice(0, 12);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Confirmações" actions={[]} sectionLinks={[]} />

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-5 sm:gap-5 sm:px-5 sm:py-8">
        <div className="min-w-0 rounded-[1.6rem] bg-white p-4 shadow-xl ring-1 ring-rose-100 sm:rounded-[2rem] sm:p-7">
          <p className="break-words text-xs font-black uppercase tracking-[0.2em] text-[#E85D75] sm:text-sm sm:tracking-[0.3em]">Acompanhamento público</p>
          <div className="mt-3 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-end">
            <div className="min-w-0">
              <h1 className="max-w-full break-words text-[2rem] font-black leading-[1.08] text-[#00334E] sm:text-4xl lg:text-5xl">Confirmações de presença</h1>
              <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 break-words text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                <span>{event.name || "Evento"}</span>
                {event.event_date && <span>• {formatDateBR(event.event_date)}</span>}
                {event.event_time && <span>• {event.event_time}</span>}
              </p>
            </div>
            <div className="w-full rounded-2xl bg-[#fff7f4] px-4 py-4 text-left ring-1 ring-rose-100 sm:text-center lg:w-auto">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Taxa de resposta</p>
              <p className="mt-1 text-3xl font-black text-[#00334E]">{percentBR(responseRate)}</p>
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">
            Link somente leitura. Não permite alterar respostas, limpar testes, editar convidados ou executar ações administrativas.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-6">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs sm:tracking-[0.18em]">Total</p>
            <p className="mt-2 text-3xl font-black text-[#00334E]">{integerBR(summary.total)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 shadow-sm ring-1 ring-emerald-100">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-emerald-700 sm:text-xs sm:tracking-[0.18em]">Confirmados</p>
            <p className="mt-2 text-3xl font-black text-emerald-900">{integerBR(summary.confirmed)}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 shadow-sm ring-1 ring-amber-100">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-amber-700 sm:text-xs sm:tracking-[0.18em]">Talvez</p>
            <p className="mt-2 text-3xl font-black text-amber-900">{integerBR(summary.maybe)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.18em]">Pendentes</p>
            <p className="mt-2 text-3xl font-black text-slate-800">{integerBR(summary.pending)}</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 shadow-sm ring-1 ring-red-100">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-red-700 sm:text-xs sm:tracking-[0.18em]">Não irão</p>
            <p className="mt-2 text-3xl font-black text-red-800">{integerBR(summary.declined)}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100 lg:col-span-1">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs sm:tracking-[0.18em]">Pessoas previstas</p>
            <p className="mt-2 text-2xl font-black text-[#00334E]">A:{integerBR(summary.adults)} C:{integerBR(summary.children)}</p>
          </div>
        </div>

        <section className="min-w-0 rounded-[1.6rem] bg-white p-4 shadow-xl ring-1 ring-rose-100 sm:rounded-[2rem] sm:p-7">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#E85D75] sm:text-sm sm:tracking-[0.25em]">Já responderam</p>
              <h2 className="mt-2 break-words text-2xl font-black text-[#00334E] sm:text-3xl">Nomes das pessoas com resposta registrada</h2>
            </div>
            <p className="text-sm font-bold text-slate-500">{integerBR(respondedItems.length)} resposta(s)</p>
          </div>

          {latestRespondedItems.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {latestRespondedItems.map((guest) => (
                <GuestCard key={guest.id} guest={guest} compact />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-bold leading-6 text-slate-600 ring-1 ring-slate-200">
              Nenhuma resposta registrada ainda. Assim que alguém confirmar, marcar talvez ou avisar que não poderá ir, o nome aparece aqui.
            </div>
          )}
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="min-w-0 rounded-[1.6rem] bg-white p-4 shadow-xl ring-1 ring-rose-100 sm:rounded-[2rem] sm:p-7">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#E85D75] sm:text-sm sm:tracking-[0.25em]">Convidados</p>
                <h2 className="mt-2 break-words text-2xl font-black text-[#00334E] sm:text-3xl">Status por grupo</h2>
              </div>
              <p className="text-sm font-bold text-slate-500">{integerBR(items.length)} convidado(s)</p>
            </div>

            <div className="mt-5 grid min-w-0 gap-4">
              {statusSections.map((section) => (
                <article key={section.id} className={`min-w-0 rounded-[1.4rem] p-4 ring-1 ${section.cardClassName}`}>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden">{section.shortTitle}</p>
                      <h3 className="break-words text-xl font-black text-[#00334E]">{section.title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{section.description}</p>
                    </div>
                    <span className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-3 text-sm font-black ring-1 ${section.badgeClassName}`}>{integerBR(section.count)}</span>
                  </div>

                  <div className="mt-4 grid min-w-0 gap-3">
                    {section.items.length > 0 ? (
                      section.items.map((guest) => <GuestCard key={guest.id} guest={guest} />)
                    ) : (
                      <p className="rounded-2xl bg-white/75 p-4 text-sm font-bold text-slate-500 ring-1 ring-white/80">Nenhuma pessoa neste status.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.6rem] bg-white p-4 shadow-xl ring-1 ring-rose-100 sm:rounded-[2rem] sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#E85D75] sm:text-sm sm:tracking-[0.25em]">Próximos envios</p>
            <h2 className="mt-2 break-words text-2xl font-black text-[#00334E] sm:text-3xl">Lembretes previstos</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Calendário de acompanhamento para convites, pendentes, talvez e confirmados.</p>

            <div className="mt-5 grid min-w-0 gap-3">
              {reminders.map((reminder) => (
                <article key={`${reminder.date}-${reminder.targetStatus}-${reminder.label}`} className="min-w-0 rounded-2xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{formatDateBR(reminder.date)}</p>
                      <h3 className="mt-1 break-words font-black text-[#00334E]">{reminder.label}</h3>
                    </div>
                    <span className={`inline-flex w-fit max-w-full rounded-full px-3 py-1 text-xs font-black ring-1 ${REMINDER_STYLE[reminder.targetStatus]}`}>{reminder.audience}</span>
                  </div>
                  <p className="mt-3 text-xs font-bold leading-5 text-slate-600">Quantidade atual nesse público: {integerBR(reminder.targetCount)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
