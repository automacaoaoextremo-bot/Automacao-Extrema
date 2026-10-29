import { formatTucxaReceptionSummary } from "@/lib/organizacao-em-harmonia/tucxa-appointment-reception-summary";
import { homologationActiveToday, appointmentDispatchAllowed, mediumDispatchAllowed, receptionDispatchAllowed, generalDispatchAllowed, tucxaHomologation } from "@/lib/organizacao-em-harmonia/tucxa-appointment-homologation";
import { receptionScheduledForDate } from "@/lib/organizacao-em-harmonia/tucxa-reception-schedule";
import { additionalReceptionRecipientsForDate, canonicalTucxaPhone } from "@/lib/organizacao-em-harmonia/tucxa-summary-additional-recipients";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  findTucxaOrganization,
  loadPilotDay,
  isCampinasHoliday,
  loadPilotSettings,
  PILOT_ACTIVE_STATUSES,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

export const dynamic = "force-dynamic";

const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
const normalized = (value: unknown) => str(value).normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/_/g, "-");
const digits = (value: unknown) => str(value).replace(/\D/g, "");
const masked = (value: unknown) => {
  const phone = digits(value);
  return phone.length >= 8 ? `${phone.slice(0, 4)}***${phone.slice(-4)}` : "(não informado)";
};
const enabled = (key: string) => str(process.env[key]).toLowerCase() === "true";
const envConfigured = (...keys: string[]) => keys.some((key) => Boolean(str(process.env[key])));
const numericDay = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

function hasReception(value: unknown) {
  const profile = obj(value);
  if (profile.supportsReception === true || profile.isReception === true) return true;
  if (normalized(profile.pilotAccessKind) === "recepcao") return true;
  return [profile.functions, profile.functionSlugs, profile.selectedFunctions]
    .some((list) => Array.isArray(list) && list.some((item) => {
      const value = obj(item);
      return normalized(value.slug || value.label || value.name || item).includes("recepc");
    }));
}

