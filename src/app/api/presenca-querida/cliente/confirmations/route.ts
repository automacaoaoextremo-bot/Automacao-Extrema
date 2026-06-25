import { NextResponse } from "next/server";
import { DANIELA50_REMINDER_SCHEDULE } from "@/lib/presenca-daniela50";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { PRESENCA_GUEST_STATUS_LABELS, type PresencaGuestStatus } from "@/lib/presenca-querida";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type GuestRow = {
  id: string;
  event_id: string;
  full_name: string;
  email: string | null;
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
  dietary_notes: string | null;
  notes: string | null;
  individual_token: string | null;
  invited_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  is_active: boolean | null;
};

type ReminderTarget = "todos" | "confirmado" | "talvez" | "pendente";

type ReminderPlan = {
  date: string;
  label: string;
  targetStatus: ReminderTarget;
  audience: string;
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

function todaySaoPaulo() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysUntil(dateValue: string) {
  const today = new Date(`${todaySaoPaulo()}T12:00:00Z`);
  const target = new Date(`${dateValue}T12:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function operationalStatus(dateValue: string) {
  const days = daysUntil(dateValue);
  if (days < 0) return "Vencido / conferir execução";
  if (days === 0) return "Previsto para hoje";
  if (days <= 2) return "Atenção: próximo envio";
  return "Planejado";
}

function allReminderPlans(): ReminderPlan[] {
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

function countTarget(plan: ReminderPlan, guests: GuestRow[]) {
  const activeGuests = guests.filter((guest) => guest.is_active !== false);
  if (plan.targetStatus === "todos") return activeGuests.filter((guest) => guest.is_invite_recipient !== false || Boolean(guest.whatsapp)).length;
  if (plan.targetStatus === "confirmado") return activeGuests.filter((guest) => isConfirmed(normalizeStatus(guest.guest_status))).length;
  if (plan.targetStatus === "talvez") return activeGuests.filter((guest) => normalizeStatus(guest.guest_status) === "talvez").length;
  return activeGuests.filter((guest) => isPending(normalizeStatus(guest.guest_status))).length;
}

function summarize(guests: GuestRow[]) {
  return guests.reduce(
    (acc, guest) => {
      if (guest.is_active === false) {
        acc.inactive += 1;
        return acc;
      }

      acc.total += 1;
      const status = normalizeStatus(guest.guest_status);
      if (isConfirmed(status)) acc.confirmed += 1;
      else if (status === "talvez") acc.maybe += 1;
      else if (status === "nao_podera_ir") acc.declined += 1;
      else acc.pending += 1;

      if (guest.primary_guest_id) acc.linked += 1;
      else acc.principal += 1;

      acc.adults += Number(guest.adults_count ?? 1);
      acc.children += Number(guest.children_count ?? 0);
      return acc;
    },
    { total: 0, confirmed: 0, maybe: 0, pending: 0, declined: 0, inactive: 0, principal: 0, linked: 0, adults: 0, children: 0 },
  );
}

export async function GET(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .select(
      "id,event_id,full_name,email,whatsapp,group_name,relationship_label,relationship_context,guest_status,adults_count,children_count,primary_guest_id,household_label,is_invite_recipient,dietary_notes,notes,individual_token,invited_at,confirmed_at,created_at,is_active",
    )
    .eq("event_id", auth.context.eventId)
    .order("is_invite_recipient", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const guests = (data ?? []) as GuestRow[];
  const summary = summarize(guests);
  const guestsById = new Map(guests.map((guest) => [guest.id, guest]));

  const normalizedGuests = guests.map((guest) => {
    const status = normalizeStatus(guest.guest_status);
    const primary = guest.primary_guest_id ? guestsById.get(guest.primary_guest_id) : null;
    return {
      ...guest,
      guest_status: status,
      status_label: PRESENCA_GUEST_STATUS_LABELS[status] ?? status,
      invitation_type: guest.primary_guest_id ? "Convidado vinculado" : "Convidado principal",
      primary_guest_name: primary?.full_name ?? null,
      has_answered: isConfirmed(status) || status === "talvez" || status === "nao_podera_ir",
    };
  });

  const reminders = allReminderPlans().map((plan) => ({
    ...plan,
    internalAlertDate: addDays(plan.date, -2),
    targetCount: countTarget(plan, guests),
    operationalStatus: operationalStatus(plan.date),
    daysUntil: daysUntil(plan.date),
  }));

  return NextResponse.json({
    ok: true,
    event: auth.context.event,
    summary,
    guests: normalizedGuests,
    reminders,
    statusLabels: PRESENCA_GUEST_STATUS_LABELS,
  });
}
