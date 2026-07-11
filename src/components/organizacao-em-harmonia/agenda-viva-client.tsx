
"use client";

import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Mode = "overview" | "eventos" | "aprovacoes" | "calendario" | "configuracoes";

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  active: boolean;
};

type EventType = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  requires_approval: boolean;
  active: boolean;
  sort_order: number;
};

type Location = {
  id: string;
  name: string;
  location_type: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
  is_primary: boolean;
};

type AgendaEvent = {
  id: string;
  title: string;
  event_type: string;
  event_type_id: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  recurrence_rule: string | null;
  location_id?: string | null;
  location: string | null;
  group_slug: string | null;
  responsible_person_id: string | null;
  created_by_person_id: string | null;
  approved_by_person_id: string | null;
  approved_at: string | null;
  requires_approval: boolean;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type SpiritualEntity = {
  id: string;
  name: string;
  slug: string;
  line: string | null;
  entity_type: string | null;
  usual_days: string[] | null;
  daily_capacity?: number | null;
  appointment_enabled?: boolean | null;
  appointment_notes?: string | null;
  active: boolean;
};

type AgendaSettings = {
  maxRecurringAppointmentsPerConsulente: number;
  autoCancelRecurringOnAbsence: boolean;
  wednesdayBookingMode: string;
  wednesdayAuthorizedPersonIds: string[];
  requireRecommendingEntityForWednesday: boolean;
  appointmentReturnGuidance: string;
  accessValidationReviewerEmails: string;
  accessValidationReviewerPersonIds: string[];
  accessSimulationPersonIds: string[];
  accessCopyEmail: string;
};

type Payload = {
  organization: { id: string; name: string; slug: string | null } | null;
  people: Person[];
  eventTypes: EventType[];
  events: AgendaEvent[];
  locations: Location[];
  entities?: SpiritualEntity[];
  agendaSettings?: Partial<AgendaSettings>;
};

type FormState = {
  eventId: string;
  title: string;
  eventTypeId: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  isRecurring: boolean;
  recurrenceFrequency: string;
  recurrenceWeekday: string;
  locationId: string;
  location: string;
  audience: string;
  eventClassification: string;
  groupSlug: string;
  responsiblePersonId: string;
  notes: string;
  imageUrl: string;
  imageAlt: string;
  imageEmoji: string;
  highlightVisual: boolean;
  firstAccessEnabled: boolean;
  firstAccessOrder: string;
  firstAccessSummary: string;
  requiresApproval: boolean;
};

const defaultAgendaSettings: AgendaSettings = {
  maxRecurringAppointmentsPerConsulente: 2,
  autoCancelRecurringOnAbsence: true,
  wednesdayBookingMode: "coordination",
  wednesdayAuthorizedPersonIds: [],
  requireRecommendingEntityForWednesday: true,
  appointmentReturnGuidance:
    "Após o primeiro atendimento com uma entidade, se houver orientação de retorno, procure voltar com a mesma entidade para preservar a continuidade do cuidado.",
  accessValidationReviewerEmails: "",
  accessValidationReviewerPersonIds: [],
  accessSimulationPersonIds: [],
  accessCopyEmail: "automacao.ao.extremo@gmail.com",
};

function normalizeAgendaSettings(value: Payload["agendaSettings"]): AgendaSettings {
  return {
    ...defaultAgendaSettings,
    ...(value ?? {}),
    maxRecurringAppointmentsPerConsulente: Number(value?.maxRecurringAppointmentsPerConsulente ?? defaultAgendaSettings.maxRecurringAppointmentsPerConsulente),
    wednesdayAuthorizedPersonIds: Array.isArray(value?.wednesdayAuthorizedPersonIds) ? value.wednesdayAuthorizedPersonIds : [],
    accessValidationReviewerEmails: typeof value?.accessValidationReviewerEmails === "string" ? value.accessValidationReviewerEmails : defaultAgendaSettings.accessValidationReviewerEmails,
    accessValidationReviewerPersonIds: Array.isArray(value?.accessValidationReviewerPersonIds) ? value.accessValidationReviewerPersonIds : [],
    accessSimulationPersonIds: Array.isArray(value?.accessSimulationPersonIds) ? value.accessSimulationPersonIds : [],
    accessCopyEmail: typeof value?.accessCopyEmail === "string" && value.accessCopyEmail.trim() ? value.accessCopyEmail : defaultAgendaSettings.accessCopyEmail,
  };
}

const emptyForm: FormState = {
  eventId: "",
  title: "",
  eventTypeId: "",
  startsAt: "",
  endsAt: "",
  allDay: false,
  isRecurring: false,
  recurrenceFrequency: "semanal",
  recurrenceWeekday: "",
  locationId: "",
  location: "",
  audience: "filhos-corrente",
  eventClassification: "umbanda",
  groupSlug: "",
  responsiblePersonId: "",
  notes: "",
  imageUrl: "",
  imageAlt: "",
  imageEmoji: "",
  highlightVisual: true,
  firstAccessEnabled: true,
  firstAccessOrder: "",
  firstAccessSummary: "",
  requiresApproval: true,
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  recorrente: "Recorrente",
  pendente_aprovacao: "Pendente de aprovação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  ajuste_solicitado: "Ajuste solicitado",
  ativo: "Ativo",
  publicado: "Publicado",
};

const agendaLinks = [
  {
    label: "Eventos",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/eventos",
    description: "Cadastre eventos, recorrências, público, localidade e ordem do Primeiro Acesso.",
  },
  {
    label: "Aprovações",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/aprovacoes",
    description: "Aprove, reprove ou solicite ajustes antes da publicação no calendário.",
  },
  {
    label: "Calendário",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/calendario",
    description: "Visualize eventos concluídos, futuros, por período, por evento, pessoa ou público.",
  },
  {
    label: "Configurações",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/configuracoes",
    description: "Regras de recorrência, ausências, quarta-feira e orientação de retorno.",
  },
];

const eventColorClasses: Record<string, string> = {
  bazar: "bg-lime-100 text-lime-950 ring-lime-200",
  "bazar-simples": "bg-purple-100 text-purple-950 ring-purple-200",
  "acao-comunidade": "bg-yellow-100 text-yellow-950 ring-yellow-200",
  bingo: "bg-lime-200 text-lime-950 ring-lime-300",
  feijoada: "bg-red-100 text-red-950 ring-red-200",
  "festa-junina": "bg-orange-100 text-orange-950 ring-orange-200",
  caminhada: "bg-emerald-100 text-emerald-950 ring-emerald-200",
  "grupo-estudos": "bg-yellow-100 text-yellow-950 ring-yellow-200",
  "dia-filme": "bg-rose-100 text-rose-950 ring-rose-200",
  "mostra-cultural": "bg-orange-100 text-orange-950 ring-orange-200",
  "clube-livro": "bg-amber-100 text-amber-950 ring-amber-200",
  "grupo-1": "bg-green-100 text-green-950 ring-green-200",
  "grupo-2": "bg-sky-100 text-sky-950 ring-sky-200",
  "grupo-segunda-feira": "bg-rose-100 text-rose-950 ring-rose-200",
  "grupo-terca-feira": "bg-sky-100 text-sky-950 ring-sky-200",
  "tratamento-espiritual-transformacao": "bg-emerald-100 text-emerald-950 ring-emerald-200",
};

function dateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  return formatLocalDateTime(value);
}

