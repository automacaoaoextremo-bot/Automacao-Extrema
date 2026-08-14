"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import {
  AnnualCalendarView,
  type AnnualCalendarEvent,
  type AnnualCalendarMode,
} from "@/components/organizacao-em-harmonia/annual-calendar-modal";
import {
  isMonthOccurrenceAllowed,
  isRecurringWeekdayOccurrenceAllowed,
} from "@/lib/organizacao-em-harmonia/agenda-event-occurrences";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/cliente/cursos";
const MEMBER_PANEL =
  "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel";

type Course = {
  id: string;
  name: string;
  slug: string;
  objective?: string | null;
  rules?: string | null;
  planned_content?: string | null;
  status: string;
  active: boolean;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  planned_content?: string | null;
  starts_at: string;
  ends_at: string;
  location?: string | null;
  agenda_event_id?: string | null;
  status: string;
};

type Person = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
};

type TeacherLink = {
  id: string;
  lesson_id: string;
  teacher_person_id: string;
  teacher?: Person | null;
};

type Student = {
  id: string;
  course_id: string;
  person_id?: string | null;
  invited_name?: string | null;
  invited_email?: string | null;
  invited_whatsapp?: string | null;
  invitation_status: string;
  invitationUrl: string;
  person?: Person | null;
};

type Attendance = {
  id: string;
  lesson_id: string;
  course_student_id: string;
  status: string;
  checkin_method: string;
  checked_in_at?: string | null;
};

type AgendaEvent = {
  id: string;
  title: string;
  event_type?: string | null;
  status?: string | null;
  active?: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
  all_day?: boolean | null;
  recurrence_rule?: string | null;
  location?: string | null;
  group_slug?: string | null;
  responsible_person_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type Conflict = {
  teacherId: string;
  source: string;
  title: string;
  startsAt: string;
  endsAt: string;
};

type Payload = {
  courses?: Course[];
  lessons?: Lesson[];
  teachers?: TeacherLink[];
  students?: Student[];
  attendance?: Attendance[];
  people?: Person[];
  teacherCandidates?: Person[];
  agendaEvents?: AgendaEvent[];
  agendaWarning?: string | null;
};

type PopupKey = "cursos" | "aulas" | "agenda" | "alunos" | null;

function localInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function metadataText(event: AgendaEvent, keys: string[]) {
  const metadata = event.metadata ?? {};
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function eventClassification(event: AgendaEvent) {
  const explicit = metadataText(event, [
    "eventClassification",
    "event_classification",
    "classification",
    "classificacao",
  ]);
  const source = normalize(metadataText(event, ["source"]));
  const collection = normalize(
    metadataText(event, ["eventCollection", "event_collection"]),
  );
  const searchable = normalize(
    `${event.title} ${event.event_type ?? ""} ${event.group_slug ?? ""} ${source} ${collection}`,
  );

  if (normalize(explicit).includes("sementinha") || searchable.includes("sementinha")) {
    return "sementinha";
  }
  if (
    collection === "eventos-tucxa" ||
    source.includes("calendario-eventos-tucxa") ||
    normalize(explicit).includes("social")
  ) {
    return "social";
  }
  return explicit || "umbanda";
}

function calendarBucket(event: AgendaEvent): Exclude<AnnualCalendarMode, "mine"> {
  const classification = normalize(eventClassification(event));
  const collection = normalize(
    metadataText(event, ["eventCollection", "event_collection"]),
  );
  if (classification.includes("sementinha")) return "sementinha";
  if (classification.includes("social") || collection === "eventos-tucxa") {
    return "events";
  }
  return "tucxa";
}

function saoPauloParts(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function isoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekdayFromCode(value: string) {
  const days: Record<string, number> = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  };
  return days[value.toUpperCase()] ?? null;
}

function recurrenceWeekday(rule: string, fallback: number) {
  const match = rule.toUpperCase().match(/BYDAY=([^;]+)/);
  return weekdayFromCode(match?.[1]?.split(",")[0] ?? "") ?? fallback;
}

function recurrenceSetPositions(rule: string) {
  const match = rule.toUpperCase().match(/BYSETPOS=([^;]+)/);
  return (match?.[1] ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item !== 0);
}

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  position: number,
) {
  const matches: number[] = [];
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) {
    if (new Date(year, monthIndex, day).getDay() === weekday) matches.push(day);
  }
  const selected = position < 0 ? matches[matches.length + position] : matches[position - 1];
  return selected ? isoDate(year, monthIndex, selected) : "";
}

function recurrenceUntil(rule: string) {
  const match = rule.toUpperCase().match(/UNTIL=(\d{4})(\d{2})(\d{2})/);
  if (!match) return "";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function occurrenceDatesForYear(event: AgendaEvent, year: number) {
  const start = saoPauloParts(event.starts_at);
  if (!start) return [];
  const startKey = isoDate(start.year, start.month - 1, start.day);
  const rule = (event.recurrence_rule ?? "").trim();
  const recurring = Boolean(rule) || event.metadata?.recurring === true;
  if (!recurring) return start.year === year ? [startKey] : [];

  const ruleUpper = rule.toUpperCase();
  const until = recurrenceUntil(ruleUpper);
  const lastKey = until || `${year}-12-31`;
  const firstAllowed = startKey > `${year}-01-01` ? startKey : `${year}-01-01`;
  if (firstAllowed > `${year}-12-31` || lastKey < `${year}-01-01`) return [];

  const weekday = recurrenceWeekday(
    ruleUpper,
    new Date(start.year, start.month - 1, start.day).getDay(),
  );
  const dates: string[] = [];

  if (ruleUpper.includes("FREQ=MONTHLY")) {
    const positions = recurrenceSetPositions(ruleUpper);
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const candidates = positions.length
        ? positions.map((position) =>
            nthWeekdayOfMonth(year, monthIndex, weekday, position),
          )
        : [nthWeekdayOfMonth(year, monthIndex, weekday, 1)];
      for (const current of candidates) {
        if (
          current &&
          current >= firstAllowed &&
          current <= lastKey &&
          isMonthOccurrenceAllowed(event.metadata, current)
        ) {
          dates.push(current);
        }
      }
    }
    return dates;
  }

  const intervalDays = ruleUpper.includes("INTERVAL=2") ? 14 : 7;
  let cursor = new Date(start.year, start.month - 1, start.day, 12);
  while (cursor.getFullYear() < year) {
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + intervalDays,
      12,
    );
  }
  while (cursor.getFullYear() === year) {
    const current = isoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (
      current >= firstAllowed &&
      current <= lastKey &&
      isRecurringWeekdayOccurrenceAllowed(event.metadata, current)
    ) {
      dates.push(current);
    }
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + intervalDays,
      12,
    );
  }
  return dates;
}

