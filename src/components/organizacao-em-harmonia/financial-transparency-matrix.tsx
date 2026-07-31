"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";

export type FinancialMatrixMonth = {
  month: string;
  openingBalance: number | null;
  closingBalance: number | null;
  bankBalance: number | null;
};

export type FinancialMatrixItem = {
  name: string;
  values: Record<string, number>;
};

export type FinancialMatrixGroup = {
  type: "receita" | "despesa";
  group: string;
  values: Record<string, number>;
  items: FinancialMatrixItem[];
};

export type FinancialTransparencyMatrixData = {
  months: FinancialMatrixMonth[];
  groups: FinancialMatrixGroup[];
};

type MatrixProps = {
  matrix: FinancialTransparencyMatrixData;
  editable?: boolean;
  editBaseHref?: string;
  title?: string;
  description?: string;
};

type SectionKey = "saldo" | "receita" | "despesa";

const MONTHS_PER_BLOCK = 3;

function money(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    .replace(".", "");
}

function valueForMonth(values: Record<string, number>, month: string) {
  return Number(values[month]) || 0;
}

function sumValues(values: Record<string, number>, months: FinancialMatrixMonth[]) {
  return months.reduce(
    (sum, month) => sum + valueForMonth(values, month.month),
    0,
  );
}

function averageValues(
  values: Record<string, number>,
  months: FinancialMatrixMonth[],
) {
  return months.length > 0 ? sumValues(values, months) / months.length : 0;
}

function rowTone(value: number) {
  return value < 0 ? "text-red-700" : "text-[#123D2C]";
}

