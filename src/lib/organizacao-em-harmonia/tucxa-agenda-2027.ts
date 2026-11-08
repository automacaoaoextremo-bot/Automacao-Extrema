export const TUCXA_2027_YEAR = 2027;
export const TUCXA_2027_BASE = "/solucoes/organizacao-em-harmonia/tucxa/agenda-viva/2027";
export const TUCXA_2027_API = "/api/organizacao-em-harmonia/tucxa/agenda-2027";

export const EVENT_CATEGORIES_2027 = [
  { key: "segunda", label: "Atendimento · Segunda", color: "#e3a2a6", text: "#54222e" },
  { key: "terca", label: "Atendimento · Terça", color: "#abd0ec", text: "#12384b" },
  { key: "tratamento", label: "Tratamento espiritual", color: "#c6e3be", text: "#274b2c" },
  { key: "grupo1", label: "Filhos da Corrente · Grupo 1", color: "#649c70", text: "#ffffff" },
  { key: "grupo2", label: "Filhos da Corrente · Grupo 2", color: "#348ec0", text: "#ffffff" },
  { key: "sementinha", label: "Sementinha", color: "#bd8bd2", text: "#381c47" },
  { key: "evento", label: "Eventos e confraternizações", color: "#e7b16f", text: "#573718" },
  { key: "estudo", label: "Cursos e estudos", color: "#71c7ba", text: "#103d36" },
  { key: "institucional", label: "Reuniões e mutirões", color: "#bccbd9", text: "#263547" },
  { key: "recesso", label: "Férias / recesso", color: "#f7e2a8", text: "#594410" },
] as const;

export type Category2027 = (typeof EVENT_CATEGORIES_2027)[number]["key"];
export type Status2027 = "rascunho" | "pendente" | "aprovado" | "rejeitado" | "ajustes_solicitados";

export type CalendarEvent2027 = {
  id: string;
  /** Origem do registro: cadastro original ou calendario multianual. */
  origin?: "agenda-viva" | "calendario";
  /** ID do evento original em agv_events (quando aplicavel). */
  source_event_id?: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  starts_time: string | null;
  ends_time: string | null;
  category: Category2027;
  audience: string;
  location: string;
  status: Status2027;
  is_public: boolean;
  proposer_name?: string | null;
  proposer_phone?: string | null;
  proposer_email?: string | null;
  review_notes?: string | null;
  source_key?: string | null;
  source_date_2026?: string | null;
};

/** Novas datas de 2027 ate 2100; preserva os dados existentes de 2027. */
export const MIN_AGENDA_YEAR = 2027;
export const MAX_AGENDA_YEAR = 2100;
export function validAgendaYear(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_AGENDA_YEAR && value <= MAX_AGENDA_YEAR;
}
export function validateAgendaDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (!validAgendaYear(Number(value.slice(0, 4)))) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeMobile2027(value: string): string {
  const digits = value.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") && digits.length === 13 ? digits : `55${digits}`;
  return /^55[1-9][0-9]9[0-9]{8}$/.test(withCountry) ? withCountry : "";
}

export function calendarCategory2027(key: string) {
  return EVENT_CATEGORIES_2027.find((item) => item.key === key) ?? EVENT_CATEGORIES_2027[8];
}

export function prettyDate2027(date: string) {
  const [yyyy, mm, dd] = date.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

export function eventHappensOn2027(event: CalendarEvent2027, day: string) {
  return event.event_date <= day && (event.end_date ?? event.event_date) >= day;
}

/** Alias para compatibilidade com consumidores anteriores. */
export const validateIso2027 = validateAgendaDate;
