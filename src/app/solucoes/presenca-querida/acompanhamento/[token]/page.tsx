import Link from "next/link";
import { AeSolutionHeader } from "@/components/ae-solution-header";
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
  public_approval_enabled?: boolean | null;
};

type GuestRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  group_name: string | null;
  relationship_label: string | null;
  relationship_context: string | null;
  is_active: boolean | null;
  is_invite_recipient?: boolean | null;
  primary_guest_id?: string | null;
};

type MessageRow = {
  id: string;
  guest_id: string | null;
  message_phase: string | null;
  template_label: string | null;
  status: string | null;
  approval_status: string | null;
  is_active: boolean | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  guest: GuestRow | GuestRow[] | null;
};

type PublicApprovalItem = {
  key: string;
  guestName: string;
  phoneLabel: string;
  groupLabel: string;
  relationshipLabel: string;
  status: "aprovado" | "reprovado" | "pendente" | "inativo" | "sem_convite";
  statusLabel: string;
  phaseLabel: string;
  updatedAt: string | null;
};

const STATUS_STYLE: Record<PublicApprovalItem["status"], string> = {
  aprovado: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  reprovado: "bg-amber-50 text-amber-800 ring-amber-100",
  pendente: "bg-rose-50 text-rose-800 ring-rose-100",
  inativo: "bg-slate-100 text-slate-600 ring-slate-200",
  sem_convite: "bg-sky-50 text-sky-800 ring-sky-100",
};

const PHASE_LABELS: Record<string, string> = {
  save_the_date: "Save the Date",
  convite_oficial: "Convite oficial",
  lembrete: "Lembrete",
  orientacao_final: "Orientação final",
  agradecimento: "Agradecimento",
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeApprovalStatus(message: MessageRow): PublicApprovalItem["status"] {
  if (message.is_active === false) return "inativo";
  const status = String(message.approval_status ?? message.status ?? "pendente").trim().toLowerCase();
  if (status === "aprovado") return "aprovado";
  if (status === "reprovado" || status === "revisar") return "reprovado";
  return "pendente";
}

function statusLabel(status: PublicApprovalItem["status"]) {
  if (status === "aprovado") return "Aprovado";
  if (status === "reprovado") return "Reprovado";
  if (status === "inativo") return "Inativo";
  if (status === "sem_convite") return "Sem convite";
  return "Pendente";
}

function maskPhone(value: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "Sem WhatsApp";
  if (digits.length <= 4) return "WhatsApp cadastrado";
  const last = digits.slice(-4);
  return `WhatsApp ••••${last}`;
}

function formatDateBR(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
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

function integerBR(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function buildItems(messages: MessageRow[], guests: GuestRow[]) {
  const messageItems = messages.map((message): PublicApprovalItem => {
    const guest = firstRelation(message.guest);
    const status = normalizeApprovalStatus(message);
    return {
      key: `message-${message.id}`,
      guestName: guest?.full_name || "Convidado",
      phoneLabel: maskPhone(guest?.whatsapp ?? null),
      groupLabel: guest?.group_name || "Sem grupo",
      relationshipLabel: guest?.relationship_label || guest?.relationship_context || "—",
      status,
      statusLabel: statusLabel(status),
      phaseLabel: PHASE_LABELS[String(message.message_phase ?? "")] || message.template_label || "Mensagem",
      updatedAt: message.approved_at ?? message.rejected_at ?? message.updated_at ?? message.created_at,
    };
  });

  const guestsWithMessages = new Set(messages.map((message) => message.guest_id).filter(Boolean));
  const guestsWithoutMessages = guests
    .filter((guest) => !guestsWithMessages.has(guest.id))
    .map((guest): PublicApprovalItem => ({
      key: `guest-${guest.id}`,
      guestName: guest.full_name || "Convidado",
      phoneLabel: maskPhone(guest.whatsapp),
      groupLabel: guest.group_name || "Sem grupo",
      relationshipLabel: guest.relationship_label || guest.relationship_context || "—",
      status: "sem_convite",
      statusLabel: "Sem convite",
      phaseLabel: "Convite ainda não gerado",
      updatedAt: null,
    }));

  return [...messageItems, ...guestsWithoutMessages].sort((a, b) => a.guestName.localeCompare(b.guestName, "pt-BR"));
}

function buildTotals(items: PublicApprovalItem[]) {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.status === "aprovado") acc.approved += 1;
      if (item.status === "pendente") acc.pending += 1;
      if (item.status === "reprovado") acc.rejected += 1;
      if (item.status === "inativo") acc.inactive += 1;
      if (item.status === "sem_convite") acc.withoutInvite += 1;
      return acc;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0, inactive: 0, withoutInvite: 0 },
  );
}

