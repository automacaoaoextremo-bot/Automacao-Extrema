"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoAgendamentoSignOutAction,
  filhoSupportAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { TucxaPilotReports } from "@/components/organizacao-em-harmonia/tucxa-pilot-reports";

const API_PATH = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto";
const LEGACY_BOOKING_API = "/api/organizacao-em-harmonia/filhos-corrente/agendamentos";
const UNIFIED_LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
const pageHref = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto";
const PERSONAL_REGISTRATION_HREF = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atualizar-dados";

type ViewMode = "entity_day" | "day_entity" | "both";
type ModalKind = "agendar" | "acolhimento" | "painel" | "consultar" | "encaminhamento" | "gestao" | "entidades" | "cadastros" | "configuracoes" | "ajuda" | null;
type BookingMode = "date" | "entity";
type ConsultStatus = "confirmed" | "unconfirmed" | "arrived" | "absent" | "cancelled";
const ALL_CONSULT_STATUSES: ConsultStatus[] = ["confirmed", "unconfirmed", "arrived", "absent", "cancelled"];
type DateOption = { date: string; weekday: "segunda" | "terca"; monthOccurrence: number; label: string };
type Medium = { personId: string; name: string; whatsapp: string; whatsappUrl: string };
type Entity = { id: string; name: string; slug: string; capacity: number; booked: number; available: number; isAvailable: boolean; suspendedReason: string; mediums: Medium[] };
type EntityCatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  capacity: number;
  active: boolean;
  appointmentEnabled: boolean;
  cavalinhoWhatsappEnabled: boolean;
  mondayOccurrences: number[];
  tuesdayOccurrences: number[];
  mediums: Medium[];
};
type EntityAvailableDate = { date: string; label: string; available: number; capacity: number };
type EntityOverview = { entityId: string; name: string; nextDate: string; nextLabel: string; available: number; capacity: number };
type EntityCalendarState = { entity: EntityCatalogItem; dates: EntityAvailableDate[] };

type Appointment = {
  id: string;
  personId: string;
  entityId: string;
  entityName: string;
  consulenteName: string;
  whatsapp: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  confirmationStatus: string;
  confirmationExpiresAt: string;
  order: number | null;
  arrivalStatus: string;
  arrivalOrder: number | null;
  forwardedAt: string;
  forwardedByPersonId: string;
};
type Settings = {
  confirmationCutoff: string;
  autoCancelExpiredConfirmations: boolean;
  enforceArrivalWindow: boolean;
  appointmentTime: string;
  arrivalWindow: string;
  doorClosesAt: string;
  doorReopensAt: string;
  endTime: string;
  daysAhead: number;
  smsEnabled: boolean;
  selfServiceViewMode: ViewMode;
  useDefaultEntity: boolean;
  allowDifferentEntity: boolean;
  serviceOrderMode: "booking" | "arrival";
  confirmationReminderOffsetsHours: number[];
  cavalinhoDailyWhatsappEnabled: boolean;
  cavalinhoDailyWhatsappTime: string;
  receptionDailyWhatsappEnabled: boolean;
  receptionDailyWhatsappTime: string;
  automaticDispatchWeekdays: number[];
  cavalinhoNoticeEntityIds: string[];
};
type ReceptionPreferences = { receptionSummaryChannels: string[]; receptionSummaryViewMode: ViewMode; receptionOpenAcolhimentoOnLogin: boolean };
type Payload = {
  profile: { fullName: string; canManage: boolean };
  settings: Settings;
  dates: DateOption[];
  selectedDate: string;
  entities: Entity[];
  entityCatalog: EntityCatalogItem[];
  cavalinhos: Array<{ id: string; name: string; whatsapp: string }>;
  appointments: Appointment[];
  receptionPreferences: ReceptionPreferences;
  summary: SummaryCounts;
};
type FoundPerson = { id: string; fullName: string; whatsapp: string; email: string; defaultEntityId?: string; defaultEntityName?: string; allowDifferentEntity?: boolean };
type AccessInfo = { login?: string; temporaryPassword?: string; loginUrl?: string; whatsappUrl?: string; emailSent?: boolean };
type BookingResult = {
  appointment?: { id: string; personName: string; appointmentDate: string; appointmentTime: string; entityName: string; order: number | null; confirmationDeadline: string };
  confirmation?: { url: string; whatsapp: { sent: boolean; provider: string; error?: string } };
};
type CompletedBooking = BookingResult & { whatsapp: string; contactName?: string; alternateContact?: boolean };
type SuccessNotice = { title: string; message: string };
type ErrorNotice = { title: string; message: string };
type CancelRequest = { appointmentId: string; consulenteName: string; reason: string; attachment: File | null };
type EntityChangeRequest = {
  mode: "individual" | "bulk";
  appointmentIds: string[];
  consulenteName: string;
  currentEntityId: string;
  currentEntityName: string;
  newEntityId: string;
  reason: string;
  notify: boolean;
  attachment: File | null;
};
type AlphabetPickerState = { letter: string; people: FoundPerson[] };
type SummaryMode = "date" | "future" | "period" | "before";
type SummaryCounts = {
  mode: SummaryMode;
  date: string;
  fromDate: string;
  scheduled: number;
  confirmed: number;
  unconfirmed: number;
  arrived: number;
};

type SettingsDraft = {
  serviceOrderMode: "booking" | "arrival";
  confirmationCutoff: string;
  autoCancelExpiredConfirmations: boolean;
  enforceArrivalWindow: boolean;
  reminderOffsets: string;
  summaryEmail: boolean;
  summaryWhatsapp: boolean;
  summaryViewMode: ViewMode;
  openAcolhimentoOnLogin: boolean;
  cavalinhoDailyWhatsappEnabled: boolean;
  cavalinhoDailyWhatsappTime: string;
  receptionDailyWhatsappEnabled: boolean;
  receptionDailyWhatsappTime: string;
  automaticDispatchWeekdays: number[];
  cavalinhoNoticeEntityIds: string[];
};

function shortDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });
}

function acolhimentoDateLabel(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00Z`);
  const weekday = date
    .toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long" })
    .replace("-feira", "");
  const calendarDate = date.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${weekday}-${calendarDate}`;
}

