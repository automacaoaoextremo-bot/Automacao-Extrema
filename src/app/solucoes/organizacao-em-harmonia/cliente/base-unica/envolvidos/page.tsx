"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Role = { id: string; name: string; active: boolean };
type Person = { id: string; full_name: string; email: string | null; whatsapp: string | null; active: boolean; notes: string | null };
type Profile = {
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
type Membership = { id: string; person_id: string; role_id: string | null; module_slugs: string[] | null; active: boolean; agenda_viva_profile?: Profile | null };
type Payload = { people: Person[]; roles: Role[]; memberships: Membership[]; modules: Array<{ module_slug: string; enabled: boolean }> };

type Filters = {
  search: string;
  status: string;
  roleId: string;
  moduleSlug: string;
  thursdayGroup: string;
  day: string;
  bond: string;
  line: string;
};

const emptyFilters: Filters = {
  search: "",
  status: "ativos",
  roleId: "",
  moduleSlug: "",
  thursdayGroup: "",
  day: "",
  bond: "",
  line: "",
};
type Form = {
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

const emptyForm: Form = {
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

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function profileHasBond(profile: Profile | null | undefined, bond: string) {
  if (!bond) return true;
  if (bond === "cavalinho") return Boolean(profile?.isCavalinho);
  if (bond === "cambono") return Boolean(profile?.isCambono);
  if (bond === "cambono-reserva") return Boolean(profile?.isReserveCambono);
  if (bond === "recepcao") return Boolean(profile?.supportsReception);
  if (bond === "organizacao") return Boolean(profile?.supportsOrganization);
  if (bond === "aprova-eventos") return Boolean(profile?.canApproveEvents);
  if (bond === "altera-calendario") return Boolean(profile?.canEditCalendar);
  if (bond === "relatorios") return Boolean(profile?.canViewReports);
  return true;
}

function profileHasDay(profile: Profile | null | undefined, day: string) {
  if (!day) return true;
  if (day === "segunda") return Boolean(profile?.participatesMonday);
  if (day === "terca") return Boolean(profile?.participatesTuesday);
  if (day === "quarta") return Boolean(profile?.participatesWednesday);
  if (day === "quinta") return Boolean(profile?.participatesThursday);
  return true;
}
function membershipFor(personId: string, memberships: Membership[]) {
  return memberships.find((item) => item.person_id === personId) ?? null;
}
function listToText(value: string[] | undefined) {
  return Array.isArray(value) ? value.join(", ") : "";
}
function textToList(value: string) {
  return value.split(/[;,|]/).map((item) => item.trim()).filter(Boolean);
}
function profileSummary(profile: Profile | null | undefined) {
  const parts: string[] = [];
  if (profile?.isCavalinho) parts.push("Cavalinho");
  if (profile?.isCambono) parts.push(profile.isReserveCambono ? "Cambono reserva" : "Cambono");
  if (profile?.supportsReception) parts.push("Recepção");
  if (profile?.supportsOrganization) parts.push("Organização");
  if (profile?.thursdayGroup) parts.push(profile.thursdayGroup === "ambos" ? "Grupo 1 e 2" : profile.thursdayGroup.replace("grupo-", "Grupo "));
  if (profile?.entityNames?.length) parts.push(`Entidades: ${profile.entityNames.join(", ")}`);
  return parts.join(" • ") || "Sem vínculos operacionais";
}
async function csvFromFile(file: File) {
  return await file.text();
}

export default function EnvolvidosPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [csvText, setCsvText] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
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

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const token = await authToken();
    if (!token) return null;
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result as Payload & { imported?: number };
  }, [authToken]);

  const load = useCallback(async () => {
    const result = await request("/api/organizacao-em-harmonia/cliente/base-unica");
    if (result) setPayload(result);
  }, [request]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Erro ao carregar envolvidos.");
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

  const roleById = useMemo(() => new Map((payload?.roles ?? []).map((role) => [role.id, role])), [payload?.roles]);
  const availableModules = payload?.modules?.length ? payload.modules.map((module) => module.module_slug) : ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];
  const filteredPeople = useMemo(() => {
    const search = normalizeSearch(filters.search);
    const line = normalizeSearch(filters.line);

    return (payload?.people ?? []).filter((person) => {
      const membership = membershipFor(person.id, payload?.memberships ?? []);
      const profile = membership?.agenda_viva_profile;
      const searchable = normalizeSearch([person.full_name, person.email, person.whatsapp, person.notes].filter(Boolean).join(" "));
      const profileText = normalizeSearch([
        profileSummary(profile),
        profile?.entityNames?.join(" "),
        profile?.cambonoEntityNames?.join(" "),
        profile?.spiritualLines?.join(" "),
        profile?.attendanceNotes,
      ].filter(Boolean).join(" "));

      if (search && !searchable.includes(search) && !profileText.includes(search)) return false;
      if (filters.status === "ativos" && person.active === false) return false;
      if (filters.status === "inativos" && person.active !== false) return false;
      if (filters.roleId && membership?.role_id !== filters.roleId) return false;
      if (filters.moduleSlug && !(membership?.module_slugs ?? []).includes(filters.moduleSlug)) return false;
      if (filters.thursdayGroup && profile?.thursdayGroup !== filters.thursdayGroup) return false;
      if (!profileHasDay(profile, filters.day)) return false;
      if (!profileHasBond(profile, filters.bond)) return false;
      if (line && !normalizeSearch([profile?.spiritualLines?.join(" "), profile?.entityNames?.join(" "), profile?.cambonoEntityNames?.join(" ")].filter(Boolean).join(" ")).includes(line)) return false;

      return true;
    });
  }, [filters, payload?.memberships, payload?.people]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }


  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function toggleModule(moduleSlug: string) {
    setForm((current) => ({
      ...current,
      moduleSlugs: current.moduleSlugs.includes(moduleSlug) ? current.moduleSlugs.filter((item) => item !== moduleSlug) : [...current.moduleSlugs, moduleSlug],
    }));
  }

  async function savePerson() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request("/api/organizacao-em-harmonia/cliente/base-unica", {
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
      const result = await request("/api/organizacao-em-harmonia/cliente/base-unica", {
        method: "POST",
        body: JSON.stringify({ action: "togglePerson", personId: person.id, active: person.active === false }),
      });
      if (result) setPayload(result);
      setMessage(person.active === false ? "Envolvido ativado." : "Envolvido inativado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar envolvido.");
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
      const result = await request("/api/organizacao-em-harmonia/cliente/base-unica", { method: "POST", body: JSON.stringify({ action: "deletePerson", personId: person.id }) });
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      const result = await request("/api/organizacao-em-harmonia/cliente/base-unica/import", { method: "POST", body: JSON.stringify({ csv: csvText }) });
      setMessage(`${result?.imported ?? 0} envolvido(s) importado(s).`);
      await load();
      setCsvText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar CSV.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell title="Envolvidos" description="Cadastre pessoas, contatos, função, módulos liberados e vínculos operacionais sem misturar com funções, entidades e localidades.">
      <OrganizacaoBaseUnicaSubnav />
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando envolvidos...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
      {!loading && payload && (
        <>
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Envolvidos</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">{form.id ? "Editar envolvido" : "Incluir envolvido"}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Nome completo *</span><input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">WhatsApp</span><input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="(19) 99999-9999" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">E-mail</span><input value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Função</span><select value={form.roleId} onChange={(event) => update("roleId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Selecionar função</option>{payload.roles.filter((role) => role.active !== false).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            </div>
            <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-sm font-black text-[#00334E]">Módulos liberados</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {availableModules.map((module) => <label key={module} className="flex items-center gap-2 rounded-2xl bg-white p-3 text-sm font-bold text-[#00334E] ring-1 ring-slate-100"><input type="checkbox" checked={form.moduleSlugs.includes(module)} onChange={() => toggleModule(module)} />{moduleLabels[module] ?? module}</label>)}
              </div>
            </div>
            <div className="mt-4 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Vínculos operacionais</p>
              <h3 className="mt-1 text-xl font-black text-[#00334E]">Agenda Viva, Atendimento e escala do Tucxa</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Check label="É cavalinho" checked={form.isCavalinho} onChange={(checked) => update("isCavalinho", checked)} />
                <Check label="É cambono" checked={form.isCambono} onChange={(checked) => update("isCambono", checked)} />
                <Check label="Cambono volante/reserva" checked={form.isReserveCambono} onChange={(checked) => update("isReserveCambono", checked)} />
                <Check label="Apoia recepção" checked={form.supportsReception} onChange={(checked) => update("supportsReception", checked)} />
                <Check label="Apoia organização" checked={form.supportsOrganization} onChange={(checked) => update("supportsOrganization", checked)} />
                <Check label="Pode aprovar eventos" checked={form.canApproveEvents} onChange={(checked) => update("canApproveEvents", checked)} />
                <Check label="Pode alterar calendário" checked={form.canEditCalendar} onChange={(checked) => update("canEditCalendar", checked)} />
                <Check label="Pode ver relatórios" checked={form.canViewReports} onChange={(checked) => update("canViewReports", checked)} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Input label="Entidades que recebe" value={form.entityNames} onChange={(value) => update("entityNames", value)} placeholder="Ex.: Caboclo..., Preto Velho..." />
                <Input label="Linhas de trabalho" value={form.spiritualLines} onChange={(value) => update("spiritualLines", value)} placeholder="Ex.: Oxóssi, Ogum, Xangô" />
                <Input label="Entidades que costuma cambonar" value={form.cambonoEntityNames} onChange={(value) => update("cambonoEntityNames", value)} />
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Grupo de quinta-feira</span><select value={form.thursdayGroup} onChange={(event) => update("thursdayGroup", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Não definido</option><option value="grupo-1">Grupo 1</option><option value="grupo-2">Grupo 2</option><option value="ambos">Grupo 1 e Grupo 2</option></select></label>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{weekdayLabels.map((item) => <Check key={item.key} label={item.label} checked={Boolean(form[item.key])} onChange={(checked) => update(item.key, checked)} />)}</div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Check label="Envolvido ativo" checked={form.active} onChange={(checked) => update("active", checked)} />
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Observações internas</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Observações de disponibilidade/atendimento</span><textarea value={form.attendanceNotes} onChange={(event) => update("attendanceNotes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" placeholder="Ex.: só pode às segundas; cambono reserva; participa dos dois grupos mediante autorização." /></label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={savePerson} disabled={saving || !form.fullName.trim()} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{form.id ? "Salvar alterações" : "Salvar envolvido"}</button>{form.id && <button type="button" onClick={() => setForm(emptyForm)} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}</div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-2xl font-black text-[#00334E]">Importar por CSV</h2><p className="mt-2 leading-7 text-slate-600">Use o modelo para preparar a corrente inteira antes de importar.</p></div><a href="/api/organizacao-em-harmonia/cliente/base-unica/template" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-[#00334E] ring-1 ring-emerald-100">Baixar modelo CSV</a></div>
            <input type="file" accept=".csv,text/csv" onChange={onCsvFile} className="mt-5 block w-full rounded-2xl border border-slate-200 p-3" />
            <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} className="mt-4 min-h-36 w-full rounded-2xl border border-slate-200 p-3" placeholder="Ou cole aqui o conteúdo CSV" />
            <button type="button" onClick={importCsv} disabled={saving || !csvText.trim()} className="mt-4 rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] disabled:opacity-60">Importar envolvidos</button>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#00334E]">Envolvidos cadastrados</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">{filteredPeople.length} de {payload.people.length} envolvido(s) visível(is) conforme os filtros.</p>
              </div>
              <button type="button" onClick={() => setFilters(emptyFilters)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-[#00334E]">Limpar filtros</button>
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2F6B43]">Filtros rápidos</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-1 xl:col-span-2"><span className="text-sm font-black text-[#00334E]">Buscar por nome, e-mail, WhatsApp ou vínculo</span><input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3" placeholder="Ex.: Márcio, 1999, cambono, Caboclo..." /></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Status</span><select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="ativos">Ativos</option><option value="inativos">Inativos</option><option value="todos">Todos</option></select></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Função</span><select value={filters.roleId} onChange={(event) => updateFilter("roleId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Todas</option>{payload.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Módulo</span><select value={filters.moduleSlug} onChange={(event) => updateFilter("moduleSlug", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Todos</option>{availableModules.map((module) => <option key={module} value={module}>{moduleLabels[module] ?? module}</option>)}</select></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Vínculo</span><select value={filters.bond} onChange={(event) => updateFilter("bond", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Todos</option><option value="cavalinho">Cavalinho</option><option value="cambono">Cambono</option><option value="cambono-reserva">Cambono reserva</option><option value="recepcao">Apoia recepção</option><option value="organizacao">Apoia organização</option><option value="aprova-eventos">Pode aprovar eventos</option><option value="altera-calendario">Pode alterar calendário</option><option value="relatorios">Pode ver relatórios</option></select></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Grupo quinta</span><select value={filters.thursdayGroup} onChange={(event) => updateFilter("thursdayGroup", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Todos</option><option value="grupo-1">Grupo 1</option><option value="grupo-2">Grupo 2</option><option value="ambos">Grupo 1 e 2</option></select></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Dia de atuação</span><select value={filters.day} onChange={(event) => updateFilter("day", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Todos</option><option value="segunda">Segunda</option><option value="terca">Terça</option><option value="quarta">Quarta</option><option value="quinta">Quinta</option></select></label>
                <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Entidade ou linha</span><input value={filters.line} onChange={(event) => updateFilter("line", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3" placeholder="Ex.: Oxóssi, Preto Velho..." /></label>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-[0.18em] text-slate-400"><th className="py-3">Nome</th><th>Contato</th><th>Função</th><th>Vínculos Tucxa</th><th>Módulos</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filteredPeople.map((person) => { const membership = membershipFor(person.id, payload.memberships); const role = membership?.role_id ? roleById.get(membership.role_id) : null; return (<tr key={person.id} className="border-b border-slate-50 align-top"><td className="py-3"><p className="font-black text-[#00334E]">{person.full_name}</p><p className="text-xs text-slate-500">{person.notes || "Sem observações"}</p></td><td className="py-3"><p>{person.whatsapp || "Sem WhatsApp"}</p><p className="text-xs text-slate-500">{person.email || "Sem e-mail"}</p></td><td className="py-3">{role?.name ?? "Sem função"}</td><td className="py-3 max-w-xs text-xs leading-5 text-slate-600">{profileSummary(membership?.agenda_viva_profile)}</td><td className="py-3">{(membership?.module_slugs ?? []).map((module) => moduleLabels[module] ?? module).join(", ") || "Sem módulo"}</td><td className="py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${person.active === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-[#00334E]"}`}>{person.active === false ? "Inativo" : "Ativo"}</span></td><td className="py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => editPerson(person)} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-[#00334E]">Editar</button><button type="button" onClick={() => togglePerson(person)} className="rounded-xl bg-slate-100 px-3 py-2 font-black text-[#00334E]">{person.active === false ? "Ativar" : "Inativar"}</button><button type="button" onClick={() => deletePerson(person)} className="rounded-xl bg-red-50 px-3 py-2 font-black text-red-700">Excluir</button></div></td></tr>); })}{filteredPeople.length === 0 && <tr><td colSpan={7} className="py-5 font-bold text-slate-500">Nenhum envolvido encontrado com os filtros atuais.</td></tr>}</tbody></table></div>
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}

function Input({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder={placeholder} /></label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">{label}</span></label>;
}
