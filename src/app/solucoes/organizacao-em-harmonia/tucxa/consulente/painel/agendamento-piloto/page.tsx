"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConsulentePanelHeader,
  consulenteSignOutAction,
} from "@/components/organizacao-em-harmonia/consulente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API_PATH = "/api/organizacao-em-harmonia/consulentes/agendamento-piloto";
const UNIFIED_LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
const atendimentoHref = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/atendimento";
const pageHref = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/agendamento-piloto";

type ViewMode = "entity_day" | "day_entity" | "both";
type ModalKind = "agendar" | "consultar" | "lembretes" | "ajuda" | null;
type DateOption = { date: string; weekday: "segunda" | "terca"; monthOccurrence: number; label: string };
type Entity = {
  id: string;
  name: string;
  capacity: number;
  booked: number;
  available: number;
  isAvailable: boolean;
  suspendedReason: string;
};
type Appointment = {
  id: string;
  entityName: string;
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
  rolloutStage: "reception" | "consulente" | "all";
  selfServiceEnabled: boolean;
  selfServiceViewMode: ViewMode;
  useDefaultEntity: boolean;
  allowDifferentEntity: boolean;
  serviceOrderMode: "booking" | "arrival";
  confirmationReminderOffsetsHours: number[];
};
type Preferences = {
  defaultEntityId: string;
  allowDifferentEntity: boolean;
  reminderWhatsappEnabled: boolean;
  reminderOffsetsHours: number[];
};
type CalendarDay = { date: string; label: string; entities: Entity[] };
type Payload = {
  profile: { fullName: string };
  settings: Settings;
  dates: DateOption[];
  selectedDate: string;
  entities: Entity[];
  appointments: Appointment[];
  preferences: Preferences;
  calendar: CalendarDay[];
};

function shortDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function statusLabel(appointment: Appointment) {
  if (appointment.status === "cancelado") return "Cancelado";
  if (appointment.arrivalStatus === "arrived") {
    return appointment.arrivalOrder ? `Chegada ${appointment.arrivalOrder}` : "Chegou";
  }
  if (appointment.arrivalStatus === "absent") return "Ausente";
  if (appointment.confirmationStatus === "confirmed") return "Confirmado";
  if (appointment.confirmationStatus === "expired") return "Prazo encerrado";
  if (appointment.confirmationStatus === "declined") return "Não comparecerá";
  return "Aguardando confirmação";
}

async function sessionToken() {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token || "";
}

