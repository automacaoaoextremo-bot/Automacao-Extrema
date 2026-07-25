"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const PAGE_PATH = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/consultar-agendamentos";
const ATTENDANCE_PATH = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento";

type Appointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  bookingChannel: string;
  order: number | null;
  person: { id: string | null; fullName: string; whatsapp: string; email: string };
  entity: { id: string | null; name: string };
};

type Payload = {
  appointments?: Appointment[];
  entities?: Array<{ id: string; name: string }>;
  range?: string;
  today?: string;
  page?: number;
  total?: number;
  totalPages?: number;
  error?: string;
  requestId?: string;
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value || "Não informado";
}

function longDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    confirmado: "Confirmado",
    solicitado: "Solicitado",
    aprovado: "Aprovado",
    presente: "Presente",
    concluido: "Concluído",
    cancelado: "Cancelado",
    cancelamento_solicitado: "Cancelamento solicitado",
    ausente: "Ausente",
  };
  return labels[value] || value || "Não informado";
}

function channelLabel(value: string) {
  const labels: Record<string, string> = {
    recepcao: "Recepção",
    consulente: "Consulente",
    site: "Site",
  };
  return labels[value] || value || "Consulente";
}

export default function ConsultarAgendamentosRecepcaoPage() {
  const [range, setRange] = useState<"upcoming" | "today" | "previous">("upcoming");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [entityId, setEntityId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Entre novamente.");

    const params = new URLSearchParams({ range, page: String(page), pageSize: "20" });
    if (submittedQuery) params.set("q", submittedQuery);
    if (entityId) params.set("entityId", entityId);
    if (status) params.set("status", status);

    const response = await fetch(`/api/organizacao-em-harmonia/filhos-corrente/recepcao-agendamentos?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json().catch(() => ({}))) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível consultar os agendamentos.");
    setPayload(result);
  }, [entityId, page, range, status, submittedQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
        .catch((reason) => {
          setError(reason instanceof Error ? reason.message : "Erro ao consultar agendamentos.");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    for (const appointment of payload?.appointments ?? []) {
      const key = `${appointment.appointmentDate}::${appointment.appointmentTime}`;
      groups.set(key, [...(groups.get(key) ?? []), appointment]);
    }
    return Array.from(groups.entries());
  }, [payload?.appointments]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSubmittedQuery(query.trim());
  }

  function selectRange(nextRange: "upcoming" | "today" | "previous") {
    setPage(1);
    setRange(nextRange);
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader
        navLabel="Consulta de agendamentos da Recepção"
        showSupport={false}
        actions={[
          { label: "Voltar", href: ATTENDANCE_PATH, variant: "secondary" },
          { label: "Consultar agendamentos", href: PAGE_PATH, variant: "primary" },
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] bg-[#123D2C] p-5 text-white shadow-xl sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#CFE2C7]">Recepção</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">Consultar agendamentos</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#EEF7EA]">
            Por padrão, a consulta mostra os atendimentos de hoje em diante. Pesquise pelo nome ou WhatsApp do Consulente/Filho de Fora.
          </p>
        </header>

        <section className="mt-4 rounded-[2rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10 sm:p-5">
          <form onSubmit={search} className="grid gap-3 lg:grid-cols-[1fr_14rem_12rem_auto]">
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Nome ou WhatsApp
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex.: Antonio ou 993194222"
                className="min-h-12 rounded-2xl border border-slate-200 px-4 text-base font-semibold outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Entidade
              <select value={entityId} onChange={(event) => { setEntityId(event.target.value); setPage(1); }} className="min-h-12 rounded-2xl border border-slate-200 px-3 font-semibold">
                <option value="">Todas</option>
                {(payload?.entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-black text-[#123D2C]">
              Situação
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-12 rounded-2xl border border-slate-200 px-3 font-semibold">
                <option value="">Todas</option>
                <option value="confirmado">Confirmado</option>
                <option value="solicitado">Solicitado</option>
                <option value="presente">Presente</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
            <button type="submit" className="min-h-12 self-end rounded-2xl bg-[#123D2C] px-5 font-black text-white">Buscar</button>
          </form>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => selectRange("upcoming")} className={`rounded-2xl px-3 py-2 text-sm font-black ${range === "upcoming" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Próximos</button>
            <button type="button" onClick={() => selectRange("today")} className={`rounded-2xl px-3 py-2 text-sm font-black ${range === "today" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Hoje</button>
            <button type="button" onClick={() => selectRange("previous")} className={`rounded-2xl px-3 py-2 text-sm font-black ${range === "previous" ? "bg-[#123D2C] text-white" : "bg-[#F7FAF2] text-[#123D2C] ring-1 ring-[#123D2C]/10"}`}>Anteriores</button>
          </div>
        </section>

        {loading && <p className="mt-4 rounded-2xl bg-white p-4 font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando agendamentos...</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

        {!loading && !error && (
          <section className="mt-4 grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[#123D2C]">{payload?.total ?? 0} agendamento(s)</p>
              {range !== "previous" && (
                <button type="button" onClick={() => selectRange("previous")} className="text-sm font-black text-[#2F6B43] underline underline-offset-4">
                  Consultar agendamentos anteriores
                </button>
              )}
            </div>

            {grouped.map(([key, appointments]) => {
              const [date, time] = key.split("::");
              return (
                <article key={key} className="overflow-hidden rounded-[1.75rem] bg-white shadow ring-1 ring-[#123D2C]/10">
                  <header className="bg-[#E9F2E7] px-4 py-3">
                    <h2 className="font-black capitalize text-[#123D2C]">{longDate(date)}</h2>
                    <p className="text-sm font-bold text-[#2F6B43]">{time}</p>
                  </header>
                  <div className="grid gap-2 p-3">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-3 ring-1 ring-[#123D2C]/10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-black text-[#123D2C]">{appointment.person.fullName}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-600">{formatPhone(appointment.person.whatsapp)}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
                            Ordem {appointment.order ?? "a confirmar"}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <p><span className="font-black text-[#2F6B43]">Entidade:</span> {appointment.entity.name}</p>
                          <p><span className="font-black text-[#2F6B43]">Situação:</span> {statusLabel(appointment.status)}</p>
                          <p className="col-span-2"><span className="font-black text-[#2F6B43]">Origem:</span> {channelLabel(appointment.bookingChannel)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}

            {grouped.length === 0 && <p className="rounded-[1.75rem] bg-white p-5 text-center font-bold text-slate-500 ring-1 ring-[#123D2C]/10">Nenhum agendamento encontrado para os filtros informados.</p>}

            {(payload?.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-2xl bg-white px-4 py-2 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 disabled:opacity-40">Anterior</button>
                <span className="text-sm font-black text-[#123D2C]">Página {page} de {payload?.totalPages}</span>
                <button type="button" disabled={page >= (payload?.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)} className="rounded-2xl bg-white px-4 py-2 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 disabled:opacity-40">Próxima</button>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
