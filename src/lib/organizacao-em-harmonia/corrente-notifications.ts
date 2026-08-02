import nodemailer from "nodemailer";
import { asText, normalizeFinancialEmail } from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_INTERNAL_EMAIL = "automacao-ao-extremo@gmail.com";

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
  email: string | null;
  whatsapp: string | null;
  active: boolean | null;
};

type RoleRow = {
  id: string;
  slug: string | null;
  name: string | null;
  active: boolean | null;
};

export type ReceptionContact = {
  name: string;
  whatsapp: string;
  whatsappUrl: string;
};

export type ContributionNotificationEvent =
  | "registrada"
  | "aguardando_recepcao"
  | "comprovante_enviado"
  | "aprovada";

export type ContributionNotificationInput = {
  organizationId: string;
  contributionId: string;
  contributorName: string;
  contributorEmail?: string | null;
  amount: number;
  status: string;
  paymentMethod: string;
  event: ContributionNotificationEvent;
  dueDate?: string | null;
  notes?: string | null;
  trackingCode?: string | null;
  extraEmails?: string[];
  includeReception?: boolean;
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

function profileToken(value: unknown) {
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
      profile.supportsReception === true ? "recepcao" : "",
      ...selectedFunctions,
      ...functionSlugs,
    ].join(" "),
  );
}