function formatDateInputPtBr(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function parseDateInputPtBr(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return value;
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

function monthYearLabel(value: string) {
  if (!value) return "";
  const label = new Date(`${value.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function todaySaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function statusLabel(item: Appointment) {
  if (item.status === "cancelado") return "Cancelado";
  if (item.arrivalStatus === "arrived") return item.arrivalOrder ? `Chegou · ordem ${item.arrivalOrder}` : "Chegou";
  if (item.arrivalStatus === "absent") return "Ausente";
  if (item.confirmationStatus === "confirmed") return "Confirmado";
  if (item.confirmationStatus === "expired") return "Prazo encerrado";
  if (item.confirmationStatus === "declined") return "Não comparecerá";
  return "Aguardando confirmação";
}

function displayWhatsapp(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function whatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

async function authToken() {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token || "";
}

export default function AgendamentoPilotoRecepcaoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [searchResults, setSearchResults] = useState<FoundPerson[]>([]);
  const [bookingMode, setBookingMode] = useState<BookingMode>("date");
  const [bookingEntityLookupId, setBookingEntityLookupId] = useState("");
  const [bookingEntityDateLabel, setBookingEntityDateLabel] = useState("");
  const [bookingContextLocked, setBookingContextLocked] = useState(false);
  const [alphabetLetters, setAlphabetLetters] = useState<string[]>([]);
  const [alphabetPicker, setAlphabetPicker] = useState<AlphabetPickerState | null>(null);
  const [alphabetLoading, setAlphabetLoading] = useState(false);
  const [foundPerson, setFoundPerson] = useState<FoundPerson | null>(null);
  const [personNotFound, setPersonNotFound] = useState(false);
  const [entityId, setEntityId] = useState("");
  const [notes, setNotes] = useState("");
  const [contactMode, setContactMode] = useState<"consulente" | "alternate">("consulente");
  const [alternateContact, setAlternateContact] = useState({ name: "", relationship: "", whatsapp: "" });
  const [alternateRelationshipOption, setAlternateRelationshipOption] = useState<"" | "Mãe" | "Filho" | "Outro">("");
  const [newPerson, setNewPerson] = useState({ fullName: "", email: "", password: "12345678", privacyAccepted: false });
  const [showNewPersonPassword, setShowNewPersonPassword] = useState(false);
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [bookingResult, setBookingResult] = useState<CompletedBooking | null>(null);
  const [successNotice, setSuccessNotice] = useState<SuccessNotice | null>(null);
  const [errorNotice, setErrorNotice] = useState<ErrorNotice | null>(null);
  const [cancelRequest, setCancelRequest] = useState<CancelRequest | null>(null);
  const [entityChangeRequest, setEntityChangeRequest] = useState<EntityChangeRequest | null>(null);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("date");
  const [summaryDate, setSummaryDate] = useState("");
  const [summaryDateTo, setSummaryDateTo] = useState("");
  const [summaryOverride, setSummaryOverride] = useState<SummaryCounts | null>(null);
  const [, setSummaryLoading] = useState(false);
  const [entityOverview, setEntityOverview] = useState<Record<string, EntityOverview>>({});
  const [entityOverviewLoading, setEntityOverviewLoading] = useState(false);
  const [entityPage, setEntityPage] = useState(1);
  const [entityCalendar, setEntityCalendar] = useState<EntityCalendarState | null>(null);
  const [consultView, setConsultView] = useState<"entity_day" | "day_entity">("entity_day");
  const [consultStatuses, setConsultStatuses] = useState<ConsultStatus[]>(ALL_CONSULT_STATUSES);
  const [consultPage, setConsultPage] = useState(1);
  const [consultSearch, setConsultSearch] = useState("");
  const [consultLetter, setConsultLetter] = useState("");
  const [showConsultStatusFilter, setShowConsultStatusFilter] = useState(false);
  const [consultDisplayMode, setConsultDisplayMode] = useState<"lista" | "caderno">("caderno");
  const [cadernoOrders, setCadernoOrders] = useState<Record<string, string>>({});
  const [openAppointmentActions, setOpenAppointmentActions] = useState<Record<string, boolean>>({});
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [showCavalinhoPicker, setShowCavalinhoPicker] = useState(false);
  const [cavalinhoPickerPage, setCavalinhoPickerPage] = useState(1);
  const [editPerson, setEditPerson] = useState({ fullName: "", whatsapp: "", email: "", defaultEntityId: "", allowDifferentEntity: false });
  const [editEntity, setEditEntity] = useState({
    entityId: "",
    name: "",
    description: "",
    capacity: "4",
    cavalinhoPersonId: "",
    mondayOccurrences: [] as number[],
    tuesdayOccurrences: [] as number[],
    active: true,
    cavalinhoWhatsappEnabled: false,
  });
  const [cadastroMode, setCadastroMode] = useState<"menu" | "consulentes" | "entidades">("menu");
  const [showCreateConsulente, setShowCreateConsulente] = useState(false);
  const [newPersonWhatsapp, setNewPersonWhatsapp] = useState("");
  const autoOpenAcolhimentoHandled = useRef(false);

  const load = useCallback(async (date?: string) => {
    setLoading(true);
    setError("");
    try {
      const token = await authToken();
      if (!token) {
        window.location.replace(`${UNIFIED_LOGIN}?returnTo=${encodeURIComponent(pageHref)}`);
        return;
      }
      const query = date ? `?date=${encodeURIComponent(date)}` : "";
      const response = await fetch(`${API_PATH}${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as Payload & { error?: string; requestId?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar o piloto.");
      setPayload(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o piloto.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentUrl = new URL(window.location.href);
      const requestedDate = currentUrl.searchParams.get("date") || undefined;
      if (currentUrl.searchParams.get("modal") === "cadastros") {
        setCadastroMode("menu");
        setModal("cadastros");
      }
      void load(requestedDate);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const open = new URL(window.location.href).searchParams.get("abrir");
      if (["agendar", "consultar", "entidades", "cadastros", "configuracoes", "acolhimento"].includes(open || "")) setModal(open as ModalKind);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!payload || autoOpenAcolhimentoHandled.current) return;
    autoOpenAcolhimentoHandled.current = true;

    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const justLoggedIn = url.searchParams.get("login") === "1";
      const explicitlyOpened = Boolean(url.searchParams.get("abrir"));

      if (justLoggedIn) {
        url.searchParams.delete("login");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }

      if (justLoggedIn && !explicitlyOpened && payload.receptionPreferences.receptionOpenAcolhimentoOnLogin) {
        setConsultPage(1);
        setOpenAppointmentActions({});
        setModal("consultar");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [payload]);

  useEffect(() => {
    if (!modal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [modal]);

  const usableEntities = useMemo(() => (payload?.entities ?? []).filter((item) => item.isAvailable && item.available > 0), [payload?.entities]);
  const activeEntityCatalog = useMemo(
    () => (payload?.entityCatalog ?? []).filter((entity) => entity.active && entity.appointmentEnabled),
    [payload?.entityCatalog],
  );
  const entityPageSize = 4;
  const entityPageCount = Math.max(1, Math.ceil(activeEntityCatalog.length / entityPageSize));
  const effectiveEntityPage = Math.min(entityPage, entityPageCount);
  const paginatedEntityCatalog = useMemo(
    () => activeEntityCatalog.slice((effectiveEntityPage - 1) * entityPageSize, effectiveEntityPage * entityPageSize),
    [activeEntityCatalog, effectiveEntityPage],
  );
  const entityCalendarMonths = useMemo(() => {
    const groups = new Map<string, EntityAvailableDate[]>();
    for (const item of entityCalendar?.dates ?? []) {
      if (!item.date || item.available < 1) continue;
      const monthKey = item.date.slice(0, 7);
      const current = groups.get(monthKey) ?? [];
      current.push(item);
      groups.set(monthKey, current);
    }
    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, dates]) => ({
        month,
        label: monthYearLabel(`${month}-01`),
        dates: [...dates].sort((left, right) => left.date.localeCompare(right.date)),
      }));
  }, [entityCalendar?.dates]);
  const effectiveSummaryDate = summaryDate || payload?.selectedDate || todaySaoPaulo();
  const displayedSummary = summaryOverride ?? payload?.summary ?? {
    mode: "date" as const,
    date: effectiveSummaryDate,
    fromDate: effectiveSummaryDate,
    scheduled: 0,
    confirmed: 0,
    unconfirmed: 0,
    arrived: 0,
  };
  const effectiveConsultView = consultView;
  const consultLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const item of payload?.appointments ?? []) {
      const first = item.consulenteName.trim().charAt(0).toLocaleUpperCase("pt-BR");
      if (first) letters.add(first);
    }
    return [...letters].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  }, [payload?.appointments]);
  const selectedStatusLabel = useMemo(() => {
    if (consultStatuses.length === ALL_CONSULT_STATUSES.length) return "todos";
    if (consultStatuses.length === 0) return "nenhum status";
    const labels: Record<ConsultStatus, string> = {
      confirmed: "Confirmados",
      unconfirmed: "Não confirmados",
      arrived: "Chegaram",
      absent: "Não chegaram",
      cancelled: "Cancelados",
    };
    return consultStatuses.map((status) => labels[status]).join(" + ");
  }, [consultStatuses]);

  function entityHeading(entityName: string) {
    const entity = payload?.entities.find((item) => item.name === entityName);
    if (!entity) return entityName;
    const cavalinho = entity.mediums?.[0]?.name?.trim();
    const title = cavalinho ? `${entity.name} (${cavalinho.split(/\s+/)[0]})` : entity.name;
    return `${title} ${entity.booked} / ${entity.capacity}`;
  }

  const filteredAppointments = useMemo(() => {
    const appointments = payload?.appointments ?? [];
    if (!consultStatuses.length) return [];
    const normalizedSearch = consultSearch.trim().toLocaleLowerCase("pt-BR");
    return appointments.filter((item) => {
      const statusBucket: ConsultStatus = item.status === "cancelado"
        ? "cancelled"
        : item.arrivalStatus === "arrived"
          ? "arrived"
          : item.arrivalStatus === "absent"
            ? "absent"
            : item.confirmationStatus === "confirmed"
              ? "confirmed"
              : "unconfirmed";
      const statusMatches = consultStatuses.includes(statusBucket);
      if (!statusMatches) return false;
      if (consultLetter && item.consulenteName.trim().charAt(0).toLocaleUpperCase("pt-BR") !== consultLetter) return false;
      if (normalizedSearch) {
        const haystack = `${item.consulenteName} ${item.whatsapp}`.toLocaleLowerCase("pt-BR");
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [consultLetter, consultSearch, consultStatuses, payload?.appointments]);
  const orderedConsultAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      if (effectiveConsultView === "day_entity") {
        const nameOrder = a.consulenteName.localeCompare(b.consulenteName, "pt-BR", { sensitivity: "base" });
        if (nameOrder !== 0) return nameOrder;
        return a.entityName.localeCompare(b.entityName, "pt-BR", { sensitivity: "base" });
      }
      const entityOrder = a.entityName.localeCompare(b.entityName, "pt-BR", { sensitivity: "base" });
      if (entityOrder !== 0) return entityOrder;
      const bookingOrder = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
      if (bookingOrder !== 0) return bookingOrder;
      return a.consulenteName.localeCompare(b.consulenteName, "pt-BR", { sensitivity: "base" });
    });
  }, [effectiveConsultView, filteredAppointments]);
  const consultPageSize = 2;
  const consultPageCount = Math.max(1, Math.ceil(orderedConsultAppointments.length / consultPageSize));
  const effectiveConsultPage = Math.min(consultPage, consultPageCount);
  const paginatedAppointments = useMemo(
    () => orderedConsultAppointments.slice((effectiveConsultPage - 1) * consultPageSize, effectiveConsultPage * consultPageSize),
    [effectiveConsultPage, orderedConsultAppointments],
  );
  const groupedAppointments = useMemo(() => {
    if (!payload) return [] as Array<{ label: string; appointments: Appointment[] }>;
    if (effectiveConsultView === "entity_day") {
      const groups = new Map<string, Appointment[]>();
      for (const appointment of paginatedAppointments) {
        const list = groups.get(appointment.entityName) ?? [];
        list.push(appointment);
        groups.set(appointment.entityName, list);
      }
      return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR")).map(([label, appointments]) => ({ label, appointments }));
    }
    return [{ label: "Consulentes", appointments: [...paginatedAppointments] }];
  }, [effectiveConsultView, paginatedAppointments, payload]);
  const searchHasPhone = phone.replace(/\D/g, "").length >= 10;

  async function postPilot(body: Record<string, unknown>) {
    const token = await authToken();
    if (!token) throw new Error("Sessão expirada. Entre novamente.");
    const response = await fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string; requestId?: string };
    if (!response.ok) throw new Error(`${data.error || "Não foi possível concluir a ação."}${data.requestId ? ` Código: ${data.requestId}` : ""}`);
    return data;
  }

  async function postLegacy(body: Record<string, unknown>) {
    const token = await authToken();
    if (!token) throw new Error("Sessão expirada. Entre novamente.");
    const response = await fetch(LEGACY_BOOKING_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string; requestId?: string };
    if (!response.ok) throw new Error(`${data.error || "Não foi possível concluir a ação."}${data.requestId ? ` Código: ${data.requestId}` : ""}`);
    return data;
  }

  async function refreshSummary(mode: SummaryMode, date = effectiveSummaryDate, dateTo = summaryDateTo) {
    setSummaryLoading(true);
    try {
      const result = await postPilot({ action: "summary", mode, date, dateTo });
      const summary = result.summary && typeof result.summary === "object" ? result.summary as SummaryCounts : null;
      if (!summary) throw new Error("Resumo não retornado pelo servidor.");
      setSummaryMode(mode);
      if (mode === "date" || mode === "period") setSummaryDate(summary.date || date);
      if (mode === "period" || mode === "before") setSummaryDateTo(dateTo);
      setSummaryOverride(summary);
    } catch (summaryError) {
      setErrorNotice({ title: "Não foi possível atualizar os indicadores", message: summaryError instanceof Error ? summaryError.message : "Tente novamente em instantes." });
    } finally { setSummaryLoading(false); }
  }

  function clearPersonSearch() {
    setFoundPerson(null);
    setSearchResults([]);
    setPersonNotFound(false);
    setAccessInfo(null);
    setEditPerson({ fullName: "", whatsapp: "", email: "", defaultEntityId: "", allowDifferentEntity: false });
    setNewPerson({ fullName: "", email: "", password: "12345678", privacyAccepted: false });
    setNewPersonWhatsapp("");
    setShowCreateConsulente(false);
    setShowNewPersonPassword(false);
  }

  function resetBookingForm() {
    setPhone("");
    setSearchResults([]);
    setFoundPerson(null);
    setPersonNotFound(false);
    setEntityId("");
    setNotes("");
    setContactMode("consulente");
    setAlternateContact({ name: "", relationship: "", whatsapp: "" });
    setAlternateRelationshipOption("");
    setNewPerson({ fullName: "", email: "", password: "12345678", privacyAccepted: false });
    setShowNewPersonPassword(false);
    setAccessInfo(null);
    setBookingMode("date");
    setBookingEntityLookupId("");
    setBookingEntityDateLabel("");
    setBookingContextLocked(false);
    setAlphabetPicker(null);
  }

  function openBookingModal() {
    resetBookingForm();
    setBookingResult(null);
    setError("");
    setModal("agendar");
    void loadConsulenteAlphabet();
  }

  async function loadEntityOverview() {
    setEntityOverviewLoading(true);
    setError("");
    try {
      const result = await postPilot({ action: "entity-overview" });
      const items = Array.isArray(result.entities)
        ? result.entities.filter((item): item is EntityOverview => Boolean(item && typeof item === "object"))
        : [];
      setEntityOverview(Object.fromEntries(items.map((item) => [item.entityId, item])));
    } catch (overviewError) {
      setError(overviewError instanceof Error ? overviewError.message : "Não foi possível carregar a disponibilidade das Entidades.");
    } finally {
      setEntityOverviewLoading(false);
    }
  }

  function openEntitiesModal() {
    setEntityPage(1);
    setModal("entidades");
    setEntityOverview({});
    void loadEntityOverview();
  }

  function openEntityCadastro(entityId: string) {
    selectEntityForEdit(entityId);
    setCadastroMode("entidades");
    setModal("cadastros");
  }

  async function openEntityBookingCalendar(entity: EntityCatalogItem) {
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({ action: "entity-available-dates", entityId: entity.id });
      const dates = Array.isArray(result.dates)
        ? result.dates.filter((item): item is EntityAvailableDate => Boolean(item && typeof item === "object" && typeof (item as EntityAvailableDate).date === "string"))
        : [];
      if (!dates.length) {
        throw new Error("Não há datas futuras com vagas para esta Entidade no período disponível.");
      }
      setEntityCalendar({ entity, dates });
    } catch (calendarError) {
      setError(calendarError instanceof Error ? calendarError.message : "Não foi possível carregar o calendário da Entidade.");
    } finally {
      setSaving(false);
    }
  }

  async function chooseEntityCalendarDate(date: string) {
    const entity = entityCalendar?.entity;
    if (!entity) return;
    setEntityCalendar(null);
    resetBookingForm();
    setBookingMode("entity");
    setBookingContextLocked(true);
    setBookingEntityLookupId(entity.id);
    setBookingEntityDateLabel(shortDate(date));
    setModal("agendar");
    void loadConsulenteAlphabet();
    await load(date);
    setEntityId(entity.id);
  }

  async function selectPerson(person: FoundPerson) {
    setSaving(true);
    setError("");
    setSearchResults([]);

    try {
      const details = await postPilot({ action: "get-consulente", personId: person.id });
      const detailedPerson = details.person && typeof details.person === "object"
        ? details.person as FoundPerson
        : person;

      const defaultEntityId = detailedPerson.defaultEntityId || "";
      const defaultEntityName = detailedPerson.defaultEntityName
        || payload?.entityCatalog.find((entity) => entity.id === defaultEntityId)?.name
        || "a Entidade padrão cadastrada";
      const allowDifferentEntity = detailedPerson.allowDifferentEntity === true;

      if (modal === "agendar" && defaultEntityId && !allowDifferentEntity) {
        const defaultEntityAvailable = usableEntities.some((entity) => entity.id === defaultEntityId);

        if (!defaultEntityAvailable) {
          setFoundPerson(null);
          setEntityId("");
          setErrorNotice({
            title: "Consulente indisponível para esta data",
            message: `${detailedPerson.fullName || person.fullName} possui ${defaultEntityName} como Entidade padrão e não está autorizado(a) a escolher outra Entidade. ${defaultEntityName} não atende ou não possui vaga na data selecionada.`,
          });
          return;
        }

        if ((bookingContextLocked || bookingMode === "entity") && entityId && entityId !== defaultEntityId) {
          setFoundPerson(null);
          setErrorNotice({
            title: "Entidade padrão diferente",
            message: `${detailedPerson.fullName || person.fullName} possui ${defaultEntityName} como Entidade padrão e não está autorizado(a) a escolher outra Entidade para este agendamento.`,
          });
          return;
        }
      }

      setFoundPerson(detailedPerson);
      const selectedWhatsapp = detailedPerson.whatsapp || person.whatsapp || "";
      setContactMode(selectedWhatsapp.replace(/\D/g, "").length >= 10 ? "consulente" : "alternate");
      setAlternateContact({ name: "", relationship: "", whatsapp: "" });
    setAlternateRelationshipOption("");
      setEditPerson({
        fullName: detailedPerson.fullName || person.fullName,
        whatsapp: detailedPerson.whatsapp || person.whatsapp,
        email: detailedPerson.email || person.email,
        defaultEntityId,
        allowDifferentEntity,
      });

      if (modal === "agendar" && bookingMode === "date" && !bookingContextLocked) {
        const defaultEntityAvailable = defaultEntityId
          ? usableEntities.some((entity) => entity.id === defaultEntityId)
          : false;
        setEntityId(defaultEntityAvailable ? defaultEntityId : "");
      }
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Não foi possível selecionar o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  async function selectBookingEntity(value: string) {
    setBookingEntityLookupId(value);
    setEntityId("");
    setBookingEntityDateLabel("");
    if (!value) return;
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({ action: "next-available-date", entityId: value });
      const date = typeof result.date === "string" ? result.date : "";
      const label = typeof result.label === "string" ? result.label : "";
      if (!date) throw new Error("Não encontramos uma próxima data com vaga para esta Entidade.");
      setBookingEntityDateLabel(label || shortDate(date));
      await load(date);
      setEntityId(value);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Não foi possível localizar a próxima data com vaga.");
    } finally {
      setSaving(false);
    }
  }

  async function loadConsulenteAlphabet(letter = "") {
    setAlphabetLoading(true);
    try {
      const result = await postPilot({ action: "consulente-alphabet", letter, appointmentDate: payload?.selectedDate || "" });
      const letters = Array.isArray(result.letters)
        ? result.letters.filter((item): item is string => typeof item === "string" && /^[A-Z]$/.test(item))
        : [];
      setAlphabetLetters(letters);

      if (letter) {
        const people = Array.isArray(result.people)
          ? result.people.filter((item): item is FoundPerson => Boolean(item && typeof item === "object"))
          : [];
        setAlphabetPicker({ letter, people });
      }
    } catch (alphabetError) {
      setErrorNotice({
        title: "Não foi possível abrir a lista alfabética",
        message: alphabetError instanceof Error ? alphabetError.message : "Tente novamente em instantes.",
      });
    } finally {
      setAlphabetLoading(false);
    }
  }

  async function selectAlphabetPerson(person: FoundPerson) {
    setAlphabetPicker(null);
    setPhone(person.fullName);
    await selectPerson(person);
  }

  async function searchPerson(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    clearPersonSearch();
    try {
      const result = await postLegacy({ action: "search-consulente", query: phone, whatsapp: phone });
      const people = Array.isArray(result.people) ? result.people.filter((item): item is FoundPerson => Boolean(item && typeof item === "object")) : [];
      if (people.length > 1) {
        setSearchResults(people);
        return;
      }
      const selected = people[0] ?? (result.found === true && result.person && typeof result.person === "object" ? result.person as FoundPerson : null);
      if (selected) {
        await selectPerson(selected);
      } else {
        setPersonNotFound(true);
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Não foi possível pesquisar.");
    } finally {
      setSaving(false);
    }
  }

  function registrationDateInSaoPaulo() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  async function createPerson(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await postLegacy({
        action: "create-consulente",
        fullName: newPerson.fullName || (!searchHasPhone ? phone : ""),
        whatsapp: searchHasPhone ? (newPersonWhatsapp || phone) : newPersonWhatsapp,
        birthDate: registrationDateInSaoPaulo(),
        email: newPerson.email,
        password: newPersonWhatsapp || phone ? newPerson.password : "",
        privacyAccepted: newPerson.privacyAccepted,
      });
      if (!result.person || typeof result.person !== "object") throw new Error("Cadastro criado sem identificação da pessoa.");
      const person = result.person as FoundPerson;
      setFoundPerson(person);
      setEditPerson({ fullName: person.fullName, whatsapp: person.whatsapp, email: person.email, defaultEntityId: "", allowDifferentEntity: false });
      setAccessInfo(result.access && typeof result.access === "object" ? result.access as AccessInfo : null);
      setPersonNotFound(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Não foi possível criar o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  async function book() {
    if (!payload || !foundPerson || !entityId) {
      setError("");
      setErrorNotice({
        title: "Não foi possível criar o agendamento",
        message: "Escolha a Entidade e confirme a pessoa antes de agendar.",
      });
      return;
    }
    setSaving(true);
    setError("");
    setErrorNotice(null);
    try {
      const bookingWhatsapp = foundPerson.whatsapp;
      const result = await postPilot({
        action: "book",
        targetPersonId: foundPerson.id,
        entityId,
        appointmentDate: payload.selectedDate,
        notes,
        contactMode,
        contactName: contactMode === "alternate" ? alternateContact.name : "",
        contactRelationship: contactMode === "alternate" ? alternateContact.relationship : "",
        contactWhatsapp: "",
      }) as BookingResult;
      const selectedDate = payload.selectedDate;
      await load(selectedDate);
      await refreshSummary(summaryMode, summaryMode === "date" ? effectiveSummaryDate : selectedDate);
      setBookingResult({ ...result, whatsapp: bookingWhatsapp, contactName: foundPerson.fullName, alternateContact: contactMode === "alternate" });
      resetBookingForm();
      setModal(null);
    } catch (bookError) {
      setError("");
      setErrorNotice({
        title: "Não foi possível criar o agendamento",
        message: bookError instanceof Error ? bookError.message : "Não foi possível criar o agendamento.",
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleConsultStatus(status: ConsultStatus) {
    setConsultStatuses((current) => (
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status]
    ));
    setConsultPage(1);
    setOpenAppointmentActions({});
  }

  async function appointmentAction(action: "confirm-manual", appointmentId: string) {
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({ action, appointmentId });
      setMessage(typeof result.message === "string" ? result.message : "Atualização concluída.");
      await load(payload?.selectedDate);
      await refreshSummary(summaryMode, summaryMode === "date" ? effectiveSummaryDate : payload?.selectedDate);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar o agendamento.");
    } finally {
      setSaving(false);
    }
  }

  function openCancelAppointment(appointment: Appointment) {
    setCancelRequest({
      appointmentId: appointment.id,
      consulenteName: appointment.consulenteName,
      reason: "",
      attachment: null,
    });
  }

  async function fileToBase64(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = typeof reader.result === "string" ? reader.result : "";
        resolve(value.includes(",") ? value.split(",", 2)[1] : value);
      };
      reader.onerror = () => reject(new Error("Não foi possível ler o anexo."));
      reader.readAsDataURL(file);
    });
  }

  async function submitCancellation(event: FormEvent) {
    event.preventDefault();
    if (!cancelRequest) return;

    const reason = cancelRequest.reason.trim();
    if (!reason) {
      setErrorNotice({
        title: "Informe o motivo do cancelamento",
        message: "O motivo é obrigatório para cancelar um agendamento e preservar o histórico da Recepção.",
      });
      return;
    }

    setSaving(true);
    setError("");
    try {
      const attachment = cancelRequest.attachment;
      if (attachment && attachment.size > 5 * 1024 * 1024) {
        throw new Error("O anexo deve ter no máximo 5 MB.");
      }
      if (attachment && !(attachment.type.startsWith("image/") || attachment.type === "application/pdf")) {
        throw new Error("O anexo deve ser uma imagem ou arquivo PDF.");
      }
      const result = await postPilot({
        action: "cancel",
        appointmentId: cancelRequest.appointmentId,
        reason,
        attachmentName: attachment?.name || "",
        attachmentType: attachment?.type || "",
        attachmentBase64: attachment ? await fileToBase64(attachment) : "",
      });
      const successMessage = typeof result.message === "string"
        ? result.message
        : "Agendamento cancelado e vaga liberada.";
      setCancelRequest(null);
      setOpenAppointmentActions({});
      setMessage("");
      setSuccessNotice({ title: "Agendamento cancelado", message: successMessage });
      await load(payload?.selectedDate);
      await refreshSummary(summaryMode, summaryMode === "date" ? effectiveSummaryDate : payload?.selectedDate);
    } catch (actionError) {
      setErrorNotice({
        title: "Não foi possível cancelar o agendamento",
        message: actionError instanceof Error ? actionError.message : "Não foi possível cancelar o agendamento.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function markArrival(appointmentId: string, arrivalStatus: "arrived" | "absent" | "pending") {
    setSaving(true);
    setError("");
    setErrorNotice(null);
    try {
      const result = await postPilot({ action: "mark-arrival", appointmentId, arrivalStatus });
      const successMessage = typeof result.message === "string" ? result.message : "Chegada atualizada.";
      setMessage("");
      setOpenAppointmentActions({});
      setSuccessNotice({
        title: arrivalStatus === "arrived" ? "Chegada registrada" : arrivalStatus === "absent" ? "Ausência registrada" : "Situação de chegada atualizada",
        message: successMessage,
      });
      await load(payload?.selectedDate);
      await refreshSummary(summaryMode, summaryMode === "date" ? effectiveSummaryDate : payload?.selectedDate);
    } catch (actionError) {
      setMessage("");
      setErrorNotice({
        title: arrivalStatus === "arrived" ? "Não foi possível registrar a chegada" : "Não foi possível atualizar a chegada",
        message: actionError instanceof Error ? actionError.message : "Não foi possível registrar a chegada.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveCadernoArrival(appointmentId: string) {
    const raw = (cadernoOrders[appointmentId] ?? "").trim();
    const arrivalOrder = Number(raw);
    if (!Number.isInteger(arrivalOrder) || arrivalOrder < 1) {
      setErrorNotice({ title: "Ordem inválida", message: "Informe um número inteiro maior que zero." });
      return;
    }
    setSaving(true);
    try {
      const result = await postPilot({ action: "set-caderno-arrival", appointmentId, arrivalOrder });
      setSuccessNotice({ title: "Chegada registrada", message: typeof result.message === "string" ? result.message : "Chegada registrada." });
      await load(payload?.selectedDate);
    } catch (actionError) {
      setErrorNotice({ title: "Não foi possível salvar a ordem", message: actionError instanceof Error ? actionError.message : "Não foi possível registrar a chegada." });
    } finally {
      setSaving(false);
    }
  }

  async function markForwarded(appointmentId: string, forwarded: boolean) {
    setSaving(true);
    try {
      const result = await postPilot({ action: "mark-forwarded", appointmentId, forwarded });
      setSuccessNotice({ title: forwarded ? "Encaminhamento registrado" : "Encaminhamento desfeito", message: typeof result.message === "string" ? result.message : "Situação atualizada." });
      await load(payload?.selectedDate);
    } catch (actionError) {
      setErrorNotice({ title: "Não foi possível atualizar o encaminhamento", message: actionError instanceof Error ? actionError.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  function openIndividualEntityChange(appointment: Appointment) {
    setEntityChangeRequest({
      mode: "individual",
      appointmentIds: [appointment.id],
      consulenteName: appointment.consulenteName,
      currentEntityId: appointment.entityId,
      currentEntityName: appointment.entityName,
      newEntityId: "",
      reason: "",
      notify: true,
      attachment: null,
    });
  }

  function openBulkEntityChange(entity: Entity) {
    const active = (payload?.appointments ?? []).filter(
      (item) => item.entityId === entity.id && item.status !== "cancelado",
    );
    if (!active.length) return;
    setEntityChangeRequest({
      mode: "bulk",
      appointmentIds: active.map((item) => item.id),
      consulenteName: `${active.length} agendamento(s)`,
      currentEntityId: entity.id,
      currentEntityName: entity.name,
      newEntityId: "",
      reason: "",
      notify: true,
      attachment: null,
    });
  }

  async function submitEntityChange(event: FormEvent) {
    event.preventDefault();
    if (!entityChangeRequest) return;
    const reason = entityChangeRequest.reason.trim();
    if (!entityChangeRequest.newEntityId) {
      setErrorNotice({ title: "Escolha a nova Entidade", message: "Selecione a Entidade de destino antes de confirmar a troca." });
      return;
    }
    if (!reason) {
      setErrorNotice({ title: "Informe o motivo", message: "O motivo da troca é obrigatório e ficará registrado no histórico." });
      return;
    }

    setSaving(true);
    setError("");
    try {
      const attachment = entityChangeRequest.attachment;
      if (attachment && attachment.size > 5 * 1024 * 1024) throw new Error("O anexo deve ter no máximo 5 MB.");
      if (attachment && !(attachment.type.startsWith("image/") || attachment.type === "application/pdf")) {
        throw new Error("O anexo deve ser uma imagem ou arquivo PDF.");
      }
      const result = await postPilot({
        action: entityChangeRequest.mode === "bulk" ? "change-entity-bulk" : "change-entity",
        appointmentId: entityChangeRequest.appointmentIds[0],
        appointmentIds: entityChangeRequest.appointmentIds,
        sourceEntityId: entityChangeRequest.currentEntityId,
        appointmentDate: payload?.selectedDate ?? "",
        entityId: entityChangeRequest.newEntityId,
        reason,
        notify: entityChangeRequest.notify,
        attachmentName: attachment?.name || "",
        attachmentType: attachment?.type || "",
        attachmentBase64: attachment ? await fileToBase64(attachment) : "",
      });
      const failures = Array.isArray(result.notificationFailures) ? result.notificationFailures as string[] : [];
      const baseMessage = typeof result.message === "string" ? result.message : "Entidade atualizada.";
      const message = failures.length
        ? `${baseMessage} Atenção: ${failures.length} aviso(s) não foram enviados.`
        : baseMessage;
      setEntityChangeRequest(null);
      setOpenAppointmentActions({});
      setSuccessNotice({ title: entityChangeRequest.mode === "bulk" ? "Troca em massa concluída" : "Entidade alterada", message });
      await load(payload?.selectedDate);
      await refreshSummary(summaryMode, summaryMode === "date" ? effectiveSummaryDate : payload?.selectedDate);
    } catch (actionError) {
      setErrorNotice({
        title: "Não foi possível trocar a Entidade",
        message: actionError instanceof Error ? actionError.message : "Não foi possível trocar a Entidade.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function sendConfirmationReminder(appointment: Appointment) {
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({ action: "send-confirmation-reminder", appointmentId: appointment.id });
      setSuccessNotice({ title: "Lembrete enviado", message: typeof result.message === "string" ? result.message : `Lembrete enviado para ${appointment.consulenteName}.` });
      await load(payload?.selectedDate);
    } catch (actionError) {
      setErrorNotice({ title: "Não foi possível enviar o lembrete", message: actionError instanceof Error ? actionError.message : "Tente novamente em instantes." });
    } finally {
      setSaving(false);
    }
  }

  function openSettings() {
    if (!payload) return;
    setSettingsDraft({
      serviceOrderMode: payload.settings.serviceOrderMode,
      confirmationCutoff: payload.settings.confirmationCutoff,
      autoCancelExpiredConfirmations: payload.settings.autoCancelExpiredConfirmations,
      enforceArrivalWindow: payload.settings.enforceArrivalWindow,
      reminderOffsets: payload.settings.confirmationReminderOffsetsHours.join(", "),
      summaryEmail: payload.receptionPreferences.receptionSummaryChannels.includes("email"),
      summaryWhatsapp: payload.receptionPreferences.receptionSummaryChannels.includes("whatsapp"),
      summaryViewMode: payload.receptionPreferences.receptionSummaryViewMode,
      openAcolhimentoOnLogin: payload.receptionPreferences.receptionOpenAcolhimentoOnLogin,
      cavalinhoDailyWhatsappEnabled: payload.settings.cavalinhoDailyWhatsappEnabled,
      cavalinhoDailyWhatsappTime: payload.settings.cavalinhoDailyWhatsappTime,
      receptionDailyWhatsappEnabled: payload.settings.receptionDailyWhatsappEnabled,
      receptionDailyWhatsappTime: payload.settings.receptionDailyWhatsappTime,
      automaticDispatchWeekdays: payload.settings.automaticDispatchWeekdays,
      cavalinhoNoticeEntityIds: payload.entityCatalog.filter((entity) => entity.cavalinhoWhatsappEnabled).map((entity) => entity.id),
    });
    setSettingsSection(null);
    setModal("configuracoes");
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!settingsDraft) return;
    if (settingsDraft.cavalinhoDailyWhatsappEnabled && settingsDraft.cavalinhoNoticeEntityIds.length === 0) {
      setErrorNotice({ title: "Selecione uma Entidade/Cavalinho", message: "Para ativar o envio aos Cavalinhos, selecione pelo menos uma Entidade/Cavalinho." });
      return;
    }
    setSaving(true);
    setError("");
    try {
      await postPilot({
        action: "save-settings",
        serviceOrderMode: settingsDraft.serviceOrderMode,
        confirmationCutoff: settingsDraft.confirmationCutoff,
        autoCancelExpiredConfirmations: settingsDraft.autoCancelExpiredConfirmations,
        enforceArrivalWindow: settingsDraft.enforceArrivalWindow,
        confirmationReminderOffsetsHours: settingsDraft.reminderOffsets,
        cavalinhoDailyWhatsappEnabled: settingsDraft.cavalinhoDailyWhatsappEnabled,
        cavalinhoDailyWhatsappTime: settingsDraft.cavalinhoDailyWhatsappTime,
        receptionDailyWhatsappEnabled: settingsDraft.receptionDailyWhatsappEnabled,
        receptionDailyWhatsappTime: settingsDraft.receptionDailyWhatsappTime,
        automaticDispatchWeekdays: settingsDraft.automaticDispatchWeekdays,
        cavalinhoNoticeEntityIds: settingsDraft.cavalinhoNoticeEntityIds,
      });
      await postPilot({
        action: "save-reception-preferences",
        channels: [settingsDraft.summaryEmail ? "email" : "", settingsDraft.summaryWhatsapp ? "whatsapp" : ""].filter(Boolean),
        viewMode: settingsDraft.summaryViewMode,
        openAcolhimentoOnLogin: settingsDraft.openAcolhimentoOnLogin,
      });
      setMessage("");
      await load(payload?.selectedDate);
      setSettingsSection(null);
      setSuccessNotice({
        title: "Configurações salvas",
        message: "Configurações do piloto atualizadas com sucesso.",
      });
    } catch (saveError) {
      setError("");
      setErrorNotice({ title: "Não foi possível salvar as configurações", message: saveError instanceof Error ? saveError.message : "Não foi possível salvar as configurações." });
    } finally {
      setSaving(false);
    }
  }

  async function updateConsulente(event: FormEvent) {
    event.preventDefault();
    if (!foundPerson) return;
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({ action: "update-consulente", personId: foundPerson.id, ...editPerson });
      const successMessage = typeof result.message === "string" ? result.message : "Cadastro de Consulente atualizado com sucesso.";
      setMessage("");
      setFoundPerson({ id: foundPerson.id, fullName: editPerson.fullName, whatsapp: editPerson.whatsapp, email: editPerson.email });
      setModal(null);
      setCadastroMode("menu");
      setSuccessNotice({ title: "Cadastro de Consulente salvo", message: successMessage });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível atualizar o Consulente.");
    } finally {
      setSaving(false);
    }
  }

  function selectEntityForEdit(value: string) {
    const entity = payload?.entityCatalog.find((item) => item.id === value);
    setEditEntity({
      entityId: value,
      name: entity?.name || "",
      description: entity?.description || "",
      capacity: String(entity?.capacity ?? 4),
      cavalinhoPersonId: entity?.mediums[0]?.personId || "",
      mondayOccurrences: entity?.mondayOccurrences ?? [],
      tuesdayOccurrences: entity?.tuesdayOccurrences ?? [],
      active: entity?.active !== false,
      cavalinhoWhatsappEnabled: entity?.cavalinhoWhatsappEnabled === true,
    });
  }

  function toggleEntityOccurrence(day: "mondayOccurrences" | "tuesdayOccurrences", occurrence: number) {
    setEditEntity((current) => {
      const values = current[day];
      return {
        ...current,
        [day]: values.includes(occurrence)
          ? values.filter((item) => item !== occurrence)
          : [...values, occurrence].sort((a, b) => a - b),
      };
    });
  }

  async function saveEntity(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({
        action: "save-entity",
        entityId: editEntity.entityId,
        name: editEntity.name,
        description: editEntity.description,
        cavalinhoPersonId: editEntity.cavalinhoPersonId,
        capacity: Number(editEntity.capacity),
        mondayOccurrences: editEntity.mondayOccurrences,
        tuesdayOccurrences: editEntity.tuesdayOccurrences,
        active: editEntity.active,
        cavalinhoWhatsappEnabled: editEntity.cavalinhoWhatsappEnabled,
      });
      const successMessage = typeof result.message === "string" ? result.message : "Cadastro e calendário da Entidade atualizados com sucesso.";
      setMessage("");
      setEditEntity({ entityId: "", name: "", description: "", capacity: "4", cavalinhoPersonId: "", mondayOccurrences: [], tuesdayOccurrences: [], active: true, cavalinhoWhatsappEnabled: false });
      await load(payload?.selectedDate);
      setModal("cadastros");
      setCadastroMode("entidades");
      setSuccessNotice({ title: "Cadastro de Entidade salvo", message: successMessage });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar a Entidade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Agendamento · Recepção"
        showSupport={false}
        actions={[filhoAgendamentoSignOutAction, filhoSupportAction]}
        mobileActionColumns={2}
        compactMobileActions
        autoHighlightCurrent={false}
      />

      <section className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-[1.8rem] bg-[#123D2C] p-4 text-white shadow-xl sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs">Recepção</p>
          <h1 className="mt-1 text-2xl font-black sm:text-4xl">
            Olá, {payload?.profile.fullName?.trim().split(/\s+/)[0] || "Recepção"}, aqui você agenda, confirma e organiza os atendimentos do Tucxa.
          </h1>
        </section>

        {loading && <p className="mt-3 rounded-2xl bg-white p-4 font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando...</p>}
        {error && <p className="mt-3 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
        {message && <p className="mt-3 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

        {payload && (
          <>
            <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <ActionButton title="Como funciona" subtitle="Resumo do fluxo de atendimentos" onClick={() => setModal("ajuda")} />
              <ActionButton title="Configurações" subtitle="Ordem, lembretes e resumos" onClick={openSettings} />
              <ActionButton title="Cadastros" subtitle="Consulentes, Entidades e dados pessoais" onClick={() => { setCadastroMode("menu"); setModal("cadastros"); }} />
              <ActionButton title="Entidades" subtitle="Próximas datas, cadastro e agendamento" onClick={openEntitiesModal} />
              <ActionButton title="Agendar" subtitle="Localizar ou cadastrar Consulente" onClick={openBookingModal} />
              <ActionButton title="Acolhimento" subtitle="Painel, Triagem e Gestão" onClick={() => setModal("acolhimento")} />
            </section>
          </>
        )}
      </section>

      {modal && payload && (
        <Modal
          title={modal === "cadastros" && cadastroMode === "entidades" ? "Cadastros · Entidades" : modal === "cadastros" && cadastroMode === "consulentes" ? "Cadastros · Consulentes" : modalTitle(modal)}
          onClose={() => {
            if (modal === "configuracoes" && settingsSection) {
              setSettingsSection(null);
              return;
            }
            if (modal === "cadastros" && cadastroMode !== "menu") {
              clearPersonSearch();
              setPhone("");
              setCadastroMode("menu");
              return;
            }
            if (["painel", "consultar", "encaminhamento", "gestao"].includes(modal)) {
              setModal("acolhimento");
              return;
            }
            if (modal === "agendar") resetBookingForm();
            setModal(null);
          }}
        >
          {modal === "acolhimento" && (
            <div className="grid gap-3">
              <button type="button" onClick={() => setModal("painel")} className="rounded-2xl bg-[#E9F2E7] p-4 text-left ring-1 ring-[#123D2C]/10">
                <span className="block text-lg font-black text-[#123D2C]">Painel</span><span className="text-sm font-semibold text-slate-600">Indicadores dos atendimentos e acesso à Triagem.</span>
              </button>
              <button type="button" onClick={() => { setConsultPage(1); setOpenAppointmentActions({}); setModal("consultar"); }} className="rounded-2xl bg-white p-4 text-left ring-1 ring-[#123D2C]/10">
                <span className="block text-lg font-black text-[#123D2C]">Triagem</span><span className="text-sm font-semibold text-slate-600">Consultar agendamentos e registrar chegada, ausência e demais ações do atendimento.</span>
              </button>
              <button type="button" onClick={() => setModal("encaminhamento")} className="rounded-2xl bg-white p-4 text-left ring-1 ring-[#123D2C]/10">
                <span className="block text-lg font-black text-[#123D2C]">Encaminhamento</span><span className="text-sm font-semibold text-slate-600">Controlar quem já foi encaminhado da Recepção para o atendimento da Entidade.</span>
              </button>
              <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto/gestao?from=acolhimento" className="rounded-2xl bg-white p-4 text-left ring-1 ring-[#123D2C]/10">
                <span className="block text-lg font-black text-[#123D2C]">Gestão</span><span className="text-sm font-semibold text-slate-600">Relatórios de Atendimentos, Consulentes e Entidades/Cavalinhos.</span>
              </Link>
            </div>
          )}

          {modal === "gestao" && (
            <TucxaPilotReports />
          )}

          {modal === "painel" && (
            <div className="grid gap-3">
              <section className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">Período dos indicadores
                  <select value={summaryMode} onChange={(event) => setSummaryMode(event.target.value as SummaryMode)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                    <option value="date">Data específica</option><option value="future">Todos a partir da data atual</option><option value="period">Período específico</option><option value="before">Somente anteriores à data específica</option>
                  </select>
                </label>
                {(summaryMode === "date" || summaryMode === "period") && <label className="grid gap-1 text-sm font-black text-[#123D2C]">{summaryMode === "period" ? "Data inicial" : "Data"}<div className="grid grid-cols-[1fr_auto] gap-2"><input value={summaryDate ? formatDateInputPtBr(summaryDate) : ""} onChange={(event) => setSummaryDate(parseDateInputPtBr(event.target.value))} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10} className="min-w-0 rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold" /><input type="date" value={summaryDate || effectiveSummaryDate} onChange={(event) => setSummaryDate(event.target.value)} aria-label="Escolher data inicial no calendário" className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold" /></div></label>}
                {(summaryMode === "period" || summaryMode === "before") && <label className="grid gap-1 text-sm font-black text-[#123D2C]">{summaryMode === "period" ? "Data final" : "Anteriores a"}<div className="grid grid-cols-[1fr_auto] gap-2"><input value={summaryDateTo ? formatDateInputPtBr(summaryDateTo) : ""} onChange={(event) => setSummaryDateTo(parseDateInputPtBr(event.target.value))} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10} className="min-w-0 rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold" /><input type="date" value={summaryDateTo} onChange={(event) => setSummaryDateTo(event.target.value)} aria-label="Escolher data final no calendário" className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold" /></div></label>}
                <button type="button" onClick={() => void refreshSummary(summaryMode, summaryDate || payload.selectedDate, summaryDateTo)} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white">Atualizar indicadores</button>
              </section>
              <p className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-center text-xs font-black text-[#123D2C]">Indicadores considerando: {summaryMode === "date" ? formatDateInputPtBr(displayedSummary.date || effectiveSummaryDate) : summaryMode === "future" ? `a partir de ${formatDateInputPtBr(displayedSummary.fromDate)}` : summaryMode === "period" ? `${formatDateInputPtBr(displayedSummary.date)} a ${formatDateInputPtBr(summaryDateTo)}` : `anteriores a ${formatDateInputPtBr(summaryDateTo)}`}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Summary label="Agendados" value={displayedSummary.scheduled} onClick={() => { setConsultStatuses(["confirmed", "unconfirmed", "arrived", "absent"]); setConsultDisplayMode("caderno"); setConsultPage(1); setModal("consultar"); }} />
                <Summary label="Confirmados" value={displayedSummary.confirmed} onClick={() => { setConsultStatuses(["confirmed"]); setConsultDisplayMode("caderno"); setConsultPage(1); setModal("consultar"); }} />
                <Summary label="Não Confirmados" value={displayedSummary.unconfirmed} onClick={() => { setConsultStatuses(["unconfirmed"]); setConsultDisplayMode("lista"); setConsultPage(1); setModal("consultar"); }} />
                <Summary label="Chegaram" value={displayedSummary.arrived} onClick={() => { setConsultStatuses(["arrived"]); setConsultDisplayMode("caderno"); setConsultPage(1); setModal("consultar"); }} />
              </div>
              <button type="button" onClick={() => setModal("consultar")} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white">Abrir Triagem</button>
            </div>
          )}

          {modal === "agendar" && (
            <div className="grid gap-3">
              {!bookingContextLocked && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F7FAF2] p-1.5 ring-1 ring-[#123D2C]/10">
                  <button type="button" onClick={() => { setBookingMode("date"); setBookingEntityLookupId(""); setBookingEntityDateLabel(""); setEntityId(""); }} className={`rounded-xl px-3 py-2 text-sm font-black ${bookingMode === "date" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>Por data</button>
                  <button type="button" onClick={() => { setBookingMode("entity"); setEntityId(""); }} className={`rounded-xl px-3 py-2 text-sm font-black ${bookingMode === "entity" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>Por Entidade</button>
                </div>
              )}

              {bookingContextLocked ? (
                <section className="grid gap-1 rounded-2xl bg-[#E9F2E7] p-3 text-sm text-[#123D2C] ring-1 ring-[#123D2C]/10">
                  <p><span className="font-black">Entidade:</span> {payload.entityCatalog.find((entity) => entity.id === entityId)?.name || "Entidade selecionada"}</p>
                  <p><span className="font-black">Data:</span> {bookingEntityDateLabel || shortDate(payload.selectedDate)}</p>
                </section>
              ) : bookingMode === "date" ? (
                <label className="grid gap-1 text-sm font-black text-[#123D2C]">Data
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select value={payload.selectedDate} onChange={(event) => { setEntityId(""); void load(event.target.value); }} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                      {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
                    </select>
                    <input type="date" value={payload.selectedDate} min={payload.dates[0]?.date} max={payload.dates.at(-1)?.date} onChange={(event) => { if (event.target.value) { setEntityId(""); void load(event.target.value); } }} aria-label="Escolher data pelo calendário" className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold" />
                  </div>
                </label>
              ) : (
                <div className="grid gap-2">
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">Entidade
                    <select value={bookingEntityLookupId} onChange={(event) => void selectBookingEntity(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                      <option value="">Escolha uma Entidade</option>
                      {payload.entityCatalog.filter((entity) => entity.active && entity.appointmentEnabled).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                    </select>
                  </label>
                  {bookingEntityDateLabel && <p className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-sm font-black text-[#123D2C]">Próxima data com vaga: {bookingEntityDateLabel}</p>}
                </div>
              )}

              {!foundPerson && (<>
              <form onSubmit={searchPerson} className="grid grid-cols-[1fr_auto] gap-2">
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp ou nome do Consulente" className="min-w-0 rounded-xl border border-[#123D2C]/15 p-3 font-semibold" required />
                <button disabled={saving} className="rounded-xl bg-[#123D2C] px-3 py-2 font-black text-white">Buscar</button>
              </form>

              <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[#2F6B43]">Ou escolha pela inicial</p>
                  {alphabetLoading && <span className="text-[11px] font-bold text-slate-500">Carregando...</span>}
                </div>
                {alphabetLetters.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {alphabetLetters.map((letter) => (
                      <button
                        key={letter}
                        type="button"
                        disabled={alphabetLoading}
                        onClick={() => void loadConsulenteAlphabet(letter)}
                        className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-white px-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50"
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button type="button" disabled={alphabetLoading} onClick={() => void loadConsulenteAlphabet()} className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50">
                    Carregar lista alfabética
                  </button>
                )}
              </section>

              {searchResults.length > 1 && (
                <section className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="text-sm font-black text-[#123D2C]">Encontramos mais de um cadastro. Escolha a pessoa:</p>
                  {searchResults.map((person) => (
                    <button key={person.id} type="button" onClick={() => void selectPerson(person)} className="rounded-xl bg-white p-3 text-left ring-1 ring-[#123D2C]/10">
                      <span className="block font-black text-[#123D2C]">{person.fullName}</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-600">{person.whatsapp ? displayWhatsapp(person.whatsapp) : "WhatsApp não informado"}</span>
                    </button>
                  ))}
                </section>
              )}

              {personNotFound && searchHasPhone && (
                <form onSubmit={createPerson} className="grid gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
                  <p className="text-sm font-black text-amber-950">Cadastro não encontrado. Crie o acesso inicial.</p>
                  <input value={newPerson.fullName} onChange={(event) => setNewPerson((current) => ({ ...current, fullName: event.target.value }))} placeholder="Nome completo" className="rounded-xl border border-amber-200 p-3" required />
                  <input value={newPerson.email} onChange={(event) => setNewPerson((current) => ({ ...current, email: event.target.value }))} placeholder="E-mail opcional" type="email" className="rounded-xl border border-amber-200 p-3" />
                  <div className="grid gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="novo-consulente-senha" className="text-sm font-black text-amber-950">Senha inicial</label>
                      <button type="button" onClick={() => setShowNewPersonPassword((current) => !current)} className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-black text-amber-950">{showNewPersonPassword ? "Ocultar" : "Mostrar"}</button>
                    </div>
                    <input id="novo-consulente-senha" value={newPerson.password} onChange={(event) => setNewPerson((current) => ({ ...current, password: event.target.value }))} placeholder="Senha inicial" type={showNewPersonPassword ? "text" : "password"} minLength={8} className="rounded-xl border border-amber-200 p-3" required />
                    <p className="text-xs font-semibold text-amber-900">A senha inicial vem preenchida como 12345678 e deverá ser trocada no primeiro login.</p>
                  </div>
                  <label className="flex gap-2 text-sm font-semibold text-amber-950"><input type="checkbox" checked={newPerson.privacyAccepted} onChange={(event) => setNewPerson((current) => ({ ...current, privacyAccepted: event.target.checked }))} required /> Ciência do Aviso de Privacidade (LGPD)</label>
                  <button disabled={saving} className="rounded-xl bg-amber-900 px-4 py-3 font-black text-white">Criar cadastro</button>
                </form>
              )}

              {personNotFound && !searchHasPhone && (
                <form onSubmit={createPerson} className="grid gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
                  <p className="text-sm font-black text-amber-950">Cadastro não encontrado. Cadastre o Consulente sem WhatsApp.</p>
                  <p className="text-xs font-semibold text-amber-900">A data do cadastro será registrada automaticamente. A confirmação e os lembretes poderão ser enviados ao familiar/responsável no agendamento.</p>
                  <input value={newPerson.fullName || phone} onChange={(event) => setNewPerson((current) => ({ ...current, fullName: event.target.value }))} placeholder="Nome completo" className="rounded-xl border border-amber-200 p-3" required />
                  <input value={newPerson.email} onChange={(event) => setNewPerson((current) => ({ ...current, email: event.target.value }))} placeholder="E-mail opcional" type="email" className="rounded-xl border border-amber-200 p-3" />
                  <label className="flex gap-2 text-sm font-semibold text-amber-950"><input type="checkbox" checked={newPerson.privacyAccepted} onChange={(event) => setNewPerson((current) => ({ ...current, privacyAccepted: event.target.checked }))} required /> Ciência do Aviso de Privacidade (LGPD)</label>
                  <button disabled={saving} className="rounded-xl bg-amber-900 px-4 py-3 font-black text-white">Criar cadastro sem WhatsApp</button>
                </form>
              )}
              </>)}

              {foundPerson && (
                <div className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="font-black text-[#123D2C]">{foundPerson.fullName}</p>
                  <p className="text-sm font-semibold text-slate-600">{displayWhatsapp(foundPerson.whatsapp)}{foundPerson.email ? ` · ${foundPerson.email}` : ""}</p>
                  <a href={whatsappHref(foundPerson.whatsapp, "Olá! Estou falando pela Recepção do Tucxa sobre seu agendamento.")} target="_blank" rel="noreferrer" className="text-sm font-black text-[#176A3A] underline">Falar no WhatsApp</a>
                  {bookingMode === "date" ? (
                    <label className="grid gap-1 text-sm font-black text-[#123D2C]">Entidade
                      <select
                        value={entityId}
                        onChange={(event) => setEntityId(event.target.value)}
                        disabled={Boolean(contactMode !== "alternate" && foundPerson.defaultEntityId && foundPerson.allowDifferentEntity === false)}
                        className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="">Escolha uma Entidade</option>
                        {usableEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.available} vaga(s)</option>)}
                      </select>
                      {contactMode !== "alternate" && foundPerson.defaultEntityId && foundPerson.allowDifferentEntity === false && (
                        <span className="text-xs font-semibold text-slate-500">Entidade definida pelo cadastro deste Consulente.</span>
                      )}
                      {contactMode === "alternate" && foundPerson.defaultEntityId && foundPerson.allowDifferentEntity === false && (
                        <span className="text-xs font-semibold text-emerald-700">Como o agendamento é para outra pessoa, a Recepção pode escolher a Entidade adequada para este atendimento.</span>
                      )}
                    </label>
                  ) : (
                    <p className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10">{payload.entityCatalog.find((entity) => entity.id === entityId)?.name || "Escolha uma Entidade acima"}{bookingEntityDateLabel ? ` · ${bookingEntityDateLabel}` : ""}</p>
                  )}
                  <div className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                    <p className="text-sm font-black text-[#123D2C]">WhatsApp para confirmação e lembretes</p>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input type="radio" name="booking-contact" checked={contactMode === "consulente"} onChange={() => setContactMode("consulente")} disabled={foundPerson.whatsapp.replace(/\D/g, "").length < 10} />
                      Agendamento Próprio{foundPerson.whatsapp ? ` · ${displayWhatsapp(foundPerson.whatsapp)}` : " · WhatsApp não informado"}
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input type="radio" name="booking-contact" checked={contactMode === "alternate"} onChange={() => setContactMode("alternate")} />
                      Outro contato / familiar / responsável
                    </label>
                    {contactMode === "alternate" && (
                      <div className="grid gap-2 rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                        <p className="text-sm font-black text-[#123D2C]">Quem está fazendo o agendamento?</p>
                        <input value={alternateContact.name} onChange={(event) => setAlternateContact((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do contato" className="rounded-xl border border-[#123D2C]/15 p-2.5" />
                        <select
                          value={alternateRelationshipOption}
                          onChange={(event) => {
                            const option = event.target.value as "" | "Mãe" | "Filho" | "Outro";
                            setAlternateRelationshipOption(option);
                            setAlternateContact((current) => ({ ...current, relationship: option === "Outro" ? "" : option }));
                          }}
                          className="rounded-xl border border-[#123D2C]/15 bg-white p-2.5"
                        >
                          <option value="">Escolha o parentesco</option>
                          <option value="Mãe">Mãe</option>
                          <option value="Filho">Filho</option>
                          <option value="Outro">Outro</option>
                        </select>
                        {alternateRelationshipOption === "Outro" && (
                          <input value={alternateContact.relationship} onChange={(event) => setAlternateContact((current) => ({ ...current, relationship: event.target.value }))} placeholder="Informe o parentesco/vínculo" className="rounded-xl border border-[#123D2C]/15 p-2.5" />
                        )}
                      </div>
                    )}
                    {contactMode === "alternate" && <p className="text-xs font-semibold text-slate-500">O agendamento será para a pessoa informada e o Consulente já cadastrado receberá as informações.</p>}
                  </div>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Observação opcional" className="rounded-xl border border-[#123D2C]/15 p-2.5" />
                  <button type="button" onClick={() => void book()} disabled={saving || !entityId} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Criar agendamento"}</button>
                </div>
              )}

              {accessInfo?.loginUrl && <p className="rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">Cadastro criado. Login: {accessInfo.login || "WhatsApp/e-mail informado"}.</p>}
            </div>
          )}

          {modal === "consultar" && (
            <div className="grid gap-3">
              <div className="sticky top-0 z-20 -mx-1 grid gap-2 bg-white px-1 pb-3">
                <div className="grid grid-cols-[minmax(0,1fr)_7.25rem] gap-2">
                  <select value={payload.selectedDate} onChange={(event) => { setConsultPage(1); setOpenAppointmentActions({}); void load(event.target.value); }} className="rounded-xl border border-[#123D2C]/15 bg-white p-2.5 text-sm font-bold text-[#123D2C]">
                    {payload.dates.map((item) => <option key={item.date} value={item.date}>{acolhimentoDateLabel(item.date)}</option>)}
                  </select>
                  <select value={effectiveConsultView} onChange={(event) => { setConsultView(event.target.value as "entity_day" | "day_entity"); setConsultPage(1); setOpenAppointmentActions({}); }} className="w-full rounded-xl border border-[#123D2C]/15 bg-white px-2 py-2.5 text-xs font-bold text-[#123D2C]">
                    <option value="entity_day">Entidade</option>
                    <option value="day_entity">Consulente</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl bg-[#E9F2E7] px-3 py-2">
                  <span className="text-sm font-black text-[#123D2C]">Total na data · {selectedStatusLabel}</span>
                  <span className="text-sm font-black text-[#123D2C]">{filteredAppointments.length}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setConsultDisplayMode("lista")} className={`rounded-xl px-3 py-2 text-xs font-black ring-1 ${consultDisplayMode === "lista" ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/15"}`}>Lista</button>
                  <button type="button" onClick={() => { setConsultDisplayMode("caderno"); setCadernoOrders(Object.fromEntries((payload.appointments ?? []).map((item) => [item.id, item.arrivalOrder ? String(item.arrivalOrder) : ""]))); }} className={`rounded-xl px-3 py-2 text-xs font-black ring-1 ${consultDisplayMode === "caderno" ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/15"}`}>Caderno</button>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input value={consultSearch} onChange={(event) => { setConsultSearch(event.target.value); setConsultPage(1); }} placeholder="Buscar por nome ou WhatsApp" className="min-w-0 rounded-xl border border-[#123D2C]/15 p-2.5 text-sm font-semibold" />
                  <button type="button" onClick={() => setShowConsultStatusFilter(true)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Status</button>
                </div>

                <div className="flex flex-wrap gap-1">
                  <button type="button" onClick={() => { setConsultLetter(""); setConsultPage(1); }} className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black ring-1 ${!consultLetter ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/15"}`}>Todos</button>
                  {consultLetters.map((letter) => (
                    <button key={letter} type="button" onClick={() => { setConsultLetter(letter); setConsultPage(1); }} className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black ring-1 ${consultLetter === letter ? "bg-[#123D2C] text-white ring-[#123D2C]" : "bg-white text-[#123D2C] ring-[#123D2C]/15"}`}>{letter}</button>
                  ))}
                </div>
              </div>

              {consultDisplayMode === "caderno" && (
                <div className="grid gap-3">
                  {Array.from(new Set(filteredAppointments.map((item) => item.entityName))).sort((a, b) => a.localeCompare(b, "pt-BR")).map((entityName) => (
                    <section key={`caderno-${entityName}`} className="overflow-hidden rounded-2xl ring-1 ring-[#123D2C]/15">
                      <h3 className="bg-[#E9F2E7] px-3 py-2 text-center text-sm font-black uppercase text-[#123D2C]">{entityHeading(entityName)}</h3>
                      <div className="divide-y divide-[#123D2C]/10 bg-white">
                        {filteredAppointments.filter((item) => item.entityName === entityName).sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)).map((appointment) => (
                          <div key={`caderno-row-${appointment.id}`} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-2 px-3 py-2">
                            <div className="min-w-0"><p className="truncate text-sm font-black text-[#123D2C]">{appointment.consulenteName}</p><p className="text-[10px] font-semibold text-slate-500">Agendamento {appointment.order ?? "-"}</p></div>
                            <input aria-label={`Ordem de chegada de ${appointment.consulenteName}`} inputMode="numeric" value={cadernoOrders[appointment.id] ?? (appointment.arrivalOrder ? String(appointment.arrivalOrder) : "")} onChange={(event) => setCadernoOrders((current) => ({ ...current, [appointment.id]: event.target.value.replace(/\D/g, "") }))} className="w-full rounded-lg border border-[#123D2C]/20 p-2 text-center text-sm font-black" placeholder="Ordem" />
                            <button type="button" disabled={saving} onClick={() => void saveCadernoArrival(appointment.id)} className="rounded-lg bg-[#123D2C] px-2 py-2 text-[10px] font-black text-white disabled:opacity-50">Salvar</button>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {consultDisplayMode === "lista" && groupedAppointments.map((group) => (
                <section key={group.label} className="grid gap-2">
                  <h3 className="flex items-center justify-between gap-2 rounded-xl bg-[#E9F2E7] px-3 py-2 font-black text-[#123D2C]">
                    <span>{effectiveConsultView === "entity_day" ? entityHeading(group.label) : group.label}</span>
                    {effectiveConsultView === "entity_day" && (() => {
                      const entity = payload.entities.find((item) => item.name === group.label);
                      if (!entity) return null;
                      const activeEntityAppointments = (payload.appointments ?? []).filter(
                        (item) => item.entityId === entity.id && item.status !== "cancelado",
                      );
                      return (
                        <span className="flex items-center gap-2">
                          {activeEntityAppointments.length > 0 && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => openBulkEntityChange(entity)}
                              className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/15"
                            >
                              Trocar todos
                            </button>
                          )}
                        </span>
                      );
                    })()}
                  </h3>
                  {group.appointments.map((appointment) => {
                    const detail = effectiveConsultView === "entity_day"
                      ? (appointment.order ? `Ordem de agendamento ${appointment.order}` : "")
                      : [appointment.entityName, appointment.order ? `ordem de agendamento ${appointment.order}` : ""].filter(Boolean).join(" · ");
                    const actionsOpen = openAppointmentActions[appointment.id] === true;
                    return (
                      <article key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="truncate font-black text-[#123D2C]">{appointment.consulenteName}</h4>
                            {detail && <p className="mt-1 text-sm font-semibold text-slate-600">{detail}</p>}
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{statusLabel(appointment)}</span>
                        </div>
                        <button type="button" onClick={() => setOpenAppointmentActions((current) => ({ ...current, [appointment.id]: !current[appointment.id] }))} className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">{actionsOpen ? "Fechar ações" : "Ações"}</button>
                        {actionsOpen && (
                          <div className="mt-2 grid gap-2 rounded-xl bg-white p-2 ring-1 ring-[#123D2C]/10">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {appointment.confirmationStatus !== "confirmed" && appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void appointmentAction("confirm-manual", appointment.id)} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Confirmar</button>}
                              {appointment.confirmationStatus !== "confirmed" && appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void sendConfirmationReminder(appointment)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-800 ring-1 ring-blue-100">Enviar lembrete</button>}
                              {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void markArrival(appointment.id, "arrived")} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">Chegou</button>}
                              {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void markArrival(appointment.id, "absent")} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 ring-1 ring-amber-100">Não chegou</button>}
                              {appointment.whatsapp && <a href={whatsappHref(appointment.whatsapp, `Olá, ${appointment.consulenteName}. Estou falando pela Recepção do Tucxa sobre seu agendamento.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-[#176A3A] ring-1 ring-[#123D2C]/15">WhatsApp</a>}
                              {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => openCancelAppointment(appointment)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Cancelar</button>}
                            </div>
                            {appointment.status !== "cancelado" && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => openIndividualEntityChange(appointment)}
                                className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50"
                              >
                                Trocar Entidade
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </section>
              ))}

              {!filteredAppointments.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhum agendamento para este filtro.</p>}

              {consultDisplayMode === "lista" && consultPageCount > 1 && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <button type="button" disabled={effectiveConsultPage <= 1} onClick={() => { setConsultPage((current) => Math.max(1, current - 1)); setOpenAppointmentActions({}); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Anterior</button>
                  <span className="text-xs font-black text-[#123D2C]">{effectiveConsultPage} / {consultPageCount}</span>
                  <button type="button" disabled={effectiveConsultPage >= consultPageCount} onClick={() => { setConsultPage((current) => Math.min(consultPageCount, current + 1)); setOpenAppointmentActions({}); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Próxima</button>
                </div>
              )}
            </div>
          )}

          {modal === "encaminhamento" && (
            <div className="grid gap-3">
              <select value={payload.selectedDate} onChange={(event) => void load(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-2.5 text-sm font-bold text-[#123D2C]">
                {payload.dates.map((item) => <option key={`enc-data-${item.date}`} value={item.date}>{acolhimentoDateLabel(item.date)}</option>)}
              </select>
              <div className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-sm font-bold text-[#123D2C]">Somente Consulentes com chegada registrada aparecem aqui. Marque quando forem encaminhados para o atendimento da Entidade.</div>
              {[...(payload.appointments ?? [])].filter((item) => item.status !== "cancelado" && item.arrivalStatus === "arrived").sort((a, b) => (a.arrivalOrder ?? Number.MAX_SAFE_INTEGER) - (b.arrivalOrder ?? Number.MAX_SAFE_INTEGER) || a.consulenteName.localeCompare(b.consulenteName, "pt-BR", { sensitivity: "base" })).map((appointment) => (
                <article key={`enc-${appointment.id}`} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-[#123D2C]">{appointment.consulenteName}</h4><p className="text-sm font-semibold text-slate-600">{appointment.entityName} · chegada {appointment.arrivalOrder ?? "-"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${appointment.forwardedAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{appointment.forwardedAt ? "Encaminhado" : "Aguardando"}</span></div>
                  <button type="button" disabled={saving} onClick={() => void markForwarded(appointment.id, !appointment.forwardedAt)} className={`mt-3 w-full rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50 ${appointment.forwardedAt ? "bg-white text-[#123D2C] ring-1 ring-[#123D2C]/15" : "bg-[#123D2C] text-white"}`}>{appointment.forwardedAt ? "Desfazer encaminhamento" : "Marcar Encaminhado"}</button>
                </article>
              ))}
              {!(payload.appointments ?? []).some((item) => item.status !== "cancelado" && item.arrivalStatus === "arrived") && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhum Consulente com chegada registrada nesta data.</p>}
            </div>
          )}

          {showConsultStatusFilter && (
            <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4">
              <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-[#123D2C]">Filtrar por status</h3>
                  <button type="button" onClick={() => setShowConsultStatusFilter(false)} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Fechar</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setConsultStatuses(ALL_CONSULT_STATUSES); setConsultPage(1); }} className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#2F6B43]/30">Selecionar tudo</button>
                  <button type="button" onClick={() => { setConsultStatuses([]); setConsultPage(1); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Desselecionar tudo</button>
                  {([
                    ["confirmed", "Confirmado"],
                    ["unconfirmed", "Não Confirmado"],
                    ["arrived", "Chegou"],
                    ["absent", "Não Chegou"],
                    ["cancelled", "Cancelado"],
                  ] as Array<[ConsultStatus, string]>).map(([status, label]) => (
                    <label key={status} className={`flex items-center gap-2 rounded-xl px-3 py-3 text-xs font-black ring-1 ${consultStatuses.includes(status) ? "bg-[#E9F2E7] text-[#123D2C] ring-[#2F6B43]/30" : "bg-white text-slate-500 ring-[#123D2C]/10"}`}>
                      <input type="checkbox" checked={consultStatuses.includes(status)} onChange={() => { toggleConsultStatus(status); setConsultPage(1); }} className="h-4 w-4" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modal === "entidades" && (
            <div className="grid gap-2">
              {entityOverviewLoading && (
                <p className="rounded-2xl bg-[#F7FAF2] p-3 text-sm font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando próximas disponibilidades...</p>
              )}
              {payload.entityCatalog
                .filter((entity) => paginatedEntityCatalog.some((pageEntity) => pageEntity.id === entity.id))
                .map((entity) => {
                  const overview = entityOverview[entity.id];
                  return (
                    <article key={entity.id} className="rounded-2xl bg-[#F7FAF2] px-3 py-2.5 ring-1 ring-[#123D2C]/10">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-[#123D2C]">{entity.name}</h3>
                          <p className="truncate text-[10px] font-semibold text-slate-600">
                            {overview?.nextDate ? `${shortDate(overview.nextDate)} · ${overview.available} vaga(s)` : entityOverviewLoading ? "carregando..." : "sem vaga no período"}
                          </p>
                        </div>
                        <button type="button" onClick={() => openEntityCadastro(entity.id)} className="rounded-xl bg-white px-2.5 py-2 text-[11px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Cadastro</button>
                        <button type="button" disabled={saving || (!overview?.nextDate && !entityOverviewLoading)} onClick={() => void openEntityBookingCalendar(entity)} className="rounded-xl bg-[#123D2C] px-2.5 py-2 text-[11px] font-black text-white disabled:opacity-40">Agendar</button>
                      </div>
                      {entity.mediums.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {entity.mediums.map((medium) => (
                            <a key={`${entity.id}-${medium.personId}`} href={medium.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#E9F2E7] px-2 py-0.5 text-[10px] font-black text-[#176A3A]">
                              {medium.name} · WhatsApp
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              {entityPageCount > 1 && (
                <div className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-white px-2 py-1.5 ring-1 ring-[#123D2C]/10">
                  <button type="button" disabled={effectiveEntityPage <= 1} onClick={() => setEntityPage((current) => Math.max(1, current - 1))} className="rounded-lg px-3 py-1.5 text-xs font-black text-[#123D2C] disabled:opacity-40">Anterior</button>
                  <span className="text-xs font-black text-[#123D2C]">{effectiveEntityPage} / {entityPageCount}</span>
                  <button type="button" disabled={effectiveEntityPage >= entityPageCount} onClick={() => setEntityPage((current) => Math.min(entityPageCount, current + 1))} className="rounded-lg px-3 py-1.5 text-xs font-black text-[#123D2C] disabled:opacity-40">Próxima</button>
                </div>
              )}
            </div>
          )}

          {modal === "cadastros" && (
            <div className="grid gap-4">
              {cadastroMode === "menu" && (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => { clearPersonSearch(); setPhone(""); setCadastroMode("consulentes"); void loadConsulenteAlphabet(); }} className="rounded-2xl bg-[#E9F2E7] p-5 text-left ring-1 ring-[#123D2C]/10">
                    <span className="block text-lg font-black text-[#123D2C]">Consulentes</span>
                    <span className="mt-1 block text-sm font-semibold text-slate-600">Buscar, atualizar ou cadastrar Filho de Fora/Consulente.</span>
                  </button>
                  <button type="button" onClick={() => setCadastroMode("entidades")} className="rounded-2xl bg-white p-5 text-left ring-1 ring-[#123D2C]/10">
                    <span className="block text-lg font-black text-[#123D2C]">Entidades</span>
                    <span className="mt-1 block text-sm font-semibold text-slate-600">Cadastrar, atualizar calendário, vagas e Cavalinho.</span>
                  </button>
                  <a href={`${PERSONAL_REGISTRATION_HREF}?returnTo=${encodeURIComponent(`${pageHref}?modal=cadastros`)}`} className="col-span-2 rounded-2xl bg-white p-5 text-left ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow">
                    <span className="block text-lg font-black text-[#123D2C]">Cadastro pessoal</span>
                    <span className="mt-1 block text-sm font-semibold text-slate-600">Revisar meus dados, familiares, funções, Entidades e agenda e enviar alterações para validação do Tucxa.</span>
                  </a>
                </div>
              )}

              {cadastroMode === "consulentes" && (
                <section className="grid gap-2">
                  <form onSubmit={searchPerson} className="grid grid-cols-[1fr_auto] gap-2">
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nome ou WhatsApp" className="min-w-0 rounded-xl border border-[#123D2C]/15 p-2" required />
                    <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 font-black text-white">Buscar</button>
                  </form>

                  <section className="rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-[#2F6B43]">Ou escolha pela inicial</p>
                      {alphabetLoading && <span className="text-[11px] font-bold text-slate-500">Carregando...</span>}
                    </div>
                    {alphabetLetters.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {alphabetLetters.map((letter) => (
                          <button
                            key={`cadastro-${letter}`}
                            type="button"
                            disabled={alphabetLoading}
                            onClick={() => void loadConsulenteAlphabet(letter)}
                            className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-white px-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50"
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button type="button" disabled={alphabetLoading} onClick={() => void loadConsulenteAlphabet()} className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50">
                        Carregar lista alfabética
                      </button>
                    )}
                  </section>

                  {searchResults.length > 1 && (
                    <div className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                      <p className="text-sm font-black text-[#123D2C]">Encontramos mais de um cadastro. Escolha a pessoa:</p>
                      {searchResults.map((person) => (
                        <button key={person.id} type="button" onClick={() => void selectPerson(person)} className="rounded-xl bg-white p-3 text-left ring-1 ring-[#123D2C]/10">
                          <span className="block font-black text-[#123D2C]">{person.fullName}</span>
                          <span className="mt-1 block text-sm font-semibold text-slate-600">{person.whatsapp ? displayWhatsapp(person.whatsapp) : "WhatsApp não informado"}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {personNotFound && !showCreateConsulente && (
                    <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
                      <p className="text-sm font-semibold text-amber-950">Nenhum cadastro encontrado. Deseja cadastrar um novo Consulente?</p>
                      <button
                        type="button"
                        onClick={() => {
                          const typedDigits = phone.replace(/\D/g, "");
                          setNewPersonWhatsapp(typedDigits.length >= 10 ? phone : "");
                          setNewPerson((current) => ({ ...current, fullName: typedDigits.length >= 10 ? current.fullName : phone }));
                          setShowCreateConsulente(true);
                        }}
                        className="mt-2 rounded-xl bg-amber-900 px-4 py-2 text-sm font-black text-white"
                      >
                        Cadastrar novo Consulente
                      </button>
                    </div>
                  )}

                  {showCreateConsulente && (
                    <form onSubmit={createPerson} className="grid gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
                      <p className="font-black text-amber-950">Novo Consulente</p>
                      <label className="grid gap-1 text-xs font-black text-amber-950">Nome completo
                        <input value={newPerson.fullName} onChange={(event) => setNewPerson((current) => ({ ...current, fullName: event.target.value }))} className="rounded-xl border border-amber-200 p-3" required />
                      </label>
                      <label className="grid gap-1 text-xs font-black text-amber-950">WhatsApp com DDD
                        <input value={newPersonWhatsapp} onChange={(event) => setNewPersonWhatsapp(event.target.value)} className="rounded-xl border border-amber-200 p-3" required />
                      </label>
                      <label className="grid gap-1 text-xs font-black text-amber-950">E-mail opcional
                        <input value={newPerson.email} onChange={(event) => setNewPerson((current) => ({ ...current, email: event.target.value }))} type="email" className="rounded-xl border border-amber-200 p-3" />
                      </label>
                      <label className="flex gap-2 text-sm font-semibold text-amber-950"><input type="checkbox" checked={newPerson.privacyAccepted} onChange={(event) => setNewPerson((current) => ({ ...current, privacyAccepted: event.target.checked }))} required /> Ciência do Aviso de Privacidade (LGPD)</label>
                      <button disabled={saving} className="rounded-xl bg-amber-900 px-4 py-3 font-black text-white">Cadastrar Consulente</button>
                    </form>
                  )}

                  {foundPerson && (
                    <form onSubmit={updateConsulente} className="grid gap-1.5 rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">
                      <p className="text-sm font-black text-[#123D2C]">Atualizar Consulente</p>
                      <label className="grid gap-1 text-xs font-black text-[#123D2C]">Nome
                        <input value={editPerson.fullName} onChange={(event) => setEditPerson((current) => ({ ...current, fullName: event.target.value }))} className="rounded-lg border border-[#123D2C]/15 p-2" required />
                      </label>
                      <label className="grid gap-1 text-xs font-black text-[#123D2C]">WhatsApp
                        <input value={editPerson.whatsapp} onChange={(event) => setEditPerson((current) => ({ ...current, whatsapp: event.target.value }))} className="rounded-lg border border-[#123D2C]/15 p-2" required />
                      </label>
                      <label className="grid gap-1 text-xs font-black text-[#123D2C]">E-mail opcional
                        <input value={editPerson.email} onChange={(event) => setEditPerson((current) => ({ ...current, email: event.target.value }))} className="rounded-lg border border-[#123D2C]/15 p-2" type="email" />
                      </label>
                      <label className="grid gap-1 text-xs font-black text-[#123D2C]">Entidade padrão
                        <select value={editPerson.defaultEntityId} onChange={(event) => setEditPerson((current) => ({ ...current, defaultEntityId: event.target.value }))} className="rounded-lg border border-[#123D2C]/15 p-2">
                          <option value="">Sem Entidade padrão</option>
                          {payload.entityCatalog.filter((entity) => entity.active && entity.appointmentEnabled).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                        </select>
                      </label>
                      <Toggle checked={editPerson.allowDifferentEntity} onChange={(checked) => setEditPerson((current) => ({ ...current, allowDifferentEntity: checked }))} label="Permitir que este Consulente escolha Entidade diferente da padrão" />
                      <p className="text-[11px] font-semibold leading-4 text-slate-500">Por padrão esta permissão fica desativada. A Recepção pode liberá-la individualmente.</p>
                      <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-2.5 font-black text-white">Salvar Consulente</button>
                    </form>
                  )}
                </section>
              )}

              {cadastroMode === "entidades" && (
                <form onSubmit={saveEntity} className="grid gap-1.5">
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">Cadastro
                    <select value={editEntity.entityId} onChange={(event) => selectEntityForEdit(event.target.value)} className="rounded-lg border border-[#123D2C]/15 p-2">
                      <option value="">Nova Entidade</option>
                      {payload.entityCatalog.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}{entity.active && entity.appointmentEnabled ? "" : " · inativa"}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">Nome da Entidade
                    <input value={editEntity.name} onChange={(event) => setEditEntity((current) => ({ ...current, name: event.target.value }))} className="rounded-lg border border-[#123D2C]/15 p-2" required />
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">Descrição
                    <textarea value={editEntity.description} onChange={(event) => setEditEntity((current) => ({ ...current, description: event.target.value }))} rows={1} className="rounded-lg border border-[#123D2C]/15 p-2" placeholder="Como esta Entidade atua no atendimento." />
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">Quantidade de vagas por dia de atendimento
                    <input type="number" min={1} value={editEntity.capacity} onChange={(event) => setEditEntity((current) => ({ ...current, capacity: event.target.value }))} className="rounded-lg border border-[#123D2C]/15 p-2" required />
                  </label>
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">Cavalinho associado
                    <select value={editEntity.cavalinhoPersonId} onChange={(event) => setEditEntity((current) => ({ ...current, cavalinhoPersonId: event.target.value }))} className="rounded-lg border border-[#123D2C]/15 p-2">
                      <option value="">Sem Cavalinho associado</option>
                      {payload.cavalinhos.map((person) => <option key={person.id} value={person.id}>{person.name}{person.whatsapp ? ` · ${displayWhatsapp(person.whatsapp)}` : ""}</option>)}
                    </select>
                  </label>
                  {editEntity.entityId && <Toggle checked={editEntity.active} onChange={(active) => setEditEntity((current) => ({ ...current, active }))} label="Entidade ativa para atendimento/agendamento" />}
                  <Toggle checked={editEntity.cavalinhoWhatsappEnabled} onChange={(cavalinhoWhatsappEnabled) => setEditEntity((current) => ({ ...current, cavalinhoWhatsappEnabled }))} label="Cavalinho recebe avisos de atendimentos previstos pelo WhatsApp" />
                  <EntityOccurrencePicker label="Segunda-feira" values={editEntity.mondayOccurrences} onToggle={(occurrence) => toggleEntityOccurrence("mondayOccurrences", occurrence)} />
                  <EntityOccurrencePicker label="Terça-feira" values={editEntity.tuesdayOccurrences} onToggle={(occurrence) => toggleEntityOccurrence("tuesdayOccurrences", occurrence)} />
                  <p className="text-[11px] font-semibold leading-4 text-slate-500">Marque em quais ocorrências do mês a Entidade atende. Salvar uma Entidade existente substitui o calendário do piloto dessa Entidade.</p>
                  <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-2.5 font-black text-white">{editEntity.entityId ? "Salvar Entidade" : "Cadastrar Entidade"}</button>
                </form>
              )}
            </div>
          )}

          {modal === "configuracoes" && settingsDraft && (
            <form onSubmit={saveSettings} className="grid gap-3">
              {!settingsSection ? (
                <div className="grid gap-2">
                  {[
                    ["ordem", "Ordem dos atendimentos", "Agendamento ou chegada"],
                    ["confirmacao", "Prazo de confirmação", `Limite atual: ${settingsDraft.confirmationCutoff}`],
                    ["chegada", "Registro de chegada", "Regra do botão Chegou"],
                    ["lembretes", "Lembretes e confirmações", `Antecedência: ${settingsDraft.reminderOffsets || "não definida"} h`],
                    ["envios", "Dias dos envios automáticos", "Escolha os dias da semana"],
                    ["entrada", "Ao entrar no sistema", "Abertura automática do Acolhimento"],
                    ["resumo", "Receber resumo de agendamentos", "Canais e ordenação"],
                    ["avisos", "Avisos operacionais pelo WhatsApp", "Cavalinhos e Recepção"],
                  ].map(([key, title, subtitle]) => (
                    <button key={key} type="button" onClick={() => setSettingsSection(key)} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7FAF2] p-3 text-left ring-1 ring-[#123D2C]/10">
                      <span><strong className="block text-sm text-[#123D2C]">{title}</strong><span className="text-xs font-semibold text-slate-500">{subtitle}</span></span>
                      <span className="text-xl font-black text-[#2F6B43]">›</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3">
                  
                  {settingsSection === "ordem" && <label className="grid gap-1 text-sm font-black text-[#123D2C]">Ordem dos atendimentos<select value={settingsDraft.serviceOrderMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, serviceOrderMode: event.target.value as "booking" | "arrival" } : current)} className="rounded-xl border border-[#123D2C]/15 p-3"><option value="booking">Ordem de agendamento</option><option value="arrival">Ordem de chegada</option></select></label>}

                  {settingsSection === "confirmacao" && <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">Prazo de confirmação</p><label className="mt-2 grid gap-1 text-sm font-black text-[#123D2C]">Horário-limite no dia do atendimento<input type="time" value={settingsDraft.confirmationCutoff} onChange={(event) => setSettingsDraft((current) => current ? { ...current, confirmationCutoff: event.target.value } : current)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3" required /></label><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Este horário limita a confirmação do Consulente. A Recepção continua podendo criar novos agendamentos depois dele.</p><div className="mt-3"><Toggle checked={settingsDraft.autoCancelExpiredConfirmations} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, autoCancelExpiredConfirmations: checked } : current)} label="Cancelar automaticamente agendamentos não confirmados após o prazo" /></div></section>}

                  {settingsSection === "chegada" && <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">Registro de chegada</p><div className="mt-2"><Toggle checked={settingsDraft.enforceArrivalWindow} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, enforceArrivalWindow: checked } : current)} label="Restringir o botão ‘Chegou’ ao dia e horário previstos" /></div></section>}

                  {settingsSection === "lembretes" && <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">Lembretes e confirmações</p><label className="mt-2 grid gap-1 text-sm font-black text-[#123D2C]">Antecedência em horas<input value={settingsDraft.reminderOffsets} onChange={(event) => setSettingsDraft((current) => current ? { ...current, reminderOffsets: event.target.value } : current)} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Ex.: 68, 24, 4" /></label><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">A antecedência é calculada a partir do início do atendimento ({payload.settings.appointmentTime}). Como o scheduler gratuito executa uma vez ao dia, cada limiar pendente é enviado na primeira execução diária em que entrar na janela, sem duplicidade.</p></section>}

                  {settingsSection === "envios" && <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">Dias dos envios automáticos</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Escolha em quais dias da semana a execução diária poderá enviar lembretes e avisos.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setSettingsDraft((current) => current ? { ...current, automaticDispatchWeekdays: [0,1,2,3,4,5,6] } : current)} className="rounded-lg bg-[#E9F2E7] px-3 py-2 text-xs font-black text-[#123D2C]">Selecionar tudo</button><button type="button" onClick={() => setSettingsDraft((current) => current ? { ...current, automaticDispatchWeekdays: [] } : current)} className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Deselecionar tudo</button></div><div className="mt-3 grid grid-cols-2 gap-2">{[[0,"Domingo"],[1,"Segunda"],[2,"Terça"],[3,"Quarta"],[4,"Quinta"],[5,"Sexta"],[6,"Sábado"]].map(([value,label]) => { const day=Number(value); const checked=settingsDraft.automaticDispatchWeekdays.includes(day); return <label key={day} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10"><input type="checkbox" checked={checked} onChange={(event) => setSettingsDraft((current) => current ? { ...current, automaticDispatchWeekdays: event.target.checked ? Array.from(new Set([...current.automaticDispatchWeekdays, day])).sort((a,b)=>a-b) : current.automaticDispatchWeekdays.filter((item)=>item!==day) } : current)} />{String(label)}</label>; })}</div></section>}

                  {settingsSection === "entrada" && <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">Ao entrar no sistema</p><div className="mt-2"><Toggle checked={settingsDraft.openAcolhimentoOnLogin} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, openAcolhimentoOnLogin: checked } : current)} label="Abrir Acolhimento automaticamente na próxima data de atendimento" /></div><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Esta preferência é pessoal para cada integrante da Recepção.</p></section>}

                  {settingsSection === "resumo" && <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">Receber resumo agendamentos</p><div className="mt-2 grid grid-cols-2 gap-2"><Toggle checked={settingsDraft.summaryEmail} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, summaryEmail: checked } : current)} label="E-mail" /><Toggle checked={settingsDraft.summaryWhatsapp} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, summaryWhatsapp: checked } : current)} label="WhatsApp" /></div><p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">Ordenação</p><select value={settingsDraft.summaryViewMode === "both" ? "entity_day" : settingsDraft.summaryViewMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, summaryViewMode: event.target.value as ViewMode } : current)} className="mt-1 w-full rounded-xl border border-[#123D2C]/15 p-3"><option value="entity_day">Entidade</option><option value="day_entity">Dia</option></select></section>}

                  {settingsSection === "avisos" && <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">Avisos operacionais pelo WhatsApp</p><div className="mt-3"><Toggle checked={settingsDraft.cavalinhoDailyWhatsappEnabled} onChange={(checked) => { setSettingsDraft((current) => current ? { ...current, cavalinhoDailyWhatsappEnabled: checked } : current); if (checked) { setCavalinhoPickerPage(1); setShowCavalinhoPicker(true); } }} label="Enviar aos Cavalinhos a lista dos próprios Consulentes" /></div><button type="button" onClick={() => { setCavalinhoPickerPage(1); setShowCavalinhoPicker(true); }} className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Selecionar Entidades/Cavalinhos ({settingsDraft.cavalinhoNoticeEntityIds.length})</button><label className="mt-3 grid gap-1 text-sm font-black text-[#123D2C]">Horário do envio aos Cavalinhos<input type="time" value={settingsDraft.cavalinhoDailyWhatsappTime} onChange={(event) => setSettingsDraft((current) => current ? { ...current, cavalinhoDailyWhatsappTime: event.target.value } : current)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3" /></label><div className="mt-4"><Toggle checked={settingsDraft.receptionDailyWhatsappEnabled} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, receptionDailyWhatsappEnabled: checked } : current)} label="Enviar à Recepção o resumo por Entidade/Cavalinho" /></div><label className="mt-2 grid gap-1 text-sm font-black text-[#123D2C]">Horário do envio à Recepção<input type="time" value={settingsDraft.receptionDailyWhatsappTime} onChange={(event) => setSettingsDraft((current) => current ? { ...current, receptionDailyWhatsappTime: event.target.value } : current)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3" /></label></section>}
                </div>
              )}
              <button disabled={saving || settingsDraft.automaticDispatchWeekdays.length === 0} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar configurações"}</button>
            </form>
          )}

          {modal === "ajuda" && (
            <div className="grid gap-2 text-[13px] font-semibold leading-5 text-slate-700 sm:text-sm">
              <Info title="Agendamento">A Recepção localiza ou cadastra o Consulente, cria a reserva por Data ou Entidade.</Info>
              <Info title="Confirmação">O Consulente pode confirmar pelo link que recebe. O prazo padrão é as {payload.settings.confirmationCutoff} no dia do atendimento.</Info>
              <Info title="Chegada">Chegada orientada: {payload.settings.arrivalWindow}. A porta fecha às {payload.settings.doorClosesAt}.</Info>
              <Info title="Ordem">O acolhimento pode ser por ordem de agendamento ou por ordem de chegada. Quando a ordem de chegada estiver ativa, use o botão “Chegou”.</Info>
              <Info title="Contato">É possível contactar pelo WhatsApp o Consulente ou Cavalinho ligado a Entidade nos agendamentos.</Info>
            </div>
          )}
        </Modal>
      )}

      {showCavalinhoPicker && settingsDraft && payload && (() => {
        const eligible = payload.entityCatalog.filter((entity) => entity.active);
        const pageSize = 4;
        const pageCount = Math.max(1, Math.ceil(eligible.length / pageSize));
        const page = Math.min(cavalinhoPickerPage, pageCount);
        const visible = eligible.slice((page - 1) * pageSize, page * pageSize);
        return (
          <Modal title="Entidades/Cavalinhos que receberão" onClose={() => setShowCavalinhoPicker(false)}>
            <div className="grid gap-3">
              <p className="rounded-xl bg-[#E9F2E7] p-3 text-xs font-semibold text-[#123D2C]">Selecione pelo menos uma Entidade/Cavalinho para manter o envio automático ativado.</p>
              <div className="grid gap-2">{visible.map((entity) => <label key={`picker-${entity.id}`} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10"><input type="checkbox" checked={settingsDraft.cavalinhoNoticeEntityIds.includes(entity.id)} disabled={entity.mediums.length === 0} onChange={(event) => setSettingsDraft((current) => current ? { ...current, cavalinhoNoticeEntityIds: event.target.checked ? Array.from(new Set([...current.cavalinhoNoticeEntityIds, entity.id])) : current.cavalinhoNoticeEntityIds.filter((id) => id !== entity.id) } : current)} /><span>{entity.name}{entity.mediums[0]?.name ? ` (${entity.mediums[0].name})` : ""}{entity.mediums.length === 0 ? " · sem Cavalinho associado" : ""}</span></label>)}</div>
              <div className="grid grid-cols-3 items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setCavalinhoPickerPage((current) => Math.max(1, current - 1))} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Anterior</button><span className="text-center text-xs font-black text-slate-500">{page}/{pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setCavalinhoPickerPage((current) => Math.min(pageCount, current + 1))} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Próxima</button></div>
              <button type="button" disabled={settingsDraft.cavalinhoNoticeEntityIds.length === 0} onClick={() => setShowCavalinhoPicker(false)} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-40">Concluir seleção</button>
            </div>
          </Modal>
        );
      })()}

      {entityCalendar && (
        <Modal title={`Agendar · ${entityCalendar.entity.name}`} onClose={() => setEntityCalendar(null)}>
          <div className="grid gap-3">
            <p className="rounded-xl bg-[#E9F2E7] px-3 py-2 text-xs font-semibold leading-5 text-[#123D2C]">
              Selecione uma data. O calendário abaixo mostra somente dias em que esta Entidade atende e ainda possui vaga disponível.
            </p>
            {entityCalendarMonths.length === 0 ? (
              <p className="rounded-2xl bg-[#F7FAF2] p-4 text-center text-sm font-bold text-slate-500 ring-1 ring-[#123D2C]/10">
                Nenhuma data com vaga disponível no período.
              </p>
            ) : (
              <div className="grid gap-3">
                {entityCalendarMonths.map((group) => (
                  <section key={group.month} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                    <h3 className="text-sm font-black text-[#123D2C]">{group.label}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {group.dates.map((item) => (
                        <button
                          key={item.date}
                          type="button"
                          onClick={() => void chooseEntityCalendarDate(item.date)}
                          className="rounded-xl bg-white px-3 py-3 text-left ring-1 ring-[#123D2C]/15 transition hover:-translate-y-0.5 hover:shadow"
                        >
                          <span className="block text-sm font-black text-[#123D2C]">{shortDate(item.date)}</span>
                          <span className="mt-1 block text-[11px] font-bold text-[#2F6B43]">{item.available} vaga(s) disponível(is)</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {alphabetPicker && (
        <AlphabetConsulentePopup
          letter={alphabetPicker.letter}
          people={alphabetPicker.people}
          loading={alphabetLoading}
          onClose={() => setAlphabetPicker(null)}
          onSelect={(person) => void selectAlphabetPerson(person)}
        />
      )}

      {cancelRequest && (
        <CancelAppointmentPopup
          request={cancelRequest}
          saving={saving}
          onChangeReason={(reason) => setCancelRequest((current) => current ? { ...current, reason } : current)}
          onChangeAttachment={(attachment) => setCancelRequest((current) => current ? { ...current, attachment } : current)}
          onClose={() => !saving && setCancelRequest(null)}
          onSubmit={submitCancellation}
        />
      )}

      {entityChangeRequest && (
        <EntityChangePopup
          request={entityChangeRequest}
          entities={usableEntities}
          saving={saving}
          onChange={(patch) => setEntityChangeRequest((current) => current ? { ...current, ...patch } : current)}
          onClose={() => !saving && setEntityChangeRequest(null)}
          onSubmit={submitEntityChange}
        />
      )}

      {successNotice && (
        <SuccessPopup
          title={successNotice.title}
          message={successNotice.message}
          onClose={() => setSuccessNotice(null)}
        />
      )}

      {errorNotice && (
        <ErrorPopup
          title={errorNotice.title}
          message={errorNotice.message}
          onClose={() => setErrorNotice(null)}
        />
      )}

      {bookingResult?.appointment && bookingResult.confirmation?.url && (
        <Modal title="Agendamento criado" onClose={() => setBookingResult(null)}>
          <div className="grid gap-3">
            <section className="rounded-2xl bg-[#E9F2E7] p-4 ring-1 ring-[#123D2C]/10">
              <p className="text-lg font-black text-[#123D2C]">{bookingResult.appointment.personName}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{shortDate(bookingResult.appointment.appointmentDate)} · {bookingResult.appointment.entityName}</p>
              {bookingResult.appointment.order && <p className="mt-1 text-sm font-semibold text-slate-700">Ordem de agendamento {bookingResult.appointment.order}</p>}
              {bookingResult.confirmation.whatsapp.sent ? <p className="mt-2 text-sm font-black text-emerald-800">Confirmação enviada automaticamente pelo WhatsApp.</p> : <p className="mt-2 text-sm font-black text-amber-800">Envio automático não concluído{bookingResult.confirmation.whatsapp.error ? `: ${bookingResult.confirmation.whatsapp.error}` : ". Use o botão abaixo para enviar manualmente."}</p>}
            </section>
            <a
              href={whatsappHref(bookingResult.whatsapp, bookingResult.alternateContact ? `Olá, ${bookingResult.contactName || ""}. Você está recebendo esta mensagem como contato de ${bookingResult.appointment.personName}. O atendimento de ${bookingResult.appointment.personName} no Tucxa foi agendado para ${shortDate(bookingResult.appointment.appointmentDate)}, com ${bookingResult.appointment.entityName}${bookingResult.appointment.order ? `, ordem de agendamento ${bookingResult.appointment.order}` : ""}. Confirme a presença: ${bookingResult.confirmation.url}` : `Olá, ${bookingResult.appointment.personName}. Seu atendimento no Tucxa foi agendado para ${shortDate(bookingResult.appointment.appointmentDate)}, com ${bookingResult.appointment.entityName}${bookingResult.appointment.order ? `, ordem de agendamento ${bookingResult.appointment.order}` : ""}. Confirme sua presença: ${bookingResult.confirmation.url}`)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#176A3A] px-4 py-3 text-center font-black text-white"
            >
              Enviar confirmação pelo WhatsApp
            </a>
            <button type="button" onClick={() => void navigator.clipboard.writeText(bookingResult.confirmation!.url)} className="rounded-xl bg-white px-4 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Copiar link de confirmação</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function AlphabetConsulentePopup({
  letter,
  people,
  loading,
  onClose,
  onSelect,
}: {
  letter: string;
  people: FoundPerson[];
  loading: boolean;
  onClose: () => void;
  onSelect: (person: FoundPerson) => void;
}) {
  const pageSize = 4;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(people.length / pageSize));
  const effectivePage = Math.min(page, pageCount);
  const pagePeople = people.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  return (
    <div className="fixed inset-0 z-[290] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Consulentes com a letra ${letter}`}>
      <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2F6B43]">Seleção alfabética</p>
            <h2 className="text-xl font-black text-[#123D2C]">Consulentes · {letter}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button>
        </header>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <p className="rounded-2xl bg-[#F7FAF2] p-4 text-center text-sm font-bold text-slate-500">Carregando cadastros...</p>
          ) : people.length === 0 ? (
            <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Nenhum Consulente ativo encontrado com esta inicial.</p>
          ) : (
            <div className="grid gap-2">
              {pagePeople.map((person) => (
                <button key={person.id} type="button" onClick={() => onSelect(person)} className="rounded-xl bg-[#F7FAF2] p-3 text-left ring-1 ring-[#123D2C]/10">
                  <span className="block font-black text-[#123D2C]">{person.fullName}</span>
                  <span className="mt-1 block text-sm font-semibold text-slate-600">{person.whatsapp ? displayWhatsapp(person.whatsapp) : "WhatsApp não informado"}</span>
                  {person.defaultEntityName && (
                    <span className="mt-1 block text-xs font-black text-[#2F6B43]">
                      Entidade padrão: {person.defaultEntityName}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {!loading && people.length > pageSize && (
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <button type="button" disabled={effectivePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Anterior</button>
              <span className="text-xs font-black text-slate-600">{effectivePage} / {pageCount}</span>
              <button type="button" disabled={effectivePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Próxima</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EntityChangePopup({
  request,
  entities,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  request: EntityChangeRequest;
  entities: Entity[];
  saving: boolean;
  onChange: (patch: Partial<EntityChangeRequest>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const target = entities.find((entity) => entity.id === request.newEntityId);
  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/55 p-4">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-xl font-black text-[#123D2C]">
            {request.mode === "bulk" ? "Trocar Entidade de todos" : "Trocar Entidade"}
          </h2>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button>
        </div>
        <div className="grid gap-4 p-5">
          <div className="rounded-2xl bg-[#E9F2E7] p-4 text-sm font-semibold text-[#123D2C]">
            <p><strong>{request.mode === "bulk" ? `${request.appointmentIds.length} agendamento(s)` : request.consulenteName}</strong></p>
            <p className="mt-1">Entidade atual: <strong>{request.currentEntityName}</strong></p>
            {request.mode === "bulk" && <p className="mt-1">A troca será aplicada a todos os agendamentos ativos deste grupo/data.</p>}
          </div>

          <label className="grid gap-1 text-sm font-black text-[#123D2C]">
            Nova Entidade
            <select
              value={request.newEntityId}
              onChange={(event) => onChange({ newEntityId: event.target.value })}
              className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold"
              required
            >
              <option value="">Selecione...</option>
              {entities.filter((entity) => entity.id !== request.currentEntityId).map((entity) => (
                <option key={entity.id} value={entity.id}>{entity.name} · {entity.available} vaga(s)</option>
              ))}
            </select>
          </label>

          {target && request.mode === "bulk" && target.available < request.appointmentIds.length && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
              Atenção: {request.appointmentIds.length} agendamentos serão movidos, mas {target.name} mostra {target.available} vaga(s).
              O servidor fará uma nova validação antes de alterar qualquer agendamento.
            </p>
          )}

          <label className="grid gap-1 text-sm font-black text-[#123D2C]">
            Motivo da troca
            <textarea
              value={request.reason}
              onChange={(event) => onChange({ reason: event.target.value })}
              rows={3}
              required
              placeholder="Ex.: A Entidade Frei Francisco não poderá comparecer."
              className="rounded-xl border border-[#123D2C]/15 p-3 font-semibold"
            />
          </label>

          <label className="grid gap-1 text-sm font-black text-[#123D2C]">
            Anexo opcional
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => onChange({ attachment: event.target.files?.[0] ?? null })}
              className="rounded-xl border border-[#123D2C]/15 p-3 text-sm font-semibold"
            />
            <span className="text-xs font-semibold text-slate-500">Imagem ou PDF, até 5 MB. O arquivo fica no histórico da troca.</span>
          </label>

          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-[#123D2C]">
            <input
              type="checkbox"
              checked={request.notify}
              onChange={(event) => onChange({ notify: event.target.checked })}
              className="mt-1"
            />
            Avisar {request.mode === "bulk" ? "todos os Consulentes/contatos" : "o Consulente/contato"} pelo WhatsApp
          </label>

          <button
            type="submit"
            disabled={saving || !request.newEntityId || !request.reason.trim()}
            className="rounded-xl bg-[#176A3A] px-4 py-3 font-black text-white disabled:opacity-50"
          >
            {saving ? "Alterando..." : request.mode === "bulk" ? "Confirmar troca de todos" : "Confirmar troca"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CancelAppointmentPopup({
  request,
  saving,
  onChangeReason,
  onChangeAttachment,
  onClose,
  onSubmit,
}: {
  request: CancelRequest;
  saving: boolean;
  onChangeReason: (reason: string) => void;
  onChangeAttachment: (attachment: File | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cancelar agendamento">
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-red-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600">Cancelamento</p>
            <h2 className="text-xl font-black text-red-800">Cancelar agendamento</h2>
          </div>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white disabled:opacity-50">Fechar</button>
        </header>
        <form onSubmit={onSubmit} className="grid gap-3 p-4 sm:p-5">
          <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold leading-5 text-red-800 ring-1 ring-red-100">
            Você está cancelando o atendimento de {request.consulenteName}. A vaga será liberada e o motivo ficará registrado no histórico.
          </p>
          <label className="grid gap-1 text-sm font-black text-[#123D2C]">
            Motivo do cancelamento
            <textarea
              value={request.reason}
              onChange={(event) => onChangeReason(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Ex.: Consulente avisou que não poderá comparecer."
              className="rounded-xl border border-[#123D2C]/15 p-3 font-semibold"
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-black text-[#123D2C]">
            Anexo opcional
            <input
              type="file"
              accept="image/*,application/pdf"
              disabled={saving}
              onChange={(event) => onChangeAttachment(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-[#123D2C]/15 bg-white p-3 text-sm font-semibold"
            />
            <span className="text-xs font-semibold text-slate-500">Imagem ou PDF, até 5 MB.</span>
          </label>
          <button type="submit" disabled={saving || !request.reason.trim()} className="rounded-xl bg-red-700 px-4 py-3 font-black text-white disabled:opacity-50">
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </form>
      </section>
    </div>
  );
}

function SuccessPopup({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[410] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[#123D2C]/10 px-5 py-4">
          <h2 className="text-xl font-black text-[#123D2C]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button>
        </header>
        <div className="p-4 sm:p-5">
          <p className="rounded-2xl bg-[#E9F2E7] p-4 font-bold leading-6 text-[#123D2C] ring-1 ring-[#123D2C]/10">{message}</p>
        </div>
      </section>
    </div>
  );
}

function ErrorPopup({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[420] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-red-100 px-5 py-4">
          <h2 className="text-xl font-black text-red-800">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button>
        </header>
        <div className="p-4 sm:p-5">
          <p className="rounded-2xl bg-red-50 p-4 font-bold leading-6 text-red-800 ring-1 ring-red-100">{message}</p>
        </div>
      </section>
    </div>
  );
}

function ActionButton({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-[1.35rem] bg-white p-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg"><span className="block text-base font-black text-[#123D2C] sm:text-lg">{title}</span><span className="mt-1 block text-xs font-bold text-slate-500">{subtitle}</span><span className="mt-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">TOQUE PARA ABRIR</span></button>;
}

function Summary({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  const content = <><span className="block text-lg font-black text-[#123D2C]">{value}</span><span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{label}</span></>;
  return onClick ? <button type="button" onClick={onClick} className="rounded-xl bg-[#F7FAF2] p-2 text-left ring-1 ring-[#123D2C]/10 transition hover:bg-[#E9F2E7]">{content}</button> : <div className="rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">{content}</div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" /><span>{label}</span></label>;
}

function EntityOccurrencePicker({ label, values, onToggle }: { label: string; values: number[]; onToggle: (occurrence: number) => void }) {
  return (
    <fieldset className="rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
      <legend className="px-1 text-sm font-black text-[#123D2C]">{label}</legend>
      <div className="mt-1 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((occurrence) => (
          <label key={occurrence} className="flex items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
            <input type="checkbox" checked={values.includes(occurrence)} onChange={() => onToggle(occurrence)} />
            {occurrence}ª
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 px-5 py-4"><h2 className="text-xl font-black text-[#123D2C]">{title}</h2><button type="button" onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button></header><div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div></section></div>;
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl bg-[#F7FAF2] px-3 py-2.5 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">{title}</p><p className="mt-0.5">{children}</p></div>;
}

function modalTitle(modal: Exclude<ModalKind, null>) {
  if (modal === "agendar") return "Agendar Consulente";
  if (modal === "acolhimento") return "Acolhimento";
  if (modal === "painel") return "Painel do Acolhimento";
  if (modal === "consultar") return "Triagem";
  if (modal === "encaminhamento") return "Encaminhamento";
  if (modal === "gestao") return "Gestão · Relatórios";
  if (modal === "entidades") return "Disponibilidade das Entidades";
  if (modal === "cadastros") return "Cadastros";
  if (modal === "configuracoes") return "Configurações da Recepção";
  return "Como funciona";
}
