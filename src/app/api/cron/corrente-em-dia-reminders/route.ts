import { NextResponse } from "next/server";
import { asText } from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { sendContributionReminderEmail } from "@/lib/organizacao-em-harmonia/corrente-notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PreferenceRow = {
  organization_id: string;
  person_id: string | null;
  preferred_due_day: number | null;
  reminder_days_before: number[] | null;
  reminder_channels: string[] | null;
};

type PersonRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  active: boolean | null;
};

const FINAL_CONTRIBUTION_STATUSES = [
  "comprovante_enviado",
  "confirmado",
  "aprovado",
  "pago",
];

function configuredSecret() {
  return (
    process.env.CORRENTE_REMINDER_CRON_SECRET ||
    process.env.CRON_SECRET ||
    ""
  );
}

function authOk(request: Request, expected: string) {
  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ||
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return token === expected;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.automacaoextrema.com").replace(/\/+$/, "");
}

function todayInSaoPaulo() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const { year, month, day } = dateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return ymd(date);
}

function monthOffset(value: string, offset: number) {
  const { year, month } = dateParts(value);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1, 12));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function dueDate(year: number, month: number, preferredDay: number) {
  const lastDay = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const day = Math.min(Math.max(Math.trunc(preferredDay), 1), lastDay);
  return ymd(new Date(Date.UTC(year, month - 1, day, 12)));
}

function validEmail(value: unknown) {
  const email = asText(value).trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) ? email : "";
}

