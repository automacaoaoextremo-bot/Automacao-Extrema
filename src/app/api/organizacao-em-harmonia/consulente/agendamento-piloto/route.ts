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
  loadPilotSettings,
  markPilotFirstTimeAppointment,
  normalizeBrazilPhone,
  personHasUsedPilotFirstTimeEntity,
  savePilotPersonPreferences,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaAppointmentWhatsapp } from "@/lib/botconversa";
import { firstTwoPersonNames } from "@/lib/organizacao-em-harmonia/person-display";
import { sendTucxaAppointmentAuditEmail } from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { appointmentConfirmationMessage, TUCXA_INDIVIDUAL_NOTICE } from "@/lib/organizacao-em-harmonia/tucxa-appointment-messages";

export const dynamic = "force-dynamic";

function asText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function confirmationUrl(token: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
  return `${base}/solucoes/organizacao-em-harmonia/tucxa/confirmar-agendamento/${encodeURIComponent(token)}`;
}

async function payload(request: Request) {
  const context = await currentPilotConsulente(request);
  if (!context) return null;
  const settings = await loadPilotSettings(context.organizationId);
  if (!settings.selfServiceEnabled || settings.rolloutStage === "reception") return { context, blocked: true as const };

  await expirePastPilotConfirmations(context.organizationId, context.personId);
  const dates = await loadPilotDates(context.organizationId, settings.daysAhead);
  const preferences = await loadPilotPersonPreferences(context.organizationId, context.personId);
  const start = todayInSaoPaulo();
  const end = dates.at(-1)?.date || start;
  const appointments = await loadPilotAppointments(context.organizationId, start, end, context.personId);

  const defaultEntityId = preferences.defaultEntityId;
  const dateOptions = [];
  for (const date of dates) {
    const entities = await loadPilotDay(context.organizationId, date.date);
    const defaultEntity = defaultEntityId ? entities.find((item) => item.id === defaultEntityId) : null;
    const passe = entities.find((item) => /passe/i.test(item.name));
    const selected = defaultEntity?.isAvailable && defaultEntity.available > 0 ? defaultEntity : (passe?.isAvailable && passe.available > 0 ? passe : null);
    if (selected) dateOptions.push({ ...date, entity: selected });
  }

  let defaultEntityName = "";
  if (defaultEntityId) {
    const { data } = await supabaseAdmin.from("oh_spiritual_entities").select("name").eq("id", defaultEntityId).maybeSingle();
    defaultEntityName = asText(data?.name);
  }

  return { context, settings, preferences, appointments, dateOptions, defaultEntityName, blocked: false as const };
}

