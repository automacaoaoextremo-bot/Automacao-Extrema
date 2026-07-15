import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AuthContext = {
  organizationId: string;
  personId: string | null;
  fullName: string;
  email: string | null;
  whatsapp: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(asText(value).replace(".", "").replace(",", ".") || value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSettings(settings: unknown) {
  const current = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  return {
    defaultAmount: Math.max(0, asNumber(current.defaultAmount, 50)),
    familyAmount: Math.max(0, asNumber(current.familyAmount, 120)),
    defaultDueDays: Array.isArray(current.defaultDueDays) ? current.defaultDueDays.map((item) => Math.trunc(asNumber(item, 10))).filter((item) => item >= 1 && item <= 31) : [10],
    reminderBeforeDays: Math.max(0, Math.trunc(asNumber(current.reminderBeforeDays, 3))),
    reminderAfterDays: Math.max(0, Math.trunc(asNumber(current.reminderAfterDays, 2))),
    pixKey: asText(current.pixKey) || "tucxacentro@gmail.com",
    pixReceiverName: asText(current.pixReceiverName) || "TUCXA",
    pixCity: asText(current.pixCity) || "CAMPINAS",
    familyContributionLabel: asText(current.familyContributionLabel) || "Contribuição familiar",
    persuasiveText:
      asText(current.persuasiveText) ||
      "A contribuição mensal mantém a casa organizada e preparada para acolher. Quando cada Filho da Corrente faz sua parte, a tesouraria ganha previsibilidade e a corrente ganha tranquilidade para servir.",
  };
}

async function getAuthContext(request: Request): Promise<AuthContext> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) throw new Error("Sessão não encontrada.");

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Sessão inválida.");

  const { data: organization, error: organizationError } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name, slug")
    .or("slug.eq.tucxa,name.ilike.%tucxa%")
    .limit(1)
    .maybeSingle();
  if (organizationError) throw organizationError;
  if (!organization?.id) throw new Error("Organização Tucxa não localizada.");

  const { data: person } = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp")
    .eq("organization_id", organization.id)
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  return {
    organizationId: organization.id,
    personId: person?.id ?? null,
    fullName: person?.full_name || userData.user.user_metadata?.full_name || userData.user.email || "Filho da Corrente",
    email: person?.email || userData.user.email || null,
    whatsapp: person?.whatsapp || null,
  };
}

async function loadSettings(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_module_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .eq("module_slug", "corrente-em-dia")
    .maybeSingle();
  if (error) throw error;
  return normalizeSettings(data?.settings);
}

function monthDueDate(day: number, offsetMonth = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offsetMonth;
  const date = new Date(year, month, Math.min(Math.max(day, 1), 28), 12);
  return date.toISOString().slice(0, 10);
}

function pixPayload(settings: ReturnType<typeof normalizeSettings>, amount: number, description: string) {
  const cleanAmount = amount.toFixed(2);
  return `PIX TUCXA | chave: ${settings.pixKey} | valor: R$ ${cleanAmount} | identificação: ${description}`;
}

async function loadPayload(context: AuthContext) {
  const settings = await loadSettings(context.organizationId);
  const { data: contributions, error: contributionsError } = await supabaseAdmin
    .from("oh_contributions")
    .select("id, amount, due_date, paid_at, status, payment_method, proof_url, notes, metadata, created_at")
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId ?? "00000000-0000-0000-0000-000000000000")
    .order("due_date", { ascending: false })
    .limit(80);
  if (contributionsError) throw contributionsError;

  const preferredDay = settings.defaultDueDays[0] ?? 10;
  const amount = settings.defaultAmount;
  const pixCopyPaste = pixPayload(settings, amount, `Filho da Corrente - ${context.fullName}`);
  const qrCodeDataUrl = await QRCode.toDataURL(pixCopyPaste, { margin: 1, width: 360 });
  const upcoming = [0, 1, 2].map((offset) => ({ dueDate: monthDueDate(preferredDay, offset), amount, status: offset === 0 ? "proxima" : "prevista" }));

  return { currentPerson: context, settings, contributions: contributions ?? [], upcoming, pixCopyPaste, qrCodeDataUrl };
}

async function createContribution(context: AuthContext, body: Record<string, unknown>) {
  const settings = await loadSettings(context.organizationId);
  const amount = Math.max(1, asNumber(body.amount, settings.defaultAmount));
  const dueDate = asText(body.dueDate) || monthDueDate(settings.defaultDueDays[0] ?? 10, 0);
  const paymentMethod = asText(body.paymentMethod) || "pix";
  const proofUrl = asText(body.proofUrl);
  const notes = asText(body.notes);

  const { data, error } = await supabaseAdmin
    .from("oh_contributions")
    .insert({
      organization_id: context.organizationId,
      person_id: context.personId,
      contributor_name: context.fullName,
      amount,
      due_date: dueDate,
      status: proofUrl ? "comprovante_enviado" : "aguardando_pagamento",
      payment_method: paymentMethod,
      proof_url: proofUrl || null,
      notes: notes || null,
      metadata: { source: "filho_corrente", email: context.email, whatsapp: context.whatsapp },
    })
    .select("id, status")
    .single();
  if (error) throw error;

  return { contribution: data, message: "Contribuição registrada para conferência da tesouraria." };
}

async function saveReminderPreferences(context: AuthContext, body: Record<string, unknown>) {
  if (!context.personId) throw new Error("Pessoa não vinculada.");
  const wantsBeforeReminder = body.wantsBeforeReminder !== false;
  const wantsLateReminder = body.wantsLateReminder !== false;

  const { data: membership } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, agenda_viva_profile")
    .eq("organization_id", context.organizationId)
    .eq("person_id", context.personId)
    .maybeSingle();

  if (!membership?.id) throw new Error("Vínculo do Filho da Corrente não localizado.");
  const current = membership.agenda_viva_profile && typeof membership.agenda_viva_profile === "object" ? (membership.agenda_viva_profile as Record<string, unknown>) : {};
  const { error } = await supabaseAdmin
    .from("oh_memberships")
    .update({
      agenda_viva_profile: {
        ...current,
        correnteEmDia: { wantsBeforeReminder, wantsLateReminder },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.id);
  if (error) throw error;
  return { message: "Preferências de lembrete salvas." };
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    return NextResponse.json(await loadPayload(context));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar Corrente em Dia." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "createContribution") return NextResponse.json({ ok: true, ...(await createContribution(context, body)) });
    if (action === "saveReminderPreferences") return NextResponse.json({ ok: true, ...(await saveReminderPreferences(context, body)) });

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar Corrente em Dia." }, { status: 500 });
  }
}
