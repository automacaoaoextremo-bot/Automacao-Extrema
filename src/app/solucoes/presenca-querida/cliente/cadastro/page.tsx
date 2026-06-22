"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { PresencaClientShell } from "@/components/presenca-client-header";
import { PresencaContextualHelp } from "@/components/presenca-contextual-help";
import { DANIELA50_EXTRAS } from "@/lib/presenca-daniela50";
import { supabaseBrowser } from "@/lib/supabase-browser";

type EventForm = {
  id?: string;
  name: string;
  event_type: string;
  host_name: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  address: string;
  city: string;
  state: string;
  public_headline: string;
  invitation_message: string;
  dress_code: string;
  parking_info: string;
  venue_instagram_url: string;
  map_url: string;
  host_photo_url: string;
  buffet_name: string;
  buffet_instagram_url: string;
  drinks_provider_name: string;
  drinks_provider_instagram_url: string;
  cake_info: string;
  privacy_notes: string;
  landing_enabled: boolean;
  public_status: string;
  is_surprise: boolean;
  host_photo_gallery: string[];
  menu_gallery: string[];
  attractions: typeof DANIELA50_EXTRAS.attractions;
  menu_sections: typeof DANIELA50_EXTRAS.menuSections;
  location_positive_points: string[];
  event_positive_points: string[];
};

const emptyForm: EventForm = {
  name: "",
  event_type: "aniversario",
  host_name: "",
  event_date: "",
  event_time: "",
  venue_name: "",
  address: "",
  city: "",
  state: "",
  public_headline: "",
  invitation_message: "",
  dress_code: "",
  parking_info: "",
  venue_instagram_url: "",
  map_url: "",
  host_photo_url: "",
  buffet_name: "",
  buffet_instagram_url: "",
  drinks_provider_name: "",
  drinks_provider_instagram_url: "",
  cake_info: "",
  privacy_notes: "",
  landing_enabled: true,
  public_status: "configuracao",
  is_surprise: false,
  host_photo_gallery: [],
  menu_gallery: [],
  attractions: [],
  menu_sections: [],
  location_positive_points: [],
  event_positive_points: [],
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
}

