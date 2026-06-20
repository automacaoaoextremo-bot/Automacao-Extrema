export type BotConversaSyncInput = {
  leadId: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  loginUrl: string;
  source: string;
  organizationName: string;
  founderTermsAccepted: boolean;
  accessEmailSent: boolean;
  status: string;
  trialDays: number;
};

type BotConversaJson = string | number | boolean | null | BotConversaJson[] | { [key: string]: BotConversaJson };

type BotConversaStepResult = {
  step: string;
  ok: boolean;
  skipped?: boolean;
  status?: number;
  reason?: string;
  path?: string;
  method?: string;
  data?: BotConversaJson;
  responseText?: string;
};

export type BotConversaSyncResult = {
  enabled: boolean;
  ok: boolean;
  reason: string;
  subscriberId: string | null;
  steps: BotConversaStepResult[];
};

type BotConversaRequestResult = {
  ok: boolean;
  status: number;
  data: BotConversaJson;
  text: string;
  path: string;
  method: string;
};

type BotConversaFieldConfig = {
  fieldId: string;
  label: string;
  value: string;
};

const DEFAULT_BASE_URL = "https://backend.botconversa.com.br";
const DEFAULT_CREATE_CONTACT_PATH = "/api/v1/webhook/subscriber/";
const DEFAULT_TAG_PATH_TEMPLATE = "/api/v1/webhook/subscriber/{subscriberId}/tags/{tagId}/";
const DEFAULT_FIELD_PATH_TEMPLATE = "/api/v1/webhook/subscriber/{subscriberId}/custom_fields/{fieldId}/";
const DEFAULT_FLOW_PATH_TEMPLATE = "/api/v1/webhook/subscriber/{subscriberId}/send_flow/{flowId}/";

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function firstEnv(...names: string[]) {
  for (const name of names) {
    const value = env(name);
    if (value) return value;
  }
  return "";
}

function isEnabled() {
  return env("BOTCONVERSA_ENABLED").toLowerCase() === "true";
}

function debugEnabled() {
  return env("BOTCONVERSA_DEBUG").toLowerCase() === "true";
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizePhoneForBotConversa(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || value.trim();
}

function lastName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}

function cleanBaseUrl(value: string) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function isConfigured(value: string) {
  const text = value.trim();
  return Boolean(text && !text.includes("...") && !text.includes("PREENCHER") && !text.includes("SEU_") && !text.includes("SUA_"));
}

function fillTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((current, [key, value]) => current.replaceAll(`{${key}}`, encodeURIComponent(value)), template);
}

export function buildCorrenteLeadBotConversaMessage(input: BotConversaSyncInput) {
  const greeting = firstName(input.responsibleName);

  return [
    `Pronto, ${greeting}. Seu cadastro do Corrente em Dia já foi recebido.`,
    "",
    "Seu acesso inicial já foi preparado para começar a configuração da organização.",
    "",
    "Link de acesso:",
    input.loginUrl,
    "",
    "E-mail usado no cadastro:",
    input.email,
    "",
    "As orientações também foram enviadas para esse e-mail. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.",
    "",
    "Se já tiver senha, use sua senha atual. Se não lembrar, clique em \"Esqueci minha senha\" na tela de login.",
    "",
    "Dados recebidos:",
    `Nome do contato: ${input.responsibleName}`,
    `WhatsApp informado: ${input.whatsapp}`,
    `Código do lead: ${input.leadId}`,
    `Cliente Fundador: ${input.founderTermsAccepted ? "interesse confirmado" : "será confirmado no primeiro acesso"}`,
    "",
    "Próximo passo:",
    "entre no sistema, complete o cadastro da organização, configure Pix, contribuições, funções e contribuintes.",
    "",
    "Se tiver qualquer dificuldade, responda AJUDA por aqui.",
  ].join("\n");
}

function parseJson(text: string): BotConversaJson {
  if (!text) return null;
  try {
    return JSON.parse(text) as BotConversaJson;
  } catch {
    return text;
  }
}

function getNestedRecord(value: BotConversaJson, key: string): Record<string, BotConversaJson> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const nested = value[key];
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return null;
  return nested as Record<string, BotConversaJson>;
}

