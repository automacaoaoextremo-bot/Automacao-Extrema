"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Settings = {
  defaultAmount: number;
  familyAmount: number;
  defaultDueDays: number[];
  reminderBeforeDays: number;
  reminderAfterDays: number;
  pixKey: string;
  pixReceiverName: string;
  pixCity: string;
  familyContributionLabel: string;
  persuasiveText: string;
};

type Payload = { settings?: Settings; error?: string };

const defaultSettings: Settings = {
  defaultAmount: 50,
  familyAmount: 120,
  defaultDueDays: [10],
  reminderBeforeDays: 3,
  reminderAfterDays: 2,
  pixKey: "tucxacentro@gmail.com",
  pixReceiverName: "TUCXA",
  pixCity: "CAMPINAS",
  familyContributionLabel: "Contribuição familiar",
  persuasiveText: "A contribuição mensal ajuda a manter a casa preparada, limpa, organizada e disponível para os trabalhos. Quando cada Filho da Corrente mantém sua parte em dia, a tesouraria ganha previsibilidade e a corrente ganha tranquilidade para servir.",
};

function parseDueDays(value: string) {
  return value.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item) && item >= 1 && item <= 31);
}

export default function CorrenteConfiguracoesPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [dueDaysText, setDueDaysText] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/organizacao-em-harmonia/cliente/corrente-em-dia", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    const result = (await response.json()) as Payload;
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar configurações.");
    const next = { ...defaultSettings, ...(result.settings ?? {}) };
    setSettings(next);
    setDueDaysText(next.defaultDueDays.join(", "));
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
      const finalSettings = { ...settings, defaultDueDays: parseDueDays(dueDaysText) };
      const response = await fetch("/api/organizacao-em-harmonia/cliente/corrente-em-dia", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveSettings", settings: finalSettings }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setSettings(finalSettings);
      setMessage(result.message || "Configurações salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell title="Configurações do Corrente em Dia" description="Defina valores, vencimentos, Pix e lembretes.">
      <form onSubmit={submit} className="grid gap-5 rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
        {loading && <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Carregando...</p>}
        {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
        {message && <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}

        <section className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 font-black text-[#123D2C]">
            Valor padrão da contribuição
            <input value={settings.defaultAmount} onChange={(event) => update("defaultAmount", Number(event.target.value))} inputMode="decimal" className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
          </label>
          <label className="grid gap-2 font-black text-[#123D2C]">
            Valor para contribuição em família
            <input value={settings.familyAmount} onChange={(event) => update("familyAmount", Number(event.target.value))} inputMode="decimal" className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
          </label>
          <label className="grid gap-2 font-black text-[#123D2C]">
            Dias previstos no mês
            <input value={dueDaysText} onChange={(event) => setDueDaysText(event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" placeholder="Ex.: 10, 20" />
          </label>
          <label className="grid gap-2 font-black text-[#123D2C]">
            Lembrete antes do vencimento (dias)
            <input value={settings.reminderBeforeDays} onChange={(event) => update("reminderBeforeDays", Number(event.target.value))} inputMode="numeric" className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
          </label>
          <label className="grid gap-2 font-black text-[#123D2C]">
            Lembrete após atraso (dias)
            <input value={settings.reminderAfterDays} onChange={(event) => update("reminderAfterDays", Number(event.target.value))} inputMode="numeric" className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
          </label>
          <label className="grid gap-2 font-black text-[#123D2C]">
            Chave Pix
            <input value={settings.pixKey} onChange={(event) => update("pixKey", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
          </label>
          <label className="grid gap-2 font-black text-[#123D2C]">
            Nome do recebedor Pix
            <input value={settings.pixReceiverName} onChange={(event) => update("pixReceiverName", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
          </label>
          <label className="grid gap-2 font-black text-[#123D2C]">
            Cidade do recebedor
            <input value={settings.pixCity} onChange={(event) => update("pixCity", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3 font-semibold" />
          </label>
          <label className="grid gap-2 font-black text-[#123D2C] md:col-span-2">
            Texto persuasivo da tela do Filho da Corrente
            <textarea value={settings.persuasiveText} onChange={(event) => update("persuasiveText", event.target.value)} className="min-h-32 rounded-2xl border border-slate-200 bg-white p-3 font-semibold text-slate-700" />
          </label>
        </section>

        <button disabled={saving || loading} className="w-fit rounded-2xl bg-[#123D2C] px-5 py-3 font-black text-white shadow disabled:opacity-60">{saving ? "Salvando..." : "Salvar configurações"}</button>
      </form>
    </OrganizacaoClientShell>
  );
}
