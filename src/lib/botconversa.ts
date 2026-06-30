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

export type PresencaBotConversaSyncInput = {
  leadId: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  loginUrl: string;
  source: string;
  eventName: string;
  eventType: string;
  eventDate?: string | null;
  guestsEstimate?: number | null;
  founderTermsAccepted: boolean;
  accessEmailSent: boolean;
  status: string;
  trialDays: number;
};

export type OrganizacaoBotConversaSyncInput = {
  leadId: string;
  contactName: string;
  email: string;
  whatsapp: string;
  moduleName: string;
  moduleSlug: string;
  priorityModuleName?: string;
  priorityModuleSlug?: string;
  organizationName?: string | null;
  loginUrl: string;
  source: string;
  founderTermsAccepted: boolean;
  accessEmailSent: boolean;
  status: string;
  trialDays: number;
  implantationDueAt?: string | null;
  reminderHoursBeforeDue?: number | null;
};

type BotConversaContactInput = {
  responsibleName: string;
  email: string;
  whatsapp: string;
};

type BotConversaJson =
  | string
  | number
  | boolean
  | null
  | BotConversaJson[]
  | { [key: string]: BotConversaJson };

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
const DEFAULT_TAG_PATH_TEMPLATE =
  "/api/v1/webhook/subscriber/{subscriberId}/tags/{tagId}/";
const DEFAULT_FIELD_PATH_TEMPLATE =
  "/api/v1/webhook/subscriber/{subscriberId}/custom_fields/{fieldId}/";
const DEFAULT_FLOW_PATH_TEMPLATE =
  "/api/v1/webhook/subscriber/{subscriberId}/send_flow/{flowId}/";

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
  return Boolean(
    text &&
    !text.includes("...") &&
    !text.includes("PREENCHER") &&
    !text.includes("SEU_") &&
    !text.includes("SUA_"),
  );
}

function fillTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (current, [key, value]) =>
      current.replaceAll(`{${key}}`, encodeURIComponent(value)),
    template,
  );
}

function boolLabel(value: boolean) {
  return value ? "sim" : "nao";
}

function optionalValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function buildCorrenteLeadBotConversaMessage(
  input: BotConversaSyncInput,
) {
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
    'Se já tiver senha, use sua senha atual. Se não lembrar, clique em "Esqueci minha senha" na tela de login.',
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

export function buildPresencaLeadBotConversaMessage(
  input: PresencaBotConversaSyncInput,
) {
  const greeting = firstName(input.responsibleName);

  return [
    `Pronto, ${greeting}. Seu cadastro do Presença Querida já foi recebido.`,
    "",
    "Seu acesso inicial já foi preparado para começar a configuração do evento.",
    "",
    "Link de acesso:",
    input.loginUrl,
    "",
    "E-mail usado no cadastro:",
    input.email,
    "",
    "As orientações também foram enviadas para esse e-mail. Se não encontrar a mensagem de acesso, confira também spam/lixo eletrônico.",
    "",
    'Se já tiver senha, use sua senha atual. Se não lembrar, clique em "Esqueci minha senha" na tela de login.',
    "",
    "Dados recebidos:",
    `Nome do contato: ${input.responsibleName}`,
    `WhatsApp informado: ${input.whatsapp}`,
    `Evento: ${input.eventName}`,
    `Tipo de evento: ${input.eventType}`,
    input.eventDate
      ? `Data prevista: ${input.eventDate}`
      : "Data prevista: será definida ou confirmada no painel",
    input.guestsEstimate
      ? `Convidados estimados: ${input.guestsEstimate}`
      : "Convidados estimados: será confirmado no painel",
    `Código do lead: ${input.leadId}`,
    `Cliente Fundador: ${input.founderTermsAccepted ? "interesse confirmado" : "será confirmado no primeiro acesso"}`,
    "",
    "Próximo passo:",
    "entre no sistema, complete os dados do evento, ajuste o convite, cadastre convidados e teste uma confirmação antes de enviar para todos.",
    "",
    "Se tiver qualquer dificuldade, responda AJUDA por aqui.",
  ].join("\n");
}

export function buildOrganizacaoLeadBotConversaMessage(
  input: OrganizacaoBotConversaSyncInput,
) {
  const greeting = firstName(input.contactName);
  const priorityModuleName = input.priorityModuleName || input.moduleName;
  const dueLine = input.implantationDueAt
    ? `Prazo sugerido para concluir configuração e treinamento: ${new Date(input.implantationDueAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
    : "Prazo de implantação assistida: será combinado com a equipe da AE.";

  return [
    `Pronto, ${greeting}. Seu cadastro da Organização em Harmonia já foi recebido.`,
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
    'Se já tiver senha, use sua senha atual. Se não lembrar, clique em "Esqueci minha senha" na tela de login.',
    "",
    "Dados recebidos:",
    `Nome do contato: ${input.contactName}`,
    `WhatsApp informado: ${input.whatsapp}`,
    input.organizationName
      ? `Organização: ${input.organizationName}`
      : "Organização: será confirmada no primeiro acesso",
    `Interesse inicial: ${input.moduleName}`,
    `Primeiro módulo recomendado: ${priorityModuleName}`,
    `Código do lead: ${input.leadId}`,
    `Cliente Fundador: ${input.founderTermsAccepted ? "interesse confirmado" : "será confirmado no primeiro acesso"}`,
    "",
    "Como funcionará a validação:",
    "1. Primeiro, confirmamos a organização, pessoas, funções e permissões na Base Única.",
    "2. Depois, configuramos o primeiro módulo e treinamos os envolvidos.",
    `3. A avaliação de ${input.trialDays} dias começa após configuração e treinamento mínimos, não antes disso.`,
    dueLine,
    "",
    "Próximo passo:",
    "acesse a área da Organização em Harmonia, complete o cadastro da organização e comece pela Base Única. Para o Tucxa, a recomendação é iniciar pelo Agenda Viva, organizando calendário, grupos, atividades, eventos, aprovações e responsáveis.",
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

function getNestedRecord(
  value: BotConversaJson,
  key: string,
): Record<string, BotConversaJson> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const nested = value[key];
  if (!nested || typeof nested !== "object" || Array.isArray(nested))
    return null;
  return nested as Record<string, BotConversaJson>;
}

function pickString(value: BotConversaJson, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, BotConversaJson>;

  for (const key of keys) {
    const item = record[key];
    if (typeof item === "string" || typeof item === "number")
      return String(item);
  }

  for (const parentKey of [
    "data",
    "subscriber",
    "user",
    "contact",
    "result",
    "response",
  ]) {
    const nested = getNestedRecord(value, parentKey);
    if (!nested) continue;
    for (const key of keys) {
      const item = nested[key];
      if (typeof item === "string" || typeof item === "number")
        return String(item);
    }
  }

  return "";
}

function resolveSubscriberId(data: BotConversaJson) {
  return pickString(data, [
    "id",
    "subscriber_id",
    "subscriberId",
    "user_id",
    "contact_id",
    "contactId",
  ]);
}

function safeLog(message: string, payload?: BotConversaJson) {
  if (!debugEnabled()) return;
  console.log(`[BotConversa] ${message}`, payload ?? "");
}

async function botconversaRequest(
  path: string,
  init: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: BotConversaJson;
  },
): Promise<BotConversaRequestResult> {
  const baseUrl = cleanBaseUrl(env("BOTCONVERSA_API_BASE_URL"));
  const apiKey =
    env("BOTCONVERSA_API_KEY") || env("BOTCONVERSA_WEBHOOK_INTEGRATION_KEY");
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

function contactPayload(input: BotConversaContactInput) {
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

async function createOrUpdateSubscriber(
  input: BotConversaContactInput,
): Promise<{ subscriberId: string | null; result: BotConversaStepResult }> {
  const phone = normalizePhoneForBotConversa(input.whatsapp);
  if (!phone) {
    return {
      subscriberId: null,
      result: {
        step: "create_or_update_subscriber",
        ok: false,
        skipped: true,
        reason: "Lead sem WhatsApp válido.",
      },
    };
  }

  const path =
    env("BOTCONVERSA_CREATE_CONTACT_PATH") || DEFAULT_CREATE_CONTACT_PATH;
  const response = await botconversaRequest(path, {
    method: "POST",
    body: contactPayload(input),
  });
  const subscriberId = resolveSubscriberId(response.data);

  return {
    subscriberId: subscriberId || null,
    result: {
      step: "create_or_update_subscriber",
      ok: response.ok && Boolean(subscriberId),
      status: response.status,
      path: response.path,
      method: response.method,
      reason: subscriberId
        ? "Contato criado/atualizado no BotConversa."
        : "Contato criado/atualizado, mas o ID não foi identificado na resposta. Verifique o endpoint/body da sua conta.",
      data: response.data,
      responseText: response.ok ? undefined : response.text,
    },
  };
}

function correnteTagIds(input: BotConversaSyncInput) {
  return [
    firstEnv(
      "BOTCONVERSA_CED_TAG_LEAD_SITE_ID",
      "BOTCONVERSA_CED_TAG_LEAD_SITE",
    ),
    input.accessEmailSent
      ? firstEnv(
          "BOTCONVERSA_CED_TAG_EMAIL_SENT_ID",
          "BOTCONVERSA_CED_TAG_EMAIL_SENT",
        )
      : "",
    input.founderTermsAccepted
      ? firstEnv(
          "BOTCONVERSA_CED_TAG_FOUNDER_ID",
          "BOTCONVERSA_CED_TAG_FOUNDER",
        )
      : "",
    firstEnv(
      "BOTCONVERSA_CED_TAG_WAITING_ACCESS_ID",
      "BOTCONVERSA_CED_TAG_WAITING_ACCESS",
    ),
  ].filter(isConfigured);
}

function presencaTagIds(input: PresencaBotConversaSyncInput) {
  return [
    firstEnv("BOTCONVERSA_PQ_TAG_LEAD_SITE_ID", "BOTCONVERSA_PQ_TAG_LEAD_SITE"),
    input.accessEmailSent
      ? firstEnv(
          "BOTCONVERSA_PQ_TAG_EMAIL_SENT_ID",
          "BOTCONVERSA_PQ_TAG_EMAIL_SENT",
        )
      : "",
    input.founderTermsAccepted
      ? firstEnv("BOTCONVERSA_PQ_TAG_FOUNDER_ID", "BOTCONVERSA_PQ_TAG_FOUNDER")
      : "",
    firstEnv(
      "BOTCONVERSA_PQ_TAG_WAITING_ACCESS_ID",
      "BOTCONVERSA_PQ_TAG_WAITING_ACCESS",
    ),
  ].filter(isConfigured);
}

function organizacaoTagIds(input: OrganizacaoBotConversaSyncInput) {
  return [
    firstEnv("BOTCONVERSA_OH_TAG_LEAD_SITE_ID", "BOTCONVERSA_OH_TAG_LEAD_SITE"),
    input.accessEmailSent
      ? firstEnv(
          "BOTCONVERSA_OH_TAG_EMAIL_SENT_ID",
          "BOTCONVERSA_OH_TAG_EMAIL_SENT",
        )
      : "",
    input.founderTermsAccepted
      ? firstEnv("BOTCONVERSA_OH_TAG_FOUNDER_ID", "BOTCONVERSA_OH_TAG_FOUNDER")
      : "",
    firstEnv(
      "BOTCONVERSA_OH_TAG_WAITING_ACCESS_ID",
      "BOTCONVERSA_OH_TAG_WAITING_ACCESS",
      "BOTCONVERSA_OH_TAG_IMPLANTATION_ID",
    ),
    input.priorityModuleSlug === "agenda-viva"
      ? firstEnv(
          "BOTCONVERSA_OH_TAG_AGENDA_VIVA_ID",
          "BOTCONVERSA_OH_TAG_AGENDA_VIVA",
        )
      : "",
    input.organizationName?.toLowerCase().includes("tucxa")
      ? firstEnv(
          "BOTCONVERSA_OH_TAG_TUCXA_ID",
          "BOTCONVERSA_OH_TAG_TUCXA",
        )
      : "",
  ].filter(isConfigured);
}

async function applyTags(subscriberId: string, tagIds: string[]) {
  const results: BotConversaStepResult[] = [];

  if (tagIds.length === 0) {
    return [
      {
        step: "apply_tags",
        ok: true,
        skipped: true,
        reason: "Nenhum ID de etiqueta configurado.",
      },
    ];
  }

  const template =
    env("BOTCONVERSA_TAG_PATH_TEMPLATE") || DEFAULT_TAG_PATH_TEMPLATE;
  for (const tagId of tagIds) {
    const path = fillTemplate(template, { subscriberId, tagId });
    const response = await botconversaRequest(path, {
      method: "POST",
      body: { tag_id: tagId },
    });
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

function correnteCustomFields(input: BotConversaSyncInput) {
  const message = buildCorrenteLeadBotConversaMessage(input);
  const values: BotConversaFieldConfig[] = [
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_NAME_ID",
        "BOTCONVERSA_CED_FIELD_NAME",
      ),
      label: "ced_nome_contato",
      value: input.responsibleName,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_EMAIL_ID",
        "BOTCONVERSA_CED_FIELD_EMAIL",
      ),
      label: "ced_email",
      value: input.email,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_WHATSAPP_ID",
        "BOTCONVERSA_CED_FIELD_WHATSAPP",
      ),
      label: "ced_whatsapp",
      value: normalizePhoneForBotConversa(input.whatsapp),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_LEAD_ID_ID",
        "BOTCONVERSA_CED_FIELD_LEAD_ID",
      ),
      label: "ced_lead_id",
      value: input.leadId,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_ORIGIN_ID",
        "BOTCONVERSA_CED_FIELD_ORIGIN",
      ),
      label: "ced_origem",
      value: input.source,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_STATUS_ID",
        "BOTCONVERSA_CED_FIELD_STATUS",
      ),
      label: "ced_status",
      value: input.status,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_LOGIN_URL_ID",
        "BOTCONVERSA_CED_FIELD_LOGIN_URL",
      ),
      label: "ced_login_url",
      value: input.loginUrl,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_FOUNDER_ID",
        "BOTCONVERSA_CED_FIELD_FOUNDER",
      ),
      label: "ced_interesse_cliente_fundador",
      value: input.founderTermsAccepted ? "sim" : "pendente_no_primeiro_acesso",
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_EMAIL_SENT_ID",
        "BOTCONVERSA_CED_FIELD_EMAIL_SENT",
      ),
      label: "ced_acesso_email_enviado",
      value: boolLabel(input.accessEmailSent),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_FIRST_ACCESS_ID",
        "BOTCONVERSA_CED_FIELD_FIRST_ACCESS",
      ),
      label: "ced_primeiro_acesso_status",
      value: "aguardando_primeiro_acesso",
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_CED_FIELD_RESPONSE_ID",
        "BOTCONVERSA_CED_FIELD_RESPONSE",
        "BOTCONVERSA_CED_FIELD_MESSAGE_ID",
        "BOTCONVERSA_CED_FIELD_MESSAGE",
      ),
      label: "ced_resp_botconversa",
      value: message,
    },
  ];

  return values.filter((item) => isConfigured(item.fieldId));
}

function presencaCustomFields(input: PresencaBotConversaSyncInput) {
  const message = buildPresencaLeadBotConversaMessage(input);
  const values: BotConversaFieldConfig[] = [
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_NAME_ID",
        "BOTCONVERSA_PQ_FIELD_NAME",
      ),
      label: "pq_nome_contato",
      value: input.responsibleName,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_EMAIL_ID",
        "BOTCONVERSA_PQ_FIELD_EMAIL",
      ),
      label: "pq_email",
      value: input.email,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_WHATSAPP_ID",
        "BOTCONVERSA_PQ_FIELD_WHATSAPP",
      ),
      label: "pq_whatsapp",
      value: normalizePhoneForBotConversa(input.whatsapp),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_LEAD_ID_ID",
        "BOTCONVERSA_PQ_FIELD_LEAD_ID",
      ),
      label: "pq_lead_id",
      value: input.leadId,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_EVENT_NAME_ID",
        "BOTCONVERSA_PQ_FIELD_EVENT_NAME",
      ),
      label: "pq_evento_nome",
      value: input.eventName,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_EVENT_TYPE_ID",
        "BOTCONVERSA_PQ_FIELD_EVENT_TYPE",
      ),
      label: "pq_evento_tipo",
      value: input.eventType,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_EVENT_DATE_ID",
        "BOTCONVERSA_PQ_FIELD_EVENT_DATE",
      ),
      label: "pq_evento_data",
      value: optionalValue(input.eventDate),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_GUESTS_ESTIMATE_ID",
        "BOTCONVERSA_PQ_FIELD_GUESTS_ESTIMATE",
      ),
      label: "pq_convidados_estimados",
      value: optionalValue(input.guestsEstimate),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_ORIGIN_ID",
        "BOTCONVERSA_PQ_FIELD_ORIGIN",
      ),
      label: "pq_origem",
      value: input.source,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_STATUS_ID",
        "BOTCONVERSA_PQ_FIELD_STATUS",
      ),
      label: "pq_status",
      value: input.status,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_LOGIN_URL_ID",
        "BOTCONVERSA_PQ_FIELD_LOGIN_URL",
      ),
      label: "pq_login_url",
      value: input.loginUrl,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_FOUNDER_ID",
        "BOTCONVERSA_PQ_FIELD_FOUNDER",
      ),
      label: "pq_interesse_cliente_fundador",
      value: input.founderTermsAccepted ? "sim" : "pendente_no_primeiro_acesso",
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_EMAIL_SENT_ID",
        "BOTCONVERSA_PQ_FIELD_EMAIL_SENT",
      ),
      label: "pq_acesso_email_enviado",
      value: boolLabel(input.accessEmailSent),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_FIRST_ACCESS_ID",
        "BOTCONVERSA_PQ_FIELD_FIRST_ACCESS",
      ),
      label: "pq_primeiro_acesso_status",
      value: "aguardando_primeiro_acesso",
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_PQ_FIELD_RESPONSE_ID",
        "BOTCONVERSA_PQ_FIELD_RESPONSE",
        "BOTCONVERSA_PQ_FIELD_MESSAGE_ID",
        "BOTCONVERSA_PQ_FIELD_MESSAGE",
      ),
      label: "pq_resp_botconversa",
      value: message,
    },
  ];

  return values.filter((item) => isConfigured(item.fieldId));
}

function organizacaoCustomFields(input: OrganizacaoBotConversaSyncInput) {
  const message = buildOrganizacaoLeadBotConversaMessage(input);
  const values: BotConversaFieldConfig[] = [
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_NAME_ID",
        "BOTCONVERSA_OH_FIELD_NAME",
      ),
      label: "oh_nome_contato",
      value: input.contactName,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_EMAIL_ID",
        "BOTCONVERSA_OH_FIELD_EMAIL",
      ),
      label: "oh_email",
      value: input.email,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_WHATSAPP_ID",
        "BOTCONVERSA_OH_FIELD_WHATSAPP",
      ),
      label: "oh_whatsapp",
      value: normalizePhoneForBotConversa(input.whatsapp),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_LEAD_ID_ID",
        "BOTCONVERSA_OH_FIELD_LEAD_ID",
      ),
      label: "oh_lead_id",
      value: input.leadId,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_MODULE_ID",
        "BOTCONVERSA_OH_FIELD_MODULE",
      ),
      label: "oh_modulo",
      value: input.moduleName,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_MODULE_SLUG_ID",
        "BOTCONVERSA_OH_FIELD_MODULE_SLUG",
      ),
      label: "oh_modulo_slug",
      value: input.moduleSlug,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_PRIORITY_MODULE_ID",
        "BOTCONVERSA_OH_FIELD_PRIORITY_MODULE",
      ),
      label: "oh_modulo_prioritario",
      value: input.priorityModuleName || input.moduleName,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_IMPLANTATION_DUE_AT_ID",
        "BOTCONVERSA_OH_FIELD_IMPLANTATION_DUE_AT",
      ),
      label: "oh_prazo_implantacao",
      value: optionalValue(input.implantationDueAt),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_ORGANIZATION_ID",
        "BOTCONVERSA_OH_FIELD_ORGANIZATION",
      ),
      label: "oh_organizacao",
      value: optionalValue(input.organizationName),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_ORIGIN_ID",
        "BOTCONVERSA_OH_FIELD_ORIGIN",
      ),
      label: "oh_origem",
      value: input.source,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_STATUS_ID",
        "BOTCONVERSA_OH_FIELD_STATUS",
      ),
      label: "oh_status",
      value: input.status,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_LOGIN_URL_ID",
        "BOTCONVERSA_OH_FIELD_LOGIN_URL",
      ),
      label: "oh_login_url",
      value: input.loginUrl,
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_FOUNDER_ID",
        "BOTCONVERSA_OH_FIELD_FOUNDER",
      ),
      label: "oh_interesse_cliente_fundador",
      value: input.founderTermsAccepted ? "sim" : "pendente_confirmacao",
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_EMAIL_SENT_ID",
        "BOTCONVERSA_OH_FIELD_EMAIL_SENT",
      ),
      label: "oh_email_enviado",
      value: boolLabel(input.accessEmailSent),
    },
    {
      fieldId: firstEnv(
        "BOTCONVERSA_OH_FIELD_RESPONSE_ID",
        "BOTCONVERSA_OH_FIELD_RESPONSE",
        "BOTCONVERSA_OH_FIELD_MESSAGE_ID",
        "BOTCONVERSA_OH_FIELD_MESSAGE",
      ),
      label: "oh_resp_botconversa",
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

async function setCustomFields(
  subscriberId: string,
  fields: BotConversaFieldConfig[],
) {
  const results: BotConversaStepResult[] = [];

  if (fields.length === 0) {
    return [
      {
        step: "set_custom_fields",
        ok: true,
        skipped: true,
        reason: "Nenhum ID de campo personalizado configurado.",
      },
    ];
  }

  const template =
    env("BOTCONVERSA_FIELD_PATH_TEMPLATE") || DEFAULT_FIELD_PATH_TEMPLATE;
  const method = (env("BOTCONVERSA_FIELD_METHOD") || "POST").toUpperCase() as
    "POST" | "PUT" | "PATCH";

  for (const field of fields) {
    const path = fillTemplate(template, {
      subscriberId,
      fieldId: field.fieldId,
    });
    const response = await botconversaRequest(path, {
      method,
      body: customFieldBody(field),
    });
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

async function sendFlow(
  subscriberId: string,
  input: {
    flowId: string;
    enabled: boolean;
    stepLabel: string;
    disabledReason: string;
  },
) {
  if (!input.enabled || !isConfigured(input.flowId)) {
    return {
      step: input.stepLabel,
      ok: true,
      skipped: true,
      reason: input.disabledReason,
    };
  }

  const template =
    env("BOTCONVERSA_FLOW_PATH_TEMPLATE") || DEFAULT_FLOW_PATH_TEMPLATE;
  const path = fillTemplate(template, { subscriberId, flowId: input.flowId });
  const response = await botconversaRequest(path, {
    method: "POST",
    body: { flow_id: input.flowId },
  });

  return {
    step: input.stepLabel,
    ok: response.ok,
    status: response.status,
    path: response.path,
    method: response.method,
    data: response.data,
    responseText: response.ok ? undefined : response.text,
  };
}

export function getBotConversaConfigSummary() {
  const ohFlowId = firstEnv("BOTCONVERSA_OH_FLOW_ID", "BOTCONVERSA_OH_FLOW");
  const cedFlowId = firstEnv("BOTCONVERSA_CED_FLOW_ID", "BOTCONVERSA_CED_FLOW");
  const pqFlowId = firstEnv("BOTCONVERSA_PQ_FLOW_ID", "BOTCONVERSA_PQ_FLOW");

  return {
    enabled: isEnabled(),
    baseUrl: cleanBaseUrl(env("BOTCONVERSA_API_BASE_URL")),
    createContactPath:
      env("BOTCONVERSA_CREATE_CONTACT_PATH") || DEFAULT_CREATE_CONTACT_PATH,
    tagPathTemplate:
      env("BOTCONVERSA_TAG_PATH_TEMPLATE") || DEFAULT_TAG_PATH_TEMPLATE,
    fieldPathTemplate:
      env("BOTCONVERSA_FIELD_PATH_TEMPLATE") || DEFAULT_FIELD_PATH_TEMPLATE,
    fieldMethod: env("BOTCONVERSA_FIELD_METHOD") || "POST",
    fieldBodyMode: env("BOTCONVERSA_FIELD_BODY_MODE") || "value",
    flowPathTemplate:
      env("BOTCONVERSA_FLOW_PATH_TEMPLATE") || DEFAULT_FLOW_PATH_TEMPLATE,
    apiHeaderName: env("BOTCONVERSA_API_HEADER_NAME") || "API-KEY",
    authScheme: env("BOTCONVERSA_AUTH_SCHEME") || "",
    hasApiKey: Boolean(
      env("BOTCONVERSA_API_KEY") || env("BOTCONVERSA_WEBHOOK_INTEGRATION_KEY"),
    ),
    cedSendFlowEnabled: env("BOTCONVERSA_CED_SEND_FLOW").toLowerCase() === "true",
    cedFlowConfigured: isConfigured(cedFlowId),
    cedResponseFieldConfigured: Boolean(
      firstEnv(
        "BOTCONVERSA_CED_FIELD_RESPONSE_ID",
        "BOTCONVERSA_CED_FIELD_RESPONSE",
        "BOTCONVERSA_CED_FIELD_MESSAGE_ID",
        "BOTCONVERSA_CED_FIELD_MESSAGE",
      ),
    ),
    pqSendFlowEnabled: env("BOTCONVERSA_PQ_SEND_FLOW").toLowerCase() === "true",
    pqFlowConfigured: isConfigured(pqFlowId),
    pqResponseFieldConfigured: Boolean(
      firstEnv(
        "BOTCONVERSA_PQ_FIELD_RESPONSE_ID",
        "BOTCONVERSA_PQ_FIELD_RESPONSE",
        "BOTCONVERSA_PQ_FIELD_MESSAGE_ID",
        "BOTCONVERSA_PQ_FIELD_MESSAGE",
      ),
    ),
    ohSendFlowEnabled: env("BOTCONVERSA_OH_SEND_FLOW").toLowerCase() === "true",
    ohFlowConfigured: isConfigured(ohFlowId),
    ohResponseFieldConfigured: Boolean(
      firstEnv(
        "BOTCONVERSA_OH_FIELD_RESPONSE_ID",
        "BOTCONVERSA_OH_FIELD_RESPONSE",
        "BOTCONVERSA_OH_FIELD_MESSAGE_ID",
        "BOTCONVERSA_OH_FIELD_MESSAGE",
      ),
    ),
    ohTagsConfigured: {
      leadSite: Boolean(firstEnv("BOTCONVERSA_OH_TAG_LEAD_SITE_ID", "BOTCONVERSA_OH_TAG_LEAD_SITE")),
      emailSent: Boolean(firstEnv("BOTCONVERSA_OH_TAG_EMAIL_SENT_ID", "BOTCONVERSA_OH_TAG_EMAIL_SENT")),
      founder: Boolean(firstEnv("BOTCONVERSA_OH_TAG_FOUNDER_ID", "BOTCONVERSA_OH_TAG_FOUNDER")),
      waitingAccess: Boolean(
        firstEnv(
          "BOTCONVERSA_OH_TAG_WAITING_ACCESS_ID",
          "BOTCONVERSA_OH_TAG_WAITING_ACCESS",
          "BOTCONVERSA_OH_TAG_IMPLANTATION_ID",
        ),
      ),
      agendaViva: Boolean(firstEnv("BOTCONVERSA_OH_TAG_AGENDA_VIVA_ID", "BOTCONVERSA_OH_TAG_AGENDA_VIVA")),
      tucxa: Boolean(firstEnv("BOTCONVERSA_OH_TAG_TUCXA_ID", "BOTCONVERSA_OH_TAG_TUCXA")),
    },
  };
}

async function runSync(
  input: BotConversaContactInput,
  work: (subscriberId: string, steps: BotConversaStepResult[]) => Promise<void>,
): Promise<BotConversaSyncResult> {
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
        reason:
          "Não foi possível identificar o ID do contato no BotConversa. Verifique o retorno do endpoint de contato na documentação autenticada.",
        subscriberId: null,
        steps,
      };
    }

    await work(subscriber.subscriberId, steps);

    const ok = steps.every((step) => step.ok || step.skipped);
    return {
      enabled: true,
      ok,
      reason: ok
        ? "Contato enriquecido no BotConversa."
        : "Integração BotConversa executada com alguma falha. Verifique steps.",
      subscriberId: subscriber.subscriberId,
      steps,
    };
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao sincronizar BotConversa.";
    return {
      enabled: true,
      ok: false,
      reason,
      subscriberId: null,
      steps,
    };
  }
}

export async function syncCorrenteLeadWithBotConversa(
  input: BotConversaSyncInput,
): Promise<BotConversaSyncResult> {
  return runSync(input, async (subscriberId, steps) => {
    steps.push(...(await applyTags(subscriberId, correnteTagIds(input))));
    steps.push(
      ...(await setCustomFields(subscriberId, correnteCustomFields(input))),
    );
    steps.push(
      await sendFlow(subscriberId, {
        flowId: firstEnv("BOTCONVERSA_CED_FLOW_ID", "BOTCONVERSA_CED_FLOW"),
        enabled: env("BOTCONVERSA_CED_SEND_FLOW").toLowerCase() === "true",
        stepLabel: "send_ced_flow",
        disabledReason:
          "Envio automático de fluxo desativado ou BOTCONVERSA_CED_FLOW_ID não configurado.",
      }),
    );
  });
}

export async function syncPresencaLeadWithBotConversa(
  input: PresencaBotConversaSyncInput,
): Promise<BotConversaSyncResult> {
  return runSync(input, async (subscriberId, steps) => {
    steps.push(...(await applyTags(subscriberId, presencaTagIds(input))));
    steps.push(
      ...(await setCustomFields(subscriberId, presencaCustomFields(input))),
    );
    steps.push(
      await sendFlow(subscriberId, {
        flowId: firstEnv("BOTCONVERSA_PQ_FLOW_ID", "BOTCONVERSA_PQ_FLOW"),
        enabled: env("BOTCONVERSA_PQ_SEND_FLOW").toLowerCase() === "true",
        stepLabel: "send_pq_flow",
        disabledReason:
          "Envio automático de fluxo desativado ou BOTCONVERSA_PQ_FLOW_ID não configurado.",
      }),
    );
  });
}

export async function syncOrganizacaoLeadWithBotConversa(
  input: OrganizacaoBotConversaSyncInput,
): Promise<BotConversaSyncResult> {
  return runSync(
    {
      responsibleName: input.contactName,
      email: input.email,
      whatsapp: input.whatsapp,
    },
    async (subscriberId, steps) => {
      steps.push(...(await applyTags(subscriberId, organizacaoTagIds(input))));
      steps.push(
        ...(await setCustomFields(
          subscriberId,
          organizacaoCustomFields(input),
        )),
      );
      steps.push(
        await sendFlow(subscriberId, {
          flowId: firstEnv("BOTCONVERSA_OH_FLOW_ID", "BOTCONVERSA_OH_FLOW"),
          enabled: env("BOTCONVERSA_OH_SEND_FLOW").toLowerCase() === "true",
          stepLabel: "send_oh_flow",
          disabledReason:
            "Envio automático de fluxo desativado ou BOTCONVERSA_OH_FLOW_ID não configurado.",
        }),
      );
    },
  );
}
