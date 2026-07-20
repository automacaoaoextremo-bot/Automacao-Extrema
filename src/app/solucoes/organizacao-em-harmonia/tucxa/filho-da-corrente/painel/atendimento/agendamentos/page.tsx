"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Mode = "self" | "reception";
type ModalKind = "calendar" | "attendance" | "entities" | "entityInfo" | "existing" | "confirmSelf" | "lookup" | "confirmReception" | "success" | null;

type Profile = {
  fullName: string;
  whatsapp: string;
  email: string;
  groups: Array<"grupo-1" | "grupo-2">;
  canReception: boolean;
};

type Period = {
  id: string;
  eventId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  label: string;
  weekday: "segunda" | "terca" | "quarta" | "quinta";
  audience: Mode;
  group: "grupo-1" | "grupo-2" | null;
  eventTitle: string;
  eventKind: "regular-thursday" | "special-all-groups" | "reception-regular" | "reception-wednesday";
  attendanceRequired: boolean;
  allowEntityAppointment: boolean;
};

type Entity = {
  id: string;
  name: string | null;
  line: string | null;
  entity_type: string | null;
  usual_days: string[] | null;
  usual_materials: string | null;
  daily_capacity: number | null;
  appointment_enabled: boolean | null;
  appointment_notes: string | null;
};

type Availability = {
  periodId: string;
  entityId: string;
  capacity: number;
  booked: number;
  available: number;
  nextOrder: number;
};

type ExistingAppointment = {
  id: string;
  periodId: string;
  appointmentDate: string;
  appointmentTime: string;
  entityId: string | null;
  entityName: string;
  order: number | null;
  status: string;
  canEdit: boolean;
  editBlockedReason: string;
};

type AttendanceConfirmation = {
  id: string;
  periodId: string;
  status: "confirmed" | "cannot_attend";
  responded_at: string | null;
  checked_in_at: string | null;
};

type Payload = {
  profile: Profile;
  settings: {
    appointmentEditCutoffMinutes: number;
    appointmentReturnGuidance: string;
  };
  periods: Period[];
  entities: Entity[];
  availability: Availability[];
  existingAppointments: ExistingAppointment[];
  attendanceConfirmations: AttendanceConfirmation[];
};

type FoundPerson = {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string;
};

type Confirmation = {
  appointmentDate: string;
  appointmentTime: string;
  entityName: string;
  order: number;
  personName?: string;
  changed?: boolean;
  weekday?: string;
};

type AccessDelivery = {
  login: string;
  authEmail?: string;
  temporaryPassword?: string;
  loginUrl: string;
  whatsappUrl: string;
  emailSent: boolean;
};

const LOGIN_PATH = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
const API_PATH = "/api/organizacao-em-harmonia/filhos-corrente/agendamentos";
const PRIVACY_PATH = "/solucoes/organizacao-em-harmonia/tucxa/consulente/privacidade";

