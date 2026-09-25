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

const CONSULENTE_DESTINATION = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/agendamento-piloto";
const RECEPTION_DESTINATION = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto";
const CAVALINHO_DESTINATION = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/entidades";
const FILHO_DESTINATION = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento";

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

function profileKind(profile: Record<string, unknown>) {
  if (profileHasReception(profile)) return "recepcao" as const;
  if (profileHasCavalinho(profile)) return "cavalinho" as const;
  const text = [profile.accessType, profile.publico, profile.pilotAccessKind]
    .map(asText)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (text.includes("consulente") || text.includes("filho-de-fora") || text.includes("filho de fora")) {
    return "consulente" as const;
  }
  return "filho-da-corrente" as const;
}

function destinationFor(kind: ReturnType<typeof profileKind>) {
  if (kind === "recepcao") return RECEPTION_DESTINATION;
  if (kind === "cavalinho") return CAVALINHO_DESTINATION;
  if (kind === "consulente") return CONSULENTE_DESTINATION;
  return FILHO_DESTINATION;
}

function rolloutAllows(kind: ReturnType<typeof profileKind>, stage: "reception" | "consulente" | "all") {
  if (stage === "all") return true;
  if (kind === "recepcao") return true;
  if (stage === "consulente" && kind === "consulente") return true;
  return false;
}

function rolloutMessage(kind: ReturnType<typeof profileKind>, stage: "reception" | "consulente" | "all") {
  if (stage === "reception" && kind === "consulente") {
    return "Nesta etapa do piloto, os agendamentos são feitos pela Recepção. Você receberá um SMS para confirmar sua presença quando houver um atendimento agendado.";
  }
  if (stage !== "all") {
    return "Seu acesso ao Agendamento ainda não foi liberado nesta etapa do piloto. A implantação está sendo feita gradualmente pelo Tucxa.";
  }
  return "Seu acesso ao Agendamento ainda não está liberado.";
}

async function findPersonByIdentifier(organizationId: string, identifier: string) {
  const value = asText(identifier);
  if (!value) return null;

  if (value.includes("@")) {
    const { data, error } = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, notification_email, whatsapp, auth_user_id, active, registration_source, privacy_notice_accepted_at")
      .eq("organization_id", organizationId)
      .or(`email.ilike.${value.toLowerCase()},notification_email.ilike.${value.toLowerCase()}`)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const candidates = phoneCandidates(value);
  if (!candidates.length) return null;

  const { data, error } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, notification_email, whatsapp, auth_user_id, active, registration_source, privacy_notice_accepted_at")
    .eq("organization_id", organizationId)
    .in("whatsapp", candidates)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return data;

  const { data: allPhones, error: allPhonesError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, notification_email, whatsapp, auth_user_id, active, registration_source, privacy_notice_accepted_at")
    .eq("organization_id", organizationId)
    .eq("active", true);
  if (allPhonesError) throw allPhonesError;
  const wanted = new Set(candidates);
  return (allPhones ?? []).find((item) => wanted.has(onlyDigits(item.whatsapp))) ?? null;
}

async function loadMembership(organizationId: string, personId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, active, status, agenda_viva_profile")
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
      if (!identifier || !password) {
        return NextResponse.json({ error: "Informe seu WhatsApp/e-mail e sua senha." }, { status: 400 });
      }

      const organization = await findTucxaOrganization();
      if (!organization) return NextResponse.json({ error: "Organização Tucxa não localizada." }, { status: 404 });
      const person = await findPersonByIdentifier(organization.id, identifier);
      if (!person?.id || !person.auth_user_id) {
        return NextResponse.json({ error: "Não foi possível entrar. Confira WhatsApp/e-mail e senha." }, { status: 401 });
      }

      const [{ data: authData, error: authError }, membership] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(person.auth_user_id as string),
        loadMembership(organization.id, person.id as string),
      ]);
      if (authError || !authData.user?.email || !membership?.id || String(membership.status || "").toLowerCase() !== "ativo") {
        return NextResponse.json({ error: "Não foi possível entrar. Confira WhatsApp/e-mail e senha." }, { status: 401 });
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) throw new Error("Configuração pública do Supabase não encontrada.");

      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
        email: authData.user.email,
        password,
      });
      if (signInError || !signInData.session) {
        return NextResponse.json({ error: "Não foi possível entrar. Confira WhatsApp/e-mail e senha." }, { status: 401 });
      }

      const profile = asRecord(membership.agenda_viva_profile);
      const kind = profileKind(profile);
      const pilotSettings = await loadPilotSettings(organization.id);
      if (!rolloutAllows(kind, pilotSettings.rolloutStage)) {
        return NextResponse.json(
          { error: rolloutMessage(kind, pilotSettings.rolloutStage), rolloutStage: pilotSettings.rolloutStage },
          { status: 403 },
        );
      }
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
          kind,
          destination: destinationFor(kind),
          onboardingRequired: mustChangePassword || (pilotSeed && !onboardingCompleted),
        },
      });
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

      const kind = profileKind(nextProfile);
      return NextResponse.json({ ok: true, destination: destinationFor(kind) });
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
    const kind = profileKind(profile);
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
        kind,
        destination: destinationFor(kind),
        onboardingRequired: mustChangePassword || (pilotSeed && !onboardingCompleted),
      },
    });
  } catch (error) {
    console.error("[TUCXA agendamento acesso GET]", error);
    return NextResponse.json({ error: "Não foi possível carregar os dados do primeiro acesso." }, { status: 500 });
  }
}
