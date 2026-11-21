"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/consulente/agendamento-piloto";
const LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
type EntityOption = { id: string; name: string; displayName: string; available: number; isDefault: boolean };
type DateOption = { date: string; label: string; alreadyBooked: boolean; entities: EntityOption[] };
type RelatedPerson = { personId: string; fullName: string; relationship: string; relationshipId: string; pending?: boolean };
type Appointment = { id: string; appointmentDate: string; appointmentTime: string; entityName: string; status: string; confirmationStatus: string; order: number | null; firstTimeIndicatorActive?: boolean };
type Payload = {
  profile: { fullName: string; whatsapp: string; email: string };
  preferences: { openUpcomingOnLogin: boolean };
  bookingRule: { mode: "first_time_only" | "default_entity" | "awaiting_default_entity"; defaultEntityId: string };
  defaultEntity: { id: string; name: string };
  dates: DateOption[];
  relatedPeople: RelatedPerson[];
  targetPerson: { personId: string; fullName: string };
  appointments: Appointment[];
};
type Modal = "agendar" | "agendamentos" | "cadastro" | "configuracoes" | null;
type View = "date" | "entity";
function shortDate(value: string) { const [y, m, d] = value.split("-"); return y && m && d ? `${d}/${m}/${y}` : value; }
function firstName(value: string) { return value.trim().split(/\s+/).filter(Boolean)[0] || "Consulente"; }
function statusLabel(value: string) { return ({ solicitado: "Solicitado", confirmado: "Confirmado", cancelado: "Cancelado", presente: "Presente", concluido: "Concluído", ausente: "Não Chegou" } as Record<string, string>)[value] || value; }
function statusClasses(value: string) {
  if (["confirmado", "presente", "concluido"].includes(value)) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (value === "cancelado") return "bg-red-50 text-red-700 ring-red-200";
  if (value === "solicitado") return "bg-amber-50 text-amber-900 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function ConsulenteAgendamentoPilotoPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [targetPersonId, setTargetPersonId] = useState("");
  const [bookingFor, setBookingFor] = useState<"self" | "other">("self");
  const [bookingView, setBookingView] = useState<View>("date");
  const [showRegistration, setShowRegistration] = useState(false);
  const [relatedForm, setRelatedForm] = useState({ fullName: "", relationship: "" });
  const [profile, setProfile] = useState({ fullName: "", whatsapp: "", email: "" });
  const [openUpcoming, setOpenUpcoming] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const callApi = useCallback(async (body?: Record<string, unknown>, queryTargetId = "") => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { window.location.replace(LOGIN); throw new Error("Sessão não encontrada."); }
    const url = queryTargetId ? `${API}?targetPersonId=${encodeURIComponent(queryTargetId)}` : API;
    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined, cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
    return data;
  }, []);

  const load = useCallback(async (openOnLogin = false, personId = "") => {
    setError("");
    try {
      const data = await callApi(undefined, personId) as Payload;
      setPayload(data); setProfile(data.profile); setOpenUpcoming(data.preferences.openUpcomingOnLogin);
      setTargetPersonId(data.targetPerson.personId);
      setSelectedDate(""); setSelectedEntityId("");
      if (openOnLogin && data.preferences.openUpcomingOnLogin && data.appointments.length) setModal("agendamentos");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar o painel."); }
    finally { setLoading(false); }
  }, [callApi]);

  useEffect(() => { void Promise.resolve().then(() => load(true)); }, [load]);

  async function chooseTarget(personId: string) {
    setTargetPersonId(personId); setSelectedDate(""); setSelectedEntityId("");
    setLoading(true); await load(false, personId);
  }

  async function book() {
    if (!selectedDate || !selectedEntityId || !targetPersonId) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const data = await callApi({ action: "book", appointmentDate: selectedDate, entityId: selectedEntityId, targetPersonId });
      setMessage(data.message || "Agendamento realizado.");
      await load(false);
      if (bookingFor === "other") { setBookingFor("self"); setModal(null); }
      else setModal("agendamentos");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível agendar."); }
    finally { setSaving(false); }
  }

  async function registerRelated(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const data = await callApi({ action: "register-dependent", ...relatedForm });
      setMessage(data.message || "Pessoa cadastrada."); setRelatedForm({ fullName: "", relationship: "" });
      setShowRegistration(false); await load(false);
      setBookingFor("other");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível cadastrar a pessoa."); }
    finally { setSaving(false); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const data = await callApi({ action: "update-profile", ...profile }); setMessage(data.message || "Dados atualizados."); await load(false); setModal(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar."); }
    finally { setSaving(false); }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const data = await callApi({ action: "save-settings", openUpcomingOnLogin: openUpcoming }); setMessage(data.message || "Configuração salva."); await load(false); setModal(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  async function signOut() { await supabaseBrowser.auth.signOut(); window.location.replace(LOGIN); }

  const entityChoices = useMemo(() => {
    const map = new Map<string, EntityOption>();
    for (const date of payload?.dates ?? []) for (const entity of date.entities) map.set(entity.id, entity);
    return Array.from(map.values()).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.displayName.localeCompare(b.displayName, "pt-BR"));
  }, [payload]);
  const selected = payload?.dates.find((item) => item.date === selectedDate);
  const chosenEntity = selected?.entities.find((entity) => entity.id === selectedEntityId);
  const defaultEntity = payload?.defaultEntity.name || "Entidade a definir";

  return <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
    <TucxaPublicHeader navLabel="Agendamento · Consulente" hideNavigation showSupport={false}
      consulenteTopBar={{ fullName: payload?.profile.fullName || profile.fullName, onSignOut: () => { void signOut(); } }} />
    <section className="mx-auto max-w-5xl px-3 py-3 sm:px-6 sm:py-5">
      <div className="rounded-[1.5rem] bg-[#123D2C] px-4 py-3 text-white shadow-xl sm:rounded-[2rem] sm:p-7">
        <h1 className="text-xl font-black sm:text-3xl">Olá, consulente {firstName(payload?.profile.fullName || profile.fullName)}.</h1>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#E8F1E5] sm:mt-2 sm:text-base">Aqui você agenda seus atendimentos, de seus familiares e amigos, consulta próximos agendamentos e mantém seus dados atualizados.</p>
      </div>
      {error && <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-2xl bg-emerald-50 p-3 font-bold text-emerald-800">{message}</p>}
      {loading ? <p className="mt-6 font-bold">Carregando...</p> : <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
        <Card title="Agendar" text={`Entidade padrão: ${defaultEntity}.`} compactText="Atendimentos" onClick={() => { setModal("agendar"); setBookingFor("self"); setShowRegistration(false); void chooseTarget(""); }} />
        <Card title="Meus agendamentos" text={`${payload?.appointments.length || 0} próximo(s) agendamento(s).`} compactText={`${payload?.appointments.length || 0} próximo(s)`} onClick={() => setModal("agendamentos")} />
        <Card title="Cadastro" text="Atualize somente seus dados pessoais." compactText="Dados pessoais" onClick={() => setModal("cadastro")} />
        <Card title="Configurações" text="Escolha se seus próximos agendamentos devem abrir ao entrar." compactText="Preferências" onClick={() => setModal("configuracoes")} />
      </div>}
    </section>

    {modal && payload && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="tucxa-consulente-modal-title"
      onMouseDown={(e) => { if (e.currentTarget === e.target) setModal(null); }}>
      <section className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tucxa-consulente-modal-title" className="text-xl font-black text-[#123D2C]">{modal === "agendar" ? "Agendar atendimento" : modal === "agendamentos" ? "Meus agendamentos" : modal === "cadastro" ? "Cadastro" : "Configurações"}</h2>
          <button type="button" onClick={() => setModal(null)} className="rounded-xl bg-[#123D2C] px-4 py-2 font-black text-white">Fechar</button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
        {message && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
        {loading && <p className="mt-3 text-sm font-semibold text-slate-600">Consultando disponibilidade...</p>}
        {modal === "agendar" && <div className="mt-4 grid gap-3">
          <fieldset className="rounded-xl bg-[#F7FAF2] p-3">
            <legend className="text-sm font-black text-[#123D2C]">Para quem é o atendimento?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={bookingFor === "self"} onClick={() => { setBookingFor("self"); setShowRegistration(false); void chooseTarget(""); }} className={`rounded-lg p-2 text-sm font-black ${bookingFor === "self" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>Para mim</button>
              <button type="button" aria-pressed={bookingFor === "other"} onClick={() => { setBookingFor("other"); setSelectedDate(""); setSelectedEntityId(""); }} className={`rounded-lg p-2 text-sm font-black ${bookingFor === "other" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}>Outra pessoa</button>
            </div>
          </fieldset>
          {bookingFor === "other" && <div className="grid gap-2 rounded-xl border border-[#123D2C]/10 p-3">
            <p className="text-sm font-black">Pessoa vinculada ao seu cadastro</p>
            {payload.relatedPeople.length > 0 && <select className="w-full rounded-lg border p-3" value={targetPersonId === payload.relatedPeople.find((person) => person.personId === targetPersonId)?.personId ? targetPersonId : ""} onChange={(e) => { if (e.target.value) void chooseTarget(e.target.value); }}>
              <option value="">Selecione uma pessoa</option>
              {payload.relatedPeople.map((person) => <option key={person.relationshipId || person.personId} value={person.personId || `pending:${person.relationshipId}`} disabled={person.pending}>{person.fullName} — {person.relationship}{person.pending ? " · aguardando Recepção" : ""}</option>)}
            </select>}
            {!payload.relatedPeople.length && <p className="text-xs text-slate-600">Você ainda não possui pessoas vinculadas cadastradas neste sistema.</p>}
            <button type="button" className="rounded-lg bg-[#E9F2E7] p-2 text-xs font-black text-[#123D2C]" onClick={() => { setShowRegistration((value) => !value); setSelectedDate(""); setSelectedEntityId(""); }}>Cadastrar outra pessoa</button>
            {showRegistration && <form onSubmit={(e) => void registerRelated(e)} className="grid gap-2">
              <p className="text-xs text-slate-600">A solicitação de vínculo ficará pendente até a Recepção verificar se já existe cadastro individual e confirmar a Entidade padrão. Nomes não são usados como identificação única.</p>
              <label className="grid gap-1 text-xs font-black">Nome completo<input required minLength={3} maxLength={160} value={relatedForm.fullName} onChange={(e) => setRelatedForm((v) => ({ ...v, fullName: e.target.value }))} className="rounded-lg border p-2" /></label>
              <label className="grid gap-1 text-xs font-black">Relação com você<input required minLength={2} maxLength={80} placeholder="Ex.: mãe, amigo, filho" value={relatedForm.relationship} onChange={(e) => setRelatedForm((v) => ({ ...v, relationship: e.target.value }))} className="rounded-lg border p-2" /></label>
              <button type="submit" disabled={saving} className="rounded-lg bg-[#123D2C] p-3 font-black text-white disabled:opacity-50">{saving ? "Cadastrando..." : "Cadastrar e vincular"}</button>
            </form>}
          </div>}
          {(bookingFor === "self" || Boolean(payload.relatedPeople.find((person) => person.personId === targetPersonId))) && !showRegistration && <>
            <p className="text-sm font-semibold">Atendimento para: <strong>{payload.targetPerson.fullName}</strong></p>
            {payload.bookingRule.mode === "awaiting_default_entity" && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">A Recepção precisa confirmar a Entidade padrão desta pessoa antes de liberar o agendamento.</p>}
            {payload.bookingRule.mode !== "awaiting_default_entity" && <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={bookingView === "date"} onClick={() => { setBookingView("date"); setSelectedDate(""); setSelectedEntityId(""); }} className={`rounded-xl border p-3 text-left ${bookingView === "date" ? "border-[#123D2C] bg-[#E9F2E7]" : "bg-white"}`}><strong className="block text-sm">Data</strong><span className="text-[10px] font-black uppercase text-[#2F6B43]">Toque para abrir</span></button>
                <button type="button" aria-pressed={bookingView === "entity"} onClick={() => { setBookingView("entity"); setSelectedDate(""); setSelectedEntityId(""); }} className={`rounded-xl border p-3 text-left ${bookingView === "entity" ? "border-[#123D2C] bg-[#E9F2E7]" : "bg-white"}`}><strong className="block text-sm">Entidade</strong><span className="text-[10px] font-black uppercase text-[#2F6B43]">Toque para abrir</span></button>
              </div>
              {bookingView === "date" && <div className="grid gap-2">
                <p className="text-xs text-slate-600">Escolha uma data. Datas já reservadas para essa pessoa não podem ser selecionadas.</p>
                {payload.dates.filter((date) => date.entities.length || date.alreadyBooked).map((date) => <button key={date.date} type="button" disabled={date.alreadyBooked || !date.entities.length} aria-pressed={selectedDate === date.date}
                  className={`rounded-xl border p-3 text-left text-sm ${selectedDate === date.date ? "border-[#123D2C] bg-[#E9F2E7]" : "bg-white"} disabled:cursor-not-allowed disabled:opacity-65`}
                  onClick={() => { setSelectedDate(date.date); setSelectedEntityId(date.entities.length === 1 ? date.entities[0].id : ""); }}>
                  <strong>{shortDate(date.date)}</strong> {date.alreadyBooked ? <span className="ml-1 text-amber-800">— Já agendado</span> : <span className="text-slate-600">— {date.entities.length} Entidade(s) com vaga</span>}
                </button>)}
                {selected && !selected.alreadyBooked && <label className="grid gap-1 text-sm font-black">Entidade
                  <select value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)} className="rounded-lg border p-3">
                    <option value="">Selecione a Entidade</option>
                    {selected.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.displayName} · {entity.available} vaga(s)</option>)}
                  </select></label>}
              </div>}
              {bookingView === "entity" && <div className="grid gap-2">
                <label className="grid gap-1 text-sm font-black">Escolha a Entidade
                  <select value={selectedEntityId} onChange={(e) => { setSelectedEntityId(e.target.value); setSelectedDate(""); }} className="rounded-lg border p-3">
                    <option value="">Selecione a Entidade</option>
                    {entityChoices.map((entity) => <option key={entity.id} value={entity.id}>{entity.displayName}{entity.isDefault ? " · padrão" : ""}</option>)}
                  </select>
                </label>
                {selectedEntityId && payload.dates.filter((date) => date.entities.some((entity) => entity.id === selectedEntityId) || date.alreadyBooked).map((date) => <button key={date.date} type="button"
                  disabled={date.alreadyBooked || !date.entities.some((entity) => entity.id === selectedEntityId)} aria-pressed={selectedDate === date.date}
                  onClick={() => setSelectedDate(date.date)} className={`rounded-xl border p-3 text-left text-sm ${selectedDate === date.date ? "border-[#123D2C] bg-[#E9F2E7]" : "bg-white"} disabled:opacity-65`}>
                  {shortDate(date.date)} {date.alreadyBooked ? "— Já agendado" : `— ${date.entities.find((entity) => entity.id === selectedEntityId)?.available ?? 0} vaga(s)`}
                </button>)}
              </div>}
              {payload.dates.every((date) => !date.entities.length) && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold">Não há datas com vaga para esta pessoa no período disponível.</p>}
              <button disabled={!selectedDate || !selectedEntityId || !chosenEntity || saving} type="button" onClick={() => void book()} className="rounded-xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50">{saving ? "Agendando..." : "Confirmar agendamento"}</button>
            </>}
          </>}
        </div>}
        {modal === "agendamentos" && <div className="mt-5 grid gap-3">{payload.appointments.length ? payload.appointments.map((item) => <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><strong className="text-[#123D2C]">{shortDate(item.appointmentDate)} · {item.appointmentTime}</strong><p className="mt-1 font-semibold">{item.entityName}</p>{item.firstTimeIndicatorActive && <span className="mt-2 inline-flex rounded-full bg-fuchsia-50 px-2 py-1 text-[10px] font-black uppercase text-fuchsia-800">Primeira vez</span>}<p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600"><span className={`rounded-full px-2 py-1 text-xs font-black ring-1 ${statusClasses(item.status)}`}>{statusLabel(item.status)}</span>{item.order ? <span>{`Ordem ${item.order}`}</span> : null}</p></article>) : <p className="font-semibold">Você não possui próximos agendamentos.</p>}</div>}
        {modal === "cadastro" && <form onSubmit={(e) => void saveProfile(e)} className="mt-5 grid gap-3"><input value={profile.fullName} onChange={(e) => setProfile((v) => ({ ...v, fullName: e.target.value }))} placeholder="Nome completo" className="rounded-xl border p-3" required/><input value={profile.whatsapp} onChange={(e) => setProfile((v) => ({ ...v, whatsapp: e.target.value }))} placeholder="WhatsApp com DDD" className="rounded-xl border p-3" required/><input value={profile.email} onChange={(e) => setProfile((v) => ({ ...v, email: e.target.value }))} placeholder="E-mail (opcional)" type="email" className="rounded-xl border p-3"/><button disabled={saving} className="rounded-xl bg-[#123D2C] p-3 font-black text-white">Salvar dados pessoais</button></form>}
        {modal === "configuracoes" && <form onSubmit={(e) => void saveSettings(e)} className="mt-5 grid gap-4"><label className="flex items-start gap-3 rounded-2xl bg-[#F7FAF2] p-4 font-semibold"><input type="checkbox" checked={openUpcoming} onChange={(e) => setOpenUpcoming(e.target.checked)} className="mt-1"/><span>Abrir meus próximos agendamentos automaticamente quando eu entrar no sistema.</span></label><button disabled={saving} className="rounded-xl bg-[#123D2C] p-3 font-black text-white">Salvar configuração</button></form>}
      </section>
    </div>}
  </main>;
}

function Card({ title, text, compactText, onClick }: { title: string; text: string; compactText: string; onClick: () => void }) {
  return <button type="button" onClick={onClick}
    className="flex min-h-[6.25rem] min-w-0 flex-col rounded-[1.15rem] bg-white p-3 text-left shadow ring-1 ring-[#123D2C]/10 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#123D2C] sm:min-h-[9rem] sm:rounded-[1.5rem] sm:p-5"
    aria-label={`${title}. ${text}. Toque para abrir.`}>
    <span className="block text-sm font-black leading-tight text-[#123D2C] sm:text-lg">{title}</span>
    <span className="mt-1 block break-words text-[0.7rem] font-semibold leading-snug text-slate-600 [overflow-wrap:anywhere] sm:hidden">{compactText}</span>
    <span className="mt-1 hidden text-sm font-semibold text-slate-600 sm:block">{text}</span>
    <span className="mt-auto block pt-2 text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#2F6B43] sm:pt-3 sm:text-xs sm:tracking-[0.14em]">Toque para abrir</span>
  </button>;
}
