"use client";

import { useEffect, useMemo, useState } from "react";
import { PresencaClientShell } from "@/components/presenca-client-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { formatDateBR, type PresencaGuestStatus } from "@/lib/presenca-querida";

type ConfirmationGuest = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  group_name: string | null;
  relationship_label: string | null;
  relationship_context: string | null;
  guest_status: PresencaGuestStatus;
  status_label: string;
  adults_count: number | null;
  children_count: number | null;
  primary_guest_id: string | null;
  primary_guest_name: string | null;
  household_label: string | null;
  is_invite_recipient: boolean | null;
  invitation_type: string;
  dietary_notes: string | null;
  notes: string | null;
  invited_at: string | null;
  confirmed_at: string | null;
  is_active: boolean | null;
  has_answered: boolean;
};

type ReminderRow = {
  date: string;
  label: string;
  targetStatus: "todos" | "confirmado" | "talvez" | "pendente";
  audience: string;
  internalAlertDate: string;
  targetCount: number;
  operationalStatus: string;
  daysUntil: number;
};

type Payload = {
  ok: boolean;
  summary: {
    total: number;
    confirmed: number;
    maybe: number;
    pending: number;
    declined: number;
    inactive: number;
    principal: number;
    linked: number;
    adults: number;
    children: number;
  };
  guests: ConfirmationGuest[];
  reminders: ReminderRow[];
};

