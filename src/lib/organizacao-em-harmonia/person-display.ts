const PERSON_NAME_PARTICLES = new Set(["da", "das", "de", "do", "dos", "e"]);

export function firstTwoPersonNames(value: unknown) {
  const parts = String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 2) return parts.join(" ");

  const second = parts[1]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  return parts.slice(0, PERSON_NAME_PARTICLES.has(second) ? 3 : 2).join(" ");
}
