import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  findTucxaOrganization,
  isCampinasHoliday,
  PILOT_ACTIVE_STATUSES,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import {
  sendTucxaAppointmentWhatsapp,
  sendTucxaOperationalSummaryWhatsapp,
} from "@/lib/botconversa";
import {
  sendTucxaAppointmentAuditEmail,
  sendTucxaOperationalSummaryEmail,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { TUCXA_INDIVIDUAL_NOTICE } from "@/lib/organizacao-em-harmonia/tucxa-appointment-messages";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function authorize(request: Request) {
  const secrets = [process.env.CRON_SECRET, process.env.TUCXA_SCHEDULER_SECRET]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];
  if (!secrets.length) return false;
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return secrets.some((secret) => authorization === `Bearer ${secret}`);
}

function validIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function weekdayUtc(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "";
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const requestedDate = text(url.searchParams.get("date")) || todayInSaoPaulo();
    const send = url.searchParams.get("send") === "1";
    const requestedEntity = text(url.searchParams.get("entity")) || "Teste";

    if (!validIsoDate(requestedDate)) {
      return NextResponse.json({ error: "Informe date no formato YYYY-MM-DD." }, { status: 400 });
    }

    if (isCampinasHoliday(requestedDate)) {
      return NextResponse.json({
        ok: true,
        simulation: true,
        sendRequested: send,
        date: requestedDate,
        blocked: true,
        reason: "holiday_or_no_service_date",
        messagesSent: 0,
      });
    }

    // O envio real desta rota de homologação é deliberadamente limitado a
    // quarta/quinta/sexta e exclusivamente à Entidade Teste.
    const weekday = weekdayUtc(requestedDate);
    const allowedTestWeekday = [3, 4, 5].includes(weekday);
    if (send && !allowedTestWeekday) {
      return NextResponse.json({
        error: "O envio de homologação só é permitido em quarta, quinta ou sexta.",
        date: requestedDate,
        weekday,
      }, { status: 409 });
    }

    if (send && normalize(requestedEntity) !== "teste") {
      return NextResponse.json({
        error: "Por segurança, o envio de homologação é permitido somente para a Entidade Teste.",
      }, { status: 409 });
    }

    const organization = await findTucxaOrganization();
    if (!organization) {
      return NextResponse.json({ error: "Organização TUCXA não localizada." }, { status: 404 });
    }

    // A rota de homologação pode localizar a Entidade Teste mesmo quando ela
    // permanece inativa na operação real. Assim, não precisamos ativá-la no
    // cadastro apenas para validar os disparos automáticos.
    const { data: entity, error: entityError } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id,name,daily_capacity,active")
      .eq("organization_id", organization.id)
      .ilike("name", requestedEntity)
      .order("name")
      .limit(1)
      .maybeSingle();
    if (entityError) throw entityError;
    if (!entity?.id) {
      return NextResponse.json({ error: `Entidade ${requestedEntity} não localizada.` }, { status: 404 });
    }

    if (send && normalize(entity.name) !== "teste") {
      return NextResponse.json({ error: "A Entidade localizada não é exatamente 'Teste'." }, { status: 409 });
    }

    const { data: links, error: linkError } = await supabaseAdmin
      .from("oh_person_entity_links")
      .select("person_id")
      .eq("organization_id", organization.id)
      .eq("entity_id", entity.id)
      .eq("relationship_type", "recebe")
      .eq("active", true);
    if (linkError) throw linkError;

    const personIds = [...new Set((links ?? []).map((item) => text(item.person_id)).filter(Boolean))];
    const { data: people, error: peopleError } = personIds.length
      ? await supabaseAdmin
          .from("oh_people")
          .select("id,full_name,whatsapp,email,notification_email,active")
          .eq("organization_id", organization.id)
          .in("id", personIds)
          .eq("active", true)
      : { data: [], error: null };
    if (peopleError) throw peopleError;

    const testPerson = (people ?? []).find((person) => text(person.whatsapp));
    if (!testPerson) {
      return NextResponse.json({
        error: "A Entidade Teste não possui Cavalinho ativo com WhatsApp para homologação.",
      }, { status: 409 });
    }

    const { data: appointments, error: appointmentError } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id,consulente_name,status")
      .eq("organization_id", organization.id)
      .eq("entity_id", entity.id)
      .eq("appointment_date", requestedDate)
      .in("status", PILOT_ACTIVE_STATUSES)
      .order("created_at");
    if (appointmentError) throw appointmentError;

    const names = (appointments ?? [])
      .map((item) => text(item.consulente_name))
      .filter(Boolean);
    const testNames = names.length ? names : ["Agendamento Teste 1", "Agendamento Teste 2"];
    const capacity = Math.max(1, Number(entity.daily_capacity ?? 4) || 4);
    const entityName = text(entity.name) || "Teste";
    const recipientName = text(testPerson.full_name) || "Teste";
    const whatsapp = text(testPerson.whatsapp);
    const email = text(testPerson.notification_email)
      || (text(testPerson.email).endsWith("@organizacao-em-harmonia.local") ? "" : text(testPerson.email));
    const summary = [
      `HOMOLOGAÇÃO - Atendimentos de ${requestedDate}`,
      `${entityName} ${testNames.length}/${capacity}`,
      ...testNames.map((name, index) => `${index + 1}. ${name}`),
    ].join("\n");

    const configured = {
      botconversaEnabled: String(process.env.BOTCONVERSA_ENABLED || "").toLowerCase() === "true",
      tucxaEnabled: String(process.env.BOTCONVERSA_TUCXA_ENABLED || "").toLowerCase() === "true",
      reminderFlow: Boolean(text(process.env.BOTCONVERSA_TUCXA_REMINDER_FLOW_ID || process.env.BOTCONVERSA_TUCXA_REMINDER_FLOW)),
      cavalinhoFlow: Boolean(text(process.env.BOTCONVERSA_TUCXA_CAVALINHO_DAILY_FLOW_ID || process.env.BOTCONVERSA_TUCXA_CAVALINHO_DAILY_FLOW)),
      receptionFlow: Boolean(text(process.env.BOTCONVERSA_TUCXA_RECEPTION_DAILY_FLOW_ID || process.env.BOTCONVERSA_TUCXA_RECEPTION_DAILY_FLOW)),
      smtp: Boolean(text(process.env.SMTP_HOST) && text(process.env.SMTP_USER) && text(process.env.SMTP_PASS)),
    };

    if (!send) {
      return NextResponse.json({
        ok: true,
        simulation: true,
        mode: "dry_run",
        date: requestedDate,
        weekday,
        allowedTestWeekday,
        holiday: false,
        entity: { id: entity.id, name: entityName, capacity, activeInRealOperation: Boolean(entity.active) },
        target: {
          personId: testPerson.id,
          name: recipientName,
          whatsapp: maskPhone(whatsapp),
          email: maskEmail(email),
        },
        appointments: testNames,
        usesSyntheticAppointments: !names.length,
        configured,
        plannedMessages: [
          "1 lembrete de Consulente direcionado ao próprio Cavalinho da Entidade Teste",
          "1 resumo de Cavalinho direcionado ao próprio Cavalinho da Entidade Teste",
          "1 resumo de Recepção direcionado ao próprio Cavalinho da Entidade Teste",
          email ? "1 e-mail de resumo para o próprio Cavalinho da Entidade Teste" : "e-mail de resumo não planejado: endereço não disponível",
        ],
        databaseWrites: 0,
      });
    }

    const reminder = await sendTucxaAppointmentWhatsapp({
      kind: "reminder",
      fullName: testNames[0] || "Agendamento Teste",
      recipientName,
      whatsapp,
      appointmentDate: requestedDate,
      entityName,
      appointmentOrder: null,
      reminderOffsetHours: null,
      individualNotice: `[HOMOLOGAÇÃO] Esta mensagem foi enviada somente para validar o fluxo automático do TUCXA. ${TUCXA_INDIVIDUAL_NOTICE}`,
    });

    const cavalinho = await sendTucxaOperationalSummaryWhatsapp({
      recipientName,
      whatsapp,
      appointmentDate: requestedDate,
      entityName,
      summary: `[HOMOLOGAÇÃO - CAVALINHO]\n${summary}`,
      audience: "cavalinho",
    });

    const reception = await sendTucxaOperationalSummaryWhatsapp({
      recipientName,
      whatsapp,
      appointmentDate: requestedDate,
      entityName: "Resumo da Recepção - TESTE",
      summary: `[HOMOLOGAÇÃO - RECEPÇÃO]\n${summary}`,
      audience: "reception",
    });

    const emailSent = email
      ? await sendTucxaOperationalSummaryEmail({
          to: email,
          recipientName,
          appointmentDate: requestedDate,
          summary: `[HOMOLOGAÇÃO - RECEPÇÃO]\n${summary}`,
        })
      : false;

    void sendTucxaAppointmentAuditEmail({
      event: "Homologação dos disparos automáticos",
      appointmentDate: requestedDate,
      entityName,
      details: [
        `Destinatário de teste: ${recipientName}`,
        `Lembrete: ${reminder.sent ? "enviado" : `falhou - ${reminder.error || "sem detalhe"}`}`,
        `Resumo Cavalinho: ${cavalinho.sent ? "enviado" : `falhou - ${cavalinho.error || "sem detalhe"}`}`,
        `Resumo Recepção WhatsApp: ${reception.sent ? "enviado" : `falhou - ${reception.error || "sem detalhe"}`}`,
        `Resumo Recepção e-mail: ${emailSent ? "enviado" : email ? "não confirmado" : "não configurado"}`,
      ].join("\n"),
    });

    return NextResponse.json({
      ok: reminder.sent && cavalinho.sent && reception.sent,
      simulation: true,
      mode: "send_test",
      date: requestedDate,
      entity: entityName,
      recipient: recipientName,
      databaseWrites: 0,
      reminder: { sent: reminder.sent, provider: reminder.provider, error: reminder.error || "" },
      cavalinho: { sent: cavalinho.sent, provider: cavalinho.provider, error: cavalinho.error || "" },
      reception: { sent: reception.sent, provider: reception.provider, error: reception.error || "" },
      email: { attempted: Boolean(email), sent: emailSent },
    });
  } catch (error) {
    console.error("[TUCXA simulação de disparos]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível executar a simulação." },
      { status: 500 },
    );
  }
}