function pickString(value: BotConversaJson, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, BotConversaJson>;

  for (const key of keys) {
    const item = record[key];
    if (typeof item === "string" || typeof item === "number") return String(item);
  }

  for (const parentKey of ["data", "subscriber", "user", "contact", "result", "response"]) {
    const nested = getNestedRecord(value, parentKey);
    if (!nested) continue;
    for (const key of keys) {
      const item = nested[key];
      if (typeof item === "string" || typeof item === "number") return String(item);
    }
  }

  return "";
}

function resolveSubscriberId(data: BotConversaJson) {
  return pickString(data, ["id", "subscriber_id", "subscriberId", "user_id", "contact_id", "contactId"]);
}

function safeLog(message: string, payload?: BotConversaJson) {
  if (!debugEnabled()) return;
  console.log(`[BotConversa] ${message}`, payload ?? "");
}

async function botconversaRequest(path: string, init: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: BotConversaJson }): Promise<BotConversaRequestResult> {
  const baseUrl = cleanBaseUrl(env("BOTCONVERSA_API_BASE_URL"));
  const apiKey = env("BOTCONVERSA_API_KEY") || env("BOTCONVERSA_WEBHOOK_INTEGRATION_KEY");
  const headerName = env("BOTCONVERSA_API_HEADER_NAME") || "API-KEY";
  const authScheme = env("BOTCONVERSA_AUTH_SCHEME");
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      data: null,
      text: "BOTCONVERSA_API_KEY não configurada.",
      path,
      method: init.method,
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [headerName]: authScheme ? `${authScheme} ${apiKey}` : apiKey,
  };

  safeLog(`${init.method} ${path}`, init.body ?? null);

  const response = await fetch(url, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const text = await response.text();
  const data = parseJson(text);

  safeLog(`${init.method} ${path} -> ${response.status}`, data);

  return {
    ok: response.ok,
    status: response.status,
    data,
    text,
    path,
    method: init.method,
  };
}

function contactPayload(input: BotConversaSyncInput) {
  const phone = normalizePhoneForBotConversa(input.whatsapp);
  const name = input.responsibleName.trim();

  return {
    phone,
    telefone: phone,
    name,
    nome: name,
    first_name: firstName(name),
    last_name: lastName(name),
    email: input.email,
  } satisfies Record<string, BotConversaJson>;
}

async function createOrUpdateSubscriber(input: BotConversaSyncInput): Promise<{ subscriberId: string | null; result: BotConversaStepResult }> {
  const phone = normalizePhoneForBotConversa(input.whatsapp);
  if (!phone) {
    return {
      subscriberId: null,
      result: { step: "create_or_update_subscriber", ok: false, skipped: true, reason: "Lead sem WhatsApp válido." },
    };
  }

  const path = env("BOTCONVERSA_CREATE_CONTACT_PATH") || DEFAULT_CREATE_CONTACT_PATH;
  const response = await botconversaRequest(path, { method: "POST", body: contactPayload(input) });
  const subscriberId = resolveSubscriberId(response.data);

  return {
    subscriberId: subscriberId || null,
    result: {
      step: "create_or_update_subscriber",
      ok: response.ok && Boolean(subscriberId),
      status: response.status,
      path: response.path,
      method: response.method,
      reason: subscriberId ? "Contato criado/atualizado no BotConversa." : "Contato criado/atualizado, mas o ID não foi identificado na resposta. Verifique o endpoint/body da sua conta.",
      data: response.data,
      responseText: response.ok ? undefined : response.text,
    },
  };
}

function tagIds(input: BotConversaSyncInput) {
  return [
    firstEnv("BOTCONVERSA_CED_TAG_LEAD_SITE_ID", "BOTCONVERSA_CED_TAG_LEAD_SITE"),
    input.accessEmailSent ? firstEnv("BOTCONVERSA_CED_TAG_EMAIL_SENT_ID", "BOTCONVERSA_CED_TAG_EMAIL_SENT") : "",
    input.founderTermsAccepted ? firstEnv("BOTCONVERSA_CED_TAG_FOUNDER_ID", "BOTCONVERSA_CED_TAG_FOUNDER") : "",
    firstEnv("BOTCONVERSA_CED_TAG_WAITING_ACCESS_ID", "BOTCONVERSA_CED_TAG_WAITING_ACCESS"),
  ].filter(isConfigured);
}

