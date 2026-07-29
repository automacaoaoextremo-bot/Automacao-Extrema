import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_COPY_EMAIL = "automacao.ao.extremo@gmail.com";
const AE_WHATSAPP_PHONE = "5519989848246";
const DEFAULT_MODULE_SLUGS = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

type DraftItem = {
  slug: string;
  label: string;
  description?: string;
};

type EntityItem = {
  id: string;
  name: string;
};

type AccessBody = {
  action?: string;
  identifier?: string;
  fullName?: string;
  whatsapp?: string;
  email?: string;
  password?: string;
  notes?: string;
  functionSlugs?: unknown;
  agendaSlugs?: unknown;
  selectedFunctions?: unknown;
  selectedAgenda?: unknown;
  cavalinhoEntityIds?: unknown;
  cavalinhoConsulenteEntityId?: unknown;
  cavalinhoConsulenteDefinitionCompleted?: unknown;
  selectedEntities?: unknown;
};

type PersonRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  active: boolean | null;
  notes: string | null;
  auth_user_id?: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function onlyDigits(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function normalizeEmail(value: unknown) {
  return asText(value).toLowerCase();
}

function asTextList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asDraftItems(value: unknown): DraftItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      const slug = asText(candidate.slug);
      const label = asText(candidate.label);
      const description = asText(candidate.description);
      if (!slug || !label) return null;
      return { slug, label, description };
    })
    .filter(Boolean) as DraftItem[];
}



function asEntityItems(value: unknown): EntityItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      const id = asText(candidate.id);
      const name = asText(candidate.name);
      if (!id || !name) return null;
      return { id, name };
    })
    .filter(Boolean) as EntityItem[];
}

function normalizeToken(value: unknown) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasCavalinhoFunction(functionSlugs: string[], selectedFunctions: DraftItem[]) {
  return [...functionSlugs, ...selectedFunctions.flatMap((item) => [item.slug, item.label])]
    .map(normalizeToken)
    .some((token) => token.includes("cavalinho") || token.includes("medium") || token.includes("incorporante"));
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function reviewCopyEmail() {
  return process.env.EMAIL_COPY_TO || DEFAULT_COPY_EMAIL;
}

function whatsappSupportPhone() {
  // O destino do WhatsApp do fluxo de Primeiro Acesso deve ser sempre o atendimento da AE,
  // nunca o telefone informado pelo Filho da Corrente no cadastro.
  return AE_WHATSAPP_PHONE;
}

function syntheticEmailFromPhone(phone: string) {
  return `tucxa-filho-corrente-${phone}@organizacao-em-harmonia.local`;
}

function displayEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.endsWith("@organizacao-em-harmonia.local") ? "" : email;
}

