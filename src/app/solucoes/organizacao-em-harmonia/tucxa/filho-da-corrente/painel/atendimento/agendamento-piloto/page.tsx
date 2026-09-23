"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API_PATH = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto";
const LEGACY_BOOKING_API = "/api/organizacao-em-harmonia/filhos-corrente/agendamentos";
const pageHref = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto";
const atendimentoHref = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento";

type ModalKind = "agendar" | "consultar" | "entidades" | "ajuda" | null;

type DateOption = { date: string; weekday: "segunda" | "terca"; monthOccurrence: number; label: string };
type Entity = { id: string; name: string; slug: string; capacity: number; booked: number; available: number; isAvailable: boolean; suspendedReason: string };
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
};
type Payload = {
  profile: { fullName: string; canManage: boolean };
  settings: { confirmationCutoff: string; appointmentTime: string; arrivalWindow: string; daysAhead: number; smsEnabled: boolean };
  dates: DateOption[];
  selectedDate: string;
  entities: Entity[];
  appointments: Appointment[];
};
type FoundPerson = { id: string; fullName: string; whatsapp: string; email: string };
type AccessInfo = { login?: string; temporaryPassword?: string; loginUrl?: string; whatsappUrl?: string; emailSent?: boolean };
type BookingResult = {
  appointment?: { id: string; personName: string; appointmentDate: string; appointmentTime: string; entityName: string; order: number | null; confirmationDeadline: string };
  confirmation?: { url: string; sms: { sent: boolean; provider: string; error?: string } };
  error?: string;
  requestId?: string;
};

function shortDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });
}