export async function GET(request: Request) {
  const secrets = [process.env.CRON_SECRET, process.env.TUCXA_SCHEDULER_SECRET]
    .map(str).filter(Boolean);
  if (!secrets.length) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  if (!secrets.some((secret) => request.headers.get("authorization") === `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  const date = search.get("date") || "2026-10-13";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
      || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  try {
    const organization = await findTucxaOrganization();
    if (!organization) return NextResponse.json({ error: "TUCXA não localizado" }, { status: 404 });
    const settings = await loadPilotSettings(organization.id);
    const weekday = numericDay(date);
    const holiday = isCampinasHoliday(date);
    const weekdayEnabled = settings.automaticDispatchWeekdays.includes(weekday);
    const { data: appointments, error: appointmentError } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id,person_id,entity_id,consulente_name,whatsapp,notification_contact_whatsapp,status,metadata")
      .eq("organization_id", organization.id).eq("appointment_date", date)
      .in("status", PILOT_ACTIVE_STATUSES).limit(500);
    if (appointmentError) throw appointmentError;
    const rows = appointments ?? [];
    const personIds = [...new Set(rows.map((a) => str(a.person_id)).filter(Boolean))];
    const dayAvailability = await loadPilotDay(organization.id, date);
    const availableEntityIds = new Set(dayAvailability.filter((entity) => entity.isAvailable).map((entity) => entity.id));
    const entityIds = [...new Set([...rows.map((a) => str(a.entity_id)), ...availableEntityIds].filter(Boolean))];

    const [entitiesResult, preferencesResult, linksResult, membershipsResult] = await Promise.all([
      entityIds.length ? supabaseAdmin.from("oh_spiritual_entities")
        .select("id,name,line,daily_capacity,pilot_cavalinho_whatsapp_enabled").eq("organization_id", organization.id).in("id", entityIds)
        : Promise.resolve({ data: [], error: null }),
      personIds.length ? supabaseAdmin.from("oh_tucxa_pilot_person_preferences")
        .select("person_id,reminder_whatsapp_enabled").eq("organization_id", organization.id).in("person_id", personIds)
        : Promise.resolve({ data: [], error: null }),
      entityIds.length ? supabaseAdmin.from("oh_person_entity_links")
        .select("person_id,entity_id").eq("organization_id", organization.id)
        .eq("relationship_type", "recebe").eq("active", true).in("entity_id", entityIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from("oh_memberships").select("person_id,agenda_viva_profile")
        .eq("organization_id", organization.id).eq("active", true),
    ]);
    for (const result of [entitiesResult, preferencesResult, linksResult, membershipsResult]) {
      if (result.error) throw result.error;
    }
    const entities = entitiesResult.data ?? [];
    const preferenceMap = new Map((preferencesResult.data ?? []).map((p) => [str(p.person_id), p.reminder_whatsapp_enabled]));
    const scheduledReceptionIds = [...new Set((membershipsResult.data ?? [])
      .filter((m) => hasReception(m.agenda_viva_profile))
      .filter((m) => receptionScheduledForDate(obj(m.agenda_viva_profile).receptionSchedule, date))
      .map((m) => str(m.person_id)).filter(Boolean))];
    const additional = await additionalReceptionRecipientsForDate(organization.id, date);
    const additionalIds = new Set(additional.people.map(p => p.id));
    const receptionIds = [...new Set([...scheduledReceptionIds, ...additionalIds])];
    const linkedIds = [...new Set((linksResult.data ?? []).map((l) => str(l.person_id)).filter(Boolean))];
    const allIds = [...new Set([...receptionIds, ...linkedIds])];
    const peopleResult = allIds.length ? await supabaseAdmin.from("oh_people")
      .select("id,full_name,whatsapp,normalized_whatsapp,active").eq("organization_id", organization.id)
      .in("id", allIds).eq("active", true) : { data: [], error: null };
    if (peopleResult.error) throw peopleResult.error;
    const people = new Map((peopleResult.data ?? []).map((p) => [str(p.id), p]));
    const entityNames = new Map(entities.map((e) => [str(e.id), str(e.name)]));
    const entityLines = new Map(entities.map((entity) => [str(entity.id), str(entity.line)]));
    const entityCapacities = new Map(entities.map((entity) => [str(entity.id), Math.max(1, Number(entity.daily_capacity ?? 4) || 4)]));
    const cavalinhoNames = new Map((linksResult.data ?? []).map((link) => [str(link.entity_id), str(people.get(str(link.person_id))?.full_name).split(/\s+/)[0]]));
    const generalWhatsapp = enabled("BOTCONVERSA_ENABLED") && enabled("BOTCONVERSA_TUCXA_ENABLED");
    const reminderFlow = envConfigured("BOTCONVERSA_TUCXA_REMINDER_FLOW_ID", "BOTCONVERSA_TUCXA_REMINDER_FLOW");
    const cavalinhoFlow = envConfigured("BOTCONVERSA_TUCXA_CAVALINHO_DAILY_FLOW_ID", "BOTCONVERSA_TUCXA_CAVALINHO_DAILY_FLOW");
    const receptionFlow = envConfigured("BOTCONVERSA_TUCXA_RECEPTION_DAILY_FLOW_ID", "BOTCONVERSA_TUCXA_RECEPTION_DAILY_FLOW");
    const requiredReminderFields = ["BOTCONVERSA_TUCXA_FIELD_NAME_ID", "BOTCONVERSA_TUCXA_FIELD_DATE_ID", "BOTCONVERSA_TUCXA_FIELD_ENTITY_ID"];
    const individualNoticeField = envConfigured("BOTCONVERSA_TUCXA_FIELD_INDIVIDUAL_NOTICE_ID");

    const consulentes = rows.map((appointment) => {
      const phone = str(appointment.notification_contact_whatsapp) || str(appointment.whatsapp);
      const permitted = preferenceMap.get(str(appointment.person_id)) !== false;
      return {
        appointmentId: appointment.id, consulente: appointment.consulente_name,
        entity: entityNames.get(str(appointment.entity_id)) || "Entidade não encontrada",
        phone: masked(phone), phonePresent: Boolean(digits(phone)), preferenceEnabled: permitted,
        eligible: !holiday && weekdayEnabled && permitted && Boolean(digits(phone)) && generalWhatsapp && reminderFlow && appointmentDispatchAllowed(date, str(appointment.id), phone),
      };
    });
    const cavalinhos = (linksResult.data ?? [])
      .map((link) => ({
        entity: entityNames.get(str(link.entity_id)), personId: str(link.person_id),
        person: people.get(str(link.person_id))?.full_name || "Não encontrado/inativo",
        phone: masked(people.get(str(link.person_id))?.whatsapp),
        eligible: !holiday && weekdayEnabled && settings.cavalinhoDailyWhatsappEnabled
          && Boolean(people.get(str(link.person_id))?.whatsapp) && generalWhatsapp && cavalinhoFlow
          && mediumDispatchAllowed(date, str(link.person_id), str(people.get(str(link.person_id))?.whatsapp))
          && availableEntityIds.has(str(link.entity_id))
          && (generalDispatchAllowed(date) || rows.some((row) => str(row.id) === tucxaHomologation.appointmentId && str(row.entity_id) === str(link.entity_id))),
      }));
    const receptionPhoneCounts = new Map<string, number>();
    for (const personId of receptionIds) {
      const p = people.get(personId);
      const phone = canonicalTucxaPhone(p?.normalized_whatsapp || p?.whatsapp);
      if (phone) receptionPhoneCounts.set(phone, (receptionPhoneCounts.get(phone) ?? 0) + 1);
    }
    const recepcao = receptionIds.map((personId) => {
      const person = people.get(personId);
      const phone = canonicalTucxaPhone(person?.normalized_whatsapp || person?.whatsapp);
      const conflict = Boolean(person?.normalized_whatsapp && person?.whatsapp &&
        canonicalTucxaPhone(person.normalized_whatsapp) !== canonicalTucxaPhone(person.whatsapp));
      const uniquePhone = !!phone && receptionPhoneCounts.get(phone) === 1 && !conflict;
      const whatsapp = true; // Autorização específica: escala OU lista adicional, sem alterar funções.
      const explicitlyAuthorized = true;
      return {
        personId, person: person?.full_name || "Não encontrado/inativo",
        phone: masked(phone), whatsappSelected: whatsapp,
        source: additionalIds.has(personId) ? "additional_recipient" : "reception_schedule",
        explicitlyAuthorized, uniquePhone,
        eligible: !holiday && weekdayEnabled && settings.receptionDailyWhatsappEnabled
          && uniquePhone && whatsapp && explicitlyAuthorized && generalWhatsapp && receptionFlow
          && receptionDispatchAllowed(date, personId, phone)
          && (generalDispatchAllowed(date) || rows.some((row) => str(row.id) === tucxaHomologation.appointmentId)),
      };
    });

    return NextResponse.json({
      ok: true, dryRun: true, databaseWrites: 0, messagesSent: 0, date,
      weekday, holiday, weekdayEnabled,
      scheduling: {
        cronUtc: "Lembretes 15:00 UTC (12:00 Campinas); previa 11:00 UTC (08:00 Campinas); resumos 19:00 UTC (16:00 Campinas)",
        reminderTime: "12:00",
        cavalinhoEnabled: settings.cavalinhoDailyWhatsappEnabled,
        cavalinhoTime: settings.cavalinhoDailyWhatsappTime,
        receptionEnabled: settings.receptionDailyWhatsappEnabled,
        receptionTime: settings.receptionDailyWhatsappTime,
        morningPreviewTime: "08:00 America/Sao_Paulo",
        afternoonTime: "16:00 America/Sao_Paulo",
      },
      configured: {
        homologationEnabled: tucxaHomologation.enabled,
        homologationReady: tucxaHomologation.ready(),
        homologationActiveForDate: homologationActiveToday(date),
        generalDispatchAllowedForDate: generalDispatchAllowed(date),
        auditEmailConfigured: Boolean(str(process.env.SMTP_HOST) && str(process.env.SMTP_USER) && str(process.env.SMTP_PASS)),
        auditEmailRecipient: "tucxacentro@gmail.com",
        botconversaEnabled: enabled("BOTCONVERSA_ENABLED"),
        tucxaEnabled: enabled("BOTCONVERSA_TUCXA_ENABLED"),
        deploymentEnvironment: str(process.env.VERCEL_ENV) || "local",
        receptionPilotPolicy: "approved_reception_schedule",
        receptionAllowlistSize: null,
        generalWhatsapp, reminderFlow, cavalinhoFlow, receptionFlow,
        reminderFields: requiredReminderFields.every((key) => envConfigured(key)),
        individualNoticeField,
      },
      consulentes, cavalinhos, recepcao,
      additionalReceptionDiagnostics: additional.diagnostics,
      receptionSummaryPreview: {
        appointmentCount: rows.length,
        entitiesCount: entityIds.length,
        format: "entity_then_alphabetical_without_appointment_order",
        summary: formatTucxaReceptionSummary({ date, appointments: rows, entityNames, entityLines, entityCapacities, cavalinhoNames }),
      },
      sharedContactReminderGroups: Object.values(consulentes.reduce<Record<string, typeof consulentes>>((groups, item) => {
        const phone = item.phone;
        if (!groups[phone]) groups[phone] = [];
        groups[phone].push(item);
        return groups;
      }, {})).filter((group) => group.length > 1).map((group) => ({
        phone: group[0].phone,
        appointments: group.map((item) => ({ appointmentId: item.appointmentId, consulente: item.consulente })),
        note: "Mensagens individuais compartilham um contato; validar campos personalizados no BotConversa.",
      })),
      warning: "Pré-verificação: não consulta confirmação de entrega do BotConversa nem garante disparo futuro."
    });
  } catch (error) {
    console.error("[TUCXA preflight]", error);
    return NextResponse.json({ error: "Falha na pré-verificação; consulte os logs do Preview." }, { status: 500 });
  }
}
