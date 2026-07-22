"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilhoCorrentePanelHeader } from "@/components/organizacao-em-harmonia/filho-corrente-panel-header";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Entity = {
  id: string;
  name: string;
  line: string | null;
  entity_type: string | null;
  isPrimaryForAttendance: boolean;
};

type Appointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  entityId: string;
  entityName: string;
  consulenteName: string;
  order: number | null;
  status: string;
};

type Payload = {
  profile: { fullName: string };
  entities: Entity[];
  appointments: Appointment[];
};

const API_PATH = "/api/organizacao-em-harmonia/filhos-corrente/entidade-agendamentos";
const LOGIN_PATH = "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function statusLabel(value: string) {
  if (value === "confirmado") return "Confirmado";
  if (value === "presente") return "Presente";
  if (value === "concluido") return "Concluído";
  if (value === "aprovado") return "Aprovado";
  return "Solicitado";
}

export default function EntidadesEAtendimentosPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`${LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    const response = await fetch(API_PATH, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar os atendimentos.");
    setPayload(result as Payload);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((reason) => setError(reason instanceof Error ? reason.message : "Erro ao carregar.")).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    (payload?.appointments ?? []).forEach((appointment) => {
      const key = `${appointment.appointmentDate}::${appointment.appointmentTime}::${appointment.entityId}`;
      map.set(key, [...(map.get(key) ?? []), appointment]);
    });
    return [...map.entries()].map(([key, appointments]) => ({ key, appointments }));
  }, [payload?.appointments]);

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <FilhoCorrentePanelHeader navLabel="Atendimentos das Entidades" />
      <section className="mx-auto max-w-5xl px-3 py-4 sm:px-6 lg:px-8">
        <article className="rounded-[1.75rem] bg-[#123D2C] p-4 text-white shadow-xl sm:p-7">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#CFE2C7]">Atendimento em Harmonia</p>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl">Atendimentos previstos para as entidades que você recebe.</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#EEF7EA]">A lista considera somente vínculos ativos e entidades marcadas para atendimento de Consulentes/Filhos de Fora.</p>
        </article>

        {loading && <p className="mt-4 rounded-2xl bg-white p-4 font-bold shadow ring-1 ring-slate-100">Carregando atendimentos...</p>}
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}

        {!loading && payload && payload.entities.length === 0 && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900 ring-1 ring-amber-100">Nenhuma entidade que atende Consulentes está vinculada ao seu cadastro. Peça à coordenação para ajustar Base Única → Envolvidos.</p>
        )}

        {!loading && payload && payload.entities.length > 0 && groups.length === 0 && (
          <p className="mt-4 rounded-2xl bg-white p-4 font-bold text-slate-600 shadow ring-1 ring-slate-100">Não há atendimentos futuros para suas entidades vinculadas.</p>
        )}

        <div className="mt-4 grid gap-3">
          {groups.map(({ key, appointments }) => {
            const first = appointments[0];
            return (
              <article key={key} className="rounded-2xl bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2F6B43]">{first.entityName}</p>
                    <h2 className="mt-1 text-lg font-black text-[#123D2C]">{dateLabel(first.appointmentDate)} · {first.appointmentTime}</h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900 ring-1 ring-emerald-100">{appointments.length} atendimento(s)</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-[#F7FAF2] px-3 py-2 ring-1 ring-[#123D2C]/10">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#123D2C] text-sm font-black text-white">{appointment.order ?? "-"}</span>
                      <p className="min-w-0 break-words font-black text-[#123D2C]">{appointment.consulenteName}</p>
                      <span className="text-xs font-bold text-slate-600">{statusLabel(appointment.status)}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
