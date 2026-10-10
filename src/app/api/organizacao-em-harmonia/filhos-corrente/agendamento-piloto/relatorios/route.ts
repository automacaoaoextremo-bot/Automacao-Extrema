import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentPilotReception, loadPilotDates, loadPilotDay, loadPilotSettings, todayInSaoPaulo } from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

export const dynamic = "force-dynamic";

type DbRow = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateLabel(value: unknown) {
  const iso = text(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

function phoneLabel(value: unknown) {
  const digits = text(value).replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return text(value);
}

async function entityNames(organizationId: string, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data, error } = await supabaseAdmin
    .from("oh_spiritual_entities")
    .select("id,name")
    .eq("organization_id", organizationId)
    .in("id", ids);
  if (error) throw error;

  const { data: links, error: linksError } = await supabaseAdmin
    .from("oh_person_entity_links")
    .select("entity_id,person_id,active,relationship_type")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .eq("relationship_type", "recebe")
    .in("entity_id", ids);
  if (linksError) throw linksError;

  const personIds = Array.from(new Set((links ?? []).map((item) => text(item.person_id)).filter(Boolean)));
  const { data: people, error: peopleError } = personIds.length
    ? await supabaseAdmin.from("oh_people").select("id,full_name").eq("organization_id", organizationId).in("id", personIds)
    : { data: [], error: null };
  if (peopleError) throw peopleError;
  const peopleMap = new Map((people ?? []).map((item) => [text(item.id), text(item.full_name)]));

  return new Map((data ?? []).map((item) => {
    const entityId = text(item.id);
    const entityName = text(item.name) || "Entidade";
    const cavalinhos = (links ?? [])
      .filter((link) => text(link.entity_id) === entityId)
      .map((link) => peopleMap.get(text(link.person_id)) || "")
      .filter(Boolean);
    return [entityId, cavalinhos.length ? `${entityName} (${cavalinhos.join(", ")})` : entityName];
  }));
}


export async function POST(request: Request) {
  try {
    const context = await currentPilotReception(request);
    if (!context?.canManage) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (text(body.action) !== "adopt-own-whatsapp") {
      return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
    }

    const appointmentId = text(body.appointmentId);
    const digits = text(body.whatsapp).replace(/\D/g, "");
    const whatsapp = digits.startsWith("55") ? digits : `55${digits}`;
    if (!appointmentId) return NextResponse.json({ error: "Agendamento não informado." }, { status: 400 });
    if (whatsapp.length < 12 || whatsapp.length > 13) {
      return NextResponse.json({ error: "Informe um WhatsApp válido com DDD." }, { status: 400 });
    }

    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("oh_consulente_appointments")
      .select("id,person_id,consulente_name")
      .eq("organization_id", context.organizationId)
      .eq("id", appointmentId)
      .maybeSingle();
    if (appointmentError) throw appointmentError;
    if (!appointment?.id) return NextResponse.json({ error: "Agendamento não localizado." }, { status: 404 });

    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from("oh_people")
      .select("id,full_name")
      .eq("organization_id", context.organizationId)
      .eq("whatsapp", whatsapp)
      .eq("active", true)
      .limit(1);
    if (duplicateError) throw duplicateError;

    const appointmentPersonId = text(appointment.person_id);
    if ((duplicate ?? []).length && text(duplicate?.[0]?.id) !== appointmentPersonId) {
      return NextResponse.json(
        { error: `Este WhatsApp já está vinculado ao cadastro de ${text(duplicate?.[0]?.full_name) || "outra pessoa"}.` },
        { status: 409 },
      );
    }

    const { data: changedCount, error: adoptError } = await supabaseAdmin.rpc(
      "oh_tucxa_pilot_adopt_own_whatsapp_by_appointment",
      {
        p_organization_id: context.organizationId,
        p_appointment_id: appointmentId,
        p_whatsapp: whatsapp,
      },
    );
    if (adoptError) {
      const message = String(adoptError.message || "");
      if (message.includes("WHATSAPP_IN_USE")) {
        return NextResponse.json({ error: "Este WhatsApp já está vinculado a outro cadastro." }, { status: 409 });
      }
      if (message.includes("APPOINTMENT_NOT_FOUND")) {
        return NextResponse.json({ error: "Agendamento não localizado." }, { status: 404 });
      }
      throw adoptError;
    }
    return NextResponse.json({
      ok: true,
      message: `WhatsApp próprio atualizado. ${Number(changedCount ?? 0)} agendamento(s) anterior(es) e futuro(s) foram desvinculados do contato responsável, preservando o histórico da alteração.`,
    });
  } catch (error) {
    console.error("[TUCXA][pilot-reports][POST]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o WhatsApp próprio do Consulente." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const context = await currentPilotReception(request);
    if (!context?.canManage) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });

    const url = new URL(request.url);
    const kind = text(url.searchParams.get("kind")) || "atendimentos";
    const dateMode = text(url.searchParams.get("dateMode")) || "from_today";
    const dateFrom = text(url.searchParams.get("dateFrom"));
    const dateTo = text(url.searchParams.get("dateTo"));
    const person = text(url.searchParams.get("person")).toLocaleLowerCase("pt-BR");

    if (["atendimentos", "caderno", "sem_whatsapp_terceiros"].includes(kind)) {
      let query = supabaseAdmin
        .from("oh_consulente_appointments")
        .select("id,person_id,source_contact_person_id,entity_id,consulente_name,whatsapp,appointment_date,appointment_time,status,confirmation_status,arrival_status,cancelled_at,cancellation_reason,notification_contact_type,notification_contact_name,notification_contact_relationship,notification_contact_whatsapp,metadata,created_at")
        .eq("organization_id", context.organizationId)
        .order("appointment_date", { ascending: true })
        .order("created_at", { ascending: true });

      const today = todayInSaoPaulo();
      if (dateMode === "specific" && dateFrom) query = query.eq("appointment_date", dateFrom);
      else if (dateMode === "period" && dateFrom && dateTo) query = query.gte("appointment_date", dateFrom).lte("appointment_date", dateTo);
      else if (dateMode === "before" && dateTo) query = query.lt("appointment_date", dateTo);
      else if (dateMode !== "all") query = query.gte("appointment_date", today);
      if (kind === "sem_whatsapp_terceiros") query = query.eq("notification_contact_type", "alternate");

      const { data, error } = await query;
      if (error) throw error;
      const source = (data ?? []) as DbRow[];

      const sourceAppointmentIds = source.map((item) => text(item.id)).filter(Boolean);
      const { data: entityChanges, error: entityChangesError } = sourceAppointmentIds.length
        ? await supabaseAdmin
            .from("oh_tucxa_appointment_entity_changes")
            .select("appointment_id,previous_entity_id,new_entity_id,reason,change_mode,changed_at")
            .eq("organization_id", context.organizationId)
            .in("appointment_id", sourceAppointmentIds)
            .order("changed_at", { ascending: false })
        : { data: [], error: null };
      if (entityChangesError) throw entityChangesError;

      const latestChangeByAppointment = new Map<string, DbRow>();
      for (const change of (entityChanges ?? []) as DbRow[]) {
        const appointmentId = text(change.appointment_id);
        if (!appointmentId || latestChangeByAppointment.has(appointmentId)) continue;
        latestChangeByAppointment.set(appointmentId, change);
      }

      const allEntityIds = Array.from(new Set([
        ...source.map((item) => text(item.entity_id)),
        ...(entityChanges ?? []).flatMap((item) => [text(item.previous_entity_id), text(item.new_entity_id)]),
      ].filter(Boolean)));
      const names = await entityNames(context.organizationId, allEntityIds);

      const filtered = person
        ? source.filter((item) => text(item.consulente_name).toLocaleLowerCase("pt-BR").includes(person))
        : source;

      const personIds = kind === "sem_whatsapp_terceiros"
        ? Array.from(new Set(filtered.map((item) => text(item.person_id)).filter(Boolean)))
        : [];
      const { data: people, error: peopleError } = personIds.length
        ? await supabaseAdmin
            .from("oh_people")
            .select("id,whatsapp")
            .eq("organization_id", context.organizationId)
            .in("id", personIds)
        : { data: [], error: null };
      if (peopleError) throw peopleError;
      const ownWhatsapp = new Map((people ?? []).map((item) => [text(item.id), text(item.whatsapp)]));
      const reportSource = kind === "sem_whatsapp_terceiros"
        ? filtered.filter((item) => !ownWhatsapp.get(text(item.person_id)))
        : filtered;

      type CadernoAvailability = {
        capacity: number;
        booked: number;
        available: number;
        isAvailable: boolean;
        suspendedReason: string;
      };
      const cadernoLabels = new Map<string, string>();
      const cadernoAvailability = new Map<string, CadernoAvailability>();
      if (kind === "caderno") {
        const capacityIds = Array.from(new Set(reportSource.map((item) => text(item.entity_id)).filter(Boolean)));
        const { data: capacityRows, error: capacityError } = capacityIds.length
          ? await supabaseAdmin
              .from("oh_spiritual_entities")
              .select("id,daily_capacity")
              .eq("organization_id", context.organizationId)
              .in("id", capacityIds)
          : { data: [], error: null };
        if (capacityError) throw capacityError;
        const capacityMap = new Map<string, number>((capacityRows ?? []).map((item) => [text(item.id), Math.max(1, Number(item.daily_capacity ?? 0) || 1)]));
        const cadernoDates = Array.from(new Set(reportSource.map((item) => text(item.appointment_date)).filter(Boolean)));
        for (const date of cadernoDates) {
          const dayEntities = await loadPilotDay(context.organizationId, date);
          for (const entity of dayEntities) {
            cadernoAvailability.set(`${date}|${entity.id}`, {
              capacity: Math.max(1, Number(entity.capacity ?? 0) || capacityMap.get(entity.id) || 1),
              booked: Math.max(0, Number(entity.booked ?? 0) || 0),
              available: Math.max(0, Number(entity.available ?? 0) || 0),
              isAvailable: entity.isAvailable !== false,
              suspendedReason: text(entity.suspendedReason),
            });
          }
        }
        const bookedMap = new Map<string, number>();
        for (const item of reportSource) {
          if (text(item.status) === "cancelado") continue;
          const key = `${text(item.appointment_date)}|${text(item.entity_id)}`;
          bookedMap.set(key, (bookedMap.get(key) ?? 0) + 1);
        }
        for (const item of reportSource) {
          const entityId = text(item.entity_id);
          const key = `${text(item.appointment_date)}|${entityId}`;
          const base = names.get(entityId) || "Entidade";
          const availability = cadernoAvailability.get(key);
          const capacity = availability?.capacity ?? capacityMap.get(entityId) ?? 1;
          const booked = bookedMap.get(key) ?? availability?.booked ?? 0;
          cadernoLabels.set(key, `${base} ${booked}/${capacity}${availability?.isAvailable === false ? " · INDISPONÍVEL" : ""}`);
        }
      }

      let rows = reportSource.map((item) => {
        const entityId = text(item.entity_id);
        const entity = names.get(entityId) || "Entidade";
        const change = latestChangeByAppointment.get(text(item.id));
        const previousEntityId = text(change?.previous_entity_id);
        const previousEntityName = previousEntityId ? names.get(previousEntityId) || "Entidade anterior" : "";
        const changeReason = text(change?.reason);
        const cancellationReason = text(item.cancellation_reason);
        if (kind === "caderno") {
          const key = `${text(item.appointment_date)}|${entityId}`;
          const availability = cadernoAvailability.get(key);
          return {
            _appointmentId: text(item.id),
            _entityId: entityId,
            _entityAvailable: availability?.isAvailable === false ? "0" : "1",
            _entitySuspendedReason: availability?.suspendedReason || "",
            _capacity: availability?.capacity ?? "",
            _bookedActive: availability?.booked ?? "",
            _availableSlots: availability?.available ?? "",
            _previousEntityName: previousEntityName,
            _entityChangeReason: changeReason,
            _cancellationReason: cancellationReason,
            _firstTimeIndicatorActive: (item.metadata as Record<string, unknown> | null)?.firstTimeIndicatorActive === true ? "1" : "0",
            Data: dateLabel(item.appointment_date),
            Entidade: cadernoLabels.get(key) || entity,
            Consulente: text(item.consulente_name),
            Ordem: text(item.status) === "cancelado" ? "" : (Number((item.metadata as Record<string, unknown> | null)?.confirmed_order ?? (item.metadata as Record<string, unknown> | null)?.order ?? 0) || ""),
            Status: text(item.status),
            Confirmação: text(item.confirmation_status),
            Chegada: text(item.arrival_status),
          };
        }
        if (kind === "sem_whatsapp_terceiros") {
          return {
            _appointmentId: text(item.id),
            _personId: text(item.person_id),
            Data: dateLabel(item.appointment_date),
            Entidade: entity,
            Consulente: text(item.consulente_name),
            "Contato responsável": text(item.notification_contact_name),
            "WhatsApp do contato responsável": phoneLabel(item.notification_contact_whatsapp || item.whatsapp),
            "Parentesco / vínculo": text(item.notification_contact_relationship),
          };
        }
        return {
          Data: dateLabel(item.appointment_date),
          Horário: text(item.appointment_time),
          Consulente: text(item.consulente_name),
          Entidade: entity,
          WhatsApp: phoneLabel(item.whatsapp),
          Status: text(item.status),
          Confirmação: text(item.confirmation_status),
          Chegada: text(item.arrival_status),
          "Motivo do cancelamento": cancellationReason,
          "Realocado de": previousEntityName,
          "Motivo da realocação": changeReason,
        };
      });

      if (kind === "caderno" && !person) {
        let dates: string[] = [];
        if (dateMode === "specific" && dateFrom) {
          dates = [dateFrom];
        } else if (dateMode === "period" && dateFrom && dateTo) {
          const start = new Date(`${dateFrom}T12:00:00Z`);
          const end = new Date(`${dateTo}T12:00:00Z`);
          for (let cursor = start; cursor <= end && dates.length < 180; cursor = new Date(cursor.getTime() + 86400000)) {
            dates.push(cursor.toISOString().slice(0, 10));
          }
        } else if (dateMode === "from_today") {
          const settings = await loadPilotSettings(context.organizationId);
          dates = (await loadPilotDates(context.organizationId, settings.daysAhead)).map((item) => item.date);
        } else {
          dates = Array.from(new Set(reportSource.map((item) => text(item.appointment_date)).filter(Boolean)));
        }

        const existingEntityDate = new Set(reportSource.map((item) => `${dateLabel(item.appointment_date)}|${text(item.entity_id)}`));
        for (const date of dates) {
          const entities = await loadPilotDay(context.organizationId, date);
          const namesForDay = await entityNames(context.organizationId, entities.map((entity) => entity.id));
          for (const entity of entities) {
            const keyIso = `${date}|${entity.id}`;
            cadernoAvailability.set(keyIso, {
              capacity: Math.max(1, Number(entity.capacity ?? 0) || 1),
              booked: Math.max(0, Number(entity.booked ?? 0) || 0),
              available: Math.max(0, Number(entity.available ?? 0) || 0),
              isAvailable: entity.isAvailable !== false,
              suspendedReason: text(entity.suspendedReason),
            });
            if (existingEntityDate.has(`${dateLabel(date)}|${entity.id}`)) continue;
            const entityName = namesForDay.get(entity.id) || entity.name;
            const cadernoEntityName = `${entityName} ${Math.max(0, Number(entity.booked ?? 0) || 0)}/${Math.max(1, Number(entity.capacity ?? 0) || 1)}${entity.isAvailable === false ? " · INDISPONÍVEL" : ""}`;
            rows.push({
              _appointmentId: "",
              _entityId: entity.id,
              _entityAvailable: entity.isAvailable === false ? "0" : "1",
              _entitySuspendedReason: text(entity.suspendedReason),
              _capacity: Math.max(1, Number(entity.capacity ?? 0) || 1),
              _bookedActive: Math.max(0, Number(entity.booked ?? 0) || 0),
              _availableSlots: Math.max(0, Number(entity.available ?? 0) || 0),
              _previousEntityName: "",
              _entityChangeReason: "",
              _cancellationReason: "",
              _firstTimeIndicatorActive: "0",
              Data: dateLabel(date),
              Entidade: cadernoEntityName,
              Consulente: "",
              Ordem: "",
              Status: "",
              Confirmação: "",
              Chegada: "",
            });
          }
        }
        rows = rows.sort((left, right) => {
          const [ld, lm, ly] = String(left.Data).split("/");
          const [rd, rm, ry] = String(right.Data).split("/");
          const dateCompare = `${ly}-${lm}-${ld}`.localeCompare(`${ry}-${rm}-${rd}`);
          if (dateCompare) return dateCompare;
          const entityCompare = String(left.Entidade).localeCompare(String(right.Entidade), "pt-BR");
          if (entityCompare) return entityCompare;
          const leftCancelled = String(left.Status) === "cancelado" ? 1 : 0;
          const rightCancelled = String(right.Status) === "cancelado" ? 1 : 0;
          if (leftCancelled !== rightCancelled) return leftCancelled - rightCancelled;
          return String(left.Consulente).localeCompare(String(right.Consulente), "pt-BR");
        });
      }
      return NextResponse.json({ rows });
    }

    if (kind === "consulentes") {
      const { data, error } = await supabaseAdmin
        .from("oh_people")
        .select("full_name,whatsapp,email,active")
        .eq("organization_id", context.organizationId)
        .eq("active", true)
        .order("full_name", { ascending: true });
      if (error) throw error;
      const rows = (data ?? [])
        .filter((item) => !person || text(item.full_name).toLocaleLowerCase("pt-BR").includes(person))
        .map((item) => ({
          Consulente: text(item.full_name),
          WhatsApp: phoneLabel(item.whatsapp),
          "E-mail": text(item.email).endsWith("@organizacao-em-harmonia.local") ? "" : text(item.email),
        }));
      return NextResponse.json({ rows });
    }

    if (kind === "entidades") {
      const { data: entities, error } = await supabaseAdmin
        .from("oh_spiritual_entities")
        .select("id,name,active,appointment_enabled,daily_capacity")
        .eq("organization_id", context.organizationId)
        .order("name", { ascending: true });
      if (error) throw error;
      const ids = (entities ?? []).map((item) => text(item.id)).filter(Boolean);
      const { data: links, error: linkError } = ids.length
        ? await supabaseAdmin
            .from("oh_person_entity_links")
            .select("entity_id,person_id,active")
            .eq("organization_id", context.organizationId)
            .eq("active", true)
            .in("entity_id", ids)
        : { data: [], error: null };
      if (linkError) throw linkError;
      const personIds = Array.from(new Set((links ?? []).map((item) => text(item.person_id)).filter(Boolean)));
      const { data: people, error: peopleError } = personIds.length
        ? await supabaseAdmin.from("oh_people").select("id,full_name").in("id", personIds)
        : { data: [], error: null };
      if (peopleError) throw peopleError;
      const peopleMap = new Map((people ?? []).map((item) => [text(item.id), text(item.full_name)]));
      const rows = (entities ?? []).map((entity) => {
        const cavalinhos = (links ?? [])
          .filter((link) => text(link.entity_id) === text(entity.id))
          .map((link) => peopleMap.get(text(link.person_id)) || "")
          .filter(Boolean);
        return {
        Entidade: cavalinhos.length ? `${text(entity.name)} (${cavalinhos.join(", ")})` : text(entity.name),
        Cavalinhos: cavalinhos.join(", "),
        "Capacidade padrão": Number(entity.daily_capacity ?? 0) || "",
        "Agendamento habilitado": entity.appointment_enabled === true ? "Sim" : "Não",
        Ativa: entity.active === true ? "Sim" : "Não",
        };
      });
      return NextResponse.json({ rows });
    }

    return NextResponse.json({ error: "Relatório não reconhecido." }, { status: 400 });
  } catch (error) {
    console.error("[TUCXA][pilot-reports]", error);
    return NextResponse.json({ error: "Não foi possível gerar o relatório." }, { status: 500 });
  }
}
