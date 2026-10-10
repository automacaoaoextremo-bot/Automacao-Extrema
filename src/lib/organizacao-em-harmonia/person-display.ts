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
  if (parts.length <= 2) return { label: parts.join(" "), parts };

  const second = normalizeNamePart(parts[1]);
  const consumed = PERSON_NAME_PARTICLES.has(second) ? Math.min(3, parts.length) : 2;
  return {
    label: parts.slice(0, consumed).join(" "),
    parts,
  };
}

function lastMeaningfulName(parts: string[]) {
  for (let index = parts.length - 1; index >= 1; index -= 1) {
    if (!PERSON_NAME_PARTICLES.has(normalizeNamePart(parts[index]))) {
      return parts[index];
    }
  }
  return parts.at(-1) ?? "";
}

function collisionLabel(parts: string[]) {
  const first = parts[0] ?? "";
  const last = lastMeaningfulName(parts);
  if (!first || !last || normalizeNamePart(first) === normalizeNamePart(last)) {
    return parts.join(" ");
  }
  return `${first} ${last}`;
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
    Array<{ person: T; label: string; parts: string[] }>
  >();

  for (const person of people) {
    const base = personDisplayBase(person.fullName);
    const key = normalizeNamePart(base.label);
    const group = grouped.get(key) ?? [];
    group.push({
      person,
      label: base.label,
      parts: base.parts,
    });
    grouped.set(key, group);
  }

  for (const group of grouped.values()) {
    if (group.length === 1) {
      const item = group[0];
      result.set(item.person.id, item.label);
      continue;
    }

    const collisionLabels = group.map((item) => collisionLabel(item.parts));
    const normalizedCollisionLabels = collisionLabels.map(normalizeNamePart);

    group.forEach((item, index) => {
      const candidate = collisionLabels[index];
      const normalizedCandidate = normalizedCollisionLabels[index];

      const candidateIsUnique = normalizedCollisionLabels.every(
        (other, otherIndex) => otherIndex === index || other !== normalizedCandidate,
      );

      // Ajuste 65: quando o nome curto colide, mostramos primeiro + último nome.
      // Ex.: "Ana Maria da Silva Horta" -> "Ana Horta" e
      // "Ana Maria Silva Baldo" -> "Ana Baldo".
      //
      // Se até primeiro + último ainda colidir, exibimos o nome completo para
      // não voltar a apresentar duas pessoas com o mesmo rótulo.
      result.set(
        item.person.id,
        candidateIsUnique ? candidate : item.parts.join(" "),
      );
    });
  }

  return result;
}
