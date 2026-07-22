import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type AgendaOption = {
  slug: string;
  label: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  recurrenceLabel: string;
  locationLabel?: string;
  description: string;
};

type AgendaEventRecord = {
  id?: string | null;
  title?: string | null;
  name?: string | null;
  event_type?: string | null;
  location_id?: string | null;
  location?: string | null;
  group_slug?: string | null;
  starts_at?: string | null;
  start_at?: string | null;
  start_date?: string | null;
  ends_at?: string | null;
  end_at?: string | null;
  end_date?: string | null;
  all_day?: boolean | null;
  recurrence_rule?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

type LocationRecord = {
  id: string;
  name: string | null;
  active?: boolean | null;
};


const fallbackOptions: AgendaOption[] = [
  {
    slug: "atendimento-segunda",
    title: "Atendimento aos filhos de fora — Segunda-feira",
    label: "Atendimento aos filhos de fora — Segunda-feira",
    recurrenceLabel: "Recorrência semanal",
    dateLabel: "Segunda-feira",
    timeLabel: "18h às 22h",
    locationLabel: "TUCXA",
    description: "Recorrência semanal • Segunda-feira • 18h às 22h Local: TUCXA",
  },
  {
    slug: "atendimento-terca",
    title: "Atendimento aos filhos de fora — Terça-feira",
    label: "Atendimento aos filhos de fora — Terça-feira",
    recurrenceLabel: "Recorrência semanal",
    dateLabel: "Terça-feira",
    timeLabel: "18h às 22h",
    locationLabel: "TUCXA",
    description: "Recorrência semanal • Terça-feira • 18h às 22h Local: TUCXA",
  },
  {
    slug: "tratamento-transformacao-quarta",
    title: "Tratamento espiritual / Transformação — Quarta-feira",
    label: "Tratamento espiritual / Transformação — Quarta-feira",
    recurrenceLabel: "Conforme encaminhamento",
    dateLabel: "Quarta-feira",
    timeLabel: "18h30 às 22h",
    locationLabel: "TUCXA",
    description: "Conforme encaminhamento • Quarta-feira • 18h30 às 22h Local: TUCXA",
  },
  {
    slug: "quinta-grupo-1",
    title: "Quinta - Grupo 1",
    label: "Quinta - Grupo 1",
    recurrenceLabel: "1ª e 3ª quinta-feira do mês",
    dateLabel: "Quinta-feira",
    timeLabel: "18h às 22h",
    locationLabel: "TUCXA",
    description: "1ª e 3ª quinta-feira do mês • Quinta-feira • 18h às 22h Local: TUCXA",
  },
  {
    slug: "quinta-grupo-2",
    title: "Quinta - Grupo 2",
    label: "Quinta - Grupo 2",
    recurrenceLabel: "2ª e 4ª quinta-feira do mês",
    dateLabel: "Quinta-feira",
    timeLabel: "18h às 22h",
    locationLabel: "TUCXA",
    description: "2ª e 4ª quinta-feira do mês • Quinta-feira • 18h às 22h Local: TUCXA",
  },
  {
    slug: "grupo-estudos",
    title: "Grupo de Estudos",
    label: "Grupo de Estudos",
    recurrenceLabel: "A cada 15 dias, conforme datas confirmadas",
    dateLabel: "Domingo",
    timeLabel: "15h às 17h",
    locationLabel: "TUCXA",
    description: "A cada 15 dias • Domingos conforme datas confirmadas pelos coordenadores • 15h às 17h Local: TUCXA",
  },
  {
    slug: "caminhada-tucxa",
    title: "Caminhada TUCXA",
    label: "Caminhada TUCXA",
    recurrenceLabel: "Evento pontual",
    dateLabel: "Sábado, 11/07/2026",
    timeLabel: "16h às 17h",
    locationLabel: "A confirmar",
    description: "Evento pontual • Sábado, 11/07/2026 • 16h às 17h Local: A confirmar",
  },
  {
    slug: "dia-do-filme",
    title: "Dia do Filme",
    label: "Dia do Filme",
    recurrenceLabel: "Evento pontual",
    dateLabel: "Quinta-feira, 16/07/2026",
    timeLabel: "19h às 21h",
    locationLabel: "TUCXA",
    description: "Evento pontual • Quinta-feira, 16/07/2026 • 19h às 21h Local: TUCXA",
  },
  {
    slug: "mostra-cultural-clube-livro",
    title: "Mostra Cultural e Clube do Livro",
    label: "Mostra Cultural e Clube do Livro",
    recurrenceLabel: "Evento pontual",
    dateLabel: "Terça-feira, 21/07/2026",
    timeLabel: "19h às 21h",
    locationLabel: "TUCXA",
    description: "Evento pontual • Terça-feira, 21/07/2026 • 19h às 21h Local: TUCXA",
  },
  {
    slug: "clube-livro-extra",
    title: "Clube do Livro Extra",
    label: "Clube do Livro Extra",
    recurrenceLabel: "Evento pontual",
    dateLabel: "Sexta-feira, 31/07/2026",
    timeLabel: "19h às 21h",
    locationLabel: "TUCXA",
    description: "Evento pontual • Sexta-feira, 31/07/2026 • 19h às 21h Local: Online",
  },
  {
    slug: "clube-livro-mensal",
    title: "Clube do Livro Mensal",
    label: "Clube do Livro Mensal",
    recurrenceLabel: "Recorrência mensal, toda última sexta-feira do mês",
    dateLabel: "Última sexta-feira do mês",
    timeLabel: "19h às 20h30",
    locationLabel: "TUCXA",
    description: "Recorrência mensal • Última sexta-feira do mês • 19h às 20h30 Local: TUCXA",
  },
  {
    slug: "voluntario-sementinha",
    title: "Voluntário Sementinha",
    label: "Voluntário Sementinha",
    recurrenceLabel: "Conforme calendário",
    dateLabel: "Data a definir",
    timeLabel: "Horário a definir",
    locationLabel: "A definir",
    description: "Conforme calendário • Data a definir • Horário a definir Local: A definir",
  },
  {
    slug: "encerramento-anual",
    title: "Encerramento Anual",
    label: "Encerramento Anual",
    recurrenceLabel: "Evento pontual",
    dateLabel: "Domingo, 20/12/2026",
    timeLabel: "Horário a definir",
    locationLabel: "A definir",
    description: "Evento pontual • Domingo, 20/12/2026 • Horário a definir Local: A definir",
  },
];

const dayOrder: Record<string, number> = {
  domingo: 0,
  sunday: 0,
  segunda: 1,
  "segunda-feira": 1,
  monday: 1,
  terca: 2,
  terça: 2,
  "terca-feira": 2,
  "terça-feira": 2,
  tuesday: 2,
  quarta: 3,
  "quarta-feira": 3,
  wednesday: 3,
  quinta: 4,
  "quinta-feira": 4,
  thursday: 4,
  sexta: 5,
  "sexta-feira": 5,
  friday: 5,
  sabado: 6,
  sábado: 6,
  saturday: 6,
};

const weekdayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];


