"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type PersonStatus = {
  personId: string;
  fullName: string;
  whatsapp: string;
  groups: string[];
  status: "confirmed" | "cannot_attend" | "pending";
  respondedAt: string | null;
  checkedInAt: string | null;
};

type Occurrence = {
  id: string;
  eventId: string;
  title: string;
  occurrenceDate: string;
  groups: string[];
  allGroups: boolean;
  attendanceRequired: boolean;
  allowEntityAppointment: boolean;
  people: PersonStatus[];
  totals: {
    eligible: number;
    confirmed: number;
    cannotAttend: number;
    pending: number;
    checkedIn: number;
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function statusLabel(status: PersonStatus["status"]) {
  if (status === "confirmed") return "Confirmado";
  if (status === "cannot_attend") return "Não poderá comparecer";
  return "Pendente";
}

export default function AgendaVivaPresencasPage() {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | PersonStatus["status"]>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("Sua sessão expirou. Entre novamente.");
      setLoading(false);
      return;
    }
    const response = await fetch("/api/organizacao-em-harmonia/cliente/agenda-viva/presencas", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Não foi possível carregar as presenças.");
      setLoading(false);
      return;
    }
    const next = Array.isArray(payload.occurrences) ? payload.occurrences as Occurrence[] : [];
    setOccurrences(next);
    setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const selected = useMemo(
    () => occurrences.find((item) => item.id === selectedId) || null,
    [occurrences, selectedId],
  );

  const visiblePeople = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt-BR");
    return (selected?.people ?? []).filter((person) => {
      if (filter !== "all" && person.status !== filter) return false;
      if (!search) return true;
      return `${person.fullName} ${person.whatsapp}`.toLocaleLowerCase("pt-BR").includes(search);
    });
  }, [filter, query, selected]);

  async function mutate(body: Record<string, unknown>, key: string) {
    setBusyKey(key);
    setError("");
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/organizacao-em-harmonia/cliente/agenda-viva/presencas", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || "Não foi possível atualizar.");
    else await load();
    setBusyKey("");
  }

  return (
    <OrganizacaoClientShell
      title="Presenças da Agenda Viva"
      description="Confirmações antecipadas, pendências e check-in no local sem depender do caderno da recepção."
    >
      <section className="grid gap-4 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2F6B43]">Agenda Viva</p>
            <h1 className="mt-1 text-2xl font-black text-[#00334E]">Confirmações e check-in</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">A resposta antecipada mostra quem pretende participar. O check-in registra quem efetivamente chegou.</p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Atualizar</button>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        {loading ? <p className="rounded-xl bg-slate-50 p-5 text-sm font-bold text-slate-600">Carregando presenças...</p> : null}

        {!loading && !occurrences.length ? (
          <p className="rounded-2xl bg-amber-50 p-5 text-sm font-bold text-amber-900">Nenhum evento futuro está configurado para exigir confirmação de presença.</p>
        ) : null}

        {occurrences.length ? (
          <>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Evento e data
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 font-semibold">
                {occurrences.map((item) => <option key={item.id} value={item.id}>{formatDate(item.occurrenceDate)} — {item.title}</option>)}
              </select>
            </label>

            {selected ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    ["Elegíveis", selected.totals.eligible],
                    ["Confirmados", selected.totals.confirmed],
                    ["Não vão", selected.totals.cannotAttend],
                    ["Pendentes", selected.totals.pending],
                    ["Check-in", selected.totals.checkedIn],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl bg-[#F7FAF2] p-3 text-center ring-1 ring-[#123D2C]/10">
                      <strong className="block text-xl text-[#123D2C]">{value}</strong>
                      <span className="text-[0.7rem] font-black uppercase tracking-wide text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou WhatsApp" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                  <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">
                    <option value="all">Todos</option>
                    <option value="confirmed">Confirmados</option>
                    <option value="cannot_attend">Não poderão comparecer</option>
                    <option value="pending">Pendentes</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  {visiblePeople.map((person) => {
                    const base = { eventId: selected.eventId, occurrenceDate: selected.occurrenceDate, personId: person.personId };
                    return (
                      <article key={person.personId} className="rounded-2xl bg-[#F9FBF7] p-3 ring-1 ring-[#123D2C]/10">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="font-black text-[#123D2C]">{person.fullName}</h2>
                            <p className="text-xs font-semibold text-slate-500">{person.groups.join(" e ")} • {statusLabel(person.status)}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${person.checkedInAt ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                            {person.checkedInAt ? "Presente no local" : "Sem check-in"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button disabled={busyKey === `${person.personId}-confirm`} onClick={() => void mutate({ action: "set-status", status: "confirmed", ...base }, `${person.personId}-confirm`)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Confirmar</button>
                          <button disabled={busyKey === `${person.personId}-cannot`} onClick={() => void mutate({ action: "set-status", status: "cannot_attend", ...base }, `${person.personId}-cannot`)} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-black text-amber-900 disabled:opacity-50">Não comparecerá</button>
                          <button disabled={person.status !== "confirmed" || busyKey === `${person.personId}-check`} onClick={() => void mutate({ action: "check-in", checked: !person.checkedInAt, ...base }, `${person.personId}-check`)} className="rounded-lg bg-[#123D2C] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{person.checkedInAt ? "Desfazer check-in" : "Fazer check-in"}</button>
                        </div>
                      </article>
                    );
                  })}
                  {!visiblePeople.length && <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhuma pessoa corresponde aos filtros.</p>}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </OrganizacaoClientShell>
  );
}
