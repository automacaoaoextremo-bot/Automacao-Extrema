"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FinancialLineChart } from "@/components/organizacao-em-harmonia/financial-line-chart";
import {
  FinancialTransparencyMatrix,
  type FinancialTransparencyMatrixData,
} from "@/components/organizacao-em-harmonia/financial-transparency-matrix";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type MonthSummary = {
  month: string;
  workflowStatus: string;
  finalized: boolean;
  current: boolean;
  hasData: boolean;
  revenues: number | null;
  expenses: number | null;
  result: number | null;
  openingBalance: number | null;
  closingBalance: number | null;
  bankBalance: number | null;
  realizedRevenues: number;
  realizedExpenses: number;
  estimatedRevenues: number;
  estimatedExpenses: number;
  sourceLabel: string | null;
  updatedAt: string | null;
};

type LivePayload = {
  generatedAt: string;
  settings: {
    detailLevel: "resumido" | "grupos" | "itens";
    showLast12Months: boolean;
    showDrilldown: boolean;
    showTopExpenses: boolean;
    showTopRevenues: boolean;
    showNegativeResults: boolean;
    showAccumulatedBalance: boolean;
    headline: string;
    message: string;
  };
  latestFinalized: MonthSummary | null;
  matrix: FinancialTransparencyMatrixData;
};

type ApiPayload = {
  live?: LivePayload;
  error?: string;
};

type PopupKey = "finalizado" | "detalhado" | "analises" | null;

type RankedItem = {
  name: string;
  total: number;
  average: number;
};

const actions = [
  {
    label: "Início",
    href: "#inicio",
    variant: "secondary" as const,
  },
  {
    label: "Voltar",
    href: "/solucoes/organizacao-em-harmonia/tucxa",
    variant: "secondary" as const,
  },
  {
    label: "Contribuir",
    href: "#contribuir",
    variant: "primary" as const,
  },
  {
    label: "Ajuda",
    href: "#ajuda",
    variant: "secondary" as const,
    action: "supportWhatsapp" as const,
  },
];

function money(value: number | null | undefined) {
  if (value == null) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function publicMessageWithoutCurrent(value?: string | null) {
  const fallback =
    "Acompanhe os recursos das competências finalizadas, com clareza sobre receitas, despesas, resultado e saldo.";
  const current = (value || "").trim();
  if (!current) return fallback;

  const normalized = current
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("mes atual") || normalized.includes("previsao")) {
    return fallback;
  }

  return current;
}

