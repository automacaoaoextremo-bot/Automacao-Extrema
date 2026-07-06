"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type SiteSettings = {
  publicSlug: string;
  organizationName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  headline: string;
  showFilhoDaCorrente: boolean;
  showConsulente: boolean;
  showClienteFundador: boolean;
  enabledSections: string[];
};

const defaultSettings: SiteSettings = {
  publicSlug: "tucxa",
  organizationName: "TUCXA - Templo de Umbanda Caboclo Sete Flexa",
  logoUrl: "/clientes/tucxa/tucxa-logo.jpg",
  primaryColor: "#123D2C",
  accentColor: "#2F6B43",
  headline: "Um ponto simples para orientar, organizar e cuidar melhor da nossa corrente.",
  showFilhoDaCorrente: true,
  showConsulente: true,
  showClienteFundador: false,
  enabledSections: ["visao", "modulos", "base-harmonia", "beneficios", "como-funciona"],
};

const sectionOptions = [
  { slug: "visao", label: "Visão adaptada ao Tucxa" },
  { slug: "modulos", label: "Módulos da Organização em Harmonia" },
  { slug: "base-harmonia", label: "Base de Harmonia, substituindo Base Única" },
  { slug: "beneficios", label: "Benefícios para Filhos da Corrente" },
  { slug: "como-funciona", label: "Como funciona" },
  { slug: "consulentes", label: "Consulentes / Filhos de Fora" },
];

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function ConfiguracaoSiteClientePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const authToken = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;
    if (!token) router.replace("/solucoes/organizacao-em-harmonia/login");
    return token;
  }, [router]);

  const request = useCallback(async (init?: RequestInit) => {
    const token = await authToken();
    if (!token) return null;
    const response = await fetch("/api/organizacao-em-harmonia/cliente/site", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result as { settings: SiteSettings; publicSlug: string };
  }, [authToken]);

  useEffect(() => {
    let active = true;
    request()
      .then((result) => {
        if (active && result?.settings) setSettings({ ...defaultSettings, ...result.settings });
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar configuração.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify(settings) });
      if (result?.settings) setSettings({ ...defaultSettings, ...result.settings });
      setMessage("Configuração salva. Revise o site público do cliente antes de divulgar o link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell
      title="Site público do cliente"
      description="Configure o site específico da organização cliente, preservando a solução Organização em Harmonia e adaptando logo, cores, textos e chamadas para o público do Tucxa."
    >
      {loading ? (
        <div className="rounded-[2rem] bg-white p-6 font-bold text-slate-600 shadow ring-1 ring-slate-100">Carregando configuração...</div>
      ) : (
        <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">Identidade visual</h2>
            <p className="mt-2 leading-7 text-slate-600">Para o Tucxa, o padrão fica verde e branco, usando o logo da organização na primeira linha do cabeçalho.</p>

            <div className="mt-5 grid gap-4">
              <Input label="Slug público" value={settings.publicSlug} onChange={(value) => update("publicSlug", value)} placeholder="tucxa" />
              <Input label="Nome exibido" value={settings.organizationName} onChange={(value) => update("organizationName", value)} />
              <Input label="Logo da organização" value={settings.logoUrl} onChange={(value) => update("logoUrl", value)} placeholder="/clientes/tucxa/tucxa-logo.jpg" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Cor principal" value={settings.primaryColor} onChange={(value) => update("primaryColor", value)} placeholder="#123D2C" />
                <Input label="Cor de apoio" value={settings.accentColor} onChange={(value) => update("accentColor", value)} placeholder="#2F6B43" />
              </div>
              <label className="grid gap-1">
                <span className="text-sm font-black text-[#00334E]">Chamada principal</span>
                <textarea value={settings.headline} onChange={(event) => update("headline", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" />
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">O que deve aparecer</h2>
            <p className="mt-2 leading-7 text-slate-600">No Tucxa, Cliente Fundador deve ficar oculto. As chamadas principais passam a ser Filho da Corrente e Consulente.</p>

            <div className="mt-5 grid gap-3">
              <Check label="Mostrar botão Filho da Corrente" checked={settings.showFilhoDaCorrente} onChange={(checked) => update("showFilhoDaCorrente", checked)} />
              <Check label="Mostrar botão Consulente" checked={settings.showConsulente} onChange={(checked) => update("showConsulente", checked)} />
              <Check label="Mostrar Cliente Fundador" checked={settings.showClienteFundador} onChange={(checked) => update("showClienteFundador", checked)} />
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">Seções habilitadas</p>
              <div className="mt-3 grid gap-2">
                {sectionOptions.map((item) => (
                  <Check key={item.slug} label={item.label} checked={settings.enabledSections.includes(item.slug)} onChange={() => update("enabledSections", toggle(settings.enabledSections, item.slug))} />
                ))}
              </div>
            </div>

            {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            {message && <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p>}

            <button disabled={saving} className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-4 font-black text-[#00334E] shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar configuração do site"}
            </button>
            <Link href="/solucoes/organizacao-em-harmonia/tucxa" target="_blank" className="mt-3 inline-flex w-full justify-center rounded-2xl bg-slate-100 px-5 py-4 font-black text-[#00334E] transition hover:-translate-y-0.5">
              Abrir site do Tucxa
            </Link>
          </section>
        </form>
      )}
    </OrganizacaoClientShell>
  );
}

function Input({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-black text-[#00334E]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder={placeholder} />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5" />
      <span className="text-sm font-black text-[#00334E]">{label}</span>
    </label>
  );
}
