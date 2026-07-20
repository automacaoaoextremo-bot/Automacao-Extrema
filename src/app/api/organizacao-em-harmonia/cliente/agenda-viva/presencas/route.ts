import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  asRecord,
  eventAllowsPersonGroups,
  eventAllowsThursdayOccurrence,
  eventOverridesRegularThursdaySchedule,
  eventRequiresAttendanceConfirmation,
  eventTargetsAllThursdayGroups,
  eventThursdayGroups,
  type ThursdayGroup,
} from "@/lib/organizacao-em-harmonia/tucxa-scheduling";
import { isMonthOccurrenceAllowed, monthOccurrenceIndex } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";

export const dynamic = "force-dynamic";

const APPROVED = ["aprovado", "ativo", "publicado", "recorrente"];

type EventRow = {
  id: string;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  recurrence_rule: string | null;
  group_slug: string | null;
  event_type: string | null;
  status: string | null;
  active: boolean | null;
  metadata: Record<string, unknown> | null;
};

type MembershipRow = {
  person_id: string;
  active: boolean | null;
  status: string | null;
  agenda_viva_profile: Record<string, unknown> | null;
};

type PersonRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  active: boolean | null;
};

type ConfirmationRow = {
  id: string;
  event_id: string;
  occurrence_date: string;
  person_id: string;
  status: "confirmed" | "cannot_attend";
  responded_at: string | null;
  checked_in_at: string | null;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dateOnly(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function eventMatchesDate(event: EventRow, date: string) {
  const start = dateOnly(event.starts_at);
  if (!start || date < start) return false;
  const end = dateOnly(event.ends_at);
  if (end && end > start && date > end) return false;
  const recurrence = String(event.recurrence_rule ?? "").toUpperCase();
  if (!recurrence) return date === start;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (recurrence.includes("BYDAY=TH") && weekday !== 4) return false;
  if (!recurrence.includes("BYDAY=TH")) return false;
  return isMonthOccurrenceAllowed(event.metadata, date);
}

function profileGroups(profile: Record<string, unknown> | null): ThursdayGroup[] {
  const value = asRecord(profile);
  const text = normalize([
    value.thursdayGroup,
    value.thursday_group,
    value.groupSlug,
    value.group_slug,
    ...(Array.isArray(value.thursdayGroups) ? value.thursdayGroups : []),
  ].join(" "));
  const groups: ThursdayGroup[] = [];
  if (/grupo-?1|grupo i\b/.test(text)) groups.push("grupo-1");
  if (/grupo-?2|grupo ii\b/.test(text)) groups.push("grupo-2");
  return groups;
}

function eventEligibleForOccurrence(event: EventRow, date: string) {
  if (eventTargetsAllThursdayGroups(event) && eventOverridesRegularThursdaySchedule(event)) return true;
  return eventAllowsThursdayOccurrence(event, monthOccurrenceIndex(date));
}

function publicOccurrence(event: EventRow, date: string) {
  const groups = eventThursdayGroups(event);
  return {
    id: `${event.id}:${date}`,
    eventId: event.id,
    title: event.title || "Encontro dos Filhos da Corrente",
    occurrenceDate: date,
    groups: eventTargetsAllThursdayGroups(event) ? ["grupo-1", "grupo-2"] : groups,
    allGroups: eventTargetsAllThursdayGroups(event),
    attendanceRequired: eventRequiresAttendanceConfirmation(event, true),
    allowEntityAppointment: asRecord(event.metadata).allowOptionalEntityAppointment === true
      || asRecord(event.metadata).allow_optional_entity_appointment === true,
  };
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;
  const organizationId = auth.context.organizationId;
  const today = new Date();
  const rangeStart = toIsoDate(addDays(today, -30));
  const rangeEnd = toIsoDate(addDays(today, 240));

  const [eventsResult, membershipsResult, peopleResult, confirmationsResult] = await Promise.all([
    supabaseAdmin
      .from("agv_events")
      .select("id,title,starts_at,ends_at,recurrence_rule,group_slug,event_type,status,active,metadata")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_memberships")
      .select("person_id,active,status,agenda_viva_profile")
      .eq("organization_id", organizationId)
      .eq("active", true),
    supabaseAdmin
      .from("oh_people")
      .select("id,full_name,whatsapp,active")
      .eq("organization_id", organizationId)
      .eq("active", true),
    supabaseAdmin
      .from("oh_event_attendance_confirmations")
      .select("id,event_id,occurrence_date,person_id,status,responded_at,checked_in_at")
      .eq("organization_id", organizationId)
      .gte("occurrence_date", rangeStart)
      .lte("occurrence_date", rangeEnd),
  ]);

  for (const result of [eventsResult, membershipsResult, peopleResult, confirmationsResult]) {
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const memberships = (membershipsResult.data ?? []) as MembershipRow[];
  const people = (peopleResult.data ?? []) as PersonRow[];
  const confirmations = (confirmationsResult.data ?? []) as ConfirmationRow[];
  const peopleMap = new Map(people.map((person) => [person.id, person]));

  const eligible = memberships
    .map((membership) => ({
      membership,
      person: peopleMap.get(membership.person_id),
      groups: profileGroups(membership.agenda_viva_profile),
    }))
    .filter((item) => item.person && item.groups.length > 0);

  const occurrences: ReturnType<typeof publicOccurrence>[] = [];
  for (const event of events) {
    if (event.active === false || !APPROVED.includes(normalize(event.status))) continue;
    if (!eventRequiresAttendanceConfirmation(event, false)) continue;
    for (let cursor = new Date(`${rangeStart}T12:00:00Z`); toIsoDate(cursor) <= rangeEnd; cursor = addDays(cursor, 1)) {
      const date = toIsoDate(cursor);
      if (!eventMatchesDate(event, date) || !eventEligibleForOccurrence(event, date)) continue;
      occurrences.push(publicOccurrence(event, date));
    }
  }

  const response = occurrences
    .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate))
    .map((occurrence) => {
      const event = events.find((item) => item.id === occurrence.eventId)!;
      const rows = eligible
        .filter((item) => eventAllowsPersonGroups(event, item.groups))
        .map((item) => {
          const confirmation = confirmations.find(
            (row) => row.event_id === occurrence.eventId
              && row.occurrence_date === occurrence.occurrenceDate
              && row.person_id === item.person!.id,
          );
          return {
            personId: item.person!.id,
            fullName: item.person!.full_name || "Pessoa sem nome",
            whatsapp: item.person!.whatsapp || "",
            groups: item.groups,
            status: confirmation?.status || "pending",
            respondedAt: confirmation?.responded_at || null,
            checkedInAt: confirmation?.checked_in_at || null,
          };
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
      return {
        ...occurrence,
        people: rows,
        totals: {
          eligible: rows.length,
          confirmed: rows.filter((item) => item.status === "confirmed").length,
          cannotAttend: rows.filter((item) => item.status === "cannot_attend").length,
          pending: rows.filter((item) => item.status === "pending").length,
          checkedIn: rows.filter((item) => item.checkedInAt).length,
        },
      };
    });

  return NextResponse.json({ occurrences: response });
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const eventId = String(body.eventId ?? "");
  const occurrenceDate = String(body.occurrenceDate ?? "");
  const personId = String(body.personId ?? "");
  if (!eventId || !occurrenceDate || !personId) {
    return NextResponse.json({ error: "Informe evento, data e pessoa." }, { status: 400 });
  }

  if (action === "check-in") {
    const checked = body.checked === true;
    const { error } = await supabaseAdmin
      .from("oh_event_attendance_confirmations")
      .update({
        checked_in_at: checked ? new Date().toISOString() : null,
        checked_in_by_person_id: checked ? String(auth.context.person?.id ?? "") || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", auth.context.organizationId)
      .eq("event_id", eventId)
      .eq("occurrence_date", occurrenceDate)
      .eq("person_id", personId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "set-status") {
    const status = String(body.status ?? "");
    if (!['confirmed', 'cannot_attend'].includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("oh_event_attendance_confirmations")
      .upsert({
        organization_id: auth.context.organizationId,
        event_id: eventId,
        occurrence_date: occurrenceDate,
        person_id: personId,
        status,
        responded_at: new Date().toISOString(),
        response_source: "gestao",
        metadata: { updated_by_person_id: auth.context.person?.id ?? null },
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id,event_id,occurrence_date,person_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
}
