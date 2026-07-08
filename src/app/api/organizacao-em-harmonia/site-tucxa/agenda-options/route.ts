import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type AgendaOption = {
  slug: string;
  label: string;
};

type AgendaEventRecord = {
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
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

const fallbackOptions: AgendaOption[] = [
  { slug: "atendimento-segunda", label: "Atendimento de Segunda" },
  { slug: "atendimento-terca", label: "Atendimento de Terça" },
  { slug: "atendimento-quarta", label: "Atendimento de Quarta" },
  { slug: "quinta-grupo-1", label: "Quinta - Grupo 1" },
  { slug: "quinta-grupo-2", label: "Quinta - Grupo 2" },
  { slug: "quinta-grupo-1-e-2", label: "Quinta - Grupo 1 e 2" },
  { slug: "coordenacao-grupo-estudos", label: "Coordenação no Grupo de Estudos" },
  { slug: "participacao-grupo-estudos", label: "Participação no Grupo de Estudos" },
  { slug: "coordenacao-clube-livro", label: "Coordenação no Clube do Livro" },
  { slug: "participacao-clube-livro", label: "Participação no Clube do Livro" },
  { slug: "coordenacao-sementinha", label: "Coordenação Sementinha" },
  { slug: "voluntario-sementinha", label: "Voluntário Sementinha" },
  { slug: "organizacao-eventos", label: "Organização de Eventos" },
  { slug: "voluntario-eventos", label: "Voluntário Eventos" },
];

const dayOrder: Record<string, number> = {
  domingo: 0,
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
  return value === true || value === "true" || value === 1 || value === "1";
}


function isRecurringEvent(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  const status = normalize(event.status ?? "");
  return (
    status.includes("recorrente") ||
    status.includes("recurring") ||
    asBoolean(metadata?.recurring) ||
    asBoolean(metadata?.recorrente) ||
    typeof metadata?.recurrenceRule === "string" ||
    typeof metadata?.rrule === "string"
  );
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

function eventSlug(event: AgendaEventRecord, label: string) {
  return event.group_slug || event.event_type || slugify(label);
}

function hasEnded(event: AgendaEventRecord, today: Date) {
  const metadata = event.metadata ?? null;
  const endDate =
    parseDate(event.ends_at) ??
    parseDate(event.end_at) ??
    parseDate(event.end_date) ??
    parseDate(metadata?.endsAt) ??
    parseDate(metadata?.endAt) ??
    parseDate(metadata?.endDate) ??
    parseDate(metadata?.fim) ??
    parseDate(metadata?.dataFim);

  const startDate = parseDate(event.starts_at) ?? parseDate(event.start_at) ?? parseDate(event.start_date) ?? parseDate(metadata?.startsAt) ?? parseDate(metadata?.startDate);
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

  const explicitAllChildrenText =
    text.includes("todos os filhos") ||
    text.includes("todos filhos") ||
    text.includes("todos os filhos da corrente") ||
    text.includes("obrigatorio") ||
    text.includes("obrigatoria") ||
    text.includes("reuniao geral") ||
    text.includes("encontro geral") ||
    text.includes("retorno das ferias") ||
    text.includes("volta das ferias");

  return explicitAllChildrenText;
}

function weekdayFromText(value: string) {
  const normalized = normalize(value);
  const orderedDays = ["domingo", "segunda", "terca", "terça", "quarta", "quinta", "sexta", "sabado", "sábado"];
  const match = orderedDays.find((day) => normalized.includes(normalize(day)));
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

function sortDateValue(event: AgendaEventRecord) {
  const metadata = event.metadata ?? null;
  const startDate = parseDate(event.starts_at) ?? parseDate(event.start_at) ?? parseDate(event.start_date) ?? parseDate(metadata?.startsAt) ?? parseDate(metadata?.startDate);
  return startDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function sortWeight(event: AgendaEventRecord) {
  const label = labelForEvent(event);
  const dateValue = sortDateValue(event);
  const weekday = Math.min(weekdayFromMetadata(event.metadata), weekdayFromText(`${label} ${event.group_slug ?? ""} ${event.event_type ?? ""}`));
  return { dateValue, weekday, label: label.toLocaleLowerCase("pt-BR") };
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

    const generated = (data ?? [])
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
      .map((event) => {
        const label = labelForEvent(event);
        const slug = eventSlug(event, label);
        return { slug, label };
      })
      .filter((item, index, array) => item.slug && array.findIndex((candidate) => candidate.slug === item.slug) === index);

    return NextResponse.json({ options: generated.length ? generated : fallbackOptions, source: generated.length ? "agenda-viva" : "fallback" });
  } catch {
    return NextResponse.json({ options: fallbackOptions, source: "fallback" });
  }
}