function dateFromIso(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

function monthDateFromKey(key: string) {
  return dateFromIso(`${key}-01`);
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(date: Date) {
  const value = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function longDate(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateFromIso(value));
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function compactDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(dateFromIso(value)).replaceAll(".", "");
}

function availabilityKey(periodId: string, entityId: string) {
  return `${periodId}::${entityId}`;
}

function tone(period: Period) {
  if (period.weekday === "segunda") return "border-[#D9827B] bg-[#FCE3E0] text-[#5C211E]";
  if (period.weekday === "terca") return "border-[#6BAED6] bg-[#E4F1FB] text-[#17445B]";
  if (period.weekday === "quarta") return "border-[#C69A45] bg-[#FFF4D6] text-[#654311]";
  return period.group === "grupo-1"
    ? "border-[#73A978] bg-[#E5F2DF] text-[#234D2C]"
    : "border-[#4D9BC3] bg-[#DDF0FA] text-[#17445B]";
}

function groupLabel(groups: Profile["groups"]) {
  if (groups.length === 2) return "Grupos 1 e 2";
  if (groups[0] === "grupo-1") return "Grupo 1 · 1ª e 3ª quinta";
  if (groups[0] === "grupo-2") return "Grupo 2 · 2ª e 4ª quinta";
  return "Grupo ainda não definido";
}

export default function AgendamentosFilhoCorrentePage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [mode, setMode] = useState<Mode>("self");
  const [modal, setModal] = useState<ModalKind>(null);
  const [month, setMonth] = useState(() => new Date());
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [infoEntity, setInfoEntity] = useState<Entity | null>(null);
  const [selectedExisting, setSelectedExisting] = useState<ExistingAppointment | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [lookupWhatsapp, setLookupWhatsapp] = useState("");
  const [lookupDone, setLookupDone] = useState(false);
  const [foundPerson, setFoundPerson] = useState<FoundPerson | null>(null);
  const [newPerson, setNewPerson] = useState({ fullName: "", email: "", password: "", confirmPassword: "", privacyAccepted: false });
  const [createdAccess, setCreatedAccess] = useState<AccessDelivery | null>(null);
  const [delivery, setDelivery] = useState<AccessDelivery | null>(null);
  const [recommendedByEntityId, setRecommendedByEntityId] = useState("");
  const [ageAtAppointment, setAgeAtAppointment] = useState("");
  const [treatmentNeed, setTreatmentNeed] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const authorizedFetch = useCallback(async (init?: RequestInit) => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
      throw new Error("Sua sessão expirou.");
    }
    const response = await fetch(API_PATH, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
    const result = await response.json();
    if (response.status === 401) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
      throw new Error("Sua sessão expirou.");
    }
    if (!response.ok) {
      const routeError = new Error(result.error || "Não foi possível concluir a ação.");
      Object.assign(routeError, { requestId: result.requestId || "" });
      throw routeError;
    }
    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setRequestId("");
    try {
      const result = await authorizedFetch();
      const next = result as Payload;
      setPayload(next);
      const preferredMode: Mode = next.profile.groups.length ? "self" : next.profile.canReception ? "reception" : "self";
      setMode((current) => current === "reception" && !next.profile.canReception ? preferredMode : current);
      const first = next.periods.find((period) => period.audience === preferredMode);
      if (first) setMonth(monthDateFromKey(first.appointmentDate.slice(0, 7)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar agendamentos.");
      setRequestId(String((err as { requestId?: string })?.requestId || ""));
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const availabilityMap = useMemo(() => {
    const map = new Map<string, Availability>();
    (payload?.availability ?? []).forEach((item) => map.set(availabilityKey(item.periodId, item.entityId), item));
    return map;
  }, [payload?.availability]);

  const existingMap = useMemo(() => {
    const map = new Map<string, ExistingAppointment>();
    (payload?.existingAppointments ?? []).forEach((item) => map.set(item.periodId, item));
    return map;
  }, [payload?.existingAppointments]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceConfirmation>();
    (payload?.attendanceConfirmations ?? []).forEach((item) => map.set(item.periodId, item));
    return map;
  }, [payload?.attendanceConfirmations]);

  const periodsForMode = useMemo(
    () => (payload?.periods ?? []).filter((period) => period.audience === mode),
    [mode, payload?.periods],
  );

  const eligibleMonthKeys = useMemo(() => {
    const values = periodsForMode
      .filter((period) => {
        if (mode === "self") return true;
        return (payload?.entities ?? []).some((entity) => (availabilityMap.get(availabilityKey(period.id, entity.id))?.available ?? 0) > 0);
      })
      .map((period) => period.appointmentDate.slice(0, 7));
    return [...new Set(values)].sort();
  }, [availabilityMap, mode, payload?.entities, periodsForMode]);

  const currentMonthKey = monthKey(month);
  const currentMonthIndex = Math.max(0, eligibleMonthKeys.indexOf(currentMonthKey));
  const visibleMonthKeys = eligibleMonthKeys.slice(currentMonthIndex, currentMonthIndex + (mode === "self" ? 2 : 1));
  const previousMonth = currentMonthIndex > 0 ? eligibleMonthKeys[Math.max(0, currentMonthIndex - (mode === "self" ? 2 : 1))] : "";
  const nextMonth = currentMonthIndex + visibleMonthKeys.length < eligibleMonthKeys.length
    ? eligibleMonthKeys[currentMonthIndex + visibleMonthKeys.length]
    : "";

  const visibleMonthSections = useMemo(() => visibleMonthKeys.map((key) => {
    const grouped = new Map<string, Period[]>();
    periodsForMode
      .filter((period) => period.appointmentDate.startsWith(key))
      .filter((period) => {
        if (mode === "self") return true;
        return (payload?.entities ?? []).some((entity) => (availabilityMap.get(availabilityKey(period.id, entity.id))?.available ?? 0) > 0);
      })
      .forEach((period) => grouped.set(period.appointmentDate, [...(grouped.get(period.appointmentDate) ?? []), period]));
    return {
      key,
      title: monthTitle(monthDateFromKey(key)),
      dates: [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)),
    };
  }), [availabilityMap, mode, payload?.entities, periodsForMode, visibleMonthKeys]);

  const selectedPeriod = periodsForMode.find((period) => period.id === selectedPeriodId) ?? null;
  const selectedEntity = (payload?.entities ?? []).find((entity) => entity.id === selectedEntityId) ?? null;
  const selectedAvailability = selectedPeriod && selectedEntity
    ? availabilityMap.get(availabilityKey(selectedPeriod.id, selectedEntity.id))
    : undefined;

  function entitiesForPeriod(period: Period) {
    return (payload?.entities ?? [])
      .map((entity) => ({ entity, availability: availabilityMap.get(availabilityKey(period.id, entity.id)) }))
      .filter((item): item is { entity: Entity; availability: Availability } => Boolean(item.availability))
      .sort((left, right) => (left.entity.name || "").localeCompare(right.entity.name || "", "pt-BR", { sensitivity: "base" }));
  }

  function openMode(nextMode: Mode) {
    if (nextMode === "reception" && !payload?.profile.canReception) return;
    setMode(nextMode);
    setEditingAppointmentId("");
    const firstMonth = payload?.periods.find((period) => period.audience === nextMode)?.appointmentDate.slice(0, 7);
    if (firstMonth) setMonth(monthDateFromKey(firstMonth));
    setModal("calendar");
  }

  function openPeriod(period: Period) {
    const existing = mode === "self" ? existingMap.get(period.id) : undefined;
    if (existing && !editingAppointmentId) {
      setSelectedExisting(existing);
      setModal("existing");
      return;
    }
    setSelectedPeriodId(period.id);
    setSelectedEntityId("");
    if (mode === "self" && !editingAppointmentId) {
      setModal("attendance");
      return;
    }
    setModal("entities");
  }

  function chooseEntity(entity: Entity, availability: Availability) {
    if (availability.available <= 0) return;
    setSelectedEntityId(entity.id);
    setNotes("");
    setIdempotencyKey(crypto.randomUUID());
    if (mode === "self") setModal("confirmSelf");
    else {
      setLookupDone(false);
      setFoundPerson(null);
      setLookupWhatsapp("");
      setCreatedAccess(null);
      setDelivery(null);
      setRecommendedByEntityId("");
      setAgeAtAppointment("");
      setTreatmentNeed("");
      setNewPerson({ fullName: "", email: "", password: "", confirmPassword: "", privacyAccepted: false });
      setModal("lookup");
    }
  }

  function cancelEditing() {
    setEditingAppointmentId("");
    setSelectedPeriodId("");
    setSelectedEntityId("");
    setSelectedExisting(null);
    setModal(null);
  }

  async function post(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setRequestId("");
    try {
      return await authorizedFetch({ method: "POST", body: JSON.stringify(body) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
      setRequestId(String((err as { requestId?: string })?.requestId || ""));
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function setAttendance(status: "confirmed" | "cannot_attend") {
    if (!selectedPeriod) return;
    try {
      await post({ action: "set-attendance", periodId: selectedPeriod.id, status });
      await load();
      if (status === "confirmed" && selectedPeriod.allowEntityAppointment) {
        setModal("entities");
      } else {
        setModal("calendar");
      }
    } catch {
      // Mensagem exibida no modal.
    }
  }

  async function confirmSelf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPeriod || !selectedEntity) return;
    try {
      const result = await post({
        action: editingAppointmentId ? "reschedule-self" : "book-self",
        appointmentId: editingAppointmentId || undefined,
        periodId: selectedPeriod.id,
        entityId: selectedEntity.id,
        notes,
        idempotencyKey,
      });
      setConfirmation({ ...result.appointment, changed: Boolean(editingAppointmentId) });
      setEditingAppointmentId("");
      setModal("success");
      await load();
    } catch {
      // Mensagem exibida no modal.
    }
  }

  async function searchConsulente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupDone(false);
    setFoundPerson(null);
    try {
      const result = await post({ action: "search-consulente", whatsapp: lookupWhatsapp });
      setLookupDone(true);
      setFoundPerson(result.found ? result.person as FoundPerson : null);
    } catch {
      // Mensagem exibida no modal.
    }
  }

  async function createConsulente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPerson.password !== newPerson.confirmPassword) {
      setError("As senhas temporárias não conferem.");
      return;
    }
    try {
      const result = await post({
        action: "create-consulente",
        whatsapp: lookupWhatsapp,
        fullName: newPerson.fullName,
        email: newPerson.email,
        password: newPerson.password,
        privacyAccepted: newPerson.privacyAccepted,
      });
      setFoundPerson(result.person as FoundPerson);
      setCreatedAccess((result.access || null) as AccessDelivery | null);
      setModal("confirmReception");
    } catch {
      // Mensagem exibida no modal.
    }
  }

  async function confirmReception() {
    if (!selectedPeriod || !selectedEntity || !foundPerson) return;
    try {
      const result = await post({
        action: "book-reception",
        periodId: selectedPeriod.id,
        entityId: selectedEntity.id,
        targetPersonId: foundPerson.id,
        notes,
        idempotencyKey,
        temporaryPassword: createdAccess?.temporaryPassword || undefined,
        recommendedByEntityId: selectedPeriod.weekday === "quarta" ? recommendedByEntityId : undefined,
        ageAtAppointment: selectedPeriod.weekday === "quarta" ? Number(ageAtAppointment) : undefined,
        treatmentNeed: selectedPeriod.weekday === "quarta" ? treatmentNeed : undefined,
      });
      setConfirmation(result.appointment as Confirmation);
      setDelivery((result.delivery || createdAccess || null) as AccessDelivery | null);
      setModal("success");
      await load();
    } catch {
      // Mensagem exibida no modal.
    }
  }

  async function cancelExisting() {
    if (!selectedExisting) return;
    if (!window.confirm("Excluir este agendamento? A vaga será liberada e o histórico será preservado.")) return;
    try {
      await post({ action: "cancel-self", appointmentId: selectedExisting.id });
      setSelectedExisting(null);
      setModal(null);
      await load();
    } catch {
      // Mensagem exibida no modal.
    }
  }

  function startEditing() {
    if (!selectedExisting?.canEdit) return;
    setEditingAppointmentId(selectedExisting.id);
    setSelectedExisting(null);
    setMode("self");
    setModal("calendar");
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Agendamentos do Atendimento" />
      <section className="mx-auto max-w-5xl px-3 py-4 sm:px-6 lg:px-8">
        <article className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl sm:p-7">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">Escolha somente os dias que fazem sentido para sua atuação.</h1>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#EEF7EA] sm:leading-6">
            Seu grupo define as quintas do próprio atendimento. A opção de agendar Consulentes aparece somente para a Recepção.
          </p>
          {payload && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#123D2C]">
              <span className="rounded-full bg-white px-3 py-1.5">{groupLabel(payload.profile.groups)}</span>
              {payload.profile.canReception && <span className="rounded-full bg-[#DDF0FA] px-3 py-1.5 text-[#17445B]">Função Recepção ativa</span>}
            </div>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={loading || !payload?.profile.groups.length}
              onClick={() => openMode("self")}
              className="min-h-14 rounded-2xl bg-white px-4 py-3 font-black text-[#123D2C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Meu atendimento de quinta
            </button>
            {payload?.profile.canReception && (
              <button type="button" onClick={() => openMode("reception")} className="min-h-14 rounded-2xl bg-[#1B563F] px-4 py-3 font-black text-white ring-1 ring-white/30">
                Agendar Consulente
              </button>
            )}
          </div>
          {!loading && payload && !payload.profile.groups.length && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">Seu Grupo 1 ou Grupo 2 ainda precisa ser definido no cadastro.</p>
          )}
          {loading && <p className="mt-3 text-sm font-bold text-[#CFE2C7]">Carregando seus grupos, funções e períodos...</p>}
          {error && !modal && <ErrorBox message={error} requestId={requestId} />}
        </article>
      </section>

      {modal === "calendar" && (
        <Modal
          title={editingAppointmentId ? "Escolha o novo período" : mode === "self" ? "Meu atendimento" : "Agendar Consulente"}
          onClose={() => editingAppointmentId ? cancelEditing() : setModal(null)}
          fullScreenMobile
          bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-5"
        >
          {editingAppointmentId && (
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
              <p className="text-xs font-black text-amber-900">Escolha a nova quinta-feira e a entidade.</p>
              <button type="button" onClick={cancelEditing} className="min-h-10 shrink-0 rounded-xl bg-white px-3 text-xs font-black text-red-700 ring-1 ring-red-200">Cancelar edição</button>
            </div>
          )}
          <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2">
            <button type="button" disabled={!previousMonth} onClick={() => previousMonth && setMonth(monthDateFromKey(previousMonth))} className="min-h-11 rounded-xl bg-white px-2 text-xs font-black ring-1 ring-[#123D2C]/15 disabled:opacity-30">← Anterior</button>
            <div className="min-w-0 text-center">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-[#2F6B43]">Somente opções permitidas</p>
              <h2 className="text-sm font-black text-[#123D2C] sm:text-lg">{mode === "self" ? "Dois meses por vez" : visibleMonthSections[0]?.title || "Próximos períodos"}</h2>
            </div>
            <button type="button" disabled={!nextMonth} onClick={() => nextMonth && setMonth(monthDateFromKey(nextMonth))} className="min-h-11 rounded-xl bg-white px-2 text-xs font-black ring-1 ring-[#123D2C]/15 disabled:opacity-30">Próximo →</button>
          </div>
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {visibleMonthSections.map((section) => (
              <section key={section.key} className="rounded-2xl bg-white p-2 ring-1 ring-[#123D2C]/10">
                <h3 className="px-1 pb-2 text-center text-base font-black text-[#123D2C]">{section.title}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {section.dates.map(([date, periods]) => (
                    <div key={date} className="rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">
                      <p className="text-xs font-black capitalize text-[#123D2C]">{compactDate(date)}</p>
                      <div className="mt-1.5 grid gap-1.5">
                        {periods.map((period) => {
                          const existing = mode === "self" ? existingMap.get(period.id) : undefined;
                          const attendance = attendanceMap.get(period.id);
                          const subtitle = existing
                            ? "✓ Você já está agendado"
                            : mode === "self" && attendance?.status === "confirmed"
                              ? "✓ Presença confirmada"
                              : mode === "self" && attendance?.status === "cannot_attend"
                                ? "Não poderei comparecer"
                                : period.eventKind === "special-all-groups"
                                  ? "Todos os grupos"
                                  : period.group === "grupo-1"
                                    ? "Grupo 1"
                                    : period.group === "grupo-2"
                                      ? "Grupo 2"
                                      : period.weekday === "quarta"
                                        ? "Quarta-feira · Recepção"
                                        : period.weekday === "segunda"
                                          ? "Segunda-feira"
                                          : "Terça-feira";
                          return (
                            <button key={period.id} type="button" onClick={() => openPeriod(period)} className={`min-h-12 rounded-xl border px-2 py-2 text-left text-xs font-black leading-4 ${existing || attendance?.status === "confirmed" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : attendance?.status === "cannot_attend" ? "border-slate-300 bg-slate-100 text-slate-600" : tone(period)}`}>
                              {period.eventKind === "special-all-groups" && <span className="mb-0.5 block truncate text-[0.58rem] uppercase tracking-wide">Evento especial</span>}
                              <span className="block">{period.label}</span>
                              <span className="mt-0.5 block text-[0.62rem] font-bold">{subtitle}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {!visibleMonthSections.length && <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Não há períodos disponíveis.</p>}
          </div>
        </Modal>
      )}

      {modal === "attendance" && selectedPeriod && (
        <Modal title="Confirmar presença" onClose={() => setModal("calendar")}>
          <div className={`rounded-xl border px-3 py-2 ${tone(selectedPeriod)}`}>
            <p className="text-sm font-black">{selectedPeriod.eventTitle}</p>
            <p className="mt-1 text-xs font-bold">{longDate(selectedPeriod.appointmentDate)} · {selectedPeriod.label}</p>
            {selectedPeriod.eventKind === "special-all-groups" && <p className="mt-1 text-xs font-black">Evento para todos os Filhos da Corrente</p>}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">Confirme sua presença para substituir o registro no caderno da recepção.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={saving} onClick={() => void setAttendance("confirmed")} className="min-h-12 rounded-xl bg-[#123D2C] px-4 font-black text-white disabled:opacity-60">Confirmar presença</button>
            <button type="button" disabled={saving} onClick={() => void setAttendance("cannot_attend")} className="min-h-12 rounded-xl bg-slate-100 px-4 font-black text-slate-700 ring-1 ring-slate-200 disabled:opacity-60">Não poderei comparecer</button>
          </div>
          {selectedPeriod.allowEntityAppointment && (
            <button type="button" onClick={() => setModal("entities")} className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 font-black text-[#123D2C] ring-1 ring-[#123D2C]/20">Quero atendimento com uma entidade</button>
          )}
          {error && <div className="mt-3"><ErrorBox message={error} requestId={requestId} /></div>}
        </Modal>
      )}

      {modal === "entities" && selectedPeriod && (
        <Modal title="Escolha uma entidade" onClose={() => setModal("calendar")}>
          <div className={`rounded-xl border px-3 py-2 ${tone(selectedPeriod)}`}>
            <p className="text-xs font-black leading-5 sm:text-sm">{longDate(selectedPeriod.appointmentDate)} · <span className="whitespace-nowrap">{selectedPeriod.label}</span></p>
          </div>
          <div className="mt-2 grid gap-1.5">
            {entitiesForPeriod(selectedPeriod).map(({ entity, availability }) => {
              const hasVacancy = availability.available > 0;
              return (
                <article key={entity.id} className="rounded-xl bg-[#F7FAF2] px-2.5 py-2 ring-1 ring-[#123D2C]/10">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-black leading-4 text-[#123D2C] sm:text-base sm:leading-5">{entity.name}</h3>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.62rem] font-black ring-1 ${hasVacancy ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-red-50 text-red-700 ring-red-100"}`}>{hasVacancy ? "Vaga disponível" : "Sem vaga disponível"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button type="button" onClick={() => { setInfoEntity(entity); setModal("entityInfo"); }} className="min-h-10 rounded-lg bg-white px-2.5 text-[0.7rem] font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">+ Infos</button>
                      <button type="button" disabled={!hasVacancy} onClick={() => chooseEntity(entity, availability)} className="min-h-10 rounded-lg bg-[#123D2C] px-2.5 text-[0.7rem] font-black text-white disabled:bg-slate-300">Escolher</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Modal>
      )}

      {modal === "entityInfo" && infoEntity && (
        <Modal title={infoEntity.name || "Entidade"} onClose={() => setModal("entities")}>
          <div className="grid gap-2 text-sm font-semibold text-slate-700">
            <CompactPair leftLabel="Linha" leftValue={infoEntity.line || "Não informada"} rightLabel="Tipo" rightValue={infoEntity.entity_type || "Não informado"} />
            <CompactPair leftLabel="Dias" leftValue={(infoEntity.usual_days ?? []).join(", ") || "Não definidos"} rightLabel="Capacidade" rightValue={`${Math.max(1, Number(infoEntity.daily_capacity ?? 1))} atendimento(s)`} />
            {infoEntity.usual_materials && <Info label="Materiais/apetrechos">{infoEntity.usual_materials}</Info>}
            {infoEntity.appointment_notes && <Info label="Orientações">{infoEntity.appointment_notes}</Info>}
          </div>
        </Modal>
      )}

      {modal === "existing" && selectedExisting && (
        <Modal title="Você já está agendado" onClose={() => setModal("calendar")}>
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-900 ring-1 ring-emerald-100">Já consta um atendimento ativo neste período.</p>
          <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-700">
            <CompactPair leftLabel="Data" leftValue={longDate(selectedExisting.appointmentDate)} rightLabel="Período" rightValue={selectedExisting.appointmentTime} />
            <CompactPair leftLabel="Entidade" leftValue={selectedExisting.entityName} rightLabel="Ordem" rightValue={selectedExisting.order ?? "A confirmar"} />
          </div>
          {!selectedExisting.canEdit && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{selectedExisting.editBlockedReason}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={!selectedExisting.canEdit} onClick={startEditing} className="min-h-12 rounded-xl bg-[#123D2C] px-3 text-sm font-black text-white disabled:bg-slate-300">Editar</button>
            <button type="button" disabled={saving} onClick={() => void cancelExisting()} className="min-h-12 rounded-xl bg-red-50 px-3 text-sm font-black text-red-700 ring-1 ring-red-100">Excluir</button>
          </div>
        </Modal>
      )}

      {modal === "confirmSelf" && selectedPeriod && selectedEntity && selectedAvailability && payload && (
        <Modal title={editingAppointmentId ? "Confirmar alteração" : "Confirmar atendimento"} onClose={() => setModal("entities")}>
          <form onSubmit={confirmSelf} className="grid gap-3">
            <CompactPair leftLabel="Data" leftValue={longDate(selectedPeriod.appointmentDate)} rightLabel="Período" rightValue={selectedPeriod.label} />
            <CompactPair leftLabel="Entidade" leftValue={selectedEntity.name || "Entidade"} rightLabel="Ordem prevista" rightValue={selectedAvailability.nextOrder} />
            <label className="grid gap-1"><span className="text-sm font-black text-[#123D2C]">Observação opcional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-xl border border-[#123D2C]/15 p-3" /></label>
            {error && <ErrorBox message={error} requestId={requestId} />}
            <button type="submit" disabled={saving} className="min-h-13 rounded-xl bg-[#123D2C] px-4 font-black text-white disabled:opacity-60">{saving ? "Confirmando..." : editingAppointmentId ? "Confirmar alteração" : "Confirmar atendimento"}</button>
          </form>
        </Modal>
      )}

      {modal === "lookup" && selectedPeriod && selectedEntity && (
        <Modal title="Identificar o Consulente" onClose={() => setModal("entities")}>
          <CompactPair leftLabel="Data e período" leftValue={`${longDate(selectedPeriod.appointmentDate)} · ${selectedPeriod.label}`} rightLabel="Entidade" rightValue={selectedEntity.name || "Entidade"} />
          <form onSubmit={searchConsulente} className="mt-3 grid gap-2">
            <label className="grid gap-1"><span className="text-sm font-black text-[#123D2C]">WhatsApp do Consulente</span><input value={lookupWhatsapp} onChange={(event) => setLookupWhatsapp(event.target.value)} inputMode="tel" className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="(19) 99999-9999" required /></label>
            <button type="submit" disabled={saving} className="min-h-12 rounded-xl bg-[#123D2C] px-4 font-black text-white disabled:opacity-60">{saving ? "Buscando..." : "Buscar cadastro"}</button>
          </form>
          {lookupDone && foundPerson && (
            <section className="mt-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <p className="font-black text-emerald-900">Cadastro localizado</p>
              <p className="mt-1 text-sm font-semibold text-emerald-900">{foundPerson.fullName}<br />{foundPerson.whatsapp}<br />{foundPerson.email}</p>
              <button type="button" onClick={() => setModal("confirmReception")} className="mt-3 min-h-11 w-full rounded-xl bg-[#123D2C] px-4 font-black text-white">Confirmar pessoa</button>
            </section>
          )}
          {lookupDone && !foundPerson && (
            <form onSubmit={createConsulente} className="mt-3 grid gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
              <p className="text-sm font-black text-amber-900">Cadastro não encontrado. Preencha os dados mínimos.</p>
              <input value={newPerson.fullName} onChange={(event) => setNewPerson((current) => ({ ...current, fullName: event.target.value }))} className="rounded-xl border border-amber-200 bg-white p-3" placeholder="Nome completo" required />
              <input value={newPerson.email} onChange={(event) => setNewPerson((current) => ({ ...current, email: event.target.value }))} type="email" className="rounded-xl border border-amber-200 bg-white p-3" placeholder="E-mail opcional" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newPerson.password} onChange={(event) => setNewPerson((current) => ({ ...current, password: event.target.value }))} type="password" minLength={8} className="rounded-xl border border-amber-200 bg-white p-3" placeholder="Senha temporária" required />
                <input value={newPerson.confirmPassword} onChange={(event) => setNewPerson((current) => ({ ...current, confirmPassword: event.target.value }))} type="password" minLength={8} className="rounded-xl border border-amber-200 bg-white p-3" placeholder="Confirmar senha" required />
              </div>
              <p className="text-xs font-semibold text-amber-900">A senha será enviada com o link de acesso. Oriente a pessoa a trocá-la no primeiro acesso.</p>
              <label className="flex items-start gap-2 rounded-xl bg-white p-3 text-xs font-semibold leading-5 text-slate-700 ring-1 ring-amber-200">
                <input type="checkbox" checked={newPerson.privacyAccepted} onChange={(event) => setNewPerson((current) => ({ ...current, privacyAccepted: event.target.checked }))} className="mt-1 h-4 w-4" required />
                <span>A pessoa está ciente do tratamento dos dados para cadastro e agendamento, conforme o <a href={PRIVACY_PATH} target="_blank" className="font-black underline">Aviso de Privacidade</a>.</span>
              </label>
              <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#123D2C] px-4 font-black text-white disabled:opacity-60">Cadastrar e continuar</button>
            </form>
          )}
          {error && <div className="mt-3"><ErrorBox message={error} requestId={requestId} /></div>}
        </Modal>
      )}

      {modal === "confirmReception" && selectedPeriod && selectedEntity && selectedAvailability && foundPerson && (
        <Modal title="Confirmar agendamento" onClose={() => setModal("lookup")}>
          <div className="grid gap-2 text-sm font-semibold text-slate-700">
            <CompactPair leftLabel="Consulente" leftValue={foundPerson.fullName} rightLabel="WhatsApp" rightValue={foundPerson.whatsapp} />
            <CompactPair leftLabel="Data" leftValue={longDate(selectedPeriod.appointmentDate)} rightLabel="Período" rightValue={selectedPeriod.label} />
            <CompactPair leftLabel="Entidade" leftValue={selectedEntity.name || "Entidade"} rightLabel="Ordem prevista" rightValue={selectedAvailability.nextOrder} />
            {selectedPeriod.weekday === "quarta" && (
              <div className="grid gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
                <p className="text-sm font-black text-amber-900">Dados obrigatórios do atendimento de quarta-feira</p>
                <label className="grid gap-1"><span className="text-xs font-black text-[#123D2C]">Entidade que recomendou/encaminhou</span><select value={recommendedByEntityId} onChange={(event) => setRecommendedByEntityId(event.target.value)} className="rounded-xl border border-amber-200 bg-white p-3" required><option value="">Escolha</option>{(payload?.entities ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="grid gap-1"><span className="text-xs font-black text-[#123D2C]">Idade da pessoa</span><input value={ageAtAppointment} onChange={(event) => setAgeAtAppointment(event.target.value)} type="number" min={0} max={120} className="rounded-xl border border-amber-200 bg-white p-3" required /></label>
                <label className="grid gap-1"><span className="text-xs font-black text-[#123D2C]">Necessidade do atendimento</span><textarea value={treatmentNeed} onChange={(event) => setTreatmentNeed(event.target.value)} className="min-h-24 rounded-xl border border-amber-200 bg-white p-3" placeholder="Descreva apenas o necessário para organizar o atendimento." required /></label>
              </div>
            )}
            <label className="grid gap-1"><span className="text-sm font-black text-[#123D2C]">Observação opcional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-xl border border-[#123D2C]/15 p-3" /></label>
          </div>
          {error && <div className="mt-3"><ErrorBox message={error} requestId={requestId} /></div>}
          <button type="button" disabled={saving} onClick={() => void confirmReception()} className="mt-3 min-h-13 w-full rounded-xl bg-[#123D2C] px-4 font-black text-white disabled:opacity-60">{saving ? "Confirmando..." : "Confirmar agendamento"}</button>
        </Modal>
      )}

      {modal === "success" && confirmation && (
        <Modal title={confirmation.changed ? "Atendimento alterado" : "Agendamento confirmado"} onClose={() => setModal(null)}>
          <p className="rounded-xl bg-emerald-50 p-3 font-black text-emerald-900 ring-1 ring-emerald-100">{confirmation.changed ? "A alteração foi confirmada." : "O agendamento foi confirmado."}</p>
          <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-700">
            {confirmation.personName && <Info label="Consulente">{confirmation.personName}</Info>}
            <CompactPair leftLabel="Data" leftValue={longDate(confirmation.appointmentDate)} rightLabel="Período" rightValue={confirmation.appointmentTime} />
            <CompactPair leftLabel="Entidade" leftValue={confirmation.entityName} rightLabel="Ordem" rightValue={confirmation.order} />
          </div>
          {delivery?.whatsappUrl && (
            <a href={delivery.whatsappUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#25D366] px-4 text-center font-black text-[#073B1D]">Enviar acesso e agendamento pelo WhatsApp</a>
          )}
          {delivery?.emailSent && <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">As informações também foram enviadas por e-mail.</p>}
          <button type="button" onClick={() => setModal(null)} className="mt-3 min-h-12 w-full rounded-xl bg-[#123D2C] px-4 font-black text-white">Fechar</button>
        </Modal>
      )}
    </main>
  );
}

function ErrorBox({ message, requestId }: { message: string; requestId: string }) {
  return <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100"><p>{message}</p>{requestId && <p className="mt-1 text-xs">Código para suporte: {requestId}</p>}</div>;
}

function CompactPair({ leftLabel, leftValue, rightLabel, rightValue }: { leftLabel: string; leftValue: ReactNode; rightLabel: string; rightValue: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] gap-2 rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
      <div className="min-w-0"><p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#2F6B43]">{leftLabel}</p><div className="mt-0.5 break-words font-bold">{leftValue}</div></div>
      <div className="min-w-0"><p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#2F6B43]">{rightLabel}</p><div className="mt-0.5 break-words font-bold">{rightValue}</div></div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <div className="rounded-xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10"><p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#2F6B43]">{label}</p><div className="mt-0.5 break-words font-bold">{children}</div></div>;
}

function Modal({ title, children, onClose, fullScreenMobile = false, bodyClassName = "overflow-y-auto p-3 sm:p-4" }: { title: string; children: ReactNode; onClose: () => void; fullScreenMobile?: boolean; bodyClassName?: string }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#10251C]/75 p-2 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <section className={`flex w-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl ${fullScreenMobile ? "h-[calc(100dvh-1rem)] max-w-3xl sm:h-auto sm:max-h-[92vh]" : "max-h-[calc(100dvh-1rem)] max-w-2xl sm:max-h-[90vh]"}`}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 p-3 sm:p-4">
          <h2 className="min-w-0 truncate text-base font-black uppercase tracking-[0.13em] text-[#123D2C] sm:text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-2xl bg-[#123D2C] px-4 text-sm font-black text-white">Fechar</button>
        </header>
        <div className={bodyClassName}>{children}</div>
      </section>
    </div>
  );
}
