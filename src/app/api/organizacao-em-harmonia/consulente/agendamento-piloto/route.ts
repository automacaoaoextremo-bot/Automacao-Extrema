import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  closePreviousPilotFirstTimeIndicators,
  confirmationDeadlineIso,
  confirmationTokenHash,
  createConfirmationToken,
  currentPilotConsulente,
  expirePastPilotConfirmations,
  loadPilotAppointments,
  loadPilotDates,
  loadPilotDay,
  loadPilotPersonPreferences,
  isPilotFirstTimeEntity,
  PILOT_ACTIVE_STATUSES,
  pilotReservationError,
  loadPilotSettings,
  markPilotFirstTimeAppointment,
  normalizeBrazilPhone,
  personHasUsedPilotFirstTimeEntity,
  resolvePilotConsulenteBookingRule,
  savePilotPersonPreferences,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaAppointmentWhatsapp } from "@/lib/botconversa";
import { firstTwoPersonNames } from "@/lib/organizacao-em-harmonia/person-display";
import { sendTucxaAppointmentAuditEmail } from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { appointmentConfirmationMessage, TUCXA_INDIVIDUAL_NOTICE } from "@/lib/organizacao-em-harmonia/tucxa-appointment-messages";
import { buildTucxaConfirmationUrl } from "@/lib/organizacao-em-harmonia/tucxa-confirmation-link";
import { sendNewBookingReceptionNotices } from "@/lib/organizacao-em-harmonia/tucxa-new-booking-notice";
import { sendTucxaReceptionEventNotice } from "@/lib/organizacao-em-harmonia/tucxa-reception-event-notice";

export const dynamic = "force-dynamic";

function asText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }


// AG27: agendamento por terceiros não depende de aprovação de vínculo.
// O vínculo "booking_only" permite somente solicitar reserva, nunca autenticar-se
// como o destinatário ou administrar seus dados privados.
type RelatedPerson = { personId: string; fullName: string; relationship: string; relationshipId: string; pending?: boolean };
type Target = { personId: string; fullName: string; whatsapp: string; email: string };

type DateEntityOption = {
  date: string;
  label: string;
  alreadyBooked: boolean;
  entities: Array<{ id: string; name: string; displayName: string; available: number; isDefault: boolean }>;
};



