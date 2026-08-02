"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoPanelBase,
  filhoSignOutAction,
  filhoSupportAction,
  type PanelHeaderAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const CORRENTE_BASE = `${filhoPanelBase}/corrente-em-dia`;
const SETTINGS_HREF = `${CORRENTE_BASE}/configuracoes`;
const REMINDER_OPTIONS = [7, 5, 3, 1];

type Settings = {
  defaultDueDay: number;
  reminderDaysBefore: number[];
  familyContributionsEnabled: boolean;
};

type Preference = {
  preferred_due_day: number | null;
  reminder_days_before: number[];
  reminder_channels: string[];
};

type Relationship = {
  id: string;
  label: string;
};

type Person = {
  id: string;
  full_name: string;
};

type FamilyMember = {
  id: string;
  person:
    | { id: string; full_name: string }
    | Array<{ id: string; full_name: string }>
    | null;
  relationship:
    | { id: string; label: string }
    | Array<{ id: string; label: string }>
    | null;
  included_in_payment: boolean;
  financial_approved_at: string | null;
};

type FamilyGroup = {
  id: string;
  name: string;
  status: string;
  requested_amount: number | string | null;
  approved_amount: number | string | null;
  decision_notes: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  approved_at: string | null;
  created_at: string | null;
  members: FamilyMember[];
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
  };
  settings?: Settings;
  preference?: Preference;
  relationshipTypes?: Relationship[];
  people?: Person[];
  familyGroups?: FamilyGroup[];
  approvedFamily?: ApprovedFamily | null;
  error?: string;
};

type FamilyDraft = {
  personId: string;
  personName: string;
  relationshipTypeId: string;
  relationshipLabel: string;
};

const headerActions: PanelHeaderAction[] = [
  { label: "Início", href: CORRENTE_BASE, variant: "primary" },
  { label: "Voltar", href: filhoPanelBase, variant: "secondary" },
  { label: "Configurações", href: SETTINGS_HREF, variant: "secondary" },
  filhoSignOutAction,
  filhoSupportAction,
];

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);
}