function whatsappDigits(value: unknown) {
  const digits = asText(value).replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function emailList(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : asText(value)
        .split(/[;,|\s]+/)
        .filter(Boolean);

  return Array.from(
    new Set(
      source
        .map((item) => normalizeFinancialEmail(item))
        .filter(Boolean),
    ),
  );
}

async function directory(organizationId: string) {
  const [membershipsResult, peopleResult, rolesResult] = await Promise.all([
    supabaseAdmin
      .from("oh_memberships")
      .select(
        "person_id, role_id, active, status, can_receive_notifications, agenda_viva_profile",
      )
      .eq("organization_id", organizationId),
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active")
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

  return {
    memberships: (membershipsResult.data ?? []) as MembershipRow[],
    people: new Map(
      ((peopleResult.data ?? []) as PersonRow[]).map((person) => [
        person.id,
        person,
      ]),
    ),
    roles: new Map(
      ((rolesResult.data ?? []) as RoleRow[]).map((role) => [role.id, role]),
    ),
  };
}

function activeMembership(membership: MembershipRow) {
  return (
    membership.active !== false &&
    normalizeToken(membership.status) !== "inativo" &&
    membership.can_receive_notifications !== false
  );
}

function membershipToken(
  membership: MembershipRow,
  role: RoleRow | undefined,
) {
  return normalizeToken(
    [role?.slug, role?.name, profileToken(membership.agenda_viva_profile)].join(
      " ",
    ),
  );
}

export async function financialNotificationEmails(
  organizationId: string,
  extraEmails: string[] = [],
  includeReception = false,
) {
  const { memberships, people, roles } = await directory(organizationId);
  const roleEmails = memberships
    .filter(activeMembership)
    .filter((membership) => {
      const token = membershipToken(
        membership,
        membership.role_id ? roles.get(membership.role_id) : undefined,
      );
      return (
        token.includes("tesour") ||
        token.includes("finance") ||
        token.includes("diretor") ||
        token.includes("president") ||
        (includeReception &&
          (token.includes("recepcao") || token.includes("recepcionista")))
      );
    })
    .flatMap((membership) => {
      const person = membership.person_id
        ? people.get(membership.person_id)
        : undefined;
      const email = normalizeFinancialEmail(person?.email);
      return email ? [email] : [];
    });

  return Array.from(
    new Set([
      process.env.CORRENTE_FINANCEIRO_NOTIFICATION_EMAIL ||
        DEFAULT_INTERNAL_EMAIL,
      ...emailList(process.env.CORRENTE_FINANCEIRO_NOTIFICATION_EMAILS),
      ...emailList(extraEmails),
      ...roleEmails,
    ]),
  ).filter(Boolean);
}

export async function receptionContacts(input: {
  organizationId: string;
  configuredName?: string | null;
  configuredWhatsapp?: string | null;
  fallbackWhatsapp?: string | null;
}) {
  const configuredWhatsapp = whatsappDigits(input.configuredWhatsapp);
  if (configuredWhatsapp) {
    return [
      {
        name: asText(input.configuredName) || "Recepção do Tucxa",
        whatsapp: configuredWhatsapp,
        whatsappUrl: `https://wa.me/${configuredWhatsapp}`,
      },
    ] satisfies ReceptionContact[];
  }

  const { memberships, people, roles } = await directory(input.organizationId);
  const contacts = memberships
    .filter(activeMembership)
    .filter((membership) => {
      const token = membershipToken(
        membership,
        membership.role_id ? roles.get(membership.role_id) : undefined,
      );
      return token.includes("recepcao") || token.includes("recepcionista");
    })
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

  const fallback = whatsappDigits(input.fallbackWhatsapp);
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

function mailConfig() {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return { ok: false as const, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass || !from) {
    return { ok: false as const, reason: "SMTP não configurado." };
  }

  return {
    ok: true as const,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    }),
    from: `${process.env.EMAIL_FROM_NAME ?? "Automação Extrema"} <${from}>`,
  };
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function eventTitle(event: ContributionNotificationEvent) {
  const titles: Record<ContributionNotificationEvent, string> = {
    registrada: "Contribuição registrada",
    aguardando_recepcao: "Pagamento assistido aguardando a Recepção",
    comprovante_enviado: "Comprovante de contribuição enviado",
    aprovada: "Contribuição aprovada",
  };
  return titles[event];
}

function notificationText(input: ContributionNotificationInput) {
  return [
    eventTitle(input.event),
    "",
    `Contribuinte: ${input.contributorName}`,
    `Valor: ${money(input.amount)}`,
    `Forma: ${input.paymentMethod}`,
    `Situação: ${input.status}`,
    input.dueDate ? `Data: ${input.dueDate}` : "",
    input.trackingCode ? `Código de acompanhamento: ${input.trackingCode}` : "",
    input.notes ? `Observação: ${input.notes}` : "",
    "",
    `ID da contribuição: ${input.contributionId}`,
    "",
    "Os valores individuais permanecem restritos às pessoas autorizadas da Tesouraria/Financeiro.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendMail(input: {
  to: string[];
  subject: string;
  text: string;
}) {
  const config = mailConfig();
  if (!config.ok) {
    console.warn("[corrente-em-dia][email]", config.reason);
    return { sent: false, reason: config.reason };
  }

  const recipients = emailList(input.to);
  if (recipients.length === 0) {
    return { sent: false, reason: "Nenhum destinatário válido." };
  }

  await config.transporter.sendMail({
    from: config.from,
    to: recipients.join(", "),
    subject: input.subject,
    text: input.text,
  });

  return { sent: true, reason: "E-mail enviado." };
}

export async function notifyContributionEvent(
  input: ContributionNotificationInput,
) {
  try {
    const internalRecipients = await financialNotificationEmails(
      input.organizationId,
      input.extraEmails,
      input.includeReception === true,
    );
    const contributorEmail = normalizeFinancialEmail(input.contributorEmail);
    const text = notificationText(input);
    const title = eventTitle(input.event);

    const results = await Promise.all([
      sendMail({
        to: internalRecipients,
        subject: `[Tucxa] ${title} — ${money(input.amount)}`,
        text,
      }),
      contributorEmail
        ? sendMail({
            to: [contributorEmail],
            subject: `Tucxa — ${title}`,
            text: `${text}\n\nEsta mensagem confirma o registro no Corrente em Dia.`,
          })
        : Promise.resolve({
            sent: false,
            reason: "Filho da Corrente sem e-mail cadastrado.",
          }),
    ]);

    return { ok: true, results };
  } catch (error) {
    console.error("[corrente-em-dia][notification-error]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao enviar notificações.",
    };
  }
}
