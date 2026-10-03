import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  confirmationDeadlineIso,
  confirmationTokenHash,
  createConfirmationToken,
  currentPilotReception,
  expirePastPilotConfirmations,
  loadPilotAppointments,
  loadPilotDates,
  loadPilotDay,
  loadPilotPersonPreferences,
  loadPilotSettings,
  monthOccurrence,
  normalizeBrazilPhone,
  PILOT_ACTIVE_STATUSES,
  pilotReservationError,
  pilotWeekday,
  savePilotPersonPreferences,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaAppointmentWhatsapp, sendTucxaEntityChangeWhatsapp } from "@/lib/botconversa";
import { sendTucxaAppointmentAuditEmail } from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { appointmentConfirmationMessage, appointmentReminderMessage, TUCXA_INDIVIDUAL_NOTICE } from "@/lib/organizacao-em-harmonia/tucxa-appointment-messages";

export const dynamic = "force-dynamic";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "sim", "yes"].includes(value.toLowerCase());
  return fallback;
}

function normalizeSearchText(value: unknown) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function receptionConsulentePerson(person: Record<string, unknown>) {
  const email = asText(person.notification_email)
    || (asText(person.email).endsWith("@organizacao-em-harmonia.local") ? "" : asText(person.email));

  return {
    id: asText(person.id),
    fullName: asText(person.full_name),
    whatsapp: normalizeBrazilPhone(person.normalized_whatsapp || person.whatsapp),
    email,
  };
}

async function loadReceptionConsulentes(organizationId: string) {
  const { data: people, error: peopleError } = await supabaseAdmin
    .from("oh_people")
    .select("id,full_name,whatsapp,email,notification_email,active,normalized_whatsapp,registration_source")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .limit(1500);
  if (peopleError) throw peopleError;

  const personIds = (people ?? []).map((person) => asText(person.id)).filter(Boolean);
  const { data: memberships, error: membershipError } = personIds.length
    ? await supabaseAdmin
        .from("oh_memberships")
        .select("person_id,active,status,agenda_viva_profile")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .in("person_id", personIds)
    : { data: [], error: null };
  if (membershipError) throw membershipError;

  const membershipMap = new Map<string, Array<Record<string, unknown>>>();
  for (const membership of memberships ?? []) {
    const personId = asText(membership.person_id);
    if (!personId) continue;
    const current = membershipMap.get(personId) ?? [];
    current.push(membership as Record<string, unknown>);
    membershipMap.set(personId, current);
  }

  return (people ?? [])
    .filter((person) => {
      const personId = asText(person.id);
      const personMemberships = membershipMap.get(personId) ?? [];
      if (!personMemberships.length) return true;
      if (normalizeSearchText(person.registration_source).includes("recepcao")) return true;

      return personMemberships.some((membership) => {
        const profileText = normalizeSearchText(JSON.stringify(asRecord(membership.agenda_viva_profile)));
        return profileText.includes("consulente")
          || profileText.includes("filho-de-fora")
          || profileText.includes("filho de fora");
      });
    })
    .sort((left, right) => asText(left.full_name).localeCompare(asText(right.full_name), "pt-BR"));
}

async function loadPilotExtraSettings(organizationId: string) {
  const { data, error } = await supabaseAdmin.from("oh_module_settings").select("settings").eq("organization_id", organizationId).eq("module_slug", "atendimento-em-harmonia").maybeSingle();
  if (error) throw error;
  const raw = asRecord(data?.settings);
  return {
    enforceArrivalWindow: asBoolean(raw.pilotEnforceArrivalWindow, true),
    cavalinhoDailyWhatsappEnabled: asBoolean(raw.pilotCavalinhoDailyWhatsappEnabled, false),
    cavalinhoDailyWhatsappTime: asText(raw.pilotCavalinhoDailyWhatsappTime) || "12:00",
    receptionDailyWhatsappEnabled: asBoolean(raw.pilotReceptionDailyWhatsappEnabled, false),
    receptionDailyWhatsappTime: asText(raw.pilotReceptionDailyWhatsappTime) || "12:00",
    automaticDispatchWeekdays: Array.isArray(raw.pilotAutomaticDispatchWeekdays)
      ? Array.from(new Set(raw.pilotAutomaticDispatchWeekdays.map(Number).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6))).sort((a, b) => a - b)
      : [0, 1, 2, 3, 4, 5, 6],
  };
}

function hourList(value: unknown) {
  const source = Array.isArray(value) ? value : asText(value).split(/[;,\s]+/);
  const parsed = source
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0 && item <= 720)
    .map((item) => Math.round(item));
  return Array.from(new Set(parsed)).sort((a, b) => b - a).slice(0, 8);
}

function occurrenceList(value: unknown) {
  if (!Array.isArray(value)) return [] as number[];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 4),
    ),
  ).sort((a, b) => a - b);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "entidade";
}

function requestId() {
  return crypto.randomUUID().slice(0, 8);
}

function currentSaoPauloMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(map.hour || 0) * 60 + Number(map.minute || 0);
}

