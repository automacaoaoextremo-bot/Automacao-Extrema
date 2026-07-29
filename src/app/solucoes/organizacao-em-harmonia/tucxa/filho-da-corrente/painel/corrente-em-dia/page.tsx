"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type RecurringOption = {
  value: string;
  label: string;
  available: boolean;
  note?: string;
};

type Settings = {
  defaultMonthlyAmount: number;
  amountIsMandatory: boolean;
  allowCustomAmount: boolean;
  allowedDueDays: number[];
  defaultDueDay: number;
  reminderDaysBefore: number[];
  reminderChannels: string[];
  familyContributionsEnabled: boolean;
  familyRequiresMemberConfirmation: boolean;
  familyRequiresFinancialApproval: boolean;
  pixKey: string;
  persuasiveText: string;
  recurringOptions: RecurringOption[];
};

type Contribution = {
  id: string;
  amount: number | string;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
  proof_url: string | null;
  notes: string | null;
  contribution_kind: string | null;
  recurrence_type: string | null;
  preferred_due_day: number | null;
};

type Preference = {
  preferred_due_day: number | null;
  reminder_days_before: number[];
  reminder_channels: string[];
  recurring_mode: string;
  recurring_status: string;
  family_group_id: string | null;
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
  individual_amount: number | null;
  member_confirmed_at: string | null;
  financial_approved_at: string | null;
};

type FamilyGroup = {
  id: string;
  name: string;
  contribution_mode: string;
  status: string;
  members: FamilyMember[];
};

