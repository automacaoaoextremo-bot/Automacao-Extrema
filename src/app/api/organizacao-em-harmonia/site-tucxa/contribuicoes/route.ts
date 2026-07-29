import { NextResponse } from "next/server";
import {
  asNumber,
  asText,
  normalizeFinancialEmail,
  normalizeFinancialSettings,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function organization() {
  const { data, error } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name")
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
  const legacy =
    module?.settings &&
    typeof module.settings === "object" &&
    !Array.isArray(module.settings)
      ? (module.settings as Record<string, unknown>)
      : {};

  return {
    ...financial,
    pixKey: asText(legacy.pixKey) || "tucxacentro@gmail.com",
    pixReceiverName: asText(legacy.pixReceiverName) || "TUCXA",
    pixCity: asText(legacy.pixCity) || "CAMPINAS",
  };
}

export async function GET() {
  try {
    const org = await organization();
    const settings = await settingsFor(org.id);
    return NextResponse.json({
      organization: org,
      settings: {
        defaultMonthlyAmount: settings.defaultMonthlyAmount,
        allowCustomAmount: settings.allowCustomAmount,
        allowedDueDays: settings.allowedDueDays,
        defaultDueDay: settings.defaultDueDay,
        pixKey: settings.pixKey,
        pixReceiverName: settings.pixReceiverName,
        pixCity: settings.pixCity,
        publicMessage: settings.publicMessage,
        recurringOptions: [
          {
            value: "pontual",
            label: "Uma única vez",
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
            note: "Disponível após integração com provedor de pagamentos.",
          },
          {
            value: "cartao_recorrente",
            label: "Cartão recorrente",
            available: false,
            note: "Disponível após integração com provedor de pagamentos.",
          },
          {
            value: "boleto_recorrente",
            label: "Boleto recorrente",
            available: false,
            note: "Disponível após integração com provedor de pagamentos.",
          },
        ],
      },
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

    const anonymous = body.anonymous === true;
    const requestedAmount = Math.max(
      1,
      asNumber(body.amount, settings.defaultMonthlyAmount),
    );
    const amount = settings.allowCustomAmount
      ? requestedAmount
      : settings.defaultMonthlyAmount;
    const recurrenceType = asText(body.recurrenceType) || "pontual";
    if (!["pontual", "pix_agendado"].includes(recurrenceType)) {
      return NextResponse.json(
        { error: "A opção recorrente escolhida ainda não está disponível." },
        { status: 400 },
      );
    }
    const requestedDueDay = Math.trunc(
      asNumber(body.preferredDueDay, settings.defaultDueDay),
    );
    const preferredDueDay = settings.allowedDueDays.includes(requestedDueDay)
      ? requestedDueDay
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

    const { data, error } = await supabaseAdmin
      .from("oh_contributions")
      .insert({
        organization_id: org.id,
        person_id: null,
        contributor_name: contributorName,
        contributor_email: email || null,
        contributor_whatsapp: whatsapp || null,
        amount,
        due_date: dueDate.toISOString().slice(0, 10),
        status: "intencao_registrada",
        payment_method: asText(body.paymentMethod) || "pix",
        notes: asText(body.notes) || null,
        contribution_kind:
          recurrenceType === "pontual" ? "pontual" : "recorrente",
        is_anonymous: anonymous,
        recurrence_type: recurrenceType,
        preferred_due_day: preferredDueDay,
        public_identification_mode: "sigiloso",
        metadata: {
          source: "site_tucxa",
          reminderDaysBefore: Array.isArray(body.reminderDaysBefore)
            ? body.reminderDaysBefore
            : [],
        },
      })
      .select("id, status, due_date")
      .single();

    if (error) throw error;

    const pixCode = [
      "PIX TUCXA",
      `chave: ${settings.pixKey}`,
      `recebedor: ${settings.pixReceiverName}`,
      `valor: R$ ${amount.toFixed(2).replace(".", ",")}`,
      `referência: ${data.id}`,
    ].join(" | ");

    return NextResponse.json({
      ok: true,
      contribution: data,
      pixCode,
      message: anonymous
        ? "Contribuição não identificada registrada com sigilo."
        : "Contribuição registrada. A Tesouraria/Financeiro poderá conferir o pagamento.",
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
