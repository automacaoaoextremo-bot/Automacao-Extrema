import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_INTERNAL_EMAIL = "automacao.ao.extremo@gmail.com";
const CONSULENTE_MODULES = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

type ConsulenteBody = {
  action?: string;
  requestType?: string;
  identifier?: string;
  name?: string;
  whatsapp?: string;
  email?: string;
  password?: string;
  contributionMode?: string;
  preferredDay?: string;
  notes?: string;
  statusToken?: string;
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

function internalEmail() {
  return process.env.OH_ACCESS_REVIEW_EMAIL || process.env.OH_CONSULENTE_REVIEW_EMAIL || process.env.EMAIL_COPY_TO || DEFAULT_INTERNAL_EMAIL;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function statusUrl(token: string) {
  return `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/consulente/status?token=${encodeURIComponent(token)}`;
}

function obrigadoUrl(token: string, whatsappLink: string) {
  const params = new URLSearchParams({ token });
  if (whatsappLink) params.set("whatsapp", whatsappLink);
  return `/solucoes/organizacao-em-harmonia/tucxa/consulente/obrigado?${params.toString()}`;
}

function syntheticEmailFromPhone(phone: string) {
  return `tucxa-consulente-${phone}@organizacao-em-harmonia.local`;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

function whatsappUrl(phone: string, message: string) {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function phoneCandidates(rawPhone: string) {
  const digits = onlyDigits(rawPhone);
  if (!digits) return [];
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const last11 = digits.length > 11 ? digits.slice(-11) : digits;
  return Array.from(new Set([digits, withoutCountry, last11, `55${withoutCountry}`, `55${last11}`].filter(Boolean)));
}

async function sendEmail(input: { to: string; subject: string; text: string; cc?: string }) {
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

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Automação Extrema"}" <${process.env.EMAIL_FROM}>`,
    to: input.to,
    cc: input.cc || internalEmail(),
    subject: input.subject,
    text: input.text,
  });

  return { skipped: false };
}

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return bySlug.id as string;

  const { data: byName } = await supabaseAdmin.from("oh_organizations").select("id").ilike("name", "%tucxa%").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (byName?.id) return byName.id as string;

  return null;
}


async function findApprovalResponsible(organizationId: string, requestType: string) {
  const fallback = { email: internalEmail(), whatsapp: process.env.TUCXA_PUBLIC_WHATSAPP || process.env.AE_INTERNAL_WHATSAPP || "", name: "Responsável pela validação" };

  const { data } = await supabaseAdmin
    .from("oh_approval_rules")
    .select("responsible_person_id, fallback_email, fallback_whatsapp, label, active")
    .eq("organization_id", organizationId)
    .eq("scope", requestType)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rule = data as { responsible_person_id?: string | null; fallback_email?: string | null; fallback_whatsapp?: string | null; label?: string | null } | null;

  if (rule?.responsible_person_id) {
    const { data: person } = await supabaseAdmin
      .from("oh_people")
      .select("full_name, email, whatsapp")
      .eq("id", rule.responsible_person_id)
      .maybeSingle();

    if (person) {
      const candidate = person as { full_name?: string | null; email?: string | null; whatsapp?: string | null };
      return {
        email: candidate.email || rule.fallback_email || fallback.email,
        whatsapp: candidate.whatsapp || rule.fallback_whatsapp || fallback.whatsapp,
        name: candidate.full_name || rule.label || fallback.name,
      };
    }
  }

  return {
    email: rule?.fallback_email || fallback.email,
    whatsapp: rule?.fallback_whatsapp || fallback.whatsapp,
    name: rule?.label || fallback.name,
  };
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

async function defaultConsulenteRoleId(organizationId: string) {
  const { data } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .in("slug", ["consulente", "filho-de-fora", "visitante", "membro"])
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
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
        oh_profile: "consulente",
        oh_access_status: "pending_review",
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
      oh_profile: "consulente",
      oh_access_status: "pending_review",
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      const { data: found } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const user = found.users.find((item: { email?: string | null; id: string; user_metadata?: Record<string, unknown> }) => item.email?.toLowerCase() === input.emailForAuth.toLowerCase());
      if (user?.id) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: input.password,
          email_confirm: true,
          user_metadata: {
            ...(user.user_metadata ?? {}),
            full_name: input.fullName,
            whatsapp: input.whatsapp,
            organization_id: input.organizationId,
            oh_profile: "consulente",
            oh_access_status: "pending_review",
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

async function membershipFor(organizationId: string, personId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string } | null;
}

async function savePublicRequest(body: Required<ConsulenteBody>, options?: { statusToken?: string; personId?: string; statusUrl?: string }) {
  const organizationId = await findTucxaOrganizationId();
  if (!organizationId) return null;

  const payload = {
    organization_id: organizationId,
    source: "site-tucxa",
    request_type: body.requestType,
    full_name: body.name || null,
    whatsapp: onlyDigits(body.whatsapp) || null,
    email: body.email || null,
    contribution_mode: body.contributionMode || null,
    preferred_day: body.preferredDay || null,
    notes: body.notes || null,
    status: "novo",
    status_tracking_token: options?.statusToken || null,
    person_id: options?.personId || null,
    metadata: {
      publicStatusUrl: options?.statusUrl || null,
      modules: CONSULENTE_MODULES,
      submittedAt: new Date().toISOString(),
    },
  };

  const { data } = await supabaseAdmin.from("oh_public_site_requests").insert(payload).select("id, status_tracking_token").single();
  return data as { id: string; status_tracking_token: string | null } | null;
}

async function submitCadastro(body: Required<ConsulenteBody>) {
  const organizationId = await findTucxaOrganizationId();
  if (!organizationId) throw new Error("Organização Tucxa não localizada na Base Única.");

  const whatsapp = onlyDigits(body.whatsapp);
  const email = normalizeEmail(body.email);
  const emailForAuth = email || syntheticEmailFromPhone(whatsapp);
  const existingByPhone = await findPersonByIdentifier(organizationId, whatsapp);
  const existingByEmail = email ? await findPersonByIdentifier(organizationId, email) : null;
  const existing = existingByPhone ?? existingByEmail;

  let personId = existing?.id ?? "";
  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("oh_people")
      .update({
        full_name: body.name,
        email: emailForAuth,
        whatsapp,
        active: false,
        notes: "Cadastro de consulente/filho de fora atualizado pelo site do Tucxa. Aguardando validação.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { data, error } = await supabaseAdmin
      .from("oh_people")
      .insert({
        organization_id: organizationId,
        full_name: body.name,
        email: emailForAuth,
        whatsapp,
        active: false,
        notes: "Cadastro de consulente/filho de fora criado pelo site do Tucxa. Aguardando validação.",
      })
      .select("id")
      .single();
    if (error) throw error;
    personId = data.id as string;
  }

  const authUserId = await ensureAuthUser({ person: existing, emailForAuth, password: body.password, fullName: body.name, whatsapp, organizationId });
  const { error: personAuthError } = await supabaseAdmin.from("oh_people").update({ auth_user_id: authUserId, updated_at: new Date().toISOString() }).eq("id", personId);
  if (personAuthError) throw personAuthError;

  const roleId = await defaultConsulenteRoleId(organizationId);
  const membership = await membershipFor(organizationId, personId);
  const payload = {
    organization_id: organizationId,
    person_id: personId,
    role_id: roleId,
    module_slugs: CONSULENTE_MODULES,
    active: false,
    status: "pendente_validacao",
    is_main_contact: false,
    can_receive_notifications: Boolean(email || whatsapp),
    agenda_viva_profile: {
      publico: "consulente-filho-de-fora",
      canScheduleAttendance: true,
      canContributeIdentified: true,
      preferredContact: email ? "email-whatsapp" : "whatsapp",
    },
    updated_at: new Date().toISOString(),
  };

  if (membership?.id) {
    const { error } = await supabaseAdmin.from("oh_memberships").update(payload).eq("id", membership.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from("oh_memberships").insert(payload);
    if (error) throw error;
  }

  return { organizationId, emailForAuth, personId };
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "organizacao-em-harmonia-site-tucxa-consulentes" });
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => ({}))) as ConsulenteBody;
    const body: Required<ConsulenteBody> = {
      action: asText(raw.action) || "request",
      requestType: asText(raw.requestType) || "atendimento",
      identifier: asText(raw.identifier),
      name: asText(raw.name),
      whatsapp: asText(raw.whatsapp),
      email: normalizeEmail(raw.email),
      password: asText(raw.password),
      contributionMode: asText(raw.contributionMode),
      preferredDay: asText(raw.preferredDay),
      notes: asText(raw.notes),
      statusToken: asText(raw.statusToken),
    };

    if (body.action === "resolve-login") {
      const organizationId = await findTucxaOrganizationId();
      if (!organizationId) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });
      const person = await findPersonByIdentifier(organizationId, body.identifier);
      if (!person?.email) return NextResponse.json({ error: "Cadastro não localizado. Faça o primeiro cadastro ou aguarde validação." }, { status: 404 });
      return NextResponse.json({ ok: true, authEmail: person.email });
    }

    if (body.action === "submit-cadastro") {
      const whatsapp = onlyDigits(body.whatsapp);
      if (!body.name) return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
      if (whatsapp.length < 10) return NextResponse.json({ error: "Informe o celular com WhatsApp e DDD." }, { status: 400 });
      if (body.email && !body.email.includes("@")) return NextResponse.json({ error: "Confira o e-mail informado ou deixe em branco." }, { status: 400 });
      if (body.password.length < 8) return NextResponse.json({ error: "Crie uma senha com pelo menos 8 caracteres." }, { status: 400 });

      const token = body.statusToken || crypto.randomUUID();
      const publicStatusUrl = statusUrl(token);
      const saved = await submitCadastro(body);
      await savePublicRequest({ ...body, whatsapp }, { statusToken: token, personId: saved.personId, statusUrl: publicStatusUrl }).catch(() => undefined);

      const responsible = await findApprovalResponsible(saved.organizationId, "consulente-cadastro").catch(() => ({ email: internalEmail(), whatsapp: process.env.TUCXA_PUBLIC_WHATSAPP || "", name: "Responsável pela validação" }));
      const subject = `[Tucxa] Novo cadastro de consulente - ${body.name}`;
      const text = [
        "Novo cadastro de Consulente / Filho de Fora recebido pelo site do Tucxa.",
        "",
        `Nome: ${body.name}`,
        `WhatsApp: ${whatsapp}`,
        `E-mail: ${body.email || "não informado"}`,
        "Senha: cadastrada no Supabase Auth e não enviada por e-mail.",
        "Status: aguardando validação da organização do Tucxa.",
        `Responsável sugerido: ${responsible.name}`,
        "",
        "Link de acompanhamento do consulente:",
        publicStatusUrl,
        "",
        `Origem: ${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro`,
      ].join("\n");

      await sendEmail({ to: responsible.email || internalEmail(), subject, text, cc: internalEmail() });

      if (body.email) {
        const userSubject = "[Tucxa] Recebemos seu cadastro para validação";
        const userText = [
          `Olá, ${body.name}.`,
          "",
          "Recebemos seu cadastro como Consulente / Filho de Fora no site do Tucxa.",
          "Agora a organização irá conferir seus dados e liberar o acesso aos módulos Atendimento em Harmonia, Agenda Viva e Corrente em Dia.",
          "",
          "Guarde este link para acompanhar a aprovação:",
          publicStatusUrl,
          "",
          "O retorno também será feito pelo WhatsApp informado.",
        ].join("\n");
        await sendEmail({ to: body.email, subject: userSubject, text: userText, cc: internalEmail() });
      }

      const waMessage = [
        "Olá. Fiz meu cadastro como Consulente / Filho de Fora pelo site do Tucxa.",
        `Nome: ${body.name}`,
        "Aguardo a validação e as orientações para acessar meus agendamentos ou contribuições.",
        "",
        "Meu link de acompanhamento:",
        publicStatusUrl,
      ].join("\n");
      const waUrl = whatsappUrl(process.env.TUCXA_PUBLIC_WHATSAPP || whatsapp, waMessage);

      return NextResponse.json({
        ok: true,
        message: "Cadastro recebido. A organização do Tucxa irá validar seus dados e retornar pelo WhatsApp informado e e-mail, caso tenha sido preenchido.",
        statusUrl: publicStatusUrl,
        redirectUrl: obrigadoUrl(token, waUrl),
        whatsappUrl: waUrl,
      });
    }

    if (body.requestType !== "contribuicao-anonima" && !body.name) {
      return NextResponse.json({ error: "Informe seu nome ou escolha contribuição anônima." }, { status: 400 });
    }
    if (body.requestType !== "contribuicao-anonima" && !body.whatsapp && !body.email) {
      return NextResponse.json({ error: "Informe WhatsApp ou e-mail para retorno, se necessário." }, { status: 400 });
    }
    if (body.email && !body.email.includes("@")) {
      return NextResponse.json({ error: "Confira o e-mail informado." }, { status: 400 });
    }

    await savePublicRequest(body).catch(() => undefined);

    const subject = `[Tucxa] Novo contato de consulente - ${body.name || "contribuição anônima"}`;
    const text = [
      "Novo contato recebido pelo site específico do Tucxa.",
      "",
      `Tipo: ${body.requestType}`,
      `Nome: ${body.name || "não informado / anônimo"}`,
      `WhatsApp: ${body.whatsapp || "não informado"}`,
      `E-mail: ${body.email || "não informado"}`,
      `Contribuição: ${body.contributionMode || "não informado"}`,
      `Preferência de dia: ${body.preferredDay || "sem preferência"}`,
      body.notes ? `Mensagem: ${body.notes}` : "Mensagem: não informada",
      "",
      `Origem: ${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/consulente/cadastro`,
    ].join("\n");

    await sendEmail({ to: internalEmail(), subject, text, cc: internalEmail() });

    const waMessage = [
      "Olá. Enviei meus dados pelo site do Tucxa.",
      `Tipo: ${body.requestType}`,
      body.name ? `Nome: ${body.name}` : "Contribuição anônima",
      body.notes ? `Mensagem: ${body.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({
      ok: true,
      message: "Recebemos suas informações. A organização do Tucxa dará sequência conforme a necessidade.",
      whatsappUrl: whatsappUrl(process.env.TUCXA_PUBLIC_WHATSAPP || body.whatsapp, waMessage),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao registrar contato." }, { status: 500 });
  }
}