async function applyTags(subscriberId: string, input: BotConversaSyncInput) {
  const ids = tagIds(input);
  const results: BotConversaStepResult[] = [];

  if (ids.length === 0) {
    return [{ step: "apply_tags", ok: true, skipped: true, reason: "Nenhum ID de etiqueta configurado." }];
  }

  const template = env("BOTCONVERSA_TAG_PATH_TEMPLATE") || DEFAULT_TAG_PATH_TEMPLATE;
  for (const tagId of ids) {
    const path = fillTemplate(template, { subscriberId, tagId });
    const response = await botconversaRequest(path, { method: "POST", body: { tag_id: tagId } });
    results.push({
      step: `apply_tag_${tagId}`,
      ok: response.ok,
      status: response.status,
      path: response.path,
      method: response.method,
      data: response.data,
      responseText: response.ok ? undefined : response.text,
    });
  }

  return results;
}

function customFields(input: BotConversaSyncInput) {
  const message = buildCorrenteLeadBotConversaMessage(input);
  const values: BotConversaFieldConfig[] = [
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_NAME_ID", "BOTCONVERSA_CED_FIELD_NAME"), label: "ced_nome_contato", value: input.responsibleName },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_EMAIL_ID", "BOTCONVERSA_CED_FIELD_EMAIL"), label: "ced_email", value: input.email },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_WHATSAPP_ID", "BOTCONVERSA_CED_FIELD_WHATSAPP"), label: "ced_whatsapp", value: normalizePhoneForBotConversa(input.whatsapp) },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_LEAD_ID_ID", "BOTCONVERSA_CED_FIELD_LEAD_ID"), label: "ced_lead_id", value: input.leadId },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_ORIGIN_ID", "BOTCONVERSA_CED_FIELD_ORIGIN"), label: "ced_origem", value: input.source },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_STATUS_ID", "BOTCONVERSA_CED_FIELD_STATUS"), label: "ced_status", value: input.status },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_LOGIN_URL_ID", "BOTCONVERSA_CED_FIELD_LOGIN_URL"), label: "ced_login_url", value: input.loginUrl },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_FOUNDER_ID", "BOTCONVERSA_CED_FIELD_FOUNDER"), label: "ced_interesse_cliente_fundador", value: input.founderTermsAccepted ? "sim" : "pendente_no_primeiro_acesso" },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_EMAIL_SENT_ID", "BOTCONVERSA_CED_FIELD_EMAIL_SENT"), label: "ced_acesso_email_enviado", value: input.accessEmailSent ? "sim" : "nao" },
    { fieldId: firstEnv("BOTCONVERSA_CED_FIELD_FIRST_ACCESS_ID", "BOTCONVERSA_CED_FIELD_FIRST_ACCESS"), label: "ced_primeiro_acesso_status", value: "aguardando_primeiro_acesso" },
    {
      fieldId: firstEnv("BOTCONVERSA_CED_FIELD_RESPONSE_ID", "BOTCONVERSA_CED_FIELD_RESPONSE", "BOTCONVERSA_CED_FIELD_MESSAGE_ID", "BOTCONVERSA_CED_FIELD_MESSAGE"),
      label: "ced_resp_botconversa",
      value: message,
    },
  ];

  return values.filter((item) => isConfigured(item.fieldId));
}

function customFieldBody(field: BotConversaFieldConfig): BotConversaJson {
  const mode = env("BOTCONVERSA_FIELD_BODY_MODE").toLowerCase();

  if (mode === "custom_field_value") {
    return { custom_field_value: field.value };
  }

  if (mode === "value_only") {
    return field.value;
  }

  if (mode === "value_and_field") {
    return { custom_field: field.fieldId, value: field.value };
  }

  return { value: field.value };
}

async function setCustomFields(subscriberId: string, input: BotConversaSyncInput) {
  const fields = customFields(input);
  const results: BotConversaStepResult[] = [];

  if (fields.length === 0) {
    return [{ step: "set_custom_fields", ok: true, skipped: true, reason: "Nenhum ID de campo personalizado configurado." }];
  }

  const template = env("BOTCONVERSA_FIELD_PATH_TEMPLATE") || DEFAULT_FIELD_PATH_TEMPLATE;
  const method = (env("BOTCONVERSA_FIELD_METHOD") || "POST").toUpperCase() as "POST" | "PUT" | "PATCH";

  for (const field of fields) {
    const path = fillTemplate(template, { subscriberId, fieldId: field.fieldId });
    const response = await botconversaRequest(path, { method, body: customFieldBody(field) });
    results.push({
      step: `set_field_${field.label}`,
      ok: response.ok,
      status: response.status,
      path: response.path,
      method: response.method,
      data: response.data,
      responseText: response.ok ? undefined : response.text,
    });
  }

  return results;
}

