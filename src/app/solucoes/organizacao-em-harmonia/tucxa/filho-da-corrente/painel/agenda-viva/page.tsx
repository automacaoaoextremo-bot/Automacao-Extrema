"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from "react";
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
  continuesDuringVacation?: boolean;
};

type FilterOption = {
  value: string;
  label: string;
};

type CalendarView = "schedule" | "day" | "threeDays" | "week" | "month" | "year";

type PeriodMode = "future" | "all";

type AgendaPreferences = {
  defaultView?: CalendarView;
  periodMode?: PeriodMode;
  eventTypes?: string[];
  classification?: string;
  audience?: string;
  responsible?: string;
  startDate?: string;
  endDate?: string;
  showAnnualGuide?: boolean;
};

type AgendaPayload = {
  ok?: boolean;
  events?: AgendaEvent[];
  agendaPreferences?: AgendaPreferences;
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

type CalendarDay = {
  isoDate: string;
  dayNumber: number;
  month: number;
  year: number;
  outsideMonth: boolean;
  isToday: boolean;
  events: AgendaEvent[];
};

type TouchPoint = {
  x: number;
  y: number;
};

type EventTone = {
  background: string;
  border: string;
  text: string;
  soft: string;
};

const todayIso = new Date().toISOString().slice(0, 10);
const saoPauloTimeZone = "America/Sao_Paulo";
const weekDayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const compactWeekDayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
const calendarViews: { value: CalendarView; label: string; description: string }[] = [
  { value: "schedule", label: "Agenda", description: "Lista objetiva" },
  { value: "day", label: "Dia", description: "Um dia" },
  { value: "threeDays", label: "3 dias", description: "Comparar próximos dias" },
  { value: "week", label: "Semana", description: "Visão semanal" },
  { value: "month", label: "Mês", description: "Grade mensal" },
  { value: "year", label: "Ano", description: "Calendário anual" },
];

const eventTones: EventTone[] = [
  { background: "#2563EB", border: "#1D4ED8", text: "#FFFFFF", soft: "#DBEAFE" },
  { background: "#F97316", border: "#EA580C", text: "#FFFFFF", soft: "#FFEDD5" },
  { background: "#16A34A", border: "#15803D", text: "#FFFFFF", soft: "#DCFCE7" },
  { background: "#9333EA", border: "#7E22CE", text: "#FFFFFF", soft: "#F3E8FF" },
  { background: "#DC2626", border: "#B91C1C", text: "#FFFFFF", soft: "#FEE2E2" },
  { background: "#0F766E", border: "#0F5F59", text: "#FFFFFF", soft: "#CCFBF1" },
  { background: "#BE185D", border: "#9D174D", text: "#FFFFFF", soft: "#FCE7F3" },
  { background: "#CA8A04", border: "#A16207", text: "#FFFFFF", soft: "#FEF3C7" },
];

const tucxaLegendTones: Array<{ label: string; keywords: string[]; tone: EventTone }> = [
  { label: "Grupo Segunda-feira", keywords: ["segunda", "segunda-feira", "filhos de fora segunda"], tone: { background: "#F5B7B1", border: "#D9827B", text: "#1F2937", soft: "#FCE3E0" } },
  { label: "Grupo Terça-feira", keywords: ["terca", "terça", "terça-feira", "filhos de fora terca"], tone: { background: "#B8D8F1", border: "#6BAED6", text: "#123D2C", soft: "#E4F1FB" } },
  { label: "Tratamento espiritual", keywords: ["tratamento", "transformacao", "transformação", "quarta"], tone: { background: "#CDE8CC", border: "#80B97F", text: "#123D2C", soft: "#EAF7E8" } },
  { label: "Grupo 1", keywords: ["grupo 1", "grupo-1"], tone: { background: "#6EA87A", border: "#2F6B43", text: "#FFFFFF", soft: "#DDEDDD" } },
  { label: "Grupo 2", keywords: ["grupo 2", "grupo-2"], tone: { background: "#4EA3D8", border: "#2477A8", text: "#FFFFFF", soft: "#D9EEF9" } },
  { label: "Férias/recesso", keywords: ["ferias", "férias", "recesso"], tone: { background: "#F7E6B5", border: "#D9B85F", text: "#3B2F11", soft: "#FFF4CF" } },
  { label: "Mutirão/limpeza", keywords: ["mutirao", "mutirão", "limpeza"], tone: { background: "#F8D789", border: "#D6A531", text: "#3B2F11", soft: "#FFF2CF" } },
  { label: "Encerramento", keywords: ["encerramento"], tone: { background: "#E9DFCB", border: "#BFAE8F", text: "#3B2F11", soft: "#F6EFE2" } },
];

function loginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function dateFromIso(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth) || !Number.isFinite(parsedDay)) return new Date();
  return new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay, 12));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12));
}

function addYears(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear() + amount, date.getUTCMonth(), 1, 12));
}

function startOfWeek(date: Date) {
  const base = startOfDay(date);
  base.setUTCDate(base.getUTCDate() - base.getUTCDay());
  return base;
}

function eventDateOnly(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function eventStartDate(event: AgendaEvent) {
  const isoDate = eventDateOnly(event.startsAt);
  return isoDate ? dateFromIso(isoDate) : null;
}

function eventStartHour(event: AgendaEvent) {
  if (!event.startsAt) return null;
  const date = new Date(event.startsAt);
  if (Number.isNaN(date.getTime())) return null;
  const hourText = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: saoPauloTimeZone }).format(date);
  const parsed = Number(hourText);
  return Number.isFinite(parsed) ? parsed : null;
}

