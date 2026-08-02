"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  upcoming?: Array<{ dueDate: string; amount: number; status: string }>;
  error?: string;
};

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

export default function FilhoCorrenteCorrenteEmDiaPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [financeOpen, setFinanceOpen] = useState(false);

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

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Corrente em Dia"
        actions={headerActions}
        mobileActionColumns={3}
      />

      <section
        id="inicio"
        className="mx-auto max-w-6xl space-y-5 px-4 py-4 sm:px-6 lg:px-8"
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

        {!loading && payload.settings && (
          <>
            <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">
                Corrente em Dia
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                Sua contribuição ajuda a manter a Casa pronta para servir.
              </h1>
              <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
                {payload.settings.persuasiveText}
              </p>

              {payload.approvedFamily && (
                <div className="mt-5 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#CFE2C7]">
                    Contribuição familiar aprovada
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {money(payload.approvedFamily.approvedAmount)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {payload.approvedFamily.members.map((member) => (
                      <span
                        key={member.id}
                        className="rounded-full bg-white/15 px-3 py-1 text-xs font-black"
                      >
                        {member.fullName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MemberContributionJourney
                  settings={payload.settings}
                  person={{
                    fullName:
                      payload.currentPerson?.fullName || "Filho da Corrente",
                    email: payload.currentPerson?.email ?? null,
                    whatsapp: payload.currentPerson?.whatsapp ?? null,
                  }}
                  receptionContacts={payload.receptionContacts ?? []}
                  familyContribution={payload.approvedFamily ?? null}
                  onCompleted={load}
                />
                <button
                  type="button"
                  onClick={() => setFinanceOpen(true)}
                  className="w-full rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center text-base font-black text-[#123D2C] shadow-lg ring-1 ring-white/30 transition hover:-translate-y-0.5"
                >
                  Financeiro
                </button>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-black text-[#123D2C]">
                    Próximas datas
                  </h2>
                  <Link
                    href={SETTINGS_HREF}
                    className="rounded-full bg-[#E9F2E7] px-4 py-2 text-sm font-black text-[#123D2C]"
                  >
                    Configurar
                  </Link>
                </div>
                <div className="mt-4 grid gap-3">
                  {(payload.upcoming ?? []).map((item) => (
                    <div
                      key={item.dueDate}
                      className="flex items-center justify-between rounded-2xl bg-[#F7FAF2] p-4"
                    >
                      <span>
                        <span className="block font-black text-[#123D2C]">
                          {date(item.dueDate)}
                        </span>
                        <span className="text-sm font-semibold text-slate-600">
                          {item.status}
                        </span>
                      </span>
                      <span className="font-black text-[#123D2C]">
                        {money(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <h2 className="text-2xl font-black text-[#123D2C]">
                  Meu histórico
                </h2>
                <div className="mt-4 grid gap-3">
                  {(payload.contributions ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-[#F7FAF2] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-[#123D2C]">
                          {money(item.amount)}
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C]">
                          {statusLabels[item.status] ?? item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {date(item.due_date)} ·{" "}
                        {paymentLabels[item.payment_method ?? ""] ??
                          item.payment_method ??
                          "Forma não informada"}
                      </p>
                    </div>
                  ))}
                  {(payload.contributions ?? []).length === 0 && (
                    <p className="rounded-2xl bg-[#F7FAF2] p-4 font-bold text-slate-500">
                      Nenhum histórico registrado ainda.
                    </p>
                  )}
                </div>
              </article>
            </section>
          </>
        )}
      </section>

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