function ToggleIcon({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-black shadow-sm ring-1 ring-[#123D2C]/10"
    >
      {open ? "−" : "+"}
    </span>
  );
}

export function FinancialTransparencyMatrix({
  matrix,
  editable = false,
  editBaseHref = "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/balancetes",
  title = "Prestação de contas por mês",
  description = "As informações começam recolhidas. Toque em Saldo, Receitas ou Despesas para expandir na vertical. Use as setas e a rolagem horizontal para consultar outros blocos de três meses.",
}: MatrixProps) {
  const [blockIndex, setBlockIndex] = useState(0);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    saldo: false,
    receita: false,
    despesa: false,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const totalBlocks = Math.max(
    1,
    Math.ceil(matrix.months.length / MONTHS_PER_BLOCK),
  );
  const safeBlockIndex = Math.min(blockIndex, totalBlocks - 1);
  const visibleMonths = matrix.months.slice(
    safeBlockIndex * MONTHS_PER_BLOCK,
    safeBlockIndex * MONTHS_PER_BLOCK + MONTHS_PER_BLOCK,
  );

  const sectionValues = useMemo(() => {
    const values: Record<"receita" | "despesa", Record<string, number>> = {
      receita: {},
      despesa: {},
    };

    for (const group of matrix.groups) {
      for (const month of matrix.months) {
        values[group.type][month.month] =
          (values[group.type][month.month] ?? 0) +
          valueForMonth(group.values, month.month);
      }
    }

    return values;
  }, [matrix.groups, matrix.months]);

  function moveBlock(direction: -1 | 1) {
    setBlockIndex((current) =>
      Math.min(totalBlocks - 1, Math.max(0, current + direction)),
    );
  }

  function toggleSection(section: SectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function toggleGroup(key: string) {
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));
  }

  const openingValues = Object.fromEntries(
    matrix.months.map((month) => [month.month, month.openingBalance ?? 0]),
  );
  const closingValues = Object.fromEntries(
    matrix.months.map((month) => [month.month, month.closingBalance ?? 0]),
  );

  const newestVisibleBalance = visibleMonths[0]?.bankBalance ?? null;
  const averageVisibleBalance =
    visibleMonths.length > 0
      ? visibleMonths.reduce(
          (sum, month) => sum + (month.bankBalance ?? 0),
          0,
        ) / visibleMonths.length
      : null;


  return (
    <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
            Visão matricial
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => moveBlock(-1)}
            disabled={safeBlockIndex === 0}
            className="min-h-11 rounded-xl bg-[#E9F2E7] px-4 text-sm font-black text-[#123D2C] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mais recentes
          </button>
          <span className="rounded-xl bg-[#F7FAF2] px-3 py-2 text-xs font-black text-[#2F6B43] ring-1 ring-[#123D2C]/10">
            Bloco {safeBlockIndex + 1} de {totalBlocks}
          </span>
          <button
            type="button"
            onClick={() => moveBlock(1)}
            disabled={safeBlockIndex >= totalBlocks - 1}
            className="min-h-11 rounded-xl bg-[#E9F2E7] px-4 text-sm font-black text-[#123D2C] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Meses anteriores
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 text-sm font-bold leading-6 text-[#123D2C] sm:grid-cols-2">
        <p>↕ Toque nos sinais de + para expandir Saldo, Receitas, Despesas, grupos e itens.</p>
        <p>↔ São exibidos três meses finalizados por vez. Arraste a tabela ou use os botões para avançar.</p>
      </div>

      {matrix.months.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-amber-50 p-5 font-bold leading-7 text-amber-900 ring-1 ring-amber-200">
          Ainda não existem competências finalizadas para montar a matriz.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto overscroll-x-contain pb-3">
          <table className="w-full min-w-[780px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-30 min-w-52 border-b border-r border-[#123D2C]/10 bg-[#123D2C] px-4 py-3 text-left font-black text-white">
                  Tipo
                </th>
                <th className="min-w-32 border-b border-r border-white/20 bg-[#123D2C] px-3 py-3 text-right font-black text-white">
                  Total
                </th>
                <th className="min-w-32 border-b border-r border-white/20 bg-[#123D2C] px-3 py-3 text-right font-black text-white">
                  Média
                </th>
                {visibleMonths.map((month) => (
                  <th
                    key={month.month}
                    className="min-w-36 border-b border-r border-white/20 bg-[#123D2C] px-3 py-3 text-right font-black capitalize text-white"
                  >
                    <span className="block">{monthLabel(month.month)}</span>
                    {editable && (
                      <Link
                        href={`${editBaseHref}?month=${month.month.slice(0, 7)}`}
                        className="mt-2 inline-flex rounded-lg bg-white px-2 py-1 text-[11px] font-black normal-case text-[#123D2C]"
                      >
                        Incluir/atualizar
                      </Link>
                    )}
                  </th>
                ))}
                {Array.from({ length: MONTHS_PER_BLOCK - visibleMonths.length }).map(
                  (_, index) => (
                    <th
                      key={`empty-${index}`}
                      className="min-w-36 border-b border-r border-white/20 bg-[#123D2C] px-3 py-3 text-right text-white/60"
                    >
                      —
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sticky left-0 z-20 border-b border-r border-[#123D2C]/10 bg-[#DDEAD8] p-0">
                  <button
                    type="button"
                    onClick={() => toggleSection("saldo")}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left font-black text-[#123D2C]"
                    aria-expanded={openSections.saldo}
                  >
                    <ToggleIcon open={openSections.saldo} />
                    Saldo bancário
                  </button>
                </td>
                <td className={`border-b border-r border-[#123D2C]/10 bg-[#E9F2E7] px-3 py-4 text-right font-black ${rowTone(newestVisibleBalance ?? 0)}`}>
                  {money(newestVisibleBalance)}
                </td>
                <td className={`border-b border-r border-[#123D2C]/10 bg-[#E9F2E7] px-3 py-4 text-right font-black ${rowTone(averageVisibleBalance ?? 0)}`}>
                  {money(averageVisibleBalance)}
                </td>
                {visibleMonths.map((month) => (
                  <td
                    key={`saldo-${month.month}`}
                    className={`border-b border-r border-[#123D2C]/10 bg-[#F7FAF2] px-3 py-4 text-right font-black ${rowTone(month.bankBalance ?? 0)}`}
                  >
                    {money(month.bankBalance)}
                  </td>
                ))}
                {Array.from({ length: MONTHS_PER_BLOCK - visibleMonths.length }).map(
                  (_, index) => (
                    <td key={`saldo-empty-${index}`} className="border-b border-r border-[#123D2C]/10 bg-[#F7FAF2] px-3 py-4 text-right">—</td>
                  ),
                )}
              </tr>

              {openSections.saldo && (
                <>
                  <MatrixValueRow
                    label="Saldo inicial"
                    level={1}
                    values={openingValues}
                    months={visibleMonths}
                  />
                  <MatrixValueRow
                    label="Saldo final"
                    level={1}
                    values={closingValues}
                    months={visibleMonths}
                  />
                </>
              )}

              {(["receita", "despesa"] as const).map((type) => {
                const sectionKey: SectionKey = type;
                const titleLabel = type === "receita" ? "Receitas" : "Despesas";
                const values = sectionValues[type];
                const sectionTotal = sumValues(values, visibleMonths);
                const sectionAverage = averageValues(values, visibleMonths);
                const typeGroups = matrix.groups.filter(
                  (group) => group.type === type,
                );

                return (
                  <FragmentRows key={type}>
                    <tr>
                      <td className="sticky left-0 z-20 border-b border-r border-[#123D2C]/10 bg-[#DDEAD8] p-0">
                        <button
                          type="button"
                          onClick={() => toggleSection(sectionKey)}
                          className="flex w-full items-center gap-3 px-4 py-4 text-left font-black text-[#123D2C]"
                          aria-expanded={openSections[sectionKey]}
                        >
                          <ToggleIcon open={openSections[sectionKey]} />
                          {titleLabel}
                        </button>
                      </td>
                      <td className="border-b border-r border-[#123D2C]/10 bg-[#E9F2E7] px-3 py-4 text-right font-black text-[#123D2C]">
                        {money(sectionTotal)}
                      </td>
                      <td className="border-b border-r border-[#123D2C]/10 bg-[#E9F2E7] px-3 py-4 text-right font-black text-[#123D2C]">
                        {money(sectionAverage)}
                      </td>
                      {visibleMonths.map((month) => (
                        <td
                          key={`${type}-${month.month}`}
                          className="border-b border-r border-[#123D2C]/10 bg-[#F7FAF2] px-3 py-4 text-right font-black text-[#123D2C]"
                        >
                          {money(valueForMonth(values, month.month))}
                        </td>
                      ))}
                      {Array.from({ length: MONTHS_PER_BLOCK - visibleMonths.length }).map(
                        (_, index) => (
                          <td key={`${type}-empty-${index}`} className="border-b border-r border-[#123D2C]/10 bg-[#F7FAF2] px-3 py-4 text-right">—</td>
                        ),
                      )}
                    </tr>

                    {openSections[sectionKey] &&
                      typeGroups.map((group) => {
                        const groupKey = `${type}:${group.group}`;
                        const open = Boolean(openGroups[groupKey]);
                        return (
                          <FragmentRows key={groupKey}>
                            <MatrixValueRow
                              label={group.group}
                              level={1}
                              values={group.values}
                              months={visibleMonths}
                              expandable
                              open={open}
                              onToggle={() => toggleGroup(groupKey)}
                            />
                            {open &&
                              group.items.map((item) => (
                                <MatrixValueRow
                                  key={`${groupKey}:${item.name}`}
                                  label={item.name}
                                  level={2}
                                  values={item.values}
                                  months={visibleMonths}
                                />
                              ))}
                          </FragmentRows>
                        );
                      })}
                  </FragmentRows>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FragmentRows({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function MatrixValueRow({
  label,
  level,
  values,
  months,
  expandable = false,
  open = false,
  onToggle,
}: {
  label: string;
  level: 1 | 2;
  values: Record<string, number>;
  months: FinancialMatrixMonth[];
  expandable?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const total = sumValues(values, months);
  const average = averageValues(values, months);
  const background = level === 1 ? "bg-[#F3F8F0]" : "bg-white";

  return (
    <tr>
      <td className={`sticky left-0 z-10 border-b border-r border-[#123D2C]/10 ${background} p-0`}>
        {expandable ? (
          <button
            type="button"
            onClick={onToggle}
            className={`flex w-full items-center gap-3 py-3 pr-4 text-left font-bold text-[#123D2C] ${level === 1 ? "pl-8" : "pl-14"}`}
            aria-expanded={open}
          >
            <ToggleIcon open={open} />
            {label}
          </button>
        ) : (
          <span className={`block py-3 pr-4 text-slate-700 ${level === 1 ? "pl-12 font-bold" : "pl-20"}`}>
            {label}
          </span>
        )}
      </td>
      <td className={`border-b border-r border-[#123D2C]/10 ${background} px-3 py-3 text-right font-bold ${rowTone(total)}`}>
        {money(total)}
      </td>
      <td className={`border-b border-r border-[#123D2C]/10 ${background} px-3 py-3 text-right font-bold ${rowTone(average)}`}>
        {money(average)}
      </td>
      {months.map((month) => {
        const value = valueForMonth(values, month.month);
        return (
          <td
            key={`${label}:${month.month}`}
            className={`border-b border-r border-[#123D2C]/10 ${background} px-3 py-3 text-right ${rowTone(value)}`}
          >
            {money(value)}
          </td>
        );
      })}
      {Array.from({ length: MONTHS_PER_BLOCK - months.length }).map((_, index) => (
        <td key={`${label}:empty:${index}`} className={`border-b border-r border-[#123D2C]/10 ${background} px-3 py-3 text-right`}>—</td>
      ))}
    </tr>
  );
}