function dayKey(value: string | null) {
  const local = parseLocalDateTime(value ?? "");
  if (local) return `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" });
  const month = date.toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", month: "2-digit" });
  const day = date.toLocaleString("en-CA", { timeZone: "America/Sao_Paulo", day: "2-digit" });
  return `${year}-${month}-${day}`;
}

function localDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; key: string }> = [];
  for (let index = 0; index < first.getDay(); index += 1) cells.push({ day: null, key: `empty-${index}` });
  for (let day = 1; day <= totalDays; day += 1) cells.push({ day, key: localDate(year, month, day) });
  while (cells.length % 7 !== 0) cells.push({ day: null, key: `tail-${cells.length}` });
  return cells;
}

function weekdayFromCode(value: string) {
  const days: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  return days[value.toUpperCase()] ?? null;
}

function ruleWeekday(rule: string | null) {
  if (!rule) return null;
  const match = rule.toUpperCase().match(/BYDAY=([^;]+)/);
  const value = match?.[1]?.split(",")[0] ?? "";
  return weekdayFromCode(value);
}

function ruleSetPositions(rule: string | null) {
  if (!rule) return [];
  const match = rule.toUpperCase().match(/BYSETPOS=([^;]+)/);
  return (match?.[1] ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item !== 0);
}

function dateForNthWeekday(year: number, month: number, weekday: number, position: number) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const matches: number[] = [];
  for (let day = 1; day <= totalDays; day += 1) {
    if (new Date(year, month, day).getDay() === weekday) matches.push(day);
  }
  const selected = position < 0 ? matches[matches.length + position] : matches[position - 1];
  return selected ? localDate(year, month, selected) : "";
}

function weekdayFromStart(event: AgendaEvent) {
  const start = toComparableDate(eventLocalStart(event));
  return start ? start.getDay() : null;
}

function isInEventRange(event: AgendaEvent, key: string) {
  const date = new Date(`${key}T12:00:00`);
  const start = toComparableDate(eventLocalStart(event));
  const end = toComparableDate(eventLocalEnd(event));
  if (start && date < new Date(start.getFullYear(), start.getMonth(), start.getDate())) return false;
  if (end && date > new Date(end.getFullYear(), end.getMonth(), end.getDate())) return false;
  return true;
}

function occurrenceKeysForYear(event: AgendaEvent, year: number) {
  const rule = event.recurrence_rule?.toUpperCase() ?? "";
  const recurring = Boolean(event.recurrence_rule) || metadataBoolean(event, "recurring");
  const firstKey = dayKey(eventLocalStart(event));
  if (!recurring) return firstKey ? [firstKey] : [];

  const weekday = ruleWeekday(rule) ?? weekdayFromStart(event);
  if (weekday === null) return firstKey ? [firstKey] : [];

  const keys: string[] = [];
  if (rule.includes("FREQ=MONTHLY")) {
    const positions = ruleSetPositions(rule);
    for (let month = 0; month < 12; month += 1) {
      const monthKeys = positions.length ? positions.map((position) => dateForNthWeekday(year, month, weekday, position)) : [dateForNthWeekday(year, month, weekday, 1)];
      for (const key of monthKeys) if (key && isInEventRange(event, key)) keys.push(key);
    }
    return keys;
  }

  const interval = rule.includes("INTERVAL=2") ? 14 : 7;
  const start = toComparableDate(eventLocalStart(event)) ?? new Date(year, 0, 1);
  let cursor = new Date(Math.max(start.getTime(), new Date(year, 0, 1).getTime()));
  while (cursor.getDay() !== weekday) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  while (cursor.getFullYear() === year) {
    const key = localDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (isInEventRange(event, key)) keys.push(key);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + interval);
  }
  return keys;
}

function metadataText(event: AgendaEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function metadataBoolean(event: AgendaEvent, key: string) {
  const value = event.metadata?.[key];
  return value === true || value === "true" || value === 1 || value === "1";
}

function metadataAnyText(event: AgendaEvent, keys: string[]) {
  for (const key of keys) {
    const value = event.metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseLocalDateTime(value: string | null | undefined) {
  if (!value) return null;
  const text = value.trim();
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) return null;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour = "00", minute = "00"] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

function toComparableDate(value: string | null | undefined) {
  const local = parseLocalDateTime(value ?? "");
  if (local) return new Date(local.year, local.month - 1, local.day, local.hour, local.minute);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalDateTime(value: string | null | undefined) {
  const local = parseLocalDateTime(value ?? "");
  if (local) {
    return `${String(local.day).padStart(2, "0")}/${String(local.month).padStart(2, "0")}/${local.year}, ${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
  }
  if (!value) return "Data a definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data a definir";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

function formatLocalTime(value: string | null | undefined) {
  const local = parseLocalDateTime(value ?? "");
  if (local) return local.minute === 0 ? `${local.hour}h` : `${local.hour}h${String(local.minute).padStart(2, "0")}`;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).split(":");
  const hour = Number(parts[0]);
  const minute = parts[1] ?? "00";
  return minute === "00" ? `${hour}h` : `${hour}h${minute}`;
}

function eventLocalStart(event: AgendaEvent) {
  return metadataAnyText(event, ["localStart", "local_start", "localStartsAt", "startsAtLocal"]) || event.starts_at;
}

function eventLocalEnd(event: AgendaEvent) {
  return metadataAnyText(event, ["localEnd", "local_end", "localEndsAt", "endsAtLocal"]) || event.ends_at;
}

function metadataNumber(event: AgendaEvent, key: string) {
  const value = event.metadata?.[key];
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function metadataBooleanAny(event: AgendaEvent, keys: string[], fallback: boolean) {
  for (const key of keys) {
    if (event.metadata && Object.prototype.hasOwnProperty.call(event.metadata, key)) return metadataBoolean(event, key);
  }
  return fallback;
}

function firstAccessEnabledFor(event: AgendaEvent) {
  return metadataBooleanAny(event, ["firstAccessEnabled", "first_access_enabled", "showOnFirstAccess", "show_on_first_access"], true);
}

function firstAccessOrderFor(event: AgendaEvent) {
  return metadataNumber(event, "firstAccessOrder") ?? metadataNumber(event, "first_access_order") ?? Number.MAX_SAFE_INTEGER;
}

function eventAudience(event: AgendaEvent) {
  const metadata = event.metadata ?? {};
  const value = metadata.audience ?? metadata.publico ?? metadata.targetAudience;
  return typeof value === "string" && value.trim() ? value.trim() : "filhos-corrente";
}

function eventClassification(event: AgendaEvent) {
  const metadata = event.metadata ?? {};
  const value = metadata.eventClassification ?? metadata.event_classification ?? metadata.classification ?? metadata.classificacao;
  return typeof value === "string" && value.trim() ? value.trim() : "umbanda";
}

function eventClassificationLabel(value: string) {
  if (value === "outros") return "Outros";
  if (value === "sementinha") return "Sementinha";
  if (value === "estudos") return "Estudos";
  if (value === "social") return "Social / comunidade";
  return "Umbanda";
}

function audienceLabel(value: string) {
  if (value === "todos") return "Filhos da Corrente e Consulentes";
  if (value === "consulentes") return "Consulentes / Filhos de Fora";
  return "Somente Filhos da Corrente";
}


const weekdayLabels: Record<string, string> = {
  domingo: "Domingo",
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  terça: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  sábado: "Sábado",
};

function capitalizeLabel(value: string) {
  const text = value.trim();
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);
}

