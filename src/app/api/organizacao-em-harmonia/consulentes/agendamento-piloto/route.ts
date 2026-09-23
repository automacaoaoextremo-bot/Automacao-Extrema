import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  addDaysIso,
  confirmationDeadlineIso,
  currentPilotConsulente,
  expirePastPilotConfirmations,
  isPastConfirmationDeadline,
  loadPilotAppointments,
  loadPilotDates,
  loadPilotDay,
  loadPilotPersonPreferences,
  loadPilotSettings,
  pilotReservationError,
  savePilotPersonPreferences,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

export const dynamic = "force-dynamic";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hourList(value: unknown) {
  const source = Array.isArray(value) ? value : asText(value).split(/[;,\s]+/);
  const parsed = source
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0 && item <= 720)
    .map((item) => Math.round(item));
  return Array.from(new Set(parsed)).sort((a, b) => b - a).slice(0, 8);
}

function requestId() {
  return crypto.randomUUID().slice(0, 8);
}

async function buildPayload(context: NonNullable<Awaited<ReturnType<typeof currentPilotConsulente>>>, selectedDate?: string) {
  await expirePastPilotConfirmations(context.organizationId, context.personId);
  const settings = await loadPilotSettings(context.organizationId);
  const dates = await loadPilotDates(context.organizationId, settings.daysAhead);
  const selected = dates.some((item) => item.date === selectedDate) ? selectedDate! : dates[0]?.date || todayInSaoPaulo();
  const matrixDates = dates.slice(0, 16);
  const [entities, appointments, preferences, matrixEntities] = await Promise.all([
    loadPilotDay(context.organizationId, selected),
    loadPilotAppointments(context.organizationId, todayInSaoPaulo(), addDaysIso(todayInSaoPaulo(), settings.daysAhead), context.personId),
    loadPilotPersonPreferences(context.organizationId, context.personId),
    Promise.all(matrixDates.map(async (item) => ({ date: item.date, label: item.label, entities: await loadPilotDay(context.organizationId, item.date) }))),
  ]);
  return { settings, dates, selectedDate: selected, entities, appointments, preferences, calendar: matrixEntities };
}

