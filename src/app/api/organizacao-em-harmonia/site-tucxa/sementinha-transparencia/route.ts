import { NextResponse } from "next/server";

const months = [
  { month: "2026-06-01", openingBalance: 12585.0, closingBalance: 8101.39, bankBalance: 8101.39 },
  { month: "2026-05-01", openingBalance: 7346.27, closingBalance: 12585.0, bankBalance: 12585.0 },
  { month: "2026-04-01", openingBalance: 7010.67, closingBalance: 7346.27, bankBalance: 7346.27 },
  { month: "2026-03-01", openingBalance: 7349.62, closingBalance: 7010.67, bankBalance: 7010.67 },
  { month: "2026-02-01", openingBalance: 8174.62, closingBalance: 7349.62, bankBalance: 7349.62 },
  { month: "2026-01-01", openingBalance: 9256.62, closingBalance: 8174.62, bankBalance: 8174.62 },
] as const;

type Item = { name: string; values: Record<string, number> };

type Group = {
  type: "receita" | "despesa";
  group: string;
  items: Item[];
};

const groups: Group[] = [
  {
    type: "receita",
    group: "Bazar e brechó",
    items: [
      {
        name: "Bazar Sementinha",
        values: {
          "2026-01-01": 28.0,
          "2026-02-01": 150.0,
          "2026-03-01": 5982.12,
          "2026-04-01": 2540.0,
          "2026-05-01": 470.0,
          "2026-06-01": 156.0,
        },
      },
    ],
  },
  {
    type: "receita",
    group: "Ações de arrecadação",
    items: [
      { name: "Meditação", values: { "2026-01-01": 190.0 } },
      { name: "Barraca/Tenda Sementinha pet", values: { "2026-02-01": 100.0 } },
      { name: "Rifa Sementinha", values: { "2026-02-01": 325.0, "2026-03-01": 1075.0 } },
      { name: "Bis/Sementinha", values: { "2026-03-01": 510.0 } },
      { name: "Bingo Sementinha", values: { "2026-04-01": 800.0, "2026-05-01": 8700.41 } },
    ],
  },
  {
    type: "despesa",
    group: "Estrutura e funcionamento",
    items: [
      {
        name: "Aluguel / despesas Tucxa 2",
        values: {
          "2026-01-01": 1300.0,
          "2026-02-01": 1300.0,
          "2026-03-01": 1300.0,
          "2026-04-01": 1300.0,
          "2026-05-01": 1300.0,
          "2026-06-01": 1300.0,
        },
      },
      {
        name: "Despesas diversas",
        values: {
          "2026-03-01": 3336.97,
          "2026-04-01": 375.0,
          "2026-05-01": 193.3,
        },
      },
    ],
  },
  {
    type: "despesa",
    group: "Bazar e arrecadação",
    items: [
      {
        name: "Bazar Sementinha",
        values: {
          "2026-03-01": 1640.07,
          "2026-04-01": 48.71,
          "2026-06-01": 976.0,
        },
      },
      {
        name: "Bingo Sementinha",
        values: { "2026-04-01": 1135.47, "2026-05-01": 2248.38 },
      },
      { name: "Bis/Sementinha", values: { "2026-03-01": 130.0 } },
      { name: "Ganhador Rifa Sementinha", values: { "2026-03-01": 1000.0 } },
    ],
  },
  {
    type: "despesa",
    group: "Materiais e apoio às ações",
    items: [
      {
        name: "Tendas, barracas e lona",
        values: {
          "2026-02-01": 100.0,
          "2026-03-01": 499.03,
          "2026-04-01": 145.22,
          "2026-06-01": 750.0,
        },
      },
      { name: "Fraldas para doação", values: { "2026-05-01": 190.0, "2026-06-01": 285.0 } },
      { name: "Cobertores/Cestas básicas", values: { "2026-06-01": 1158.61 } },
      { name: "Ração Sementinha pet", values: { "2026-06-01": 170.0 } },
    ],
  },
];

function groupValues(group: Group) {
  return Object.fromEntries(
    months.map(({ month }) => [
      month,
      group.items.reduce((sum, item) => sum + (Number(item.values[month]) || 0), 0),
    ]),
  );
}

function monthTotal(type: "receita" | "despesa", month: string) {
  return groups
    .filter((group) => group.type === type)
    .reduce(
      (sum, group) =>
        sum + group.items.reduce((itemSum, item) => itemSum + (Number(item.values[month]) || 0), 0),
      0,
    );
}

const matrix = {
  months: months.map((item) => ({ ...item })),
  groups: groups.map((group) => ({
    type: group.type,
    group: group.group,
    values: groupValues(group),
    items: group.items,
  })),
};

const latestMonth = months[0];
const latestRevenues = monthTotal("receita", latestMonth.month);
const latestExpenses = monthTotal("despesa", latestMonth.month);

export async function GET() {
  return NextResponse.json({
    live: {
      generatedAt: new Date().toISOString(),
      settings: {
        detailLevel: "itens",
        showLast12Months: true,
        showDrilldown: true,
        showTopExpenses: true,
        showTopRevenues: true,
        showNegativeResults: true,
        showAccumulatedBalance: true,
        headline: "Transparência que fortalece a caridade",
        message:
          "Acompanhe os balancetes finalizados do Sementinha, com receitas, despesas, resultado e saldo organizados para uma leitura simples no celular.",
      },
      latestFinalized: {
        month: latestMonth.month,
        workflowStatus: "finalizado",
        finalized: true,
        current: false,
        hasData: true,
        revenues: latestRevenues,
        expenses: latestExpenses,
        result: latestRevenues - latestExpenses,
        openingBalance: latestMonth.openingBalance,
        closingBalance: latestMonth.closingBalance,
        bankBalance: latestMonth.bankBalance,
        realizedRevenues: latestRevenues,
        realizedExpenses: latestExpenses,
        estimatedRevenues: 0,
        estimatedExpenses: 0,
        sourceLabel: "Balancetes Sementinha · janeiro a junho de 2026",
        updatedAt: "2026-06-30T23:59:59-03:00",
      },
      matrix,
    },
  });
}
