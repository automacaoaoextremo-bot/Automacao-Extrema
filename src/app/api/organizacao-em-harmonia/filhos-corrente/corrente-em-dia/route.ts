import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  asNumber,
  asText,
  normalizeFinancialSettings,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AuthContext = {
  organizationId: string;
  personId: string;
  fullName: string;
  email: string | null;
  whatsapp: string | null;
};

type RelationshipRule = {
  id: string;
  requires_member_confirmation: boolean;
  requires_financial_approval: boolean;
};

function legacySettings(value: unknown) {
  const current =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    pixKey: asText(current.pixKey) || "tucxacentro@gmail.com",
    pixReceiverName: asText(current.pixReceiverName) || "TUCXA",
    pixCity: asText(current.pixCity) || "CAMPINAS",
    persuasiveText:
      asText(current.persuasiveText) ||
      "Manter o Tucxa em harmonia também é cuidar de cada trabalho que acontece aqui. Escolha o melhor dia e organize sua contribuição com sigilo e tranquilidade.",
  };
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
    .select("id")
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

async function loadFamilyData(context: AuthContext) {
  const [
    relationshipsResult,
    ownMembershipsResult,
    responsibleGroupsResult,
    peopleResult,
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
      .from("oh_people")
      .select("id, full_name")
      .eq("organization_id", context.organizationId)
      .eq("active", true)
      .neq("id", context.personId)
      .order("full_name", { ascending: true })
      .limit(500),
  ]);

  const failure = [
    relationshipsResult,
    ownMembershipsResult,
    responsibleGroupsResult,
    peopleResult,
  ].find((result) => result.error);
  if (failure?.error) throw failure.error;

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
    };
  }

  const [{ data: groups, error: groupsError }, { data: members, error: membersError }] =
    await Promise.all([
      supabaseAdmin
        .from("oh_family_groups")
        .select(
          "id, name, responsible_person_id, contribution_mode, status, notes, approved_at",
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

  if (groupsError) throw groupsError;
  if (membersError) throw membersError;

  return {
    relationshipTypes: relationshipsResult.data ?? [],
    people: peopleResult.data ?? [],
    familyGroups: (groups ?? []).map((group) => ({
      ...group,
      members: (members ?? []).filter(
        (member) => member.family_group_id === group.id,
      ),
    })),
  };
}

async function loadPayload(context: AuthContext) {
  const settings = await loadSettings(context.organizationId);
  const [
    contributionsResult,
    preferenceResult,
    familyData,
  ] = await Promise.all([
    supabaseAdmin
      .from("oh_contributions")
      .select(
        "id, amount, due_date, paid_at, status, payment_method, proof_url, notes, contribution_kind, recurrence_type, preferred_due_day, created_at",
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
  const amount = settings.defaultMonthlyAmount;
  const pixCopyPaste = pixPayload(
    settings,
    amount,
    `Filho da Corrente - ${context.fullName}`,
  );
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
    currentPerson: context,
    settings: {
      defaultMonthlyAmount: settings.defaultMonthlyAmount,
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
      persuasiveText: settings.persuasiveText,
      recurringOptions: [
        {
          value: "nao_programada",
          label: "Sem programação",
          available: true,
        },
        {
          value: "pix_agendado",
          label: "Pix agendado no meu banco",
          available: true,
        },
        {
          value: "pix_automatico",
          label: "Pix Automático",
          available: false,
          note: "Disponível depois da integração com o provedor.",
        },
        {
          value: "cartao_recorrente",
          label: "Cartão recorrente",
          available: false,
          note: "Disponível depois da integração com o provedor.",
        },
        {
          value: "boleto_recorrente",
          label: "Boleto recorrente",
          available: false,
          note: "Disponível depois da integração com o provedor.",
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

async function createContribution(
  context: AuthContext,
  body: Record<string, unknown>,
) {
  const settings = await loadSettings(context.organizationId);
  const preferenceResult = await supabaseAdmin
    .from("oh_contribution_preferences")
    .select("preferred_due_day, recurring_mode")
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId)
    .maybeSingle();

  if (preferenceResult.error) throw preferenceResult.error;

  const preference = preferenceResult.data;
  const requestedAmount = Math.max(
    1,
    asNumber(body.amount, settings.defaultMonthlyAmount),
  );
  const amount = settings.allowCustomAmount
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
      public_identification_mode: "sigiloso",
      metadata: {
        source: "filho_corrente",
        email: context.email,
        whatsapp: context.whatsapp,
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

  const recurringMode = asText(body.recurringMode) || "nao_programada";
  if (
    ![
      "nao_programada",
      "pix_agendado",
      "pix_automatico",
      "cartao_recorrente",
      "boleto_recorrente",
    ].includes(recurringMode)
  ) {
    throw new Error("Forma recorrente inválida.");
  }
  if (
    ["pix_automatico", "cartao_recorrente", "boleto_recorrente"].includes(
      recurringMode,
    )
  ) {
    throw new Error(
      "Essa recorrência ainda depende da integração com um provedor.",
    );
  }

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
          recurringMode === "nao_programada" ? "inativo" : "programado",
        metadata: {
          updatedBy: "filho_corrente",
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,person_id" },
    );

  if (error) throw error;
  return { message: "Preferências de contribuição salvas." };
}

async function requestFamilyGroup(
  context: AuthContext,
  body: Record<string, unknown>,
) {
  const settings = await loadSettings(context.organizationId);
  if (!settings.familyContributionsEnabled) {
    throw new Error("A contribuição familiar não está habilitada.");
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

  const [{ data: people, error: peopleError }, { data: relationships, error: relationshipError }] =
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
    ]);

  if (peopleError) throw peopleError;
  if (relationshipError) throw relationshipError;
  if ((people ?? []).length !== personIds.length) {
    throw new Error("Um dos familiares não está disponível.");
  }
  if ((relationships ?? []).length !== relationshipIds.length) {
    throw new Error("Um dos graus de parentesco não está disponível.");
  }

  const status = settings.familyRequiresFinancialApproval
    ? "aguardando_aprovacao"
    : "ativo";
  const { data: group, error } = await supabaseAdmin
    .from("oh_family_groups")
    .insert({
      organization_id: context.organizationId,
      name:
        asText(body.name) || `Família de ${context.fullName}`,
      responsible_person_id: context.personId,
      contribution_mode: asText(body.contributionMode) || "consolidada",
      status,
      notes:
        "Solicitação criada pelo Filho da Corrente. Valores individuais permanecem sigilosos.",
      created_by: context.personId,
      approved_at: status === "ativo" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) throw error;

  const relationshipRows = (relationships ?? []) as RelationshipRule[];
  const relationshipMap = new Map<string, RelationshipRule>(
    relationshipRows.map((item) => [item.id, item]),
  );

  const rows = members.map((member) => {
    const relationshipId = asText(member.relationshipTypeId);
    const relationship = relationshipMap.get(relationshipId);
    return {
      organization_id: context.organizationId,
      family_group_id: group.id,
      person_id: asText(member.personId),
      relationship_type_id: relationshipId,
      individual_amount: asNumber(member.individualAmount, 0) || null,
      included_in_payment: member.includedInPayment !== false,
      member_confirmed_at: relationship?.requires_member_confirmation
        ? null
        : new Date().toISOString(),
      financial_approved_at:
        status === "ativo" && !relationship?.requires_financial_approval
          ? new Date().toISOString()
          : null,
      active: true,
    };
  });

  const { error: memberError } = await supabaseAdmin
    .from("oh_family_members")
    .insert(rows);
  if (memberError) throw memberError;

  await supabaseAdmin
    .from("oh_contribution_preferences")
    .upsert(
      {
        organization_id: context.organizationId,
        person_id: context.personId,
        family_group_id: group.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,person_id" },
    );

  return {
    message:
      status === "ativo"
        ? "Grupo familiar criado."
        : "Solicitação familiar enviada para aprovação da Tesouraria/Financeiro.",
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
