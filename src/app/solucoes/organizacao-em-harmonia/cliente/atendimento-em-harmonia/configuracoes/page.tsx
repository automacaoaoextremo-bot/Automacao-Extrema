"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Settings = {
  recurringEnabled: boolean;
  maxRecurringAppointmentsPerConsulente: number;
  autoCancelRecurringOnAbsence: boolean;
  allowDifferentEntityAfterFirstAppointment: boolean;
  allowAlternateEntityWhenUnavailable: boolean;
  wednesdayBookingMode: string;
  requireRecommendingEntityForWednesday: boolean;
  appointmentReturnGuidance: string;
};

type Payload = { settings?: Settings; error?: string };

const defaultSettings: Settings = {
  recurringEnabled: true,
  maxRecurringAppointmentsPerConsulente: 2,
  autoCancelRecurringOnAbsence: true,
  allowDifferentEntityAfterFirstAppointment: false,
  allowAlternateEntityWhenUnavailable: true,
  wednesdayBookingMode: "coordination",
  requireRecommendingEntityForWednesday: true,
  appointmentReturnGuidance: "Após o primeiro atendimento com uma entidade, caso seja orientado retorno, procure manter a continuidade com a mesma entidade sempre que possível.",
};

export default function AtendimentoConfiguracoesPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/organizacao-em-harmonia/cliente/atendimento-em-harmonia", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar as configurações.");
    setSettings({ ...defaultSettings, ...(result.settings ?? {}) });
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar configurações."))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  function update<K extends keyof Settings>(field: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/organizacao-em-harmonia/cliente/atendimento-em-harmonia", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveSettings", settings }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setMessage(result.message || "Configurações salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell title="Configurações de Atendimento" description="Defina as regras que orientam agendamentos, retornos, ausências e quarta-feira.">
      <form onSubmit={submit} className="grid gap-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        {loading && <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Carregando...</p>}
        {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
        {message && <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}

        <section className="grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <input type="checkbox" checked={settings.recurringEnabled} onChange={(event) => update("recurringEnabled", event.target.checked)} className="mt-1 h-5 w-5 accent-[#123D2C]" />
            <span><span className="block font-black text-[#123D2C]">Permitir agendamento recorrente</span><span className="text-sm leading-6 text-slate-600">Habilita retornos programados quando houver orientação.</span></span>
          </label>
          <label className="grid gap-2 rounded-3xl bg-[#F7FAF2] p-4 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">
            Quantas recorrências no máximo
            <input value={settings.maxRecurringAppointmentsPerConsulente} onChange={(event) => update("maxRecurringAppointmentsPerConsulente", Number(event.target.value))} inputMode="numeric" className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
          </label>
          <label className="flex items-start gap-3 rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <input type="checkbox" checked={settings.autoCancelRecurringOnAbsence} onChange={(event) => update("autoCancelRecurringOnAbsence", event.target.checked)} className="mt-1 h-5 w-5 accent-[#123D2C]" />
            <span><span className="block font-black text-[#123D2C]">Ausência cancela recorrências posteriores</span><span className="text-sm leading-6 text-slate-600">Evita manter vagas ocupadas quando a pessoa não comparece.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <input type="checkbox" checked={settings.allowDifferentEntityAfterFirstAppointment} onChange={(event) => update("allowDifferentEntityAfterFirstAppointment", event.target.checked)} className="mt-1 h-5 w-5 accent-[#123D2C]" />
            <span><span className="block font-black text-[#123D2C]">Permitir entidade diferente após o primeiro atendimento</span><span className="text-sm leading-6 text-slate-600">Quando desligado, o retorno fica orientado para a mesma entidade.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <input type="checkbox" checked={settings.allowAlternateEntityWhenUnavailable} onChange={(event) => update("allowAlternateEntityWhenUnavailable", event.target.checked)} className="mt-1 h-5 w-5 accent-[#123D2C]" />
            <span><span className="block font-black text-[#123D2C]">Permitir outra entidade quando a original não estiver disponível</span><span className="text-sm leading-6 text-slate-600">Ajuda a recepção a acolher sem travar o fluxo.</span></span>
          </label>
          <label className="flex items-start gap-3 rounded-3xl bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
            <input type="checkbox" checked={settings.requireRecommendingEntityForWednesday} onChange={(event) => update("requireRecommendingEntityForWednesday", event.target.checked)} className="mt-1 h-5 w-5 accent-[#123D2C]" />
            <span><span className="block font-black text-[#123D2C]">Quarta exige entidade que encaminhou</span><span className="text-sm leading-6 text-slate-600">Registra nome, idade, doença e entidade de encaminhamento.</span></span>
          </label>
          <label className="grid gap-2 rounded-3xl bg-[#F7FAF2] p-4 font-black text-[#123D2C] ring-1 ring-[#123D2C]/10 md:col-span-2">
            Orientação de retorno
            <textarea value={settings.appointmentReturnGuidance} onChange={(event) => update("appointmentReturnGuidance", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 bg-white p-3 font-semibold text-slate-700" />
          </label>
        </section>

        <button disabled={saving || loading} className="w-fit rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white shadow disabled:opacity-60">{saving ? "Salvando..." : "Salvar configurações"}</button>
      </form>
    </OrganizacaoClientShell>
  );
}
