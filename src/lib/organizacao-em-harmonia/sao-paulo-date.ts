export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

function datePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
  };
}

export function dateIsoInTimeZone(date: Date, timeZone: string) {
  if (Number.isNaN(date.getTime())) return "";
  const parts = datePartsInTimeZone(date, timeZone);
  return parts.year && parts.month && parts.day
    ? `${parts.year}-${parts.month}-${parts.day}`
    : "";
}

export function saoPauloDateIso(date: Date = new Date()) {
  return dateIsoInTimeZone(date, SAO_PAULO_TIME_ZONE);
}

export function instantToSaoPauloDateIso(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return saoPauloDateIso(date);
}
