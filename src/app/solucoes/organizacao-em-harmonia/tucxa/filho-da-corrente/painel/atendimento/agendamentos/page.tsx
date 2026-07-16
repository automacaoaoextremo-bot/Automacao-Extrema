"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Entity = {
  id: string;
  name: string;
  line: string | null;
  entity_type: string | null;
  usual_days: string[] | null;
  daily_capacity: number | null;
  appointment_enabled?: boolean | null;
  active?: boolean | null;
};

type Appointment = {
  id: string;
  consulente_name: string;
  whatsapp: string | null;
  email: string | null;
  appointment_date: string;
  appointment_time: string | null;
  status: string;
  is_recurring: boolean;
  entity_id: string | null;
  recommended_by_entity_id: string | null;
  scheduled_by_person_id: string | null;
  notes: string | null;
  metadata?: Record<string, unknown> | null;
};

type Payload = {
  entities: Entity[];
  appointments: Appointment[];
  settings: {
    maxRecurringAppointmentsPerConsulente: number;
    autoCancelRecurringOnAbsence: boolean;
    allowDifferentEntityAfterFirstAppointment: boolean;
    allowAlternateEntityWhenUnavailable: boolean;
    wednesdayBookingMode: string;
    requireRecommendingEntityForWednesday: boolean;
  };
  error?: string;
};

const statusLabels: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  atendido: "Atendido",
  ausente: "Ausente",
  cancelado: "Cancelado",
};

const weekdays = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

function loginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function weekdaySlug(dateText: string) {
  const date = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return weekdays[date.getDay()] ?? "";
}

function weekdayLabel(value: string) {
  const labels: Record<string, string> = { segunda: "Segunda-feira", terca: "Terça-feira", quarta: "Quarta-feira", quinta: "Quinta-feira" };
  return labels[value] ?? "Dia selecionado";
}

function matchesEntityDay(entity: Entity, day: string) {
  if (entity.active === false || entity.appointment_enabled === false) return false;
  const days = entity.usual_days ?? [];
  if (days.length === 0) return true;
  return days.includes(day);
}

