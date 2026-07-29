export type AppointmentRole = {
  id: string;
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
};

export type AppointmentProfile = Record<string, unknown> | null | undefined;

export type AppointmentCapabilities = {
  canReception: boolean;
  canCambono: boolean;
  canCavalinho: boolean;
  activeFunctionIds: string[];
  canBookWednesday: boolean;
  consultationScope: "manage" | "read_all" | "linked_entities" | "none";
  canRead: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canDelete: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item)).filter(Boolean);
}

export function normalizeFunctionToken(value: unknown) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function selectedFunctionTokens(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    return [normalizeFunctionToken(record.slug), normalizeFunctionToken(record.label)].filter(Boolean);
  });
}

export function profileFunctionTokens(profileValue: AppointmentProfile) {
  const profile = asRecord(profileValue);
  const tokens = [
    ...asList(profile.functionSlugs).map(normalizeFunctionToken),
    ...selectedFunctionTokens(profile.selectedFunctions),
  ];

  if (profile.supportsReception === true) tokens.push("recepcao");
  if (profile.supportsCambono === true) tokens.push("cambono");
  if (profile.supportsCavalinho === true) tokens.push("cavalinho");

  return Array.from(new Set(tokens.filter(Boolean)));
}

function tokenMatches(tokens: string[], candidates: string[]) {
  return tokens.some((token) => candidates.some((candidate) => token === candidate || token.includes(candidate)));
}

export function profileHasReception(profileValue: AppointmentProfile) {
  return tokenMatches(profileFunctionTokens(profileValue), ["recepcao", "recepcionista"]);
}

export function profileHasCambono(profileValue: AppointmentProfile) {
  return tokenMatches(profileFunctionTokens(profileValue), ["cambono"]);
}

export function profileHasCavalinho(profileValue: AppointmentProfile) {
  return tokenMatches(profileFunctionTokens(profileValue), ["cavalinho", "medium", "incorporante"]);
}

export function isReceptionRole(role: AppointmentRole) {
  const token = normalizeFunctionToken(`${role.slug ?? ""} ${role.name ?? ""}`);
  return token.includes("recepcao") || token.includes("recepcionista");
}

export function activeFunctionIdsForProfile(profileValue: AppointmentProfile, roles: AppointmentRole[]) {
  const tokens = profileFunctionTokens(profileValue);
  return roles
    .filter((role) => role.active !== false)
    .filter((role) => {
      const roleTokens = [normalizeFunctionToken(role.slug), normalizeFunctionToken(role.name)].filter(Boolean);
      return roleTokens.some((roleToken) => tokens.some((profileToken) => profileToken === roleToken || profileToken.includes(roleToken) || roleToken.includes(profileToken)));
    })
    .map((role) => role.id);
}

export function resolveAppointmentCapabilities(input: {
  profile: AppointmentProfile;
  roles?: AppointmentRole[];
  wednesdayAuthorizedFunctionIds?: string[];
}) : AppointmentCapabilities {
  const roles = input.roles ?? [];
  const activeFunctionIds = activeFunctionIdsForProfile(input.profile, roles);
  const receptionRoleIds = roles.filter(isReceptionRole).map((role) => role.id);
  const canReception = profileHasReception(input.profile) || activeFunctionIds.some((id) => receptionRoleIds.includes(id));
  const canCambono = profileHasCambono(input.profile);
  const canCavalinho = profileHasCavalinho(input.profile);
  const authorizedIds = new Set([...(input.wednesdayAuthorizedFunctionIds ?? []), ...receptionRoleIds]);
  const canBookWednesday = canReception || activeFunctionIds.some((id) => authorizedIds.has(id));
  const consultationScope = canReception ? "manage" : canCambono ? "read_all" : canCavalinho ? "linked_entities" : "none";
  return {
    canReception,
    canCambono,
    canCavalinho,
    activeFunctionIds,
    canBookWednesday,
    consultationScope,
    canRead: consultationScope !== "none",
    canEdit: consultationScope === "manage",
    canCancel: consultationScope === "manage",
    canDelete: consultationScope === "manage",
  };
}
