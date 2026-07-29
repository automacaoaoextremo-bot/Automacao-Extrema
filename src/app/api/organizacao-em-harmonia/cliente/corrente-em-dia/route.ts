import { NextResponse } from "next/server";
import { getOrganizacaoAuthContext } from "@/lib/organizacao-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
      "A contribuição mensal ajuda a manter a casa preparada, limpa, organizada e disponível para os trabalhos. Quando cada Filho da Corrente mantém sua parte em dia, a tesouraria ganha previsibilidade e a corrente ganha tranquilidade para servir.",
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

async function saveSettings(organizationId: string, settings: ReturnType<typeof normalizeSettings>) {
  const { error } = await supabaseAdmin.from("oh_module_settings").upsert(
    {
      organization_id: organizationId,
      module_slug: "corrente-em-dia",
      enabled: true,
      settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,module_slug" },
  );
  if (error) throw error;
}

async function loadPayload(organizationId: string) {
  const [settings, peopleResult, contributionsResult] = await Promise.all([
    loadSettings(organizationId),
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_contributions")
      .select("id, person_id, contributor_name, amount, due_date, paid_at, status, payment_method, proof_url, notes, metadata, created_at")
      .eq("organization_id", organizationId)
      .order("due_date", { ascending: false })
      .limit(500),
  ]);

  if (peopleResult.error) throw peopleResult.error;
  if (contributionsResult.error) throw contributionsResult.error;

  return { settings, people: peopleResult.data ?? [], contributions: contributionsResult.data ?? [] };
}

export async function GET(request: Request) {
  try {
    const auth = await getOrganizacaoAuthContext(request);
    if (!auth.ok) return auth.response;
    return NextResponse.json(await loadPayload(auth.context.organizationId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar Corrente em Dia." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getOrganizacaoAuthContext(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = asText(body.action);

    if (action === "saveSettings") {
      const settings = normalizeSettings(body.settings ?? body);
      await saveSettings(auth.context.organizationId, settings);
      return NextResponse.json({ ok: true, settings, message: "Configurações do Corrente em Dia salvas." });
    }

    if (action === "updateContributionStatus") {
      const contributionId = asText(body.contributionId ?? body.id);
      const status = asText(body.status);
      if (!contributionId || !status) throw new Error("Informe contribuição e status.");
      const updatePayload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "confirmado" || status === "pago") updatePayload.paid_at = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("oh_contributions")
        .update(updatePayload)
        .eq("organization_id", auth.context.organizationId)
        .eq("id", contributionId);
      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Contribuição atualizada." });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao salvar Corrente em Dia." }, { status: 500 });
  }
}
