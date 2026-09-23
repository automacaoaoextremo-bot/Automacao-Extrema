"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConsulentePanelHeader,
  consulenteSignOutAction,
} from "@/components/organizacao-em-harmonia/consulente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

const API_PATH = "/api/organizacao-em-harmonia/consulentes/agendamento-piloto";
const atendimentoHref = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/atendimento";
const pageHref = "/solucoes/organizacao-em-harmonia/tucxa/consulente/painel/agendamento-piloto";

type ModalKind = "agendar" | "consultar" | "ajuda" | null;
type DateOption = { date: string; weekday: "segunda" | "terca"; monthOccurrence: number; label: string };
type Entity = { id: string; name: string; capacity: number; booked: number; available: number; isAvailable: boolean; suspendedReason: string };
type Appointment = {
  id: string;
  entityName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  confirmationStatus: string;
  confirmationExpiresAt: string;
  order: number | null;
};
type Payload = {
  profile: { fullName: string };
  settings: { confirmationCutoff: string; appointmentTime: string; arrivalWindow: string; daysAhead: number };
  dates: DateOption[];
  selectedDate: string;
  entities: Entity[];
  appointments: Appointment[];
};

function shortDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" });
}

function statusLabel(appointment: Appointment) {
  if (appointment.status === "cancelado") return "Cancelado";
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

  const load = useCallback(async (date?: string) => {
    setLoading(true);
    setError("");
    try {
      const token = await sessionToken();
      if (!token) {
        window.location.replace("/solucoes/organizacao-em-harmonia/tucxa/consulente/login");
        return;
      }
      const query = date ? `?date=${encodeURIComponent(date)}` : "";
      const response = await fetch(`${API_PATH}${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as Payload & { error?: string; requestId?: string };
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
      if (open === "agendar" || open === "consultar") setModal(open);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [modal]);

  const availableEntities = useMemo(() => (payload?.entities ?? []).filter((entity) => entity.isAvailable && entity.available > 0), [payload?.entities]);

  async function post(body: Record<string, unknown>) {
    const token = await sessionToken();
    if (!token) throw new Error("Sessão expirada. Entre novamente.");
    const response = await fetch(API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string; requestId?: string };
    if (!response.ok) throw new Error(`${data.error || "Não foi possível concluir a ação."}${data.requestId ? ` Código: ${data.requestId}` : ""}`);
    return data;
  }

  async function book() {
    if (!payload || !entityId) {
      setError("Escolha uma Entidade com vaga.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await post({ action: "book", entityId, appointmentDate: payload.selectedDate, notes });
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

  const firstName = payload?.profile.fullName.split(/\s+/)[0] || "";

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
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Atendimento em Harmonia · Piloto</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{firstName ? `${firstName}, ` : ""}seu atendimento sem dúvida no caminho.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#EEF7EA] sm:text-base sm:leading-7">
            Veja quando há atendimento, escolha uma Entidade disponível e acompanhe a confirmação. Assim você sabe o que ficou reservado antes de sair de casa.
          </p>
        </section>

        {loading && <p className="mt-3 rounded-2xl bg-white p-4 font-bold text-slate-600 ring-1 ring-[#123D2C]/10">Carregando...</p>}
        {error && <p className="mt-3 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
        {message && <p className="mt-3 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

        {payload && (
          <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            <Action title="Agendar" subtitle="Escolher data e Entidade" onClick={() => setModal("agendar")} />
            <Action title="Consultar e confirmar" subtitle="Meus próximos atendimentos" onClick={() => setModal("consultar")} />
            <Action title="Como funciona" subtitle="Entenda o piloto" onClick={() => setModal("ajuda")} />
          </section>
        )}
      </section>

      {modal && payload && (
        <Modal title={modal === "agendar" ? "Agendar atendimento" : modal === "consultar" ? "Meus agendamentos" : "Como funciona"} onClose={() => setModal(null)}>
          {modal === "agendar" && (
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Data
                <select value={payload.selectedDate} onChange={(event) => void load(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                  {payload.dates.map((item) => <option key={item.date} value={item.date}>{item.label}</option>)}
                </select>
              </label>
              <div className="rounded-2xl bg-[#E9F2E7] p-3 text-sm font-semibold text-[#123D2C] ring-1 ring-[#123D2C]/10">
                Chegada orientada: <strong>{payload.settings.arrivalWindow}</strong> · Atendimento: <strong>{payload.settings.appointmentTime}</strong> · Confirmação até <strong>{payload.settings.confirmationCutoff}</strong>.
              </div>
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Entidade
                <select value={entityId} onChange={(event) => setEntityId(event.target.value)} className="rounded-xl border border-[#123D2C]/15 bg-white p-3 font-semibold">
                  <option value="">Escolha uma Entidade</option>
                  {availableEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} · {entity.available} vaga(s)</option>)}
                </select>
              </label>
              {!availableEntities.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">Não há Entidades com vaga nesta data. Escolha outra data.</p>}
              <label className="grid gap-1 text-sm font-black text-[#123D2C]">Observação opcional
                <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="rounded-xl border border-[#123D2C]/15 p-3 font-semibold" />
              </label>
              <button type="button" onClick={() => void book()} disabled={saving || !entityId} className="rounded-xl bg-[#123D2C] px-4 py-3 font-black text-white disabled:opacity-50">{saving ? "Reservando..." : "Reservar atendimento"}</button>
            </div>
          )}

          {modal === "consultar" && (
            <div className="grid gap-3">
              {payload.appointments.map((appointment) => (
                <article key={appointment.id} className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-[#123D2C]">{appointment.entityName}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{shortDate(appointment.appointmentDate)} · {appointment.appointmentTime}{appointment.order ? ` · ordem ${appointment.order}` : ""}</p>
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

          {modal === "ajuda" && (
            <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-700">
              <Info title="Escolha com clareza">O sistema mostra somente as datas do piloto e as Entidades previstas para cada semana do mês.</Info>
              <Info title="Vaga real">A quantidade disponível considera o limite definido pela Recepção e eventuais suspensões.</Info>
              <Info title={`Confirme até ${payload.settings.confirmationCutoff}`}>Depois de reservar, abra Meus agendamentos e confirme sua presença dentro do prazo.</Info>
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#10251C]/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#123D2C]/10 px-5 py-4"><h2 className="text-xl font-black text-[#123D2C]">{title}</h2><button type="button" onClick={onClose} className="rounded-xl bg-[#123D2C] px-4 py-2 text-sm font-black text-white">Fechar</button></header><div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div></section></div>;
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10"><p className="font-black text-[#123D2C]">{title}</p><p className="mt-1">{children}</p></div>;
}
