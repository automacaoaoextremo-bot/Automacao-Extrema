import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_INTERNAL_EMAIL = "automacao.ao.extremo@gmail.com";
const DEFAULT_MODULES = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

type AccessBody = {
  action?: string;
  identifier?: string;
  fullName?: string;
  whatsapp?: string;
  email?: string;
  password?: string;
  notes?: string;
  functionSlugs?: string[];
  agendaSlugs?: string[];
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

type MembershipRow = {
  id: string;
  person_id: string;
  role_id: string | null;
  module_slugs: string[] | null;
  active: boolean | null;
  status: string | null;
  agenda_viva_profile?: Record<string, unknown> | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function onlyDigits(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function asTextList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeProfile(current: unknown, patch: Record<string, unknown>) {
  const base = current && typeof current === "object" && !Array.isArray(current) ? (current as Record<string, unknown>) : {};
  return { ...base, ...patch };
}

function buildTucxaProfile(functionSlugs: string[], agendaSlugs: string[], notes: string) {
  const hasFunction = (slug: string) => functionSlugs.includes(slug);
  const hasAgenda = (slug: string) => agendaSlugs.includes(slug);
  const isLeadership = ["administrador-sistema", "coordenacao", "diretoria", "presidente", "coordenacao-grupo-estudos", "coordenacao-clube-livro", "coordenacao-sementinha", "coordenacao-eventos"].some(hasFunction);

  return {
    involvementFunctions: functionSlugs,
    involvementAgenda: agendaSlugs,
    functionSlugs,
    agendaSlugs,
    isFilhoDaCorrente: true,
    onlyFilhoDaCorrente: functionSlugs.length === 0,
    isCavalinho: hasFunction("cavalinho"),
    coordinatesStudyGroup: hasFunction("coordenacao-grupo-estudos"),
    coordinatesBookClub: hasFunction("coordenacao-clube-livro"),
    coordinatesSementinha: hasFunction("coordenacao-sementinha"),
    volunteersSementinha: hasFunction("voluntario-sementinha"),
    coordinatesEvents: hasFunction("coordenacao-eventos"),
    volunteersEvents: hasFunction("voluntario-eventos"),
    isCambono: hasFunction("cambono") || hasFunction("cambono-volante-reserva"),
    isReserveCambono: hasFunction("cambono-volante-reserva"),
    supportsReception: hasFunction("recepcao") || hasFunction("apoia-recepcao"),
    supportsOrganization: hasFunction("organizacao") || hasFunction("apoia-organizacao") || hasFunction("coordenacao-eventos") || hasFunction("voluntario-eventos") || hasAgenda("organizacao-eventos"),
    participatesMonday: hasAgenda("atendimento-segunda"),
    participatesTuesday: hasAgenda("atendimento-terca"),
    participatesWednesday: hasAgenda("atendimento-quarta"),
    participatesThursday: hasAgenda("quinta-grupo-1") || hasAgenda("quinta-grupo-2") || hasAgenda("quinta-grupo-1-e-2"),
    thursdayGroup: hasAgenda("quinta-grupo-1-e-2") ? "ambos" : hasAgenda("quinta-grupo-1") ? "grupo-1" : hasAgenda("quinta-grupo-2") ? "grupo-2" : "",
    canApproveEvents: isLeadership,
    canEditCalendar: isLeadership || hasFunction("organizacao") || hasFunction("coordenacao-eventos") || hasAgenda("organizacao-eventos"),
    canViewReports: isLeadership || hasFunction("tesouraria-financeiro"),
    attendanceNotes: notes,
  };
}

function profileArray(profile: Record<string, unknown> | null | undefined, key: string) {
  const value = profile?.[key];
  return Array.isArray(value) ? value.map((item) => asText(item)).filter(Boolean) : [];
}

function normalizeEmail(value: unknown) {
  return asText(value).toLowerCase();
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function internalEmail() {
  return process.env.OH_ACCESS_REVIEW_EMAIL || process.env.EMAIL_COPY_TO || DEFAULT_INTERNAL_EMAIL;
}

function firstName(value: string | null | undefined) {
  return String(value ?? "").trim().split(/\s+/)[0] || "irmão(ã)";
}

function syntheticEmailFromPhone(phone: string) {
  return `tucxa-${phone}@organizacao-em-harmonia.local`;
}

function displayEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.endsWith("@organizacao-em-harmonia.local") ? "" : email;
}

function phoneCandidates(rawPhone: string) {
  const digits = onlyDigits(rawPhone);
  if (!digits) return [];
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const last11 = digits.length > 11 ? digits.slice(-11) : digits;
  return Array.from(new Set([digits, withoutCountry, last11, `55${withoutCountry}`, `55${last11}`].filter(Boolean)));
}

function whatsappUrl(phone: string | null | undefined, message: string) {
  const digits = onlyDigits(phone ?? "");
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

async function sendEmail(input: { to: string; subject: string; text: string; html?: string; cc?: string }) {
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
    html: input.html,
  });

  return { skipped: false };
}

async function findTucxaOrganization() {
  const { data: bySlug, error: slugError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug, email, whatsapp")
    .eq("slug", "tucxa")
    .maybeSingle();

  if (slugError) throw slugError;
  if (bySlug?.id) return bySlug;

  const { data: byName, error: nameError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug, email, whatsapp")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (nameError) throw nameError;
  if (byName?.id) return byName;

  const { data: first, error: firstError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug, email, whatsapp")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstError) throw firstError;
  if (!first?.id) throw new Error("Organização Tucxa não localizada. Cadastre a organização antes de liberar o primeiro acesso.");
  return first;
}

async function findPersonByIdentifier(organizationId: string, identifier: string) {
  const email = normalizeEmail(identifier);
  const phone = onlyDigits(identifier);

  if (email.includes("@")) {
    const { data, error } = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active, notes, auth_user_id")
      .eq("organization_id", organizationId)
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as PersonRow;
  }

  const candidates = phoneCandidates(phone);
  if (candidates.length === 0) return null;

  const { data: exact, error: exactError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, active, notes, auth_user_id")
    .eq("organization_id", organizationId)
    .in("whatsapp", candidates)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exactError) throw exactError;
  if (exact) return exact as PersonRow;

  const last11 = candidates.find((candidate) => candidate.length === 11) ?? candidates[0];
  const { data: partial, error: partialError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, active, notes, auth_user_id")
    .eq("organization_id", organizationId)
    .ilike("whatsapp", `%${last11.slice(-8)}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (partialError) throw partialError;
  return partial as PersonRow | null;
}

async function membershipFor(organizationId: string, personId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, person_id, role_id, module_slugs, active, status, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as MembershipRow | null;
}

async function defaultRoleId(organizationId: string) {
  const { data } = await supabaseAdmin
    .from("oh_roles")
    .select("id")
    .eq("organization_id", organizationId)
    .in("slug", ["filho-da-corrente", "filha-da-corrente", "membro", "envolvido"])
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function ensureAuthUser(input: { person: PersonRow; emailForAuth: string; password: string; fullName: string; whatsapp: string; organizationId: string }) {
  if (input.person.auth_user_id) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(input.person.auth_user_id, {
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        whatsapp: input.whatsapp,
        organization_id: input.organizationId,
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

async function sendInternalReviewEmail(input: {
  organizationName: string;
  fullName: string;
  whatsapp: string;
  email: string;
  status: string;
  loginIdentifier: string;
  notes: string;
}) {
  const loginUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente`;
  const subject = `[Organização em Harmonia] Novo cadastro para validar - ${input.fullName}`;
  const text = [
    "Novo cadastro/validação de Filho da Corrente aguardando conferência.",
    "",
    `Organização: ${input.organizationName}`,
    `Nome: ${input.fullName}`,
    `WhatsApp: ${input.whatsapp}`,
    `E-mail informado: ${input.email || "não informado"}`,
    `Identificador de acesso: ${input.loginIdentifier}`,
    `Status atual: ${input.status}`,
    input.notes ? `Observações: ${input.notes}` : "Observações: não informado",
    "",
    "Próximo passo: acessar Base Única > Envolvidos, conferir os dados e usar Aprovar acesso ou Solicitar ajuste.",
    loginUrl,
  ].join("\n");

  await sendEmail({ to: internalEmail(), subject, text, cc: internalEmail() });
}

function publicPerson(person: PersonRow | null, membership: MembershipRow | null) {
  if (!person) return null;
  const profile = membership?.agenda_viva_profile ?? null;
  return {
    id: person.id,
    fullName: person.full_name ?? "",
    whatsapp: person.whatsapp ?? "",
    email: displayEmail(person.email),
    notes: person.notes ?? "",
    accessStatus: membership?.status ?? (person.active === false ? "pendente_validacao" : "ativo"),
    modules: membership?.module_slugs ?? DEFAULT_MODULES,
    profile: {
      functionSlugs: profileArray(profile, "functionSlugs").length ? profileArray(profile, "functionSlugs") : profileArray(profile, "involvementFunctions"),
      agendaSlugs: profileArray(profile, "agendaSlugs").length ? profileArray(profile, "agendaSlugs") : profileArray(profile, "involvementAgenda"),
    },
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "organizacao-em-harmonia-filhos-corrente-acesso",
    expectedActions: ["lookup", "resolve-login", "submit"],
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AccessBody;
    const action = asText(body.action) || "submit";
    const organization = await findTucxaOrganization();

    if (action === "lookup") {
      const identifier = asText(body.identifier || body.whatsapp || body.email);
      if (!identifier) return NextResponse.json({ error: "Informe WhatsApp ou e-mail para localizar seu cadastro." }, { status: 400 });
      const person = await findPersonByIdentifier(organization.id, identifier);
      const membership = person?.id ? await membershipFor(organization.id, person.id) : null;
      return NextResponse.json({
        ok: true,
        found: Boolean(person),
        organizationName: organization.name,
        person: publicPerson(person, membership),
      });
    }

    if (action === "resolve-login") {
      const identifier = asText(body.identifier);
      if (!identifier) return NextResponse.json({ error: "Informe e-mail ou WhatsApp para acessar." }, { status: 400 });
      const person = await findPersonByIdentifier(organization.id, identifier);
      if (!person?.email) {
        return NextResponse.json({ error: "Cadastro ainda não localizado. Toque em 'Primeiro acesso' para confirmar seus dados." }, { status: 404 });
      }
      const membership = await membershipFor(organization.id, person.id);
      if (membership && membership.active === false) {
        return NextResponse.json({ error: "Seu cadastro foi recebido e aguarda conferência do responsável do Tucxa antes da liberação." }, { status: 403 });
      }
      if (person.active === false) {
        return NextResponse.json({ error: "Seu cadastro ainda aguarda validação do responsável do Tucxa." }, { status: 403 });
      }
      return NextResponse.json({ ok: true, authEmail: person.email, displayEmail: displayEmail(person.email), accessStatus: membership?.status ?? "ativo" });
    }

    const fullName = asText(body.fullName);
    const whatsapp = onlyDigits(body.whatsapp);
    const email = normalizeEmail(body.email);
    const password = asText(body.password);
    const notes = asText(body.notes);
    const functionSlugs = asTextList(body.functionSlugs);
    const agendaSlugs = asTextList(body.agendaSlugs);

    if (!fullName) return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
    if (whatsapp.length < 10) return NextResponse.json({ error: "Informe o WhatsApp com DDD." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Crie uma senha com pelo menos 8 caracteres." }, { status: 400 });
    if (email && !email.includes("@")) return NextResponse.json({ error: "Confira o e-mail informado ou deixe o campo em branco." }, { status: 400 });

    const existingByPhone = await findPersonByIdentifier(organization.id, whatsapp);
    const existingByEmail = email ? await findPersonByIdentifier(organization.id, email) : null;
    const existing = existingByPhone ?? existingByEmail;
    const emailForAuth = email || existing?.email || syntheticEmailFromPhone(whatsapp);

    let personId = existing?.id ?? "";
    let authUserId = existing?.auth_user_id ?? null;

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("oh_people")
        .update({
          full_name: fullName,
          email: emailForAuth,
          whatsapp,
          active: false,
          notes: notes || existing.notes || "Cadastro atualizado pelo primeiro acesso. Aguardando validação do responsável do Tucxa.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseAdmin
        .from("oh_people")
        .insert({
          organization_id: organization.id,
          full_name: fullName,
          email: emailForAuth,
          whatsapp,
          active: false,
          notes: notes || "Cadastro criado pelo primeiro acesso. Aguardando validação do responsável do Tucxa.",
        })
        .select("id")
        .single();
      if (error) throw error;
      personId = data.id as string;
    }

    const currentPerson: PersonRow = {
      id: personId,
      full_name: fullName,
      email: emailForAuth,
      whatsapp,
      active: false,
      notes,
      auth_user_id: authUserId,
    };

    authUserId = await ensureAuthUser({ person: currentPerson, emailForAuth, password, fullName, whatsapp, organizationId: organization.id });

    const { error: personAuthError } = await supabaseAdmin
      .from("oh_people")
      .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
      .eq("id", personId);
    if (personAuthError) throw personAuthError;

    const roleId = await defaultRoleId(organization.id);
    const membership = await membershipFor(organization.id, personId);
    const submittedProfile = buildTucxaProfile(functionSlugs, agendaSlugs, notes);
    const membershipPayload = {
      organization_id: organization.id,
      person_id: personId,
      role_id: membership?.role_id ?? roleId,
      module_slugs: DEFAULT_MODULES,
      active: false,
      status: "pendente_validacao",
      is_main_contact: false,
      can_receive_notifications: Boolean(email || whatsapp),
      agenda_viva_profile: mergeProfile(membership?.agenda_viva_profile, submittedProfile),
      updated_at: new Date().toISOString(),
    };

    if (membership?.id) {
      const { error } = await supabaseAdmin.from("oh_memberships").update(membershipPayload).eq("id", membership.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("oh_memberships").insert(membershipPayload);
      if (error) throw error;
    }

    await sendInternalReviewEmail({
      organizationName: organization.name || "Tucxa",
      fullName,
      whatsapp,
      email,
      status: "pendente_validacao",
      loginIdentifier: email || whatsapp,
      notes: [
        notes,
        functionSlugs.length ? `Funções adicionais selecionadas: ${functionSlugs.join(", ")}` : "Funções adicionais selecionadas: nenhuma — somente Filho da Corrente",
        agendaSlugs.length ? `Agenda selecionada: ${agendaSlugs.join(", ")}` : "Agenda selecionada: não informado",
      ].filter(Boolean).join("\n"),
    });

    const waMessage = [
      `Olá, ${firstName(fullName)}. Recebemos sua confirmação de dados na Organização em Harmonia do Tucxa.`,
      "",
      "O responsável do Tucxa irá conferir as informações e liberar o acesso com as orientações de uso.",
      "",
      "Enquanto isso, não precisa refazer o cadastro. Se algum dado estiver incorreto, responda esta mensagem.",
    ].join("\n");

    return NextResponse.json({
      ok: true,
      status: "pendente_validacao",
      message: "Cadastro recebido. O responsável do Tucxa irá conferir seus dados e liberar o acesso.",
      loginIdentifier: email || whatsapp,
      whatsappUrl: whatsappUrl(whatsapp, waMessage),
      person: publicPerson(
        { ...currentPerson, email: emailForAuth, auth_user_id: authUserId },
        {
          ...(membership ?? { id: "", person_id: personId, role_id: roleId, module_slugs: DEFAULT_MODULES }),
          active: false,
          status: "pendente_validacao",
          agenda_viva_profile: submittedProfile,
        },
      ),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao validar cadastro." }, { status: 500 });
  }
}
