"use client";

import Image from "next/image";
import { useMemo } from "react";

export type AnnualCalendarMode = "tucxa" | "events" | "sementinha" | "mine";

export type AnnualCalendarEvent = {
  id: string;
  title: string;
  status: string;
  eventType: string;
  eventTypeLabel: string;
  classification: string;
  eventCollection?: string;
  calendarColorKey?: string;
  eventSubtype?: string;
  startsAt: string | null;
  endsAt: string | null;
  timeLabel: string;
  associatedToCurrentPerson: boolean;
};

type DayCell = {
  isoDate: string;
  dayNumber: number;
  outsideMonth: boolean;
  events: AnnualCalendarEvent[];
};

type CalendarTone = {
  background: string;
  border: string;
  text: string;
};

const compactWeekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
const assetRoot = "/organizacao-em-harmonia/tucxa/agenda-viva";

const umbandaLegend = [
  { label: "ATENDIMENTO\nFILHOS DE FORA", kind: "section", color: "#FFF9E8" },
  { label: "GRUPO SEGUNDA-\nFEIRA", kind: "tone", color: "#F3B2AE" },
  { label: "GRUPO TERÇA-FEIRA", kind: "tone", color: "#A8D0E8" },
  { label: "TRATAMENTO\nESPIRITUAL", kind: "tone", color: "#C9E6C8" },
  { label: "ATENDIMENTO\nFILHOS DA CORRENTE", kind: "section", color: "#FFF9E8" },
  { label: "GRUPO 1", kind: "tone", color: "#5E9E6D" },
  { label: "GRUPO 2", kind: "tone", color: "#4299C6" },
  { label: "24/01 - MUTIRÃO DE\nLIMPEZA", kind: "note", color: "#FAEDC4" },
  { label: "29/01 E 30/07\nTRABALHO PARA TODOS\nOS CAVALINHOS E\nCAMBONOS", kind: "note", color: "#FAEDC4" },
  { label: "20/12 - ENCERRAMENTO", kind: "note", color: "#FAEDC4" },
  { label: "PERÍODOS DE FÉRIAS:\nJANEIRO ATÉ 28\nJULHO ATÉ 29\nA PARTIR DE 21 DE\nDEZEMBRO", kind: "vacation", color: "#D9E8D6" },
] as const;

const sementinhaLegend = [
  { key: "community-action", label: "Ação em comunidade", color: "#FFE500" },
  { key: "bazar", label: "Bazar", color: "#45CED0" },
  { key: "bazar-simple", label: "Bazar simples", color: "#D07BE0" },
  { key: "bingo", label: "Bingo", color: "#A7F34B" },
] as const;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function eventDateOnly(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildMonthDays(events: AnnualCalendarEvent[], year: number, month: number): DayCell[] {
  const first = new Date(Date.UTC(year, month, 1, 12));
  const offset = first.getUTCDay();
  const grouped = new Map<string, AnnualCalendarEvent[]>();

  events.forEach((event) => {
    const key = eventDateOnly(event.startsAt);
    if (!key) return;
    const current = grouped.get(key) ?? [];
    current.push(event);
    grouped.set(key, current);
  });

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - offset + 1, 12));
    const isoDate = toIsoDate(date);
    return {
      isoDate,
      dayNumber: date.getUTCDate(),
      outsideMonth: date.getUTCMonth() !== month,
      events: grouped.get(isoDate) ?? [],
    };
  });
}