function eventEndHour(event: AgendaEvent) {
  if (!event.endsAt) return eventStartHour(event);
  const date = new Date(event.endsAt);
  if (Number.isNaN(date.getTime())) return eventStartHour(event);
  const hourText = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: saoPauloTimeZone }).format(date);
  const parsed = Number(hourText);
  return Number.isFinite(parsed) ? parsed : eventStartHour(event);
}

function eventDurationHours(event: AgendaEvent) {
  const start = eventStartHour(event);
  const end = eventEndHour(event);
  if (start === null || end === null || end <= start) return 1;
  return Math.min(Math.max(end - start, 1), 4);
}

function shortDateLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(date).replace(".", "");
}

function longDateLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function monthTitle(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function viewTitle(view: CalendarView, periodStart: Date) {
  if (view === "year") return `Tucxa - ${periodStart.getUTCFullYear()}`;
  if (view === "month") return monthTitle(periodStart);
  if (view === "schedule") return `Agenda a partir de ${shortDateLabel(periodStart)}`;
  if (view === "day") return longDateLabel(periodStart);

  const days = view === "threeDays" ? 3 : 7;
  const start = view === "week" ? startOfWeek(periodStart) : periodStart;
  const end = addDays(start, days - 1);
  return `${shortDateLabel(start)} – ${shortDateLabel(end)}`;
}

function popupTitle(view: CalendarView, periodStart: Date) {
  const labelByView: Record<CalendarView, string> = {
    schedule: "AGENDA",
    day: "CALENDÁRIO DIÁRIO",
    threeDays: "CALENDÁRIO 3 DIAS",
    week: "CALENDÁRIO SEMANAL",
    month: "CALENDÁRIO MENSAL",
    year: "CALENDÁRIO ANUAL",
  };

  return `${labelByView[view]} - ${viewTitle(view, periodStart)}`;
}

function statusIsDone(status: string) {
  const normalized = normalize(status);
  return normalized.includes("conclu") || normalized.includes("realiz") || normalized.includes("finaliz");
}

function eventTone(event: AgendaEvent) {
  const search = normalize(`${event.title} ${event.eventType} ${event.eventTypeLabel} ${event.classification}`);
  const matched = tucxaLegendTones.find((item) => item.keywords.some((keyword) => search.includes(normalize(keyword))));
  if (matched) return matched.tone;

  const key = `${event.eventType}-${event.classification}-${event.audience}`;
  const index = Array.from(key).reduce((total, char) => total + char.charCodeAt(0), 0) % eventTones.length;
  return eventTones[index] ?? eventTones[0];
}

function TucxaLegend() {
  const legendRows = [
    { kind: "section", label: "Atendimento\nFilhos de Fora" },
    { kind: "tone", label: "Grupo Segunda-Feira", tone: tucxaLegendTones[0]?.tone },
    { kind: "tone", label: "Grupo Terça-Feira", tone: tucxaLegendTones[1]?.tone },
    { kind: "tone", label: "Tratamento Espiritual", tone: tucxaLegendTones[2]?.tone },
    { kind: "section", label: "Atendimento\nFilhos da Corrente" },
    { kind: "tone", label: "Grupo 1", tone: tucxaLegendTones[3]?.tone },
    { kind: "tone", label: "Grupo 2", tone: tucxaLegendTones[4]?.tone },
    { kind: "note", label: "24/01 - Mutirão de Limpeza" },
    { kind: "note", label: "29/01 e 30/07\nTrabalho para todos\nos Cavalinhos e Cambonos" },
    { kind: "note", label: "20/12 - Encerramento" },
    { kind: "vacation", label: "Períodos de Férias:\nJaneiro até 28\nJulho até 29\na partir de 21 de Dezembro" },
  ];

  return (
    <aside className="grid gap-1 text-center text-[0.42rem] font-black uppercase leading-tight text-[#10251C] sm:text-[0.5rem]">
      {legendRows.map((row, index) => {
        if (row.kind === "section") {
          return (
            <div key={`${row.kind}-${index}`} className="whitespace-pre-line border border-dashed border-[#10251C] bg-[#F6EFD8] px-1 py-1">
              {row.label}
            </div>
          );
        }

        if (row.kind === "tone" && row.tone) {
          return (
            <div key={`${row.kind}-${index}`} className="px-1 py-1" style={{ backgroundColor: row.tone.background, color: row.tone.text === "#FFFFFF" ? "#10251C" : row.tone.text }}>
              {row.label}
            </div>
          );
        }

        if (row.kind === "vacation") {
          return (
            <div key={`${row.kind}-${index}`} className="whitespace-pre-line bg-[#DDEDDD] px-1 py-1 text-[0.38rem] leading-tight">
              {row.label}
            </div>
          );
        }

        return (
          <div key={`${row.kind}-${index}`} className="whitespace-pre-line bg-[#FFF4CF] px-1 py-1 text-[0.38rem] leading-tight">
            {row.label}
          </div>
        );
      })}
    </aside>
  );
}

function AnnualMiniMonth({ events, monthDate, onSelectMonth }: { events: AgendaEvent[]; monthDate: Date; onSelectMonth?: (date: Date) => void }) {
  const days = useMemo(() => buildMonthDays(events, monthDate), [events, monthDate]);

  return (
    <button type="button" onClick={() => onSelectMonth?.(monthDate)} className="rounded-sm bg-white p-0.5 text-left ring-1 ring-[#10251C]/40 transition hover:scale-[1.02]">
      <h3 className="border-b border-[#10251C]/40 bg-[#EDE7DA] py-0.5 text-center text-[0.46rem] font-black uppercase leading-none text-[#10251C] sm:text-[0.55rem]">
        {monthTitle(monthDate).split(" de ")[0]}
      </h3>
      <div className="grid grid-cols-7 text-center text-[0.34rem] font-black leading-none text-[#10251C] sm:text-[0.42rem]">
        {compactWeekDayLabels.map((label, index) => <span key={`${monthDate.toISOString()}-${label}-${index}`} className="py-0.5">{label}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-px text-center">
        {days.map((day, index) => {
          if (day.outsideMonth) return <span key={`${day.isoDate}-${index}`} className="h-3 sm:h-3.5" />;
          const tone = day.events[0] ? eventTone(day.events[0]) : null;
          return (
            <span
              key={`${day.isoDate}-${index}`}
              className="flex h-3 items-center justify-center text-[0.34rem] font-bold leading-none sm:h-3.5 sm:text-[0.42rem]"
              style={{ backgroundColor: tone ? tone.background : "#FFFFFF", color: tone ? tone.text : "#10251C", border: tone ? `1px solid ${tone.border}` : "1px solid #D8D8D8" }}
            >
              {day.dayNumber}
            </span>
          );
        })}
      </div>
    </button>
  );
}

function DynamicAnnualTucxaPoster({ events, year, onSelectMonth }: { events: AgendaEvent[]; year: number; onSelectMonth?: (date: Date) => void }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white p-2 ring-1 ring-[#123D2C]/10">
      <div className="grid grid-cols-[4.9rem_1fr] gap-2 sm:grid-cols-[6rem_1fr] sm:gap-3">
        <TucxaLegend />
        <div className="min-w-0">
          <h2 className="pb-1 text-center text-base font-black uppercase tracking-[0.18em] text-[#4DA1D5] sm:text-xl">Tucxa - {year}</h2>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {Array.from({ length: 12 }, (_, monthIndex) => (
              <AnnualMiniMonth key={monthIndex} events={events} monthDate={new Date(Date.UTC(year, monthIndex, 1, 12))} onSelectMonth={onSelectMonth} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function visiblePeriodStart(view: CalendarView, periodStart: Date) {
  if (view === "week") return startOfWeek(periodStart);
  if (view === "month" || view === "year") return new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1, 12));
  return startOfDay(periodStart);
}

function movePeriod(view: CalendarView, periodStart: Date, direction: -1 | 1) {
  if (view === "year") return addYears(periodStart, direction);
  if (view === "month") return addMonths(periodStart, direction);
  if (view === "week") return addDays(periodStart, 7 * direction);
  if (view === "threeDays") return addDays(periodStart, 3 * direction);
  return addDays(periodStart, direction);
}

function eventsByDate(events: AgendaEvent[]) {
  const grouped = new Map<string, AgendaEvent[]>();
  events.forEach((event) => {
    const date = eventDateOnly(event.startsAt);
    if (!date) return;
    const current = grouped.get(date) ?? [];
    current.push(event);
    grouped.set(date, current);
  });

  grouped.forEach((items) => {
    items.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  });

  return grouped;
}

function buildMonthDays(events: AgendaEvent[], baseDate: Date): CalendarDay[] {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1, 12));
  const offset = firstDay.getUTCDay();
  const grouped = eventsByDate(events);

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    const date = new Date(Date.UTC(year, month, day, 12));
    const isoDate = toIsoDate(date);
    return {
      isoDate,
      dayNumber: date.getUTCDate(),
      month: date.getUTCMonth(),
      year: date.getUTCFullYear(),
      outsideMonth: date.getUTCMonth() !== month,
      isToday: isoDate === todayIso,
      events: grouped.get(isoDate) ?? [],
    };
  });
}

function periodDays(view: CalendarView, periodStart: Date) {
  if (view === "day") return [startOfDay(periodStart)];
  if (view === "threeDays") return Array.from({ length: 3 }, (_, index) => addDays(startOfDay(periodStart), index));
  return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(periodStart), index));
}

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(date).replace(".", "");
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function uniqueSortedEvents(events: AgendaEvent[]) {
  return [...events].sort((a, b) => (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999"));
}

function isCalendarView(value: unknown): value is CalendarView {
  return typeof value === "string" && calendarViews.some((item) => item.value === value);
}

function cleanStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => (typeof item === "string" ? item : "")).filter(Boolean) : [];
}

