"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoPanelBase,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import {
  MemberContributionJourney,
  type MemberReceptionContact,
} from "@/components/organizacao-em-harmonia/member-contribution-journey";
import { supabaseBrowser } from "@/lib/supabase-browser";

const CORRENTE_BASE = `${filhoPanelBase}/corrente-em-dia`;
const SETTINGS_HREF = `${CORRENTE_BASE}/configuracoes`;

const headerActions: PanelHeaderAction[] = [
  { label: "Início", href: "#inicio", variant: "primary" },
  { label: "Voltar", href: filhoPanelBase, variant: "secondary" },
  { label: "Configurações", href: SETTINGS_HREF, variant: "secondary" },
  filhoSignOutAction,
  filhoSupportAction,
];

type Settings = {
  defaultMonthlyAmount: number;
  pixKey: string;
  pixReceiverName: string;
  persuasiveText: string;
  recurringOptions: Array<{
    value: string;
    label: string;
    available: boolean;
    note?: string;
  }>;
};

type Contribution = {
  id: string;
  amount: number | string;
  due_date: string;
  status: string;
  payment_method: string | null;
};

type ApprovedFamily = {
  id: string;
  name: string;
  approvedAmount: number;
  members: Array<{
    id: string;
    fullName: string;
    relationshipLabel: string;
  }>;
};

type UpcomingContribution = {
  dueDate: string;
  amount: number;
  status: string;
};

type Payload = {
  currentPerson?: {
    fullName?: string;
    email?: string | null;
    whatsapp?: string | null;
  };
  canManageFinance?: boolean;
  receptionContacts?: MemberReceptionContact[];
  settings?: Settings;
  approvedFamily?: ApprovedFamily | null;
  contributions?: Contribution[];
  upcoming?: UpcomingContribution[];
  error?: string;
};

type ContributionView = "menu" | "history" | "upcoming";

const statusLabels: Record<string, string> = {
  intencao_registrada: "Intenção registrada",
  aguardando_pagamento: "Aguardando pagamento",
  aguardando_comprovante: "Aguardando comprovante",
  aguardando_recepcao: "Aguardando Recepção",
  aprovado: "Aprovado",
  comprovante_enviado: "Comprovante enviado",
  confirmado: "Confirmado",
  pago: "Pago",
  atrasado: "Em atraso",
  cancelado: "Cancelado",
};

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
  recepcao: "Cartão, Débito ou Dinheiro",
};

