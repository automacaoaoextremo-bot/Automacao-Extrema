import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  asNumber,
  asText,
  normalizeFinancialEmail,
  normalizeFinancialSettings,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const TUCXA_PIX_KEY = "58.392.598/0001-91";

type ReceptionContact = {
  name: string;
  whatsapp: string;
  whatsappUrl: string;
};

type MembershipRow = {
  person_id: string | null;
  role_id: string | null;
  active: boolean | null;
  status: string | null;
  can_receive_notifications: boolean | null;
  agenda_viva_profile: unknown;
};

type PersonRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  active: boolean | null;
};

type RoleRow = {
  id: string;
  slug: string | null;
  name: string | null;
  active: boolean | null;
};

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

function asNumberList(value: unknown) {
  const source = Array.isArray(value) ? value : [];

  return Array.from(
    new Set(
      source
        .map((item) => Math.round(asNumber(item)))
        .filter((item) => Number.isFinite(item) && item >= 1 && item <= 10000),
    ),
  ).sort((left, right) => left - right);
}

function receptionProfileToken(profileValue: unknown) {
  const profile = asObject(profileValue);
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
      profile.supportsReception === true ? "recepcao" : "",
      ...selectedFunctions,
      ...functionSlugs,
    ].join(" "),
  );
}

function isReceptionMembership(
  membership: MembershipRow,
  role: RoleRow | undefined,
) {
  const token = normalizeToken(
    [
      role?.slug,
      role?.name,
      receptionProfileToken(membership.agenda_viva_profile),
    ].join(" "),
  );

  return token.includes("recepcao") || token.includes("recepcionista");
}

