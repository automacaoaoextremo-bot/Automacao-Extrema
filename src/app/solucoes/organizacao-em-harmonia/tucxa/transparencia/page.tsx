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
    label: "Finalizado",
    href: "#finalizado",
    variant: "secondary" as const,
  },
  {
    label: "Atual",
    href: "#atual",
    variant: "secondary" as const,
  },
  {
    label: "Detalhado",
    href: "#detalhado",
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
              "Acompanhe o último mês finalizado, o mês atual e a evolução detalhada das receitas, despesas e saldos."}
          </p>
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
                  Ainda não existe uma competência finalizada para exibição
                  pública.
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

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                    Sem cadastro
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#123D2C]">
                    Contribua de forma anônima e escolha o que cabe no seu
                    momento.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Defina um valor livre ou sugerido, gere um QR Code Pix,
                    organize um Pix recorrente pelo seu banco ou receba a
                    orientação da Recepção para cartão, débito ou dinheiro.
                  </p>
                  <Link
                    href="/solucoes/organizacao-em-harmonia/tucxa/contribuir?tipo=anonima"
                    className="mt-4 inline-flex w-full justify-center rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
                  >
                    Contribuir de forma anônima
                  </Link>
                </article>

                <article className="rounded-2xl bg-white p-5 shadow ring-1 ring-[#123D2C]/10">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                    Com cadastro
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#123D2C]">
                    Organize histórico, lembretes e preferências com sigilo.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Escolha o caminho correspondente ao seu vínculo para fazer
                    cadastro, entrar no sistema e acompanhar suas contribuições.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link
                      href="/solucoes/organizacao-em-harmonia/tucxa#corrente"
                      className="rounded-2xl bg-[#123D2C] px-4 py-4 text-center font-black text-white"
                    >
                      Filho da Corrente
                    </Link>
                    <Link
                      href="/solucoes/organizacao-em-harmonia/tucxa#consulentes"
                      className="rounded-2xl bg-[#E9F2E7] px-4 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                    >
                      Consulente / Filho de Fora
                    </Link>
                  </div>
                </article>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
