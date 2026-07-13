"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type AgendaEvent = {
  id: string;
  title: string;
  status: string;
  eventType: string;
  eventTypeLabel: string;
  classification: string;
  audience: string;
  responsiblePersonId: string;
  responsiblePersonName: string;
  associatedToCurrentPerson: boolean;
  startsAt: string | null;
  endsAt: string | null;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  recurrenceLabel: string;
  notes: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type AgendaPayload = {
  ok?: boolean;
  events?: AgendaEvent[];
  filters?: {
    eventTypes?: FilterOption[];
    classifications?: string[];
    audiences?: string[];
    responsiblePeople?: FilterOption[];
  };
  currentPerson?: {
    fullName?: string;
  };
  error?: string;
};

const todayIso = new Date().toISOString().slice(0, 10);

function loginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function eventDateOnly(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

type CalendarDay = {
  isoDate: string;
  dayNumber: number;
  outsideMonth: boolean;
  events: AgendaEvent[];
};

function calendarBaseDate(events: AgendaEvent[], startDate: string) {
  const firstEventDate = events.map((event) => eventDateOnly(event.startsAt)).find(Boolean);
  const baseIso = startDate || firstEventDate || todayIso;
  const [yearText, monthText] = baseIso.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return new Date();
  return new Date(Date.UTC(year, month, 1));
}

function buildCalendarDays(events: AgendaEvent[], startDate: string): CalendarDay[] {
  const base = calendarBaseDate(events, startDate);
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const offset = firstDay.getUTCDay();
  const eventByDate = new Map<string, AgendaEvent[]>();

  events.forEach((event) => {
    const isoDate = eventDateOnly(event.startsAt);
    if (!isoDate) return;
    const currentEvents = eventByDate.get(isoDate) ?? [];
    currentEvents.push(event);
    eventByDate.set(isoDate, currentEvents);
  });

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    const date = new Date(Date.UTC(year, month, day));
    const isoDate = date.toISOString().slice(0, 10);
    return {
      isoDate,
      dayNumber: date.getUTCDate(),
      outsideMonth: date.getUTCMonth() !== month,
      events: eventByDate.get(isoDate) ?? [],
    };
  });
}