export default function AgendamentosAtendimentoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filterDate, setFilterDate] = useState(todayIso);
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    age: "",
    condition: "",
    appointmentDate: todayIso(),
    appointmentTime: "19:00",
    entityId: "",
    recommendedByEntityId: "",
    isRecurring: false,
    recurrenceCount: "1",
    notes: "",
  });

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(loginUrl());
      return;
    }

    const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/atendimento", { headers: { Authorization: `Bearer ${token}` } });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar os agendamentos.");
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar agendamentos."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const selectedWeekday = weekdaySlug(form.appointmentDate);
  const isWednesday = selectedWeekday === "quarta";
  const availableEntities = useMemo(() => {
    return (payload?.entities ?? [])
      .filter((entity) => matchesEntityDay(entity, selectedWeekday))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [payload?.entities, selectedWeekday]);
  const filteredAppointments = useMemo(() => {
    return (payload?.appointments ?? []).filter((item) => {
      if (filterDate && item.appointment_date !== filterDate) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      return true;
    });
  }, [filterDate, filterStatus, payload?.appointments]);

  const entityMap = useMemo(() => new Map((payload?.entities ?? []).map((entity) => [entity.id, entity.name])), [payload?.entities]);

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.replace(loginUrl());
        return;
      }
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/atendimento", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createAppointment", ...form }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar o agendamento.");
      setMessage(result.message || "Agendamento registrado para conferência da recepção.");
      setForm((current) => ({ ...current, fullName: "", whatsapp: "", email: "", age: "", condition: "", notes: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setError("");
    setMessage("");
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/atendimento", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateAppointmentStatus", appointmentId: id, status }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar o status.");
      setMessage(result.message || "Status atualizado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Agendamentos do Atendimento" />

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Recepção e acolhimento</p>
            <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Registrar ou conferir agendamentos</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Use esta tela para orientar a chegada, confirmar a entidade, preservar a ordem de atendimento e encaminhar o próximo da fila quando houver ausência.
            </p>

            {loading && <p className="mt-4 rounded-2xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Carregando dados...</p>}
            {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

            <form onSubmit={submit} className="mt-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                  Nome completo *
                  <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" />
                </label>
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                  WhatsApp
                  <input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" placeholder="(19) 99999-9999" />
                </label>
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                  E-mail
                  <input value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" />
                </label>
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                  Data *
                  <input type="date" value={form.appointmentDate} onChange={(event) => update("appointmentDate", event.target.value)} required className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" />
                  {selectedWeekday && <span className="text-xs font-bold text-slate-500">{weekdayLabel(selectedWeekday)}</span>}
                </label>
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                  Horário previsto
                  <input type="time" value={form.appointmentTime} onChange={(event) => update("appointmentTime", event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" />
                </label>
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                  Entidade *
                  <select value={form.entityId} onChange={(event) => update("entityId", event.target.value)} required className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]">
                    <option value="">Escolha a entidade</option>
                    {availableEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} • limite {entity.daily_capacity ?? 1}</option>)}
                  </select>
                  <span className="text-xs font-bold text-slate-500">A lista vem das entidades ativas no cadastro da área logada. Entidades inativas deixam de aparecer aqui automaticamente.</span>
                  {availableEntities.length === 0 && <span className="rounded-2xl bg-amber-50 p-3 text-xs font-black text-amber-800 ring-1 ring-amber-100">Nenhuma entidade ativa para {weekdayLabel(selectedWeekday)}. Ative ou ajuste os dias da entidade na Base Única.</span>}
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-[#E9F2E7] p-3 text-sm font-black text-[#123D2C] md:col-span-2">
                  <input type="checkbox" checked={form.isRecurring} onChange={(event) => update("isRecurring", event.target.checked)} className="h-5 w-5 accent-[#123D2C]" />
                  Agendamento recorrente
                </label>
                {form.isRecurring && (
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Quantas recorrências
                    <input value={form.recurrenceCount} onChange={(event) => update("recurrenceCount", event.target.value)} inputMode="numeric" className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" />
                  </label>
                )}
                {isWednesday && (
                  <>
                    <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                      Idade do consulente *
                      <input value={form.age} onChange={(event) => update("age", event.target.value)} required className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" />
                    </label>
                    <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                      Doença / motivo *
                      <input value={form.condition} onChange={(event) => update("condition", event.target.value)} required className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" />
                    </label>
                    <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                      Entidade que encaminhou *
                      <select value={form.recommendedByEntityId} onChange={(event) => update("recommendedByEntityId", event.target.value)} required className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]">
                        <option value="">Escolha</option>
                        {(payload?.entities ?? []).filter((entity) => entity.active !== false && entity.appointment_enabled !== false).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </div>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Observação
                <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" />
              </label>
              <button disabled={saving || loading} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow-lg shadow-green-900/10 disabled:opacity-60">
                {saving ? "Registrando..." : "Registrar agendamento"}
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Fila do dia</p>
                <h2 className="mt-1 text-2xl font-black text-[#123D2C]">Ordem por entidade</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 text-sm font-semibold" />
                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 text-sm font-semibold">
                  <option value="">Todos status</option>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {filteredAppointments.map((item, index) => (
                <article key={item.id} className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">#{index + 1} • {entityMap.get(item.entity_id ?? "") ?? "Entidade a definir"}</p>
                      <h3 className="mt-1 text-xl font-black text-[#123D2C]">{item.consulente_name}</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{item.appointment_date} {item.appointment_time ? `• ${item.appointment_time}` : ""} • {statusLabels[item.status] ?? item.status}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateStatus(item.id, "confirmado")} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Confirmar</button>
                      <button type="button" onClick={() => updateStatus(item.id, "atendido")} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white shadow">Atendido</button>
                      <button type="button" onClick={() => updateStatus(item.id, "ausente")} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-100">Ausente</button>
                    </div>
                  </div>
                  {item.notes && <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-slate-600 ring-1 ring-[#123D2C]/10">{item.notes}</p>}
                </article>
              ))}
              {!loading && filteredAppointments.length === 0 && <p className="rounded-3xl bg-[#F7FAF2] p-5 font-bold text-slate-500 ring-1 ring-[#123D2C]/10">Nenhum agendamento encontrado para estes filtros.</p>}
            </div>

            <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento" className="mt-5 inline-flex rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">Voltar</Link>
          </section>
        </div>
      </section>
    </main>
  );
}
