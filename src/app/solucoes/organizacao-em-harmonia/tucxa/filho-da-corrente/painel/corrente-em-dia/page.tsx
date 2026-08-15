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
  type MemberContributionSettings,
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

type Settings = MemberContributionSettings & {
  persuasiveText: string;
  financeContactName?: string;
  financeWhatsapp?: string;
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
  scheduledDates?: string[];
  amount: number;
  status: string;
  scheduled?: boolean;
  contributionId?: string | null;
  recurrenceType?: string | null;
  recurrenceStartDate?: string | null;
  recurrenceOccurrences?: number | null;
  paymentMethod?: string | null;
  notes?: string | null;
  proofUploaded?: boolean;
  uploadToken?: string | null;
  trackingCode?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
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
  nextAvailableContributionDate?: string;
  error?: string;
};

type ContributionView = "menu" | "history" | "upcoming";
type FinanceChoice = "lancamentos" | "analises" | null;

const statusLabels: Record<string, string> = {
  intencao_registrada: "Intenção registrada",
  aguardando_pagamento: "Aguardando pagamento",
  aguardando_comprovante: "Aguardando comprovante",
  aguardando_recepcao: "Aguardando Recepção",
  aprovado: "Aprovado",
  comprovante_enviado: "Comprovante enviado",
  em_revisao: "Aguardando aprovação",
  confirmado: "Confirmado",
  pago: "Pago",
  atrasado: "Em atraso",
  cancelado: "Cancelado",
  programado: "Programado",
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

function whatsappUrl(number: string | undefined, message: string) {
  let digits = (number ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
}

export default function FilhoCorrenteCorrenteEmDiaPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [financeOpen, setFinanceOpen] = useState(false);
  const [financeChoice, setFinanceChoice] = useState<FinanceChoice>(null);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionView, setContributionView] = useState<ContributionView>("menu");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [proofLockedItem, setProofLockedItem] = useState<UpcomingContribution | null>(null);
  const [savingAction, setSavingAction] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
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
              reason instanceof Error ? reason.message : "Erro ao carregar Corrente em Dia.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      const params = new URLSearchParams(window.location.search);
      if (active && params.get("financeiro") === "1") {
        setFinanceOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [load]);

  const pastContributions = useMemo(
    () =>
      (payload.contributions ?? [])
        .filter((item) => item.due_date.slice(0, 10) < todayIso())
        .sort((left, right) => right.due_date.localeCompare(left.due_date)),
    [payload.contributions],
  );

  const upcoming = useMemo(
    () => [...(payload.upcoming ?? [])].sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
    [payload.upcoming],
  );

  const upcomingPageCount = Math.max(1, Math.ceil(upcoming.length / 2));
  const safeUpcomingPage = Math.min(upcomingPage, upcomingPageCount);
  const visibleUpcoming = useMemo(
    () => upcoming.slice((safeUpcomingPage - 1) * 2, safeUpcomingPage * 2),
    [safeUpcomingPage, upcoming],
  );

  const contributionSettings = payload.settings;

  function openContribution() {
    setContributionView("menu");
    setUpcomingPage(1);
    setContributionOpen(true);
  }

  function closeContributionView() {
    if (contributionView === "menu") {
      setContributionOpen(false);
      return;
    }
    setContributionView("menu");
  }

  async function postAction(body: Record<string, unknown>) {
    const accessToken = await token();
    if (!accessToken) throw new Error("Sessão não encontrada.");

    const response = await fetch(
      "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível concluir a operação.");
    }
    return result;
  }

  async function deleteContribution(item: UpcomingContribution) {
    if (!item.contributionId || !item.canDelete) return;
    if (!window.confirm("Excluir esta contribuição/programação ainda não validada?")) return;

    setSavingAction(`delete:${item.contributionId}`);
    setActionError("");
    setActionMessage("");
    try {
      const result = await postAction({
        action: "cancelContribution",
        contributionId: item.contributionId,
      });
      setActionMessage(result.message || "Contribuição excluída.");
      await load();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Erro ao excluir a contribuição.");
    } finally {
      setSavingAction("");
    }
  }

  function editContactMessage(item: UpcomingContribution) {
    const dates = (item.scheduledDates ?? [item.dueDate]).map(date).join(", ");
    return `Olá. Sou ${payload.currentPerson?.fullName || "Filho da Corrente"}. Preciso de orientação sobre a contribuição ${item.trackingCode ? `código ${item.trackingCode}, ` : ""}programada para ${dates}, cujo comprovante já foi enviado e aguarda aprovação.`;
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Corrente em Dia" actions={headerActions} mobileActionColumns={3} />

      <section id="inicio" className="mx-auto max-w-6xl space-y-4 px-3 py-3 sm:space-y-5 sm:px-6 sm:py-4 lg:px-8">
        {loading && (
          <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow">Carregando Corrente em Dia...</p>
        )}
        {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700">{error}</p>}

        {!loading && contributionSettings && (
          <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl sm:rounded-[2rem] sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs">Corrente em Dia</p>
            <h1 className="mt-1.5 text-2xl font-black leading-tight sm:text-4xl">Sua contribuição ajuda a manter a Casa pronta para servir.</h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-5 text-[#EEF7EA] sm:text-base sm:leading-7">{contributionSettings.persuasiveText}</p>

            {payload.approvedFamily && (
              <div className="mt-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 sm:mt-5 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#CFE2C7] sm:text-xs">Contribuição familiar aprovada</p>
                <p className="mt-0.5 text-xl font-black sm:text-2xl">{money(payload.approvedFamily.approvedAmount)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
                  {payload.approvedFamily.members.map((member) => (
                    <span key={member.id} className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black sm:text-xs">{member.fullName}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3">
              <button type="button" onClick={openContribution} className="w-full rounded-2xl bg-white px-5 py-3 text-center text-base font-black text-[#123D2C] shadow-lg ring-1 ring-white/30 transition hover:-translate-y-0.5 sm:py-4">
                <span className="block">Contribuição</span>
                <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
              </button>
              <button type="button" onClick={() => setFinanceOpen(true)} className="w-full rounded-2xl bg-[#E9F2E7] px-5 py-3 text-center text-base font-black text-[#123D2C] shadow-lg ring-1 ring-white/30 transition hover:-translate-y-0.5 sm:py-4">
                <span className="block">Financeiro</span>
                <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
              </button>
            </div>
          </section>
        )}
      </section>

      {contributionOpen && contributionSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setContributionOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="member-contribution-center-title" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:max-h-[94vh] sm:rounded-[2rem]">
            <header className="shrink-0 border-b border-slate-100 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">Corrente em Dia</p>
                  <h2 id="member-contribution-center-title" className="mt-0.5 text-xl font-black leading-tight text-[#123D2C] sm:text-2xl">Contribuição do Filho da Corrente</h2>
                </div>
                <button type="button" onClick={closeContributionView} className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white sm:px-4">Fechar</button>
              </div>
            </header>

            <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
              {contributionView === "menu" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setContributionView("history")} className="rounded-2xl border-2 border-[#123D2C]/20 bg-[#F7FAF2] p-5 text-left shadow-sm transition hover:border-[#123D2C]">
                    <span className="block text-xl font-black text-[#123D2C]">Histórico</span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">Consulte contribuições anteriores.</span>
                  </button>
                  <button type="button" onClick={() => { setUpcomingPage(1); setContributionView("upcoming"); }} className="rounded-2xl border-2 border-[#123D2C]/20 bg-[#F7FAF2] p-5 text-left shadow-sm transition hover:border-[#123D2C]">
                    <span className="block text-xl font-black text-[#123D2C]">Próximas</span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">Veja e organize suas programações futuras.</span>
                  </button>
                </div>
              )}

              {contributionView === "history" && (
                <div>
                  <h3 className="text-xl font-black text-[#123D2C]">Histórico</h3>
                  <div className="mt-3 grid gap-2.5">
                    {pastContributions.map((item) => (
                      <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-[#123D2C]">{money(item.amount)}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#123D2C] sm:text-xs">{statusLabels[item.status] ?? item.status}</span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">{date(item.due_date)} · {paymentLabels[item.payment_method ?? ""] ?? item.payment_method ?? "Forma não informada"}</p>
                      </article>
                    ))}
                    {pastContributions.length === 0 && <p className="rounded-2xl bg-[#F7FAF2] p-4 font-bold text-slate-500">Nenhuma contribuição anterior registrada.</p>}
                  </div>
                </div>
              )}

              {contributionView === "upcoming" && (
                <div>
                  <h3 className="text-xl font-black text-[#123D2C]">Próximas contribuições</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Programações recorrentes aparecem uma única vez, reunindo todas as datas.
                  </p>

                  {actionMessage && (
                    <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                      {actionMessage}
                    </p>
                  )}
                  {actionError && (
                    <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
                      {actionError}
                    </p>
                  )}

                  <article className="mt-3 rounded-2xl border-2 border-dashed border-[#123D2C]/30 bg-white p-3 sm:p-4">
                    <p className="font-black text-[#123D2C]">Nova contribuição</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                      Próxima data disponível considerando todas as programações existentes:{" "}
                      <strong>
                        {payload.nextAvailableContributionDate
                          ? date(payload.nextAvailableContributionDate)
                          : "a definir"}
                      </strong>
                    </p>
                    {payload.nextAvailableContributionDate && (
                      <div className="mt-3">
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
                          dueDate={payload.nextAvailableContributionDate}
                          triggerLabel="Nova contribuição"
                        />
                      </div>
                    )}
                  </article>

                  <div className="mt-3 grid gap-3">
                    {visibleUpcoming.map((item) => {
                      const dates = item.scheduledDates?.length
                        ? item.scheduledDates
                        : [item.dueDate];
                      const recurring =
                        item.recurrenceType === "pix_agendado" ||
                        dates.length > 1;

                      return (
                        <article
                          key={
                            item.contributionId ||
                            `${item.dueDate}-${item.amount}`
                          }
                          className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-[#123D2C]">
                                {recurring
                                  ? "Programação recorrente"
                                  : date(item.dueDate)}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold text-slate-600 sm:text-sm">
                                {statusLabels[item.status] ?? item.status}
                              </p>
                            </div>
                            <span className="font-black text-[#123D2C]">
                              {money(item.amount)}
                            </span>
                          </div>

                          {recurring && (
                            <div className="mt-2 rounded-xl bg-white p-3 text-sm ring-1 ring-[#123D2C]/10">
                              <p className="font-black text-[#2F6B43]">
                                Datas desta programação
                              </p>
                              <p className="mt-1 font-semibold text-slate-700">
                                {dates.map(date).join(" · ")}
                              </p>
                            </div>
                          )}

                          {item.proofUploaded ? (
                            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-center text-sm font-black text-amber-900 ring-1 ring-amber-200">
                              Aguardando aprovação — edição e exclusão indisponíveis após o envio do comprovante.
                            </div>
                          ) : item.contributionId && item.canEdit ? (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <MemberContributionJourney
                                settings={contributionSettings}
                                person={{
                                  fullName:
                                    payload.currentPerson?.fullName ||
                                    "Filho da Corrente",
                                  email:
                                    payload.currentPerson?.email ?? null,
                                  whatsapp:
                                    payload.currentPerson?.whatsapp ?? null,
                                }}
                                receptionContacts={
                                  payload.receptionContacts ?? []
                                }
                                onCompleted={load}
                                dueDate={item.dueDate}
                                triggerLabel="Editar"
                                existingContribution={{
                                  id: item.contributionId,
                                  status: item.status,
                                  paymentMethod: item.paymentMethod,
                                  recurrenceType: item.recurrenceType,
                                  recurrenceStartDate:
                                    item.recurrenceStartDate ||
                                    item.dueDate,
                                  recurrenceOccurrences:
                                    item.recurrenceOccurrences,
                                  notes: item.notes,
                                  uploadToken: item.uploadToken,
                                  trackingCode: item.trackingCode,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void deleteContribution(item)
                                }
                                disabled={
                                  !item.canDelete ||
                                  savingAction ===
                                    `delete:${item.contributionId}`
                                }
                                className="rounded-xl bg-white px-3 py-2.5 text-sm font-black text-red-700 ring-1 ring-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {savingAction ===
                                `delete:${item.contributionId}`
                                  ? "Excluindo..."
                                  : "Excluir"}
                              </button>
                            </div>
                          ) : (
                            <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-600 ring-1 ring-[#123D2C]/10">
                              Esta contribuição já está finalizada e não pode ser alterada.
                            </p>
                          )}
                        </article>
                      );
                    })}

                    {upcoming.length === 0 && (
                      <p className="rounded-2xl bg-[#F7FAF2] p-4 font-bold text-slate-500">
                        Nenhuma contribuição futura registrada.
                      </p>
                    )}
                  </div>

                  {upcomingPageCount > 1 && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">
                      <button
                        type="button"
                        onClick={() =>
                          setUpcomingPage((current) =>
                            Math.max(1, current - 1),
                          )
                        }
                        disabled={safeUpcomingPage <= 1}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <span className="text-xs font-black text-[#123D2C]">
                        Página {safeUpcomingPage} de {upcomingPageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setUpcomingPage((current) =>
                            Math.min(upcomingPageCount, current + 1),
                          )
                        }
                        disabled={
                          safeUpcomingPage >= upcomingPageCount
                        }
                        className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 disabled:opacity-40"
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {proofLockedItem && contributionSettings && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/65 p-3" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setProofLockedItem(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="proof-locked-title" className="w-full max-w-md rounded-[1.5rem] bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">Corrente em Dia</p>
                <h2 id="proof-locked-title" className="mt-1 text-xl font-black text-[#123D2C]">Aguardando aprovação</h2>
              </div>
              <button type="button" onClick={() => setProofLockedItem(null)} className="rounded-xl bg-[#123D2C] px-3 py-2 text-sm font-black text-white">Fechar</button>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">O comprovante desta contribuição já foi enviado. Para preservar a conferência financeira, alterações ficam bloqueadas enquanto a Tesouraria/Financeiro analisa o comprovante.</p>
            {(proofLockedItem.scheduledDates?.length ?? 0) > 1 && (
              <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-sm font-bold text-[#123D2C]">Datas: {proofLockedItem.scheduledDates?.map(date).join(" · ")}</p>
            )}
            {contributionSettings.financeWhatsapp ? (
              <a href={whatsappUrl(contributionSettings.financeWhatsapp, editContactMessage(proofLockedItem))} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl bg-[#123D2C] px-4 py-3 text-center font-black text-white">Falar com {contributionSettings.financeContactName || "Tesouraria/Financeiro"}</a>
            ) : (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">O WhatsApp da Tesouraria/Financeiro ainda não foi configurado. Solicite ao responsável do Tucxa que cadastre esse contato nas configurações financeiras.</p>
            )}
          </section>
        </div>
      )}

      {financeOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 sm:p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setFinanceOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="financeiro-title" className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Corrente em Dia</p>
                <h2 id="financeiro-title" className="mt-2 text-2xl font-black text-[#123D2C]">Financeiro</h2>
              </div>
              <button type="button" onClick={() => setFinanceOpen(false)} className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button>
            </div>

            {payload.canManageFinance ? (
              <>
                <p className="mt-4 text-sm leading-6 text-slate-600">Acesso restrito à Tesouraria/Financeiro usando a mesma sessão do Filho da Corrente.</p>
                <div className="mt-5 grid gap-3">
                  <Link href="/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/contribuicoes" className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-[#123D2C] px-5 py-4 text-center font-black text-white">
                    <span>Acompanhamento de Contribuições</span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#DDEAD8]">TOQUE PARA ABRIR</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setFinanceChoice("lancamentos")}
                    className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-[#E9F2E7] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                  >
                    <span>Registro de Receitas e Despesas</span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFinanceChoice("analises")}
                    className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-[#F7FAF2] px-5 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
                  >
                    <span>Análises</span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-2xl bg-amber-50 p-4 font-bold leading-6 text-amber-900">Esta área é restrita às pessoas com função Tesouraria/Financeiro.</p>
            )}
          </section>
        </div>
      )}


      {financeChoice && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-3 sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setFinanceChoice(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="finance-choice-title"
            className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Corrente em Dia</p>
                <h2 id="finance-choice-title" className="mt-1 text-2xl font-black text-[#123D2C]">
                  {financeChoice === "lancamentos" ? "Registro de Receitas e Despesas" : "Análises"}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Selecione qual prestação de contas deseja acessar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFinanceChoice(null)}
                className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href={
                  financeChoice === "lancamentos"
                    ? "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos"
                    : "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/corrente-em-dia/analises"
                }
                className="flex min-h-24 flex-col items-center justify-center rounded-2xl bg-[#123D2C] px-4 py-4 text-center font-black text-white shadow"
              >
                <span className="text-lg">Tucxa</span>
                <span className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/75">TOQUE PARA ABRIR</span>
              </Link>
              <Link
                href={
                  financeChoice === "lancamentos"
                    ? "/solucoes/organizacao-em-harmonia/cliente/corrente-em-dia/lancamentos?contexto=sementinha"
                    : "/solucoes/organizacao-em-harmonia/tucxa/sementinha/transparencia#analises"
                }
                className="flex min-h-24 flex-col items-center justify-center rounded-2xl bg-[#E9F2E7] px-4 py-4 text-center font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
              >
                <span className="text-lg">Sementinha</span>
                <span className="mt-1 text-[9px] uppercase tracking-[0.16em] text-[#2F6B43]">TOQUE PARA ABRIR</span>
              </Link>
            </div>
          </section>
        </div>
      )}

    </main>
  );
}
