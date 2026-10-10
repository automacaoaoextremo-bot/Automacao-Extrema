import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  profileHasCavalinho,
  profileHasReception,
} from "@/lib/organizacao-em-harmonia/appointment-permissions";
import {
  findTucxaOrganization,
  loadPilotSettings,
} from "@/lib/organizacao-em-harmonia/tucxa-appointment-pilot";

export const dynamic = "force-dynamic";

const CONSULENTE_PANEL = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel";
const CONSULENTE_APPOINTMENT = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/agendamento-piloto";
const FILHO_PANEL = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";
const RECEPTION_APPOINTMENT = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto";
const CAVALINHO_DESTINATION = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/entidades";

type BaseKind = "filho-da-corrente" | "consulente";
type OperationalKind = "recepcao" | "cavalinho" | null;
type RolloutStage = "reception" | "consulente" | "all";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function onlyDigits(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function phoneCandidates(value: unknown) {
  const digits = onlyDigits(value);
  if (!digits) return [];
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const last11 = digits.length > 11 ? digits.slice(-11) : digits;
  return Array.from(new Set([digits, withoutCountry, last11, `55${withoutCountry}`, `55${last11}`].filter(Boolean)));
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function syntheticEmail(email: string) {
  return email.endsWith("@organizacao-em-harmonia.local");
}

function normalizeToken(value: unknown) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalPhone(value: unknown) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  return withoutCountry.length > 11 ? withoutCountry.slice(-11) : withoutCountry;
}

function profileSuggestsConsulente(profile: Record<string, unknown>) {
  const text = [profile.accessType, profile.publico, profile.pilotAccessKind]
    .map(asText)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return text.includes("consulente") || text.includes("filho-de-fora") || text.includes("filho de fora");
}

function operationalKind(profile: Record<string, unknown>): OperationalKind {
  if (profileHasReception(profile)) return "recepcao";
  if (profileHasCavalinho(profile)) return "cavalinho";
  return null;
}

function defaultDestination(
  baseKind: BaseKind,
  profile: Record<string, unknown>,
  context: string,
  rolloutStage: RolloutStage = "all",
) {
  if (context === "portal") {
    return baseKind === "consulente" ? CONSULENTE_PANEL : FILHO_PANEL;
  }

  if (baseKind === "consulente") {
    return rolloutStage === "consulente" || rolloutStage === "all"
      ? CONSULENTE_APPOINTMENT
      : CONSULENTE_PANEL;
  }

  const operation = operationalKind(profile);
  if (operation === "recepcao") return RECEPTION_APPOINTMENT;
  if (operation === "cavalinho" && rolloutStage === "all") return CAVALINHO_DESTINATION;
  return FILHO_PANEL;
}

async function resolveBaseKind(input: {
  organizationId: string;
  membership: { role_id?: string | null; agenda_viva_profile?: unknown };
  authUser?: { user_metadata?: Record<string, unknown> | null } | null;
}) : Promise<BaseKind> {
  const authProfile = normalizeToken(input.authUser?.user_metadata?.oh_profile);
  if (authProfile.includes("consulente") || authProfile.includes("filho-de-fora")) return "consulente";
  if (authProfile.includes("filho-da-corrente") || authProfile.includes("filho-corrente")) return "filho-da-corrente";

  const profile = asRecord(input.membership.agenda_viva_profile);
  if (profileSuggestsConsulente(profile)) return "consulente";

  const roleId = asText(input.membership.role_id);
  if (roleId) {
    const { data: role, error: roleError } = await supabaseAdmin
      .from("oh_roles")
      .select("slug, name")
      .eq("organization_id", input.organizationId)
      .eq("id", roleId)
      .maybeSingle();
    if (roleError) throw roleError;

    const roleToken = normalizeToken(`${asText(role?.slug)} ${asText(role?.name)}`);
    if (roleToken.includes("consulente") || roleToken.includes("filho-de-fora") || roleToken.includes("visitante")) {
      return "consulente";
    }
    if (roleToken.includes("filho-da-corrente") || roleToken.includes("filho-corrente")) {
      return "filho-da-corrente";
    }
  }

  return "filho-da-corrente";
}

async function findPersonByIdentifier(organizationId: string, identifier: string) {
  const value = asText(identifier);
  if (!value) return null;

  const selectColumns =
    "id, full_name, email, notification_email, whatsapp, auth_user_id, active, registration_source, privacy_notice_accepted_at";

  if (value.includes("@")) {
    const normalizedEmail = value.toLowerCase();
    const { data, error } = await supabaseAdmin
      .from("oh_people")
      .select(selectColumns)
      .eq("organization_id", organizationId)
      .or(`email.ilike.${normalizedEmail},notification_email.ilike.${normalizedEmail}`)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(5);
    if (error) throw error;

    const unique = Array.from(new Map((data ?? []).map((item) => [String(item.id), item])).values());
    if (unique.length > 1) {
      throw new Error("Mais de um cadastro ativo usa este e-mail. Entre com o WhatsApp ou procure a administração do Tucxa.");
    }
    return unique[0] ?? null;
  }

  const wantedPhone = canonicalPhone(value);
  if (!wantedPhone || wantedPhone.length < 10) return null;

  const candidates = phoneCandidates(value);
  const { data: directRows, error: directError } = await supabaseAdmin
    .from("oh_people")
    .select(selectColumns)
    .eq("organization_id", organizationId)
    .in("whatsapp", candidates)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (directError) throw directError;

  let matches = (directRows ?? []).filter((item) => canonicalPhone(item.whatsapp) === wantedPhone);

  if (!matches.length) {
    const { data: allPhones, error: allPhonesError } = await supabaseAdmin
      .from("oh_people")
      .select(selectColumns)
      .eq("organization_id", organizationId)
      .eq("active", true);
    if (allPhonesError) throw allPhonesError;
    matches = (allPhones ?? []).filter((item) => canonicalPhone(item.whatsapp) === wantedPhone);
  }

  const unique = Array.from(new Map(matches.map((item) => [String(item.id), item])).values());
  if (unique.length > 1) {
    throw new Error("Mais de um cadastro ativo usa este celular. Procure a administração do Tucxa antes de continuar.");
  }
  return unique[0] ?? null;
}

async function ensureConsulenteAuth(
  person: { id: string; full_name?: string | null; auth_user_id?: string | null },
  membership: { id?: string | null; agenda_viva_profile?: unknown } | null,
) {
  if (person.auth_user_id) return person.auth_user_id;
  const profile = asRecord(membership?.agenda_viva_profile);
  let isConsulente = profileSuggestsConsulente(profile);
  if (!isConsulente) {
    const { data: preference } = await supabaseAdmin
      .from("oh_tucxa_pilot_person_preferences")
      .select("person_id")
      .eq("person_id", person.id)
      .maybeSingle();
    isConsulente = Boolean(preference?.person_id);
  }
  if (!isConsulente) return "";

  const email = `tucxa-consulente-${person.id}@organizacao-em-harmonia.local`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "12345678",
    email_confirm: true,
    user_metadata: {
      person_id: person.id,
      full_name: asText(person.full_name) || "Consulente",
      oh_profile: "consulente",
      must_change_password: true,
      temporary_access_source: "tucxa_agendamento_48",
    },
  });
  if (error || !data.user?.id) throw error || new Error("Não foi possível preparar o primeiro acesso do Consulente.");

  const now = new Date().toISOString();
  const { error: personError } = await supabaseAdmin
    .from("oh_people")
    .update({ auth_user_id: data.user.id, updated_at: now })
    .eq("id", person.id);
  if (personError) throw personError;

  const membershipId = asText((membership as Record<string, unknown> | null)?.id);
  if (membershipId && !profileSuggestsConsulente(profile)) {
    const nextProfile = { ...profile, accessType: "consulente", publico: "consulente", pilotAccessKind: "consulente", source: asText(profile.source) || "tucxa_agendamento_48" };
    const { error: membershipError } = await supabaseAdmin.from("oh_memberships").update({ agenda_viva_profile: nextProfile, updated_at: now }).eq("id", membershipId);
    if (membershipError) throw membershipError;
  }
  return data.user.id;
}

