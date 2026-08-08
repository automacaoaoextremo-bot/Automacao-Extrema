import { NextResponse } from "next/server";
import {
  asNumber,
  asText,
  monthKey,
  normalizeFinancialSettings,
  settingsToDatabase,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import {
  getFinancialAuthContext,
  writeFinancialAudit,
} from "@/lib/organizacao-em-harmonia/financial-auth";
import { notifyContributionEvent } from "@/lib/organizacao-em-harmonia/corrente-notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type EntryRow = {
  id: string;
  entry_type: "receita" | "despesa";
  competence_month: string;
  amount: number | string;
  status: string;
  is_provisional: boolean;
  needs_update: boolean;
  category:
    | { id: string; name: string; public_name: string | null; group_name: string }
    | Array<{ id: string; name: string; public_name: string | null; group_name: string }>
    | null;
};

function categoryFrom(value: EntryRow["category"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const FINAL_CONTRIBUTION_STATUSES = [
  "confirmado",
  "pago",
  "aprovado",
  "cancelado",
];

function lastMonthKeys(count = 12) {
  const now = new Date();
  const result: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    result.push(monthKey(new Date(now.getFullYear(), now.getMonth() - offset, 1, 12)));
  }
  return result;
}

async function loadSettings(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("oh_financial_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return normalizeFinancialSettings(data);
}

async function loadPayload(organizationId: string, canManage: boolean) {
  const monthKeys = lastMonthKeys(12);
  const firstMonth = monthKeys[0];

  const [
    settings,
    entriesResult,
    periodsResult,
    categoriesResult,
    contributionsResult,
    importsResult,
    transactionsResult,
    peopleResult,
    relationshipsResult,
    familiesResult,
  ] = await Promise.all([
    loadSettings(organizationId),
    supabaseAdmin
      .from("oh_financial_entries")
      .select(
        "id, entry_type, competence_month, amount, status, is_provisional, needs_update, category:oh_financial_categories(id, name, public_name, group_name)",
      )
      .eq("organization_id", organizationId)
      .gte("competence_month", firstMonth)
      .neq("status", "cancelado")
      .order("competence_month", { ascending: true }),
    supabaseAdmin
      .from("oh_financial_periods")
      .select(
        "id, competence_month, status, opening_balance, closing_balance, needs_update, source_label, notes",
      )
      .eq("organization_id", organizationId)
      .gte("competence_month", firstMonth)
      .order("competence_month", { ascending: true }),
    supabaseAdmin
      .from("oh_financial_categories")
      .select(
        "id, entry_type, name, public_name, slug, group_name, public_visible, active, sort_order",
      )
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("oh_contributions")
      .select(
        "id, person_id, contributor_name, contributor_email, contributor_whatsapp, amount, due_date, paid_at, status, payment_method, proof_url, receipt_uploaded_at, notes, contribution_kind, is_anonymous, recurrence_type, preferred_due_day, recurrence_start_date, recurrence_occurrences, public_identification_mode, metadata, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .order("due_date", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("oh_financial_imports")
      .select("id, import_type, source_name, original_file_name, status, totals, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabaseAdmin
      .from("oh_bank_transactions")
      .select("id, status")
      .eq("organization_id", organizationId)
      .in("status", ["nao_conciliado", "sugerido"]),
    supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, active")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabaseAdmin
      .from("oh_family_relationship_types")
      .select(
        "id, slug, label, active, requires_member_confirmation, requires_financial_approval, allow_responsible_payment, sort_order",
      )
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("oh_family_groups")
      .select("id, name, contribution_mode, status")
      .eq("organization_id", organizationId)
      .eq("status", "ativo"),
  ]);

  const results = [
    entriesResult,
    periodsResult,
    categoriesResult,
    contributionsResult,
    importsResult,
    transactionsResult,
    peopleResult,
    relationshipsResult,
    familiesResult,
  ];
  const failure = results.find((result) => result.error);
  if (failure?.error) throw failure.error;

  const entries = (entriesResult.data ?? []) as EntryRow[];
  const monthly = monthKeys.map((month) => {
    const rows = entries.filter((entry) => entry.competence_month === month);
    const revenues = rows
      .filter((entry) => entry.entry_type === "receita")
      .reduce((sum, entry) => sum + asNumber(entry.amount), 0);
    const expenses = rows
      .filter((entry) => entry.entry_type === "despesa")
      .reduce((sum, entry) => sum + asNumber(entry.amount), 0);

    return {
      month,
      revenues,
      expenses,
      result: revenues - expenses,
      isProvisional: rows.some(
        (entry) => entry.is_provisional || entry.status === "provisorio",
      ),
      needsUpdate: rows.some((entry) => entry.needs_update),
    };
  });

  const currentMonth = monthKey(new Date());
  const current =
    monthly.find((item) => item.month === currentMonth) ??
    monthly[monthly.length - 1] ?? {
      month: currentMonth,
      revenues: 0,
      expenses: 0,
      result: 0,
      isProvisional: false,
      needsUpdate: false,
    };

  const byGroup = new Map<
    string,
    { group: string; type: "receita" | "despesa"; amount: number }
  >();

  for (const entry of entries) {
    const category = categoryFrom(entry.category);
    const group = category?.group_name || "Sem grupo";
    const key = `${entry.entry_type}:${group}`;
    const currentGroup = byGroup.get(key) ?? {
      group,
      type: entry.entry_type,
      amount: 0,
    };
    currentGroup.amount += asNumber(entry.amount);
    byGroup.set(key, currentGroup);
  }

  const contributions = contributionsResult.data ?? [];
  const receivedContributionAmount = contributions
    .filter((item) =>
      ["confirmado", "pago", "aprovado"].includes(String(item.status)),
    )
    .reduce((sum, item) => sum + asNumber(item.amount), 0);
  const pendingContributionConfirmations = contributions.filter(
    (item) => String(item.status) === "comprovante_enviado",
  ).length;

  return {
    canManage,
    settings,
    dashboard: {
      current,
      monthly,
      totals: {
        revenues: monthly.reduce((sum, item) => sum + item.revenues, 0),
        expenses: monthly.reduce((sum, item) => sum + item.expenses, 0),
        result: monthly.reduce((sum, item) => sum + item.result, 0),
        receivedContributionAmount,
      },
      byGroup: Array.from(byGroup.values()).sort(
        (a, b) => b.amount - a.amount,
      ),
      pendingImports: (importsResult.data ?? []).filter((item) =>
        ["pre_visualizacao", "aguardando_mapeamento", "processando"].includes(
          item.status,
        ),
      ).length,
      pendingReconciliations: (transactionsResult.data ?? []).length,
      pendingContributionConfirmations,
      provisionalMonths: monthly.filter(
        (item) => item.isProvisional || item.needsUpdate,
      ).length,
      familyGroups: (familiesResult.data ?? []).length,
    },
    periods: periodsResult.data ?? [],
    categories: categoriesResult.data ?? [],
    contributions: canManage ? contributions : [],
    recentImports: canManage ? importsResult.data ?? [] : [],
    people: canManage ? peopleResult.data ?? [] : [],
    relationshipTypes: canManage ? relationshipsResult.data ?? [] : [],
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "view");
    if (!auth.ok) return auth.response;

    return NextResponse.json(
      await loadPayload(
        auth.context.organizationId,
        auth.context.canManage,
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar o Corrente em Dia.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "manage");
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = asText(body.action);

    if (action === "saveSettings") {
      const before = await loadSettings(auth.context.organizationId);
      const normalizedSettings = normalizeFinancialSettings(body.settings ?? body);
      const settings = {
        ...normalizedSettings,
        allowedDueDays: Array.from({ length: 31 }, (_, index) => index + 1),
        reminderDaysBefore: normalizedSettings.reminderDaysBefore.filter((day) =>
          [7, 5, 3, 1].includes(day),
        ),
        reminderOnDueDate: false,
        reminderChannels: ["email"],
      };
      const database = settingsToDatabase(settings);

      const { error } = await supabaseAdmin
        .from("oh_financial_settings")
        .upsert(
          {
            organization_id: auth.context.organizationId,
            ...database,
          },
          { onConflict: "organization_id" },
        );

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "configuracoes_atualizadas",
        entityType: "oh_financial_settings",
        beforeData: before,
        afterData: settings,
      });

      return NextResponse.json({
        ok: true,
        settings,
        message: "Configurações financeiras salvas.",
      });
    }

    if (action === "cancelContribution") {
      const contributionId = asText(body.contributionId ?? body.id);
      if (!contributionId) {
        return NextResponse.json(
          { error: "Informe a contribuição que deseja excluir." },
          { status: 400 },
        );
      }

      const { data: before, error: beforeError } = await supabaseAdmin
        .from("oh_contributions")
        .select("*")
        .eq("organization_id", auth.context.organizationId)
        .eq("id", contributionId)
        .maybeSingle();

      if (beforeError) throw beforeError;
      if (!before) {
        return NextResponse.json(
          { error: "Contribuição não localizada." },
          { status: 404 },
        );
      }

      if (FINAL_CONTRIBUTION_STATUSES.includes(asText(before.status))) {
        return NextResponse.json(
          {
            error:
              "Esta contribuição já foi validada ou cancelada e não pode mais ser excluída.",
          },
          { status: 409 },
        );
      }

      const { data: updated, error } = await supabaseAdmin
        .from("oh_contributions")
        .update({
          status: "cancelado",
          metadata: {
            ...asObject(before.metadata),
            canceledBy: "tesouraria_financeiro",
            canceledByPersonId: auth.context.personId,
            canceledAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", contributionId)
        .select("*")
        .single();

      if (error) throw error;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "contribuicao_cancelada",
        entityType: "oh_contributions",
        entityId: contributionId,
        beforeData: before,
        afterData: updated,
      });

      return NextResponse.json({
        ok: true,
        message: "Contribuição excluída antes da validação financeira.",
      });
    }

    if (action === "updateContributionStatus") {
      const beforeSettings = await loadSettings(auth.context.organizationId);
      const contributionId = asText(body.contributionId ?? body.id);
      const status = asText(body.status);
      if (!contributionId || !status) {
        return NextResponse.json(
          { error: "Informe a contribuição e a nova situação." },
          { status: 400 },
        );
      }

      const { data: before, error: beforeError } = await supabaseAdmin
        .from("oh_contributions")
        .select("*")
        .eq("organization_id", auth.context.organizationId)
        .eq("id", contributionId)
        .maybeSingle();

      if (beforeError) throw beforeError;
      if (!before) {
        return NextResponse.json(
          { error: "Contribuição não localizada." },
          { status: 404 },
        );
      }

      const paid = ["confirmado", "pago", "aprovado"].includes(status);
      const { data: updated, error } = await supabaseAdmin
        .from("oh_contributions")
        .update({
          status,
          paid_at: paid ? new Date().toISOString() : before.paid_at,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("id", contributionId)
        .select("*")
        .single();

      if (error) throw error;

      if (paid) {
        const dueDate = asText(updated.due_date).slice(0, 10);
        const month = monthKey(dueDate);
        const { data: category } = await supabaseAdmin
          .from("oh_financial_categories")
          .select("id")
          .eq("organization_id", auth.context.organizationId)
          .eq("entry_type", "receita")
          .eq("slug", "contribuicoes-filhos")
          .maybeSingle();

        const { data: period, error: periodError } = await supabaseAdmin
          .from("oh_financial_periods")
          .upsert(
            {
              organization_id: auth.context.organizationId,
              competence_month: month,
              status: "em_revisao",
              needs_update: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "organization_id,competence_month" },
          )
          .select("id")
          .single();

        if (periodError) throw periodError;
        if (!period) {
          throw new Error(
            "Não foi possível localizar ou criar a competência financeira.",
          );
        }

        const { error: entryError } = await supabaseAdmin
          .from("oh_financial_entries")
          .upsert(
            {
              organization_id: auth.context.organizationId,
              period_id: period.id,
              category_id: category?.id ?? null,
              entry_type: "receita",
              entry_date: dueDate,
              competence_month: month,
              description_internal: `Contribuição ${
                updated.is_anonymous
                  ? "não identificada"
                  : updated.contributor_name || "identificada"
              }`,
              description_public: "Contribuição",
              amount: asNumber(updated.amount),
              payment_method: updated.payment_method,
              source_type: "contribuicao",
              source_reference: contributionId,
              status: "confirmado",
              is_provisional: false,
              needs_update: false,
              public_visible: true,
              metadata: {
                isAnonymous: Boolean(updated.is_anonymous),
                contributionKind: updated.contribution_kind,
              },
              approved_by: auth.context.personId,
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict:
                "organization_id,source_type,source_reference",
            },
          );

        if (entryError) throw entryError;
      }

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "contribuicao_status_atualizado",
        entityType: "oh_contributions",
        entityId: contributionId,
        beforeData: before,
        afterData: updated,
      });

      if (paid) {
        await notifyContributionEvent({
          organizationId: auth.context.organizationId,
          contributionId,
          contributorName:
            asText(updated.contributor_name) ||
            (updated.is_anonymous
              ? "Contribuição não identificada"
              : "Contribuinte"),
          contributorEmail: asText(updated.contributor_email) || null,
          amount: asNumber(updated.amount),
          status,
          paymentMethod:
            asText(updated.payment_method) === "recepcao"
              ? "Cartão de Crédito, Débito ou Dinheiro"
              : asText(updated.payment_method) || "Não informada",
          event: "aprovada",
          dueDate: asText(updated.due_date) || null,
          notes: asText(updated.notes) || null,
          extraEmails: beforeSettings.contributionNotificationEmails,
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Contribuição atualizada.",
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao salvar o Corrente em Dia.",
      },
      { status: 500 },
    );
  }
}
