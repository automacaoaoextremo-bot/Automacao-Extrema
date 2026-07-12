import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  const text = asText(value).toLowerCase();
  if (!text) return fallback;
  return ["sim", "s", "yes", "true", "1", "ativo"].includes(text);
}

function asNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(asText(value).replace(",", "."));
  return Number.isFinite(numberValue) ? numberValue : fallback;
}


const DEFAULT_MODULE_SLUGS = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

function internalReviewEmail() {
  return process.env.OH_ACCESS_REVIEW_EMAIL || process.env.EMAIL_COPY_TO || "automacao.ao.extremo@gmail.com";
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function firstName(value: string | null | undefined) {
  return String(value ?? "").trim().split(/\s+/)[0] || "irmão(ã)";
}

function displayEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.endsWith("@organizacao-em-harmonia.local") ? "" : email;
}

function whatsappUrl(phone: string | null | undefined, message: string) {
  const digits = normalizePhone(phone ?? "");
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

async function sendAccessEmail(input: { to: string; cc?: string; subject: string; text: string; html?: string }) {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false" || !hasSmtpConfig()) return;

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
    cc: input.cc || internalReviewEmail(),
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
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

function nullableText(value: unknown) {
  const text = asText(value);
  return text ? text : null;
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "registro"
  );
}

function normalizePhone(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function normalizeModules(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asTextList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value)
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function agendaVivaProfileFromBody(body: Record<string, unknown>) {
  return {
    isCavalinho: asBool(body.isCavalinho, false),
    entityNames: asTextList(body.entityNames ?? body.entidades),
    spiritualLines: asTextList(body.spiritualLines ?? body.linhas),
    isCambono: asBool(body.isCambono, false),
    cambonoEntityNames: asTextList(body.cambonoEntityNames ?? body.entidadesCambonadas),
    isReserveCambono: asBool(body.isReserveCambono, false),
    supportsReception: asBool(body.supportsReception, false),
    supportsOrganization: asBool(body.supportsOrganization, false),
    participatesMonday: asBool(body.participatesMonday, false),
    participatesTuesday: asBool(body.participatesTuesday, false),
    participatesWednesday: asBool(body.participatesWednesday, false),
    participatesThursday: asBool(body.participatesThursday, false),
    thursdayGroup: asText(body.thursdayGroup) || "",
    canApproveEvents: asBool(body.canApproveEvents, false),
    canEditCalendar: asBool(body.canEditCalendar, false),
    canViewReports: asBool(body.canViewReports, false),
    attendanceNotes: asText(body.attendanceNotes),
  };
}

type AgendaProfile = ReturnType<typeof agendaVivaProfileFromBody> & Record<string, unknown>;

function mergeProfile(current: unknown, patch: Record<string, unknown>) {
  const base = current && typeof current === "object" && !Array.isArray(current) ? (current as AgendaProfile) : {};
  return { ...base, ...patch };
}

async function listPayload(organizationId: string) {
  const [organizationResult, peopleResult, rolesResult, membershipsResult, moduleSettingsResult, locationsResult, entitiesResult, validationRequestsResult] = await Promise.all([
    supabaseAdmin
      .from("oh_organizations")
      .select("id, name, slug, organization_type, email, whatsapp, enabled_modules, status")
      .eq("id", organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active, notes, auth_user_id, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_roles")
      .select("id, name, slug, description, active, is_system")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("oh_memberships")
      .select("id, person_id, role_id, module_slugs, active, status, is_main_contact, can_receive_notifications, agenda_viva_profile")
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_module_settings")
      .select("id, module_slug, enabled, settings")
      .eq("organization_id", organizationId)
      .order("module_slug", { ascending: true }),
    supabaseAdmin
      .from("oh_locations")
      .select("id, name, location_type, zip_code, address, number, complement, district, city, state, is_primary, active, notes")
      .eq("organization_id", organizationId)
      .order("is_primary", { ascending: false })
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("oh_spiritual_entities")
      .select("id, name, slug, line, entity_type, usual_materials, usual_days, daily_capacity, appointment_enabled, appointment_notes, notes, active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("oh_first_access_validation_requests")
      .select("id, person_id, status, summary, created_at, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
  ]);

  for (const result of [organizationResult, peopleResult, rolesResult, membershipsResult, moduleSettingsResult]) {
    if (result.error) throw result.error;
  }

  return {
    organization: organizationResult.data,
    people: peopleResult.data ?? [],
    roles: rolesResult.data ?? [],
    memberships: membershipsResult.data ?? [],
    modules: moduleSettingsResult.data ?? [],
    locations: locationsResult.status === 200 && !locationsResult.error ? locationsResult.data ?? [] : [],
    entities: entitiesResult.status === 200 && !entitiesResult.error ? entitiesResult.data ?? [] : [],
    validationRequests: validationRequestsResult.status === 200 && !validationRequestsResult.error ? validationRequestsResult.data ?? [] : [],
    warnings: [
      locationsResult.error ? `Localidades: ${locationsResult.error.message}` : "",
      entitiesResult.error ? `Entidades: ${entitiesResult.error.message}` : "",
      validationRequestsResult.error ? `Validações: ${validationRequestsResult.error.message}` : "",
    ].filter(Boolean),
  };
}

async function upsertPerson(organizationId: string, body: Record<string, unknown>) {
  const personId = asText(body.personId ?? body.id);
  const fullName = asText(body.fullName ?? body.full_name);
  const email = asText(body.email).toLowerCase();
  const whatsapp = normalizePhone(body.whatsapp);
  const notes = asText(body.notes ?? body.observacoes);
  const roleId = asText(body.roleId ?? body.role_id);
  const moduleSlugs = normalizeModules(body.moduleSlugs ?? body.module_slugs ?? body.modulos);
  const active = asBool(body.active, true);
  const agendaVivaProfile = agendaVivaProfileFromBody(body);

  if (!fullName) throw new Error("Informe o nome completo do envolvido.");

  let selectedPersonId = personId;

  if (selectedPersonId) {
    const { error } = await supabaseAdmin
      .from("oh_people")
      .update({
        full_name: fullName,
        email: email || null,
        whatsapp: whatsapp || null,
        active,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedPersonId)
      .eq("organization_id", organizationId);
    if (error) throw error;
  } else {
    const { data: existingByEmail } = email
      ? await supabaseAdmin
          .from("oh_people")
          .select("id")
          .eq("organization_id", organizationId)
          .ilike("email", email)
          .maybeSingle()
      : { data: null };

    if (existingByEmail?.id) {
      selectedPersonId = existingByEmail.id as string;
      const { error } = await supabaseAdmin
        .from("oh_people")
        .update({
          full_name: fullName,
          whatsapp: whatsapp || null,
          active,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPersonId);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseAdmin
        .from("oh_people")
        .insert({
          organization_id: organizationId,
          full_name: fullName,
          email: email || null,
          whatsapp: whatsapp || null,
          active,
          notes: notes || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      selectedPersonId = data.id as string;
    }
  }

  if (selectedPersonId) {
    const { data: existingMembership } = await supabaseAdmin
      .from("oh_memberships")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("person_id", selectedPersonId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const membershipPayload = {
      organization_id: organizationId,
      person_id: selectedPersonId,
      role_id: roleId || null,
      module_slugs: moduleSlugs.length > 0 ? moduleSlugs : DEFAULT_MODULE_SLUGS,
      active,
      // Cadastro na Base Única não equivale a Primeiro Acesso aprovado.
      // A aprovação dos Filhos da Corrente só acontece pelo fluxo de validação.
      status: active ? "cadastro_base_unica" : "inativo",
      agenda_viva_profile: mergeProfile(agendaVivaProfile, { validationStatus: active ? "pendente_primeiro_acesso" : "inativo" }),
      updated_at: new Date().toISOString(),
    };

    if (existingMembership?.id) {
      const { error } = await supabaseAdmin.from("oh_memberships").update(membershipPayload).eq("id", existingMembership.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("oh_memberships").insert(membershipPayload);
      if (error) throw error;
    }
  }

  return selectedPersonId;
}

async function upsertRole(organizationId: string, body: Record<string, unknown>) {
  const roleId = asText(body.roleId ?? body.id);
  const name = asText(body.name);
  const description = asText(body.description);
  const requestedSlug = slugify(asText(body.slug) || name);
  const active = asBool(body.active, true);

  if (!name) throw new Error("Informe o nome da função.");

  if (roleId) {
    const { error } = await supabaseAdmin
      .from("oh_roles")
      .update({ name, slug: requestedSlug, description: description || null, active, updated_at: new Date().toISOString() })
      .eq("id", roleId)
      .eq("organization_id", organizationId);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin
    .from("oh_roles")
    .insert({ organization_id: organizationId, name, slug: requestedSlug, description: description || null, active, is_system: false });
  if (error) throw error;
}

async function toggleRole(organizationId: string, body: Record<string, unknown>) {
  const roleId = asText(body.roleId);
  const active = asBool(body.active, true);
  if (!roleId) throw new Error("Função não informada.");
  const { error } = await supabaseAdmin
    .from("oh_roles")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", roleId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

async function deleteRole(organizationId: string, body: Record<string, unknown>) {
  const roleId = asText(body.roleId);
  if (!roleId) throw new Error("Função não informada.");

  const { error } = await supabaseAdmin
    .from("oh_roles")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", roleId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

async function upsertEntity(organizationId: string, body: Record<string, unknown>) {
  const entityId = asText(body.entityId ?? body.id);
  const name = asText(body.name);
  if (!name) throw new Error("Informe o nome da entidade.");
  const payload = {
    organization_id: organizationId,
    name,
    slug: slugify(asText(body.slug) || name),
    line: asText(body.line) || null,
    entity_type: asText(body.entityType ?? body.entity_type) || null,
    usual_materials: asText(body.usualMaterials ?? body.usual_materials) || null,
    usual_days: normalizeModules(body.usualDays ?? body.usual_days),
    daily_capacity: Math.max(1, Math.trunc(asNumber(body.dailyCapacity ?? body.daily_capacity, 4))),
    appointment_enabled: asBool(body.appointmentEnabled ?? body.appointment_enabled, true),
    appointment_notes: asText(body.appointmentNotes ?? body.appointment_notes) || null,
    notes: asText(body.notes) || null,
    active: asBool(body.active, true),
    updated_at: new Date().toISOString(),
  };

  if (entityId) {
    const { error } = await supabaseAdmin.from("oh_spiritual_entities").update(payload).eq("id", entityId).eq("organization_id", organizationId);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.from("oh_spiritual_entities").insert(payload);
  if (error) throw error;
}

async function toggleEntity(organizationId: string, body: Record<string, unknown>) {
  const entityId = asText(body.entityId);
  const active = asBool(body.active, true);
  if (!entityId) throw new Error("Entidade não informada.");
  const { error } = await supabaseAdmin
    .from("oh_spiritual_entities")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", entityId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

async function deleteEntity(organizationId: string, body: Record<string, unknown>) {
  const entityId = asText(body.entityId);
  if (!entityId) throw new Error("Entidade não informada.");
  const { error } = await supabaseAdmin
    .from("oh_spiritual_entities")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", entityId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

async function upsertLocation(organizationId: string, body: Record<string, unknown>) {
  const locationId = asText(body.locationId ?? body.id);
  const name = asText(body.name) || "Nova localidade";
  const isPrimary = asBool(body.isPrimary ?? body.is_primary, false);
  const active = asBool(body.active, true);
  const zipCode = asText(body.zipCode ?? body.zip_code).replace(/\D/g, "");

  const locationPayload = {
    organization_id: organizationId,
    name,
    location_type: asText(body.locationType ?? body.location_type) || "sede",
    zip_code: zipCode || null,
    address: nullableText(body.address),
    number: nullableText(body.number),
    complement: nullableText(body.complement),
    district: nullableText(body.district),
    city: nullableText(body.city),
    state: nullableText(asText(body.state).toUpperCase()),
    is_primary: isPrimary,
    active,
    notes: nullableText(body.notes),
    updated_at: new Date().toISOString(),
  };

  if (isPrimary) {
    const { error: clearPrimaryError } = await supabaseAdmin
      .from("oh_locations")
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .neq("id", locationId || "00000000-0000-0000-0000-000000000000");
    if (clearPrimaryError) throw clearPrimaryError;
  }

  if (locationId) {
    const { error } = await supabaseAdmin
      .from("oh_locations")
      .update(locationPayload)
      .eq("id", locationId)
      .eq("organization_id", organizationId);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from("oh_locations").insert(locationPayload);
    if (error) throw error;
  }

  if (isPrimary) {
    const organizationPayload: Record<string, unknown> = {
      city: locationPayload.city,
      state: locationPayload.state,
      updated_at: new Date().toISOString(),
    };

    if (locationPayload.zip_code !== null) organizationPayload.zip_code = locationPayload.zip_code;
    if (locationPayload.address !== null) organizationPayload.address = locationPayload.address;
    if (locationPayload.number !== null) organizationPayload.number = locationPayload.number;
    if (locationPayload.complement !== null) organizationPayload.complement = locationPayload.complement;

    const { error } = await supabaseAdmin.from("oh_organizations").update(organizationPayload).eq("id", organizationId);
    if (error) throw error;
  }
}

async function deleteLocation(organizationId: string, body: Record<string, unknown>) {
  const locationId = asText(body.locationId);
  if (!locationId) throw new Error("Localidade não informada.");
  const { error } = await supabaseAdmin
    .from("oh_locations")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", locationId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

async function bulkUpdateProfiles(organizationId: string, body: Record<string, unknown>) {
  const personIds = asTextList(body.personIds);
  if (personIds.length === 0) throw new Error("Selecione pelo menos um envolvido.");

  const patch: Record<string, unknown> = {};
  const fields = [
    "isCavalinho",
    "isCambono",
    "isReserveCambono",
    "supportsReception",
    "supportsOrganization",
    "participatesMonday",
    "participatesTuesday",
    "participatesWednesday",
    "participatesThursday",
    "thursdayGroup",
    "canApproveEvents",
    "canEditCalendar",
    "canViewReports",
  ];

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) patch[field] = body[field];
  }

  if (Object.prototype.hasOwnProperty.call(body, "entityNames")) patch.entityNames = asTextList(body.entityNames);
  if (Object.prototype.hasOwnProperty.call(body, "cambonoEntityNames")) patch.cambonoEntityNames = asTextList(body.cambonoEntityNames);
  if (Object.prototype.hasOwnProperty.call(body, "spiritualLines")) patch.spiritualLines = asTextList(body.spiritualLines);
  if (Object.prototype.hasOwnProperty.call(body, "attendanceNotes")) patch.attendanceNotes = asText(body.attendanceNotes);

  const roleId = asText(body.roleId);
  const moduleSlugs = normalizeModules(body.moduleSlugs);

  const { data: memberships, error } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, person_id, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .in("person_id", personIds);
  if (error) throw error;

  for (const membership of memberships ?? []) {
    const updatePayload: Record<string, unknown> = {
      agenda_viva_profile: mergeProfile(membership.agenda_viva_profile, patch),
      updated_at: new Date().toISOString(),
    };
    if (roleId) updatePayload.role_id = roleId;
    if (moduleSlugs.length > 0) updatePayload.module_slugs = moduleSlugs;
    const { error: updateError } = await supabaseAdmin.from("oh_memberships").update(updatePayload).eq("id", membership.id);
    if (updateError) throw updateError;
  }
}

async function updateAccessStatus(organizationId: string, body: Record<string, unknown>, approved: boolean) {
  const personId = asText(body.personId);
  const reviewNotes = asText(body.reviewNotes ?? body.notes);
  if (!personId) throw new Error("Pessoa não informada para validação de acesso.");

  const { data: person, error: personError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, auth_user_id")
    .eq("id", personId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (personError) throw personError;
  if (!person?.id) throw new Error("Envolvido não localizado na Base Única.");

  const nextStatus = approved ? "ativo" : "ajuste_solicitado";
  const { error: personUpdateError } = await supabaseAdmin
    .from("oh_people")
    .update({
      active: approved,
      notes: reviewNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId)
    .eq("organization_id", organizationId);
  if (personUpdateError) throw personUpdateError;

  const { data: currentMembership, error: currentMembershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (currentMembershipError) throw currentMembershipError;

  const mergedProfile = mergeProfile(currentMembership?.agenda_viva_profile, {
    source: "primeiro_acesso_filho_corrente",
    validationStatus: nextStatus,
    reviewedAt: new Date().toISOString(),
    reviewNotes: reviewNotes || "",
  });

  const { error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .update({ active: approved, status: nextStatus, module_slugs: DEFAULT_MODULE_SLUGS, agenda_viva_profile: mergedProfile, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("person_id", personId);
  if (membershipError) throw membershipError;

  await supabaseAdmin
    .from("oh_first_access_validation_requests")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("person_id", personId);

  if (person.auth_user_id) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(person.auth_user_id as string, {
      user_metadata: {
        full_name: person.full_name,
        whatsapp: person.whatsapp,
        organization_id: organizationId,
        oh_profile: "filho-da-corrente",
        oh_access_status: nextStatus,
      },
    });
    if (authError) throw authError;
  }

  const loginUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login`;
  const email = displayEmail(person.email);

  const emailMessage = approved
    ? [
        `Olá, ${firstName(person.full_name)}.`,
        "",
        "Seu acesso à Organização em Harmonia do Tucxa foi liberado.",
        "",
        "Acesse pelo link abaixo usando seu e-mail ou WhatsApp e a senha cadastrada no primeiro acesso:",
        loginUrl,
        "",
        "Com a Base Única atualizada, o Tucxa consegue organizar Agenda Viva, Atendimento em Harmonia e Corrente em Dia com menos retrabalho e mais clareza para todos.",
        "",
        reviewNotes ? `Orientação do responsável: ${reviewNotes}` : "Qualquer dúvida, responda esta mensagem ou fale com o responsável do Tucxa.",
      ].join("\n")
    : [
        `Olá, ${firstName(person.full_name)}.`,
        "",
        "Conferimos seu cadastro na Organização em Harmonia do Tucxa e precisamos ajustar algumas informações antes de liberar o acesso.",
        "",
        reviewNotes || "Por favor, confirme seu nome completo, WhatsApp e vínculo com o Tucxa.",
        "",
        "Você pode atualizar seus dados pelo primeiro acesso:",
        loginUrl,
      ].join("\n");

  if (email) {
    await sendAccessEmail({
      to: email,
      cc: internalReviewEmail(),
      subject: approved ? "Acesso liberado - Organização em Harmonia Tucxa" : "Ajuste de cadastro - Organização em Harmonia Tucxa",
      text: emailMessage,
    });
  }

  const waMessage = approved
    ? [
        `Olá, ${firstName(person.full_name)}. Seu acesso à Organização em Harmonia do Tucxa foi liberado.`,
        "",
        "Use seu WhatsApp ou e-mail e a senha cadastrada no primeiro acesso:",
        loginUrl,
        "",
        reviewNotes ? `Orientação: ${reviewNotes}` : "Qualquer dúvida, fale com o responsável do Tucxa.",
      ].join("\n")
    : [
        `Olá, ${firstName(person.full_name)}. Conferimos seu cadastro na Organização em Harmonia do Tucxa e precisamos ajustar algumas informações antes de liberar o acesso.`,
        "",
        reviewNotes || "Por favor, confirme seu nome completo, WhatsApp e vínculo com o Tucxa.",
        "",
        "Você pode atualizar seus dados pelo primeiro acesso:",
        loginUrl,
      ].join("\n");

  return { whatsappUrl: whatsappUrl(person.whatsapp, waMessage), emailSent: Boolean(email), emailTo: email };
}

async function deleteAccessValidation(organizationId: string, body: Record<string, unknown>) {
  const personId = asText(body.personId);
  if (!personId) throw new Error("Pessoa não informada para excluir o pedido de validação.");

  const { data: person, error: personError } = await supabaseAdmin
    .from("oh_people")
    .select("id, auth_user_id, full_name")
    .eq("id", personId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (personError) throw personError;
  if (!person?.id) throw new Error("Pedido de validação não localizado.");

  const { error: requestsError } = await supabaseAdmin
    .from("oh_first_access_validation_requests")
    .delete()
    .eq("organization_id", organizationId)
    .eq("person_id", personId);
  if (requestsError) throw requestsError;

  const { error: membershipsError } = await supabaseAdmin
    .from("oh_memberships")
    .delete()
    .eq("organization_id", organizationId)
    .eq("person_id", personId);
  if (membershipsError) throw membershipsError;

  const { error: personDeleteError } = await supabaseAdmin
    .from("oh_people")
    .delete()
    .eq("id", personId)
    .eq("organization_id", organizationId);
  if (personDeleteError) throw personDeleteError;

  if (person.auth_user_id) {
    await supabaseAdmin.auth.admin.deleteUser(person.auth_user_id as string).catch(() => undefined);
  }

  return { deletedValidation: true, deletedPersonName: person.full_name };
}

export async function GET(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const payload = await listPayload(auth.context.organizationId);
    return NextResponse.json({ ...payload, currentPerson: auth.context.person });
  } catch (error) {
    return NextResponse.json({ error: errorToMessage(error, "Erro ao carregar Base Única.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getOrganizacaoAuthContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action) || "upsertPerson";

    let actionResult: Record<string, unknown> = {};

    if (action === "deletePerson") {
      const personId = asText(body.personId);
      if (!personId) throw new Error("Pessoa não informada.");
      const { error } = await supabaseAdmin.from("oh_people").delete().eq("id", personId).eq("organization_id", auth.context.organizationId);
      if (error) throw error;
    } else if (action === "togglePerson") {
      const personId = asText(body.personId);
      const active = asBool(body.active, true);
      if (!personId) throw new Error("Pessoa não informada.");
      const { error: personError } = await supabaseAdmin
        .from("oh_people")
        .update({ active, updated_at: new Date().toISOString() })
        .eq("id", personId)
        .eq("organization_id", auth.context.organizationId);
      if (personError) throw personError;
      const { error: membershipError } = await supabaseAdmin
        .from("oh_memberships")
        .update({ active, status: active ? "cadastro_base_unica" : "inativo", updated_at: new Date().toISOString() })
        .eq("organization_id", auth.context.organizationId)
        .eq("person_id", personId);
      if (membershipError) throw membershipError;
    } else if (action === "approveAccess") {
      actionResult = await updateAccessStatus(auth.context.organizationId, body, true);
    } else if (action === "requestAccessAdjustment") {
      actionResult = await updateAccessStatus(auth.context.organizationId, body, false);
    } else if (action === "deleteAccessValidation") {
      actionResult = await deleteAccessValidation(auth.context.organizationId, body);
    } else if (action === "upsertRole") {
      await upsertRole(auth.context.organizationId, body);
    } else if (action === "toggleRole") {
      await toggleRole(auth.context.organizationId, body);
    } else if (action === "deleteRole") {
      await deleteRole(auth.context.organizationId, body);
    } else if (action === "upsertEntity") {
      await upsertEntity(auth.context.organizationId, body);
    } else if (action === "toggleEntity") {
      await toggleEntity(auth.context.organizationId, body);
    } else if (action === "deleteEntity") {
      await deleteEntity(auth.context.organizationId, body);
    } else if (action === "upsertLocation") {
      await upsertLocation(auth.context.organizationId, body);
    } else if (action === "deleteLocation") {
      await deleteLocation(auth.context.organizationId, body);
    } else if (action === "bulkUpdateProfiles") {
      await bulkUpdateProfiles(auth.context.organizationId, body);
    } else {
      await upsertPerson(auth.context.organizationId, body);
    }

    const payload = await listPayload(auth.context.organizationId);
    return NextResponse.json({ ok: true, ...actionResult, ...payload });
  } catch (error) {
    return NextResponse.json({ error: errorToMessage(error, "Erro ao salvar Base Única.") }, { status: 500 });
  }
}
