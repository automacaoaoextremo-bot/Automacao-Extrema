import {
  asNumber,
  monthKey,
  normalizeFinancialSettings,
} from "@/lib/organizacao-em-harmonia/corrente-financeiro";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type FinancialWorkflowStatus =
  | "rascunho"
  | "em_andamento"
  | "em_revisao"
  | "finalizado"
  | "reaberto";

export type FinancialDataNature = "realizado" | "estimado";

export type LiveFinancialMonth = {
  month: string;
  workflowStatus: FinancialWorkflowStatus;
  finalized: boolean;
  current: boolean;
  hasData: boolean;
  revenues: number | null;
  expenses: number | null;
  result: number | null;
  openingBalance: number | null;
  closingBalance: number | null;
  bankBalance: number | null;
  realizedRevenues: number;
  realizedExpenses: number;
  estimatedRevenues: number;
  estimatedExpenses: number;
  sourceLabel: string | null;
  updatedAt: string | null;
};

export type LiveFinancialGroup = {
  type: "receita" | "despesa";
  group: string;
  total: number;
  items: Array<{ name: string; total: number }>;
};

export type LiveFinancialMatrixItem = {
  name: string;
  values: Record<string, number>;
};

export type LiveFinancialMatrixGroup = {
  type: "receita" | "despesa";
  group: string;
  values: Record<string, number>;
  items: LiveFinancialMatrixItem[];
};

export type LiveFinancialMatrix = {
  months: Array<{
    month: string;
    openingBalance: number | null;
    closingBalance: number | null;
    bankBalance: number | null;
  }>;
  groups: LiveFinancialMatrixGroup[];
};

type Category = {
  name: string;
  public_name: string | null;
  group_name: string;
  public_visible: boolean;
};

type Entry = {
  entry_type: "receita" | "despesa";
  competence_month: string;
  financial_month: string | null;
  description_public: string | null;
  amount: number | string;
  status: string;
  workflow_status: string | null;
  data_nature: string | null;
  public_visible: boolean;
  updated_at: string | null;
  category: Category | Category[] | null;
};

type Period = {
  competence_month: string;
  status: string;
  workflow_status: string | null;
  data_nature: string | null;
  opening_balance: number | string;
  closing_balance: number | string | null;
  source_label: string | null;
  updated_at: string | null;
};

function categoryFrom(value: Entry["category"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function entryCategoryKey(entry: Entry) {
  const category = categoryFrom(entry.category);
  return [
    entry.entry_type,
    category?.group_name || "Outros",
    category?.public_name ||
      category?.name ||
      entry.description_public ||
      "Outros",
  ]
    .join("|")
    .toLocaleLowerCase("pt-BR");
}

function workflowFrom(period: Period | undefined): FinancialWorkflowStatus {
  const explicit = period?.workflow_status;
  if (
    explicit === "rascunho" ||
    explicit === "em_andamento" ||
    explicit === "em_revisao" ||
    explicit === "finalizado" ||
    explicit === "reaberto"
  ) {
    return explicit;
  }

  if (["confirmado", "fechado"].includes(period?.status ?? "")) {
    return "finalizado";
  }
  if (period?.status === "em_revisao") return "em_revisao";
  return "rascunho";
}

function natureFrom(value: string | null | undefined): FinancialDataNature {
  return value === "estimado" ? "estimado" : "realizado";
}

function monthSequence(reference = new Date(), count = 12) {
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    months.push(
      monthKey(
        new Date(
          reference.getFullYear(),
          reference.getMonth() - offset,
          1,
          12,
        ),
      ),
    );
  }
  return months;
}

function groupsFor(entries: Entry[]) {
  const groups = new Map<
    string,
    {
      type: "receita" | "despesa";
      group: string;
      total: number;
      items: Map<string, number>;
    }
  >();

  for (const entry of entries) {
    const category = categoryFrom(entry.category);
    if (category?.public_visible === false || !entry.public_visible) continue;

    const groupName = category?.group_name || "Outros";
    const key = `${entry.entry_type}:${groupName}`;
    const group = groups.get(key) ?? {
      type: entry.entry_type,
      group: groupName,
      total: 0,
      items: new Map<string, number>(),
    };
    const amount = asNumber(entry.amount);
    const itemName =
      category?.public_name ||
      category?.name ||
      entry.description_public ||
      "Outros";

    group.total += amount;
    group.items.set(itemName, (group.items.get(itemName) ?? 0) + amount);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      type: group.type,
      group: group.group,
      total: group.total,
      items: Array.from(group.items.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((left, right) => right.total - left.total),
    }))
    .sort((left, right) => right.total - left.total);
}