async function loadMembership(organizationId: string, personId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, role_id, active, status, module_slugs, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "login") {
      const identifier = asText(body.identifier);
      const password = asText(body.password);
      const context = asText(body.context) === "portal" ? "portal" : "agendamento";
      if (!identifier || !password) {
        return NextResponse.json({ error: "Informe seu WhatsApp/e-mail e sua senha." }, { status: 400 });
      }

      const organization = await findTucxaOrganization();
      if (!organization) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });
      const person = await findPersonByIdentifier(organization.id, identifier);
      if (!person?.id) {
        return NextResponse.json({ error: "Não foi possível entrar. Confira WhatsApp/e-mail e senha." }, { status: 401 });
      }

      const membership = await loadMembership(organization.id, person.id as string);
      const authUserId = person.auth_user_id || await ensureConsulenteAuth(person, membership);
      if (!authUserId) {
        return NextResponse.json({ error: "Não foi possível entrar. Confira WhatsApp/e-mail e senha." }, { status: 401 });
      }
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(authUserId as string);
      if (authError || !authData.user || !membership?.id) {
        console.warn("[TUCXA agendamento acesso] vínculo/auth inválido", {
          personId: person.id,
          authUserId,
          hasMembership: Boolean(membership?.id),
          membershipStatus: asText(membership?.status),
          authError: authError?.message || "",
        });
        return NextResponse.json({ error: "Não foi possível entrar. Confira WhatsApp/e-mail e senha." }, { status: 401 });
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) throw new Error("Configuração pública do Supabase não encontrada.");

      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const authEmail = asText(authData.user.email);
      const authPhone = onlyDigits(authData.user.phone);
      const credentials = authEmail
        ? { email: authEmail, password }
        : authPhone
          ? { phone: authPhone.startsWith("55") ? `+${authPhone}` : `+55${authPhone}`, password }
          : null;

      if (!credentials) {
        console.warn("[TUCXA acesso único] Auth sem e-mail/telefone de autenticação", {
          personId: person.id,
          authUserId,
        });
        return NextResponse.json(
          { error: "Seu cadastro está sem uma credencial de autenticação válida. Procure a administração do Tucxa." },
          { status: 401 },
        );
      }

      const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword(credentials);
      if (signInError || !signInData.session) {
        console.warn("[TUCXA acesso único] falha no Supabase Auth", {
          personId: person.id,
          authUserId,
          credentialType: authEmail ? "email" : "phone",
          authEmail: authEmail ? (syntheticEmail(authEmail) ? "synthetic" : "regular") : "",
          authPhone: authPhone ? `${authPhone.slice(0, 4)}***${authPhone.slice(-4)}` : "",
          signInError: signInError?.message || "sessão não retornada",
        });
        return NextResponse.json({ error: "Não foi possível entrar. Confira WhatsApp/e-mail e senha." }, { status: 401 });
      }

      const profile = asRecord(membership.agenda_viva_profile);
      const baseKind = await resolveBaseKind({
        organizationId: organization.id,
        membership,
        authUser: authData.user,
      });
      const operation = operationalKind(profile);
      const pilotSettings = await loadPilotSettings(organization.id);
      const metadata = asRecord(authData.user.user_metadata);
      const registrationSource = asText(person.registration_source);
      const pilotSeed = registrationSource === "tucxa_agendamento_piloto_01" || asText(profile.source) === "tucxa_agendamento_piloto_01";
      const onboardingCompleted = Boolean(asText(profile.pilotOnboardingCompletedAt));
      const mustChangePassword = metadata.must_change_password === true;

      return NextResponse.json({
        ok: true,
        session: {
          accessToken: signInData.session.access_token,
          refreshToken: signInData.session.refresh_token,
        },
        profile: {
          kind: baseKind,
          operationalKind: operation,
          destination: defaultDestination(baseKind, profile, context, pilotSettings.rolloutStage),
          onboardingRequired: mustChangePassword || (pilotSeed && !onboardingCompleted),
        },
      });
    }

    if (action === "resolve-recovery") {
      const identifier = asText(body.identifier);
      if (!identifier) {
        return NextResponse.json({ error: "Informe seu WhatsApp ou e-mail." }, { status: 400 });
      }

      const organization = await findTucxaOrganization();
      if (!organization) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });

      const person = await findPersonByIdentifier(organization.id, identifier);
      if (!person?.id || !person.auth_user_id) {
        return NextResponse.json(
          { error: "Não foi possível localizar uma credencial de acesso para este cadastro." },
          { status: 404 },
        );
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(person.auth_user_id);
      if (authError || !authData.user) {
        return NextResponse.json(
          { error: "A credencial de autenticação deste cadastro não foi localizada." },
          { status: 404 },
        );
      }

      const authEmail = asText(authData.user.email).toLowerCase();
      if (!authEmail || syntheticEmail(authEmail)) {
        return NextResponse.json(
          {
            error:
              "Seu acesso não possui um e-mail real vinculado para recuperação automática. Procure a administração do Tucxa para redefinir a senha com segurança.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({ ok: true, authEmail });
    }

    if (action === "complete-first-access") {
      const token = bearerToken(request);
      if (!token) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 401 });

      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData.user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

      const organization = await findTucxaOrganization();
      if (!organization) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });

      const { data: person, error: personError } = await supabaseAdmin
        .from("oh_people")
        .select("id, full_name, email, notification_email, whatsapp, registration_source")
        .eq("organization_id", organization.id)
        .eq("auth_user_id", authData.user.id)
        .eq("active", true)
        .maybeSingle();
      if (personError) throw personError;
      if (!person?.id) return NextResponse.json({ error: "Cadastro vinculado ao login não localizado." }, { status: 404 });

      const fullName = asText(body.fullName);
      const whatsapp = onlyDigits(body.whatsapp);
      const email = asText(body.email).toLowerCase();
      const privacyAccepted = body.privacyAccepted === true;
      if (!fullName) return NextResponse.json({ error: "Confirme seu nome." }, { status: 400 });
      if (whatsapp.length < 10) return NextResponse.json({ error: "Confirme seu telefone com DDD." }, { status: 400 });
      if (email && !email.includes("@")) return NextResponse.json({ error: "Confira o e-mail informado ou deixe em branco." }, { status: 400 });
      if (!privacyAccepted) return NextResponse.json({ error: "É necessário registrar sua ciência do Aviso de Privacidade (LGPD)." }, { status: 400 });

      const now = new Date().toISOString();
      const existingEmail = asText(person.email);
      const personEmail = existingEmail && !syntheticEmail(existingEmail) ? existingEmail : existingEmail || null;
      const { error: updatePersonError } = await supabaseAdmin
        .from("oh_people")
        .update({
          full_name: fullName,
          whatsapp,
          email: personEmail,
          notification_email: email || null,
          privacy_notice_accepted_at: now,
          privacy_notice_version: "2026-09-24-agendamento-02",
          privacy_notice_source: "agendamento_primeiro_acesso",
          updated_at: now,
        })
        .eq("id", person.id)
        .eq("organization_id", organization.id);
      if (updatePersonError) throw updatePersonError;

      const membership = await loadMembership(organization.id, person.id as string);
      if (!membership?.id) return NextResponse.json({ error: "Vínculo de acesso não localizado." }, { status: 404 });
      const previousProfile = asRecord(membership.agenda_viva_profile);
      const nextProfile = {
        ...previousProfile,
        pilotFirstAccessRequired: false,
        pilotOnboardingCompletedAt: now,
        pilotLgpdAcceptedAt: now,
      };
      const { error: membershipError } = await supabaseAdmin
        .from("oh_memberships")
        .update({ agenda_viva_profile: nextProfile, updated_at: now })
        .eq("id", membership.id);
      if (membershipError) throw membershipError;

      const metadata = asRecord(authData.user.user_metadata);
      await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
        user_metadata: {
          ...metadata,
          full_name: fullName,
          must_change_password: false,
          pilot_first_access_completed_at: now,
        },
      });

      const membershipForKind = {
        ...membership,
        agenda_viva_profile: nextProfile,
      };
      const baseKind = await resolveBaseKind({
        organizationId: organization.id,
        membership: membershipForKind,
        authUser: authData.user,
      });
      const pilotSettings = await loadPilotSettings(organization.id);
      return NextResponse.json({
        ok: true,
        destination: defaultDestination(baseKind, nextProfile, "agendamento", pilotSettings.rolloutStage),
      });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("[TUCXA agendamento acesso]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível concluir o acesso." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const token = bearerToken(request);
    if (!token) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 401 });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const organization = await findTucxaOrganization();
    if (!organization) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });

    const { data: person, error: personError } = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, notification_email, whatsapp, registration_source, privacy_notice_accepted_at")
      .eq("organization_id", organization.id)
      .eq("auth_user_id", authData.user.id)
      .eq("active", true)
      .maybeSingle();
    if (personError) throw personError;
    if (!person?.id) return NextResponse.json({ error: "Cadastro vinculado ao login não localizado." }, { status: 404 });

    const membership = await loadMembership(organization.id, person.id as string);
    if (!membership?.id) return NextResponse.json({ error: "Vínculo de acesso não localizado." }, { status: 404 });
    const profile = asRecord(membership.agenda_viva_profile);
    const baseKind = await resolveBaseKind({
      organizationId: organization.id,
      membership,
      authUser: authData.user,
    });
    const operation = operationalKind(profile);
    const pilotSettings = await loadPilotSettings(organization.id);
    const metadata = asRecord(authData.user.user_metadata);
    const registrationSource = asText(person.registration_source);
    const pilotSeed = registrationSource === "tucxa_agendamento_piloto_01" || asText(profile.source) === "tucxa_agendamento_piloto_01";
    const onboardingCompleted = Boolean(asText(profile.pilotOnboardingCompletedAt));
    const mustChangePassword = metadata.must_change_password === true;

    return NextResponse.json({
      ok: true,
      profile: {
        fullName: asText(person.full_name),
        whatsapp: asText(person.whatsapp),
        email: asText(person.notification_email) || (syntheticEmail(asText(person.email)) ? "" : asText(person.email)),
        privacyAccepted: Boolean(person.privacy_notice_accepted_at),
        kind: baseKind,
        operationalKind: operation,
        destination: defaultDestination(baseKind, profile, "agendamento", pilotSettings.rolloutStage),
        onboardingRequired: mustChangePassword || (pilotSeed && !onboardingCompleted),
      },
    });
  } catch (error) {
    console.error("[TUCXA agendamento acesso GET]", error);
    return NextResponse.json({ error: "Não foi possível carregar os dados do primeiro acesso." }, { status: 500 });
  }
}
