export type FinancialEntryType = "receita" | "despesa";
export type FinancialEntryStatus =
  | "rascunho"
  | "importado"
  | "provisorio"
  | "em_revisao"
  | "confirmado"
  | "com_divergencia"
  | "cancelado";

export type PublicDetailLevel = "resumido" | "grupos" | "itens";
export type PublicPopupFrequency =
  | "every_access"
  | "once_per_session"
  | "once_per_day"
  | "once_per_month"
  | "on_update"
  | "disabled";

export type CorrenteFinancialSettings = {
  defaultMonthlyAmount: number;
  amountIsMandatory: boolean;
  allowCustomAmount: boolean;
  allowedDueDays: number[];
  defaultDueDay: number;
  reminderDaysBefore: number[];
  reminderOnDueDate: boolean;
  reminderChannels: string[];
  familyContributionsEnabled: boolean;
  familyRequiresMemberConfirmation: boolean;
  familyRequiresFinancialApproval: boolean;
  publicDetailLevel: PublicDetailLevel;
  publicShowLast12Months: boolean;
  publicShowDrilldown: boolean;
  publicShowTopExpenses: boolean;
  publicShowTopRevenues: boolean;
  publicShowNegativeResults: boolean;
  publicShowAccumulatedBalance: boolean;
  publicShowSimulator: boolean;
  publicShowProvisionalData: boolean;
  publicPopupAutoOpen: boolean;
  publicPopupFrequency: PublicPopupFrequency;
  publicHeadline: string;
  publicMessage: string;
  googleSheetsUrl: string;
  googleSheetsTab: string;
  googleSheetsLastSyncAt: string | null;
  ocrProvider: string;
  receptionContactName: string;
  receptionWhatsapp: string;
  contributionNotificationEmails: string[];
};

const ALL_CONTRIBUTION_DUE_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export const DEFAULT_CORRENTE_FINANCIAL_SETTINGS: CorrenteFinancialSettings = {
  defaultMonthlyAmount: 50,
  amountIsMandatory: false,
  allowCustomAmount: true,
  allowedDueDays: ALL_CONTRIBUTION_DUE_DAYS,
  defaultDueDay: 10,
  reminderDaysBefore: [7, 5, 3, 1],
  reminderOnDueDate: false,
  reminderChannels: ["email"],
  familyContributionsEnabled: true,
  familyRequiresMemberConfirmation: true,
  familyRequiresFinancialApproval: true,
  publicDetailLevel: "grupos",
  publicShowLast12Months: true,
  publicShowDrilldown: true,
  publicShowTopExpenses: true,
  publicShowTopRevenues: true,
  publicShowNegativeResults: true,
  publicShowAccumulatedBalance: true,
  publicShowSimulator: true,
  publicShowProvisionalData: true,
  publicPopupAutoOpen: true,
  publicPopupFrequency: "once_per_session",
  publicHeadline: "Fortalecendo a confiança",
  publicMessage:
    "Acompanhe os recursos do último mês finalizado e a previsão do mês atual, com clareza sobre receitas, despesas, resultado e saldo.",
  googleSheetsUrl: "",
  googleSheetsTab: "",
  googleSheetsLastSyncAt: null,
  ocrProvider: "external_adapter",
  receptionContactName: "Recepção do Tucxa",
  receptionWhatsapp: "",
  contributionNotificationEmails: ["automacao-ao-extremo@gmail.com"],
};

export function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (["1", "true", "sim", "s", "yes", "ativo"].includes(normalized)) return true;
  if (["0", "false", "nao", "n", "no", "inativo"].includes(normalized)) return false;
  return fallback;
}

export function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = asText(value);
  if (!raw) return fallback;

  const normalized = raw
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeIntegerList(value: unknown, allowed?: number[]) {
  const source = Array.isArray(value)
    ? value
    : asText(value)
        .split(/[;,|\s]+/)
        .filter(Boolean);

  const result = Array.from(
    new Set(
      source
        .map((item) => Math.trunc(asNumber(item, Number.NaN)))
        .filter((item) => Number.isFinite(item))
        .filter((item) => !allowed || allowed.includes(item)),
    ),
  ).sort((a, b) => a - b);

  return result;
}

export function normalizeStringList(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : asText(value)
        .split(/[;,|]+/)
        .filter(Boolean);

  return Array.from(new Set(source.map((item) => asText(item)).filter(Boolean)));
}

