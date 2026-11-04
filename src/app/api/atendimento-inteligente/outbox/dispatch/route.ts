import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aeDispatch } from "@/lib/atendimento-inteligente/outbox";
import { aeScope, allowed, isUuid, safeError } from "@/lib/atendimento-inteligente/security";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const scope = await aeScope(request);
    if (!scope) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    const body = await request.json();
    if (!isUuid(body?.outboxId)) return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    const { data: o, error } = await supabaseAdmin.from("ae_ai_outbox")
      .select("id,organization_id,status").eq("id", body.outboxId).maybeSingle();
    if (error) throw error;
    if (!o || !allowed(scope, o.organization_id)) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    // Nunca reenviar status unknown/sending sem investigacao de duplicidade.
    if (o.status !== "pending") return NextResponse.json({ error: "Apenas mensagens pendentes podem ser despachadas" }, { status: 409 });
    return NextResponse.json({ delivery: await aeDispatch(o.id) });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