function capitalizeLabel(value: string) {
  const text = value.trim();
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);
}

function normalizeHourText(value: string) {
  return value.replace(/\b0?(\d{1,2})h00\b/g, "$1h");
}

function formatFirstAccessDescription(recurrence: string, dateLabel: string, timeLabel: string, location: string) {
  const detailLine = [recurrence, dateLabel, timeLabel].filter(Boolean).join(" • ");
  return `${detailLine} Local: ${location}`;
}

function weekdayLabelFromIndex(value: number) {
  return value >= 0 && value <= 6 ? weekdayNames[value] : "";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseLocalDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) return null;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour = "00", minute = "00"] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute) };
}

function eventLocalDate(event: AgendaEventRecord, kind: "start" | "end") {
  const metadata = event.metadata ?? null;
  const explicit = metadataValue(metadata, kind === "start" ? ["localStart", "local_start", "localStartsAt", "startsAtLocal"] : ["localEnd", "local_end", "localEndsAt", "endsAtLocal"]);
  if (explicit) return explicit;
  return kind === "start"
    ? event.starts_at ?? event.start_at ?? event.start_date ?? ""
    : event.ends_at ?? event.end_at ?? event.end_date ?? "";
}

function asBoolean(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1" || value === "sim";
}

function metadataText(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return "";

  return Object.entries(metadata)
    .map(([key, value]) => `${key} ${typeof value === "string" ? value : Array.isArray(value) ? value.join(" ") : ""}`)
    .join(" ");
}
function metadataValue(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return "";
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function metadataNumber(metadata: Record<string, unknown> | null | undefined, keys: string[], fallback = Number.MAX_SAFE_INTEGER) {
  if (!metadata) return fallback;
  for (const key of keys) {
    const value = metadata[key];
    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
  }
  return fallback;
}

function metadataBooleanValue(metadata: Record<string, unknown> | null | undefined, keys: string[], fallback: boolean) {
  if (!metadata) return fallback;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(metadata, key)) return asBoolean(metadata[key]);
  }
  return fallback;
}