function whatsappDigits(value: unknown) {
  const digits = asText(value).replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

async function organization() {
  const { data, error } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, whatsapp")
    .or("slug.eq.tucxa,name.ilike.%tucxa%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error("Organização Tucxa não localizada.");
  return data;
}

async function settingsFor(organizationId: string) {
  const [{ data: settings, error }, { data: module }] = await Promise.all([
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

  const financial = normalizeFinancialSettings(settings);
  const legacy = asObject(module?.settings);
  const suggestedAmounts = asNumberList(legacy.suggestedAmounts);
  const defaultSuggestedAmounts = Array.from(
    new Set([
      25,
      financial.defaultMonthlyAmount,
      75,
      100,
      150,
    ]),
  )
    .filter((value) => value > 0)
    .sort((left, right) => left - right);

  return {
    ...financial,
    pixKey: TUCXA_PIX_KEY,
    pixReceiverName: asText(legacy.pixReceiverName) || "TUCXA",
    pixCity: asText(legacy.pixCity) || "CAMPINAS",
    suggestedAmounts:
      suggestedAmounts.length > 0
        ? suggestedAmounts
        : defaultSuggestedAmounts,
    publicContributionHeadline:
      asText(legacy.publicContributionHeadline) ||
      "Um valor possível hoje ajuda a manter muitos cuidados de pé.",
    publicContributionMessage:
      asText(legacy.publicContributionMessage) ||
      "Sua contribuição continua na água, na energia, na limpeza, na segurança e nos materiais que acolhem cada trabalho. Escolha uma forma simples e participe desse cuidado com liberdade, sigilo e transparência.",
    receptionPaymentMessage:
      asText(legacy.receptionPaymentMessage) ||
      "Para cartão de crédito, débito ou dinheiro, registre sua intenção e fale com uma pessoa da Recepção.",
  };
}

async function receptionContacts(
  organizationId: string,
  fallbackWhatsapp: unknown,
): Promise<ReceptionContact[]> {
  const [membershipsResult, peopleResult, rolesResult] = await Promise.all([
    supabaseAdmin
      .from("oh_memberships")
      .select(
        "person_id, role_id, active, status, can_receive_notifications, agenda_viva_profile",
      )
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, whatsapp, active")
      .eq("organization_id", organizationId)
      .eq("active", true),
    supabaseAdmin
      .from("oh_roles")
      .select("id, slug, name, active")
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);

  if (membershipsResult.error) throw membershipsResult.error;
  if (peopleResult.error) throw peopleResult.error;
  if (rolesResult.error) throw rolesResult.error;

  const people = new Map(
    ((peopleResult.data ?? []) as PersonRow[]).map((person) => [
      person.id,
      person,
    ]),
  );
  const roles = new Map(
    ((rolesResult.data ?? []) as RoleRow[]).map((role) => [role.id, role]),
  );

  const contacts = ((membershipsResult.data ?? []) as MembershipRow[])
    .filter(
      (membership) =>
        membership.active !== false &&
        normalizeToken(membership.status) !== "inativo" &&
        membership.can_receive_notifications === true,
    )
    .filter((membership) =>
      isReceptionMembership(
        membership,
        membership.role_id ? roles.get(membership.role_id) : undefined,
      ),
    )
    .flatMap((membership) => {
      const person = membership.person_id
        ? people.get(membership.person_id)
        : undefined;
      const whatsapp = whatsappDigits(person?.whatsapp);

      if (!person || person.active === false || !whatsapp) return [];

      return [
        {
          name: asText(person.full_name) || "Recepção do Tucxa",
          whatsapp,
          whatsappUrl: `https://wa.me/${whatsapp}`,
        },
      ];
    });

  const unique = Array.from(
    new Map(contacts.map((contact) => [contact.whatsapp, contact])).values(),
  ).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  if (unique.length > 0) return unique;

  const fallback = whatsappDigits(fallbackWhatsapp);
  return fallback
    ? [
        {
          name: "Recepção do Tucxa",
          whatsapp: fallback,
          whatsappUrl: `https://wa.me/${fallback}`,
        },
      ]
    : [];
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

function pixPayloadKey(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  return digits.length === 14 ? digits : trimmed;
}

function buildPixPayload(input: {
  key: string;
  receiverName: string;
  city: string;
  amount: number;
  txid: string;
}) {
  const merchantAccount = [
    emv("00", "BR.GOV.BCB.PIX"),
    emv("01", pixPayloadKey(input.key)),
  ].join("");
  const additionalData = emv(
    "05",
    pixText(input.txid, 25) || "***",
  );

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

function dueDateFor(preferredDueDay: number) {
  const dueDate = new Date();
  dueDate.setHours(12, 0, 0, 0);
  const today = dueDate.getDate();

  if (preferredDueDay < today) {
    dueDate.setMonth(dueDate.getMonth() + 1, 1);
  }

  dueDate.setDate(
    Math.min(
      preferredDueDay,
      new Date(
        dueDate.getFullYear(),
        dueDate.getMonth() + 1,
        0,
      ).getDate(),
    ),
  );

  return dueDate.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const org = await organization();
    const settings = await settingsFor(org.id);
    const contacts = await receptionContacts(org.id, org.whatsapp);
    const onlineCardAvailable = false;

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
      },
      settings: {
        defaultMonthlyAmount: settings.defaultMonthlyAmount,
        allowCustomAmount: settings.allowCustomAmount,
        suggestedAmounts: settings.suggestedAmounts,
        allowedDueDays: settings.allowedDueDays,
        defaultDueDay: settings.defaultDueDay,
        pixKey: settings.pixKey,
        pixReceiverName: settings.pixReceiverName,
        pixCity: settings.pixCity,
        publicContributionHeadline: settings.publicContributionHeadline,
        publicContributionMessage: settings.publicContributionMessage,
        receptionPaymentMessage: settings.receptionPaymentMessage,
        recurringOptions: [
          {
            value: "pontual",
            label: "Uma única vez",
            available: true,
          },
          {
            value: "pix_agendado",
            label: "Pix recorrente agendado no meu banco",
            available: true,
            note: "O agendamento e a repetição são controlados pelo aplicativo do seu banco.",
          },
        ],
        paymentMethods: [
          {
            value: "pix",
            label: "Pix",
            online: true,
            available: true,
            needsReception: false,
          },
          {
            value: "cartao_credito",
            label: "Cartão de crédito",
            online: onlineCardAvailable,
            available: true,
            needsReception: !onlineCardAvailable,
          },
          {
            value: "cartao_debito",
            label: "Cartão de débito",
            online: false,
            available: true,
            needsReception: true,
          },
          {
            value: "dinheiro",
            label: "Dinheiro",
            online: false,
            available: true,
            needsReception: true,
          },
        ],
      },
      receptionContacts: contacts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar contribuição.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const org = await organization();
    const settings = await settingsFor(org.id);
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const anonymous = body.anonymous !== false;
    const requestedAmount = Math.max(
      1,
      asNumber(body.amount, settings.defaultMonthlyAmount),
    );
    const amount = settings.allowCustomAmount
      ? requestedAmount
      : settings.defaultMonthlyAmount;
    const recurrenceType = asText(body.recurrenceType) || "pontual";
    const paymentMethod = asText(body.paymentMethod) || "pix";

    if (!["pontual", "pix_agendado"].includes(recurrenceType)) {
      return NextResponse.json(
        {
          error:
            "A recorrência escolhida ainda depende da integração com um provedor.",
        },
        { status: 400 },
      );
    }

    if (
      !["pix", "cartao_credito", "cartao_debito", "dinheiro"].includes(
        paymentMethod,
      )
    ) {
      return NextResponse.json(
        { error: "Forma de contribuição inválida." },
        { status: 400 },
      );
    }

    if (recurrenceType === "pix_agendado" && paymentMethod !== "pix") {
      return NextResponse.json(
        {
          error:
            "O Pix recorrente agendado precisa usar a forma de contribuição Pix.",
        },
        { status: 400 },
      );
    }

    const recurrenceStartDate = asText(body.recurrenceStartDate).slice(0, 10);
    const recurrenceOccurrences = Math.trunc(
      asNumber(body.recurrenceOccurrences, 0),
    );

    if (recurrenceType === "pix_agendado") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(recurrenceStartDate)) {
        return NextResponse.json(
          { error: "Informe a data da primeira contribuição recorrente." },
          { status: 400 },
        );
      }

      const scheduledDate = new Date(`${recurrenceStartDate}T12:00:00Z`);
      if (Number.isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: "A data da primeira contribuição é inválida." },
          { status: 400 },
        );
      }

      const todayInSaoPaulo = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      if (recurrenceStartDate < todayInSaoPaulo) {
        return NextResponse.json(
          {
            error:
              "A data da primeira contribuição recorrente não pode estar no passado.",
          },
          { status: 400 },
        );
      }

      if (recurrenceOccurrences < 2 || recurrenceOccurrences > 120) {
        return NextResponse.json(
          { error: "Informe uma quantidade entre 2 e 120 contribuições." },
          { status: 400 },
        );
      }
    }

    const preferredDueDay = recurrenceType === "pix_agendado"
      ? Number(recurrenceStartDate.slice(8, 10))
      : settings.defaultDueDay;
    const contributorName = anonymous
      ? null
      : asText(body.name) || "Contribuinte identificado";
    const email = anonymous
      ? ""
      : normalizeFinancialEmail(body.email);
    const whatsapp = anonymous
      ? ""
      : asText(body.whatsapp).replace(/\D/g, "");
    const uploadToken = randomUUID();
    const requiresReception = paymentMethod !== "pix";

    const { data, error } = await supabaseAdmin
      .from("oh_contributions")
      .insert({
        organization_id: org.id,
        person_id: null,
        contributor_name: contributorName,
        contributor_email: email || null,
        contributor_whatsapp: whatsapp || null,
        amount,
        due_date:
          recurrenceType === "pix_agendado"
            ? recurrenceStartDate
            : dueDateFor(preferredDueDay),
        status: requiresReception
          ? "aguardando_recepcao"
          : "aguardando_comprovante",
        payment_method: paymentMethod,
        notes: asText(body.notes) || null,
        contribution_kind:
          recurrenceType === "pontual" ? "pontual" : "recorrente",
        is_anonymous: anonymous,
        recurrence_type: recurrenceType,
        preferred_due_day:
          recurrenceType === "pix_agendado" ? null : preferredDueDay,
        recurrence_start_date:
          recurrenceType === "pix_agendado" ? recurrenceStartDate : null,
        recurrence_occurrences:
          recurrenceType === "pix_agendado" ? recurrenceOccurrences : null,
        public_identification_mode: "sigiloso",
        metadata: {
          source: "site_tucxa_contribuicao_publica",
          confidential: true,
          proofUploadToken: uploadToken,
          awaitingProofSince: requiresReception
            ? null
            : new Date().toISOString(),
          providerIntegrated: false,
          requiresReception,
          recurrenceStartDate:
            recurrenceType === "pix_agendado" ? recurrenceStartDate : null,
          recurrenceOccurrences:
            recurrenceType === "pix_agendado" ? recurrenceOccurrences : null,
        },
      })
      .select("id, status, due_date, recurrence_start_date, recurrence_occurrences")
      .single();

    if (error) throw error;

    let pixCopyPaste: string | null = null;
    let qrCodeDataUrl: string | null = null;

    if (paymentMethod === "pix") {
      pixCopyPaste = buildPixPayload({
        key: settings.pixKey,
        receiverName: settings.pixReceiverName,
        city: settings.pixCity,
        amount,
        txid: data.id.replace(/-/g, "").slice(0, 25),
      });
      qrCodeDataUrl = await QRCode.toDataURL(pixCopyPaste, {
        margin: 1,
        width: 420,
        errorCorrectionLevel: "M",
      });
    }

    return NextResponse.json({
      ok: true,
      contribution: data,
      uploadToken,
      pixCopyPaste,
      qrCodeDataUrl,
      pix: paymentMethod === "pix"
        ? {
            key: settings.pixKey,
            receiverName: settings.pixReceiverName,
            amount,
          }
        : null,
      requiresReception,
      message: requiresReception
        ? "Sua intenção foi registrada. Procure a Recepção para concluir com segurança."
        : anonymous
          ? "Sua contribuição anônima foi registrada e já aparece para a Tesouraria/Financeiro como aguardando comprovante."
          : "Sua contribuição foi registrada e aguarda o envio do comprovante para conferência.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao registrar contribuição.",
      },
      { status: 500 },
    );
  }
}
