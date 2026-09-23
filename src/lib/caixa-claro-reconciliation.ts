import {
  CaixaTransaction,
  IncomeEvent,
  normalizeText,
  ReconciliationMethod,
} from "@/lib/caixa-claro";

export type ReconciliationSuggestion = {
  transactionId: string;
  incomeEventId: string;
  method: ReconciliationMethod;
  suggestedCents: number;
  score: number;
  reason: string;
};

function dayDistance(a: string, b: string) {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 999;
  return Math.abs(left - right) / 86_400_000;
}

export function suggestIncomeReconciliations(
  incomes: IncomeEvent[],
  transactions: CaixaTransaction[],
): ReconciliationSuggestion[] {
  const suggestions: ReconciliationSuggestion[] = [];

  for (const income of incomes) {
    if (income.status === "canceled") continue;
    const expected = income.net_cents;
    if (expected <= 0) continue;

    for (const tx of transactions) {
      if (tx.amount_cents <= 0) continue;
      const days = dayDistance(income.expected_date ?? income.competence_date, tx.occurred_at);
      if (days > 10) continue;

      const diffRatio = Math.abs(tx.amount_cents - expected) / expected;
      if (diffRatio > 0.35) continue;

      const raw = normalizeText(`${tx.category_raw ?? ""} ${tx.transaction_raw ?? ""} ${tx.description}`);
      const looksLikePix = raw.includes("pix") || raw.includes("transferencia");
      const method: ReconciliationMethod = looksLikePix ? "pix_bridge" : "direct_credit";

      let score = 100;
      score -= Math.min(45, Math.round(diffRatio * 100));
      score -= Math.min(35, Math.round(days * 4));
      if (looksLikePix) score += 5;
      score = Math.max(1, Math.min(100, score));

      suggestions.push({
        transactionId: tx.id,
        incomeEventId: income.id,
        method,
        suggestedCents: Math.min(tx.amount_cents, expected),
        score,
        reason: looksLikePix
          ? "Crédito via PIX/transferência próximo da data e do valor da renda. Pode ser o repasse do banco onde o pagamento foi depositado."
          : "Crédito próximo da data e do valor líquido informado para a renda.",
      });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}