function monthLabel(value: string, format: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("pt-BR", {
    month: format,
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    .replace(".", "");
}

function MetricCard({
  label,
  value,
  tone = "text-[#123D2C]",
}: {
  label: string;
  value: number | null;
  tone?: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
        {label}
      </p>
      <p className={`mt-2 text-xl font-black ${tone}`}>{money(value)}</p>
    </article>
  );
}

function ContributionChoiceButtons({
  className = "",
  inverse = false,
}: {
  className?: string;
  inverse?: boolean;
}) {
  const items = [
    {
      label: "Contribuição Anônima",
      href: "/solucoes/organizacao-em-harmonia/tucxa/contribuir#contribuicao-anonima",
    },
    {
      label: "Contribuição com Cadastro",
      href: "/solucoes/organizacao-em-harmonia/tucxa/contribuir#com-cadastro",
    },
  ];

  return (
    <nav
      aria-label="Formas de contribuição"
      className={`grid w-full grid-cols-2 gap-2 ${className}`}
    >
      {items.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className={`inline-flex min-h-12 items-center justify-center rounded-2xl px-3 py-3 text-center text-sm font-black shadow-sm ring-1 transition hover:-translate-y-0.5 ${
            inverse
              ? index === 0
                ? "bg-[#CFE2C7] text-[#123D2C] ring-white/20 hover:bg-white"
                : "bg-white text-[#123D2C] ring-white/20 hover:bg-[#EEF7EA]"
              : index === 0
                ? "bg-[#123D2C] text-white ring-[#123D2C]"
                : "bg-white text-[#123D2C] ring-[#123D2C]/15 hover:bg-[#F7FAF2]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SummaryNavigationButtons({
  onOpen,
}: {
  onOpen: (key: Exclude<PopupKey, null>) => void;
}) {
  const items: Array<{ label: string; key: Exclude<PopupKey, null> }> = [
    { label: "Finalizado", key: "finalizado" },
    { label: "Detalhado", key: "detalhado" },
    { label: "Análises", key: "analises" },
  ];

  return (
    <nav
      aria-label="Acessos aos quadros financeiros"
      className="mt-5 grid grid-cols-3 gap-2"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onOpen(item.key)}
          className="inline-flex min-h-16 min-w-0 flex-col items-center justify-center rounded-2xl bg-white px-2 py-3 text-center text-[#123D2C] shadow-sm ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA] sm:px-5"
        >
          <span className="block text-sm font-black sm:text-base">{item.label}</span>
          <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-[10px] sm:tracking-[0.18em]">
            TOQUE PARA ABRIR
          </span>
        </button>
      ))}
    </nav>
  );
}

function Popup({
  title,
  subtitle,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10251C]/70 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`max-h-[92vh] w-full overflow-y-auto rounded-[2rem] bg-[#F7FAF2] shadow-2xl ring-1 ring-white/30 ${
          wide ? "max-w-7xl" : "max-w-3xl"
        }`}
      >
        <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
              Transparência em Harmonia
            </p>
            <h2 className="mt-1 text-xl font-black text-[#123D2C] sm:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
          >
            Fechar
          </button>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

function FinancialSummary({
  title,
  subtitle,
  month,
}: {
  title: string;
  subtitle: string;
  month: MonthSummary;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
        {title}
      </p>
      <h2 className="mt-1 text-2xl font-black capitalize text-[#123D2C]">
        {monthLabel(month.month, "long")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Receitas"
          value={month.revenues}
          tone="text-emerald-800"
        />
        <MetricCard
          label="Despesas"
          value={month.expenses}
          tone="text-[#123D2C]"
        />
        <MetricCard
          label="Resultado"
          value={month.result}
          tone={(month.result ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]"}
        />
        <MetricCard
          label="Saldo no banco"
          value={month.bankBalance}
          tone={
            (month.bankBalance ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]"
          }
        />
      </div>
      <ContributionChoiceButtons className="mt-4" />
    </section>
  );
}

function PublicRankingTable({ title, items }: { title: string; items: RankedItem[] }) {
  return (
    <article className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
      <h3 className="text-lg font-black text-[#123D2C] sm:text-xl">{title}</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        Média mensal calculada sobre todas as competências finalizadas disponíveis.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-[#2F6B43]">
              <th className="border-b border-[#123D2C]/10 px-2 py-2">Item</th>
              <th className="border-b border-[#123D2C]/10 px-2 py-2 text-right">
                Média/mês
              </th>
              <th className="border-b border-[#123D2C]/10 px-2 py-2 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td className="border-b border-[#123D2C]/5 px-2 py-3 font-bold text-slate-700">
                  {index + 1}. {item.name}
                </td>
                <td className="border-b border-[#123D2C]/5 px-2 py-3 text-right font-black text-[#123D2C]">
                  {money(item.average)}
                </td>
                <td className="border-b border-[#123D2C]/5 px-2 py-3 text-right font-black text-[#123D2C]">
                  {money(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function matrixTypeValue(
  matrix: FinancialTransparencyMatrixData,
  type: "receita" | "despesa",
  month: string,
) {
  return matrix.groups
    .filter((group) => group.type === type)
    .reduce((sum, group) => sum + (Number(group.values[month]) || 0), 0);
}

function rankMatrixItems(
  matrix: FinancialTransparencyMatrixData,
  type: "receita" | "despesa",
): RankedItem[] {
  const totals = new Map<string, number>();
  for (const group of matrix.groups.filter((item) => item.type === type)) {
    for (const item of group.items) {
      const total = matrix.months.reduce(
        (sum, month) => sum + (Number(item.values[month.month]) || 0),
        0,
      );
      totals.set(item.name, (totals.get(item.name) ?? 0) + total);
    }
  }

  const monthCount = matrix.months.length;
  return Array.from(totals.entries())
    .map(([name, total]) => ({
      name,
      total,
      average: monthCount > 0 ? total / monthCount : 0,
    }))
    .sort((left, right) => right.average - left.average);
}

export default function TucxaTransparenciaPage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);
  const [openPopup, setOpenPopup] = useState<PopupKey>(null);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void fetch("/api/organizacao-em-harmonia/site-tucxa/transparencia", {
        cache: "no-store",
      })
        .then(async (response) => {
          const result = (await response.json()) as ApiPayload;

          if (!active) return;
          setPayload(result);
        })
        .catch(() => {
          if (active) {
            setPayload({
              error: "Não foi possível carregar a prestação de contas.",
            });
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, []);

  const data = payload.live;

  const chart = useMemo(() => {
    if (!data) return { labels: [] as string[], saldo: [] as number[], receitas: [] as number[], despesas: [] as number[] };
    const months = [...data.matrix.months].reverse();
    return {
      labels: months.map((month) => monthLabel(month.month)),
      saldo: months.map((month) => Number(month.bankBalance) || 0),
      receitas: months.map((month) => matrixTypeValue(data.matrix, "receita", month.month)),
      despesas: months.map((month) => matrixTypeValue(data.matrix, "despesa", month.month)),
    };
  }, [data]);

  const publicRankings = useMemo(() => {
    if (!data) return { receitas: [] as RankedItem[], despesas: [] as RankedItem[] };
    return {
      receitas: rankMatrixItems(data.matrix, "receita"),
      despesas: rankMatrixItems(data.matrix, "despesa"),
    };
  }, [data]);

  return (
    <main id="inicio" className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={actions}
        navLabel="Menu da Transparência em Harmonia"
        showSupport={false}
      />

      <section className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl shadow-green-900/10 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
            Transparência em Harmonia
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            {data?.settings.headline || "Fortalecendo a confiança"}
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-[#EEF7EA]">
            {publicMessageWithoutCurrent(data?.settings.message)}
          </p>
          <SummaryNavigationButtons onOpen={setOpenPopup} />
          <ContributionChoiceButtons className="mt-3" inverse />
        </header>

        {loading && (
          <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
            Carregando a prestação de contas...
          </p>
        )}

        {!loading && payload.error && (
          <p className="rounded-2xl bg-red-50 p-5 font-bold text-red-700">
            {payload.error}
          </p>
        )}

        {data && (
          <section
            id="contribuir"
            className="scroll-mt-48 rounded-[2rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10 sm:p-7"
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
              Um cuidado que continua depois do clique
            </p>
            <h2 className="mt-2 max-w-4xl text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
              O que mantém a Casa preparada nem sempre aparece, mas faz
              diferença em cada trabalho.
            </h2>
            <p className="mt-3 max-w-4xl leading-7 text-slate-700">
              Água, energia, limpeza, segurança, conservação e materiais
              transformam estrutura em acolhimento. Sua contribuição não é
              apenas um valor: é uma forma prática de ajudar o Tucxa a seguir
              disponível, organizado e pronto para cuidar.
            </p>

            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/contribuir"
              className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#123D2C] px-6 py-4 text-center text-lg font-black text-white shadow sm:w-auto"
            >
              Acessar formas de contribuição
            </Link>
          </section>
        )}
      </section>

      {openPopup === "finalizado" && data && (
        <Popup
          title="Finalizado"
          subtitle="Última competência conferida e encerrada pela Tesouraria/Financeiro."
          onClose={() => setOpenPopup(null)}
        >
          {data.latestFinalized ? (
            <FinancialSummary
              title="Último mês finalizado"
              subtitle="Valores conferidos e encerrados pela Tesouraria/Financeiro."
              month={data.latestFinalized}
            />
          ) : (
            <p className="rounded-2xl bg-amber-50 p-5 font-bold leading-7 text-amber-900 ring-1 ring-amber-200">
              Ainda não existe uma competência finalizada para exibição pública.
            </p>
          )}
        </Popup>
      )}

      {openPopup === "detalhado" && data && (
        <Popup
          title="Detalhado"
          subtitle="Competências finalizadas com visão em tabela e gráfico de linhas."
          onClose={() => setOpenPopup(null)}
          wide
        >
          <div className="grid gap-4">
            <FinancialLineChart
              labels={chart.labels}
              series={[
                { label: "Saldo bancário", values: chart.saldo, color: "#123D2C" },
                { label: "Receitas", values: chart.receitas, color: "#2F6B43" },
                { label: "Despesas", values: chart.despesas, color: "#A85B36" },
              ]}
              title="Evolução de saldo, receitas e despesas"
              description="A leitura considera todas as competências finalizadas exibidas na tabela abaixo."
            />
            <FinancialTransparencyMatrix matrix={data.matrix} title="Detalhado" />
            <ContributionChoiceButtons />
          </div>
        </Popup>
      )}

      {openPopup === "analises" && data && (
        <Popup
          title="Análises"
          subtitle="Maiores receitas e despesas considerando todas as competências finalizadas."
          onClose={() => setOpenPopup(null)}
          wide
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <PublicRankingTable
              title="Maiores receitas médias"
              items={publicRankings.receitas}
            />
            <PublicRankingTable
              title="Maiores despesas médias"
              items={publicRankings.despesas}
            />
          </div>
        </Popup>
      )}
    </main>
  );
}
