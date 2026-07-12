import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type EventRecord = {
  id: string;
  title: string | null;
  event_type: string | null;
  event_type_id: string | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean | null;
  recurrence_rule: string | null;
  location_id: string | null;
  location: string | null;
  group_slug: string | null;
  responsible_person_id: string | null;
  created_by_person_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type PersonRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  auth_user_id?: string | null;
};

type MembershipRecord = {
  id: string;
  person_id: string;
  active: boolean | null;
  status: string | null;
  agenda_viva_profile: Record<string, unknown> | null;
};

type LookupRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function labelFromSlug(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1))
    .join(" ");
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function displayEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.endsWith("@organizacao-em-harmonia.local") ? "" : email;
}

async function findTucxaOrganizationId() {
  const { data: bySlug } = await supabaseAdmin.from("oh_organizations").select("id, name").eq("slug", "tucxa").maybeSingle();
  if (bySlug?.id) return { id: bySlug.id as string, name: asText(bySlug.name) || "Tucxa" };

  const { data: byName } = await supabaseAdmin
    .from("oh_organizations")
    .select("id, name")
    .ilike("name", "%tucxa%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return byName?.id ? { id: byName.id as string, name: asText(byName.name) || "Tucxa" } : null;
}

async function currentFilho(request: Request, organizationId: string) {
  const token = bearerToken(request);
  if (!token) throw new Error("Sessão expirada. Entre novamente no painel do Filho da Corrente.");

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Sessão inválida. Entre novamente no painel do Filho da Corrente.");

  const user = userData.user;
  const email = user.email || "";

  let person: PersonRecord | null = null;

  const byAuth = await supabaseAdmin
    .from("oh_people")
    .select("id, full_name, email, whatsapp, auth_user_id")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuth.error) throw byAuth.error;
  if (byAuth.data?.id) person = byAuth.data as PersonRecord;

  if (!person && email) {
    const byEmail = await supabaseAdmin
      .from("oh_people")
      .select("id, full_name, email, whatsapp, auth_user_id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data?.id) person = byEmail.data as PersonRecord;
  }

  if (!person) throw new Error("Cadastro do Filho da Corrente não localizado.");

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("oh_memberships")
    .select("id, person_id, active, status, agenda_viva_profile")
    .eq("organization_id", organizationId)
    .eq("person_id", person.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership?.id || membership.active !== true || membership.status !== "ativo") {
    throw new Error("Seu acesso ainda não está liberado para consultar a Agenda Viva.");
  }

  return { user, person, membership: membership as MembershipRecord };
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null) {
  const date = parseDate(value);
  if (!date) return "Data a definir";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatHour(value: string | null) {
  const date = parseDate(value);
  if (!date) return "";
  const [hour = "", minute = ""] = date.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).split(":");
  return minute === "00" ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}

function formatTime(event: EventRecord) {
  if (event.all_day) return "Dia inteiro";
  const start = formatHour(event.starts_at);
  const end = formatHour(event.ends_at);
  if (start && end) return `${start} às ${end}`;
  if (start) return `A partir de ${start}`;
  return "Horário a definir";
}

function recurrenceLabel(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  const explicit = asText(metadata.recurrenceLabel) || asText(metadata.periodicityLabel) || asText(metadata.recorrenciaLabel);
  if (explicit) return explicit;
  const rule = asText(event.recurrence_rule).toUpperCase();
  if (!rule) return "Evento pontual";
  if (rule.includes("INTERVAL=2")) return "Recorrência quinzenal";
  if (rule.includes("FREQ=MONTHLY")) return "Recorrência mensal";
  if (rule.includes("FREQ=WEEKLY")) return "Recorrência semanal";
  return "Evento recorrente";
}

function metadataList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => asText(item)).filter(Boolean);
  const text = asText(value);
  return text ? [text] : [];
}

function shouldShowEvent(event: EventRecord) {
  const status = normalize(asText(event.status));
  const hidden = new Set(["pendente_aprovacao", "pendente", "reprovado", "ajuste_solicitado", "rascunho", "draft", "cancelado", "cancelled"]);
  return !hidden.has(status);
}

function eventClassification(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  const raw = asText(metadata.eventClassification) || asText(metadata.event_classification) || asText(metadata.classification) || asText(metadata.classificacao);
  return raw || (normalize(`${event.event_type ?? ""} ${event.title ?? ""}`).includes("umbanda") ? "Umbanda" : "Outros");
}

function eventAudience(event: EventRecord) {
  const metadata = asRecord(event.metadata);
  return asText(metadata.audience) || asText(metadata.publico) || asText(metadata.targetAudience) || "Filhos da Corrente";
}