async function reserveDelivery(input: {
  organizationId: string;
  personId: string;
  dueDate: string;
  daysBefore: number;
  recipientEmail: string;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("oh_contribution_reminder_deliveries")
    .insert({
      organization_id: input.organizationId,
      person_id: input.personId,
      due_date: input.dueDate,
      days_before: input.daysBefore,
      channel: "email",
      recipient_email: input.recipientEmail,
      status: "processando",
      updated_at: now,
    })
    .select("id")
    .single();

  if (!error) return data.id as string;
  if (error.code !== "23505") throw error;

  const { data: retry, error: retryError } = await supabaseAdmin
    .from("oh_contribution_reminder_deliveries")
    .update({
      recipient_email: input.recipientEmail,
      status: "processando",
      provider_message: null,
      updated_at: now,
    })
    .eq("organization_id", input.organizationId)
    .eq("person_id", input.personId)
    .eq("due_date", input.dueDate)
    .eq("days_before", input.daysBefore)
    .eq("channel", "email")
    .eq("status", "falhou")
    .select("id")
    .maybeSingle();

  if (retryError) throw retryError;
  return retry?.id ? (retry.id as string) : null;
}

async function handle(request: Request) {
  const secret = configuredSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado." },
      { status: 503 },
    );
  }
  if (!authOk(request, secret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const baseDate = url.searchParams.get("date") || todayInSaoPaulo();
  const contributionUrl = `${siteUrl()}/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/corrente-em-dia`;

  const { data: preferenceData, error: preferenceError } = await supabaseAdmin
    .from("oh_contribution_preferences")
    .select(
      "organization_id, person_id, preferred_due_day, reminder_days_before, reminder_channels",
    )
    .not("person_id", "is", null);

  if (preferenceError) throw preferenceError;

  const preferences = (preferenceData ?? []) as PreferenceRow[];
  const emailPreferences = preferences.filter(
    (preference) =>
      preference.person_id &&
      Array.isArray(preference.reminder_channels) &&
      preference.reminder_channels.includes("email") &&
      Array.isArray(preference.reminder_days_before) &&
      preference.reminder_days_before.length > 0,
  );

  const personIds = Array.from(
    new Set(
      emailPreferences
        .map((preference) => preference.person_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (personIds.length === 0) {
    return NextResponse.json({
      ok: true,
      date: baseDate,
      total: 0,
      message: "Nenhum lembrete por e-mail configurado.",
    });
  }

  const currentMonth = monthOffset(baseDate, 0);
  const nextMonth = monthOffset(baseDate, 1);
  const periodStart = `${currentMonth.year}-${String(currentMonth.month).padStart(2, "0")}-01`;
  const periodEnd = dueDate(nextMonth.year, nextMonth.month, 31);

  const [peopleResult, paidResult] = await Promise.all([
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, active")
      .in("id", personIds)
      .eq("active", true),
    supabaseAdmin
      .from("oh_contributions")
      .select("organization_id, person_id, due_date, status")
      .in("person_id", personIds)
      .gte("due_date", periodStart)
      .lte("due_date", periodEnd)
      .in("status", FINAL_CONTRIBUTION_STATUSES),
  ]);

  if (peopleResult.error) throw peopleResult.error;
  if (paidResult.error) throw paidResult.error;

  const peopleById = new Map(
    ((peopleResult.data ?? []) as PersonRow[]).map((person) => [person.id, person]),
  );
  const paidKeys = new Set(
    (paidResult.data ?? []).map(
      (item) => `${item.organization_id}|${item.person_id}|${item.due_date}`,
    ),
  );

  const results: Array<Record<string, unknown>> = [];

  for (const preference of emailPreferences) {
    const personId = preference.person_id;
    if (!personId) continue;

    const person = peopleById.get(personId);
    const email = validEmail(person?.email);
    if (!person || !email) {
      results.push({ personId, sent: false, reason: "Pessoa sem e-mail cadastrado." });
      continue;
    }

    const preferredDay = Math.min(
      Math.max(Math.trunc(Number(preference.preferred_due_day) || 1), 1),
      31,
    );
    const reminderDays = Array.from(
      new Set(
        (preference.reminder_days_before ?? [])
          .map((value) => Math.trunc(Number(value)))
          .filter((value) => [7, 5, 3, 1].includes(value)),
      ),
    );

    for (const month of [currentMonth, nextMonth]) {
      const targetDueDate = dueDate(month.year, month.month, preferredDay);
      const paidKey = `${preference.organization_id}|${personId}|${targetDueDate}`;
      if (paidKeys.has(paidKey)) continue;

      for (const daysBefore of reminderDays) {
        if (addDays(targetDueDate, -daysBefore) !== baseDate) continue;

        const deliveryId = await reserveDelivery({
          organizationId: preference.organization_id,
          personId,
          dueDate: targetDueDate,
          daysBefore,
          recipientEmail: email,
        });
        if (!deliveryId) {
          results.push({
            personId,
            dueDate: targetDueDate,
            daysBefore,
            sent: false,
            reason: "Lembrete já processado.",
          });
          continue;
        }

        let emailResult: { sent: boolean; reason: string };
        try {
          emailResult = await sendContributionReminderEmail({
            recipientEmail: email,
            recipientName: asText(person.full_name) || "Filho da Corrente",
            dueDate: targetDueDate,
            daysBefore,
            contributionUrl,
          });
        } catch (error) {
          emailResult = {
            sent: false,
            reason:
              error instanceof Error
                ? error.message
                : "Falha ao enviar o lembrete por e-mail.",
          };
        }

        const completedAt = new Date().toISOString();
        const { error: deliveryError } = await supabaseAdmin
          .from("oh_contribution_reminder_deliveries")
          .update({
            status: emailResult.sent ? "enviado" : "falhou",
            provider_message: emailResult.reason,
            sent_at: emailResult.sent ? completedAt : null,
            updated_at: completedAt,
          })
          .eq("id", deliveryId);

        if (deliveryError) throw deliveryError;

        results.push({
          personId,
          dueDate: targetDueDate,
          daysBefore,
          sent: emailResult.sent,
          reason: emailResult.reason,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    date: baseDate,
    total: results.length,
    sent: results.filter((result) => result.sent === true).length,
    results,
  });
}

export async function GET(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar lembretes do Corrente em Dia.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
