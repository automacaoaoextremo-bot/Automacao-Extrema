import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  confirmationDeadlineIso,
  confirmationTokenHash,
  createConfirmationToken,
  currentPilotReception,
  expirePastPilotConfirmations,
  isPastConfirmationDeadline,
  loadPilotAppointments,
  loadPilotDates,
  loadPilotDay,
  loadPilotPersonPreferences,
  loadPilotSettings,
  normalizeBrazilPhone,
  pilotReservationError,
  savePilotPersonPreferences,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaSms } from "@/lib/organizacao-em-harmonia/tucxa-sms";

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

function siteUrl() {
  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (process.env.VERCEL_ENV === "preview" && vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function confirmationUrl(token: string) {
  return `${siteUrl()}/a/${encodeURIComponent(token)}`;
}

function compactSmsDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}` : value;
}

function compactSmsTime(value: string) {
  return value.replace(/:00$/, "h").replace(/^(\d{2}):(\d{2})$/, "$1h$2");
}

function compactSmsWindow(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/(\d{1,2}):(\d{2})/g, "$1h$2");
}

function compactSmsEntity(value: string) {
  const normalized = value.trim();
  return normalized.length > 15 ? `${normalized.slice(0, 15).trim()}...` : normalized;
}

function whatsappUrl(phone: string, message = "") {
  const digits = normalizeBrazilPhone(phone);
  if (!digits) return "";
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${international}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

async function loadEntityContacts(organizationId: string, entityIds: string[]) {
  if (!entityIds.length) return new Map<string, { name: string; whatsapp: string }[]>();
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
  const peopleMap = new Map((people ?? []).map((person) => [asText(person.id), { name: asText(person.full_name), whatsapp: asText(person.whatsapp) }]));
  const output = new Map<string, { name: string; whatsapp: string }[]>();
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

async function buildPayload(organizationId: string, receptionPersonId: string, selectedDate?: string) {
  await expirePastPilotConfirmations(organizationId);
  const settings = await loadPilotSettings(organizationId);
  const dates = await loadPilotDates(organizationId, settings.daysAhead);
  const selected = dates.some((item) => item.date === selectedDate) ? selectedDate! : dates[0]?.date || todayInSaoPaulo();

  const [entities, appointments, receptionPreferences, catalogRows, scheduleRows] = await Promise.all([
    loadPilotDay(organizationId, selected),
    loadPilotAppointments(organizationId, selected, selected),
    loadPilotPersonPreferences(organizationId, receptionPersonId),
    supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id,name,slug,daily_capacity,active,appointment_enabled")
      .eq("organization_id", organizationId)
      .order("name"),
    supabaseAdmin
      .from("oh_tucxa_pilot_entity_schedule")
      .select("entity_id,weekday,month_occurrence,default_capacity,active")
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);

  if (catalogRows.error) throw catalogRows.error;
  if (scheduleRows.error) throw scheduleRows.error;

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
      capacity: Math.max(1, Number(entity.daily_capacity ?? 4) || 4),
      active: entity.active !== false,
      appointmentEnabled: entity.appointment_enabled !== false,
      mondayOccurrences: Array.from(new Set(schedule.mondayOccurrences)).sort((a, b) => a - b),
      tuesdayOccurrences: Array.from(new Set(schedule.tuesdayOccurrences)).sort((a, b) => a - b),
      mediums: (contacts.get(asText(entity.id)) ?? []).map((item) => ({ ...item, whatsappUrl: whatsappUrl(item.whatsapp) })),
    };
  });

  return {
    settings,
    dates,
    selectedDate: selected,
    entities: entities.map((entity) => ({
      ...entity,
      mediums: (contacts.get(entity.id) ?? []).map((item) => ({ ...item, whatsappUrl: whatsappUrl(item.whatsapp) })),
    })),
    entityCatalog,
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

    if (action === "next-available-date") {
      const entityId = asText(body.entityId);
      if (!entityId) {
        return NextResponse.json({ error: "Informe a Entidade.", requestId: code }, { status: 400 });
      }

      const dates = await loadPilotDates(context.organizationId, settings.daysAhead);
      for (const date of dates) {
        const deadline = confirmationDeadlineIso(date.date, settings.confirmationCutoff);
        if (isPastConfirmationDeadline(deadline)) continue;
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

      const deadline = confirmationDeadlineIso(appointmentDate, settings.confirmationCutoff);
      if (isPastConfirmationDeadline(deadline)) {
        return NextResponse.json({ error: `O prazo de confirmação desta data encerrou às ${settings.confirmationCutoff}.`, requestId: code }, { status: 409 });
      }

      const { data: person, error: personError } = await supabaseAdmin
        .from("oh_people")
        .select("id, full_name, whatsapp, email, notification_email, active")
        .eq("organization_id", context.organizationId)
        .eq("id", targetPersonId)
        .eq("active", true)
        .maybeSingle();
      if (personError) throw personError;
      if (!person?.id) return NextResponse.json({ error: "Cadastro do Filho de Fora/Consulente não localizado.", requestId: code }, { status: 404 });

      const dayEntities = await loadPilotDay(context.organizationId, appointmentDate);
      const entity = dayEntities.find((item) => item.id === entityId);
      if (!entity) return NextResponse.json({ error: "A Entidade escolhida não está prevista para esta data.", requestId: code }, { status: 409 });
      if (!entity.isAvailable) return NextResponse.json({ error: entity.suspendedReason || "Atendimento suspenso para esta Entidade.", requestId: code }, { status: 409 });
      if (entity.available < 1) return NextResponse.json({ error: "Não há vagas disponíveis para esta Entidade nesta data.", requestId: code }, { status: 409 });

      const token = createConfirmationToken();
      const tokenHash = confirmationTokenHash(token);
      const actualEmail = asText(person.notification_email) || (asText(person.email).endsWith("@organizacao-em-harmonia.local") ? "" : asText(person.email));
      const phone = normalizeBrazilPhone(person.whatsapp);
      const { data: reservationData, error: reservationError } = await supabaseAdmin.rpc("oh_tucxa_pilot_reserve_appointment", {
        p_organization_id: context.organizationId,
        p_person_id: person.id,
        p_entity_id: entityId,
        p_appointment_date: appointmentDate,
        p_scheduled_by_person_id: context.personId,
        p_booking_channel: "recepcao_piloto",
        p_consulente_name: asText(person.full_name) || "Filho de Fora/Consulente",
        p_whatsapp: phone || null,
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

      const link = confirmationUrl(token);
      const smsMessage = `TUCXA ${compactSmsDate(appointmentDate)} ${compactSmsTime(settings.appointmentTime)} - ${compactSmsEntity(entity.name)}. Cheg ${compactSmsWindow(settings.arrivalWindow)}. Confirme ate ${compactSmsTime(settings.confirmationCutoff)}: ${link}`;

      const sms = settings.smsEnabled && phone
        ? await sendTucxaSms({ to: phone, message: smsMessage }).catch((error: unknown) => ({ sent: false, provider: "disabled" as const, error: error instanceof Error ? error.message : "Falha no envio do SMS." }))
        : { sent: false, provider: "disabled" as const, error: phone ? "Envio de SMS desabilitado na configuração." : "Telefone não informado." };

      if (sms.sent) {
        const { error: sentUpdateError } = await supabaseAdmin
          .from("oh_consulente_appointments")
          .update({ confirmation_sent_at: new Date().toISOString(), confirmation_channel: "sms", updated_at: new Date().toISOString() })
          .eq("organization_id", context.organizationId)
          .eq("id", reservation.appointment_id);
        if (sentUpdateError) console.error("[TUCXA piloto SMS status]", sentUpdateError);
      }

      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.appointment_id,
          personName: person.full_name,
          appointmentDate,
          appointmentTime: settings.appointmentTime,
          entityName: entity.name,
          order: Number(reservation.confirmed_order ?? 0) || null,
          capacity: Number(reservation.confirmed_capacity ?? entity.capacity),
          status: reservation.confirmed_status || "solicitado",
          confirmationDeadline: deadline,
        },
        confirmation: { url: link, sms },
      });
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
      const selfServiceViewMode = ["entity_day", "day_entity", "both"].includes(asText(body.selfServiceViewMode)) ? asText(body.selfServiceViewMode) : "both";
      const serviceOrderMode = asText(body.serviceOrderMode) === "arrival" ? "arrival" : "booking";
      const reminderOffsets = hourList(body.confirmationReminderOffsetsHours);
      const { data: row, error: selectError } = await supabaseAdmin
        .from("oh_module_settings")
        .select("settings")
        .eq("organization_id", context.organizationId)
        .eq("module_slug", "atendimento-em-harmonia")
        .maybeSingle();
      if (selectError) throw selectError;
      const nextSettings = {
        ...asRecord(row?.settings),
        pilotSelfServiceViewMode: selfServiceViewMode,
        pilotUseDefaultEntity: asBoolean(body.useDefaultEntity),
        pilotAllowDifferentEntity: asBoolean(body.allowDifferentEntity, true),
        pilotServiceOrderMode: serviceOrderMode,
        pilotConfirmationReminderOffsetsHours: reminderOffsets.length ? reminderOffsets : [24, 4],
      };
      const { error: updateError } = await supabaseAdmin
        .from("oh_module_settings")
        .update({ settings: nextSettings, updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("module_slug", "atendimento-em-harmonia");
      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, message: "Configurações do piloto atualizadas." });
    }

    if (action === "save-reception-preferences") {
      const channels = Array.isArray(body.channels) ? body.channels.map(asText).filter((item) => item === "email" || item === "sms") : [];
      const mode = ["entity_day", "day_entity", "both"].includes(asText(body.viewMode))
        ? (asText(body.viewMode) as "entity_day" | "day_entity" | "both")
        : "both";
      await savePilotPersonPreferences(context.organizationId, context.personId, {
        receptionSummaryChannels: channels,
        receptionSummaryViewMode: mode,
      });
      return NextResponse.json({ ok: true, message: "Preferências da Recepção atualizadas." });
    }

    if (action === "mark-arrival") {
      const appointmentId = asText(body.appointmentId);
      const arrivalStatus = asText(body.arrivalStatus);
      if (!appointmentId || !["arrived", "absent", "pending"].includes(arrivalStatus)) {
        return NextResponse.json({ error: "Informe o agendamento e a situação de chegada.", requestId: code }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin.rpc("oh_tucxa_pilot_mark_arrival", {
        p_organization_id: context.organizationId,
        p_appointment_id: appointmentId,
        p_actor_person_id: context.personId,
        p_arrival_status: arrivalStatus,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, arrival: Array.isArray(data) ? data[0] : data, message: arrivalStatus === "arrived" ? "Chegada registrada." : arrivalStatus === "absent" ? "Ausência registrada." : "Situação de chegada redefinida." });
    }

    if (action === "change-entity") {
      const appointmentId = asText(body.appointmentId);
      const entityId = asText(body.entityId);
      if (!appointmentId || !entityId) return NextResponse.json({ error: "Informe o agendamento e a nova Entidade.", requestId: code }, { status: 400 });
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id, appointment_date, entity_id, metadata")
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment?.id) return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      const available = await loadPilotDay(context.organizationId, asText(appointment.appointment_date));
      const target = available.find((item) => item.id === entityId);
      if (!target?.isAvailable || target.available < 1) return NextResponse.json({ error: "A nova Entidade não possui vaga disponível nessa data.", requestId: code }, { status: 409 });
      const metadata = asRecord(appointment.metadata);
      const { error: updateError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({ entity_id: entityId, metadata: { ...metadata, changedEntityAt: new Date().toISOString(), changedEntityByPersonId: context.personId }, updated_at: new Date().toISOString() })
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId);
      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, message: `Entidade alterada para ${target.name}.` });
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
      return NextResponse.json({
        ok: true,
        person: {
          id: person.id,
          fullName: asText(person.full_name),
          whatsapp: asText(person.whatsapp),
          email: asText(person.notification_email) || (asText(person.email).endsWith("@organizacao-em-harmonia.local") ? "" : asText(person.email)),
          defaultEntityId: preferences.defaultEntityId,
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
      await savePilotPersonPreferences(context.organizationId, personId, { defaultEntityId });
      return NextResponse.json({ ok: true, message: "Cadastro do Consulente atualizado." });
    }

    if (action === "save-entity") {
      const requestedEntityId = asText(body.entityId);
      const name = asText(body.name);
      const capacity = Math.max(1, Math.round(Number(body.capacity ?? 4) || 4));
      const mondayOccurrences = occurrenceList(body.mondayOccurrences);
      const tuesdayOccurrences = occurrenceList(body.tuesdayOccurrences);
      if (!name) return NextResponse.json({ error: "Informe o nome da Entidade." }, { status: 400 });
      if (!mondayOccurrences.length && !tuesdayOccurrences.length) {
        return NextResponse.json({ error: "Defina pelo menos uma ocorrência de segunda ou terça para a Entidade." }, { status: 400 });
      }

      let entityId = requestedEntityId;
      if (entityId) {
        const { data, error } = await supabaseAdmin
          .from("oh_spiritual_entities")
          .update({
            name,
            daily_capacity: capacity,
            usual_days: [mondayOccurrences.length ? "segunda" : "", tuesdayOccurrences.length ? "terca" : ""].filter(Boolean),
            appointment_enabled: true,
            active: true,
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
            appointment_enabled: true,
            appointment_notes: "Cadastro realizado pela Recepção no piloto de agendamentos.",
            notes: "Cadastro realizado pelo piloto Agendamento-01.",
            active: true,
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
        active: true,
      }));

      const { error: scheduleError } = await supabaseAdmin
        .from("oh_tucxa_pilot_entity_schedule")
        .insert(scheduleRows);
      if (scheduleError) throw scheduleError;

      return NextResponse.json({ ok: true, entityId, message: requestedEntityId ? "Cadastro e calendário da Entidade atualizados." : "Entidade cadastrada e incluída no calendário do piloto." });
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
      const reason = asText(body.reason) || "Cancelado pela Recepção no piloto";
      if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId: code }, { status: 400 });
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({
          status: "cancelado",
          confirmation_status: "declined",
          cancelled_at: now,
          cancelled_by_person_id: context.personId,
          cancellation_reason: reason,
          updated_at: now,
        })
        .eq("organization_id", context.organizationId)
        .eq("id", appointmentId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      return NextResponse.json({ ok: true, message: "Agendamento cancelado e vaga liberada." });
    }

    return NextResponse.json({ error: "Ação não reconhecida.", requestId: code }, { status: 400 });
  } catch (error) {
    const friendly = pilotReservationError(error);
    if (friendly.status >= 500) console.error("[TUCXA piloto recepcao POST]", { requestId: code, error });
    return NextResponse.json({ error: friendly.message, requestId: code }, { status: friendly.status });
  }
}
