"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Entity = { id: string; name: string; daily_capacity: number | null };
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
              {(payload.entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhum agendamento encontrado para estes filtros.</p>}
        </div>
      </section>
    </OrganizacaoClientShell>
  );
}
