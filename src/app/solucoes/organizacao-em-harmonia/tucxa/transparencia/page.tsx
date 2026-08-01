"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  currentForecast: MonthSummary;
  matrix: FinancialTransparencyMatrixData;
};

type ApiPayload = {
  live?: LivePayload;
  error?: string;
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
    label: "Dúvidas?",
    href: "#duvidas",
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

function ContributionAnchorButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Link
      href="#contribuir"
      className={`inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-3 text-center font-black text-white shadow-sm ${className}`}
    >
      Contribuir
    </Link>
  );
}

function SummaryNavigationButtons() {
  const items = [
    { label: "Finalizado", href: "#finalizado" },
    { label: "Atual", href: "#atual" },
    { label: "Detalhado", href: "#detalhado" },
  ];

  return (
    <nav
      aria-label="Acessos aos quadros financeiros"
      className="mt-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-3 py-3 text-center text-sm font-black text-[#123D2C] shadow-sm ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#EEF7EA] sm:px-5"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function FinancialSummary({
  id,
  title,
  subtitle,
  month,
}: {
  id: string;
  title: string;
  subtitle: string;
  month: MonthSummary;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-48 rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6"
    >
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
          tone="text-amber-800"
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
      <ContributionAnchorButton className="mt-4 w-full sm:w-auto" />
    </section>
  );
}

export default function TucxaTransparenciaPage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(true);

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
            {data?.settings.message ||
              "Acompanhe os recursos do último mês finalizado e a previsão do mês atual, com clareza sobre receitas, despesas, resultado e saldo."}
          </p>
          <SummaryNavigationButtons />
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
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.latestFinalized ? (
                <FinancialSummary
                  id="finalizado"
                  title="Último mês finalizado"
                  subtitle="Valores conferidos e encerrados pela Tesouraria/Financeiro."
                  month={data.latestFinalized}
                />
              ) : (
                <section
                  id="finalizado"
                  className="scroll-mt-48 rounded-[2rem] bg-amber-50 p-5 font-bold leading-7 text-amber-900 ring-1 ring-amber-200"
                >
                  <p>
                    Ainda não existe uma competência finalizada para exibição
                    pública.
                  </p>
                  <ContributionAnchorButton className="mt-4 w-full sm:w-auto" />
                </section>
              )}

              <FinancialSummary
                id="atual"
                title="Mês atual"
                subtitle="Média das receitas, despesas e saldo no banco consideradas como estimativa para o mês atual."
                month={data.currentForecast}
              />
            </div>

            <div id="detalhado" className="scroll-mt-48">
              <FinancialTransparencyMatrix matrix={data.matrix} />
              <ContributionAnchorButton className="mt-4 w-full sm:w-auto" />
            </div>

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
          </>
        )}
      </section>
    </main>
  );
}
