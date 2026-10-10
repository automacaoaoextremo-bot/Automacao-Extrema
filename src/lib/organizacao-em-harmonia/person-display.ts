const PERSON_NAME_PARTICLES = new Set(["da", "das", "de", "do", "dos", "e"]);

function normalizeNamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function personNameParts(value: unknown) {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function personDisplayBase(value: unknown) {
  const parts = personNameParts(value);
  if (parts.length <= 2) return { label: parts.join(" "), parts, consumed: parts.length };

  const second = normalizeNamePart(parts[1]);
  const consumed = PERSON_NAME_PARTICLES.has(second) ? Math.min(3, parts.length) : 2;
  return {
    label: parts.slice(0, consumed).join(" "),
    parts,
    consumed,
  };
}

function disambiguationToken(parts: string[], consumed: number) {
  for (let index = consumed; index < parts.length; index += 1) {
    if (!PERSON_NAME_PARTICLES.has(normalizeNamePart(parts[index]))) {
      return parts[index];
    }
  }
  return parts[consumed] ?? "";
}

export function firstTwoPersonNames(value: unknown) {
  return personDisplayBase(value).label;
}

export function disambiguatedPersonDisplayNames<T extends { id: string; fullName: unknown }>(
  people: T[],
) {
  const result = new Map<string, string>();
  const grouped = new Map<
    string,
    Array<{ person: T; label: string; token: string }>
  >();

  for (const person of people) {
    const base = personDisplayBase(person.fullName);
    const key = normalizeNamePart(base.label);
    const group = grouped.get(key) ?? [];
    group.push({
      person,
      label: base.label,
      token: disambiguationToken(base.parts, base.consumed),
    });
    grouped.set(key, group);
  }

  for (const group of grouped.values()) {
    if (group.length === 1) {
      const item = group[0];
      result.set(item.person.id, item.label);
      continue;
    }

    const normalizedTokens = group.map((item) => normalizeNamePart(item.token));

    group.forEach((item, index) => {
      const normalizedToken = normalizedTokens[index];
      if (!normalizedToken) {
        result.set(item.person.id, item.label);
        return;
      }

      let prefixLength = 1;
      while (
        prefixLength < normalizedToken.length &&
        normalizedTokens.some(
          (other, otherIndex) =>
            otherIndex !== index &&
            other.slice(0, prefixLength) === normalizedToken.slice(0, prefixLength),
        )
      ) {
        prefixLength += 1;
      }

      // O requisito pede uma letra e, se necessário, duas. Em colisões ainda
      // maiores avançamos só o mínimo indispensável para não voltar a mostrar
      // duas pessoas com o mesmo rótulo.
      const suffix = item.token.slice(0, Math.max(1, prefixLength));
      result.set(item.person.id, `${item.label} ${suffix}`);
    });
  }

  return result;
}
