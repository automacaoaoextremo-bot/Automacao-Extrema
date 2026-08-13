import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { filhoFunctionOptionsFromRoles } from "@/lib/organizacao-em-harmonia/filho-function-options";
import {
  SEMENTINHA_COORDINATOR_SLUG,
  isSementinhaSubfunctionSlug,
} from "@/lib/organizacao-em-harmonia/sementinha-functions";
import { profileHasCavalinho, resolveAppointmentCapabilities } from "@/lib/organizacao-em-harmonia/appointment-permissions";
import {
  loadEligibleFamilyPeople,
  loadFamilyRelationshipOptions,
  loadPersonFamilyLinks,
  parseFamilyLinks,
  validateFamilyLinks,
} from "@/lib/organizacao-em-harmonia/family-links";

export const dynamic = "force-dynamic";

type DraftItem = {
  slug: string;
  label: string;
  description?: string;
};

type PersonRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  notes: string | null;
  active: boolean | null;
  auth_user_id?: string | null;
};

type MembershipRecord = {
  id: string;
  person_id: string;
  active: boolean | null;
  status: string | null;
  module_slugs: string[] | null;
  agenda_viva_profile: Record<string, unknown> | null;
};

const DEFAULT_MODULE_SLUGS = ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];
const DEFAULT_COPY_EMAIL = "automacao.ao.extremo@gmail.com";
const DEFAULT_WHATSAPP_PHONE = "5519989848246";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function onlyDigits(value: unknown) {
  return asText(value).replace(/\D/g, "");
}

function normalizeEmail(value: unknown) {
  return asText(value).toLowerCase();
}

function displayEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.endsWith("@organizacao-em-harmonia.local") ? "" : email;
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  return header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function asTextList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  return asText(value).split(/[;,|]/).map((item) => item.trim()).filter(Boolean);
}

function asDraftItems(value: unknown): DraftItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap<DraftItem>((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const slug = asText(record.slug);
    const label = asText(record.label);
    const description = asText(record.description);
    if (!slug || !label) return [];
    return [{ slug, label, ...(description ? { description } : {}) }];
  });
}

function requestCode() {
  return crypto.randomUUID().slice(0, 8);
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/$/, "");
}

function reviewCopyEmail() {
  return process.env.OH_ACCESS_REVIEW_EMAIL || process.env.EMAIL_COPY_TO || DEFAULT_COPY_EMAIL;
}

function whatsappSupportPhone() {
  return onlyDigits(process.env.OH_ACCESS_WHATSAPP || process.env.TUCXA_PUBLIC_WHATSAPP || DEFAULT_WHATSAPP_PHONE);
}

