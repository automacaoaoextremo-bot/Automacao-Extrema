"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  TUCXA_2027_API, TUCXA_2027_BASE, EVENT_CATEGORIES_2027,
  calendarCategory2027, eventHappensOn2027, prettyDate2027,
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
const API = TUCXA_2027_API;
const INITIAL = {
  title: "", description: "", event_date: "", end_date: "",
  starts_time: "", ends_time: "", category: "evento" as Category2027,
  audience: "todos", location: "A definir", proposer_name: "", proposer_phone: "",
  proposer_email: "", website: "", consent: false, is_public: true, status: "rascunho" as Status2027,
};
type FormData2027 = typeof INITIAL & { id?: string };

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
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold"
      style={{ backgroundColor: category.color, color: category.text }}>
      <span className="truncate">{event.title}</span>
    </span>
  );
}

export function TucxaAgenda2027Client({ management = false }: { management?: boolean }) {
  const [events, setEvents] = useState<CalendarEvent2027[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState("");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("all");
  const [audience, setAudience] = useState("all");
  const [location, setLocation] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"year" | "month" | "list">("year");
  const [selectedDate, setSelectedDate] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [form, setForm] = useState<FormData2027>({ ...INITIAL });
  const [decisionNotes, setDecisionNotes] = useState("");

  const load = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      let authToken = "";
      if (management) {
        const { data } = await supabaseBrowser.auth.getSession();
        authToken = data.session?.access_token ?? "";
        setToken(authToken);
        if (!authToken) throw new Error("Faça login na área de gestão da Organização em Harmonia para acessar as aprovações.");
      }
      const response = await fetch(`${API}${management ? "?gestao=1" : ""}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        cache: "no-store",
      });
      const result = (await response.json()) as { events?: CalendarEvent2027[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Falha ao carregar o calendário.");
      setEvents(result.events ?? []);
    } catch (err) { setError(readError(err)); }
    finally { setLoading(false); }
  }, [management]);

  useEffect(() => { void load(); }, [load]);

  const audiences = useMemo(() => [...new Set(events.map((event) => event.audience).filter(Boolean))].sort(), [events]);
  const locations = useMemo(() => [...new Set(events.map((event) => event.location).filter(Boolean))].sort(), [events]);
  const filtered = useMemo(() => events.filter((event) => {
    if (category !== "all" && event.category !== category) return false;
    if (month !== "all") {
      const startMonth = Number(event.event_date.slice(5, 7));
      const endMonth = Number((event.end_date ?? event.event_date).slice(5, 7));
      if (Number(month) < startMonth || Number(month) > endMonth) return false;
    }
    if (management && status !== "all" && event.status !== status) return false;
    if (audience !== "all" && event.audience !== audience) return false;
    if (location !== "all" && event.location !== location) return false;
    if (search && ![event.title, event.description ?? "", event.location].join(" ").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))) return false;
    return true;
  }), [events, category, month, status, audience, location, search, management]);

  async function send(body: Record<string, unknown>, isManagement = management) {
    const response = await fetch(API, {
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
        setNotice("Evento salvo. A visibilidade pública depende de estar aprovado e marcado como público.");
        setForm({ ...INITIAL });
        await load();
      } else {
        const result = await send({ ...form, action: "suggest" }, false);
        setNotice(result.message || "Sugestão recebida para aprovação.");
        setForm({ ...INITIAL }); setShowSuggestion(false);
      }
    } catch (err) { setError(readError(err)); }
    finally { setSaving(false); }
  }

  async function decide(event: CalendarEvent2027, next: Status2027) {
    if ((next === "rejeitado" || next === "ajustes_solicitados") && decisionNotes.trim().length < 5) {
      setError("Informe o motivo da recusa ou dos ajustes solicitados (mínimo 5 caracteres)."); return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      await send({ action: "decide", id: event.id, status: next, review_notes: decisionNotes });
      setNotice(`Evento "${event.title}" atualizado para ${STATUSES.find((s) => s.id === next)?.label}.`);
      setDecisionNotes(""); await load();
    } catch (err) { setError(readError(err)); }
    finally { setSaving(false); }
  }

  function selectMonth(index: number) {
    setMonth(String(index + 1)); setView("month"); setSelectedDate("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function MonthGrid({ index }: { index: number }) {
    const first = new Date(Date.UTC(2027, index, 1)).getUTCDay();
    const total = new Date(Date.UTC(2027, index + 1, 0)).getUTCDate();
    const days: (number | null)[] = [...Array.from({ length: first }, () => null), ...Array.from({ length: total }, (_, i) => i + 1)];
    while (days.length % 7) days.push(null);
    return (
      <section className="rounded-xl border border-[#dce8df] bg-white p-3 shadow-sm" aria-label={`Calendário de ${MONTHS[index]} de 2027`}>
        <button type="button" className="mb-2 w-full text-center font-serif text-base font-bold uppercase tracking-wide text-[#123d2c] hover:underline print:no-underline"
          onClick={() => selectMonth(index)}>{MONTHS[index]}</button>
        <div className="grid grid-cols-7 gap-0.5 rounded bg-[#e6f0e7] py-1 text-center text-[10px] font-bold text-[#355e4a]">
          {WEEKDAYS.map((label, i) => <span key={i} aria-label={["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][i]}>{label}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5 pt-1">
          {days.map((day, i) => {
            if (!day) return <span key={`empty-${i}`} aria-hidden="true" />;
            const iso = `2027-${String(index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hits = filtered.filter((event) => eventHappensOn2027(event, iso));
            const visible = hits.slice(0, 3);
            return (
              <button key={iso} type="button" onClick={() => setSelectedDate(iso)}
                aria-label={`${prettyDate2027(iso)}: ${hits.length} atividade(s)`}
                aria-pressed={selectedDate === iso}
                className={`min-h-10 rounded border p-0.5 text-center text-[11px] transition focus-visible:outline-2 focus-visible:outline-[#123d2c] ${selectedDate === iso ? "border-[#123d2c] bg-[#e7f2e8]" : "border-transparent hover:border-[#b8cfbd]"}`}>
                <span className="block font-semibold text-[#234636]">{day}</span>
                <span className="flex min-h-2 flex-wrap justify-center gap-0.5" aria-hidden="true">
                  {visible.map((event) => <span key={event.id} className="inline-block h-2 w-2 rounded-full ring-1 ring-black/10"
                    title={event.title} style={{ backgroundColor: calendarCategory2027(event.category).color }} />)}
                </span>
                {hits.length > 3 && <span className="text-[9px] text-[#546b5d]">+{hits.length - 3}</span>}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7faf6] pb-14 text-[#123d2c]">
      <div className="print:hidden">
        <div className="border-b border-[#d2e3d4] bg-white px-3 py-2">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
            <Link href="/solucoes/organizacao-em-harmonia/tucxa/agenda-viva" className="font-semibold underline">← Agenda Viva atual</Link>
            <div className="flex flex-wrap gap-2">
              <Link href={TUCXA_2027_BASE} className="rounded-full border px-3 py-1">Calendário 2027</Link>
              <Link href={`${TUCXA_2027_BASE}/gestao`} className="rounded-full border px-3 py-1">Gestão / Diretoria</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-3 pt-6 sm:px-6">
        <header className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[#dce8df] bg-white p-4 shadow-sm">
          <Image src="/clientes/tucxa/tucxa-logo.jpg" width={78} height={78} alt="Logotipo do TUCXA" className="h-[78px] w-[78px] rounded-xl object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[#69846e]">Organização em Harmonia · TUCXA e Sementinha</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Calendário Anual 2027</h1>
            <p className="text-sm text-[#55725d]">{management ? "Gestão e aprovação de propostas — acesso restrito" : "Atividades e eventos oficialmente aprovados"}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            {!management && <button type="button" onClick={() => setShowSuggestion((value) => !value)} className="rounded-xl bg-[#123d2c] px-4 py-2 text-sm font-bold text-white">Sugerir evento</button>}
            <button type="button" onClick={() => window.print()} className="rounded-xl border border-[#123d2c] px-4 py-2 text-sm font-bold">Imprimir / PDF</button>
          </div>
        </header>

        {error && <div role="alert" className="my-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}{management && !token && <> <Link href="/solucoes/organizacao-em-harmonia/login" className="font-bold underline">Entrar na gestão</Link></>}</div>}
        {notice && <div role="status" className="my-3 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

        <section aria-label="Legenda de cores" className="mb-4 rounded-xl border border-[#dce8df] bg-white p-3">
          <h2 className="mb-2 text-sm font-bold">Legenda de atividades</h2>
          <div className="flex flex-wrap gap-2">
            {EVENT_CATEGORIES_2027.map((item) => <span key={item.key} className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: item.color, color: item.text }}>{item.label}</span>)}
          </div>
          {management && <p className="mt-3 text-xs text-[#765627]">Datas de referência de 2026 foram projetadas para o mesmo dia da semana de 2027, mas começam como rascunho. Revise feriados e funcionamento antes de aprovar.</p>}
        </section>

        {!management && showSuggestion && (
          <section className="mb-5 rounded-xl border-2 border-[#9dbda3] bg-white p-4 print:hidden">
            <h2 className="mb-2 text-lg font-bold">Sugerir novo evento ou atividade</h2>
            <p className="mb-4 text-sm">Sua sugestão não será publicada automaticamente. A Diretoria avaliará a proposta.</p>
            <EventForm form={form} setForm={setForm} submit={submit} saving={saving} management={false} />
          </section>
        )}

        {management && token && (
          <section className="mb-5 rounded-xl border-2 border-[#9dbda3] bg-white p-4 print:hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{form.id ? "Editar evento" : "Cadastrar evento"}</h2>
              <button type="button" onClick={() => setForm({ ...INITIAL })} className="rounded border px-2 py-1 text-sm">Novo / limpar</button>
            </div>
            <EventForm form={form} setForm={setForm} submit={submit} saving={saving} management />
          </section>
        )}

        <section className="mb-5 rounded-xl border border-[#dce8df] bg-white p-3 print:hidden" aria-label="Filtros do calendário">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Filtros e visualização</h2>
            <div className="flex flex-wrap gap-1">
              {(["year", "month", "list"] as const).map((mode) => <button type="button" key={mode} onClick={() => {
                setView(mode); if (mode === "month" && month === "all") setMonth("1");
              }} className={`rounded-lg border px-3 py-1 text-xs font-bold ${view === mode ? "bg-[#123d2c] text-white" : "bg-white"}`}>
                {mode === "year" ? "12 meses" : mode === "month" ? "Mês" : "Lista"}
              </button>)}
              <button type="button" className="rounded-lg border px-3 py-1 text-xs" onClick={() => {
                setCategory("all"); setMonth("all"); setStatus("all"); setAudience("all"); setLocation("all"); setSearch(""); setView("year");
              }}>Limpar</button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold">Categoria
              <select className={fieldClass()} value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">Todas</option>{EVENT_CATEGORIES_2027.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
            </label>
            <label className="text-xs font-semibold">Mês
              <select className={fieldClass()} value={month} onChange={(e) => { setMonth(e.target.value); if (e.target.value === "all" && view === "month") setView("year"); }}><option value="all">Ano inteiro</option>{MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}</select>
            </label>
            <label className="text-xs font-semibold">Público
              <select className={fieldClass()} value={audience} onChange={(e) => setAudience(e.target.value)}><option value="all">Todos</option>{audiences.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            <label className="text-xs font-semibold">Local
              <select className={fieldClass()} value={location} onChange={(e) => setLocation(e.target.value)}><option value="all">Todos</option>{locations.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            {management && <label className="text-xs font-semibold">Situação
              <select className={fieldClass()} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todas</option>{STATUSES.map((x) => <option value={x.id} key={x.id}>{x.label}</option>)}</select>
            </label>}
            <label className="text-xs font-semibold">Buscar
              <input className={fieldClass()} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título, local ou descrição" />
            </label>
          </div>
        </section>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold">{loading ? "Carregando..." : `${filtered.length} evento(s) no filtro`}</span>
          {management && <span className="text-[#667b69]">Aprovados: {events.filter((e) => e.status === "aprovado").length} · Pendentes: {events.filter((e) => e.status === "pendente").length} · Rascunhos: {events.filter((e) => e.status === "rascunho").length}</span>}
          <button type="button" onClick={() => void load()} className="rounded border px-3 py-1 print:hidden">Atualizar</button>
        </div>
        {view !== "list" && (
          <div className={`grid gap-3 ${view === "month" ? "mx-auto max-w-md grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {MONTHS.map((label, index) => (view === "year" && (month === "all" || Number(month) === index + 1)) || (view === "month" && Number(month) === index + 1) ? <MonthGrid key={label} index={index} /> : null)}
          </div>
        )}
        {selectedDate && view !== "list" && (
          <section className="my-5 rounded-xl border border-[#c5dbca] bg-white p-4 print:hidden" aria-label={`Eventos de ${prettyDate2027(selectedDate)}`}>
            <div className="flex justify-between gap-2"><h2 className="font-bold">{prettyDate2027(selectedDate)}</h2><button type="button" onClick={() => setSelectedDate("")}>Fechar</button></div>
            <EventList events={filtered.filter((event) => eventHappensOn2027(event, selectedDate))} management={management} select={setForm} decide={decide} saving={saving} decisionNotes={decisionNotes} setDecisionNotes={setDecisionNotes} />
          </section>
        )}
        {(view === "list" || management) && (
          <section className="mt-5 rounded-xl border border-[#dce8df] bg-white p-4 print:mt-2">
            <h2 className="mb-3 font-bold">{management ? "Eventos, rascunhos e propostas" : "Relação de eventos"}</h2>
            <EventList events={filtered} management={management} select={setForm} decide={decide} saving={saving} decisionNotes={decisionNotes} setDecisionNotes={setDecisionNotes} />
          </section>
        )}
        {!loading && events.length === 0 && !error && <p className="mt-5 rounded-xl bg-white p-4 text-center">Ainda não há eventos aprovados para exibição em 2027.</p>}
        <footer className="mt-6 text-center text-xs text-[#667b69]">Datas exibidas no horário de Campinas/SP · Eventuais mudanças dependem de aprovação da Diretoria · Versão 2027 independente da Agenda Viva atual</footer>
      </div>
      <style jsx global>{`@media print { @page { size: A4 landscape; margin: 7mm; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } main { background: #fff !important; } button { cursor: default; } section { break-inside: avoid; } }`}</style>
    </main>
  );
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
          <button type="button" onClick={() => { select(initialFromEvent(event)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded border px-2 py-1 text-xs">Editar</button>
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

function EventForm({ form, setForm, submit, saving, management }: {
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
      <input required type="date" min="2027-01-01" max="2027-12-31" className={fieldClass()} value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
    </label>
    <label className="text-xs font-bold">Data final (opcional)
      <input type="date" min={form.event_date} max="2027-12-31" className={fieldClass()} value={form.end_date} onChange={(e) => update("end_date", e.target.value)} />
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