function eventToForm(event: Record<string, unknown>): EventForm {
  return {
    ...emptyForm,
    id: String(event.id ?? ""),
    name: String(event.name ?? ""),
    event_type: String(event.event_type ?? "aniversario"),
    host_name: String(event.host_name ?? ""),
    event_date: String(event.event_date ?? ""),
    event_time: String(event.event_time ?? ""),
    venue_name: String(event.venue_name ?? ""),
    address: String(event.address ?? ""),
    city: String(event.city ?? ""),
    state: String(event.state ?? ""),
    public_headline: String(event.public_headline ?? ""),
    invitation_message: String(event.invitation_message ?? ""),
    dress_code: String(event.dress_code ?? ""),
    parking_info: String(event.parking_info ?? ""),
    venue_instagram_url: String(event.venue_instagram_url ?? ""),
    map_url: String(event.map_url ?? ""),
    host_photo_url: String(event.host_photo_url ?? ""),
    buffet_name: String(event.buffet_name ?? ""),
    buffet_instagram_url: String(event.buffet_instagram_url ?? ""),
    drinks_provider_name: String(event.drinks_provider_name ?? ""),
    drinks_provider_instagram_url: String(event.drinks_provider_instagram_url ?? ""),
    cake_info: String(event.cake_info ?? ""),
    privacy_notes: String(event.privacy_notes ?? ""),
    landing_enabled: Boolean(event.landing_enabled ?? true),
    public_status: String(event.public_status ?? event.status ?? "configuracao"),
    is_surprise: Boolean(event.is_surprise ?? false),
    host_photo_gallery: asStringArray(event.host_photo_gallery),
    menu_gallery: asStringArray(event.menu_gallery),
    attractions: Array.isArray(event.attractions) ? DANIELA50_EXTRAS.attractions : [],
    menu_sections: Array.isArray(event.menu_sections) ? DANIELA50_EXTRAS.menuSections : [],
    location_positive_points: asStringArray(event.location_positive_points),
    event_positive_points: asStringArray(event.event_positive_points),
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

export default function PresencaCadastroPage() {
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/solucoes/presenca-querida/login";
        return;
      }

      const response = await fetch("/api/presenca-querida/cliente/event", { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar o evento.");
      if (active) setForm(eventToForm(result.event));
    }

    window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar cadastro.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
    };
  }, []);

  const landingHref = useMemo(() => "/solucoes/presenca-querida/evento/daniela-50-anos", []);

  function updateField<K extends keyof EventForm>(field: K, value: EventForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");

      const response = await fetch("/api/presenca-querida/cliente/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, ...extra }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setForm(eventToForm(result.event));
      setMessage("Cadastro salvo com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save();
  }

  async function applyDanielaDefaults() {
    await save({ applyDaniela50Defaults: true });
  }

  async function onPhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const images = await Promise.all(files.map(readFileAsDataUrl));
    const gallery = [...form.host_photo_gallery, ...images];
    setForm((current) => ({ ...current, host_photo_gallery: gallery, host_photo_url: current.host_photo_url || gallery[0] || "" }));
  }

  return (
    <PresencaClientShell>
      <section>
        <div className="grid gap-5 xl:grid-cols-[1fr_0.36fr]">
          <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-rose-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E85D75]">Cadastro do evento</p>
                <h1 className="mt-2 text-3xl font-black text-[#00334E]">Daniela 50 anos</h1>
                <p className="mt-3 max-w-3xl leading-7 text-slate-600">Complete as informações que aparecem na landing pública e nos convites personalizados.</p>
              </div>
              <button type="button" onClick={applyDanielaDefaults} disabled={saving} className="rounded-2xl bg-[#00334E] px-4 py-3 text-sm font-black text-white disabled:opacity-60">Aplicar dados Daniela 50</button>
            </div>

            {loading && <p className="mt-5 rounded-2xl bg-slate-50 p-4 font-bold text-slate-600">Carregando...</p>}
            {message && <p className="mt-5 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}
            {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Nome do evento</span><input value={form.name} onChange={(item) => updateField("name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Anfitriã/aniversariante</span><input value={form.host_name} onChange={(item) => updateField("host_name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Data</span><input type="date" value={form.event_date} onChange={(item) => updateField("event_date", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Horário</span><input value={form.event_time} onChange={(item) => updateField("event_time", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Local</span><input value={form.venue_name} onChange={(item) => updateField("venue_name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Cidade/UF</span><input value={`${form.city}${form.state ? `/${form.state}` : ""}`} onChange={(item) => {
                const [city, state] = item.target.value.split("/");
                updateField("city", city ?? "");
                updateField("state", state ?? "");
              }} className="rounded-2xl border border-slate-200 p-3" /></label>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Endereço</span><input value={form.address} onChange={(item) => updateField("address", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Google Maps</span><input value={form.map_url} onChange={(item) => updateField("map_url", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Instagram do local</span><input value={form.venue_instagram_url} onChange={(item) => updateField("venue_instagram_url", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Chamada principal</span><input value={form.public_headline} onChange={(item) => updateField("public_headline", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Texto do convite</span><textarea value={form.invitation_message} onChange={(item) => updateField("invitation_message", item.target.value)} className="min-h-32 rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Traje e orientações</span><input value={form.dress_code} onChange={(item) => updateField("dress_code", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Estacionamento / chegada</span><input value={form.parking_info} onChange={(item) => updateField("parking_info", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[#fff7f4] p-5 ring-1 ring-rose-100">
              <h2 className="text-xl font-black text-[#00334E]">Fotos da aniversariante</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Você pode usar as fotos já anexadas ou carregar novas imagens. Elas ficam salvas no cadastro do evento para aparecerem na landing.</p>
              <input type="file" accept="image/*" multiple onChange={onPhotoUpload} className="mt-4 w-full rounded-2xl bg-white p-3 text-sm" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {form.host_photo_gallery.map((src, index) => (
                  <button key={`${src}-${index}`} type="button" onClick={() => updateField("host_photo_url", src)} className={`rounded-2xl p-1 ring-2 ${form.host_photo_url === src ? "ring-[#E85D75]" : "ring-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${index + 1}`} className="h-36 w-full rounded-xl object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Buffet</span><input value={form.buffet_name} onChange={(item) => updateField("buffet_name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Instagram do buffet</span><input value={form.buffet_instagram_url} onChange={(item) => updateField("buffet_instagram_url", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Bebidas / chopp</span><input value={form.drinks_provider_name} onChange={(item) => updateField("drinks_provider_name", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Instagram bebidas</span><input value={form.drinks_provider_instagram_url} onChange={(item) => updateField("drinks_provider_instagram_url", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Bolo e sobremesa</span><input value={form.cake_info} onChange={(item) => updateField("cake_info", item.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <label className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 font-bold text-[#00334E]"><input type="checkbox" checked={form.landing_enabled} onChange={(item) => updateField("landing_enabled", item.target.checked)} /> Landing ativa</label>
                <label className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 font-bold text-[#00334E]"><input type="checkbox" checked={form.is_surprise} onChange={(item) => updateField("is_surprise", item.target.checked)} /> Festa surpresa</label>
              </div>
              <a href={landingHref} target="_blank" rel="noreferrer" className="font-black text-[#00334E] underline">Pré-visualizar landing</a>
            </div>

            <button type="submit" disabled={saving} className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#E85D75] px-6 py-4 text-base font-black text-white shadow-lg shadow-rose-900/15 disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar cadastro"}
            </button>
          </form>

          <PresencaContextualHelp title="Deep Dive aplicado" href="/solucoes/presenca-querida/cliente/mensagens" actionLabel="Aprovar convites">
            <p>
              O cadastro não alimenta apenas dados frios. Ele dá contexto para criar convites que mostram por que a presença da pessoa importa, o que ela ganha ao participar e como confirmar ajuda a família a cuidar melhor do evento.
            </p>
          </PresencaContextualHelp>
        </div>
      </section>
    </PresencaClientShell>
  );
}