function statusLabel(status: string, confirmationStatus: string) {
  if (status === "cancelado") return "Cancelado";
  if (confirmationStatus === "confirmed") return "Confirmado";
  if (confirmationStatus === "expired") return "Prazo encerrado";
  if (confirmationStatus === "declined") return "Não comparecerá";
  return "Aguardando confirmação";
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
  const [newPerson, setNewPerson] = useState({ fullName: "", email: "", password: "", privacyAccepted: false });
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [management, setManagement] = useState({ entityId: "", startsOn: "", endsOn: "", available: true, capacity: "", reason: "" });

  const load = useCallback(async (date?: string) => {
    setLoading(true);
    setError("");
    try {
      const token = await authToken();
      if (!token) {
        window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login");
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
      if (["agendar", "consultar", "entidades"].includes(open || "")) setModal(open as ModalKind);
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

  async function searchPerson(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFoundPerson(null);
    setPersonNotFound(false);
    setAccessInfo(null);
    try {
      const result = await postLegacy({ action: "search-consulente", whatsapp: phone });
      if (result.found === true && result.person && typeof result.person === "object") {
        const person = result.person as FoundPerson;
        setFoundPerson(person);
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
      setFoundPerson(result.person as FoundPerson);
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
      const result = await postPilot({
        action: "book",
        targetPersonId: foundPerson.id,
        entityId,
        appointmentDate: payload.selectedDate,
        notes,
      }) as BookingResult;
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
        startsOn: management.startsOn,
        endsOn: management.endsOn,
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

  function openModal(next: ModalKind) {
    setError("");
    setMessage("");
    if (next === "agendar") {
      setPhone("");
      setFoundPerson(null);
      setPersonNotFound(false);
      setEntityId("");
      setNotes("");
      setAccessInfo(null);
      setBookingResult(null);
    }
    if (next === "entidades" && payload) {
      setManagement((current) => ({ ...current, startsOn: payload.selectedDate, endsOn: payload.selectedDate }));
    }
    setModal(next);
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Piloto de Agendamentos"
        showSupport={false}
        actions={[
          { label: "Início", href: pageHref, variant: "primary" },
          { label: "Voltar", href: atendimentoHref, variant: "secondary" },
          { label: "Ajuda", href: "#ajuda", variant: "secondary", action: "supportWhatsapp" },
          { label: "Sair", href: "#sair", variant: "secondary", action: "signOutFilhoCorrente" },
        ]}
        mobileActionColumns={4}
      />

      <section className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
        <section className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE2C7] sm:text-xs">Recepção · Piloto</p>
          <h1 className="mt-1 text-2xl font-black leading-tight sm:text-4xl">Agendar ficou simples de consultar e simples de confirmar.</h1>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#EEF7EA] sm:text-base sm:leading-7">
            Escolha o que precisa fazer agora. Os detalhes ficam em janelas rápidas para que a tela principal continue limpa no celular.
          </p>
        </section>

        {loading && <p className="mt-3 rounded-2xl bg-white p-4 font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando piloto...</p>}
        {error && <p className="mt-3 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
        {message && <p className="mt-3 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

        {payload && (
          <>
            <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <ActionButton title="Agendar" subtitle="Pessoa + Entidade" onClick={() => openModal("agendar")} />
              <ActionButton title="Consultar" subtitle="Confirmações do dia" onClick={() => openModal("consultar")} />
              <ActionButton title="Entidades" subtitle="Vagas e suspensões" onClick={() => openModal("entidades")} />
              <ActionButton title="Como funciona" subtitle="Fluxo do piloto" onClick={() => openModal("ajuda")} />
            </section>

            <section className="mt-3 rounded-[1.4rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">Data em foco</p>
                  <p className="mt-1 text-lg font-black text-[#123D2C]">{payload.dates.find((item) => item.date === payload.selectedDate)?.label || shortDate(payload.selectedDate)}</p>
                </div>
                <select
                  value={payload.selectedDate}
                  onChange={(event) => void load(event.target.value)}
                  className="rounded-xl border border-[#123D2C]/15 bg-white px-3 py-3 text-sm font-bold text-[#123D2C]"
                >
                  {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
                </select>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold sm:max-w-xl">
                <Summary label="Entidades" value={payload.entities.length} />
                <Summary label="Com vaga" value={payload.entities.filter((item) => item.isAvailable && item.available > 0).length} />
                <Summary label="Agendados" value={payload.appointments.filter((item) => item.status !== "cancelado").length} />
              </div>
            </section>
          </>
        )}
      </section>

      {modal && payload && (
        <Modal title={modalTitle(modal)} onClose={() => setModal(null)}>
          {modal === "agendar" && (
            <div className="grid gap-3">
              {!bookingResult && (
                <>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Data
                    <select value={payload.selectedDate} onChange={(event) => void load(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                      {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">
                    Entidade
                    <select value={entityId} onChange={(event) => setEntityId(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold" required>
                      <option value="">Escolha</option>
                      {usableEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.available} vaga(s)</option>)}
                    </select>
                  </label>
                  <form onSubmit={searchPerson} className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                    <label className="grid gap-1 text-sm font-black text-[#123D2C]">WhatsApp do Filho de Fora/Consulente
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="(19) 99999-9999" className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold" required />
                    </label>
                    <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-60">{saving ? "Pesquisando..." : "Pesquisar cadastro"}</button>
                  </form>

                  {foundPerson && (
                    <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                      <p className="font-black text-emerald-900">{foundPerson.fullName}</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-800">{foundPerson.whatsapp}{foundPerson.email ? ` · ${foundPerson.email}` : ""}</p>
                    </div>
                  )}

                  {personNotFound && !foundPerson && (
                    <form onSubmit={createPerson} className="grid gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
                      <p className="font-black text-amber-900">Cadastro não encontrado. Crie o acesso antes de agendar.</p>
                      <input value={newPerson.fullName} onChange={(event) => setNewPerson((current) => ({ ...current, fullName: event.target.value }))} placeholder="Nome completo" className="rounded-xl border border-amber-200 bg-white p-3" required />
                      <input value={newPerson.email} onChange={(event) => setNewPerson((current) => ({ ...current, email: event.target.value }))} type="email" placeholder="E-mail (opcional)" className="rounded-xl border border-amber-200 bg-white p-3" />
                      <input value={newPerson.password} onChange={(event) => setNewPerson((current) => ({ ...current, password: event.target.value }))} type="password" minLength={8} placeholder="Senha temporária (mínimo 8 caracteres)" className="rounded-xl border border-amber-200 bg-white p-3" required />
                      <label className="flex items-start gap-2 text-xs font-bold leading-5 text-amber-900">
                        <input type="checkbox" checked={newPerson.privacyAccepted} onChange={(event) => setNewPerson((current) => ({ ...current, privacyAccepted: event.target.checked }))} className="mt-1" />
                        A pessoa foi informada e confirmou ciência do Aviso de Privacidade para criação do cadastro.
                      </label>
                      <button disabled={saving || !newPerson.privacyAccepted} className="rounded-xl bg-amber-700 px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Criando..." : "Criar cadastro"}</button>
                    </form>
                  )}

                  {accessInfo?.temporaryPassword && (
                    <div className="rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-900 ring-1 ring-blue-100">
                      <p><strong>Acesso criado.</strong> Login: {accessInfo.login}</p>
                      <p>Senha temporária: <strong>{accessInfo.temporaryPassword}</strong></p>
                      <p className="mt-1 text-xs">Oriente a pessoa a trocar a senha no primeiro acesso.</p>
                    </div>
                  )}

                  <label className="grid gap-1 text-sm font-black text-[#123D2C]">Observação opcional
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="rounded-xl border border-[#123D2C]/15 p-3 font-semibold" />
                  </label>
                  <button type="button" disabled={saving || !foundPerson || !entityId} onClick={() => void book()} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Agendando..." : "Confirmar agendamento"}</button>
                </>
              )}

              {bookingResult?.appointment && bookingResult.confirmation && (
                <div className="grid gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100">
                    <p className="text-lg font-black">Agendamento criado.</p>
                    <p className="mt-2">{bookingResult.appointment.personName}</p>
                    <p>{shortDate(bookingResult.appointment.appointmentDate)} · {bookingResult.appointment.appointmentTime} · {bookingResult.appointment.entityName}</p>
                    {bookingResult.appointment.order && <p>Ordem: {bookingResult.appointment.order}</p>}
                  </div>
                  <div className={`rounded-2xl p-4 text-sm font-semibold ring-1 ${bookingResult.confirmation.sms.sent ? "bg-blue-50 text-blue-900 ring-blue-100" : "bg-amber-50 text-amber-900 ring-amber-100"}`}>
                    <p className="font-black">{bookingResult.confirmation.sms.sent ? "SMS enviado." : "SMS não enviado automaticamente."}</p>
                    {!bookingResult.confirmation.sms.sent && <p className="mt-1">{bookingResult.confirmation.sms.error || "Copie o link abaixo e envie por outro canal."}</p>}
                  </div>
                  <button type="button" onClick={() => void navigator.clipboard.writeText(bookingResult.confirmation!.url)} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white">Copiar link de confirmação</button>
                  <button type="button" onClick={() => openModal("agendar")} className="rounded-xl bg-white px-4 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">Novo agendamento</button>
                </div>
              )}
            </div>
          )}

          {modal === "consultar" && (
            <div className="grid gap-3">
              <select value={payload.selectedDate} onChange={(event) => void load(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-bold text-[#123D2C]">
                {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
              </select>
              {payload.appointments.map((appointment) => (
                <article key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-[#123D2C]">{appointment.consulenteName}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{appointment.entityName} · {appointment.appointmentTime}{appointment.order ? ` · ordem ${appointment.order}` : ""}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">{statusLabel(appointment.status, appointment.confirmationStatus)}</span>
                  </div>
                  {appointment.status !== "cancelado" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {appointment.confirmationStatus !== "confirmed" && <button type="button" disabled={saving} onClick={() => void appointmentAction("confirm-manual", appointment.id)} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Confirmar</button>}
                      <button type="button" disabled={saving} onClick={() => void appointmentAction("cancel", appointment.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Cancelar</button>
                    </div>
                  )}
                </article>
              ))}
              {!payload.appointments.length && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhum agendamento nesta data.</p>}
            </div>
          )}

          {modal === "entidades" && (
            <div className="grid gap-4">
              <div className="grid gap-2 rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                <p className="text-sm font-black text-[#123D2C]">Situação em {shortDate(payload.selectedDate)}</p>
                {payload.entities.map((entity) => (
                  <div key={entity.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-[#123D2C]/10">
                    <div><p className="text-sm font-black text-[#123D2C]">{entity.name}</p><p className="text-xs font-semibold text-slate-500">{entity.booked}/{entity.capacity} agendado(s)</p></div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${entity.isAvailable ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{entity.isAvailable ? `${entity.available} vaga(s)` : "Suspenso"}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={saveAvailability} className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10">
                <p className="font-black text-[#123D2C]">Atualizar uma Entidade</p>
                <select value={management.entityId} onChange={(event) => setManagement((current) => ({ ...current, entityId: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" required>
                  <option value="">Escolha a Entidade</option>
                  {payload.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">De<input type="date" value={management.startsOn || payload.selectedDate} onChange={(event) => setManagement((current) => ({ ...current, startsOn: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" required /></label>
                  <label className="grid gap-1 text-xs font-black text-[#123D2C]">Até<input type="date" value={management.endsOn || payload.selectedDate} onChange={(event) => setManagement((current) => ({ ...current, endsOn: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" required /></label>
                </div>
                <label className="grid gap-1 text-xs font-black text-[#123D2C]">Situação
                  <select value={management.available ? "available" : "suspended"} onChange={(event) => setManagement((current) => ({ ...current, available: event.target.value === "available" }))} className="rounded-xl border border-[#123D2C]/15 p-3">
                    <option value="available">Disponível</option>
                    <option value="suspended">Suspender atendimento</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black text-[#123D2C]">Capacidade máxima por dia (opcional)<input type="number" min={1} value={management.capacity} onChange={(event) => setManagement((current) => ({ ...current, capacity: event.target.value }))} className="rounded-xl border border-[#123D2C]/15 p-3" placeholder="Ex.: 4" /></label>
                <label className="grid gap-1 text-xs font-black text-[#123D2C]">Motivo/observação<textarea value={management.reason} onChange={(event) => setManagement((current) => ({ ...current, reason: event.target.value }))} rows={2} className="rounded-xl border border-[#123D2C]/15 p-3" /></label>
                <button disabled={saving} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar disponibilidade"}</button>
              </form>
            </div>
          )}

          {modal === "ajuda" && (
            <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-700">
              <Info title="1. Agende">A Recepção escolhe uma data válida, uma Entidade com vaga e localiza o cadastro pelo WhatsApp.</Info>
              <Info title="2. Confirmação">O sistema cria um link único. Com SMS configurado, o link é enviado automaticamente; sem SMS, ele pode ser copiado e enviado por outro canal.</Info>
              <Info title={`3. Prazo · ${payload.settings.confirmationCutoff}`}>A confirmação precisa ocorrer até o horário-limite do dia do atendimento. Sem confirmação, o agendamento expira e a vaga é liberada quando o piloto é consultado; a Recepção pode então orientar ou refazer o agendamento.</Info>
              <Info title="4. Gestão simples">Capacidade e suspensão podem ser alteradas por data ou período sem excluir a Entidade do cadastro.</Info>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}

function ActionButton({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-[1.35rem] bg-white p-4 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 hover:shadow-lg"><span className="block text-lg font-black text-[#123D2C]">{title}</span><span className="mt-1 block text-xs font-bold text-slate-500">{subtitle}</span><span className="mt-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#2F6B43]">TOQUE PARA ABRIR</span></button>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-[#F7FAF2] p-2 ring-1 ring-[#123D2C]/10"><span className="block text-lg font-black text-[#123D2C]">{value}</span><span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{label}</span></div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 px-5 py-4"><h2 className="text-xl font-black text-[#123D2C]">{title}</h2><button type="button" onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button></header>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">{title}</p><p className="mt-1">{children}</p></div>;
}

function modalTitle(modal: Exclude<ModalKind, null>) {
  if (modal === "agendar") return "Agendar Filho de Fora/Consulente";
  if (modal === "consultar") return "Consultar e confirmar";
  if (modal === "entidades") return "Disponibilidade das Entidades";
  return "Como funciona o piloto";
}
