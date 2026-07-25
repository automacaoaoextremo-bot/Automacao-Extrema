
"use client";

import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import {
  AdminActionButton,
  AdminDetailGrid,
  AdminDetailItem,
  AdminModal,
  AdminStatusBadge,
  CompactAdminRow,
  ConfirmDialog,
} from "@/components/organizacao-em-harmonia/admin-list-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ALL_MONTH_OCCURRENCES, allowedMonthOccurrencesFromMetadata, isMonthOccurrenceAllowed, monthOccurrencesLabel } from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";

type Mode = "overview" | "eventos" | "aprovacoes" | "calendario" | "cadastros" | "configuracoes";

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
  active: boolean;
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

type AgendaCatalogItem = {
  id: string;
  value: string;
  label: string;
  description?: string;
  active: boolean;
  archived: boolean;
};

type AgendaCatalogs = {
  audiences: AgendaCatalogItem[];
  classifications: AgendaCatalogItem[];
  responsiblePersonIds: string[];
};

type AgendaSettings = {
  maxRecurringAppointmentsPerConsulente: number;
  autoCancelRecurringOnAbsence: boolean;
  wednesdayBookingMode: string;
  wednesdayAuthorizedPersonIds: string[];
  requireRecommendingEntityForWednesday: boolean;
  appointmentReturnGuidance: string;
  appointmentEditCutoffMinutes: number;
  accessValidationReviewerEmails: string;
  accessValidationReviewerPersonIds: string[];
  accessSimulationPersonIds: string[];
  accessCopyEmail: string;
  agendaCatalogs: AgendaCatalogs;
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

type ConfirmationState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "primary" | "danger" | "warning";
  run: () => Promise<void>;
};

type CatalogKind = "audiences" | "classifications";
type CatalogEditorState = { kind: CatalogKind; mode: "view" | "edit" | "new"; item: AgendaCatalogItem };
type EventTypeEditorMode = "view" | "edit" | "new";

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
  allowedMonthOccurrences: number[];
  thursdayGroupScope: string[];
  attendanceConfirmationRequired: boolean;
  allowOptionalEntityAppointment: boolean;
  overrideRegularGroupSchedule: boolean;
  locationId: string;
  location: string;
  audience: string;
  eventClassification: string;
  eventCollection: string;
  sementinhaEventType: string;
  specialEventType: string;
  groupSlug: string;
  responsiblePersonId: string;
  notes: string;
  imageUrl: string;
  imageAlt: string;
  imageEmoji: string;
  highlightVisual: boolean;
  continuesDuringVacation: boolean;
  firstAccessEnabled: boolean;
  firstAccessOrder: string;
  firstAccessSummary: string;
  requiresApproval: boolean;
};

const defaultAgendaCatalogs: AgendaCatalogs = {
  audiences: [
    { id: "filhos-corrente", value: "filhos-corrente", label: "Somente Filhos da Corrente", active: true, archived: false },
    { id: "consulentes", value: "consulentes", label: "Consulentes / Filhos de Fora", active: true, archived: false },
    { id: "todos", value: "todos", label: "Filhos da Corrente e Consulentes", active: true, archived: false },
  ],
  classifications: [
    { id: "umbanda", value: "umbanda", label: "Umbanda", active: true, archived: false },
    { id: "outros", value: "outros", label: "Outros", active: true, archived: false },
    { id: "sementinha", value: "sementinha", label: "Sementinha", active: true, archived: false },
    { id: "estudos", value: "estudos", label: "Estudos", active: true, archived: false },
    { id: "social", value: "social", label: "Social / comunidade", active: true, archived: false },
  ],
  responsiblePersonIds: [],
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function slugifyCatalogValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function normalizeCatalogItem(value: unknown, fallback: AgendaCatalogItem): AgendaCatalogItem {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const label = typeof record.label === "string" && record.label.trim() ? record.label.trim() : fallback.label;
  const rawValue = typeof record.value === "string" && record.value.trim() ? record.value.trim() : fallback.value || slugifyCatalogValue(label);
  const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : rawValue;
  return {
    id,
    value: rawValue,
    label,
    description: typeof record.description === "string" ? record.description.trim() : fallback.description,
    active: typeof record.active === "boolean" ? record.active : fallback.active,
    archived: typeof record.archived === "boolean" ? record.archived : fallback.archived,
  };
}

function mergeCatalogItems(defaults: AgendaCatalogItem[], custom: unknown): AgendaCatalogItem[] {
  const items = Array.isArray(custom) ? custom : [];
  const map = new Map<string, AgendaCatalogItem>();
  defaults.forEach((item) => map.set(item.value, item));
  items.forEach((item) => {
    const fallback = normalizeCatalogItem(item, { id: "", value: "", label: "Item", active: true, archived: false });
    map.set(fallback.value, fallback);
  });
  return Array.from(map.values());
}

function normalizeAgendaCatalogs(value: unknown): AgendaCatalogs {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    audiences: mergeCatalogItems(defaultAgendaCatalogs.audiences, record.audiences),
    classifications: mergeCatalogItems(defaultAgendaCatalogs.classifications, record.classifications),
    responsiblePersonIds: Array.isArray(record.responsiblePersonIds) ? record.responsiblePersonIds.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [],
  };
}

function activeCatalogItems(items: AgendaCatalogItem[]) {
  return items.filter((item) => item.active !== false && item.archived !== true);
}

const defaultAgendaSettings: AgendaSettings = {
  maxRecurringAppointmentsPerConsulente: 2,
  autoCancelRecurringOnAbsence: true,
  wednesdayBookingMode: "coordination",
  wednesdayAuthorizedPersonIds: [],
  requireRecommendingEntityForWednesday: true,
  appointmentReturnGuidance:
    "Após o primeiro atendimento com uma entidade, se houver orientação de retorno, procure voltar com a mesma entidade para preservar a continuidade do cuidado.",
  appointmentEditCutoffMinutes: 1440,
  accessValidationReviewerEmails: "",
  accessValidationReviewerPersonIds: [],
  accessSimulationPersonIds: [],
  accessCopyEmail: "automacao.ao.extremo@gmail.com",
  agendaCatalogs: defaultAgendaCatalogs,
};

function normalizeAgendaSettings(value: Payload["agendaSettings"]): AgendaSettings {
  return {
    ...defaultAgendaSettings,
    ...(value ?? {}),
    maxRecurringAppointmentsPerConsulente: Number(value?.maxRecurringAppointmentsPerConsulente ?? defaultAgendaSettings.maxRecurringAppointmentsPerConsulente),
    appointmentEditCutoffMinutes: Math.max(0, Math.trunc(Number(value?.appointmentEditCutoffMinutes ?? defaultAgendaSettings.appointmentEditCutoffMinutes) || 0)),
    wednesdayAuthorizedPersonIds: Array.isArray(value?.wednesdayAuthorizedPersonIds) ? value.wednesdayAuthorizedPersonIds : [],
    accessValidationReviewerEmails: typeof value?.accessValidationReviewerEmails === "string" ? value.accessValidationReviewerEmails : defaultAgendaSettings.accessValidationReviewerEmails,
    accessValidationReviewerPersonIds: Array.isArray(value?.accessValidationReviewerPersonIds) ? value.accessValidationReviewerPersonIds : [],
    accessSimulationPersonIds: Array.isArray(value?.accessSimulationPersonIds) ? value.accessSimulationPersonIds : [],
    accessCopyEmail: typeof value?.accessCopyEmail === "string" && value.accessCopyEmail.trim() ? value.accessCopyEmail : defaultAgendaSettings.accessCopyEmail,
    agendaCatalogs: normalizeAgendaCatalogs((value as Partial<AgendaSettings> | undefined)?.agendaCatalogs),
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
  allowedMonthOccurrences: [...ALL_MONTH_OCCURRENCES],
  thursdayGroupScope: [],
  attendanceConfirmationRequired: false,
  allowOptionalEntityAppointment: false,
  overrideRegularGroupSchedule: false,
  locationId: "",
  location: "",
  audience: "filhos-corrente",
  eventClassification: "umbanda",
  eventCollection: "",
  sementinhaEventType: "",
  specialEventType: "",
  groupSlug: "",
  responsiblePersonId: "",
  notes: "",
  imageUrl: "",
  imageAlt: "",
  imageEmoji: "",
  highlightVisual: true,
  continuesDuringVacation: false,
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
    label: "Cadastros",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/cadastros",
    description: "Cadastre tipos, públicos, classificações e responsáveis usados nos eventos.",
  },
  {
    label: "Configurações",
    href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/configuracoes",
    description: "Regras de recorrência, ausências, quarta-feira e orientação de retorno.",
  },
];