function relation(value: FamilyMember["relationship"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function person(value: FamilyMember["person"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function familyStatusLabel(status: string) {
  const labels: Record<string, string> = {
    aguardando_aprovacao: "Aguardando aprovação",
    ativo: "Aprovada",
    rejeitado: "Não aprovada",
    substituido: "Substituída",
    cancelado: "Cancelada",
  };
  return labels[status] ?? status;
}

function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) ? email : "";
}

export default function CorrenteEmDiaConfiguracoesPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [preferredDueDay, setPreferredDueDay] = useState("10");
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1]);
  const [emailDraft, setEmailDraft] = useState("");

  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [familyNeedsEmailDecision, setFamilyNeedsEmailDecision] =
    useState(false);
  const [familyAmount, setFamilyAmount] = useState("");
  const [familyPersonId, setFamilyPersonId] = useState("");
  const [familyRelationshipId, setFamilyRelationshipId] = useState("");
  const [familyDrafts, setFamilyDrafts] = useState<FamilyDraft[]>([]);
  const [familySearch, setFamilySearch] = useState("");

  const currentEmail = payload.currentPerson?.email?.trim() ?? "";

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
      throw new Error(
        result.error || "Não foi possível carregar as configurações.",
      );
    }

    setPayload(result);
    setPreferredDueDay(
      String(
        result.preference?.preferred_due_day ||
          result.settings?.defaultDueDay ||
          10,
      ),
    );
    setReminderDays(
      (result.preference?.reminder_days_before ?? [3, 1]).filter((day) =>
        REMINDER_OPTIONS.includes(day),
      ),
    );
    setEmailDraft(result.currentPerson?.email ?? "");
    setFamilyAmount(
      result.approvedFamily?.approvedAmount
        ? String(result.approvedFamily.approvedAmount).replace(".", ",")
        : "",
    );
  }, [token]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          if (active) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Erro ao carregar configurações.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!familyModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFamilyModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [familyModalOpen]);

  const filteredPeople = useMemo(() => {
    const query = familySearch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return (payload.people ?? []).filter((item) => {
      if (familyDrafts.some((draft) => draft.personId === item.id)) return false;
      return item.full_name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(query);
    });
  }, [familyDrafts, familySearch, payload.people]);

  async function post(body: Record<string, unknown>) {
    const accessToken = await token();
    const response = await fetch(
      "/api/organizacao-em-harmonia/filhos-corrente/corrente-em-dia",
      {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      email?: string;
    };
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível salvar.");
    }
    return result;
  }

  function toggleReminderDay(day: number) {
    setReminderDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((left, right) => right - left),
    );
  }

  async function saveNotificationEmail() {
    const email = normalizeEmail(emailDraft);
    if (!email) {
      setError("Informe um e-mail válido.");
      return;
    }

    setSaving("email");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "saveNotificationEmail",
        email,
      });
      setMessage(result.message || "E-mail cadastrado.");
      setFamilyNeedsEmailDecision(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao cadastrar e-mail.",
      );
    } finally {
      setSaving("");
    }
  }

  async function savePreferences() {
    const dueDay = Number(preferredDueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setError("Informe um dia do mês entre 1 e 31.");
      return;
    }

    setSaving("preferences");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "savePreferences",
        preferredDueDay: dueDay,
        reminderDaysBefore: reminderDays,
        reminderChannels: currentEmail ? ["email"] : [],
      });
      setMessage(result.message || "Preferências salvas.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao salvar preferências.",
      );
    } finally {
      setSaving("");
    }
  }

  function addFamilyDraft() {
    const selectedPerson = (payload.people ?? []).find(
      (item) => item.id === familyPersonId,
    );
    const selectedRelationship = (payload.relationshipTypes ?? []).find(
      (item) => item.id === familyRelationshipId,
    );

    if (!selectedPerson || !selectedRelationship) {
      setError("Selecione o familiar e o grau de parentesco.");
      return;
    }

    setFamilyDrafts((current) => [
      ...current,
      {
        personId: selectedPerson.id,
        personName: selectedPerson.full_name,
        relationshipTypeId: selectedRelationship.id,
        relationshipLabel: selectedRelationship.label,
      },
    ]);
    setFamilyPersonId("");
    setFamilyRelationshipId("");
    setFamilySearch("");
    setError("");
  }

  async function requestFamilyApproval(allowWithoutEmail = false) {
    const amount = Number(familyAmount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe o valor total que você consegue contribuir.");
      return;
    }
    if (familyDrafts.length === 0) {
      setError("Inclua pelo menos um familiar.");
      return;
    }
    if (!currentEmail && !allowWithoutEmail) {
      setFamilyNeedsEmailDecision(true);
      setError("");
      return;
    }

    setSaving("family");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "requestFamilyGroup",
        name: `Família de ${payload.currentPerson?.fullName || "Filho da Corrente"}`,
        contributionMode: "consolidada",
        amount,
        members: familyDrafts.map((item) => ({
          personId: item.personId,
          relationshipTypeId: item.relationshipTypeId,
          includedInPayment: true,
        })),
      });
      setMessage(
        result.message || "Solicitação familiar enviada para aprovação.",
      );
      setFamilyDrafts([]);
      setFamilyNeedsEmailDecision(false);
      setFamilyModalOpen(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao enviar a contribuição familiar.",
      );
    } finally {
      setSaving("");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Configurações do Corrente em Dia"
        actions={headerActions}
        mobileActionColumns={3}
      />

      <section
        id="inicio"
        className="mx-auto max-w-5xl space-y-5 px-4 py-4 sm:px-6 lg:px-8"
      >
        {loading && (
          <p className="rounded-3xl bg-white p-5 font-bold text-[#123D2C] shadow">
            Carregando configurações...
          </p>
        )}
        {error && (
          <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800">
            {message}
          </p>
        )}

        {!loading && payload.settings && (
          <>
            <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">
                Corrente em Dia
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                Organize da melhor forma para você.
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base">
                Defina o melhor dia do mês para contribuir, se deseja receber
                lembretes antes da data e se sua contribuição será familiar.
              </p>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                Organização e lembretes
              </p>

              <label className="mt-5 grid gap-2 font-black text-[#123D2C]">
                Dia do mês
                <input
                  required
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  value={preferredDueDay}
                  onChange={(event) => setPreferredDueDay(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-lg font-black outline-none ring-[#123D2C]/20 focus:ring-4 sm:max-w-xs"
                  aria-describedby="due-day-help"
                />
              </label>
              <p id="due-day-help" className="mt-2 text-sm leading-6 text-slate-600">
                Informe um número entre 1 e 31. Caso escolha o dia 31, nos meses
                que não possuem 31 dias será considerado o último dia do mês.
              </p>

              <p className="mt-5 font-black text-[#123D2C]">
                Lembretes: 7, 5, 3 e 1 dias de antecedência
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Marque quantos dias antes do dia definido para contribuir deseja
                receber lembretes.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleReminderDay(day)}
                    className={`rounded-full px-4 py-2 text-sm font-black ring-1 ${
                      reminderDays.includes(day)
                        ? "bg-[#123D2C] text-white ring-[#123D2C]"
                        : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                    }`}
                  >
                    {day} {day === 1 ? "dia" : "dias"} antes
                  </button>
                ))}
              </div>

              {currentEmail ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 ring-1 ring-emerald-100">
                  Os lembretes serão enviados para o e-mail{" "}
                  <strong>{currentEmail}</strong>.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                  <p className="font-black text-amber-950">
                    Cadastre um e-mail para receber os lembretes.
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    Sem um e-mail cadastrado, o dia e as opções poderão ser
                    salvos, mas nenhum lembrete será enviado.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      type="email"
                      value={emailDraft}
                      onChange={(event) => setEmailDraft(event.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="rounded-2xl border border-amber-200 bg-white p-3"
                    />
                    <button
                      type="button"
                      onClick={saveNotificationEmail}
                      disabled={saving === "email"}
                      className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-60"
                    >
                      {saving === "email" ? "Cadastrando..." : "Cadastrar e-mail"}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={savePreferences}
                disabled={saving === "preferences"}
                className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-60"
              >
                {saving === "preferences"
                  ? "Salvando..."
                  : "Salvar organização e lembretes"}
              </button>
            </section>

            {payload.settings.familyContributionsEnabled && (
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Contribuição familiar
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
                  Organize uma contribuição para sua família.
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Informe o valor total e os integrantes em uma tela reservada.
                  A solicitação será analisada antes de aparecer nas contribuições
                  mensais.
                </p>

                {payload.approvedFamily && (
                  <article className="mt-5 rounded-2xl bg-emerald-50 p-4 text-emerald-950 ring-1 ring-emerald-100">
                    <p className="font-black">Configuração familiar aprovada</p>
                    <p className="mt-1 text-2xl font-black">
                      {money(payload.approvedFamily.approvedAmount)}
                    </p>
                    <div className="mt-3 grid gap-1 text-sm font-semibold">
                      {payload.approvedFamily.members.map((member) => (
                        <p key={member.id}>
                          ✅ {member.fullName}
                          {member.relationshipLabel
                            ? ` · ${member.relationshipLabel}`
                            : ""}
                        </p>
                      ))}
                    </div>
                  </article>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFamilyNeedsEmailDecision(false);
                    setFamilyModalOpen(true);
                  }}
                  className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow-lg shadow-green-950/10"
                >
                  Contribuição familiar
                </button>
              </section>
            )}

            {(payload.familyGroups ?? []).length > 0 && (
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <h2 className="text-2xl font-black text-[#123D2C]">
                  Histórico das solicitações
                </h2>
                <div className="mt-4 grid gap-3">
                  {(payload.familyGroups ?? []).map((group) => (
                    <article
                      key={group.id}
                      className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-[#123D2C]">
                            {group.name}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            Solicitado: {money(group.requested_amount)}
                            {group.approved_amount
                              ? ` · Aprovado: ${money(group.approved_amount)}`
                              : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C]">
                          {familyStatusLabel(group.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-1 rounded-xl bg-white p-3 text-sm text-slate-600">
                        <p>
                          <strong>Solicitada em:</strong>{" "}
                          {dateTime(group.submitted_at || group.created_at)}
                        </p>
                        {group.decided_at && (
                          <p>
                            <strong>Data da análise:</strong>{" "}
                            {dateTime(group.decided_at)}
                          </p>
                        )}
                        {group.approved_at && (
                          <p>
                            <strong>Aprovada em:</strong>{" "}
                            {dateTime(group.approved_at)}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 grid gap-1 text-sm text-slate-600">
                        {group.members.map((member) => (
                          <p key={member.id}>
                            <strong>{person(member.person)?.full_name}</strong>
                            {relation(member.relationship)?.label
                              ? ` · ${relation(member.relationship)?.label}`
                              : ""}
                          </p>
                        ))}
                      </div>
                      {group.decision_notes && (
                        <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-600">
                          Observação da análise: {group.decision_notes}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>

      {familyModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="family-modal-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setFamilyModalOpen(false);
          }}
        >
          <section className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Contribuição familiar
                </p>
                <h2
                  id="family-modal-title"
                  className="mt-2 text-2xl font-black text-[#123D2C] sm:text-3xl"
                >
                  Informe o valor e os integrantes da sua família.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFamilyModalOpen(false)}
                className="shrink-0 rounded-full bg-[#F7FAF2] px-4 py-2 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10"
                aria-label="Fechar contribuição familiar"
              >
                Fechar
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              A solicitação será analisada e, após aprovada, valor e agregados
              aparecerão em suas contribuições mensais.
            </p>

            {!currentEmail && (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
                <p className="font-black">Você ainda não possui e-mail cadastrado.</p>
                <p className="mt-1 text-sm leading-6">
                  Cadastre para receber a confirmação da solicitação e o aviso
                  quando ela for analisada. Sem cadastro, você não receberá essas
                  notificações por e-mail.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="rounded-2xl border border-amber-200 bg-white p-3"
                  />
                  <button
                    type="button"
                    onClick={saveNotificationEmail}
                    disabled={saving === "email"}
                    className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-60"
                  >
                    {saving === "email" ? "Cadastrando..." : "Cadastrar e-mail"}
                  </button>
                </div>
              </div>
            )}

            <label className="mt-5 grid gap-2 font-black text-[#123D2C]">
              Valor total que você consegue contribuir
              <input
                value={familyAmount}
                onChange={(event) => setFamilyAmount(event.target.value)}
                inputMode="decimal"
                placeholder="Ex.: 150,00"
                className="rounded-2xl border border-slate-200 p-4"
              />
            </label>

            <div className="mt-4 rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
              <input
                value={familySearch}
                onChange={(event) => setFamilySearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3"
                placeholder="Buscar Filho da Corrente pelo nome"
              />
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <select
                  value={familyPersonId}
                  onChange={(event) => setFamilyPersonId(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <option value="">Selecione a pessoa</option>
                  {filteredPeople.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.full_name}
                    </option>
                  ))}
                </select>
                <select
                  value={familyRelationshipId}
                  onChange={(event) =>
                    setFamilyRelationshipId(event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <option value="">Grau de parentesco</option>
                  {(payload.relationshipTypes ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addFamilyDraft}
                  className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white"
                >
                  Incluir
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {familyDrafts.map((draft) => (
                <div
                  key={draft.personId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#E9F2E7] p-3"
                >
                  <span>
                    <span className="block font-black text-[#123D2C]">
                      {draft.personName}
                    </span>
                    <span className="text-sm text-slate-600">
                      {draft.relationshipLabel}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFamilyDrafts((current) =>
                        current.filter(
                          (item) => item.personId !== draft.personId,
                        ),
                      )
                    }
                    className="rounded-xl bg-white px-3 py-2 text-sm font-black text-red-700"
                  >
                    Retirar
                  </button>
                </div>
              ))}
            </div>

            {familyNeedsEmailDecision && !currentEmail && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
                <p className="font-black">Deseja cadastrar um e-mail antes de enviar?</p>
                <p className="mt-1 text-sm leading-6">
                  Sem o cadastro, a solicitação será enviada normalmente, mas
                  você não receberá a confirmação nem o aviso da aprovação por
                  e-mail.
                </p>
                <button
                  type="button"
                  onClick={() => requestFamilyApproval(true)}
                  disabled={saving === "family"}
                  className="mt-3 rounded-2xl bg-white px-4 py-3 font-black text-amber-950 ring-1 ring-amber-300 disabled:opacity-60"
                >
                  Enviar mesmo sem e-mail
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => requestFamilyApproval(false)}
              disabled={saving === "family" || familyDrafts.length === 0}
              className="mt-5 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              {saving === "family" ? "Enviando..." : "Enviar para aprovação"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