function whatsappUrl(phone: string, message: string) {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

async function sendEmail(input: { to: string; subject: string; text: string; cc?: string; replyTo?: string }) {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false" || !hasSmtpConfig() || !input.to) return { skipped: true };
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Tucxa em Harmonia"}" <${process.env.EMAIL_FROM}>`,
    to: input.to,
    cc: input.cc || undefined,
    replyTo: input.replyTo || undefined,
    subject: input.subject,
    text: input.text,
  });
  return { skipped: false };
}

async function reviewerEmails(organizationId: string) {
  const { data } = await supabaseAdmin
    .from("oh_module_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .eq("module_slug", "agenda-viva")
    .maybeSingle();
  const settings = asRecord(data?.settings);
  const configuredEmails = asTextList(settings.accessValidationReviewerEmails);
  const reviewerPersonIds = asTextList(settings.accessValidationReviewerPersonIds);
  const emails = [...configuredEmails];

  if (reviewerPersonIds.length) {
    const { data: people, error } = await supabaseAdmin
      .from("oh_people")
      .select("email, notification_email")
      .eq("organization_id", organizationId)
      .in("id", reviewerPersonIds);
    if (error) throw error;
    for (const person of people ?? []) {
      const record = person as { email?: string | null; notification_email?: string | null };
      const email = displayEmail(record.notification_email || record.email);
      if (email) emails.push(email);
    }
  }

  emails.push(reviewCopyEmail());
  return Array.from(new Set(emails.map((item) => normalizeEmail(item)).filter(Boolean)));
}

function itemLines(items: DraftItem[], emptyText: string) {
  return items.length
    ? items.map((item) => `- ${item.label}${item.description ? ` — ${item.description}` : ""}`)
    : [`- ${emptyText}`];
}

function firstName(value: string) {
  return value.split(/\s+/)[0] || "Filho da Corrente";
}

function listDifference(nextValues: string[], previousValues: string[]) {
  const previous = new Set(previousValues);
  return nextValues.filter((item) => !previous.has(item));
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasThursdayGroup(items: DraftItem[]) {
  return items.some((item) => {
    const searchable = normalizeSearch(
      [item.slug, item.label, item.description].filter(Boolean).join(" "),
    );
    return (
      searchable.includes("quinta") ||
      searchable.includes("grupo 1") ||
      searchable.includes("grupo 2") ||
      searchable.includes("filhos da corrente grupo")
    );
  });
}

function itemLabelMap(items: DraftItem[]) {
  return new Map(items.map((item) => [item.slug, item.label]));
}

function familyKeyMap(items: Array<{ personId: string; relationshipTypeId: string; personName: string; relationshipLabel: string }>) {
  return new Map(
    items.map((item) => [
      `${item.personId}:${item.relationshipTypeId}`,
      `${item.personName} — ${item.relationshipLabel}`,
    ]),
  );
}

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id, name").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return { id: bySlug.id as string, name: asText(bySlug.name) || "Tucxa" };
  const { data: byName } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return byName?.id ? { id: byName.id as string, name: asText(byName.name) || "Tucxa" } : null;
}

async function currentFilho(request: Request, organizationId: string) {
  const token = bearerToken(request);
  if (!token) throw new Error("Sessão expirada. Entre novamente no painel do Filho da Corrente.");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Sessão inválida. Entre novamente no painel do Filho da Corrente.");

  const user = userData.user;
  let person: PersonRecord | null = null;
  const byAuth = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, notes, active, auth_user_id")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (byAuth.error) throw byAuth.error;
  if (byAuth.data?.id) person = byAuth.data as PersonRecord;

  if (!person && user.email) {
    const byEmail = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, notes, active, auth_user_id")
      .eq("organization_id", organizationId)
      .eq("email", user.email)
      .maybeSingle();
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data?.id) person = byEmail.data as PersonRecord;
  }

  if (!person) throw new Error("Cadastro do Filho da Corrente não localizado.");

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, person_id, active, status, module_slugs, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", person.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.id || membership.active !== true || membership.status !== "ativo") {
    throw new Error("Seu acesso ainda não está liberado para atualização de dados.");
  }

  return { user, person, membership: membership as MembershipRecord };
}

async function profilePayload(organizationId: string, person: PersonRecord, membership: MembershipRecord) {
  const profile = asRecord(membership.agenda_viva_profile);
  const [{ data: roles, error: rolesError }, { data: entities, error: entitiesError }, { data: links, error: linksError }, { data: moduleSettings }] = await Promise.all([
    supabaseAdmin.from("oh_roles").select("id, name, slug, description, active, is_system, parent_role_id").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabaseAdmin.from("oh_spiritual_entities").select("id, name, slug, line, entity_type, active, attends_consulentes, appointment_enabled").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabaseAdmin.from("oh_person_entity_links").select("entity_id, relationship_type, is_primary_for_attendance, active").eq("organization_id", organizationId).eq("person_id", person.id).eq("active", true),
    supabaseAdmin.from("oh_module_settings").select("settings").eq("organization_id", organizationId).eq("module_slug", "agenda-viva").maybeSingle(),
  ]);
  if (rolesError || entitiesError || linksError) throw rolesError || entitiesError || linksError;
  const settings = asRecord(moduleSettings?.settings);
  const authorizedFunctionIds = asTextList(settings.wednesdayAuthorizedFunctionIds);
  const capabilities = resolveAppointmentCapabilities({ profile, roles: roles ?? [], wednesdayAuthorizedFunctionIds: authorizedFunctionIds });
  const linkedEntityIds = Array.from(new Set((links ?? [])
    .filter((link) => ["recebe", "cavalinho", "incorporates_for_consulente"].includes(asText(link.relationship_type)))
    .map((link) => asText(link.entity_id))
    .filter(Boolean)));
  const primaryLinkEntityId = asText((links ?? []).find((link) => link.is_primary_for_attendance === true)?.entity_id);
  const profilePrimaryEntityId = asText(profile.cavalinhoConsulenteEntityId);
  const cavalinhoConsulenteEntityId = linkedEntityIds.includes(primaryLinkEntityId)
    ? primaryLinkEntityId
    : linkedEntityIds.includes(profilePrimaryEntityId)
      ? profilePrimaryEntityId
      : linkedEntityIds.length === 1
        ? linkedEntityIds[0]
        : "";
  const cavalinhoConsulenteDefinitionCompleted = Object.prototype.hasOwnProperty.call(profile, "cavalinhoConsulenteDefinitionCompleted")
    ? profile.cavalinhoConsulenteDefinitionCompleted === true
    : linkedEntityIds.length > 0;
  const [familyPeople, familyRelationships, familyLinks] = await Promise.all([
    loadEligibleFamilyPeople(organizationId, person.id),
    loadFamilyRelationshipOptions(organizationId),
    loadPersonFamilyLinks(organizationId, person.id),
  ]);
  return {
    person: {
      id: person.id,
      fullName: person.full_name || "",
      whatsapp: person.whatsapp || "",
      email: displayEmail(person.email),
      notes: person.notes || "",
    },
    status: membership.status || "ativo",
    modules: Array.isArray(membership.module_slugs) ? membership.module_slugs : DEFAULT_MODULE_SLUGS,
    functionSlugs: Array.isArray(profile.functionSlugs) ? profile.functionSlugs.map((item) => asText(item)).filter(Boolean) : [],
    availableFunctions: filhoFunctionOptionsFromRoles(roles ?? []),
    agendaSlugs: Array.isArray(profile.agendaSlugs) ? profile.agendaSlugs.map((item) => asText(item)).filter(Boolean) : [],
    selectedFunctions: asDraftItems(profile.selectedFunctions),
    selectedAgenda: asDraftItems(profile.selectedAgenda),
    selectedEntityIds: linkedEntityIds,
    cavalinhoConsulenteEntityId,
    cavalinhoConsulenteDefinitionCompleted,
    availableEntities: (entities ?? []).filter((entity) => entity.active !== false).map((entity) => ({
      id: entity.id,
      name: entity.name || "Entidade",
      line: entity.line || "",
      entityType: entity.entity_type || "",
      attendsConsulentes: entity.attends_consulentes !== false,
      appointmentEnabled: entity.appointment_enabled !== false,
    })),
    submittedAt: asText(profile.submittedAt),
    lastProfileUpdateAt: asText(profile.lastProfileUpdateAt),
    profileUpdateStatus: asText(profile.profileUpdateStatus),
    pendingProfileUpdate: asRecord(profile.pendingProfileUpdate),
    familyPeople,
    familyRelationships,
    familyLinks,
    canReception: capabilities.canReception,
    canCambono: capabilities.canCambono,
    canCavalinho: capabilities.canCavalinho,
    canBookWednesday: capabilities.canBookWednesday,
    consultationScope: capabilities.consultationScope,
  };
}

function statusToken() {
  return crypto.randomUUID();
}

export async function GET(request: Request) {
  try {
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");
    const current = await currentFilho(request, organization.id);
    return NextResponse.json({ ok: true, organization, ...(await profilePayload(organization.id, current.person, current.membership)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar dados do Filho da Corrente." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const code = requestCode();
  try {
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");
    const current = await currentFilho(request, organization.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const fullName = asText(body.fullName);
    const whatsapp = onlyDigits(body.whatsapp);
    const email = normalizeEmail(body.email);
    const notes = asText(body.notes);
    const functionSlugs = asTextList(body.functionSlugs);
    const agendaSlugs = asTextList(body.agendaSlugs);
    const selectedFunctions = asDraftItems(body.selectedFunctions);
    const selectedAgenda = asDraftItems(body.selectedAgenda);
    const familyLinkInputs = parseFamilyLinks(body.familyLinks);
    const selectedFamilyLinks = await validateFamilyLinks({
      organizationId: organization.id,
      personId: current.person.id,
      links: familyLinkInputs,
    });
    const cavalinhoEntityIds = Array.from(new Set(asTextList(body.cavalinhoEntityIds)));
    const cavalinhoConsulenteEntityId = asText(body.cavalinhoConsulenteEntityId);
    const cavalinhoConsulenteDefinitionCompleted = body.cavalinhoConsulenteDefinitionCompleted === true;

    if (!fullName) throw new Error("Informe seu nome completo.");
    if (whatsapp.length < 10) throw new Error("Informe seu WhatsApp com DDD.");
    if (email && !email.includes("@")) throw new Error("Confira o e-mail informado.");
    if (!hasThursdayGroup(selectedAgenda)) {
      throw new Error(
        "Selecione pelo menos um Grupo de quinta-feira para concluir a atualização.",
      );
    }
    const requestedProfilePreview = { functionSlugs, selectedFunctions };
    const requestedHasCavalinho = profileHasCavalinho(requestedProfilePreview);
    const requestedHasSementinhaCoordinator = functionSlugs.includes(
      SEMENTINHA_COORDINATOR_SLUG,
    );
    const requestedSementinhaSubfunctions = functionSlugs.filter(
      isSementinhaSubfunctionSlug,
    );

    if (
      requestedSementinhaSubfunctions.length > 0 &&
      !requestedHasSementinhaCoordinator
    ) {
      throw new Error(
        "As sub-funções do Sementinha só podem ser selecionadas junto com a função Coordenador Sementinha.",
      );
    }

    if (requestedHasCavalinho && cavalinhoEntityIds.length === 0) {
      throw new Error("Selecione ao menos uma entidade que você recebe.");
    }
    if (requestedHasCavalinho && !cavalinhoConsulenteDefinitionCompleted) {
      throw new Error("Informe se alguma das entidades selecionadas atende Consulentes.");
    }
    if (requestedHasCavalinho && cavalinhoConsulenteEntityId && !cavalinhoEntityIds.includes(cavalinhoConsulenteEntityId)) {
      throw new Error("A entidade que atende Consulentes precisa estar entre as entidades que você recebe.");
    }
    let selectedEntities: Array<{ id: string; name: string }> = [];
    if (cavalinhoEntityIds.length > 0) {
      const { data: entityRows, error: entityError } = await supabaseAdmin
        .from("oh_spiritual_entities")
        .select("id, name, active, attends_consulentes")
        .eq("organization_id", organization.id)
        .eq("active", true)
        .in("id", cavalinhoEntityIds);
      if (entityError) throw entityError;
      selectedEntities = (entityRows ?? []).map((entity) => ({ id: entity.id, name: asText(entity.name) || "Entidade" }));
      if (selectedEntities.length !== cavalinhoEntityIds.length) throw new Error("Uma das entidades selecionadas não está mais disponível.");
    }

    const previousProfile = asRecord(current.membership.agenda_viva_profile);
    const previousFunctionSlugs = asTextList(previousProfile.functionSlugs);
    const previousAgendaSlugs = asTextList(previousProfile.agendaSlugs);
    const previousSelectedFunctions = asDraftItems(previousProfile.selectedFunctions);
    const previousSelectedAgenda = asDraftItems(previousProfile.selectedAgenda);
    const previousFamilyLinks = await loadPersonFamilyLinks(organization.id, current.person.id);
    const { data: previousEntityLinks, error: previousEntityLinksError } = await supabaseAdmin
      .from("oh_person_entity_links")
      .select("entity_id")
      .eq("organization_id", organization.id)
      .eq("person_id", current.person.id)
      .eq("active", true)
      .in("relationship_type", ["recebe", "cavalinho", "incorporates_for_consulente"]);
    if (previousEntityLinksError) throw previousEntityLinksError;
    const previousEntityIds = Array.from(
      new Set([
        ...asTextList(previousProfile.selectedEntityIds),
        ...(previousEntityLinks ?? []).map((link) => asText(link.entity_id)).filter(Boolean),
      ]),
    );
    const allEntityIds = Array.from(
      new Set([...previousEntityIds, ...cavalinhoEntityIds]),
    );
    const { data: changeEntityRows, error: changeEntityError } =
      allEntityIds.length > 0
        ? await supabaseAdmin
            .from("oh_spiritual_entities")
            .select("id, name")
            .eq("organization_id", organization.id)
            .in("id", allEntityIds)
        : { data: [], error: null };
    if (changeEntityError) throw changeEntityError;
    const entityLabels = new Map(
      (changeEntityRows ?? []).map((item) => [
        asText(item.id),
        asText(item.name) || asText(item.id),
      ]),
    );
    const now = new Date().toISOString();
    const updateToken = statusToken();
    const previousPerson = {
      fullName: current.person.full_name || "",
      whatsapp: current.person.whatsapp || "",
      email: displayEmail(current.person.email),
      notes: current.person.notes || "",
    };
    const requestedPerson = { fullName, whatsapp, email, notes };
    const requestedProfile = {
      functionSlugs,
      agendaSlugs,
      selectedFunctions,
      selectedAgenda,
      selectedEntityIds: requestedHasCavalinho ? cavalinhoEntityIds : [],
      selectedEntities,
      cavalinhoConsulenteEntityId: requestedHasCavalinho ? cavalinhoConsulenteEntityId : "",
      cavalinhoConsulenteDefinitionCompleted: requestedHasCavalinho ? cavalinhoConsulenteDefinitionCompleted : false,
      familyLinks: selectedFamilyLinks,
    };
    const previousFamilyKeys = previousFamilyLinks.map((item) => `${item.personId}:${item.relationshipTypeId}`);
    const requestedFamilyKeys = selectedFamilyLinks.map((item) => `${item.personId}:${item.relationshipTypeId}`);
    const changes = {
      functionsAdded: listDifference(functionSlugs, previousFunctionSlugs),
      functionsRemoved: listDifference(previousFunctionSlugs, functionSlugs),
      agendaAdded: listDifference(agendaSlugs, previousAgendaSlugs),
      agendaRemoved: listDifference(previousAgendaSlugs, agendaSlugs),
      entitiesAdded: listDifference(requestedHasCavalinho ? cavalinhoEntityIds : [], previousEntityIds),
      entitiesRemoved: listDifference(previousEntityIds, requestedHasCavalinho ? cavalinhoEntityIds : []),
      familyAdded: listDifference(requestedFamilyKeys, previousFamilyKeys),
      familyRemoved: listDifference(previousFamilyKeys, requestedFamilyKeys),
      personalData: [
        previousPerson.fullName !== requestedPerson.fullName ? "Nome completo" : "",
        onlyDigits(previousPerson.whatsapp) !== requestedPerson.whatsapp ? "WhatsApp" : "",
        normalizeEmail(previousPerson.email) !== requestedPerson.email ? "E-mail" : "",
        previousPerson.notes !== requestedPerson.notes ? "Observação" : "",
      ].filter(Boolean),
    };
    const previousFunctionLabels = itemLabelMap(previousSelectedFunctions);
    const requestedFunctionLabels = itemLabelMap(selectedFunctions);
    const previousAgendaLabels = itemLabelMap(previousSelectedAgenda);
    const requestedAgendaLabels = itemLabelMap(selectedAgenda);
    const previousFamilyLabels = familyKeyMap(previousFamilyLinks);
    const requestedFamilyLabels = familyKeyMap(selectedFamilyLinks);
    const changeDetails = {
      current: [
        `Nome: ${previousPerson.fullName || "não informado"}`,
        `WhatsApp: ${previousPerson.whatsapp || "não informado"}`,
        `E-mail: ${previousPerson.email || "não informado"}`,
        `Observação: ${previousPerson.notes || "não informada"}`,
        `Funções: ${previousSelectedFunctions.map((item) => item.label).join(", ") || "Somente Filho da Corrente"}`,
        `Agenda: ${previousSelectedAgenda.map((item) => item.label).join(", ") || "Nenhuma"}`,
        `Familiares: ${previousFamilyLinks.map((item) => `${item.personName} — ${item.relationshipLabel}`).join(", ") || "Nenhum"}`,
      ],
      added: [
        ...changes.functionsAdded.map((slug) => `Função: ${requestedFunctionLabels.get(slug) || slug}`),
        ...changes.agendaAdded.map((slug) => `Agenda: ${requestedAgendaLabels.get(slug) || slug}`),
        ...changes.familyAdded.map((key) => `Familiar: ${requestedFamilyLabels.get(key) || key}`),
        ...changes.entitiesAdded.map((id) => `Entidade: ${entityLabels.get(id) || id}`),
        ...changes.personalData.map((field) => `Dado alterado: ${field}`),
      ],
      removed: [
        ...changes.functionsRemoved.map((slug) => `Função: ${previousFunctionLabels.get(slug) || slug}`),
        ...changes.agendaRemoved.map((slug) => `Agenda: ${previousAgendaLabels.get(slug) || slug}`),
        ...changes.familyRemoved.map((key) => `Familiar: ${previousFamilyLabels.get(key) || key}`),
        ...changes.entitiesRemoved.map((id) => `Entidade: ${entityLabels.get(id) || id}`),
      ],
      requested: [
        `Nome: ${requestedPerson.fullName || "não informado"}`,
        `WhatsApp: ${requestedPerson.whatsapp || "não informado"}`,
        `E-mail: ${requestedPerson.email || "não informado"}`,
        `Observação: ${requestedPerson.notes || "não informada"}`,
        `Funções: ${selectedFunctions.map((item) => item.label).join(", ") || "Somente Filho da Corrente"}`,
        `Agenda: ${selectedAgenda.map((item) => item.label).join(", ") || "Nenhuma"}`,
        `Familiares: ${selectedFamilyLinks.map((item) => `${item.personName} — ${item.relationshipLabel}`).join(", ") || "Nenhum"}`,
      ],
    };

    const requestSummary = {
      requestType: "profile_update",
      statusToken: updateToken,
      requestedAt: now,
      previousPerson,
      requestedPerson,
      previousProfile: {
        functionSlugs: previousFunctionSlugs,
        agendaSlugs: previousAgendaSlugs,
        selectedFunctions: previousSelectedFunctions,
        selectedAgenda: previousSelectedAgenda,
        selectedEntityIds: previousEntityIds,
        familyLinks: previousFamilyLinks,
      },
      requestedProfile,
      changes,
      changeDetails,
    };

    const nextProfile = {
      ...previousProfile,
      source: "primeiro_acesso_filho_corrente",
      validationStatus: "ativo",
      profileUpdateStatus: "pendente_validacao",
      pendingProfileUpdateAt: now,
      pendingProfileUpdate: requestSummary,
    };

    const { error: membershipError } = await supabaseAdmin
      .from("oh_memberships")
      .update({
        active: true,
        status: "ativo",
        agenda_viva_profile: nextProfile,
        updated_at: now,
      })
      .eq("id", current.membership.id)
      .eq("organization_id", organization.id);
    if (membershipError) throw membershipError;

    const { error: validationError } = await supabaseAdmin.from("oh_first_access_validation_requests").insert({
      organization_id: organization.id,
      person_id: current.person.id,
      status: "pendente_validacao",
      full_name: fullName,
      whatsapp,
      email: displayEmail(email || current.person.email) || null,
      function_slugs: functionSlugs,
      agenda_slugs: agendaSlugs,
      summary: requestSummary,
    });
    if (validationError) throw validationError;

    const absoluteStatusUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/status?token=${encodeURIComponent(updateToken)}`;
    const validationUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/cliente/validacoes?personId=${encodeURIComponent(current.person.id)}`;
    const functionText = itemLines(selectedFunctions, "Somente Filho da Corrente").join("\n");
    const agendaText = itemLines(selectedAgenda, "Nenhuma agenda selecionada").join("\n");
    const entityText = selectedEntities.length ? selectedEntities.map((entity) => `- ${entity.name}`).join("\n") : "- Nenhuma entidade vinculada";
    const familyText = selectedFamilyLinks.length
      ? selectedFamilyLinks.map((item) => `- ${item.personName} — ${item.relationshipLabel}`).join("\n")
      : "- Nenhum familiar vinculado";
    const detailedChangeText = [
      "Cadastro atual:",
      ...(changeDetails.current.length ? changeDetails.current.map((item) => `- ${item}`) : ["- Nenhuma informação disponível"]),
      "",
      "Inclusões e alterações solicitadas:",
      ...(changeDetails.added.length ? changeDetails.added.map((item) => `+ ${item}`) : ["- Nenhuma inclusão"]),
      "",
      "Retiradas solicitadas:",
      ...(changeDetails.removed.length ? changeDetails.removed.map((item) => `- ${item}`) : ["- Nenhuma retirada"]),
    ].join("\n");
    const consulenteEntityName = selectedEntities.find((entity) => entity.id === cavalinhoConsulenteEntityId)?.name || "Nenhuma";
    const reviewerMessage = [
      "Tucxa em Harmonia",
      "",
      "Nova atualização cadastral aguardando validação.",
      `Nome: ${fullName}`,
      `WhatsApp: ${whatsapp}`,
      `E-mail: ${displayEmail(email || current.person.email) || "não informado"}`,
      "",
      detailedChangeText,
      "",
      "Funções solicitadas:",
      functionText,
      "",
      "Agenda solicitada:",
      agendaText,
      "",
      "Entidades que recebo:",
      entityText,
      `Entidade que atende Consulentes: ${consulenteEntityName}`,
      "",
      "Familiares vinculados:",
      familyText,
      "",
      notes ? `Observação: ${notes}` : "Observação: não informada",
      "",
      `Validar: ${validationUrl}`,
      `Acompanhamento: ${absoluteStatusUrl}`,
      `Código de referência: ${code}`,
    ].join("\n");

    const reviewers = await reviewerEmails(organization.id);
    await sendEmail({
      to: reviewers.join(", "),
      cc: reviewCopyEmail(),
      replyTo: displayEmail(email || current.person.email) || undefined,
      subject: "[Tucxa em Harmonia] Atualização cadastral aguardando validação",
      text: reviewerMessage,
    }).catch((mailError) => console.error("[OH/TUCXA perfil] falha ao avisar revisores", code, mailError));

    const personEmail = displayEmail(email || current.person.email);
    if (personEmail) {
      await sendEmail({
        to: personEmail,
        cc: reviewCopyEmail(),
        subject: "[Tucxa em Harmonia] Atualização enviada para validação",
        text: [
          `Olá, ${firstName(fullName)}.`,
          "",
          "Sua atualização cadastral foi enviada para validação do TUCXA.",
          "Seu acesso atual continua disponível enquanto a atualização é conferida.",
          "",
          detailedChangeText,
          "",
          "Acompanhe o andamento:",
          absoluteStatusUrl,
          "",
          `Código de referência: ${code}`,
        ].join("\n"),
      }).catch((mailError) => console.error("[OH/TUCXA perfil] falha ao avisar solicitante", code, mailError));
    }

    const whatsappMessage = [
      `Olá, sou o ${firstName(fullName)}.`,
      "",
      "Enviei uma atualização dos meus dados, funções e agenda no Tucxa em Harmonia.",
      "",
      `Nome: ${fullName}`,
      `WhatsApp: ${whatsapp}`,
      `E-mail: ${personEmail || "não informado"}`,
      "",
      detailedChangeText,
      "",
      "Funções solicitadas:",
      functionText,
      "",
      "Agenda solicitada:",
      agendaText,
      "",
      "Entidades que recebo:",
      entityText,
      `Entidade que atende Consulentes: ${consulenteEntityName}`,
      "",
      "Familiares vinculados:",
      familyText,
      "",
      notes ? `Observação: ${notes}` : "Observação: não informada",
      "",
      "Aguardo a validação do TUCXA.",
      "Vou acompanhar o andamento por aqui:",
      absoluteStatusUrl,
      "",
      fullName,
    ].join("\n");
    const waUrl = whatsappUrl(whatsappSupportPhone(), whatsappMessage);

    return NextResponse.json({
      ok: true,
      message: "Atualização enviada para validação do TUCXA.",
      statusUrl: absoluteStatusUrl,
      whatsappUrl: waUrl,
      whatsappPhone: whatsappSupportPhone(),
      requestId: code,
    });
  } catch (error) {
    console.error("[OH/TUCXA perfil]", { requestId: code, error });
    const message = error instanceof Error ? error.message : "Erro ao salvar atualização de dados.";
    return NextResponse.json({ error: message, requestId: code }, { status: 500 });
  }
}