function labelForEvent(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  return metadataValue(metadata, ["displayTitle", "tituloExibicao", "publicTitle"]) || event.title || event.name || event.event_type || event.group_slug || "Atividade";
}

function startsAt(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  const local = parseLocalDateTime(eventLocalDate(event, "start"));
  if (local) return new Date(`${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}T${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}:00-03:00`);
  return parseDate(event.starts_at) ?? parseDate(event.start_at) ?? parseDate(event.start_date) ?? parseDate(metadata?.startsAt) ?? parseDate(metadata?.startAt) ?? parseDate(metadata?.startDate) ?? parseDate(metadata?.dataInicio);
}

function endsAt(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  const local = parseLocalDateTime(eventLocalDate(event, "end"));
  if (local) return new Date(`${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}T${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}:00-03:00`);
  return parseDate(event.ends_at) ?? parseDate(event.end_at) ?? parseDate(event.end_date) ?? parseDate(metadata?.endsAt) ?? parseDate(metadata?.endAt) ?? parseDate(metadata?.endDate) ?? parseDate(metadata?.fim) ?? parseDate(metadata?.dataFim);
}

function recurrenceFrequency(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  const raw = metadata?.recurrenceFrequency ?? metadata?.periodicity ?? metadata?.periodicidade ?? metadata?.frequencia;
  return typeof raw === "string" ? normalize(raw) : "";
}

function isRecurringEvent(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  const status = normalize(event.status ?? "");
  return (
    status.includes("recorrente") ||
    status.includes("recurring") ||
    asBoolean(metadata?.recurring) ||
    asBoolean(metadata?.recorrente) ||
    Boolean(event.recurrence_rule) ||
    typeof metadata?.recurrenceRule === "string" ||
    typeof metadata?.rrule === "string" ||
    Boolean(recurrenceFrequency(event))
  );
}

