import { NextResponse } from "next/server";
import { buildPublicConfirmationUrl, DANIELA50_REMINDER_SCHEDULE } from "@/lib/presenca-daniela50";
import { sendPresencaReminderDigestEmail } from "@/lib/mail";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ReminderItem = { date: string; label: string; status: "confirmado" | "talvez" | "pendente" };

type EventRow = {
  id: string;
  name: string;
  slug: string;
};

type GuestRow = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  relationship_label: string | null;
  relationship_context: string | null;
  guest_status: string;
  individual_token: string | null;
};

function authOk(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const authHeader = request.headers.get("authorization");
  const token = new URL(request.url).searchParams.get("token");
  return authHeader === `Bearer ${cronSecret}` || token === cronSecret;
}

function todayInSaoPaulo() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function allReminders(): ReminderItem[] {
  return [
    ...DANIELA50_REMINDER_SCHEDULE.confirmed.map((item) => ({ ...item, status: "confirmado" as const })),
    ...DANIELA50_REMINDER_SCHEDULE.maybe.map((item) => ({ ...item, status: "talvez" as const })),
    ...DANIELA50_REMINDER_SCHEDULE.pending.map((item) => ({ ...item, status: "pendente" as const })),
  ];
}

function statusesForReminder(status: ReminderItem["status"]) {
  if (status === "confirmado") return ["confirmado", "confirmado_com_acompanhantes"];
  if (status === "talvez") return ["talvez"];
  return ["pendente", "reservou_data"];
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

async function loadDanielaEvent() {
  const { data, error } = await supabaseAdmin.from("pq_events").select("id,name,slug").eq("slug", "daniela-50-anos").maybeSingle();
  if (error) throw error;
  return data as EventRow | null;
}

async function loadGuests(event: EventRow, reminder: ReminderItem) {
  const { data, error } = await supabaseAdmin
    .from("pq_guests")
    .select("id,full_name,email,whatsapp,relationship_label,relationship_context,guest_status,individual_token")
    .eq("event_id", event.id)
    .eq("is_active", true)
    .in("guest_status", statusesForReminder(reminder.status))
    .or("is_invite_recipient.eq.true,whatsapp.not.is.null")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as GuestRow[];
}

async function handle(request: Request) {
  if (!authOk(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const url = new URL(request.url);
  const baseDate = url.searchParams.get("date") || todayInSaoPaulo();
  const dueReminders = allReminders().filter((item) => addDays(item.date, -2) === baseDate);

  if (dueReminders.length === 0) {
    return NextResponse.json({ ok: true, date: baseDate, reminders: [], message: "Nenhum lembrete com aviso interno para hoje." });
  }

  const event = await loadDanielaEvent();
  if (!event) return NextResponse.json({ ok: false, date: baseDate, error: "Evento Daniela 50 anos não localizado." }, { status: 404 });

  const results = [];

  for (const reminder of dueReminders) {
    const guests = await loadGuests(event, reminder);
    const emailResult = await sendPresencaReminderDigestEmail({
      eventName: event.name,
      eventSlug: event.slug,
      reminderDate: reminder.date,
      reminderLabel: reminder.label,
      targetStatus: reminder.status,
      guests: guests.map((guest) => ({
        name: guest.full_name,
        whatsapp: guest.whatsapp,
        email: guest.email,
        relationship: guest.relationship_label || guest.relationship_context,
        status: guest.guest_status,
        inviteUrl: guest.individual_token ? buildPublicConfirmationUrl({ baseUrl: siteUrl(), event, token: guest.individual_token }) : null,
      })),
    });

    results.push({ reminder, guests: guests.length, email: emailResult });
  }

  return NextResponse.json({ ok: true, date: baseDate, results });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
