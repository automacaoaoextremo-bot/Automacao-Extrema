import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  asNumber,
  asText,
  normalizeFinancialSettings,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import {
  notifyContributionEvent,
  receptionContacts,
} from "@/lib/organizacao-em-harmonia/corrente-notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AuthContext = {
  organizationId: string;
  personId: string;
  fullName: string;
  email: string | null;
  whatsapp: string | null;
  organizationWhatsapp: string | null;
  canManageFinance: boolean;
};

type ApprovedFamilyContribution = {
  id: string;
  name: string;
  approvedAmount: number;
  members: Array<{
    id: string;
    personId: string;
    fullName: string;
    relationshipLabel: string;
  }>;
};

function legacySettings(value: unknown) {
  const current =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    pixKey: asText(current.pixKey) || "58.392.598/0001-91",
    pixReceiverName: asText(current.pixReceiverName) || "TUCXA",
    pixCity: asText(current.pixCity) || "CAMPINAS",
    persuasiveText:
      asText(current.persuasiveText) ||
      "Manter o Tucxa em harmonia também é cuidar de cada trabalho que acontece aqui. Escolha o melhor dia e organize sua contribuição com sigilo e tranquilidade.",
  };
}

function normalizeToken(value: unknown) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function profileRoleToken(value: unknown) {
  const profile = asObject(value);
  const selectedFunctions = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions.flatMap((item) => {
        const current = asObject(item);
        return [current.slug, current.label, current.name]
          .map(asText)
          .filter(Boolean);
      })
    : [];
  const functionSlugs = Array.isArray(profile.functionSlugs)
    ? profile.functionSlugs.map(asText).filter(Boolean)
    : [];

  return normalizeToken(
    [
      profile.isClientAdmin === true ? "administrador" : "",
      ...selectedFunctions,
      ...functionSlugs,
    ].join(" "),
  );
}

async function memberCanManageFinance(input: {
  organizationId: string;
  personId: string;
}) {
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("role_id, status, active, agenda_viva_profile")
    .eq("organization_id", input.organizationId)
    .eq("person_id", input.personId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership || membership.active === false) return false;

  const { data: role, error: roleError } = membership.role_id
    ? await supabaseAdmin
        .from("oh_roles")
        .select("slug, name, recommended_permissions, active")
        .eq("organization_id", input.organizationId)
        .eq("id", membership.role_id)
        .maybeSingle()
    : { data: null, error: null };

  if (roleError) throw roleError;

  const rolePermissions = Array.isArray(role?.recommended_permissions)
    ? role.recommended_permissions.map(asText).filter(Boolean)
    : [];
  const token = normalizeToken(
    [
      role?.slug,
      role?.name,
      ...rolePermissions,
      profileRoleToken(membership.agenda_viva_profile),
    ].join(" "),
  );

  return (
    token.includes("tesour") ||
    token.includes("finance") ||
    token.includes("administrador-sistema") ||
    token.includes("gestor-cliente")
  );
}

async function getAuthContext(request: Request): Promise<AuthContext> {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) throw new Error("Sessão não encontrada.");

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Sessão inválida.");

  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, whatsapp")
    .or("slug.eq.tucxa,name.ilike.%tucxa%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (organizationError) throw organizationError;
  if (!organization?.id) throw new Error("Organização Tucxa não localizada.");

  const { data: person, error: personError } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, active")
    .eq("organization_id", organization.id)
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (personError) throw personError;
  if (!person?.id || person.active === false) {
    throw new Error("Cadastro de Filho da Corrente não localizado ou inativo.");
  }

  return {
    organizationId: organization.id,
    personId: person.id,
    fullName:
      person.full_name ||
      userData.user.user_metadata?.full_name ||
      userData.user.email ||
      "Filho da Corrente",
    email: person.email || userData.user.email || null,
    whatsapp: person.whatsapp || null,
    organizationWhatsapp: organization.whatsapp || null,
    canManageFinance: await memberCanManageFinance({
      organizationId: organization.id,
      personId: person.id,
    }),
  };
}

async function loadSettings(organizationId: string) {
  const [{ data: financial, error }, { data: module }] = await Promise.all([
    supabaseAdmin
      .from("oh_financial_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_module_settings")
      .select("settings")
      .eq("organization_id", organizationId)
      .eq("module_slug", "corrente-em-dia")
      .maybeSingle(),
  ]);

  if (error) throw error;
  return {
    ...normalizeFinancialSettings(financial),
    ...legacySettings(module?.settings),
  };
}

function dueDateFor(day: number, offsetMonth = 0) {
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth() + offsetMonth,
    1,
    12,
  );
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(Math.max(day, 1), lastDay));
  return target.toISOString().slice(0, 10);
}