export async function GET(request: Request) {
  try {
    const data = await payload(request);
    if (!data) return NextResponse.json({ error: "Sessão de Consulente não encontrada." }, { status: 401 });
    if (data.blocked) return NextResponse.json({ error: "O autoagendamento de Consulentes ainda não está liberado." }, { status: 403 });
    return NextResponse.json({
      ok: true,
      profile: { fullName: data.context.fullName, whatsapp: data.context.whatsapp, email: data.context.email },
      preferences: { openUpcomingOnLogin: data.preferences.consulenteOpenUpcomingOnLogin },
      defaultEntity: { id: data.preferences.defaultEntityId, name: data.defaultEntityName },
      dates: data.dateOptions,
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
    if (!settings.selfServiceEnabled || settings.rolloutStage === "reception") {
      return NextResponse.json({ error: "O autoagendamento de Consulentes ainda não está liberado." }, { status: 403 });
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "save-settings") {
      await savePilotPersonPreferences(context.organizationId, context.personId, {
        consulenteOpenUpcomingOnLogin: body.openUpcomingOnLogin !== false,
      });
      return NextResponse.json({ ok: true, message: "Configuração salva." });
    }

    if (action === "update-profile") {
      const fullName = asText(body.fullName);
      const whatsapp = normalizeBrazilPhone(body.whatsapp);
      const email = asText(body.email).toLowerCase();
      if (!fullName || whatsapp.length < 10 || (email && !email.includes("@"))) {
        return NextResponse.json({ error: "Confira nome, WhatsApp e e-mail." }, { status: 400 });
      }
      const { error } = await supabaseAdmin.from("oh_people").update({
        full_name: fullName,
        whatsapp,
        notification_email: email || null,
        updated_at: new Date().toISOString(),
      }).eq("organization_id", context.organizationId).eq("id", context.personId);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Dados pessoais atualizados." });
    }

    if (action === "book") {
      const appointmentDate = asText(body.appointmentDate);
      const preferences = await loadPilotPersonPreferences(context.organizationId, context.personId);
      if (!appointmentDate || !preferences.defaultEntityId) {
        return NextResponse.json({ error: "Não há Entidade padrão disponível para este cadastro." }, { status: 409 });
      }
      const validDates = await loadPilotDates(context.organizationId, settings.daysAhead);
      if (!validDates.some((item) => item.date === appointmentDate)) {
        return NextResponse.json({ error: "Escolha uma das datas de atendimento disponíveis." }, { status: 409 });
      }
      const entities = await loadPilotDay(context.organizationId, appointmentDate);
      let entity = entities.find((item) => item.id === preferences.defaultEntityId && item.isAvailable && item.available > 0);
      if (!entity) entity = entities.find((item) => /passe/i.test(item.name) && item.isAvailable && item.available > 0);
      if (!entity) return NextResponse.json({ error: "Sua Entidade padrão não possui vaga nesta data e não há Passe disponível." }, { status: 409 });

      const firstTimeBooking = isPilotFirstTimeEntity(entity);
      if (firstTimeBooking && await personHasUsedPilotFirstTimeEntity(context.organizationId, context.personId)) {
        return NextResponse.json({ error: "Você já possui um atendimento de Primeira Vez registrado e não pode utilizar esta Entidade novamente." }, { status: 409 });
      }

      const token = createConfirmationToken();
      const deadline = confirmationDeadlineIso(appointmentDate, settings.confirmationCutoff);
      const { data: reservationData, error: reservationError } = await supabaseAdmin.rpc("oh_tucxa_pilot_reserve_appointment", {
        p_organization_id: context.organizationId,
        p_person_id: context.personId,
        p_entity_id: entity.id,
        p_appointment_date: appointmentDate,
        p_scheduled_by_person_id: context.personId,
        p_booking_channel: "consulente_piloto",
        p_consulente_name: context.fullName,
        p_whatsapp: context.whatsapp || null,
        p_email: context.email || null,
        p_notes: null,
        p_confirmation_token_hash: confirmationTokenHash(token),
        p_confirmation_expires_at: deadline,
        p_appointment_time: settings.appointmentTime,
      });
      if (reservationError) throw reservationError;
      const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as { appointment_id?: string; confirmed_order?: number } | null;
      if (!reservation?.appointment_id) throw new Error("Reserva criada sem identificador.");

      if (firstTimeBooking) {
        await markPilotFirstTimeAppointment(context.organizationId, reservation.appointment_id, {
          id: entity.id,
          name: entity.name.replace(/\s*\([^)]*\)\s*$/, "").trim() || "Primeira Vez",
        });
      } else {
        await closePreviousPilotFirstTimeIndicators(context.organizationId, context.personId, reservation.appointment_id);
      }

      const link = confirmationUrl(token);
      const dispatch = context.whatsapp ? await sendTucxaAppointmentWhatsapp({
        kind: "confirmation",
        fullName: firstTwoPersonNames(context.fullName),
        recipientName: context.fullName,
        whatsapp: context.whatsapp,
        appointmentDate,
        entityName: entity.name,
        confirmationUrl: link,
        appointmentOrder: Number(reservation.confirmed_order ?? 0) || null,
        individualNotice: TUCXA_INDIVIDUAL_NOTICE,
      }) : { sent: false, provider: "disabled" as const, error: "WhatsApp não informado." };

      if (dispatch.sent) {
        await supabaseAdmin.from("oh_consulente_appointments").update({ confirmation_sent_at: new Date().toISOString(), confirmation_channel: "whatsapp_botconversa", updated_at: new Date().toISOString() }).eq("id", reservation.appointment_id);
        void sendTucxaAppointmentAuditEmail({
          event: "WhatsApp de confirmação enviado",
          consulenteName: context.fullName,
          appointmentDate,
          entityName: entity.name,
          message: appointmentConfirmationMessage({ fullName: context.fullName, appointmentDate, entityName: entity.name, order: Number(reservation.confirmed_order ?? 0) || null, confirmationUrl: link }),
        });
      }
      return NextResponse.json({ ok: true, message: `Agendamento realizado para ${appointmentDate}.`, appointmentId: reservation.appointment_id });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("[TUCXA Consulente piloto POST]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível concluir a operação." }, { status: 500 });
  }
}
