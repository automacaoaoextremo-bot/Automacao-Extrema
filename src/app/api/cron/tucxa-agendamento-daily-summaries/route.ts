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
  sendTucxaOperationalSummaryEmail,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";

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
        sendCavalinhos,
        sendReception,
      });

      const entityIds = [...new Set((appointments ?? []).map((item) => text(item.entity_id)).filter(Boolean))];
      const { data: entities, error: entityError } = entityIds.length
        ? await supabaseAdmin
            .from("oh_spiritual_entities")
            .select("id,name,daily_capacity,pilot_cavalinho_whatsapp_enabled")
            .eq("organization_id", organizationId)
            .in("id", entityIds)
        : { data: [], error: null };
      if (entityError) throw entityError;

      const entityNames = new Map((entities ?? []).map((item) => [text(item.id), text(item.name)]));
      const entityCapacities = new Map((entities ?? []).map((item) => [
        text(item.id),
        Math.max(1, Number(item.daily_capacity ?? 4) || 4),
      ]));
      const cavalinhoNoticeEntityIds = new Set(
        (entities ?? [])
          .filter((item) => item.pilot_cavalinho_whatsapp_enabled === true)
          .map((item) => text(item.id))
          .filter(Boolean),
      );

      const grouped = new Map<string, NonNullable<typeof appointments>>();
      for (const item of appointments ?? []) {
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
        const enabledEntityIds = entityIds.filter((entityId) => cavalinhoNoticeEntityIds.has(entityId));
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
              const lines = list.map((item, index) => `${index + 1}. ${text(item.consulente_name)}`).join("\n");
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

          if (result.sent) {
            void sendTucxaAppointmentAuditEmail({
              event: "Resumo diário enviado ao Cavalinho",
              appointmentDate: date,
              entityName: entityLabel || "Entidade",
              details: `Destinatário: ${text(person.full_name)}\n\n${summary}`,
            });
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

        const receptionIds = [...new Set(
          (memberships ?? [])
            .filter((item) => profileHasReception(item.agenda_viva_profile))
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

        const { data: preferences, error: preferenceError } = receptionIds.length
          ? await supabaseAdmin
              .from("oh_tucxa_pilot_person_preferences")
              .select("person_id,reception_summary_channels")
              .eq("organization_id", organizationId)
              .in("person_id", receptionIds)
          : { data: [], error: null };
        if (preferenceError) throw preferenceError;

        const receptionChannels = new Map(
          (preferences ?? []).map((item) => [
            text(item.person_id),
            Array.isArray(item.reception_summary_channels)
              ? item.reception_summary_channels.map((value) => text(value)).filter((value) => value === "whatsapp" || value === "email")
              : [],
          ]),
        );

        const summary = [...grouped.entries()]
          .sort((a, b) => (entityNames.get(a[0]) || "").localeCompare(entityNames.get(b[0]) || "", "pt-BR"))
          .map(([entityId, list]) => `${entityNames.get(entityId) || "Entidade"} ${list.length}/${entityCapacities.get(entityId) || 4}: ${list.map((item) => text(item.consulente_name)).join(", ")}`)
          .join("\n");

        diagnostics.push({
          organization: organizationLabel,
          audience: "reception",
          receptionMembershipsFound: receptionIds.length,
          activeReceptionPeopleFound: (people ?? []).length,
        });

        for (const person of people ?? []) {
          const personId = text(person.id);
          // Compatibilidade: Recepção sem preferência individual ainda gravada
          // herda WhatsApp quando o envio global da Recepção está habilitado.
          const channels = receptionChannels.has(personId)
            ? receptionChannels.get(personId) ?? []
            : ["whatsapp"];

          if (await alreadySent("reception", personId)) {
            diagnostics.push({ audience: "reception", personId, person: text(person.full_name), status: "skipped", reason: "already_sent" });
            continue;
          }

          if (!channels.length) {
            diagnostics.push({ audience: "reception", personId, person: text(person.full_name), status: "skipped", reason: "no_summary_channels" });
            continue;
          }

          let whatsappSent = false;
          let emailSent = false;
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

          const email = text(person.notification_email)
            || (text(person.email).endsWith("@organizacao-em-harmonia.local") ? "" : text(person.email));
          if (channels.includes("email")) {
            if (email) {
              emailSent = await sendTucxaOperationalSummaryEmail({
                to: email,
                recipientName: text(person.full_name),
                appointmentDate: date,
                summary,
              });
              if (!emailSent) errors.push("E-mail: envio não confirmado");
            } else {
              errors.push("E-mail: endereço não informado");
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

          if (sentAny) {
            void sendTucxaAppointmentAuditEmail({
              event: "Resumo diário enviado à Recepção",
              appointmentDate: date,
              details: `Destinatário: ${text(person.full_name)}\nCanais: ${[whatsappSent ? "WhatsApp" : "", emailSent ? "e-mail" : ""].filter(Boolean).join(" + ")}\n\n${summary}`,
            });
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
