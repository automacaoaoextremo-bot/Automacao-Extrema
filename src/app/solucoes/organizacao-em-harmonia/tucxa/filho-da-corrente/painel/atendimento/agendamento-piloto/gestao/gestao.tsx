"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilhoCorrentePanelHeader, filhoAgendamentoSignOutAction, filhoSupportAction } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { TucxaPilotReports } from "@/components/organizacao-em-harmonia/tucxa-pilot-reports";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API = "/api/organizacao-em-harmonia/filhos-corrente/agendamento-piloto";

type View = "inicio" | "envios" | "relatorios";
type DispatchAppointment = {
  id: string;
  personId: string;
  entityId: string;
  entityName: string;
  consulenteName: string;
  whatsapp: string;
  recipientName: string;
  appointmentDate: string;
  status: string;
  confirmationStatus: string;
  category: "requested" | "confirmed";
  order: number | null;
  reminderSentAt: string;
  confirmationLinkSentAt: string;
  pizzaSentAt: string;
  dispatchBlockedReason: string;
  dispatchComplete: boolean;
};

type FlowReadiness = {
  requestedReminder: boolean;
  confirmedReminder: boolean;
  pizza: boolean;
};

type DispatchPayload = {
  appointments?: DispatchAppointment[];
  flowReadiness?: FlowReadiness;
  error?: string;
  results?: Array<{ appointmentId: string; consulenteName: string; errors: string[] }>;
};

