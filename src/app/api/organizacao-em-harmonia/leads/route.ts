import { NextResponse } from "next/server";
import {
  moduleInfo,
  normalizeOrganizacaoModulo,
  normalizeWhatsapp,
  type OrganizacaoLeadPayload,
} from "@/lib/organizacao-em-harmonia";
import {
  sendOrganizacaoHarmoniaLeadAccessEmail,
  sendOrganizacaoHarmoniaLeadInternalEmail,
} from "@/lib/mail";
import { syncOrganizacaoLeadWithBotConversa } from "@/lib/botconversa";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const TRIAL_DAYS = 30;

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

  return {
    contactName,
    email,
    whatsapp,
    interestModule,
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
  const loginUrl = `${baseUrl}/solucoes/organizacao-em-harmonia`;
  const funilUrl = `${baseUrl}/admin/ae/organizacao-em-harmonia`;
  const solutionId = await getSolutionId(selectedModule.slug);

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("oh_leads")
    .insert({
      source: input.source,
      interest_module: input.interestModule,
      solution_id: solutionId,
      contact_name: input.contactName,
      email: input.email,
      whatsapp: input.whatsapp,
      organization_name: input.organizationName || null,
      organization_type: input.organizationType || null,
      observations: input.observations || "Cadastro mínimo pela página Quero Conhecer. Confirmar processo, módulos, permissões e Cliente Fundador na próxima etapa.",
      status: "interesse_recebido",
      founder_terms_accepted: input.founderTermsAccepted,
      testimonial_permission: input.testimonialPermission,
      lgpd_contact_consent: input.lgpdContactConsent,
      trial_days: TRIAL_DAYS,
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
    organizationName: input.organizationName || null,
    loginUrl,
    trialDays: TRIAL_DAYS,
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
    organizationName: input.organizationName || null,
    loginUrl,
    trialDays: TRIAL_DAYS,
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
    organizationName: input.organizationName || null,
    loginUrl,
    source: input.source,
    founderTermsAccepted: input.founderTermsAccepted,
    accessEmailSent: accessEmail.sent,
    status: accessEmail.sent ? "email_confirmacao_enviado" : "interesse_recebido",
    trialDays: TRIAL_DAYS,
  });

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
  });
}
