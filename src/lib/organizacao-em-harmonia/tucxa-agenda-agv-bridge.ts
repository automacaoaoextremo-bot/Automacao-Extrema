/** Adaptador somente de leitura da Agenda Viva original (agv_events).
 * Nao altera status/aprovacoes, nao grava no banco e nao expõe metadados privados.
 * Eventos desta origem sao editados SOMENTE no cadastro original.
 */
import { isRecurringWeekdayOccurrenceAllowed } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";
import type { CalendarEvent2027, Category2027 } from "@/lib/organizacao-em-harmonia/tucxa-agenda-2027";

export type OriginalAgendaEvent = {
  id: string; title: string; status: string; active: boolean | null;
  starts_at: string | null; ends_at: string | null; recurrence_rule: string | null;
  event_type: string | null; location: string | null; group_slug: string | null;
  metadata: Record<string, unknown> | null;
};
const WEEKDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function metadataText(data: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (typeof data[key] === "string" && String(data[key]).trim()) return String(data[key]).trim();
  return "";
}
function localParts(value: string | null): { date: string; time: string } | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}
function eventDateTime(metadataValue: string, databaseValue: string | null) {
  // O cadastro original guarda a data local explicitamente no metadata.
  // Utiliza-la evita deslocar eventos na virada do dia em Campinas.
  const match = metadataValue.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d\d:\d\d))?/);
  return match ? { date: match[1], time: match[2] ?? "" } : localParts(databaseValue);
}
function categoryFor(event: OriginalAgendaEvent): Category2027 {
  const m = event.metadata ?? {};
  const combined = norm([event.title, event.event_type ?? "", event.group_slug ?? "", metadataText(m,"eventClassification","classification"), metadataText(m,"eventCollection","event_collection")].join(" "));
  const classification = norm(metadataText(m,"eventClassification","classification","classificacao"));
  if (combined.includes("ferias") || combined.includes("recesso")) return "recesso";
  if (classification.includes("sementinha") || combined.includes("sementinha")) return "sementinha";
  if (combined.includes("grupo 1") || combined.includes("grupo-1")) return "grupo1";
  if (combined.includes("grupo 2") || combined.includes("grupo-2")) return "grupo2";
  if (combined.includes("tratamento")) return "tratamento";
  if (combined.includes("terca") || combined.includes("terça")) return "terca";
  if (combined.includes("segunda")) return "segunda";
  if (classification.includes("estudo") || combined.includes("curso") || combined.includes("palestra")) return "estudo";
  if (combined.includes("mutirao") || combined.includes("reuniao")) return "institucional";
  return "evento";
}
function occurrenceDates(event: OriginalAgendaEvent, year: number): string[] {
  const m = event.metadata ?? {};
  const start = eventDateTime(metadataText(m,"localStart","local_start","localStartsAt"), event.starts_at);
  const end = eventDateTime(metadataText(m,"localEnd","local_end","localEndsAt"), event.ends_at);
  if (!start) return [];
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  const rule = (event.recurrence_rule ?? "").toUpperCase();
  const recurring = Boolean(rule) || m.recurring === true;
  if (!recurring) return start.date >= first && start.date <= last ? [start.date] : [];
  const startBound = start.date > first ? start.date : first;
  const endBound = end?.date && end.date < last ? end.date : last;
  if (endBound < startBound) return [];
  const byday = (rule.match(/BYDAY=([^;]+)/)?.[1] ?? "").split(",").map((item) => item.replace(/^[+\-]?\d+/,"")).filter(Boolean);
  const startDay = new Date(`${start.date}T12:00:00Z`).getUTCDay();
  const weekdays = byday.map((code) => WEEKDAY[code]).filter((d): d is number => d !== undefined);
  const days = weekdays.length ? weekdays : [startDay];
  const frequency = rule.includes("FREQ=MONTHLY") ? "monthly" : rule.includes("FREQ=DAILY") ? "daily" : "weekly";
  const interval = Math.max(1, Number(rule.match(/INTERVAL=(\d+)/)?.[1] ?? 1));
  const positions = (rule.match(/BYSETPOS=([^;]+)/)?.[1] ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n !== 0);
  const anchor = Date.parse(`${start.date}T12:00:00Z`);
  const dates: string[] = [];
  for (let month = 1; month <= 12; month++) {
    const numberDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const matches: string[] = [];
    for (let day = 1; day <= numberDays; day++) {
      const dayIso = iso(year,month,day);
      if (dayIso < startBound || dayIso > endBound) continue;
      const weekday = new Date(`${dayIso}T12:00:00Z`).getUTCDay();
      if (!days.includes(weekday)) continue;
      const diffDays = Math.round((Date.parse(`${dayIso}T12:00:00Z`) - anchor) / 86400000);
      if (frequency === "weekly" && Math.floor(diffDays / 7) % interval !== 0) continue;
      if (frequency === "daily" && diffDays % interval !== 0) continue;
      if (frequency === "monthly") {
        const firstMonth = Number(start.date.slice(0,4)) * 12 + Number(start.date.slice(5,7));
        if ((year * 12 + month - firstMonth) % interval !== 0) continue;
      }
      if (!isRecurringWeekdayOccurrenceAllowed(m,dayIso)) continue;
      matches.push(dayIso);
    }
    if (frequency === "monthly" && positions.length) {
      for (const position of positions) {
        const match = position > 0 ? matches[position - 1] : matches[matches.length + position];
        if (match) dates.push(match);
      }
    } else if (frequency === "monthly" && !positions.length) {
      // Sem BYSETPOS, nao projetar todas as semanas do mes.
      // O cadastro atual usa a primeira ocorrencia do dia da semana.
      if (matches[0]) dates.push(matches[0]);
    } else dates.push(...matches);
  }
  return [...new Set(dates)];
}
export function projectOriginalEvents(events: OriginalAgendaEvent[], year: number): CalendarEvent2027[] {
  const result: CalendarEvent2027[] = [];
  for (const event of events) {
    if (event.status !== "aprovado" || event.active === false) continue;
    const metadata = event.metadata ?? {};
    const audience = metadataText(metadata,"audience","publico","targetAudience") || "todos";
    if (audience === "diretoria" || metadata.is_public === false || metadata.isPublic === false) continue;
    const start = eventDateTime(metadataText(metadata,"localStart","local_start"),event.starts_at);
    const end = eventDateTime(metadataText(metadata,"localEnd","local_end"),event.ends_at);
    if (!start) continue;
    const category = categoryFor(event);
    // Intervalos de ferias nao recorrentes aparecem como uma faixa continua.
    const range = !event.recurrence_rule && metadata.recurring !== true && end && end.date > start.date && category === "recesso";
    const dates = occurrenceDates(event, year);
    for (const date of dates) {
      result.push({
        id: `agv:${event.id}:${date}`, origin: "agenda-viva", source_event_id: event.id,
        title: event.title, description: null, event_date: date,
        end_date: range ? end.date : null, starts_time: start.time || null,
        ends_time: event.recurrence_rule ? null : (end?.time || null), category, audience,
        location: event.location || metadataText(metadata,"locationLabel","location_name") || "TUCXA",
        status: "aprovado", is_public: true,
      });
    }
  }
  // A Agenda Viva original oculta trabalhos recorrentes durante ferias
  // aprovadas, exceto os marcados explicitamente como mantidos nas ferias.
  const recesses = result.filter((item) => item.category === "recesso")
    .map((item) => [item.event_date, item.end_date ?? item.event_date]);
  const sourceById = new Map(events.map((event) => [event.id, event]));
  return result.filter((item) => {
    if (item.category === "recesso" || !item.source_event_id) return true;
    const original = sourceById.get(item.source_event_id);
    if (!original?.recurrence_rule) return true;
    const meta = original.metadata ?? {};
    if (meta.continuesDuringVacation === true || meta.continues_during_vacation === true || meta.keepDuringVacation === true) return true;
    return !recesses.some(([start, end]) => item.event_date >= start && item.event_date <= end);
  });
}
