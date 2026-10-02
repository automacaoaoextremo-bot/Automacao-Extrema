import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentPilotReception, todayInSaoPaulo } from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

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
  return new Map((data ?? []).map((item) => [text(item.id), text(item.name) || "Entidade"]));
}



export async function POST(request: Request) {
  try {
    const context = await currentPilotReception(request);
    if (!context?.canManage) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (text(body.action) !== "adopt-own-whatsapp") {
      return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
    }

    const personId = text(body.personId);
    const digits = text(body.whatsapp).replace(/\D/g, "");
    const whatsapp = digits.startsWith("55") ? digits : `55${digits}`;
    if (!personId) return NextResponse.json({ error: "Consulente não informado." }, { status: 400 });
    if (whatsapp.length < 12 || whatsapp.length > 13) {
      return NextResponse.json({ error: "Informe um WhatsApp válido com DDD." }, { status: 400 });
    }

    const { data: person, error: personError } = await supabaseAdmin
      .from("oh_people")
      .select("id,full_name,whatsapp")
      .eq("organization_id", context.organizationId)
      .eq("id", personId)
      .eq("active", true)
      .maybeSingle();
    if (personError) throw personError;
    if (!person?.id) return NextResponse.json({ error: "Consulente não localizado." }, { status: 404 });

    const { data: duplicate, error: duplicateError } = await supabaseAdmin
      .from("oh_people")
      .select("id,full_name")
      .eq("organization_id", context.organizationId)
      .eq("whatsapp", whatsapp)
      .neq("id", personId)
      .limit(1);
    if (duplicateError) throw duplicateError;
    if ((duplicate ?? []).length) {
      return NextResponse.json(
        { error: `Este WhatsApp já está vinculado ao cadastro de ${text(duplicate?.[0]?.full_name) || "outra pessoa"}.` },
        { status: 409 },
      );
    }

    const { data: changedCount, error: adoptError } = await supabaseAdmin.rpc(
      "oh_tucxa_pilot_adopt_own_whatsapp",
      {
        p_organization_id: context.organizationId,
        p_person_id: personId,
        p_whatsapp: whatsapp,
      },
    );
    if (adoptError) {
      const message = String(adoptError.message || "");
      if (message.includes("WHATSAPP_IN_USE")) {
        return NextResponse.json({ error: "Este WhatsApp já está vinculado a outro cadastro." }, { status: 409 });
      }
      if (message.includes("PERSON_NOT_FOUND")) {
        return NextResponse.json({ error: "Consulente não localizado." }, { status: 404 });
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
        .select("id,person_id,source_contact_person_id,entity_id,consulente_name,whatsapp,appointment_date,appointment_time,status,confirmation_status,confirmed_order,arrival_status,notification_contact_type,notification_contact_name,notification_contact_relationship,notification_contact_whatsapp,metadata,created_at")
        .eq("organization_id", context.organizationId)
        .order("appointment_date", { ascending: true })
        .order("created_at", { ascending: true });

      const today = todayInSaoPaulo();
      if (dateMode === "specific" && dateFrom) query = query.eq("appointment_date", dateFrom);
      else if (dateMode === "period" && dateFrom && dateTo) query = query.gte("appointment_date", dateFrom).lte("appointment_date", dateTo);
      else if (dateMode === "before" && dateTo) query = query.lt("appointment_date", dateTo);
      else if (dateMode !== "all") query = query.gte("appointment_date", today);
      if (kind === "sem_whatsapp_terceiros") query = query.eq("notification_contact_type", "alternate");
      if (kind === "caderno") query = query.neq("status", "cancelado");

      const { data, error } = await query;
      if (error) throw error;
      const source = (data ?? []) as DbRow[];
      const names = await entityNames(
        context.organizationId,
        Array.from(new Set(source.map((item) => text(item.entity_id)).filter(Boolean))),
      );
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

      const rows = reportSource.map((item) => {
        const entity = names.get(text(item.entity_id)) || "Entidade";
        if (kind === "caderno") {
          return {
            Data: dateLabel(item.appointment_date),
            Entidade: entity,
            Consulente: text(item.consulente_name),
            Ordem: Number(item.confirmed_order ?? 0) || "",
            Status: text(item.status),
            Confirmação: text(item.confirmation_status),
          };
        }
        if (kind === "sem_whatsapp_terceiros") {
          return {
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
        };
      });
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
      const rows = (entities ?? []).map((entity) => ({
        Entidade: text(entity.name),
        Cavalinhos: (links ?? [])
          .filter((link) => text(link.entity_id) === text(entity.id))
          .map((link) => peopleMap.get(text(link.person_id)) || "")
          .filter(Boolean)
          .join(", "),
        "Capacidade padrão": Number(entity.daily_capacity ?? 0) || "",
        "Agendamento habilitado": entity.appointment_enabled === true ? "Sim" : "Não",
        Ativa: entity.active === true ? "Sim" : "Não",
      }));
      return NextResponse.json({ rows });
    }

    return NextResponse.json({ error: "Relatório não reconhecido." }, { status: 400 });
  } catch (error) {
    console.error("[TUCXA][pilot-reports]", error);
    return NextResponse.json({ error: "Não foi possível gerar o relatório." }, { status: 500 });
  }
}
