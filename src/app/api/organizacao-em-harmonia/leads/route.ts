import { NextResponse } from "next/server";
import { toSlug } from "@/lib/ae-utils";
import {
  founderTimelineFrom,
  moduleInfo,
  normalizeOrganizacaoModulo,
  normalizeWhatsapp,
  type OrganizacaoLeadPayload,
  type OrganizacaoModulo,
} from "@/lib/organizacao-em-harmonia";
import {
  sendOrganizacaoHarmoniaLeadAccessEmail,
  sendOrganizacaoHarmoniaLeadInternalEmail,
} from "@/lib/mail";
import { syncOrganizacaoLeadWithBotConversa } from "@/lib/botconversa";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const SUITE_MODULES = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: unknown) {
  if (typeof value === "boolean") return value;
  const text = asText(value).toLowerCase();
  return ["sim", "s", "yes", "true", "1", "aceito", "concordo"].includes(text);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function buildTemporaryPassword() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Oh@${random}${new Date().getFullYear()}`;
}

function normalizeModules(value: unknown, interestModule: OrganizacaoModulo) {
  if (Array.isArray(value)) {
    const modules = value
      .map((item) => normalizeOrganizacaoModulo(item))
      .filter((item) => item !== "organizacao-em-harmonia" && item !== "pacote-completo");
    return modules.length > 0 ? Array.from(new Set(modules)) : [...SUITE_MODULES];
  }

  const text = asText(value);
  if (text) {
    const modules = text
      .split(/[;,|]/)
      .map((item) => normalizeOrganizacaoModulo(item))
      .filter((item) => item !== "organizacao-em-harmonia" && item !== "pacote-completo");
    if (modules.length > 0) return Array.from(new Set(modules));
  }

  if (interestModule === "organizacao-em-harmonia" || interestModule === "pacote-completo") return [...SUITE_MODULES];
  return [interestModule];
}

function priorityModuleFor(interestModule: OrganizacaoModulo, rawPriority: unknown) {
  const normalizedPriority = normalizeOrganizacaoModulo(rawPriority);
  if (normalizedPriority !== "organizacao-em-harmonia" && normalizedPriority !== "pacote-completo") return normalizedPriority;
  if (interestModule !== "organizacao-em-harmonia" && interestModule !== "pacote-completo") return interestModule;
  return "agenda-viva";
}

function mapPayload(raw: OrganizacaoLeadPayload) {
  const contactName = asText(raw.contactName ?? raw.contact_name ?? raw.responsibleName ?? raw.responsible_name);
  const email = asText(raw.email).toLowerCase();
  const whatsapp = normalizeWhatsapp(asText(raw.whatsapp));
  const interestModule = normalizeOrganizacaoModulo(raw.modulo ?? raw.module ?? raw.interestModule ?? raw.interest_module);
  const organizationName = asText(raw.organizationName ?? raw.organization_name);
  const organizationType = asText(raw.organizationType ?? raw.organization_type);
  const observations = asText(raw.observations ?? raw.notes);
  const source = asText(raw.source) || "site_organizacao_em_harmonia_minimo";
  const founderTermsAccepted = asBool(raw.founderTermsAccepted ?? raw.founder_terms_accepted);
  const testimonialPermission = asBool(raw.testimonialPermission ?? raw.testimonial_permission);
  const lgpdContactConsent = asBool(raw.lgpdContactConsent ?? raw.lgpd_contact_consent);
  const priorityModule = priorityModuleFor(interestModule, raw.priorityModule ?? raw.priority_module);
  const enabledModulesRequested = normalizeModules(raw.enabledModules ?? raw.enabled_modules, interestModule);

  return {
    contactName,
    email,
    whatsapp,
    interestModule,
    priorityModule,
    enabledModulesRequested,
    organizationName,
    organizationType,
    observations,
    source,
    founderTermsAccepted,
    testimonialPermission,
    lgpdContactConsent,
  };
}

async function getSolutionId(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("ae_solutions")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

function defaultOrganizationName(input: { organizationName: string; contactName: string; email: string }) {
  if (input.organizationName) return input.organizationName;
  const emailPrefix = input.email.split("@")[0] || "organizacao";
  return `Organização em configuração - ${input.contactName || emailPrefix}`;
}

async function upsertOrganization(input: {
  name: string;
  email: string;
  whatsapp: string;
  organizationType: string;
  enabledModules: string[];
}) {
  const isLikelyTucxa = `${input.name} ${input.email}`.toLowerCase().includes("tucxa");

  const { data: existingTucxa, error: tucxaError } = isLikelyTucxa
    ? await supabaseAdmin
        .from("oh_organizations")
        .select("id, slug, name")
        .eq("slug", "tucxa")
        .maybeSingle()
    : { data: null, error: null };

  if (tucxaError) throw tucxaError;

  const { data: existingByEmail, error: emailError } = !existingTucxa
    ? await supabaseAdmin
        .from("oh_organizations")
        .select("id, slug, name")
        .ilike("email", input.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  if (emailError) throw emailError;

  const existing = existingTucxa ?? existingByEmail;
  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("oh_organizations")
      .update({
        name: input.name || existing.name,
        organization_type: input.organizationType || null,
        whatsapp: input.whatsapp || null,
        email: input.email,
        enabled_modules: input.enabledModules,
        status: "cliente_fundador_em_configuracao",
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw error;
    return existing.id as string;
  }

  const baseSlug = toSlug(input.name) || `organizacao-${Date.now()}`;
  const slug = `${baseSlug}-${Date.now()}`;
  const { data, error } = await supabaseAdmin
    .from("oh_organizations")
    .insert({
      name: input.name,
      slug,
      organization_type: input.organizationType || null,
      whatsapp: input.whatsapp || null,
      email: input.email,
      active: true,
      enabled_modules: input.enabledModules,
      status: "cliente_fundador_em_configuracao",
      is_demo: false,
      settings: {
        cliente_fundador: true,
        primeiro_modulo: "agenda-viva",
        origem: "quero_conhecer_minimo",
      },
      notes: "Organização criada automaticamente pelo Quero Conhecer da Organização em Harmonia. Completar dados no primeiro acesso.",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function upsertPerson(input: { organizationId: string; fullName: string; email: string; whatsapp: string }) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("oh_people")
    .select("id, auth_user_id")
    .eq("organization_id", input.organizationId)
    .ilike("email", input.email)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("oh_people")
      .update({
        full_name: input.fullName,
        whatsapp: input.whatsapp || null,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
    return { personId: existing.id as string, authUserId: (existing.auth_user_id as string | null) ?? null };
  }

  const { data, error } = await supabaseAdmin
    .from("oh_people")
    .insert({
      organization_id: input.organizationId,
      full_name: input.fullName,
      email: input.email,
      whatsapp: input.whatsapp || null,
      active: true,
      notes: "Contato principal criado automaticamente pelo Quero Conhecer da Organização em Harmonia.",
    })
    .select("id, auth_user_id")
    .single();

  if (error) throw error;
  return { personId: data.id as string, authUserId: (data.auth_user_id as string | null) ?? null };
}

async function getAdminRoleId(organizationId: string) {
  const { data } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .in("slug", ["administrador", "presidente", "diretoria", "organizacao"])
    .order("slug", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function ensureMembership(input: { organizationId: string; personId: string; roleId: string | null; moduleSlugs: string[] }) {
  let existingQuery = supabaseAdmin
    .from("oh_memberships")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("person_id", input.personId);

  existingQuery = input.roleId ? existingQuery.eq("role_id", input.roleId) : existingQuery.is("role_id", null);

  const { data: existing, error: existingError } = await existingQuery.maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    organization_id: input.organizationId,
    person_id: input.personId,
    role_id: input.roleId,
    module_slugs: input.moduleSlugs,
    active: true,
    status: "ativo",
    is_main_contact: true,
    can_receive_notifications: true,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabaseAdmin.from("oh_memberships").update(payload).eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.from("oh_memberships").insert(payload);
  if (error) throw error;
}

async function ensureAuthUser(input: { email: string; fullName: string; personId: string }) {
  const temporaryPassword = buildTemporaryPassword();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      origem: "organizacao_em_harmonia_cliente_fundador",
    },
  });

  if (error || !data.user?.id) {
    return {
      authUserId: null,
      temporaryPassword: null,
      reason: error?.message ?? "Usuário já pode existir.",
    };
  }

  await supabaseAdmin.from("oh_people").update({ auth_user_id: data.user.id }).eq("id", input.personId);
  return { authUserId: data.user.id, temporaryPassword, reason: "Usuário Auth criado." };
}

async function upsertLead(input: {
  source: string;
  interestModule: OrganizacaoModulo;
  priorityModule: string;
  enabledModulesRequested: string[];
  solutionId: string | null;
  contactName: string;
  email: string;
  whatsapp: string;
  organizationName: string;
  organizationType: string;
  observations: string;
  founderTermsAccepted: boolean;
  testimonialPermission: boolean;
  lgpdContactConsent: boolean;
  timeline: ReturnType<typeof founderTimelineFrom>;
  organizationId: string;
  authUserId: string | null;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("oh_leads")
    .select("id")
    .or(`email.eq.${input.email},whatsapp.eq.${input.whatsapp}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    source: input.source,
    interest_module: input.interestModule,
    priority_module: input.priorityModule,
    enabled_modules_requested: input.enabledModulesRequested,
    solution_id: input.solutionId,
    contact_name: input.contactName,
    email: input.email,
    whatsapp: input.whatsapp,
    organization_name: input.organizationName || null,
    organization_type: input.organizationType || null,
    observations:
      input.observations ||
      "Cadastro mínimo pela página Quero Conhecer. Confirmar organização, módulos, permissões, LGPD e Cliente Fundador na área logada.",
    status: "aguardando_primeiro_acesso",
    founder_terms_accepted: input.founderTermsAccepted,
    testimonial_permission: input.testimonialPermission,
    lgpd_contact_consent: input.lgpdContactConsent,
    trial_days: input.timeline.founderEvaluationDays,
    founder_evaluation_days: input.timeline.founderEvaluationDays,
    implantation_due_at: input.timeline.implantationDueAt,
    reminder_hours_before_due: input.timeline.reminderHoursBeforeDue,
    next_reminder_at: input.timeline.nextReminderAt,
    converted_organization_id: input.organizationId,
    auth_user_id: input.authUserId,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabaseAdmin
      .from("oh_leads")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  const { data, error } = await supabaseAdmin.from("oh_leads").insert(payload).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as OrganizacaoLeadPayload;
  const input = mapPayload(body);

  if (!input.contactName || !input.email || !input.whatsapp) {
    return NextResponse.json({ error: "Informe nome do contato, e-mail e WhatsApp." }, { status: 400 });
  }

  const baseUrl = siteUrl();
  const selectedModule = moduleInfo(input.interestModule);
  const priorityModule = moduleInfo(input.priorityModule);
  const loginUrl = `${baseUrl}/solucoes/organizacao-em-harmonia/login`;
  const funilUrl = `${baseUrl}/admin/ae/funil?solution=organizacao-em-harmonia`;
  const solutionId = await getSolutionId(selectedModule.slug);
  const timeline = founderTimelineFrom();
  const organizationName = defaultOrganizationName({
    organizationName: input.organizationName,
    contactName: input.contactName,
    email: input.email,
  });

  const organizationId = await upsertOrganization({
    name: organizationName,
    email: input.email,
    whatsapp: input.whatsapp,
    organizationType: input.organizationType || "organizacao",
    enabledModules: input.enabledModulesRequested,
  });

  const roleId = await getAdminRoleId(organizationId);
  const person = await upsertPerson({
    organizationId,
    fullName: input.contactName,
    email: input.email,
    whatsapp: input.whatsapp,
  });

  await ensureMembership({
    organizationId,
    personId: person.personId,
    roleId,
    moduleSlugs: input.enabledModulesRequested,
  });

  let temporaryPassword: string | null = null;
  let authUserId = person.authUserId;
  if (!authUserId) {
    const auth = await ensureAuthUser({ email: input.email, fullName: input.contactName, personId: person.personId });
    authUserId = auth.authUserId;
    temporaryPassword = auth.temporaryPassword;
  }

  const leadId = await upsertLead({
    source: input.source,
    interestModule: input.interestModule,
    priorityModule: priorityModule.slug,
    enabledModulesRequested: input.enabledModulesRequested,
    solutionId,
    contactName: input.contactName,
    email: input.email,
    whatsapp: input.whatsapp,
    organizationName,
    organizationType: input.organizationType,
    observations: input.observations,
    founderTermsAccepted: input.founderTermsAccepted,
    testimonialPermission: input.testimonialPermission,
    lgpdContactConsent: input.lgpdContactConsent,
    timeline,
    organizationId,
    authUserId,
  });

  const accessEmail = await sendOrganizacaoHarmoniaLeadAccessEmail({
    contactName: input.contactName,
    email: input.email,
    whatsapp: input.whatsapp,
    moduleName: selectedModule.name,
    priorityModuleName: priorityModule.name,
    organizationName: input.organizationName || null,
    loginUrl,
    temporaryPassword,
    trialDays: timeline.founderEvaluationDays,
    implantationDueAt: timeline.implantationDueAt,
    reminderHoursBeforeDue: timeline.reminderHoursBeforeDue,
  });

  if (accessEmail.sent) {
    await supabaseAdmin
      .from("oh_leads")
      .update({ email_sent_at: new Date().toISOString(), status: "email_acesso_enviado" })
      .eq("id", leadId);
  }

  const internalEmail = await sendOrganizacaoHarmoniaLeadInternalEmail({
    leadId,
    contactName: input.contactName,
    email: input.email,
    whatsapp: input.whatsapp,
    moduleName: selectedModule.name,
    priorityModuleName: priorityModule.name,
    organizationName: organizationName || null,
    loginUrl,
    temporaryPassword,
    trialDays: timeline.founderEvaluationDays,
    implantationDueAt: timeline.implantationDueAt,
    reminderHoursBeforeDue: timeline.reminderHoursBeforeDue,
    nextReminderAt: timeline.nextReminderAt,
    source: input.source,
    funilUrl,
  });

  const botconversa = await syncOrganizacaoLeadWithBotConversa({
    leadId,
    contactName: input.contactName,
    email: input.email,
    whatsapp: input.whatsapp,
    moduleName: selectedModule.name,
    moduleSlug: selectedModule.slug,
    priorityModuleName: priorityModule.name,
    priorityModuleSlug: priorityModule.slug,
    organizationName: input.organizationName || null,
    loginUrl,
    source: input.source,
    founderTermsAccepted: input.founderTermsAccepted,
    accessEmailSent: accessEmail.sent,
    status: accessEmail.sent ? "email_acesso_enviado" : "aguardando_primeiro_acesso",
    trialDays: timeline.founderEvaluationDays,
    implantationDueAt: timeline.implantationDueAt,
    reminderHoursBeforeDue: timeline.reminderHoursBeforeDue,
  });

  if (botconversa.enabled && botconversa.ok) {
    await supabaseAdmin
      .from("oh_leads")
      .update({ botconversa_synced_at: new Date().toISOString() })
      .eq("id", leadId);
  }

  if (botconversa.enabled && !botconversa.ok) {
    console.warn("[BotConversa] Falha ao sincronizar lead Organização em Harmonia", {
      leadId,
      email: input.email,
      whatsapp: input.whatsapp,
      reason: botconversa.reason,
      steps: botconversa.steps,
    });
  }

  return NextResponse.json({
    ok: true,
    leadId,
    organizationId,
    module: selectedModule.slug,
    moduleName: selectedModule.name,
    priorityModule: priorityModule.slug,
    priorityModuleName: priorityModule.name,
    enabledModulesRequested: input.enabledModulesRequested,
    accessEmail: input.email,
    temporaryPasswordCreated: Boolean(temporaryPassword),
    accessEmailSent: accessEmail.sent,
    accessEmailReason: accessEmail.reason,
    internalEmailSent: internalEmail.sent,
    internalEmailReason: internalEmail.reason,
    botconversaSynced: botconversa.ok,
    botconversaEnabled: botconversa.enabled,
    botconversaReason: botconversa.reason,
    botconversaSubscriberId: botconversa.subscriberId,
    botconversaSteps: botconversa.steps,
    loginUrl,
    funilUrl,
    implantationDueAt: timeline.implantationDueAt,
    founderEvaluationDays: timeline.founderEvaluationDays,
    reminderHoursBeforeDue: timeline.reminderHoursBeforeDue,
  });
}