type Payload = {
  currentPerson?: { fullName?: string };
  settings?: Settings;
  preference?: Preference;
  contributions?: Contribution[];
  upcoming?: Array<{ dueDate: string; amount: number; status: string }>;
  pixCopyPaste?: string;
  qrCodeDataUrl?: string;
  relationshipTypes?: Relationship[];
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

const statusLabels: Record<string, string> = {
  intencao_registrada: "Intenção registrada",
  aguardando_pagamento: "Aguardando pagamento",
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

function relation(value: FamilyMember["relationship"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function person(value: FamilyMember["person"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function FilhoCorrenteCorrenteEmDiaPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [amount, setAmount] = useState("50");
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [preferredDueDay, setPreferredDueDay] = useState("10");
  const [recurringMode, setRecurringMode] = useState("nao_programada");
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1]);
  const [reminderChannels, setReminderChannels] = useState<string[]>([
    "whatsapp",
    "painel",
  ]);

  const [familyName, setFamilyName] = useState("");
  const [familyMode, setFamilyMode] = useState("consolidada");
  const [familyPersonId, setFamilyPersonId] = useState("");
  const [familyRelationshipId, setFamilyRelationshipId] = useState("");
  const [familyDrafts, setFamilyDrafts] = useState<FamilyDraft[]>([]);
  const [familySearch, setFamilySearch] = useState("");

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
    if (result.settings) {
      setAmount(String(result.settings.defaultMonthlyAmount));
      setPreferredDueDay(
        String(
          result.preference?.preferred_due_day ||
            result.settings.defaultDueDay,
        ),
      );
    }
    if (result.preference) {
      setRecurringMode(result.preference.recurring_mode || "nao_programada");
      setReminderDays(result.preference.reminder_days_before || [3, 1]);
      setReminderChannels(
        result.preference.reminder_channels || ["whatsapp", "painel"],
      );
    }
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

  const filteredPeople = useMemo(() => {
    const query = familySearch
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return (payload.people ?? []).filter((item) => {
      if (familyDrafts.some((draft) => draft.personId === item.id)) {
        return false;
      }
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
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
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
      throw new Error(result.error || "Não foi possível salvar.");
    }
    return result;
  }

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("contribution");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "createContribution",
        amount,
        dueDate,
        paymentMethod,
        proofUrl,
        notes,
        preferredDueDay: Number(preferredDueDay),
        recurringMode,
      });
      setMessage(result.message || "Contribuição registrada.");
      setProofUrl("");
      setNotes("");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao registrar contribuição.",
      );
    } finally {
      setSaving("");
    }
  }

  function toggleNumber(day: number) {
    setReminderDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => b - a),
    );
  }

  function toggleChannel(channel: string) {
    setReminderChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  async function savePreferences() {
    setSaving("preferences");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "savePreferences",
        preferredDueDay: Number(preferredDueDay),
        recurringMode,
        reminderDaysBefore: reminderDays,
        reminderChannels,
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

  async function requestFamily() {
    if (familyDrafts.length === 0) {
      setError("Inclua pelo menos um familiar.");
      return;
    }
    setSaving("family");
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "requestFamilyGroup",
        name: familyName,
        contributionMode: familyMode,
        members: familyDrafts,
      });
      setMessage(result.message || "Solicitação familiar enviada.");
      setFamilyName("");
      setFamilyDrafts([]);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao solicitar contribuição familiar.",
      );
    } finally {
      setSaving("");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Corrente em Dia" />

      <section className="mx-auto max-w-6xl space-y-5 px-4 py-4 sm:px-6 lg:px-8">
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
        {message && (
          <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800">
            {message}
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
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <article className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xl font-black">
                    {money(payload.settings.defaultMonthlyAmount)}
                  </p>
                  <p className="text-xs font-bold text-[#CFE2C7]">
                    Valor padrão
                  </p>
                </article>
                <article className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xl font-black">
                    Dia {preferredDueDay}
                  </p>
                  <p className="text-xs font-bold text-[#CFE2C7]">
                    Sua preferência
                  </p>
                </article>
                <article className="col-span-2 rounded-2xl bg-white/10 p-4 sm:col-span-1">
                  <p className="text-lg font-black">
                    {recurringMode === "nao_programada"
                      ? "Sem programação"
                      : "Pix agendado"}
                  </p>
                  <p className="text-xs font-bold text-[#CFE2C7]">
                    Recorrência
                  </p>
                </article>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <form
                onSubmit={submitContribution}
                className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6"
              >
                <h2 className="text-2xl font-black text-[#123D2C]">
                  Registrar contribuição
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  O valor fica visível somente para você e para a
                  Tesouraria/Financeiro.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Valor
                    <input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      inputMode="decimal"
                      disabled={!payload.settings.allowCustomAmount}
                      className="rounded-2xl border border-[#123D2C]/15 p-4 font-semibold disabled:bg-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Data desta contribuição
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="rounded-2xl border border-[#123D2C]/15 p-4 font-semibold"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Forma
                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(event.target.value)
                      }
                      className="rounded-2xl border border-[#123D2C]/15 p-4 font-semibold"
                    >
                      <option value="pix">Pix</option>
                      <option value="credito">Crédito</option>
                      <option value="debito">Débito</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Comprovante
                    <input
                      value={proofUrl}
                      onChange={(event) => setProofUrl(event.target.value)}
                      className="rounded-2xl border border-[#123D2C]/15 p-4 font-semibold"
                      placeholder="Link, código ou referência"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C] sm:col-span-2">
                    Observação
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="min-h-24 rounded-2xl border border-[#123D2C]/15 p-4 font-semibold"
                    />
                  </label>
                </div>
                <button
                  disabled={saving === "contribution"}
                  className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-60"
                >
                  {saving === "contribution"
                    ? "Registrando..."
                    : "Enviar para conferência"}
                </button>
              </form>

              <section className="grid gap-4">
                <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                  <h2 className="text-2xl font-black text-[#123D2C]">
                    Orientação para o Pix
                  </h2>
                  {payload.qrCodeDataUrl && (
                    <Image
                      src={payload.qrCodeDataUrl}
                      alt="QR Code Pix"
                      width={240}
                      height={240}
                      unoptimized
                      className="mx-auto mt-4 rounded-3xl bg-white"
                    />
                  )}
                  <p className="mt-3 break-all rounded-2xl bg-[#F7FAF2] p-3 text-xs font-bold text-slate-700">
                    {payload.pixCopyPaste}
                  </p>
                </article>

                <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                  <h2 className="text-xl font-black text-[#123D2C]">
                    Organização e lembretes
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Escolha o melhor dia e como deseja ser lembrado. As
                    mensagens devem apoiar, nunca constranger.
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {payload.settings.allowedDueDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setPreferredDueDay(String(day))}
                        className={`rounded-2xl px-3 py-3 font-black ring-1 ${
                          preferredDueDay === String(day)
                            ? "bg-[#123D2C] text-white ring-[#123D2C]"
                            : "bg-white text-[#123D2C] ring-[#123D2C]/10"
                        }`}
                      >
                        Dia {day}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-2">
                    {payload.settings.recurringOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`rounded-2xl p-3 ring-1 ${
                          recurringMode === option.value
                            ? "bg-[#E9F2E7] ring-[#123D2C]/20"
                            : "bg-white ring-[#123D2C]/10"
                        } ${!option.available ? "opacity-60" : ""}`}
                      >
                        <span className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={recurringMode === option.value}
                            onChange={() => setRecurringMode(option.value)}
                            disabled={!option.available}
                            className="mt-1 h-5 w-5"
                          />
                          <span>
                            <span className="font-black text-[#123D2C]">
                              {option.label}
                            </span>
                            {option.note && (
                              <span className="mt-1 block text-xs leading-5 text-slate-500">
                                {option.note}
                              </span>
                            )}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <p className="mt-4 font-black text-[#123D2C]">
                    Lembretes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[7, 5, 3, 1].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleNumber(day)}
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ["whatsapp", "WhatsApp"],
                      ["email", "E-mail"],
                      ["painel", "Painel"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleChannel(value)}
                        className={`rounded-full px-4 py-2 text-sm font-black ring-1 ${
                          reminderChannels.includes(value)
                            ? "bg-[#E9F2E7] text-[#123D2C] ring-[#123D2C]/20"
                            : "bg-white text-slate-500 ring-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={savePreferences}
                    disabled={saving === "preferences"}
                    className="mt-4 w-full rounded-2xl bg-[#123D2C] px-4 py-4 font-black text-white disabled:opacity-60"
                  >
                    {saving === "preferences"
                      ? "Salvando..."
                      : "Salvar preferências"}
                  </button>
                </article>
              </section>
            </section>

            {payload.settings.familyContributionsEnabled && (
              <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">
                  Contribuição familiar
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#123D2C]">
                  Indique os familiares que também são Filhos da Corrente
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Os graus disponíveis são definidos pela Tesouraria/Financeiro.
                  O vínculo pode exigir confirmação do familiar e aprovação
                  financeira. Os valores individuais continuam sigilosos.
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <input
                    value={familyName}
                    onChange={(event) => setFamilyName(event.target.value)}
                    className="rounded-2xl border border-slate-200 p-4"
                    placeholder={`Ex.: Família de ${
                      payload.currentPerson?.fullName || "..."
                    }`}
                  />
                  <select
                    value={familyMode}
                    onChange={(event) => setFamilyMode(event.target.value)}
                    className="rounded-2xl border border-slate-200 p-4 font-semibold"
                  >
                    <option value="consolidada">Uma contribuição consolidada</option>
                    <option value="valores_individuais">
                      Valores individuais em uma cobrança
                    </option>
                    <option value="separada">Contribuições separadas</option>
                    <option value="parcial">
                      Responsável paga por alguns integrantes
                    </option>
                  </select>
                </div>

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

                {familyDrafts.length > 0 && (
                  <button
                    type="button"
                    onClick={requestFamily}
                    disabled={saving === "family"}
                    className="mt-4 w-full rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-60"
                  >
                    {saving === "family"
                      ? "Enviando..."
                      : "Enviar vínculo familiar"}
                  </button>
                )}

                {(payload.familyGroups ?? []).length > 0 && (
                  <div className="mt-6 grid gap-3">
                    <h3 className="text-xl font-black text-[#123D2C]">
                      Meus grupos familiares
                    </h3>
                    {(payload.familyGroups ?? []).map((group) => (
                      <article
                        key={group.id}
                        className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="font-black text-[#123D2C]">
                            {group.name}
                          </h4>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C]">
                            {group.status === "ativo"
                              ? "Ativo"
                              : "Aguardando aprovação"}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {group.members.map((member) => (
                            <p
                              key={member.id}
                              className="text-sm text-slate-600"
                            >
                              <strong>{person(member.person)?.full_name}</strong>
                              {relation(member.relationship)?.label
                                ? ` · ${relation(member.relationship)?.label}`
                                : ""}
                            </p>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-[#123D2C]/10 sm:p-6">
                <h2 className="text-2xl font-black text-[#123D2C]">
                  Próximas datas
                </h2>
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

            <Link
              href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel"
              className="w-fit rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white"
            >
              Voltar ao painel
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
