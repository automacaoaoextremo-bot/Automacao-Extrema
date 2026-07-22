export type ThursdayGroup = "grupo-1" | "grupo-2";

export type EventLike = {
  title?: string | null;
  event_type?: string | null;
  group_slug?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeText(value: unknown) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
}

export function normalizeBrazilPhone(value: unknown) {
  let digits = asText(value).replace(/\D/g, "");
  while (digits.startsWith("0") && digits.length > 11) digits = digits.slice(1);
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.length > 11) digits = digits.slice(-11);
  return digits;
}

export function brazilPhoneE164(value: unknown) {
  const digits = normalizeBrazilPhone(value);
  return digits ? `+55${digits}` : "";
}

export function whatsappShareUrl(value: unknown, message: string) {
  const digits = normalizeBrazilPhone(value);
  return digits ? `https://wa.me/55${digits}?text=${encodeURIComponent(message)}` : "";
}

function metadataArray(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean);
    const text = asText(value);
    if (text) return text.split(/[;,|]/).map(normalizeText).filter(Boolean);
  }
  return [];
}

function metadataBoolean(metadata: Record<string, unknown>, fallback: boolean, ...keys: string[]) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(metadata, key)) continue;
    const value = metadata[key];
    if (typeof value === "boolean") return value;
    const text = normalizeText(value);
    if (["true", "1", "sim", "yes", "s"].includes(text)) return true;
    if (["false", "0", "nao", "no", "n"].includes(text)) return false;
  }
  return fallback;
}

export function eventThursdayGroups(event: EventLike): ThursdayGroup[] {
  const metadata = asRecord(event.metadata);
  const explicit = metadataArray(
    metadata,
    "thursdayGroupScope",
    "thursday_group_scope",
    "allowedThursdayGroups",
    "allowed_thursday_groups",
  );
  const haystack = [
    ...explicit,
    normalizeText(event.group_slug),
    normalizeText(event.event_type),
    normalizeText(event.title),
  ].join(" ");
  const groups: ThursdayGroup[] = [];
  if (/grupo-?1|grupo i\b/.test(haystack)) groups.push("grupo-1");
  if (/grupo-?2|grupo ii\b/.test(haystack)) groups.push("grupo-2");
  return groups;
}

export function eventSpecialType(event: EventLike) {
  const metadata = asRecord(event.metadata);
  return normalizeText(metadata.specialEventType ?? metadata.special_event_type);
}

export function eventPanelLabel(event: EventLike) {
  const metadata = asRecord(event.metadata);
  return asText(metadata.specialPanelLabel ?? metadata.special_panel_label);
}

export function isReturnFromVacationEvent(event: EventLike) {
  const specialType = eventSpecialType(event);
  if (specialType === "retorno-ferias" || specialType === "retorno-das-ferias") return true;

  // Compatibilidade com eventos antigos que ainda não receberam os metadados.
  const text = normalizeText(`${event.title ?? ""} ${event.event_type ?? ""} ${event.group_slug ?? ""}`);
  return text.includes("retorno ferias") && (text.includes("cavalinho") || text.includes("cambono"));
}

export function eventTargetsAllThursdayGroups(event: EventLike) {
  const metadata = asRecord(event.metadata);
  if (metadataBoolean(metadata, false, "allThursdayGroups", "all_thursday_groups")) return true;
  if (isReturnFromVacationEvent(event)) return true;
  const groups = eventThursdayGroups(event);
  return groups.includes("grupo-1") && groups.includes("grupo-2");
}

export function eventOverridesRegularThursdaySchedule(event: EventLike) {
  const metadata = asRecord(event.metadata);
  if (isReturnFromVacationEvent(event)) return true;
  return metadataBoolean(
    metadata,
    false,
    "overrideRegularGroupSchedule",
    "override_regular_group_schedule",
    "overrideThursdayGroupSchedule",
  );
}

export function eventRequiresAttendanceConfirmation(event: EventLike, fallback = true) {
  const metadata = asRecord(event.metadata);
  return metadataBoolean(
    metadata,
    fallback,
    "attendanceConfirmationRequired",
    "attendance_confirmation_required",
    "requiresAttendanceConfirmation",
  );
}

export function eventAllowsOptionalEntityAppointment(event: EventLike, fallback = true) {
  const metadata = asRecord(event.metadata);
  return metadataBoolean(
    metadata,
    fallback,
    "allowOptionalEntityAppointment",
    "allow_optional_entity_appointment",
    "allowEntityAppointment",
  );
}

export function groupAllowsThursdayOccurrence(group: ThursdayGroup, occurrence: number) {
  if (group === "grupo-1") return occurrence === 1 || occurrence === 3;
  return occurrence === 2 || occurrence === 4;
}

export function eventAllowsPersonGroups(event: EventLike, personGroups: ThursdayGroup[]) {
  const eventGroups = eventThursdayGroups(event);
  if (eventTargetsAllThursdayGroups(event)) return personGroups.length > 0;
  return eventGroups.some((group) => personGroups.includes(group));
}

export function eventAllowsThursdayOccurrence(event: EventLike, occurrence: number) {
  if (eventTargetsAllThursdayGroups(event) && eventOverridesRegularThursdaySchedule(event)) return true;
  const groups = eventThursdayGroups(event);
  return groups.some((group) => groupAllowsThursdayOccurrence(group, occurrence));
}

export function isWednesdayTreatmentEvent(event: EventLike) {
  const metadata = asRecord(event.metadata);
  if (metadataBoolean(metadata, false, "wednesdayTreatment", "wednesday_treatment")) return true;
  const text = normalizeText(`${event.title ?? ""} ${event.event_type ?? ""} ${event.group_slug ?? ""}`);
  return text.includes("quarta") || text.includes("transformacao") || text.includes("tratamento espiritual");
}
