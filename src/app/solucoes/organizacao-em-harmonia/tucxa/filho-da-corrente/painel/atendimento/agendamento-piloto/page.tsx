"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  FilhoCorrentePanelHeader,
  filhoAgendamentoSignOutAction,
} from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API_PATH = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto";
const LEGACY_BOOKING_API = "/api/organizacao-em-harmonia/filhos-corrente/agendamentos";
const UNIFIED_LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
const pageHref = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto";

type ViewMode = "entity_day" | "day_entity" | "both";
type ModalKind = "agendar" | "consultar" | "entidades" | "cadastros" | "configuracoes" | "ajuda" | null;
type DateOption = { date: string; weekday: "segunda" | "terca"; monthOccurrence: number; label: string };
type Medium = { name: string; whatsapp: string; whatsappUrl: string };
type Entity = { id: string; name: string; slug: string; capacity: number; booked: number; available: number; isAvailable: boolean; suspendedReason: string; mediums: Medium[] };
type EntityCatalogItem = {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  active: boolean;
  appointmentEnabled: boolean;
  mondayOccurrences: number[];
  tuesdayOccurrences: number[];
  mediums: Medium[];
};
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
type ReceptionPreferences = { receptionSummaryChannels: string[]; receptionSummaryViewMode: ViewMode };
type Payload = {
  profile: { fullName: string; canManage: boolean };
  settings: Settings;
  dates: DateOption[];
  selectedDate: string;
  entities: Entity[];
  entityCatalog: EntityCatalogItem[];
  appointments: Appointment[];
  receptionPreferences: ReceptionPreferences;
};
type FoundPerson = { id: string; fullName: string; whatsapp: string; email: string; defaultEntityId?: string };
type AccessInfo = { login?: string; temporaryPassword?: string; loginUrl?: string; whatsappUrl?: string; emailSent?: boolean };
type BookingResult = {
  appointment?: { id: string; personName: string; appointmentDate: string; appointmentTime: string; entityName: string; order: number | null; confirmationDeadline: string };
  confirmation?: { url: string; sms: { sent: boolean; provider: string; error?: string } };
};

type SettingsDraft = {
  selfServiceViewMode: ViewMode;
  useDefaultEntity: boolean;
  allowDifferentEntity: boolean;
  serviceOrderMode: "booking" | "arrival";
  reminderOffsets: string;
  summaryEmail: boolean;
  summarySms: boolean;
  summaryViewMode: ViewMode;
};

function shortDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });
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
  const [foundPerson, setFoundPerson] = useState<FoundPerson | null>(null);
  const [personNotFound, setPersonNotFound] = useState(false);
  const [entityId, setEntityId] = useState("");
  const [notes, setNotes] = useState("");
  const [newPerson, setNewPerson] = useState({ fullName: "", email: "", password: "12345678", privacyAccepted: false });
  const [showNewPersonPassword, setShowNewPersonPassword] = useState(false);
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [management, setManagement] = useState({ entityId: "", startsOn: "", endsOn: "", available: true, capacity: "", reason: "" });
  const [consultView, setConsultView] = useState<"" | "entity_day" | "day_entity">("");
  const [changeSelections, setChangeSelections] = useState<Record<string, string>>({});
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft | null>(null);
  const [editPerson, setEditPerson] = useState({ fullName: "", whatsapp: "", email: "", defaultEntityId: "" });
  const [editEntity, setEditEntity] = useState({
    entityId: "",
    name: "",
    capacity: "4",
    mondayOccurrences: [] as number[],
    tuesdayOccurrences: [] as number[],
  });

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
    const timer = window.setTimeout(() => void load(), 0);
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
    if (!modal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [modal]);

  const usableEntities = useMemo(() => (payload?.entities ?? []).filter((item) => item.isAvailable && item.available > 0), [payload?.entities]);
  const effectiveConsultView = consultView || (payload?.receptionPreferences.receptionSummaryViewMode === "entity_day" ? "entity_day" : "day_entity");
  const groupedAppointments = useMemo(() => {
    if (!payload) return [] as Array<{ label: string; appointments: Appointment[] }>;
    if (effectiveConsultView === "entity_day") {
      const groups = new Map<string, Appointment[]>();
      for (const appointment of payload.appointments) {
        const list = groups.get(appointment.entityName) ?? [];
        list.push(appointment);
        groups.set(appointment.entityName, list);
      }
      return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR")).map(([label, appointments]) => ({ label, appointments }));
    }
    return [{ label: shortDate(payload.selectedDate), appointments: [...payload.appointments].sort((a, b) => a.entityName.localeCompare(b.entityName, "pt-BR")) }];
  }, [effectiveConsultView, payload]);

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

  function clearPersonSearch() {
    setFoundPerson(null);
    setPersonNotFound(false);
    setAccessInfo(null);
    setEditPerson({ fullName: "", whatsapp: "", email: "", defaultEntityId: "" });
    setNewPerson({ fullName: "", email: "", password: "12345678", privacyAccepted: false });
    setShowNewPersonPassword(false);
  }

  async function searchPerson(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    clearPersonSearch();
    try {
      const result = await postLegacy({ action: "search-consulente", whatsapp: phone });
      if (result.found === true && result.person && typeof result.person === "object") {
        const person = result.person as FoundPerson;
        setFoundPerson(person);
        const details = await postPilot({ action: "get-consulente", personId: person.id });
        const detailedPerson = details.person && typeof details.person === "object"
          ? details.person as FoundPerson
          : person;
        setEditPerson({
          fullName: detailedPerson.fullName || person.fullName,
          whatsapp: detailedPerson.whatsapp || person.whatsapp,
          email: detailedPerson.email || person.email,
          defaultEntityId: detailedPerson.defaultEntityId || "",
        });
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
        whatsapp: phone,
        email: newPerson.email,
        password: newPerson.password,
        privacyAccepted: newPerson.privacyAccepted,
      });
      if (!result.person || typeof result.person !== "object") throw new Error("Cadastro criado sem identificação da pessoa.");
      const person = result.person as FoundPerson;
      setFoundPerson(person);
      setEditPerson({ fullName: person.fullName, whatsapp: person.whatsapp, email: person.email, defaultEntityId: "" });
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
      setError("Escolha a Entidade e confirme a pessoa antes de agendar.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await postPilot({ action: "book", targetPersonId: foundPerson.id, entityId, appointmentDate: payload.selectedDate, notes }) as BookingResult;
      setBookingResult(result);
      setMessage("Agendamento criado. Confira abaixo o envio da confirmação.");
      await load(payload.selectedDate);
    } catch (bookError) {
      setError(bookError instanceof Error ? bookError.message : "Não foi possível criar o agendamento.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAvailability(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await postPilot({
        action: "set-availability",
        entityId: management.entityId,
        startsOn: management.startsOn || payload?.selectedDate,
        endsOn: management.endsOn || payload?.selectedDate,
        available: management.available,
        capacity: management.capacity ? Number(management.capacity) : null,
        reason: management.reason,
      });
      setMessage(management.available ? "Disponibilidade atualizada." : "Suspensão registrada.");
      await load(payload?.selectedDate);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível atualizar a disponibilidade.");
    } finally {
      setSaving(false);
    }
  }

  async function appointmentAction(action: "confirm-manual" | "cancel", appointmentId: string) {
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({ action, appointmentId });
      setMessage(typeof result.message === "string" ? result.message : "Atualização concluída.");
      await load(payload?.selectedDate);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar o agendamento.");
    } finally {
      setSaving(false);
    }
  }

  async function markArrival(appointmentId: string, arrivalStatus: "arrived" | "absent" | "pending") {
    setSaving(true);
    setError("");
    try {
      const result = await postPilot({ action: "mark-arrival", appointmentId, arrivalStatus });
      setMessage(typeof result.message === "string" ? result.message : "Chegada atualizada.");
      await load(payload?.selectedDate);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível registrar a chegada.");
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
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível trocar a Entidade.");
    } finally {
      setSaving(false);
    }
  }

  function openSettings() {
    if (!payload) return;
    setSettingsDraft({
      selfServiceViewMode: payload.settings.selfServiceViewMode,
      useDefaultEntity: payload.settings.useDefaultEntity,
      allowDifferentEntity: payload.settings.allowDifferentEntity,
      serviceOrderMode: payload.settings.serviceOrderMode,
      reminderOffsets: payload.settings.confirmationReminderOffsetsHours.join(", "),
      summaryEmail: payload.receptionPreferences.receptionSummaryChannels.includes("email"),
      summarySms: payload.receptionPreferences.receptionSummaryChannels.includes("sms"),
      summaryViewMode: payload.receptionPreferences.receptionSummaryViewMode,
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
        selfServiceViewMode: settingsDraft.selfServiceViewMode,
        useDefaultEntity: settingsDraft.useDefaultEntity,
        allowDifferentEntity: settingsDraft.allowDifferentEntity,
        serviceOrderMode: settingsDraft.serviceOrderMode,
        confirmationReminderOffsetsHours: settingsDraft.reminderOffsets,
      });
      await postPilot({
        action: "save-reception-preferences",
        channels: [settingsDraft.summaryEmail ? "email" : "", settingsDraft.summarySms ? "sms" : ""].filter(Boolean),
        viewMode: settingsDraft.summaryViewMode,
      });
      setMessage("Configurações do piloto atualizadas.");
      await load(payload?.selectedDate);
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
      setMessage(typeof result.message === "string" ? result.message : "Cadastro atualizado.");
      setFoundPerson({ id: foundPerson.id, fullName: editPerson.fullName, whatsapp: editPerson.whatsapp, email: editPerson.email });
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
      capacity: String(entity?.capacity ?? 4),
      mondayOccurrences: entity?.mondayOccurrences ?? [],
      tuesdayOccurrences: entity?.tuesdayOccurrences ?? [],
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
        capacity: Number(editEntity.capacity),
        mondayOccurrences: editEntity.mondayOccurrences,
        tuesdayOccurrences: editEntity.tuesdayOccurrences,
      });
      setMessage(typeof result.message === "string" ? result.message : "Entidade salva.");
      setEditEntity({ entityId: "", name: "", capacity: "4", mondayOccurrences: [], tuesdayOccurrences: [] });
      await load(payload?.selectedDate);
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
        actions={[filhoAgendamentoSignOutAction]}
        mobileActionColumns={2}
        compactMobileActions={false}
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
              <ActionButton title="Configurações" subtitle="Ordem, visualização e lembretes" onClick={openSettings} />
              <ActionButton title="Cadastros" subtitle="Atualizar Consulente ou Entidade" onClick={() => setModal("cadastros")} />
              <ActionButton title="Entidades" subtitle="Vagas, suspensão e Cavalinhos" onClick={() => setModal("entidades")} />
              <ActionButton title="Agendar" subtitle="Localizar ou cadastrar Consulente" onClick={() => setModal("agendar")} />
              <ActionButton title="Acolhimento" subtitle="Confirmar, trocar Entidade e registrar chegada" onClick={() => setModal("consultar")} />
            </section>
            <section className="mt-3 grid grid-cols-3 gap-2 rounded-[1.3rem] bg-white p-2 ring-1 ring-[#123D2C]/10">
              <Summary label="Agendados" value={payload.appointments.filter((item) => item.status !== "cancelado").length} />
              <Summary label="Confirmados" value={payload.appointments.filter((item) => item.confirmationStatus === "confirmed").length} />
              <Summary label="Chegaram" value={payload.appointments.filter((item) => item.arrivalStatus === "arrived").length} />
            </section>
          </>
        )}
      </section>

      {modal && payload && (
        <Modal title={modalTitle(modal)} onClose={() => setModal(null)}>
          {modal === "agendar" && (
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Data
                <select value={payload.selectedDate} onChange={(event) => void load(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                  {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
                </select>
              </label>
              <form onSubmit={searchPerson} className="grid grid-cols-[1fr_auto] gap-2">
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp do Consulente" className="min-w-0 rounded-xl border border-[#123D2C]/15 p-3 font-semibold" required />
                <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 font-black text-white">Buscar</button>
              </form>

              {personNotFound && (
                <form onSubmit={createPerson} className="grid gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
                  <p className="font-black text-amber-900">Cadastro não encontrado. Cadastre agora.</p>
                  <input value={newPerson.fullName} onChange={(event) => setNewPerson((current) => ({ ...current, fullName: event.target.value }))} placeholder="Nome completo" className="rounded-xl border border-amber-200 p-3" required />
                  <input value={newPerson.email} onChange={(event) => setNewPerson((current) => ({ ...current, email: event.target.value }))} placeholder="E-mail (opcional)" type="email" className="rounded-xl border border-amber-200 p-3" />
                  <div className="grid gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="novo-consulente-senha" className="text-sm font-black text-amber-950">Senha inicial</label>
                      <button
                        type="button"
                        onClick={() => setShowNewPersonPassword((current) => !current)}
                        className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-black text-amber-950"
                      >
                        {showNewPersonPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                    <input
                      id="novo-consulente-senha"
                      value={newPerson.password}
                      onChange={(event) => setNewPerson((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Senha inicial"
                      type={showNewPersonPassword ? "text" : "password"}
                      minLength={8}
                      className="rounded-xl border border-amber-200 p-3"
                      required
                    />
                    <p className="text-xs font-semibold text-amber-900">
                      A senha inicial vem preenchida como 12345678 e deverá ser trocada no primeiro login.
                    </p>
                  </div>
                  <label className="flex gap-2 text-sm font-semibold text-amber-950"><input type="checkbox" checked={newPerson.privacyAccepted} onChange={(event) => setNewPerson((current) => ({ ...current, privacyAccepted: event.target.checked }))} required /> Ciência do Aviso de Privacidade (LGPD)</label>
                  <button disabled={saving} className="rounded-xl bg-amber-900 px-4 py-3 font-black text-white">Criar cadastro</button>
                </form>
              )}

              {foundPerson && (
                <div className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <p className="font-black text-[#123D2C]">{foundPerson.fullName}</p>
                  <p className="text-sm font-semibold text-slate-600">{foundPerson.whatsapp}{foundPerson.email ? ` · ${foundPerson.email}` : ""}</p>
                  <a href={whatsappHref(foundPerson.whatsapp, "Olá! Estou falando pela Recepção do Tucxa sobre seu agendamento.")} target="_blank" rel="noreferrer" className="text-sm font-black text-[#176A3A] underline">Falar no WhatsApp</a>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">Entidade
                    <select value={entityId} onChange={(event) => setEntityId(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                      <option value="">Escolha uma Entidade</option>
                      {usableEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.available} vaga(s)</option>)}
                    </select>
                  </label>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Observação opcional" className="rounded-xl border border-[#123D2C]/15 p-3" />
                  <button type="button" onClick={() => void book()} disabled={saving || !entityId} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Criar agendamento"}</button>
                </div>
              )}

              {accessInfo?.loginUrl && <p className="rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">Cadastro criado. Login: {accessInfo.login || "WhatsApp/e-mail informado"}.</p>}
              {bookingResult?.confirmation?.url && (
                <div className="grid gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100">
                  <p className="font-black">Agendamento criado.</p>
                  <p>{bookingResult.confirmation.sms.sent ? "SMS enviado." : bookingResult.confirmation.sms.error || "SMS não enviado automaticamente."}</p>
                  <button type="button" onClick={() => void navigator.clipboard.writeText(bookingResult.confirmation!.url)} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white">Copiar link de confirmação</button>
                </div>
              )}
            </div>
          )}

          {modal === "consultar" && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select value={payload.selectedDate} onChange={(event) => void load(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-bold text-[#123D2C]">
                  {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
                </select>
                <select value={effectiveConsultView} onChange={(event) => setConsultView(event.target.value as "entity_day" | "day_entity")} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-bold text-[#123D2C]">
                  <option value="day_entity">Dia / Entidade</option>
                  <option value="entity_day">Entidade / Dia</option>
                </select>
              </div>
              {groupedAppointments.map((group) => (
                <section key={group.label} className="grid gap-2">
                  <h3 className="rounded-xl bg-[#E9F2E7] px-3 py-2 font-black text-[#123D2C]">{group.label}</h3>
                  {group.appointments.map((appointment) => (
                    <article key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-black text-[#123D2C]">{appointment.consulenteName}</h4>
                          <p className="mt-1 text-sm font-semibold text-slate-600">{appointment.entityName} · {appointment.appointmentTime}{appointment.order ? ` · ordem de agendamento ${appointment.order}` : ""}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{statusLabel(appointment)}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {appointment.confirmationStatus !== "confirmed" && appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void appointmentAction("confirm-manual", appointment.id)} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Confirmar</button>}
                        {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void markArrival(appointment.id, "arrived")} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">Chegou</button>}
                        {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void markArrival(appointment.id, "absent")} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 ring-1 ring-amber-100">Não chegou</button>}
                        {appointment.whatsapp && <a href={whatsappHref(appointment.whatsapp, `Olá, ${appointment.consulenteName}. Estou falando pela Recepção do Tucxa sobre seu agendamento.`)} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-[#176A3A] ring-1 ring-[#123D2C]/15">WhatsApp</a>}
                        {appointment.status !== "cancelado" && <button type="button" disabled={saving} onClick={() => void appointmentAction("cancel", appointment.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Cancelar</button>}
                      </div>
                      {appointment.status !== "cancelado" && (
                        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                          <select value={changeSelections[appointment.id] || ""} onChange={(event) => setChangeSelections((current) => ({ ...current, [appointment.id]: event.target.value }))} className="min-w-0 rounded-xl border border-[#123D2C]/15 bg-white p-2 text-xs font-bold">
                            <option value="">Trocar Entidade...</option>
                            {usableEntities.filter((entity) => entity.id !== appointment.entityId).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                          </select>
                          <button type="button" disabled={saving || !changeSelections[appointment.id]} onClick={() => void changeEntity(appointment.id)} className="rounded-xl bg-white px-3 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50">Trocar</button>
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              ))}
              {!payload.appointments.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhum agendamento nesta data.</p>}
            </div>
          )}

          {modal === "entidades" && (
            <div className="grid gap-4">
              <div className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="text-sm font-black text-[#123D2C]">Situação em {shortDate(payload.selectedDate)}</p>
                {payload.entities.map((entity) => (
                  <div key={entity.id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#123D2C]/10">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-sm font-black text-[#123D2C]">{entity.name}</p><p className="text-xs font-semibold text-slate-500">{entity.booked}/{entity.capacity} agendado(s)</p></div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${entity.isAvailable ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{entity.isAvailable ? `${entity.available} vaga(s)` : "Suspenso"}</span>
                    </div>
                    {entity.mediums.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{entity.mediums.map((medium) => <a key={`${entity.id}-${medium.whatsapp}`} href={medium.whatsappUrl} target="_blank" rel="noreferrer" className="rounded-full bg-[#E9F2E7] px-3 py-1 text-xs font-black text-[#176A3A]">{medium.name} · WhatsApp</a>)}</div>}
                  </div>
                ))}
              </div>
              <form onSubmit={saveAvailability} className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Disponibilidade / suspensão</p>
                <select value={management.entityId} onChange={(event) => setManagement((current) => ({ ...current, entityId: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" required>
                  <option value="">Escolha a Entidade</option>
                  {payload.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">De<input type="date" value={management.startsOn || payload.selectedDate} onChange={(event) => setManagement((current) => ({ ...current, startsOn: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" required /></label>
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">Até<input type="date" value={management.endsOn || payload.selectedDate} onChange={(event) => setManagement((current) => ({ ...current, endsOn: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" required /></label>
                </div>
                <select value={management.available ? "available" : "suspended"} onChange={(event) => setManagement((current) => ({ ...current, available: event.target.value === "available" }))} className="rounded-xl border border-[#123D2C]/15 p-3">
                  <option value="available">Disponível</option><option value="suspended">Suspender atendimento</option>
                </select>
                <input type="number" min={1} value={management.capacity} onChange={(event) => setManagement((current) => ({ ...current, capacity: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Capacidade máxima por dia (opcional)" />
                <textarea value={management.reason} onChange={(event) => setManagement((current) => ({ ...current, reason: event.target.value }))} rows={2} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Motivo/observação" />
                <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">Salvar disponibilidade</button>
              </form>
            </div>
          )}

          {modal === "cadastros" && (
            <div className="grid gap-4">
              <section className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Atualizar Consulente</p>
                <form onSubmit={searchPerson} className="grid grid-cols-[1fr_auto] gap-2"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp" className="rounded-xl border border-[#123D2C]/15 p-3" required /><button className="rounded-xl bg-[#123D2C] px-4 font-black text-white">Buscar</button></form>
                {foundPerson && <form onSubmit={updateConsulente} className="grid gap-2"><input value={editPerson.fullName} onChange={(event) => setEditPerson((current) => ({ ...current, fullName: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Nome" required /><input value={editPerson.whatsapp} onChange={(event) => setEditPerson((current) => ({ ...current, whatsapp: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="WhatsApp" required /><input value={editPerson.email} onChange={(event) => setEditPerson((current) => ({ ...current, email: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="E-mail opcional" type="email" /><select value={editPerson.defaultEntityId} onChange={(event) => setEditPerson((current) => ({ ...current, defaultEntityId: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3"><option value="">Sem Entidade padrão</option>{payload.entityCatalog.filter((entity) => entity.active && entity.appointmentEnabled).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select><button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white">Salvar Consulente</button></form>}
              </section>
              <form onSubmit={saveEntity} className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Cadastrar ou atualizar Entidade</p>
                <select value={editEntity.entityId} onChange={(event) => selectEntityForEdit(event.target.value)} className="rounded-xl border border-[#123D2C]/15 p-3">
                  <option value="">Nova Entidade</option>
                  {payload.entityCatalog.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}{entity.active && entity.appointmentEnabled ? "" : " · inativa"}</option>)}
                </select>
                <input value={editEntity.name} onChange={(event) => setEditEntity((current) => ({ ...current, name: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Nome da Entidade" required />
                <input type="number" min={1} value={editEntity.capacity} onChange={(event) => setEditEntity((current) => ({ ...current, capacity: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Capacidade padrão" required />
                <EntityOccurrencePicker label="Segunda-feira" values={editEntity.mondayOccurrences} onToggle={(occurrence) => toggleEntityOccurrence("mondayOccurrences", occurrence)} />
                <EntityOccurrencePicker label="Terça-feira" values={editEntity.tuesdayOccurrences} onToggle={(occurrence) => toggleEntityOccurrence("tuesdayOccurrences", occurrence)} />
                <p className="text-xs font-semibold leading-5 text-slate-500">Marque em quais ocorrências do mês a Entidade atende. Salvar uma Entidade existente substitui o calendário do piloto dessa Entidade.</p>
                <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white">{editEntity.entityId ? "Salvar Entidade" : "Cadastrar Entidade"}</button>
              </form>
            </div>
          )}

          {modal === "configuracoes" && settingsDraft && (
            <form onSubmit={saveSettings} className="grid gap-3">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Consulentes podem visualizar para agendar por
                <select value={settingsDraft.selfServiceViewMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, selfServiceViewMode: event.target.value as ViewMode } : current)} className="rounded-xl border border-[#123D2C]/15 p-3">
                  <option value="entity_day">Entidade / Dia</option><option value="day_entity">Dia / Entidade</option><option value="both">Ambos</option>
                </select>
              </label>
              <Toggle checked={settingsDraft.useDefaultEntity} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, useDefaultEntity: checked } : current)} label="Usar Entidade padrão por Consulente" />
              <Toggle checked={settingsDraft.allowDifferentEntity} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, allowDifferentEntity: checked } : current)} label="Permitir que o Consulente escolha Entidade diferente da padrão" />
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Ordem dos atendimentos
                <select value={settingsDraft.serviceOrderMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, serviceOrderMode: event.target.value as "booking" | "arrival" } : current)} className="rounded-xl border border-[#123D2C]/15 p-3"><option value="booking">Ordem de agendamento</option><option value="arrival">Ordem de chegada</option></select>
              </label>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Lembretes/confirmações por SMS · antecedência em horas
                <input value={settingsDraft.reminderOffsets} onChange={(event) => setSettingsDraft((current) => current ? { ...current, reminderOffsets: event.target.value } : current)} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Ex.: 48, 24, 4" />
                <span className="text-xs font-semibold text-slate-500">Informe até 8 momentos, separados por vírgula.</span>
              </label>
              <section className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Meu resumo da Recepção</p>
                <div className="mt-2 grid grid-cols-2 gap-2"><Toggle checked={settingsDraft.summaryEmail} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, summaryEmail: checked } : current)} label="E-mail" /><Toggle checked={settingsDraft.summarySms} onChange={(checked) => setSettingsDraft((current) => current ? { ...current, summarySms: checked } : current)} label="SMS" /></div>
                <select value={settingsDraft.summaryViewMode} onChange={(event) => setSettingsDraft((current) => current ? { ...current, summaryViewMode: event.target.value as ViewMode } : current)} className="mt-2 w-full rounded-xl border border-[#123D2C]/15 p-3"><option value="entity_day">Entidade / Dia</option><option value="day_entity">Dia / Entidade</option><option value="both">Ambos</option></select>
              </section>
              <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar configurações"}</button>
            </form>
          )}

          {modal === "ajuda" && (
            <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-700">
              <Info title="Agendamento">A Recepção localiza ou cadastra o Consulente, escolhe data e Entidade e cria a reserva.</Info>
              <Info title="Confirmação">O Consulente confirma no link ou no painel. O prazo padrão continua sendo {payload.settings.confirmationCutoff} no dia do atendimento.</Info>
              <Info title="Chegada">Chegada orientada: {payload.settings.arrivalWindow}. A porta fecha às {payload.settings.doorClosesAt} e reabre às {payload.settings.doorReopensAt}.</Info>
              <Info title="Ordem">O piloto pode trabalhar por ordem de agendamento ou por ordem de chegada. Quando a ordem de chegada estiver ativa, use o botão “Chegou”.</Info>
              <Info title="Contato">Os cartões disponibilizam WhatsApp do Consulente e, quando cadastrado, do Cavalinho ligado à Entidade.</Info>
            </div>
          )}
        </Modal>
      )}
    </main>
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
  return <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">{title}</p><p className="mt-1">{children}</p></div>;
}

function modalTitle(modal: Exclude<ModalKind, null>) {
  if (modal === "agendar") return "Agendar Filho de Fora/Consulente";
  if (modal === "consultar") return "Acolhimento";
  if (modal === "entidades") return "Disponibilidade das Entidades";
  if (modal === "cadastros") return "Cadastros";
  if (modal === "configuracoes") return "Configurações da Recepção";
  return "Como funciona";
}