function isoDateInSaoPaulo(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function todayIsoInSaoPaulo() {
  return isoDateInSaoPaulo(new Date());
}

function hasEnded(event: AgendaEventRecord, todayIso: string) {
  const endDate = endsAt(event);
  const startDate = startsAt(event);
  if (!endDate && isRecurringEvent(event)) return false;

  const comparisonDate = endDate ?? startDate;
  if (!comparisonDate) return false;

  return isoDateInSaoPaulo(comparisonDate) < todayIso;
}

function fallbackOptionHasEnded(option: AgendaOption, todayIso: string) {
  if (normalize(option.recurrenceLabel).includes("recorrencia")) return false;
  const match = option.dateLabel.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return false;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}` < todayIso;
}

function availableFallbackOptions(todayIso: string) {
  return fallbackOptions.filter((option) => !fallbackOptionHasEnded(option, todayIso));
}

function isVacationOrRecess(event: AgendaEventRecord) {
  const label = labelForEvent(event);
  const text = normalize(`${label} ${event.group_slug ?? ""} ${event.event_type ?? ""} ${metadataText(event.metadata)}`);

  return text.includes("ferias") || text.includes("recesso");
}

function isMandatoryForAllFilhos(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;

  if (
    asBoolean(metadata?.mandatoryForAll) ||
    asBoolean(metadata?.requiredForAll) ||
    asBoolean(metadata?.requiredForAllFilhosDaCorrente) ||
    asBoolean(metadata?.todosFilhosCorrente) ||
    asBoolean(metadata?.allFilhosDaCorrente) ||
    asBoolean(metadata?.hideFromFirstAccess)
  ) {
    return true;
  }

  const audience = metadata?.audience ?? metadata?.publico ?? metadata?.targetAudience;
  if (typeof audience === "string") {
    const normalizedAudience = normalize(audience);
    if (normalizedAudience.includes("todos") && normalizedAudience.includes("filhos")) return true;
  }

  if (Array.isArray(audience)) {
    const normalizedAudience = normalize(audience.join(" "));
    if (normalizedAudience.includes("todos") && normalizedAudience.includes("filhos")) return true;
  }

  const label = labelForEvent(event);
  const text = normalize(`${label} ${event.group_slug ?? ""} ${event.event_type ?? ""} ${metadataText(metadata)}`);

  return (
    text.includes("todos os filhos") ||
    text.includes("todos filhos") ||
    text.includes("todos os filhos da corrente") ||
    text.includes("obrigatorio") ||
    text.includes("obrigatoria") ||
    text.includes("reuniao geral") ||
    text.includes("encontro geral") ||
    text.includes("retorno das ferias") ||
    text.includes("volta das ferias") ||
    text.includes("cavalinhos e cambonos")
  );
}

function hasExplicitFirstAccessEnabled(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  if (!metadata) return false;
  const keys = ["firstAccessEnabled", "first_access_enabled", "showOnFirstAccess", "show_on_first_access", "displayOnFirstAccess"];
  return keys.some((key) => Object.prototype.hasOwnProperty.call(metadata, key) && asBoolean(metadata[key]));
}

function isDisabledForFirstAccess(event: AgendaEventRecord) {
  return !metadataBooleanValue(event.metadata, ["firstAccessEnabled", "first_access_enabled", "showOnFirstAccess", "show_on_first_access", "displayOnFirstAccess"], true);
}

function firstAccessOrder(event: AgendaEventRecord) {
  return metadataNumber(event.metadata, ["firstAccessOrder", "first_access_order", "agendaOrder", "agenda_order", "displayOrder", "sortOrder"]);
}

function weekdayFromText(value: string) {
  const normalized = normalize(value);
  const orderedDays = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const match = orderedDays.find((day) => normalized.includes(day));
  return match ? dayOrder[match] : 99;
}

function weekdayFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return 99;

  const raw = metadata.weekday ?? metadata.dayOfWeek ?? metadata.diaSemana ?? metadata.dia_da_semana;
  if (typeof raw === "number") return raw >= 0 && raw <= 6 ? raw : 99;
  if (typeof raw === "string") {
    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && asNumber >= 0 && asNumber <= 6) return asNumber;
    return dayOrder[normalize(raw)] ?? 99;
  }

  return 99;
}

function weekdayFromRule(rule: string | null | undefined) {
  if (!rule) return 99;
  const normalized = rule.toUpperCase();
  const match = normalized.match(/BYDAY=([^;]+)/);
  const value = match?.[1]?.split(",")[0] ?? "";
  const days: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  return days[value] ?? 99;
}

function weekdayForEvent(event: AgendaEventRecord) {
  const start = startsAt(event);
  const fromStart = start ? start.getDay() : 99;
  return Math.min(
    weekdayFromMetadata(event.metadata),
    weekdayFromRule(event.recurrence_rule),
    weekdayFromText(`${labelForEvent(event)} ${event.group_slug ?? ""} ${event.event_type ?? ""} ${metadataText(event.metadata)}`),
    fromStart,
  );
}

function sortDateValue(event: AgendaEventRecord) {
  const startDate = startsAt(event);
  return startDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function sortWeight(event: AgendaEventRecord) {
  const label = labelForEvent(event);
  return { order: firstAccessOrder(event), dateValue: sortDateValue(event), weekday: weekdayForEvent(event), label: label.toLocaleLowerCase("pt-BR") };
}

function formatDateLabel(event: AgendaEventRecord) {
  const explicit = metadataValue(event.metadata, ["dateLabel", "dataLabel", "publicDateLabel"]);
  if (explicit) return capitalizeLabel(explicit);

  if (isRecurringEvent(event)) {
    const weekday = weekdayForEvent(event);
    const weekdayLabel = weekdayLabelFromIndex(weekday);
    if (weekdayLabel) return weekdayLabel;
  }

  const startDate = startsAt(event);
  if (startDate) {
    return capitalizeLabel(startDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }));
  }

  const weekday = weekdayForEvent(event);
  const weekdayLabel = weekdayLabelFromIndex(weekday);
  if (weekdayLabel) return weekdayLabel;

  return "Data a definir";
}

function formatHour(value: Date | null) {
  if (!value) return "";
  const parts = value.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).split(":");
  const hour = Number(parts[0]);
  const minute = parts[1] ?? "00";
  return minute === "00" ? `${hour}h` : `${hour}h${minute}`;
}

function formatTimeLabel(event: AgendaEventRecord) {
  const explicit = metadataValue(event.metadata, ["timeLabel", "horarioLabel", "publicTimeLabel"]);
  if (explicit) return normalizeHourText(explicit);
  if (asBoolean(event.metadata?.timeUndefined) || asBoolean(event.metadata?.horarioAdefinir)) return "Horário a definir";
  if (event.all_day) return "Dia inteiro";
  const start = startsAt(event);
  const end = endsAt(event);
  const startHour = formatHour(start);
  const endHour = formatHour(end);

  if (startHour && endHour) return `${startHour} às ${endHour}`;
  if (startHour) return `A partir de ${startHour}`;
  return "Horário a definir";
}

function recurrenceLabel(event: AgendaEventRecord) {
  if (!isRecurringEvent(event)) return "Evento pontual";

  const metadata = event.metadata ?? null;
  const explicit = metadata?.recurrenceLabel ?? metadata?.recorrenciaLabel ?? metadata?.periodicityLabel ?? metadata?.periodicidadeLabel ?? metadata?.publicRecurrenceLabel;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();

  const frequency = recurrenceFrequency(event);
  if (frequency.includes("quinzen")) return "Recorrência quinzenal";
  if (frequency.includes("mensal") || frequency.includes("month")) return "Recorrência mensal";
  if (frequency.includes("semanal") || frequency.includes("weekly") || event.recurrence_rule?.toUpperCase().includes("FREQ=WEEKLY")) return "Recorrência semanal";

  return "Recorrente";
}


function locationLabel(event: AgendaEventRecord, locations: LocationRecord[]) {
  const metadata = event.metadata ?? null;

  // Prioriza a localidade cadastrada vinculada ao evento. Campos livres/legados
  // como metadata.local ou event.location podem conter textos antigos (ex.: "Tucxa")
  // e não devem sobrescrever a localidade escolhida na edição (ex.: "Tucxa1").
  const locationId = event.location_id || metadataValue(metadata, ["location_id", "localidade_id"]);
  if (locationId) {
    const location = locations.find((item) => item.id === locationId);
    if (location?.name) return location.name;
  }

  const explicit = metadataValue(metadata, ["locationLabel", "location_name", "localidade", "local"]);
  if (explicit) return explicit;

  if (typeof event.location === "string" && event.location.trim()) return event.location.trim();
  return "Local a definir";
}

function eventSlug(event: AgendaEventRecord, label: string) {
  return event.group_slug || event.event_type || event.id || slugify(label);
}

function optionForEvent(event: AgendaEventRecord, locations: LocationRecord[]): AgendaOption {
  const title = labelForEvent(event);
  const slug = eventSlug(event, title);
  const dateLabel = formatDateLabel(event);
  const timeLabel = formatTimeLabel(event);
  const recurrence = recurrenceLabel(event);
  const location = locationLabel(event, locations);
  const description = formatFirstAccessDescription(recurrence, dateLabel, timeLabel, location);

  return {
    slug,
    title,
    label: title,
    dateLabel,
    timeLabel,
    recurrenceLabel: recurrence,
    locationLabel: location,
    description,
  };
}

function duplicateKey(option: AgendaOption) {
  const normalizedTitle = slugify(option.title || option.label || option.slug);

  // Nao remover sufixos numericos aqui. Eventos como
  // "Filhos da Corrente 2026 - Grupo 1" e "Grupo 2" sao distintos e
  // precisam aparecer separadamente no Primeiro Acesso.
  return normalizedTitle;
}

function dedupeOptions(options: AgendaOption[]) {
  const seen = new Set<string>();
  const result: AgendaOption[] = [];

  for (const option of options) {
    const key = duplicateKey(option);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(option);
  }

  return result;
}

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return bySlug.id as string;

  const { data: byName } = await supabaseAdmin.from("oh_organizations").select("id").ilike("name", "%tucxa%").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (byName?.id as string | undefined) ?? null;
}

export async function GET() {
  try {
    const organizationId = await findTucxaOrganizationId();
    const todayIso = todayIsoInSaoPaulo();
    if (!organizationId) return NextResponse.json({ options: availableFallbackOptions(todayIso), source: "fallback" });

    const [{ data, error }, { data: locationsData, error: locationsError }] = await Promise.all([
      supabaseAdmin
        .from("agv_events")
        .select("*")
        .eq("organization_id", organizationId)
        .in("status", ["aprovado", "recorrente", "ativo", "publicado", "approved"])
        .order("starts_at", { ascending: true, nullsFirst: true })
        .limit(250),
      supabaseAdmin
        .from("oh_locations")
        .select("id, name, active")
        .eq("organization_id", organizationId),
    ]);

    if (error) throw error;
    if (locationsError) throw locationsError;
    const locations = (locationsData ?? []) as LocationRecord[];
    const rawEvents = (data ?? []) as AgendaEventRecord[];

    const generated = dedupeOptions(
      rawEvents
        .filter((event) => !isDisabledForFirstAccess(event))
        .filter((event) => !hasEnded(event, todayIso))
        .filter((event) => hasExplicitFirstAccessEnabled(event) || !isVacationOrRecess(event))
        .filter((event) => hasExplicitFirstAccessEnabled(event) || !isMandatoryForAllFilhos(event))
        .sort((a, b) => {
          const left = sortWeight(a);
          const right = sortWeight(b);

          if (left.order !== right.order) return left.order - right.order;
          if (left.dateValue !== right.dateValue) return left.dateValue - right.dateValue;
          if (left.weekday !== right.weekday) return left.weekday - right.weekday;
          return left.label.localeCompare(right.label, "pt-BR");
        })
        .map((event) => optionForEvent(event, locations))
        .filter((item) => item.slug && item.label),
    );

    return NextResponse.json({ options: generated.length ? generated : availableFallbackOptions(todayIso), source: generated.length ? "agenda-viva" : "fallback" });
  } catch {
    return NextResponse.json({ options: availableFallbackOptions(todayIsoInSaoPaulo()), source: "fallback" });
  }
}