function weekdayLabel(value: string) {
  return weekdayLabels[value] ?? capitalizeLabel(value);
}

function normalizeHourText(value: string) {
  return value.replace(/\b0?(\d{1,2})h00\b/g, "$1h");
}

function formatFirstAccessDescription(recurrence: string, dateLabel: string, timeLabel: string, location: string) {
  const detailLine = [recurrence, dateLabel, timeLabel].filter(Boolean).join(" • ");
  return `${detailLine} Local: ${location}`;
}

function recurrenceWeekdayFromRule(rule: string | null) {
  if (!rule) return "";
  const match = rule.toUpperCase().match(/BYDAY=([^;]+)/);
  const day = match?.[1]?.split(",")[0] ?? "";
  const map: Record<string, string> = { SU: "domingo", MO: "segunda", TU: "terca", WE: "quarta", TH: "quinta", FR: "sexta", SA: "sabado" };
  return map[day] ?? "";
}

function recurrenceFrequencyFromRule(rule: string | null) {
  if (!rule) return "semanal";
  const normalized = rule.toUpperCase();
  if (normalized.includes("FREQ=MONTHLY")) return "mensal";
  if (normalized.includes("INTERVAL=2")) return "quinzenal";
  return "semanal";
}

function recurrenceDisplay(event: AgendaEvent) {
  if (!event.recurrence_rule && !metadataBoolean(event, "recurring")) return "Evento pontual";
  const explicit = metadataText(event, "recurrenceLabel") || metadataText(event, "periodicityLabel");
  if (explicit) return explicit;
  const frequency = metadataText(event, "recurrenceFrequency") || recurrenceFrequencyFromRule(event.recurrence_rule);
  if (frequency === "mensal") return "Recorrência mensal";
  if (frequency === "quinzenal") return "Recorrência quinzenal";
  return "Recorrência semanal";
}

function agendaDateLabel(event: AgendaEvent) {
  const explicit = metadataText(event, "dateLabel") || metadataText(event, "publicDateLabel");
  if (explicit) return capitalizeLabel(explicit);

  if (event.recurrence_rule || metadataBoolean(event, "recurring")) {
    const recurrenceWeekday = metadataText(event, "recurrenceWeekday") || metadataText(event, "recurrence_weekday") || recurrenceWeekdayFromRule(event.recurrence_rule);
    if (recurrenceWeekday) return weekdayLabel(recurrenceWeekday);
  }

  const start = eventLocalStart(event);
  const local = parseLocalDateTime(start);
  if (local) {
    return capitalizeLabel(new Date(local.year, local.month - 1, local.day).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }));
  }
  if (!start) return "Data a definir";
  return capitalizeLabel(new Date(start).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }));
}

function agendaTimeLabel(event: AgendaEvent) {
  const explicit = metadataText(event, "timeLabel") || metadataText(event, "publicTimeLabel");
  if (explicit) return normalizeHourText(explicit);
  if (metadataBoolean(event, "timeUndefined") || event.all_day) return event.all_day ? "Dia inteiro" : "Horário a definir";
  const start = formatLocalTime(eventLocalStart(event));
  const end = formatLocalTime(eventLocalEnd(event));
  if (start && end) return `${start} às ${end}`;
  if (start) return `A partir de ${start}`;
  return "Horário a definir";
}

function eventImageUrl(event: AgendaEvent) {
  return metadataText(event, "image_url");
}

function eventImageAlt(event: AgendaEvent) {
  return metadataText(event, "image_alt") || event.title;
}

function eventEmoji(event: AgendaEvent) {
  const emoji = metadataText(event, "image_emoji");
  if (emoji) return emoji;
  const key = `${event.event_type} ${event.group_slug ?? ""}`;
  if (key.includes("bazar")) return "🛍️";
  if (key.includes("caminhada")) return "🚶";
  if (key.includes("filme")) return "🎬";
  if (key.includes("livro")) return "📚";
  if (key.includes("cultural") || key.includes("mostra")) return "🎭";
  if (key.includes("estudo")) return "💡";
  return "📌";
}

function canStoreDataImage(dataUrl: string) {
  return dataUrl.length <= 900_000;
}

function eventTypeFor(event: AgendaEvent, types: EventType[]) {
  return types.find((item) => item.id === event.event_type_id) ?? null;
}

function colorFor(event: AgendaEvent, types: EventType[]) {
  const type = eventTypeFor(event, types);
  return eventColorClasses[type?.slug ?? event.event_type] ?? "bg-white text-[#00334E] ring-slate-200";
}

