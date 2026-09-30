import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentPilotReception, todayInSaoPaulo } from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function validIsoDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
function ptBrDate(value: unknown) {
  const raw = text(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
}

export async function GET(request: Request) {
  try {
    const context = await currentPilotReception(request);
    if (!context) return NextResponse.json({ error: "Acesso restrito à Recepção." }, { status: 403 });

    const url = new URL(request.url);
    const kind = text(url.searchParams.get("kind")) || "atendimentos";
    const legacyDate = text(url.searchParams.get("date"));
    const dateMode = text(url.searchParams.get("dateMode")) || (legacyDate ? "specific" : "from_today");
    const dateFrom = text(url.searchParams.get("dateFrom")) || legacyDate;
    const dateTo = text(url.searchParams.get("dateTo"));
    const entityId = text(url.searchParams.get("entityId"));
    const person = text(url.searchParams.get("person"));

    if (kind === "consulentes") {
      let query = supabaseAdmin.from("oh_people").select("id,full_name,whatsapp,email,active,created_at").eq("organization_id", context.organizationId).order("full_name").limit(2000);
      if (person) query = query.ilike("full_name", `%${person}%`);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ kind, rows: (data ?? []).map((row) => ({ Nome: row.full_name, WhatsApp: row.whatsapp || "", Email: row.email || "", Ativo: row.active ? "Sim" : "Não", Cadastro: ptBrDate(row.created_at) })) });
    }

    if (kind === "entidades") {
      const [{ data: entities, error: entityError }, { data: links, error: linkError }] = await Promise.all([
        supabaseAdmin.from("oh_spiritual_entities").select("id,name,active").eq("organization_id", context.organizationId).order("name"),
        supabaseAdmin.from("oh_person_entity_links").select("entity_id,person_id,is_primary_for_attendance,active").eq("organization_id", context.organizationId).eq("active", true),
      ]);
      if (entityError) throw entityError;
      if (linkError) throw linkError;
      const personIds = [...new Set((links ?? []).map((item) => item.person_id).filter(Boolean))];
      const { data: people, error: peopleError } = personIds.length
        ? await supabaseAdmin.from("oh_people").select("id,full_name").in("id", personIds)
        : { data: [], error: null };
      if (peopleError) throw peopleError;
      const names = new Map((people ?? []).map((item) => [item.id, item.full_name]));
      return NextResponse.json({ kind, rows: (entities ?? []).map((entity) => ({ Entidade: entity.name, Cavalinhos: (links ?? []).filter((link) => link.entity_id === entity.id).map((link) => names.get(link.person_id) || "").filter(Boolean).join(", "), Ativa: entity.active ? "Sim" : "Não" })) });
    }

    let query = supabaseAdmin.from("oh_consulente_appointments")
      .select("id,consulente_name,appointment_date,appointment_time,status,confirmation_status,arrival_status,entity_id,created_at")
      .eq("organization_id", context.organizationId)
      .order("appointment_date", { ascending: false })
      .limit(3000);

    if (dateMode === "specific") {
      if (!validIsoDate(dateFrom)) return NextResponse.json({ error: "Informe uma data específica válida." }, { status: 400 });
      query = query.eq("appointment_date", dateFrom);
    } else if (dateMode === "period") {
      if (!validIsoDate(dateFrom) || !validIsoDate(dateTo) || dateTo < dateFrom) return NextResponse.json({ error: "Informe um período válido." }, { status: 400 });
      query = query.gte("appointment_date", dateFrom).lte("appointment_date", dateTo);
    } else if (dateMode === "before") {
      if (!validIsoDate(dateTo)) return NextResponse.json({ error: "Informe uma data limite válida." }, { status: 400 });
      query = query.lt("appointment_date", dateTo);
    } else if (dateMode === "from_today") {
      query = query.gte("appointment_date", todayInSaoPaulo());
    } else if (dateMode !== "all") {
      return NextResponse.json({ error: "Filtro de período inválido." }, { status: 400 });
    }

    if (entityId) query = query.eq("entity_id", entityId);
    if (person) query = query.ilike("consulente_name", `%${person}%`);

    const { data, error } = await query;
    if (error) throw error;
    const ids = [...new Set((data ?? []).map((row) => row.entity_id).filter(Boolean))];
    const { data: entities, error: entitiesError } = ids.length
      ? await supabaseAdmin.from("oh_spiritual_entities").select("id,name").in("id", ids)
      : { data: [], error: null };
    if (entitiesError) throw entitiesError;
    const entityNames = new Map((entities ?? []).map((entity) => [entity.id, entity.name]));

    return NextResponse.json({
      kind,
      rows: (data ?? []).map((row) => ({
        Data: ptBrDate(row.appointment_date),
        Horário: row.appointment_time || "",
        Consulente: row.consulente_name || "",
        Entidade: entityNames.get(row.entity_id) || "",
        Status: row.status || "",
        Confirmação: row.confirmation_status || "",
        Chegada: row.arrival_status || "",
      })),
    });
  } catch (error) {
    console.error("[TUCXA Gestão relatórios]", error);
    return NextResponse.json({ error: "Não foi possível gerar o relatório." }, { status: 500 });
  }
}
