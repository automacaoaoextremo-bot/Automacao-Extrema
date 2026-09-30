"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Entity = { id: string; name: string; daily_capacity: number | null; active?: boolean | null; appointment_enabled?: boolean | null };
type Appointment = {
  id: string;
  consulente_name: string;
  whatsapp: string | null;
  email: string | null;
  appointment_date: string;
  appointment_time: string | null;
  status: string;
  entity_id: string | null;
  notes: string | null;
  metadata?: Record<string, unknown> | null;
  confirmation_status?: string | null;
  confirmed_at?: string | null;
  arrival_status?: string | null;
  arrived_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
};
type Payload = { entities?: Entity[]; appointments?: Appointment[]; error?: string };

const statusLabels: Record<string, string> = { solicitado: "Solicitado", confirmado: "Confirmado", atendido: "Atendido", ausente: "Ausente", cancelado: "Cancelado" };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AtendimentoAgendamentosClientePage() {
  const [payload, setPayload] = useState<Payload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filterDate, setFilterDate] = useState(todayIso());
  const [filterEntity, setFilterEntity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/organizacao-em-harmonia/cliente/atendimento-em-harmonia", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar agendamentos.");
    setPayload(result);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar agendamentos."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const entityMap = useMemo(() => new Map((payload.entities ?? []).map((entity) => [entity.id, entity.name])), [payload.entities]);
  const activeEntities = useMemo(() => {
    return (payload.entities ?? [])
      .filter((entity) => entity.active !== false && entity.appointment_enabled !== false)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [payload.entities]);
  const filtered = useMemo(() => {
    return (payload.appointments ?? []).filter((item) => {
      if (filterDate && item.appointment_date !== filterDate) return false;
      if (filterEntity && item.entity_id !== filterEntity) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      return true;
    });
  }, [filterDate, filterEntity, filterStatus, payload.appointments]);

  async function updateStatus(id: string, status: string) {
    setError("");
    setMessage("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/organizacao-em-harmonia/cliente/atendimento-em-harmonia", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateAppointmentStatus", appointmentId: id, status }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar.");
      setMessage(result.message || "Status atualizado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  }

  async function deleteAppointment() {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError("");
    setError("");
    setMessage("");

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/organizacao-em-harmonia/cliente/atendimento-em-harmonia", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteAppointment", appointmentId: deleteTarget.id }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir o agendamento.");

      setDeleteTarget(null);
      setMessage(result.message || "Agendamento excluído.");
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erro ao excluir agendamento.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <OrganizacaoClientShell title="Agendamentos do Atendimento" description="Consulte, filtre, imprima e atualize a fila por entidade e data.">
      <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7 print:shadow-none print:ring-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Recepção</p>
            <h2 className="mt-1 text-2xl font-black text-[#00334E]">Fila de atendimento</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
            <select value={filterEntity} onChange={(event) => setFilterEntity(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold">
              <option value="">Todas entidades</option>
              {activeEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold">
              <option value="">Todos status</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" onClick={() => window.print()} className="rounded-2xl bg-[#123D2C] px-4 py-3 font-black text-white">Imprimir</button>
          </div>
        </div>

        {loading && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Carregando...</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
        {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.14em] text-[#2F6B43]">
                <th className="px-3 py-3">Ordem</th>
                <th className="px-3 py-3">Pessoa</th>
                <th className="px-3 py-3">Entidade</th>
                <th className="px-3 py-3">Data/hora</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 font-black text-[#123D2C]">#{index + 1}</td>
                  <td className="px-3 py-3"><span className="font-black text-[#00334E]">{item.consulente_name}</span><br /><span className="text-xs text-slate-500">{item.whatsapp || item.email || "Contato não informado"}</span></td>
                  <td className="px-3 py-3 font-semibold text-slate-700">{entityMap.get(item.entity_id ?? "") ?? "A definir"}</td>
                  <td className="px-3 py-3 font-semibold text-slate-700">{item.appointment_date} {item.appointment_time ? `• ${item.appointment_time}` : ""}</td>
                  <td className="px-3 py-3"><span className="rounded-full bg-[#E9F2E7] px-3 py-1 text-xs font-black text-[#123D2C]">{statusLabels[item.status] ?? item.status}</span></td>
                  <td className="px-3 py-3 print:hidden">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => updateStatus(item.id, "confirmado")} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">Confirmar</button>
                      <button type="button" onClick={() => updateStatus(item.id, "atendido")} className="rounded-xl bg-[#123D2C] px-3 py-2 text-xs font-black text-white">Atendido</button>
                      <button type="button" onClick={() => updateStatus(item.id, "ausente")} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-100">Ausente</button>
                      <button type="button" onClick={() => { setDeleteError(""); setDeleteTarget(item); }} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhum agendamento encontrado para estes filtros.</p>}
        </div>
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Excluir agendamento">
          <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="border-b border-red-100 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600">Exclusão definitiva</p>
              <h2 className="mt-1 text-xl font-black text-red-800">Excluir agendamento?</h2>
            </header>
            <div className="grid gap-3 p-5">
              <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-800 ring-1 ring-red-100">
                {deleteTarget.consulente_name} · {deleteTarget.appointment_date}. O sistema preservará um registro de auditoria antes da exclusão.
              </p>
              <p className="text-sm font-semibold leading-6 text-slate-600">
                Agendamentos que já possuem chegada, ausência ou atendimento registrado não podem ser apagados para preservar o histórico.
              </p>
              {deleteError && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-100">{deleteError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={deleting} onClick={() => { setDeleteError(""); setDeleteTarget(null); }} className="rounded-xl bg-white px-4 py-3 font-black text-[#123D2C] ring-1 ring-[#123D2C]/15 disabled:opacity-50">Voltar</button>
                <button type="button" disabled={deleting} onClick={() => void deleteAppointment()} className="rounded-xl bg-red-700 px-4 py-3 font-black text-white disabled:opacity-50">{deleting ? "Excluindo..." : "Excluir"}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </OrganizacaoClientShell>
  );
}
