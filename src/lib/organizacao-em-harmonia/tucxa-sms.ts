export type TucxaSmsResult = {
  sent: boolean;
  provider: "disabled" | "twilio" | "webhook";
  messageId?: string;
  error?: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function e164BrazilPhone(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  return `+55${digits}`;
}

function providerName() {
  const configured = (process.env.TUCXA_SMS_PROVIDER || "disabled").trim().toLowerCase();
  if (configured === "twilio" || configured === "webhook") return configured;
  return "disabled";
}

/**
 * Mantem as mensagens do piloto no conjunto ASCII/GSM-7 sempre que possivel.
 * SMS com caracteres Unicode pode cair para UCS-2 (70 caracteres no primeiro
 * segmento), aumentando rapidamente a quantidade de segmentos cobrados.
 */
export function normalizeTucxaSmsText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x0A\x0D\x20-\x7E]/g, "")
    .trim();
}

export async function sendTucxaSms(input: { to: string; message: string }): Promise<TucxaSmsResult> {
  const provider = providerName();
  const to = e164BrazilPhone(input.to);
  const message = normalizeTucxaSmsText(input.message);

  if (!to) return { sent: false, provider, error: "Telefone não informado." };
  if (!message) return { sent: false, provider, error: "Mensagem de SMS vazia." };
  if (provider === "disabled") return { sent: false, provider, error: "Provedor de SMS não configurado." };

  if (provider === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";
    const from = process.env.TWILIO_SMS_FROM || "";
    if (!accountSid || !authToken || !from) {
      return {
        sent: false,
        provider,
        error: "Variáveis TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_SMS_FROM incompletas.",
      };
    }

    const body = new URLSearchParams({ To: to, From: from, Body: message });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body,
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!response.ok) {
      return { sent: false, provider, error: payload.message || `Twilio HTTP ${response.status}` };
    }
    return { sent: true, provider, messageId: payload.sid };
  }

  const webhookUrl = process.env.TUCXA_SMS_WEBHOOK_URL || "";
  if (!webhookUrl) return { sent: false, provider, error: "TUCXA_SMS_WEBHOOK_URL não configurada." };

  const token = process.env.TUCXA_SMS_WEBHOOK_TOKEN || "";
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ to, message, source: "tucxa-agendamento-piloto" }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    messageId?: string;
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    return {
      sent: false,
      provider,
      error: payload.error || payload.message || `Webhook HTTP ${response.status}`,
    };
  }
  return { sent: true, provider, messageId: payload.messageId || payload.id };
}
