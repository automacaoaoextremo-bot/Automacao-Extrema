import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAcervoPickupDetails } from "@/lib/organizacao-em-harmonia/acervo-vivo-location";

export type AcervoNotificationKind =
  | "reserva"
  | "fila"
  | "emprestimo"
  | "devolucao"
  | "reserva_disponivel"
  | "lembrete_devolucao";

type NotificationInput = {
  organizationId: string;
  personId: string;
  titleId: string;
  copyId?: string | null;
  kind: AcervoNotificationKind;
  dueAt?: string | null;
  holdUntil?: string | null;
};

const PRIMARY_MANAGEMENT_EMAIL = "automacao.ao.extremo@gmail.com";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value)
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function realEmail(value: unknown) {
  const email = text(value).toLowerCase();
  return email.includes("@") && !email.endsWith("@organizacao-em-harmonia.local");
}

function mailConfig() {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return { ok: false as const, reason: "E-mails desabilitados." };
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
    from: `${process.env.EMAIL_FROM_NAME ?? "Tucxa em Harmonia"} <${from}>`,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function labels(kind: AcervoNotificationKind) {
  if (kind === "emprestimo") return { subject: "Empréstimo registrado", action: "foi emprestado" };
  if (kind === "devolucao") return { subject: "Devolução registrada", action: "foi devolvido" };
  if (kind === "reserva_disponivel") return { subject: "Livro disponível para retirada", action: "está separado para retirada" };
  if (kind === "lembrete_devolucao") return { subject: "Lembrete de devolução", action: "continua em seu empréstimo" };
  if (kind === "fila") return { subject: "Entrada na fila de reserva", action: "foi incluído na fila de reserva" };
  return { subject: "Reserva registrada", action: "foi reservado" };
}

function membershipFunctionTokens(profileValue: unknown) {
  const profile = record(profileValue);
  const functionSlugs = Array.isArray(profile.functionSlugs)
    ? profile.functionSlugs.map((item) => normalize(item)).filter(Boolean)
    : [];
  const selectedFunctions = Array.isArray(profile.selectedFunctions)
    ? profile.selectedFunctions.flatMap((item) => {
        const current = record(item);
        return [current.slug, current.label, current.name]
          .map((value) => normalize(value))
          .filter(Boolean);
      })
    : [];

  return Array.from(new Set([...functionSlugs, ...selectedFunctions]));
}

async function libraryManagerEmails(organizationId: string) {
  const [membershipsResult, rolesResult] = await Promise.all([
    supabaseAdmin
      .from("oh_memberships")
      .select("person_id,role_id,agenda_viva_profile,active")
      .eq("organization_id", organizationId)
      .eq("active", true),
    supabaseAdmin
      .from("oh_roles")
      .select("id,slug,name")
      .eq("organization_id", organizationId)
      .eq("active", true),
  ]);

  if (membershipsResult.error) throw membershipsResult.error;
  if (rolesResult.error) throw rolesResult.error;

  const roleMap = new Map(
    (rolesResult.data ?? []).map((role) => [
      text(role.id),
      [normalize(role.slug), normalize(role.name)],
    ]),
  );

  const managerPersonIds = (membershipsResult.data ?? [])
    .filter((membership) => {
      const tokens = [
        ...membershipFunctionTokens(membership.agenda_viva_profile),
        ...(roleMap.get(text(membership.role_id)) ?? []),
      ];

      return tokens.some((token) =>
        [
          "biblioteca-acervo-vivo",
          "gestor-acervo-vivo-biblioteca",
          "biblioteca",
          "bibliotecario",
        ].includes(token),
      );
    })
    .map((membership) => text(membership.person_id))
    .filter(Boolean);

  if (!managerPersonIds.length) return [];

  const peopleResult = await supabaseAdmin
    .from("oh_people")
    .select("email")
    .eq("organization_id", organizationId)
    .in("id", Array.from(new Set(managerPersonIds)))
    .eq("active", true);

  if (peopleResult.error) throw peopleResult.error;

  return Array.from(
    new Set(
      (peopleResult.data ?? [])
        .map((person) => text(person.email))
        .filter(realEmail),
    ),
  );
}

export async function sendAcervoMovementNotifications(input: NotificationInput) {
  const config = mailConfig();
  if (!config.ok) return { sent: false, reason: config.reason };

  const [personResult, titleResult, copyResult, settingsResult, pickup, roleManagerEmails] =
    await Promise.all([
      supabaseAdmin
        .from("oh_people")
        .select("full_name,email,whatsapp")
        .eq("organization_id", input.organizationId)
        .eq("id", input.personId)
        .maybeSingle(),
      supabaseAdmin
        .from("oh_acervo_titles")
        .select("title,authors")
        .eq("organization_id", input.organizationId)
        .eq("id", input.titleId)
        .maybeSingle(),
      input.copyId
        ? supabaseAdmin
            .from("oh_acervo_copies")
            .select("asset_code,legacy_code")
            .eq("organization_id", input.organizationId)
            .eq("id", input.copyId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabaseAdmin
        .from("oh_acervo_settings")
        .select("metadata")
        .eq("organization_id", input.organizationId)
        .maybeSingle(),
      getAcervoPickupDetails(input.organizationId),
      libraryManagerEmails(input.organizationId).catch(() => []),
    ]);

  for (const result of [personResult, titleResult, copyResult, settingsResult]) {
    if (result.error) throw result.error;
  }

  const person = personResult.data;
  const title = titleResult.data;
  if (!person || !title) {
    return { sent: false, reason: "Pessoa ou livro não localizado." };
  }

  const metadata = record(settingsResult.data?.metadata);
  const configuredManagers = stringList(metadata.notification_emails).filter(realEmail);
  const fallback = text(process.env.EMAIL_COPY_TO);
  const managerEmails = Array.from(
    new Set(
      [
        PRIMARY_MANAGEMENT_EMAIL,
        ...roleManagerEmails,
        ...configuredManagers,
        realEmail(fallback) ? fallback : "",
      ].filter(realEmail),
    ),
  );

  const personEmail = realEmail(person.email) ? text(person.email) : "";
  const personName = text(person.full_name) || "leitor(a)";
  const titleName = text(title.title);
  const authors = Array.isArray(title.authors)
    ? title.authors.map((item) => text(item)).filter(Boolean).join(", ")
    : "";
  const copyCode = text(copyResult.data?.asset_code) || text(copyResult.data?.legacy_code);
  const dueText = formatDate(input.dueAt);
  const holdText = formatDate(input.holdUntil);

  if (input.kind === "emprestimo") {
    const personalBody = [
      `Olá, ${personName}.`,
      "",
      `Você emprestou o livro "${titleName}" da biblioteca do Acervo Vivo do Tucxa.`,
      authors ? `Autor(es): ${authors}.` : "",
      copyCode ? `Exemplar: ${copyCode}.` : "",
      dueText ? `Devolução máxima prevista para: ${dueText}.` : "",
      `Devolver no mesmo local da retirada: ${pickup.label}.`,
      `📍 ${pickup.address}`,
      `Google Maps: ${pickup.mapsUrl}`,
      "",
      "IMPORTANTE: Deixando exatamente no mesmo local de onde foi retirado, ajuda a Biblioteca do Acervo Vivo do Tucxa a estar sempre organizada e à disposição de todos.",
      "",
      "Tucxa em Harmonia — Acervo Vivo",
    ].filter(Boolean).join("\n");

    const managementBody = [
      `${personName} emprestou o livro "${titleName}" da biblioteca do Acervo Vivo do Tucxa.`,
      authors ? `Autor(es): ${authors}.` : "",
      copyCode ? `Exemplar: ${copyCode}.` : "",
      dueText ? `Devolução máxima prevista para: ${dueText}.` : "",
      `Retirada/devolução: ${pickup.label}.`,
      `📍 ${pickup.address}`,
      `Google Maps: ${pickup.mapsUrl}`,
      "",
      "Tucxa em Harmonia — Acervo Vivo",
    ].filter(Boolean).join("\n");

    const sends: Promise<unknown>[] = [];

    if (personEmail) {
      sends.push(
        config.transporter.sendMail({
          from: config.from,
          to: personEmail,
          subject: `[Tucxa • Acervo Vivo] Empréstimo confirmado — ${titleName}`,
          text: personalBody,
        }),
      );
    }

    if (managerEmails.length) {
      const primary = managerEmails.includes(PRIMARY_MANAGEMENT_EMAIL)
        ? PRIMARY_MANAGEMENT_EMAIL
        : managerEmails[0];
      const cc = managerEmails.filter((email) => email !== primary);

      sends.push(
        config.transporter.sendMail({
          from: config.from,
          to: primary,
          cc: cc.length ? cc.join(",") : undefined,
          subject: `[Tucxa • Acervo Vivo] ${personName} emprestou o livro — ${titleName}`,
          text: managementBody,
        }),
      );
    }

    if (!sends.length) {
      return { sent: false, reason: "Nenhum destinatário configurado." };
    }

    await Promise.all(sends);
    return {
      sent: true,
      recipients: Array.from(new Set([personEmail, ...managerEmails].filter(Boolean))),
    };
  }

  const recipients = Array.from(
    new Set([personEmail, ...managerEmails].filter(Boolean)),
  );
  if (!recipients.length) {
    return { sent: false, reason: "Nenhum destinatário configurado." };
  }

  const label = labels(input.kind);
  const dueLine = dueText ? `Devolução máxima prevista: ${dueText}.` : "";
  const holdLine = holdText
    ? `Retirar até: ${holdText} em ${pickup.label}.`
    : "";
  const returnLine = ["lembrete_devolucao"].includes(input.kind)
    ? [
        `Devolver no mesmo local da retirada: ${pickup.label}.`,
        `📍 ${pickup.address}`,
        `Google Maps: ${pickup.mapsUrl}`,
      ].join("\n")
    : "";
  const reminderIntro = input.kind === "lembrete_devolucao"
    ? "Este é um lembrete respeitoso de que a data máxima de devolução está se aproximando."
    : "";

  const textBody = [
    `Olá, ${personName}.`,
    "",
    reminderIntro,
    `O livro "${titleName}" ${label.action} no Acervo Vivo do Tucxa.`,
    authors ? `Autor(es): ${authors}.` : "",
    copyCode ? `Exemplar: ${copyCode}.` : "",
    dueLine,
    holdLine,
    returnLine,
    "",
    "Tucxa em Harmonia — Acervo Vivo",
  ].filter(Boolean).join("\n");

  await config.transporter.sendMail({
    from: config.from,
    to: recipients.join(","),
    subject: `[Tucxa • Acervo Vivo] ${label.subject} — ${titleName}`,
    text: textBody,
  });

  return { sent: true, recipients };
}
