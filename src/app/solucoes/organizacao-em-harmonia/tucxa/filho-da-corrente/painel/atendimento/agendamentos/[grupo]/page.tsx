"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FilhoCorrentePanelHeader,
  filhoPanelBase,
  filhoSignOutAction,
  filhoSupportAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
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
  notes: string | null;
  metadata?: Record<string, unknown> | null;
};

type Payload = {
  entities: Entity[];
  appointments: Appointment[];
  permissions?: {
    canRegisterGeneral: boolean;
    canRegisterWednesday: boolean;
    personId: string | null;
  };
  error?: string;
};

const atendimentoHref = `${filhoPanelBase}/atendimento`;
const agendamentosHref = `${atendimentoHref}/agendamentos`;

const statusLabels: Record<string, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  atendido: "Atendido",
  ausente: "Ausente",
  cancelado: "Cancelado",
};

const groupConfigs: Record<
  string,
  {
    label: string;
    shortLabel: string;
    sectionLabel: string;
    day: "segunda" | "terca" | "quarta" | "quinta";
    dayLabel: string;
    colorClass: string;
    borderClass: string;
    description: string;
    searchLabel: string;
    isWednesday?: boolean;
    dayMatches: string[];
  }
> = {
  "segunda-feira": {
    label: "Grupo de Segunda-Feira",
    shortLabel: "Segunda",
    sectionLabel: "Atendimento Filhos de Fora",
    day: "segunda",
    dayLabel: "Segunda-feira",
    colorClass: "bg-[#F8D7D4] text-[#5C211E]",
    borderClass: "ring-[#D9827C]",
    description: "Atendimento de Filhos de Fora/Consulentes com sequência por entidade ativa e vagas disponíveis.",
    searchLabel: "Buscar consulente, filho de fora ou entidade",
    dayMatches: ["segunda", "segunda-feira", "segunda_feira", "monday"],
  },
  "terca-feira": {
    label: "Grupo de Terça-feira",
    shortLabel: "Terça",
    sectionLabel: "Atendimento Filhos de Fora",
    day: "terca",
    dayLabel: "Terça-feira",
    colorClass: "bg-[#D7EDF8] text-[#17445B]",
    borderClass: "ring-[#6AAECE]",
    description: "Atendimento de Filhos de Fora/Consulentes, com busca e conferência rápida da fila do dia.",
    searchLabel: "Buscar consulente, filho de fora ou entidade",
    dayMatches: ["terca", "terça", "terça-feira", "terca-feira", "terca_feira", "tuesday"],
  },
  "tratamento-espiritual": {
    label: "Tratamento espiritual",
    shortLabel: "Tratamento",
    sectionLabel: "Atendimento Filhos de Fora",
    day: "quarta",
    dayLabel: "Quarta-feira",
    colorClass: "bg-[#DDEFD7] text-[#234D2C]",
    borderClass: "ring-[#7BB77D]",
    description: "Atendimento de quarta-feira com registro reforçado: idade, doença/motivo e entidade que encaminhou.",
    searchLabel: "Buscar consulente, encaminhamento ou entidade",
    isWednesday: true,
    dayMatches: ["quarta", "quarta-feira", "quarta_feira", "tratamento", "tratamento-espiritual", "wednesday"],
  },
  "grupo-1": {
    label: "Grupo 1",
    shortLabel: "Grupo 1",
    sectionLabel: "Atendimento Filhos da Corrente",
    day: "quinta",
    dayLabel: "Quinta-feira",
    colorClass: "bg-[#DDEFD7] text-[#173D25]",
    borderClass: "ring-[#2F6B43]",
    description: "Atendimento dos Filhos da Corrente no Grupo 1, com consulta por entidade e próximos dias.",
    searchLabel: "Buscar Filho da Corrente ou entidade",
    dayMatches: ["quinta", "quinta-feira", "quinta_feira", "grupo1", "grupo-1", "grupo_1", "thursday"],
  },
  "grupo-2": {
    label: "Grupo 2",
    shortLabel: "Grupo 2",
    sectionLabel: "Atendimento Filhos da Corrente",
    day: "quinta",
    dayLabel: "Quinta-feira",
    colorClass: "bg-[#CBE7F7] text-[#0F4E6A]",
    borderClass: "ring-[#2C8FBE]",
    description: "Atendimento dos Filhos da Corrente no Grupo 2, com visualização da fila e vagas por entidade.",
    searchLabel: "Buscar Filho da Corrente ou entidade",
    dayMatches: ["quinta", "quinta-feira", "quinta_feira", "grupo2", "grupo-2", "grupo_2", "thursday"],
  },
};

function loginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function weekdaySlug(dateText: string) {
  const date = new Date(`${dateText}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][date.getDay()] ?? "";
}

function nextDatesForWeekday(day: string, total = 5) {
  const result: string[] = [];
  const cursor = new Date(`${todayIso()}T12:00:00`);
  let guard = 0;
  while (result.length < total && guard < 120) {
    const iso = cursor.toISOString().slice(0, 10);
    if (weekdaySlug(iso) === day) result.push(iso);
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return result;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function entityMatchesGroup(entity: Entity, matches: string[]) {
  if (entity.active === false || entity.appointment_enabled === false) return false;
  const days = entity.usual_days ?? [];
  if (days.length === 0) return true;
  const normalizedDays = days.map((day) => normalizeText(day));
  return matches.some((match) => normalizedDays.includes(normalizeText(match)));
}

export default function GrupoAgendamentoPage() {
  const params = useParams<{ grupo: string }>();
  const group = groupConfigs[params.grupo] ?? groupConfigs["segunda-feira"];

  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    age: "",
    condition: "",
    appointmentDate: nextDatesForWeekday(group.day, 1)[0] ?? todayIso(),
    appointmentTime: group.isWednesday ? "18:45" : "19:00",
    recommendedByEntityId: "",
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

  const groupEntities = useMemo(() => {
    const query = normalizeText(search);
    return (payload?.entities ?? [])
      .filter((entity) => entityMatchesGroup(entity, group.dayMatches))
      .filter((entity) => {
        if (!query) return true;
        return [entity.name, entity.line, entity.entity_type].some((item) => normalizeText(item).includes(query));
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [group.dayMatches, payload?.entities, search]);

  const appointmentsByEntity = useMemo(() => {
    const query = normalizeText(search);
    return new Map(
      groupEntities.map((entity) => {
        const appointments = (payload?.appointments ?? [])
          .filter((item) => item.entity_id === entity.id)
          .filter((item) => weekdaySlug(item.appointment_date) === group.day)
          .filter((item) => ["solicitado", "confirmado"].includes(item.status))
          .filter((item) => {
            if (!query) return true;
            return [item.consulente_name, item.whatsapp, item.email, item.notes, entity.name].some((field) => normalizeText(field).includes(query));
          })
          .sort((a, b) => `${a.appointment_date}${a.appointment_time ?? ""}`.localeCompare(`${b.appointment_date}${b.appointment_time ?? ""}`));
        return [entity.id, appointments] as const;
      }),
    );
  }, [group.day, groupEntities, payload?.appointments, search]);

  const selectedEntity = groupEntities.find((entity) => entity.id === selectedEntityId) ?? groupEntities[0] ?? null;
  const canRegister = group.isWednesday ? payload?.permissions?.canRegisterWednesday === true : payload?.permissions?.canRegisterGeneral !== false;
  const selectedAppointments = selectedEntity ? appointmentsByEntity.get(selectedEntity.id) ?? [] : [];
  const nextDates = nextDatesForWeekday(group.day, 5);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEntity) return;
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
        body: JSON.stringify({ action: "createAppointment", entityId: selectedEntity.id, ...form }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar o agendamento.");
      setMessage(result.message || "Agendamento registrado.");
      setForm((current) => ({ ...current, fullName: "", whatsapp: "", email: "", age: "", condition: "", notes: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel={group.label}
        showSupport={false}
        actions={[
          { label: "Início", href: `${agendamentosHref}/${params.grupo}`, variant: "primary" },
          { label: "Entidades", href: "#entidades", variant: "secondary" },
          { label: "Agenda", href: "#agenda", variant: "secondary" },
          { label: "Registrar", href: "#registrar", variant: "secondary" },
          { label: "Voltar", href: agendamentosHref, variant: "secondary" },
          filhoSupportAction,
          filhoSignOutAction,
        ]}
      />

      <section id="inicio" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className={`rounded-[2rem] p-5 shadow-xl ring-2 ${group.colorClass} ${group.borderClass}`}>
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-80">{group.sectionLabel}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">{group.label}</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 opacity-90">{group.description}</p>
        </div>

        <section id="entidades" className="mt-5 scroll-mt-44 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Entidades ativas</p>
              <h2 className="mt-1 text-2xl font-black text-[#123D2C]">Lista em ordem alfabética</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                A lista vem do cadastro da área logada. Quando uma entidade é cadastrada como ativa, ela aparece aqui; quando é inativada, deixa de aparecer para novos agendamentos.
              </p>
            </div>
            <label className="grid gap-1 text-sm font-black text-[#123D2C] md:min-w-80">
              {group.searchLabel}
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B]" placeholder="Digite para buscar" />
            </label>
          </div>

          {loading && <p className="mt-4 rounded-2xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Carregando entidades e agenda...</p>}
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
          {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groupEntities.map((entity) => {
              const appointments = appointmentsByEntity.get(entity.id) ?? [];
              const capacity = Math.max(1, Number(entity.daily_capacity ?? 4));
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={`rounded-[1.5rem] p-4 text-left shadow-sm ring-2 transition hover:-translate-y-1 hover:shadow-xl ${selectedEntity?.id === entity.id ? `${group.colorClass} ${group.borderClass}` : "bg-[#F7FAF2] ring-[#123D2C]/10"}`}
                >
                  <span className="block text-lg font-black">{entity.name}</span>
                  <span className="mt-1 block text-xs font-black uppercase tracking-[0.16em] opacity-70">{entity.line || entity.entity_type || group.shortLabel}</span>
                  <span className="mt-3 block text-sm font-semibold opacity-80">{appointments.length} agendamento(s) aberto(s) • capacidade {capacity}</span>
                </button>
              );
            })}
            {!loading && groupEntities.length === 0 && <p className="rounded-3xl bg-[#F7FAF2] p-5 font-bold text-slate-500 ring-1 ring-[#123D2C]/10">Nenhuma entidade ativa encontrada para este grupo.</p>}
          </div>
        </section>

        <section id="agenda" className="mt-5 scroll-mt-44 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Próximos dias</p>
          <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{selectedEntity ? selectedEntity.name : "Selecione uma entidade"}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {nextDates.map((date) => {
              const appointments = selectedAppointments.filter((item) => item.appointment_date === date);
              const capacity = Math.max(1, Number(selectedEntity?.daily_capacity ?? 4));
              const available = Math.max(0, capacity - appointments.length);
              return (
                <article key={date} className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">{group.dayLabel}</p>
                  <h3 className="mt-1 text-xl font-black text-[#123D2C]">{formatDate(date)}</h3>
                  <p className="mt-2 text-sm font-bold text-slate-600">{appointments.length} agendado(s)</p>
                  <p className="text-sm font-bold text-slate-600">{available} vaga(s) disponível(is)</p>
                </article>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3">
            {selectedAppointments.map((item, index) => (
              <article key={item.id} className="rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">#{index + 1} • {formatDate(item.appointment_date)} {item.appointment_time ? `• ${item.appointment_time}` : ""}</p>
                <h3 className="mt-1 text-xl font-black text-[#123D2C]">{item.consulente_name}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{statusLabels[item.status] ?? item.status}</p>
                {item.notes && <p className="mt-3 rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-slate-600 ring-1 ring-[#123D2C]/10">{item.notes}</p>}
              </article>
            ))}
            {!loading && selectedEntity && selectedAppointments.length === 0 && <p className="rounded-3xl bg-[#F7FAF2] p-5 font-bold text-slate-500 ring-1 ring-[#123D2C]/10">Nenhum agendamento aberto para esta entidade nos próximos registros carregados.</p>}
          </div>
        </section>

        <section id="registrar" className="mt-5 scroll-mt-44 rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Registro da recepção</p>
          <h2 className="mt-1 text-2xl font-black text-[#123D2C]">Agendar com {selectedEntity?.name ?? "entidade ativa"}</h2>
          {!canRegister && (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 font-bold text-amber-800 ring-1 ring-amber-100">
              Para este grupo, seu acesso está como visualização. O registro deve ser feito por responsável definido na área logada.
            </p>
          )}
          <form onSubmit={submit} className="mt-5 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Nome completo *
                <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required disabled={!canRegister} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100" />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                WhatsApp
                <input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} disabled={!canRegister} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100" placeholder="(19) 99999-9999" />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                E-mail
                <input value={form.email} onChange={(event) => update("email", event.target.value)} disabled={!canRegister} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100" />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Data
                <input type="date" value={form.appointmentDate} onChange={(event) => update("appointmentDate", event.target.value)} disabled={!canRegister} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100" />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Horário
                <input type="time" value={form.appointmentTime} onChange={(event) => update("appointmentTime", event.target.value)} disabled={!canRegister} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100" />
              </label>
              {group.isWednesday && (
                <>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Idade *
                    <input value={form.age} onChange={(event) => update("age", event.target.value)} disabled={!canRegister} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100" />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C] md:col-span-2">
                    Doença ou motivo do atendimento *
                    <input value={form.condition} onChange={(event) => update("condition", event.target.value)} disabled={!canRegister} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100" />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C] md:col-span-2">
                    Entidade que encaminhou *
                    <select value={form.recommendedByEntityId} onChange={(event) => update("recommendedByEntityId", event.target.value)} disabled={!canRegister} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100">
                      <option value="">Selecione</option>
                      {(payload?.entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                    </select>
                  </label>
                </>
              )}
              <label className="grid gap-1 text-sm font-black text-[#123D2C] md:col-span-2">
                Observações
                <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} disabled={!canRegister} rows={4} className="rounded-2xl border border-[#123D2C]/15 bg-white p-3 font-semibold outline-none focus:border-[#31C16B] disabled:bg-slate-100" />
              </label>
            </div>
            <button type="submit" disabled={saving || !selectedEntity || !canRegister} className="rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Salvando..." : "Registrar agendamento"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
