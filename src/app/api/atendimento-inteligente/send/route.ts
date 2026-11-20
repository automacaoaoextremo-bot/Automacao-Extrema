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
    const conversationId = body?.conversationId;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!isUuid(conversationId) || text.length < 1 || text.length > 1000) {
      return NextResponse.json({ error: "Conversa ou mensagem invalida (maximo 1000 caracteres)" }, { status: 400 });
    }
    const { data: c, error: cError } = await supabaseAdmin.from("ae_ai_conversations")
      .select("id,organization_id,contact_id,mode,last_inbound_at")
      .eq("id", conversationId).maybeSingle();
    if (cError) throw cError;
    if (!c || !allowed(scope, c.organization_id)) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    if (c.mode === "closed") return NextResponse.json({ error: "Conversa encerrada" }, { status: 409 });
    const { data: org, error: orgError } = await supabaseAdmin.from("ae_ai_organizations")
      .select("status").eq("id", c.organization_id).single();
    if (orgError) throw orgError;
    if (org?.status !== "active") return NextResponse.json({ error: "Empresa nao esta ativa" }, { status: 409 });
    const inboundAt = Date.parse(c.last_inbound_at ?? "");
    if (!Number.isFinite(inboundAt) || Date.now() - inboundAt > 23 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Fora da janela operacional segura de 23h. Use template aprovado pela Meta (funcionalidade futura)." }, { status: 409 });
    }
    const [contactResult, channelResult] = await Promise.all([
      supabaseAdmin.from("ae_ai_contacts").select("phone").eq("organization_id", c.organization_id).eq("id", c.contact_id).single(),
      supabaseAdmin.from("ae_ai_channels").select("id").eq("organization_id", c.organization_id).eq("active", true).limit(1).maybeSingle(),
    ]);
    if (contactResult.error || channelResult.error) throw contactResult.error ?? channelResult.error;
    if (!contactResult.data || !channelResult.data) return NextResponse.json({ error: "Canal indisponivel" }, { status: 409 });
    // Um envio humano assume a conversa: o bot nao deve responder em paralelo.
    const { error: takeoverError } = await supabaseAdmin.from("ae_ai_conversations").update({ mode: "human", updated_at: new Date().toISOString() })
      .eq("id", c.id).eq("organization_id", c.organization_id);
    if (takeoverError) throw takeoverError;
    const { data: queued, error } = await supabaseAdmin.from("ae_ai_outbox").insert({
      organization_id: c.organization_id, channel_id: channelResult.data.id,
      conversation_id: c.id, to_phone: contactResult.data.phone, body: text, source: "human",
    }).select("id").single();
    if (error) throw error;
    const result = await aeDispatch(queued.id);
    return NextResponse.json({ ok: true, outboxId: queued.id, delivery: result });
  } catch (error) { return NextResponse.json({ error: safeError(error) }, { status: 500 }); }
}
