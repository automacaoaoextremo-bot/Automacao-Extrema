import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  asBoolean,
  asNumber,
  asText,
  monthKey,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import {
  getFinancialAuthContext,
  writeFinancialAudit,
} from "@/lib/organizacao-em-harmonia/financial-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const BALANCE_SOURCE_TYPES = [
  "balancete_imagem",
  "balancete_provisorio",
  "balancete_manual",
];

type CategoryIdentity = {
  id: string;
  entry_type: "receita" | "despesa";
};

type ExistingBalanceEntry = {
  id: string;
  source_type: string;
  source_reference: string | null;
};

type BalanceRowInput = {
  id?: unknown;
  clientKey?: unknown;
  entryType?: unknown;
  categoryId?: unknown;
  descriptionInternal?: unknown;
  descriptionPublic?: unknown;
  amount?: unknown;
  quantity?: unknown;
  unit?: unknown;
  publicVisible?: unknown;
};

function validMonth(value: string) {
  return /^\d{4}-\d{2}-01$/.test(value);
}

function endOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function safeClientKey(value: unknown) {
  const normalized = asText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || randomUUID();
}

async function loadMonth(organizationId: string, competenceMonth: string) {
  const [periodResult, entriesResult, categoriesResult] = await Promise.all([
    supabaseAdmin
      .from("oh_financial_periods")
      .select(
        "id, competence_month, status, opening_balance, closing_balance, needs_update, source_label, notes, updated_at",
      )
      .eq("organization_id", organizationId)
      .eq("competence_month", competenceMonth)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_financial_entries")
      .select(
        "id, category_id, entry_type, entry_date, competence_month, description_internal, description_public, amount, source_type, source_reference, status, is_provisional, needs_update, public_visible, metadata, category:oh_financial_categories(id, name, public_name, group_name)",
      )
      .eq("organization_id", organizationId)
      .eq("competence_month", competenceMonth)
      .in("source_type", BALANCE_SOURCE_TYPES)
      .neq("status", "cancelado")
      .order("entry_type", { ascending: true })
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("oh_financial_categories")
      .select(
        "id, entry_type, name, public_name, group_name, public_visible, active, sort_order",
      )
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("entry_type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (periodResult.error) throw periodResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (categoriesResult.error) throw categoriesResult.error;

  const entries = [...(entriesResult.data ?? [])].sort((left, right) => {
    const leftOrder = asNumber(
      left.metadata && typeof left.metadata === "object"
        ? (left.metadata as Record<string, unknown>).sortOrder
        : 0,
    );
    const rightOrder = asNumber(
      right.metadata && typeof right.metadata === "object"
        ? (right.metadata as Record<string, unknown>).sortOrder
        : 0,
    );
    return leftOrder - rightOrder;
  });

  return {
    period: periodResult.data,
    entries,
    categories: categoriesResult.data ?? [],
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getFinancialAuthContext(request, "view");
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const month = monthKey(asText(url.searchParams.get("month")) || new Date());

    return NextResponse.json({
      canManage: auth.context.canManage,
      competenceMonth: month,
      ...(await loadMonth(auth.context.organizationId, month)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar o balancete mensal.",
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
    const competenceMonth = monthKey(asText(body.competenceMonth));

    if (!validMonth(competenceMonth)) {
      return NextResponse.json(
        { error: "Informe uma competência mensal válida." },
        { status: 400 },
      );
    }

    if (action === "save_monthly") {
      const rawRows = Array.isArray(body.rows)
        ? (body.rows as BalanceRowInput[])
        : [];

      if (rawRows.length > 250) {
        return NextResponse.json(
          { error: "O balancete aceita no máximo 250 linhas por mês." },
          { status: 400 },
        );
      }

      const rows = rawRows.flatMap((row, index) => {
        const entryType = asText(row.entryType);
        const descriptionInternal = asText(row.descriptionInternal);
        const amount = Math.abs(asNumber(row.amount));

        if (!descriptionInternal && amount <= 0) return [];
        if (!['receita', 'despesa'].includes(entryType)) {
          throw new Error(`Selecione Receita ou Despesa na linha ${index + 1}.`);
        }
        if (!descriptionInternal) {
          throw new Error(`Informe a descrição da linha ${index + 1}.`);
        }
        if (amount <= 0) {
          throw new Error(`Informe um valor maior que zero na linha ${index + 1}.`);
        }

        return [
          {
            id: asText(row.id),
            clientKey: safeClientKey(row.clientKey),
            entryType: entryType as "receita" | "despesa",
            categoryId: asText(row.categoryId),
            descriptionInternal,
            descriptionPublic:
              asText(row.descriptionPublic) || descriptionInternal,
            amount,
            quantity: asNumber(row.quantity),
            unit: asText(row.unit),
            publicVisible: asBoolean(row.publicVisible, true),
            sortOrder: index + 1,
          },
        ];
      });

      const { data: categories, error: categoriesError } = await supabaseAdmin
        .from("oh_financial_categories")
        .select("id, entry_type")
        .eq("organization_id", auth.context.organizationId);

      if (categoriesError) throw categoriesError;
      const categoryRows = (categories ?? []) as CategoryIdentity[];
      const categoryTypes = new Map(
        categoryRows.map((category) => [category.id, category.entry_type]),
      );

      for (const row of rows) {
        if (
          row.categoryId &&
          categoryTypes.get(row.categoryId) !== row.entryType
        ) {
          return NextResponse.json(
            {
              error: `A categoria de "${row.descriptionInternal}" não pertence ao tipo selecionado.`,
            },
            { status: 400 },
          );
        }
      }

      const isProvisional = asBoolean(body.isProvisional);
      const needsUpdate = asBoolean(body.needsUpdate, isProvisional);
      const openingBalance = asNumber(body.openingBalance);
      const totals = rows.reduce(
        (acc, row) => {
          if (row.entryType === "receita") acc.revenues += row.amount;
          else acc.expenses += row.amount;
          return acc;
        },
        { revenues: 0, expenses: 0 },
      );
      const calculatedClosing =
        openingBalance + totals.revenues - totals.expenses;
      const closingBalance =
        asText(body.closingBalance) === ""
          ? calculatedClosing
          : asNumber(body.closingBalance, calculatedClosing);
      const periodStatus = isProvisional ? "provisorio" : "em_revisao";

      const { data: period, error: periodError } = await supabaseAdmin
        .from("oh_financial_periods")
        .upsert(
          {
            organization_id: auth.context.organizationId,
            competence_month: competenceMonth,
            status: periodStatus,
            opening_balance: openingBalance,
            closing_balance: closingBalance,
            needs_update: needsUpdate,
            source_label:
              asText(body.sourceLabel) ||
              (isProvisional
                ? "Balancete provisório cadastrado pela Tesouraria"
                : "Balancete mensal cadastrado pela Tesouraria"),
            notes: asText(body.notes) || null,
            approved_by: null,
            approved_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,competence_month" },
        )
        .select("id")
        .single();

      if (periodError) throw periodError;
      if (!period) {
        throw new Error("Não foi possível criar ou atualizar a competência.");
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("oh_financial_entries")
        .select("id, source_type, source_reference")
        .eq("organization_id", auth.context.organizationId)
        .eq("competence_month", competenceMonth)
        .in("source_type", BALANCE_SOURCE_TYPES)
        .neq("status", "cancelado");

      if (existingError) throw existingError;
      const existingRows = (existing ?? []) as ExistingBalanceEntry[];
      const existingMap = new Map(
        existingRows.map((entry) => [entry.id, entry]),
      );
      const submittedExistingIds = new Set(
        rows.map((row) => row.id).filter((id) => existingMap.has(id)),
      );

      for (const row of rows) {
        const previous = row.id ? existingMap.get(row.id) : undefined;
        const payload = {
          organization_id: auth.context.organizationId,
          period_id: period.id,
          category_id: row.categoryId || null,
          entry_type: row.entryType,
          entry_date: endOfMonth(competenceMonth),
          competence_month: competenceMonth,
          description_internal: row.descriptionInternal,
          description_public: row.descriptionPublic,
          amount: row.amount,
          source_type: previous?.source_type || "balancete_manual",
          source_reference:
            previous?.source_reference ||
            `balancete-manual:${competenceMonth.slice(0, 7)}:${row.clientKey}`,
          status: periodStatus,
          is_provisional: isProvisional,
          needs_update: needsUpdate,
          public_visible: row.publicVisible,
          metadata: {
            balanceteClientKey: row.clientKey,
            quantity: row.quantity || null,
            unit: row.unit || null,
            sortOrder: row.sortOrder,
            savedFrom: "balancete_mensal_mobile",
          },
          approved_by: null,
          approved_at: null,
          updated_at: new Date().toISOString(),
        };

        const operation = previous
          ? supabaseAdmin
              .from("oh_financial_entries")
              .update(payload)
              .eq("organization_id", auth.context.organizationId)
              .eq("id", previous.id)
          : supabaseAdmin.from("oh_financial_entries").insert({
              ...payload,
              created_by: auth.context.personId,
            });

        const { error } = await operation;
        if (error) throw error;
      }

      const removedIds = existingRows
        .map((entry) => entry.id)
        .filter((id) => !submittedExistingIds.has(id));

      if (removedIds.length > 0) {
        const { error: cancelError } = await supabaseAdmin
          .from("oh_financial_entries")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", auth.context.organizationId)
          .in("id", removedIds);

        if (cancelError) throw cancelError;
      }

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "balancete_mensal_salvo",
        entityType: "oh_financial_periods",
        entityId: period.id,
        afterData: {
          competenceMonth,
          openingBalance,
          closingBalance,
          revenues: totals.revenues,
          expenses: totals.expenses,
          result: totals.revenues - totals.expenses,
          rows: rows.length,
          isProvisional,
          needsUpdate,
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Balancete mensal salvo para revisão.",
        summary: {
          revenues: totals.revenues,
          expenses: totals.expenses,
          result: totals.revenues - totals.expenses,
          closingBalance,
        },
      });
    }

    if (action === "confirm_month") {
      const { data: period, error: periodError } = await supabaseAdmin
        .from("oh_financial_periods")
        .update({
          status: "confirmado",
          needs_update: false,
          approved_by: auth.context.personId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("competence_month", competenceMonth)
        .select("id")
        .maybeSingle();

      if (periodError) throw periodError;
      if (!period) {
        return NextResponse.json(
          { error: "Balancete não localizado para confirmação." },
          { status: 404 },
        );
      }

      const { error: entriesError } = await supabaseAdmin
        .from("oh_financial_entries")
        .update({
          status: "confirmado",
          is_provisional: false,
          needs_update: false,
          approved_by: auth.context.personId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", auth.context.organizationId)
        .eq("competence_month", competenceMonth)
        .in("source_type", BALANCE_SOURCE_TYPES)
        .neq("status", "cancelado");

      if (entriesError) throw entriesError;

      await writeFinancialAudit({
        organizationId: auth.context.organizationId,
        personId: auth.context.personId,
        action: "balancete_mensal_confirmado",
        entityType: "oh_financial_periods",
        entityId: period.id,
        afterData: { competenceMonth, status: "confirmado" },
      });

      return NextResponse.json({
        ok: true,
        message: "Balancete mensal confirmado.",
      });
    }

    throw new Error("Ação não reconhecida.");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao salvar o balancete mensal.",
      },
      { status: 500 },
    );
  }
}
