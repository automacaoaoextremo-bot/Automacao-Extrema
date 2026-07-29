"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Monthly = {
  month: string;
  revenues: number;
  expenses: number;
  result: number;
  isProvisional: boolean;
  needsUpdate: boolean;
};

type DashboardPayload = {
  canManage?: boolean;
  dashboard?: {
    current: Monthly;
    monthly: Monthly[];
    totals: {
      revenues: number;
      expenses: number;
      result: number;
      receivedContributionAmount: number;
    };
    pendingImports: number;
    pendingReconciliations: number;
    provisionalMonths: number;
    familyGroups: number;
  };
  error?: string;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    .replace(".", "");
}

const shortcuts = [
  {
    title: "Lançamentos",
    description:
      "Cadastre receitas e despesas, revise dados provisórios e aprove competências.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos",
  },
  {
    title: "Importar e conciliar",
    description:
      "CSV, XLSX, OFX, extratos bancários, Google Sheets e documentos com OCR.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/importacoes",
  },
  {
    title: "Conciliação bancária",
    description:
      "Associe movimentos do extrato a lançamentos ou crie o registro com revisão humana.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/reconciliacao",
  },
  {
    title: "Contribuições",
    description:
      "Acompanhe contribuições identificadas ou não, comprovantes e conferência.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/contribuicoes",
  },
  {
    title: "Contribuição familiar",
    description:
      "Configure graus de parentesco, responsáveis e composição dos grupos familiares.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/familias",
  },
  {
    title: "Prestação pública",
    description:
      "Revise o painel agregado e publique um snapshot sem expor nenhuma pessoa.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/prestacao-contas",
  },
  {
    title: "Configurações",
    description:
      "Valor padrão, vencimentos, lembretes, sigilo e nível de detalhamento público.",
    href: "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/configuracoes",
  },
];

export default function CorrenteEmDiaClientePage() {
  const [payload, setPayload] = useState<DashboardPayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia",
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as DashboardPayload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar o painel.");
    }
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar o painel.",
            );
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
  }, [load]);

  const monthly = useMemo(
    () => payload.dashboard?.monthly ?? [],
    [payload.dashboard],
  );
  const maxValue = useMemo(
    () =>
      Math.max(
        1,
        ...monthly.flatMap((item) => [item.revenues, item.expenses]),
      ),
    [monthly],
  );

  const current = payload.dashboard?.current;
  const totals = payload.dashboard?.totals;

  return (
    <OrganizacaoClientShell
      title="Corrente em Dia"
      description="Sustentação financeira, sigilo e transparência para manter a Casa em harmonia."
    >
      <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">
          Sustentação em Harmonia
        </p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
          Ajude a manter a Casa organizada sem transformar contribuição em cobrança fria.
        </h2>
        <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
          Centralize receitas, despesas, contribuições, documentos e extratos. A Tesouraria/Financeiro trabalha com dados individuais em sigilo, enquanto o público acompanha somente valores agregados e aprovados.
        </p>
      </section>

      {loading && (
        <p className="rounded-2xl bg-white p-4 font-bold text-slate-500 shadow">
          Carregando indicadores...
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Receitas do mês
              </p>
              <p className="mt-2 text-2xl font-black text-[#123D2C]">
                {money(current?.revenues ?? 0)}
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Despesas do mês
              </p>
              <p className="mt-2 text-2xl font-black text-[#123D2C]">
                {money(current?.expenses ?? 0)}
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Resultado do mês
              </p>
              <p
                className={`mt-2 text-2xl font-black ${
                  (current?.result ?? 0) < 0
                    ? "text-red-700"
                    : "text-[#123D2C]"
                }`}
              >
                {money(current?.result ?? 0)}
              </p>
            </article>
            <article className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Meses a atualizar
              </p>
              <p className="mt-2 text-2xl font-black text-amber-700">
                {payload.dashboard?.provisionalMonths ?? 0}
              </p>
            </article>
          </section>

          {(current?.isProvisional || current?.needsUpdate) && (
            <section className="rounded-[1.5rem] bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
              <p className="font-black">Dados provisórios</p>
              <p className="mt-1 text-sm leading-6">
                Os valores de 2026 foram inicialmente baseados em dezembro de 2025 e precisam ser substituídos pelos valores realizados.
              </p>
            </section>
          )}

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Últimos 12 meses
                </p>
                <h3 className="mt-1 text-xl font-black text-[#00334E]">
                  Receitas e despesas
                </h3>
              </div>
              <p className="text-sm font-bold text-slate-500">
                Resultado acumulado: {money(totals?.result ?? 0)}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-12 items-end gap-2 overflow-x-auto pb-2">
              {monthly.map((item) => (
                <div
                  key={item.month}
                  className="col-span-2 min-w-[68px] sm:col-span-1"
                >
                  <div className="flex h-40 items-end justify-center gap-1 rounded-2xl bg-[#F7FAF2] p-2">
                    <div
                      title={`Receitas: ${money(item.revenues)}`}
                      className="w-3 rounded-t-lg bg-[#2F6B43]"
                      style={{
                        height: `${Math.max(
                          3,
                          (item.revenues / maxValue) * 100,
                        )}%`,
                      }}
                    />
                    <div
                      title={`Despesas: ${money(item.expenses)}`}
                      className="w-3 rounded-t-lg bg-[#D99B42]"
                      style={{
                        height: `${Math.max(
                          3,
                          (item.expenses / maxValue) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-center text-[11px] font-black text-slate-500">
                    {monthLabel(item.month)}
                  </p>
                  {item.isProvisional && (
                    <p className="text-center text-[10px] font-black text-amber-700">
                      Provisório
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[1.75rem] bg-white p-5 shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <h3 className="text-lg font-black text-[#00334E]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
                <span className="mt-4 inline-flex rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">
                  Abrir
                </span>
              </Link>
            ))}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl bg-[#E9F2E7] p-4">
              <p className="text-sm font-black text-[#123D2C]">
                Importações pendentes
              </p>
              <p className="mt-1 text-2xl font-black">
                {payload.dashboard?.pendingImports ?? 0}
              </p>
            </article>
            <article className="rounded-2xl bg-[#E9F2E7] p-4">
              <p className="text-sm font-black text-[#123D2C]">
                Transações a conciliar
              </p>
              <p className="mt-1 text-2xl font-black">
                {payload.dashboard?.pendingReconciliations ?? 0}
              </p>
            </article>
            <article className="rounded-2xl bg-[#E9F2E7] p-4">
              <p className="text-sm font-black text-[#123D2C]">
                Grupos familiares
              </p>
              <p className="mt-1 text-2xl font-black">
                {payload.dashboard?.familyGroups ?? 0}
              </p>
            </article>
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}
