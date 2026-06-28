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
      <main className="min-h-screen bg-[#fffaf8] text-slate-800">
        <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Confirmações" actions={[]} sectionLinks={[]} />
        <section className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-rose-100">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#E85D75]">Confirmações</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Link não localizado</h1>
            <p className="mt-3 leading-7 text-slate-600">Confira se o link foi copiado corretamente ou solicite um novo link para a pessoa responsável pelo evento.</p>
          </div>
        </section>
      </main>
    );
  }

  const { event, items, summary, responseRate, reminders } = data;

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Confirmações" actions={[]} sectionLinks={[]} />

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Acompanhamento público</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">Confirmações de presença</h1>
              <p className="mt-2 leading-7 text-slate-600">
                {event.name || "Evento"} {event.event_date ? `• ${formatDateBR(event.event_date)}` : ""} {event.event_time ? `• ${event.event_time}` : ""}
              </p>
            </div>
            <div className="rounded-2xl bg-[#fff7f4] px-5 py-4 text-center ring-1 ring-rose-100">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Taxa de resposta</p>
              <p className="mt-1 text-3xl font-black text-[#00334E]">{percentBR(responseRate)}</p>
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600">
            Link somente leitura. Não permite alterar respostas, limpar testes, editar convidados ou executar ações administrativas.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
            <p className="mt-2 text-3xl font-black text-[#00334E]">{integerBR(summary.total)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 shadow-sm ring-1 ring-emerald-100">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Confirmados</p>
            <p className="mt-2 text-3xl font-black text-emerald-900">{integerBR(summary.confirmed)}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 shadow-sm ring-1 ring-amber-100">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Talvez</p>
            <p className="mt-2 text-3xl font-black text-amber-900">{integerBR(summary.maybe)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Pendentes</p>
            <p className="mt-2 text-3xl font-black text-slate-800">{integerBR(summary.pending)}</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 shadow-sm ring-1 ring-red-100">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Não irão</p>
            <p className="mt-2 text-3xl font-black text-red-800">{integerBR(summary.declined)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Pessoas</p>
            <p className="mt-2 text-2xl font-black text-[#00334E]">A:{integerBR(summary.adults)} C:{integerBR(summary.children)}</p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#E85D75]">Convidados</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Status de presença</h2>
              </div>
              <p className="text-sm font-bold text-slate-500">{integerBR(items.length)} convidado(s)</p>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl ring-1 ring-rose-100">
              <table className="min-w-[820px] w-full bg-white text-left text-sm">
                <thead className="bg-[#fff7f4] text-xs uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Resposta</th>
                    <th className="px-4 py-3">Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {items.map((guest) => (
                    <tr key={guest.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-black text-[#00334E]">{guest.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{guest.relationshipLabel}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold text-slate-700">{guest.invitationType}</p>
                        <p className="mt-1 text-xs text-slate-500">{guest.groupLabel}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${STATUS_STYLE[guest.status] ?? STATUS_STYLE.pendente}`}>{guest.statusLabel}</span>
                      </td>
                      <td className="px-4 py-4 align-top text-xs font-bold text-slate-600">{formatDateTimeBR(guest.confirmedAt)}</td>
                      <td className="px-4 py-4 align-top text-xs font-bold text-slate-600">{guest.phoneLabel}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm font-bold text-slate-500">Nenhum convidado ativo encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#E85D75]">Próximos envios</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">Lembretes previstos</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Calendário de acompanhamento para convites, pendentes, talvez e confirmados.</p>

            <div className="mt-5 grid gap-3">
              {reminders.map((reminder) => (
                <article key={`${reminder.date}-${reminder.targetStatus}-${reminder.label}`} className="rounded-2xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{formatDateBR(reminder.date)}</p>
                      <h3 className="mt-1 font-black text-[#00334E]">{reminder.label}</h3>
                    </div>
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${REMINDER_STYLE[reminder.targetStatus]}`}>{reminder.audience}</span>
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