function calendarTitle(events: AgendaEvent[], startDate: string) {
  const base = calendarBaseDate(events, startDate);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(base);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function AgendaVivaFilhoDaCorrentePage() {
  const [payload, setPayload] = useState<AgendaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [periodMode, setPeriodMode] = useState<"future" | "all">("future");
  const [eventType, setEventType] = useState("");
  const [classification, setClassification] = useState("");
  const [audience, setAudience] = useState("");
  const [responsible, setResponsible] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(loginUrl());
      return;
    }

    const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/agenda", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json()) as AgendaPayload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar a Agenda Viva.");
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar Agenda Viva.");
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

  const filteredEvents = useMemo(() => {
    const events = payload?.events ?? [];
    return events.filter((event) => {
      const dateOnly = eventDateOnly(event.startsAt);
      if (periodMode === "future" && dateOnly && dateOnly < todayIso) return false;
      if (eventType && event.eventType !== eventType) return false;
      if (classification && event.classification !== classification) return false;
      if (audience && event.audience !== audience) return false;
      if (responsible) {
        const target = event.responsiblePersonId || event.responsiblePersonName;
        if (target !== responsible) return false;
      }
      if (startDate && dateOnly && dateOnly < startDate) return false;
      if (endDate && dateOnly && dateOnly > endDate) return false;
      return true;
    });
  }, [audience, classification, endDate, eventType, payload?.events, periodMode, responsible, startDate]);

  const counters = useMemo(() => {
    const events = payload?.events ?? [];
    const future = events.filter((event) => {
      const dateOnly = eventDateOnly(event.startsAt);
      return !dateOnly || dateOnly >= todayIso;
    }).length;
    return { total: events.length, future, filtered: filteredEvents.length };
  }, [filteredEvents.length, payload?.events]);

  const calendarDays = useMemo(() => buildCalendarDays(filteredEvents, startDate), [filteredEvents, startDate]);
  const currentCalendarTitle = useMemo(() => calendarTitle(filteredEvents, startDate), [filteredEvents, startDate]);

  function clearFilters() {
    setPeriodMode("future");
    setEventType("");
    setClassification("");
    setAudience("");
    setResponsible("");
    setStartDate("");
    setEndDate("");
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Agenda Viva dos Filhos da Corrente" />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Agenda Viva dos Filhos da Corrente</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Calendário e filtros</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">
            Consulte eventos concluídos, próximos compromissos e atividades por tipo, classificação, público, responsável e período.
          </p>

          {loading && <p className="mt-5 rounded-3xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Carregando agenda...</p>}
          {error && <p className="mt-5 rounded-3xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

          {!loading && !error && (
            <div className="mt-6 grid gap-5">
              <section className="grid gap-3 sm:grid-cols-3">
                <article className="rounded-3xl bg-[#123D2C] p-4 text-white">
                  <p className="text-3xl font-black">{counters.future}</p>
                  <p className="text-sm font-bold text-[#CFE2C7]">A partir de hoje</p>
                </article>
                <article className="rounded-3xl bg-[#E9F2E7] p-4 text-[#123D2C]">
                  <p className="text-3xl font-black">{counters.total}</p>
                  <p className="text-sm font-bold">Calendário completo</p>
                </article>
                <article className="rounded-3xl bg-white p-4 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  <p className="text-3xl font-black">{counters.filtered}</p>
                  <p className="text-sm font-bold">Resultado filtrado</p>
                </article>
              </section>

              <section className="rounded-[1.75rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Visão
                    <select value={periodMode} onChange={(event) => setPeriodMode(event.target.value as "future" | "all")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-[#31C16B]">
                      <option value="future">A partir da data atual</option>
                      <option value="all">Calendário completo, incluindo concluídos</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Tipo de evento
                    <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-[#31C16B]">
                      <option value="">Todos</option>
                      {(payload?.filters?.eventTypes ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Umbanda / outros
                    <select value={classification} onChange={(event) => setClassification(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-[#31C16B]">
                      <option value="">Todos</option>
                      {(payload?.filters?.classifications ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Público
                    <select value={audience} onChange={(event) => setAudience(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-[#31C16B]">
                      <option value="">Todos</option>
                      {(payload?.filters?.audiences ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Pessoa associada/responsável
                    <select value={responsible} onChange={(event) => setResponsible(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-[#31C16B]">
                      <option value="">Todos</option>
                      {(payload?.filters?.responsiblePeople ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Período inicial
                    <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-[#31C16B]" />
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Período final
                    <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-[#31C16B]" />
                  </label>
                  <div className="flex items-end">
                    <button type="button" onClick={clearFilters} className="w-full rounded-2xl bg-white px-4 py-3 font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Limpar filtros</button>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Calendário visual</p>
                    <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{currentCalendarTitle}</h2>
                  </div>
                  <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">
                    Visão em grade para facilitar a leitura dos compromissos, inspirada nos calendários anuais e culturais usados pelo Tucxa.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#2F6B43] sm:text-xs">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
                  {calendarDays.map((day) => (
                    <article key={day.isoDate} className={`min-h-20 rounded-2xl p-2 text-left ring-1 sm:min-h-28 ${day.outsideMonth ? "bg-slate-50 text-slate-400 ring-slate-100" : "bg-[#F7FAF2] text-[#123D2C] ring-[#123D2C]/10"}`}>
                      <p className="text-sm font-black sm:text-base">{day.dayNumber}</p>
                      <div className="mt-1 grid gap-1">
                        {day.events.slice(0, 2).map((event) => (
                          <p key={`${day.isoDate}-${event.id}`} className="truncate rounded-lg bg-white px-1.5 py-1 text-[0.62rem] font-black leading-tight text-[#123D2C] ring-1 ring-[#123D2C]/10 sm:text-[0.68rem]" title={event.title}>
                            {event.title}
                          </p>
                        ))}
                        {day.events.length > 2 && <p className="text-[0.62rem] font-black text-[#2F6B43]">+{day.events.length - 2} evento(s)</p>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid gap-3">
                {filteredEvents.map((event) => (
                  <article key={event.id} className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">{event.eventTypeLabel} • {event.classification}</p>
                        <h2 className="mt-1 text-xl font-black text-[#123D2C]">{event.title}</h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{event.dateLabel} • {event.timeLabel} • {event.locationLabel}</p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${normalize(event.status).includes("conclu") || normalize(event.status).includes("realiz") ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-800"}`}>{event.status}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-600 sm:grid-cols-3">
                      <p className="rounded-2xl bg-[#F7FAF2] p-3">{event.recurrenceLabel}</p>
                      <p className="rounded-2xl bg-[#F7FAF2] p-3">Público: {event.audience}</p>
                      <p className="rounded-2xl bg-[#F7FAF2] p-3">Responsável: {event.responsiblePersonName}</p>
                    </div>
                    {event.associatedToCurrentPerson && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-emerald-800">Você está associado a esta atividade.</p>}
                    {event.notes && <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{event.notes}</p>}
                  </article>
                ))}
                {filteredEvents.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-[#123D2C]/10">Nenhum evento encontrado com estes filtros.</p>}
              </section>

              <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel" className="w-fit rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">Voltar ao painel</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
