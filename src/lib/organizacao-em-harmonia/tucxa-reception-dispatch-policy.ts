/**
 * Política de entrega do resumo da Recepção durante a homologação.
 * Fail-closed: nenhum destinatário sem opt-in explícito e sem lista de
 * autorização explícita. Não altera os cadastros nem as funções de Recepção.
 *
 * TUCXA_RECEPTION_PILOT_ALLOWED_PERSON_IDS = UUID[,UUID...] (recomendado)
 * ou = ALL, após homologação e conferência das preferências individuais.
 */
export function receptionDispatchPolicy() {
  const raw = (process.env.TUCXA_RECEPTION_PILOT_ALLOWED_PERSON_IDS || "").trim();
  const allOptedIn = raw.toUpperCase() === "ALL";
  const ids = new Set(
    raw.split(",").map((value) => value.trim().toLowerCase())
      .filter((value) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)),
  );
  return {
    mode: allOptedIn ? "all_explicit_opt_in" : ids.size > 0 ? "allowlist" : "blocked_unconfigured",
    allows: (personId: string) => allOptedIn || ids.has(personId.trim().toLowerCase()),
    configured: allOptedIn || ids.size > 0,
    allowedCount: ids.size,
  };
}

export function receptionSummaryChannels(raw: unknown): Array<"whatsapp" | "email"> {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((value): value is "whatsapp" | "email" =>
    value === "whatsapp" || value === "email"))];
}
