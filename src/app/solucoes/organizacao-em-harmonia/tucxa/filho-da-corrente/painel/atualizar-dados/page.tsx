"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TucxaPublicHeader } from "@/components/organizacao-em-harmonia/tucxa-public-header";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { filhoDaCorrenteFunctions } from "../../../tucxa-content";

type DraftItem = {
  slug: string;
  label: string;
  description?: string;
};

type AgendaOption = {
  slug: string;
  label: string;
  description?: string;
  dateLabel?: string;
  timeLabel?: string;
  recurrenceLabel?: string;
  locationLabel?: string;
};

type ProfilePayload = {
  ok?: boolean;
  person?: {
    fullName?: string;
    whatsapp?: string;
    email?: string;
    notes?: string;
  };
  functionSlugs?: string[];
  agendaSlugs?: string[];
  selectedFunctions?: DraftItem[];
  selectedAgenda?: DraftItem[];
  profileUpdateStatus?: string;
  error?: string;
};

type AgendaOptionsPayload = {
  options?: AgendaOption[];
};

type SubmitResponse = {
  ok?: boolean;
  message?: string;
  statusUrl?: string;
  error?: string;
};

function loginUrl() {
  if (typeof window === "undefined") return "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login";
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function normalizeOption(option: Partial<AgendaOption>): AgendaOption | null {
  const slug = typeof option.slug === "string" ? option.slug.trim() : "";
  const label = typeof option.label === "string" ? option.label.trim() : "";
  if (!slug || !label) return null;
  return {
    slug,
    label,
    description: typeof option.description === "string" ? option.description.trim() : "",
    dateLabel: typeof option.dateLabel === "string" ? option.dateLabel.trim() : "",
    timeLabel: typeof option.timeLabel === "string" ? option.timeLabel.trim() : "",
    recurrenceLabel: typeof option.recurrenceLabel === "string" ? option.recurrenceLabel.trim() : "",
    locationLabel: typeof option.locationLabel === "string" ? option.locationLabel.trim() : "",
  };
}

function selectedDraftItems(options: DraftItem[], slugs: string[]) {
  return options.filter((item) => slugs.includes(item.slug)).map((item) => ({ slug: item.slug, label: item.label, description: item.description || "" }));
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function descriptionForAgenda(option: AgendaOption) {
  return option.description || [option.recurrenceLabel, option.dateLabel, option.timeLabel].filter(Boolean).join(" • ") + (option.locationLabel ? ` Local: ${option.locationLabel}` : "");
}

export default function AtualizarDadosFilhoDaCorrentePage() {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [functionSlugs, setFunctionSlugs] = useState<string[]>([]);
  const [agendaSlugs, setAgendaSlugs] = useState<string[]>([]);
  const [originalFunctionSlugs, setOriginalFunctionSlugs] = useState<string[]>([]);
  const [originalAgendaSlugs, setOriginalAgendaSlugs] = useState<string[]>([]);
  const [agendaOptions, setAgendaOptions] = useState<AgendaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [statusUrl, setStatusUrl] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.replace(loginUrl());
      return;
    }

    const [profileResponse, optionsResponse] = await Promise.all([
      fetch("/api/organizacao-em-harmonia/filhos-corrente/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/organizacao-em-harmonia/site-tucxa/agenda-options"),
    ]);

    const profile = (await profileResponse.json()) as ProfilePayload;
    if (!profileResponse.ok) throw new Error(profile.error || "Não foi possível carregar seus dados.");

    const agenda = (await optionsResponse.json().catch(() => ({}))) as AgendaOptionsPayload;
    const options = (agenda.options ?? []).map(normalizeOption).filter((item): item is AgendaOption => Boolean(item));

    setFullName(profile.person?.fullName || "");
    setWhatsapp(profile.person?.whatsapp || "");
    setEmail(profile.person?.email || "");
    setNotes(profile.person?.notes || "");
    setFunctionSlugs(profile.functionSlugs ?? []);
    setAgendaSlugs(profile.agendaSlugs ?? []);
    setOriginalFunctionSlugs(profile.functionSlugs ?? []);
    setOriginalAgendaSlugs(profile.agendaSlugs ?? []);
    setAgendaOptions(options);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar seus dados.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const functionOptions = useMemo<DraftItem[]>(
    () =>
      filhoDaCorrenteFunctions.map((item) => {
        const option = item as { slug: string; label: string; description?: string };
        return { slug: option.slug, label: option.label, description: option.description || "" };
      }),
    [],
  );

  const agendaDraftItems = useMemo<DraftItem[]>(
    () => agendaOptions.map((item) => ({ slug: item.slug, label: item.label, description: descriptionForAgenda(item) })),
    [agendaOptions],
  );

  const selectedFunctions = useMemo(() => selectedDraftItems(functionOptions, functionSlugs), [functionOptions, functionSlugs]);
  const selectedAgenda = useMemo(() => selectedDraftItems(agendaDraftItems, agendaSlugs), [agendaDraftItems, agendaSlugs]);

  const newAgendaOptions = useMemo(
    () => agendaOptions.filter((item) => !originalAgendaSlugs.includes(item.slug)),
    [agendaOptions, originalAgendaSlugs],
  );

  const pendingSummary = useMemo(() => {
    const addedFunctions = functionSlugs.filter((item) => !originalFunctionSlugs.includes(item)).length;
    const removedFunctions = originalFunctionSlugs.filter((item) => !functionSlugs.includes(item)).length;
    const addedAgenda = agendaSlugs.filter((item) => !originalAgendaSlugs.includes(item)).length;
    const removedAgenda = originalAgendaSlugs.filter((item) => !agendaSlugs.includes(item)).length;
    return { addedFunctions, removedFunctions, addedAgenda, removedAgenda };
  }, [agendaSlugs, functionSlugs, originalAgendaSlugs, originalFunctionSlugs]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setStatusUrl("");

    if (!fullName.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (whatsapp.replace(/\D/g, "").length < 10) {
      setError("Informe seu WhatsApp com DDD.");
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");

      const response = await fetch("/api/organizacao-em-harmonia/filhos-corrente/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName, whatsapp, email, notes, functionSlugs, agendaSlugs, selectedFunctions, selectedAgenda }),
      });
      const result = (await response.json()) as SubmitResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar a atualização.");
      setMessage(result.message || "Atualização enviada para validação do Tucxa.");
      setStatusUrl(result.statusUrl || "");
      setOriginalFunctionSlugs(functionSlugs);
      setOriginalAgendaSlugs(agendaSlugs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar atualização.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF2] text-[#10251C]">
      <TucxaPublicHeader
        actions={[
          { label: "Painel", href: "/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel", variant: "primary" },
          { label: "Site Tucxa", href: "/solucoes/organizacao-em-harmonia/tucxa", variant: "secondary" },
        ]}
        navLabel="Atualização de dados do Filho da Corrente"
      />

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-green-900/5 ring-1 ring-[#123D2C]/10 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Atualização dos dados</p>
          <h1 className="mt-2 text-3xl font-black text-[#123D2C]">Meus dados, funções e agenda</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">
            Veja o que já está selecionado, marque o que mudou e envie a atualização para validação do Tucxa. Novas atividades disponíveis aparecem destacadas.
          </p>

          {loading && <p className="mt-5 rounded-3xl bg-[#E9F2E7] p-4 font-bold text-[#123D2C]">Carregando dados...</p>}
          {error && <p className="mt-5 rounded-3xl bg-red-50 p-4 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
          {message && (
            <div className="mt-5 rounded-3xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-100">
              <p>{message}</p>
              {statusUrl && <Link href={statusUrl} className="mt-3 inline-flex rounded-2xl bg-[#123D2C] px-5 py-3 text-white">Acompanhar validação</Link>}
            </div>
          )}

          {!loading && !error && (
            <form onSubmit={submit} className="mt-6 grid gap-5">
              <section className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-black text-[#123D2C] md:col-span-3">
                  Nome completo
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100" required />
                </label>
                <label className="grid gap-2 text-sm font-black text-[#123D2C]">
                  WhatsApp com DDD
                  <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100" required />
                </label>
                <label className="grid gap-2 text-sm font-black text-[#123D2C]">
                  E-mail
                  <input value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100" placeholder="Opcional" />
                </label>
                <label className="grid gap-2 text-sm font-black text-[#123D2C]">
                  Observação
                  <input value={notes} onChange={(event) => setNotes(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 outline-none focus:border-[#31C16B] focus:ring-4 focus:ring-emerald-100" placeholder="Opcional" />
                </label>
              </section>

              <section className="rounded-[1.75rem] bg-[#F7FAF2] p-4 ring-1 ring-[#123D2C]/10">
                <h2 className="text-xl font-black text-[#123D2C]">Resumo das alterações</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <p className="rounded-2xl bg-white p-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">+{pendingSummary.addedFunctions} funções</p>
                  <p className="rounded-2xl bg-white p-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">-{pendingSummary.removedFunctions} funções</p>
                  <p className="rounded-2xl bg-white p-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">+{pendingSummary.addedAgenda} agendas</p>
                  <p className="rounded-2xl bg-white p-3 text-sm font-black text-[#123D2C] ring-1 ring-[#123D2C]/10">-{pendingSummary.removedAgenda} agendas</p>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                  <h2 className="text-xl font-black text-[#123D2C]">Funções</h2>
                  <div className="mt-4 grid gap-2">
                    {functionOptions.map((item) => {
                      const checked = functionSlugs.includes(item.slug);
                      const wasChecked = originalFunctionSlugs.includes(item.slug);
                      return (
                        <label key={item.slug} className={`flex gap-3 rounded-2xl p-3 ring-1 ${checked ? "bg-emerald-50 ring-emerald-100" : "bg-[#F7FAF2] ring-[#123D2C]/10"}`}>
                          <input type="checkbox" checked={checked} onChange={() => setFunctionSlugs((values) => toggleValue(values, item.slug))} className="mt-1 h-5 w-5" />
                          <span>
                            <span className="font-black text-[#123D2C]">{item.label}</span>
                            {wasChecked && <span className="ml-2 rounded-full bg-[#123D2C] px-2 py-0.5 text-xs font-black text-white">já selecionado</span>}
                            {item.description && <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600">{item.description}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </article>

                <article className="rounded-[1.75rem] bg-white p-4 shadow ring-1 ring-[#123D2C]/10">
                  <h2 className="text-xl font-black text-[#123D2C]">Agenda Viva</h2>
                  {newAgendaOptions.length > 0 && <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-100">Novas opções a partir da data atual: {newAgendaOptions.length}</p>}
                  <div className="mt-4 grid gap-2">
                    {agendaOptions.map((item) => {
                      const checked = agendaSlugs.includes(item.slug);
                      const wasChecked = originalAgendaSlugs.includes(item.slug);
                      const isNew = !wasChecked;
                      return (
                        <label key={item.slug} className={`flex gap-3 rounded-2xl p-3 ring-1 ${checked ? "bg-emerald-50 ring-emerald-100" : isNew ? "bg-amber-50 ring-amber-100" : "bg-[#F7FAF2] ring-[#123D2C]/10"}`}>
                          <input type="checkbox" checked={checked} onChange={() => setAgendaSlugs((values) => toggleValue(values, item.slug))} className="mt-1 h-5 w-5" />
                          <span>
                            <span className="font-black text-[#123D2C]">{item.label}</span>
                            {wasChecked && <span className="ml-2 rounded-full bg-[#123D2C] px-2 py-0.5 text-xs font-black text-white">já selecionado</span>}
                            {isNew && <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-black text-amber-900">novo</span>}
                            <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600">{descriptionForAgenda(item)}</span>
                          </span>
                        </label>
                      );
                    })}
                    {agendaOptions.length === 0 && <p className="rounded-2xl bg-[#F7FAF2] p-3 font-bold text-slate-600">Nenhuma opção de agenda disponível agora.</p>}
                  </div>
                </article>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" disabled={saving} className="rounded-2xl bg-[#123D2C] px-5 py-4 font-black text-white shadow-lg shadow-green-900/10 disabled:opacity-60">
                  {saving ? "Enviando..." : "Enviar atualização para validação"}
                </button>
                <Link href="/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel" className="rounded-2xl bg-white px-5 py-4 text-center font-black text-[#123D2C] shadow ring-1 ring-[#123D2C]/10">Voltar ao painel</Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
