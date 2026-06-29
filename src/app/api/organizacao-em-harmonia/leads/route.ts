import { NextResponse } from "next/server";
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

function normalizeModules(value: unknown, interestModule: OrganizacaoModulo) {
  if (Array.isArray(value)) {
    const modules = value.map((item) => normalizeOrganizacaoModulo(item)).filter((item) => item !== "organizacao-em-harmonia" && item !== "pacote-completo");
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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as OrganizacaoLeadPayload;
  const input = mapPayload(body);

  if (!input.contactName || !input.email || !input.whatsapp) {
    return NextResponse.json({ error: "Informe nome do contato, e-mail e WhatsApp." }, { status: 400 });
  }

  const baseUrl = siteUrl();
  const selectedModule = moduleInfo(input.interestModule);
  const priorityModule = moduleInfo(input.priorityModule);
  const loginUrl = `${baseUrl}/solucoes/organizacao-em-harmonia`;
  const funilUrl = `${baseUrl}/admin/ae/organizacao-em-harmonia`;
  const solutionId = await getSolutionId(selectedModule.slug);
  const timeline = founderTimelineFrom();

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("oh_leads")
    .insert({
      source: input.source,
      interest_module: input.interestModule,
      priority_module: priorityModule.slug,
      enabled_modules_requested: input.enabledModulesRequested,
      solution_id: solutionId,
      contact_name: input.contactName,
      email: input.email,
      whatsapp: input.whatsapp,
      organization_name: input.organizationName || null,
      organization_type: input.organizationType || null,
      observations:
        input.observations ||
        "Cadastro mínimo pela página Quero Conhecer. Confirmar organização, módulos, permissões, LGPD e Cliente Fundador na próxima etapa.",
      status: "interesse_recebido",
      founder_terms_accepted: input.founderTermsAccepted,
      testimonial_permission: input.testimonialPermission,
      lgpd_contact_consent: input.lgpdContactConsent,
      trial_days: timeline.founderEvaluationDays,
      founder_evaluation_days: timeline.founderEvaluationDays,
      implantation_due_at: timeline.implantationDueAt,
      reminder_hours_before_due: timeline.reminderHoursBeforeDue,
      next_reminder_at: timeline.nextReminderAt,
    })
    .select("id")
    .single();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  const accessEmail = await sendOrganizacaoHarmoniaLeadAccessEmail({
    contactName: input.contactName,
    email: input.email,
    whatsapp: input.whatsapp,
    moduleName: selectedModule.name,
    priorityModuleName: priorityModule.name,
    organizationName: input.organizationName || null,
    loginUrl,
    trialDays: timeline.founderEvaluationDays,
    implantationDueAt: timeline.implantationDueAt,
    reminderHoursBeforeDue: timeline.reminderHoursBeforeDue,
  });

  if (accessEmail.sent) {
    await supabaseAdmin
      .from("oh_leads")
      .update({ email_sent_at: new Date().toISOString(), status: "email_confirmacao_enviado" })
      .eq("id", lead.id);
  }

  const internalEmail = await sendOrganizacaoHarmoniaLeadInternalEmail({
    leadId: lead.id,
    contactName: input.contactName,
    email: input.email,
    whatsapp: input.whatsapp,
    moduleName: selectedModule.name,
    priorityModuleName: priorityModule.name,
    organizationName: input.organizationName || null,
    loginUrl,
    trialDays: timeline.founderEvaluationDays,
    implantationDueAt: timeline.implantationDueAt,
    reminderHoursBeforeDue: timeline.reminderHoursBeforeDue,
    nextReminderAt: timeline.nextReminderAt,
    source: input.source,
    funilUrl,
  });

  const botconversa = await syncOrganizacaoLeadWithBotConversa({
    leadId: lead.id,
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
    status: accessEmail.sent ? "email_confirmacao_enviado" : "interesse_recebido",
    trialDays: timeline.founderEvaluationDays,
    implantationDueAt: timeline.implantationDueAt,
    reminderHoursBeforeDue: timeline.reminderHoursBeforeDue,
  });

  if (botconversa.enabled && botconversa.ok) {
    await supabaseAdmin
      .from("oh_leads")
      .update({ botconversa_synced_at: new Date().toISOString() })
      .eq("id", lead.id);
  }

  if (botconversa.enabled && !botconversa.ok) {
    console.warn("[BotConversa] Falha ao sincronizar lead Organização em Harmonia", {
      leadId: lead.id,
      email: input.email,
      whatsapp: input.whatsapp,
      reason: botconversa.reason,
      steps: botconversa.steps,
    });
  }

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    module: selectedModule.slug,
    moduleName: selectedModule.name,
    priorityModule: priorityModule.slug,
    priorityModuleName: priorityModule.name,
    enabledModulesRequested: input.enabledModulesRequested,
    accessEmail: input.email,
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
