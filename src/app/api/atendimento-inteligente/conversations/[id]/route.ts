import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aeScope, allowed, isUuid, safeError } from "@/lib/atendimento-inteligente/security";
export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };
async function lookup(request: NextRequest, id: string) {
  const scope = await aeScope(request);
  if (!scope) return { error: NextResponse.json({ error: "Nao autenticado" }, { status: 401 }) };
  if (!isUuid(id)) return { error: NextResponse.json({ error: "ID invalido" }, { status: 400 }) };
  const { data, error } = await supabaseAdmin.from("ae_ai_conversations")
    .select("id,organization_id,contact_id,mode,stage,state,last_inbound_at,updated_at")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data || !allowed(scope, data.organization_id)) return { error: NextResponse.json({ error: "Nao encontrado" }, { status: 404 }) };
  return { conversation: data };
}

export async function GET(request: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    const result = await lookup(request, id);
    if (result.error) return result.error;
    const c = result.conversation!;
    const [a,b,d,o] = await Promise.all([
      supabaseAdmin.from("ae_ai_contacts").select("id,phone,display_name").eq("organization_id", c.organization_id).eq("id", c.contact_id).single(),
      supabaseAdmin.from("ae_ai_messages").select("id,external_message_id,direction,message_type,body,media_id,created_at").eq("organization_id", c.organization_id).eq("conversation_id", c.id).order("created_at", { ascending: true }).limit(150),
      supabaseAdmin.from("ae_ai_requests").select("id,category,description,neighborhood,urgency,status,created_at").eq("organization_id", c.organization_id).eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(25),
      supabaseAdmin.from("ae_ai_outbox").select("id,body,source,status,error,created_at,sent_at").eq("organization_id", c.organization_id).eq("conversation_id", c.id).order("created_at", { ascending: true }).limit(150),
    ]);
    if (a.error || b.error || d.error || o.error) throw a.error ?? b.error ?? d.error ?? o.error;
    return NextResponse.json({ conversation: c, contact: a.data, messages: b.data ?? [], requests: d.data ?? [], outbox: o.data ?? [] });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}

export async function PATCH(request: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    const result = await lookup(request, id);
    if (result.error) return result.error;
    const c = result.conversation!;
    const body = await request.json();
    const mode = body?.mode;
    if (!["bot","human","closed"].includes(mode)) return NextResponse.json({ error: "Modo invalido" }, { status: 400 });
    const update: Record<string, unknown> = { mode, updated_at: new Date().toISOString() };
    // Retomar bot sempre reinicia triagem; nao reutiliza informacoes antigas como novas.
    if (mode === "bot") { update.stage = "new"; update.state = {}; }
    const { error } = await supabaseAdmin.from("ae_ai_conversations")
      .update(update).eq("organization_id", c.organization_id).eq("id", c.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