export function normalizeFinancialSettings(value: unknown): CorrenteFinancialSettings {
  const row =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const allowedDueDays = normalizeIntegerList(
    row.allowed_due_days ?? row.allowedDueDays,
    ALL_CONTRIBUTION_DUE_DAYS,
  );

  const reminderDays = normalizeIntegerList(
    row.reminder_days_before ?? row.reminderDaysBefore,
    [7, 5, 3, 1],
  ).sort((left, right) => right - left);
  const reminderChannels = normalizeStringList(
    row.reminder_channels ?? row.reminderChannels,
  ).filter((item) => item === "email");

  const detail = asText(row.public_detail_level ?? row.publicDetailLevel);
  const popup = asText(row.public_popup_frequency ?? row.publicPopupFrequency);

  return {
    defaultMonthlyAmount: Math.max(
      0,
      asNumber(
        row.default_monthly_amount ??
          row.defaultMonthlyAmount ??
          row.defaultAmount,
        DEFAULT_CORRENTE_FINANCIAL_SETTINGS.defaultMonthlyAmount,
      ),
    ),
    amountIsMandatory: asBoolean(
      row.amount_is_mandatory ?? row.amountIsMandatory,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.amountIsMandatory,
    ),
    allowCustomAmount: asBoolean(
      row.allow_custom_amount ?? row.allowCustomAmount,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.allowCustomAmount,
    ),
    allowedDueDays:
      allowedDueDays.length > 0
        ? allowedDueDays
        : DEFAULT_CORRENTE_FINANCIAL_SETTINGS.allowedDueDays,
    defaultDueDay: Math.max(
      1,
      Math.min(
        31,
        Math.trunc(
          asNumber(
            row.default_due_day ?? row.defaultDueDay,
            DEFAULT_CORRENTE_FINANCIAL_SETTINGS.defaultDueDay,
          ),
        ),
      ),
    ),
    reminderDaysBefore:
      reminderDays.length > 0
        ? reminderDays
        : DEFAULT_CORRENTE_FINANCIAL_SETTINGS.reminderDaysBefore,
    reminderOnDueDate: asBoolean(
      row.reminder_on_due_date ?? row.reminderOnDueDate,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.reminderOnDueDate,
    ),
    reminderChannels:
      reminderChannels.length > 0
        ? reminderChannels
        : DEFAULT_CORRENTE_FINANCIAL_SETTINGS.reminderChannels,
    familyContributionsEnabled: asBoolean(
      row.family_contributions_enabled ?? row.familyContributionsEnabled,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.familyContributionsEnabled,
    ),
    familyRequiresMemberConfirmation: asBoolean(
      row.family_requires_member_confirmation ??
        row.familyRequiresMemberConfirmation,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.familyRequiresMemberConfirmation,
    ),
    familyRequiresFinancialApproval: asBoolean(
      row.family_requires_financial_approval ??
        row.familyRequiresFinancialApproval,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.familyRequiresFinancialApproval,
    ),
    publicDetailLevel: ["resumido", "grupos", "itens"].includes(detail)
      ? (detail as PublicDetailLevel)
      : DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicDetailLevel,
    publicShowLast12Months: asBoolean(
      row.public_show_last_12_months ?? row.publicShowLast12Months,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicShowLast12Months,
    ),
    publicShowDrilldown: asBoolean(
      row.public_show_drilldown ?? row.publicShowDrilldown,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicShowDrilldown,
    ),
    publicShowTopExpenses: asBoolean(
      row.public_show_top_expenses ?? row.publicShowTopExpenses,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicShowTopExpenses,
    ),
    publicShowTopRevenues: asBoolean(
      row.public_show_top_revenues ?? row.publicShowTopRevenues,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicShowTopRevenues,
    ),
    publicShowNegativeResults: asBoolean(
      row.public_show_negative_results ?? row.publicShowNegativeResults,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicShowNegativeResults,
    ),
    publicShowAccumulatedBalance: asBoolean(
      row.public_show_accumulated_balance ?? row.publicShowAccumulatedBalance,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicShowAccumulatedBalance,
    ),
    publicShowSimulator: asBoolean(
      row.public_show_simulator ?? row.publicShowSimulator,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicShowSimulator,
    ),
    publicShowProvisionalData: asBoolean(
      row.public_show_provisional_data ?? row.publicShowProvisionalData,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicShowProvisionalData,
    ),
    publicPopupAutoOpen: asBoolean(
      row.public_popup_auto_open ?? row.publicPopupAutoOpen,
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicPopupAutoOpen,
    ),
    publicPopupFrequency: [
      "every_access",
      "once_per_session",
      "once_per_day",
      "once_per_month",
      "on_update",
      "disabled",
    ].includes(popup)
      ? (popup as PublicPopupFrequency)
      : DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicPopupFrequency,
    publicHeadline:
      asText(row.public_headline ?? row.publicHeadline) ||
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicHeadline,
    publicMessage:
      asText(row.public_message ?? row.publicMessage) ||
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.publicMessage,
    googleSheetsUrl: asText(
      row.google_sheets_url ?? row.googleSheetsUrl,
    ),
    googleSheetsTab: asText(
      row.google_sheets_tab ?? row.googleSheetsTab,
    ),
    googleSheetsLastSyncAt:
      asText(row.google_sheets_last_sync_at ?? row.googleSheetsLastSyncAt) ||
      null,
    ocrProvider:
      asText(row.ocr_provider ?? row.ocrProvider) ||
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.ocrProvider,
    receptionContactName:
      asText(row.reception_contact_name ?? row.receptionContactName) ||
      DEFAULT_CORRENTE_FINANCIAL_SETTINGS.receptionContactName,
    receptionWhatsapp: asText(
      row.reception_whatsapp ?? row.receptionWhatsapp,
    ).replace(/\D/g, ""),
    contributionNotificationEmails:
      normalizeStringList(
        row.contribution_notification_emails ??
          row.contributionNotificationEmails,
      ).length > 0
        ? normalizeStringList(
            row.contribution_notification_emails ??
              row.contributionNotificationEmails,
          )
        : DEFAULT_CORRENTE_FINANCIAL_SETTINGS.contributionNotificationEmails,
  };
}