const STATUS_BADGE: Record<string, string> = {
  confirmado: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  confirmado_com_acompanhantes: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  talvez: "bg-amber-50 text-amber-800 ring-amber-100",
  pendente: "bg-slate-50 text-slate-700 ring-slate-200",
  reservou_data: "bg-slate-50 text-slate-700 ring-slate-200",
  nao_podera_ir: "bg-red-50 text-red-700 ring-red-100",
  remover: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

const REMINDER_BADGE: Record<string, string> = {
  todos: "bg-sky-50 text-sky-800 ring-sky-100",
  confirmado: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  talvez: "bg-amber-50 text-amber-800 ring-amber-100",
  pendente: "bg-slate-50 text-slate-700 ring-slate-200",
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

function integerBR(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function targetLabel(status: ReminderRow["targetStatus"]) {
  if (status === "todos") return "Todos";
  if (status === "confirmado") return "Confirmados";
  if (status === "talvez") return "Talvez";
  return "Pendentes";
}

export default function PresencaConfirmacoesPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"todos" | PresencaGuestStatus>("todos");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function getToken() {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");
    return token;
  }

  async function loadConfirmations() {
    const token = await getToken();
    const response = await fetch("/api/presenca-querida/cliente/confirmations", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar confirmações.");
    setPayload(result);
  }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      loadConfirmations()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar confirmações.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // Carregamento inicial controlado pela sessão Supabase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredGuests = useMemo(() => {
    const guests = payload?.guests ?? [];
    if (filter === "todos") return guests;
    if (filter === "confirmado") return guests.filter((guest) => guest.guest_status === "confirmado" || guest.guest_status === "confirmado_com_acompanhantes");
    if (filter === "pendente") return guests.filter((guest) => guest.guest_status === "pendente" || guest.guest_status === "reservou_data");
    return guests.filter((guest) => guest.guest_status === filter);
  }, [filter, payload?.guests]);

  async function resetGuest(guestId: string, guestName: string) {
    if (!window.confirm(`Cancelar a resposta de teste de ${guestName} e voltar para Pendente?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/presenca-querida/cliente/confirmations/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ guestId, clearNotes: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível limpar resposta.");
      setMessage(`Resposta de ${guestName} cancelada e status voltou para Pendente.`);
      await loadConfirmations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao limpar resposta.");
    } finally {
      setSaving(false);
    }
  }

  async function resetAllResponses() {
    if (!window.confirm("Cancelar TODAS as respostas de teste deste evento e voltar todos para Pendente? Esta ação deve ser usada apenas em fase de testes.")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/presenca-querida/cliente/confirmations/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true, clearNotes: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível limpar respostas.");
      setMessage(`${result.count ?? 0} resposta(s) de teste cancelada(s). Todos voltaram para Pendente.`);
      await loadConfirmations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao limpar respostas.");
    } finally {
      setSaving(false);
    }
  }

  const summary = payload?.summary;

  return (
    <PresencaClientShell>
      <section className="grid gap-5">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Confirmações</p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-[#00334E]">Painel de status e próximos envios</h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Acompanhe quem confirmou, quem ainda está pendente, quem marcou talvez e quais lembretes precisam ser preparados para WhatsApp ou lista de transmissão.
              </p>
            </div>
            <button
              type="button"
              onClick={resetAllResponses}
              disabled={saving || loading || !payload?.guests?.length}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar respostas de teste
            </button>
          </div>

          {loading && <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-600">Carregando confirmações...</p>}
          {error && <p className="mt-6 rounded-2xl bg-red-50 p-5 text-sm font-bold text-red-700">{error}</p>}
          {message && <p className="mt-6 rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-800">{message}</p>}

          {summary && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <button type="button" onClick={() => setFilter("todos")} className={`rounded-2xl p-4 text-left ring-1 transition ${filter === "todos" ? "bg-[#00334E] text-white ring-[#00334E]" : "bg-[#fff7f4] text-[#00334E] ring-rose-100"}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Total</p>
                <p className="mt-2 text-3xl font-black">{integerBR(summary.total)}</p>
              </button>
              <button type="button" onClick={() => setFilter("confirmado")} className={`rounded-2xl p-4 text-left ring-1 transition ${filter === "confirmado" ? "bg-emerald-600 text-white ring-emerald-600" : "bg-emerald-50 text-emerald-900 ring-emerald-100"}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Confirmados</p>
                <p className="mt-2 text-3xl font-black">{integerBR(summary.confirmed)}</p>
              </button>
              <button type="button" onClick={() => setFilter("pendente")} className={`rounded-2xl p-4 text-left ring-1 transition ${filter === "pendente" ? "bg-slate-700 text-white ring-slate-700" : "bg-slate-50 text-slate-800 ring-slate-200"}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Pendentes</p>
                <p className="mt-2 text-3xl font-black">{integerBR(summary.pending)}</p>
              </button>
              <button type="button" onClick={() => setFilter("talvez")} className={`rounded-2xl p-4 text-left ring-1 transition ${filter === "talvez" ? "bg-amber-500 text-white ring-amber-500" : "bg-amber-50 text-amber-900 ring-amber-100"}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Talvez</p>
                <p className="mt-2 text-3xl font-black">{integerBR(summary.maybe)}</p>
              </button>
              <button type="button" onClick={() => setFilter("nao_podera_ir")} className={`rounded-2xl p-4 text-left ring-1 transition ${filter === "nao_podera_ir" ? "bg-red-600 text-white ring-red-600" : "bg-red-50 text-red-800 ring-red-100"}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Não irão</p>
                <p className="mt-2 text-3xl font-black">{integerBR(summary.declined)}</p>
              </button>
            </div>
          )}
        </div>

        {payload && (
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-[#E85D75]">Convidados</p>
                  <h2 className="mt-2 text-2xl font-black text-[#00334E]">Status individual</h2>
                </div>
                <p className="text-sm font-bold text-slate-500">Exibindo {integerBR(filteredGuests.length)} de {integerBR(payload.guests.length)}</p>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl ring-1 ring-rose-100">
                <table className="min-w-[920px] w-full bg-white text-left text-sm">
                  <thead className="bg-[#fff7f4] text-xs uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Resposta</th>
                      <th className="px-4 py-3">Contato</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {filteredGuests.map((guest) => (
                      <tr key={guest.id} className={guest.is_active === false ? "bg-slate-50 opacity-60" : "bg-white"}>
                        <td className="px-4 py-4 align-top">
                          <p className="font-black text-[#00334E]">{guest.full_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{guest.relationship_label || guest.relationship_context || guest.group_name || "—"}</p>
                          {guest.primary_guest_name && <p className="mt-1 text-xs font-bold text-[#E85D75]">Vinculado a {guest.primary_guest_name}</p>}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-bold text-slate-700">{guest.invitation_type}</p>
                          <p className="mt-1 text-xs text-slate-500">A:{guest.adults_count ?? 1} C:{guest.children_count ?? 0}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${STATUS_BADGE[guest.guest_status] ?? STATUS_BADGE.pendente}`}>{guest.status_label}</span>
                        </td>
                        <td className="px-4 py-4 align-top text-xs leading-5 text-slate-600">
                          <p><strong>Confirmou:</strong> {formatDateTime(guest.confirmed_at)}</p>
                          {guest.dietary_notes && <p className="mt-1"><strong>Alimentar:</strong> {guest.dietary_notes}</p>}
                          {guest.notes && <p className="mt-1"><strong>Recado:</strong> {guest.notes}</p>}
                        </td>
                        <td className="px-4 py-4 align-top text-xs leading-5 text-slate-600">
                          <p>{guest.whatsapp || "Sem WhatsApp"}</p>
                          <p>{guest.email || "Sem e-mail"}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => resetGuest(guest.id, guest.full_name)}
                            disabled={saving || guest.guest_status === "pendente"}
                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Limpar teste
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredGuests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm font-bold text-slate-500">Nenhum convidado neste filtro.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[#E85D75]">Próximos envios</p>
              <h2 className="mt-2 text-2xl font-black text-[#00334E]">Calendário operacional</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                O status abaixo ajuda a planejar os envios no WhatsApp. Dois dias antes de cada lembrete, a rotina de cron pode enviar um resumo interno para a AE.
              </p>

              <div className="mt-5 grid gap-3">
                {payload.reminders.map((reminder) => (
                  <article key={`${reminder.date}-${reminder.label}-${reminder.targetStatus}`} className="rounded-2xl bg-[#fff7f4] p-4 ring-1 ring-rose-100">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{formatDateBR(reminder.date)}</p>
                        <h3 className="mt-1 font-black text-[#00334E]">{reminder.label}</h3>
                      </div>
                      <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${REMINDER_BADGE[reminder.targetStatus]}`}>{targetLabel(reminder.targetStatus)}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600 sm:grid-cols-2">
                      <p><strong>Público:</strong> {reminder.audience}</p>
                      <p><strong>Quantidade atual:</strong> {integerBR(reminder.targetCount)}</p>
                      <p><strong>Aviso interno:</strong> {formatDateBR(reminder.internalAlertDate)}</p>
                      <p><strong>Status:</strong> {reminder.operationalStatus}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </PresencaClientShell>
  );
}
