/**
 * Regras de funcionamento da Agenda Viva para agendamentos do TUCXA.
 * A escala das Entidades continua necessária; o calendário pode bloquear datas.
 * A partir de 2027, o calendário do ano precisa estar efetivamente cadastrado.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isRecurringWeekdayOccurrenceAllowed } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";

type CalendarEvent = {
  title: string | null;
  event_type: string | null;
  group_slug: string | null;
  starts_at: string | null;
  ends_at: string | null;
  recurrence_rule: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
};

function normalize(value: unknown): string {
  return (typeof value === "string" ? value : "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function civilDate(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value.slice(0, 10);
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const p = formatter.formatToParts(instant);
  const part = (kind: string) => p.find((item) => item.type === kind)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function range(event: CalendarEvent): { from: string; to: string } {
  const meta = event.metadata || {};
  const localStart = typeof meta.localStart === "string" ? meta.localStart : typeof meta.local_start === "string" ? meta.local_start : null;
  const localEnd = typeof meta.localEnd === "string" ? meta.localEnd : typeof meta.local_end === "string" ? meta.local_end : null;
  const from = localStart?.slice(0, 10) || civilDate(event.starts_at);
  const to = localEnd?.slice(0, 10) || civilDate(event.ends_at) || from;
  return { from, to };
}
function activeEvent(e: CalendarEvent): boolean {
  return ["aprovado", "publicado", "published"].includes(normalize(e.status));
}
function vacation(e: CalendarEvent): boolean {
  const label = normalize(`${e.title || ""} ${e.event_type || ""} ${e.group_slug || ""} ${e.metadata?.specialEventType || ""}`);
  return /ferias|recesso|centro fechado|sem atendimento/.test(label);
}
function attendance(e: CalendarEvent): boolean {
  const label = normalize(`${e.title || ""} ${e.event_type || ""} ${e.group_slug || ""}`);
  return /atendimento.*(filhos? de fora|consulentes?|segunda|terca)|atendimento-(segunda|terca)/.test(label);
}
function serviceDate(e: CalendarEvent, day: string): boolean {
  const { from, to } = range(e);
  if (!from || day < from || from.slice(0, 4) !== day.slice(0, 4)) return false;
  const recur = normalize(e.recurrence_rule);
  // Quando ends_at representa apenas o fim da primeira sessão (mesmo dia),
  // não o interpretar como fim de toda a recorrência semanal.
  const durationDays = Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
  if (day > to && (!recur || durationDays > 2)) return false;
  const until = recur.match(/until=(\d{4})(\d{2})(\d{2})/);
  if (until && day > `${until[1]}-${until[2]}-${until[3]}`) return false;
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (!recur) return from === day;
  if (recur.includes("byday=mo") && dow !== 1 && !recur.includes("tu")) return false;
  if (recur.includes("byday=tu") && dow !== 2 && !recur.includes("mo")) return false;
  if (!isRecurringWeekdayOccurrenceAllowed(e.metadata, day)) return false;
  return true;
}

export async function loadTucxaCalendarEvents(organizationId: string, until: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabaseAdmin.from("agv_events")
    .select("title,event_type,group_slug,starts_at,ends_at,recurrence_rule,status,metadata")
    .eq("organization_id", organizationId).eq("active", true)
    .lte("starts_at", `${until}T23:59:59-03:00`).limit(2000);
  if (error) throw error; // falha fechada, não liberar agendamentos sem validar calendário
  if ((data || []).length === 2000) throw new Error("Calendário TUCXA excedeu limite de consulta; revisar paginação.");
  return (data || []) as CalendarEvent[];
}

export function tucxaCalendarPermitsDate(day: string, events: ReadonlyArray<CalendarEvent>): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const year = Number(day.slice(0, 4));
  // Garantia de 2026 conforme calendário anual publicado pelo TUCXA.
  // Eventos cadastrados de férias/recesso têm prioridade sobre qualquer escala.
  if (year === 2026 && (day <= "2026-01-28" || (day >= "2026-07-01" && day <= "2026-07-29") || day >= "2026-12-21")) return false;
  const approved = events.filter(activeEvent);
  if (approved.some((event) => {
    if (!vacation(event)) return false;
    const { from, to } = range(event);
    return Boolean(from && day >= from && day <= to);
  })) return false;
  if (year <= 2026) return true;
  // Não extrapolar automaticamente a programação de 2026 para 2027 e seguintes.
  return approved.some((event) => attendance(event) && serviceDate(event, day));
}

export async function isTucxaCalendarDateOpen(organizationId: string, date: string): Promise<boolean> {
  const events = await loadTucxaCalendarEvents(organizationId, date);
  return tucxaCalendarPermitsDate(date, events);
}
