/** Envio operacional TUCXA: duas fases independentes, mesma regra de identidade por WhatsApp. */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendTucxaOperationalSummaryWhatsapp } from "@/lib/botconversa";
import {
  isCampinasHoliday, loadPilotDay, loadPilotSettings, PILOT_ACTIVE_STATUSES,
  todayInSaoPaulo,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { receptionScheduledForDate } from "@/lib/organizacao-em-harmonia/tucxa-reception-schedule";
import { additionalReceptionRecipientsForDate } from "@/lib/organizacao-em-harmonia/tucxa-summary-additional-recipients";
import { formatTucxaReceptionSummary } from "@/lib/organizacao-em-harmonia/tucxa-appointment-reception-summary";
import { tucxaReceptionOperationalMessage, tucxaCavalinhoOperationalMessage } from "@/lib/organizacao-em-harmonia/tucxa-daily-message-templates";
import { sendTucxaAppointmentAuditEmail } from "@/lib/organizacao-em-harmonia/tucxa-appointment-audit-email";
import { dispatchDateAllowed, generalDispatchAllowed, homologationAppointmentId, mediumDispatchAllowed, receptionDispatchAllowed } from "@/lib/organizacao-em-harmonia/tucxa-appointment-homologation";

type Phase = "morning" | "afternoon";
type Audience = "reception_preview" | "reception" | "cavalinho";
type Person = { id: string; full_name: string | null; whatsapp: string | null; normalized_whatsapp: string | null; active: boolean | null };
const personPhone = (person: Person) => normalizePhone(person.normalized_whatsapp) || normalizePhone(person.whatsapp);
type Dispatch = { id: string; status: string; detail: string; audit_email_status: string };
const txt = (v: unknown) => typeof v === "string" ? v.trim() : "";
const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
function normalizePhone(raw: unknown): string {
  let d = txt(raw).replace(/\D/g, "");
  if (d.startsWith("55") && d.length === 13) d = d.slice(2);
  return d.length === 11 ? d : "";
}
function localTime(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}
function weekday(date: string): number { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
function currentTimeAllowed(phase: Phase, now: string) {
  const m = Number(now.slice(0, 2)) * 60 + Number(now.slice(3, 5));
  return phase === "morning" ? m >= 8 * 60 && m < 10 * 60 : m >= 16 * 60 && m < 18 * 60;
}
function hasReception(profileValue: unknown): boolean {
  const p = obj(profileValue);
  if (p.supportsReception === true || p.isReception === true) return true;
  const list = [p.functionSlugs, p.functions, p.selectedFunctions];
  return list.some((source) => Array.isArray(source) && source.some((item) => {
    const r = obj(item);
    return txt(r.slug || r.name || r.label || item).normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("recepc");
  }));
}
/** Retorna somente contatos com celular único; ambiguidades são bloqueadas sem escolher por nome. */
function uniqueByPhone(people: Person[], diagnostics: Record<string, unknown>[], audience: Audience): Person[] {
  const byPhone = new Map<string, Person[]>();
  for (const p of people) {
    const phone = personPhone(p);
    if (p.normalized_whatsapp && p.whatsapp && normalizePhone(p.normalized_whatsapp) !== normalizePhone(p.whatsapp)) {
      diagnostics.push({ audience, personId: p.id, reason: "phone_fields_conflict" }); continue;
    }
    if (!phone) { diagnostics.push({ audience, personId: p.id, reason: "invalid_whatsapp" }); continue; }
    byPhone.set(phone, [...(byPhone.get(phone) ?? []), p]);
  }
  const result: Person[] = [];
  for (const [phone, group] of byPhone) {
    if (group.length !== 1) {
      diagnostics.push({ audience, reason: "duplicate_canonical_whatsapp", phoneMasked: `***${phone.slice(-4)}`, records: group.length });
      continue;
    }
    result.push(group[0]);
  }
  return result;
}
function isAuthorized(req: Request): boolean {
  const secrets = [process.env.CRON_SECRET, process.env.TUCXA_SCHEDULER_SECRET].map(x => x?.trim()).filter(Boolean);
  return secrets.some(s => req.headers.get("authorization") === `Bearer ${s}`);
}

export async function processTucxaDailySummaries(request: Request, phase: Phase): Promise<Response> {
  if (!isAuthorized(request)) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const date = todayInSaoPaulo();
  const time = localTime();
  if (process.env.VERCEL_ENV !== "production") {
    return Response.json({ ok: true, phase, blocked: true, reason: "non_production_environment", messagesSent: 0 });
  }
  const diagnostics: Array<Record<string, unknown>> = [];
  const results: Array<Record<string, unknown>> = [];
  // Guarda fail-closed também no período sem atendimentos e em qualquer feriado.
  if (!dispatchDateAllowed(date) || isCampinasHoliday(date)) {
    return Response.json({ ok: true, date, phase, blocked: true, reason: isCampinasHoliday(date) ? "holiday_or_centre_closed" : "date_not_allowed", messagesSent: 0 });
  }
  if (!currentTimeAllowed(phase, time)) {
    return Response.json({ ok: true, date, time, phase, blocked: true, reason: "phase_not_due", messagesSent: 0 });
  }
  try {
    const { data: organizations, error: orgError } = await supabaseAdmin.from("oh_organizations")
      .select("id,name,slug").or("slug.eq.tucxa,name.ilike.%tucxa%");
    if (orgError) throw orgError;

    for (const org of organizations ?? []) {
      const orgId = txt(org.id);
      const settings = await loadPilotSettings(orgId);
      if (!settings.automaticDispatchWeekdays.includes(weekday(date))) {
        diagnostics.push({ organization: txt(org.name), reason: "weekday_not_enabled" });
        continue;
      }
      const receptionEnabled = settings.receptionDailyWhatsappEnabled;
      const cavalinhosEnabled = phase === "afternoon" && settings.cavalinhoDailyWhatsappEnabled;
      if (!receptionEnabled && !cavalinhosEnabled) {
        diagnostics.push({ organization: txt(org.name), reason: "daily_messages_disabled" }); continue;
      }

      const { data: appointments, error: apError } = await supabaseAdmin.from("oh_consulente_appointments")
        .select("id,entity_id,consulente_name,appointment_time,status,metadata")
        .eq("organization_id", orgId).eq("appointment_date", date)
        .in("status", PILOT_ACTIVE_STATUSES).order("created_at");
      if (apError) throw apError;
      const allowedAppointments = generalDispatchAllowed(date)
        ? (appointments ?? []) : (appointments ?? []).filter(a => txt(a.id) === homologationAppointmentId());
      if (!generalDispatchAllowed(date) && !allowedAppointments.length) {
        diagnostics.push({ organization: txt(org.name), reason: "homologation_appointment_missing" }); continue;
      }
      // Todas as entidades escaladas para a data, inclusive aquelas com zero agendamentos.
      // loadPilotDay considera suspensões e exceções na programação.
      const day = await loadPilotDay(orgId, date);
      const availableIds = day.filter(e => e.isAvailable).map(e => e.id);
      if (!availableIds.length && !allowedAppointments.length) {
        diagnostics.push({ organization: txt(org.name), reason: "no_active_service_entities" }); continue;
      }
      const allIds = [...new Set([...day.map(e => e.id), ...allowedAppointments.map(a => txt(a.entity_id))].filter(Boolean))];
      const { data: entities, error: entityError } = allIds.length
        ? await supabaseAdmin.from("oh_spiritual_entities")
          .select("id,name,line,daily_capacity")
          .eq("organization_id", orgId).in("id", allIds)
        : { data: [], error: null };
      if (entityError) throw entityError;
      const entityNames = new Map((entities ?? []).map(e => [txt(e.id), txt(e.name)]));
      const entityLines = new Map((entities ?? []).map(e => [txt(e.id), txt(e.line)]));
      const entityCapacities = new Map((entities ?? []).map(e => [txt(e.id), Number(e.daily_capacity || 4)]));
      const grouped = new Map<string, typeof allowedAppointments>();
      for (const a of allowedAppointments) {
        const id = txt(a.entity_id);
        if (!id) continue;
        grouped.set(id, [...(grouped.get(id) ?? []), a]);
      }
      // Vínculos ativos são a fonte de verdade; nomes não são chaves de identidade.
      const { data: links, error: linkError } = availableIds.length
        ? await supabaseAdmin.from("oh_person_entity_links").select("entity_id,person_id")
            .eq("organization_id", orgId).eq("active", true).eq("relationship_type", "recebe")
            .in("entity_id", availableIds)
        : { data: [], error: null };
      if (linkError) throw linkError;
      const linkPersonIds = [...new Set((links ?? []).map(l => txt(l.person_id)).filter(Boolean))];
      const { data: holders, error: holderErr } = linkPersonIds.length
        ? await supabaseAdmin.from("oh_people").select("id,full_name,whatsapp,normalized_whatsapp,active")
          .eq("organization_id", orgId).eq("active", true).in("id", linkPersonIds)
        : { data: [], error: null };
      if (holderErr) throw holderErr;
      const holdersById = new Map((holders ?? []).map(h => [txt(h.id), h]));
      const holderNames = new Map((links ?? []).map(l => [txt(l.entity_id), txt(holdersById.get(txt(l.person_id))?.full_name).split(" ")[0]]));

      async function previous(audience: Audience, personId: string): Promise<Dispatch | null> {
        const { data, error } = await supabaseAdmin.from("oh_tucxa_pilot_daily_dispatches")
          .select("id,status,detail,audit_email_status")
          .eq("organization_id", orgId).eq("dispatch_date", date).eq("audience", audience)
          .eq("recipient_person_id", personId).maybeSingle();
        if (error) throw error;
        return data as Dispatch | null;
      }
      async function saveResult(audience: Audience, personId: string, sent: boolean, detail: string) {
        const { error } = await supabaseAdmin.from("oh_tucxa_pilot_daily_dispatches").upsert({
          organization_id: orgId, dispatch_date: date, audience, recipient_person_id: personId,
          status: sent ? "sent" : "error", sent_at: sent ? new Date().toISOString() : null,
          detail, audit_email_status: "pending", audit_email_at: null, audit_email_error: "", updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id,dispatch_date,audience,recipient_person_id" });
        if (error) throw error;
      }
      async function audit(audience: Audience, person: Person, summary: string, event: string, prior: Dispatch | null) {
        if (prior?.audit_email_status === "sent") return;
        const copied = await sendTucxaAppointmentAuditEmail({
          event, appointmentDate: date,
          details: `Etapa: ${phase}\nDestinatário: ${txt(person.full_name)}\nWhatsApp: ${personPhone(person)}\n\n${summary}`,
        });
        const { error } = await supabaseAdmin.from("oh_tucxa_pilot_daily_dispatches").update({
          audit_email_status: copied ? "sent" : "error", audit_email_at: copied ? new Date().toISOString() : null,
          audit_email_error: copied ? "" : "Falha ao enviar cópia SMTP", updated_at: new Date().toISOString(),
        }).eq("organization_id", orgId).eq("dispatch_date", date).eq("audience", audience).eq("recipient_person_id", person.id);
        if (error) throw error;
        if (!copied) diagnostics.push({ audience, personId: person.id, reason: "audit_email_failed" });
      }
      async function sendOne(audience: Audience, person: Person, summary: string, entityName: string, event: string) {
        const personId = txt(person.id);
        const old = await previous(audience, personId);
        if (old?.status === "sent") {
          // Reprocessamento seguro: jamais duplica o WhatsApp; permite recuperar a auditoria.
          if (old.audit_email_status !== "sent") await audit(audience, person, old.detail || summary, event, old);
          diagnostics.push({ audience, personId, reason: "whatsapp_already_sent" });
          return;
        }
        // A categoria de fluxo no BotConversa permanece 'reception' ou 'cavalinho'.
        const result = await sendTucxaOperationalSummaryWhatsapp({
          recipientName: txt(person.full_name), whatsapp: personPhone(person),
          appointmentDate: date, entityName, summary,
          audience: audience === "cavalinho" ? "cavalinho" : "reception",
        });
        await saveResult(audience, personId, result.sent, result.sent ? summary : (result.error || "Falha no BotConversa"));
        results.push({ audience, personId, phoneMasked: `***${personPhone(person).slice(-4)}`, sent: result.sent, error: result.error || "" });
        await audit(audience, person, result.sent ? summary : `FALHA: ${result.error || "Não informado"}\n${summary}`, event, null);
      }

      if (receptionEnabled) {
        const audience: Audience = phase === "morning" ? "reception_preview" : "reception";
        const { data: memberships, error: mErr } = await supabaseAdmin.from("oh_memberships")
          .select("person_id,agenda_viva_profile")
          .eq("organization_id", orgId).eq("active", true);
        if (mErr) throw mErr;
        const receptionIds = [...new Set((memberships ?? []).filter(m => hasReception(m.agenda_viva_profile))
          .filter(m => receptionScheduledForDate(obj(m.agenda_viva_profile).receptionSchedule, date))
          .map(m => txt(m.person_id)).filter(Boolean))];
        const additional = await additionalReceptionRecipientsForDate(orgId, date);
        diagnostics.push(...additional.diagnostics.map(item => ({ audience, ...item })));
        // União pela identidade interna; a deduplicação final por telefone é feita por uniqueByPhone.
        const recipientIds = [...new Set([...receptionIds, ...additional.people.map(person => person.id)])];
        const { data: receptionPeople, error: rErr } = recipientIds.length
          ? await supabaseAdmin.from("oh_people").select("id,full_name,whatsapp,normalized_whatsapp,active")
            .eq("organization_id", orgId).eq("active", true).in("id", recipientIds)
          : { data: [], error: null };
        if (rErr) throw rErr;
        const summary = formatTucxaReceptionSummary({
          date, appointments: allowedAppointments, entityNames, entityLines, entityCapacities,
          cavalinhoNames: holderNames, scheduledEntityIds: availableIds, includeTitle: false,
        });
        const message = tucxaReceptionOperationalMessage({ phase, date, entitySummary: summary });
        for (const person of uniqueByPhone((receptionPeople ?? []) as Person[], diagnostics, audience)) {
          if (!receptionDispatchAllowed(date, txt(person.id), personPhone(person))) continue;
          await sendOne(audience, person, message, "Resumo da Recepção", phase === "morning" ? "Prévia da manhã da Recepção" : "Atualização da tarde da Recepção");
        }
      }

      if (cavalinhosEnabled) {
        const byPerson = new Map<string, string[]>();
        for (const link of links ?? []) {
          const personId = txt(link.person_id), entityId = txt(link.entity_id);
          if (!personId || !entityId || !availableIds.includes(entityId)) continue;
          byPerson.set(personId, [...new Set([...(byPerson.get(personId) ?? []), entityId])]);
        }
        const uniqueHolders = uniqueByPhone((holders ?? []) as Person[], diagnostics, "cavalinho");
        for (const person of uniqueHolders) {
          const personId = txt(person.id);
          const entityIds = byPerson.get(personId) ?? [];
          if (!entityIds.length || !mediumDispatchAllowed(date, personId, personPhone(person))) continue;
          const entitiesForPerson = entityIds.map(id => ({
            name: entityNames.get(id) || "Entidade",
            consulentes: [...(grouped.get(id) ?? [])]
              .sort((a, b) => txt(a.consulente_name).localeCompare(txt(b.consulente_name), "pt-BR"))
              .map((item) => txt(item.consulente_name) || "Consulente não informado"),
          }));
          const summary = tucxaCavalinhoOperationalMessage({ date, entities: entitiesForPerson });
          await sendOne("cavalinho", person, summary, entityIds.map(id => entityNames.get(id) || "Entidade").join(" + "), "Resumo da tarde do Cavalinho");
        }
      }
    }
    return Response.json({ ok: true, date, phase, time, messagesSent: results.filter(r => r.sent).length, diagnostics, results });
  } catch (error) {
    console.error("[TUCXA resumos]", phase, error);
    return Response.json({ error: "Falha no processamento dos resumos. Verifique os logs da Vercel." }, { status: 500 });
  }
}