function siteUrl() {
  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (process.env.VERCEL_ENV === "preview" && vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function confirmationUrl(token: string) {
  return `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/confirmar-agendamento/${encodeURIComponent(token)}`;
}

function whatsappUrl(phone: string, message = "") {
  const digits = normalizeBrazilPhone(phone);
  if (!digits) return "";
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${international}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

async function loadEntityContacts(organizationId: string, entityIds: string[]) {
  if (!entityIds.length) return new Map<string, { personId: string; name: string; whatsapp: string }[]>();
  const { data: links, error: linkError } = await supabaseAdmin
    .from("oh_person_entity_links")
    .select("entity_id, person_id, active")
    .eq("organization_id", organizationId)
    .eq("relationship_type", "recebe")
    .eq("active", true)
    .in("entity_id", entityIds);
  if (linkError) throw linkError;
  const personIds = Array.from(new Set((links ?? []).map((item) => asText(item.person_id)).filter(Boolean)));
  const { data: people, error: peopleError } = personIds.length
    ? await supabaseAdmin
        .from("oh_people")
        .select("id, full_name, whatsapp")
        .eq("organization_id", organizationId)
        .in("id", personIds)
    : { data: [], error: null };
  if (peopleError) throw peopleError;
  const peopleMap = new Map<string, { personId: string; name: string; whatsapp: string }>(
    (people ?? []).map((person) => [
      asText(person.id),
      { personId: asText(person.id), name: asText(person.full_name), whatsapp: asText(person.whatsapp) },
    ]),
  );
  const output = new Map<string, { personId: string; name: string; whatsapp: string }[]>();
  for (const link of links ?? []) {
    const entityId = asText(link.entity_id);
    const person = peopleMap.get(asText(link.person_id));
    if (!entityId || !person) continue;
    const current = output.get(entityId) ?? [];
    current.push(person);
    output.set(entityId, current);
  }
  return output;
}

type EntityAvailableDate = {
  date: string;
  label: string;
  available: number;
  capacity: number;
};

async function loadEntityAvailableDatesIndex(
  organizationId: string,
  daysAhead: number,
  confirmationCutoff: string,
) {
  const dates = await loadPilotDates(organizationId, daysAhead);
  const result = new Map<string, EntityAvailableDate[]>();
  if (!dates.length) return result;

  const startDate = dates[0].date;
  const endDate = dates[dates.length - 1].date;

  const [scheduleResult, entityResult, overrideResult, appointmentResult] = await Promise.all([
    supabaseAdmin
      .from("oh_tucxa_pilot_entity_schedule")
      .select("entity_id,weekday,month_occurrence,default_capacity,active")
      .eq("organization_id", organizationId)
      .eq("active", true),
    supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id,name,daily_capacity,active,appointment_enabled")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .eq("appointment_enabled", true),
    supabaseAdmin
      .from("oh_tucxa_pilot_entity_overrides")
      .select("entity_id,starts_on,ends_on,available,capacity,reason,created_at")
      .eq("organization_id", organizationId)
      .lte("starts_on", endDate)
      .gte("ends_on", startDate)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("oh_consulente_appointments")
      .select("entity_id,appointment_date,status")
      .eq("organization_id", organizationId)
      .gte("appointment_date", startDate)
      .lte("appointment_date", endDate)
      .in("status", PILOT_ACTIVE_STATUSES),
  ]);

  if (scheduleResult.error) throw scheduleResult.error;
  if (entityResult.error) throw entityResult.error;
  if (overrideResult.error) throw overrideResult.error;
  if (appointmentResult.error) throw appointmentResult.error;

  const entityMap = new Map<string, Record<string, unknown>>(
    (entityResult.data ?? []).map((entity) => [asText(entity.id), asRecord(entity)]),
  );
  const schedulesByKey = new Map<string, Array<{ entityId: string; defaultCapacity: number }>>();
  for (const row of scheduleResult.data ?? []) {
    const entityId = asText(row.entity_id);
    const weekday = asText(row.weekday);
    const occurrence = Number(row.month_occurrence);
    if (!entityId || !weekday || !Number.isInteger(occurrence)) continue;
    const key = `${weekday}:${occurrence}`;
    const current = schedulesByKey.get(key) ?? [];
    current.push({
      entityId,
      defaultCapacity: Math.max(1, Number(row.default_capacity ?? 4) || 4),
    });
    schedulesByKey.set(key, current);
  }

  const overridesByEntity = new Map<string, Array<Record<string, unknown>>>();
  for (const row of overrideResult.data ?? []) {
    const entityId = asText(row.entity_id);
    if (!entityId) continue;
    const current = overridesByEntity.get(entityId) ?? [];
    current.push(asRecord(row));
    overridesByEntity.set(entityId, current);
  }

  const bookedByEntityDate = new Map<string, number>();
  for (const row of appointmentResult.data ?? []) {
    const entityId = asText(row.entity_id);
    const appointmentDate = asText(row.appointment_date);
    if (!entityId || !appointmentDate) continue;
    const key = `${entityId}:${appointmentDate}`;
    bookedByEntityDate.set(key, (bookedByEntityDate.get(key) ?? 0) + 1);
  }

  for (const date of dates) {
    // A Recepção pode criar novos agendamentos mesmo depois do horário limite
    // de confirmação. O cutoff vale para a resposta do Consulente, não para
    // ocultar vagas da operação interna.
    void confirmationCutoff;
    const weekday = pilotWeekday(date.date);
    const occurrence = monthOccurrence(date.date);
    if (!weekday || occurrence < 1 || occurrence > 4) continue;

    const schedules = schedulesByKey.get(`${weekday}:${occurrence}`) ?? [];
    for (const schedule of schedules) {
      const entity = entityMap.get(schedule.entityId);
      if (!entity) continue;

      const override = (overridesByEntity.get(schedule.entityId) ?? []).find((item) => {
        const startsOn = asText(item.starts_on);
        const endsOn = asText(item.ends_on);
        return startsOn <= date.date && endsOn >= date.date;
      });

      if (override && override.available === false) continue;

      const capacity = Math.max(
        1,
        Number(override?.capacity ?? schedule.defaultCapacity ?? entity["daily_capacity"] ?? 4) || 4,
      );
      const booked = bookedByEntityDate.get(`${schedule.entityId}:${date.date}`) ?? 0;
      const available = Math.max(capacity - booked, 0);
      if (available < 1) continue;

      const current = result.get(schedule.entityId) ?? [];
      current.push({
        date: date.date,
        label: date.label,
        available,
        capacity,
      });
      result.set(schedule.entityId, current);
    }
  }

  return result;
}

type ReceptionSummary = {
  mode: "date" | "future" | "period" | "before";
  date: string;
  fromDate: string;
  scheduled: number;
  confirmed: number;
  unconfirmed: number;
  arrived: number;
};

function summarizeAppointments(appointments: Array<{ status?: string; confirmationStatus?: string; arrivalStatus?: string }>, mode: ReceptionSummary["mode"], date: string, fromDate: string): ReceptionSummary {
  const active = appointments.filter((item) => asText(item.status) !== "cancelado");
  return { mode, date, fromDate, scheduled: active.length, confirmed: active.filter((item) => asText(item.confirmationStatus) === "confirmed").length, unconfirmed: active.filter((item) => asText(item.confirmationStatus) !== "confirmed").length, arrived: active.filter((item) => asText(item.arrivalStatus) === "arrived").length };
}

async function loadReceptionSummary(organizationId: string, mode: ReceptionSummary["mode"], requestedDate?: string, requestedDateTo?: string): Promise<ReceptionSummary> {
  const today = todayInSaoPaulo();
  const date = asText(requestedDate) || today;
  const dateTo = asText(requestedDateTo);
  let query = supabaseAdmin.from("oh_consulente_appointments").select("status,confirmation_status,arrival_status").eq("organization_id", organizationId);

  if (mode === "future") query = query.gte("appointment_date", today);
  else if (mode === "period") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo) || dateTo < date) throw new Error("Informe um período válido no formato dd/mm/aaaa.");
    query = query.gte("appointment_date", date).lte("appointment_date", dateTo);
  } else if (mode === "before") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) throw new Error("Informe a data limite no formato dd/mm/aaaa.");
    query = query.lt("appointment_date", dateTo);
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Informe uma data válida no formato dd/mm/aaaa.");
    query = query.eq("appointment_date", date);
  }

  const { data, error } = await query;
  if (error) throw error;
  const appointments = (data ?? []).map((item) => ({ status: asText(item.status), confirmationStatus: asText(item.confirmation_status), arrivalStatus: asText(item.arrival_status) }));
  return summarizeAppointments(appointments, mode, mode === "before" ? dateTo : date, mode === "future" ? today : date);
}

