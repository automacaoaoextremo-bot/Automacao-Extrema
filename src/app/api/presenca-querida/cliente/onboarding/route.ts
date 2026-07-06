import { NextResponse } from "next/server";
import { getPresencaAuthContext } from "@/lib/presenca-auth";
import { buildPresencaOnboardingSteps } from "@/lib/presenca-querida";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await getPresencaAuthContext(request);
  if (!auth.ok) return auth.response;

  const { eventId } = auth.context;

  const eventPromise = supabaseAdmin.from("pq_events").select("*").eq("id", eventId).maybeSingle();
  const guestsPromise = supabaseAdmin.from("pq_guests").select("id, group_name, guest_status", { count: "exact", head: false }).eq("event_id", eventId);
  const messagesPromise = supabaseAdmin.from("pq_guest_messages").select("id", { count: "exact", head: true }).eq("event_id", eventId);

  const [eventResult, guestsResult, messagesResult] = await Promise.all([eventPromise, guestsPromise, messagesPromise]);

  if (eventResult.error) return NextResponse.json({ error: eventResult.error.message }, { status: 500 });
  if (guestsResult.error) return NextResponse.json({ error: guestsResult.error.message }, { status: 500 });
  if (messagesResult.error) return NextResponse.json({ error: messagesResult.error.message }, { status: 500 });

  type GuestOnboardingRow = { id: string; group_name: string | null; guest_status: string | null };
  const guests = (guestsResult.data ?? []) as GuestOnboardingRow[];
  const groups = new Set(guests.map((guest: GuestOnboardingRow) => guest.group_name).filter(Boolean));
  const confirmedCount = guests.filter((guest: GuestOnboardingRow) => ["confirmado", "confirmado_com_acompanhantes"].includes(String(guest.guest_status))).length;
  const maybeCount = guests.filter((guest: GuestOnboardingRow) => guest.guest_status === "talvez").length;

  const steps = buildPresencaOnboardingSteps({
    event: eventResult.data,
    guestCount: guests.length,
    groupCount: groups.size,
    confirmedCount,
    maybeCount,
    messageCount: messagesResult.count ?? 0,
  });

  const completed = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done && step.required) ?? steps.find((step) => !step.done) ?? null;

  return NextResponse.json({
    steps,
    progress: {
      total: steps.length,
      completed,
      percentage: Math.round((completed / Math.max(steps.length, 1)) * 100),
      nextStep,
    },
  });
}
