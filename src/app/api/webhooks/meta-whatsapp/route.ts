import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aeDispatch } from "@/lib/atendimento-inteligente/outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.AE_META_VERIFY_TOKEN;
  if (expected && mode === "subscribe" && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return new Response("Forbidden", { status: 403 });
}

type MetaMessage = {
  id?: string; from?: string; type?: string;
  text?: { body?: string };
  image?: { id?: string }; video?: { id?: string };
  audio?: { id?: string }; document?: { id?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};
type MetaChange = { value?: { metadata?: { phone_number_id?: string }; contacts?: Array<{ profile?: { name?: string } }>; messages?: MetaMessage[] } };
type MetaPayload = { object?: string; entry?: Array<{ changes?: MetaChange[] }> };

export async function POST(request: NextRequest) {
  const appSecret = process.env.AE_META_APP_SECRET;
  if (!appSecret) return new Response("Not configured", { status: 503 });
  const raw = await request.text();
  if (raw.length > 1_000_000) return new Response("Too large", { status: 413 });
  const received = request.headers.get("x-hub-signature-256");
  if (!received || !/^sha256=[0-9a-f]{64}$/i.test(received)) return new Response("Unauthorized", { status: 401 });
  const digest = `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;
  if (!timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(digest, "utf8"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  let payload: MetaPayload;
  try { payload = JSON.parse(raw) as MetaPayload; }
  catch { return new Response("Bad JSON", { status: 400 }); }
  if (payload.object !== "whatsapp_business_account") return new Response("OK", { status: 200 });

  try {
    for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneId = value?.metadata?.phone_number_id;
      if (!phoneId) continue;
      for (const msg of value?.messages ?? []) {
        if (!msg.id || !msg.from) continue;
        const type = msg.type ?? "other";
        const messageText = msg.text?.body ?? msg.button?.text ?? msg.interactive?.button_reply?.title
          ?? msg.interactive?.list_reply?.title ?? "";
        const mediaId = msg.image?.id ?? msg.video?.id ?? msg.audio?.id ?? msg.document?.id ?? null;
        const { data, error } = await supabaseAdmin.rpc("ae_ai_receive_message", {
          p_phone_number_id: phoneId, p_message_id: msg.id, p_from: msg.from,
          p_type: type, p_text: messageText, p_media_id: mediaId,
          p_contact_name: value?.contacts?.[0]?.profile?.name ?? null,
        });
        if (error) throw error;
        if (data?.outbox_id && typeof data.outbox_id === "string") {
          await aeDispatch(data.outbox_id);
        }
      }
    }
  } catch (error) {
    // Retentar o webhook sem duplicar mensagens (dedupe pelo ID Meta no banco).
    console.error("AE: falha ao processar webhook", error instanceof Error ? error.name : "unknown");
    return new Response("Processing failed", { status: 500 });
  }
  return new Response("EVENT_RECEIVED", { status: 200 });
}