function CalendarEventPill({ event, compact = false }: { event: AgendaEvent; compact?: boolean }) {
  const tone = eventTone(event);
  const done = statusIsDone(event.status);

  return (
    <div
      className={`overflow-hidden rounded-xl px-2 py-1 font-black shadow-sm ${done ? "opacity-55" : ""} ${compact ? "text-[0.56rem] leading-tight" : "text-xs leading-tight"}`}
      style={{ backgroundColor: done ? tone.soft : tone.background, border: `1px solid ${tone.border}`, color: done ? tone.border : tone.text }}
      title={`${event.title} • ${event.timeLabel}`}
    >
      <span className="block truncate">{compact ? event.title.slice(0, 12) : event.title}</span>
      {!compact && <span className="block truncate text-[0.68rem] font-bold opacity-90">{event.timeLabel}</span>}
    </div>
  );
}

function FilterSummary({ summary }: { summary: string }) {
  return <p className="rounded-2xl bg-[#F7FAF2] px-3 py-2 text-xs font-bold leading-5 text-slate-600 ring-1 ring-[#123D2C]/10">{summary}</p>;
}

function MonthCalendar({ events, periodStart, onSelectDay, compact = false, filterSummary }: { events: AgendaEvent[]; periodStart: Date; onSelectDay: (day: CalendarDay) => void; compact?: boolean; filterSummary?: string }) {
  const monthDays = useMemo(() => buildMonthDays(events, periodStart), [events, periodStart]);
  const title = `CALENDÁRIO MENSAL - ${monthTitle(periodStart)}`;

  return (
    <section className="overflow-hidden rounded-[1.5rem] bg-white shadow ring-1 ring-[#123D2C]/10">
      <div className="bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-[1.05rem] font-black uppercase tracking-[0.14em] text-[#123D2C] sm:text-2xl">{title}</h2>
          {filterSummary && <FilterSummary summary={filterSummary} />}
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">Toque nos dias com cores diferentes para o detalhe do evento.</p>
        </div>
      </div>

      <div className="grid grid-cols-7 border-y border-[#123D2C]/10 bg-[#F7FAF2] text-center text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#2F6B43] sm:text-xs">
        {compactWeekDayLabels.map((day, index) => (
          <span key={`${day}-${index}`} className="py-1.5 sm:py-2">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-white">
        {monthDays.map((day) => {
          const firstTone = day.events[0] ? eventTone(day.events[0]) : null;
          return (
            <button
              key={day.isoDate}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`min-h-[3.1rem] border-b border-r border-[#123D2C]/10 p-1 text-left align-top transition hover:bg-[#F7FAF2] sm:min-h-24 sm:p-2 ${day.outsideMonth ? "bg-slate-50 text-slate-400" : "bg-white text-[#123D2C]"}`}
              style={firstTone && day.events.length > 0 ? { backgroundColor: firstTone.soft, border: `2px solid ${firstTone.border}` } : undefined}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black sm:h-7 sm:w-7 sm:text-sm ${day.isToday ? "bg-[#123D2C] text-white" : ""}`}>{day.dayNumber}</span>
              {compact ? (
                <span className="mt-1 flex flex-wrap gap-0.5">
                  {day.events.slice(0, 4).map((event) => {
                    const tone = eventTone(event);
                    return <span key={`${day.isoDate}-${event.id}`} className="h-1.5 w-3 rounded-full" style={{ backgroundColor: tone.background }} title={event.title} />;
                  })}
                  {day.events.length > 4 && <span className="text-[0.55rem] font-black text-[#2F6B43]">+{day.events.length - 4}</span>}
                </span>
              ) : (
                <span className="mt-1 grid gap-1">
                  {day.events.slice(0, 2).map((event) => (
                    <CalendarEventPill key={`${day.isoDate}-${event.id}`} event={event} compact />
                  ))}
                  {day.events.length > 2 && <span className="text-[0.62rem] font-black text-[#2F6B43]">+{day.events.length - 2}</span>}
                </span>
              )}
              {firstTone && day.events.length > 0 && <span className="sr-only">Dia com evento: {day.events.map((event) => event.title).join(", ")}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TimeGridCalendar({ events, view, periodStart, onSelectDay }: { events: AgendaEvent[]; view: "day" | "threeDays" | "week"; periodStart: Date; onSelectDay: (day: CalendarDay) => void }) {
  const days = useMemo(() => periodDays(view, periodStart), [periodStart, view]);
  const grouped = useMemo(() => eventsByDate(events), [events]);

  return (
    <section className="grid gap-3 rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-[#123D2C]/10 sm:p-4">
      {days.map((day) => {
        const iso = toIsoDate(day);
        const dayEvents = grouped.get(iso) ?? [];
        const calendarDay: CalendarDay = {
          isoDate: iso,
          dayNumber: day.getUTCDate(),
          month: day.getUTCMonth(),
          year: day.getUTCFullYear(),
          outsideMonth: false,
          isToday: iso === todayIso,
          events: dayEvents,
        };
        return (
          <article key={iso} className="rounded-3xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
            <button type="button" onClick={() => onSelectDay(calendarDay)} className="flex w-full items-center justify-between text-left">
              <span>
                <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">{weekDayLabels[day.getUTCDay()]}</span>
                <span className="mt-1 block text-xl font-black text-[#123D2C]">{longDateLabel(day)}</span>
              </span>
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-lg font-black ${iso === todayIso ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>{day.getUTCDate()}</span>
            </button>
            <div className="mt-3 grid gap-2">
              {dayEvents.length === 0 && <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-500">Sem eventos nesta data.</p>}
              {dayEvents.map((event) => {
                const tone = eventTone(event);
                const start = eventStartHour(event);
                const end = eventEndHour(event);
                return (
                  <button key={`${iso}-${event.id}`} type="button" onClick={() => onSelectDay(calendarDay)} className="rounded-2xl p-3 text-left shadow-sm" style={{ backgroundColor: tone.soft, border: `1px solid ${tone.border}` }}>
                    <p className="font-black text-[#123D2C]">{event.title}</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{event.timeLabel} • {event.locationLabel}</p>
                    {start !== null && <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{start}h{end !== null && end !== start ? ` • ${eventDurationHours(event)}h de duração` : ""}</p>}
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ScheduleCalendar({ events, periodStart, onSelectDay }: { events: AgendaEvent[]; periodStart: Date; onSelectDay: (day: CalendarDay) => void }) {
  const grouped = useMemo(() => eventsByDate(events), [events]);
  const dates = useMemo(
    () => Array.from(grouped.keys()).filter((date) => date >= toIsoDate(periodStart)).sort(),
    [grouped, periodStart],
  );

  return (
    <section className="rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
      <div className="grid gap-4">
        {dates.slice(0, 60).map((isoDate) => {
          const date = dateFromIso(isoDate);
          const dayEvents = grouped.get(isoDate) ?? [];
          const day: CalendarDay = { isoDate, dayNumber: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear(), outsideMonth: false, isToday: isoDate === todayIso, events: dayEvents };
          return (
            <article key={isoDate} className="grid gap-3 border-b border-[#123D2C]/10 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[110px_1fr]">
              <button type="button" onClick={() => onSelectDay(day)} className="text-left">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">{weekDayLabels[date.getUTCDay()]}</p>
                <p className={`mt-1 inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black ${isoDate === todayIso ? "bg-[#123D2C] text-white" : "bg-[#E9F2E7] text-[#123D2C]"}`}>{date.getUTCDate()}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{monthLabel(date)}</p>
              </button>
              <div className="grid gap-2">
                {dayEvents.map((event) => (
                  <button key={`${isoDate}-${event.id}`} type="button" onClick={() => onSelectDay(day)} className="rounded-2xl bg-[#F7FAF2] p-3 text-left ring-1 ring-[#123D2C]/10">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: eventTone(event).background }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-[#123D2C]">{event.title}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{event.timeLabel} • {event.locationLabel}</p>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">{event.eventTypeLabel} • {event.classification}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
        {dates.length === 0 && <p className="rounded-3xl bg-[#F7FAF2] p-5 font-bold text-slate-500">Nenhum compromisso encontrado para esta visão.</p>}
      </div>
    </section>
  );
}

function YearCalendar({ events, periodStart, onSelectMonth }: { events: AgendaEvent[]; periodStart: Date; onSelectMonth: (date: Date) => void }) {
  const year = periodStart.getUTCFullYear();

  return (
    <section className="rounded-[1.5rem] bg-white p-3 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-[#123D2C]">Tucxa - {year}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const monthDate = new Date(Date.UTC(year, monthIndex, 1, 12));
          const days = buildMonthDays(events, monthDate);
          return (
            <button key={monthIndex} type="button" onClick={() => onSelectMonth(monthDate)} className="rounded-3xl bg-[#FBFCF8] p-3 text-left ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#F7FAF2] hover:shadow-lg">
              <p className="mb-2 text-center text-sm font-black uppercase tracking-[0.16em] text-[#123D2C]">{monthLabel(monthDate)}</p>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[0.58rem] font-black text-[#2F6B43]">
                {compactWeekDayLabels.map((label, index) => <span key={`${monthIndex}-${label}-${index}`}>{label}</span>)}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  if (day.outsideMonth) {
                    return <span key={day.isoDate} aria-hidden="true" className="h-6 rounded bg-transparent" />;
                  }

                  const tone = day.events[0] ? eventTone(day.events[0]) : null;
                  return (
                    <span
                      key={day.isoDate}
                      className={`flex h-6 items-center justify-center rounded text-[0.65rem] font-black ${day.isToday ? "text-white" : "text-[#123D2C]"}`}
                      style={{ backgroundColor: day.isToday ? "#123D2C" : tone ? tone.soft : "#FFFFFF", border: day.events.length ? `2px solid ${tone?.border ?? "#DDE9DD"}` : "1px solid #EEF3EE" }}
                    >
                      {day.dayNumber}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EventDetailsList({ events, title = "Detalhes dos eventos" }: { events: AgendaEvent[]; title?: string }) {
  return (
    <section className="grid gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Eventos</p>
        <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{title}</h2>
      </div>
      {events.map((event) => (
        <article key={event.id} className="rounded-[1.5rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">{event.eventTypeLabel} • {event.classification}</p>
              <h2 className="mt-1 text-xl font-black text-[#123D2C]">{event.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{event.dateLabel} • {event.timeLabel} • {event.locationLabel}</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusIsDone(event.status) ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-800"}`}>{event.status}</span>
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
      {events.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-[#123D2C]/10">Nenhum evento encontrado com estes filtros.</p>}
    </section>
  );
}

function CalendarRenderer({ view, events, periodStart, onSelectDay, onSelectMonth, filterSummary, compactMonth = false }: { view: CalendarView; events: AgendaEvent[]; periodStart: Date; onSelectDay: (day: CalendarDay) => void; onSelectMonth: (date: Date) => void; filterSummary?: string; compactMonth?: boolean }) {
  if (view === "month") return <MonthCalendar events={events} periodStart={periodStart} onSelectDay={onSelectDay} compact={compactMonth} filterSummary={filterSummary} />;
  if (view === "day" || view === "threeDays" || view === "week") return <TimeGridCalendar events={events} view={view} periodStart={periodStart} onSelectDay={onSelectDay} />;
  if (view === "schedule") return <ScheduleCalendar events={events} periodStart={periodStart} onSelectDay={onSelectDay} />;
  return <YearCalendar events={events} periodStart={periodStart} onSelectMonth={onSelectMonth} />;
}

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#10251C]/70 px-3 py-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] bg-[#F7FAF2] shadow-2xl ring-1 ring-white/30">
        <div className="flex items-center justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-4 py-3">
          <h2 className="min-w-0 truncate text-sm font-black uppercase tracking-[0.12em] text-[#123D2C] sm:text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="shrink-0 rounded-2xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function AnnualGuideModal({ events, periodStart, onClose, onDisableAuto, onSelectMonth }: { events: AgendaEvent[]; periodStart: Date; onClose: () => void; onDisableAuto: () => void; onSelectMonth: (date: Date) => void }) {
  const year = periodStart.getUTCFullYear();

  return (
    <ModalShell title={`Calendário anual Tucxa ${year}`} onClose={onClose}>
      <div className="grid gap-3">
        <div style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
          <DynamicAnnualTucxaPoster
            events={events}
            year={year}
            onSelectMonth={(date) => {
              onSelectMonth(date);
              onClose();
            }}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDisableAuto} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Não abrir automaticamente</button>
          <button type="button" onClick={onClose} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white shadow">Abrir calendário interativo</button>
        </div>
      </div>
    </ModalShell>
  );
}

function DayEventsModal({ day, onClose }: { day: CalendarDay; onClose: () => void }) {
  return (
    <ModalShell title={`Eventos de ${longDateLabel(dateFromIso(day.isoDate))}`} onClose={onClose}>
      <EventDetailsList events={day.events} title="Detalhe do evento" />
    </ModalShell>
  );
}

function ViewButtons({ view, onChange }: { view: CalendarView; onChange: (view: CalendarView) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
      {calendarViews.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-2xl px-3 py-2 text-sm font-black shadow-sm ring-1 transition ${view === item.value ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/10"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function AgendaVivaFilhoDaCorrentePage() {
  const [payload, setPayload] = useState<AgendaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("future");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [classification, setClassification] = useState("");
  const [audience, setAudience] = useState("");
  const [responsible, setResponsible] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [view, setView] = useState<CalendarView>("month");
  const [periodStart, setPeriodStart] = useState(() => dateFromIso(todayIso));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [annualGuideOpen, setAnnualGuideOpen] = useState(false);
  const [showAnnualGuide, setShowAnnualGuide] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [notice, setNotice] = useState("");
  const touchStart = useRef<TouchPoint | null>(null);
  const preferencesApplied = useRef(false);

  const applyPreferences = useCallback((preferences?: AgendaPreferences) => {
    if (!preferences) return;
    if (isCalendarView(preferences.defaultView)) setView(preferences.defaultView);
    if (preferences.periodMode === "all" || preferences.periodMode === "future") setPeriodMode(preferences.periodMode);
    setEventTypes(cleanStringArray(preferences.eventTypes));
    setClassification(typeof preferences.classification === "string" ? preferences.classification : "");
    setAudience(typeof preferences.audience === "string" ? preferences.audience : "");
    setResponsible(typeof preferences.responsible === "string" ? preferences.responsible : "");
    setStartDate(typeof preferences.startDate === "string" ? preferences.startDate : "");
    setEndDate(typeof preferences.endDate === "string" ? preferences.endDate : "");
    setShowAnnualGuide(preferences.showAnnualGuide !== false);
  }, []);

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

    if (!preferencesApplied.current) {
      applyPreferences(result.agendaPreferences);
      preferencesApplied.current = true;
    }

    setPayload(result);
    const shouldShowAnnualGuide = result.agendaPreferences?.showAnnualGuide !== false;
    setAnnualGuideOpen(shouldShowAnnualGuide);
    setCalendarOpen(!shouldShowAnnualGuide);
  }, [applyPreferences]);

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

  const eventTypeLabels = useMemo(() => {
    return new Map((payload?.filters?.eventTypes ?? []).map((option) => [option.value, option.label]));
  }, [payload?.filters?.eventTypes]);

  const filteredEvents = useMemo(() => {
    const events = payload?.events ?? [];
    return uniqueSortedEvents(events).filter((event) => {
      const dateOnly = eventDateOnly(event.startsAt);
      if (periodMode === "future" && dateOnly && dateOnly < todayIso) return false;
      if (eventTypes.length > 0 && !eventTypes.includes(event.eventType)) return false;
      if (classification && event.classification !== classification) return false;
      if (audience && event.audience !== audience) return false;
      if (responsible) {
        if (responsible === "__associated__" && !event.associatedToCurrentPerson) return false;
        if (responsible !== "__associated__") {
          const target = event.responsiblePersonId || event.responsiblePersonName;
          if (target !== responsible) return false;
        }
      }
      if (startDate && dateOnly && dateOnly < startDate) return false;
      if (endDate && dateOnly && dateOnly > endDate) return false;
      return true;
    });
  }, [audience, classification, endDate, eventTypes, payload?.events, periodMode, responsible, startDate]);

  const visibleEvents = useMemo(() => {
    const start = visiblePeriodStart(view, periodStart);

    if (view === "year") {
      const year = start.getUTCFullYear();
      return filteredEvents.filter((event) => eventStartDate(event)?.getUTCFullYear() === year);
    }

    if (view === "month") {
      const year = start.getUTCFullYear();
      const month = start.getUTCMonth();
      return filteredEvents.filter((event) => {
        const date = eventStartDate(event);
        return date ? date.getUTCFullYear() === year && date.getUTCMonth() === month : false;
      });
    }

    if (view === "schedule") return filteredEvents.filter((event) => eventDateOnly(event.startsAt) >= toIsoDate(start));

    const days = periodDays(view, start);
    const allowed = new Set(days.map(toIsoDate));
    return filteredEvents.filter((event) => allowed.has(eventDateOnly(event.startsAt)));
  }, [filteredEvents, periodStart, view]);

  const counters = useMemo(() => {
    const events = payload?.events ?? [];
    const future = events.filter((event) => {
      const dateOnly = eventDateOnly(event.startsAt);
      return !dateOnly || dateOnly >= todayIso;
    }).length;
    return { total: events.length, future, filtered: filteredEvents.length, visible: visibleEvents.length };
  }, [filteredEvents.length, payload?.events, visibleEvents.length]);

  const filterSummary = useMemo(() => {
    const availableEventTypes = payload?.filters?.eventTypes ?? [];
    const allEventTypesSelected = availableEventTypes.length > 0 && eventTypes.length === availableEventTypes.length && availableEventTypes.every((option) => eventTypes.includes(option.value));
    const parts = [periodMode === "future" ? "a partir de hoje" : "calendário completo"];

    if (eventTypes.length > 0 && !allEventTypesSelected) {
      const selectedLabels = eventTypes.map((value) => eventTypeLabels.get(value) ?? value);
      parts.push(selectedLabels.length <= 3 ? `tipos: ${selectedLabels.join(", ")}` : `${selectedLabels.length} tipos de evento`);
    }

    if (classification) parts.push(classification);
    if (audience) parts.push(`público: ${audience}`);
    if (responsible === "__associated__") parts.push("minhas atividades");
    else if (responsible) parts.push(`responsável: ${payload?.filters?.responsiblePeople?.find((item) => item.value === responsible)?.label ?? responsible}`);
    if (startDate || endDate) parts.push(`${startDate || "início"} até ${endDate || "fim"}`);
    return `Exibindo ${parts.join(" • ")} • ${visibleEvents.length} evento(s) nesta visão.`;
  }, [audience, classification, endDate, eventTypeLabels, eventTypes, payload?.filters?.eventTypes, payload?.filters?.responsiblePeople, periodMode, responsible, startDate, visibleEvents.length]);

  function clearFilters() {
    setPeriodMode("future");
    setEventTypes([]);
    setClassification("");
    setAudience("");
    setResponsible("");
    setStartDate("");
    setEndDate("");
  }

  function goToday() {
    setPeriodStart(dateFromIso(todayIso));
  }

  function move(direction: -1 | 1) {
    setPeriodStart((current) => movePeriod(view, current, direction));
  }

  function selectDay(day: CalendarDay) {
    if (day.events.length > 0) {
      setSelectedDay(day);
      return;
    }

    setPeriodStart(startOfDay(dateFromIso(day.isoDate)));
    setView("day");
  }

  function selectMonth(date: Date) {
    setPeriodStart(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12)));
    setView("month");
  }

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches.item(0);
    if (!touch) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    const first = touchStart.current;
    const touch = event.changedTouches.item(0);
    touchStart.current = null;
    if (!first || !touch) return;

    const deltaX = touch.clientX - first.x;
    const deltaY = touch.clientY - first.y;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    move(deltaX < 0 ? 1 : -1);
  }

  function toggleEventType(value: string) {
    setEventTypes((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }


  function closeAnnualGuide(openInteractive = true) {
    setAnnualGuideOpen(false);
    if (openInteractive) setCalendarOpen(true);
  }

  async function disableAnnualGuideAuto() {
    setShowAnnualGuide(false);
    setAnnualGuideOpen(false);
    setCalendarOpen(true);
  }

  function toggleAllEventTypes() {
    const allTypes = (payload?.filters?.eventTypes ?? []).map((option) => option.value);
    setEventTypes((current) => current.length === allTypes.length ? [] : allTypes);
  }

  function toggleOnlyMine() {
    setResponsible((current) => current === "__associated__" ? "" : "__associated__");
  }

  async function saveDefaults() {
    setSavingDefaults(true);
    setNotice("");
    setError("");
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.replace(loginUrl());
        return;
      }

      const preferences: AgendaPreferences = {
        defaultView: view,
        periodMode,
        eventTypes,
        classification,
        audience,
        responsible,
        startDate,
        endDate,
        showAnnualGuide,
      };

      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/agenda", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "savePreferences", preferences }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar seu padrão da Agenda Viva.");
      setPayload((current) => (current ? { ...current, agendaPreferences: preferences } : current));
      setNotice(result.message || "Padrão da Agenda Viva salvo com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar padrão da Agenda Viva.");
    } finally {
      setSavingDefaults(false);
    }
  }

  const modalCalendar = (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <button type="button" onClick={() => move(-1)} className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">←</button>
        <button type="button" onClick={goToday} className="rounded-2xl bg-[#E9F2E7] px-3 py-2 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Hoje</button>
        <button type="button" onClick={() => move(1)} className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">→</button>
      </div>
      <ViewButtons view={view} onChange={setView} />
      <section onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="touch-pan-y">
        <CalendarRenderer view={view} events={visibleEvents} periodStart={periodStart} onSelectDay={selectDay} onSelectMonth={selectMonth} filterSummary={filterSummary} compactMonth />
      </section>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Agenda Viva" />

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-4 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <div className="grid gap-4">
            <div>
              <h1 className="text-3xl font-black text-[#123D2C] sm:text-4xl">Calendário</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Escolha a visualização, ajuste filtros e salve seu padrão para abrir a Agenda Viva do seu jeito.</p>
            </div>

            {loading && <p className="rounded-3xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Carregando agenda...</p>}
            {error && <p className="rounded-3xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
            {notice && <p className="rounded-3xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{notice}</p>}

            {!loading && !error && (
              <>
                <section className="rounded-[1.75rem] bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10 sm:p-4">
                  <div className="grid gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">{calendarViews.find((item) => item.value === view)?.label ?? "Mês"}</p>
                      <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{viewTitle(view, periodStart)}</h2>
                    </div>
                    <ViewButtons view={view} onChange={setView} />
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <button type="button" onClick={() => setAnnualGuideOpen(true)} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Visão PDF</button>
                      <button type="button" onClick={() => setCalendarOpen(true)} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white shadow ring-1 ring-[#123D2C]">Abrir calendário</button>
                      <button type="button" onClick={() => setFiltersOpen(true)} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Filtros</button>
                      <button type="button" onClick={toggleOnlyMine} className={`rounded-2xl px-4 py-3 text-sm font-black shadow ring-1 ${responsible === "__associated__" ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/10"}`}>Minhas atividades</button>
                      <button type="button" onClick={saveDefaults} disabled={savingDefaults} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 disabled:cursor-not-allowed disabled:opacity-60">{savingDefaults ? "Salvando..." : "Salvar como padrão"}</button>
                    </div>
                    <FilterSummary summary={filterSummary} />
                  </div>
                </section>

                <EventDetailsList events={visibleEvents.slice(0, 12)} title="Próximos detalhes da visão atual" />

                <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel" className="w-fit rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">Voltar ao painel</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {annualGuideOpen && <AnnualGuideModal events={filteredEvents} periodStart={periodStart} onClose={() => closeAnnualGuide(true)} onDisableAuto={disableAnnualGuideAuto} onSelectMonth={selectMonth} />}
      {calendarOpen && <ModalShell title={popupTitle(view, periodStart)} onClose={() => setCalendarOpen(false)}>{modalCalendar}</ModalShell>}

      {filtersOpen && (
        <ModalShell title="Filtros da Agenda Viva" onClose={() => setFiltersOpen(false)}>
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <article className="rounded-3xl bg-[#123D2C] p-4 text-white">
                <p className="text-2xl font-black">{counters.future}</p>
                <p className="text-xs font-bold text-[#CFE2C7]">A partir de hoje</p>
              </article>
              <article className="rounded-3xl bg-[#E9F2E7] p-4 text-[#123D2C]">
                <p className="text-2xl font-black">{counters.total}</p>
                <p className="text-xs font-bold">Calendário completo</p>
              </article>
              <article className="rounded-3xl bg-white p-4 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                <p className="text-2xl font-black">{counters.filtered}</p>
                <p className="text-xs font-bold">Resultado filtrado</p>
              </article>
              <article className="rounded-3xl bg-white p-4 text-[#123D2C] ring-1 ring-[#123D2C]/10">
                <p className="text-2xl font-black">{counters.visible}</p>
                <p className="text-xs font-bold">Na visão atual</p>
              </article>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                Visão do conteúdo
                <select value={periodMode} onChange={(event) => setPeriodMode(event.target.value as PeriodMode)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-[#31C16B]">
                  <option value="future">A partir da data atual</option>
                  <option value="all">Calendário completo, incluindo concluídos</option>
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
                  <option value="__associated__">Somente minhas atividades</option>
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
            </div>

            <section className="rounded-3xl bg-white p-4 ring-1 ring-[#123D2C]/10">
              <p className="text-sm font-black text-[#123D2C]">Tipo de Evento</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Pode escolher mais de uma opção.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={toggleAllEventTypes} className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">
                  {eventTypes.length === (payload?.filters?.eventTypes ?? []).length ? "Deselecionar todos" : "Selecionar todos"}
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(payload?.filters?.eventTypes ?? []).map((option) => (
                  <label key={option.value} className="flex items-center gap-2 rounded-2xl bg-[#F7FAF2] p-3 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10">
                    <input type="checkbox" checked={eventTypes.includes(option.value)} onChange={() => toggleEventType(option.value)} className="h-5 w-5 accent-[#123D2C]" />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>

            <label className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10">
              <input type="checkbox" checked={showAnnualGuide} onChange={(event) => setShowAnnualGuide(event.target.checked)} className="h-5 w-5 accent-[#123D2C]" />
              Abrir visão anual estilo PDF automaticamente ao entrar na Agenda Viva
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button type="button" onClick={clearFilters} className="rounded-2xl bg-white px-4 py-3 font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Limpar filtros</button>
              <button type="button" onClick={saveDefaults} disabled={savingDefaults} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10 disabled:cursor-not-allowed disabled:opacity-60">{savingDefaults ? "Salvando..." : "Salvar como padrão"}</button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white shadow ring-1 ring-[#123D2C]">Aplicar</button>
            </div>
          </div>
        </ModalShell>
      )}

      {selectedDay && <DayEventsModal day={selectedDay} onClose={() => setSelectedDay(null)} />}
    </main>
  );
}
