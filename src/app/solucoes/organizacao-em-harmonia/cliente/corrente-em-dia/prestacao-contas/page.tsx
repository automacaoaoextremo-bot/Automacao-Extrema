"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type MonthSummary = {
  month: string;
  revenues: number | null;
  expenses: number | null;
  result: number | null;
  bankBalance: number | null;
};

type Payload = {
  canManage?: boolean;
  live?: {
    latestFinalized: MonthSummary | null;
    currentForecast: MonthSummary;
    settings: {
      popupAutoOpen: boolean;
      headline: string;
    };
  };
  error?: string;
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function Summary({ title, month }: { title: string; month: MonthSummary }) {
  return (
    <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
        {title}
      </p>
      <h2 className="mt-1 text-xl font-black capitalize text-[#123D2C]">
        {monthLabel(month.month)}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Receitas", month.revenues, "text-emerald-800"],
          ["Despesas", month.expenses, "text-amber-800"],
          [
            "Resultado",
            month.result,
            (month.result ?? 0) < 0 ? "text-red-700" : "text-[#123D2C]",
          ],
          [
            "Saldo no banco",
            month.bankBalance,
            (month.bankBalance ?? 0) < 0
              ? "text-red-700"
              : "text-[#123D2C]",
          ],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl bg-[#F7FAF2] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              {label}
            </p>
            <p className={`mt-2 text-lg font-black ${tone}`}>
              {money(value as number | null)}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function PrestacaoContasPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/prestacao-contas",
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar a prestação.");
    }
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setPayload({
              error:
                reason instanceof Error
                  ? reason.message
                  : "Erro ao carregar a prestação de contas.",
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
  }, [load]);

  const live = payload.live;

  return (
    <OrganizacaoClientShell
      title="Validação da prestação de contas"
      description="Confira exatamente o que aparece no popup e no painel público. Os valores agora são atualizados pelo financeiro finalizado e pelos registros do mês atual, sem publicação manual."
    >
      {loading && (
        <p className="rounded-2xl bg-white p-5 font-bold text-slate-500 shadow">
          Carregando a visão pública...
        </p>
      )}

      {payload.error && (
        <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {payload.error}
        </p>
      )}

      {live && (
        <>
          <section className="rounded-[2rem] bg-[#E9F2E7] p-5 ring-1 ring-[#123D2C]/10 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              Funcionamento atual
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
              Dados públicos sem etapa manual de publicação
            </h2>
            <p className="mt-3 max-w-4xl leading-7 text-slate-700">
              O último mês finalizado é apresentado como resultado oficial. O
              mês atual mostra o que já foi registrado e as estimativas ativas.
              Meses anteriores ainda não finalizados permanecem sem valores na
              área pública.
            </p>
            <p className="mt-3 text-sm font-bold text-[#123D2C]">
              Popup automático: {live.settings.popupAutoOpen ? "ativado" : "desativado"}
            </p>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            {live.latestFinalized ? (
              <Summary title="Último mês finalizado" month={live.latestFinalized} />
            ) : (
              <p className="rounded-[2rem] bg-amber-50 p-5 font-bold text-amber-900">
                Ainda não existe uma competência marcada como finalizada.
              </p>
            )}
            <Summary title="Previsão do mês atual" month={live.currentForecast} />
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/transparencia"
              target="_blank"
              className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
            >
              Abrir painel público
            </Link>
            <Link
              href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/gestao-financeira"
              className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C]"
            >
              Gestão Financeira
            </Link>
            <Link
              href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/balancetes"
              className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] shadow ring-1 ring-slate-100"
            >
              Finalizar competências
            </Link>
            <Link
              href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/configuracoes"
              className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] shadow ring-1 ring-slate-100"
            >
              Configurar popup e painel
            </Link>
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}