function pixPayload(
  settings: Awaited<ReturnType<typeof loadSettings>>,
  amount: number,
  description: string,
) {
  return [
    "PIX TUCXA",
    `chave: ${settings.pixKey}`,
    `recebedor: ${settings.pixReceiverName}`,
    `valor: R$ ${amount.toFixed(2).replace(".", ",")}`,
    `identificação: ${description}`,
  ].join(" | ");
}


function emv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function pixText(value: string, maxLength: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

function crc16Ccitt(value: string) {
  let crc = 0xffff;

  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc =
        (crc & 0x8000) !== 0
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPixPayload(input: {
  key: string;
  receiverName: string;
  city: string;
  amount: number;
  txid: string;
}) {
  const normalizedKey = input.key.replace(/\D/g, "").length === 14
    ? input.key.replace(/\D/g, "")
    : input.key.trim();
  const merchantAccount = [
    emv("00", "BR.GOV.BCB.PIX"),
    emv("01", normalizedKey),
  ].join("");
  const additionalData = emv("05", pixText(input.txid, 25) || "***");
  const payloadWithoutCrc = [
    emv("00", "01"),
    emv("26", merchantAccount),
    emv("52", "0000"),
    emv("53", "986"),
    emv("54", input.amount.toFixed(2)),
    emv("58", "BR"),
    emv("59", pixText(input.receiverName, 25) || "TUCXA"),
    emv("60", pixText(input.city, 15) || "CAMPINAS"),
    emv("62", additionalData),
    "6304",
  ].join("");

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}

const TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomTrackingCode() {
  const bytes = randomBytes(12);
  const characters = Array.from(
    bytes,
    (byte) => TRACKING_ALPHABET[byte % TRACKING_ALPHABET.length],
  ).join("");
  return `${characters.slice(0, 4)}-${characters.slice(4, 8)}-${characters.slice(8, 12)}`;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeEmail(value: unknown) {
  const email = asText(value).toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) ? email : "";
}

function whatsappShareUrl(message: string) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

async function loadFamilyData(context: AuthContext) {
  const [
    relationshipsResult,
    ownMembershipsResult,
    responsibleGroupsResult,
    activeMembershipsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("oh_family_relationship_types")
      .select(
        "id, slug, label, requires_member_confirmation, requires_financial_approval, allow_responsible_payment",
      )
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("oh_family_members")
      .select("family_group_id")
      .eq("organization_id", context.organizationId)
      .eq("person_id", context.personId)
      .eq("active", true),
    supabaseAdmin
      .from("oh_family_groups")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("responsible_person_id", context.personId)
      .neq("status", "cancelado"),
    supabaseAdmin
      .from("oh_memberships")
      .select("person_id")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .eq("status", "ativo"),
  ]);

  const firstFailure = [
    relationshipsResult,
    ownMembershipsResult,
    responsibleGroupsResult,
    activeMembershipsResult,
  ].find((result) => result.error);
  if (firstFailure?.error) throw firstFailure.error;

  const eligiblePersonIds = Array.from(
    new Set(
      (activeMembershipsResult.data ?? [])
        .map((item) => asText(item.person_id))
        .filter((item) => item && item !== context.personId),
    ),
  );

  const peopleResult = eligiblePersonIds.length
    ? await supabaseAdmin
        .from("oh_people")
        .select("id, full_name")
        .eq("organization_id", context.organizationId)
        .eq("active", true)
        .in("id", eligiblePersonIds)
        .order("full_name", { ascending: true })
    : { data: [], error: null };

  if (peopleResult.error) throw peopleResult.error;

  const groupIds = Array.from(
    new Set([
      ...(ownMembershipsResult.data ?? []).map((item) => item.family_group_id),
      ...(responsibleGroupsResult.data ?? []).map((item) => item.id),
    ]),
  ).filter(Boolean);

  if (groupIds.length === 0) {
    return {
      relationshipTypes: relationshipsResult.data ?? [],
      people: peopleResult.data ?? [],
      familyGroups: [],
      approvedFamily: null as ApprovedFamilyContribution | null,
    };
  }

  const [groupsResult, membersResult] = await Promise.all([
    supabaseAdmin
      .from("oh_family_groups")
      .select(
        "id, name, responsible_person_id, contribution_mode, status, notes, requested_amount, approved_amount, decision_notes, submitted_at, decided_at, approved_at, created_at",
      )
      .eq("organization_id", context.organizationId)
      .in("id", groupIds)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("oh_family_members")
      .select(
        "id, family_group_id, person_id, relationship_type_id, individual_amount, included_in_payment, member_confirmed_at, financial_approved_at, active, person:oh_people(id, full_name), relationship:oh_family_relationship_types(id, label)",
      )
      .eq("organization_id", context.organizationId)
      .in("family_group_id", groupIds)
      .eq("active", true),
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (membersResult.error) throw membersResult.error;

  const familyGroups = (groupsResult.data ?? []).map((group) => ({
    ...group,
    members: (membersResult.data ?? []).filter(
      (member) => member.family_group_id === group.id,
    ),
  }));

  const approvedGroup = familyGroups.find(
    (group) =>
      group.responsible_person_id === context.personId &&
      group.status === "ativo" &&
      asNumber(group.approved_amount, 0) > 0,
  );

  const approvedFamily: ApprovedFamilyContribution | null = approvedGroup
    ? {
        id: approvedGroup.id,
        name: approvedGroup.name,
        approvedAmount: asNumber(approvedGroup.approved_amount, 0),
        members: approvedGroup.members
          .filter((member) => member.included_in_payment !== false)
          .map((member) => {
            const personValue = Array.isArray(member.person)
              ? member.person[0] ?? null
              : member.person;
            const relationshipValue = Array.isArray(member.relationship)
              ? member.relationship[0] ?? null
              : member.relationship;

            return {
              id: member.id,
              personId: asText(member.person_id),
              fullName: asText(personValue?.full_name) || "Filho da Corrente",
              relationshipLabel: asText(relationshipValue?.label),
            };
          }),
      }
    : null;

  return {
    relationshipTypes: relationshipsResult.data ?? [],
    people: peopleResult.data ?? [],
    familyGroups,
    approvedFamily,
  };
}

async function loadPayload(context: AuthContext) {
  const settings = await loadSettings(context.organizationId);
  const contacts = await receptionContacts({
    organizationId: context.organizationId,
    configuredName: settings.receptionContactName,
    configuredWhatsapp: settings.receptionWhatsapp,
    fallbackWhatsapp: context.organizationWhatsapp,
  });
  const [contributionsResult, preferenceResult, familyData] = await Promise.all([
    supabaseAdmin
      .from("oh_contributions")
      .select(
        "id, amount, due_date, paid_at, status, payment_method, proof_url, notes, contribution_kind, recurrence_type, preferred_due_day, family_group_id, created_at",
      )
      .eq("organization_id", context.organizationId)
      .eq("person_id", context.personId)
      .order("due_date", { ascending: false })
      .limit(80),
    supabaseAdmin
      .from("oh_contribution_preferences")
      .select(
        "preferred_due_day, reminder_days_before, reminder_channels, recurring_mode, recurring_status, family_group_id",
      )
      .eq("organization_id", context.organizationId)
      .eq("person_id", context.personId)
      .maybeSingle(),
    loadFamilyData(context),
  ]);

  if (contributionsResult.error) throw contributionsResult.error;
  if (preferenceResult.error) throw preferenceResult.error;

  const preference = preferenceResult.data ?? {
    preferred_due_day: settings.defaultDueDay,
    reminder_days_before: settings.reminderDaysBefore,
    reminder_channels: settings.reminderChannels,
    recurring_mode: "nao_programada",
    recurring_status: "inativo",
    family_group_id: null,
  };

  const preferredDay =
    Number(preference.preferred_due_day) || settings.defaultDueDay;
  const amount =
    familyData.approvedFamily?.approvedAmount || settings.defaultMonthlyAmount;
  const identification = familyData.approvedFamily
    ? `Filho da Corrente - ${context.fullName} - ${familyData.approvedFamily.name}`
    : `Filho da Corrente - ${context.fullName}`;
  const pixCopyPaste = pixPayload(settings, amount, identification);
  const qrCodeDataUrl = await QRCode.toDataURL(pixCopyPaste, {
    margin: 1,
    width: 360,
  });
  const upcoming = [0, 1, 2].map((offset) => ({
    dueDate: dueDateFor(preferredDay, offset),
    amount,
    status: offset === 0 ? "próxima" : "prevista",
  }));

  return {
    currentPerson: {
      fullName: context.fullName,
      email: context.email,
      whatsapp: context.whatsapp,
    },
    canManageFinance: context.canManageFinance,
    receptionContacts: contacts,
    settings: {
      defaultMonthlyAmount: amount,
      configuredDefaultMonthlyAmount: settings.defaultMonthlyAmount,
      amountIsMandatory: settings.amountIsMandatory,
      allowCustomAmount: settings.allowCustomAmount,
      allowedDueDays: settings.allowedDueDays,
      defaultDueDay: settings.defaultDueDay,
      reminderDaysBefore: settings.reminderDaysBefore,
      reminderChannels: settings.reminderChannels,
      familyContributionsEnabled: settings.familyContributionsEnabled,
      familyRequiresMemberConfirmation:
        settings.familyRequiresMemberConfirmation,
      familyRequiresFinancialApproval:
        settings.familyRequiresFinancialApproval,
      pixKey: settings.pixKey,
      pixReceiverName: settings.pixReceiverName,
      persuasiveText: settings.persuasiveText,
      recurringOptions: [
        {
          value: "pontual",
          label: "Pix — contribuição única",
          available: true,
        },
        {
          value: "pix_agendado",
          label: "Pix recorrente agendado no meu banco",
          available: true,
        },
      ],
    },
    preference,
    contributions: contributionsResult.data ?? [],
    upcoming,
    pixCopyPaste,
    qrCodeDataUrl,
    ...familyData,
  };
}

async function createContributionIntent(
  request: Request,
  context: AuthContext,
  body: Record<string, unknown>,
) {
  const settings = await loadSettings(context.organizationId);
  const familyData = await loadFamilyData(context);
  const approvedFamily = familyData.approvedFamily;
  const paymentMethod = asText(body.paymentMethod) || "pix";
  const recurrenceType = asText(body.recurrenceType) || "pontual";

  if (!["pix", "recepcao"].includes(paymentMethod)) {
    throw new Error("Forma de pagamento inválida.");
  }
  if (!["pontual", "pix_agendado"].includes(recurrenceType)) {
    throw new Error("Forma de recorrência inválida.");
  }
  if (paymentMethod !== "pix" && recurrenceType !== "pontual") {
    throw new Error(
      "A recorrência agendada está disponível somente para pagamentos por Pix.",
    );
  }

  const recurrenceStartDate = asText(body.recurrenceStartDate).slice(0, 10);
  const recurrenceOccurrences = Math.trunc(
    asNumber(body.recurrenceOccurrences, 0),
  );
  if (recurrenceType === "pix_agendado") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(recurrenceStartDate)) {
      throw new Error("Informe a data da primeira contribuição recorrente.");
    }
    if (recurrenceOccurrences < 2 || recurrenceOccurrences > 120) {
      throw new Error("Informe uma quantidade entre 2 e 120 contribuições.");
    }
  }

  const requestedEmail = normalizeEmail(body.email);
  const updateEmail = body.updateEmail === true;
  let effectiveEmail = context.email;
  let emailUpdated = false;

  if (asText(body.email) && !requestedEmail) {
    throw new Error("Informe um e-mail válido ou deixe o campo em branco.");
  }

  if (requestedEmail) {
    effectiveEmail = requestedEmail;
    if (updateEmail && requestedEmail !== context.email) {
      const { error: updateEmailError } = await supabaseAdmin
        .from("oh_people")
        .update({
          email: requestedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", context.organizationId)
        .eq("id", context.personId);

      if (updateEmailError) throw updateEmailError;
      context.email = requestedEmail;
      emailUpdated = true;
    }
  }

  const requestedContributionId = asText(body.contributionId);
  const requestedUploadToken = asText(body.uploadToken);
  const requestedTrackingCode = asText(body.trackingCode);
  const requestedResumeUrl = asText(body.resumeUrl);
  let existingContribution: {
    id: string;
    status: string;
    metadata: unknown;
    receipt_uploaded_at: string | null;
  } | null = null;

  if (requestedContributionId) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("oh_contributions")
      .select("id, status, metadata, receipt_uploaded_at")
      .eq("organization_id", context.organizationId)
      .eq("person_id", context.personId)
      .eq("id", requestedContributionId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing?.id) {
      throw new Error("A contribuição que seria editada não foi localizada.");
    }
    if (
      existing.receipt_uploaded_at ||
      ["comprovante_enviado", "confirmado", "aprovado", "pago", "cancelado"].includes(
        asText(existing.status),
      )
    ) {
      throw new Error(
        "Esta contribuição já foi encaminhada para conferência e não pode mais ser editada por este formulário.",
      );
    }

    const existingMetadata = asObject(existing.metadata);
    if (
      !requestedUploadToken ||
      asText(existingMetadata.proofUploadToken) !== requestedUploadToken
    ) {
      throw new Error("Não foi possível validar a edição desta contribuição.");
    }
    if (!requestedTrackingCode || !requestedResumeUrl) {
      throw new Error("Os dados de acompanhamento da contribuição estão incompletos.");
    }

    existingContribution = {
      id: existing.id,
      status: asText(existing.status),
      metadata: existing.metadata,
      receipt_uploaded_at: existing.receipt_uploaded_at,
    };
  }

  const editing = Boolean(existingContribution);
  const amount = approvedFamily?.approvedAmount || settings.defaultMonthlyAmount;
  const contributionId = existingContribution?.id ?? randomUUID();
  const uploadToken = editing ? requestedUploadToken : randomUUID();
  const resumeToken = editing
    ? ""
    : randomBytes(32).toString("base64url");
  const trackingCode = editing
    ? requestedTrackingCode
    : randomTrackingCode();
  const resumeExpiresAt = new Date(
    Date.now() + 180 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dueDate =
    recurrenceType === "pix_agendado"
      ? recurrenceStartDate
      : dueDateFor(settings.defaultDueDay, 0);
  const requiresReception = paymentMethod === "recepcao";
  const status = requiresReception
    ? "aguardando_recepcao"
    : "aguardando_comprovante";
  const identification = approvedFamily
    ? `Filho da Corrente - ${context.fullName} - ${approvedFamily.name}`
    : `Filho da Corrente - ${context.fullName}`;
  let pixCopyPaste: string | null = null;
  let qrCodeDataUrl: string | null = null;

  if (!requiresReception) {
    pixCopyPaste = buildPixPayload({
      key: settings.pixKey,
      receiverName: settings.pixReceiverName,
      city: settings.pixCity,
      amount,
      txid: contributionId.replace(/-/g, "").slice(0, 25),
    });
  }

  const existingMetadata = asObject(existingContribution?.metadata);
  const contributionValues = {
    organization_id: context.organizationId,
    person_id: context.personId,
    contributor_name: context.fullName,
    contributor_email: effectiveEmail,
    contributor_whatsapp: context.whatsapp,
    amount,
    due_date: dueDate,
    status,
    payment_method: paymentMethod,
    notes: asText(body.notes) || null,
    contribution_kind:
      recurrenceType === "pontual" ? "pontual" : "recorrente",
    is_anonymous: false,
    recurrence_type: recurrenceType,
    preferred_due_day:
      recurrenceType === "pontual" ? settings.defaultDueDay : null,
    recurrence_start_date:
      recurrenceType === "pix_agendado" ? recurrenceStartDate : null,
    recurrence_occurrences:
      recurrenceType === "pix_agendado" ? recurrenceOccurrences : null,
    family_group_id: approvedFamily?.id ?? null,
    public_identification_mode: "sigiloso",
    metadata: {
      ...existingMetadata,
      source: "filho_corrente_painel",
      confidential: true,
      proofUploadToken: uploadToken,
      identification,
      emailUpdated,
      requiresReception,
      familyContribution: approvedFamily
        ? {
            id: approvedFamily.id,
            name: approvedFamily.name,
            approvedAmount: approvedFamily.approvedAmount,
            members: approvedFamily.members.map((member) => ({
              personId: member.personId,
              fullName: member.fullName,
              relationshipLabel: member.relationshipLabel,
            })),
          }
        : null,
      assistedPaymentLabel: requiresReception
        ? "Cartão de Crédito, Débito ou Dinheiro"
        : null,
      editedAt: editing ? new Date().toISOString() : null,
    },
    updated_at: new Date().toISOString(),
  };

  let contribution: { id: string; status: string; due_date: string } | null = null;

  if (editing) {
    const { data, error } = await supabaseAdmin
      .from("oh_contributions")
      .update(contributionValues)
      .eq("organization_id", context.organizationId)
      .eq("person_id", context.personId)
      .eq("id", contributionId)
      .select("id, status, due_date")
      .single();

    if (error) throw error;
    contribution = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("oh_contributions")
      .insert({
        id: contributionId,
        ...contributionValues,
        public_tracking_code_hash: sha256(
          trackingCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
        ),
        receipt_resume_token_hash: sha256(resumeToken),
        receipt_resume_created_at: new Date().toISOString(),
        receipt_resume_expires_at: resumeExpiresAt,
      })
      .select("id, status, due_date")
      .single();

    if (error) throw error;
    contribution = data;
  }

  if (pixCopyPaste) {
    try {
      qrCodeDataUrl = await QRCode.toDataURL(pixCopyPaste, {
        margin: 1,
        width: 420,
        errorCorrectionLevel: "M",
      });
    } catch (qrError) {
      console.error("[corrente-em-dia][member-pix-qr]", qrError);
    }
  }

  const contacts = await receptionContacts({
    organizationId: context.organizationId,
    configuredName: settings.receptionContactName,
    configuredWhatsapp: settings.receptionWhatsapp,
    fallbackWhatsapp: context.organizationWhatsapp,
  });
  const reception = contacts[0] ?? null;
  const receptionMessage = [
    `Olá, ${reception?.name || "Recepção do Tucxa"}.`,
    `Sou ${context.fullName}, Filho(a) da Corrente.`,
    `Registrei no Corrente em Dia o pagamento de ${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por Cartão de Crédito, Débito ou Dinheiro.`,
    approvedFamily
      ? `Contribuição familiar: ${approvedFamily.members.map((member) => member.fullName).join(", ")}.`
      : "",
    `Código: ${trackingCode}.`,
    "Poderia me orientar para concluir o pagamento?",
  ].filter(Boolean).join("\n");
  const receptionWhatsappUrl = reception
    ? `${reception.whatsappUrl}?text=${encodeURIComponent(receptionMessage)}`
    : null;

  const resumeUrl = editing
    ? requestedResumeUrl
    : new URL(
        `/solucoes/organizacao-em-harmonia/tucxa/contribuir?retomar=${encodeURIComponent(resumeToken)}`,
        request.url,
      ).toString();
  const confirmationMessage = [
    "Tucxa — Corrente em Dia",
    `Contribuição ${editing ? "atualizada" : "registrada"} por ${context.fullName}.`,
    `Valor: ${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    approvedFamily
      ? `Agregados: ${approvedFamily.members.map((member) => member.fullName).join(", ")}.`
      : "",
    `Forma: ${requiresReception ? "Cartão de Crédito, Débito ou Dinheiro" : "Pix"}.`,
    `Situação: ${requiresReception ? "aguardando atendimento da Recepção" : "aguardando comprovante"}.`,
    `Código de acompanhamento: ${trackingCode}.`,
  ].filter(Boolean).join("\n");

  const notification = await notifyContributionEvent({
    organizationId: context.organizationId,
    contributionId,
    contributorName: context.fullName,
    contributorEmail: effectiveEmail,
    amount,
    status,
    paymentMethod: requiresReception
      ? "Cartão de Crédito, Débito ou Dinheiro"
      : "Pix",
    event: requiresReception ? "aguardando_recepcao" : "registrada",
    dueDate,
    notes: asText(body.notes) || null,
    trackingCode,
    extraEmails: settings.contributionNotificationEmails,
    includeReception: requiresReception,
  });

  return {
    contribution,
    uploadToken,
    trackingCode,
    resumeUrl,
    pixCopyPaste,
    qrCodeDataUrl,
    pix: requiresReception
      ? null
      : {
          key: settings.pixKey,
          receiverName: settings.pixReceiverName,
          amount,
          identification,
        },
    requiresReception,
    receptionWhatsappUrl,
    whatsappShareUrl: whatsappShareUrl(confirmationMessage),
    emailUpdated,
    notificationWarning: notification.ok
      ? null
      : "A contribuição foi salva, mas um ou mais avisos por e-mail não puderam ser enviados.",
    message: requiresReception
      ? "Intenção registrada. A Tesouraria/Financeiro já visualiza que o pagamento aguarda a Recepção."
      : editing
        ? "Contribuição atualizada. Faça o Pix e envie o comprovante para conferência."
        : "Contribuição registrada. Faça o Pix e envie o comprovante para conferência.",
  };
}

async function createContribution(
  context: AuthContext,
  body: Record<string, unknown>,
) {
  const settings = await loadSettings(context.organizationId);
  const familyData = await loadFamilyData(context);
  const approvedFamily = familyData.approvedFamily;
  const preferenceResult = await supabaseAdmin
    .from("oh_contribution_preferences")
    .select("preferred_due_day, recurring_mode")
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId)
    .maybeSingle();

  if (preferenceResult.error) throw preferenceResult.error;

  const preference = preferenceResult.data;
  const familyAmount = approvedFamily?.approvedAmount || 0;
  const requestedAmount = Math.max(
    1,
    asNumber(body.amount, familyAmount || settings.defaultMonthlyAmount),
  );
  const amount = familyAmount
    ? familyAmount
    : settings.allowCustomAmount
      ? requestedAmount
      : settings.defaultMonthlyAmount;
  const requestedDueDay = Math.trunc(
    asNumber(
      body.preferredDueDay,
      preference?.preferred_due_day ?? settings.defaultDueDay,
    ),
  );
  const preferredDueDay = settings.allowedDueDays.includes(requestedDueDay)
    ? requestedDueDay
    : settings.defaultDueDay;
  const dueDate =
    asText(body.dueDate) || dueDateFor(preferredDueDay, 0);
  const paymentMethod = asText(body.paymentMethod) || "pix";
  const proofUrl = asText(body.proofUrl);
  const notes = asText(body.notes);
  const recurringMode =
    asText(body.recurringMode) ||
    asText(preference?.recurring_mode) ||
    "nao_programada";
  if (!["nao_programada", "pix_agendado"].includes(recurringMode)) {
    throw new Error(
      "Essa recorrência ainda depende da integração com um provedor.",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("oh_contributions")
    .insert({
      organization_id: context.organizationId,
      person_id: context.personId,
      contributor_name: context.fullName,
      contributor_email: context.email,
      contributor_whatsapp: context.whatsapp,
      amount,
      due_date: dueDate,
      status: proofUrl ? "comprovante_enviado" : "aguardando_pagamento",
      payment_method: paymentMethod,
      proof_url: proofUrl || null,
      notes: notes || null,
      contribution_kind:
        recurringMode === "nao_programada" ? "pontual" : "recorrente",
      is_anonymous: false,
      recurrence_type:
        recurringMode === "nao_programada" ? "pontual" : recurringMode,
      preferred_due_day: preferredDueDay,
      family_group_id: approvedFamily?.id ?? null,
      public_identification_mode: "sigiloso",
      metadata: {
        source: "filho_corrente",
        email: context.email,
        whatsapp: context.whatsapp,
        familyContribution: approvedFamily
          ? {
              id: approvedFamily.id,
              name: approvedFamily.name,
              approvedAmount: approvedFamily.approvedAmount,
              members: approvedFamily.members,
            }
          : null,
      },
    })
    .select("id, status")
    .single();

  if (error) throw error;

  return {
    contribution: data,
    message:
      "Contribuição registrada para conferência sigilosa da Tesouraria/Financeiro.",
  };
}

async function savePreferences(
  context: AuthContext,
  body: Record<string, unknown>,
) {
  const settings = await loadSettings(context.organizationId);
  const preferredDueDay = Math.trunc(
    asNumber(body.preferredDueDay, settings.defaultDueDay),
  );
  if (!settings.allowedDueDays.includes(preferredDueDay)) {
    throw new Error("Escolha um dos dias de contribuição permitidos.");
  }

  const { data: currentPreference, error: currentPreferenceError } =
    await supabaseAdmin
      .from("oh_contribution_preferences")
      .select("recurring_mode, recurring_status, family_group_id")
      .eq("organization_id", context.organizationId)
      .eq("person_id", context.personId)
      .maybeSingle();

  if (currentPreferenceError) throw currentPreferenceError;

  const requestedRecurringMode = asText(body.recurringMode);
  const storedRecurringMode = asText(currentPreference?.recurring_mode);
  const recurringMode = ["nao_programada", "pix_agendado"].includes(
    requestedRecurringMode,
  )
    ? requestedRecurringMode
    : ["nao_programada", "pix_agendado"].includes(storedRecurringMode)
      ? storedRecurringMode
      : "nao_programada";

  const reminderDaysBefore = Array.isArray(body.reminderDaysBefore)
    ? body.reminderDaysBefore
        .map((item) => Math.trunc(asNumber(item)))
        .filter((item) => item >= 0 && item <= 30)
    : settings.reminderDaysBefore;
  const reminderChannels = Array.isArray(body.reminderChannels)
    ? body.reminderChannels.map(asText).filter(Boolean)
    : settings.reminderChannels;

  const { error } = await supabaseAdmin
    .from("oh_contribution_preferences")
    .upsert(
      {
        organization_id: context.organizationId,
        person_id: context.personId,
        preferred_due_day: preferredDueDay,
        reminder_days_before: reminderDaysBefore,
        reminder_channels: reminderChannels,
        recurring_mode: recurringMode,
        recurring_status:
          recurringMode === "nao_programada"
            ? asText(currentPreference?.recurring_status) || "inativo"
            : "programado",
        family_group_id: currentPreference?.family_group_id ?? null,
        metadata: {
          updatedBy: "filho_corrente",
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,person_id" },
    );

  if (error) throw error;
  return { message: "Organização e lembretes salvos." };
}

async function requestFamilyGroup(
  context: AuthContext,
  body: Record<string, unknown>,
) {
  const settings = await loadSettings(context.organizationId);
  if (!settings.familyContributionsEnabled) {
    throw new Error("A contribuição familiar não está habilitada.");
  }

  const requestedAmount = Math.round(asNumber(body.amount, 0) * 100) / 100;
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new Error("Informe o valor total que você consegue contribuir.");
  }

  const members = Array.isArray(body.members)
    ? body.members.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];

  if (members.length === 0) {
    throw new Error("Inclua pelo menos um familiar.");
  }

  const personIds = Array.from(
    new Set(members.map((item) => asText(item.personId)).filter(Boolean)),
  );
  const relationshipIds = Array.from(
    new Set(
      members
        .map((item) => asText(item.relationshipTypeId))
        .filter(Boolean),
    ),
  );

  const [peopleResult, relationshipsResult, membershipsResult] =
    await Promise.all([
      supabaseAdmin
        .from("oh_people")
        .select("id, full_name")
        .eq("organization_id", context.organizationId)
        .in("id", personIds)
        .eq("active", true),
      supabaseAdmin
        .from("oh_family_relationship_types")
        .select(
          "id, requires_member_confirmation, requires_financial_approval",
        )
        .eq("organization_id", context.organizationId)
        .in("id", relationshipIds)
        .eq("active", true),
      supabaseAdmin
        .from("oh_memberships")
        .select("person_id")
        .eq("organization_id", context.organizationId)
        .in("person_id", personIds)
        .eq("active", true)
        .eq("status", "ativo"),
    ]);

  if (peopleResult.error) throw peopleResult.error;
  if (relationshipsResult.error) throw relationshipsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  if ((peopleResult.data ?? []).length !== personIds.length) {
    throw new Error("Um dos familiares não está disponível.");
  }
  if ((relationshipsResult.data ?? []).length !== relationshipIds.length) {
    throw new Error("Um dos graus de parentesco não está disponível.");
  }
  const activeMemberPersonIds = new Set(
    (membershipsResult.data ?? [])
      .map((item) => asText(item.person_id))
      .filter(Boolean),
  );
  if (personIds.some((personId) => !activeMemberPersonIds.has(personId))) {
    throw new Error(
      "Todos os integrantes precisam possuir acesso ativo como Filhos da Corrente.",
    );
  }

  const status = settings.familyRequiresFinancialApproval
    ? "aguardando_aprovacao"
    : "ativo";
  const now = new Date().toISOString();

  const { data: existingPending, error: existingPendingError } =
    await supabaseAdmin
      .from("oh_family_groups")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("responsible_person_id", context.personId)
      .eq("status", "aguardando_aprovacao")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingPendingError) throw existingPendingError;

  const groupValues = {
    organization_id: context.organizationId,
    name: asText(body.name) || `Família de ${context.fullName}`,
    responsible_person_id: context.personId,
    contribution_mode: "consolidada",
    status,
    notes:
      "Solicitação criada pelo Filho da Corrente para análise do Tucxa em Harmonia.",
    requested_amount: requestedAmount,
    approved_amount: status === "ativo" ? requestedAmount : null,
    submitted_at: now,
    decision_notes: null,
    decided_at: status === "ativo" ? now : null,
    approved_by: status === "ativo" ? context.personId : null,
    approved_at: status === "ativo" ? now : null,
    updated_at: now,
  };

  let group: { id: string };

  if (existingPending?.id) {
    const { data, error } = await supabaseAdmin
      .from("oh_family_groups")
      .update(groupValues)
      .eq("organization_id", context.organizationId)
      .eq("id", existingPending.id)
      .select("id")
      .single();

    if (error) throw error;
    group = data;

    const { error: clearMembersError } = await supabaseAdmin
      .from("oh_family_members")
      .delete()
      .eq("organization_id", context.organizationId)
      .eq("family_group_id", group.id);

    if (clearMembersError) throw clearMembersError;
  } else {
    const { data, error } = await supabaseAdmin
      .from("oh_family_groups")
      .insert({
        ...groupValues,
        created_by: context.personId,
      })
      .select("id")
      .single();

    if (error) throw error;
    group = data;
  }

  if (status === "ativo") {
    const { error: replaceError } = await supabaseAdmin
      .from("oh_family_groups")
      .update({
        status: "substituido",
        updated_at: now,
      })
      .eq("organization_id", context.organizationId)
      .eq("responsible_person_id", context.personId)
      .eq("status", "ativo")
      .neq("id", group.id);

    if (replaceError) throw replaceError;
  }

  const rows = members.map((member) => {
    const relationshipId = asText(member.relationshipTypeId);
    return {
      organization_id: context.organizationId,
      family_group_id: group.id,
      person_id: asText(member.personId),
      relationship_type_id: relationshipId,
      individual_amount: null,
      included_in_payment: true,
      member_confirmed_at: now,
      financial_approved_at: status === "ativo" ? now : null,
      active: true,
    };
  });

  const { error: memberError } = await supabaseAdmin
    .from("oh_family_members")
    .insert(rows);
  if (memberError) throw memberError;

  if (status === "ativo") {
    const { error: preferenceError } = await supabaseAdmin
      .from("oh_contribution_preferences")
      .upsert(
        {
          organization_id: context.organizationId,
          person_id: context.personId,
          family_group_id: group.id,
          updated_at: now,
        },
        { onConflict: "organization_id,person_id" },
      );

    if (preferenceError) throw preferenceError;
  }

  return {
    message:
      status === "ativo"
        ? "Contribuição familiar criada e aprovada conforme a configuração atual."
        : existingPending?.id
          ? "Sua solicitação familiar pendente foi atualizada e continua aguardando aprovação."
          : "Solicitação familiar enviada para aprovação do responsável do Tucxa em Harmonia.",
  };
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    return NextResponse.json(await loadPayload(context));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar Corrente em Dia.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = asText(body.action);

    if (action === "createContributionIntent") {
      return NextResponse.json({
        ok: true,
        ...(await createContributionIntent(request, context, body)),
      });
    }
    if (action === "createContribution") {
      return NextResponse.json({
        ok: true,
        ...(await createContribution(context, body)),
      });
    }
    if (action === "savePreferences") {
      return NextResponse.json({
        ok: true,
        ...(await savePreferences(context, body)),
      });
    }
    if (action === "requestFamilyGroup") {
      return NextResponse.json({
        ok: true,
        ...(await requestFamilyGroup(context, body)),
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao salvar Corrente em Dia.",
      },
      { status: 500 },
    );
  }
}
