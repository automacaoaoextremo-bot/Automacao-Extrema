"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";

type SpiritualEntity = {
  id: string;
  name: string;
  line: string | null;
  entity_type: string | null;
  usual_days: string[] | null;
  daily_capacity?: number | null;
  appointment_enabled?: boolean | null;
  appointment_notes?: string | null;
};

type Scheduler = { id: string; full_name: string; email: string | null; whatsapp: string | null };

type AgendaSettings = {
  maxRecurringAppointmentsPerConsulente: number;
  autoCancelRecurringOnAbsence: boolean;
  wednesdayBookingMode: string;
  wednesdayAuthorizedPersonIds: string[];
  requireRecommendingEntityForWednesday: boolean;
  appointmentReturnGuidance: string;
};

type Payload = {
  entities: SpiritualEntity[];
  authorizedSchedulers: Scheduler[];
  settings: AgendaSettings;
};

const headerActions = [
  { label: "Consulente", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente", variant: "secondary" as const },
  { label: "Agenda Viva", href: "/solucoes/organizacao-em-harmonia/tucxa/consulente/agendar", variant: "primary" as const },
  { label: "Site do Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" as const },
];

function weekdayFromDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][date.getDay()] ?? "";
}

function weekdayLabel(value: string) {
  const labels: Record<string, string> = { domingo: "domingo", segunda: "segunda-feira", terca: "terça-feira", quarta: "quarta-feira", quinta: "quinta-feira", sexta: "sexta-feira", sabado: "sábado" };
  return labels[value] ?? value;
}

function entityMatchesDate(entity: SpiritualEntity, date: string) {
  const weekday = weekdayFromDate(date);
  if (!weekday) return true;
  const days = entity.usual_days ?? [];
  if (!days.length) return true;
  if (weekday === "quinta") return days.some((day) => day.includes("quinta"));
  return days.some((day) => day.includes(weekday));
}

export default function AgendarConsulentePage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    appointmentDate: "",
    entityId: "",
    isRecurring: false,
    recurrenceCount: "1",
    age: "",
    condition: "",
    recommendedByEntityId: "",
    scheduledByPersonId: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      fetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos")
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Não foi possível carregar a Agenda Viva.");
          if (active) setPayload(result as Payload);
        })
        .catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar agendamento."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const selectedWeekday = weekdayFromDate(form.appointmentDate);
  const isWednesday = selectedWeekday === "quarta";
  const availableEntities = useMemo(() => {
    const list = payload?.entities ?? [];
    if (!form.appointmentDate) return list;
    return list.filter((entity) => entityMatchesDate(entity, form.appointmentDate));
  }, [form.appointmentDate, payload?.entities]);

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/organizacao-em-harmonia/site-tucxa/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar o agendamento.");
      setMessage(result.message || "Solicitação registrada.");
      setForm((current) => ({ ...current, appointmentDate: "", entityId: "", recommendedByEntityId: "", scheduledByPersonId: "", age: "", condition: "", notes: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader actions={headerActions} navLabel="Menu de agendamento do consulente" />
      <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Agenda Viva</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#123D2C] sm:text-4xl">Solicitar agendamento com entidade.</h1>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Escolha uma data disponível e a entidade para atendimento. Cada entidade possui limite diário de atendimento; quando o limite é atingido, o sistema bloqueia novas solicitações para aquela data.
          </p>
          <p className="mt-3 rounded-2xl bg-[#E9F2E7] p-4 text-sm font-bold leading-6 text-[#123D2C]">
            {payload?.settings?.appointmentReturnGuidance || "Após o primeiro atendimento com uma entidade, se houver orientação de retorno, procure voltar com a mesma entidade para preservar a continuidade do cuidado."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-4 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          {loading && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-600">Carregando entidades e regras...</p>}
          {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
          {message && <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Nome completo *</span>
              <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">WhatsApp</span>
              <input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4" placeholder="(19) 99999-9999" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">E-mail</span>
              <input value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4" placeholder="seu@email.com" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#123D2C]">Data desejada *</span>
              <input value={form.appointmentDate} onChange={(event) => update("appointmentDate", event.target.value)} type="date" className="rounded-2xl border border-[#123D2C]/15 p-4" required />
              {selectedWeekday && <span className="text-xs font-bold text-slate-500">Dia selecionado: {weekdayLabel(selectedWeekday)}</span>}
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-black text-[#123D2C]">Entidade para atendimento *</span>
              <select value={form.entityId} onChange={(event) => update("entityId", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-4" required>
                <option value="">Escolha uma entidade disponível</option>
                {availableEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>{entity.name} — limite {entity.daily_capacity ?? 4}/dia</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10 md:col-span-2">
              <input type="checkbox" checked={form.isRecurring} onChange={(event) => update("isRecurring", event.target.checked)} className="h-5 w-5" />
              <span className="text-sm font-black text-[#123D2C]">Solicitar como agendamento recorrente</span>
            </label>
            {form.isRecurring && (
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#123D2C]">Quantidade de recorrências</span>
                <input value={form.recurrenceCount} onChange={(event) => update("recurrenceCount", event.target.value)} inputMode="numeric" className="rounded-2xl border border-[#123D2C]/15 p-4" />
              </label>
            )}
            {isWednesday && (
              <>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#123D2C]">Idade do consulente *</span>
                  <input value={form.age} onChange={(event) => update("age", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4" required />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#123D2C]">Doença / motivo *</span>
                  <input value={form.condition} onChange={(event) => update("condition", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 p-4" required />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-black text-[#123D2C]">Quem recomendou / encaminhou</span>
                  <select value={form.recommendedByEntityId} onChange={(event) => update("recommendedByEntityId", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-4" required={payload?.settings?.requireRecommendingEntityForWednesday !== false}>
                    <option value="">Escolha a entidade que recomendou</option>
                    {(payload?.entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                  </select>
                </label>
                {payload?.settings?.wednesdayBookingMode === "coordination" && (
                  <label className="grid gap-1">
                    <span className="text-sm font-black text-[#123D2C]">Pessoa autorizada pela coordenação</span>
                    <select value={form.scheduledByPersonId} onChange={(event) => update("scheduledByPersonId", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-4" required>
                      <option value="">Escolha quem está registrando</option>
                      {(payload?.authorizedSchedulers ?? []).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                    </select>
                  </label>
                )}
              </>
            )}
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-black text-[#123D2C]">Observação</span>
              <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-[#123D2C]/15 p-4" placeholder="Escreva apenas o necessário para orientar a validação do agendamento." />
            </label>
          </div>
          <button disabled={saving || loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 text-base font-black text-white shadow-lg shadow-green-900/10 disabled:opacity-60">
            {saving ? "Enviando..." : "Enviar solicitação de agendamento"}
          </button>
        </form>
      </section>
    </main>
  );
}
