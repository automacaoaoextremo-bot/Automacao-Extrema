import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aeScope, allowed, isUuid, safeError } from "@/lib/atendimento-inteligente/security";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const scope = await aeScope(request);
    if (!scope) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!isUuid(organizationId)) return NextResponse.json({ error: "Empresa invalida" }, { status: 400 });
    if (!allowed(scope, organizationId)) return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    const { data: conv, error } = await supabaseAdmin.from("ae_ai_conversations")
      .select("id,organization_id,contact_id,mode,stage,updated_at,last_inbound_at")
      .eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(100);
    if (error) throw error;
    const ids = (conv ?? []).map(c => c.contact_id);
    let contacts: Array<{ id: string; display_name: string | null; phone: string }> = [];
    if (ids.length) {
      const r = await supabaseAdmin.from("ae_ai_contacts").select("id,display_name,phone")
        .eq("organization_id", organizationId).in("id", ids);
      if (r.error) throw r.error;
      contacts = r.data ?? [];
    }
    const map = new Map(contacts.map(c => [c.id, c]));
    return NextResponse.json({ conversations: (conv ?? []).map(c => ({
      ...c, contact: map.get(c.contact_id) ?? null,
    })) });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