async function linkedPeople(organizationId: string, ownerPersonId: string): Promise<RelatedPerson[]> {
  const [{ data: relationships, error: relationError }, { data: history, error: historyError }] = await Promise.all([
    supabaseAdmin.from("oh_tucxa_consulente_relationships")
      .select("id,related_person_id,related_name,relationship,approval_status,active")
      .eq("organization_id", organizationId).eq("owner_person_id", ownerPersonId).eq("active", true),
    // Histórico de reservas não concede acesso a dados particulares de terceiros.
    Promise.resolve({ data: [] as Array<{ person_id: string | null }>, error: null }),
  ]);
  if (relationError) throw relationError;
  if (historyError) throw historyError;
  const linked = new Map<string, RelatedPerson>();
  for (const item of relationships ?? []) {
    const personId = asText(item.related_person_id);
    if (personId && personId !== ownerPersonId && ["approved", "booking_only"].includes(asText(item.approval_status))) linked.set(personId, {
      personId, fullName: asText(item.related_name),
      relationship: asText(item.relationship), relationshipId: asText(item.id),
    });
  }
  for (const item of history ?? []) {
    const personId = asText(item.person_id);
    if (personId && personId !== ownerPersonId && !linked.has(personId))
      linked.set(personId, { personId, fullName: "", relationship: "Agendamento anterior", relationshipId: "" });
  }
  const pending = (relationships ?? []).filter((item) => !["approved", "booking_only"].includes(asText(item.approval_status)) || !asText(item.related_person_id)).map((item) => ({
    personId: "", fullName: asText(item.related_name), relationship: asText(item.relationship),
    relationshipId: asText(item.id), pending: true,
  } satisfies RelatedPerson));
  if (!linked.size) return pending;
  const { data: people, error } = await supabaseAdmin.from("oh_people")
    .select("id,full_name,active")
    .eq("organization_id", organizationId).in("id", Array.from(linked.keys()));
  if (error) throw error;
  return (people ?? []).filter((person) => person.active !== false).map((person) => {
    const item = linked.get(asText(person.id))!;
    return { ...item, fullName: asText(person.full_name) || item.fullName };
  }).concat(pending).sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

async function incomingLinkRequests(organizationId: string, relatedPersonId: string) {
  const { data: requests, error } = await supabaseAdmin.from("oh_tucxa_consulente_relationships")
    .select("id,owner_person_id,relationship").eq("organization_id", organizationId)
    .eq("related_person_id", relatedPersonId).eq("approval_status", "pending");
  if (error) throw error;
  const ids = [...new Set((requests ?? []).map((item) => asText(item.owner_person_id)).filter(Boolean))];
  const { data: people, error: peopleError } = ids.length
    ? await supabaseAdmin.from("oh_people").select("id,full_name").eq("organization_id", organizationId).in("id", ids)
    : { data: [], error: null };
  if (peopleError) throw peopleError;
  const names = new Map((people ?? []).map((person) => [asText(person.id), asText(person.full_name)]));
  return (requests ?? []).map((item) => ({ relationshipId: asText(item.id),
    ownerName: names.get(asText(item.owner_person_id)) || "Consulente", relationship: asText(item.relationship) }));
}

async function resolveTarget(context: { organizationId: string; personId: string; fullName: string; whatsapp: string; email: string }, requestedId: string) {
  const id = requestedId || context.personId;
  if (id === context.personId) return {
    target: { personId: id, fullName: context.fullName, whatsapp: context.whatsapp, email: context.email } satisfies Target,
    related: await linkedPeople(context.organizationId, context.personId),
  };
  const related = await linkedPeople(context.organizationId, context.personId);
  if (!related.some((person) => person.personId === id)) return null;
  const { data, error } = await supabaseAdmin.from("oh_people")
    .select("id,full_name,whatsapp,notification_email,active")
    .eq("organization_id", context.organizationId).eq("id", id).eq("active", true).maybeSingle();
  if (error) throw error;
  if (!data?.id) return null;
  return { target: { personId: id, fullName: asText(data.full_name), whatsapp: normalizeBrazilPhone(data.whatsapp), email: asText(data.notification_email) } satisfies Target, related };
}

// AG25: monta o nome publico com linha e cavalinho sem mudar dados de reserva.
async function publicEntityNames(organizationId: string, rawIds: string[]) {
  const ids = Array.from(new Set(rawIds.filter(Boolean)));
  const labels = new Map<string, string>();
  if (!ids.length) return labels;

  const [{ data: entities, error: entityError }, { data: links, error: linksError }] = await Promise.all([
    supabaseAdmin.from("oh_spiritual_entities").select("id,name,line")
      .eq("organization_id", organizationId).in("id", ids),
    supabaseAdmin.from("oh_person_entity_links").select("entity_id,person_id")
      .eq("organization_id", organizationId).eq("active", true).in("entity_id", ids),
  ]);
  if (entityError) throw entityError;
  if (linksError) throw linksError;

  const linkedIds = Array.from(new Set((links ?? []).map((item) => asText(item.person_id)).filter(Boolean)));
  const { data: people, error: peopleError } = linkedIds.length
    ? await supabaseAdmin.from("oh_people").select("id,full_name")
        .eq("organization_id", organizationId).in("id", linkedIds)
    : { data: [], error: null };
  if (peopleError) throw peopleError;

  const personNames = new Map((people ?? []).map((person) => [asText(person.id), asText(person.full_name)]));
  const mediumNames = new Map<string, string[]>();
  for (const link of links ?? []) {
    const entityId = asText(link.entity_id);
    const personName = personNames.get(asText(link.person_id));
    if (!entityId || !personName) continue;
    const names = mediumNames.get(entityId) ?? [];
    if (!names.includes(personName)) names.push(personName);
    mediumNames.set(entityId, names);
  }

  for (const entity of entities ?? []) {
    const id = asText(entity.id);
    const baseName = asText(entity.name) || "Entidade";
    const line = asText(entity.line);
    const mediums = mediumNames.get(id) ?? [];
    labels.set(id, `${baseName}${line ? ` (${line})` : ""}${mediums.length ? ` (${mediums.join(", ")})` : ""}`);
  }
  return labels;
}

async function payload(request: Request) {
  const context = await currentPilotConsulente(request);
  if (!context) return null;
  const settings = await loadPilotSettings(context.organizationId);
  if (!settings.selfServiceEnabled || settings.rolloutStage === "reception") return { context, blocked: true as const };
  await expirePastPilotConfirmations(context.organizationId, context.personId);
  const requestedId = asText(new URL(request.url).searchParams.get("targetPersonId"));
  const resolved = await resolveTarget(context, requestedId);
  if (!resolved) return { context, unauthorized: true as const };
  const { target, related } = resolved;
  const dates = await loadPilotDates(context.organizationId, settings.daysAhead);
  const bookingRule = await resolvePilotConsulenteBookingRule(context.organizationId, target.personId);
  const preferences = await loadPilotPersonPreferences(context.organizationId, context.personId);
  const start = todayInSaoPaulo();
  const end = dates.at(-1)?.date || start;
  const [appointments, targetAppointments] = await Promise.all([
    loadPilotAppointments(context.organizationId, start, end, context.personId),
    target.personId === context.personId ? Promise.resolve(null) : loadPilotAppointments(context.organizationId, start, end, target.personId),
  ]);
  const activeDates = new Set((targetAppointments ?? appointments)
    .filter((item) => PILOT_ACTIVE_STATUSES.includes(item.status)).map((item) => item.appointmentDate));
  const defaultEntityId = bookingRule.mode === "default_entity" ? bookingRule.defaultEntityId : "";
  const { data: entityCatalog, error: catalogError } = await supabaseAdmin.from("oh_spiritual_entities")
    .select("id,pilot_allows_nondefault_booking")
    .eq("organization_id", context.organizationId).eq("active", true).eq("appointment_enabled", true);
  if (catalogError) throw catalogError;
  const eligibleEntityIds = new Set((entityCatalog ?? []).filter((entity) => entity.pilot_allows_nondefault_booking === true).map((entity) => asText(entity.id)));
  // AG27: processa as datas com concorrência limitada; antes eram consultas
  // estritamente sequenciais, tornando o primeiro carregamento lento no celular.
  const dateOptions: DateEntityOption[] = [];
  for (let offset = 0; offset < dates.length; offset += 5) {
    const batch = dates.slice(offset, offset + 5);
    const options = await Promise.all(batch.map(async (date): Promise<DateEntityOption> => {
      const entities = await loadPilotDay(context.organizationId, date.date);
      const authorized = entities.filter((entity) => {
        if (!entity.isAvailable || entity.available < 1) return false;
        if (bookingRule.mode === "first_time_only") return isPilotFirstTimeEntity(entity);
        // Sem Entidade padrão: somente Entidades habilitadas pela Coordenação
        // para agendamentos avulsos. Não presumir que seja Primeira Vez.
        if (bookingRule.mode === "awaiting_default_entity")
          return !isPilotFirstTimeEntity(entity) && eligibleEntityIds.has(entity.id);
        if (isPilotFirstTimeEntity(entity)) return false;
        return entity.id === defaultEntityId || eligibleEntityIds.has(entity.id);
      });
      return {
        date: date.date, label: date.label, alreadyBooked: activeDates.has(date.date),
        entities: authorized.map((entity) => ({ id: entity.id, name: entity.name,
          displayName: entity.displayName || entity.name, available: entity.available,
          isDefault: entity.id === defaultEntityId }))
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.displayName.localeCompare(b.displayName, "pt-BR")),
      };
    }));
    dateOptions.push(...options);
  }
  let defaultEntityName = "";
  if (defaultEntityId) {
    const { data, error } = await supabaseAdmin.from("oh_spiritual_entities").select("name").eq("organization_id", context.organizationId).eq("id", defaultEntityId).maybeSingle();
    if (error) throw error;
    defaultEntityName = asText(data?.name);
  }
  const labels = await publicEntityNames(context.organizationId, [defaultEntityId, ...appointments.map((item) => item.entityId)]);
  const displayAppointments = appointments.map((appointment) => ({
    ...appointment,
    entityName: labels.get(appointment.entityId) || appointment.entityName,
  }));
  return {
    context, target, related, settings, preferences, bookingRule,
    appointments: displayAppointments, dateOptions,
    defaultEntityName: labels.get(defaultEntityId) || defaultEntityName,
    blocked: false as const,
  };
}

