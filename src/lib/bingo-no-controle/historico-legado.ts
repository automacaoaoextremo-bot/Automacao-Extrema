/**
 * Inventário auditado no Supabase de origem em 18/10/2026.
 * Não representa importação de dados nem sincronização em tempo real.
 * Manter Sementinha e TUCXA separados por organização.
 */
export type BingoLegacyEventSummary = {
  id: string;
  slug: string;
  name: string;
  date: string;
  status: string;
  owner: "tucxa" | "sementinha";
  rounds: number;
  draws: number;
  awards: number;
  claims: number;
  winners: number;
};

export const BINGO_LEGACY_SOURCE_PROJECT = "tzyyrabjqtvjzxossyuk";

export const BINGO_LEGACY_EVENTS: readonly BingoLegacyEventSummary[] = [
  {
    id: "2bc80233-73f1-4ad4-b789-b9249d472ea4",
    slug: "bingo-bazar-do-sementinha-2026-05-09",
    name: "Bingo Bazar do Sementinha 09/05/2026",
    date: "2026-05-09",
    status: "closed",
    owner: "sementinha",
    rounds: 15,
    draws: 688,
    awards: 30,
    claims: 38,
    winners: 25,
  },
  {
    id: "e7cc5ba7-8500-441f-ab3b-327ec1732e9b",
    slug: "bingo-festa-junina-do-tucxa-2026-06-14",
    name: "Bingo Festa Junina do Tucxa",
    date: "2026-06-14",
    status: "published",
    owner: "tucxa",
    rounds: 11,
    draws: 358,
    awards: 23,
    claims: 22,
    winners: 22,
  },
] as const;

/** Event test-2026-05-09 explicitly excluded. */
export const BINGO_LEGACY_EXCLUDED_TEST_ID = "8ab60e8d-57e5-4019-9cd8-52be78a48612";