function money(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function FilhoCorrenteCorrenteEmDiaPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [financeOpen, setFinanceOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionView, setContributionView] =
    useState<ContributionView>("menu");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
      {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        cache: "no-store",
      },
    );
    const result = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível carregar.");
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
                : "Erro ao carregar Corrente em Dia.",
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

  const pastContributions = useMemo(
    () =>
      (payload.contributions ?? []).filter(
        (item) => item.due_date.slice(0, 10) < todayIso(),
      ),
    [payload.contributions],
  );

  const contributionSettings = payload.settings;

  function openContribution() {
    setContributionView("menu");
    setContributionOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Corrente em Dia"
        actions={headerActions}
        mobileActionColumns={3}
      />

      <section
        id="inicio"
        className="mx-auto max-w-6xl space-y-4 px-3 py-3 sm:space-y-5 sm:px-6 sm:py-4 lg:px-8"
      >
        {loading && (
          <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow">
            Carregando Corrente em Dia...
          </p>
        )}
        {error && (
          <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700">
            {error}
          </p>
        )}

        {!loading && contributionSettings && (
          <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl sm:rounded-[2rem] sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs sm:tracking-[0.24em]">
              Corrente em Dia
            </p>
            <h1 className="mt-1.5 text-2xl font-black leading-tight sm:mt-2 sm:text-4xl">
              Sua contribuição ajuda a manter a Casa pronta para servir.
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-5 text-[#EEF7EA] sm:mt-3 sm:text-base sm:leading-7">
              {contributionSettings.persuasiveText}
            </p>

            {payload.approvedFamily && (
              <div className="mt-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 sm:mt-5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#CFE2C7] sm:text-xs sm:tracking-[0.16em]">
                  Contribuição familiar aprovada
                </p>
                <p className="mt-0.5 text-xl font-black sm:mt-1 sm:text-2xl">
                  {money(payload.approvedFamily.approvedAmount)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
                  {payload.approvedFamily.members.map((member) => (
                    <span
                      key={member.id}
                      className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black sm:px-3 sm:text-xs"
                    >
                      {member.fullName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                onClick={openContribution}
                className="w-full rounded-2xl bg-white px-5 py-3 text-center text-base font-black text-[#123D2C] shadow-lg ring-1 ring-white/30 transition hover:-translate-y-0.5 sm:py-4"
              >
                Contribuição
              </button>
              <button
                type="button"
                onClick={() => setFinanceOpen(true)}
                className="w-full rounded-2xl bg-[#E9F2E7] px-5 py-3 text-center text-base font-black text-[#123D2C] shadow-lg ring-1 ring-white/30 transition hover:-translate-y-0.5 sm:py-4"
              >
                Financeiro
              </button>
            </div>
          </section>
        )}
      </section>

      {contributionOpen && contributionSettings && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setContributionOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-contribution-center-title"
            className="flex max-h-[calc(100dvh-0.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-2xl sm:max-h-[94vh] sm:rounded-[2rem]"
          >
            <header className="shrink-0 border-b border-slate-100 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs sm:tracking-[0.2em]">
                    Corrente em Dia
                  </p>
                  <h2
                    id="member-contribution-center-title"
                    className="mt-0.5 text-xl font-black leading-tight text-[#123D2C] sm:mt-1 sm:text-2xl"
                  >
                    Contribuição do Filho da Corrente
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setContributionOpen(false)}
                  className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white sm:px-4"
                >
                  Fechar
                </button>
              </div>
              {contributionView !== "menu" && (
                <button
                  type="button"
                  onClick={() => setContributionView("menu")}
                  className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
                >
                  Voltar às opções
                </button>
              )}
            </header>

            <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
              {contributionView === "menu" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setContributionView("history")}
                    className="rounded-2xl border-2 border-[#123D2C]/20 bg-[#F7FAF2] p-5 text-left shadow-sm transition hover:border-[#123D2C]"
                  >
                    <span className="block text-xl font-black text-[#123D2C]">
                      Histórico
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">
                      Consulte contribuições anteriores à data atual.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContributionView("upcoming")}
                    className="rounded-2xl border-2 border-[#123D2C]/20 bg-[#F7FAF2] p-5 text-left shadow-sm transition hover:border-[#123D2C]"
                  >
                    <span className="block text-xl font-black text-[#123D2C]">
                      Próximas
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">
                      Veja e organize as três próximas contribuições.
                    </span>
                  </button>
                </div>
              )}

              {contributionView === "history" && (
                <div>
                  <h3 className="text-xl font-black text-[#123D2C]">
                    Histórico
                  </h3>
                  <div className="mt-3 grid gap-2.5">
                    {pastContributions.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-[#123D2C]">
                            {money(item.amount)}
                          </p>
                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#123D2C] sm:text-xs">
                            {statusLabels[item.status] ?? item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">
                          {date(item.due_date)} · {" "}
                          {paymentLabels[item.payment_method ?? ""] ??
                            item.payment_method ??
                            "Forma não informada"}
                        </p>
                      </article>
                    ))}
                    {pastContributions.length === 0 && (
                      <p className="rounded-2xl bg-[#F7FAF2] p-4 font-bold text-slate-500">
                        Nenhuma contribuição anterior registrada.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {contributionView === "upcoming" && (
                <div>
                  <h3 className="text-xl font-black text-[#123D2C]">
                    Próximas contribuições
                  </h3>
                  <div className="mt-3 grid gap-3">
                    {(payload.upcoming ?? []).slice(0, 3).map((item) => (
                      <article
                        key={item.dueDate}
                        className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            <span className="block font-black text-[#123D2C]">
                              {date(item.dueDate)}
                            </span>
                            <span className="text-xs font-semibold text-slate-600 sm:text-sm">
                              {item.status}
                            </span>
                          </span>
                          <span className="font-black text-[#123D2C]">
                            {money(item.amount)}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {item.status === "prevista" ? (
                            <Link
                              href={SETTINGS_HREF}
                              className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2.5 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
                            >
                              Editar
                            </Link>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-slate-400 ring-1 ring-slate-200">
                              Atual
                            </span>
                          )}
                          <MemberContributionJourney
                            settings={contributionSettings}
                            person={{
                              fullName:
                                payload.currentPerson?.fullName ||
                                "Filho da Corrente",
                              email: payload.currentPerson?.email ?? null,
                              whatsapp: payload.currentPerson?.whatsapp ?? null,
                            }}
                            receptionContacts={payload.receptionContacts ?? []}
                            onCompleted={load}
                            dueDate={item.dueDate}
                            triggerLabel="Contribuir"
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {financeOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setFinanceOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="financeiro-title"
            className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Corrente em Dia
                </p>
                <h2
                  id="financeiro-title"
                  className="mt-2 text-2xl font-black text-[#123D2C]"
                >
                  Financeiro
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFinanceOpen(false)}
                className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
              >
                Fechar
              </button>
            </div>

            {payload.canManageFinance ? (
              <>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Consulte contribuições pendentes, valide comprovantes e registre receitas e despesas com acesso restrito à Tesouraria/Financeiro.
                </p>
                <div className="mt-5 grid gap-3">
                  <Link
                    href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/contribuicoes"
                    className="rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white"
                  >
                    Acompanhamento de Contribuições
                  </Link>
                  <Link
                    href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos"
                    className="rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                  >
                    Registro de Receitas e Despesas
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-2xl bg-amber-50 p-4 font-bold leading-6 text-amber-900">
                Esta área é restrita às pessoas com função Tesouraria/Financeiro. Fale com a coordenação caso seu acesso precise ser atualizado.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
