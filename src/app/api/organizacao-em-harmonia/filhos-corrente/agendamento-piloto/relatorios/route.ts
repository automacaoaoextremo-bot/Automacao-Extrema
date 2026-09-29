import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { currentPilotReception } from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

export const dynamic = "force-dynamic";
function text(v: unknown) { return typeof v === "string" ? v.trim() : ""; }

export async function GET(request: Request) {
  try {
    const context = await currentPilotReception(request);
    if (!context) return NextResponse.json({ error: "Acesso restrito à Recepção." }, { status: 403 });
    const url = new URL(request.url);
    const kind = text(url.searchParams.get("kind")) || "atendimentos";
    const date = text(url.searchParams.get("date"));
    const entityId = text(url.searchParams.get("entityId"));
    const person = text(url.searchParams.get("person"));

    if (kind === "consulentes") {
      let q = supabaseAdmin.from("oh_people").select("id,full_name,whatsapp,email,active,created_at").eq("organization_id", context.organizationId).order("full_name").limit(2000);
      if (person) q = q.ilike("full_name", `%${person}%`);
      const { data, error } = await q; if (error) throw error;
      return NextResponse.json({ kind, rows: (data ?? []).map(r => ({ Nome:r.full_name, WhatsApp:r.whatsapp||"", Email:r.email||"", Ativo:r.active?"Sim":"Não", Cadastro:r.created_at })) });
    }

    if (kind === "entidades") {
      const [{ data: entities, error: ee }, { data: links, error: le }] = await Promise.all([
        supabaseAdmin.from("oh_spiritual_entities").select("id,name,active").eq("organization_id", context.organizationId).order("name"),
        supabaseAdmin.from("oh_person_entity_links").select("entity_id,person_id,is_primary_for_attendance,active").eq("organization_id", context.organizationId).eq("active", true),
      ]); if (ee) throw ee; if (le) throw le;
      const personIds=[...new Set((links??[]).map(x=>x.person_id).filter(Boolean))];
      const { data: people, error: pe } = personIds.length ? await supabaseAdmin.from("oh_people").select("id,full_name").in("id", personIds) : {data:[],error:null}; if(pe) throw pe;
      const names=new Map((people??[]).map(p=>[p.id,p.full_name]));
      return NextResponse.json({ kind, rows:(entities??[]).map(e=>({ Entidade:e.name, Cavalinhos:(links??[]).filter(l=>l.entity_id===e.id).map(l=>names.get(l.person_id)||"").filter(Boolean).join(", "), Ativa:e.active?"Sim":"Não" })) });
    }

    let q = supabaseAdmin.from("oh_consulente_appointments").select("id,consulente_name,appointment_date,appointment_time,status,confirmation_status,arrival_status,entity_id,created_at").eq("organization_id", context.organizationId).order("appointment_date",{ascending:false}).limit(3000);
    if (date) q=q.eq("appointment_date",date); if(entityId) q=q.eq("entity_id",entityId); if(person) q=q.ilike("consulente_name",`%${person}%`);
    const { data, error }=await q; if(error) throw error;
    const ids=[...new Set((data??[]).map(r=>r.entity_id).filter(Boolean))];
    const { data: entities, error: enErr }=ids.length?await supabaseAdmin.from("oh_spiritual_entities").select("id,name").in("id",ids):{data:[],error:null}; if(enErr) throw enErr;
    const em=new Map((entities??[]).map(e=>[e.id,e.name]));
    return NextResponse.json({ kind, rows:(data??[]).map(r=>({ Data:r.appointment_date, Horário:r.appointment_time||"", Consulente:r.consulente_name||"", Entidade:em.get(r.entity_id)||"", Status:r.status||"", Confirmação:r.confirmation_status||"", Chegada:r.arrival_status||"" })) });
  } catch (error) {
    console.error("[TUCXA Gestão relatórios]", error);
    return NextResponse.json({ error:"Não foi possível gerar o relatório." }, {status:500});
  }
}