export async function buildLiveFinancialTransparency(organizationId: string) {
  const currentMonth = monthKey(new Date());
  const historyMonths = monthSequence(new Date(), 12);

  const [settingsResult, periodsResult, entriesResult] = await Promise.all([
    supabaseAdmin
      .from("oh_financial_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from("oh_financial_periods")
      .select(
        "competence_month, status, workflow_status, data_nature, opening_balance, closing_balance, source_label, updated_at",
      )
      .eq("organization_id", organizationId)
      .order("competence_month", { ascending: true }),
    supabaseAdmin
      .from("oh_financial_entries")
      .select(
        "entry_type, competence_month, financial_month, description_public, amount, status, workflow_status, data_nature, public_visible, updated_at, category:oh_financial_categories(name, public_name, group_name, public_visible)",
      )
      .eq("organization_id", organizationId)
      .neq("status", "cancelado")
      .eq("public_visible", true)
      .order("financial_month", { ascending: true }),
  ]);

  if (settingsResult.error) throw settingsResult.error;
  if (periodsResult.error) throw periodsResult.error;
  if (entriesResult.error) throw entriesResult.error;

  const settings = normalizeFinancialSettings(settingsResult.data);
  const periods = (periodsResult.data ?? []) as Period[];
  const entries = (entriesResult.data ?? []) as Entry[];
  const periodsByMonth = new Map(
    periods.map((period) => [period.competence_month, period]),
  );

  const entriesByFinancialMonth = new Map<string, Entry[]>();
  for (const entry of entries) {
    const financialMonth = entry.financial_month || entry.competence_month;
    const currentRows = entriesByFinancialMonth.get(financialMonth) ?? [];
    currentRows.push(entry);
    entriesByFinancialMonth.set(financialMonth, currentRows);
  }

  const effectiveEntriesForMonth = (month: string) => {
    const rows = entriesByFinancialMonth.get(month) ?? [];

    if (month !== currentMonth) return rows;

    const realizedCategoryKeys = new Set(
      rows
        .filter((entry) => natureFrom(entry.data_nature) === "realizado")
        .map(entryCategoryKey),
    );

    return rows.filter(
      (entry) =>
        natureFrom(entry.data_nature) === "realizado" ||
        !realizedCategoryKeys.has(entryCategoryKey(entry)),
    );
  };

  const finalizedPeriods = periods
    .filter((period) => workflowFrom(period) === "finalizado")
    .sort((left, right) =>
      left.competence_month.localeCompare(right.competence_month),
    );
  const latestFinalizedPeriod = finalizedPeriods.at(-1) ?? null;
  const latestFinalizedMonth = latestFinalizedPeriod?.competence_month ?? null;

  const summarize = (month: string): LiveFinancialMonth => {
    const period = periodsByMonth.get(month);
    const workflowStatus =
      month === currentMonth && !period
        ? "em_andamento"
        : workflowFrom(period);
    const current = month === currentMonth;
    const finalized = workflowStatus === "finalizado";
    const rows = effectiveEntriesForMonth(month);
    const hasData = rows.length > 0 || Boolean(period);

    const realizedRows = rows.filter(
      (entry) => natureFrom(entry.data_nature) === "realizado",
    );
    const estimatedRows = rows.filter(
      (entry) => natureFrom(entry.data_nature) === "estimado",
    );

    const sumType = (source: Entry[], type: "receita" | "despesa") =>
      source
        .filter((entry) => entry.entry_type === type)
        .reduce((sum, entry) => sum + asNumber(entry.amount), 0);

    const realizedRevenues = sumType(realizedRows, "receita");
    const realizedExpenses = sumType(realizedRows, "despesa");
    const estimatedRevenues = sumType(estimatedRows, "receita");
    const estimatedExpenses = sumType(estimatedRows, "despesa");
    const revenues = realizedRevenues + estimatedRevenues;
    const expenses = realizedExpenses + estimatedExpenses;
    const result = revenues - expenses;

    const mayExposeValues = finalized || current;
    const previousFinalized = finalizedPeriods
      .filter((candidate) => candidate.competence_month < month)
      .at(-1);
    const openingBalance = period
      ? asNumber(period.opening_balance)
      : previousFinalized?.closing_balance == null
        ? 0
        : asNumber(previousFinalized.closing_balance);
    const closingBalance = period?.closing_balance == null
      ? openingBalance + result
      : asNumber(period.closing_balance, openingBalance + result);

    const updatedCandidates = [
      period?.updated_at,
      ...rows.map((entry) => entry.updated_at),
    ].filter((value): value is string => Boolean(value));

    return {
      month,
      workflowStatus,
      finalized,
      current,
      hasData,
      revenues: mayExposeValues ? revenues : null,
      expenses: mayExposeValues ? expenses : null,
      result: mayExposeValues ? result : null,
      openingBalance: mayExposeValues ? openingBalance : null,
      closingBalance: mayExposeValues ? closingBalance : null,
      bankBalance: mayExposeValues ? closingBalance : null,
      realizedRevenues,
      realizedExpenses,
      estimatedRevenues,
      estimatedExpenses,
      sourceLabel: period?.source_label ?? null,
      updatedAt: updatedCandidates.sort().at(-1) ?? null,
    };
  };

  const history = historyMonths.map(summarize);
  const finalizedMonthly = finalizedPeriods.map((period) =>
    summarize(period.competence_month),
  );
  const latestFinalized = latestFinalizedMonth
    ? summarize(latestFinalizedMonth)
    : null;
  const currentForecast = summarize(currentMonth);

  const latestEntries = latestFinalizedMonth
    ? entriesByFinancialMonth.get(latestFinalizedMonth) ?? []
    : [];
  const currentEntries = effectiveEntriesForMonth(currentMonth);

  const matrixMonths = [...finalizedMonthly]
    .sort((left, right) => right.month.localeCompare(left.month))
    .map((month) => ({
      month: month.month,
      openingBalance: month.openingBalance,
      closingBalance: month.closingBalance,
      bankBalance: month.bankBalance,
    }));
  const matrixMonthKeys = new Set(matrixMonths.map((month) => month.month));
  const matrixGroups = new Map<
    string,
    {
      type: "receita" | "despesa";
      group: string;
      values: Map<string, number>;
      items: Map<string, Map<string, number>>;
    }
  >();

  for (const entry of entries) {
    const financialMonth = entry.financial_month || entry.competence_month;
    if (!matrixMonthKeys.has(financialMonth)) continue;

    const category = categoryFrom(entry.category);
    if (category?.public_visible === false || !entry.public_visible) continue;

    const groupName = category?.group_name || "Outros";
    const itemName =
      category?.public_name ||
      category?.name ||
      entry.description_public ||
      "Outros";
    const key = `${entry.entry_type}:${groupName}`;
    const group = matrixGroups.get(key) ?? {
      type: entry.entry_type,
      group: groupName,
      values: new Map<string, number>(),
      items: new Map<string, Map<string, number>>(),
    };
    const amount = asNumber(entry.amount);

    group.values.set(
      financialMonth,
      (group.values.get(financialMonth) ?? 0) + amount,
    );

    const itemValues = group.items.get(itemName) ?? new Map<string, number>();
    itemValues.set(
      financialMonth,
      (itemValues.get(financialMonth) ?? 0) + amount,
    );
    group.items.set(itemName, itemValues);
    matrixGroups.set(key, group);
  }

  const matrix: LiveFinancialMatrix = {
    months: matrixMonths,
    groups: Array.from(matrixGroups.values())
      .map((group) => ({
        type: group.type,
        group: group.group,
        values: Object.fromEntries(group.values.entries()),
        items: Array.from(group.items.entries())
          .map(([name, values]) => ({
            name,
            values: Object.fromEntries(values.entries()),
          }))
          .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
      }))
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === "receita" ? -1 : 1;
        }
        return left.group.localeCompare(right.group, "pt-BR");
      }),
  };

  const updateToken = [
    latestFinalized?.updatedAt,
    currentForecast.updatedAt,
    latestFinalizedMonth,
    currentMonth,
  ]
    .filter(Boolean)
    .join(":");

  return {
    generatedAt: new Date().toISOString(),
    updateToken,
    settings: {
      detailLevel: settings.publicDetailLevel,
      showLast12Months: settings.publicShowLast12Months,
      showDrilldown: settings.publicShowDrilldown,
      showTopExpenses: settings.publicShowTopExpenses,
      showTopRevenues: settings.publicShowTopRevenues,
      showNegativeResults: settings.publicShowNegativeResults,
      showAccumulatedBalance: settings.publicShowAccumulatedBalance,
      popupAutoOpen: settings.publicPopupAutoOpen,
      popupFrequency: settings.publicPopupFrequency,
      headline: settings.publicHeadline,
      message: settings.publicMessage,
    },
    latestFinalized,
    currentForecast,
    finalizedMonthly,
    history,
    latestFinalizedGroups: groupsFor(latestEntries),
    currentGroups: groupsFor(currentEntries),
    matrix,
  };
}