function monthName(month: number, full = false) {
  const value = new Intl.DateTimeFormat("pt-BR", {
    month: full ? "long" : "short",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(2026, month, 1, 12)))
    .replace(".", "");
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function isInactive(event: AnnualCalendarEvent) {
  const status = normalize(event.status);
  return status.includes("cancel") || status.includes("reprov") || status.includes("inativ");
}

function umbandaTone(event: AnnualCalendarEvent): CalendarTone {
  const text = normalize(`${event.title} ${event.eventType} ${event.eventTypeLabel} ${event.calendarColorKey ?? ""}`);
  if (text.includes("segunda")) return { background: "#F3B2AE", border: "#D27670", text: "#10251C" };
  if (text.includes("terca")) return { background: "#A8D0E8", border: "#5D9FC6", text: "#10251C" };
  if (text.includes("tratamento") || text.includes("quarta")) return { background: "#C9E6C8", border: "#78AF78", text: "#10251C" };
  if (text.includes("grupo 1") || text.includes("grupo-1")) return { background: "#5E9E6D", border: "#377146", text: "#FFFFFF" };
  if (text.includes("grupo 2") || text.includes("grupo-2")) return { background: "#4299C6", border: "#226D98", text: "#FFFFFF" };
  if (text.includes("ferias") || text.includes("recesso")) return { background: "#D9E8D6", border: "#91B58B", text: "#10251C" };
  return { background: "#FAEDC4", border: "#D8B956", text: "#10251C" };
}

function socialTone(event: AnnualCalendarEvent): CalendarTone {
  return isInactive(event)
    ? { background: "#F5E8EA", border: "#A86C76", text: "#70434A" }
    : { background: "#E9C3CB", border: "#B76A7A", text: "#512F36" };
}

function sementinhaSubtype(event: AnnualCalendarEvent) {
  const explicit = normalize(event.eventSubtype ?? "");
  if (["community-action", "bazar", "bazar-simple", "bingo"].includes(explicit)) return explicit;
  const text = normalize(`${event.title} ${event.eventType} ${event.calendarColorKey ?? ""}`);
  if (text.includes("bingo")) return "bingo";
  if (text.includes("bazar simples")) return "bazar-simple";
  if (text.includes("bazar")) return "bazar";
  return "community-action";
}

function sementinhaTone(event: AnnualCalendarEvent): CalendarTone {
  const subtype = sementinhaSubtype(event);
  const color = sementinhaLegend.find((item) => item.key === subtype)?.color ?? "#FFE500";
  return { background: color, border: color, text: "#243129" };
}

function mineTone(event: AnnualCalendarEvent): CalendarTone {
  const classification = normalize(event.classification);
  if (classification.includes("umbanda")) return umbandaTone(event);
  if (classification.includes("sementinha")) return sementinhaTone(event);
  if (classification.includes("social")) return socialTone(event);
  return { background: "#DCE7F4", border: "#7896B6", text: "#19334D" };
}

function dayBackground(events: AnnualCalendarEvent[], toneFor: (event: AnnualCalendarEvent) => CalendarTone) {
  const tones = events.slice(0, 3).map(toneFor);
  if (tones.length === 0) return undefined;
  if (tones.length === 1) return tones[0].background;
  const step = 100 / tones.length;
  return `linear-gradient(135deg, ${tones.map((tone, index) => `${tone.background} ${index * step}% ${(index + 1) * step}%`).join(", ")})`;
}

function MiniMonth({
  events,
  year,
  month,
  toneFor,
  variant,
  onSelectDay,
}: {
  events: AnnualCalendarEvent[];
  year: number;
  month: number;
  toneFor: (event: AnnualCalendarEvent) => CalendarTone;
  variant: "umbanda" | "events" | "sementinha" | "mine";
  onSelectDay?: (isoDate: string, events: AnnualCalendarEvent[]) => void;
}) {
  const days = useMemo(() => buildMonthDays(events, year, month), [events, month, year]);
  const isEvents = variant === "events";
  const isSementinha = variant === "sementinha";

  const monthTitleStyle = {
    fontSize: isEvents ? "clamp(0.5rem, 1.8vw, 0.9rem)" : "clamp(0.4rem, 1.35vw, 0.62rem)",
    lineHeight: 1,
  } as const;
  const weekDayStyle = {
    fontSize: "clamp(0.28rem, 0.95vw, 0.44rem)",
    lineHeight: 1,
  } as const;
  const dayStyle = {
    width: "100%",
    minWidth: 0,
    aspectRatio: "1 / 1",
    padding: 0,
    fontSize: "clamp(0.27rem, 1.05vw, 0.46rem)",
    lineHeight: 1,
  } as const;

  return (
    <section className={`min-w-0 overflow-hidden ${isEvents ? "px-0.5" : "rounded-md bg-white/90 p-1 ring-1 ring-black/15"}`}>
      <h3
        className={`overflow-hidden text-ellipsis whitespace-nowrap text-center font-black uppercase ${
          isEvents
            ? "mb-1 font-serif normal-case text-[#4F4B4B]"
            : isSementinha
              ? "mb-1 bg-[#A7C494] py-1 tracking-[0.18em] text-white"
              : "mb-1 border-b border-black/20 bg-[#EDE7DA] py-1 text-[#10251C]"
        }`}
        style={monthTitleStyle}
      >
        {monthName(month, isEvents)}
      </h3>
      <div
        className={`grid min-w-0 grid-cols-7 text-center font-black ${
          isEvents
            ? "mb-0.5 rounded-full bg-[#E8C7CE] py-0.5 text-[#684B51]"
            : "text-[#234034]"
        }`}
        style={weekDayStyle}
      >
        {compactWeekDays.map((label, index) => (
          <span key={`${month}-${label}-${index}`} className="min-w-0 py-0.5">
            {label}
          </span>
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-7 gap-px text-center">
        {days.map((day, index) => {
          if (day.outsideMonth) {
            return <span key={`${day.isoDate}-${index}`} className="block min-w-0" style={dayStyle} />;
          }
          const firstTone = day.events[0] ? toneFor(day.events[0]) : null;
          const background = dayBackground(day.events, toneFor);
          const clickable = day.events.length > 0 && Boolean(onSelectDay);
          return (
            <button
              key={`${day.isoDate}-${index}`}
              type="button"
              disabled={!clickable}
              onClick={() => onSelectDay?.(day.isoDate, day.events)}
              title={day.events.length ? day.events.map((event) => event.title).join(" • ") : undefined}
              className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-[2px] font-bold ${clickable ? "cursor-pointer" : "cursor-default"}`}
              style={{
                ...dayStyle,
                background,
                color: firstTone?.text ?? "#26352D",
                border: firstTone ? `1px solid ${firstTone.border}` : "1px solid transparent",
              }}
            >
              <span className="block min-w-0">{day.dayNumber}</span>
              {day.events.length > 1 && <span className="absolute right-0 top-0 h-1 w-1 rounded-full bg-[#123D2C] ring-1 ring-white" />}
              {day.events.some(isInactive) && <span className="absolute inset-x-0 top-1/2 h-px -rotate-12 bg-[#7A2737]" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AnnualGrid({
  events,
  year,
  toneFor,
  variant,
  onSelectDay,
}: {
  events: AnnualCalendarEvent[];
  year: number;
  toneFor: (event: AnnualCalendarEvent) => CalendarTone;
  variant: "umbanda" | "events" | "sementinha" | "mine";
  onSelectDay?: (isoDate: string, events: AnnualCalendarEvent[]) => void;
}) {
  return (
    <div className={`grid min-w-0 ${variant === "umbanda" ? "grid-cols-4" : "grid-cols-3"} gap-1 sm:gap-3`}>
      {Array.from({ length: 12 }, (_, month) => (
        <MiniMonth
          key={month}
          events={events}
          year={year}
          month={month}
          toneFor={toneFor}
          variant={variant}
          onSelectDay={onSelectDay}
        />
      ))}
    </div>
  );
}

function TucxaCalendar({ events, year, onSelectDay }: { events: AnnualCalendarEvent[]; year: number; onSelectDay?: (isoDate: string, events: AnnualCalendarEvent[]) => void }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-[#FAFCF7] p-2 ring-1 ring-[#123D2C]/10" data-agenda-pdf>
      <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-1.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
        <aside className="grid content-start gap-1 text-center text-[0.36rem] font-black uppercase leading-tight text-[#10251C] sm:text-[0.52rem]">
          {umbandaLegend.map((item) => (
            <div
              key={item.label}
              className={`whitespace-pre-line px-1 py-1 ${item.kind === "section" ? "border border-dashed border-[#10251C]" : ""}`}
              style={{ backgroundColor: item.color }}
            >
              {item.label}
            </div>
          ))}
        </aside>
        <div className="min-w-0">
          <h2 className="pb-2 text-center text-base font-black uppercase tracking-[0.18em] text-[#4DA1D5] sm:text-2xl">TUCXA - {year}</h2>
          <AnnualGrid events={events} year={year} toneFor={umbandaTone} variant="umbanda" onSelectDay={onSelectDay} />
        </div>
      </div>
    </section>
  );
}

function EventsCalendar({ events, year, onSelectDay }: { events: AnnualCalendarEvent[]; year: number; onSelectDay?: (isoDate: string, events: AnnualCalendarEvent[]) => void }) {
  const yearEvents = useMemo(
    () => [...events].filter((event) => eventDateOnly(event.startsAt).startsWith(`${year}-`)).sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? "")),
    [events, year],
  );

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#FBFAF7] px-4 pb-5 pt-6 ring-1 ring-[#B78993]/20 sm:px-10 sm:pb-8 sm:pt-9" data-agenda-pdf>
      <Image src={`${assetRoot}/eventos-floral-top-left.webp`} alt="" width={290} height={320} className="pointer-events-none absolute left-0 top-0 w-[26%] max-w-56 opacity-90" />
      <Image src={`${assetRoot}/eventos-floral-top-right.webp`} alt="" width={310} height={335} className="pointer-events-none absolute right-0 top-0 w-[28%] max-w-60 opacity-90" />
      <Image src={`${assetRoot}/eventos-floral-bottom-left.webp`} alt="" width={275} height={295} className="pointer-events-none absolute bottom-0 left-0 w-[25%] max-w-52 opacity-90" />
      <Image src={`${assetRoot}/eventos-floral-bottom-right.webp`} alt="" width={305} height={300} className="pointer-events-none absolute bottom-0 right-0 w-[27%] max-w-56 opacity-90" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mx-auto mb-5 flex aspect-square w-32 items-center justify-center rounded-full border-2 border-[#77706E] text-center sm:w-48">
          <div className="flex h-[90%] w-[90%] items-center justify-center rounded-full border border-[#77706E] px-2 font-serif text-base leading-tight text-[#A9828D] sm:text-2xl">
            Calendário<br />Evento Tucxa<br />{year}
          </div>
        </div>
        <AnnualGrid events={yearEvents} year={year} toneFor={socialTone} variant="events" onSelectDay={onSelectDay} />
        <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-white/80 p-3 text-[0.58rem] font-bold uppercase leading-5 text-[#4F4B4B] ring-1 ring-[#B78993]/20 sm:text-xs">
          {yearEvents.length > 0 ? yearEvents.map((event) => (
            <p key={event.id} className={isInactive(event) ? "line-through opacity-60" : ""}>
              {eventDateOnly(event.startsAt).slice(8, 10)}/{eventDateOnly(event.startsAt).slice(5, 7)} - {event.title}
            </p>
          )) : <p>Nenhum evento social cadastrado para {year}.</p>}
        </div>
      </div>
    </section>
  );
}

function SementinhaCalendar({ events, year, onSelectDay }: { events: AnnualCalendarEvent[]; year: number; onSelectDay?: (isoDate: string, events: AnnualCalendarEvent[]) => void }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#FFFDF8] px-3 pb-5 pt-6 ring-1 ring-[#A7C494]/30 sm:px-8 sm:pb-8" data-agenda-pdf>
      <Image src={`${assetRoot}/sementinha-floral-top-left.webp`} alt="" width={340} height={185} className="pointer-events-none absolute left-0 top-0 w-[30%] max-w-72 opacity-55" />
      <Image src={`${assetRoot}/sementinha-floral-top-right.webp`} alt="" width={355} height={190} className="pointer-events-none absolute right-0 top-0 w-[31%] max-w-72 opacity-55" />
      <div className="relative z-10">
        <h2 className="mb-5 text-center text-lg font-light uppercase tracking-wide text-[#676767] sm:text-4xl">Calendário Sementinha {year}</h2>
        <AnnualGrid events={events} year={year} toneFor={sementinhaTone} variant="sementinha" onSelectDay={onSelectDay} />
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.62rem] font-bold text-[#5D625E] sm:text-sm">
          {sementinhaLegend.map((item) => (
            <span key={item.key} className="flex items-center gap-2">
              <span className="h-4 w-4 rounded" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
          <p className="text-center text-[0.58rem] font-semibold text-[#666] sm:text-sm">“A Caridade é uma semente que germina no coração”</p>
          <Image src={`${assetRoot}/sementinha-logo.webp`} alt="Sementinha Tucxa" width={200} height={220} className="w-20 sm:w-28" />
        </div>
      </div>
    </section>
  );
}

function MineCalendar({ events, year, onSelectDay }: { events: AnnualCalendarEvent[]; year: number; onSelectDay?: (isoDate: string, events: AnnualCalendarEvent[]) => void }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-b from-[#EDF5EB] to-white p-3 ring-1 ring-[#123D2C]/10 sm:p-6" data-agenda-pdf>
      <div className="mb-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Agenda Viva</p>
        <h2 className="mt-1 text-2xl font-black text-[#123D2C]">Minhas Atividades - {year}</h2>
        <p className="mt-1 text-xs font-semibold text-slate-600">Somente atividades relacionadas ao seu grupo, funções e vínculos.</p>
      </div>
      <AnnualGrid events={events} year={year} toneFor={mineTone} variant="mine" onSelectDay={onSelectDay} />
      {events.length === 0 && <p className="mt-4 rounded-2xl bg-white p-4 text-center text-sm font-bold text-slate-500 ring-1 ring-[#123D2C]/10">Nenhuma atividade vinculada ao seu cadastro neste ano.</p>}
    </section>
  );
}

export function AnnualCalendarView({
  mode,
  events,
  year,
  onSelectDay,
}: {
  mode: AnnualCalendarMode;
  events: AnnualCalendarEvent[];
  year: number;
  onSelectDay?: (isoDate: string, events: AnnualCalendarEvent[]) => void;
}) {
  if (mode === "events") return <EventsCalendar events={events} year={year} onSelectDay={onSelectDay} />;
  if (mode === "sementinha") return <SementinhaCalendar events={events} year={year} onSelectDay={onSelectDay} />;
  if (mode === "mine") return <MineCalendar events={events} year={year} onSelectDay={onSelectDay} />;
  return <TucxaCalendar events={events} year={year} onSelectDay={onSelectDay} />;
}
