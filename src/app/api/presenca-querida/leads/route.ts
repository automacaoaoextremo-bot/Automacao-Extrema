import { NextResponse } from "next/server";
import { PresencaLeadPayload, formatPresencaEventType, normalizePresencaEventType } from "@/lib/presenca-querida";
import { toSlug } from "@/lib/ae-utils";
import { sendPresencaLeadAccessEmail, sendPresencaLeadInternalEmail } from "@/lib/mail";
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
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

function buildTemporaryPassword() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Pq@${random}${new Date().getFullYear()}`;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function mapPayload(raw: PresencaLeadPayload) {
  const responsibleName = asText(raw.contactName ?? raw.contact_name ?? raw.responsibleName ?? raw.responsible_name);
  const eventNameFromPayload = asText(raw.eventName ?? raw.event_name);
  const email = asText(raw.email).toLowerCase();
  const whatsapp = normalizePhone(asText(raw.whatsapp));
  const eventType = normalizePresencaEventType(raw.eventType ?? raw.event_type);
  const state = asText(raw.state ?? raw.uf).toUpperCase().slice(0, 2);
  const city = asText(raw.city);
  const guestsEstimate = asNumber(raw.guestsEstimate ?? raw.guests_estimate);
  const eventDate = asText(raw.eventDate ?? raw.event_date) || null;
  const eventContext = asText(raw.eventContext ?? raw.event_context);
  const observations = asText(raw.observations ?? raw.notes);
  const source = asText(raw.source) || "site_presenca_querida_minimo";
  const founderTermsAccepted = asBool(raw.founderTermsAccepted ?? raw.founder_terms_accepted);
  const testimonialPermission = asBool(raw.testimonialPermission ?? raw.testimonial_permission);
  const lgpdContactConsent = asBool(raw.lgpdContactConsent ?? raw.lgpd_contact_consent);
  const eventName = eventNameFromPayload || `Evento em configuração - ${responsibleName || email || "novo contato"}`;

  return {
    eventType,
    eventName,
    responsibleName,
    email,
    whatsapp,
    state,
    city,
    guestsEstimate,
    eventDate,
    eventContext,
    observations,
    source,
    founderTermsAccepted,
    testimonialPermission,
    lgpdContactConsent,
    isMinimalLead: !eventNameFromPayload,
  };
}

async function getPresencaSolutionId() {
  const { data, error } = await supabaseAdmin.from("ae_solutions").select("id").eq("slug", "presenca-querida").maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function upsertAeClient(input: {
  eventType: string;
  eventName: string;
  eventSlug: string;
  email: string;
  whatsapp: string;
  city: string;
  state: string;
  observations: string;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin.from("ae_clients").select("id").eq("slug", input.eventSlug).maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabaseAdmin
    .from("ae_clients")
    .insert({
      client_type: `evento_${input.eventType}`,
      display_name: input.eventName,
      slug: input.eventSlug,
      email: input.email || null,
      whatsapp: input.whatsapp || null,
      city: input.city || null,
      state: input.state || null,
      status: "piloto",
      notes: input.observations || "Lead Presença Querida - cadastro mínimo para Cliente Fundador.",
      is_demo: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function upsertEvent(input: {
  eventType: string;
  eventName: string;
  eventSlug: string;
  email: string;
  whatsapp: string;
  city: string;
  state: string;
  eventDate: string | null;
  eventContext: string;
  observations: string;
  responsibleName: string;
  aeClientId: string | null;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin.from("pq_events").select("id").eq("slug", input.eventSlug).maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabaseAdmin
    .from("pq_events")
    .insert({
      ae_client_id: input.aeClientId,
      event_type: input.eventType,
      name: input.eventName,
      slug: input.eventSlug,
      host_name: input.responsibleName,
      event_date: input.eventDate,
      email: input.email || null,
      whatsapp: input.whatsapp || null,
      city: input.city || null,
      state: input.state || null,
      public_headline: "Confirme sua presença com carinho.",
      invitation_message:
        input.eventContext ||
        "Sua presença é muito importante. Confirme pelo link individual para ajudar na organização do evento.",
      status: "configuracao",
      is_surprise: input.eventType === "festa_surpresa",
      is_demo: false,
      notes: input.observations || "Evento criado automaticamente pelo cadastro mínimo Presença Querida.",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function getManagerRoleId() {
  const { data } = await supabaseAdmin
    .from("pq_roles")
    .select("id")
    .or("slug.eq.organizador,slug.eq.anfitriao,slug.eq.responsavel")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function upsertResponsiblePerson(input: {
  fullName: string;
  email: string;
  whatsapp: string;
  eventId: string;
  roleId: string | null;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin.from("pq_people").select("id, auth_user_id").eq("email", input.email).maybeSingle();
  if (existingError) throw existingError;

  let personId = existing?.id as string | undefined;
  let authUserId = existing?.auth_user_id as string | null | undefined;

  if (!personId) {
    const { data, error } = await supabaseAdmin
      .from("pq_people")
      .insert({
        full_name: input.fullName,
        email: input.email,
        whatsapp: input.whatsapp || null,
        person_type: "organizador",
        status: "ativo",
        notes: "Responsável criado automaticamente pelo interesse no Presença Querida.",
        is_demo: false,
      })
      .select("id, auth_user_id")
      .single();

    if (error) throw error;
    personId = data.id as string;
    authUserId = data.auth_user_id as string | null;
  }

  const { data: link } = await supabaseAdmin
    .from("pq_person_events")
    .select("id")
    .eq("person_id", personId)
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (!link?.id) {
    await supabaseAdmin.from("pq_person_events").insert({
      person_id: personId,
      event_id: input.eventId,
      role_id: input.roleId,
      is_manager: true,
      is_support: true,
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
      origem: "presenca_querida_cliente_fundador",
    },
  });

  if (error || !data.user?.id) {
    return { authUserId: null, temporaryPassword: null, reason: error?.message ?? "Usuário já pode existir." };
  }

  await supabaseAdmin.from("pq_people").update({ auth_user_id: data.user.id }).eq("id", input.personId);
  return { authUserId: data.user.id, temporaryPassword, reason: "Usuário Auth criado." };
}

async function ensureClientTerms(input: {
  eventId: string;
  solutionId: string | null;
  personId: string;
  accepted: boolean;
  testimonialPermission: boolean;
}) {
  if (!input.solutionId) return;

  const payload = {
    event_id: input.eventId,
    solution_id: input.solutionId,
    condition_label: "Cliente Fundador",
    contract_status: input.accepted ? "aceito" : "pendente_no_primeiro_acesso",
    fee_status: "em_definicao",
    setup_fee: 0,
    event_fee: 0,
    monthly_fee: 0,
    pilot_days: TRIAL_DAYS,
    allow_testimonial: input.testimonialPermission,
    allow_logo_use: false,
    allow_prints_use: input.testimonialPermission,
    terms_accepted: input.accepted,
    accepted_by_person_id: input.accepted ? input.personId : null,
    accepted_at: input.accepted ? new Date().toISOString() : null,
    notes:
      "Condição criada automaticamente pelo cadastro mínimo. Confirmar LGPD, Cliente Fundador, uso de prints/depoimento e escopo do evento no primeiro acesso.",
    is_active: true,
  };

  await supabaseAdmin.from("pq_client_terms").upsert(payload, { onConflict: "event_id,condition_label" });
}

function buildLeadReply(input: {
  responsibleName: string;
  eventName: string;
  email: string;
  leadId: string;
  loginUrl: string;
  temporaryPassword: string | null;
  founderTermsAccepted: boolean;
  accessEmailSent: boolean;
}) {
  const first = input.responsibleName.split(/\s+/)[0] || "tudo bem";
  return [
    `Olá, ${first}! Recebemos seu interesse no Presença Querida como Cliente Fundador.`,
    "",
    `Evento: ${input.eventName}`,
    `E-mail de acesso: ${input.email}`,
    input.accessEmailSent ? "Também enviamos as orientações para este e-mail." : "As orientações estão abaixo; se o e-mail automático não chegar, use este acesso inicial.",
    input.temporaryPassword ? `Senha temporária: ${input.temporaryPassword}` : "Se você já tiver senha, use sua senha atual. Se não lembrar, clique em Esqueci minha senha.",
    `Código do lead: ${input.leadId}`,
    "",
    "Link de acesso:",
    input.loginUrl,
    "",
    `Cliente Fundador: ${input.founderTermsAccepted ? "interesse confirmado" : "será confirmado no primeiro acesso"}`,
    "",
    "Próximo passo: entre no painel, complete os dados do evento, ajuste o convite, cadastre convidados e teste uma confirmação antes de enviar para todos.",
  ].join("\n");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PresencaLeadPayload;
  const input = mapPayload(body);

  if (!input.responsibleName || !input.email || !input.whatsapp) {
    return NextResponse.json({ error: "Informe nome do responsável, e-mail e WhatsApp." }, { status: 400 });
  }

  const now = new Date();
  const baseUrl = siteUrl();
  const loginUrl = `${baseUrl}/solucoes/presenca-querida/login`;
  const funilUrl = `${baseUrl}/admin/ae/presenca-querida/funil`;
  const eventSlugBase = toSlug(input.eventName) || `presenca-${Date.now()}`;
  const eventSlug = input.isMinimalLead ? `${eventSlugBase}-${Date.now()}` : eventSlugBase;
  const solutionId = await getPresencaSolutionId();

  const aeClientId = await upsertAeClient({
    eventType: input.eventType,
    eventName: input.eventName,
    eventSlug,
    email: input.email,
    whatsapp: input.whatsapp,
    city: input.city,
    state: input.state,
    observations: input.observations,
  });

  const eventId = await upsertEvent({
    eventType: input.eventType,
    eventName: input.eventName,
    eventSlug,
    email: input.email,
    whatsapp: input.whatsapp,
    city: input.city,
    state: input.state,
    eventDate: input.eventDate,
    eventContext: input.eventContext,
    observations: input.observations,
    responsibleName: input.responsibleName,
    aeClientId,
  });

  const roleId = await getManagerRoleId();
  const responsible = await upsertResponsiblePerson({
    fullName: input.responsibleName,
    email: input.email,
    whatsapp: input.whatsapp,
    eventId,
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
    eventId,
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
    .from("pq_leads")
    .insert({
      source: input.source,
      event_type: input.eventType,
      event_name: input.eventName,
      event_slug: eventSlug,
      responsible_name: input.responsibleName,
      email: input.email,
      whatsapp: input.whatsapp,
      state: input.state || null,
      city: input.city || null,
      guests_estimate: input.guestsEstimate,
      event_date: input.eventDate,
      event_context: input.eventContext || null,
      observations:
        input.observations ||
        (input.isMinimalLead ? "Cadastro mínimo pelo formulário Quero Conhecer. Cliente deve completar dados do evento no primeiro acesso." : null),
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
      event_id: eventId,
      responsible_person_id: responsible.personId,
      auth_user_id: authUserId,
      notes:
        input.isMinimalLead
          ? "Lead criado automaticamente pelo cadastro mínimo Presença Querida. Dados do evento, LGPD e Cliente Fundador serão confirmados na área logada."
          : "Lead criado automaticamente pelo webhook/formulário Presença Querida.",
    })
    .select("id")
    .single();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  const accessEmail = await sendPresencaLeadAccessEmail({
    responsibleName: input.responsibleName,
    email: input.email,
    eventName: input.eventName,
    eventType: formatPresencaEventType(input.eventType),
    city: input.city,
    state: input.state,
    loginUrl,
    temporaryPassword,
    trialDays: TRIAL_DAYS,
    isMinimalLead: input.isMinimalLead,
  });

  if (accessEmail.sent) {
    await supabaseAdmin
      .from("pq_leads")
      .update({ access_sent_at: new Date().toISOString(), status: "email_acesso_enviado" })
      .eq("id", lead.id);
  }

  const internalEmail = await sendPresencaLeadInternalEmail({
    leadId: lead.id,
    responsibleName: input.responsibleName,
    email: input.email,
    whatsapp: input.whatsapp,
    eventName: input.eventName,
    eventType: formatPresencaEventType(input.eventType),
    city: input.city,
    state: input.state,
    guestsEstimate: input.guestsEstimate,
    eventDate: input.eventDate,
    eventContext: input.eventContext,
    observations: input.observations,
    loginUrl,
    temporaryPassword,
    trialDays: TRIAL_DAYS,
    accessDueAt,
    funilUrl,
    source: input.source,
  });

  const leadReply = buildLeadReply({
    responsibleName: input.responsibleName,
    eventName: input.eventName,
    email: input.email,
    leadId: lead.id,
    loginUrl,
    temporaryPassword,
    founderTermsAccepted: input.founderTermsAccepted,
    accessEmailSent: accessEmail.sent,
  });

  const internalAlertMessage = `Novo lead Presença Querida
Contato: ${input.responsibleName}
WhatsApp: ${input.whatsapp}
E-mail: ${input.email}
Status: ${accessEmail.sent ? "acesso enviado" : "verificar e-mail/acesso"}
Evento: ${input.eventName}
Tipo: ${formatPresencaEventType(input.eventType)}
Convidados estimados: ${input.guestsEstimate ?? "não informado"}
Funil: ${funilUrl}`;

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    eventId,
    eventSlug,
    accessEmail: input.email,
    responsibleName: input.responsibleName,
    eventName: input.eventName,
    eventType: formatPresencaEventType(input.eventType),
    temporaryPasswordCreated: Boolean(temporaryPassword),
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
