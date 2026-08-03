"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
  familyContributionsEnabled: boolean;
};

type Preference = {
  preferred_due_day: number | null;
};

type Person = {
  id: string;
  full_name: string;
  relationship_type_id: string;
  relationship_label: string;
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

type Payload = {
  currentPerson?: {
    fullName?: string;
    email?: string | null;
  };
  settings?: Settings;
  preference?: Preference;
  people?: Person[];
  familyGroups?: FamilyGroup[];
  error?: string;
};

type FamilyDraft = {
  personId: string;
  personName: string;
  relationshipTypeId: string;
  relationshipLabel: string;
};

type ModalProps = {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
};

const headerActions: PanelHeaderAction[] = [
  { label: "Início", href: CORRENTE_BASE, variant: "primary" },
  { label: "Voltar", href: filhoPanelBase, variant: "secondary" },
  { label: "Configurações", href: SETTINGS_HREF, variant: "secondary" },
  filhoSignOutAction,
  filhoSupportAction,
];

function Modal({ title, eyebrow, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#10251C]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section className="max-h-[95dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#123D2C] sm:text-3xl">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2.5 text-sm font-black text-white"
          >
            Fechar
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

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

  const [organizationModalOpen, setOrganizationModalOpen] = useState(false);
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [preferredDueDay, setPreferredDueDay] = useState("10");
  const [reminderDays, setReminderDays] = useState<number[]>([]);
  const [emailDraft, setEmailDraft] = useState("");

  const [familyNeedsEmailDecision, setFamilyNeedsEmailDecision] =
    useState(false);
  const [familyAmount, setFamilyAmount] = useState("");
  const [familyPersonId, setFamilyPersonId] = useState("");
  const [familyDrafts, setFamilyDrafts] = useState<FamilyDraft[]>([]);

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
    // Conforme o Ajustes Evolução 03, nenhuma antecedência inicia destacada.
    setReminderDays([]);
    setEmailDraft(result.currentPerson?.email ?? "");
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
    if (!organizationModalOpen && !familyModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOrganizationModalOpen(false);
        setFamilyModalOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [familyModalOpen, organizationModalOpen]);

  const availableFamilyPeople = useMemo(
    () =>
      (payload.people ?? []).filter(
        (item) => !familyDrafts.some((draft) => draft.personId === item.id),
      ),
    [familyDrafts, payload.people],
  );

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
    };
    if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
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
      const result = await post({ action: "saveNotificationEmail", email });
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
        reminderChannels:
          currentEmail && reminderDays.length > 0 ? ["email"] : [],
      });
      setMessage(result.message || "Organização e lembretes salvos.");
      setOrganizationModalOpen(false);
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

  function openFamilyModal() {
    setFamilyNeedsEmailDecision(false);
    setFamilyPersonId("");
    const editableGroup = (payload.familyGroups ?? []).find((group) =>
      ["aguardando_aprovacao", "ativo"].includes(group.status),
    );
    if (editableGroup) {
      const amount =
        editableGroup.status === "ativo"
          ? editableGroup.approved_amount || editableGroup.requested_amount
          : editableGroup.requested_amount;
      setFamilyAmount(amount ? String(amount).replace(".", ",") : "");
      const linkedPeopleById = new Map(
        (payload.people ?? []).map((item) => [item.id, item]),
      );
      setFamilyDrafts(
        editableGroup.members.flatMap((member) => {
          const memberPerson = person(member.person);
          const memberRelationship = relation(member.relationship);
          if (!memberPerson?.id) return [];
          const registered = linkedPeopleById.get(memberPerson.id);
          if (!registered) return [];
          return [
            {
              personId: registered.id,
              personName: registered.full_name,
              relationshipTypeId: registered.relationship_type_id,
              relationshipLabel:
                registered.relationship_label || memberRelationship?.label || "",
            },
          ];
        }),
      );
    } else {
      setFamilyAmount("");
      setFamilyDrafts([]);
    }
    setFamilyModalOpen(true);
  }

  function addFamilyDraft() {
    const selectedPerson = (payload.people ?? []).find(
      (item) => item.id === familyPersonId,
    );
    if (!selectedPerson) {
      setError("Selecione o familiar.");
      return;
    }
    setFamilyDrafts((current) => [
      ...current,
      {
        personId: selectedPerson.id,
        personName: selectedPerson.full_name,
        relationshipTypeId: selectedPerson.relationship_type_id,
        relationshipLabel: selectedPerson.relationship_label,
      },
    ]);
    setFamilyPersonId("");
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
      setFamilyNeedsEmailDecision(false);
      await load();
      setFamilyModalOpen(false);
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

            <section className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setReminderDays([]);
                  setOrganizationModalOpen(true);
                }}
                className="rounded-[1.75rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5"
              >
                <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                  Configuração
                </span>
                <span className="mt-2 block text-xl font-black text-[#123D2C]">
                  Organização e lembretes
                </span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  Defina o dia previsto e marque os lembretes que deseja receber.
                </span>
              </button>

              {payload.settings.familyContributionsEnabled && (
                <button
                  type="button"
                  onClick={openFamilyModal}
                  className="rounded-[1.75rem] bg-white p-5 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5"
                >
                  <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">
                    Família
                  </span>
                  <span className="mt-2 block text-xl font-black text-[#123D2C]">
                    Contribuição Familiar
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-slate-600">
                    Informe ou atualize valor, familiares e acompanhe o histórico.
                  </span>
                </button>
              )}
            </section>
          </>
        )}
      </section>

      {organizationModalOpen && (
        <Modal
          eyebrow="Organização e lembretes"
          title="Escolha como deseja se organizar."
          onClose={() => setOrganizationModalOpen(false)}
        >
          <label className="mt-5 grid gap-2 font-black text-[#123D2C]">
            Dia do mês previsto para a contribuição
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
            Informe um número entre 1 e 31. Caso escolha o dia 31, nos meses que
            não possuem 31 dias será considerado o último dia do mês.
          </p>

          <p className="mt-5 font-black text-[#123D2C]">Lembretes:</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Marque (fundo ficará verde) quantos dias antes do dia definido para
            contribuir deseja receber lembretes.
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
                    : "bg-white text-[#123D2C] ring-[#123D2C]/15"
                }`}
              >
                {day} {day === 1 ? "dia" : "dias"} antes
              </button>
            ))}
          </div>

          {currentEmail ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 ring-1 ring-emerald-100">
              Os lembretes serão enviados para o e-mail <strong>{currentEmail}</strong>.
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="font-black text-amber-950">
                Cadastre um e-mail para receber os lembretes.
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                Sem um e-mail cadastrado, você não receberá os lembretes.
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
        </Modal>
      )}

      {familyModalOpen && (
        <Modal
          eyebrow="Contribuição familiar"
          title="Organize uma contribuição para sua família."
          onClose={() => setFamilyModalOpen(false)}
        >
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Informe o valor total e os integrantes. A solicitação será analisada
            e, após aprovada, valor e agregados aparecerão em suas contribuições
            mensais.
          </p>

          {!currentEmail && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
              <p className="font-black">Você ainda não possui e-mail cadastrado.</p>
              <p className="mt-1 text-sm leading-6">
                Cadastre para receber a confirmação da solicitação e o aviso da
                análise. Sem cadastro, você não receberá essas notificações.
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
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                value={familyPersonId}
                onChange={(event) => setFamilyPersonId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <option value="">Selecionar o familiar</option>
                {availableFamilyPeople.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name} · {item.relationship_label}
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
            {(payload.people ?? []).length === 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">
                Nenhum familiar vinculado foi localizado. Cadastre o vínculo em
                <strong> Atualizar dados</strong>; depois retorne a esta tela.
              </p>
            )}
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
                      current.filter((item) => item.personId !== draft.personId),
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
                Sem o cadastro, a solicitação será enviada normalmente, mas você
                não receberá os avisos por e-mail.
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

          {(payload.familyGroups ?? []).length > 0 && (
            <section className="mt-7 border-t border-slate-100 pt-6">
              <h3 className="text-xl font-black text-[#123D2C]">
                Histórico das solicitações
              </h3>
              <div className="mt-4 grid gap-3">
                {(payload.familyGroups ?? []).map((group) => (
                  <article
                    key={group.id}
                    className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-[#123D2C]">{group.name}</h4>
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
        </Modal>
      )}
    </main>
  );
}