async function buildPayload(organizationId: string, receptionPersonId: string, selectedDate?: string) {
  await expirePastPilotConfirmations(organizationId);
  const settings = await loadPilotSettings(organizationId);
  const extraSettings = await loadPilotExtraSettings(organizationId);
  const dates = await loadPilotDates(organizationId, settings.daysAhead);
  const selected = dates.some((item) => item.date === selectedDate) ? selectedDate! : dates[0]?.date || todayInSaoPaulo();

  const [entities, appointments, receptionPreferences, catalogRows, scheduleRows, membershipsRows] = await Promise.all([
    loadPilotDay(organizationId, selected),
    loadPilotAppointments(organizationId, selected, selected),
    loadPilotPersonPreferences(organizationId, receptionPersonId),
    supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id,name,slug,daily_capacity,active,appointment_enabled,appointment_notes,notes,pilot_cavalinho_whatsapp_enabled")
      .eq("organization_id", organizationId)
      .order("name"),
    supabaseAdmin
      .from("oh_tucxa_pilot_entity_schedule")
      .select("entity_id,weekday,month_occurrence,default_capacity,active")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_memberships")
      .select("person_id,agenda_viva_profile,active")
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);

  if (catalogRows.error) throw catalogRows.error;
  if (scheduleRows.error) throw scheduleRows.error;
  if (membershipsRows.error) throw membershipsRows.error;

  const catalogEntityIds = (catalogRows.data ?? []).map((item) => asText(item.id)).filter(Boolean);
  const contacts = await loadEntityContacts(organizationId, catalogEntityIds);
  const scheduleMap = new Map<string, { mondayOccurrences: number[]; tuesdayOccurrences: number[] }>();
  for (const row of scheduleRows.data ?? []) {
    const entityId = asText(row.entity_id);
    if (!entityId) continue;
    const current = scheduleMap.get(entityId) ?? { mondayOccurrences: [], tuesdayOccurrences: [] };
    const occurrence = Number(row.month_occurrence);
    if (row.weekday === "segunda" && occurrence >= 1 && occurrence <= 4) current.mondayOccurrences.push(occurrence);
    if (row.weekday === "terca" && occurrence >= 1 && occurrence <= 4) current.tuesdayOccurrences.push(occurrence);
    scheduleMap.set(entityId, current);
  }

  const entityCatalog = (catalogRows.data ?? []).map((entity) => {
    const schedule = scheduleMap.get(asText(entity.id)) ?? { mondayOccurrences: [], tuesdayOccurrences: [] };
    return {
      id: asText(entity.id),
      name: asText(entity.name),
      slug: asText(entity.slug),
      description: asText(entity.appointment_notes) || asText(entity.notes),
      capacity: Math.max(1, Number(entity.daily_capacity ?? 4) || 4),
      active: entity.active !== false,
      appointmentEnabled: entity.appointment_enabled !== false,
      cavalinhoWhatsappEnabled: entity.pilot_cavalinho_whatsapp_enabled === true,
      mondayOccurrences: Array.from(new Set(schedule.mondayOccurrences)).sort((a, b) => a - b),
      tuesdayOccurrences: Array.from(new Set(schedule.tuesdayOccurrences)).sort((a, b) => a - b),
      mediums: (contacts.get(asText(entity.id)) ?? []).map((item) => ({ ...item, whatsappUrl: whatsappUrl(item.whatsapp) })),
    };
  });

  const cavalinhoIds = Array.from(new Set(
    (membershipsRows.data ?? [])
      .filter((membership) => {
        const profile = asRecord(membership.agenda_viva_profile);
        const kind = asText(profile.pilotAccessKind).toLowerCase();
        const supports = profile.supportsCavalinho === true || profile.isCavalinho === true;
        const functions = Array.isArray(profile.functions)
          ? profile.functions.map((item) => asText(asRecord(item).slug || item).toLowerCase())
          : [];
        return kind === "cavalinho" || supports || functions.some((item) => item.includes("cavalinho"));
      })
      .map((membership) => asText(membership.person_id))
      .filter(Boolean),
  ));
  const { data: cavalinhoPeople, error: cavalinhoError } = cavalinhoIds.length
    ? await supabaseAdmin.from("oh_people").select("id,full_name,whatsapp,active").eq("organization_id", organizationId).eq("active", true).in("id", cavalinhoIds).order("full_name")
    : { data: [], error: null };
  if (cavalinhoError) throw cavalinhoError;
  const cavalinhos = (cavalinhoPeople ?? []).map((person) => ({
    id: asText(person.id),
    name: asText(person.full_name),
    whatsapp: asText(person.whatsapp),
  }));

  const summary = summarizeAppointments(
    appointments,
    "date",
    selected,
    selected,
  );

  return {
    settings: { ...settings, ...extraSettings },
    dates,
    selectedDate: selected,
    summary,
    entities: entities.map((entity) => ({
      ...entity,
      mediums: (contacts.get(entity.id) ?? []).map((item) => ({ ...item, whatsappUrl: whatsappUrl(item.whatsapp) })),
    })),
    entityCatalog,
    cavalinhos,
    appointments,
    receptionPreferences,
  };
}

export async function GET(request: Request) {
  const code = requestId();
  try {
    const context = await currentPilotReception(request);
    if (!context) {
      return NextResponse.json({ error: "Seu acesso não possui permissão de Recepção para este piloto.", requestId: code }, { status: 403 });
    }
    const url = new URL(request.url);
    const date = asText(url.searchParams.get("date"));
    const payload = await buildPayload(context.organizationId, context.personId, date);
    return NextResponse.json({
      ok: true,
      profile: { fullName: context.fullName, canManage: context.canManage },
      ...payload,
    });
  } catch (error) {
    console.error("[TUCXA piloto recepcao GET]", { requestId: code, error });
    return NextResponse.json({ error: "Não foi possível carregar o piloto de agendamentos.", requestId: code }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const code = requestId();
  try {
    const context = await currentPilotReception(request);
    if (!context?.canManage) {
      return NextResponse.json({ error: "Seu acesso não possui permissão para gerir o piloto.", requestId: code }, { status: 403 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);
    const settings = await loadPilotSettings(context.organizationId);

    if (action === "summary") {
      const requestedMode = asText(body.mode);
      const mode: ReceptionSummary["mode"] = ["future", "period", "before"].includes(requestedMode) ? requestedMode as ReceptionSummary["mode"] : "date";
      const date = asText(body.date);
      const dateTo = asText(body.dateTo);
      const summary = await loadReceptionSummary(context.organizationId, mode, date, dateTo);
      return NextResponse.json({ ok: true, summary });
    }

    if (action === "entity-overview") {
      const availability = await loadEntityAvailableDatesIndex(
        context.organizationId,
        settings.daysAhead,
        settings.confirmationCutoff,
      );
      const { data: entities, error: entityError } = await supabaseAdmin
        .from("oh_spiritual_entities")
        .select("id,name")
        .eq("organization_id", context.organizationId)
        .eq("active", true)
        .eq("appointment_enabled", true)
        .order("name");
      if (entityError) throw entityError;

      return NextResponse.json({
        ok: true,
        entities: (entities ?? []).map((entity) => {
          const entityId = asText(entity.id);
          const next = availability.get(entityId)?.[0] ?? null;
          return {
            entityId,
            name: asText(entity.name),
            nextDate: next?.date ?? "",
            nextLabel: next?.label ?? "",
            available: next?.available ?? 0,
            capacity: next?.capacity ?? 0,
          };
        }),
      });
    }

    if (action === "entity-available-dates") {
      const entityId = asText(body.entityId);
      if (!entityId) {
        return NextResponse.json({ error: "Informe a Entidade.", requestId: code }, { status: 400 });
      }
      const availability = await loadEntityAvailableDatesIndex(
        context.organizationId,
        settings.daysAhead,
        settings.confirmationCutoff,
      );
      return NextResponse.json({
        ok: true,
        entityId,
        dates: availability.get(entityId) ?? [],
      });
    }

    if (action === "next-available-date") {
      const entityId = asText(body.entityId);
      if (!entityId) {
        return NextResponse.json({ error: "Informe a Entidade.", requestId: code }, { status: 400 });
      }

      const dates = await loadPilotDates(context.organizationId, settings.daysAhead);
      for (const date of dates) {
        const dayEntities = await loadPilotDay(context.organizationId, date.date);
        const entity = dayEntities.find((item) => item.id === entityId);
        if (!entity || !entity.isAvailable || entity.available < 1) continue;
        return NextResponse.json({
          ok: true,
          date: date.date,
          label: date.label,
          entity: {
            id: entity.id,
            name: entity.name,
            available: entity.available,
            capacity: entity.capacity,
          },
        });
      }

      return NextResponse.json({ error: "Não encontramos uma próxima data com vaga para esta Entidade no período disponível.", requestId: code }, { status: 404 });
    }

    if (action === "book") {
      const targetPersonId = asText(body.targetPersonId);
      const entityId = asText(body.entityId);
      const appointmentDate = asText(body.appointmentDate);
      const notes = asText(body.notes);
      if (!targetPersonId || !entityId || !appointmentDate) {
        return NextResponse.json({ error: "Informe a pessoa, a data e a Entidade.", requestId: code }, { status: 400 });
      }

      // O cutoff limita a confirmação do Consulente, não a criação pela Recepção.
      // Se a Recepção agendar após o horário, a reserva continua válida e pendente;
      // a política de cancelamento automático é controlada separadamente.
      const deadline = confirmationDeadlineIso(appointmentDate, settings.confirmationCutoff);

      const { data: person, error: personError } = await supabaseAdmin
        .from("oh_people")
        .select("id, full_name, whatsapp, email, notification_email, active")
        .eq("organization_id", context.organizationId)
        .eq("id", targetPersonId)
        .eq("active", true)
        .maybeSingle();
      if (personError) throw personError;
      if (!person?.id) return NextResponse.json({ error: "Cadastro do Filho de Fora/Consulente não localizado.", requestId: code }, { status: 404 });

      const contactMode = asText(body.contactMode) === "alternate" ? "alternate" : "consulente";
      const personPreferences = await loadPilotPersonPreferences(context.organizationId, person.id);
      const dayEntities = await loadPilotDay(context.organizationId, appointmentDate);

      if (contactMode !== "alternate" && personPreferences.defaultEntityId && !personPreferences.allowDifferentEntity) {
        const requiredEntity = dayEntities.find((item) => item.id === personPreferences.defaultEntityId);
        const { data: defaultEntityRow, error: defaultEntityError } = await supabaseAdmin
          .from("oh_spiritual_entities")
          .select("id,name")
          .eq("organization_id", context.organizationId)
          .eq("id", personPreferences.defaultEntityId)
          .maybeSingle();
        if (defaultEntityError) throw defaultEntityError;

        const defaultEntityName = asText(defaultEntityRow?.name) || "a Entidade padrão cadastrada";

        const selectedEntity = dayEntities.find((item) => item.id === entityId);
        const selectedIsPasse = /passe/i.test(asText(selectedEntity?.name));
        const defaultUnavailable = !requiredEntity || !requiredEntity.isAvailable || requiredEntity.available < 1;

        if (defaultUnavailable && !selectedIsPasse) {
          return NextResponse.json(
            {
              error: `${asText(person.full_name) || "Este Consulente"} possui ${defaultEntityName} como Entidade padrão, mas ela não atende ou não possui vaga nesta data. Se houver vaga, a Recepção pode selecionar Passe.`,
              requestId: code,
            },
            { status: 409 },
          );
        }

        if (!defaultUnavailable && entityId !== personPreferences.defaultEntityId) {
          return NextResponse.json(
            {
              error: `${asText(person.full_name) || "Este Consulente"} possui ${defaultEntityName} como Entidade padrão e não está autorizado a escolher outra Entidade.`,
              requestId: code,
            },
            { status: 409 },
          );
        }
      }

      const entity = dayEntities.find((item) => item.id === entityId);
      if (!entity) return NextResponse.json({ error: "A Entidade escolhida não está prevista para esta data.", requestId: code }, { status: 409 });
      if (!entity.isAvailable) return NextResponse.json({ error: entity.suspendedReason || "Atendimento suspenso para esta Entidade.", requestId: code }, { status: 409 });
      if (entity.available < 1) return NextResponse.json({ error: "Não há vagas disponíveis para esta Entidade nesta data.", requestId: code }, { status: 409 });

      const token = createConfirmationToken();
      const tokenHash = confirmationTokenHash(token);
      const actualEmail = asText(person.notification_email) || (asText(person.email).endsWith("@organizacao-em-harmonia.local") ? "" : asText(person.email));
      const ownPhone = normalizeBrazilPhone(person.whatsapp);
      const alternateContactName = asText(body.contactName);
      const alternateContactRelationship = asText(body.contactRelationship);
      if (contactMode === "alternate" && (!alternateContactName || !alternateContactRelationship)) {
        return NextResponse.json({ error: "Informe o nome e o parentesco/vínculo da pessoa para quem o agendamento será realizado.", requestId: code }, { status: 400 });
      }
      if (ownPhone.length < 10) {
        return NextResponse.json({ error: "O Consulente já cadastrado precisa possuir um WhatsApp válido para receber as informações do agendamento.", requestId: code }, { status: 400 });
      }

      const appointmentPersonName = contactMode === "alternate" ? alternateContactName : (asText(person.full_name) || "Consulente");
      const notificationPhone = ownPhone;
      const notificationName = asText(person.full_name) || "Consulente";
      const { data: reservationData, error: reservationError } = await supabaseAdmin.rpc("oh_tucxa_pilot_reserve_appointment", {
        p_organization_id: context.organizationId,
        // Quando o agendamento é para outra pessoa, o titular do WhatsApp é
        // somente o contato de referência. person_id fica nulo para que a
        // regra de unicidade por pessoa/data não confunda os dois atendimentos.
        p_person_id: contactMode === "alternate" ? null : person.id,
        p_entity_id: entityId,
        p_appointment_date: appointmentDate,
        p_scheduled_by_person_id: context.personId,
        p_booking_channel: "recepcao_piloto",
        p_consulente_name: appointmentPersonName || "Filho de Fora/Consulente",
        p_whatsapp: notificationPhone || null,
        p_email: actualEmail || null,
        p_notes: notes || null,
        p_confirmation_token_hash: tokenHash,
        p_confirmation_expires_at: deadline,
        p_appointment_time: settings.appointmentTime,
      });
      if (reservationError) throw reservationError;
      const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as {
        appointment_id?: string;
        confirmed_order?: number;
        confirmed_capacity?: number;
        confirmed_status?: string;
      } | null;
      if (!reservation?.appointment_id) throw new Error("Reserva criada sem identificador.");

      const { error: contactUpdateError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          source_contact_person_id: person.id,
          notification_contact_type: contactMode,
          notification_contact_name: notificationName,
          notification_contact_relationship: contactMode === "alternate" ? (alternateContactRelationship || null) : null,
          notification_contact_whatsapp: notificationPhone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", context.organizationId)
        .eq("id", reservation.appointment_id);
      if (contactUpdateError) throw contactUpdateError;

      if (contactMode === "alternate") {
        const { error: relationshipError } = await supabaseAdmin.from("oh_tucxa_consulente_relationships").upsert({
          organization_id: context.organizationId,
          owner_person_id: person.id,
          related_name: alternateContactName,
          relationship: alternateContactRelationship,
          default_entity_id: entityId,
          created_by_person_id: context.personId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id,owner_person_id,related_name" });
        if (relationshipError) console.error("[TUCXA vínculo de terceiro]", relationshipError);
      }

      const link = confirmationUrl(token);
      const whatsappDispatch = notificationPhone
        ? await sendTucxaAppointmentWhatsapp({
            kind: "confirmation",
            fullName: appointmentPersonName,
            recipientName: notificationName,
            whatsapp: notificationPhone,
            appointmentDate,
            entityName: entity.name,
            confirmationUrl: link,
            appointmentOrder: Number(reservation.confirmed_order ?? 0) || null,
            individualNotice: TUCXA_INDIVIDUAL_NOTICE,
          })
        : { sent: false, provider: "disabled" as const, error: "Telefone não informado." };

      if (!whatsappDispatch.sent) {
        console.warn("[TUCXA piloto BotConversa envio] confirmação automática não enviada", {
          appointmentId: reservation.appointment_id,
          provider: whatsappDispatch.provider,
          error: whatsappDispatch.error,
          steps: "steps" in whatsappDispatch ? whatsappDispatch.steps : undefined,
        });
      }

      if (whatsappDispatch.sent) {
        const { error: sentUpdateError } = await supabaseAdmin
          .from("oh_consulente_appointments")
          .update({ confirmation_sent_at: new Date().toISOString(), confirmation_channel: "whatsapp_botconversa", updated_at: new Date().toISOString() })
          .eq("organization_id", context.organizationId)
          .eq("id", reservation.appointment_id);
        if (sentUpdateError) console.error("[TUCXA piloto BotConversa status]", sentUpdateError);
      }

      if (whatsappDispatch.sent) {
        const message = appointmentConfirmationMessage({
          fullName: appointmentPersonName,
          appointmentDate,
          entityName: entity.name,
          order: Number(reservation.confirmed_order ?? 0) || null,
          confirmationUrl: link,
        });
        void sendTucxaAppointmentAuditEmail({
          event: "WhatsApp de confirmação enviado",
          consulenteName: appointmentPersonName,
          appointmentDate,
          entityName: entity.name,
          message,
        });
      }

      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.appointment_id,
          personName: appointmentPersonName,
          appointmentDate,
          appointmentTime: settings.appointmentTime,
          entityName: entity.name,
          order: Number(reservation.confirmed_order ?? 0) || null,
          capacity: Number(reservation.confirmed_capacity ?? entity.capacity),
          status: reservation.confirmed_status || "solicitado",
          confirmationDeadline: deadline,
        },
        confirmation: { url: link, whatsapp: whatsappDispatch },
      });
    }

    if (action === "send-confirmation-reminder") {
      const appointmentId = asText(body.appointmentId);
      if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId: code }, { status: 400 });

      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id,person_id,entity_id,appointment_date,consulente_name,whatsapp,notification_contact_name,notification_contact_whatsapp,status,confirmation_status,metadata")
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment?.id || asText(appointment.status) === "cancelado") return NextResponse.json({ error: "Agendamento não localizado ou cancelado.", requestId: code }, { status: 404 });
      if (asText(appointment.confirmation_status) === "confirmed") return NextResponse.json({ error: "Este agendamento já foi confirmado.", requestId: code }, { status: 409 });

      const { data: entity, error: entityError } = await supabaseAdmin
        .from("oh_spiritual_entities").select("id,name").eq("organization_id", context.organizationId).eq("id", appointment.entity_id).maybeSingle();
      if (entityError) throw entityError;

      const token = createConfirmationToken();
      const tokenHash = confirmationTokenHash(token);
      const deadline = confirmationDeadlineIso(asText(appointment.appointment_date), settings.confirmationCutoff);
      const { error: tokenError } = await supabaseAdmin.from("oh_consulente_appointments").update({
        confirmation_token_hash: tokenHash,
        confirmation_expires_at: deadline,
        confirmation_status: "pending",
        updated_at: new Date().toISOString(),
      }).eq("organization_id", context.organizationId).eq("id", appointmentId);
      if (tokenError) throw tokenError;

      const phone = normalizeBrazilPhone(appointment.notification_contact_whatsapp || appointment.whatsapp);
      if (!phone) return NextResponse.json({ error: "O contato deste agendamento não possui WhatsApp válido.", requestId: code }, { status: 409 });
      const link = confirmationUrl(token);
      const order = Number(asRecord(appointment.metadata).order ?? 0) || null;
      const fullName = asText(appointment.consulente_name) || "Consulente";
      const entityName = asText(entity?.name) || "Entidade";
      const dispatch = await sendTucxaAppointmentWhatsapp({
        kind: "reminder",
        fullName,
        recipientName: asText(appointment.notification_contact_name) || fullName,
        whatsapp: phone,
        appointmentDate: asText(appointment.appointment_date),
        entityName,
        confirmationUrl: link,
        appointmentOrder: order,
        individualNotice: `Sua presença ainda não foi confirmada. Confirme pelo link para ajudar a Recepção a organizar as vagas. ${TUCXA_INDIVIDUAL_NOTICE}`,
      });
      if (!dispatch.sent) return NextResponse.json({ error: dispatch.error || "Não foi possível enviar o lembrete pelo WhatsApp.", requestId: code }, { status: 502 });

      const message = appointmentReminderMessage({ fullName, appointmentDate: asText(appointment.appointment_date), entityName, order, confirmed: false, confirmationUrl: link });
      void sendTucxaAppointmentAuditEmail({ event: "Lembrete manual de confirmação enviado", consulenteName: fullName, appointmentDate: asText(appointment.appointment_date), entityName, message });
      return NextResponse.json({ ok: true, message: `Lembrete de confirmação enviado para ${fullName}.` });
    }

    if (action === "set-availability") {
      const entityId = asText(body.entityId);
      const startsOn = asText(body.startsOn);
      const endsOn = asText(body.endsOn) || startsOn;
      const available = asBoolean(body.available, true);
      const capacityValue = Number(body.capacity ?? 0);
      const capacity = Number.isInteger(capacityValue) && capacityValue > 0 ? capacityValue : null;
      const reason = asText(body.reason);
      if (!entityId || !startsOn || !endsOn) {
        return NextResponse.json({ error: "Informe Entidade, data inicial e data final.", requestId: code }, { status: 400 });
      }
      if (endsOn < startsOn) return NextResponse.json({ error: "A data final não pode ser anterior à data inicial.", requestId: code }, { status: 400 });
      const { error } = await supabaseAdmin.from("oh_tucxa_pilot_entity_overrides").insert({
        organization_id: context.organizationId,
        entity_id: entityId,
        starts_on: startsOn,
        ends_on: endsOn,
        available,
        capacity,
        reason: reason || null,
        created_by_person_id: context.personId,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, message: available ? "Disponibilidade atualizada." : "Atendimento suspenso para o período informado." });
    }

    if (action === "save-settings") {
      const serviceOrderMode = asText(body.serviceOrderMode) === "arrival" ? "arrival" : "booking";
      const reminderOffsets = hourList(body.confirmationReminderOffsetsHours);
      const confirmationCutoff = asText(body.confirmationCutoff);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(confirmationCutoff)) {
        return NextResponse.json({ error: "Informe o prazo de confirmação no formato HH:MM.", requestId: code }, { status: 400 });
      }
      const autoCancelExpiredConfirmations = asBoolean(body.autoCancelExpiredConfirmations, false);
      const enforceArrivalWindow = asBoolean(body.enforceArrivalWindow, true);
      const cavalinhoDailyWhatsappEnabled = asBoolean(body.cavalinhoDailyWhatsappEnabled, false);
      const cavalinhoDailyWhatsappTime = asText(body.cavalinhoDailyWhatsappTime) || "12:00";
      const receptionDailyWhatsappEnabled = asBoolean(body.receptionDailyWhatsappEnabled, false);
      const receptionDailyWhatsappTime = asText(body.receptionDailyWhatsappTime) || "12:00";
      const automaticDispatchWeekdays = Array.isArray(body.automaticDispatchWeekdays)
        ? Array.from(new Set(body.automaticDispatchWeekdays.map(Number).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6))).sort((a, b) => a - b)
        : [0, 1, 2, 3, 4, 5, 6];
      if (!automaticDispatchWeekdays.length) {
        return NextResponse.json({ error: "Selecione pelo menos um dia da semana para os envios automáticos.", requestId: code }, { status: 400 });
      }
      if (![cavalinhoDailyWhatsappTime, receptionDailyWhatsappTime].every((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value))) {
        return NextResponse.json({ error: "Informe horários válidos no formato HH:MM para os avisos do dia.", requestId: code }, { status: 400 });
      }
      const { data: row, error: selectError } = await supabaseAdmin
        .from("oh_module_settings")
        .select("settings")
        .eq("organization_id", context.organizationId)
        .eq("module_slug", "atendimento-em-harmonia")
        .maybeSingle();
      if (selectError) throw selectError;
      const nextSettings = {
        ...asRecord(row?.settings),
        pilotSelfServiceViewMode: "both",
        pilotUseDefaultEntity: true,
        pilotAllowDifferentEntity: false,
        pilotSmsEnabled: false,
        pilotServiceOrderMode: serviceOrderMode,
        pilotConfirmationCutoff: confirmationCutoff,
        pilotAutoCancelExpiredConfirmations: autoCancelExpiredConfirmations,
        pilotEnforceArrivalWindow: enforceArrivalWindow,
        pilotConfirmationReminderOffsetsHours: reminderOffsets.length ? reminderOffsets : [24, 4],
        pilotCavalinhoDailyWhatsappEnabled: cavalinhoDailyWhatsappEnabled,
        pilotCavalinhoDailyWhatsappTime: cavalinhoDailyWhatsappTime,
        pilotReceptionDailyWhatsappEnabled: receptionDailyWhatsappEnabled,
        pilotReceptionDailyWhatsappTime: receptionDailyWhatsappTime,
        pilotAutomaticDispatchWeekdays: automaticDispatchWeekdays,
      };
      const { error: updateError } = await supabaseAdmin
        .from("oh_module_settings")
        .update({ settings: nextSettings, updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("module_slug", "atendimento-em-harmonia");
      if (updateError) throw updateError;

      const cavalinhoNoticeEntityIds = Array.isArray(body.cavalinhoNoticeEntityIds)
        ? Array.from(new Set(body.cavalinhoNoticeEntityIds.map(asText).filter(Boolean)))
        : [];
      if (cavalinhoDailyWhatsappEnabled && cavalinhoNoticeEntityIds.length === 0) {
        return NextResponse.json({ error: "Selecione pelo menos uma Entidade/Cavalinho para ativar o envio automático.", requestId: code }, { status: 400 });
      }
      const { error: disableNoticeError } = await supabaseAdmin
        .from("oh_spiritual_entities")
        .update({ pilot_cavalinho_whatsapp_enabled: false, updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId);
      if (disableNoticeError) throw disableNoticeError;
      if (cavalinhoNoticeEntityIds.length) {
        const { error: enableNoticeError } = await supabaseAdmin
          .from("oh_spiritual_entities")
          .update({ pilot_cavalinho_whatsapp_enabled: true, updated_at: new Date().toISOString() })
          .eq("organization_id", context.organizationId)
          .in("id", cavalinhoNoticeEntityIds);
        if (enableNoticeError) throw enableNoticeError;
      }

      return NextResponse.json({ ok: true, message: "Configurações do piloto atualizadas." });
    }

    if (action === "save-reception-preferences") {
      const channels = Array.isArray(body.channels) ? body.channels.map(asText).filter((item) => item === "email" || item === "whatsapp") : [];
      const mode = asText(body.viewMode) === "day_entity" ? "day_entity" : "entity_day";
      await savePilotPersonPreferences(context.organizationId, context.personId, {
        receptionSummaryChannels: channels,
        receptionSummaryViewMode: mode,
        receptionOpenAcolhimentoOnLogin: asBoolean(body.openAcolhimentoOnLogin, true),
      });
      return NextResponse.json({ ok: true, message: "Preferências da Recepção atualizadas." });
    }

    if (action === "mark-arrival") {
      const appointmentId = asText(body.appointmentId);
      const arrivalStatus = asText(body.arrivalStatus);
      if (!appointmentId || !["arrived", "absent", "pending"].includes(arrivalStatus)) {
        return NextResponse.json({ error: "Informe o agendamento e a situação de chegada.", requestId: code }, { status: 400 });
      }

      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id,person_id,entity_id,appointment_date,status")
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment?.id) {
        return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      }

      if (arrivalStatus === "arrived") {
        const extraSettings = await loadPilotExtraSettings(context.organizationId);
        const appointmentDate = asText(appointment.appointment_date);
        const today = todayInSaoPaulo();
        const minutes = currentSaoPauloMinutes();
        const arrivalStart = 18 * 60;
        const arrivalEnd = 20 * 60;

        if (extraSettings.enforceArrivalWindow && (appointmentDate !== today || minutes < arrivalStart || minutes > arrivalEnd)) {
          return NextResponse.json(
            {
              error: "A chegada só pode ser registrada no dia do atendimento, entre 18:00 e 20:00.",
              requestId: code,
            },
            { status: 409 },
          );
        }
      }

      const { data, error } = await supabaseAdmin.rpc("oh_tucxa_pilot_mark_arrival", {
        p_organization_id: context.organizationId,
        p_appointment_id: appointmentId,
        p_actor_person_id: context.personId,
        p_arrival_status: arrivalStatus,
      });
      if (error) throw error;

      if (arrivalStatus === "arrived") {
        const personId = asText(appointment.person_id);
        const entityId = asText(appointment.entity_id);
        if (personId && entityId) {
          const preferences = await loadPilotPersonPreferences(context.organizationId, personId);
          if (!preferences.defaultEntityId) {
            const { data: entityRow, error: entityError } = await supabaseAdmin
              .from("oh_spiritual_entities")
              .select("id,name,slug")
              .eq("organization_id", context.organizationId)
              .eq("id", entityId)
              .maybeSingle();
            if (entityError) throw entityError;
            const passToken = `${asText(entityRow?.slug)} ${asText(entityRow?.name)}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (entityRow?.id && !passToken.includes("passe")) {
              await savePilotPersonPreferences(context.organizationId, personId, { defaultEntityId: entityId });
            }
          }
        }
      }

      return NextResponse.json({
        ok: true,
        arrival: Array.isArray(data) ? data[0] : data,
        message: arrivalStatus === "arrived"
          ? "Chegada registrada."
          : arrivalStatus === "absent"
            ? "Ausência registrada."
            : "Situação de chegada redefinida.",
      });
    }

    if (action === "set-caderno-arrival") {
      const appointmentId = asText(body.appointmentId);
      const arrivalOrder = Number(body.arrivalOrder);
      if (!appointmentId || !Number.isInteger(arrivalOrder) || arrivalOrder < 1) {
        return NextResponse.json({ error: "Informe o agendamento e uma ordem de chegada válida.", requestId: code }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin.rpc("oh_tucxa_pilot_set_arrival_order", {
        p_organization_id: context.organizationId,
        p_appointment_id: appointmentId,
        p_actor_person_id: context.personId,
        p_arrival_order: arrivalOrder,
      });
      if (error) {
        if (String(error.message || "").includes("ARRIVAL_ORDER_IN_USE")) {
          return NextResponse.json({ error: "Esta ordem de chegada já está sendo usada nesta data.", requestId: code }, { status: 409 });
        }
        throw error;
      }
      return NextResponse.json({ ok: true, arrival: Array.isArray(data) ? data[0] : data, message: `Chegada registrada na ordem ${arrivalOrder}.` });
    }

    if (action === "mark-forwarded") {
      const appointmentId = asText(body.appointmentId);
      const forwarded = body.forwarded !== false;
      if (!appointmentId) {
        return NextResponse.json({ error: "Informe o agendamento.", requestId: code }, { status: 400 });
      }
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id,arrival_status,status")
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment?.id) return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      if (forwarded && asText(appointment.arrival_status) !== "arrived") {
        return NextResponse.json({ error: "Registre primeiro a chegada do Consulente na Triagem.", requestId: code }, { status: 409 });
      }
      const { error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          forwarded_at: forwarded ? new Date().toISOString() : null,
          forwarded_by_person_id: forwarded ? context.personId : null,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: forwarded ? "Consulente marcado como encaminhado." : "Encaminhamento desfeito." });
    }

    if (action === "change-entity" || action === "change-entity-bulk") {
      const entityId = asText(body.entityId);
      const reason = asText(body.reason);
      const notify = asBoolean(body.notify, true);
      const attachmentName = asText(body.attachmentName);
      const attachmentType = asText(body.attachmentType).toLowerCase();
      const attachmentBase64 = asText(body.attachmentBase64);

      let appointmentIds = action === "change-entity-bulk"
        ? (Array.isArray(body.appointmentIds) ? body.appointmentIds.map(asText).filter(Boolean) : [])
        : [asText(body.appointmentId)].filter(Boolean);

      if (action === "change-entity-bulk") {
        const sourceEntityId = asText(body.sourceEntityId);
        const appointmentDate = asText(body.appointmentDate);
        if (!sourceEntityId || !appointmentDate) {
          return NextResponse.json({ error: "Informe a Entidade de origem e a data da troca em massa.", requestId: code }, { status: 400 });
        }
        const { data: bulkRows, error: bulkError } = await supabaseAdmin
          .from("oh_consulente_appointments")
          .select("id")
          .eq("organization_id", context.organizationId)
          .eq("appointment_date", appointmentDate)
          .eq("entity_id", sourceEntityId)
          .neq("status", "cancelado");
        if (bulkError) throw bulkError;
        appointmentIds = (bulkRows ?? []).map((item) => asText(item.id)).filter(Boolean);
      }

      if (!appointmentIds.length || !entityId) {
        return NextResponse.json({ error: "Informe o(s) agendamento(s) e a nova Entidade.", requestId: code }, { status: 400 });
      }
      if (!reason) {
        return NextResponse.json({ error: "Informe o motivo da troca de Entidade.", requestId: code }, { status: 400 });
      }

      const { data: appointments, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id,person_id,source_contact_person_id,appointment_date,entity_id,consulente_name,whatsapp,status,notification_contact_name,notification_contact_whatsapp,metadata")
        .eq("organization_id", context.organizationId)
        .in("id", appointmentIds);
      if (appointmentError) throw appointmentError;
      if (!appointments?.length || appointments.length !== appointmentIds.length) {
        return NextResponse.json({ error: "Um ou mais agendamentos não foram localizados.", requestId: code }, { status: 404 });
      }
      if (appointments.some((item) => asText(item.status) === "cancelado")) {
        return NextResponse.json({ error: "Agendamentos cancelados não podem trocar de Entidade.", requestId: code }, { status: 409 });
      }

      const sourceEntityIds = Array.from(new Set(appointments.map((item) => asText(item.entity_id)).filter(Boolean)));
      if (action === "change-entity-bulk" && sourceEntityIds.length !== 1) {
        return NextResponse.json({ error: "A troca em massa deve partir de uma única Entidade.", requestId: code }, { status: 400 });
      }
      if (sourceEntityIds.includes(entityId)) {
        return NextResponse.json({ error: "Escolha uma Entidade diferente da atual.", requestId: code }, { status: 400 });
      }

      const entityIds = Array.from(new Set([...sourceEntityIds, entityId]));
      const { data: entityRows, error: entityError } = await supabaseAdmin
        .from("oh_spiritual_entities")
        .select("id,name")
        .eq("organization_id", context.organizationId)
        .in("id", entityIds);
      if (entityError) throw entityError;
      const entityNames = new Map((entityRows ?? []).map((item) => [asText(item.id), asText(item.name) || "Entidade"]));
      const newEntityName = entityNames.get(entityId);
      if (!newEntityName) {
        return NextResponse.json({ error: "Nova Entidade não localizada.", requestId: code }, { status: 404 });
      }

      let attachmentPath: string | null = null;
      if (attachmentBase64) {
        const allowedType = attachmentType.startsWith("image/") || attachmentType === "application/pdf";
        if (!allowedType) {
          return NextResponse.json({ error: "O anexo deve ser uma imagem ou arquivo PDF.", requestId: code }, { status: 400 });
        }
        const bytes = Buffer.from(attachmentBase64, "base64");
        if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "O anexo deve ter no máximo 5 MB.", requestId: code }, { status: 400 });
        }
        const safeName = (attachmentName || "anexo").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
        attachmentPath = `${context.organizationId}/${appointments[0].appointment_date}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("tucxa-agendamento-trocas-entidade")
          .upload(attachmentPath, bytes, { contentType: attachmentType || "application/octet-stream", upsert: false });
        if (uploadError) {
          console.error("[TUCXA troca entidade upload]", { requestId: code, error: uploadError });
          return NextResponse.json({
            error: "Não foi possível salvar o anexo da troca. Tente novamente sem o anexo ou verifique o Storage do Supabase.",
            requestId: code,
          }, { status: 500 });
        }
      }

      const { data: changedRows, error: changeError } = await supabaseAdmin.rpc("oh_tucxa_change_appointment_entity", {
        p_organization_id: context.organizationId,
        p_appointment_ids: appointmentIds,
        p_new_entity_id: entityId,
        p_changed_by_person_id: context.personId,
        p_reason: reason,
        p_change_mode: action === "change-entity-bulk" ? "bulk" : "individual",
        p_attachment_path: attachmentPath,
        p_attachment_name: attachmentPath ? attachmentName || "anexo" : null,
        p_attachment_type: attachmentPath ? attachmentType : null,
      });
      if (changeError) {
        if (attachmentPath) await supabaseAdmin.storage.from("tucxa-agendamento-trocas-entidade").remove([attachmentPath]);
        const message = asText(changeError.message);
        if (message.includes("PILOT_NO_AVAILABILITY")) {
          return NextResponse.json({ error: "A Entidade de destino não possui vagas suficientes para esta troca.", requestId: code }, { status: 409 });
        }
        if (message.includes("PILOT_ENTITY_NOT_SCHEDULED")) {
          return NextResponse.json({ error: "A Entidade de destino não atende nesta data.", requestId: code }, { status: 409 });
        }
        if (message.includes("PILOT_ENTITY_SUSPENDED")) {
          return NextResponse.json({ error: "A Entidade de destino está suspensa nesta data.", requestId: code }, { status: 409 });
        }
        if (message.includes("APPOINTMENT_NOT_FOUND")) {
          return NextResponse.json({ error: "Um ou mais agendamentos deixaram de estar disponíveis para a troca. Atualize o Acolhimento e tente novamente.", requestId: code }, { status: 409 });
        }
        if (message.includes("MULTIPLE_DATES_NOT_ALLOWED")) {
          return NextResponse.json({ error: "A troca em massa deve conter agendamentos de uma única data.", requestId: code }, { status: 400 });
        }
        if (message.includes("SAME_ENTITY_NOT_ALLOWED")) {
          return NextResponse.json({ error: "Escolha uma Entidade diferente da atual.", requestId: code }, { status: 400 });
        }
        console.error("[TUCXA troca entidade RPC]", {
          requestId: code,
          action,
          appointmentCount: appointmentIds.length,
          sourceEntityIds,
          destinationEntityId: entityId,
          error: changeError,
        });
        return NextResponse.json({
          error: "Não foi possível concluir a troca de Entidade no banco de dados.",
          requestId: code,
        }, { status: 500 });
      }

      let sent = 0;
      const failures: string[] = [];
      if (notify) {
        for (const appointment of appointments) {
          const phone = normalizeBrazilPhone(appointment.notification_contact_whatsapp || appointment.whatsapp);
          if (!phone) {
            failures.push(`${asText(appointment.consulente_name) || "Consulente"}: sem WhatsApp`);
            continue;
          }
          const dispatch = await sendTucxaEntityChangeWhatsapp({
            fullName: asText(appointment.consulente_name) || "Consulente",
            recipientName: asText(appointment.notification_contact_name) || asText(appointment.consulente_name),
            whatsapp: phone,
            appointmentDate: asText(appointment.appointment_date),
            previousEntityName: entityNames.get(asText(appointment.entity_id)) || "Entidade anterior",
            newEntityName,
            reason,
            appointmentOrder: Number((appointment.metadata as Record<string, unknown> | null)?.order ?? 0) || null,
          });
          if (dispatch.sent) sent += 1;
          else failures.push(`${asText(appointment.consulente_name) || "Consulente"}: ${dispatch.error || "falha no envio"}`);
        }
      }

      const totalChanged = Array.isArray(changedRows) ? changedRows.length : appointmentIds.length;
      void sendTucxaAppointmentAuditEmail({ event: "Troca de Entidade", appointmentDate: asText(appointments[0]?.appointment_date), entityName: newEntityName, details: `${totalChanged} agendamento(s). Motivo: ${reason}` });
      return NextResponse.json({
        ok: true,
        changed: totalChanged,
        notified: sent,
        notificationFailures: failures,
        message: action === "change-entity-bulk"
          ? `${totalChanged} agendamento(s) alterado(s) para ${newEntityName}. ${notify ? `${sent} aviso(s) enviado(s).` : "Aviso por WhatsApp desativado."}`
          : `Entidade alterada para ${newEntityName}. ${notify ? (sent ? "Consulente avisado pelo WhatsApp." : "A alteração foi salva, mas o aviso não foi enviado.") : ""}`.trim(),
      });
    }

    if (action === "consulente-alphabet") {
      const requestedLetter = normalizeSearchText(body.letter).slice(0, 1).toUpperCase();
      const appointmentDate = asText(body.appointmentDate);
      const people = await loadReceptionConsulentes(context.organizationId);
      let eligiblePeople = people;

      if (appointmentDate) {
        const dayEntities = await loadPilotDay(context.organizationId, appointmentDate);
        const passeAvailable = dayEntities.some((item) => /passe/i.test(item.name) && item.isAvailable && item.available > 0);
        const availableEntityIds = new Set(dayEntities.filter((item) => item.isAvailable && item.available > 0).map((item) => item.id));
        const eligibility = await Promise.all(people.map(async (person) => {
          const preferences = await loadPilotPersonPreferences(context.organizationId, asText(person.id));
          if (!preferences.defaultEntityId) return { person, eligible: passeAvailable || availableEntityIds.size > 0 };
          return { person, eligible: availableEntityIds.has(preferences.defaultEntityId) || passeAvailable };
        }));
        eligiblePeople = eligibility.filter((item) => item.eligible).map((item) => item.person);
      }

      const letters = Array.from(new Set<string>(
        eligiblePeople
          .map((person) => normalizeSearchText(person.full_name).slice(0, 1).toUpperCase())
          .filter((letter): letter is string => /^[A-Z]$/.test(letter)),
      )).sort((left, right) => left.localeCompare(right, "pt-BR"));

      const selectedBasePeople = requestedLetter && /^[A-Z]$/.test(requestedLetter)
        ? eligiblePeople.filter((person) => normalizeSearchText(person.full_name).startsWith(requestedLetter.toLowerCase()))
        : [];

      const selectedPeople = await Promise.all(
        selectedBasePeople.map(async (person) => {
          const base = receptionConsulentePerson(person as Record<string, unknown>);
          const preferences = await loadPilotPersonPreferences(context.organizationId, base.id);
          let defaultEntityName = "";

          if (preferences.defaultEntityId) {
            const { data: entityRow, error: entityError } = await supabaseAdmin
              .from("oh_spiritual_entities")
              .select("id,name")
              .eq("organization_id", context.organizationId)
              .eq("id", preferences.defaultEntityId)
              .maybeSingle();
            if (entityError) throw entityError;
            defaultEntityName = asText(entityRow?.name);
          }

          return {
            ...base,
            defaultEntityId: preferences.defaultEntityId,
            defaultEntityName,
            allowDifferentEntity: preferences.allowDifferentEntity,
          };
        }),
      );

      return NextResponse.json({
        ok: true,
        letters,
        letter: requestedLetter,
        people: selectedPeople,
      });
    }

    if (action === "get-consulente") {
      const personId = asText(body.personId);
      if (!personId) return NextResponse.json({ error: "Consulente não informado." }, { status: 400 });
      const { data: person, error: personError } = await supabaseAdmin
        .from("oh_people")
        .select("id,full_name,whatsapp,email,notification_email,active")
        .eq("organization_id", context.organizationId)
        .eq("id", personId)
        .eq("active", true)
        .maybeSingle();
      if (personError) throw personError;
      if (!person?.id) return NextResponse.json({ error: "Consulente não localizado." }, { status: 404 });
      const preferences = await loadPilotPersonPreferences(context.organizationId, person.id);
      let defaultEntityName = "";
      if (preferences.defaultEntityId) {
        const { data: defaultEntity, error: defaultEntityError } = await supabaseAdmin
          .from("oh_spiritual_entities")
          .select("id,name")
          .eq("organization_id", context.organizationId)
          .eq("id", preferences.defaultEntityId)
          .maybeSingle();
        if (defaultEntityError) throw defaultEntityError;
        defaultEntityName = asText(defaultEntity?.name);
      }

      return NextResponse.json({
        ok: true,
        person: {
          id: person.id,
          fullName: asText(person.full_name),
          whatsapp: asText(person.whatsapp),
          email: asText(person.notification_email) || (asText(person.email).endsWith("@organizacao-em-harmonia.local") ? "" : asText(person.email)),
          defaultEntityId: preferences.defaultEntityId,
          defaultEntityName,
          allowDifferentEntity: preferences.allowDifferentEntity,
          whatsappUrl: whatsappUrl(asText(person.whatsapp)),
        },
      });
    }

    if (action === "update-consulente") {
      const personId = asText(body.personId);
      const fullName = asText(body.fullName);
      const whatsapp = normalizeBrazilPhone(body.whatsapp);
      const email = asText(body.email).toLowerCase();
      const defaultEntityId = asText(body.defaultEntityId);
      const allowDifferentEntity = asBoolean(body.allowDifferentEntity, false);
      if (!personId || !fullName || whatsapp.length < 10) return NextResponse.json({ error: "Informe pessoa, nome e telefone válidos.", requestId: code }, { status: 400 });
      if (email && !email.includes("@")) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
      const { data: person, error: personError } = await supabaseAdmin
        .from("oh_people")
        .update({ full_name: fullName, whatsapp, notification_email: email || null, updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", personId)
        .select("id")
        .maybeSingle();
      if (personError) throw personError;
      if (!person?.id) return NextResponse.json({ error: "Consulente não localizado." }, { status: 404 });
      await savePilotPersonPreferences(context.organizationId, personId, { defaultEntityId, allowDifferentEntity });
      return NextResponse.json({ ok: true, message: "Cadastro do Consulente atualizado." });
    }

    if (action === "save-entity") {
      const requestedEntityId = asText(body.entityId);
      const name = asText(body.name);
      const description = asText(body.description);
      const cavalinhoPersonId = asText(body.cavalinhoPersonId);
      const capacity = Math.max(1, Math.round(Number(body.capacity ?? 4) || 4));
      const entityActive = body.active !== false;
      const cavalinhoWhatsappEnabled = body.cavalinhoWhatsappEnabled === true;
      const mondayOccurrences = occurrenceList(body.mondayOccurrences);
      const tuesdayOccurrences = occurrenceList(body.tuesdayOccurrences);
      if (!name) return NextResponse.json({ error: "Informe o nome da Entidade." }, { status: 400 });
      if (entityActive && !mondayOccurrences.length && !tuesdayOccurrences.length) {
        return NextResponse.json({ error: "Defina pelo menos uma ocorrência de segunda ou terça para a Entidade." }, { status: 400 });
      }

      let entityId = requestedEntityId;
      if (entityId) {
        const { data, error } = await supabaseAdmin
          .from("oh_spiritual_entities")
          .update({
            name,
            appointment_notes: description || null,
            daily_capacity: capacity,
            usual_days: [mondayOccurrences.length ? "segunda" : "", tuesdayOccurrences.length ? "terca" : ""].filter(Boolean),
            appointment_enabled: entityActive,
            pilot_cavalinho_whatsapp_enabled: cavalinhoWhatsappEnabled,
            active: entityActive,
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", context.organizationId)
          .eq("id", entityId)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data?.id) return NextResponse.json({ error: "Entidade não localizada." }, { status: 404 });
      } else {
        const baseSlug = slugify(name);
        let slug = baseSlug;
        let suffix = 2;
        while (true) {
          const { data: existing, error: existingError } = await supabaseAdmin
            .from("oh_spiritual_entities")
            .select("id")
            .eq("organization_id", context.organizationId)
            .eq("slug", slug)
            .maybeSingle();
          if (existingError) throw existingError;
          if (!existing?.id) break;
          slug = `${baseSlug}-${suffix}`;
          suffix += 1;
        }

        const { data, error } = await supabaseAdmin
          .from("oh_spiritual_entities")
          .insert({
            organization_id: context.organizationId,
            name,
            slug,
            line: "Atendimento Filhos de Fora",
            entity_type: "Entidade de atendimento",
            usual_days: [mondayOccurrences.length ? "segunda" : "", tuesdayOccurrences.length ? "terca" : ""].filter(Boolean),
            daily_capacity: capacity,
            appointment_enabled: entityActive,
            pilot_cavalinho_whatsapp_enabled: cavalinhoWhatsappEnabled,
            appointment_notes: description || "Cadastro realizado pela Recepção no piloto de agendamentos.",
            notes: "Cadastro realizado pelo piloto de Agendamento.",
            active: entityActive,
          })
          .select("id")
          .single();
        if (error) throw error;
        entityId = asText(data?.id);
      }

      const { error: deleteScheduleError } = await supabaseAdmin
        .from("oh_tucxa_pilot_entity_schedule")
        .delete()
        .eq("organization_id", context.organizationId)
        .eq("entity_id", entityId);
      if (deleteScheduleError) throw deleteScheduleError;

      const scheduleRows = [
        ...mondayOccurrences.map((occurrence) => ({ weekday: "segunda", occurrence })),
        ...tuesdayOccurrences.map((occurrence) => ({ weekday: "terca", occurrence })),
      ].map((item) => ({
        organization_id: context.organizationId,
        entity_id: entityId,
        weekday: item.weekday,
        month_occurrence: item.occurrence,
        default_capacity: capacity,
        active: entityActive,
      }));

      if (scheduleRows.length) {
        const { error: scheduleError } = await supabaseAdmin
          .from("oh_tucxa_pilot_entity_schedule")
          .insert(scheduleRows);
        if (scheduleError) throw scheduleError;
      }

      const { error: unlinkError } = await supabaseAdmin
        .from("oh_person_entity_links")
        .delete()
        .eq("organization_id", context.organizationId)
        .eq("entity_id", entityId)
        .eq("relationship_type", "recebe");
      if (unlinkError) throw unlinkError;

      if (cavalinhoPersonId) {
        const { error: linkError } = await supabaseAdmin
          .from("oh_person_entity_links")
          .insert({
            organization_id: context.organizationId,
            person_id: cavalinhoPersonId,
            entity_id: entityId,
            relationship_type: "recebe",
            active: true,
          });
        if (linkError) throw linkError;
      }

      return NextResponse.json({ ok: true, entityId, message: requestedEntityId ? (entityActive ? "Cadastro e calendário da Entidade atualizados." : "Entidade inativada. O cadastro e o calendário foram preservados para futura reativação.") : "Entidade cadastrada e incluída no calendário do piloto." });
    }

    if (action === "confirm-manual") {
      const appointmentId = asText(body.appointmentId);
      if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId: code }, { status: 400 });
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          status: "confirmado",
          confirmation_status: "confirmed",
          confirmed_at: now,
          confirmation_channel: "recepcao",
          cancelled_at: null,
          cancelled_by_person_id: null,
          cancellation_reason: null,
          updated_at: now,
        })
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      return NextResponse.json({ ok: true, message: "Agendamento confirmado pela Recepção." });
    }

    if (action === "cancel") {
      const appointmentId = asText(body.appointmentId);
      const reason = asText(body.reason);
      const attachmentName = asText(body.attachmentName);
      const attachmentType = asText(body.attachmentType).toLowerCase();
      const attachmentBase64 = asText(body.attachmentBase64);
      if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId: code }, { status: 400 });
      if (!reason) return NextResponse.json({ error: "Informe o motivo do cancelamento.", requestId: code }, { status: 400 });

      let attachmentPath: string | null = null;
      if (attachmentBase64) {
        const allowedType = attachmentType.startsWith("image/") || attachmentType === "application/pdf";
        if (!allowedType) {
          return NextResponse.json({ error: "O anexo deve ser uma imagem ou arquivo PDF.", requestId: code }, { status: 400 });
        }
        const bytes = Buffer.from(attachmentBase64, "base64");
        if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "O anexo deve ter no máximo 5 MB.", requestId: code }, { status: 400 });
        }
        const safeName = (attachmentName || "anexo").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
        attachmentPath = `${context.organizationId}/${appointmentId}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("tucxa-agendamento-cancelamentos")
          .upload(attachmentPath, bytes, { contentType: attachmentType || "application/octet-stream", upsert: false });
        if (uploadError) throw uploadError;
      }

      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          status: "cancelado",
          confirmation_status: "declined",
          cancelled_at: now,
          cancelled_by_person_id: context.personId,
          cancellation_reason: reason,
          cancellation_attachment_path: attachmentPath,
          cancellation_attachment_name: attachmentPath ? attachmentName || "anexo" : null,
          cancellation_attachment_type: attachmentPath ? attachmentType : null,
          updated_at: now,
        })
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .select("id")
        .maybeSingle();
      if (error) {
        if (attachmentPath) await supabaseAdmin.storage.from("tucxa-agendamento-cancelamentos").remove([attachmentPath]);
        throw error;
      }
      if (!data?.id) {
        if (attachmentPath) await supabaseAdmin.storage.from("tucxa-agendamento-cancelamentos").remove([attachmentPath]);
        return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      }
      void sendTucxaAppointmentAuditEmail({ event: "Cancelamento de agendamento", appointmentDate: "", details: reason });
      return NextResponse.json({ ok: true, message: "Agendamento cancelado e vaga liberada." });
    }

    return NextResponse.json({ error: "Ação não reconhecida.", requestId: code }, { status: 400 });
  } catch (error) {
    const friendly = pilotReservationError(error);
    if (friendly.status >= 500) console.error("[TUCXA piloto recepcao POST]", { requestId: code, error });
    return NextResponse.json({ error: friendly.message, requestId: code }, { status: friendly.status });
  }
}