function normalizeWhatsapp(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function whatsappUrl(phone: string | null | undefined, message: string) {
  const normalized = normalizeWhatsapp(phone);
  if (!normalized) return "";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function phoneCandidates(rawPhone: string) {
  const digits = onlyDigits(rawPhone);
  if (!digits) return [];
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const last11 = digits.length > 11 ? digits.slice(-11) : digits;
  return Array.from(new Set([digits, withoutCountry, last11, `55${withoutCountry}`, `55${last11}`].filter(Boolean)));
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

async function sendEmail(input: { to: string; subject: string; text: string; html?: string; cc?: string; replyTo?: string }) {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false" || !hasSmtpConfig()) return { skipped: true };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const copy = Array.from(new Set([input.cc, reviewCopyEmail()].map((item) => asText(item)).filter(Boolean))).join(", ");

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Automação Extrema"}" <${process.env.EMAIL_FROM}>`,
    to: input.to,
    cc: copy,
    replyTo: input.replyTo || undefined,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { skipped: false };
}

function errorToMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    if (parts.length) return parts.join(" | ");
  }
  return fallback;
}

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id, name").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return { id: bySlug.id as string, name: (bySlug.name as string) || "Tucxa" };

  const { data: byName } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byName?.id) return { id: byName.id as string, name: (byName.name as string) || "Tucxa" };

  return null;
}

async function findPersonByIdentifier(organizationId: string, identifier: string) {
  const value = asText(identifier);
  if (!value) return null;

  if (value.includes("@")) {
    const { data, error } = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active, notes, auth_user_id")
      .eq("organization_id", organizationId)
      .ilike("email", value.toLowerCase())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as PersonRow | null) ?? null;
  }

  const phones = phoneCandidates(value);
  if (!phones.length) return null;

  const { data, error } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, active, notes, auth_user_id")
    .eq("organization_id", organizationId)
    .in("whatsapp", phones)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as PersonRow | null) ?? null;
}

async function roleIdForFilhoDaCorrente(organizationId: string) {
  const { data: exact, error: exactError } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", "filho-da-corrente")
    .eq("active", true)
    .maybeSingle();
  if (exactError) throw exactError;
  if (exact?.id) return exact.id as string;

  const { data: fallback, error: fallbackError } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", "membro")
    .eq("active", true)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  return (fallback?.id as string | undefined) ?? null;
}

async function loadAgendaSettings(organizationId: string) {
  const { data } = await supabaseAdmin
    .from("oh_module_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .eq("module_slug", "agenda-viva")
    .maybeSingle();

  const settings = data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings) ? (data.settings as Record<string, unknown>) : {};
  return {
    reviewerEmails: asTextList(settings.accessValidationReviewerEmails),
    reviewerPersonIds: asTextList(settings.accessValidationReviewerPersonIds),
    copyEmail: asText(settings.accessCopyEmail) || reviewCopyEmail(),
  };
}

async function reviewerEmails(organizationId: string) {
  const settings = await loadAgendaSettings(organizationId);
  const emails = [...settings.reviewerEmails];

  if (settings.reviewerPersonIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("oh_people")
      .select("email")
      .eq("organization_id", organizationId)
      .in("id", settings.reviewerPersonIds);
    if (error) throw error;
    for (const person of data ?? []) {
      const email = displayEmail((person as { email?: string | null }).email);
      if (email) emails.push(email);
    }
  }

  if (emails.length === 0) emails.push(settings.copyEmail || reviewCopyEmail());
  return Array.from(new Set(emails.map((email) => email.toLowerCase()).filter(Boolean)));
}

async function ensureAuthUser(input: { person: PersonRow | null; emailForAuth: string; password: string; fullName: string; whatsapp: string; organizationId: string }) {
  if (input.person?.auth_user_id) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(input.person.auth_user_id, {
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        whatsapp: input.whatsapp,
        organization_id: input.organizationId,
        oh_profile: "filho-da-corrente",
        oh_access_status: "pendente_validacao",
      },
    });
    if (error) throw error;
    return input.person.auth_user_id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.emailForAuth,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      whatsapp: input.whatsapp,
      organization_id: input.organizationId,
      oh_profile: "filho-da-corrente",
      oh_access_status: "pendente_validacao",
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      const { data: found } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const user = found.users.find((item: { email?: string | null; id: string }) => item.email?.toLowerCase() === input.emailForAuth.toLowerCase());
      if (user?.id) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: input.password,
          email_confirm: true,
          user_metadata: {
            full_name: input.fullName,
            whatsapp: input.whatsapp,
            organization_id: input.organizationId,
            oh_profile: "filho-da-corrente",
            oh_access_status: "pendente_validacao",
          },
        });
        if (updateError) throw updateError;
        return user.id;
      }
    }
    throw error;
  }

  return data.user.id;
}

const EMAIL_SUBJECT = "AE - Aguardando Aprovação - Tuxca - Organização em Harmonia";
const ORGANIZATION_DISPLAY_NAME = "Templo de Umbanda Caboclo Sete Flexa - TUCXA";

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "irmão(ã)";
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function agendaLines(items: DraftItem[]) {
  if (!items.length) return ["- Nenhum item de agenda selecionado"];
  return items.map((item) => `- ${item.label}${item.description ? ` — ${item.description}` : ""}`);
}

function functionsLines(items: DraftItem[]) {
  if (!items.length) return ["- Somente Filho da Corrente"];
  return items.map((item) => `- ${item.label}`);
}

function footerText(options: { includeLogoLinks?: boolean } = {}) {
  const includeLogoLinks = options.includeLogoLinks !== false;
  const lines = ["Automação Extrema - Organização em Harmonia - Tucxa"];

  if (includeLogoLinks) {
    lines.push(
      "Logo AE: " + `${siteUrl()}/clientes/tucxa/automacao-extrema-logo.svg`,
      "Logo Tucxa: " + `${siteUrl()}/clientes/tucxa/tucxa-logo.jpg`,
    );
  }

  return lines.join("\n");
}

function footerHtml() {
  return `
    <div style="margin-top:28px;border-top:1px solid #dfe8df;padding-top:18px;font-family:Arial,sans-serif;color:#123D2C">
      <p style="margin:0 0 12px 0;font-weight:700">Automação Extrema - Organização em Harmonia - Tucxa</p>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <img src="${siteUrl()}/clientes/tucxa/automacao-extrema-logo.svg" alt="Automação Extrema" style="height:42px;max-width:180px;background:#00334E;border-radius:10px;padding:6px" />
        <img src="${siteUrl()}/clientes/tucxa/tucxa-logo.jpg" alt="Tucxa" style="height:52px;width:52px;border-radius:12px;object-fit:contain" />
      </div>
    </div>`;
}

function listToHtml(lines: string[], spacious = false) {
  return lines
    .map((line) => `<p style="margin:${spacious ? "0 0 14px" : "0 0 6px"} 0;line-height:1.6">${htmlEscape(line)}</p>`)
    .join("");
}

function commonSummaryText(input: {
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  selectedFunctions: DraftItem[];
  selectedAgenda: DraftItem[];
  selectedEntities: EntityItem[];
  cavalinhoConsulenteEntity: EntityItem | null;
}) {
  return [
    `Organização: ${ORGANIZATION_DISPLAY_NAME}`,
    `Nome: ${input.fullName}`,
    `WhatsApp: ${input.whatsapp}`,
    `E-mail: ${input.email || "não informado"}`,
    "",
    "Funções:",
    functionsLines(input.selectedFunctions).join("\n"),
    "",
    "Agenda:",
    agendaLines(input.selectedAgenda).join("\n\n"),
    ...(input.selectedEntities.length
      ? [
          "",
          "Entidades que recebe:",
          input.selectedEntities.map((item) => `- ${item.name}`).join("\n"),
          "",
          `Entidade que atende Filhos de Fora/Consulentes: ${input.cavalinhoConsulenteEntity?.name || "Nenhuma das entidades selecionadas"}`,
        ]
      : []),
    "",
    input.notes ? `Observação: ${input.notes}` : "Observação: não informada",
  ].join("\n");
}

function commonSummaryHtml(input: {
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  selectedFunctions: DraftItem[];
  selectedAgenda: DraftItem[];
  selectedEntities: EntityItem[];
  cavalinhoConsulenteEntity: EntityItem | null;
}) {
  return `
    <p style="margin:0 0 8px 0"><strong>Organização:</strong> ${htmlEscape(ORGANIZATION_DISPLAY_NAME)}</p>
    <p style="margin:0 0 8px 0"><strong>Nome:</strong> ${htmlEscape(input.fullName)}</p>
    <p style="margin:0 0 8px 0"><strong>WhatsApp:</strong> ${htmlEscape(input.whatsapp)}</p>
    <p style="margin:0 0 16px 0"><strong>E-mail:</strong> ${htmlEscape(input.email || "não informado")}</p>
    <h3 style="margin:22px 0 8px 0;color:#123D2C">Funções:</h3>
    ${listToHtml(functionsLines(input.selectedFunctions))}
    <h3 style="margin:22px 0 8px 0;color:#123D2C">Agenda:</h3>
    ${listToHtml(agendaLines(input.selectedAgenda), true)}
    ${input.selectedEntities.length ? `<h3 style="margin:22px 0 8px 0;color:#123D2C">Entidades que recebe:</h3>${listToHtml(input.selectedEntities.map((item) => item.name))}<h3 style="margin:22px 0 8px 0;color:#123D2C">Entidade que atende Filhos de Fora/Consulentes:</h3><p style="margin:0 0 6px 0;line-height:1.6">${htmlEscape(input.cavalinhoConsulenteEntity?.name || "Nenhuma das entidades selecionadas")}</p>` : ""}
    <p style="margin:18px 0 0 0"><strong>Observação:</strong> ${htmlEscape(input.notes || "não informada")}</p>`;
}

function wrapEmailHtml(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F7FAF2;padding:24px;font-family:Arial,sans-serif;color:#10251C">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dfe8df;border-radius:22px;padding:24px">
      <h2 style="margin:0 0 18px 0;color:#123D2C">${htmlEscape(title)}</h2>
      ${body}
      ${footerHtml()}
    </div>
  </body></html>`;
}

function buildPersonEmail(input: {
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  selectedFunctions: DraftItem[];
  selectedAgenda: DraftItem[];
  selectedEntities: EntityItem[];
  cavalinhoConsulenteEntity: EntityItem | null;
  statusUrl: string;
}) {
  const text = [
    `Olá, ${firstName(input.fullName)}.`,
    "",
    "Recebemos sua solicitação de Primeiro Acesso na Organização em Harmonia do Tucxa.",
    "",
    commonSummaryText(input),
    "",
    "Agora o Tucxa irá conferir as informações, validar seus vínculos e liberar o acesso quando tudo estiver correto.",
    "",
    "Você pode acompanhar por aqui:",
    input.statusUrl,
    "",
    footerText(),
  ].join("\n");

  const html = wrapEmailHtml(
    `Olá, ${firstName(input.fullName)}.`,
    `
      <p style="line-height:1.6">Recebemos sua solicitação de Primeiro Acesso na Organização em Harmonia do Tucxa.</p>
      ${commonSummaryHtml(input)}
      <p style="margin-top:22px;line-height:1.6">Agora o Tucxa irá conferir as informações, validar seus vínculos e liberar o acesso quando tudo estiver correto.</p>
      <p style="line-height:1.6">Você pode acompanhar por aqui:</p>
      <p><a href="${input.statusUrl}" style="display:inline-block;background:#123D2C;color:#ffffff;text-decoration:none;border-radius:14px;padding:12px 18px;font-weight:700">Acompanhar aprovação</a></p>
      <p style="word-break:break-all;color:#64748b;font-size:12px">${htmlEscape(input.statusUrl)}</p>
    `,
  );

  return { subject: EMAIL_SUBJECT, text, html };
}

function buildReviewerEmail(input: {
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  selectedFunctions: DraftItem[];
  selectedAgenda: DraftItem[];
  selectedEntities: EntityItem[];
  cavalinhoConsulenteEntity: EntityItem | null;
  validationUrl: string;
  simulationUrl: string;
}) {
  const text = [
    "Equipe Organização em Harmonia - Tucxa",
    ".",
    "Recebemos a solicitação de Primeiro Acesso na Organização em Harmonia do Tucxa para:",
    "",
    commonSummaryText(input),
    "",
    `Simular o acesso como o Filho da Corrente ${input.fullName} acessando o link abaixo:`,
    input.simulationUrl,
    "",
    "Caso abra a tela de login, entre com o usuário gestor. Depois do login, o sistema voltará para a simulação.",
    "",
    "Caso tudo esteja OK, clique em aprovar na página de validações:",
    input.validationUrl,
    "",
    footerText(),
  ].join("\n");

  const html = wrapEmailHtml(
    "Equipe Organização em Harmonia - Tucxa",
    `
      <p style="line-height:1.6">Recebemos a solicitação de Primeiro Acesso na Organização em Harmonia do Tucxa para:</p>
      ${commonSummaryHtml(input)}
      <p style="margin-top:22px;line-height:1.6">Simular o acesso como o Filho da Corrente <strong>${htmlEscape(input.fullName)}</strong> acessando o link abaixo:</p>
      <p><a href="${input.simulationUrl}" style="display:inline-block;background:#123D2C;color:#ffffff;text-decoration:none;border-radius:14px;padding:12px 18px;font-weight:700">Simular acesso</a></p>
      <p style="word-break:break-all;color:#64748b;font-size:12px">${htmlEscape(input.simulationUrl)}</p>
      <p style="line-height:1.6;color:#64748b;font-size:13px">Se abrir a tela de login, entre com o usuário gestor. Depois do login, o sistema voltará para esta simulação.</p>
      <p style="line-height:1.6">Caso tudo esteja OK, clique em aprovar na página de validações:</p>
      <p><a href="${input.validationUrl}" style="display:inline-block;background:#31C16B;color:#00334E;text-decoration:none;border-radius:14px;padding:12px 18px;font-weight:700">Abrir validações</a></p>
      <p style="word-break:break-all;color:#64748b;font-size:12px">${htmlEscape(input.validationUrl)}</p>
    `,
  );

  return { subject: EMAIL_SUBJECT, text, html };
}

function buildWhatsappPersonMessage(input: {
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  selectedFunctions: DraftItem[];
  selectedAgenda: DraftItem[];
  selectedEntities: EntityItem[];
  cavalinhoConsulenteEntity: EntityItem | null;
  statusUrl: string;
}) {
  return [
    `Olá, sou o ${firstName(input.fullName)}.`,
    "",
    "Segue minha solicitação de Primeiro Acesso na Organização em Harmonia do Tucxa.",
    "",
    commonSummaryText(input),
    "",
    "Aguardo o Tucxa conferir as informações, validar meus vínculos e liberar meu acesso quando tudo estiver correto.",
    "",
    "Vou acompanhar o andamento do meu pedido por aqui:",
    input.statusUrl,
    "",
    input.fullName,
  ].join("\n");
}

async function accessStatusForPerson(organizationId: string, personId: string) {
  const [membershipResult, requestResult] = await Promise.all([
    supabaseAdmin
      .from("oh_memberships")
      .select("status, active, agenda_viva_profile")
      .eq("organization_id", organizationId)
      .eq("person_id", personId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_first_access_validation_requests")
      .select("status, summary")
      .eq("organization_id", organizationId)
      .eq("person_id", personId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (membershipResult.error) throw membershipResult.error;
  if (requestResult.error) throw requestResult.error;

  const profile =
    membershipResult.data?.agenda_viva_profile &&
    typeof membershipResult.data.agenda_viva_profile === "object" &&
    !Array.isArray(membershipResult.data.agenda_viva_profile)
      ? (membershipResult.data.agenda_viva_profile as Record<string, unknown>)
      : {};

  const requestSummary =
    requestResult.data?.summary &&
    typeof requestResult.data.summary === "object" &&
    !Array.isArray(requestResult.data.summary)
      ? (requestResult.data.summary as Record<string, unknown>)
      : {};

  const membershipStatus = (membershipResult.data?.status as string | null) || "pendente_primeiro_acesso";
  const requestStatus = (requestResult.data?.status as string | null) || "";
  const isProfileUpdatePending = requestSummary.requestType === "profile_update" && requestStatus !== "ativo";
  const cameFromFirstAccess = profile.source === "primeiro_acesso_filho_corrente" || Boolean(requestStatus);
  const status = isProfileUpdatePending && membershipStatus === "ativo"
    ? "ativo"
    : requestStatus || (profile.validationStatus as string | undefined) || membershipStatus || "pendente_primeiro_acesso";

  return {
    status: cameFromFirstAccess ? status : "pendente_primeiro_acesso",
    active: cameFromFirstAccess && status === "ativo" && membershipResult.data?.active === true,
    cameFromFirstAccess,
  };
}

async function submitFirstAccess(body: AccessBody) {
  const organization = await findTucxaOrganizationId();
  if (!organization) throw new Error("Organização Tucxa não encontrada.");

  const fullName = asText(body.fullName);
  const whatsapp = onlyDigits(body.whatsapp);
  const email = normalizeEmail(body.email);
  const password = asText(body.password);
  const notes = asText(body.notes);
  const functionSlugs = asTextList(body.functionSlugs);
  const agendaSlugs = asTextList(body.agendaSlugs);
  const selectedFunctions = asDraftItems(body.selectedFunctions);
  const selectedAgenda = asDraftItems(body.selectedAgenda);
  const requestedEntityIds = Array.from(new Set(asTextList(body.cavalinhoEntityIds)));
  const cavalinhoConsulenteEntityId = asText(body.cavalinhoConsulenteEntityId);
  const cavalinhoConsulenteDefinitionCompleted = body.cavalinhoConsulenteDefinitionCompleted === true;
  const requestedEntities = asEntityItems(body.selectedEntities);
  const hasCavalinho = hasCavalinhoFunction(functionSlugs, selectedFunctions);

  if (!fullName) throw new Error("Informe o nome completo.");
  if (whatsapp.length < 10) throw new Error("Informe o WhatsApp com DDD.");
  if (password.length < 8) throw new Error("Crie uma senha com pelo menos 8 caracteres.");
  if (email && !email.includes("@")) throw new Error("Confira o e-mail informado.");
  if (hasCavalinho && requestedEntityIds.length === 0) {
    throw new Error("Selecione ao menos uma entidade que o Cavalinho recebe.");
  }
  if (hasCavalinho && !cavalinhoConsulenteDefinitionCompleted) {
    throw new Error("Informe se alguma das entidades selecionadas atende Consulentes.");
  }
  if (hasCavalinho && cavalinhoConsulenteEntityId && !requestedEntityIds.includes(cavalinhoConsulenteEntityId)) {
    throw new Error("A entidade que atende Consulentes precisa estar entre as entidades que o Cavalinho recebe.");
  }

  let selectedEntities: EntityItem[] = [];
  if (hasCavalinho) {
    const { data: entityRows, error: entityError } = await supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name")
      .eq("organization_id", organization.id)
      .eq("active", true)
      .in("id", requestedEntityIds);
    if (entityError) throw entityError;
    selectedEntities = (entityRows ?? []).map((row) => ({ id: String(row.id), name: asText(row.name) }));
    if (selectedEntities.length !== new Set(requestedEntityIds).size) {
      throw new Error("Uma ou mais entidades selecionadas não estão ativas ou não pertencem ao Tucxa.");
    }
  } else if (requestedEntities.length > 0) {
    selectedEntities = [];
  }

  const cavalinhoConsulenteEntity = selectedEntities.find(
    (entity) => entity.id === cavalinhoConsulenteEntityId,
  ) ?? null;

  const existing = await findPersonByIdentifier(organization.id, email || whatsapp);
  const emailForAuth = email || syntheticEmailFromPhone(whatsapp);
  const authUserId = await ensureAuthUser({ person: existing, emailForAuth, password, fullName, whatsapp, organizationId: organization.id });

  let personId = existing?.id ?? "";
  const personPayload = {
    organization_id: organization.id,
    full_name: fullName,
    email: emailForAuth,
    whatsapp,
    active: false,
    notes: notes || null,
    auth_user_id: authUserId,
    updated_at: new Date().toISOString(),
  };

  if (personId) {
    const { error } = await supabaseAdmin.from("oh_people").update(personPayload).eq("id", personId).eq("organization_id", organization.id);
    if (error) throw error;
  } else {
    const { data, error } = await supabaseAdmin.from("oh_people").insert(personPayload).select("id").single();
    if (error) throw error;
    personId = data.id as string;
  }

  const roleId = await roleIdForFilhoDaCorrente(organization.id);
  const profile = {
    source: "primeiro_acesso_filho_corrente",
    validationStatus: "pendente_validacao",
    functionSlugs,
    agendaSlugs,
    selectedFunctions,
    selectedAgenda,
    selectedEntityIds: selectedEntities.map((item) => item.id),
    selectedEntities,
    cavalinhoConsulenteEntityId: hasCavalinho ? cavalinhoConsulenteEntityId : "",
    cavalinhoConsulenteDefinitionCompleted: hasCavalinho ? cavalinhoConsulenteDefinitionCompleted : false,
    submittedAt: new Date().toISOString(),
    canSimulateAccess: false,
  };

  const { data: membership } = await supabaseAdmin
    .from("oh_memberships")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("person_id", personId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const membershipPayload = {
    organization_id: organization.id,
    person_id: personId,
    role_id: roleId || null,
    module_slugs: DEFAULT_MODULE_SLUGS,
    active: false,
    status: "pendente_validacao",
    agenda_viva_profile: profile,
    updated_at: new Date().toISOString(),
  };

  if (membership?.id) {
    const { error } = await supabaseAdmin.from("oh_memberships").update(membershipPayload).eq("id", membership.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from("oh_memberships").insert(membershipPayload);
    if (error) throw error;
  }

  const statusToken = crypto.randomUUID();
  const summary = {
    selectedFunctions,
    selectedAgenda,
    selectedEntityIds: selectedEntities.map((item) => item.id),
    selectedEntities,
    cavalinhoConsulenteEntityId: hasCavalinho ? cavalinhoConsulenteEntityId : "",
    cavalinhoConsulenteDefinitionCompleted: hasCavalinho ? cavalinhoConsulenteDefinitionCompleted : false,
    notes,
    statusToken,
  };
  const { error: validationError } = await supabaseAdmin
    .from("oh_first_access_validation_requests")
    .insert({
      organization_id: organization.id,
      person_id: personId,
      status: "pendente_validacao",
      full_name: fullName,
      whatsapp,
      email: displayEmail(emailForAuth) || null,
      function_slugs: functionSlugs,
      agenda_slugs: agendaSlugs,
      summary,
    });
  if (validationError) throw validationError;

  const validationUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/cliente/validacoes?personId=${encodeURIComponent(personId)}`;
  const simulationUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/cliente/simular-acesso/${encodeURIComponent(personId)}`;
  const statusUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/status?token=${encodeURIComponent(statusToken)}`;
  const common = {
    fullName,
    whatsapp,
    email: displayEmail(emailForAuth),
    notes,
    selectedFunctions,
    selectedAgenda,
    selectedEntities,
    cavalinhoConsulenteEntity,
  };

  const reviewers = await reviewerEmails(organization.id);
  const reviewerEmail = buildReviewerEmail({ ...common, validationUrl, simulationUrl });
  await sendEmail({
    to: reviewers.join(", "),
    cc: reviewCopyEmail(),
    replyTo: displayEmail(emailForAuth) || undefined,
    subject: reviewerEmail.subject,
    text: reviewerEmail.text,
    html: reviewerEmail.html,
  });

  const personEmail = buildPersonEmail({ ...common, statusUrl });
  if (displayEmail(emailForAuth)) {
    await sendEmail({
      to: displayEmail(emailForAuth),
      cc: reviewCopyEmail(),
      subject: personEmail.subject,
      text: personEmail.text,
      html: personEmail.html,
    });
  }

  const whatsappMessage = buildWhatsappPersonMessage({ ...common, statusUrl });

  return {
    personId,
    statusUrl,
    whatsappUrl: whatsappUrl(whatsappSupportPhone(), whatsappMessage),
    whatsappPhone: whatsappSupportPhone(),
    message: "Cadastro confirmado e enviado para validação do Tucxa.",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AccessBody;
    const action = asText(body.action) || "submit";
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");

    if (action === "lookup") {
      const person = await findPersonByIdentifier(organization.id, asText(body.identifier));
      if (!person) return NextResponse.json({ ok: true, found: false, person: null });

      const access = await accessStatusForPerson(organization.id, person.id);
      return NextResponse.json({
        ok: true,
        found: true,
        person: {
          fullName: person.full_name || "",
          whatsapp: person.whatsapp || "",
          email: displayEmail(person.email),
          notes: person.notes || "",
          accessStatus: access.status,
          modules: DEFAULT_MODULE_SLUGS,
        },
      });
    }

    if (action === "resolve-login") {
      const person = await findPersonByIdentifier(organization.id, asText(body.identifier));
      if (!person) throw new Error("Cadastro não localizado para este WhatsApp/e-mail.");
      const access = await accessStatusForPerson(organization.id, person.id);
      if (!access.active || access.status !== "ativo") {
        throw new Error("Seu acesso ainda não foi liberado pelo Tucxa. Acompanhe o status da validação ou aguarde a confirmação.");
      }
      const authEmail = person.email || (person.whatsapp ? syntheticEmailFromPhone(person.whatsapp) : "");
      if (!authEmail) throw new Error("Este cadastro ainda não possui e-mail de acesso associado.");
      return NextResponse.json({ ok: true, authEmail });
    }

    if (action === "status") {
      const token = asText((body as { token?: unknown; statusToken?: unknown }).token ?? (body as { statusToken?: unknown }).statusToken);
      if (!token) throw new Error("Link de acompanhamento inválido.");
      const { data, error } = await supabaseAdmin
        .from("oh_first_access_validation_requests")
        .select("id, status, full_name, whatsapp, email, summary, created_at, updated_at")
        .eq("organization_id", organization.id)
        .filter("summary->>statusToken", "eq", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) throw new Error("Solicitação não encontrada para este link.");
      return NextResponse.json({ ok: true, request: data });
    }

    const result = await submitFirstAccess(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: errorToMessage(error, "Erro ao processar Primeiro Acesso.") }, { status: 500 });
  }
}