const eventColorClasses: Record<string, string> = {
  ferias: "bg-yellow-100 text-yellow-950 ring-yellow-300 border-yellow-300",
  recesso: "bg-yellow-100 text-yellow-950 ring-yellow-300 border-yellow-300",
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
      const monthKeys = positions.length
        ? positions.map((position) => dateForNthWeekday(year, month, weekday, position))
        : [dateForNthWeekday(year, month, weekday, 1)];
      for (const key of monthKeys) {
        if (key && isInEventRange(event, key) && isMonthOccurrenceAllowed(event.metadata, key)) keys.push(key);
      }
    }
    return keys;
  }

  const interval = rule.includes("INTERVAL=2") ? 14 : 7;
  const start = toComparableDate(eventLocalStart(event)) ?? new Date(year, 0, 1);
  let cursor = new Date(Math.max(start.getTime(), new Date(year, 0, 1).getTime()));
  while (cursor.getDay() !== weekday) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  while (cursor.getFullYear() === year) {
    const key = localDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (isInEventRange(event, key) && isMonthOccurrenceAllowed(event.metadata, key)) keys.push(key);
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

function metadataStringArray(event: AgendaEvent, keys: string[]) {
  for (const key of keys) {
    const value = event.metadata?.[key];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  }
  return [];
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

function formatDateOnly(value: string | null | undefined) {
  const local = parseLocalDateTime(value ?? "");
  if (local) return `${String(local.day).padStart(2, "0")}/${String(local.month).padStart(2, "0")}/${local.year}`;
  if (!value) return "Data a definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data a definir";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatEventDateRange(event: AgendaEvent) {
  const start = formatDateOnly(eventLocalStart(event));
  const end = formatDateOnly(eventLocalEnd(event));
  if (end === "Data a definir" || end === start) return start;
  return `${start} até ${end}`;
}

function eventIsActive(event: AgendaEvent) {
  return event.active !== false;
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

function eventCollection(event: AgendaEvent) {
  const metadata = event.metadata ?? {};
  const value = metadata.eventCollection ?? metadata.event_collection;
  return typeof value === "string" ? value.trim() : "";
}

function eventCollectionLabel(value: string) {
  return value === "eventos-tucxa" ? "Eventos do TUCXA" : "Sem coleção específica";
}

function sementinhaEventType(event: AgendaEvent) {
  const metadata = event.metadata ?? {};
  const value = metadata.sementinhaEventType ?? metadata.sementinha_event_type ?? metadata.eventSubtype ?? metadata.event_subtype;
  return typeof value === "string" ? value.trim() : "";
}

function sementinhaEventTypeLabel(value: string) {
  if (value === "community-action") return "Ação em comunidade";
  if (value === "bazar") return "Bazar";
  if (value === "bazar-simple") return "Bazar simples";
  if (value === "bingo") return "Bingo";
  return "A definir pelo título";
}

function specialEventType(event: AgendaEvent) {
  const metadata = event.metadata ?? {};
  const value = metadata.specialEventType ?? metadata.special_event_type;
  return typeof value === "string" ? value.trim() : "";
}

function audienceLabel(value: string) {
  const option = activeCatalogItems(defaultAgendaCatalogs.audiences).find((item) => item.value === value);
  if (option) return option.label;
  if (value === "todos") return "Filhos da Corrente e Consulentes";
  if (value === "consulentes") return "Consulentes / Filhos de Fora";
  return "Somente Filhos da Corrente";
}

function agendaCatalogsFromPayload(payload: Payload) {
  return normalizeAgendaCatalogs(payload.agendaSettings?.agendaCatalogs);
}

function audienceOptions(payload: Payload) {
  return activeCatalogItems(agendaCatalogsFromPayload(payload).audiences);
}

function classificationOptions(payload: Payload) {
  return activeCatalogItems(agendaCatalogsFromPayload(payload).classifications);
}

function responsiblePeople(payload: Payload) {
  const allowed = agendaCatalogsFromPayload(payload).responsiblePersonIds;
  const people = payload.people.filter((person) => person.active !== false);
  return allowed.length ? people.filter((person) => allowed.includes(person.id)) : people;
}

function isVacationEvent(event: AgendaEvent) {
  const text = `${event.title} ${event.event_type} ${event.group_slug ?? ""} ${metadataText(event, "eventTypeLabel")} ${metadataText(event, "classification")}`;
  const normalized = normalizeText(text);
  return normalized.includes("ferias") || normalized.includes("recesso");
}

function isUmbandaEvent(event: AgendaEvent) {
  return normalizeText(eventClassification(event)).includes("umbanda");
}

function continuesDuringVacation(event: AgendaEvent) {
  return metadataBooleanAny(event, ["continuesDuringVacation", "continues_during_vacation", "keepDuringVacation", "mantemNasFerias"], false);
}

function addVacationRange(keys: Set<string>, year: number, startMonth: number, startDay: number, endMonth: number, endDay: number) {
  let cursor = new Date(year, startMonth, startDay);
  const end = new Date(year, endMonth, endDay);
  while (cursor <= end) {
    keys.add(localDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
}

function vacationKeysForYear(events: AgendaEvent[], year: number) {
  const keys = new Set<string>();

  // Regras oficiais do calendário anual do Tucxa 2026: férias em janeiro até 28, julho até 29 e a partir de 21/12.
  if (year === 2026) {
    addVacationRange(keys, year, 0, 1, 0, 28);
    addVacationRange(keys, year, 6, 1, 6, 29);
    addVacationRange(keys, year, 11, 21, 11, 31);
  }

  events.filter(isVacationEvent).forEach((event) => {
    const occurrences = occurrenceKeysForYear(event, year);
    occurrences.forEach((key) => keys.add(key));
    const start = toComparableDate(eventLocalStart(event));
    const end = toComparableDate(eventLocalEnd(event));
    if (start && end && end >= start) {
      let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= last && cursor.getFullYear() <= year) {
        if (cursor.getFullYear() === year) keys.add(localDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
    }
  });
  return keys;
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
  if (eventCollection(event) === "eventos-tucxa") {
    return "bg-rose-100 text-rose-950 ring-rose-300";
  }
  const type = eventTypeFor(event, types);
  return eventColorClasses[type?.slug ?? event.event_type] ?? "bg-white text-[#00334E] ring-slate-200";
}

function TucxaCalendarLegend() {
  const items = [
    { label: "Grupo Segunda-feira", className: "bg-rose-100 text-rose-950 ring-rose-200" },
    { label: "Grupo Terça-feira", className: "bg-sky-100 text-sky-950 ring-sky-200" },
    { label: "Tratamento espiritual", className: "bg-emerald-100 text-emerald-950 ring-emerald-200" },
    { label: "Grupo 1", className: "bg-green-100 text-green-950 ring-green-200" },
    { label: "Grupo 2", className: "bg-blue-100 text-blue-950 ring-blue-200" },
    { label: "Férias/recesso", className: "bg-yellow-100 text-yellow-950 ring-yellow-200" },
    { label: "Eventos do TUCXA", className: "bg-rose-100 text-rose-950 ring-rose-300" },
  ];

  return (
    <div className="grid gap-2 rounded-3xl bg-white/90 p-3 text-xs font-black ring-1 ring-lime-100 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <span key={item.label} className={`rounded-xl px-3 py-2 ring-1 ${item.className}`}>{item.label}</span>
      ))}
    </div>
  );
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
    .filter((event) => eventIsActive(event))
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
    { key: "cadastros", label: "Cadastros", href: "/solucoes/organizacao-em-harmonia/cliente/agenda-viva/cadastros" },
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
            {audienceOptions(payload).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Classificação do evento</span>
          <select value={form.eventClassification} onChange={(event) => update("eventClassification", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            {classificationOptions(payload).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Coleção/calendário</span>
          <select value={form.eventCollection} onChange={(event) => update("eventCollection", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="">Sem coleção específica</option>
            <option value="eventos-tucxa">Eventos do TUCXA</option>
          </select>
          <span className="text-xs font-semibold text-slate-500">Use Eventos do TUCXA para Pizza, Feijoada, Festa Junina e demais datas do calendário físico.</span>
        </label>
        {form.eventClassification === "sementinha" && (
          <label className="grid gap-1">
            <span className="text-sm font-black text-[#00334E]">Tipo de evento do Sementinha</span>
            <select value={form.sementinhaEventType} onChange={(event) => update("sementinhaEventType", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
              <option value="">A definir pelo título</option>
              <option value="community-action">Ação em comunidade</option>
              <option value="bazar">Bazar</option>
              <option value="bazar-simple">Bazar simples</option>
              <option value="bingo">Bingo</option>
            </select>
            <span className="text-xs font-semibold text-slate-500">Define a cor usada no calendário anual do Sementinha.</span>
          </label>
        )}
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Tratamento especial</span>
          <select value={form.specialEventType} onChange={(event) => update("specialEventType", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="">Evento regular</option>
            <option value="retorno-ferias">Retorno das férias — todos os grupos</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Responsável</span>
          <select value={form.responsiblePersonId} onChange={(event) => update("responsiblePersonId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3">
            <option value="">A definir</option>
            {responsiblePeople(payload).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
          </select>
        </label>
        <label className="flex items-start gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100 md:col-span-2">
          <input type="checkbox" checked={form.continuesDuringVacation} onChange={(event) => update("continuesDuringVacation", event.target.checked)} className="mt-1 h-5 w-5" />
          <span className="text-sm font-black text-[#00334E]">
            Continuar aparecendo durante férias/recesso
            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">Marque somente para eventos que acontecem mesmo quando os atendimentos de Umbanda estiverem suspensos.</span>
          </span>
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
        <fieldset disabled={!form.isRecurring} className="grid gap-3 rounded-3xl bg-blue-50 p-4 ring-1 ring-blue-100 md:col-span-2 disabled:opacity-60">
          <div>
            <legend className="text-sm font-black text-[#00334E]">Ocorrências permitidas no mês</legend>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Desmarque a 5ª ocorrência quando não houver atendimento na quinta segunda ou terça-feira do mês.</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ALL_MONTH_OCCURRENCES.map((occurrence) => {
              const checked = form.allowedMonthOccurrences.includes(occurrence);
              return (
                <label key={occurrence} className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-2 text-sm font-black ring-1 ${checked ? "text-[#00334E] ring-blue-300" : "text-slate-400 ring-slate-200"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? form.allowedMonthOccurrences.filter((item) => item !== occurrence)
                        : [...form.allowedMonthOccurrences, occurrence].sort((left, right) => left - right);
                      update("allowedMonthOccurrences", next.length > 0 ? next : [occurrence]);
                    }}
                    className="h-4 w-4"
                  />
                  {occurrence}ª
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="grid gap-3 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100 md:col-span-2">
          <div>
            <legend className="text-sm font-black text-[#00334E]">Regras para os grupos de quinta-feira</legend>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Use para encontros regulares ou eventos especiais destinados a todos os Filhos da Corrente.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ value: "grupo-1", label: "Grupo 1" }, { value: "grupo-2", label: "Grupo 2" }].map((item) => (
              <label key={item.value} className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-3 font-black text-[#00334E] ring-1 ring-emerald-200">
                <input type="checkbox" checked={form.thursdayGroupScope.includes(item.value)} onChange={(event) => update("thursdayGroupScope", event.target.checked ? [...form.thursdayGroupScope, item.value] : form.thursdayGroupScope.filter((value) => value !== item.value))} className="h-5 w-5" />
                {item.label}
              </label>
            ))}
          </div>
          <label className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-emerald-200"><input type="checkbox" checked={form.attendanceConfirmationRequired} onChange={(event) => update("attendanceConfirmationRequired", event.target.checked)} className="mt-0.5 h-5 w-5" /><span><strong className="block text-sm text-[#00334E]">Exigir confirmação de presença</strong><span className="text-xs font-semibold text-slate-600">Substitui o nome no caderno e permite controle de pendentes e check-in.</span></span></label>
          <label className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-emerald-200"><input type="checkbox" checked={form.allowOptionalEntityAppointment} onChange={(event) => update("allowOptionalEntityAppointment", event.target.checked)} className="mt-0.5 h-5 w-5" /><span><strong className="block text-sm text-[#00334E]">Permitir atendimento opcional com entidade</strong><span className="text-xs font-semibold text-slate-600">A presença pode ser confirmada sem obrigar o agendamento com uma entidade.</span></span></label>
          <label className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200"><input type="checkbox" checked={form.overrideRegularGroupSchedule} onChange={(event) => update("overrideRegularGroupSchedule", event.target.checked)} className="mt-0.5 h-5 w-5" /><span><strong className="block text-sm text-amber-900">Evento especial fora da escala regular</strong><span className="text-xs font-semibold text-amber-800">Permite exibir, por exemplo, uma 5ª quinta para os dois grupos.</span></span></label>
        </fieldset>
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
  return (
    <AdminModal open={open} title={title} eyebrow="Agenda Viva" onClose={onClose}>
      {children}
    </AdminModal>
  );
}

function EventDetails({ event, payload }: { event: AgendaEvent; payload: Payload }) {
  const type = eventTypeFor(event, payload.eventTypes);
  const responsible = payload.people.find((person) => person.id === event.responsible_person_id);
  const imageUrl = eventImageUrl(event);
  return (
    <div className="grid gap-5">
      {imageUrl && (
        <div className="overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-slate-200">
          <Image src={imageUrl} alt={eventImageAlt(event)} width={1200} height={600} unoptimized className="max-h-72 w-full object-cover" />
        </div>
      )}
      <AdminDetailGrid>
        <AdminDetailItem label="Evento">{eventEmoji(event)} {event.title}</AdminDetailItem>
        <AdminDetailItem label="Situação">{statusLabels[event.status] ?? event.status} · {eventIsActive(event) ? "Ativo" : "Inativo"}</AdminDetailItem>
        <AdminDetailItem label="Data inicial">{formatLocalDateTime(eventLocalStart(event))}</AdminDetailItem>
        <AdminDetailItem label="Data final">{formatLocalDateTime(eventLocalEnd(event))}</AdminDetailItem>
        <AdminDetailItem label="Tipo de atividade">{type?.name || event.event_type || "Atividade"}</AdminDetailItem>
        <AdminDetailItem label="Classificação">{eventClassificationLabel(eventClassification(event))}</AdminDetailItem>
        <AdminDetailItem label="Coleção/calendário">{eventCollectionLabel(eventCollection(event))}</AdminDetailItem>
        {eventClassification(event) === "sementinha" && <AdminDetailItem label="Tipo do Sementinha">{sementinhaEventTypeLabel(sementinhaEventType(event))}</AdminDetailItem>}
        {specialEventType(event) && <AdminDetailItem label="Tratamento especial">{specialEventType(event) === "retorno-ferias" ? "Retorno das férias — todos os grupos" : specialEventType(event)}</AdminDetailItem>}
        <AdminDetailItem label="Público">{audienceLabel(eventAudience(event))}</AdminDetailItem>
        <AdminDetailItem label="Local">{locationLabel(event, payload.locations)}</AdminDetailItem>
        <AdminDetailItem label="Responsável">{responsible?.full_name || "Não informado"}</AdminDetailItem>
        <AdminDetailItem label="Recorrência">{recurrenceDisplay(event)}</AdminDetailItem>
        <AdminDetailItem label="Ocorrências no mês">{monthOccurrencesLabel(allowedMonthOccurrencesFromMetadata(event.metadata))}</AdminDetailItem>
        <AdminDetailItem label="Horário">{agendaTimeLabel(event)}</AdminDetailItem>
        <AdminDetailItem label="Dia inteiro">{event.all_day ? "Sim" : "Não"}</AdminDetailItem>
        <AdminDetailItem label="Primeiro Acesso">{firstAccessEnabledFor(event) ? `Exibido · ordem ${firstAccessOrderFor(event) === Number.MAX_SAFE_INTEGER ? "automática" : firstAccessOrderFor(event)}` : "Não exibido"}</AdminDetailItem>
        <AdminDetailItem label="Continua nas férias">{continuesDuringVacation(event) ? "Sim" : "Não"}</AdminDetailItem>
        <AdminDetailItem label="Código do grupo">{event.group_slug || "Não informado"}</AdminDetailItem>
        <AdminDetailItem label="Exige aprovação">{event.requires_approval ? "Sim" : "Não"}</AdminDetailItem>
        <AdminDetailItem label="Texto do Primeiro Acesso" full>{metadataAnyText(event, ["firstAccessSummary", "first_access_summary"]) || "Não informado"}</AdminDetailItem>
        <AdminDetailItem label="Observações internas" full>{event.notes || "Nenhuma observação cadastrada"}</AdminDetailItem>
      </AdminDetailGrid>
    </div>
  );
}

function EventCard({
  event,
  payload,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleApproval,
  onToggleActive,
  compact = false,
}: {
  event: AgendaEvent;
  payload: Payload;
  onView?: (event: AgendaEvent) => void;
  onEdit?: (event: AgendaEvent) => void;
  onDuplicate?: (event: AgendaEvent) => void;
  onDelete?: (event: AgendaEvent) => void;
  onToggleApproval?: (event: AgendaEvent) => void;
  onToggleActive?: (event: AgendaEvent) => void;
  compact?: boolean;
}) {
  const canToggleApproval = event.status === "aprovado" || event.status === "reprovado";
  const approvalLabel = statusLabels[event.status] ?? event.status;
  const actions = onView || onEdit || onDuplicate || onDelete || onToggleActive || onToggleApproval;

  return (
    <CompactAdminRow
      icon={eventEmoji(event)}
      title={event.title}
      subtitle={formatEventDateRange(event)}
      status={
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {canToggleApproval && onToggleApproval ? (
            <button type="button" onClick={() => onToggleApproval(event)} className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${publicStatusClass(event.status)}`}>
              {approvalLabel}
            </button>
          ) : (
            <span className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${publicStatusClass(event.status)}`}>{approvalLabel}</span>
          )}
          <AdminStatusBadge active={eventIsActive(event)}>{eventIsActive(event) ? "Ativo" : "Inativo"}</AdminStatusBadge>
        </div>
      }
      actions={actions ? (
        <>
          {onView && <AdminActionButton onClick={() => onView(event)}>Visualizar</AdminActionButton>}
          {onEdit && <AdminActionButton onClick={() => onEdit(event)} tone="primary">Editar</AdminActionButton>}
          {onDuplicate && <AdminActionButton onClick={() => onDuplicate(event)} tone="success">Duplicar</AdminActionButton>}
          {onDelete && <AdminActionButton onClick={() => onDelete(event)} tone="danger">Excluir</AdminActionButton>}
          {onToggleActive && <AdminActionButton onClick={() => onToggleActive(event)} tone={eventIsActive(event) ? "warning" : "success"}>{eventIsActive(event) ? "Inativar" : "Ativar"}</AdminActionButton>}
        </>
      ) : compact ? (
        <div className="text-xs font-bold text-slate-500">{eventTypeFor(event, payload.eventTypes)?.name || event.event_type || "Atividade"}</div>
      ) : undefined}
    />
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
  const [catalogDraft, setCatalogDraft] = useState<AgendaCatalogs>(defaultAgendaCatalogs);
  const [eventTypeDraft, setEventTypeDraft] = useState({ id: "", name: "", slug: "", description: "", requiresApproval: true, active: true, sortOrder: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [approvalWhatsappUrl, setApprovalWhatsappUrl] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Novo evento");
  const [viewEvent, setViewEvent] = useState<AgendaEvent | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [eventSortOrder, setEventSortOrder] = useState<"start" | "alphabetical">("start");
  const [eventTypeEditorMode, setEventTypeEditorMode] = useState<EventTypeEditorMode | null>(null);
  const [eventTypeView, setEventTypeView] = useState<EventType | null>(null);
  const [catalogEditor, setCatalogEditor] = useState<CatalogEditorState | null>(null);
  const [responsibleView, setResponsibleView] = useState<Person | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [classificationFilter, setClassificationFilter] = useState("todos");
  const [collectionFilter, setCollectionFilter] = useState("todos");
  const [calendarRange, setCalendarRange] = useState("completo");
  const [calendarEventType, setCalendarEventType] = useState("todos");
  const [calendarAudience, setCalendarAudience] = useState("all");
  const [calendarClassification, setCalendarClassification] = useState("todos");
  const [calendarCollection, setCalendarCollection] = useState("todos");
  const [calendarPersonId, setCalendarPersonId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const year = 2026;
  const months = Array.from({ length: 12 }, (_, index) => index);

  useEffect(() => {
    if (!payload?.agendaSettings) return;

    const timer = window.setTimeout(() => {
      const normalizedSettings = normalizeAgendaSettings(payload.agendaSettings);
      setSettingsForm(normalizedSettings);
      setCatalogDraft(normalizedSettings.agendaCatalogs);
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
    cadastros: "Agenda Viva — Cadastros",
    configuracoes: "Agenda Viva — Configurações",
  };

  const descriptionByMode: Record<Mode, string> = {
    overview: "Gerencie eventos, aprovações e calendário em páginas separadas, com navegação mais simples para desktop e mobile.",
    eventos: "Cadastre e edite eventos em uma lista com formulário em janela, sem precisar voltar ao topo da página.",
    aprovacoes: "Valide as solicitações antes de publicar no calendário e no Primeiro Acesso.",
    calendario: "Visualize eventos por período, público, tipo, responsável e status.",
    cadastros: "Configure os cadastros usados nos eventos: tipo, público, classificação e responsáveis.",
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

  function nextCatalogItemId(kind: CatalogKind, items: AgendaCatalogItem[]) {
    const prefix = `novo-${kind}-`;
    const usedIds = new Set(items.map((item) => item.id));
    let index = items.length + 1;
    let id = `${prefix}${index}`;
    while (usedIds.has(id)) {
      index += 1;
      id = `${prefix}${index}`;
    }
    return id;
  }

  function responsibleIdsWithExplicitSelection(current: AgendaCatalogs) {
    if (current.responsiblePersonIds.length > 0) return current.responsiblePersonIds;
    return (payload?.people ?? []).filter((person) => person.active !== false).map((person) => person.id);
  }

  async function saveCatalogs(nextCatalogs: AgendaCatalogs = catalogDraft, successMessage = "Cadastros da Agenda Viva salvos.") {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({ method: "POST", body: JSON.stringify({ action: "updateAgendaCatalogs", agendaCatalogs: nextCatalogs }) });
      if (result) setPayload(result);
      setCatalogDraft(nextCatalogs);
      setMessage(successMessage);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cadastros da Agenda Viva.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openNewCatalogItem(kind: CatalogKind) {
    const id = nextCatalogItemId(kind, catalogDraft[kind]);
    setCatalogEditor({ kind, mode: "new", item: { id, value: id, label: "", description: "", active: true, archived: false } });
  }

  function openCatalogItem(kind: CatalogKind, item: AgendaCatalogItem, mode: "view" | "edit") {
    setCatalogEditor({ kind, mode, item: { ...item } });
  }

  async function saveCatalogEditor() {
    if (!catalogEditor) return;
    const label = catalogEditor.item.label.trim();
    if (!label) {
      setError("Informe o nome do cadastro.");
      return;
    }
    const item = {
      ...catalogEditor.item,
      label,
      value: slugifyCatalogValue(catalogEditor.item.value || label),
    };
    const currentItems = catalogDraft[catalogEditor.kind];
    const nextItems = catalogEditor.mode === "new"
      ? [...currentItems, item]
      : currentItems.map((current) => current.id === item.id ? item : current);
    const nextCatalogs = { ...catalogDraft, [catalogEditor.kind]: nextItems };
    const saved = await saveCatalogs(nextCatalogs, "Cadastro salvo.");
    if (saved) setCatalogEditor(null);
  }

  function catalogItemInUse(kind: CatalogKind, item: AgendaCatalogItem) {
    return (payload?.events ?? []).some((event) => kind === "audiences" ? eventAudience(event) === item.value : eventClassification(event) === item.value);
  }

  function askToggleCatalogItem(kind: CatalogKind, item: AgendaCatalogItem) {
    const nextActive = item.active === false || item.archived === true;
    setConfirmation({
      title: nextActive ? "Ativar cadastro?" : "Inativar cadastro?",
      message: nextActive
        ? `Deseja tornar ${item.label} disponível novamente nos eventos e filtros?`
        : `Deseja inativar ${item.label}? Os eventos já cadastrados continuarão preservados.`,
      confirmLabel: nextActive ? "Ativar" : "Inativar",
      tone: nextActive ? "primary" : "warning",
      run: async () => {
        const nextItems = catalogDraft[kind].map((current) => current.id === item.id ? { ...current, active: nextActive, archived: false } : current);
        await saveCatalogs({ ...catalogDraft, [kind]: nextItems }, nextActive ? "Cadastro ativado." : "Cadastro inativado.");
      },
    });
  }

  function askDeleteCatalogItem(kind: CatalogKind, item: AgendaCatalogItem) {
    const inUse = catalogItemInUse(kind, item);
    setConfirmation({
      title: "Excluir cadastro?",
      message: inUse
        ? `${item.label} já está em uso. Para preservar os eventos existentes, ele será arquivado e inativado em vez de apagado.`
        : `Tem certeza que deseja excluir ${item.label}?`,
      confirmLabel: inUse ? "Arquivar e inativar" : "Excluir",
      tone: "danger",
      run: async () => {
        const nextItems = inUse
          ? catalogDraft[kind].map((current) => current.id === item.id ? { ...current, active: false, archived: true } : current)
          : catalogDraft[kind].filter((current) => current.id !== item.id);
        await saveCatalogs({ ...catalogDraft, [kind]: nextItems }, inUse ? "Cadastro arquivado para preservar o histórico." : "Cadastro excluído.");
      },
    });
  }

  function askToggleResponsiblePerson(person: Person) {
    const currentIds = responsibleIdsWithExplicitSelection(catalogDraft);
    const selected = currentIds.includes(person.id);
    setConfirmation({
      title: selected ? "Inativar responsável na Agenda Viva?" : "Ativar responsável na Agenda Viva?",
      message: selected
        ? `${person.full_name} deixará de aparecer como opção em novos eventos. Os registros anteriores serão preservados.`
        : `${person.full_name} voltará a aparecer como opção de responsável nos eventos.`,
      confirmLabel: selected ? "Inativar" : "Ativar",
      tone: selected ? "warning" : "primary",
      run: async () => {
        const nextIds = selected ? currentIds.filter((id) => id !== person.id) : [...currentIds, person.id];
        await saveCatalogs({ ...catalogDraft, responsiblePersonIds: nextIds }, selected ? "Responsável inativado na Agenda Viva." : "Responsável ativado na Agenda Viva.");
      },
    });
  }

  async function saveEventTypeDraft() {
    if (!eventTypeDraft.name.trim()) {
      setError("Informe o nome do tipo de atividade.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({ method: "POST", body: JSON.stringify({ action: "upsertEventType", eventType: eventTypeDraft }) });
      if (result) setPayload(result);
      setEventTypeDraft({ id: "", name: "", slug: "", description: "", requiresApproval: true, active: true, sortOrder: "" });
      setEventTypeEditorMode(null);
      setMessage("Tipo de atividade salvo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar tipo de atividade.");
    } finally {
      setSaving(false);
    }
  }


  async function toggleEventTypeActive(item: EventType) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({
        method: "POST",
        body: JSON.stringify({
          action: "upsertEventType",
          eventType: {
            id: item.id,
            name: item.name,
            slug: item.slug,
            description: item.description ?? "",
            requiresApproval: item.requires_approval,
            active: !item.active,
            sortOrder: String(item.sort_order ?? ""),
          },
        }),
      });
      if (result) setPayload(result);
      setMessage(item.active ? "Tipo de atividade inativado/arquivado." : "Tipo de atividade ativado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar tipo de atividade.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEventTypeDraft(id: string) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({ method: "POST", body: JSON.stringify({ action: "deleteEventType", eventTypeId: id }) });
      if (result) setPayload(result);
      setMessage("Tipo de atividade removido ou inativado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover tipo de atividade.");
    } finally {
      setSaving(false);
    }
  }

  function openNewEventType() {
    setEventTypeDraft({ id: "", name: "", slug: "", description: "", requiresApproval: true, active: true, sortOrder: "" });
    setEventTypeView(null);
    setEventTypeEditorMode("new");
  }

  function openEditEventType(item: EventType) {
    setEventTypeDraft({ id: item.id, name: item.name, slug: item.slug, description: item.description ?? "", requiresApproval: item.requires_approval, active: item.active, sortOrder: String(item.sort_order ?? "") });
    setEventTypeView(item);
    setEventTypeEditorMode("edit");
  }

  function openViewEventType(item: EventType) {
    setEventTypeView(item);
    setEventTypeEditorMode("view");
  }

  function askToggleEventType(item: EventType) {
    setConfirmation({
      title: item.active ? "Inativar tipo de atividade?" : "Ativar tipo de atividade?",
      message: item.active
        ? `Deseja inativar ${item.name}? Eventos já cadastrados continuarão preservados.`
        : `Deseja tornar ${item.name} disponível novamente no cadastro de eventos?`,
      confirmLabel: item.active ? "Inativar" : "Ativar",
      tone: item.active ? "warning" : "primary",
      run: () => toggleEventTypeActive(item),
    });
  }

  function askDeleteEventType(item: EventType) {
    setConfirmation({
      title: "Excluir tipo de atividade?",
      message: `${item.name} será excluído quando não estiver em uso. Se já estiver vinculado a eventos, será apenas inativado para preservar o histórico.`,
      confirmLabel: "Excluir",
      tone: "danger",
      run: () => deleteEventTypeDraft(item.id),
    });
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

  async function deleteEvent(event: AgendaEvent) {
    const eventId = event.id;
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

  async function setEventActive(event: AgendaEvent, active: boolean) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest({ method: "POST", body: JSON.stringify({ action: "setEventActive", eventId: event.id, active }) });
      if (result) setPayload(result);
      setMessage(active ? "Evento ativado e novamente disponível nas agendas." : "Evento inativado e retirado das agendas públicas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar a situação do evento.");
    } finally {
      setSaving(false);
    }
  }

  function askToggleApproval(event: AgendaEvent) {
    const approve = event.status === "reprovado";
    setConfirmation({
      title: approve ? "Alterar para Aprovado?" : "Alterar para Reprovado?",
      message: approve
        ? `Deseja alterar o evento ${event.title} de Reprovado para Aprovado?`
        : `Deseja alterar o evento ${event.title} de Aprovado para Reprovado?`,
      confirmLabel: approve ? "Aprovar" : "Reprovar",
      tone: approve ? "primary" : "warning",
      run: () => decideEvent(event.id, approve ? "approveEvent" : "rejectEvent"),
    });
  }

  function askToggleEventActive(event: AgendaEvent) {
    const active = !eventIsActive(event);
    setConfirmation({
      title: active ? "Ativar evento?" : "Inativar evento?",
      message: active
        ? `Deseja tornar ${event.title} ativo e disponível novamente nas agendas?`
        : `Deseja inativar ${event.title}? O cadastro e o histórico serão preservados, mas ele deixará de ser publicado nas agendas.`,
      confirmLabel: active ? "Ativar" : "Inativar",
      tone: active ? "primary" : "warning",
      run: () => setEventActive(event, active),
    });
  }

  function askDeleteEvent(event: AgendaEvent) {
    setConfirmation({
      title: "Excluir evento?",
      message: `Tem certeza que deseja excluir ${event.title}? Ele será removido da lista, do calendário, das aprovações e do card público do Primeiro Acesso. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir definitivamente",
      tone: "danger",
      run: () => deleteEvent(event),
    });
  }

  async function runConfirmation() {
    const action = confirmation?.run;
    setConfirmation(null);
    if (action) await action();
  }

  function eventToForm(event: AgendaEvent, options?: { duplicate?: boolean }): FormState {
    const duplicate = options?.duplicate === true;
    return {
      eventId: duplicate ? "" : event.id,
      title: duplicate ? `Cópia de ${event.title}` : event.title,
      eventTypeId: event.event_type_id ?? "",
      startsAt: metadataAnyText(event, ["localStart", "local_start", "localStartsAt", "startsAtLocal"]) || dateInputValue(event.starts_at),
      endsAt: metadataAnyText(event, ["localEnd", "local_end", "localEndsAt", "endsAtLocal"]) || dateInputValue(event.ends_at),
      allDay: event.all_day,
      isRecurring: Boolean(event.recurrence_rule) || metadataBoolean(event, "recurring"),
      recurrenceFrequency: metadataText(event, "recurrenceFrequency") || recurrenceFrequencyFromRule(event.recurrence_rule),
      recurrenceWeekday: metadataText(event, "recurrenceWeekday") || recurrenceWeekdayFromRule(event.recurrence_rule),
      allowedMonthOccurrences: allowedMonthOccurrencesFromMetadata(event.metadata),
      thursdayGroupScope: metadataStringArray(event, ["thursdayGroupScope", "thursday_group_scope"]),
      attendanceConfirmationRequired: metadataBoolean(event, "attendanceConfirmationRequired") || metadataBoolean(event, "attendance_confirmation_required"),
      allowOptionalEntityAppointment: metadataBoolean(event, "allowOptionalEntityAppointment") || metadataBoolean(event, "allow_optional_entity_appointment"),
      overrideRegularGroupSchedule: metadataBoolean(event, "overrideRegularGroupSchedule") || metadataBoolean(event, "override_regular_group_schedule"),
      locationId: event.location_id || metadataText(event, "location_id"),
      location: event.location ?? "",
      audience: eventAudience(event),
      eventClassification: eventClassification(event),
      eventCollection: eventCollection(event),
      sementinhaEventType: sementinhaEventType(event),
      specialEventType: specialEventType(event),
      groupSlug: event.group_slug ?? "",
      responsiblePersonId: event.responsible_person_id ?? "",
      notes: event.notes ?? "",
      imageUrl: eventImageUrl(event),
      imageAlt: eventImageAlt(event),
      imageEmoji: eventEmoji(event),
      highlightVisual: event.metadata?.highlight_visual !== false,
      continuesDuringVacation: continuesDuringVacation(event),
      firstAccessEnabled: firstAccessEnabledFor(event),
      firstAccessOrder: String(firstAccessOrderFor(event) === Number.MAX_SAFE_INTEGER ? "" : firstAccessOrderFor(event)),
      firstAccessSummary: metadataText(event, "firstAccessSummary") || metadataText(event, "first_access_summary"),
      requiresApproval: event.requires_approval,
    };
  }

  function editEvent(event: AgendaEvent) {
    setForm(eventToForm(event));
    setModalTitle("Editar evento");
    setModalOpen(true);
  }

  function duplicateEvent(event: AgendaEvent) {
    setForm(eventToForm(event, { duplicate: true }));
    setModalTitle("Duplicar evento");
    setMessage("Revise a cópia do evento e salve para criar um novo registro.");
    setError("");
    setApprovalWhatsappUrl("");
    setModalOpen(true);
  }

  function newEvent() {
    setForm(emptyForm);
    setModalTitle("Novo evento");
    setModalOpen(true);
  }

  const events = useMemo(() => sortedEvents(payload?.events ?? []), [payload?.events]);
  const firstAccessPreviewEvents = useMemo(() => firstAccessSortedEvents(payload?.events ?? []), [payload?.events]);
  const pendingEvents = useMemo(() => (payload?.events ?? []).filter((event) => event.status === "pendente_aprovacao"), [payload?.events]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    const filtered = events.filter((event) => {
      const classification = eventClassification(event);
      const text = normalizeText(`${event.title} ${event.location ?? ""} ${event.group_slug ?? ""} ${event.event_type ?? ""} ${eventClassificationLabel(classification)}`);
      if (normalizedQuery && !text.includes(normalizedQuery)) return false;
      if (statusFilter !== "todos" && event.status !== statusFilter) return false;
      if (classificationFilter !== "todos" && classification !== classificationFilter) return false;
      if (collectionFilter !== "todos" && eventCollection(event) !== collectionFilter) return false;
      return true;
    });

    return [...filtered].sort((left, right) => {
      if (eventSortOrder === "alphabetical") return left.title.localeCompare(right.title, "pt-BR", { sensitivity: "base" });
      const leftDate = toComparableDate(eventLocalStart(left))?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDate = toComparableDate(eventLocalStart(right))?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (leftDate !== rightDate) return leftDate - rightDate;
      return left.title.localeCompare(right.title, "pt-BR", { sensitivity: "base" });
    });
  }, [classificationFilter, collectionFilter, eventSortOrder, events, query, statusFilter]);

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
      if (calendarCollection !== "todos" && eventCollection(event) !== calendarCollection) return false;
      if (calendarPersonId && event.responsible_person_id !== calendarPersonId && event.created_by_person_id !== calendarPersonId) return false;
      return true;
    });
  }, [calendarAudience, calendarClassification, calendarCollection, calendarEventType, calendarPersonId, calendarRange, events, periodEnd, periodStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    const vacationKeys = vacationKeysForYear(events, year);
    for (const event of calendarEvents) {
      for (const key of occurrenceKeysForYear(event, year)) {
        if (!isVacationEvent(event) && isUmbandaEvent(event) && !continuesDuringVacation(event) && vacationKeys.has(key)) continue;
        const list = map.get(key) ?? [];
        list.push(event);
        map.set(key, list);
      }
    }
    return map;
  }, [calendarEvents, events, year]);

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
              <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Eventos</p>
                    <h2 className="mt-2 text-2xl font-black text-[#00334E]">Lista de eventos cadastrados</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">A lista mostra somente o essencial. Use Visualizar ou Editar para consultar as demais informações.</p>
                  </div>
                  <AdminActionButton onClick={newEvent} tone="primary" className="w-full sm:w-auto">Novo evento</AdminActionButton>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-2xl border border-slate-200 p-3 md:col-span-2 xl:col-span-1" placeholder="Buscar por nome, local ou tipo" />
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <select value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todas as classificações</option>{classificationOptions(payload).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  <select value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todas as coleções</option><option value="eventos-tucxa">Somente Eventos do TUCXA</option></select>
                  <label className="grid gap-1">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ordenar por</span>
                    <select value={eventSortOrder} onChange={(event) => setEventSortOrder(event.target.value as "start" | "alphabetical")} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <option value="start">Data de início</option>
                      <option value="alphabetical">Ordem alfabética</option>
                    </select>
                  </label>
                </div>
              </section>
              <section className="grid gap-3">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    payload={payload}
                    onView={setViewEvent}
                    onEdit={editEvent}
                    onDuplicate={duplicateEvent}
                    onDelete={askDeleteEvent}
                    onToggleApproval={askToggleApproval}
                    onToggleActive={askToggleEventActive}
                  />
                ))}
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
                  <select value={calendarAudience} onChange={(event) => setCalendarAudience(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="all">Todos os públicos</option>{audienceOptions(payload).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  <select value={calendarClassification} onChange={(event) => setCalendarClassification(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todas as classificações</option>{classificationOptions(payload).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                  <select value={calendarCollection} onChange={(event) => setCalendarCollection(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="todos">Todas as coleções</option><option value="eventos-tucxa">Somente Eventos do TUCXA</option></select>
                  <select value={calendarPersonId} onChange={(event) => setCalendarPersonId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Sem filtro por pessoa</option>{responsiblePeople(payload).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select>
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
                <div className="bg-[#eef8d6] px-3 pt-3 sm:px-5 sm:pt-5"><TucxaCalendarLegend /></div>
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
                              <div key={cell.key} className={`min-h-12 rounded-xl p-1 text-center ring-1 sm:min-h-16 ${cell.day ? dayEvents.length > 0 ? `${colorFor(dayEvents[0], payload.eventTypes)} border-2` : "bg-[#fbffe7] ring-lime-100" : "bg-transparent ring-transparent"}`}>
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
              <section className="grid gap-4 lg:grid-cols-2">{calendarEvents.map((event) => <EventCard key={event.id} event={event} payload={payload} onEdit={editEvent} onDuplicate={duplicateEvent} />)}{calendarEvents.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhum evento encontrado com os filtros selecionados.</p>}</section>
            </div>
          )}



          {mode === "cadastros" && (
            <div className="grid gap-5">
              <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Cadastros auxiliares</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Listas usadas no formulário de eventos</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Cada lista mostra somente o essencial. Use Visualizar ou Editar para abrir as informações completas.</p>
              </section>

              <section className="grid gap-4">
                <article className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#00334E]">Tipo de atividade</h3>
                      <p className="mt-1 text-sm text-slate-600">Tipos disponíveis no cadastro e nos filtros da Agenda Viva.</p>
                    </div>
                    <AdminActionButton onClick={openNewEventType} tone="primary" className="w-full sm:w-auto">Novo tipo</AdminActionButton>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {payload.eventTypes.map((item) => (
                      <CompactAdminRow
                        key={item.id}
                        icon="🏷️"
                        title={item.name}
                        subtitle={item.slug}
                        status={<AdminStatusBadge active={item.active !== false}>{item.active === false ? "Inativo" : "Ativo"}</AdminStatusBadge>}
                        actions={
                          <>
                            <AdminActionButton onClick={() => openViewEventType(item)}>Visualizar</AdminActionButton>
                            <AdminActionButton onClick={() => openEditEventType(item)} tone="primary">Editar</AdminActionButton>
                            <AdminActionButton onClick={() => askToggleEventType(item)} tone={item.active ? "warning" : "success"}>{item.active ? "Inativar" : "Ativar"}</AdminActionButton>
                            <AdminActionButton onClick={() => askDeleteEventType(item)} tone="danger">Excluir</AdminActionButton>
                          </>
                        }
                      />
                    ))}
                    {payload.eventTypes.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhum tipo de atividade cadastrado.</p>}
                  </div>
                </article>

                {(["audiences", "classifications"] as const).map((kind) => (
                  <article key={kind} className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-xl font-black text-[#00334E]">{kind === "audiences" ? "Público do evento" : "Classificação do evento"}</h3>
                        <p className="mt-1 text-sm text-slate-600">Opções usadas nos eventos, filtros e calendários.</p>
                      </div>
                      <AdminActionButton onClick={() => openNewCatalogItem(kind)} tone="primary" className="w-full sm:w-auto">Incluir</AdminActionButton>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {catalogDraft[kind].map((item) => (
                        <CompactAdminRow
                          key={item.id}
                          icon={kind === "audiences" ? "👥" : "🗂️"}
                          title={item.label}
                          subtitle={item.value}
                          status={<AdminStatusBadge active={item.active !== false && item.archived !== true}>{item.archived ? "Arquivado" : item.active === false ? "Inativo" : "Ativo"}</AdminStatusBadge>}
                          actions={
                            <>
                              <AdminActionButton onClick={() => openCatalogItem(kind, item, "view")}>Visualizar</AdminActionButton>
                              <AdminActionButton onClick={() => openCatalogItem(kind, item, "edit")} tone="primary">Editar</AdminActionButton>
                              <AdminActionButton onClick={() => askToggleCatalogItem(kind, item)} tone={item.active !== false && item.archived !== true ? "warning" : "success"}>{item.active !== false && item.archived !== true ? "Inativar" : "Ativar"}</AdminActionButton>
                              <AdminActionButton onClick={() => askDeleteCatalogItem(kind, item)} tone="danger">Excluir</AdminActionButton>
                            </>
                          }
                        />
                      ))}
                    </div>
                  </article>
                ))}

                <article className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#00334E]">Responsáveis</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">O cadastro completo da pessoa continua na Base Única. Aqui você define se ela aparece como responsável na Agenda Viva.</p>
                    </div>
                    <Link href="/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#00334E] px-4 py-2 text-sm font-black text-white">Abrir Base Única</Link>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {payload.people.filter((person) => person.active !== false).map((person) => {
                      const explicitIds = responsibleIdsWithExplicitSelection(catalogDraft);
                      const selected = explicitIds.includes(person.id);
                      return (
                        <CompactAdminRow
                          key={person.id}
                          icon="🙋"
                          title={person.full_name}
                          subtitle={person.email || person.whatsapp || "Sem contato informado"}
                          status={<AdminStatusBadge active={selected}>{selected ? "Ativo na Agenda" : "Inativo na Agenda"}</AdminStatusBadge>}
                          actions={
                            <>
                              <AdminActionButton onClick={() => setResponsibleView(person)}>Visualizar</AdminActionButton>
                              <AdminActionButton onClick={() => askToggleResponsiblePerson(person)} tone={selected ? "warning" : "success"}>{selected ? "Inativar" : "Ativar"}</AdminActionButton>
                              <Link href="/solucoes/organizacao-em-harmonia/cliente/base-unica/envolvidos" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#00334E] px-3 py-2 text-sm font-black text-white">Editar na Base Única</Link>
                            </>
                          }
                        />
                      );
                    })}
                  </div>
                </article>
              </section>
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
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#00334E]">Antecedência mínima para editar agendamento</span>
                  <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <input
                      value={String(Math.round(settingsForm.appointmentEditCutoffMinutes / 60))}
                      onChange={(event) => updateSetting("appointmentEditCutoffMinutes", Math.max(0, Number(event.target.value.replace(/\D/g, "") || 0)) * 60)}
                      className="min-w-0 p-3 outline-none"
                      inputMode="numeric"
                      aria-label="Antecedência mínima em horas"
                    />
                    <span className="flex items-center bg-slate-50 px-4 text-sm font-black text-slate-600">horas</span>
                  </div>
                  <span className="text-xs font-semibold leading-5 text-slate-500">Após esse prazo, o Consulente ainda poderá excluir o agendamento, mas não remarcar.</span>
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

          <EventModal open={modalOpen} title={modalTitle} onClose={() => !saving && setModalOpen(false)}>
            <AgendaEventForm form={form} payload={payload} saving={saving} onCancel={() => setModalOpen(false)} onImageFile={onImageFile} onSave={saveEvent} update={update} />
          </EventModal>

          <AdminModal open={Boolean(viewEvent)} title={viewEvent?.title ?? "Visualizar evento"} eyebrow="Agenda Viva" onClose={() => setViewEvent(null)}>
            {viewEvent && <EventDetails event={viewEvent} payload={payload} />}
          </AdminModal>

          <AdminModal
            open={eventTypeEditorMode === "new" || eventTypeEditorMode === "edit"}
            title={eventTypeEditorMode === "edit" ? "Editar tipo de atividade" : "Novo tipo de atividade"}
            eyebrow="Agenda Viva — Cadastros"
            onClose={() => !saving && setEventTypeEditorMode(null)}
          >
            <div className="grid gap-4">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Nome *</span><input value={eventTypeDraft.name} onChange={(event) => setEventTypeDraft((current) => ({ ...current, name: event.target.value, slug: current.slug || slugifyCatalogValue(event.target.value) }))} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Código interno</span><input value={eventTypeDraft.slug} onChange={(event) => setEventTypeDraft((current) => ({ ...current, slug: slugifyCatalogValue(event.target.value) }))} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Descrição</span><textarea value={eventTypeDraft.description} onChange={(event) => setEventTypeDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-28 rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Ordem</span><input value={eventTypeDraft.sortOrder} onChange={(event) => setEventTypeDraft((current) => ({ ...current, sortOrder: event.target.value.replace(/\D/g, "") }))} className="rounded-2xl border border-slate-200 p-3" inputMode="numeric" /></label>
              <label className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100"><input type="checkbox" checked={eventTypeDraft.requiresApproval} onChange={(event) => setEventTypeDraft((current) => ({ ...current, requiresApproval: event.target.checked }))} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Exige aprovação</span></label>
              <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={eventTypeDraft.active} onChange={(event) => setEventTypeDraft((current) => ({ ...current, active: event.target.checked }))} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Ativo</span></label>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><AdminActionButton onClick={() => setEventTypeEditorMode(null)} disabled={saving}>Cancelar</AdminActionButton><AdminActionButton onClick={saveEventTypeDraft} disabled={saving || !eventTypeDraft.name.trim()} tone="primary">{saving ? "Salvando..." : "Salvar tipo"}</AdminActionButton></div>
            </div>
          </AdminModal>

          <AdminModal open={eventTypeEditorMode === "view"} title={eventTypeView?.name ?? "Visualizar tipo"} eyebrow="Agenda Viva — Cadastros" onClose={() => setEventTypeEditorMode(null)}>
            {eventTypeView && <AdminDetailGrid><AdminDetailItem label="Código interno">{eventTypeView.slug}</AdminDetailItem><AdminDetailItem label="Situação">{eventTypeView.active ? "Ativo" : "Inativo"}</AdminDetailItem><AdminDetailItem label="Exige aprovação">{eventTypeView.requires_approval ? "Sim" : "Não"}</AdminDetailItem><AdminDetailItem label="Ordem">{eventTypeView.sort_order}</AdminDetailItem><AdminDetailItem label="Descrição" full>{eventTypeView.description || "Nenhuma descrição cadastrada"}</AdminDetailItem></AdminDetailGrid>}
          </AdminModal>

          <AdminModal
            open={Boolean(catalogEditor)}
            title={catalogEditor ? `${catalogEditor.mode === "view" ? "Visualizar" : catalogEditor.mode === "new" ? "Incluir" : "Editar"} ${catalogEditor.kind === "audiences" ? "público" : "classificação"}` : "Cadastro"}
            eyebrow="Agenda Viva — Cadastros"
            onClose={() => !saving && setCatalogEditor(null)}
          >
            {catalogEditor && catalogEditor.mode === "view" ? (
              <AdminDetailGrid><AdminDetailItem label="Nome">{catalogEditor.item.label}</AdminDetailItem><AdminDetailItem label="Código interno">{catalogEditor.item.value}</AdminDetailItem><AdminDetailItem label="Situação">{catalogEditor.item.archived ? "Arquivado" : catalogEditor.item.active ? "Ativo" : "Inativo"}</AdminDetailItem><AdminDetailItem label="Descrição" full>{catalogEditor.item.description || "Nenhuma descrição cadastrada"}</AdminDetailItem></AdminDetailGrid>
            ) : catalogEditor ? (
              <div className="grid gap-4">
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Nome *</span><input value={catalogEditor.item.label} onChange={(event) => setCatalogEditor((current) => current ? { ...current, item: { ...current.item, label: event.target.value, value: current.mode === "new" ? slugifyCatalogValue(event.target.value) : current.item.value } } : current)} className="rounded-2xl border border-slate-200 p-3" /></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Código interno</span><input value={catalogEditor.item.value} onChange={(event) => setCatalogEditor((current) => current ? { ...current, item: { ...current.item, value: slugifyCatalogValue(event.target.value) } } : current)} className="rounded-2xl border border-slate-200 p-3" /></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Descrição</span><textarea value={catalogEditor.item.description ?? ""} onChange={(event) => setCatalogEditor((current) => current ? { ...current, item: { ...current.item, description: event.target.value } } : current)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
                <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={catalogEditor.item.active} onChange={(event) => setCatalogEditor((current) => current ? { ...current, item: { ...current.item, active: event.target.checked, archived: event.target.checked ? false : current.item.archived } } : current)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Ativo</span></label>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><AdminActionButton onClick={() => setCatalogEditor(null)} disabled={saving}>Cancelar</AdminActionButton><AdminActionButton onClick={saveCatalogEditor} disabled={saving || !catalogEditor.item.label.trim()} tone="primary">{saving ? "Salvando..." : "Salvar"}</AdminActionButton></div>
              </div>
            ) : null}
          </AdminModal>

          <AdminModal open={Boolean(responsibleView)} title={responsibleView?.full_name ?? "Visualizar responsável"} eyebrow="Agenda Viva — Responsável" onClose={() => setResponsibleView(null)}>
            {responsibleView && <AdminDetailGrid><AdminDetailItem label="Nome">{responsibleView.full_name}</AdminDetailItem><AdminDetailItem label="Situação na Base Única">{responsibleView.active === false ? "Inativo" : "Ativo"}</AdminDetailItem><AdminDetailItem label="E-mail">{responsibleView.email || "Não informado"}</AdminDetailItem><AdminDetailItem label="WhatsApp">{responsibleView.whatsapp || "Não informado"}</AdminDetailItem></AdminDetailGrid>}
          </AdminModal>

          <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title ?? "Confirmar ação"} message={confirmation?.message ?? ""} confirmLabel={confirmation?.confirmLabel} tone={confirmation?.tone} busy={saving} onCancel={() => setConfirmation(null)} onConfirm={runConfirmation} />
        </>
      )}
    </OrganizacaoClientShell>
  );
}
