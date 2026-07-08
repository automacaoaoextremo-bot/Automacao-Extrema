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
  description: string;
};

type AgendaEventRecord = {
  id?: string | null;
  title?: string | null;
  name?: string | null;
  event_type?: string | null;
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

const fallbackOptions: AgendaOption[] = [
  {
    slug: "atendimento-segunda",
    title: "Atendimento aos filhos de fora — Segunda-feira",
    label: "Atendimento aos filhos de fora — Segunda-feira",
    recurrenceLabel: "Recorrência semanal",
    dateLabel: "Segunda-feira",
    timeLabel: "18h às 22h",
    description: "Recorrência semanal • Segunda-feira • 18h às 22h",
  },
  {
    slug: "atendimento-terca",
    title: "Atendimento aos filhos de fora — Terça-feira",
    label: "Atendimento aos filhos de fora — Terça-feira",
    recurrenceLabel: "Recorrência semanal",
    dateLabel: "Terça-feira",
    timeLabel: "18h às 22h",
    description: "Recorrência semanal • Terça-feira • 18h às 22h",
  },
  {
    slug: "tratamento-transformacao-quarta",
    title: "Tratamento espiritual / Transformação — Quarta-feira",
    label: "Tratamento espiritual / Transformação — Quarta-feira",
    recurrenceLabel: "Conforme encaminhamento",
    dateLabel: "Quarta-feira",
    timeLabel: "18h30 às 22h",
    description: "Conforme encaminhamento • Quarta-feira • 18h30 às 22h",
  },
  {
    slug: "quinta-grupo-1",
    title: "Quinta - Grupo 1",
    label: "Quinta - Grupo 1",
    recurrenceLabel: "1ª e 3ª quinta-feira do mês",
    dateLabel: "Quinta-feira",
    timeLabel: "18h às 22h",
    description: "1ª e 3ª quinta-feira do mês • Quinta-feira • 18h às 22h",
  },
  {
    slug: "quinta-grupo-2",
    title: "Quinta - Grupo 2",
    label: "Quinta - Grupo 2",
    recurrenceLabel: "2ª e 4ª quinta-feira do mês",
    dateLabel: "Quinta-feira",
    timeLabel: "18h às 22h",
    description: "2ª e 4ª quinta-feira do mês • Quinta-feira • 18h às 22h",
  },
  {
    slug: "grupo-estudos",
    title: "Grupo de Estudos",
    label: "Grupo de Estudos",
    recurrenceLabel: "Conforme calendário",
    dateLabel: "Data a definir",
    timeLabel: "Horário a definir",
    description: "Conforme calendário • Data a definir • Horário a definir",
  },
  {
    slug: "clube-livro",
    title: "Clube do Livro",
    label: "Clube do Livro",
    recurrenceLabel: "Conforme calendário",
    dateLabel: "Data a definir",
    timeLabel: "Horário a definir",
    description: "Conforme calendário • Data a definir • Horário a definir",
  },
  {
    slug: "voluntario-sementinha",
    title: "Voluntário Sementinha",
    label: "Voluntário Sementinha",
    recurrenceLabel: "Conforme calendário",
    dateLabel: "Data a definir",
    timeLabel: "Horário a definir",
    description: "Conforme calendário • Data a definir • Horário a definir",
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

function asBoolean(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1" || value === "sim";
}

function metadataText(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return "";

  return Object.entries(metadata)
    .map(([key, value]) => `${key} ${typeof value === "string" ? value : Array.isArray(value) ? value.join(" ") : ""}`)
    .join(" ");
}

function labelForEvent(event: AgendaEventRecord) {
  return event.title || event.name || event.event_type || event.group_slug || "Atividade";
}

function startsAt(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  return parseDate(event.starts_at) ?? parseDate(event.start_at) ?? parseDate(event.start_date) ?? parseDate(metadata?.startsAt) ?? parseDate(metadata?.startAt) ?? parseDate(metadata?.startDate) ?? parseDate(metadata?.dataInicio);
}

function endsAt(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
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

function hasEnded(event: AgendaEventRecord, today: Date) {
  const endDate = endsAt(event);
  const startDate = startsAt(event);
  if (!endDate && isRecurringEvent(event)) return false;

  const comparisonDate = endDate ?? startDate;

  if (!comparisonDate) return false;
  const normalized = new Date(comparisonDate);
  normalized.setHours(23, 59, 59, 999);
  return normalized < today;
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
    asBoolean(metadata?.allFilhosDaCorrente)
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
  return { dateValue: sortDateValue(event), weekday: weekdayForEvent(event), label: label.toLocaleLowerCase("pt-BR") };
}

function formatDateLabel(event: AgendaEventRecord) {
  const startDate = startsAt(event);
  if (startDate) {
    return startDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const weekday = weekdayForEvent(event);
  if (weekday >= 0 && weekday <= 6) return weekdayNames[weekday];

  return "Data a definir";
}

function formatHour(value: Date | null) {
  if (!value) return "";
  return value.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).replace(":", "h");
}

function formatTimeLabel(event: AgendaEventRecord) {
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
  const explicit = metadata?.recurrenceLabel ?? metadata?.recorrenciaLabel ?? metadata?.periodicityLabel ?? metadata?.periodicidadeLabel;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();

  const frequency = recurrenceFrequency(event);
  if (frequency.includes("quinzen")) return "Recorrência quinzenal";
  if (frequency.includes("mensal") || frequency.includes("month")) return "Recorrência mensal";
  if (frequency.includes("semanal") || frequency.includes("weekly") || event.recurrence_rule?.toUpperCase().includes("FREQ=WEEKLY")) return "Recorrência semanal";

  return "Recorrente";
}

function eventSlug(event: AgendaEventRecord, label: string) {
  return event.group_slug || event.event_type || event.id || slugify(label);
}

function optionForEvent(event: AgendaEventRecord): AgendaOption {
  const title = labelForEvent(event);
  const slug = eventSlug(event, title);
  const dateLabel = formatDateLabel(event);
  const timeLabel = formatTimeLabel(event);
  const recurrence = recurrenceLabel(event);
  const description = [recurrence, dateLabel, timeLabel].filter(Boolean).join(" • ");

  return {
    slug,
    title,
    label: title,
    dateLabel,
    timeLabel,
    recurrenceLabel: recurrence,
    description,
  };
}

function duplicateKey(option: AgendaOption) {
  return slugify(option.title || option.label || option.slug);
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
    if (!organizationId) return NextResponse.json({ options: fallbackOptions, source: "fallback" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from("agv_events")
      .select("*")
      .eq("organization_id", organizationId)
      .in("status", ["aprovado", "recorrente", "ativo", "publicado", "approved"])
      .order("starts_at", { ascending: true, nullsFirst: true })
      .limit(250);

    if (error) throw error;

    const generated = dedupeOptions(
      (data ?? [])
        .map((event) => event as AgendaEventRecord)
        .filter((event) => !hasEnded(event, today))
        .filter((event) => !isVacationOrRecess(event))
        .filter((event) => !isMandatoryForAllFilhos(event))
        .sort((a, b) => {
          const left = sortWeight(a);
          const right = sortWeight(b);

          if (left.dateValue !== right.dateValue) return left.dateValue - right.dateValue;
          if (left.weekday !== right.weekday) return left.weekday - right.weekday;
          return left.label.localeCompare(right.label, "pt-BR");
        })
        .map(optionForEvent)
        .filter((item) => item.slug && item.label),
    );

    return NextResponse.json({ options: generated.length ? generated : fallbackOptions, source: generated.length ? "agenda-viva" : "fallback" });
  } catch {
    return NextResponse.json({ options: fallbackOptions, source: "fallback" });
  }
}
