"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { TUCXA_ADDRESS_SHORT, TUCXA_MAPS_URL } from "@/lib/organizacao-em-harmonia/tucxa-location";

const API = "/api/organizacao-em-harmonia/consulente/agendamento-piloto";
const LOGIN = "/solucoes/organizacao-em-harmonia/agendamento/login";
type EntityOption = { id: string; name: string; displayName: string; available: number; isDefault: boolean };
type DateOption = { date: string; label: string; alreadyBooked: boolean; entities: EntityOption[] };
type RelatedPerson = { personId: string; fullName: string; relationship: string; relationshipId: string; pending?: boolean };
type IncomingLink = { relationshipId: string; ownerName: string; relationship: string };
type Appointment = { id: string; appointmentDate: string; appointmentTime: string; entityName: string; status: string; confirmationStatus: string; order: number | null; firstTimeIndicatorActive?: boolean };
type Payload = {
  profile: { personId: string; fullName: string; whatsapp: string; email: string };
  preferences: { openUpcomingOnLogin: boolean };
  bookingRule: { mode: "first_time_only" | "default_entity" | "awaiting_default_entity"; defaultEntityId: string };
  defaultEntity: { id: string; name: string };
  dates: DateOption[];
  relatedPeople: RelatedPerson[];
  incomingLinks?: IncomingLink[];
  targetPerson: { personId: string; fullName: string };
  appointments: Appointment[];
};
type Modal = "agendar" | "agendamentos" | "cadastro" | "configuracoes" | "sucesso" | "familia" | "familiaResultado" | "pessoa" | "tipoCadastro" | "cadastroWhatsapp" | "cadastroSemWhatsapp" | "solicitarVinculo" | null;
type View = "date" | "entity";
type BookingStep = "who" | "dates" | "entities" | "review";
function shortDate(value: string) { const [y, m, d] = value.split("-"); return y && m && d ? `${d}/${m}/${y}` : value; }
function firstName(value: string) { return value.trim().split(/\s+/).filter(Boolean)[0] || "Consulente"; }
function firstAndLastName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : (parts[0] || "Consulente");
}
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
  const [bookingFor, setBookingFor] = useState<"self" | "group">("self");
  const [bookingView, setBookingView] = useState<View>("date");
  const [bookingStep, setBookingStep] = useState<BookingStep>("who");
  // AG29: paginacao real nos dois passos, sem rolagem de listas extensas.
  const [datePage, setDatePage] = useState(1);
  const [entityChoicePage, setEntityChoicePage] = useState(1);
  const pageSize = 4;
  const [relatedForm, setRelatedForm] = useState({ fullName: "", relationship: "", whatsapp: "" });
  const [requestFirstTime, setRequestFirstTime] = useState(false);
  const [requestEntity, setRequestEntity] = useState("");
  const [bookingResult, setBookingResult] = useState({ name: "", date: "", entity: "" });
  const [groupDate, setGroupDate] = useState("");
  const [groupPersonIds, setGroupPersonIds] = useState<string[]>([]);
  const [groupOptions, setGroupOptions] = useState<Record<string, EntityOption[]>>({});
  const [groupEntities, setGroupEntities] = useState<Record<string, string>>({});
  const [groupResults, setGroupResults] = useState<Array<{ name: string; ok: boolean; detail: string }>>([]);
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
      if (openOnLogin && ((data.preferences.openUpcomingOnLogin && data.appointments.length) || (data.incomingLinks?.length ?? 0) > 0)) setModal("agendamentos");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar o painel."); }
    finally { setLoading(false); }
  }, [callApi]);

  useEffect(() => { void Promise.resolve().then(() => load(true)); }, [load]);

  async function chooseTarget(personId: string) {
    const nextPersonId = personId || payload?.profile.personId || "";
    setTargetPersonId(nextPersonId); setSelectedDate(""); setSelectedEntityId("");
    // AG27: não repetir a consulta cara de disponibilidade ao escolher
    // novamente a pessoa que já está carregada no painel.
    if (nextPersonId && payload?.targetPerson.personId === nextPersonId) return;
    setLoading(true); await load(false, personId);
  }

  async function book() {
    if (!selectedDate || !selectedEntityId || !targetPersonId) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await callApi({ action: "book", appointmentDate: selectedDate, entityId: selectedEntityId, targetPersonId });
      setBookingResult({ name: payload?.targetPerson.fullName || "Consulente", date: selectedDate, entity: chosenEntity?.displayName || "Entidade" });
      setBookingStep("who"); setBookingFor("self");
      setModal("sucesso");
      // Não aguardar outra consulta extensa para mostrar o resultado.
      void load(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível agendar."); }
    finally { setSaving(false); }
  }

  // AG28: solicitações de vínculo são enviadas voluntariamente à Recepção.
  async function sendLinkRequest() {
    const name = relatedForm.fullName.trim();
    const relationship = relatedForm.relationship.trim();
    if (name.length < 3 || !relationship || (!requestFirstTime && !requestEntity.trim())) {
      setError("Informe nome completo, relação e Entidade habitual (se não for Primeira Vez)."); return;
    }
    // Abre a janela pelo gesto de clique: bloqueadores impedem aberturas após o fetch.
    const target = window.open("about:blank", "_blank");
    setSaving(true); setError("");
    try {
      const saved = await callApi({ action: "request-link", ...relatedForm,
        firstTime: requestFirstTime, usualEntity: requestEntity });
      const text = ["TUCXA - SOLICITAÇÃO DE VÍNCULO", `Solicitante: ${payload?.profile.fullName || profile.fullName}`,
        `Pessoa: ${name}`, `WhatsApp próprio: ${relatedForm.whatsapp.trim() || "Não possui"}`,
        `Relação: ${relationship}`, `Primeira vez: ${requestFirstTime ? "Sim" : "Não"}`,
        requestFirstTime ? "" : `Entidade habitual: ${requestEntity.trim()}`,
        `Protocolo: ${saved.requestId}`,
        "Solicito à Recepção a validação e a vinculação do cadastro."].filter(Boolean).join("\n");
      const url = `https://wa.me/5519989045150?text=${encodeURIComponent(text)}`;
      if (target) target.location.href = url;
      else window.location.href = url;
      setMessage("Solicitação registrada. Envie a mensagem à Recepção na conversa do WhatsApp.");
    } catch (e) {
      if (target) target.close();
      setError(e instanceof Error ? e.message : "Não foi possível registrar a solicitação.");
    } finally { setSaving(false); }
  }

  async function loadGroupOptions(date: string, personIds: string[]) {
    setGroupDate(date); setGroupPersonIds(personIds); setGroupEntities({}); setGroupOptions({});
    if (!date || !personIds.length) return;
    setLoading(true); setError("");
    try {
      const entries = await Promise.all(personIds.map(async (id) => {
        const data = await callApi(undefined, id) as Payload;
        const day = data.dates.find((item) => item.date === date);
        return [id, day && !day.alreadyBooked ? day.entities : []] as const;
      }));
      setGroupOptions(Object.fromEntries(entries));
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível consultar o grupo."); }
    finally { setLoading(false); }
  }

  async function bookGroup() {
    if (!groupDate || !groupPersonIds.length) return;
    setSaving(true); setError("");
    const names = new Map([...(payload?.relatedPeople || []).filter((item) => item.personId)
      .map((item) => [item.personId, item.fullName] as const),
      [payload?.profile.personId || "", payload?.profile.fullName || "Consulente"] as const]);
    const results: Array<{ name: string; ok: boolean; detail: string }> = [];
    try {
      // Reserva individual: falhas parciais são exibidas, nunca reexecutadas automaticamente.
      for (const id of groupPersonIds) {
        const entityId = groupEntities[id];
        if (!entityId) { results.push({ name: names.get(id) || "Consulente", ok: false, detail: "Entidade não selecionada." }); continue; }
        try {
          await callApi({ action: "book", targetPersonId: id, appointmentDate: groupDate, entityId });
          results.push({ name: names.get(id) || "Consulente", ok: true, detail: "Agendamento registrado; confirmação individual." });
        } catch (e) {
          results.push({ name: names.get(id) || "Consulente", ok: false,
            detail: e instanceof Error ? e.message : "Reserva não concluída." });
        }
      }
      setGroupResults(results);
      setModal("familiaResultado");
      void load(false);
    } finally { setSaving(false); }
  }

  async function decideLink(relationshipId: string, approved: boolean) {
    setSaving(true); setError(""); setMessage("");
    try {
      const data = await callApi({ action: "decide-link-request", relationshipId, approved });
      setMessage(data.message || "Solicitação analisada.");
      await load(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível analisar o vínculo."); }
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
  const defaultEntity = payload?.defaultEntity.name || "a confirmar";
  const dateChoices = (payload?.dates ?? []).filter((date) => date.entities.length > 0 || date.alreadyBooked);
  const entityDateChoices = (payload?.dates ?? []).filter((date) => date.entities.some((entity) => entity.id === selectedEntityId) || date.alreadyBooked);

  function openBookingPath(view: View) {
    setBookingView(view);
    setSelectedDate("");
    setSelectedEntityId("");
    setError("");
    setDatePage(1); setEntityChoicePage(1);
    setBookingStep(view === "date" ? "dates" : "entities");
  }

  function closeCurrentStep() {
    if (saving) return;
    setError("");
    if (modal === "solicitarVinculo" || modal === "familia") { setModal("agendar"); setBookingFor("self"); setBookingStep("who"); return; }
    if (modal !== "agendar" || bookingStep === "who") {
      setModal(null); setBookingStep("who"); return;
    }
    if (bookingStep === "review") setBookingStep(bookingView === "date" ? "entities" : "dates");
    else if (bookingStep === "entities" && bookingView === "date") setBookingStep("dates");
    else if (bookingStep === "dates" && bookingView === "entity") setBookingStep("entities");
    else setBookingStep("who");
  }


  const visibleDates = bookingView === "date" ? dateChoices : entityDateChoices;
  const visibleEntities = bookingView === "date" ? (selected?.entities || []) : entityChoices;
  const datePageCount = Math.max(1, Math.ceil(visibleDates.length / pageSize));
  const entityPageCount = Math.max(1, Math.ceil(visibleEntities.length / pageSize));
  const datePageSafe = Math.min(datePage, datePageCount);
  const entityPageSafe = Math.min(entityChoicePage, entityPageCount);
  const bookingStepTitle = bookingStep === "dates" ? "Escolher data" : bookingStep === "entities" ? "Escolher Entidade" : bookingStep === "review" ? "Confirmar agendamento" : "Agendar atendimento";

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
        <Card title="Agendar" text={`Entidade padrão: ${defaultEntity}.`} compactText="Atendimentos" onClick={() => { setModal("agendar"); setBookingStep("who"); setBookingFor("self"); void chooseTarget(""); }} />
        <Card title="Meus agendamentos" text={`${payload?.appointments.length || 0} próximo(s) agendamento(s).`} compactText={`${payload?.appointments.length || 0} próximo(s)`} onClick={() => setModal("agendamentos")} />
        <Card title="Cadastro" text="Atualize somente seus dados pessoais." compactText="Dados pessoais" onClick={() => setModal("cadastro")} />
        <Card title="Configurações" text="Escolha se seus próximos agendamentos devem abrir ao entrar." compactText="Preferências" onClick={() => setModal("configuracoes")} />
      </div>}
    </section>

    {modal && payload && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="tucxa-consulente-modal-title"
      onMouseDown={(e) => { if (e.currentTarget === e.target) closeCurrentStep(); }}>
      <section className="max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-2xl overflow-x-hidden overflow-y-auto rounded-[2rem] bg-white p-3 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tucxa-consulente-modal-title" className="text-xl font-black text-[#123D2C]">
            {modal === "agendar" ? bookingStepTitle : modal === "solicitarVinculo" ? "Solicitar vínculo à Recepção" : modal === "agendamentos" ? "Meus agendamentos" : modal === "sucesso" ? "Agendamento realizado" : modal === "familia" ? "Agendar grupo / família" : modal === "familiaResultado" ? "Resultado dos agendamentos" : modal === "cadastro" ? "Cadastro" : "Configurações"}
          </h2>
          <button type="button" onClick={closeCurrentStep} disabled={saving} className="shrink-0 rounded-xl bg-[#123D2C] px-4 py-2 font-black text-white disabled:opacity-50">Fechar</button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
        {message && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
        {loading && <p className="mt-3 text-sm font-semibold text-slate-600">Carregando opções de agendamento...</p>}
        {modal === "solicitarVinculo" && <div className="mt-4 grid gap-3 text-sm">
          <p className="rounded-xl bg-[#E9F2E7] p-3 font-semibold">A inclusão e a manutenção de pessoas vinculadas são realizadas somente pela Recepção. Informe os dados para abrir uma conversa com a Recepção no WhatsApp.</p>
          <label className="grid gap-1 font-black">Nome completo
            <input required maxLength={160} value={relatedForm.fullName} onChange={(e) => setRelatedForm((v) => ({ ...v, fullName: e.target.value }))} className="rounded-xl border p-3" />
          </label>
          <label className="grid gap-1 font-black">WhatsApp da pessoa, se possuir
            <input inputMode="tel" value={relatedForm.whatsapp} onChange={(e) => setRelatedForm((v) => ({ ...v, whatsapp: e.target.value }))} className="rounded-xl border p-3" />
          </label>
          <label className="grid gap-1 font-black">Parentesco ou relação (amigo, vizinho etc.)
            <input required maxLength={80} value={relatedForm.relationship} onChange={(e) => setRelatedForm((v) => ({ ...v, relationship: e.target.value }))} className="rounded-xl border p-3" />
          </label>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={requestFirstTime} onChange={(e) => setRequestFirstTime(e.target.checked)}/> É a primeira vez no TUCXA</label>
          {!requestFirstTime && <label className="grid gap-1 font-black">Entidade com que costuma ser atendida
            <input value={requestEntity} onChange={(e) => setRequestEntity(e.target.value)} className="rounded-xl border p-3" placeholder="Nome da Entidade (se souber)" />
          </label>}
          <button type="button" disabled={saving} onClick={() => void sendLinkRequest()} className="rounded-xl bg-[#123D2C] p-3 font-black text-white">Enviar solicitação pelo WhatsApp da Recepção</button>
          <p className="text-xs text-slate-600">O envio depende da confirmação da mensagem no WhatsApp. A solicitação não cria nem autoriza o vínculo automaticamente.</p>
        </div>}
        {modal === "familia" && <div className="mt-4 grid min-w-0 w-full max-w-full gap-3 overflow-x-hidden text-sm text-[#123D2C]">

          <div className="rounded-xl bg-[#F7FAF2] p-3"><p className="mb-2 font-black">Pessoas</p>
            {([{ personId: payload.profile.personId, fullName: payload.profile.fullName }]
              .concat(payload.relatedPeople.filter((item) => item.personId && !item.pending)))
              .filter((person, i, rows) => rows.findIndex((item) => item.personId === person.personId) === i)
              .map((person) => <label key={person.personId} className="flex items-center gap-2 py-2"><input type="checkbox" checked={groupPersonIds.includes(person.personId)}
                onChange={(e) => { const next = e.target.checked ? [...groupPersonIds, person.personId] : groupPersonIds.filter((id) => id !== person.personId); void loadGroupOptions(groupDate, next); }} />{firstAndLastName(person.fullName)}</label>)}
          </div>
          <label className="grid gap-1 font-black">Data
            <select className="w-full min-w-0 max-w-full rounded-xl border p-3" value={groupDate} onChange={(e) => void loadGroupOptions(e.target.value, groupPersonIds)}><option value="">Escolha uma data</option>
              {payload.dates.map((day) => <option key={day.date} value={day.date}>{shortDate(day.date)}</option>)}
            </select>
          </label>
          {loading && <p>Consultando disponibilidades individuais...</p>}
          {groupDate && !loading && groupPersonIds.map((id) => {
            const person = id === payload.profile.personId ? payload.profile.fullName : payload.relatedPeople.find((item) => item.personId === id)?.fullName || "Consulente";
            const options = groupOptions[id] || [];
            return <label key={id} className="grid w-full min-w-0 max-w-full gap-1 overflow-hidden rounded-xl border p-3"><strong className="min-w-0 break-words">{firstAndLastName(person)}</strong>
              <select value={groupEntities[id] || ""} disabled={!options.length} onChange={(e) => setGroupEntities((state) => ({ ...state, [id]: e.target.value }))} className="block w-full min-w-0 max-w-full truncate rounded-lg border p-2">
                <option value="">{options.length ? "Selecione a Entidade" : "Sem vagas ou já agendado"}</option>
                {options.map((entity) => <option key={entity.id} value={entity.id}>{entity.displayName} ({entity.available} vagas)</option>)}
              </select>
            </label>;
          })}
          <button type="button" disabled={saving || loading || !groupDate || !groupPersonIds.length || groupPersonIds.some((id) => !groupEntities[id])} onClick={() => void bookGroup()}
            className="w-full min-w-0 max-w-full break-words rounded-xl bg-[#123D2C] p-3 text-center text-xs font-black text-white disabled:opacity-40 sm:text-sm">{saving ? "Agendando..." : "Registrar agendamentos individuais"}</button>
        </div>}
        {modal === "familiaResultado" && <div className="mt-4 grid gap-2 text-sm">
          {groupResults.map((item, index) => <div key={index} className={`rounded-xl p-3 ${item.ok ? "bg-emerald-50" : "bg-amber-50"}`}>
            <strong>{item.name}: {item.ok ? "Registrado" : "Não registrado"}</strong><p>{item.detail}</p>
          </div>)}
          <p>Os registros concluídos permanecem válidos mesmo que outro falhe. Não repita todos sem conferir.</p>
          <button type="button" onClick={() => setModal("agendamentos")} className="rounded-xl bg-[#123D2C] p-3 font-black text-white">Ver meus agendamentos</button>
        </div>}
        {modal === "sucesso" && <div className="mt-4 grid gap-3 rounded-2xl bg-[#E9F2E7] p-4 text-sm text-[#123D2C]" role="status">
          <p className="font-black">Agendamento registrado com sucesso!</p>
          <p><strong>Consulente:</strong> {bookingResult.name}</p>
          <p><strong>Data:</strong> {shortDate(bookingResult.date)}</p>
          <p><strong>Entidade:</strong> {bookingResult.entity}</p>
          <p>A confirmação ou recusa será feita pelo link enviado ao WhatsApp da pessoa atendida. Quando não houver WhatsApp próprio, o link será enviado ao contato responsável pelo agendamento.</p>
          <button type="button" onClick={() => setModal("agendamentos")} className="rounded-xl bg-[#123D2C] p-3 font-black text-white">Meus agendamentos</button>
        </div>}
        {modal === "agendar" && <div className="mt-4 grid gap-3">
          {bookingStep === "who" && <>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F7FAF2] p-2" role="group" aria-label="Tipo de agendamento">
              <button type="button" aria-pressed={bookingFor === "self"} onClick={() => { setBookingFor("self"); void chooseTarget(""); }} className={`rounded-lg p-2 text-sm font-black ${bookingFor === "self" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}><span className="block">Para mim</span>{bookingFor === "self" && <span className="block text-[9px] tracking-wider">SELECIONADO</span>}</button>
              <button type="button" aria-pressed={bookingFor === "group"} onClick={() => { setBookingFor("group"); if (payload.relatedPeople.some((p) => p.personId && !p.pending)) { setModal("familia"); setGroupDate(""); setGroupPersonIds([]); setGroupOptions({}); setGroupEntities({}); } else setModal("solicitarVinculo"); }} className={`rounded-lg p-2 text-sm font-black ${bookingFor === "group" ? "bg-[#123D2C] text-white" : "bg-white text-[#123D2C]"}`}><span className="block">Várias pessoas / família</span>{bookingFor === "group" && <span className="block text-[9px] tracking-wider">SELECIONADO</span>}</button>
            </div>
            {!loading && bookingFor === "self" && <>
              <p className="text-sm font-semibold text-[#123D2C]">
                {firstAndLastName(payload.targetPerson.fullName)} — Entidade Padrão: <strong>{defaultEntity}</strong>
              </p>
              {payload.bookingRule.mode === "awaiting_default_entity" && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Sem Entidade padrão definida. São oferecidas apenas Entidades que aceitam agendamentos avulsos. Se não houver opções, consulte a Recepção.</p>}
              {<div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => openBookingPath("date")} className="rounded-xl border border-[#123D2C]/20 bg-[#E9F2E7] p-3 text-left"><strong className="block text-sm">Data</strong><span className="text-[10px] font-black uppercase text-[#2F6B43]">Toque para abrir</span></button>
                <button type="button" onClick={() => openBookingPath("entity")} className="rounded-xl border border-[#123D2C]/20 bg-white p-3 text-left"><strong className="block text-sm">Entidade</strong><span className="text-[10px] font-black uppercase text-[#2F6B43]">Toque para abrir</span></button>
              </div>}
            </>}
          </>}
          {!loading && bookingStep === "dates" && <>
            {bookingView === "entity" && selectedEntityId && <p className="text-sm font-semibold text-[#123D2C]">Entidade: {entityChoices.find((item) => item.id === selectedEntityId)?.displayName || "Selecionada"}</p>}
            <div className="grid gap-2">
              {visibleDates.slice((datePageSafe - 1) * pageSize, datePageSafe * pageSize).map((date) => {
                const selectable = !date.alreadyBooked && (bookingView === "date" ? date.entities.length > 0 : date.entities.some((entity) => entity.id === selectedEntityId));
                return <button key={date.date} type="button" disabled={!selectable} onClick={() => { setSelectedDate(date.date); if (bookingView === "date") { setSelectedEntityId(""); setBookingStep("entities"); } else { setBookingStep("review"); } }}
                  className="rounded-xl border border-[#123D2C]/15 bg-white p-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-65">
                  <strong>{shortDate(date.date)}</strong> {date.alreadyBooked ? <span className="text-amber-800">— Já agendado</span> : <span className="text-slate-600">— {bookingView === "date" ? `${date.entities.length} Entidade(s) com vaga` : `${date.entities.find((entity) => entity.id === selectedEntityId)?.available ?? 0} vaga(s)`}</span>}
                </button>;
              })}
              {!visibleDates.length && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Não há datas disponíveis neste período.</p>}
              {datePageCount > 1 && <div className="grid grid-cols-3 items-center gap-2" aria-label="Paginação das datas">
                <button type="button" disabled={datePageSafe === 1} onClick={() => setDatePage((page) => Math.max(1, page - 1))} className="rounded-lg border p-2 text-xs font-bold disabled:opacity-40">Anterior</button>
                <span className="text-center text-xs font-semibold">{datePageSafe} / {datePageCount}</span>
                <button type="button" disabled={datePageSafe >= datePageCount} onClick={() => setDatePage((page) => Math.min(datePageCount, page + 1))} className="rounded-lg border p-2 text-xs font-bold disabled:opacity-40">Próxima</button>
              </div>}
            </div>
          </>}
          {!loading && bookingStep === "entities" && <>
            {bookingView === "date" && <p className="text-sm font-semibold text-[#123D2C]">Data: {shortDate(selectedDate)}</p>}
            <div className="grid gap-2">
              {visibleEntities.slice((entityPageSafe - 1) * pageSize, entityPageSafe * pageSize).map((entity) => <button key={entity.id} type="button" onClick={() => { setSelectedEntityId(entity.id); setBookingStep(bookingView === "date" ? "review" : "dates"); }}
                className="rounded-xl border border-[#123D2C]/15 bg-white p-3 text-left text-sm"><strong>{entity.displayName}</strong><span className="block text-xs text-slate-600">{bookingView === "date" ? `${entity.available} vaga(s)` : `${payload.dates.filter((date) => !date.alreadyBooked && date.entities.some((item) => item.id === entity.id)).length} data(s) disponível(is)`}{entity.isDefault ? " · Entidade padrão" : ""}</span></button>)}
              {!visibleEntities.length && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Não há Entidades disponíveis para esta opção.</p>}
              {entityPageCount > 1 && <div className="grid grid-cols-3 items-center gap-2" aria-label="Paginação das Entidades">
                <button type="button" disabled={entityPageSafe === 1} onClick={() => setEntityChoicePage((page) => Math.max(1, page - 1))} className="rounded-lg border p-2 text-xs font-bold disabled:opacity-40">Anterior</button>
                <span className="text-center text-xs font-semibold">{entityPageSafe} / {entityPageCount}</span>
                <button type="button" disabled={entityPageSafe >= entityPageCount} onClick={() => setEntityChoicePage((page) => Math.min(entityPageCount, page + 1))} className="rounded-lg border p-2 text-xs font-bold disabled:opacity-40">Próxima</button>
              </div>}
            </div>
          </>}
          {!loading && bookingStep === "review" && <div className="grid gap-3">
            <div className="rounded-xl bg-[#F7FAF2] p-4 text-sm text-[#123D2C]">
              <p><strong>Pessoa:</strong> {firstAndLastName(payload.targetPerson.fullName)}</p>
              <p className="mt-2"><strong>Data:</strong> {shortDate(selectedDate)}</p>
              <p className="mt-2"><strong>Entidade:</strong> {chosenEntity?.displayName || "Não disponível"}</p>
            </div>
            {!chosenEntity && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">A vaga selecionada não está mais disponível. Volte e escolha outra opção.</p>}
            <button disabled={!selectedDate || !selectedEntityId || !chosenEntity || saving} type="button" onClick={() => void book()} className="rounded-xl bg-[#123D2C] px-5 py-4 font-black text-white disabled:opacity-50">{saving ? "Agendando..." : "Confirmar agendamento"}</button>
          </div>}
        </div>}
        {modal === "agendamentos" && <div className="mt-4 grid gap-3">
          <div className="rounded-xl bg-[#F7FAF2] p-3 text-xs font-semibold leading-relaxed text-[#123D2C]">
            <p><strong>📍 Endereço:</strong> {TUCXA_ADDRESS_SHORT} · <a href={TUCXA_MAPS_URL} target="_blank" rel="noopener noreferrer" className="underline">Ver no mapa</a></p>
            <p className="mt-1"><strong>Chegada:</strong> 18h30–19h20 · <strong>Porta fecha:</strong> 19h20 · <strong>Início:</strong> 20h00</p>
          </div>{payload.appointments.length ? payload.appointments.map((item) => <article key={item.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><strong className="text-[#123D2C]">{shortDate(item.appointmentDate)}</strong><p className="mt-1 font-semibold">{item.entityName}</p>{item.firstTimeIndicatorActive && <span className="mt-2 inline-flex rounded-full bg-fuchsia-50 px-2 py-1 text-[10px] font-black uppercase text-fuchsia-800">Primeira vez</span>}<p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600"><span className={`rounded-full px-2 py-1 text-xs font-black ring-1 ${statusClasses(item.status)}`}>{statusLabel(item.status)}</span>{item.order ? <span>{`Ordem ${item.order}`}</span> : null}</p></article>) : <p className="font-semibold">Você não possui próximos agendamentos.</p>}</div>}
        {modal === "agendamentos" && Boolean(payload.incomingLinks?.length) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-black">Solicitações de vínculo para você</p>
          {payload.incomingLinks?.map((link) => <div key={link.relationshipId} className="mt-2 rounded-lg bg-white p-2">
            <p><strong>{link.ownerName}</strong> solicita gerenciar agendamentos com você ({link.relationship}).</p>
            <div className="mt-2 flex gap-2"><button disabled={saving} type="button" onClick={() => void decideLink(link.relationshipId, true)} className="rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-bold text-white">Autorizar vínculo</button><button disabled={saving} type="button" onClick={() => void decideLink(link.relationshipId, false)} className="rounded-lg border px-3 py-2 text-xs font-bold">Recusar</button></div>
          </div>)}
        </div>}
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
