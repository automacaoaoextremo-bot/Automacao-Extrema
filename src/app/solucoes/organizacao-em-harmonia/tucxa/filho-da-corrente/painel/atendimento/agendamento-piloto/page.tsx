"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoAgendamentoSignOutAction,
  filhoSupportAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API_PATH = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto";
const LEGACY_BOOKING_API = "/api/organizacao-em-harmonia/filhos-corrente/agendamentos";
const UNIFIED_LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
const pageHref = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto";
const PERSONAL_REGISTRATION_HREF = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atualizar-dados";

type ViewMode = "entity_day" | "day_entity" | "both";
type ModalKind = "agendar" | "consultar" | "entidades" | "cadastros" | "configuracoes" | "ajuda" | null;
type BookingMode = "date" | "entity";
type ConsultStatus = "confirm" | "arrived" | "absent" | "cancelled";
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
};
type Settings = {
  confirmationCutoff: string;
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
type CompletedBooking = BookingResult & { whatsapp: string };
type SuccessNotice = { title: string; message: string };
type ErrorNotice = { title: string; message: string };
type CancelRequest = { appointmentId: string; consulenteName: string; reason: string };
type AlphabetPickerState = { letter: string; people: FoundPerson[] };
type SummaryMode = "date" | "future";
type SummaryCounts = {
  mode: SummaryMode;
  date: string;
  fromDate: string;
  scheduled: number;
  confirmed: number;
  arrived: number;
};

type SettingsDraft = {
  serviceOrderMode: "booking" | "arrival";
  reminderOffsets: string;
  summaryEmail: boolean;
  summaryWhatsapp: boolean;
  summaryViewMode: ViewMode;
  openAcolhimentoOnLogin: boolean;
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
  const [newPerson, setNewPerson] = useState({ fullName: "", email: "", password: "12345678", privacyAccepted: false });
  const [showNewPersonPassword, setShowNewPersonPassword] = useState(false);
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [bookingResult, setBookingResult] = useState<CompletedBooking | null>(null);
  const [successNotice, setSuccessNotice] = useState<SuccessNotice | null>(null);
  const [errorNotice, setErrorNotice] = useState<ErrorNotice | null>(null);
  const [cancelRequest, setCancelRequest] = useState<CancelRequest | null>(null);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("date");
  const [summaryDate, setSummaryDate] = useState("");
  const [summaryOverride, setSummaryOverride] = useState<SummaryCounts | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [entityOverview, setEntityOverview] = useState<Record<string, EntityOverview>>({});
  const [entityOverviewLoading, setEntityOverviewLoading] = useState(false);
  const [entityPage, setEntityPage] = useState(1);
  const [entityCalendar, setEntityCalendar] = useState<EntityCalendarState | null>(null);
  const [consultView, setConsultView] = useState<"entity_day" | "day_entity">("entity_day");
  const [consultStatuses, setConsultStatuses] = useState<ConsultStatus[]>(["confirm", "arrived", "absent", "cancelled"]);
  const [consultPage, setConsultPage] = useState(1);
  const [openAppointmentActions, setOpenAppointmentActions] = useState<Record<string, boolean>>({});
  const [changeSelections, setChangeSelections] = useState<Record<string, string>>({});
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
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
      if (["agendar", "consultar", "entidades", "cadastros", "configuracoes"].includes(open || "")) setModal(open as ModalKind);
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
    arrived: 0,
  };
  const effectiveConsultView = consultView;
  const filteredAppointments = useMemo(() => {
    const appointments = payload?.appointments ?? [];
    if (!consultStatuses.length) return [];

    return appointments.filter((item) => {
      if (item.status === "cancelado") return consultStatuses.includes("cancelled");
      if (item.arrivalStatus === "arrived") return consultStatuses.includes("arrived");
      if (item.arrivalStatus === "absent") return consultStatuses.includes("absent");
      return consultStatuses.includes("confirm");
    });
  }, [consultStatuses, payload?.appointments]);
  const consultPageSize = 2;
  const consultPageCount = Math.max(1, Math.ceil(filteredAppointments.length / consultPageSize));
  const effectiveConsultPage = Math.min(consultPage, consultPageCount);
  const paginatedAppointments = useMemo(
    () => filteredAppointments.slice((effectiveConsultPage - 1) * consultPageSize, effectiveConsultPage * consultPageSize),
    [effectiveConsultPage, filteredAppointments],
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
    return [{ label: acolhimentoDateLabel(payload.selectedDate), appointments: [...paginatedAppointments].sort((a, b) => a.entityName.localeCompare(b.entityName, "pt-BR")) }];
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

  async function refreshSummary(mode: SummaryMode, date = effectiveSummaryDate) {
    setSummaryLoading(true);
    try {
      const result = await postPilot({ action: "summary", mode, date });
      const summary = result.summary && typeof result.summary === "object"
        ? result.summary as SummaryCounts
        : null;
      if (!summary) throw new Error("Resumo não retornado pelo servidor.");
      setSummaryMode(mode);
      if (mode === "date") setSummaryDate(summary.date || date);
      setSummaryOverride(summary);
    } catch (summaryError) {
      setErrorNotice({
        title: "Não foi possível atualizar os indicadores",
        message: summaryError instanceof Error ? summaryError.message : "Tente novamente em instantes.",
      });
    } finally {
      setSummaryLoading(false);
    }
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
      const result = await postPilot({ action: "consulente-alphabet", letter });
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

  async function createPerson(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await postLegacy({
        action: "create-consulente",
        fullName: newPerson.fullName,
        whatsapp: newPersonWhatsapp || phone,
        email: newPerson.email,
        password: newPerson.password,
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
      const result = await postPilot({ action: "book", targetPersonId: foundPerson.id, entityId, appointmentDate: payload.selectedDate, notes }) as BookingResult;
      const selectedDate = payload.selectedDate;
      await load(selectedDate);
      await refreshSummary(summaryMode, summaryMode === "date" ? effectiveSummaryDate : selectedDate);
      setBookingResult({ ...result, whatsapp: bookingWhatsapp });
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
      const result = await postPilot({
        action: "cancel",
        appointmentId: cancelRequest.appointmentId,
        reason,
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

  async function changeEntity(appointmentId: string) {
    const nextEntityId = changeSelections[appointmentId] || "";
    if (!nextEntityId) return;
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({ action: "change-entity", appointmentId, entityId: nextEntityId });
      setMessage(typeof result.message === "string" ? result.message : "Entidade atualizada.");
      await load(payload?.selectedDate);
      await refreshSummary(summaryMode, summaryMode === "date" ? effectiveSummaryDate : payload?.selectedDate);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível trocar a Entidade.");
    } finally {
      setSaving(false);
    }
  }

  function openSettings() {
    if (!payload) return;
    setSettingsDraft({
      serviceOrderMode: payload.settings.serviceOrderMode,
      reminderOffsets: payload.settings.confirmationReminderOffsetsHours.join(", "),
      summaryEmail: payload.receptionPreferences.receptionSummaryChannels.includes("email"),
      summaryWhatsapp: payload.receptionPreferences.receptionSummaryChannels.includes("whatsapp"),
      summaryViewMode: payload.receptionPreferences.receptionSummaryViewMode,
      openAcolhimentoOnLogin: payload.receptionPreferences.receptionOpenAcolhimentoOnLogin,
    });
    setModal("configuracoes");
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!settingsDraft) return;
    setSaving(true);
    setError("");
    try {
      await postPilot({
        action: "save-settings",
        serviceOrderMode: settingsDraft.serviceOrderMode,
        confirmationReminderOffsetsHours: settingsDraft.reminderOffsets,
      });
      await postPilot({
        action: "save-reception-preferences",
        channels: [settingsDraft.summaryEmail ? "email" : "", settingsDraft.summaryWhatsapp ? "whatsapp" : ""].filter(Boolean),
        viewMode: settingsDraft.summaryViewMode,
        openAcolhimentoOnLogin: settingsDraft.openAcolhimentoOnLogin,
      });
      setMessage("");
      await load(payload?.selectedDate);
      setModal(null);
      setSuccessNotice({
        title: "Configurações salvas",
        message: "Configurações do piloto atualizadas com sucesso.",
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar as configurações.");
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
      });
      const successMessage = typeof result.message === "string" ? result.message : "Cadastro e calendário da Entidade atualizados com sucesso.";
      setMessage("");
      setEditEntity({ entityId: "", name: "", description: "", capacity: "4", cavalinhoPersonId: "", mondayOccurrences: [], tuesdayOccurrences: [], active: true });
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
              <ActionButton title="Acolhimento" subtitle="Confirmar, trocar Entidade e registrar chegada" onClick={() => setModal("consultar")} />
            </section>
            <section className="mt-3 rounded-[1.3rem] bg-white p-2 ring-1 ring-[#123D2C]/10">
              <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-end">
                <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">
                  Período dos indicadores
                  <select
                    value={summaryMode}
                    onChange={(event) => void refreshSummary(event.target.value as SummaryMode, effectiveSummaryDate)}
                    className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2 text-xs font-black normal-case tracking-normal text-[#123D2C]"
                  >
                    <option value="date">Data específica</option>
                    <option value="future">Todos os futuros</option>
                  </select>
                </label>
                {summaryMode === "date" ? (
                  <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#2F6B43]">
                    Data
                    <input
                      type="date"
                      min={todaySaoPaulo()}
                      value={effectiveSummaryDate}
                      onChange={(event) => {
                        setSummaryDate(event.target.value);
                        void refreshSummary("date", event.target.value);
                      }}
                      className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-2 text-xs font-black normal-case tracking-normal text-[#123D2C]"
                    />
                  </label>
                ) : (
                  <p className="rounded-xl bg-[#F7FAF2] px-3 py-2 text-xs font-bold text-slate-600">
                    Contando todos os agendamentos a partir de {shortDate(displayedSummary.fromDate)}.
                  </p>
                )}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Summary label="Agendados" value={displayedSummary.scheduled} />
                <Summary label="Confirmados" value={displayedSummary.confirmed} />
                <Summary label="Chegaram" value={displayedSummary.arrived} />
              </div>
              {summaryLoading && <p className="mt-2 text-center text-[11px] font-bold text-slate-500">Atualizando indicadores...</p>}
            </section>
          </>
        )}
      </section>

      {modal && payload && (
        <Modal
          title={modal === "cadastros" && cadastroMode === "entidades" ? "Cadastros · Entidades" : modal === "cadastros" && cadastroMode === "consulentes" ? "Cadastros · Consulentes" : modalTitle(modal)}
          onClose={() => {
            if (modal === "cadastros" && cadastroMode !== "menu") {
              clearPersonSearch();
              setPhone("");
              setCadastroMode("menu");
              return;
            }
            if (modal === "agendar") resetBookingForm();
            setModal(null);
          }}
        >
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
                  <select value={payload.selectedDate} onChange={(event) => { setEntityId(""); void load(event.target.value); }} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                    {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
                  </select>
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
                <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950 ring-1 ring-amber-100">Nenhum cadastro encontrado por esse nome. Para criar um novo cadastro, pesquise pelo WhatsApp com DDD.</p>
              )}

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
                        disabled={Boolean(foundPerson.defaultEntityId && foundPerson.allowDifferentEntity === false)}
                        className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <option value="">Escolha uma Entidade</option>
                        {usableEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.available} vaga(s)</option>)}
                      </select>
                      {foundPerson.defaultEntityId && foundPerson.allowDifferentEntity === false && (
                        <span className="text-xs font-semibold text-slate-500">Entidade definida pelo cadastro deste Consulente.</span>
                      )}
                    </label>
                  ) : (
                    <p className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10">{payload.entityCatalog.find((entity) => entity.id === entityId)?.name || "Escolha uma Entidade acima"}{bookingEntityDateLabel ? ` · ${bookingEntityDateLabel}` : ""}</p>
                  )}
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
                    <option value="day_entity">Dia</option>
                  </select>
                </div>
                <fieldset className="rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">
                  <legend className="px-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#2F6B43]">Status</legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      ["confirm", "Confirmado"],
                      ["arrived", "Chegou"],
                      ["absent", "Não Chegou"],
                      ["cancelled", "Cancelado"],
                    ] as Array<[ConsultStatus, string]>).map(([status, label]) => (
                      <label key={status} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-black ring-1 ${consultStatuses.includes(status) ? "bg-[#E9F2E7] text-[#123D2C] ring-[#2F6B43]/30" : "bg-white text-slate-500 ring-[#123D2C]/10"}`}>
                        <input type="checkbox" checked={consultStatuses.includes(status)} onChange={() => toggleConsultStatus(status)} className="h-4 w-4" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {groupedAppointments.map((group) => (
                <section key={group.label} className="grid gap-2">
                  <h3 className="rounded-xl bg-[#E9F2E7] px-3 py-2 font-black text-[#123D2C]">{group.label}</h3>
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
                              {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void markArrival(appointment.id, "arrived")} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">Chegou</button>}
                              {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void markArrival(appointment.id, "absent")} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 ring-1 ring-amber-100">Não chegou</button>}
                              {appointment.whatsapp && <a href={whatsappHref(appointment.whatsapp, `Olá, ${appointment.consulenteName}. Estou falando pela Recepção do Tucxa sobre seu agendamento.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-[#176A3A] ring-1 ring-[#123D2C]/15">WhatsApp</a>}
                              {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => openCancelAppointment(appointment)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Cancelar</button>}
                            </div>
                            {appointment.status !== "cancelado" && (
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <select value={changeSelections[appointment.id] || ""} onChange={(event) => setChangeSelections((current) => ({ ...current, [appointment.id]: event.target.value }))} className="min-w-0 rounded-xl border border-[#123D2C]/15 bg-white p-2 text-xs font-bold">
                                  <option value="">Trocar Entidade...</option>
                                  {usableEntities.filter((entity) => entity.id !== appointment.entityId).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                                </select>
                                <button type="button" disabled={saving || !changeSelections[appointment.id]} onClick={() => void changeEntity(appointment.id)} className="rounded-xl bg-white px-3 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50">Trocar</button>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </section>
              ))}

              {!filteredAppointments.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhum agendamento para este filtro.</p>}

              {consultPageCount > 1 && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <button type="button" disabled={effectiveConsultPage <= 1} onClick={() => { setConsultPage((current) => Math.max(1, current - 1)); setOpenAppointmentActions({}); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Anterior</button>
                  <span className="text-xs font-black text-[#123D2C]">{effectiveConsultPage} / {consultPageCount}</span>
                  <button type="button" disabled={effectiveConsultPage >= consultPageCount} onClick={() => { setConsultPage((current) => Math.min(consultPageCount, current + 1)); setOpenAppointmentActions({}); }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-40">Próxima</button>
                </div>
              )}
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
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Ordem dos atendimentos
                <select value={settingsDraft.serviceOrderMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, serviceOrderMode: event.target.value as "booking" | "arrival" } : current)} className="rounded-xl border border-[#123D2C]/15 p-3"><option value="booking">Ordem de agendamento</option><option value="arrival">Ordem de chegada</option></select>
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Lembretes/confirmações · antecedência em horas
                <input value={settingsDraft.reminderOffsets} onChange={(event) => setSettingsDraft((current) => current ? { ...current, reminderOffsets: event.target.value } : current)} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Ex.: 48, 24, 4" />
                <span className="text-xs font-semibold text-slate-500">Informe até 8 momentos, separados por vírgula. Os avisos do piloto serão enviados pelo WhatsApp/BotConversa.</span>
              </label>
              <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Ao entrar no sistema</p>
                <div className="mt-2">
                  <Toggle
                    checked={settingsDraft.openAcolhimentoOnLogin}
                    onChange={(checked) => setSettingsDraft((current) => current ? { ...current, openAcolhimentoOnLogin: checked } : current)}
                    label="Abrir Acolhimento automaticamente na próxima data de atendimento"
                  />
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Esta preferência é pessoal: cada integrante da Recepção decide se deseja abrir o Acolhimento após o próprio login.</p>
              </section>
              <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Receber resumo agendamentos</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Toggle checked={settingsDraft.summaryEmail} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, summaryEmail: checked } : current)} label="E-mail" />
                  <Toggle checked={settingsDraft.summaryWhatsapp} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, summaryWhatsapp: checked } : current)} label="WhatsApp" />
                </div>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#2F6B43]">Ordenação</p>
                <select value={settingsDraft.summaryViewMode === "both" ? "entity_day" : settingsDraft.summaryViewMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, summaryViewMode: event.target.value as ViewMode } : current)} className="mt-1 w-full rounded-xl border border-[#123D2C]/15 p-3"><option value="entity_day">Entidade</option><option value="day_entity">Dia</option></select>
              </section>
              <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar configurações"}</button>
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
          onClose={() => !saving && setCancelRequest(null)}
          onSubmit={submitCancellation}
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
              href={whatsappHref(bookingResult.whatsapp, `Olá, ${bookingResult.appointment.personName}. Seu atendimento no Tucxa foi agendado para ${shortDate(bookingResult.appointment.appointmentDate)}, com ${bookingResult.appointment.entityName}. Confirme sua presença: ${bookingResult.confirmation.url}`)}
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
              {people.map((person) => (
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
        </div>
      </section>
    </div>
  );
}

function CancelAppointmentPopup({
  request,
  saving,
  onChangeReason,
  onClose,
  onSubmit,
}: {
  request: CancelRequest;
  saving: boolean;
  onChangeReason: (reason: string) => void;
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
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
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
    <div className="fixed inset-0 z-[270] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
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

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10"><span className="block text-lg font-black text-[#123D2C]">{value}</span><span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{label}</span></div>;
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
  if (modal === "consultar") return "Acolhimento";
  if (modal === "entidades") return "Disponibilidade das Entidades";
  if (modal === "cadastros") return "Cadastros";
  if (modal === "configuracoes") return "Configurações da Recepção";
  return "Como funciona";
}
