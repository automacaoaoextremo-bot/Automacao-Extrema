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
  provisional: boolean;
};

type Group = {
  type: "receita" | "despesa";
  group: string;
  total: number;
  items: Array<{ name: string; total: number }>;
};

type Preview = {
  generatedAt: string;
  settings: {
    detailLevel: "resumido" | "grupos" | "itens";
    showDrilldown: boolean;
    showTopExpenses: boolean;
    showTopRevenues: boolean;
    showSimulator: boolean;
    headline: string;
    message: string;
  };
  monthly: Monthly[];
  groups: Group[];
  totals: { revenues: number; expenses: number; result: number };
  latest: Monthly;
  confirmedPercentage: number;
  provisionalNotice: string | null;
};

type Snapshot = {
  id: string;
  reference_month: string;
  detail_level: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

type Payload = {
  canManage?: boolean;
  preview?: Preview;
  snapshots?: Snapshot[];
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
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    .replace(".", "");
}

export default function PrestacaoContasPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [simulationContributors, setSimulationContributors] = useState("100");
  const [simulationValue, setSimulationValue] = useState("50");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/cliente/corrente-em-dia/prestacao-contas",
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(
        result.error || "Não foi possível preparar a prestação de contas.",
      );
    }
    setPayload(result);
  }, [token]);

  useEffect(() => {
    let active = true;
    const timerId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar a prévia.",
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

  async function publish() {
    if (
      !window.confirm(
        "Publicar esta versão agregada no painel público? Nenhum nome ou valor individual será exposto.",
      )
    ) {
      return;
    }

    setPublishing(true);
    setError("");
    setMessage("");
    try {
      const accessToken = await token();
      const response = await fetch(
        "/api/organizacao-em-harmonia/cliente/corrente-em-dia/prestacao-contas",
        {
          method: "POST",
          headers: {
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "publish" }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível publicar.");
      }
      setMessage(result.message || "Prestação de contas publicada.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao publicar prestação de contas.",
      );
    } finally {
      setPublishing(false);
    }
  }

  const preview = payload.preview;
  const maxValue = useMemo(
    () =>
      Math.max(
        1,
        ...(preview?.monthly ?? []).flatMap((item) => [
          item.revenues,
          item.expenses,
        ]),
      ),
    [preview?.monthly],
  );

  const simulation = useMemo(() => {
    const contributors = Number(simulationContributors) || 0;
    const amount = Number(simulationValue.replace(",", ".")) || 0;
    const projected = contributors * amount;
    const expenses = preview?.latest.expenses ?? 0;
    return {
      projected,
      difference: projected - expenses,
      contributorsNeeded: amount > 0 ? Math.ceil(expenses / amount) : 0,
    };
  }, [preview?.latest.expenses, simulationContributors, simulationValue]);

  return (
    <OrganizacaoClientShell
      title="Prestação pública de contas"
      description="Revise uma visão agregada, sem nomes, contatos ou valores individuais. A publicação cria um snapshot que não muda enquanto os lançamentos internos continuam sendo trabalhados."
    >
      {loading && (
        <p className="rounded-2xl bg-white p-4 font-bold text-slate-500 shadow">
          Preparando a prévia...
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          {message}
        </p>
      )}

      {preview && (
        <>
          <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#CFE2C7]">
              Prévia pública
            </p>
            <h2 className="mt-2 text-2xl font-black">{preview.settings.headline}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
              {preview.settings.message}
            </p>
            <p className="mt-4 rounded-2xl bg-white/10 p-3 text-sm font-bold">
              Nenhum nome, contato, situação individual ou comprovante é incluído nesta publicação.
            </p>
          </section>

          {preview.provisionalNotice && (
            <section className="rounded-[1.5rem] bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
              <p className="font-black">Dados provisórios</p>
              <p className="mt-1 text-sm leading-6">{preview.provisionalNotice}</p>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Receitas — 12 meses
              </p>
              <p className="mt-2 text-xl font-black text-[#123D2C]">
                {money(preview.totals.revenues)}
              </p>
            </article>
            <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Despesas — 12 meses
              </p>
              <p className="mt-2 text-xl font-black text-[#123D2C]">
                {money(preview.totals.expenses)}
              </p>
            </article>
            <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Resultado
              </p>
              <p
                className={`mt-2 text-xl font-black ${
                  preview.totals.result < 0 ? "text-red-700" : "text-[#123D2C]"
                }`}
              >
                {money(preview.totals.result)}
              </p>
            </article>
            <article className="rounded-2xl bg-white p-4 shadow ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                Dados confirmados
              </p>
              <p className="mt-2 text-xl font-black text-[#123D2C]">
                {preview.confirmedPercentage}%
              </p>
            </article>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Histórico
                </p>
                <h2 className="mt-1 text-xl font-black text-[#00334E]">
                  Receitas e despesas por mês
                </h2>
              </div>
              <p className="text-sm font-bold text-slate-500">
                Nível: {preview.settings.detailLevel}
              </p>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {preview.monthly.map((item) => (
                <div key={item.month} className="min-w-[74px]">
                  <div className="flex h-40 items-end justify-center gap-1 rounded-2xl bg-[#F7FAF2] p-2">
                    <div
                      className="w-3 rounded-t-lg bg-[#2F6B43]"
                      style={{
                        height: `${Math.max(
                          3,
                          (item.revenues / maxValue) * 100,
                        )}%`,
                      }}
                    />
                    <div
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
                  {item.provisional && (
                    <p className="text-center text-[10px] font-black text-amber-700">
                      Provisório
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {preview.settings.detailLevel !== "resumido" && (
            <section className="grid gap-4 lg:grid-cols-2">
              {(["receita", "despesa"] as const).map((type) => (
                <article
                  key={type}
                  className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6"
                >
                  <h2 className="text-xl font-black text-[#00334E]">
                    {type === "receita" ? "Receitas por grupo" : "Despesas por grupo"}
                  </h2>
                  <div className="mt-4 grid gap-3">
                    {preview.groups
                      .filter((group) => group.type === type)
                      .map((group) => (
                        <details
                          key={`${type}-${group.group}`}
                          className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
                          open={preview.settings.detailLevel === "itens"}
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black text-[#123D2C]">
                            <span>{group.group}</span>
                            <span>{money(group.total)}</span>
                          </summary>
                          {preview.settings.detailLevel === "itens" && (
                            <div className="mt-3 grid gap-2">
                              {group.items.map((item) => (
                                <div
                                  key={item.name}
                                  className="flex justify-between gap-3 rounded-xl bg-white p-3 text-sm"
                                >
                                  <span>{item.name}</span>
                                  <span className="font-black">{money(item.total)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </details>
                      ))}
                  </div>
                </article>
              ))}
            </section>
          )}

          {preview.settings.showSimulator && (
            <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                Simulação interna
              </p>
              <h2 className="mt-2 text-xl font-black text-[#00334E]">
                Quantas contribuições ajudam a cobrir as despesas atuais?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Esta simulação não substitui uma decisão da Diretoria. Ela ajuda a Tesouraria a compreender cenários sem expor ninguém.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 font-black text-[#123D2C]">
                  Quantidade de contribuintes
                  <input
                    value={simulationContributors}
                    onChange={(event) =>
                      setSimulationContributors(event.target.value)
                    }
                    inputMode="numeric"
                    className="rounded-2xl border border-slate-200 p-4"
                  />
                </label>
                <label className="grid gap-2 font-black text-[#123D2C]">
                  Valor médio
                  <input
                    value={simulationValue}
                    onChange={(event) => setSimulationValue(event.target.value)}
                    inputMode="decimal"
                    className="rounded-2xl border border-slate-200 p-4"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#F7FAF2] p-4">
                  <p className="text-sm font-black text-[#123D2C]">
                    Receita projetada
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {money(simulation.projected)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F7FAF2] p-4">
                  <p className="text-sm font-black text-[#123D2C]">
                    Diferença para despesas
                  </p>
                  <p
                    className={`mt-1 text-xl font-black ${
                      simulation.difference < 0 ? "text-red-700" : "text-emerald-800"
                    }`}
                  >
                    {money(simulation.difference)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F7FAF2] p-4">
                  <p className="text-sm font-black text-[#123D2C]">
                    Pessoas necessárias
                  </p>
                  <p className="mt-1 text-xl font-black">
                    {simulation.contributorsNeeded}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#00334E]">
                  Publicação controlada
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  A publicação cria uma cópia aprovada. Alterações internas posteriores não mudam o painel até uma nova publicação.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/solucoes/organizacao-em-harmonia/tucxa/transparencia"
                  target="_blank"
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-center font-black text-[#123D2C]"
                >
                  Abrir painel público
                </Link>
                {payload.canManage && (
                  <button
                    type="button"
                    onClick={publish}
                    disabled={publishing}
                    className="rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white disabled:opacity-50"
                  >
                    {publishing ? "Publicando..." : "Publicar esta versão"}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-6">
            <h2 className="text-xl font-black text-[#00334E]">
              Histórico de snapshots
            </h2>
            <div className="mt-4 grid gap-2">
              {(payload.snapshots ?? []).map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F7FAF2] p-4"
                >
                  <div>
                    <p className="font-black text-[#123D2C]">
                      {monthLabel(snapshot.reference_month)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {snapshot.published_at
                        ? new Date(snapshot.published_at).toLocaleString("pt-BR")
                        : "Ainda não publicado"}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C]">
                    {snapshot.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}
