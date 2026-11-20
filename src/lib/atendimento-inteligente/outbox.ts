import { supabaseAdmin } from "@/lib/supabase-admin";

export type DispatchResult = { status: string; detail?: string };
const GRAPH_VERSION_PATTERN = /^v\d+\.\d+$/;

export async function aeDispatch(outboxId: string): Promise<DispatchResult> {
  // O RPC faz um claim atomico. Execucoes concorrentes nao enviam a mesma linha.
  const { data, error } = await supabaseAdmin.rpc("ae_ai_claim_outbox", { p_outbox_id: outboxId });
  if (error) throw error;
  const item = Array.isArray(data) ? data[0] : undefined;
  if (!item) return { status: "already_claimed_or_not_pending" };

  // Bloqueio de seguranca: Preview e desenvolvimento NUNCA enviam mensagens reais.
  if (process.env.VERCEL_ENV !== "production" || process.env.AE_AI_SEND_LIVE !== "true") {
    await supabaseAdmin.from("ae_ai_outbox").update({ status: "simulated", error: null }).eq("id", outboxId);
    return { status: "simulated" };
  }

  const { data: channel, error: channelError } = await supabaseAdmin
    .from("ae_ai_channels")
    .select("id,organization_id,phone_number_id,token_env_key,active")
    .eq("id", item.channel_id).eq("organization_id", item.organization_id).maybeSingle();
  if (channelError) throw channelError;
  if (!channel?.active || !channel.phone_number_id) {
    await mark(outboxId, "failed", "Canal Meta inativo ou sem phone_number_id.");
    return { status: "failed" };
  }
  const { data: org, error: orgError } = await supabaseAdmin.from("ae_ai_organizations")
    .select("status").eq("id", item.organization_id).single();
  if (orgError) throw orgError;
  if (org?.status !== "active") {
    await mark(outboxId, "failed", "Empresa nao esta ativa.");
    return { status: "failed" };
  }
  const token = process.env[channel.token_env_key];
  const version = process.env.AE_META_GRAPH_VERSION ?? "";
  if (!token || !GRAPH_VERSION_PATTERN.test(version)) {
    await mark(outboxId, "failed", "Token do canal ou versao Graph ausente.");
    return { status: "failed" };
  }
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${channel.phone_number_id}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: item.to_phone, type: "text", text: { preview_url: false, body: item.body } }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      // Falha de rede ou 5xx pode ser ambiguo: NAO reenviar automaticamente.
      const kind = response.status >= 500 ? "unknown" : "failed";
      await mark(outboxId, kind, `Meta HTTP ${response.status}. Consulte o log na Meta antes de reenviar.`);
      return { status: kind };
    }
    const payload: unknown = await response.json();
    const msgId = extractMessageId(payload);
    if (!msgId) {
      await mark(outboxId, "unknown", "Meta nao retornou um ID de mensagem; conferir antes de reenviar.");
      return { status: "unknown" };
    }
    const { error: updateError } = await supabaseAdmin.from("ae_ai_outbox")
      .update({ status: "sent", external_message_id: msgId, error: null, sent_at: new Date().toISOString() })
      .eq("id", outboxId);
    if (updateError) throw updateError;
    // Log de mensagem de saida; outbox contem o registro canonico de entrega.
    await supabaseAdmin.from("ae_ai_messages").insert({
      organization_id: item.organization_id, conversation_id: item.conversation_id,
      external_message_id: msgId, direction: "outbound", message_type: "text", body: item.body,
    });
    return { status: "sent" };
  } catch (error) {
    // Pode ter sido entregue no momento do timeout; nao automatizar retry.
    await mark(outboxId, "unknown", "Erro de rede ou resposta ambigua. Revisar antes de reenviar.");
    console.error("AE: entrega Meta com resultado incerto", error instanceof Error ? error.name : "unknown");
    return { status: "unknown" };
  }
}

function extractMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("messages" in payload)) return null;
  const messages = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return null;
  const first: unknown = messages[0];
  return first && typeof first === "object" && "id" in first && typeof first.id === "string" ? first.id : null;
}

async function mark(id: string, status: string, error: string) {
  const { error: dbError } = await supabaseAdmin.from("ae_ai_outbox")
    .update({ status, error }).eq("id", id);
  if (dbError) throw dbError;
}