async function loadPublicApprovalData(token: string) {
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from("pq_events")
    .select("id, name, slug, host_name, event_date, event_time, public_approval_enabled")
    .eq("public_approval_token", token)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  const event = eventData as EventRow | null;
  if (!event || event.public_approval_enabled === false) return null;

  const messagesPromise = supabaseAdmin
    .from("pq_guest_messages")
    .select(
      `
      id,
      guest_id,
      message_phase,
      template_label,
      status,
      approval_status,
      is_active,
      approved_at,
      rejected_at,
      created_at,
      updated_at,
      guest:pq_guests(id, full_name, whatsapp, group_name, relationship_label, relationship_context, is_active)
    `,
    )
    .eq("event_id", event.id)
    .not("guest_id", "is", null)
    .eq("message_phase", "convite_oficial")
    .order("created_at", { ascending: false });

  const guestsPromise = supabaseAdmin
    .from("pq_guests")
    .select("id, full_name, whatsapp, group_name, relationship_label, relationship_context, is_active, is_invite_recipient, primary_guest_id")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .eq("is_invite_recipient", true)
    .is("primary_guest_id", null)
    .order("full_name", { ascending: true });

  const [messagesResult, guestsResult] = await Promise.all([messagesPromise, guestsPromise]);
  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (guestsResult.error) throw new Error(guestsResult.error.message);

  const items = buildItems((messagesResult.data ?? []) as MessageRow[], (guestsResult.data ?? []) as GuestRow[]);
  return { event, items, totals: buildTotals(items) };
}

export default async function PresencaAcompanhamentoPublicoPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const data = await loadPublicApprovalData(token);

  if (!data) {
    return (
      <main className="min-h-screen bg-[#fffaf8] text-slate-800">
        <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Acompanhamento" actions={[]} sectionLinks={[]} />
        <section className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-rose-100">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#E85D75]">Acompanhamento</p>
            <h1 className="mt-2 text-3xl font-black text-[#00334E]">Link não localizado</h1>
            <p className="mt-3 leading-7 text-slate-600">Confira se o link foi copiado corretamente ou solicite um novo link para a pessoa responsável pelo evento.</p>
          </div>
        </section>
      </main>
    );
  }

  const { event, items, totals } = data;
  const approvedRate = totals.total > 0 ? Math.round((totals.approved / totals.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#fffaf8] text-slate-800">
      <AeSolutionHeader solutionName="Presença Querida" logoSrc="/presenca-querida-logo.svg" logoAlt="Logo Presença Querida" homeHref="/solucoes/presenca-querida" navLabel="Acompanhamento" actions={[]} sectionLinks={[]} />

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Acompanhamento público</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-tight text-[#00334E] sm:text-4xl">Aprovação dos convites</h1>
              <p className="mt-2 max-w-3xl leading-7 text-slate-600">
                Visão somente leitura dos convites personalizados do evento {event.name || "Presença Querida"}. Este link não permite aprovar, reprovar, editar ou excluir informações.
              </p>
            </div>
            {event.slug && (
              <Link href={`/solucoes/presenca-querida/evento/${event.slug}`} className="inline-flex w-fit rounded-2xl bg-[#00334E] px-5 py-3 text-sm font-black text-white">
                Ver landing da festa
              </Link>
            )}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-rose-400">Total</p><p className="mt-1 text-2xl font-black text-[#00334E]">{integerBR(totals.total)}</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Aprovados</p><p className="mt-1 text-2xl font-black text-[#00334E]">{integerBR(totals.approved)}</p></div>
            <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-rose-400">Pendentes</p><p className="mt-1 text-2xl font-black text-[#00334E]">{integerBR(totals.pending)}</p></div>
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Reprovados</p><p className="mt-1 text-2xl font-black text-[#00334E]">{integerBR(totals.rejected)}</p></div>
            <div className="rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-200"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Inativos</p><p className="mt-1 text-2xl font-black text-[#00334E]">{integerBR(totals.inactive)}</p></div>
            <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100"><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Sem convite</p><p className="mt-1 text-2xl font-black text-[#00334E]">{integerBR(totals.withoutInvite)}</p></div>
          </div>
          <div className="mt-5 rounded-2xl bg-[#f4fbf7] p-4 ring-1 ring-emerald-100">
            <p className="text-sm font-black text-[#00334E]">Progresso de aprovação: {approvedRate}%</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white ring-1 ring-emerald-100">
              <div className="h-full rounded-full bg-[#31C16B]" style={{ width: `${approvedRate}%` }} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-rose-100">
          <div className="border-b border-rose-100 p-5 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">Lista de aprovações</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Telefone parcialmente oculto e ações administrativas removidas por segurança.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-rose-100 text-left text-sm">
              <thead className="bg-[#fff7f4] text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Convidado</th>
                  <th className="px-5 py-3">Grupo/relação</th>
                  <th className="px-5 py-3">Mensagem</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Atualização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100">
                {items.map((item) => (
                  <tr key={item.key} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-black text-[#00334E]">{item.guestName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.phoneLabel}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-700">{item.groupLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.relationshipLabel}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{item.phaseLabel}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${STATUS_STYLE[item.status]}`}>{item.statusLabel}</span></td>
                    <td className="px-5 py-4 text-slate-600">{formatDateTimeBR(item.updatedAt)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center font-bold text-slate-500">Nenhum convite personalizado encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[2rem] bg-[#00334E] p-5 text-white sm:p-7">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#9bd8b0]">Evento</p>
          <h2 className="mt-2 text-2xl font-black">{event.name || "Presença Querida"}</h2>
          <p className="mt-2 text-white/80">Data: {formatDateBR(event.event_date)}{event.event_time ? ` · ${event.event_time}` : ""}</p>
        </div>
      </section>
    </main>
  );
}