export default function AgendamentoPilotoConsulentePage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [entityId, setEntityId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [bookingView, setBookingView] = useState<"entity_day" | "day_entity">("day_entity");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderOffsets, setReminderOffsets] = useState("");

  const load = useCallback(async (date?: string) => {
    setLoading(true);
    setError("");
    try {
      const token = await sessionToken();
      if (!token) {
        window.location.replace(`${UNIFIED_LOGIN}?returnTo=${encodeURIComponent(pageHref)}`);
        return;
      }
      const query = date ? `?date=${encodeURIComponent(date)}` : "";
      const response = await fetch(`${API_PATH}${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as Payload & {
        error?: string;
        requestId?: string;
      };
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar seus agendamentos.");
      setPayload(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar seus agendamentos.");
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
      if (open === "agendar" || open === "consultar" || open === "lembretes") setModal(open);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modal]);

  const effectiveView = bookingView;

  const defaultEntityId = payload?.preferences.defaultEntityId || "";
  const effectiveEntityId = entityId || defaultEntityId;
  const entityLocked = Boolean(defaultEntityId && payload && !payload.preferences.allowDifferentEntity);

  const availableEntities = useMemo(
    () => (payload?.entities ?? []).filter((entity) => entity.isAvailable && entity.available > 0),
    [payload?.entities],
  );

  const allEntityOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const day of payload?.calendar ?? []) {
      for (const entity of day.entities) map.set(entity.id, entity.name);
    }
    for (const entity of payload?.entities ?? []) map.set(entity.id, entity.name);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [payload?.calendar, payload?.entities]);

  const datesForEntity = useMemo(() => {
    if (!payload || !effectiveEntityId) return [];
    return payload.calendar
      .map((day) => {
        const entity = day.entities.find((item) => item.id === effectiveEntityId);
        return entity ? { ...day, entity } : null;
      })
      .filter((item): item is CalendarDay & { entity: Entity } => Boolean(item));
  }, [effectiveEntityId, payload]);

  async function post(body: Record<string, unknown>) {
    const token = await sessionToken();
    if (!token) throw new Error("Sessão expirada. Entre novamente.");
    const response = await fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      requestId?: string;
    };
    if (!response.ok) {
      throw new Error(
        `${data.error || "Não foi possível concluir a ação."}${data.requestId ? ` Código: ${data.requestId}` : ""}`,
      );
    }
    return data;
  }

  async function chooseEntity(nextEntityId: string) {
    setEntityId(nextEntityId);
    if (!payload || !nextEntityId || effectiveView !== "entity_day") return;
    const currentHasEntity = payload.entities.some((item) => item.id === nextEntityId);
    if (currentHasEntity) return;
    const firstDate = payload.calendar.find((day) =>
      day.entities.some((item) => item.id === nextEntityId && item.isAvailable && item.available > 0),
    )?.date;
    if (firstDate) await load(firstDate);
  }

  async function book() {
    if (!payload || !effectiveEntityId) {
      setError("Escolha uma Entidade com vaga.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await post({
        action: "book",
        entityId: effectiveEntityId,
        appointmentDate: payload.selectedDate,
        notes,
      });
      setMessage(result.message || "Agendamento reservado.");
      setEntityId("");
      setNotes("");
      await load(payload.selectedDate);
      setModal("consultar");
    } catch (bookError) {
      setError(bookError instanceof Error ? bookError.message : "Não foi possível agendar.");
    } finally {
      setSaving(false);
    }
  }

  async function appointmentAction(action: "confirm" | "cancel", appointmentId: string) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await post({ action, appointmentId });
      setMessage(result.message || "Atualização concluída.");
      await load(payload?.selectedDate);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar o agendamento.");
    } finally {
      setSaving(false);
    }
  }

  function openReminders() {
    if (!payload) return;
    setReminderEnabled(payload.preferences.reminderWhatsappEnabled);
    const offsets = payload.preferences.reminderOffsetsHours.length
      ? payload.preferences.reminderOffsetsHours
      : payload.settings.confirmationReminderOffsetsHours;
    setReminderOffsets(offsets.join(", "));
    setModal("lembretes");
  }

  async function saveReminders() {
    setSaving(true);
    setError("");
    try {
      const result = await post({
        action: "save-reminders",
        reminderWhatsappEnabled: reminderEnabled,
        reminderOffsetsHours: reminderOffsets,
      });
      setMessage(result.message || "Preferências de lembretes atualizadas.");
      await load(payload?.selectedDate);
      setModal(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar os lembretes.");
    } finally {
      setSaving(false);
    }
  }

  const firstName = payload?.profile.fullName.split(/\s+/)[0] || "";
  const selectedEntity = payload?.entities.find((item) => item.id === effectiveEntityId);
  const canReserveSelected = Boolean(selectedEntity?.isAvailable && selectedEntity.available > 0);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <ConsulentePanelHeader
        navLabel="Meus Atendimentos"
        showSupport={false}
        actions={[
          { label: "Início", href: pageHref, variant: "primary" },
          { label: "Voltar", href: atendimentoHref, variant: "secondary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
          consulenteSignOutAction,
        ]}
      />

      <section className="mx-auto max-w-4xl px-3 py-4 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Atendimento em Harmonia · Agendamento</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            {firstName ? `${firstName}, ` : ""}seu atendimento sem dúvida no caminho.
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            {payload?.settings.selfServiceEnabled
              ? "Escolha entre as datas e Entidades liberadas pela Recepção, confirme sua presença e acompanhe tudo no mesmo lugar."
              : "Nesta etapa do piloto, a Recepção faz o agendamento. Quando houver um atendimento reservado para você, a confirmação será feita pelo link enviado pelo WhatsApp."}
          </p>
        </section>

        {loading && <p className="mt-3 rounded-2xl bg-white p-4 font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando...</p>}
        {error && <p className="mt-3 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
        {message && <p className="mt-3 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

        {payload && (
          <>
            {!payload.settings.selfServiceEnabled && (
              <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold leading-5 text-amber-900 ring-1 ring-amber-100">
                Fase atual: somente a Recepção realiza agendamentos. O Consulente recebe uma mensagem no WhatsApp para confirmar presença; o autoagendamento será liberado em uma etapa posterior.
              </p>
            )}
            <section className={`mt-3 grid grid-cols-2 gap-2 sm:gap-3 ${payload.settings.selfServiceEnabled ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              {payload.settings.selfServiceEnabled && <Action title="Agendar" subtitle="Escolher data e Entidade" onClick={() => setModal("agendar")} />}
              <Action title="Consultar" subtitle="Meus próximos atendimentos" onClick={() => setModal("consultar")} />
              <Action title="Lembretes" subtitle="Escolher quando quero receber" onClick={openReminders} />
              <Action title="Como funciona" subtitle="Entenda o fluxo" onClick={() => setModal("ajuda")} />
            </section>
            <section className="mt-3 grid grid-cols-3 gap-2 rounded-[1.3rem] bg-white p-2 ring-1 ring-[#123D2C]/10">
              <Summary label="Próximos" value={payload.appointments.filter((item) => item.status !== "cancelado").length} />
              <Summary label="Confirmados" value={payload.appointments.filter((item) => item.confirmationStatus === "confirmed").length} />
              <Summary label="Lembretes" value={payload.preferences.reminderWhatsappEnabled ? payload.preferences.reminderOffsetsHours.length || payload.settings.confirmationReminderOffsetsHours.length : 0} />
            </section>
          </>
        )}
      </section>

      {modal && payload && (
        <Modal
          title={
            modal === "agendar"
              ? "Agendar atendimento"
              : modal === "consultar"
                ? "Meus agendamentos"
                : modal === "lembretes"
                  ? "Meus lembretes"
                  : "Como funciona"
          }
          onClose={() => setModal(null)}
        >
          {modal === "agendar" && !payload.settings.selfServiceEnabled && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
              Nesta etapa do piloto, os agendamentos são feitos somente pela Recepção. Você receberá uma mensagem no WhatsApp para confirmar sua presença quando houver um atendimento agendado.
            </div>
          )}

          {modal === "agendar" && payload.settings.selfServiceEnabled && (
            <div className="grid gap-3">
              {(
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10">
                  <button type="button" onClick={() => setBookingView("day_entity")} className={`rounded-xl px-3 py-2 text-sm font-black ${effectiveView === "day_entity" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>Dia / Entidade</button>
                  <button type="button" onClick={() => setBookingView("entity_day")} className={`rounded-xl px-3 py-2 text-sm font-black ${effectiveView === "entity_day" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>Entidade / Dia</button>
                </div>
              )}

              {effectiveView === "entity_day" ? (
                <>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">Entidade
                    <select
                      value={effectiveEntityId}
                      onChange={(event) => void chooseEntity(event.target.value)}
                      disabled={entityLocked}
                      className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold disabled:bg-slate-100"
                    >
                      <option value="">Escolha uma Entidade</option>
                      {allEntityOptions.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                    </select>
                  </label>
                  {entityLocked && <p className="rounded-xl bg-[#E9F2E7] p-3 text-xs font-bold text-[#123D2C]">A Recepção definiu uma Entidade padrão para este cadastro. Para alterar, fale com a Recepção.</p>}
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">Dia
                    <select value={payload.selectedDate} onChange={(event) => void load(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                      {datesForEntity.map((item) => <option key={item.date} value={item.date} disabled={!item.entity.isAvailable || item.entity.available < 1}>{item.label} · {item.entity.available} vaga(s)</option>)}
                    </select>
                  </label>
                  {effectiveEntityId && !datesForEntity.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">Esta Entidade não possui datas liberadas no período do piloto. Fale com a Recepção.</p>}
                </>
              ) : (
                <>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">Data
                    <select value={payload.selectedDate} onChange={(event) => void load(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                      {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">Entidade
                    <select
                      value={effectiveEntityId}
                      onChange={(event) => setEntityId(event.target.value)}
                      disabled={entityLocked}
                      className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold disabled:bg-slate-100"
                    >
                      <option value="">Escolha uma Entidade</option>
                      {availableEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.available} vaga(s)</option>)}
                    </select>
                  </label>
                  {entityLocked && <p className="rounded-xl bg-[#E9F2E7] p-3 text-xs font-bold text-[#123D2C]">A Recepção definiu uma Entidade padrão para este cadastro. Para alterar, fale com a Recepção.</p>}
                  {!availableEntities.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">Não há Entidades com vaga nesta data. Escolha outra data.</p>}
                </>
              )}

              <div className="rounded-2xl bg-[#E9F2E7] p-3 text-sm font-semibold text-[#123D2C] ring-1 ring-[#123D2C]/10">
                Chegada: <strong>{payload.settings.arrivalWindow}</strong> · porta fecha às <strong>{payload.settings.doorClosesAt}</strong> e reabre às <strong>{payload.settings.doorReopensAt}</strong> · trabalhos: <strong>{payload.settings.appointmentTime}–{payload.settings.endTime}</strong> · confirme até <strong>{payload.settings.confirmationCutoff}</strong>.
              </div>

              {effectiveEntityId && selectedEntity && !selectedEntity.isAvailable && (
                <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">{selectedEntity.suspendedReason || "A Entidade está indisponível nesta data."}</p>
              )}

              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Observação opcional
                <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="rounded-xl border border-[#123D2C]/15 p-3 font-semibold" />
              </label>
              <button type="button" onClick={() => void book()} disabled={saving || !effectiveEntityId || !canReserveSelected} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Reservando..." : "Reservar atendimento"}</button>
            </div>
          )}

          {modal === "consultar" && (
            <div className="grid gap-3">
              {payload.appointments.map((appointment) => (
                <article key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-[#123D2C]">{appointment.entityName}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {shortDate(appointment.appointmentDate)} · {appointment.appointmentTime}
                        {payload.settings.serviceOrderMode === "booking" && appointment.order ? ` · ordem ${appointment.order}` : ""}
                        {payload.settings.serviceOrderMode === "arrival" && appointment.arrivalOrder ? ` · chegada ${appointment.arrivalOrder}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{statusLabel(appointment)}</span>
                  </div>
                  {appointment.status !== "cancelado" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {appointment.confirmationStatus !== "confirmed" && appointment.confirmationStatus !== "expired" && (
                        <button type="button" disabled={saving} onClick={() => void appointmentAction("confirm", appointment.id)} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Confirmar presença</button>
                      )}
                      <button type="button" disabled={saving} onClick={() => void appointmentAction("cancel", appointment.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Não poderei ir</button>
                    </div>
                  )}
                </article>
              ))}
              {!payload.appointments.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Você ainda não possui agendamentos neste piloto.</p>}
            </div>
          )}

          {modal === "lembretes" && (
            <div className="grid gap-3">
              <Toggle checked={reminderEnabled} onChange={setReminderEnabled} label="Quero receber lembretes pelo WhatsApp" />
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Quando quero ser lembrado · antecedência em horas
                <input value={reminderOffsets} onChange={(event) => setReminderOffsets(event.target.value)} disabled={!reminderEnabled} className="rounded-xl border border-[#123D2C]/15 p-3 font-semibold disabled:bg-slate-100" placeholder="Ex.: 48, 24, 4" />
                <span className="text-xs font-semibold text-slate-500">Você pode informar até 8 momentos separados por vírgula. Ex.: 48, 24, 4.</span>
              </label>
              <button type="button" onClick={() => void saveReminders()} disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar lembretes"}</button>
            </div>
          )}

          {modal === "ajuda" && (
            <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-700">
              <Info title="Escolha com clareza">O sistema mostra somente as datas do piloto e as Entidades previstas e liberadas para cada semana do mês.</Info>
              <Info title="Vaga real">A quantidade disponível considera o limite definido pela Recepção e eventuais suspensões.</Info>
              <Info title={`Confirme até ${payload.settings.confirmationCutoff}`}>Depois de reservar, abra Meus agendamentos e confirme sua presença dentro do prazo.</Info>
              <Info title="Chegue com tranquilidade">A orientação é chegar entre {payload.settings.arrivalWindow}. A porta fecha às {payload.settings.doorClosesAt} e reabre às {payload.settings.doorReopensAt} para o início dos trabalhos.</Info>
              <Info title="Lembretes do seu jeito">Em “Lembretes”, escolha se deseja WhatsApp e com quanta antecedência quer ser avisado.</Info>
              <Info title="Mudou de ideia?">Use “Não poderei ir” para liberar a vaga para outra pessoa.</Info>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}

function Action({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-[1.4rem] bg-white p-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg"><span className="block text-lg font-black leading-tight text-[#123D2C]">{title}</span><span className="mt-1 block text-xs font-bold text-slate-500">{subtitle}</span><span className="mt-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">TOQUE PARA ABRIR</span></button>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10"><span className="block text-lg font-black text-[#123D2C]">{value}</span><span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{label}</span></div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-bold text-[#123D2C] ring-1 ring-[#123D2C]/10"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" /><span>{label}</span></label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 px-5 py-4"><h2 className="text-xl font-black text-[#123D2C]">{title}</h2><button type="button" onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button></header><div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div></section></div>;
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">{title}</p><p className="mt-1">{children}</p></div>;
}
