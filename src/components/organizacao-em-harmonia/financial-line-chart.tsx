"use client";

export type FinancialLineChartSeries = {
  label: string;
  values: Array<number | null | undefined>;
  color?: string;
};

type FinancialLineChartProps = {
  labels: string[];
  series: FinancialLineChartSeries[];
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
};

const DEFAULT_COLORS = [
  "#123D2C",
  "#2F6B43",
  "#A85B36",
  "#315F8C",
  "#6C4A8B",
  "#8A6A1F",
  "#246B72",
  "#8B3F55",
];

function finite(value: number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compactMoney(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}R$ ${(abs / 1_000_000).toFixed(1)} mi`;
  if (abs >= 1_000) return `${value < 0 ? "-" : ""}R$ ${(abs / 1_000).toFixed(1)} mil`;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function FinancialLineChart({
  labels,
  series,
  title = "Evolução por período",
  description,
  compact = false,
  className = "",
}: FinancialLineChartProps) {
  const usableSeries = series.filter((item) => item.values.length > 0);
  if (labels.length === 0 || usableSeries.length === 0) {
    return (
      <section className={`rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10 ${className}`}>
        <p className="font-bold text-slate-500">Não há dados suficientes para montar o gráfico.</p>
      </section>
    );
  }

  const width = 980;
  const height = compact ? 270 : 340;
  const margin = { top: 28, right: 24, bottom: compact ? 62 : 78, left: 92 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const values = usableSeries.flatMap((item) => item.values.map(finite));
  let minValue = Math.min(0, ...values);
  let maxValue = Math.max(0, ...values);
  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }
  const rawRange = maxValue - minValue;
  const padding = Math.max(rawRange * 0.08, 1);
  minValue -= padding;
  maxValue += padding;
  const range = maxValue - minValue;

  const xFor = (index: number) =>
    labels.length <= 1
      ? margin.left + plotWidth / 2
      : margin.left + (index / (labels.length - 1)) * plotWidth;
  const yFor = (value: number) =>
    margin.top + ((maxValue - value) / range) * plotHeight;

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    return maxValue - ratio * range;
  });

  const labelStep = labels.length > 8 ? Math.ceil(labels.length / 8) : 1;

  return (
    <section className={`rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10 ${className}`}>
      {(title || description) && (
        <div className="mb-3">
          {title && <h3 className="text-lg font-black text-[#123D2C]">{title}</h3>}
          {description && (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title || "Gráfico de linhas financeiro"}
          className="min-w-[44rem] w-full"
        >
          <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />

          {ticks.map((tick, index) => {
            const y = yFor(tick);
            return (
              <g key={`tick-${index}`}>
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={y}
                  y2={y}
                  stroke="#D7E2D6"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="700"
                  fill="#475569"
                >
                  {compactMoney(tick)}
                </text>
              </g>
            );
          })}

          {minValue < 0 && maxValue > 0 && (
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={yFor(0)}
              y2={yFor(0)}
              stroke="#64748B"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
          )}

          {labels.map((label, index) => {
            if (index % labelStep !== 0 && index !== labels.length - 1) return null;
            const x = xFor(index);
            return (
              <text
                key={`${label}-${index}`}
                x={x}
                y={height - 18}
                textAnchor="end"
                transform={`rotate(-32 ${x} ${height - 18})`}
                fontSize="11"
                fontWeight="700"
                fill="#475569"
              >
                {label}
              </text>
            );
          })}

          {usableSeries.map((item, seriesIndex) => {
            const color = item.color || DEFAULT_COLORS[seriesIndex % DEFAULT_COLORS.length];
            const points = labels
              .map((_, index) => `${xFor(index)},${yFor(finite(item.values[index]))}`)
              .join(" ");

            return (
              <g key={item.label}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {labels.map((_, index) => (
                  <circle
                    key={`${item.label}-${index}`}
                    cx={xFor(index)}
                    cy={yFor(finite(item.values[index]))}
                    r="3.5"
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  >
                    <title>{`${labels[index]} · ${item.label}: ${new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(finite(item.values[index]))}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}

          <g transform={`translate(${margin.left}, 8)`}>
            {usableSeries.map((item, index) => {
              const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
              const x = index * 180;
              return (
                <g key={`legend-${item.label}`} transform={`translate(${x}, 0)`}>
                  <line x1="0" x2="22" y1="8" y2="8" stroke={color} strokeWidth="4" />
                  <text x="29" y="12" fontSize="11" fontWeight="800" fill="#10251C">
                    {item.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </section>
  );
}
