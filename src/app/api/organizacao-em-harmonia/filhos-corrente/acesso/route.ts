import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_COPY_EMAIL = "automacao.ao.extremo@gmail.com";
const DEFAULT_MODULE_SLUGS = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

type DraftItem = {
  slug: string;
  label: string;
  description?: string;
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

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function reviewCopyEmail() {
  return process.env.EMAIL_COPY_TO || DEFAULT_COPY_EMAIL;
}

function whatsappSupportPhone() {
  return process.env.AE_INTERNAL_WHATSAPP || "5519989848246";
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

async function sendEmail(input: { to: string; subject: string; text: string; cc?: string; replyTo?: string }) {
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
  const { data } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .in("slug", ["filho-da-corrente", "cavalinho", "membro"])
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
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

function buildReviewMessage(input: {
  organizationName: string;
  fullName: string;
  whatsapp: string;
  email: string;
  notes: string;
  selectedFunctions: DraftItem[];
  selectedAgenda: DraftItem[];
  validationUrl: string;
}) {
  const functions = input.selectedFunctions.length ? input.selectedFunctions.map((item) => `- ${item.label}`).join("\n") : "- Somente Filho da Corrente";
  const agenda = input.selectedAgenda.length ? input.selectedAgenda.map((item) => `- ${item.label}${item.description ? ` — ${item.description}` : ""}`).join("\n") : "- Nenhum item de agenda selecionado";

  return [
    "Olá! Há uma nova solicitação de Primeiro Acesso aguardando validação.",
    "",
    `Organização: ${input.organizationName}`,
    `Nome: ${input.fullName}`,
    `WhatsApp: ${input.whatsapp}`,
    `E-mail: ${input.email || "não informado"}`,
    "",
    "Funções:",
    functions,
    "",
    "Agenda:",
    agenda,
    "",
    input.notes ? `Observação: ${input.notes}` : "Observação: não informada",
    "",
    "Para validar e, se necessário, simular o acesso do Filho da Corrente, acesse:",
    input.validationUrl,
  ].join("\n");
}

function buildPersonMessage(input: { fullName: string; validationUrl: string }) {
  return [
    `Olá, ${input.fullName.split(/\s+/)[0] || "irmão(ã)"}.`,
    "",
    "Recebemos sua solicitação de Primeiro Acesso na Organização em Harmonia do Tucxa.",
    "",
    "Agora o Tucxa irá conferir as informações, validar seus vínculos e liberar o acesso quando tudo estiver correto.",
    "",
    "Você pode acompanhar ou retornar ao site por aqui:",
    input.validationUrl,
  ].join("\n");
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

  if (!fullName) throw new Error("Informe o nome completo.");
  if (whatsapp.length < 10) throw new Error("Informe o WhatsApp com DDD.");
  if (password.length < 8) throw new Error("Crie uma senha com pelo menos 8 caracteres.");
  if (email && !email.includes("@")) throw new Error("Confira o e-mail informado.");

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

  await supabaseAdmin.from("oh_first_access_validation_requests").insert({
    organization_id: organization.id,
    person_id: personId,
    status: "pendente_validacao",
    full_name: fullName,
    whatsapp,
    email: displayEmail(emailForAuth) || null,
    function_slugs: functionSlugs,
    agenda_slugs: agendaSlugs,
    summary: { selectedFunctions, selectedAgenda, notes },
  });

  const validationUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/cliente/validacoes?personId=${encodeURIComponent(personId)}`;
  const reviewMessage = buildReviewMessage({
    organizationName: organization.name,
    fullName,
    whatsapp,
    email: displayEmail(emailForAuth),
    notes,
    selectedFunctions,
    selectedAgenda,
    validationUrl,
  });

  const reviewers = await reviewerEmails(organization.id);
  await sendEmail({
    to: reviewers.join(", "),
    cc: reviewCopyEmail(),
    replyTo: displayEmail(emailForAuth) || undefined,
    subject: `Validação de Primeiro Acesso - ${fullName}`,
    text: reviewMessage,
  });

  if (displayEmail(emailForAuth)) {
    await sendEmail({
      to: displayEmail(emailForAuth),
      cc: reviewCopyEmail(),
      subject: "Solicitação recebida - Organização em Harmonia Tucxa",
      text: buildPersonMessage({ fullName, validationUrl: `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente` }),
    });
  }

  return {
    personId,
    whatsappUrl: whatsappUrl(whatsappSupportPhone(), reviewMessage),
    message: "Cadastro confirmado e enviado para validação do Tucxa.",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AccessBody;
    const action = asText(body.action) || "submit";
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");

    if (action === "resolve-login") {
      const person = await findPersonByIdentifier(organization.id, asText(body.identifier));
      if (!person) throw new Error("Cadastro não localizado para este WhatsApp/e-mail.");
      const authEmail = person.email || (person.whatsapp ? syntheticEmailFromPhone(person.whatsapp) : "");
      if (!authEmail) throw new Error("Este cadastro ainda não possui e-mail de acesso associado.");
      return NextResponse.json({ ok: true, authEmail });
    }

    const result = await submitFirstAccess(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: errorToMessage(error, "Erro ao processar Primeiro Acesso.") }, { status: 500 });
  }
}