export async function GET(request: Request) {
  const code = requestId();
  try {
    const context = await currentPilotConsulente(request);
    if (!context) return NextResponse.json({ error: "Sua sessão expirou ou este acesso não pertence a um Filho de Fora/Consulente.", requestId: code }, { status: 401 });
    const date = asText(new URL(request.url).searchParams.get("date"));
    return NextResponse.json({
      ok: true,
      profile: { fullName: context.fullName },
      ...(await buildPayload(context, date)),
    });
  } catch (error) {
    console.error("[TUCXA piloto consulente GET]", { requestId: code, error });
    return NextResponse.json({ error: "Não foi possível carregar seus agendamentos.", requestId: code }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const code = requestId();
  try {
    const context = await currentPilotConsulente(request);
    if (!context) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente.", requestId: code }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);
    const settings = await loadPilotSettings(context.organizationId);

    if (action === "book") {
      let entityId = asText(body.entityId);
      const appointmentDate = asText(body.appointmentDate);
      const notes = asText(body.notes);
      const preferences = await loadPilotPersonPreferences(context.organizationId, context.personId);

      if (settings.useDefaultEntity && preferences.defaultEntityId) {
        if (!settings.allowDifferentEntity) entityId = preferences.defaultEntityId;
        if (settings.allowDifferentEntity && !entityId) entityId = preferences.defaultEntityId;
      }
      if (!entityId || !appointmentDate) return NextResponse.json({ error: "Escolha a data e a Entidade.", requestId: code }, { status: 400 });
      if (settings.useDefaultEntity && preferences.defaultEntityId && !settings.allowDifferentEntity && entityId !== preferences.defaultEntityId) {
        return NextResponse.json({ error: "Neste momento seu agendamento deve usar a Entidade padrão definida pela Recepção.", requestId: code }, { status: 409 });
      }

      const deadline = confirmationDeadlineIso(appointmentDate, settings.confirmationCutoff);
      if (isPastConfirmationDeadline(deadline)) {
        return NextResponse.json({ error: `O prazo de confirmação desta data encerrou às ${settings.confirmationCutoff}. Escolha outra data.`, requestId: code }, { status: 409 });
      }
      const entity = (await loadPilotDay(context.organizationId, appointmentDate)).find((item) => item.id === entityId);
      if (!entity) return NextResponse.json({ error: "A Entidade não está prevista para esta data.", requestId: code }, { status: 409 });
      if (!entity.isAvailable || entity.available < 1) return NextResponse.json({ error: entity.suspendedReason || "Não há vagas para esta Entidade.", requestId: code }, { status: 409 });

      const { data, error } = await supabaseAdmin.rpc("oh_tucxa_pilot_reserve_appointment", {
        p_organization_id: context.organizationId,
        p_person_id: context.personId,
        p_entity_id: entityId,
        p_appointment_date: appointmentDate,
        p_scheduled_by_person_id: context.personId,
        p_booking_channel: "consulente_piloto",
        p_consulente_name: context.fullName,
        p_whatsapp: context.whatsapp || null,
        p_email: context.email || null,
        p_notes: notes || null,
        p_confirmation_token_hash: null,
        p_confirmation_expires_at: deadline,
        p_appointment_time: settings.appointmentTime,
      });
      if (error) throw error;
      const reservation = (Array.isArray(data) ? data[0] : data) as { appointment_id?: string; confirmed_order?: number; confirmed_capacity?: number; confirmed_status?: string } | null;
      if (!reservation?.appointment_id) throw new Error("Reserva criada sem identificador.");
      return NextResponse.json({
        ok: true,
        appointment: {
          id: reservation.appointment_id,
          appointmentDate,
          appointmentTime: settings.appointmentTime,
          entityName: entity.name,
          order: Number(reservation.confirmed_order ?? 0) || null,
          status: reservation.confirmed_status || "solicitado",
          confirmationDeadline: deadline,
        },
        message: "Agendamento reservado. Agora confirme sua presença em Meus agendamentos.",
      });
    }

    if (action === "save-reminders") {
      const offsets = hourList(body.reminderOffsetsHours);
      await savePilotPersonPreferences(context.organizationId, context.personId, {
        reminderSmsEnabled: body.reminderSmsEnabled !== false,
        reminderOffsetsHours: offsets,
      });
      return NextResponse.json({ ok: true, message: "Preferências de lembretes atualizadas." });
    }

    if (action === "confirm") {
      const appointmentId = asText(body.appointmentId);
      if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId: code }, { status: 400 });
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id, confirmation_expires_at, status")
        .eq("organization_id", context.organizationId)
        .eq("person_id", context.personId)
        .eq("id", appointmentId)
        .maybeSingle();
      if (appointmentError) throw appointmentError;
      if (!appointment?.id) return NextResponse.json({ error: "Agendamento não localizado.", requestId: code }, { status: 404 });
      const deadline = asText(appointment.confirmation_expires_at);
      if (deadline && isPastConfirmationDeadline(deadline)) {
        await supabaseAdmin.from("oh_consulente_appointments").update({ confirmation_status: "expired", updated_at: new Date().toISOString() }).eq("id", appointment.id);
        return NextResponse.json({ error: `O prazo de confirmação encerrou às ${settings.confirmationCutoff}. Fale com a Recepção.`, requestId: code }, { status: 410 });
      }
      const now = new Date().toISOString();
      const { error } = await supabaseAdmin.from("oh_consulente_appointments").update({ status: "confirmado", confirmation_status: "confirmed", confirmed_at: now, confirmation_channel: "painel_consulente", updated_at: now }).eq("id", appointment.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Presença confirmada. Seu atendimento está reservado." });
    }

    if (action === "cancel") {
      const appointmentId = asText(body.appointmentId);
      if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado.", requestId: code }, { status: 400 });
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .update({ status: "cancelado", confirmation_status: "declined", cancelled_at: now, cancellation_reason: "Cancelado pelo Filho de Fora/Consulente no piloto", updated_at: now })
        .eq("organization_id", context.organizationId)
        .eq("person_id", context.personId)
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
    if (friendly.status >= 500) console.error("[TUCXA piloto consulente POST]", { requestId: code, error });
    return NextResponse.json({ error: friendly.message, requestId: code }, { status: friendly.status });
  }
}
