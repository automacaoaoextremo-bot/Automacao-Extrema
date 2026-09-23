export const CAIXA_CLARO_BASE = "/solucoes/caixa-claro";
export const CAIXA_CLARO_LOGIN = `${CAIXA_CLARO_BASE}/login`;
export const CAIXA_CLARO_SILVAMATTANO = `${CAIXA_CLARO_BASE}/silvamattano`;

export type CaixaClaroRole = "owner" | "admin" | "member";
export type TransactionKind = "income" | "expense" | "transfer" | "uncategorized";
export type PlannedDirection = "income" | "expense";
export type IncomeStatus = "expected" | "received" | "partial" | "canceled";
export type ReconciliationMethod =
  | "direct_credit"
  | "pix_bridge"
  | "source_bank_credit"
  | "manual"
  | "split"
  | "combined";

export type FamilyMember = {
  id: string;
  family_id: string;
  auth_user_id: string | null;
  full_name: string;
  display_name: string | null;
  email: string | null;
  role: CaixaClaroRole;
  active: boolean;
};

export type FamilyAccount = {
  id: string;
  family_id: string;
  owner_member_id: string | null;
  institution: string;
  nickname: string;
  kind: "checking" | "savings" | "credit_card" | "investment" | "wallet" | "other";
  current_balance_cents: number;
  include_in_cash: boolean;
  active: boolean;
};

export type CaixaTransaction = {
  id: string;
  family_id: string;
  account_id: string;
  member_id: string | null;
  occurred_at: string;
  category_raw: string | null;
  transaction_raw: string | null;
  description: string;
  amount_cents: number;
  kind: TransactionKind;
  external_hash: string;
  notes: string | null;
};

export type IncomeEvent = {
  id: string;
  family_id: string;
  member_id: string;
  source_name: string;
  source_type: "salary" | "inss" | "benefit" | "freelance" | "other";
  competence_date: string;
  expected_date: string | null;
  net_cents: number;
  received_cents: number;
  status: IncomeStatus;
  notes: string | null;
};

export type PlannedItem = {
  id: string;
  family_id: string;
  member_id: string | null;
  title: string;
  direction: PlannedDirection;
  amount_cents: number;
  due_date: string;
  status: "planned" | "confirmed" | "paid" | "canceled";
  notes: string | null;
};

export type ReconciliationAllocation = {
  id: string;
  family_id: string;
  income_event_id: string;
  transaction_id: string;
  amount_cents: number;
  method: ReconciliationMethod;
  note: string | null;
  created_at: string;
};

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function localDate(value: string | Date) {
  if (value instanceof Date) return value;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12, 0, 0);
  }
  return new Date(value);
}

export function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = localDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

export function toCents(value: string | number | null | undefined) {
  if (typeof value === "number") return Math.round(value * 100);
  if (!value) return 0;
  const cleaned = String(value)
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function monthKey(value: string | Date) {
  const date = localDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
