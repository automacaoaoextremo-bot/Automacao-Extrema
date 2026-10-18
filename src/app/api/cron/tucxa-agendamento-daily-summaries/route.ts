import { receptionScheduledForDate } from "@/lib/organizacao-em-harmonia/tucxa-reception-schedule";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  isCampinasHoliday,
  loadPilotSettings,
  PILOT_ACTIVE_STATUSES,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaOperationalSummaryWhatsapp } from "@/lib/botconversa";
import {
  sendTucxaAppointmentAuditEmail,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";

import { formatTucxaReceptionSummary } from "@/lib/organizacao-em-harmonia/tucxa-appointment-reception-summary";
import { dispatchDateAllowed, generalDispatchAllowed, homologationAppointmentId, mediumDispatchAllowed, receptionDispatchAllowed } from "@/lib/organizacao-em-harmonia/tucxa-appointment-homologation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
}

function saoPauloTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function weekdaySaoPaulo() {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(new Date());
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? new Date().getDay();
}

function due(now: string, configured: string) {
  const [nh, nm] = now.split(":").map(Number);
  const [ch, cm] = configured.split(":").map(Number);
  return (nh * 60 + nm) >= (ch * 60 + cm);
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function profileHasReception(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => normalize(item).includes("recepc"));
  }

  const profile = record(value);
  if (profile.supportsReception === true || profile.isReception === true) return true;
  if (normalize(profile.pilotAccessKind) === "recepcao") return true;

  const arrays = [profile.functionSlugs, profile.functions, profile.selectedFunctions];
  for (const source of arrays) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      const itemRecord = record(item);
      const candidate = normalize(itemRecord.slug || itemRecord.label || itemRecord.name || item);
      if (candidate.includes("recepc")) return true;
    }
  }

  return normalize(JSON.stringify(profile)).includes("recepc");
}