function mapById<T extends LookupRecord>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

export async function GET(request: Request) {
  try {
    const organization = await findTucxaOrganizationId();
    if (!organization) throw new Error("Organização Tucxa não encontrada.");

    const current = await currentFilho(request, organization.id);

    const [eventsResult, typesResult, locationsResult, peopleResult] = await Promise.all([
      supabaseAdmin
        .from("agv_events")
        .select("id, title, event_type, event_type_id, status, starts_at, ends_at, all_day, recurrence_rule, location_id, location, group_slug, responsible_person_id, created_by_person_id, notes, metadata, created_at, updated_at")
        .eq("organization_id", organization.id)
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(500),
      supabaseAdmin.from("agv_event_types").select("id, name, slug").eq("organization_id", organization.id),
      supabaseAdmin.from("oh_locations").select("id, name").eq("organization_id", organization.id),
      supabaseAdmin.from("oh_people").select("id, full_name").eq("organization_id", organization.id),
    ]);

    if (eventsResult.error) throw eventsResult.error;
    if (typesResult.error) throw typesResult.error;
    if (locationsResult.error) throw locationsResult.error;
    if (peopleResult.error) throw peopleResult.error;

    const eventTypes = mapById((typesResult.data ?? []) as LookupRecord[]);
    const locations = mapById((locationsResult.data ?? []) as LookupRecord[]);
    const people = mapById((peopleResult.data ?? []) as LookupRecord[]);

    const events = ((eventsResult.data ?? []) as EventRecord[])
      .filter(shouldShowEvent)
      .map((event) => {
        const metadata = asRecord(event.metadata);
        const typeRecord = event.event_type_id ? eventTypes.get(event.event_type_id) : null;
        const locationRecord = event.location_id ? locations.get(event.location_id) : null;
        const responsible = event.responsible_person_id ? people.get(event.responsible_person_id) : null;
        const associatedPersonIds = [
          ...metadataList(metadata.personIds),
          ...metadataList(metadata.associatedPersonIds),
          ...metadataList(metadata.pessoasAssociadas),
          asText(event.responsible_person_id),
          asText(event.created_by_person_id),
        ].filter(Boolean);

        return {
          id: event.id,
          title: asText(event.title) || labelFromSlug(asText(event.event_type) || "atividade"),
          status: asText(event.status) || "ativo",
          eventType: asText(event.event_type) || asText(typeRecord?.slug) || "atividade",
          eventTypeLabel: asText(typeRecord?.name) || labelFromSlug(asText(event.event_type) || "atividade"),
          classification: eventClassification(event),
          audience: eventAudience(event),
          responsiblePersonId: asText(event.responsible_person_id),
          responsiblePersonName: asText(responsible?.name) || "Responsável a definir",
          associatedToCurrentPerson: associatedPersonIds.includes(current.person.id),
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          dateLabel: formatDate(event.starts_at),
          timeLabel: formatTime(event),
          locationLabel: asText(locationRecord?.name) || asText(event.location) || asText(metadata.locationLabel) || "Local a definir",
          recurrenceLabel: recurrenceLabel(event),
          notes: asText(event.notes),
        };
      });

    const profile = asRecord(current.membership.agenda_viva_profile);

    return NextResponse.json({
      ok: true,
      organization,
      currentPerson: {
        id: current.person.id,
        fullName: current.person.full_name || "Filho da Corrente",
        email: displayEmail(current.person.email),
        whatsapp: current.person.whatsapp || "",
      },
      selectedAgendaSlugs: Array.isArray(profile.agendaSlugs) ? profile.agendaSlugs.map((item) => asText(item)).filter(Boolean) : [],
      selectedFunctionSlugs: Array.isArray(profile.functionSlugs) ? profile.functionSlugs.map((item) => asText(item)).filter(Boolean) : [],
      events,
      filters: {
        eventTypes: Array.from(new Map(events.map((event) => [event.eventType, { value: event.eventType, label: event.eventTypeLabel }])).values()),
        classifications: Array.from(new Set(events.map((event) => event.classification).filter(Boolean))),
        audiences: Array.from(new Set(events.map((event) => event.audience).filter(Boolean))),
        responsiblePeople: Array.from(new Map(events.map((event) => [event.responsiblePersonId || event.responsiblePersonName, { value: event.responsiblePersonId || event.responsiblePersonName, label: event.responsiblePersonName }])).values()).filter((item) => item.label !== "Responsável a definir"),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar Agenda Viva dos Filhos da Corrente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
