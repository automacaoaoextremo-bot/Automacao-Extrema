export const ALL_MONTH_OCCURRENCES = [1, 2, 3, 4, 5] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asOccurrence(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

export function normalizeAllowedMonthOccurrences(value: unknown): number[] {
  const source = Array.isArray(value) ? value : [];
  const normalized = source
    .map(asOccurrence)
    .filter((item): item is number => item !== null);

  return normalized.length > 0
    ? [...new Set(normalized)].sort((left, right) => left - right)
    : [...ALL_MONTH_OCCURRENCES];
}

export function allowedMonthOccurrencesFromMetadata(metadataValue: unknown): number[] {
  const metadata = asRecord(metadataValue);
  const raw = metadata.allowedMonthOccurrences
    ?? metadata.allowed_month_occurrences
    ?? metadata.monthOccurrences
    ?? metadata.month_occurrences;

  return normalizeAllowedMonthOccurrences(raw);
}

export function monthOccurrenceIndex(isoDate: string): number {
  const day = Number(isoDate.slice(8, 10));
  if (!Number.isInteger(day) || day < 1 || day > 31) return 0;
  return Math.floor((day - 1) / 7) + 1;
}

export function isMonthOccurrenceAllowed(metadataValue: unknown, isoDate: string): boolean {
  const occurrence = monthOccurrenceIndex(isoDate);
  if (occurrence < 1) return false;
  return allowedMonthOccurrencesFromMetadata(metadataValue).includes(occurrence);
}

export function monthOccurrencesLabel(value: unknown): string {
  const occurrences = normalizeAllowedMonthOccurrences(value);
  if (occurrences.length === ALL_MONTH_OCCURRENCES.length) return "Todas as ocorrências do mês";
  return occurrences.map((item) => `${item}ª`).join(", ");
}