function authorize(request: Request) {
  const secrets = [process.env.CRON_SECRET, process.env.TUCXA_SCHEDULER_SECRET]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];
  if (!secrets.length) return false;
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return secrets.some((secret) => authorization === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const date = todayInSaoPaulo();
    const now = saoPauloTime();
    const weekday = weekdaySaoPaulo();
    if (!dispatchDateAllowed(date)) {
      return NextResponse.json({ ok: true, blocked: true, reason: "homologation_guard", date, results: [] });
    }

    // 12/10/2026 e demais feriados/datas sem atendimento são barrados antes
    // de qualquer gravação em oh_tucxa_pilot_daily_dispatches.
    if (isCampinasHoliday(date)) {
      return NextResponse.json({
        ok: true,
        date,
        time: now,
        weekday,
        blocked: true,
        reason: "holiday_or_no_service_date",
        diagnostics: [{ status: "skipped", reason: "holiday_or_no_service_date", date }],
        results: [],
      });
    }

    const { data: organizations, error: orgError } = await supabaseAdmin
      .from("oh_organizations")
      .select("id,name,slug")
      .or("slug.eq.tucxa,name.ilike.%tucxa%");
    if (orgError) throw orgError;

    const results: Array<Record<string, unknown>> = [];
    const diagnostics: Array<Record<string, unknown>> = [];

    for (const organization of organizations ?? []) {
      const organizationId = text(organization.id);
      if (!organizationId) continue;

      const organizationLabel = text(organization.name) || text(organization.slug) || organizationId;
      const settings = await loadPilotSettings(organizationId);

      if (!settings.automaticDispatchWeekdays.includes(weekday)) {
        diagnostics.push({
          organization: organizationLabel,
          status: "skipped",
          reason: "weekday_not_enabled",
          weekday,
          configuredWeekdays: settings.automaticDispatchWeekdays,
        });
        continue;
      }

      const sendCavalinhos = settings.cavalinhoDailyWhatsappEnabled && due(now, settings.cavalinhoDailyWhatsappTime);
      const sendReception = settings.receptionDailyWhatsappEnabled && due(now, settings.receptionDailyWhatsappTime);

      if (!sendCavalinhos && !sendReception) {
        diagnostics.push({
          organization: organizationLabel,
          status: "skipped",
          reason: "dispatch_not_due_or_disabled",
          time: now,
          cavalinhoEnabled: settings.cavalinhoDailyWhatsappEnabled,
          cavalinhoTime: settings.cavalinhoDailyWhatsappTime,
          receptionEnabled: settings.receptionDailyWhatsappEnabled,
          receptionTime: settings.receptionDailyWhatsappTime,
        });
        continue;
      }

      const { data: appointments, error: appointmentError } = await supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id,entity_id,consulente_name,appointment_time,status,metadata")
        .eq("organization_id", organizationId)
        .eq("appointment_date", date)
        .in("status", PILOT_ACTIVE_STATUSES)
        .order("created_at");
      if (appointmentError) throw appointmentError;

      const testAppointments = (appointments ?? []).filter((item) => text(item.id) === homologationAppointmentId());
      if (!generalDispatchAllowed(date) && !testAppointments.length) {
        diagnostics.push({ organization: organizationLabel, status: "skipped", reason: "test_appointment_missing" });
        continue;
      }

      if (!(appointments ?? []).length) {
        diagnostics.push({
          organization: organizationLabel,
          status: "skipped",
          reason: "no_appointments_for_date",
          date,
        });
        continue;
      }

      diagnostics.push({
        organization: organizationLabel,
        status: "processing",
        date,
        appointmentsFound: (appointments ?? []).length,
        homologationAppointments: testAppointments.length,
        sendCavalinhos,
        sendReception,
      });

      const entityIds = [...new Set((appointments ?? []).map((item) => text(item.entity_id)).filter(Boolean))];
      const { data: entities, error: entityError } = entityIds.length
        ? await supabaseAdmin
            .from("oh_spiritual_entities")
            .select("id,name,line,daily_capacity,pilot_cavalinho_whatsapp_enabled")
            .eq("organization_id", organizationId)
            .in("id", entityIds)
        : { data: [], error: null };
      if (entityError) throw entityError;

      const entityNames = new Map((entities ?? []).map((item) => [text(item.id), text(item.name)]));
      const entityCapacities = new Map((entities ?? []).map((item) => [
        text(item.id),
        Math.max(1, Number(item.daily_capacity ?? 4) || 4),
      ]));

      const entityLines = new Map((entities ?? []).map((item) => [text(item.id), text(item.line)]));
      const grouped = new Map<string, NonNullable<typeof appointments>>();
      for (const item of generalDispatchAllowed(date) ? (appointments ?? []) : testAppointments) {
        const entityId = text(item.entity_id);
        if (!entityId) continue;
        const list = grouped.get(entityId) ?? [];
        list.push(item);
        grouped.set(entityId, list);
      }

      const alreadySent = async (audience: string, personId: string) => {
        const { data, error } = await supabaseAdmin
          .from("oh_tucxa_pilot_daily_dispatches")
          .select("id,status")
          .eq("organization_id", organizationId)
          .eq("dispatch_date", date)
          .eq("audience", audience)
          .eq("recipient_person_id", personId)
          .maybeSingle();
        if (error) throw error;
        return data?.status === "sent";
      };

      const markSent = async (audience: string, personId: string, ok: boolean, detail: string) => {
        const { error } = await supabaseAdmin
          .from("oh_tucxa_pilot_daily_dispatches")
          .upsert({
            organization_id: organizationId,
            dispatch_date: date,
            audience,
            recipient_person_id: personId,
            sent_at: ok ? new Date().toISOString() : null,
            status: ok ? "sent" : "error",
            detail,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "organization_id,dispatch_date,audience,recipient_person_id",
          });
        if (error) throw error;
      };

      if (sendCavalinhos) {
        const enabledEntityIds = entityIds; // Todos os cavalinhos com vínculo ativo e atendimento previsto.
        diagnostics.push({
          organization: organizationLabel,
          audience: "cavalinho",
          enabledEntities: enabledEntityIds.length,
          totalEntitiesWithAppointments: entityIds.length,
        });

        const { data: links, error: linkError } = enabledEntityIds.length
          ? await supabaseAdmin
              .from("oh_person_entity_links")
              .select("person_id,entity_id")
              .eq("organization_id", organizationId)
              .eq("relationship_type", "recebe")
              .eq("active", true)
              .in("entity_id", enabledEntityIds)
          : { data: [], error: null };
        if (linkError) throw linkError;

        const personIds = [...new Set((links ?? []).map((item) => text(item.person_id)).filter(Boolean))];
        const { data: people, error: peopleError } = personIds.length
          ? await supabaseAdmin
              .from("oh_people")
              .select("id,full_name,whatsapp,active")
              .eq("organization_id", organizationId)
              .in("id", personIds)
              .eq("active", true)
          : { data: [], error: null };
        if (peopleError) throw peopleError;

        const peopleMap = new Map((people ?? []).map((item) => [text(item.id), item]));
        const entitiesByPerson = new Map<string, string[]>();
        for (const link of links ?? []) {
          const personId = text(link.person_id);
          const entityId = text(link.entity_id);
          if (!personId || !entityId || !(grouped.get(entityId) ?? []).length) continue;
          entitiesByPerson.set(personId, [...(entitiesByPerson.get(personId) ?? []), entityId]);
        }

        if (!personIds.length) {
          diagnostics.push({
            organization: organizationLabel,
            audience: "cavalinho",
            status: "skipped",
            reason: enabledEntityIds.length ? "no_active_cavalinho_links" : "no_entities_enabled_for_cavalinho_summary",
          });
        }

        for (const [personId, linkedEntityIds] of entitiesByPerson.entries()) {
          const person = peopleMap.get(personId);
          if (!person) {
            diagnostics.push({ audience: "cavalinho", personId, status: "skipped", reason: "person_not_active_or_not_found" });
            continue;
          }
          if (!mediumDispatchAllowed(date, personId, text(person.whatsapp))) {
            diagnostics.push({ audience: "cavalinho", personId, status: "skipped", reason: "homologation_recipient_guard" });
            continue;
          }
          if (!text(person.whatsapp)) {
            diagnostics.push({ audience: "cavalinho", personId, person: text(person.full_name), status: "skipped", reason: "missing_whatsapp" });
            continue;
          }
          if (await alreadySent("cavalinho", personId)) {
            diagnostics.push({ audience: "cavalinho", personId, person: text(person.full_name), status: "skipped", reason: "already_sent" });
            continue;
          }

          const sections = linkedEntityIds
            .map((entityId) => {
              const list = grouped.get(entityId) ?? [];
              const entityName = entityNames.get(entityId) || "Entidade";
              const capacity = entityCapacities.get(entityId) || 4;
              const lines = [...list].sort((a, b) => text(a.consulente_name).localeCompare(text(b.consulente_name), "pt-BR")).map((item, index) => `${index + 1}. ${text(item.consulente_name)}`).join("\n");
              return `Atendimentos de hoje - ${entityName} ${list.length}/${capacity}\n${lines}`;
            })
            .filter(Boolean);
          const summary = sections.join("\n\n");
          const entityLabel = linkedEntityIds.map((id) => entityNames.get(id) || "Entidade").join(" + ");

          const result = await sendTucxaOperationalSummaryWhatsapp({
            recipientName: text(person.full_name),
            whatsapp: text(person.whatsapp),
            appointmentDate: date,
            entityName: entityLabel || "Resumo do Cavalinho",
            summary,
            audience: "cavalinho",
          });

          await markSent("cavalinho", personId, result.sent, result.error || summary);
          results.push({
            audience: "cavalinho",
            person: firstName(text(person.full_name)),
            entities: linkedEntityIds.map((id) => entityNames.get(id) || "Entidade"),
            sent: result.sent,
            error: result.error || "",
          });

          {
            const auditCopied = await sendTucxaAppointmentAuditEmail({
              event: result.sent ? "Resumo diário enviado ao Cavalinho" : "Falha no resumo diário do Cavalinho",
              appointmentDate: date,
              entityName: entityLabel || "Entidade",
              details: `Destinatário: ${text(person.full_name)}\nTelefone: ${text(person.whatsapp)}\nCanal: WhatsApp\nResultado: ${result.sent ? "enviado" : "falhou"}\nFalhas: ${result.error || "nenhuma"}\n\n${summary}`,
            });
            if (!auditCopied) diagnostics.push({ audience: "cavalinho", personId, status: "audit_failed" });
          }
        }
      }

      if (sendReception) {
        const { data: memberships, error: membershipError } = await supabaseAdmin
          .from("oh_memberships")
          .select("person_id,agenda_viva_profile,active")
          .eq("organization_id", organizationId)
          .eq("active", true);
        if (membershipError) throw membershipError;

        // Função Recepção aprovada + escala da data; a antiga allowlist não impede o resumo.
        const receptionIds = [...new Set(
          (memberships ?? [])
            .filter((item) => profileHasReception(item.agenda_viva_profile))
            .filter((item) => receptionScheduledForDate(record(item.agenda_viva_profile).receptionSchedule, date))
            .map((item) => text(item.person_id))
            .filter(Boolean),
        )];

        const { data: people, error: peopleError } = receptionIds.length
          ? await supabaseAdmin
              .from("oh_people")
              .select("id,full_name,whatsapp,email,notification_email,active")
              .eq("organization_id", organizationId)
              .in("id", receptionIds)
              .eq("active", true)
          : { data: [], error: null };
        if (peopleError) throw peopleError;

        const { data: receptionLinks, error: receptionLinksError } = await supabaseAdmin
          .from("oh_person_entity_links")
          .select("entity_id,person_id")
          .eq("organization_id", organizationId)
          .eq("relationship_type", "recebe")
          .eq("active", true)
          .in("entity_id", entityIds);
        if (receptionLinksError) throw receptionLinksError;
        const holderIds = [...new Set((receptionLinks ?? []).map((link) => text(link.person_id)).filter(Boolean))];
        const { data: holders, error: holdersError } = holderIds.length
          ? await supabaseAdmin.from("oh_people").select("id,full_name").eq("organization_id", organizationId).in("id", holderIds)
          : { data: [], error: null };
        if (holdersError) throw holdersError;
        const holderNames = new Map((holders ?? []).map((holder) => [text(holder.id), firstName(text(holder.full_name))]));
        const cavalinhoNames = new Map((receptionLinks ?? []).map((link) => [text(link.entity_id), holderNames.get(text(link.person_id)) || ""]));
        const summary = formatTucxaReceptionSummary({
          date,
          appointments: appointments ?? [],
          entityNames,
          entityLines,
          entityCapacities,
          cavalinhoNames,
        });

        diagnostics.push({
          organization: organizationLabel,
          audience: "reception",
          receptionMembershipsFound: receptionIds.length,
          activeReceptionPeopleFound: (people ?? []).length,
          dispatchPolicy: "approved_reception_schedule",
          allowlistSize: null,
        });

        for (const person of people ?? []) {
          const personId = text(person.id);
          const channels: Array<"whatsapp"> = ["whatsapp"];
          if (!receptionDispatchAllowed(date, personId, text(person.whatsapp))) {
            diagnostics.push({ audience: "reception", personId, status: "skipped", reason: "homologation_recipient_guard" });
            continue;
          }
          if (!text(person.whatsapp)) {
            diagnostics.push({ audience: "reception", personId, status: "skipped", reason: "missing_whatsapp" });
            continue;
          }
          if (await alreadySent("reception", personId)) {
            diagnostics.push({ audience: "reception", personId, person: text(person.full_name), status: "skipped", reason: "already_sent" });
            continue;
          }

          let whatsappSent = false;
          const emailSent = false;
          const errors: string[] = [];

          if (channels.includes("whatsapp")) {
            if (text(person.whatsapp)) {
              const result = await sendTucxaOperationalSummaryWhatsapp({
                recipientName: text(person.full_name),
                whatsapp: text(person.whatsapp),
                appointmentDate: date,
                entityName: "Resumo da Recepção",
                summary,
                audience: "reception",
              });
              whatsappSent = result.sent;
              if (!result.sent && result.error) errors.push(`WhatsApp: ${result.error}`);
            } else {
              errors.push("WhatsApp: contato não informado");
            }
          }

          const sentAny = whatsappSent || emailSent;
          await markSent("reception", personId, sentAny, errors.length ? errors.join(" | ") : summary);
          results.push({
            audience: "reception",
            person: firstName(text(person.full_name)),
            channels,
            whatsappSent,
            emailSent,
            sent: sentAny,
            error: errors.join(" | "),
          });

          {
            const auditCopied = await sendTucxaAppointmentAuditEmail({
              event: whatsappSent ? "Resumo diário enviado à Recepção" : "Falha no resumo diário da Recepção",
              appointmentDate: date,
              details: `Destinatário: ${text(person.full_name)}\nTelefone: ${text(person.whatsapp)}\nCanal: WhatsApp\nResultado: ${whatsappSent ? "enviado" : "falhou"}\nFalhas: ${errors.join(" | ") || "nenhuma"}\n\n${summary}`,
            });
            if (!auditCopied) diagnostics.push({ audience: "reception", personId, status: "audit_failed" });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, date, time: now, weekday, diagnostics, results });
  } catch (error) {
    console.error("[TUCXA cron resumos diários]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível processar os resumos diários do TUCXA." },
      { status: 500 },
    );
  }
}