function isoDateOffset(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ptBrDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function sentLabel(value: string) {
  if (!value) return "Não enviado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Enviado";
  return `Enviado ${date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

async function token() {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token || "";
}

export function TucxaGestaoContent({ embedded = false, onViewChange }: { embedded?: boolean; onViewChange?: (view: View) => void }) {
  const [view, setView] = useState<View>("inicio");
  const [date, setDate] = useState(() => isoDateOffset(1));
  const [appointments, setAppointments] = useState<DispatchAppointment[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [readiness, setReadiness] = useState<FlowReadiness>({ requestedReminder: false, confirmedReminder: false, pizza: false });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const flowsReady = readiness.requestedReminder && readiness.confirmedReminder && readiness.pizza;

  const loadAvailableDates = useCallback(async () => {
    setDatesLoading(true);
    setError("");
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error("Sua sessão expirou. Entre novamente no TUCXA.");
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "management-dispatch-dates" }),
        cache: "no-store",
      });
      const payload = (await response.json()) as { dates?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível consultar datas com agendamentos.");
      const dates = Array.isArray(payload.dates) ? payload.dates.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)) : [];
      setAvailableDates(dates);
      setDate((current) => dates.includes(current) ? current : (dates[0] || ""));
    } catch (loadError) {
      setAvailableDates([]);
      setDate("");
      setError(loadError instanceof Error ? loadError.message : "Não foi possível consultar datas com agendamentos.");
    } finally {
      setDatesLoading(false);
    }
  }, []);

  function navigate(next: View) {
    setView(next);
    onViewChange?.(next);
    if (next === "envios") void loadAvailableDates();
  }


  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error("Sua sessão expirou. Entre novamente no TUCXA.");
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "management-dispatch-list", date }),
        cache: "no-store",
      });
      const payload = (await response.json()) as DispatchPayload;
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os agendamentos.");
      setAppointments((payload.appointments ?? []).sort((a, b) => a.consulenteName.localeCompare(b.consulenteName, "pt-BR", { sensitivity: "base" })));
      setReadiness(payload.flowReadiness ?? { requestedReminder: false, confirmedReminder: false, pizza: false });
      setSelected(new Set());
    } catch (loadError) {
      setAppointments([]);
      setSelected(new Set());
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os agendamentos.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (view !== "envios") return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load, view]);

  const selectable = useMemo(() => appointments.filter((item) => !item.dispatchBlockedReason && !item.dispatchComplete), [appointments]);
  const selectableIds = useMemo(() => new Set(selectable.map((item) => item.id)), [selectable]);
  const allSelected = selectable.length > 0 && selectable.every((item) => selected.has(item.id));
  const selectedAppointments = useMemo(() => selectable.filter((item) => selected.has(item.id)), [selectable, selected]);

  function toggle(id: string) {
    if (!selectableIds.has(id) || sending) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((item) => item.id)));
  }

  async function sendSelected() {
    if (!selectedAppointments.length || sending) return;
    setSending(true);
    setError("");
    setMessage("");
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error("Sua sessão expirou. Entre novamente no TUCXA.");
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          action: "management-dispatch-send",
          date,
          appointmentIds: selectedAppointments.map((item) => item.id),
        }),
      });
      const payload = (await response.json()) as DispatchPayload;
      if (!response.ok) throw new Error(payload.error || "Não foi possível processar os envios.");
      setAppointments((payload.appointments ?? appointments).sort((a, b) => a.consulenteName.localeCompare(b.consulenteName, "pt-BR", { sensitivity: "base" })));
      setSelected(new Set());
      const failed = (payload.results ?? []).filter((item) => item.errors?.length);
      setMessage(failed.length
        ? `Envios processados. ${failed.length} agendamento(s) tiveram alguma falha; confira os avisos e tente novamente.`
        : "Envios processados com sucesso. Itens já enviados foram preservados e não foram duplicados.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Não foi possível processar os envios.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={embedded ? "min-w-0 w-full text-[#10251C]" : "min-h-screen bg-[#F7FAF2] text-[#10251C]"}>
      {!embedded && <FilhoCorrentePanelHeader navLabel="Agendamento · Gestão" showSupport={false} actions={[{ label: "Voltar", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto?abrir=acolhimento", variant: "secondary" }, filhoAgendamentoSignOutAction, filhoSupportAction]} mobileActionColumns={3} compactMobileActions autoHighlightCurrent={false} />}
      <section className={embedded ? "min-w-0 w-full px-0 py-0" : "mx-auto max-w-6xl p-4"}>
        {!embedded && <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black sm:text-3xl">Gestão</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">Relatórios e envios controlados aos Consulentes.</p>
          </div>
        </div>}
        {!embedded && view !== "inicio" && (
          <button type="button" onClick={() => navigate("inicio")} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/15">← Voltar à Gestão</button>
        )}
        {view === "inicio" && (
          <div className="grid gap-2 sm:gap-3">
            <button type="button" onClick={() => navigate("envios")} className="rounded-2xl bg-white p-4 text-left ring-1 ring-[#123D2C]/10 hover:bg-[#E9F2E7]">
              <span className="block text-lg font-black text-[#123D2C]">Envios WhatsApp</span>
              <span className="mt-1 block text-sm text-slate-600">Lembretes e mensagens controladas aos Consulentes.</span>
            </button>
            <button type="button" onClick={() => navigate("relatorios")} className="rounded-2xl bg-white p-4 text-left ring-1 ring-[#123D2C]/10 hover:bg-[#E9F2E7]">
              <span className="block text-lg font-black text-[#123D2C]">Relatórios</span>
              <span className="mt-1 block text-sm text-slate-600">Acompanhar atendimentos, Consulentes, Entidades e Cavalinhos.</span>
            </button>
          </div>
        )}

        {view === "relatorios" ? (
          <div className="min-w-0"><TucxaPilotReports /></div>
        ) : view === "envios" ? (
          <div className="grid min-w-0 gap-3">
            <section className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10 sm:p-4">
              <div className="grid min-w-0 gap-3 md:grid-cols-[220px_auto_1fr] md:items-end">
                <label className="grid gap-1 text-sm font-black">
                  Data do atendimento
                  <select
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    disabled={datesLoading || availableDates.length === 0}
                    className="min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold disabled:opacity-50"
                  >
                    {availableDates.length === 0 && <option value="">{datesLoading ? "Carregando datas..." : "Nenhuma data com agendamento"}</option>}
                    {availableDates.map((item) => <option key={item} value={item}>{ptBrDate(item)}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading || !date}
                  className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  {loading ? "Carregando..." : "Carregar agendamentos"}
                </button>

              </div>
            </section>

            {!datesLoading && availableDates.length === 0 && !error && (
              <p className="rounded-xl bg-[#F7FAF2] p-3 text-sm font-semibold text-slate-600">Não há datas futuras com agendamentos solicitados ou confirmados.</p>
            )}
            {!flowsReady && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                BotConversa ainda não está completo para esta função. Configure os fluxos de lembrete confirmado e pizzas na Vercel antes de enviar.
              </div>
            )}
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
            {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div>}

            <section className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-[#123D2C]/10 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-600">{appointments.length} registro(s) · {selectable.length} disponível(is) para envio · {selected.size} selecionado(s)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={toggleAll} disabled={!selectable.length || sending} className="rounded-xl border border-[#123D2C]/20 px-3 py-2 text-sm font-black text-[#123D2C] disabled:opacity-40">
                    {allSelected ? "Limpar seleção" : "Selecionar todos"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendSelected()}
                    disabled={sending || !selected.size || !flowsReady}
                    className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                  >
                    {sending ? "Enviando..." : "Enviar selecionados"}
                  </button>
                </div>
              </div>

              {!loading && !appointments.length ? (
                <div className="py-10 text-center text-sm font-semibold text-slate-500">Nenhum agendamento solicitado ou confirmado encontrado para esta data.</div>
              ) : (
                <div className="mt-3 grid gap-3">
                  {appointments.map((appointment) => (
                    <label key={appointment.id} className={`grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-slate-200 p-3 ${appointment.dispatchBlockedReason || appointment.dispatchComplete ? "cursor-not-allowed bg-slate-50 opacity-75" : "cursor-pointer hover:bg-[#F7FAF2]"}`}>
                      <input type="checkbox" disabled={Boolean(appointment.dispatchBlockedReason || appointment.dispatchComplete) || sending} checked={selected.has(appointment.id)} onChange={() => toggle(appointment.id)} className="mt-1 h-5 w-5 accent-[#123D2C] disabled:cursor-not-allowed" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-black text-[#123D2C]">{appointment.consulenteName}</div>
                            <div className="text-sm font-semibold text-slate-600">{appointment.entityName}{appointment.order ? ` · Agendamento ${appointment.order}` : ""}</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${appointment.category === "confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                            {appointment.category === "confirmed" ? "Confirmado" : "Solicitado"}
                          </span>
                        </div>
                        {(appointment.dispatchBlockedReason || appointment.dispatchComplete) && <p className="mt-2 text-xs font-bold text-slate-600">{appointment.dispatchBlockedReason || "Envios já concluídos: não é permitido reenviar."}</p>}
                        <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-3">
                          <div className={appointment.reminderSentAt ? "text-emerald-700" : "text-slate-500"}>Lembrete: {sentLabel(appointment.reminderSentAt)}</div>
                          <div className={appointment.category === "confirmed" ? "text-slate-400" : appointment.confirmationLinkSentAt ? "text-emerald-700" : "text-slate-500"}>
                            Confirmação: {appointment.category === "confirmed" ? "não se aplica" : sentLabel(appointment.confirmationLinkSentAt)}
                          </div>
                          <div className={appointment.pizzaSentAt ? "text-emerald-700" : "text-slate-500"}>Pizzas: {sentLabel(appointment.pizzaSentAt)}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function GestaoPage() {
  return <TucxaGestaoContent />;
}
