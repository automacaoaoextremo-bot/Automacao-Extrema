"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { TUCXA_BASE_UNICA_PROFILE_FIELDS } from "@/lib/organizacao-em-harmonia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  active: boolean;
  notes: string | null;
};

type Role = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  is_system: boolean;
};

type AgendaVivaProfile = {
  isCavalinho?: boolean;
  entityNames?: string[];
  spiritualLines?: string[];
  isCambono?: boolean;
  cambonoEntityNames?: string[];
  isReserveCambono?: boolean;
  supportsReception?: boolean;
  supportsOrganization?: boolean;
  participatesMonday?: boolean;
  participatesTuesday?: boolean;
  participatesWednesday?: boolean;
  participatesThursday?: boolean;
  thursdayGroup?: string;
  canApproveEvents?: boolean;
  canEditCalendar?: boolean;
  canViewReports?: boolean;
  attendanceNotes?: string;
};

type Membership = {
  id: string;
  person_id: string;
  role_id: string | null;
  module_slugs: string[] | null;
  active: boolean;
  status: string | null;
  agenda_viva_profile?: AgendaVivaProfile | null;
};

type ModuleSetting = {
  id: string;
  module_slug: string;
  enabled: boolean;
};

type Payload = {
  organization: { id: string; name: string; enabled_modules: string[] | null } | null;
  people: Person[];
  roles: Role[];
  memberships: Membership[];
  modules: ModuleSetting[];
};

type FormState = {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  roleId: string;
  moduleSlugs: string[];
  active: boolean;
  notes: string;
  isCavalinho: boolean;
  entityNames: string;
  spiritualLines: string;
  isCambono: boolean;
  cambonoEntityNames: string;
  isReserveCambono: boolean;
  supportsReception: boolean;
  supportsOrganization: boolean;
  participatesMonday: boolean;
  participatesTuesday: boolean;
  participatesWednesday: boolean;
  participatesThursday: boolean;
  thursdayGroup: string;
  canApproveEvents: boolean;
  canEditCalendar: boolean;
  canViewReports: boolean;
  attendanceNotes: string;
};

const emptyForm: FormState = {
  id: "",
  fullName: "",
  email: "",
  whatsapp: "",
  roleId: "",
  moduleSlugs: ["agenda-viva"],
  active: true,
  notes: "",
  isCavalinho: false,
  entityNames: "",
  spiritualLines: "",
  isCambono: false,
  cambonoEntityNames: "",
  isReserveCambono: false,
  supportsReception: false,
  supportsOrganization: false,
  participatesMonday: false,
  participatesTuesday: false,
  participatesWednesday: false,
  participatesThursday: false,
  thursdayGroup: "",
  canApproveEvents: false,
  canEditCalendar: false,
  canViewReports: false,
  attendanceNotes: "",
};

const moduleLabels: Record<string, string> = {
  "agenda-viva": "Agenda Viva",
  "atendimento-em-harmonia": "Atendimento em Harmonia",
  "corrente-em-dia": "Corrente em Dia",
};

const weekdayLabels = [
  { key: "participatesMonday", label: "Segunda — filhos de fora" },
  { key: "participatesTuesday", label: "Terça — filhos de fora" },
  { key: "participatesWednesday", label: "Quarta — transformação" },
  { key: "participatesThursday", label: "Quinta — filhos da corrente" },
] as const;

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function membershipFor(personId: string, memberships: Membership[]) {
  return memberships.find((item) => item.person_id === personId) ?? null;
}

function listToText(value: string[] | undefined) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function textToList(value: string) {
  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function csvFromFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo CSV."));
    reader.readAsText(file, "utf-8");
  });
}

function profileSummary(profile: AgendaVivaProfile | null | undefined) {
  const parts: string[] = [];
  if (profile?.isCavalinho) parts.push("Cavalinho");
  if (profile?.isCambono) parts.push(profile.isReserveCambono ? "Cambono reserva" : "Cambono");
  if (profile?.supportsReception) parts.push("Recepção");
  if (profile?.supportsOrganization) parts.push("Organização");
  if (profile?.thursdayGroup) parts.push(profile.thursdayGroup === "ambos" ? "Grupo 1 e 2" : profile.thursdayGroup.replace("grupo-", "Grupo "));
  if (profile?.entityNames?.length) parts.push(`Entidades: ${profile.entityNames.join(", ")}`);
  return parts.join(" • ") || "Sem vínculos operacionais";
}

export default function OrganizacaoBaseUnicaPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const envolvidosSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/solucoes/organizacao-em-harmonia/login";
        return;
      }

      const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar a Base Única.");
      if (!active) return;
      setPayload(result);
    }

    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : "Erro ao carregar Base Única.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const roleById = useMemo(() => {
    return new Map((payload?.roles ?? []).map((role) => [role.id, role]));
  }, [payload?.roles]);

  const stats = useMemo(() => {
    const people = payload?.people ?? [];
    const memberships = payload?.memberships ?? [];
    return {
      active: people.filter((person) => person.active !== false).length,
      inactive: people.filter((person) => person.active === false).length,
      roles: payload?.roles?.filter((role) => role.active !== false).length ?? 0,
      modules: payload?.modules?.filter((item) => item.enabled).length ?? 0,
      cavalinhos: memberships.filter((item) => item.agenda_viva_profile?.isCavalinho).length,
      cambonos: memberships.filter((item) => item.agenda_viva_profile?.isCambono).length,
    };
  }, [payload]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function authenticatedRequest(url: string, init: RequestInit) {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/solucoes/organizacao-em-harmonia/login";
      return null;
    }

    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result;
  }

  async function savePerson() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest("/api/organizacao-em-harmonia/cliente/base-unica", {
        method: "POST",
        body: JSON.stringify({
          action: "upsertPerson",
          personId: form.id || undefined,
          fullName: form.fullName,
          email: form.email,
          whatsapp: normalizePhone(form.whatsapp),
          roleId: form.roleId,
          moduleSlugs: form.moduleSlugs,
          active: form.active,
          notes: form.notes,
          isCavalinho: form.isCavalinho,
          entityNames: textToList(form.entityNames),
          spiritualLines: textToList(form.spiritualLines),
          isCambono: form.isCambono,
          cambonoEntityNames: textToList(form.cambonoEntityNames),
          isReserveCambono: form.isReserveCambono,
          supportsReception: form.supportsReception,
          supportsOrganization: form.supportsOrganization,
          participatesMonday: form.participatesMonday,
          participatesTuesday: form.participatesTuesday,
          participatesWednesday: form.participatesWednesday,
          participatesThursday: form.participatesThursday,
          thursdayGroup: form.thursdayGroup,
          canApproveEvents: form.canApproveEvents,
          canEditCalendar: form.canEditCalendar,
          canViewReports: form.canViewReports,
          attendanceNotes: form.attendanceNotes,
        }),
      });
      if (result) setPayload(result);
      setForm(emptyForm);
      setMessage("Envolvido salvo na Base Única.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar envolvido.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePerson(person: Person) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest("/api/organizacao-em-harmonia/cliente/base-unica", {
        method: "POST",
        body: JSON.stringify({ action: "togglePerson", personId: person.id, active: person.active === false }),
      });
      if (result) setPayload(result);
      setMessage(person.active === false ? "Envolvido ativado." : "Envolvido inativado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar status.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePerson(person: Person) {
    if (!window.confirm(`Excluir definitivamente ${person.full_name}?`)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest("/api/organizacao-em-harmonia/cliente/base-unica", {
        method: "POST",
        body: JSON.stringify({ action: "deletePerson", personId: person.id }),
      });
      if (result) setPayload(result);
      setMessage("Envolvido excluído.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir envolvido.");
    } finally {
      setSaving(false);
    }
  }

  function editPerson(person: Person) {
    const membership = membershipFor(person.id, payload?.memberships ?? []);
    const profile = membership?.agenda_viva_profile ?? {};
    setForm({
      id: person.id,
      fullName: person.full_name,
      email: person.email ?? "",
      whatsapp: person.whatsapp ?? "",
      roleId: membership?.role_id ?? "",
      moduleSlugs: membership?.module_slugs?.length ? membership.module_slugs : ["agenda-viva"],
      active: person.active !== false,
      notes: person.notes ?? "",
      isCavalinho: Boolean(profile.isCavalinho),
      entityNames: listToText(profile.entityNames),
      spiritualLines: listToText(profile.spiritualLines),
      isCambono: Boolean(profile.isCambono),
      cambonoEntityNames: listToText(profile.cambonoEntityNames),
      isReserveCambono: Boolean(profile.isReserveCambono),
      supportsReception: Boolean(profile.supportsReception),
      supportsOrganization: Boolean(profile.supportsOrganization),
      participatesMonday: Boolean(profile.participatesMonday),
      participatesTuesday: Boolean(profile.participatesTuesday),
      participatesWednesday: Boolean(profile.participatesWednesday),
      participatesThursday: Boolean(profile.participatesThursday),
      thursdayGroup: profile.thursdayGroup ?? "",
      canApproveEvents: Boolean(profile.canApproveEvents),
      canEditCalendar: Boolean(profile.canEditCalendar),
      canViewReports: Boolean(profile.canViewReports),
      attendanceNotes: profile.attendanceNotes ?? "",
    });
    window.setTimeout(() => {
      envolvidosSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function onCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvText(await csvFromFile(file));
  }

  async function importCsv() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await authenticatedRequest("/api/organizacao-em-harmonia/cliente/base-unica/import", {
        method: "POST",
        body: JSON.stringify({ csv: csvText }),
      });
      setMessage(`${result?.imported ?? 0} envolvido(s) importado(s). Atualize a tela se a lista não recarregar automaticamente.`);
      const refreshed = await authenticatedRequest("/api/organizacao-em-harmonia/cliente/base-unica", { method: "GET", headers: {} });
      if (refreshed) setPayload(refreshed);
      setCsvText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar CSV.");
    } finally {
      setSaving(false);
    }
  }

  const availableModules = payload?.modules?.length
    ? payload.modules.map((module) => module.module_slug)
    : ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

  return (
    <OrganizacaoClientShell
      title="Base Única"
      description="Cadastre envolvidos, funções, permissões e módulos uma vez para usar em Agenda Viva, Atendimento em Harmonia e Corrente em Dia. Para o Tucxa, a Base Única também registra cavalinhos, cambonos, entidades, grupos e disponibilidade por dia."
    >
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando Base Única...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      {!loading && payload && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Ativos</p><p className="mt-2 text-3xl font-black text-[#00334E]">{stats.active}</p></div>
            <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Inativos</p><p className="mt-2 text-3xl font-black text-[#00334E]">{stats.inactive}</p></div>
            <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Funções</p><p className="mt-2 text-3xl font-black text-[#00334E]">{stats.roles}</p></div>
            <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Módulos</p><p className="mt-2 text-3xl font-black text-[#00334E]">{stats.modules}</p></div>
            <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Cavalinhos</p><p className="mt-2 text-3xl font-black text-[#00334E]">{stats.cavalinhos}</p></div>
            <div className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Cambonos</p><p className="mt-2 text-3xl font-black text-[#00334E]">{stats.cambonos}</p></div>
          </section>

          <section className="rounded-[2rem] bg-[#00334E] p-5 text-white shadow sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">Agenda Viva + Tucxa</p>
            <h2 className="mt-2 text-2xl font-black">Vínculos que alimentam o calendário</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {TUCXA_BASE_UNICA_PROFILE_FIELDS.map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 text-white/85">{item}</div>
              ))}
            </div>
          </section>

          <section id="envolvidos" ref={envolvidosSectionRef} className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2F6B43]">Envolvidos</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">{form.id ? "Editar envolvido" : "Incluir envolvido"}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Nome completo *</span><input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">WhatsApp</span><input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="(19) 99999-9999" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">E-mail</span><input value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label id="funcoes" className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Função</span><select value={form.roleId} onChange={(event) => update("roleId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Selecionar função</option>{payload.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Módulos liberados</span><select multiple value={form.moduleSlugs} onChange={(event) => update("moduleSlugs", Array.from(event.target.selectedOptions).map((option) => option.value))} className="min-h-28 rounded-2xl border border-slate-200 bg-white p-3">{availableModules.map((module) => <option key={module} value={module}>{moduleLabels[module] ?? module}</option>)}</select><span className="text-xs text-slate-500">Segure Ctrl para selecionar mais de um módulo no desktop.</span></label>
            </div>

            <div className="mt-6 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2F6B43]">Vínculos operacionais</p>
              <h3 className="mt-2 text-xl font-black text-[#00334E]">Agenda Viva, Atendimento e escala do Tucxa</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.isCavalinho} onChange={(event) => update("isCavalinho", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">É cavalinho</span></label>
                <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.isCambono} onChange={(event) => update("isCambono", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">É cambono</span></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Entidades que recebe</span><input value={form.entityNames} onChange={(event) => update("entityNames", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: Caboclo..., Preto Velho..." /></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Linhas de trabalho</span><input value={form.spiritualLines} onChange={(event) => update("spiritualLines", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Ex.: Oxóssi, Ogum, Xangô" /></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Entidades que costuma cambonar</span><input value={form.cambonoEntityNames} onChange={(event) => update("cambonoEntityNames", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Grupo de quinta-feira</span><select value={form.thursdayGroup} onChange={(event) => update("thursdayGroup", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Não definido</option><option value="grupo-1">Grupo 1</option><option value="grupo-2">Grupo 2</option><option value="ambos">Grupo 1 e Grupo 2</option></select></label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {weekdayLabels.map((item) => (
                  <label key={item.key} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={Boolean(form[item.key])} onChange={(event) => update(item.key, event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">{item.label}</span></label>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.isReserveCambono} onChange={(event) => update("isReserveCambono", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Cambono volante/reserva</span></label>
                <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.supportsReception} onChange={(event) => update("supportsReception", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Apoia recepção</span></label>
                <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.supportsOrganization} onChange={(event) => update("supportsOrganization", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Apoia organização</span></label>
                <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.canApproveEvents} onChange={(event) => update("canApproveEvents", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Pode aprovar eventos</span></label>
                <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.canEditCalendar} onChange={(event) => update("canEditCalendar", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Pode alterar calendário</span></label>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Envolvido ativo</span></label>
              <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"><input type="checkbox" checked={form.canViewReports} onChange={(event) => update("canViewReports", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Pode visualizar relatórios</span></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Observações internas</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Observações de disponibilidade/atendimento</span><textarea value={form.attendanceNotes} onChange={(event) => update("attendanceNotes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" placeholder="Ex.: só pode às segundas; cambono reserva; participa dos dois grupos mediante autorização." /></label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={savePerson} disabled={saving || !form.fullName.trim()} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{form.id ? "Salvar alterações" : "Salvar envolvido"}</button>{form.id && <button type="button" onClick={() => setForm(emptyForm)} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}</div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><h2 className="text-2xl font-black text-[#00334E]">Importar por CSV</h2><p className="mt-2 leading-7 text-slate-600">Use o modelo para preparar envolvidos, funções, módulos, grupos, entidades e disponibilidade antes de importar para a Base Única.</p></div>
              <a href="/api/organizacao-em-harmonia/cliente/base-unica/template" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-[#00334E] ring-1 ring-emerald-100">Baixar modelo CSV</a>
            </div>
            <input type="file" accept=".csv,text/csv" onChange={onCsvFile} className="mt-5 block w-full rounded-2xl border border-slate-200 p-3" />
            <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} className="mt-4 min-h-36 w-full rounded-2xl border border-slate-200 p-3" placeholder="Ou cole aqui o conteúdo CSV" />
            <button type="button" onClick={importCsv} disabled={saving || !csvText.trim()} className="mt-4 rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] disabled:opacity-60">Importar envolvidos</button>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <h2 className="text-2xl font-black text-[#00334E]">Envolvidos cadastrados</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-[0.18em] text-slate-400"><th className="py-3">Nome</th><th>Contato</th><th>Função</th><th>Vínculos Tucxa</th><th>Módulos</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {payload.people.map((person) => {
                    const membership = membershipFor(person.id, payload.memberships);
                    const role = membership?.role_id ? roleById.get(membership.role_id) : null;
                    return (
                      <tr key={person.id} className="border-b border-slate-50 align-top">
                        <td className="py-3"><p className="font-black text-[#00334E]">{person.full_name}</p><p className="text-xs text-slate-500">{person.notes || "Sem observações"}</p></td>
                        <td className="py-3"><p>{person.whatsapp || "Sem WhatsApp"}</p><p className="text-xs text-slate-500">{person.email || "Sem e-mail"}</p></td>
                        <td className="py-3">{role?.name ?? "Sem função"}</td>
                        <td className="py-3 max-w-xs text-xs leading-5 text-slate-600">{profileSummary(membership?.agenda_viva_profile)}</td>
                        <td className="py-3">{(membership?.module_slugs ?? []).map((module) => moduleLabels[module] ?? module).join(", ") || "Sem módulo"}</td>
                        <td className="py-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#00334E]">{person.active === false ? "Inativo" : "Ativo"}</span></td>
                        <td className="py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => editPerson(person)} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-[#00334E]">Editar</button><button type="button" onClick={() => togglePerson(person)} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-[#00334E]">{person.active === false ? "Ativar" : "Inativar"}</button><button type="button" onClick={() => deletePerson(person)} className="rounded-xl bg-red-50 px-3 py-2 font-black text-red-700">Excluir</button></div></td>
                      </tr>
                    );
                  })}
                  {payload.people.length === 0 && <tr><td colSpan={7} className="py-5 font-bold text-slate-500">Nenhum envolvido cadastrado ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}
