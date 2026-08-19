import { asNumber } from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { supabaseAdmin } from "@/lib/supabase-admin";

type FinancialCategory = {
  name: string;
  public_name: string | null;
  group_name: string;
};

type FinancialEntryRow = {
  entry_type: "receita" | "despesa";
  competence_month: string;
  financial_month: string | null;
  description_internal: string;
  description_public: string | null;
  amount: number | string;
  status: string;
  workflow_status: string | null;
  data_nature: string | null;
  source_type: string;
  category: FinancialCategory | FinancialCategory[] | null;
};

type FinancialPeriodRow = {
  competence_month: string;
  status: string;
  workflow_status: string | null;
  data_nature: string | null;
  opening_balance: number | string;
  closing_balance: number | string | null;
  source_label: string | null;
  updated_at: string | null;
};

export type FinancialAnalysisEntry = {
  type: "receita" | "despesa";
  month: string;
  item: string;
  group: string;
  amount: number;
  dataNature: "realizado" | "estimado";
  workflowStatus: string;
  sourceType: string;
};

export type FinancialAnalysisPeriod = {
  month: string;
  status: string;
  workflowStatus: string;
  dataNature: "realizado" | "estimado";
  openingBalance: number;
  closingBalance: number | null;
  sourceLabel: string | null;
  updatedAt: string | null;
};

function categoryFrom(value: FinancialEntryRow["category"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function dataNature(value: string | null | undefined) {
  return value === "estimado" ? ("estimado" as const) : ("realizado" as const);
}

function monthKey(value: string | null | undefined) {
  return typeof value === "string" ? value.slice(0, 7) : "";
}

function isFinalizedPeriod(row: FinancialPeriodRow) {
  const workflow = (row.workflow_status || "").trim().toLowerCase();
  const status = (row.status || "").trim().toLowerCase();
  return (
    workflow === "finalizado" ||
    status === "finalizado" ||
    status === "fechado" ||
    status === "confirmado"
  );
}

export async function buildFinancialAnalysisBase(organizationId: string) {
  const [periodsResult, entriesResult] = await Promise.all([
    supabaseAdmin
      .from("oh_financial_periods")
      .select(
        "competence_month,status,workflow_status,data_nature,opening_balance,closing_balance,source_label,updated_at",
      )
      .eq("organization_id", organizationId)
      .order("competence_month", { ascending: true }),
    supabaseAdmin
      .from("oh_financial_entries")
      .select(
        "entry_type,competence_month,financial_month,description_internal,description_public,amount,status,workflow_status,data_nature,source_type,category:oh_financial_categories(name,public_name,group_name)",
      )
      .eq("organization_id", organizationId)
      .neq("status", "cancelado")
      .order("financial_month", { ascending: true }),
  ]);

  if (periodsResult.error) throw periodsResult.error;
  if (entriesResult.error) throw entriesResult.error;

  const periodRows = (periodsResult.data ?? []) as FinancialPeriodRow[];
  const finalizedRows = periodRows.filter(isFinalizedPeriod);
  const finalizedMonths = new Set(
    finalizedRows.map((row) => monthKey(row.competence_month)).filter(Boolean),
  );

  const periods = finalizedRows.map(
    (row): FinancialAnalysisPeriod => ({
      month: row.competence_month,
      status: row.status,
      workflowStatus: row.workflow_status || row.status || "finalizado",
      dataNature: dataNature(row.data_nature),
      openingBalance: asNumber(row.opening_balance),
      closingBalance:
        row.closing_balance == null ? null : asNumber(row.closing_balance),
      sourceLabel: row.source_label || null,
      updatedAt: row.updated_at || null,
    }),
  );

  const entries = ((entriesResult.data ?? []) as FinancialEntryRow[])
    .filter((row) =>
      finalizedMonths.has(monthKey(row.financial_month || row.competence_month)),
    )
    .map((row): FinancialAnalysisEntry => {
      const category = categoryFrom(row.category);
      return {
        type: row.entry_type,
        month: row.financial_month || row.competence_month,
        item:
          category?.name ||
          row.description_internal ||
          row.description_public ||
          "Outros",
        group: category?.group_name || "Outros",
        amount: asNumber(row.amount),
        dataNature: dataNature(row.data_nature),
        workflowStatus: row.workflow_status || row.status || "finalizado",
        sourceType: row.source_type || "manual",
      };
    });

  return {
    periods,
    entries,
  };
}