function timeText(value?: string | null) {
  const parts = saoPauloParts(value);
  if (!parts) return "";
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function calendarEventForOccurrence(
  event: AgendaEvent,
  occurrenceDate: string,
): AnnualCalendarEvent {
  const startTime = event.all_day ? "12:00" : timeText(event.starts_at) || "12:00";
  const endTime = event.all_day ? "12:00" : timeText(event.ends_at) || startTime;
  const classification = eventClassification(event);
  const collection = metadataText(event, ["eventCollection", "event_collection"]);
  const subtype = metadataText(event, [
    "sementinhaEventType",
    "sementinha_event_type",
    "eventSubtype",
    "event_subtype",
  ]);
  const colorKey = metadataText(event, ["calendarColorKey", "calendar_color_key"]);

  return {
    id: `${event.id}:${occurrenceDate}`,
    title: event.title,
    status: event.status || "aprovado",
    eventType: event.event_type || "evento",
    eventTypeLabel: event.event_type || "Evento",
    classification,
    eventCollection: collection || undefined,
    calendarColorKey: colorKey || undefined,
    eventSubtype: subtype || undefined,
    startsAt: `${occurrenceDate}T${startTime}:00-03:00`,
    endsAt: `${occurrenceDate}T${endTime}:00-03:00`,
    timeLabel: event.all_day
      ? "Dia inteiro"
      : endTime && endTime !== startTime
        ? `${startTime} às ${endTime}`
        : startTime,
    associatedToCurrentPerson: false,
  };
}

function studentName(student: Student) {
  return student.person?.full_name || student.invited_name || "Aluno";
}

function Popup({
  title,
  subtitle,
  onClose,
  children,
  nested = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  nested?: boolean;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 ${nested ? "z-[120]" : "z-[100]"} flex items-center justify-center bg-[#10251C]/70 p-2 backdrop-blur-sm sm:p-5`}
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[1.6rem] bg-[#F7FAF2] shadow-2xl ring-1 ring-white/30 sm:rounded-[2rem]">
        <header className="sticky top-0 z-30 flex items-start justify-between gap-3 border-b border-[#123D2C]/10 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43] sm:text-xs">
              Cursos em Harmonia
            </p>
            <h2 className="mt-1 text-lg font-black text-[#00334E] sm:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white sm:px-4 sm:text-sm"
          >
            Fechar
          </button>
        </header>
        <div className="p-3 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

function CourseSelector({
  courses,
  selectedCourseId,
  onChange,
  inverse = false,
}: {
  courses: Course[];
  selectedCourseId: string;
  onChange: (value: string) => void;
  inverse?: boolean;
}) {
  return (
    <label className={`grid gap-1 text-xs font-black sm:text-sm ${inverse ? "text-white" : "text-[#00334E]"}`}>
      Curso selecionado
      <select
        value={selectedCourseId}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold"
      >
        <option value="">Selecione um curso</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>
    </label>
  );
}


function CourseAgendaCalendar({
  mode,
  onModeChange,
  year,
  onYearChange,
  availableYears,
  fromDate,
  onFromDateChange,
  events,
  selectedDay,
  onSelectDay,
  onApplyDate,
}: {
  mode: Exclude<AnnualCalendarMode, "mine">;
  onModeChange: (value: Exclude<AnnualCalendarMode, "mine">) => void;
  year: number;
  onYearChange: (value: number) => void;
  availableYears: number[];
  fromDate: string;
  onFromDateChange: (value: string) => void;
  events: AnnualCalendarEvent[];
  selectedDay: { isoDate: string; events: AnnualCalendarEvent[] } | null;
  onSelectDay: (isoDate: string, events: AnnualCalendarEvent[]) => void;
  onApplyDate?: (isoDate: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10 lg:grid-cols-[auto_1fr_auto] lg:items-end">
        <label className="grid gap-1 text-xs font-black text-[#00334E]">
          Consultar a partir de
          <input
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold"
          />
        </label>

        <div className="flex flex-wrap gap-2 lg:justify-center">
          {([
            ["tucxa", "Tucxa"],
            ["sementinha", "Sementinha"],
            ["events", "Eventos"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value)}
              className={`rounded-xl px-3 py-2 text-xs font-black sm:text-sm ${
                mode === value
                  ? "bg-[#123D2C] text-white"
                  : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onYearChange(year - 1)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-700" aria-label="Ano anterior">←</button>
          <select value={year} onChange={(event) => onYearChange(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#123D2C]">
            {Array.from(new Set([year - 1, year, year + 1, ...availableYears]))
              .sort((left, right) => right - left)
              .map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => onYearChange(year + 1)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-700" aria-label="Próximo ano">→</button>
        </div>
      </div>

      <p className="rounded-xl bg-[#E9F2E7] p-3 text-xs font-semibold leading-5 text-[#123D2C]">
        {events.length} ocorrência(s) programada(s) a partir de {fromDate ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${fromDate}T12:00:00Z`)) : "hoje"}. Toque em uma data destacada para consultar os compromissos.
      </p>

      <AnnualCalendarView mode={mode} events={events} year={year} onSelectDay={onSelectDay} />

      {selectedDay && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">Data selecionada</p>
              <p className="mt-1 text-lg font-black text-[#00334E]">
                {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${selectedDay.isoDate}T12:00:00Z`))}
              </p>
            </div>
            {onApplyDate && (
              <button type="button" onClick={() => onApplyDate(selectedDay.isoDate)} className="rounded-xl bg-[#2F6B43] px-4 py-2.5 text-sm font-black text-white">
                Usar esta data na aula
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {selectedDay.events.map((event) => (
              <article key={event.id} className="rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#00334E]">{event.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{event.timeLabel || "Horário não informado"}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function CursosEmHarmoniaGestaoPage() {
  const [payload, setPayload] = useState<Payload>({});
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openPopup, setOpenPopup] = useState<PopupKey>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [courseEditorOpen, setCourseEditorOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseObjective, setCourseObjective] = useState("");
  const [courseRules, setCourseRules] = useState("");
  const [courseContent, setCourseContent] = useState("");
  const [courseStatus, setCourseStatus] = useState("planejamento");

  const [lessonEditorOpen, setLessonEditorOpen] = useState(false);
  const [lessonListOpen, setLessonListOpen] = useState(false);
  const [lessonId, setLessonId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonStart, setLessonStart] = useState("");
  const [lessonEnd, setLessonEnd] = useState("");
  const [lessonLocation, setLessonLocation] = useState("Tucxa");
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [pendingLesson, setPendingLesson] = useState<Record<string, unknown> | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<Exclude<AnnualCalendarMode, "mine">>("tucxa");
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarFromDate, setCalendarFromDate] = useState("");
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<{
    isoDate: string;
    events: AnnualCalendarEvent[];
  } | null>(null);

  const [studentInviteOpen, setStudentInviteOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPersonId, setStudentPersonId] = useState("");
  const [studentNameInput, setStudentNameInput] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentWhatsapp, setStudentWhatsapp] = useState("");
  const [lastInvite, setLastInvite] = useState<{
    invitationUrl?: string;
    whatsappUrl?: string;
    email?: { sent?: boolean; reason?: string };
    needsRegistration?: boolean;
  } | null>(null);

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch(API, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const next = (await response.json().catch(() => ({}))) as Payload & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(next.error || "Não foi possível carregar os cursos.");
    }
    setPayload(next);
    setSelectedCourseId((current) => {
      if (current && next.courses?.some((course) => course.id === current)) {
        return current;
      }
      return next.courses?.[0]?.id || "";
    });
  }, []);

  useEffect(() => {
    let active = true;
    void supabaseBrowser.auth.getSession().then(async ({ data }) => {
      const accessToken = data.session?.access_token || "";
      if (!active) return;
      if (!accessToken) {
        setLoading(false);
        return;
      }
      setToken(accessToken);
      try {
        await load(accessToken);
      } catch (currentError) {
        if (active) {
          setError(
            currentError instanceof Error
              ? currentError.message
              : "Erro ao carregar os cursos.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [load]);

  const courses = useMemo(() => payload.courses ?? [], [payload.courses]);
  const lessons = useMemo(
    () =>
      (payload.lessons ?? []).filter(
        (item) => item.course_id === selectedCourseId,
      ),
    [payload.lessons, selectedCourseId],
  );
  const teachers = useMemo(() => payload.teachers ?? [], [payload.teachers]);
  const students = useMemo(
    () =>
      (payload.students ?? []).filter(
        (item) => item.course_id === selectedCourseId,
      ),
    [payload.students, selectedCourseId],
  );
  const teacherCandidates = useMemo(
    () => payload.teacherCandidates ?? [],
    [payload.teacherCandidates],
  );
  const attendance = useMemo(
    () => payload.attendance ?? [],
    [payload.attendance],
  );
  const agendaEvents = useMemo(
    () => payload.agendaEvents ?? [],
    [payload.agendaEvents],
  );
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const studentSuggestions = useMemo(() => {
    const needle = normalize(studentSearch.trim());
    if (needle.length < 2) return [];
    return (payload.people ?? [])
      .filter((person) =>
        normalize(
          [person.full_name, person.email, person.whatsapp]
            .filter(Boolean)
            .join(" "),
        ).includes(needle),
      )
      .slice(0, 8);
  }, [payload.people, studentSearch]);

  const availableCalendarYears = useMemo(() => {
    const values = new Set<number>();
    for (const event of agendaEvents) {
      const parts = saoPauloParts(event.starts_at);
      if (parts?.year) values.add(parts.year);
    }
    for (const lesson of payload.lessons ?? []) {
      const parts = saoPauloParts(lesson.starts_at);
      if (parts?.year) values.add(parts.year);
    }
    if (values.size === 0) values.add(2026);
    return Array.from(values).sort((left, right) => right - left);
  }, [agendaEvents, payload.lessons]);

  const annualCalendarEvents = useMemo(() => {
    return agendaEvents
      .filter((event) => event.active !== false)
      .flatMap((event) =>
        occurrenceDatesForYear(event, calendarYear).map((occurrenceDate) => ({
          bucket: calendarBucket(event),
          event: calendarEventForOccurrence(event, occurrenceDate),
        })),
      );
  }, [agendaEvents, calendarYear]);

  const visibleCalendarEvents = useMemo(
    () =>
      annualCalendarEvents
        .filter((item) => item.bucket === calendarMode)
        .map((item) => item.event)
        .filter(
          (event) =>
            !calendarFromDate ||
            (event.startsAt?.slice(0, 10) || "") >= calendarFromDate,
        ),
    [annualCalendarEvents, calendarFromDate, calendarMode],
  );

  function todayInSaoPaulo() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }

  function prepareCalendar(referenceDate?: string) {
    const fromDate = referenceDate || todayInSaoPaulo();
    const selectedYear = Number(fromDate.slice(0, 4));
    setCalendarFromDate(fromDate);
    setCalendarYear(
      Number.isInteger(selectedYear) && selectedYear > 1900
        ? selectedYear
        : availableCalendarYears[0] || 2026,
    );
    setCalendarMode("tucxa");
    setCalendarSelectedDay(null);
  }

  function openCalendarForLesson() {
    prepareCalendar(lessonStart.slice(0, 10) || undefined);
    setCalendarOpen(true);
  }

  function openAgendaCalendar() {
    prepareCalendar();
    setOpenPopup("agenda");
  }

  function changeCalendarFromDate(value: string) {
    setCalendarFromDate(value);
    const selectedYear = Number(value.slice(0, 4));
    if (Number.isInteger(selectedYear) && selectedYear > 1900) {
      setCalendarYear(selectedYear);
    }
    setCalendarSelectedDay(null);
  }

  function changeCalendarYear(value: number) {
    setCalendarYear(value);
    setCalendarSelectedDay(null);
  }

  function applyCalendarDate(isoDateValue: string) {
    const startTime = lessonStart.slice(11, 16) || "19:30";
    const endTime = lessonEnd.slice(11, 16) || "21:20";
    setLessonStart(`${isoDateValue}T${startTime}`);
    setLessonEnd(`${isoDateValue}T${endTime}`);
    setCalendarOpen(false);
    setCalendarSelectedDay(null);
  }

  async function post(body: Record<string, unknown>) {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    > & { error?: string; conflicts?: Conflict[] };
    if (!response.ok) {
      const current = new Error(
        result.error || "Não foi possível concluir a operação.",
      ) as Error & { result?: typeof result; status?: number };
      current.result = result;
      current.status = response.status;
      throw current;
    }
    return result;
  }

  async function run(body: Record<string, unknown>, message: string) {
    if (!token || saving) return null;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await post(body);
      setSuccess(message);
      await load(token);
      return result;
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : "Erro ao salvar.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  function resetCourse() {
    setCourseId("");
    setCourseName("");
    setCourseObjective("");
    setCourseRules("");
    setCourseContent("");
    setCourseStatus("planejamento");
  }

  function newCourse() {
    resetCourse();
    setCourseEditorOpen(true);
  }

  function editCourse(course: Course) {
    setSelectedCourseId(course.id);
    setCourseId(course.id);
    setCourseName(course.name);
    setCourseObjective(course.objective || "");
    setCourseRules(course.rules || "");
    setCourseContent(course.planned_content || "");
    setCourseStatus(course.status);
    setCourseEditorOpen(true);
  }

  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    const editing = Boolean(courseId);
    const result = await run(
      {
        action: "save-course",
        courseId,
        name: courseName,
        objective: courseObjective,
        rules: courseRules,
        plannedContent: courseContent,
        status: courseStatus,
        active: true,
      },
      editing ? "Curso atualizado." : "Curso criado.",
    );
    const savedId =
      typeof result?.courseId === "string" ? result.courseId : courseId;
    if (savedId) setSelectedCourseId(savedId);
    if (result) {
      resetCourse();
      setCourseEditorOpen(false);
    }
  }

  function resetLesson() {
    setLessonId("");
    setLessonTitle("");
    setLessonContent("");
    setLessonStart("");
    setLessonEnd("");
    setLessonLocation("Tucxa");
    setTeacherIds([]);
    setConflicts([]);
    setPendingLesson(null);
  }

  function newLesson() {
    resetLesson();
    setLessonListOpen(false);
    setLessonEditorOpen(true);
  }

  function editLesson(lesson: Lesson) {
    setLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.planned_content || "");
    setLessonStart(localInput(lesson.starts_at));
    setLessonEnd(localInput(lesson.ends_at));
    setLessonLocation(lesson.location || "Tucxa");
    setTeacherIds(
      teachers
        .filter((item) => item.lesson_id === lesson.id)
        .map((item) => item.teacher_person_id),
    );
    setConflicts([]);
    setPendingLesson(null);
    setLessonListOpen(false);
    setLessonEditorOpen(true);
  }

  async function saveLessonBody(body: Record<string, unknown>) {
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await post(body);
      setSuccess("Aula salva e sincronizada com a Agenda Viva.");
      resetLesson();
      setLessonEditorOpen(false);
      await load(token);
    } catch (currentError) {
      const typed = currentError as Error & {
        result?: { conflicts?: Conflict[] };
        status?: number;
      };
      if (typed.status === 409 && typed.result?.conflicts?.length) {
        setConflicts(typed.result.conflicts);
        setPendingLesson(body);
        setError(
          "Conflito de agenda encontrado. Revise os compromissos abaixo; se for uma exceção consciente, use Salvar mesmo assim.",
        );
      } else {
        setError(typed.message || "Erro ao salvar aula.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveLesson(event: FormEvent) {
    event.preventDefault();
    if (!selectedCourseId) {
      setError("Crie ou selecione um curso antes de cadastrar a aula.");
      return;
    }
    await saveLessonBody({
      action: "save-lesson",
      lessonId,
      courseId: selectedCourseId,
      title: lessonTitle,
      plannedContent: lessonContent,
      startsAt: lessonStart,
      endsAt: lessonEnd,
      location: lessonLocation,
      teacherIds,
    });
  }

  function resetStudentInvite() {
    setStudentSearch("");
    setStudentPersonId("");
    setStudentNameInput("");
    setStudentEmail("");
    setStudentWhatsapp("");
  }

  function chooseStudent(person: Person) {
    setStudentPersonId(person.id);
    setStudentNameInput(person.full_name || "");
    setStudentEmail(person.email || "");
    setStudentWhatsapp(person.whatsapp || "");
    setStudentSearch(person.full_name || "");
  }

  async function inviteStudent(event: FormEvent) {
    event.preventDefault();
    if (!selectedCourseId) {
      setError("Selecione o curso.");
      return;
    }
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    setLastInvite(null);
    try {
      const result = await post({
        action: "invite-student",
        courseId: selectedCourseId,
        personId: studentPersonId,
        name: studentNameInput,
        email: studentEmail,
        whatsapp: studentWhatsapp,
      });
      setLastInvite({
        invitationUrl:
          typeof result.invitationUrl === "string"
            ? result.invitationUrl
            : undefined,
        whatsappUrl:
          typeof result.whatsappUrl === "string" ? result.whatsappUrl : undefined,
        needsRegistration: result.needsRegistration === true,
        email:
          result.email && typeof result.email === "object"
            ? (result.email as { sent?: boolean; reason?: string })
            : undefined,
      });
      setSuccess(
        result.needsRegistration === true
          ? "Convite criado. O aluno deverá fazer o cadastro antes de confirmar."
          : "Convite criado para aluno já localizado na Base Única.",
      );
      resetStudentInvite();
      setStudentInviteOpen(false);
      await load(token);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Erro ao convidar aluno.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openArea(next: Exclude<PopupKey, null>) {
    setError("");
    setSuccess("");
    if (next === "agenda") {
      openAgendaCalendar();
      return;
    }
    setOpenPopup(next);
  }

  return (
    <OrganizacaoClientShell
      title="Cursos em Harmonia"
      description="Escolha o que deseja fazer. Cada atividade abre em uma janela própria, mantendo a gestão simples também no celular."
      simpleFinancialHeader
      financialBackHref={`${MEMBER_PANEL}/atendimento`}
      simpleHeaderHelpMessage="Olá, preciso de ajuda no Cursos em Harmonia do Tucxa em Harmonia."
    >
      {error && (
        <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            {token && (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  void load(token)
                    .catch((currentError) =>
                      setError(
                        currentError instanceof Error
                          ? currentError.message
                          : "Erro ao carregar os cursos.",
                      ),
                    )
                    .finally(() => setLoading(false));
                }}
                className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      )}

      {success && (
        <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
          {success}
        </p>
      )}

      <section className="rounded-[1.5rem] bg-[#00334E] p-3 text-white shadow sm:p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_minmax(230px,360px)] sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#BDEFD1] sm:text-xs">Gestão rápida</p>
            <h2 className="mt-1 text-base font-black sm:text-xl">O que você deseja fazer?</h2>
            {loading && <p className="mt-1 text-xs font-semibold text-[#E8FFF0]">Carregando dados...</p>}
          </div>
          {!loading && courses.length > 0 && (
            <CourseSelector
              courses={courses}
              selectedCourseId={selectedCourseId}
              onChange={setSelectedCourseId}
              inverse
            />
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => openArea("cursos")}
          disabled={loading}
          className="min-h-20 rounded-[1.35rem] bg-white p-3 text-left shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-[#F4FBF7] disabled:opacity-50"
        >
          <span className="text-xl">📚</span>
          <strong className="mt-1 block text-sm text-[#00334E] sm:text-base">
            Cursos
          </strong>
          <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">
            Criar, selecionar e editar.
          </span>
        </button>

        <button
          type="button"
          onClick={() => openArea("aulas")}
          disabled={loading}
          className="min-h-20 rounded-[1.35rem] bg-white p-3 text-left shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-[#F4FBF7] disabled:opacity-50"
        >
          <span className="text-xl">🗓️</span>
          <strong className="mt-1 block text-sm text-[#00334E] sm:text-base">
            Aulas e professores
          </strong>
          <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">
            Datas, professores e conflitos.
          </span>
        </button>

        <button
          type="button"
          onClick={() => openArea("agenda")}
          disabled={loading}
          className="min-h-20 rounded-[1.35rem] bg-white p-3 text-left shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-[#F4FBF7] disabled:opacity-50"
        >
          <span className="text-xl">📅</span>
          <strong className="mt-1 block text-sm text-[#00334E] sm:text-base">
            Agenda Viva
          </strong>
          <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">
            Conferir compromissos e horários.
          </span>
        </button>

        <button
          type="button"
          onClick={() => openArea("alunos")}
          disabled={loading}
          className="min-h-20 rounded-[1.35rem] bg-white p-3 text-left shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:bg-[#F4FBF7] disabled:opacity-50"
        >
          <span className="text-xl">👥</span>
          <strong className="mt-1 block text-sm text-[#00334E] sm:text-base">
            Alunos e convites
          </strong>
          <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">
            Pesquisar, convidar e acompanhar.
          </span>
        </button>
      </section>

      {openPopup === "cursos" && (
        <Popup
          title="Cursos"
          subtitle="O cadastro só é exibido quando você escolhe Novo curso ou Editar."
          onClose={() => {
            setCourseEditorOpen(false);
            resetCourse();
            setOpenPopup(null);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-600">
              {courses.length} curso(s) cadastrado(s).
            </p>
            <button
              type="button"
              onClick={newCourse}
              className="rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white"
            >
              Novo curso
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {courses.length === 0 && !loading && (
              <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900 sm:col-span-2">
                Nenhum curso cadastrado. Use o botão Novo curso.
              </p>
            )}
            {courses.map((course) => (
              <article
                key={course.id}
                className={`rounded-2xl p-3 ring-1 ${
                  selectedCourseId === course.id
                    ? "bg-[#F4FBF7] ring-[#2F6B43]/30"
                    : "bg-white ring-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCourseId(course.id)}
                  className="w-full text-left"
                >
                  <p className="font-black text-[#00334E]">{course.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {course.status.replaceAll("_", " ")} •{" "}
                    {(payload.lessons ?? []).filter(
                      (item) => item.course_id === course.id,
                    ).length}{" "}
                    aula(s)
                  </p>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCourseId(course.id)}
                    className="rounded-lg bg-[#E8F6ED] px-3 py-2 text-xs font-black text-[#2F6B43]"
                  >
                    Usar este curso
                  </button>
                  <button
                    type="button"
                    onClick={() => editCourse(course)}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                  >
                    Editar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Popup>
      )}

      {openPopup === "cursos" && courseEditorOpen && (
        <Popup
          nested
          title={courseId ? "Editar curso" : "Novo curso"}
          subtitle="Cadastro pedagógico"
          onClose={() => {
            resetCourse();
            setCourseEditorOpen(false);
          }}
        >
          <form onSubmit={saveCourse} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">
                Nome
                <input
                  value={courseName}
                  onChange={(event) => setCourseName(event.target.value)}
                  required
                  minLength={3}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#00334E]">
                Situação
                <select
                  value={courseStatus}
                  onChange={(event) => setCourseStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                >
                  <option value="planejamento">Planejamento</option>
                  <option value="inscricoes">Inscrições</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">
                Objetivo
                <textarea
                  value={courseObjective}
                  onChange={(event) => setCourseObjective(event.target.value)}
                  rows={2}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">
                Regras
                <textarea
                  value={courseRules}
                  onChange={(event) => setCourseRules(event.target.value)}
                  rows={2}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                  placeholder="Pré-requisitos, frequência mínima, critérios do curso..."
                />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">
                Conteúdo previsto
                <textarea
                  value={courseContent}
                  onChange={(event) => setCourseContent(event.target.value)}
                  rows={3}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                />
              </label>
            </div>
            <button
              disabled={saving}
              className="w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50"
            >
              {courseId ? "Salvar alterações" : "Criar curso"}
            </button>
          </form>
        </Popup>
      )}

      {openPopup === "aulas" && (
        <Popup
          title="Aulas e professores"
          subtitle="Selecione o curso e escolha a próxima ação. Cada etapa abre separadamente para reduzir a rolagem no celular."
          onClose={() => {
            setLessonEditorOpen(false);
            setLessonListOpen(false);
            setCalendarOpen(false);
            setOpenPopup(null);
          }}
        >
          <CourseSelector
            courses={courses}
            selectedCourseId={selectedCourseId}
            onChange={(value) => {
              setSelectedCourseId(value);
              resetLesson();
              setLessonEditorOpen(false);
              setLessonListOpen(false);
            }}
          />

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={newLesson}
              disabled={!selectedCourseId}
              className="min-h-16 rounded-xl bg-[#2F6B43] px-2 py-2 text-xs font-black text-white disabled:opacity-50 sm:text-sm"
            >
              Nova aula
            </button>
            <button
              type="button"
              onClick={openCalendarForLesson}
              className="min-h-16 rounded-xl bg-[#E9F2E7] px-2 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#2F6B43]/15 sm:text-sm"
            >
              Consultar calendário
            </button>
            <button
              type="button"
              onClick={() => setLessonListOpen(true)}
              disabled={!selectedCourseId}
              className="min-h-16 rounded-xl bg-white px-2 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50 sm:text-sm"
            >
              Cronograma ({lessons.length})
            </button>
          </div>

          <p className="mt-3 rounded-xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-[#123D2C]/10">
            {selectedCourse
              ? `Curso selecionado: ${selectedCourse.name}`
              : "Selecione um curso para criar aulas e consultar o cronograma."}
          </p>
        </Popup>
      )}

      {openPopup === "aulas" && lessonEditorOpen && (
        <Popup
          nested
          title={lessonId ? "Editar aula" : "Nova aula"}
          subtitle="Datas, professores e verificação de conflitos com a Agenda Viva."
          onClose={() => {
            resetLesson();
            setLessonEditorOpen(false);
          }}
        >
          <form onSubmit={saveLesson} className="grid gap-3">
            {!selectedCourseId && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
                Selecione um curso.
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">
                Aula
                <input
                  value={lessonTitle}
                  onChange={(event) => setLessonTitle(event.target.value)}
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                  placeholder="Ex.: Aula 1 — Fundamentos"
                />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#00334E]">
                Início
                <input
                  type="datetime-local"
                  value={lessonStart}
                  onChange={(event) => setLessonStart(event.target.value)}
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#00334E]">
                Término
                <input
                  type="datetime-local"
                  value={lessonEnd}
                  onChange={(event) => setLessonEnd(event.target.value)}
                  required
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                />
              </label>

              <button
                type="button"
                onClick={openCalendarForLesson}
                className="sm:col-span-2 flex min-h-12 w-full flex-col items-center justify-center rounded-xl border border-[#2F6B43]/20 bg-[#E9F2E7] px-3 py-2 text-center text-[#123D2C]"
              >
                <span className="text-sm font-black">Consultar calendário da Agenda Viva</span>
                <span className="mt-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">
                  TUCXA · SEMENTINHA · EVENTOS
                </span>
              </button>

              <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">
                Local
                <input
                  value={lessonLocation}
                  onChange={(event) => setLessonLocation(event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                />
              </label>
              <label className="grid gap-1 text-sm font-black text-[#00334E] sm:col-span-2">
                Conteúdo da aula
                <textarea
                  value={lessonContent}
                  onChange={(event) => setLessonContent(event.target.value)}
                  rows={2}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold"
                />
              </label>
            </div>

            <div>
              <p className="text-sm font-black text-[#00334E]">Professores</p>
              {teacherCandidates.length === 0 ? (
                <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  Nenhum Filho da Corrente possui a função Professor. Inclua a função na Base Única antes de montar a aula.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {teacherCandidates.map((person) => (
                    <label
                      key={person.id}
                      className="flex items-center gap-2 rounded-xl bg-[#F7FAF2] p-2.5 text-sm font-bold ring-1 ring-[#2F6B43]/10"
                    >
                      <input
                        type="checkbox"
                        checked={teacherIds.includes(person.id)}
                        onChange={(event) =>
                          setTeacherIds((current) =>
                            event.target.checked
                              ? [...current, person.id]
                              : current.filter((id) => id !== person.id),
                          )
                        }
                      />
                      {person.full_name || "Professor"}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
                <p className="font-black">Conflitos encontrados</p>
                {conflicts.map((item, index) => (
                  <p key={`${item.teacherId}-${index}`} className="mt-1 text-sm font-semibold">
                    • {item.title} — {formatDate(item.startsAt)} a {formatDate(item.endsAt)} ({item.source})
                  </p>
                ))}
                {pendingLesson && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveLessonBody({ ...pendingLesson, force: true })}
                    className="mt-3 rounded-xl bg-amber-900 px-4 py-2 text-sm font-black text-white"
                  >
                    Salvar mesmo assim
                  </button>
                )}
              </div>
            )}

            <button
              disabled={saving || !selectedCourseId}
              className="w-full rounded-xl bg-[#2F6B43] px-4 py-3 font-black text-white disabled:opacity-50"
            >
              Salvar aula e incluir na Agenda Viva
            </button>
          </form>
        </Popup>
      )}

      {openPopup === "aulas" && lessonListOpen && (
        <Popup
          nested
          title="Cronograma"
          subtitle={selectedCourse?.name || "Selecione um curso"}
          onClose={() => setLessonListOpen(false)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-600">{lessons.length} aula(s)</p>
            <button
              type="button"
              onClick={newLesson}
              disabled={!selectedCourseId}
              className="rounded-xl bg-[#2F6B43] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              Nova aula
            </button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {selectedCourseId && lessons.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 md:col-span-2">
                Este curso ainda não possui aulas.
              </p>
            )}
            {lessons.map((lesson) => (
              <article key={lesson.id} className="rounded-2xl bg-white p-3 ring-1 ring-[#2F6B43]/10">
                <p className="font-black text-[#00334E]">{lesson.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {formatDate(lesson.starts_at)} → {formatDate(lesson.ends_at)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Professor(es):{" "}
                  {teachers
                    .filter((item) => item.lesson_id === lesson.id)
                    .map((item) => item.teacher?.full_name || "Professor")
                    .join(", ") || "—"}
                </p>
                <button
                  type="button"
                  onClick={() => editLesson(lesson)}
                  className="mt-2 rounded-lg bg-[#E8F6ED] px-3 py-2 text-xs font-black text-[#2F6B43]"
                >
                  Editar aula
                </button>
              </article>
            ))}
          </div>
        </Popup>
      )}

      {openPopup === "aulas" && calendarOpen && (
        <Popup
          nested
          title="Calendário completo da Agenda Viva"
          subtitle="Consulte Tucxa, Sementinha e Eventos a partir da data escolhida antes de definir a aula."
          onClose={() => {
            setCalendarOpen(false);
            setCalendarSelectedDay(null);
          }}
        >
          {payload.agendaWarning && (
            <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
              {payload.agendaWarning}
            </p>
          )}
          <CourseAgendaCalendar
            mode={calendarMode}
            onModeChange={(value) => {
              setCalendarMode(value);
              setCalendarSelectedDay(null);
            }}
            year={calendarYear}
            onYearChange={changeCalendarYear}
            availableYears={availableCalendarYears}
            fromDate={calendarFromDate}
            onFromDateChange={changeCalendarFromDate}
            events={visibleCalendarEvents}
            selectedDay={calendarSelectedDay}
            onSelectDay={(isoDateValue, events) =>
              setCalendarSelectedDay({ isoDate: isoDateValue, events })
            }
            onApplyDate={applyCalendarDate}
          />
        </Popup>
      )}

      {openPopup === "agenda" && (
        <Popup
          title="Agenda Viva"
          subtitle="Consulte o calendário de Tucxa, Sementinha e Eventos da data escolhida para frente para planejar o curso."
          onClose={() => {
            setCalendarSelectedDay(null);
            setOpenPopup(null);
          }}
        >
          {payload.agendaWarning && (
            <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
              {payload.agendaWarning}
            </p>
          )}
          <CourseAgendaCalendar
            mode={calendarMode}
            onModeChange={(value) => {
              setCalendarMode(value);
              setCalendarSelectedDay(null);
            }}
            year={calendarYear}
            onYearChange={changeCalendarYear}
            availableYears={availableCalendarYears}
            fromDate={calendarFromDate}
            onFromDateChange={changeCalendarFromDate}
            events={visibleCalendarEvents}
            selectedDay={calendarSelectedDay}
            onSelectDay={(isoDateValue, events) =>
              setCalendarSelectedDay({ isoDate: isoDateValue, events })
            }
          />
        </Popup>
      )}

      {openPopup === "alunos" && (
        <Popup
          title="Alunos e convites"
          subtitle="Pesquise primeiro na Base Única; se não encontrar, o próprio convite orienta o cadastro."
          onClose={() => setOpenPopup(null)}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <CourseSelector
              courses={courses}
              selectedCourseId={selectedCourseId}
              onChange={(value) => {
                setSelectedCourseId(value);
                setStudentInviteOpen(false);
                setLastInvite(null);
                resetStudentInvite();
              }}
            />
            <button
              type="button"
              onClick={() => {
                resetStudentInvite();
                setLastInvite(null);
                setStudentInviteOpen(true);
              }}
              disabled={!selectedCourseId}
              className="min-h-11 rounded-xl bg-[#00334E] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
            >
              Convidar aluno
            </button>
          </div>

          {studentInviteOpen && (
            <form
              onSubmit={inviteStudent}
              className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-[#123D2C]/10 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                    Convite
                  </p>
                  <h3 className="mt-1 text-xl font-black text-[#00334E]">
                    Localizar e convidar
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetStudentInvite();
                    setStudentInviteOpen(false);
                  }}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                >
                  Cancelar
                </button>
              </div>

              <label className="mt-3 grid gap-1 text-sm font-black text-[#00334E]">
                Pesquisar na Base Única
                <input
                  value={studentSearch}
                  onChange={(event) => {
                    setStudentSearch(event.target.value);
                    setStudentPersonId("");
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-3 font-semibold"
                  placeholder="Nome, WhatsApp ou e-mail"
                />
              </label>

              {studentSuggestions.length > 0 && (
                <div className="mt-2 grid gap-1">
                  {studentSuggestions.map((person) => (
                    <button
                      type="button"
                      key={person.id}
                      onClick={() => chooseStudent(person)}
                      className="rounded-xl bg-[#F7FAF2] p-3 text-left text-sm ring-1 ring-[#2F6B43]/10"
                    >
                      <strong className="text-[#00334E]">
                        {person.full_name}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {[person.whatsapp, person.email]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-black text-[#00334E] sm:col-span-2">
                  Nome
                  <input
                    value={studentNameInput}
                    onChange={(event) => setStudentNameInput(event.target.value)}
                    required
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black text-[#00334E]">
                  WhatsApp
                  <input
                    value={studentWhatsapp}
                    onChange={(event) => setStudentWhatsapp(event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black text-[#00334E]">
                  E-mail
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(event) => setStudentEmail(event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <button
                disabled={saving || !selectedCourseId}
                className="mt-3 w-full rounded-xl bg-[#00334E] px-4 py-3 font-black text-white disabled:opacity-50"
              >
                Gerar e enviar convite
              </button>
            </form>
          )}

          {lastInvite && (
            <div className="mt-4 rounded-xl bg-[#F4FBF7] p-4 text-sm font-semibold text-slate-700 ring-1 ring-[#2F6B43]/10">
              <p>
                {lastInvite.needsRegistration
                  ? "Cadastro não localizado: o convite orienta o aluno a se cadastrar."
                  : "Aluno localizado na Base Única."}
              </p>
              {lastInvite.invitationUrl && (
                <a
                  href={lastInvite.invitationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block font-black text-[#2F6B43] underline"
                >
                  Abrir convite
                </a>
              )}
              {lastInvite.whatsappUrl && (
                <a
                  href={lastInvite.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block rounded-lg bg-[#2F6B43] px-3 py-2 text-center font-black text-white"
                >
                  Enviar pelo WhatsApp
                </a>
              )}
              {lastInvite.email && (
                <p className="mt-2 text-xs">
                  E-mail:{" "}
                  {lastInvite.email.sent
                    ? "enviado"
                    : lastInvite.email.reason || "não enviado"}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#2F6B43]">
                Turma
              </p>
              <h3 className="mt-1 text-lg font-black text-[#00334E]">
                {selectedCourse?.name || "Selecione um curso"}
              </h3>
            </div>
            <span className="rounded-full bg-[#F4FBF7] px-3 py-2 text-xs font-black text-[#2F6B43]">
              {students.length} aluno(s)
            </span>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {selectedCourseId && students.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 md:col-span-2">
                Nenhum aluno convidado neste curso.
              </p>
            )}
            {students.map((student) => {
              const presences = attendance.filter(
                (item) =>
                  item.course_student_id === student.id &&
                  item.status === "presente",
              ).length;
              return (
                <article
                  key={student.id}
                  className="rounded-xl bg-white p-4 ring-1 ring-[#2F6B43]/10"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong className="text-[#00334E]">
                      {studentName(student)}
                    </strong>
                    <span className="text-xs font-black text-[#2F6B43]">
                      {student.invitation_status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {[
                      student.person?.whatsapp || student.invited_whatsapp,
                      student.person?.email || student.invited_email,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "Contato não informado"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Presenças registradas: {presences}
                  </p>
                  <a
                    href={student.invitationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-black text-[#2F6B43] underline"
                  >
                    Abrir convite
                  </a>
                </article>
              );
            })}
          </div>
        </Popup>
      )}
    </OrganizacaoClientShell>
  );
}
