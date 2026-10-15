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
