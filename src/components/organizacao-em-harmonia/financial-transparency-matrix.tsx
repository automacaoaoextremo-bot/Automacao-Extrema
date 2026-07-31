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

const TYPE_COLUMN_CLASS =
  "w-[9.5rem] min-w-[9.5rem] max-w-[9.5rem] sm:w-60 sm:min-w-60 sm:max-w-60";

export function FinancialTransparencyMatrix({
  matrix,
  editable = false,
  editBaseHref = "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/balancetes",
  title = "Prestação de contas por mês",
  description = "",
}: MatrixProps) {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    saldo: false,
    receita: false,
    despesa: false,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const months = matrix.months;

  const sectionValues = useMemo(() => {
    const values: Record<"receita" | "despesa", Record<string, number>> = {
      receita: {},
      despesa: {},
    };

    for (const group of matrix.groups) {
      for (const month of months) {
        values[group.type][month.month] =
          (values[group.type][month.month] ?? 0) +
          valueForMonth(group.values, month.month);
      }
    }

    return values;
  }, [matrix.groups, months]);

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
    months.map((month) => [month.month, month.openingBalance ?? 0]),
  );
  const closingValues = Object.fromEntries(
    months.map((month) => [month.month, month.closingBalance ?? 0]),
  );

  const newestBalance = months[0]?.bankBalance ?? null;
  const averageBalance =
    months.length > 0
      ? months.reduce((sum, month) => sum + (month.bankBalance ?? 0), 0) /
        months.length
      : null;

  return (
    <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
          Visão Detalhada
        </p>
        <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{title}</h2>
        {description.trim() && (
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 text-sm font-bold leading-6 text-[#123D2C] sm:grid-cols-2">
        <p>
          ↕ Toque nos sinais de + para expandir Saldo, Receitas, Despesas,
          grupos e itens.
        </p>
        <p>↔ Arraste a tabela ou use a barra de rolagem para avançar.</p>
      </div>

      {months.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-amber-50 p-5 font-bold leading-7 text-amber-900 ring-1 ring-amber-200">
          Ainda não existem competências finalizadas para montar a visão
          detalhada.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto overscroll-x-contain pb-3">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  className={`sticky left-0 z-30 ${TYPE_COLUMN_CLASS} border-b border-r border-[#123D2C]/10 bg-[#123D2C] px-3 py-3 text-left font-black text-white sm:px-4`}
                >
                  Tipo
                </th>

                {months.map((month) => (
                  <th
                    key={month.month}
                    className="min-w-[8.25rem] border-b border-r border-white/20 bg-[#123D2C] px-3 py-3 text-right font-black capitalize text-white"
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

                <th className="min-w-32 border-b border-r border-white/20 bg-[#123D2C] px-3 py-3 text-right font-black text-white">
                  Total
                </th>
                <th className="min-w-32 border-b border-r border-white/20 bg-[#123D2C] px-3 py-3 text-right font-black text-white">
                  Média
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td
                  className={`sticky left-0 z-20 ${TYPE_COLUMN_CLASS} border-b border-r border-[#123D2C]/10 bg-[#DDEAD8] p-0`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection("saldo")}
                    className="flex w-full items-center gap-2 px-3 py-4 text-left font-black text-[#123D2C] sm:gap-3 sm:px-4"
                    aria-expanded={openSections.saldo}
                  >
                    <ToggleIcon open={openSections.saldo} />
                    <span className="min-w-0 leading-5">Saldo bancário</span>
                  </button>
                </td>

                {months.map((month) => (
                  <td
                    key={`saldo-${month.month}`}
                    className={`border-b border-r border-[#123D2C]/10 bg-[#F7FAF2] px-3 py-4 text-right font-black ${rowTone(
                      month.bankBalance ?? 0,
                    )}`}
                  >
                    {money(month.bankBalance)}
                  </td>
                ))}

                <td
                  className={`border-b border-r border-[#123D2C]/10 bg-[#E9F2E7] px-3 py-4 text-right font-black ${rowTone(
                    newestBalance ?? 0,
                  )}`}
                  title="Na linha de saldo, Total representa o saldo do mês finalizado mais recente."
                >
                  {money(newestBalance)}
                </td>
                <td
                  className={`border-b border-r border-[#123D2C]/10 bg-[#E9F2E7] px-3 py-4 text-right font-black ${rowTone(
                    averageBalance ?? 0,
                  )}`}
                >
                  {money(averageBalance)}
                </td>
              </tr>

              {openSections.saldo && (
                <>
                  <MatrixValueRow
                    label="Saldo inicial"
                    level={1}
                    values={openingValues}
                    months={months}
                  />
                  <MatrixValueRow
                    label="Saldo final"
                    level={1}
                    values={closingValues}
                    months={months}
                  />
                </>
              )}

              {(["receita", "despesa"] as const).map((type) => {
                const sectionKey: SectionKey = type;
                const titleLabel = type === "receita" ? "Receitas" : "Despesas";
                const values = sectionValues[type];
                const sectionTotal = sumValues(values, months);
                const sectionAverage = averageValues(values, months);
                const typeGroups = matrix.groups.filter(
                  (group) => group.type === type,
                );

                return (
                  <FragmentRows key={type}>
                    <tr>
                      <td
                        className={`sticky left-0 z-20 ${TYPE_COLUMN_CLASS} border-b border-r border-[#123D2C]/10 bg-[#DDEAD8] p-0`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(sectionKey)}
                          className="flex w-full items-center gap-2 px-3 py-4 text-left font-black text-[#123D2C] sm:gap-3 sm:px-4"
                          aria-expanded={openSections[sectionKey]}
                        >
                          <ToggleIcon open={openSections[sectionKey]} />
                          {titleLabel}
                        </button>
                      </td>

                      {months.map((month) => (
                        <td
                          key={`${type}-${month.month}`}
                          className="border-b border-r border-[#123D2C]/10 bg-[#F7FAF2] px-3 py-4 text-right font-black text-[#123D2C]"
                        >
                          {money(valueForMonth(values, month.month))}
                        </td>
                      ))}

                      <td className="border-b border-r border-[#123D2C]/10 bg-[#E9F2E7] px-3 py-4 text-right font-black text-[#123D2C]">
                        {money(sectionTotal)}
                      </td>
                      <td className="border-b border-r border-[#123D2C]/10 bg-[#E9F2E7] px-3 py-4 text-right font-black text-[#123D2C]">
                        {money(sectionAverage)}
                      </td>
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
                              months={months}
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
                                  months={months}
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

      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
        Na linha de saldo bancário, “Total” representa o saldo do mês
        finalizado mais recente; “Média” representa a média dos saldos dos
        meses exibidos.
      </p>
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
      <td
        className={`sticky left-0 z-10 ${TYPE_COLUMN_CLASS} border-b border-r border-[#123D2C]/10 ${background} p-0`}
      >
        {expandable ? (
          <button
            type="button"
            onClick={onToggle}
            className={`flex w-full items-center gap-2 py-3 pr-3 text-left font-bold leading-5 text-[#123D2C] sm:gap-3 sm:pr-4 ${
              level === 1 ? "pl-5 sm:pl-8" : "pl-8 sm:pl-14"
            }`}
            aria-expanded={open}
          >
            <ToggleIcon open={open} />
            <span className="min-w-0 break-words">{label}</span>
          </button>
        ) : (
          <span
            className={`block break-words py-3 pr-3 leading-5 text-slate-700 sm:pr-4 ${
              level === 1
                ? "pl-10 font-bold sm:pl-12"
                : "pl-12 sm:pl-20"
            }`}
          >
            {label}
          </span>
        )}
      </td>

      {months.map((month) => {
        const value = valueForMonth(values, month.month);

        return (
          <td
            key={`${label}:${month.month}`}
            className={`border-b border-r border-[#123D2C]/10 ${background} px-3 py-3 text-right ${rowTone(
              value,
            )}`}
          >
            {money(value)}
          </td>
        );
      })}

      <td
        className={`border-b border-r border-[#123D2C]/10 ${background} px-3 py-3 text-right font-bold ${rowTone(
          total,
        )}`}
      >
        {money(total)}
      </td>
      <td
        className={`border-b border-r border-[#123D2C]/10 ${background} px-3 py-3 text-right font-bold ${rowTone(
          average,
        )}`}
      >
        {money(average)}
      </td>
    </tr>
  );
}
