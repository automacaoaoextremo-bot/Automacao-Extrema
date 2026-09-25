type RoleLike = {
  id: string;
  name?: string | null;
  slug?: string | null;
  active?: boolean | null;
};

type MembershipLike = {
  id: string;
  person_id: string;
  role_id?: string | null;
  active?: boolean | null;
  agenda_viva_profile?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function token(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isFilhoRole(role: RoleLike | undefined) {
  if (!role) return false;
  const value = token(role.slug || role.name);
  return value === "filho-da-corrente" || value === "filho-corrente";
}

function pilotProfileScore(profileValue: unknown) {
  const profile = asRecord(profileValue);
  const source = token(profile.source);
  const accessKind = token(profile.pilotAccessKind);

  if (source === "tucxa-agendamento-piloto-01") return 40;
  if (accessKind === "recepcao" || accessKind === "cavalinho") return 30;

  if (
    profile.pilotFirstAccessRequired === true &&
    (profile.supportsReception === true ||
      profile.supportsCavalinho === true ||
      profile.isCavalinho === true)
  ) {
    return 20;
  }

  return 0;
}

function membershipScore(membership: MembershipLike, rolesById: Map<string, RoleLike>) {
  let score = 0;
  const role = membership.role_id ? rolesById.get(membership.role_id) : undefined;

  if (isFilhoRole(role)) score += 100;
  score += pilotProfileScore(membership.agenda_viva_profile);
  if (membership.active !== false) score += 5;
  if (role?.active !== false) score += 1;

  return score;
}

/**
 * Monta uma lista resiliente dos Filhos da Corrente usados na homologação do
 * piloto. Além do papel-base `filho-da-corrente`, aceita registros provisionados
 * pelo piloto que ainda estejam com um papel funcional antigo (ex.: Recepção).
 * Isso evita esconder pessoas já cadastradas enquanto a Base Única é normalizada.
 */
export function pilotFilhoMembershipsByPerson<
  TMembership extends MembershipLike,
  TRole extends RoleLike,
>(memberships: TMembership[], roles: TRole[]) {
  const rolesById = new Map<string, RoleLike>(roles.map((role) => [role.id, role]));
  const selected = new Map<string, TMembership>();
  const selectedScores = new Map<string, number>();

  for (const membership of memberships) {
    const score = membershipScore(membership, rolesById);
    if (score <= 0) continue;

    const currentScore = selectedScores.get(membership.person_id) ?? -1;
    if (score > currentScore) {
      selected.set(membership.person_id, membership);
      selectedScores.set(membership.person_id, score);
    }
  }

  return selected;
}
