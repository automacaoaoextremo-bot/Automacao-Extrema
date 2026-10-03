import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadPilotSettings, PILOT_ACTIVE_STATUSES, todayInSaoPaulo } from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";
import { sendTucxaOperationalSummaryWhatsapp } from "@/lib/botconversa";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function saoPauloTime() { return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()); }
function weekdaySaoPaulo() { const label = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(new Date()); const map: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }; return map[label] ?? new Date().getDay(); }

function due(now: string, configured: string) { const [nh,nm]=now.split(":").map(Number); const [ch,cm]=configured.split(":").map(Number); return (nh*60+nm) >= (ch*60+cm); }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || name; }

export async function GET(request: Request) {
  const secret = process.env.TUCXA_SCHEDULER_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Scheduler do TUCXA não configurado." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const date = todayInSaoPaulo();
  const now = saoPauloTime();
  const { data: organizations, error: orgError } = await supabaseAdmin.from("oh_organizations").select("id,name,slug").or("slug.eq.tucxa,name.ilike.%tucxa%");
  if (orgError) throw orgError;
  const results: Array<Record<string, unknown>> = [];
  for (const organization of organizations ?? []) {
    const organizationId = text(organization.id); if (!organizationId) continue;
    const settings = await loadPilotSettings(organizationId);
    if (!settings.automaticDispatchWeekdays.includes(weekdaySaoPaulo())) continue;
    const sendCavalinhos = settings.cavalinhoDailyWhatsappEnabled && due(now, settings.cavalinhoDailyWhatsappTime);
    const sendReception = settings.receptionDailyWhatsappEnabled && due(now, settings.receptionDailyWhatsappTime);
    if (!sendCavalinhos && !sendReception) continue;
    const { data: appointments, error: appointmentError } = await supabaseAdmin.from("oh_consulente_appointments").select("id,entity_id,consulente_name,appointment_time,status,metadata").eq("organization_id", organizationId).eq("appointment_date", date).in("status", PILOT_ACTIVE_STATUSES).order("created_at");
    if (appointmentError) throw appointmentError;
    if (!(appointments ?? []).length) continue;
    const entityIds = [...new Set((appointments ?? []).map((item) => text(item.entity_id)).filter(Boolean))];
    const { data: entities, error: entityError } = entityIds.length ? await supabaseAdmin.from("oh_spiritual_entities").select("id,name").in("id", entityIds) : { data: [], error: null };
    if (entityError) throw entityError;
    const entityNames = new Map((entities ?? []).map((item) => [text(item.id), text(item.name)]));
    const grouped = new Map<string, NonNullable<typeof appointments>>();
    for (const item of appointments ?? []) { const id=text(item.entity_id); const list=grouped.get(id) ?? []; list.push(item); grouped.set(id,list); }
    const alreadySent = async (audience: string, personId: string) => { const { data } = await supabaseAdmin.from("oh_tucxa_pilot_daily_dispatches").select("id").eq("organization_id", organizationId).eq("dispatch_date", date).eq("audience", audience).eq("recipient_person_id", personId).maybeSingle(); return Boolean(data?.id); };
    const markSent = async (audience: string, personId: string, ok: boolean, detail: string) => { await supabaseAdmin.from("oh_tucxa_pilot_daily_dispatches").upsert({ organization_id: organizationId, dispatch_date: date, audience, recipient_person_id: personId, sent_at: ok ? new Date().toISOString() : null, status: ok ? "sent" : "error", detail }, { onConflict: "organization_id,dispatch_date,audience,recipient_person_id" }); };

    if (sendCavalinhos) {
      const { data: prefs, error: prefError } = await supabaseAdmin.from("oh_tucxa_pilot_person_preferences").select("person_id,default_entity_id").eq("organization_id", organizationId).in("default_entity_id", entityIds);
      if (prefError) throw prefError;
      const personIds=[...new Set((prefs ?? []).map((item)=>text(item.person_id)).filter(Boolean))];
      const { data: people, error: peopleError } = personIds.length ? await supabaseAdmin.from("oh_people").select("id,full_name,whatsapp,active").in("id", personIds).eq("active", true) : { data: [], error: null };
      if (peopleError) throw peopleError;
      const peopleMap=new Map((people ?? []).map((item)=>[text(item.id),item]));
      for (const pref of prefs ?? []) { const personId=text(pref.person_id), entityId=text(pref.default_entity_id), person=peopleMap.get(personId), list=grouped.get(entityId) ?? []; if (!person || !text(person.whatsapp) || !list.length || await alreadySent("cavalinho",personId)) continue; const entityName=entityNames.get(entityId) || "Entidade"; const lines=list.map((item,index)=>`${index+1}. ${text(item.consulente_name)}`).join("\n"); const summary=`Atendimentos de hoje - ${entityName}\n${lines}`; const result=await sendTucxaOperationalSummaryWhatsapp({ recipientName:text(person.full_name), whatsapp:text(person.whatsapp), appointmentDate:date, entityName, summary, audience:"cavalinho" }); await markSent("cavalinho",personId,result.sent,result.error || summary); results.push({audience:"cavalinho",person:firstName(text(person.full_name)),sent:result.sent}); }
    }

    if (sendReception) {
      const { data: memberships, error: membershipError } = await supabaseAdmin.from("oh_memberships").select("person_id,agenda_viva_profile,active").eq("organization_id", organizationId).eq("active", true);
      if (membershipError) throw membershipError;
      const receptionIds=[...new Set((memberships ?? []).filter((item)=>{ const profile=record(item.agenda_viva_profile); const kind=text(profile.pilotAccessKind).toLowerCase(); const functions=Array.isArray(profile.functions)?profile.functions.map((v)=>text(record(v).slug || v).toLowerCase()):[]; return kind==="recepcao" || functions.some((v)=>v.includes("recepc")); }).map((item)=>text(item.person_id)).filter(Boolean))];
      const { data: people, error: peopleError } = receptionIds.length ? await supabaseAdmin.from("oh_people").select("id,full_name,whatsapp,active").in("id", receptionIds).eq("active", true) : { data: [], error: null };
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
            ? item.reception_summary_channels.map((value) => text(value))
            : [],
        ]),
      );
      const summary=[...grouped.entries()].sort((a,b)=>(entityNames.get(a[0])||"").localeCompare(entityNames.get(b[0])||"","pt-BR")).map(([entityId,list])=>`${entityNames.get(entityId)||"Entidade"}: ${list.map((item)=>text(item.consulente_name)).join(", ")}`).join("\n");
      for (const person of people ?? []) {
        const personId=text(person.id);
        const channels=receptionChannels.get(personId) ?? [];
        if (!channels.includes("whatsapp") || !text(person.whatsapp) || await alreadySent("reception",personId)) continue;
        const result=await sendTucxaOperationalSummaryWhatsapp({ recipientName:text(person.full_name), whatsapp:text(person.whatsapp), appointmentDate:date, entityName:"Resumo da Recepção", summary, audience:"reception" });
        await markSent("reception",personId,result.sent,result.error || summary);
        results.push({audience:"reception",person:firstName(text(person.full_name)),sent:result.sent});
      }
    }
  }
  return NextResponse.json({ ok: true, date, time: now, results });
}
