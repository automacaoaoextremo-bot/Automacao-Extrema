function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addUtcDays(date: Date, days: number) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function easterSundayUtc(year: number) {
  // Algoritmo de Meeus/Jones/Butcher para o calendário gregoriano.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function nationalHolidaySet(year: number) {
  const fixed = [
    isoDate(year, 1, 1),
    isoDate(year, 4, 21),
    isoDate(year, 5, 1),
    isoDate(year, 9, 7),
    isoDate(year, 10, 12),
    isoDate(year, 11, 2),
    isoDate(year, 11, 15),
    isoDate(year, 11, 20),
    isoDate(year, 12, 25),
  ];

  const easter = easterSundayUtc(year);
  const movableOffsets = [-48, -47, -2, 60]; // carnaval seg/ter, sexta-feira santa e Corpus Christi.
  const movable = movableOffsets.map((offset) => {
    const value = addUtcDays(easter, offset);
    return isoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  });

  return new Set([...fixed, ...movable]);
}

export function isBrazilBusinessDay(value: Date) {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + 1;
  const day = value.getUTCDate();
  const weekday = value.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !nationalHolidaySet(year).has(isoDate(year, month, day));
}

export function lastBusinessDayOfMonth(monthValue: string) {
  const match = monthValue.match(/^(\d{4})-(\d{2})/);
  if (!match) throw new Error("Mês inválido.");

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) {
    throw new Error("Mês inválido.");
  }

  const cursor = new Date(Date.UTC(year, month, 0, 12));
  while (!isBrazilBusinessDay(cursor)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return isoDate(
    cursor.getUTCFullYear(),
    cursor.getUTCMonth() + 1,
    cursor.getUTCDate(),
  );
}

export function saoPauloTodayIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const pick = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function canFinalizeFinancialMonth(monthValue: string, now = new Date()) {
  return saoPauloTodayIso(now) > lastBusinessDayOfMonth(monthValue);
}
