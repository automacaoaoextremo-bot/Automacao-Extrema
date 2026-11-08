"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import {
  TUCXA_2027_API, TUCXA_2027_BASE, EVENT_CATEGORIES_2027,
  MIN_AGENDA_YEAR, MAX_AGENDA_YEAR, calendarCategory2027,
  eventHappensOn2027, prettyDate2027,
  type CalendarEvent2027, type Category2027, type Status2027,
} from "@/lib/organizacao-em-harmonia/tucxa-agenda-2027";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const STATUSES: Array<{ id: Status2027; label: string }> = [
  { id: "rascunho", label: "Rascunho (a confirmar)" },
  { id: "pendente", label: "Sugestão pendente" },
  { id: "aprovado", label: "Aprovado" },
  { id: "ajustes_solicitados", label: "Ajustes solicitados" },
  { id: "rejeitado", label: "Rejeitado" },
];
const INITIAL = {
  title: "", description: "", event_date: "", end_date: "",
  starts_time: "", ends_time: "", category: "evento" as Category2027,
  audience: "todos", location: "A definir", proposer_name: "", proposer_phone: "",
  proposer_email: "", website: "", consent: false, is_public: true, status: "rascunho" as Status2027,
};
type FormData2027 = typeof INITIAL & { id?: string };
type Popup = null | "calendar" | "filters" | "legend" | "suggest" | "management" | "edit" | "help";
type CalendarStep = "annual" | "month" | "day";
function fieldClass() {
  return "min-h-10 w-full rounded-lg border border-[#b7cbb9] bg-white px-3 py-2 text-sm text-[#123d2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#348c66]";
}
function readError(error: unknown) { return error instanceof Error ? error.message : "Erro inesperado."; }
function initialFromEvent(value: CalendarEvent2027): FormData2027 {
  return {
    ...INITIAL, id: value.id, title: value.title, description: value.description ?? "",
    event_date: value.event_date, end_date: value.end_date ?? "",
    starts_time: value.starts_time?.slice(0, 5) ?? "", ends_time: value.ends_time?.slice(0, 5) ?? "",
    category: value.category, audience: value.audience, location: value.location,
    status: value.status, is_public: value.is_public,
  };
}
function EventTag({ event }: { event: CalendarEvent2027 }) {
  const category = calendarCategory2027(event.category);
  return <span className="inline-flex max-w-full items-center rounded-md px-2 py-1 text-xs font-bold" style={{ backgroundColor: category.color, color: category.text }}>{event.title}</span>;
}
function ColorLegend() {
  return <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5" aria-label="Legenda de atividades">
    {EVENT_CATEGORIES_2027.map((item) => <span key={item.key} className="flex min-h-8 items-center justify-center rounded-full px-2 py-1 text-center text-[10px] font-bold leading-tight sm:text-xs"
      style={{ backgroundColor: item.color, color: item.text }}>{item.label}</span>)}
  </div>;
}
function PopupShell({ title, close, children, wide = false, toolbar }: {
  title: string; close: () => void; children: ReactNode; wide?: boolean; toolbar?: ReactNode;
}) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#163a2c]/75 p-2 print:static print:block print:bg-white print:p-0">
    <section role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[calc(100dvh-16px)] w-full flex-col overflow-hidden rounded-[1.5rem] border border-[#dce8df] bg-[#fbfcf9] shadow-2xl print:max-h-none print:overflow-visible print:border-0 print:shadow-none ${wide ? "max-w-6xl" : "max-w-2xl"}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-white px-3 py-2 print:hidden sm:px-5">
        <h2 className="min-w-0 truncate text-sm font-black uppercase tracking-wide text-[#123d2c] sm:text-lg">{title}</h2>
        <div className="flex shrink-0 items-center gap-2">{toolbar}<button type="button" onClick={close} className="rounded-full bg-[#123d2c] px-4 py-2 text-xs font-bold text-white">Fechar</button></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 print:overflow-visible print:p-1 sm:p-5">{children}</div>
    </section>
  </div>;
}
// A consulta fica isolada do estado React. O useEffect aplica seus resultados
// apenas nos callbacks assincronos de Promise, evitando atualizacoes sincronas
// e prevenindo que respostas antigas substituam o ano em exibicao.
async function fetchCalendarEvents(
  year: number,
  management: boolean,
  signal: AbortSignal,
): Promise<{ events: CalendarEvent2027[]; authToken: string }> {
  let authToken = "";
  if (management) {
    const { data, error } = await supabaseBrowser.auth.getSession();
    if (signal.aborted) throw new Error("Consulta cancelada.");
    if (error) throw new Error(error.message);
    authToken = data.session?.access_token ?? "";
    if (!authToken) {
      throw new Error("Entre com sua conta autorizada para acessar a gestão do calendário.");
    }
  }

  const params = new URLSearchParams({ ano: String(year) });
  if (management) params.set("gestao", "1");
  const response = await fetch(`${TUCXA_2027_API}?${params}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    cache: "no-store",
    signal,
  });
  const result = (await response.json()) as { events?: CalendarEvent2027[]; error?: string };
  if (!response.ok) throw new Error(result.error || "Falha ao carregar calendário.");
  return { events: result.events ?? [], authToken };
}

export function TucxaAgenda2027Client({ management = false }: { management?: boolean }) {
  const [year, setYear] = useState(2027);
  const [events, setEvents] = useState<CalendarEvent2027[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState("");
  const [popup, setPopup] = useState<Popup>(null);
  const [calendarStep, setCalendarStep] = useState<CalendarStep>("annual");
  const [chosenMonth, setChosenMonth] = useState(0);
  const [chosenDate, setChosenDate] = useState("");
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("all");
  const [location, setLocation] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormData2027>({ ...INITIAL });
  const [decisionNotes, setDecisionNotes] = useState("");

  // Referencia da consulta em andamento: a troca de ano, a atualizacao manual
  // e o desmontar do componente cancelam pedidos que perderam relevancia.
  const activeRequest = useRef<AbortController | null>(null);

  // Chamado por acoes explicitas (Atualizar, salvar, aprovar, rejeitar).
  const load = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await fetchCalendarEvents(year, management, controller.signal);
      if (controller.signal.aborted) return;
      setToken(result.authToken);
      setEvents(result.events);
      setError("");
    } catch (err) {
      if (controller.signal.aborted) return;
      setToken("");
      setEvents([]);
      setError(readError(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [management, year]);

  // Na montagem e na troca de ano, a consulta e iniciada sem chamar
  // uma funcao que atualiza estado sincronicamente dentro do effect.
  // Todas as atualizacoes React acontecem apos a Promise resolver/rejeitar.
  useEffect(() => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    void fetchCalendarEvents(year, management, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setToken(result.authToken);
        setEvents(result.events);
        setError("");
        setLoading(false);
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setToken("");
        setEvents([]);
        setError(readError(err));
        setLoading(false);
      },
    );

    return () => {
      controller.abort();
      if (activeRequest.current === controller) activeRequest.current = null;
    };
  }, [management, year]);

  useEffect(() => {
    if (!popup) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) setPopup(null); };
    document.addEventListener("keydown", onEscape);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onEscape); };
  }, [popup, saving]);

  const audiences = useMemo(() => [...new Set(events.map((e) => e.audience).filter(Boolean))].sort(), [events]);
  const locations = useMemo(() => [...new Set(events.map((e) => e.location).filter(Boolean))].sort(), [events]);
  const filtered = useMemo(() => events.filter((event) => {
    if (category !== "all" && event.category !== category) return false;
    if (month !== "all") {
      const selectedMonth = Number(month);
      const startMonth = Number(event.event_date.slice(5, 7));
      const endMonth = Number((event.end_date ?? event.event_date).slice(5, 7));
      if (selectedMonth < startMonth || selectedMonth > endMonth) return false;
    }
    if (management && status !== "all" && event.status !== status) return false;
    if (audience !== "all" && event.audience !== audience) return false;
    if (location !== "all" && event.location !== location) return false;
    if (search && ![event.title, event.description ?? "", event.location].join(" ").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))) return false;
    return true;
  }), [events, category, month, status, audience, location, search, management]);
  const publicCount = events.filter((e) => e.status === "aprovado" && e.is_public).length;
  const pendingCount = events.filter((e) => e.status === "pendente").length;

  async function send(body: Record<string, unknown>, isManagement = management) {
    const response = await fetch(TUCXA_2027_API, {
      method: "POST", headers: {
        "Content-Type": "application/json",
        ...(isManagement ? { Authorization: `Bearer ${token}` } : {}),
      }, body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
    return result;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice(""); setError("");
    try {
      if (management) {
        await send({ ...form, action: "save" });
        setNotice("Evento salvo. A publicação depende de estar aprovado e com visibilidade pública habilitada.");
        setForm({ ...INITIAL }); setPopup("management"); await load();
      } else {
        const result = await send({ ...form, action: "suggest" }, false);
        setNotice(result.message || "Sua sugestão foi recebida para avaliação.");
        setForm({ ...INITIAL }); setPopup(null);
      }
    } catch (err) { setError(readError(err)); }
    finally { setSaving(false); }
  }
  async function decide(event: CalendarEvent2027, next: Status2027) {
    if (["rejeitado", "ajustes_solicitados"].includes(next) && decisionNotes.trim().length < 5) {
      setError("Descreva o motivo para rejeitar ou solicitar ajustes (mínimo 5 caracteres)."); return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      await send({ action: "decide", id: event.id, status: next, review_notes: decisionNotes });
      setNotice(`Evento “${event.title}” atualizado: ${STATUSES.find((s) => s.id === next)?.label}.`);
      setDecisionNotes(""); await load();
    } catch (err) { setError(readError(err)); }
    finally { setSaving(false); }
  }
  function openAnnual() { setCalendarStep("annual"); setPopup("calendar"); }
  function openMonth(index: number) { setChosenMonth(index); setCalendarStep("month"); setPopup("calendar"); }
  function openDay(day: string) { setChosenDate(day); setCalendarStep("day"); setPopup("calendar"); }
  function switchYear(next: number) {
    if (next < MIN_AGENDA_YEAR || next > MAX_AGENDA_YEAR) return;
    setLoading(true); setError("");
    setYear(next); setPage(0); setChosenDate(""); setCalendarStep("annual");
    setMonth("all"); setForm({ ...INITIAL });
  }
  function editEvent(next: FormData2027) { setForm(next); setPopup("edit"); }
  function monthGrid(index: number, compact: boolean) {
    const first = new Date(Date.UTC(year, index, 1)).getUTCDay();
    const total = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
    const days: (number | null)[] = [...Array.from({ length: first }, () => null), ...Array.from({ length: total }, (_, i) => i + 1)];
    while (days.length % 7) days.push(null);
    return <section key={index} className={`min-w-0 rounded-lg border border-[#d9e7dc] bg-white ${compact ? "p-0.5 sm:p-2" : "p-3"}`}>
      <button type="button" onClick={() => openMonth(index)} className={`w-full rounded bg-[#eee9de] text-center font-black uppercase text-[#123d2c] ${compact ? "text-[9px] sm:text-sm" : "p-2 text-lg"}`}>{compact ? MONTHS[index].slice(0, 3) : MONTHS[index]}</button>
      <div className="grid grid-cols-7 text-center font-bold text-[#42614f]">
        {WEEKDAYS.map((day, dayIndex) => <span key={dayIndex} className={compact ? "text-[6px] sm:text-xs" : "text-xs"}>{day}</span>)}
      </div>
      <div className={`grid grid-cols-7 ${compact ? "gap-px" : "gap-1"}`}>
        {days.map((day, dayIndex) => {
          if (!day) return <span key={`empty-${dayIndex}`} aria-hidden="true" />;
          const iso = `${year}-${String(index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hits = filtered.filter((item) => eventHappensOn2027(item, iso));
          const firstHit = hits[0]; const tone = firstHit ? calendarCategory2027(firstHit.category) : null;
          return <button key={iso} type="button" onClick={() => openDay(iso)}
            aria-label={`${prettyDate2027(iso)}, ${hits.length} atividade(s)`} title={hits.map((item) => item.title).join(" / ")}
            style={tone ? { backgroundColor: tone.color, color: tone.text } : undefined}
            className={`min-w-0 rounded-sm text-center font-semibold focus-visible:outline-2 focus-visible:outline-[#123d2c] ${compact ? "min-h-4 text-[7px] sm:min-h-7 sm:text-[11px]" : "min-h-10 text-xs"}`}>{day}{hits.length > 1 && <span className="block text-[6px] leading-none">+{hits.length - 1}</span>}</button>;
        })}
      </div>
    </section>;
  }
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pageCount - 1);
  const filteredPage = filtered.slice(activePage * pageSize, (activePage + 1) * pageSize);

  return <main className="min-h-screen bg-[#f7faf2] text-[#123d2c] print:bg-white">
    <div className="print:hidden"><TucxaPublicHeader navLabel="Calendário anual TUCXA" showSupport={false} compactMobileActions mobileActionColumns={2}
      actions={[
        { label: "Agenda Viva atual", href: "/solucoes/organizacao-em-harmonia/tucxa/agenda-viva", variant: "secondary" },
        { label: management ? "Calendário público" : "Gestão / Diretoria", href: management ? TUCXA_2027_BASE : `${TUCXA_2027_BASE}/gestao`, variant: "primary" },
      ]} /></div>
    <section className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-5 print:hidden">
      <div className="rounded-[1.5rem] bg-[#123d2c] px-4 py-4 text-white shadow-lg sm:px-7 sm:py-7">
        <span className="rounded-full bg-[#e9f2e7] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#2f6b43]">Organização em Harmonia · TUCXA e Sementinha</span>
        <h1 className="mt-3 max-w-3xl text-[1.65rem] font-black leading-tight sm:text-4xl">Saiba o que vem pela frente. Viva cada encontro com tranquilidade.</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#e9f2e7] sm:text-base">{management ? "Planeje, confira e aprove atividades em um só lugar. Cada alteração fica organizada para a Diretoria." : "Consulte a programação confirmada, prepare-se com antecedência e compartilhe as atividades do TUCXA e do Sementinha."}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-white/10 p-2 text-center">
          <button type="button" onClick={() => switchYear(year - 1)} disabled={year <= MIN_AGENDA_YEAR} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#123d2c] disabled:opacity-40" aria-label="Ano anterior">Anterior</button>
          <strong className="text-2xl tracking-widest">{year}</strong>
          <button type="button" onClick={() => switchYear(year + 1)} disabled={year >= MAX_AGENDA_YEAR} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#123d2c] disabled:opacity-40" aria-label="Próximo ano">Próximo</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={openAnnual} className="min-h-12 rounded-xl bg-[#e9f2e7] px-2 text-sm font-black text-[#123d2c]">Ver 12 meses</button>
          <button type="button" onClick={() => setPopup("filters")} className="min-h-12 rounded-xl border border-white/50 px-2 text-sm font-bold text-white">Filtros</button>
          <button type="button" onClick={() => setPopup("legend")} className="min-h-12 rounded-xl border border-white/50 px-2 text-sm font-bold text-white">Legenda de cores</button>
          <button type="button" onClick={() => { if (management) { setPopup("management"); } else { setForm({ ...INITIAL }); setPopup("suggest"); } }} className="min-h-12 rounded-xl bg-white px-2 text-sm font-black text-[#123d2c]">{management ? "Gerenciar eventos" : "Sugerir atividade"}</button>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-[#dce8df] bg-white p-3 text-center text-sm text-[#436452]">
        {loading ? "Carregando atividades..." : `${management ? publicCount : events.length} atividade(s) confirmada(s) em ${year}`}
        {management && !loading && ` · ${pendingCount} sugestão(ões) pendente(s)`}
        <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
          <button onClick={() => setPopup("help")} type="button" className="font-bold underline">Por que consultar?</button>
          <button onClick={() => void load()} type="button" className="font-bold underline">Atualizar</button>
          <Link href="/solucoes/organizacao-em-harmonia/tucxa/agenda-viva" className="font-bold underline">Calendários anteriores</Link>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error} {management && !token && <Link href="/solucoes/organizacao-em-harmonia/login" className="font-black underline">Entrar na gestão</Link>}</p>}
      {notice && <p role="status" className="mt-3 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    </section>
    {popup === "calendar" && <PopupShell title={`Calendário anual — TUCXA ${year}`} wide close={() => setPopup(null)} toolbar={<button onClick={() => window.print()} type="button" className="rounded-full border px-3 py-2 text-xs font-bold">PDF</button>}>
      <div className="mb-3 flex items-center justify-center gap-2 print:hidden">
        <button onClick={() => switchYear(year - 1)} disabled={year <= MIN_AGENDA_YEAR} type="button" className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button>
        <strong className="text-lg">{year}</strong>
        <button onClick={() => switchYear(year + 1)} disabled={year >= MAX_AGENDA_YEAR} type="button" className="rounded-lg border px-3 py-2 disabled:opacity-40">Próximo</button>
      </div>
      {calendarStep !== "annual" && <button onClick={() => setCalendarStep(calendarStep === "day" ? "month" : "annual")} type="button" className="mb-3 rounded-lg border px-3 py-2 text-xs font-bold print:hidden">← {calendarStep === "day" ? "Voltar ao mês" : "Ver 12 meses"}</button>}
      {calendarStep === "annual" && <>
        <h3 className="mb-2 text-center text-xl font-black tracking-widest text-[#3989b9]">TUCXA — {year}</h3>
        <div className="grid grid-cols-4 gap-1 sm:gap-3">{MONTHS.map((_, index) => monthGrid(index, true))}</div>
        <div className="mt-4"><ColorLegend /></div>
        <p className="mt-2 text-center text-[10px] text-[#526954]">Selecione um mês para ampliar. Apenas eventos aprovados e públicos aparecem para visitantes.</p>
      </>}
      {calendarStep === "month" && <div className="mx-auto max-w-xl">{monthGrid(chosenMonth, false)}<div className="mt-3 text-sm text-[#526954]">Selecione um dia colorido para ver os detalhes.</div></div>}
      {calendarStep === "day" && <>
        <h3 className="mb-3 text-lg font-bold">{prettyDate2027(chosenDate)}</h3>
        <EventList events={filtered.filter((e) => eventHappensOn2027(e, chosenDate))} management={management} select={editEvent} decide={decide} saving={saving} decisionNotes={decisionNotes} setDecisionNotes={setDecisionNotes} />
      </>}
    </PopupShell>}
    {popup === "legend" && <PopupShell title="Legenda das atividades" close={() => setPopup(null)}>
      <ColorLegend /><p className="mt-4 text-sm">Cada cor identifica uma atividade. Ao selecionar uma data no calendário, você consulta os detalhes e o local.</p>
      <button type="button" onClick={openAnnual} className="mt-4 rounded-lg bg-[#123d2c] px-4 py-2 text-sm font-bold text-white">Abrir calendário</button>
    </PopupShell>}
    {popup === "help" && <PopupShell title="Organização que acolhe" close={() => setPopup(null)}>
      <div className="space-y-3 text-sm"><p><strong>Menos desencontros:</strong> saiba quando as atividades estão confirmadas, sem depender de várias mensagens.</p>
      <p><strong>Mais tranquilidade:</strong> prepare-se com antecedência para encontros, cursos, ações sociais e confraternizações.</p>
      <p><strong>Uma agenda feita em conjunto:</strong> envie sugestões; a Diretoria poderá avaliá-las antes de divulgar.</p>
      <p className="text-xs text-[#667b69]">Datas projetadas de anos anteriores não são confirmadas automaticamente.</p></div>
    </PopupShell>}
    {popup === "filters" && <PopupShell title={`Filtros — ${year}`} close={() => setPopup(null)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">Categoria<select className={fieldClass()} value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">Todas</option>{EVENT_CATEGORIES_2027.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        <label className="text-xs font-bold">Mês<select className={fieldClass()} value={month} onChange={(e) => setMonth(e.target.value)}><option value="all">Ano todo</option>{MONTHS.map((label, i) => <option key={i} value={i + 1}>{label}</option>)}</select></label>
        <label className="text-xs font-bold">Público<select className={fieldClass()} value={audience} onChange={(e) => setAudience(e.target.value)}><option value="all">Todos</option>{audiences.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs font-bold">Local<select className={fieldClass()} value={location} onChange={(e) => setLocation(e.target.value)}><option value="all">Todos</option>{locations.map((item) => <option key={item}>{item}</option>)}</select></label>
        {management && <label className="text-xs font-bold">Situação<select className={fieldClass()} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todas</option>{STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        <label className="text-xs font-bold">Buscar por palavra<input className={fieldClass()} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Atividade, descrição ou local" /></label>
      </div>
      <div className="mt-4 flex gap-2"><button type="button" onClick={() => { setCategory("all"); setMonth("all"); setStatus("all"); setAudience("all"); setLocation("all"); setSearch(""); }} className="rounded-lg border px-4 py-2 text-sm font-bold">Limpar</button>
        <button type="button" onClick={management ? () => { setPage(0); setPopup("management"); } : openAnnual} className="rounded-lg bg-[#123d2c] px-4 py-2 text-sm font-bold text-white">Ver {filtered.length} resultado(s)</button></div>
    </PopupShell>}
    {popup === "suggest" && <PopupShell title="Sugerir atividade ao TUCXA" close={() => setPopup(null)}>
      <p className="mb-3 text-sm">Sua ideia ajuda a construir a programação. A sugestão será analisada pela Diretoria antes de qualquer publicação.</p>
      <EventForm year={year} form={form} setForm={setForm} submit={submit} saving={saving} management={false} />
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </PopupShell>}
    {popup === "management" && management && <PopupShell title={`Gestão de eventos — ${year}`} wide close={() => setPopup(null)} toolbar={<button type="button" className="rounded-full border px-3 py-2 text-xs font-bold" onClick={() => { setForm({ ...INITIAL }); setPopup("edit"); }}>Novo</button>}>
      <p className="mb-3 text-sm text-[#526954]">{filtered.length} registro(s). A aprovação não altera automaticamente eventos de outros anos. Para editar, abra um registro.</p>
      <EventList events={filteredPage} management={true} select={editEvent} decide={decide} saving={saving} decisionNotes={decisionNotes} setDecisionNotes={setDecisionNotes} />
      <div className="mt-4 flex justify-center gap-3 print:hidden"><button type="button" disabled={activePage === 0} onClick={() => setPage((x) => x - 1)} className="rounded border px-3 py-2 text-xs disabled:opacity-40">Anterior</button><span className="self-center text-xs">Página {activePage + 1} / {pageCount}</span><button type="button" disabled={activePage + 1 >= pageCount} onClick={() => setPage((x) => x + 1)} className="rounded border px-3 py-2 text-xs disabled:opacity-40">Próxima</button></div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </PopupShell>}
    {popup === "edit" && management && <PopupShell title={form.id ? "Editar atividade" : "Cadastrar atividade"} close={() => setPopup("management")}>
      <EventForm year={year} form={form} setForm={setForm} submit={submit} saving={saving} management={true} />
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </PopupShell>}
    <footer className="mx-auto max-w-6xl px-3 pb-5 text-center text-xs text-[#667b69] print:hidden">Agenda oficial sujeita à confirmação da Diretoria · Para consultar 2026, use a Agenda Viva anterior.</footer>
    <style jsx global>{`@media print { @page { size: A4 landscape; margin: 7mm; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .fixed { position: static!important; } section { break-inside: avoid; } }`}</style>
  </main>;
}

function EventList({ events, management, select, decide, saving, decisionNotes, setDecisionNotes }: {
  events: CalendarEvent2027[]; management: boolean; select: (form: FormData2027) => void;
  decide: (event: CalendarEvent2027, status: Status2027) => Promise<void>; saving: boolean;
  decisionNotes: string; setDecisionNotes: (value: string) => void;
}) {
  if (!events.length) return <p className="text-sm text-[#657c69]">Nenhum evento encontrado.</p>;
  return <div className="max-h-[720px] space-y-3 overflow-auto print:max-h-none print:overflow-visible">
    {events.map((event) => <article key={event.id} className="rounded-xl border border-[#e0e9e2] p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <EventTag event={event} />
          <p className="mt-1 font-bold">{prettyDate2027(event.event_date)}{event.end_date ? ` até ${prettyDate2027(event.end_date)}` : ""} {event.starts_time ? `· ${event.starts_time.slice(0, 5)}${event.ends_time ? `–${event.ends_time.slice(0, 5)}` : ""}` : ""}</p>
          <p className="text-xs text-[#526954]">{event.location} · Público: {event.audience}</p>
          {event.description && <p className="mt-1 text-xs text-[#516654]">{event.description}</p>}
        </div>
        {management && <span className="rounded bg-[#e9f0eb] px-2 py-1 text-xs">{STATUSES.find((s) => s.id === event.status)?.label}</span>}
      </div>
      {management && <div className="mt-2 border-t pt-2 print:hidden">
        {event.proposer_name && <p className="mb-1 text-xs">Proponente: {event.proposer_name} · Celular: {event.proposer_phone ?? "—"} · {event.proposer_email ?? ""}</p>}
        {event.source_date_2026 && <p className="mb-1 text-xs">Origem de referência: {prettyDate2027(event.source_date_2026)}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { select(initialFromEvent(event));  }} className="rounded border px-2 py-1 text-xs">Editar</button>
          {event.status !== "aprovado" && <button type="button" disabled={saving} onClick={() => void decide(event, "aprovado")} className="rounded bg-[#123d2c] px-2 py-1 text-xs text-white disabled:opacity-40">Aprovar</button>}
          {event.status === "aprovado" && <button type="button" disabled={saving} onClick={() => void decide(event, "rascunho")} className="rounded border px-2 py-1 text-xs">Retirar de publicação</button>}
          <button type="button" disabled={saving} onClick={() => void decide(event, "ajustes_solicitados")} className="rounded border px-2 py-1 text-xs">Solicitar ajustes</button>
          <button type="button" disabled={saving} onClick={() => void decide(event, "rejeitado")} className="rounded border px-2 py-1 text-xs">Rejeitar</button>
        </div>
        <label className="mt-2 block text-xs">Motivo para rejeição ou ajustes (preencher antes de clicar)
          <textarea className={`${fieldClass()} min-h-10`} value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} maxLength={1000} placeholder="Motivo da decisão" />
        </label>
      </div>}
    </article>)}
  </div>;
}

function EventForm({ year, form, setForm, submit, saving, management }: {
  year: number;
  form: FormData2027; setForm: (next: FormData2027) => void;
  submit: (event: FormEvent<HTMLFormElement>) => Promise<void>; saving: boolean; management: boolean;
}) {
  function update<K extends keyof FormData2027>(key: K, value: FormData2027[K]) { setForm({ ...form, [key]: value }); }
  return <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label className="text-xs font-bold sm:col-span-2">Título do evento *
      <input required maxLength={150} className={fieldClass()} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Ex.: Bazar beneficente" />
    </label>
    <label className="text-xs font-bold">Categoria *
      <select required className={fieldClass()} value={form.category} onChange={(e) => update("category", e.target.value as Category2027)}>
        {EVENT_CATEGORIES_2027.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
      </select>
    </label>
    <label className="text-xs font-bold">Início *
      <input required type="date" min={`${year}-01-01`} max={`${year}-12-31`} className={fieldClass()} value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
    </label>
    <label className="text-xs font-bold">Data final (opcional)
      <input type="date" min={form.event_date} max={`${year}-12-31`} className={fieldClass()} value={form.end_date} onChange={(e) => update("end_date", e.target.value)} />
    </label>
    <label className="text-xs font-bold">Público
      <select className={fieldClass()} value={form.audience} onChange={(e) => update("audience", e.target.value)}>
        <option value="todos">Todos</option><option value="consulentes">Consulentes</option><option value="filhos-corrente">Filhos da Corrente</option><option value="voluntarios">Voluntários</option><option value="diretoria">Diretoria</option>
      </select>
    </label>
    <label className="text-xs font-bold">Horário inicial
      <input type="time" className={fieldClass()} value={form.starts_time} onChange={(e) => update("starts_time", e.target.value)} />
    </label>
    <label className="text-xs font-bold">Horário final
      <input type="time" className={fieldClass()} value={form.ends_time} onChange={(e) => update("ends_time", e.target.value)} />
    </label>
    <label className="text-xs font-bold">Local
      <input maxLength={160} className={fieldClass()} value={form.location} onChange={(e) => update("location", e.target.value)} />
    </label>
    <label className="text-xs font-bold sm:col-span-2 lg:col-span-3">Descrição
      <textarea maxLength={2000} rows={2} className={fieldClass()} value={form.description} onChange={(e) => update("description", e.target.value)} />
    </label>
    {!management && <>
      <label className="text-xs font-bold">Nome do proponente *
        <input required maxLength={100} autoComplete="name" className={fieldClass()} value={form.proposer_name} onChange={(e) => update("proposer_name", e.target.value)} />
      </label>
      <label className="text-xs font-bold">Celular com DDD *
        <input required type="tel" maxLength={30} autoComplete="tel" className={fieldClass()} placeholder="(19) 99999-9999" value={form.proposer_phone} onChange={(e) => update("proposer_phone", e.target.value)} />
      </label>
      <label className="text-xs font-bold">E-mail (opcional)
        <input type="email" maxLength={160} className={fieldClass()} value={form.proposer_email} onChange={(e) => update("proposer_email", e.target.value)} />
      </label>
      <label className="absolute -left-[9999px]" aria-hidden="true">Não preencher este campo
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} />
      </label>
      <label className="flex items-start gap-2 text-xs text-[#526954] sm:col-span-2 lg:col-span-3"><input required type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} /> Autorizo o armazenamento dos dados informados e o contato da equipe do TUCXA exclusivamente para avaliação desta sugestão. Meu celular não será divulgado no calendário público.</label>
    </>}
    {management && <>
      <label className="text-xs font-bold">Situação
        <select className={fieldClass()} value={form.status} onChange={(e) => update("status", e.target.value as Status2027)}>
          {STATUSES.map((s) => <option value={s.id} key={s.id}>{s.label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 self-end text-xs font-bold">
        <input type="checkbox" checked={form.is_public} onChange={(e) => update("is_public", e.target.checked)} /> Visível ao público depois de aprovado
      </label>
    </>}
    <div className="flex items-end">
      <button type="submit" disabled={saving} className="min-h-10 rounded-xl bg-[#123d2c] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
        {saving ? "Salvando..." : management ? (form.id ? "Salvar alterações" : "Cadastrar evento") : "Enviar sugestão"}
      </button>
    </div>
  </form>;
}
