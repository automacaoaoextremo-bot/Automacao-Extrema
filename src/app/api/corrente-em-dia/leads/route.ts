import { NextResponse } from "next/server";
import {
  CorrenteLeadPayload,
  formatCorrenteOrganizationType,
  normalizeCorrenteOrganizationType,
} from "@/lib/corrente-em-dia";
import { toSlug } from "@/lib/ae-utils";
import {
  sendCorrenteLeadAccessEmail,
  sendCorrenteLeadInternalEmail,
} from "@/lib/mail";
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

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const digits = asText(value).replace(/[^0-9]/g, "");
  return digits ? Number(digits) : null;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function buildTemporaryPassword() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Ced@${random}${new Date().getFullYear()}`;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function mapPayload(raw: CorrenteLeadPayload) {
  const organizationType = normalizeCorrenteOrganizationType(raw.organizationType ?? raw.organization_type);
  const organizationName = asText(raw.organizationName ?? raw.organization_name);
  const responsibleName = asText(raw.responsibleName ?? raw.responsible_name);
  const email = asText(raw.email).toLowerCase();
  const whatsapp = normalizePhone(asText(raw.whatsapp));
  const state = asText(raw.state ?? raw.uf).toUpperCase().slice(0, 2);
  const city = asText(raw.city);
  const contributorsEstimate = asNumber(raw.contributorsEstimate ?? raw.contributors_estimate);
  const observations = asText(raw.observations ?? raw.notes);
  const source = asText(raw.source) || "site_corrente_em_dia";
  const founderTermsAccepted = asBool(raw.founderTermsAccepted ?? raw.founder_terms_accepted);
  const testimonialPermission = asBool(raw.testimonialPermission ?? raw.testimonial_permission);
  const lgpdContactConsent = asBool(raw.lgpdContactConsent ?? raw.lgpd_contact_consent) || true;

  return {
    organizationType,
    organizationName,
    responsibleName,
    email,
    whatsapp,
    state,
    city,
    contributorsEstimate,
    observations,
    source,
    founderTermsAccepted,
    testimonialPermission,
    lgpdContactConsent,
  };
}

async function getCorrenteSolutionId() {
  const { data, error } = await supabaseAdmin
    .from("ae_solutions")
    .select("id")
    .eq("slug", "corrente-em-dia")
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function upsertAeClient(input: {
  organizationType: string;
  organizationName: string;
  organizationSlug: string;
  email: string;
  whatsapp: string;
  city: string;
  state: string;
  observations: string;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("ae_clients")
    .select("id")
    .eq("slug", input.organizationSlug)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabaseAdmin
    .from("ae_clients")
    .insert({
      client_type: input.organizationType,
      display_name: input.organizationName,
      slug: input.organizationSlug,
      email: input.email || null,
      whatsapp: input.whatsapp || null,
      city: input.city || null,
      state: input.state || null,
      status: "piloto",
      notes: input.observations || "Lead Corrente em Dia - Cliente Fundador.",
      is_demo: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function upsertOrganization(input: {
  organizationType: string;
  organizationName: string;
  organizationSlug: string;
  email: string;
  whatsapp: string;
  city: string;
  state: string;
  observations: string;
  aeClientId: string | null;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("ced_organizations")
    .select("id")
    .eq("slug", input.organizationSlug)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabaseAdmin
    .from("ced_organizations")
    .insert({
      ae_client_id: input.aeClientId,
      organization_type: input.organizationType,
      name: input.organizationName,
      slug: input.organizationSlug,
      email: input.email || null,
      whatsapp: input.whatsapp || null,
      city: input.city || null,
      state: input.state || null,
      contribution_due_mode: "until_day",
      public_headline: "Contribuições organizadas com respeito, clareza e segurança.",
      deep_dive_text:
        "A organização participa da fase Cliente Fundador para validar uma forma mais simples de acompanhar contribuições, comprovantes e pendências, reduzindo retrabalho e fortalecendo a previsibilidade da casa.",
      public_status: "rascunho",
      is_demo: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function getManagerRoleId() {
  const { data } = await supabaseAdmin
    .from("ced_roles")
    .select("id")
    .or("slug.eq.presidente,slug.eq.tesoureiro,slug.eq.responsavel-financeiro")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function upsertResponsiblePerson(input: {
  fullName: string;
  email: string;
  whatsapp: string;
  organizationId: string;
  roleId: string | null;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("ced_people")
    .select("id, auth_user_id")
    .eq("email", input.email)
    .maybeSingle();

  if (existingError) throw existingError;

  let personId = existing?.id as string | undefined;
  let authUserId = existing?.auth_user_id as string | null | undefined;

  if (!personId) {
    const { data, error } = await supabaseAdmin
      .from("ced_people")
      .insert({
        full_name: input.fullName,
        email: input.email,
        whatsapp: input.whatsapp || null,
        person_type: "gestor",
        status: "ativo",
        notes: "Responsável criado automaticamente pelo interesse no Corrente em Dia.",
        is_demo: false,
      })
      .select("id, auth_user_id")
      .single();

    if (error) throw error;
    personId = data.id as string;
    authUserId = data.auth_user_id as string | null;
  }

  const { data: link } = await supabaseAdmin
    .from("ced_person_organizations")
    .select("id")
    .eq("person_id", personId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!link?.id) {
    await supabaseAdmin.from("ced_person_organizations").insert({
      person_id: personId,
      organization_id: input.organizationId,
      role_id: input.roleId,
      is_manager: true,
      is_financial_responsible: true,
      contribution_enabled: false,
    });
  }

  return { personId, authUserId: authUserId ?? null };
}

async function ensureAuthUser(input: { email: string; fullName: string; personId: string }) {
  const temporaryPassword = buildTemporaryPassword();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      origem: "corrente_em_dia_cliente_fundador",
    },
  });

  if (error || !data.user?.id) {
    return { authUserId: null, temporaryPassword: null, reason: error?.message ?? "Usuário já pode existir." };
  }

  await supabaseAdmin.from("ced_people").update({ auth_user_id: data.user.id }).eq("id", input.personId);
  return { authUserId: data.user.id, temporaryPassword, reason: "Usuário Auth criado." };
}

async function ensureClientTerms(input: {
  organizationId: string;
  solutionId: string | null;
  personId: string;
  accepted: boolean;
  testimonialPermission: boolean;
}) {
  if (!input.solutionId) return;

  const payload = {
    organization_id: input.organizationId,
    solution_id: input.solutionId,
    condition_label: "Cliente Fundador",
    contract_status: input.accepted ? "aceito" : "enviado",
    fee_status: "em_definicao",
    setup_fee: 0,
    monthly_fee: 0,
    operational_fee_percentage: null,
    federation_percentage: 0.5,
    ae_percentage: 1,
    partner_percentage: 1,
    unlinked_reserve_percentage: 0.5,
    pilot_days: TRIAL_DAYS,
    allow_testimonial: input.testimonialPermission,
    allow_logo_use: false,
    terms_accepted: input.accepted,
    accepted_by_person_id: input.accepted ? input.personId : null,
    accepted_at: input.accepted ? new Date().toISOString() : null,
    notes: "Condição criada automaticamente pelo fluxo de interesse Cliente Fundador. Todos os valores e taxas podem ser editados por cliente.",
    is_active: true,
  };

  await supabaseAdmin
    .from("ced_client_terms")
    .upsert(payload, { onConflict: "organization_id,condition_label" });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CorrenteLeadPayload;
  const input = mapPayload(body);

  if (!input.organizationName || !input.responsibleName || !input.email || !input.whatsapp) {
    return NextResponse.json({ error: "Informe organização, responsável, e-mail e WhatsApp." }, { status: 400 });
  }

  const now = new Date();
  const baseUrl = siteUrl();
  const loginUrl = `${baseUrl}/solucoes/corrente-em-dia/login`;
  const funilUrl = `${baseUrl}/admin/ae/corrente-em-dia/funil`;
  const organizationSlug = toSlug(input.organizationName) || `corrente-${Date.now()}`;
  const solutionId = await getCorrenteSolutionId();

  const aeClientId = await upsertAeClient({
    organizationType: input.organizationType,
    organizationName: input.organizationName,
    organizationSlug,
    email: input.email,
    whatsapp: input.whatsapp,
    city: input.city,
    state: input.state,
    observations: input.observations,
  });

  const organizationId = await upsertOrganization({
    organizationType: input.organizationType,
    organizationName: input.organizationName,
    organizationSlug,
    email: input.email,
    whatsapp: input.whatsapp,
    city: input.city,
    state: input.state,
    observations: input.observations,
    aeClientId,
  });

  const roleId = await getManagerRoleId();
  const responsible = await upsertResponsiblePerson({
    fullName: input.responsibleName,
    email: input.email,
    whatsapp: input.whatsapp,
    organizationId,
    roleId,
  });

  let temporaryPassword: string | null = null;
  let authUserId = responsible.authUserId;
  if (!authUserId) {
    const auth = await ensureAuthUser({ email: input.email, fullName: input.responsibleName, personId: responsible.personId });
    authUserId = auth.authUserId;
    temporaryPassword = auth.temporaryPassword;
  }

  await ensureClientTerms({
    organizationId,
    solutionId,
    personId: responsible.personId,
    accepted: input.founderTermsAccepted,
    testimonialPermission: input.testimonialPermission,
  });

  const accessDueAt = addHours(now, 24).toISOString();
  const internalAlertAt = addHours(now, 12).toISOString();
  const trialStartedAt = now.toISOString();
  const trialEndsAt = addDays(now, TRIAL_DAYS).toISOString();

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("ced_leads")
    .insert({
      source: input.source,
      organization_type: input.organizationType,
      organization_name: input.organizationName,
      organization_slug: organizationSlug,
      responsible_name: input.responsibleName,
      email: input.email,
      whatsapp: input.whatsapp,
      state: input.state,
      city: input.city,
      contributors_estimate: input.contributorsEstimate,
      observations: input.observations,
      status: "aguardando_primeiro_acesso",
      founder_terms_accepted: input.founderTermsAccepted,
      testimonial_permission: input.testimonialPermission,
      lgpd_contact_consent: input.lgpdContactConsent,
      access_user_email: input.email,
      access_due_at: accessDueAt,
      internal_alert_at: internalAlertAt,
      trial_days: TRIAL_DAYS,
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
      ae_client_id: aeClientId,
      organization_id: organizationId,
      responsible_person_id: responsible.personId,
      auth_user_id: authUserId,
      notes: "Lead criado automaticamente pelo webhook/formulário Corrente em Dia.",
    })
    .select("id")
    .single();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  const accessEmail = await sendCorrenteLeadAccessEmail({
    responsibleName: input.responsibleName,
    email: input.email,
    organizationName: input.organizationName,
    organizationType: formatCorrenteOrganizationType(input.organizationType),
    city: input.city,
    state: input.state,
    loginUrl,
    temporaryPassword,
    trialDays: TRIAL_DAYS,
  });

  if (accessEmail.sent) {
    await supabaseAdmin
      .from("ced_leads")
      .update({ access_sent_at: new Date().toISOString(), status: "email_acesso_enviado" })
      .eq("id", lead.id);
  }

  const internalEmail = await sendCorrenteLeadInternalEmail({
    leadId: lead.id,
    responsibleName: input.responsibleName,
    email: input.email,
    whatsapp: input.whatsapp,
    organizationName: input.organizationName,
    organizationType: formatCorrenteOrganizationType(input.organizationType),
    city: input.city,
    state: input.state,
    contributorsEstimate: input.contributorsEstimate,
    observations: input.observations,
    loginUrl,
    temporaryPassword,
    trialDays: TRIAL_DAYS,
    accessDueAt,
    funilUrl,
    source: input.source,
  });

  const leadReply = `Olá, ${input.responsibleName.split(/\s+/)[0] || "tudo bem"}! Recebemos os dados da ${input.organizationName} para o Corrente em Dia como Cliente Fundador. O acesso inicial foi preparado e também enviamos as orientações para ${input.email}. A proposta é começar simples: clareza nas contribuições, comprovantes organizados e menos retrabalho para quem cuida da casa.`;
  const internalAlertMessage = `Novo lead Corrente em Dia\nOrganização: ${input.organizationName}\nResponsável: ${input.responsibleName}\nWhatsApp: ${input.whatsapp}\nE-mail: ${input.email}\nStatus: ${accessEmail.sent ? "acesso enviado" : "verificar e-mail/acesso"}\nFunil: ${funilUrl}`;

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    organizationId,
    organizationSlug,
    accessEmail: input.email,
    accessEmailSent: accessEmail.sent,
    accessEmailReason: accessEmail.reason,
    internalEmailSent: internalEmail.sent,
    internalEmailReason: internalEmail.reason,
    loginUrl,
    funilUrl,
    botconversaReply: leadReply,
    internalAlertMessage,
  });
}