export async function GET(request: Request) {
  try {
    const data = await payload(request);
    if (!data) return NextResponse.json({ error: "Sessão de Consulente não encontrada." }, { status: 401 });
    if ("blocked" in data && data.blocked) return NextResponse.json({ error: "O autoagendamento de Consulentes ainda não está liberado." }, { status: 403 });
    if ("unauthorized" in data && data.unauthorized) return NextResponse.json({ error: "Pessoa não vinculada ao contato responsável." }, { status: 403 });
    if (!("target" in data)) return NextResponse.json({ error: "Consulta indisponível." }, { status: 500 });
    return NextResponse.json({
      ok: true, profile: { personId: data.context.personId, fullName: data.context.fullName, whatsapp: data.context.whatsapp, email: data.context.email },
      preferences: { openUpcomingOnLogin: data.preferences.consulenteOpenUpcomingOnLogin },
      bookingRule: data.bookingRule,
      defaultEntity: { id: data.bookingRule.mode === "default_entity" ? data.bookingRule.defaultEntityId : "", name: data.defaultEntityName },
      dates: data.dateOptions,
      relatedPeople: data.related,
      incomingLinks: await incomingLinkRequests(data.context.organizationId, data.context.personId),
      targetPerson: { personId: data.target.personId, fullName: data.target.fullName },
      appointments: data.appointments,
    });
  } catch (error) {
    console.error("[TUCXA Consulente piloto GET]", error);
    return NextResponse.json({ error: "Não foi possível carregar seus agendamentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await currentPilotConsulente(request);
    if (!context) return NextResponse.json({ error: "Sessão de Consulente não encontrada." }, { status: 401 });
    const settings = await loadPilotSettings(context.organizationId);
    if (!settings.selfServiceEnabled || settings.rolloutStage === "reception")
      return NextResponse.json({ error: "O autoagendamento de Consulentes ainda não está liberado." }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "save-settings") {
      await savePilotPersonPreferences(context.organizationId, context.personId, { consulenteOpenUpcomingOnLogin: body.openUpcomingOnLogin !== false });
      return NextResponse.json({ ok: true, message: "Configuração salva." });
    }

    if (action === "update-profile") {
      const fullName = asText(body.fullName);
      const whatsapp = normalizeBrazilPhone(body.whatsapp);
      const email = asText(body.email).toLowerCase();
      if (!fullName || whatsapp.length < 10 || (email && !email.includes("@")))
        return NextResponse.json({ error: "Confira nome, WhatsApp e e-mail." }, { status: 400 });
      const { error } = await supabaseAdmin.from("oh_people").update({
        full_name: fullName, whatsapp, notification_email: email || null, updated_at: new Date().toISOString(),
      }).eq("organization_id", context.organizationId).eq("id", context.personId);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Dados pessoais atualizados." });
    }

    if (action === "request-link") {
      const fullName = asText(body.fullName).replace(/\s+/g, " ");
      const whatsappRaw = asText(body.whatsapp);
      const whatsapp = whatsappRaw ? normalizeBrazilPhone(whatsappRaw) : "";
      const relationship = asText(body.relationship);
      const firstTime = body.firstTime === true;
      const usualEntity = asText(body.usualEntity);
      if (fullName.length < 3 || fullName.length > 160 || !relationship || relationship.length > 80 ||
          (whatsappRaw && !/^\d{11}$/.test(whatsapp)) || (!firstTime && !usualEntity)) {
        return NextResponse.json({ error: "Informe nome completo, relação, WhatsApp válido (se possuir) e Entidade habitual quando não for Primeira Vez." }, { status: 400 });
      }
      const { count, error: countError } = await supabaseAdmin.from("oh_tucxa_link_requests")
        .select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId)
        .eq("requester_person_id", context.personId).eq("status", "pending");
      if (countError) throw countError;
      if ((count || 0) >= 3) return NextResponse.json({ error: "Há solicitações pendentes. Aguarde a Recepção antes de enviar outras." }, { status: 429 });
      const { data: requestRow, error: insertError } = await supabaseAdmin.from("oh_tucxa_link_requests")
        .insert({ organization_id: context.organizationId, requester_person_id: context.personId,
          requested_name: fullName, requested_whatsapp: whatsapp || null,
          relationship, first_time: firstTime, usual_entity: usualEntity || null }).select("id").single();
      if (insertError) throw insertError;
      await sendTucxaReceptionEventNotice({ organizationId: context.organizationId, eventId: asText(requestRow.id),
        kind: "link_request", details: ["Solicitação de vínculo - TUCXA", `Solicitante: ${context.fullName}`,
          `Pessoa: ${fullName}`, `WhatsApp: ${whatsapp || "Sem WhatsApp"}`, `Relação: ${relationship}`,
          `Primeira vez: ${firstTime ? "Sim" : "Não"}`, usualEntity ? `Entidade habitual: ${usualEntity}` : "",
          `Protocolo: ${requestRow.id}`].filter(Boolean).join("\n") });
      return NextResponse.json({ ok: true, requestId: requestRow.id });
    }

    // AG28: vínculo e cadastro de terceiros são exclusivos da Recepção.
    // A pessoa logada pode apenas reservar para IDs já vinculados e ativos.
    if (["lookup-whatsapp", "register-dependent", "decide-link-request"].includes(action)) {
      return NextResponse.json({ error: "Para incluir ou alterar pessoas vinculadas, procure a Recepção do TUCXA." }, { status: 403 });
    }

    if (action === "book") {
      const appointmentDate = asText(body.appointmentDate);
      const entityId = asText(body.entityId);
      const requestedPersonId = asText(body.targetPersonId);
      if (!appointmentDate || !entityId) return NextResponse.json({ error: "Escolha data e Entidade." }, { status: 400 });
      const resolved = await resolveTarget(context, requestedPersonId);
      if (!resolved) return NextResponse.json({ error: "Pessoa não vinculada ao responsável." }, { status: 403 });
      const target = resolved.target;
      const validDates = await loadPilotDates(context.organizationId, settings.daysAhead);
      if (!validDates.some((date) => date.date === appointmentDate))
        return NextResponse.json({ error: "Data não permitida no calendário de atendimentos." }, { status: 409 });
      const rule = await resolvePilotConsulenteBookingRule(context.organizationId, target.personId);
      const entities = await loadPilotDay(context.organizationId, appointmentDate);
      const entity = entities.find((item) => item.id === entityId && item.isAvailable && item.available > 0);
      if (!entity) return NextResponse.json({ error: "Esta Entidade não possui vaga na data selecionada." }, { status: 409 });
      if (rule.mode === "first_time_only") {
        if (!isPilotFirstTimeEntity(entity)) return NextResponse.json({ error: "O primeiro atendimento deve ser feito com Primeira Vez." }, { status: 409 });
      } else {
        if (isPilotFirstTimeEntity(entity)) return NextResponse.json({ error: "Primeira Vez não pode ser escolhida neste atendimento." }, { status: 409 });
        if (entity.id !== rule.defaultEntityId) {
          const { data: permitted, error: permissionError } = await supabaseAdmin.from("oh_spiritual_entities")
            .select("pilot_allows_nondefault_booking")
            .eq("organization_id", context.organizationId).eq("id", entity.id).maybeSingle();
          if (permissionError) throw permissionError;
          if (permitted?.pilot_allows_nondefault_booking !== true)
            return NextResponse.json({ error: "Esta Entidade não permite agendamento fora da Entidade padrão." }, { status: 409 });
        }
      }
      if (isPilotFirstTimeEntity(entity) && await personHasUsedPilotFirstTimeEntity(context.organizationId, target.personId))
        return NextResponse.json({ error: "Esta pessoa já foi atendida em Primeira Vez." }, { status: 409 });
      const today = todayInSaoPaulo();
      const alreadyBooked = await loadPilotAppointments(context.organizationId, today, appointmentDate, target.personId);
      if (alreadyBooked.some((item) => item.appointmentDate === appointmentDate && PILOT_ACTIVE_STATUSES.includes(item.status)))
        return NextResponse.json({ error: "Esta pessoa já tem um agendamento ativo nesta data." }, { status: 409 });
      const token = createConfirmationToken();
      const deadline = confirmationDeadlineIso(appointmentDate, settings.confirmationCutoff);
      const { data: reservationData, error: reservationError } = await supabaseAdmin.rpc("oh_tucxa_pilot_reserve_appointment", {
        p_organization_id: context.organizationId, p_person_id: target.personId, p_entity_id: entity.id,
        p_appointment_date: appointmentDate, p_scheduled_by_person_id: context.personId,
        p_booking_channel: "consulente_piloto", p_consulente_name: target.fullName,
        p_whatsapp: (target.whatsapp || context.whatsapp) || null,
        p_email: (target.email || context.email) || null, p_notes: null,
        p_confirmation_token_hash: confirmationTokenHash(token), p_confirmation_expires_at: deadline,
        p_appointment_time: settings.appointmentTime,
      });
      if (reservationError) {
        const mapped = pilotReservationError(reservationError);
        return NextResponse.json({ error: mapped.message }, { status: mapped.status });
      }
      const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as { appointment_id?: string; confirmed_order?: number } | null;
      if (!reservation?.appointment_id) throw new Error("Reserva criada sem identificador.");
      if (target.personId !== context.personId) {
        const related = resolved.related.find((person) => person.personId === target.personId);
        // WhatsApp proprio tem prioridade; responsavel recebe somente quando nao ha proprio.
        const recipientPhone = target.whatsapp || context.whatsapp;
        const { error: relationError } = await supabaseAdmin.from("oh_consulente_appointments")
          .update({ notification_contact_type: target.whatsapp ? "consulente" : "alternate",
            source_contact_person_id: context.personId,
            notification_contact_name: target.whatsapp ? target.fullName : context.fullName,
            notification_contact_whatsapp: recipientPhone || null,
            notification_contact_relationship: related?.relationship || "Pessoa vinculada",
            updated_at: new Date().toISOString() })
          .eq("organization_id", context.organizationId).eq("id", reservation.appointment_id)
          .eq("person_id", target.personId);
        if (relationError) console.error("[TUCXA AG24 contato responsavel]", relationError);
      }
      if (isPilotFirstTimeEntity(entity)) {
        await markPilotFirstTimeAppointment(context.organizationId, reservation.appointment_id, {
          id: entity.id, name: entity.name.replace(/\s*\([^)]*\)\s*$/, "").trim() || "Primeira Vez",
        });
      } else {
        await closePreviousPilotFirstTimeIndicators(context.organizationId, target.personId, reservation.appointment_id);
      }
      // AG26: cada consulente com WhatsApp proprio recebe o link individual.
      const link = buildTucxaConfirmationUrl(token);
      const recipientPhone = target.whatsapp || context.whatsapp;
      const recipientName = target.whatsapp ? target.fullName : context.fullName;
      const dispatch = recipientPhone ? await sendTucxaAppointmentWhatsapp({
        kind: "confirmation", fullName: firstTwoPersonNames(target.fullName), recipientName,
        whatsapp: recipientPhone, appointmentDate, entityName: entity.displayName || entity.name,
        confirmationUrl: link, appointmentOrder: Number(reservation.confirmed_order ?? 0) || null,
        individualNotice: TUCXA_INDIVIDUAL_NOTICE,
      }) : { sent: false, provider: "disabled" as const, error: "WhatsApp não informado." };
      if (dispatch.sent) {
        await supabaseAdmin.from("oh_consulente_appointments")
          .update({ confirmation_sent_at: new Date().toISOString(), confirmation_channel: "whatsapp_botconversa", updated_at: new Date().toISOString() })
          .eq("id", reservation.appointment_id);
        void sendTucxaAppointmentAuditEmail({
          event: "WhatsApp de confirmação enviado", consulenteName: target.fullName,
          appointmentDate, entityName: entity.displayName || entity.name,
          message: appointmentConfirmationMessage({ fullName: target.fullName, appointmentDate,
            entityName: entity.displayName || entity.name, order: Number(reservation.confirmed_order ?? 0) || null, confirmationUrl: link }),
        });
      }
      await sendNewBookingReceptionNotices({ organizationId: context.organizationId,
        appointmentId: reservation.appointment_id, fullName: target.fullName,
        appointmentDate, entityName: entity.displayName || entity.name, confirmationUrl: link });
      return NextResponse.json({ ok: true, appointmentId: reservation.appointment_id,
        message: `Agendamento realizado para ${target.fullName} em ${appointmentDate}.` });
    }
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("[TUCXA Consulente piloto POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível concluir a operação." }, { status: 500 });
  }
}