function publicStatusClass(status: string) {
  if (["aprovado", "ativo", "publicado", "recorrente"].includes(status)) return "bg-emerald-50 text-emerald-900 ring-emerald-100";
  if (status === "pendente_aprovacao") return "bg-amber-50 text-amber-900 ring-amber-100";
  if (status === "reprovado") return "bg-red-50 text-red-700 ring-red-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

function locationLabel(event: AgendaEvent, locations: Location[]) {
  const metadataLocation = metadataText(event, "location_name") || metadataText(event, "locationLabel") || metadataText(event, "localidade");
  const locationId = event.location_id || metadataText(event, "location_id");
  const location = locationId ? locations.find((item) => item.id === locationId) : null;
  if (location?.name) return location.name;
  return metadataLocation || event.location || "Local a definir";
}

function firstAccessDescriptionFor(event: AgendaEvent, locations: Location[]) {
  const location = locationLabel(event, locations);
  return formatFirstAccessDescription(recurrenceDisplay(event), agendaDateLabel(event), agendaTimeLabel(event), location);
}

function formatLocationAddress(location: Location) {
  return [location.address, location.number, location.complement, location.district, location.city, location.state].filter(Boolean).join(", ");
}

function getEventDateTime(event: AgendaEvent) {
  const start = eventLocalStart(event);
  const end = eventLocalEnd(event);
  return [formatDate(start), end ? `até ${formatDate(end)}` : "término a definir"].join(" ");
}

function sortedEvents(events: AgendaEvent[]) {
  return [...events].sort((left, right) => {
    const leftDate = left.starts_at ? new Date(left.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDate = right.starts_at ? new Date(right.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftDate !== rightDate) return leftDate - rightDate;
    return left.title.localeCompare(right.title, "pt-BR");
  });
}

function firstAccessSortedEvents(events: AgendaEvent[]) {
  return [...events]
    .filter((event) => firstAccessEnabledFor(event))
    .filter((event) => ["aprovado", "recorrente", "ativo", "publicado"].includes(event.status))
    .sort((left, right) => {
      const leftOrder = firstAccessOrderFor(left);
      const rightOrder = firstAccessOrderFor(right);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      const leftDate = left.starts_at ? new Date(left.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDate = right.starts_at ? new Date(right.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
      if (leftDate !== rightDate) return leftDate - rightDate;
      return left.title.localeCompare(right.title, "pt-BR");
    })
    .slice(0, 50);
}

function useAgendaVivaData(router: ReturnType<typeof useRouter>) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace("/solucoes/organizacao-em-harmonia/login");
      return;
    }

    const response = await fetch("/api/organizacao-em-harmonia/cliente/agenda-viva", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json()) as Payload & { error?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar Agenda Viva.");
    setPayload(result);
  }, [router]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar Agenda Viva.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  return { payload, setPayload, loading, error, setError };
}

function AgendaVivaSubnav({ active }: { active: Mode }) {
  const items = [
    { key: "overview", label: "Visão geral", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva" },
    { key: "eventos", label: "Eventos", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/eventos" },
    { key: "aprovacoes", label: "Aprovações", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/aprovacoes" },
    { key: "calendario", label: "Calendário", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/calendario" },
    { key: "configuracoes", label: "Configurações", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/configuracoes" },
  ];
  return (
    <nav className="mb-5 flex flex-wrap gap-2 rounded-[2rem] bg-white p-3 shadow ring-1 ring-slate-100">
      {items.map((item) => (
        <Link key={item.key} href={item.href} className={`rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${active === item.key ? "bg-[#06451F] text-white" : "bg-[#F4FBF7] text-[#06451F] ring-1 ring-slate-200"}`}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function LoadingAndMessages({ loading, error, message, approvalWhatsappUrl }: { loading: boolean; error: string; message: string; approvalWhatsappUrl: string }) {
  return (
    <>
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando Agenda Viva...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
      {approvalWhatsappUrl && <a href={approvalWhatsappUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] shadow">Enviar solicitação também pelo WhatsApp</a>}
    </>
  );
}

function AgendaEventForm({
  form,
  payload,
  saving,
  onCancel,
  onImageFile,
  onSave,
  update,
}: {
  form: FormState;
  payload: Payload;
  saving: boolean;
  onCancel: () => void;
  onImageFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const selectedLocation = form.locationId ? payload.locations.find((item) => item.id === form.locationId) : null;

  return (
    <form onSubmit={onSave} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-black text-[#00334E]">Nome da atividade/evento *</span>
          <input value={form.title} onChange={(event) => update("title", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: Grupo de Estudos, Bazar, Clube do Livro, Festa Junina" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Tipo de atividade</span>
          <select value={form.eventTypeId} onChange={(event) => update("eventTypeId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="">Selecionar tipo</option>
            {payload.eventTypes.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Público do evento</span>
          <select value={form.audience} onChange={(event) => update("audience", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="filhos-corrente">Somente Filhos da Corrente</option>
            <option value="consulentes">Consulentes / Filhos de Fora</option>
            <option value="todos">Filhos da Corrente e Consulentes</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Classificação do evento</span>
          <select value={form.eventClassification} onChange={(event) => update("eventClassification", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="umbanda">Umbanda</option>
            <option value="outros">Outros</option>
            <option value="sementinha">Sementinha</option>
            <option value="estudos">Estudos</option>
            <option value="social">Social / comunidade</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Responsável</span>
          <select value={form.responsiblePersonId} onChange={(event) => update("responsiblePersonId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="">A definir</option>
            {payload.people.filter((person) => person.active !== false).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Localidade cadastrada</span>
          <select value={form.locationId} onChange={(event) => update("locationId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="">A definir / informar manualmente</option>
            {payload.locations.filter((location) => location.active !== false).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          {selectedLocation && <span className="text-xs font-semibold text-slate-500">{formatLocationAddress(selectedLocation) || "Localidade cadastrada sem endereço completo."}</span>}
        </label>
        {!form.locationId && (
          <label className="grid gap-1">
            <span className="text-sm font-black text-[#00334E]">Local manual</span>
            <input value={form.location} onChange={(event) => update("location", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: online, salão, externo" />
          </label>
        )}
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Data e horário de início</span>
          <input type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Data e horário de término</span>
          <input type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
        </label>
        <label className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
          <input type="checkbox" checked={form.isRecurring} onChange={(event) => update("isRecurring", event.target.checked)} className="h-5 w-5" />
          <span className="text-sm font-black text-[#00334E]">Evento recorrente</span>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Periodicidade</span>
          <select value={form.recurrenceFrequency} onChange={(event) => update("recurrenceFrequency", event.target.value)} disabled={!form.isRecurring} className="rounded-2xl border border-slate-200 bg-white p-3 disabled:bg-slate-100 disabled:text-slate-400">
            <option value="semanal">Semanal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="mensal">Mensal</option>
            <option value="personalizada">Personalizada / conforme calendário</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Dia da recorrência</span>
          <select value={form.recurrenceWeekday} onChange={(event) => update("recurrenceWeekday", event.target.value)} disabled={!form.isRecurring} className="rounded-2xl border border-slate-200 bg-white p-3 disabled:bg-slate-100 disabled:text-slate-400">
            <option value="">Usar dia da data de início</option>
            <option value="domingo">Domingo</option>
            <option value="segunda">Segunda-feira</option>
            <option value="terca">Terça-feira</option>
            <option value="quarta">Quarta-feira</option>
            <option value="quinta">Quinta-feira</option>
            <option value="sexta">Sexta-feira</option>
            <option value="sabado">Sábado</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Grupo / categoria</span>
          <select value={form.groupSlug} onChange={(event) => update("groupSlug", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="">Não definido</option>
            <option value="evento">Evento</option>
            <option value="grupo-1">Grupo 1</option>
            <option value="grupo-2">Grupo 2</option>
            <option value="segunda">Segunda</option>
            <option value="terca">Terça</option>
            <option value="quarta">Quarta</option>
            <option value="ferias">Férias</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Emoji/ícone curto</span>
          <input value={form.imageEmoji} onChange={(event) => update("imageEmoji", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: 🎬, 📚, 🚶" maxLength={4} />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-black text-[#00334E]">Imagem do evento</span>
          <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100 md:grid-cols-[1fr_auto]">
            <input value={form.imageUrl.startsWith("data:") ? "Imagem anexada ao formulário" : form.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3" placeholder="Cole uma URL pública da imagem ou selecione um arquivo abaixo" disabled={form.imageUrl.startsWith("data:")} />
            <input type="file" accept="image/*" onChange={onImageFile} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm" />
            {form.imageUrl && (
              <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100 md:col-span-2 sm:flex-row sm:items-center">
                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-lime-50 ring-1 ring-lime-100"><Image src={form.imageUrl} alt={form.imageAlt || form.title || "Imagem do evento"} width={80} height={80} unoptimized className="h-full w-full object-cover" /></div>
                <div className="flex-1"><input value={form.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} className="w-full rounded-2xl border border-slate-200 p-3" placeholder="Texto alternativo / descrição da imagem" /><button type="button" onClick={() => update("imageUrl", "")} className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-[#00334E]">Remover imagem</button></div>
              </div>
            )}
          </div>
        </label>
        <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.allDay} onChange={(event) => update("allDay", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Dia inteiro</span></label>
        <label className="flex items-center gap-3 rounded-2xl bg-lime-50 p-4 ring-1 ring-lime-100"><input type="checkbox" checked={form.highlightVisual} onChange={(event) => update("highlightVisual", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Destacar no calendário visual</span></label>
        <label className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><input type="checkbox" checked={form.requiresApproval} onChange={(event) => update("requiresApproval", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Exige aprovação antes de publicar</span></label>
        <label className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 ring-1 ring-green-100"><input type="checkbox" checked={form.firstAccessEnabled} onChange={(event) => update("firstAccessEnabled", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Exibir no card Agenda do Primeiro Acesso</span></label>
        <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Ordem no Primeiro Acesso</span><input value={form.firstAccessOrder} onChange={(event) => update("firstAccessOrder", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: 10" inputMode="numeric" /></label>
        <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Texto resumido no Primeiro Acesso</span><textarea value={form.firstAccessSummary} onChange={(event) => update("firstAccessSummary", event.target.value)} className="min-h-20 rounded-2xl border border-slate-200 p-3" placeholder="Ex.: Última sexta-feira do mês • 19h às 20h30" /></label>
        <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Observações internas</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar</button>
        <button disabled={saving || !form.title.trim()} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Salvando..." : form.eventId ? "Atualizar evento" : "Cadastrar evento"}</button>
      </div>
    </form>
  );
}

function EventModal({ open, children, onClose, title }: { open: boolean; children: ReactNode; onClose: () => void; title: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-6 backdrop-blur-sm">
      <section className="w-full max-w-4xl rounded-[2rem] bg-white p-5 shadow-2xl ring-1 ring-white/40 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Agenda Viva</p><h2 className="mt-1 text-2xl font-black text-[#00334E]">{title}</h2></div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-[#00334E]">Fechar</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function EventCard({ event, payload, onEdit, onDelete, compact = false }: { event: AgendaEvent; payload: Payload; onEdit?: (event: AgendaEvent) => void; onDelete?: (eventId: string) => void; compact?: boolean }) {
  const type = eventTypeFor(event, payload.eventTypes);
  const location = locationLabel(event, payload.locations);
  return (
    <article className={`rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100 ${compact ? "" : "transition hover:-translate-y-0.5 hover:shadow-lg"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl leading-none">{eventEmoji(event)}</span>
            <h3 className="text-xl font-black text-[#00334E]">{event.title}</h3>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{getEventDateTime(event)}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Local: {location}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{type?.name || event.event_type || "Atividade"} · {audienceLabel(eventAudience(event))}</p>
          <p className="mt-2 inline-flex rounded-full bg-[#F7FAF2] px-3 py-1 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{eventClassificationLabel(eventClassification(event))}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ${publicStatusClass(event.status)}`}>{statusLabels[event.status] ?? event.status}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-600">
        <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">{recurrenceDisplay(event)}</span>
        <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-100">{agendaTimeLabel(event)}</span>
        {firstAccessEnabledFor(event) && <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-900 ring-1 ring-emerald-100">Primeiro Acesso: ordem {firstAccessOrderFor(event) === Number.MAX_SAFE_INTEGER ? "auto" : firstAccessOrderFor(event)}</span>}
      </div>
      {event.notes && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{event.notes}</p>}
      {(onEdit || onDelete) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onEdit && <button type="button" onClick={() => onEdit(event)} className="rounded-xl bg-[#00334E] px-4 py-2 text-sm font-black text-white">Editar</button>}
          {onDelete && <button type="button" onClick={() => onDelete(event.id)} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700">Excluir</button>}
        </div>
      )}
    </article>
  );
}

function FirstAccessAgendaItem({ event, locations }: { event: AgendaEvent; locations: Location[] }) {
  return (
    <article className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
      <span aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 rounded border-2 border-slate-300 bg-white" />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#123D2C]">{event.title}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">
          {firstAccessDescriptionFor(event, locations).split("\n").map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </span>
      </span>
    </article>
  );
}

function FirstAccessPreview({ events, locations }: { events: AgendaEvent[]; locations: Location[] }) {
  const [mode, setMode] = useState<"expanded" | "grouped">("expanded");
  const grouped = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of events) {
      const key = eventAudience(event);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Preview do Primeiro Acesso</p>
          <h2 className="mt-2 text-2xl font-black text-[#00334E]">Card Agenda</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Visualize os cards exatamente no formato exibido aos Filhos da Corrente no Primeiro Acesso, incluindo recorrência, data, horário e localidade.
          </p>
        </div>
        <div className="flex rounded-full bg-slate-100 p-1 text-sm font-black text-[#00334E]">
          <button type="button" onClick={() => setMode("grouped")} className={`rounded-full px-3 py-2 ${mode === "grouped" ? "bg-white shadow" : ""}`}>Agrupado</button>
          <button type="button" onClick={() => setMode("expanded")} className={`rounded-full px-3 py-2 ${mode === "expanded" ? "bg-white shadow" : ""}`}>Expandido</button>
        </div>
      </div>
      {mode === "expanded" ? (
        <div className="mt-5 grid gap-2 rounded-3xl border border-[#123D2C]/10 bg-[#F7FAF2] p-4 md:grid-cols-2">
          {events.map((event) => <FirstAccessAgendaItem key={event.id} event={event} locations={locations} />)}
          {events.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500 md:col-span-2">Nenhum evento aprovado configurado para aparecer no Primeiro Acesso.</p>}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {grouped.map(([audience, list]) => (
            <article key={audience} className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <h3 className="font-black text-[#123D2C]">{audienceLabel(audience)}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">{list.length} evento(s)</p>
              <div className="mt-3 grid gap-2">
                {list.map((event) => <FirstAccessAgendaItem key={event.id} event={event} locations={locations} />)}
              </div>
            </article>
          ))}
          {grouped.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhum evento para agrupar.</p>}
        </div>
      )}
    </section>
  );
}

export function AgendaVivaClientPage({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { payload, setPayload, loading, error, setError } = useAgendaVivaData(router);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [settingsForm, setSettingsForm] = useState<AgendaSettings>(defaultAgendaSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [approvalWhatsappUrl, setApprovalWhatsappUrl] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [classificationFilter, setClassificationFilter] = useState("todos");
  const [calendarRange, setCalendarRange] = useState("completo");
  const [calendarEventType, setCalendarEventType] = useState("todos");
  const [calendarAudience, setCalendarAudience] = useState("all");
  const [calendarClassification, setCalendarClassification] = useState("todos");
  const [calendarPersonId, setCalendarPersonId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const year = 2026;
  const months = Array.from({ length: 12 }, (_, index) => index);

  useEffect(() => {
    if (!payload?.agendaSettings) return;

    const timer = window.setTimeout(() => {
      setSettingsForm(normalizeAgendaSettings(payload.agendaSettings));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [payload?.agendaSettings]);

  const titleByMode: Record<Mode, string> = {
    overview: "Agenda Viva",
    eventos: "Agenda Viva — Eventos",
    aprovacoes: "Agenda Viva — Aprovações",
    calendario: "Agenda Viva — Calendário",
    configuracoes: "Agenda Viva — Configurações",
  };

  const descriptionByMode: Record<Mode, string> = {
    overview: "Gerencie eventos, aprovações e calendário em páginas separadas, com navegação mais simples para desktop e mobile.",
    eventos: "Cadastre e edite eventos em uma lista com formulário em janela, sem precisar voltar ao topo da página.",
    aprovacoes: "Valide as solicitações antes de publicar no calendário e no Primeiro Acesso.",
    calendario: "Visualize eventos por período, público, tipo, responsável e status.",
    configuracoes: "Defina regras de agendamento, recorrência, ausência e encaminhamento de quarta-feira.",
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSetting<K extends keyof AgendaSettings>(key: K, value: AgendaSettings[K]) {
    setSettingsForm((current) => ({ ...current, [key]: value }));
  }

  const authenticatedRequest = useCallback(async (init: RequestInit) => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace("/solucoes/organizacao-em-harmonia/login");
      return null;
    }

    const response = await fetch("/api/organizacao-em-harmonia/cliente/agenda-viva", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result as Payload & { approvalWhatsappUrl?: string };
  }, [router]);

  async function onImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      if (!canStoreDataImage(dataUrl)) {
        setError("Imagem muito grande para esta versão de teste. Use uma imagem menor ou informe uma URL da imagem.");
        return;
      }
      setError("");
      setForm((current) => ({ ...current, imageUrl: dataUrl, imageAlt: current.imageAlt || file.name.replace(/\.[^.]+$/, "") }));
    };
    reader.readAsDataURL(file);
  }

  async function saveAgendaSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({
        method: "POST",
        body: JSON.stringify({ action: "updateAgendaSettings", ...settingsForm }),
      });
      if (result) setPayload(result);
      setMessage("Configurações da Agenda Viva salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações da Agenda Viva.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload) return;
    setSaving(true);
    setMessage("");
    setError("");
    setApprovalWhatsappUrl("");
    try {
      const selectedType = payload.eventTypes.find((item) => item.id === form.eventTypeId);
      const selectedLocation = payload.locations.find((item) => item.id === form.locationId);
      const result = await authenticatedRequest({
        method: "POST",
        body: JSON.stringify({ action: "upsertEvent", ...form, eventType: selectedType?.slug || "atividade", locationName: selectedLocation?.name || "" }),
      });
      if (result) setPayload(result);
      if (result?.approvalWhatsappUrl) setApprovalWhatsappUrl(result.approvalWhatsappUrl);
      setForm(emptyForm);
      setModalOpen(false);
      setMessage("Evento salvo. Se exigir aprovação, o responsável receberá a solicitação.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar atividade.");
    } finally {
      setSaving(false);
    }
  }

  async function decideEvent(eventId: string, action: "approveEvent" | "rejectEvent" | "requestAdjustments") {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({ method: "POST", body: JSON.stringify({ action, eventId }) });
      if (result) setPayload(result);
      setMessage(action === "approveEvent" ? "Atividade aprovada e liberada no calendário." : "Status da atividade atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar atividade.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId: string) {
    if (!window.confirm("Excluir esta atividade? Ela será removida da lista, do calendário, do preview e do card público do Primeiro Acesso.")) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({ method: "POST", body: JSON.stringify({ action: "deleteEvent", eventId }) });
      if (result) setPayload(result);
      setMessage("Atividade excluída.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir atividade.");
    } finally {
      setSaving(false);
    }
  }

  function editEvent(event: AgendaEvent) {
    setForm({
      eventId: event.id,
      title: event.title,
      eventTypeId: event.event_type_id ?? "",
      startsAt: metadataAnyText(event, ["localStart", "local_start", "localStartsAt", "startsAtLocal"]) || dateInputValue(event.starts_at),
      endsAt: metadataAnyText(event, ["localEnd", "local_end", "localEndsAt", "endsAtLocal"]) || dateInputValue(event.ends_at),
      allDay: event.all_day,
      isRecurring: Boolean(event.recurrence_rule) || metadataBoolean(event, "recurring"),
      recurrenceFrequency: metadataText(event, "recurrenceFrequency") || recurrenceFrequencyFromRule(event.recurrence_rule),
      recurrenceWeekday: metadataText(event, "recurrenceWeekday") || recurrenceWeekdayFromRule(event.recurrence_rule),
      locationId: event.location_id || metadataText(event, "location_id"),
      location: event.location ?? "",
      audience: eventAudience(event),
      eventClassification: eventClassification(event),
      groupSlug: event.group_slug ?? "",
      responsiblePersonId: event.responsible_person_id ?? "",
      notes: event.notes ?? "",
      imageUrl: eventImageUrl(event),
      imageAlt: eventImageAlt(event),
      imageEmoji: eventEmoji(event),
      highlightVisual: event.metadata?.highlight_visual !== false,
      firstAccessEnabled: firstAccessEnabledFor(event),
      firstAccessOrder: String(firstAccessOrderFor(event) === Number.MAX_SAFE_INTEGER ? "" : firstAccessOrderFor(event)),
      firstAccessSummary: metadataText(event, "firstAccessSummary") || metadataText(event, "first_access_summary"),
      requiresApproval: event.requires_approval,
    });
    setModalOpen(true);
  }

  function newEvent() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  const events = useMemo(() => sortedEvents(payload?.events ?? []), [payload?.events]);
  const firstAccessPreviewEvents = useMemo(() => firstAccessSortedEvents(payload?.events ?? []), [payload?.events]);
  const pendingEvents = useMemo(() => (payload?.events ?? []).filter((event) => event.status === "pendente_aprovacao"), [payload?.events]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const classification = eventClassification(event);
      const text = `${event.title} ${event.location ?? ""} ${event.group_slug ?? ""} ${event.event_type ?? ""} ${eventClassificationLabel(classification)}`.toLowerCase();
      if (normalizedQuery && !text.includes(normalizedQuery)) return false;
      if (statusFilter !== "todos" && event.status !== statusFilter) return false;
      if (classificationFilter !== "todos" && classification !== classificationFilter) return false;
      return true;
    });
  }, [classificationFilter, events, query, statusFilter]);

  const calendarEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startFilter = periodStart ? new Date(`${periodStart}T00:00:00`) : null;
    const endFilter = periodEnd ? new Date(`${periodEnd}T23:59:59`) : null;

    return events.filter((event) => {
      const start = toComparableDate(eventLocalStart(event));
      const end = toComparableDate(eventLocalEnd(event)) ?? start;
      if (calendarRange === "futuros" && end && end < today) return false;
      if (startFilter && end && end < startFilter) return false;
      if (endFilter && start && start > endFilter) return false;
      if (calendarEventType !== "todos" && event.event_type_id !== calendarEventType && event.event_type !== calendarEventType) return false;
      if (calendarAudience !== "all" && eventAudience(event) !== calendarAudience) return false;
      if (calendarClassification !== "todos" && eventClassification(event) !== calendarClassification) return false;
      if (calendarPersonId && event.responsible_person_id !== calendarPersonId && event.created_by_person_id !== calendarPersonId) return false;
      return true;
    });
  }, [calendarAudience, calendarClassification, calendarEventType, calendarPersonId, calendarRange, events, periodEnd, periodStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of calendarEvents) {
      for (const key of occurrenceKeysForYear(event, year)) {
        const list = map.get(key) ?? [];
        list.push(event);
        map.set(key, list);
      }
    }
    return map;
  }, [calendarEvents, year]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <OrganizacaoClientShell title={titleByMode[mode]} description={descriptionByMode[mode]}>
      <AgendaVivaSubnav active={mode} />
      <LoadingAndMessages loading={loading} error={error} message={message} approvalWhatsappUrl={approvalWhatsappUrl} />

      {!loading && payload && (
        <>
          {mode === "overview" && (
            <div className="grid gap-5">
              <section className="grid gap-4 md:grid-cols-3">
                {agendaLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Agenda Viva</p>
                    <h2 className="mt-2 text-2xl font-black text-[#00334E]">{item.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </Link>
                ))}
              </section>
              <FirstAccessPreview events={firstAccessPreviewEvents} locations={payload.locations} />
            </div>
          )}

          {mode === "eventos" && (
            <div className="grid gap-5">
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Eventos</p><h2 className="mt-2 text-2xl font-black text-[#00334E]">Lista de eventos cadastrados</h2><p className="mt-2 text-sm leading-6 text-slate-600">Edite em uma janela dedicada, sem precisar voltar ao topo da página.</p></div>
                  <button type="button" onClick={newEvent} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white">Novo evento</button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Buscar por nome, local ou tipo" />
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <select value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todas as classificações</option><option value="umbanda">Umbanda</option><option value="outros">Outros</option><option value="sementinha">Sementinha</option><option value="estudos">Estudos</option><option value="social">Social / comunidade</option></select>
                </div>
              </section>
              <section className="grid gap-4 lg:grid-cols-2">
                {filteredEvents.map((event) => <EventCard key={event.id} event={event} payload={payload} onEdit={editEvent} onDelete={deleteEvent} />)}
                {filteredEvents.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhum evento encontrado.</p>}
              </section>
              <FirstAccessPreview events={firstAccessPreviewEvents} locations={payload.locations} />
            </div>
          )}

          {mode === "aprovacoes" && (
            <section className="grid gap-4 lg:grid-cols-2">
              {pendingEvents.map((event) => (
                <article key={event.id} className="rounded-[2rem] bg-amber-50 p-5 shadow ring-1 ring-amber-100">
                  <EventCard event={event} payload={payload} compact />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => decideEvent(event.id, "approveEvent")} className="rounded-xl bg-[#31C16B] px-4 py-2 text-sm font-black text-[#00334E]">Aprovar</button>
                    <button type="button" onClick={() => decideEvent(event.id, "requestAdjustments")} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#00334E] ring-1 ring-amber-100">Pedir ajuste</button>
                    <button type="button" onClick={() => decideEvent(event.id, "rejectEvent")} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700">Reprovar</button>
                  </div>
                </article>
              ))}
              {pendingEvents.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhuma solicitação pendente.</p>}
            </section>
          )}

          {mode === "calendario" && (
            <div className="grid gap-5">
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Filtros do calendário</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Visualização por permissão, período e associação</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <select value={calendarRange} onChange={(event) => setCalendarRange(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="completo">Calendário completo, incluindo concluídos</option><option value="futuros">A partir da data atual</option></select>
                  <select value={calendarEventType} onChange={(event) => setCalendarEventType(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todos os eventos/tipos</option>{payload.eventTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  <select value={calendarAudience} onChange={(event) => setCalendarAudience(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="all">Todos os públicos</option><option value="filhos-corrente">Somente Filhos da Corrente</option><option value="consulentes">Consulentes / Filhos de Fora</option><option value="todos">Filhos e Consulentes</option></select>
                  <select value={calendarClassification} onChange={(event) => setCalendarClassification(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todas as classificações</option><option value="umbanda">Umbanda</option><option value="outros">Outros</option><option value="sementinha">Sementinha</option><option value="estudos">Estudos</option><option value="social">Social / comunidade</option></select>
                  <select value={calendarPersonId} onChange={(event) => setCalendarPersonId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Sem filtro por pessoa</option>{payload.people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select>
                  <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
                  <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
                </div>
              </section>
              <section className="overflow-hidden rounded-[2.5rem] bg-[#F7FAF2] p-0 shadow ring-1 ring-lime-200">
                <div className="bg-gradient-to-br from-white via-lime-50 to-[#e6f59b] px-5 py-7 text-center sm:px-8">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-[#2F6B43]">Agenda Viva</p>
                  <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-[#3B4E16] sm:text-5xl">Calendário Tucxa 2026</h2>
                  <p className="mx-auto mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#3B4E16]/80">Visual anual inspirado no calendário oficial do Tucxa, com leitura mobile friendly, filtros e edição rápida ao tocar em um evento.</p>
                </div>
                <div className="grid gap-4 bg-[#eef8d6] p-3 sm:p-5 xl:grid-cols-2">
                  {months.map((monthIndex) => {
                    const cells = monthMatrix(year, monthIndex);
                    return (
                      <article key={monthIndex} className="rounded-[2rem] bg-white/90 p-3 shadow-sm ring-1 ring-lime-100 sm:p-4">
                        <h3 className="rounded-2xl bg-[#A5C595] px-4 py-2 text-center text-sm font-black uppercase tracking-[0.26em] text-white">{monthNames[monthIndex]}</h3>
                        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#3B4E16]/70 sm:text-[0.68rem]">{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
                        <div className="mt-1 grid grid-cols-7 gap-1">
                          {cells.map((cell) => {
                            const dayEvents = cell.day ? eventsByDay.get(cell.key) ?? [] : [];
                            const firstEvent = dayEvents[0];
                            return (
                              <div key={cell.key} className={`min-h-12 rounded-xl p-1 text-center ring-1 sm:min-h-16 ${cell.day ? "bg-[#fbffe7] ring-lime-100" : "bg-transparent ring-transparent"}`}>
                                {cell.day && <p className="text-[0.68rem] font-black text-[#314414] sm:text-xs">{cell.day}</p>}
                                <div className="mt-0.5 grid gap-0.5">
                                  {dayEvents.slice(0, 2).map((event) => {
                                    const time = formatLocalTime(eventLocalStart(event));
                                    return (
                                      <button key={event.id} type="button" title={`${event.title}\n${getEventDateTime(event)}\n${locationLabel(event, payload.locations)}`} onClick={() => editEvent(event)} className={`truncate rounded-lg px-1 py-0.5 text-[0.5rem] font-black leading-3 ring-1 transition hover:scale-105 sm:text-[0.58rem] ${colorFor(event, payload.eventTypes)}`}>
                                        <span aria-hidden="true">{eventEmoji(event)} </span>{event.title}
                                        {time && <span className="block opacity-80">{time}</span>}
                                      </button>
                                    );
                                  })}
                                  {firstEvent && dayEvents.length > 2 && <button type="button" onClick={() => editEvent(firstEvent)} className="rounded-lg bg-lime-200 px-1 py-0.5 text-[0.55rem] font-black text-lime-950">+{dayEvents.length - 2}</button>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
              <section className="grid gap-4 lg:grid-cols-2">{calendarEvents.map((event) => <EventCard key={event.id} event={event} payload={payload} onEdit={editEvent} />)}{calendarEvents.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhum evento encontrado com os filtros selecionados.</p>}</section>
            </div>
          )}



          {mode === "configuracoes" && (
            <form onSubmit={saveAgendaSettings} className="grid gap-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Regras da Agenda Viva</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Agendamentos e retornos</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Defina limites e permissões para que o calendário e a disponibilidade das entidades sejam respeitados no agendamento dos consulentes.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">Agendamentos recorrentes por consulente</span>
                  <input
                    value={String(settingsForm.maxRecurringAppointmentsPerConsulente)}
                    onChange={(event) => updateSetting("maxRecurringAppointmentsPerConsulente", Math.max(0, Number(event.target.value.replace(/\D/g, "") || 0)))}
                    className="rounded-2xl border border-slate-200 p-3"
                    inputMode="numeric"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                  <input type="checkbox" checked={settingsForm.autoCancelRecurringOnAbsence} onChange={(event) => updateSetting("autoCancelRecurringOnAbsence", event.target.checked)} className="h-5 w-5" />
                  <span className="text-sm font-black text-[#00334E]">Cancelar recorrência automaticamente em caso de ausência</span>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">Quem pode agendar quarta-feira</span>
                  <select value={settingsForm.wednesdayBookingMode} onChange={(event) => updateSetting("wednesdayBookingMode", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <option value="coordination">Somente diretoria/coordenação definida</option>
                    <option value="consulentes">Também pelos consulentes</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                  <input type="checkbox" checked={settingsForm.requireRecommendingEntityForWednesday} onChange={(event) => updateSetting("requireRecommendingEntityForWednesday", event.target.checked)} className="h-5 w-5" />
                  <span className="text-sm font-black text-[#00334E]">Exigir entidade que recomendou/encaminhou na quarta-feira</span>
                </label>
              </div>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#00334E]">Pessoas autorizadas a agendar quarta-feira</span>
                <select
                  multiple
                  value={settingsForm.wednesdayAuthorizedPersonIds}
                  onChange={(event) => updateSetting("wednesdayAuthorizedPersonIds", Array.from(event.target.selectedOptions).map((option) => option.value))}
                  className="min-h-40 rounded-2xl border border-slate-200 bg-white p-3"
                >
                  {(payload?.people ?? []).filter((person) => person.active !== false).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                </select>
                <span className="text-xs font-semibold text-slate-500">Use Ctrl/Shift para selecionar mais de uma pessoa no desktop.</span>
              </label>
              <section className="grid gap-4 rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-lime-100 md:grid-cols-2">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-black text-[#00334E]">Validação do Primeiro Acesso</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Configure quem recebe os e-mails de validação e quem pode simular o acesso exatamente como um Filho da Corrente.</p>
                </div>
                <label className="grid gap-1 md:col-span-2">
                  <span className="text-sm font-black text-[#00334E]">E-mails adicionais para validação</span>
                  <textarea
                    value={settingsForm.accessValidationReviewerEmails}
                    onChange={(event) => updateSetting("accessValidationReviewerEmails", event.target.value)}
                    className="min-h-24 rounded-2xl border border-slate-200 p-3"
                    placeholder="um@email.com; outro@email.com"
                  />
                  <span className="text-xs font-semibold text-slate-500">Separe por ponto e vírgula, vírgula ou quebra de linha. O e-mail automacao.ao.extremo@gmail.com fica sempre em cópia.</span>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">Pessoas que recebem validação</span>
                  <select
                    multiple
                    value={settingsForm.accessValidationReviewerPersonIds}
                    onChange={(event) => updateSetting("accessValidationReviewerPersonIds", Array.from(event.target.selectedOptions).map((option) => option.value))}
                    className="min-h-40 rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    {(payload?.people ?? []).filter((person) => person.active !== false).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">Pessoas que podem simular acesso</span>
                  <select
                    multiple
                    value={settingsForm.accessSimulationPersonIds}
                    onChange={(event) => updateSetting("accessSimulationPersonIds", Array.from(event.target.selectedOptions).map((option) => option.value))}
                    className="min-h-40 rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    {(payload?.people ?? []).filter((person) => person.active !== false).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                  </select>
                </label>
              </section>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#00334E]">Orientação de retorno para consulentes</span>
                <textarea value={settingsForm.appointmentReturnGuidance} onChange={(event) => updateSetting("appointmentReturnGuidance", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 p-3" />
              </label>
              <section className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-lime-100">
                <h3 className="font-black text-[#00334E]">Entidades disponíveis para recomendação</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Na tela de agendamento, a pessoa informará qual entidade recomendou o atendimento quando a regra exigir encaminhamento.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(payload?.entities ?? []).filter((entity) => entity.active !== false).map((entity) => (
                    <span key={entity.id} className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#00334E] ring-1 ring-slate-100">{entity.name} · {entity.daily_capacity ?? 4}/dia</span>
                  ))}
                </div>
              </section>
              <button disabled={saving} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar configurações"}</button>
            </form>
          )}

          <EventModal open={modalOpen} title={form.eventId ? "Editar evento" : "Novo evento"} onClose={() => setModalOpen(false)}>
            <AgendaEventForm form={form} payload={payload} saving={saving} onCancel={() => setModalOpen(false)} onImageFile={onImageFile} onSave={saveEvent} update={update} />
          </EventModal>
        </>
      )}
    </OrganizacaoClientShell>
  );
}
