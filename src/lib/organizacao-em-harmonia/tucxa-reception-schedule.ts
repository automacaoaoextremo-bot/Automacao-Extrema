/** Escala prevista da Recepção: ocorrências 1 a 4 de segunda e terça. */
export type ReceptionSchedule = { monday: number[]; tuesday: number[] };
export const EMPTY_RECEPTION_SCHEDULE: ReceptionSchedule = { monday: [], tuesday: [] };

export function normalizeReceptionSchedule(value: unknown): ReceptionSchedule {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const normalize = (days: unknown): number[] => Array.isArray(days)
    ? [...new Set(days.filter((day): day is number => Number.isInteger(day) && day >= 1 && day <= 4))].sort((a,b) => a-b)
    : [];
  return { monday: normalize(item.monday), tuesday: normalize(item.tuesday) };
}

export function receptionScheduleIsValid(value: unknown): value is ReceptionSchedule {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (!Array.isArray(item.monday) || !Array.isArray(item.tuesday)) return false;
  return [...item.monday, ...item.tuesday].length > 0 &&
    [...item.monday, ...item.tuesday].every((day) => typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 4);
}

export function hasReceptionFunction(slugs: string[]): boolean {
  return slugs.some((slug) => slug.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("recepcao"));
}

/** Verifica a escala PREVISTA para a data, sem afirmar presença física. */
export function receptionScheduledForDate(value: unknown, isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) return false;
  const weekday = date.getUTCDay();
  if (weekday !== 1 && weekday !== 2) return false;
  const occurrence = Math.floor((date.getUTCDate() - 1) / 7) + 1;
  if (occurrence > 4) return false;
  const schedule = normalizeReceptionSchedule(value);
  return (weekday === 1 ? schedule.monday : schedule.tuesday).includes(occurrence);
}