async function sendFlow(subscriberId: string) {
  const flowId = firstEnv("BOTCONVERSA_CED_FLOW_ID", "BOTCONVERSA_CED_FLOW");
  const sendFlowEnabled = env("BOTCONVERSA_CED_SEND_FLOW").toLowerCase() === "true";

  if (!sendFlowEnabled || !isConfigured(flowId)) {
    return { step: "send_flow", ok: true, skipped: true, reason: "Envio automático de fluxo desativado ou BOTCONVERSA_CED_FLOW_ID não configurado." };
  }

  const template = env("BOTCONVERSA_FLOW_PATH_TEMPLATE") || DEFAULT_FLOW_PATH_TEMPLATE;
  const path = fillTemplate(template, { subscriberId, flowId });
  const response = await botconversaRequest(path, { method: "POST", body: { flow_id: flowId } });

  return {
    step: "send_flow",
    ok: response.ok,
    status: response.status,
    path: response.path,
    method: response.method,
    data: response.data,
    responseText: response.ok ? undefined : response.text,
  };
}

export function getBotConversaConfigSummary() {
  return {
    enabled: isEnabled(),
    baseUrl: cleanBaseUrl(env("BOTCONVERSA_API_BASE_URL")),
    createContactPath: env("BOTCONVERSA_CREATE_CONTACT_PATH") || DEFAULT_CREATE_CONTACT_PATH,
    tagPathTemplate: env("BOTCONVERSA_TAG_PATH_TEMPLATE") || DEFAULT_TAG_PATH_TEMPLATE,
    fieldPathTemplate: env("BOTCONVERSA_FIELD_PATH_TEMPLATE") || DEFAULT_FIELD_PATH_TEMPLATE,
    fieldMethod: env("BOTCONVERSA_FIELD_METHOD") || "POST",
    fieldBodyMode: env("BOTCONVERSA_FIELD_BODY_MODE") || "value",
    flowPathTemplate: env("BOTCONVERSA_FLOW_PATH_TEMPLATE") || DEFAULT_FLOW_PATH_TEMPLATE,
    apiHeaderName: env("BOTCONVERSA_API_HEADER_NAME") || "API-KEY",
    authScheme: env("BOTCONVERSA_AUTH_SCHEME") || "",
    hasApiKey: Boolean(env("BOTCONVERSA_API_KEY") || env("BOTCONVERSA_WEBHOOK_INTEGRATION_KEY")),
    responseFieldConfigured: Boolean(firstEnv("BOTCONVERSA_CED_FIELD_RESPONSE_ID", "BOTCONVERSA_CED_FIELD_RESPONSE", "BOTCONVERSA_CED_FIELD_MESSAGE_ID", "BOTCONVERSA_CED_FIELD_MESSAGE")),
  };
}

export async function syncCorrenteLeadWithBotConversa(input: BotConversaSyncInput): Promise<BotConversaSyncResult> {
  if (!isEnabled()) {
    return {
      enabled: false,
      ok: true,
      reason: "BOTCONVERSA_ENABLED não está true. Integração ignorada.",
      subscriberId: null,
      steps: [],
    };
  }

  const steps: BotConversaStepResult[] = [];

  try {
    const subscriber = await createOrUpdateSubscriber(input);
    steps.push(subscriber.result);

    if (!subscriber.subscriberId) {
      return {
        enabled: true,
        ok: false,
        reason: "Não foi possível identificar o ID do contato no BotConversa. Verifique o retorno do endpoint de contato na documentação autenticada.",
        subscriberId: null,
        steps,
      };
    }

    steps.push(...(await applyTags(subscriber.subscriberId, input)));
    steps.push(...(await setCustomFields(subscriber.subscriberId, input)));
    steps.push(await sendFlow(subscriber.subscriberId));

    const ok = steps.every((step) => step.ok || step.skipped);
    return {
      enabled: true,
      ok,
      reason: ok ? "Contato enriquecido no BotConversa." : "Integração BotConversa executada com alguma falha. Verifique steps.",
      subscriberId: subscriber.subscriberId,
      steps,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Erro inesperado ao sincronizar BotConversa.";
    return {
      enabled: true,
      ok: false,
      reason,
      subscriberId: null,
      steps,
    };
  }
}
