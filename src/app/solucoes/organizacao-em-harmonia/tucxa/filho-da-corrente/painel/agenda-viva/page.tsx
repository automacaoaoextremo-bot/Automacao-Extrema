"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
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

type CalendarView = "schedule" | "day" | "threeDays" | "week" | "month" | "year";

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
const calendarHours = Array.from({ length: 17 }, (_, index) => index + 6);
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

function statusIsDone(status: string) {
  const normalized = normalize(status);
  return normalized.includes("conclu") || normalized.includes("realiz") || normalized.includes("finaliz");
}

function eventTone(event: AgendaEvent) {
  const key = `${event.eventType}-${event.classification}-${event.audience}`;
  const index = Array.from(key).reduce((total, char) => total + char.charCodeAt(0), 0) % eventTones.length;
  return eventTones[index] ?? eventTones[0];
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

function CalendarEventPill({ event, compact = false }: { event: AgendaEvent; compact?: boolean }) {
  const tone = eventTone(event);
  const done = statusIsDone(event.status);

  return (
    <div
      className={`overflow-hidden rounded-xl px-2 py-1 font-black shadow-sm ${done ? "opacity-55" : ""} ${compact ? "text-[0.62rem] leading-tight" : "text-xs leading-tight"}`}
      style={{ backgroundColor: done ? tone.soft : tone.background, border: `1px solid ${tone.border}`, color: done ? tone.border : tone.text }}
      title={`${event.title} • ${event.timeLabel}`}
    >
      <span className="block truncate">{event.title}</span>
      {!compact && <span className="block truncate text-[0.68rem] font-bold opacity-90">{event.timeLabel}</span>}
    </div>
  );
}

function MonthCalendar({ events, periodStart, onSelectDay }: { events: AgendaEvent[]; periodStart: Date; onSelectDay: (date: Date) => void }) {
  const monthDays = useMemo(() => buildMonthDays(events, periodStart), [events, periodStart]);
  const isJuly = periodStart.getUTCMonth() === 6;

  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-white shadow ring-1 ring-[#123D2C]/10">
      <div className={`p-4 ${isJuly ? "bg-[#EAF5B8]" : "bg-white"}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">{isJuly ? "Julho Cultural Tucxa" : "Calendário mensal"}</p>
            <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{monthTitle(periodStart)}</h2>
          </div>
          <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">
            Eventos aparecem com cores por tipo/classificação. Toque em um dia para abrir a visão diária.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 border-y border-[#123D2C]/10 bg-[#F7FAF2] text-center text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#2F6B43] sm:text-xs">
        {compactWeekDayLabels.map((day, index) => (
          <span key={`${day}-${index}`} className="py-2">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-white">
        {monthDays.map((day) => (
          <button
            key={day.isoDate}
            type="button"
            onClick={() => onSelectDay(dateFromIso(day.isoDate))}
            className={`min-h-24 border-b border-r border-[#123D2C]/10 p-1.5 text-left align-top transition hover:bg-[#F7FAF2] sm:min-h-32 sm:p-2 ${day.outsideMonth ? "bg-slate-50 text-slate-400" : "bg-white text-[#123D2C]"}`}
          >
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${day.isToday ? "bg-[#123D2C] text-white" : ""}`}>{day.dayNumber}</span>
            <span className="mt-1 grid gap-1">
              {day.events.slice(0, 3).map((event) => (
                <CalendarEventPill key={`${day.isoDate}-${event.id}`} event={event} compact />
              ))}
              {day.events.length > 3 && <span className="text-[0.62rem] font-black text-[#2F6B43]">+{day.events.length - 3}</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TimeGridCalendar({ events, view, periodStart, onSelectDay }: { events: AgendaEvent[]; view: "day" | "threeDays" | "week"; periodStart: Date; onSelectDay: (date: Date) => void }) {
  const days = useMemo(() => periodDays(view, periodStart), [periodStart, view]);
  const grouped = useMemo(() => eventsByDate(events), [events]);

  return (
    <section className="overflow-x-auto rounded-[1.75rem] bg-white shadow ring-1 ring-[#123D2C]/10">
      <div className={`grid min-w-[760px] ${view === "day" ? "grid-cols-[76px_1fr]" : view === "threeDays" ? "grid-cols-[76px_repeat(3,minmax(180px,1fr))]" : "grid-cols-[76px_repeat(7,minmax(140px,1fr))]"}`}>
        <div className="sticky left-0 z-10 border-b border-r border-[#123D2C]/10 bg-white p-3 text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">Hora</div>
        {days.map((day) => {
          const iso = toIsoDate(day);
          return (
            <button key={iso} type="button" onClick={() => onSelectDay(day)} className="border-b border-r border-[#123D2C]/10 bg-[#F7FAF2] p-3 text-left transition hover:bg-[#E9F2E7]">
              <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">{weekDayLabels[day.getUTCDay()]}</span>
              <span className={`mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-black ${iso === todayIso ? "bg-[#123D2C] text-white" : "text-[#123D2C]"}`}>{day.getUTCDate()}</span>
            </button>
          );
        })}

        {calendarHours.map((hour) => (
          <div key={hour} className="contents">
            <div className="sticky left-0 z-10 border-r border-[#123D2C]/10 bg-white px-3 py-4 text-right text-xs font-black text-slate-500">{hour}h</div>
            {days.map((day) => {
              const iso = toIsoDate(day);
              const dayEvents = (grouped.get(iso) ?? []).filter((event) => {
                const eventHour = eventStartHour(event);
                return eventHour === hour || (eventHour === null && hour === 6);
              });
              return (
                <div key={`${iso}-${hour}`} className="min-h-20 border-b border-r border-[#123D2C]/10 bg-[#FBFCF8] p-2">
                  <div className="grid gap-2">
                    {dayEvents.map((event) => (
                      <article key={`${iso}-${hour}-${event.id}`} className="rounded-2xl p-2 shadow-sm" style={{ backgroundColor: eventTone(event).soft, border: `1px solid ${eventTone(event).border}` }}>
                        <p className="line-clamp-2 text-sm font-black text-[#123D2C]">{event.title}</p>
                        <p className="mt-1 text-xs font-bold text-slate-700">{event.timeLabel}</p>
                        {eventDurationHours(event) > 1 && <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-slate-500">Duração aproximada: {eventDurationHours(event)}h</p>}
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function ScheduleCalendar({ events, periodStart }: { events: AgendaEvent[]; periodStart: Date }) {
  const grouped = useMemo(() => eventsByDate(events), [events]);
  const dates = useMemo(
    () => Array.from(grouped.keys()).filter((date) => date >= toIsoDate(periodStart)).sort(),
    [grouped, periodStart],
  );

  return (
    <section className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
      <div className="grid gap-4">
        {dates.slice(0, 60).map((isoDate) => {
          const date = dateFromIso(isoDate);
          const dayEvents = grouped.get(isoDate) ?? [];
          return (
            <article key={isoDate} className="grid gap-3 border-b border-[#123D2C]/10 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[110px_1fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2F6B43]">{weekDayLabels[date.getUTCDay()]}</p>
                <p className={`mt-1 inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black ${isoDate === todayIso ? "bg-[#123D2C] text-white" : "bg-[#E9F2E7] text-[#123D2C]"}`}>{date.getUTCDate()}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{monthLabel(date)}</p>
              </div>
              <div className="grid gap-2">
                {dayEvents.map((event) => (
                  <article key={`${isoDate}-${event.id}`} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: eventTone(event).background }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-[#123D2C]">{event.title}</p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{event.timeLabel} • {event.locationLabel}</p>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">{event.eventTypeLabel} • {event.classification}</p>
                      </div>
                    </div>
                  </article>
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
    <section className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Calendário anual</p>
          <h2 className="text-3xl font-black text-[#123D2C]">Tucxa - {year}</h2>
        </div>
        <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">Visão inspirada no calendário anual usado pela casa, com marcações por mês e cores dos eventos.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const monthDate = new Date(Date.UTC(year, monthIndex, 1, 12));
          const days = buildMonthDays(events, monthDate).filter((day) => !day.outsideMonth);
          return (
            <button key={monthIndex} type="button" onClick={() => onSelectMonth(monthDate)} className="rounded-3xl bg-[#FBFCF8] p-3 text-left ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:bg-[#F7FAF2] hover:shadow-lg">
              <p className="mb-2 text-center text-sm font-black uppercase tracking-[0.16em] text-[#123D2C]">{monthLabel(monthDate)}</p>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[0.58rem] font-black text-[#2F6B43]">
                {compactWeekDayLabels.map((label, index) => <span key={`${monthIndex}-${label}-${index}`}>{label}</span>)}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-0.5">
                {days.map((day) => {
                  const tone = day.events[0] ? eventTone(day.events[0]) : null;
                  return (
                    <span
                      key={day.isoDate}
                      className={`flex h-6 items-center justify-center rounded text-[0.65rem] font-black ${day.isToday ? "text-white" : "text-[#123D2C]"}`}
                      style={{ backgroundColor: day.isToday ? "#123D2C" : tone ? tone.soft : "#FFFFFF", border: day.events.length ? `1px solid ${tone?.border ?? "#DDE9DD"}` : "1px solid #EEF3EE" }}
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

function EventDetailsList({ events }: { events: AgendaEvent[] }) {
  return (
    <section className="grid gap-3">
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
  const [view, setView] = useState<CalendarView>("month");
  const [periodStart, setPeriodStart] = useState(() => dateFromIso(todayIso));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const touchStart = useRef<TouchPoint | null>(null);

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
    return uniqueSortedEvents(events).filter((event) => {
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

  const activeView = calendarViews.find((item) => item.value === view) ?? calendarViews[0];

  function clearFilters() {
    setPeriodMode("future");
    setEventType("");
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

  function selectDay(date: Date) {
    setPeriodStart(startOfDay(date));
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

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Agenda Viva dos Filhos da Corrente" />

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-4 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Agenda Viva dos Filhos da Corrente</p>
              <h1 className="mt-2 text-3xl font-black text-[#123D2C] sm:text-4xl">Calendário</h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-700">
                Visualize a agenda como no calendário do celular: escolha agenda, dia, 3 dias, semana, mês ou ano; deslize para trocar o período e use filtros quando precisar.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <button type="button" onClick={() => move(-1)} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">← Anterior</button>
              <button type="button" onClick={goToday} className="rounded-2xl bg-[#E9F2E7] px-4 py-3 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Hoje</button>
              <button type="button" onClick={() => move(1)} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Próximo →</button>
              <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="rounded-2xl bg-[#123D2C] px-4 py-3 text-sm font-black text-white shadow ring-1 ring-[#123D2C]">Filtros</button>
            </div>
          </div>

          {loading && <p className="mt-5 rounded-3xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Carregando agenda...</p>}
          {error && <p className="mt-5 rounded-3xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

          {!loading && !error && (
            <div className="mt-5 grid gap-5">
              <section className="rounded-[1.75rem] bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">{activeView.label}</p>
                    <h2 className="mt-1 text-2xl font-black text-[#123D2C]">{viewTitle(view, periodStart)}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{activeView.description} • {counters.visible} evento(s) nesta visão</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    {calendarViews.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setView(item.value)}
                        className={`rounded-2xl px-3 py-2 text-sm font-black shadow-sm ring-1 transition ${view === item.value ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/10"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {filtersOpen && (
                <section className="rounded-[1.75rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                  <div className="mb-3 grid gap-2 sm:grid-cols-4">
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

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                      Visão do conteúdo
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
              )}

              <section onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="touch-pan-y">
                {view === "month" && <MonthCalendar events={filteredEvents} periodStart={periodStart} onSelectDay={selectDay} />}
                {(view === "day" || view === "threeDays" || view === "week") && <TimeGridCalendar events={filteredEvents} view={view} periodStart={periodStart} onSelectDay={selectDay} />}
                {view === "schedule" && <ScheduleCalendar events={filteredEvents} periodStart={periodStart} />}
                {view === "year" && <YearCalendar events={filteredEvents} periodStart={periodStart} onSelectMonth={selectMonth} />}
              </section>

              <section className="rounded-[1.75rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Eventos da visão atual</p>
                    <h2 className="mt-1 text-2xl font-black text-[#123D2C]">Detalhes e orientações</h2>
                  </div>
                  <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">Use esta lista para conferir local, recorrência, público e responsável pelos eventos exibidos no calendário.</p>
                </div>
              </section>

              <EventDetailsList events={visibleEvents} />

              <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel" className="w-fit rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white">Voltar ao painel</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