export function settingsToDatabase(
  settings: CorrenteFinancialSettings,
): Record<string, unknown> {
  return {
    default_monthly_amount: settings.defaultMonthlyAmount,
    amount_is_mandatory: settings.amountIsMandatory,
    allow_custom_amount: settings.allowCustomAmount,
    allowed_due_days: settings.allowedDueDays,
    default_due_day: settings.defaultDueDay,
    reminder_days_before: settings.reminderDaysBefore,
    reminder_on_due_date: settings.reminderOnDueDate,
    reminder_channels: settings.reminderChannels,
    family_contributions_enabled: settings.familyContributionsEnabled,
    family_requires_member_confirmation:
      settings.familyRequiresMemberConfirmation,
    family_requires_financial_approval:
      settings.familyRequiresFinancialApproval,
    public_detail_level: settings.publicDetailLevel,
    public_show_last_12_months: settings.publicShowLast12Months,
    public_show_drilldown: settings.publicShowDrilldown,
    public_show_top_expenses: settings.publicShowTopExpenses,
    public_show_top_revenues: settings.publicShowTopRevenues,
    public_show_negative_results: settings.publicShowNegativeResults,
    public_show_accumulated_balance: settings.publicShowAccumulatedBalance,
    public_show_simulator: settings.publicShowSimulator,
    public_show_provisional_data: settings.publicShowProvisionalData,
    public_popup_auto_open: settings.publicPopupAutoOpen,
    public_popup_frequency: settings.publicPopupFrequency,
    public_headline: settings.publicHeadline,
    public_message: settings.publicMessage,
    google_sheets_url: settings.googleSheetsUrl || null,
    google_sheets_tab: settings.googleSheetsTab || null,
    ocr_provider: settings.ocrProvider,
    reception_contact_name: settings.receptionContactName || null,
    reception_whatsapp: settings.receptionWhatsapp || null,
    contribution_notification_emails:
      settings.contributionNotificationEmails,
    updated_at: new Date().toISOString(),
  };
}

export function currencyBR(value: unknown) {
  return asNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function monthKey(value: string | Date) {
  const date =
    value instanceof Date
      ? value
      : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    .replace(".", "");
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = {
    rascunho: "Rascunho",
    importado: "Importado",
    provisorio: "Provisório",
    em_revisao: "Em revisão",
    confirmado: "Confirmado",
    com_divergencia: "Com divergência",
    cancelado: "Cancelado",
    aberto: "Aberto",
    fechado: "Fechado",
    em_andamento: "Em andamento",
    finalizado: "Finalizado",
    reaberto: "Reaberto",
  };
  return labels[value] ?? value;
}

export function normalizeFinancialEmail(value: unknown) {
  const email = asText(value).toLowerCase();
  if (!email || !email.includes("@")) return "";
  if (email.endsWith("@organizacao-em-harmonia.local")) return "";
  if (email.endsWith(".local")) return "";
  return email;
}
