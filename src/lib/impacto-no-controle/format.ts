export function formatMoneyFromCents(cents: number | null | undefined) {
  const numeric = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  const value = numeric / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function moneyInputToCents(value: string | number | null | undefined) {
  if (typeof value === "number") return Math.round(value * 100);

  const raw = String(value ?? "")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .trim();

  if (!raw) return 0;

  let normalized = raw;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    // Formato brasileiro: 1.234,56
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Formato brasileiro simples: 650,00
    normalized = normalized.replace(",", ".");
  } else if (hasDot) {
    const parts = normalized.split(".");
    const decimals = parts[parts.length - 1] || "";
    if (parts.length > 2 || decimals.length !== 2) {
      // Provável separador de milhar: 1.234 ou 1.234.567
      normalized = normalized.replace(/\./g, "");
    }
    // Caso contrário, formato decimal: 650.00
  }

  const number = Number(normalized);
  return Math.max(0, Math.round((Number.isFinite(number) ? number : 0) * 100));
}

export function centsToMoneyInput(cents: number | null | undefined) {
  return ((cents || 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhone(value: string) {
  return onlyDigits(value).slice(0, 14);
}

export function buyerDisplayName(name: string, phone?: string | null) {
  const clean = name.trim().replace(/\s+/g, " ");
  const parts = clean.split(" ");
  const first = parts[0] || "Participante";
  const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : "";
  const suffix = phone ? ` • ${phone.slice(-4)}` : "";
  return `${first}${lastInitial}${suffix}`;
}

export function kgFromAmount(amountCents: number, impactValueCents: number) {
  if (!impactValueCents) return 0;
  return Math.floor((amountCents / impactValueCents) * 10) / 10;
}

export function cleanWhatsappMessage(value: string | null | undefined) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
