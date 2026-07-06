"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Person = { id: string; full_name: string; active: boolean; email: string | null; whatsapp: string | null };
type Role = { id: string; name: string; active: boolean };
type Membership = { person_id: string; role_id: string | null; module_slugs: string[] | null; agenda_viva_profile?: Record<string, unknown> | null };
type Payload = { people: Person[]; roles: Role[]; memberships: Membership[]; modules: Array<{ module_slug: string; enabled: boolean }> };

type BulkForm = {
  roleId: string;
  moduleSlugs: string[];
  isCavalinho: boolean;
  isCambono: boolean;
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
  entityNames: string;
  cambonoEntityNames: string;
  spiritualLines: string;
  attendanceNotes: string;
};

const emptyBulkForm: BulkForm = {
  roleId: "",
  moduleSlugs: [],
  isCavalinho: false,
  isCambono: false,
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
  entityNames: "",
  cambonoEntityNames: "",
  spiritualLines: "",
  attendanceNotes: "",
};

const moduleLabels: Record<string, string> = { "agenda-viva": "Agenda Viva", "atendimento-em-harmonia": "Atendimento em Harmonia", "corrente-em-dia": "Corrente em Dia" };

export default function VinculosPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState<BulkForm>(emptyBulkForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = useCallback(async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) router.replace("/solucoes/organizacao-em-harmonia/login");
    return accessToken;
  }, [router]);

  const request = useCallback(async (init?: RequestInit) => {
    const accessToken = await token();
    if (!accessToken) return null;
    const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result as Payload;
  }, [token]);

  const load = useCallback(async () => {
    const result = await request();
    if (result) setPayload(result);
  }, [request]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load().catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar vínculos.")).finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const filteredPeople = useMemo(() => {
    const text = filter.toLowerCase();
    return (payload?.people ?? []).filter((person) => person.active !== false && (!text || person.full_name.toLowerCase().includes(text) || person.email?.toLowerCase().includes(text)));
  }, [filter, payload?.people]);

  const availableModules = payload?.modules?.length ? payload.modules.map((module) => module.module_slug) : ["agenda-viva", "atendimento-em-harmonia", "corrente-em-dia"];

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }
  function toggleAll() {
    const ids = filteredPeople.map((person) => person.id);
    setSelectedIds((current) => (ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]))));
  }
  function update<K extends keyof BulkForm>(key: K, value: BulkForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function toggleModule(module: string) {
    setForm((current) => ({ ...current, moduleSlugs: current.moduleSlugs.includes(module) ? current.moduleSlugs.filter((item) => item !== module) : [...current.moduleSlugs, module] }));
  }

  async function applyBulk() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "bulkUpdateProfiles", personIds: selectedIds, ...form }) });
      if (result) setPayload(result);
      setMessage(`${selectedIds.length} envolvido(s) atualizados em lote.`);
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aplicar vínculos em lote.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OrganizacaoClientShell title="Vínculos em lote" description="Aplique dias de atuação, grupo, módulos, função e permissões para várias pessoas ao mesmo tempo.">
      <OrganizacaoBaseUnicaSubnav />
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando vínculos...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
      {!loading && payload && (
        <div className="grid gap-5 xl:grid-cols-[1fr_430px]">
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black text-[#00334E]">Selecionar envolvidos</h2><p className="mt-2 text-sm leading-6 text-slate-600">Filtre, selecione várias pessoas e aplique vínculos operacionais de uma só vez.</p></div><button type="button" onClick={toggleAll} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-[#00334E] ring-1 ring-emerald-100">Selecionar/limpar todos</button></div>
            <input value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-5 w-full rounded-2xl border border-slate-200 p-3" placeholder="Filtrar por nome ou e-mail" />
            <div className="mt-4 grid gap-2">
              {filteredPeople.map((person) => <label key={person.id} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"><input type="checkbox" checked={selectedIds.includes(person.id)} onChange={() => toggleSelected(person.id)} className="mt-1 h-5 w-5" /><span><span className="block font-black text-[#00334E]">{person.full_name}</span><span className="text-xs text-slate-500">{person.email || "sem e-mail"} · {person.whatsapp || "sem WhatsApp"}</span></span></label>)}
              {filteredPeople.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-500">Nenhum envolvido encontrado.</p>}
            </div>
          </section>
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Aplicar em lote</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">{selectedIds.length} selecionado(s)</h2>
            <label className="mt-5 grid gap-1"><span className="text-sm font-black text-[#00334E]">Função</span><select value={form.roleId} onChange={(event) => update("roleId", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Não alterar</option>{payload.roles.filter((role) => role.active !== false).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100"><p className="text-sm font-black text-[#00334E]">Módulos</p><div className="mt-3 grid gap-2">{availableModules.map((module) => <label key={module} className="flex items-center gap-2 rounded-2xl bg-white p-3 text-sm font-bold text-[#00334E] ring-1 ring-slate-100"><input type="checkbox" checked={form.moduleSlugs.includes(module)} onChange={() => toggleModule(module)} />{moduleLabels[module] ?? module}</label>)}</div></div>
            <div className="mt-4 grid gap-2">{[
              ["isCavalinho", "É cavalinho"], ["isCambono", "É cambono"], ["isReserveCambono", "Cambono volante/reserva"], ["supportsReception", "Apoia recepção"], ["supportsOrganization", "Apoia organização"], ["participatesMonday", "Segunda"], ["participatesTuesday", "Terça"], ["participatesWednesday", "Quarta"], ["participatesThursday", "Quinta"], ["canApproveEvents", "Pode aprovar eventos"], ["canEditCalendar", "Pode alterar calendário"], ["canViewReports", "Pode ver relatórios"],
            ].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-[#00334E] ring-1 ring-emerald-100"><input type="checkbox" checked={Boolean(form[key as keyof BulkForm])} onChange={(event) => update(key as keyof BulkForm, event.target.checked as never)} />{label}</label>)}</div>
            <label className="mt-4 grid gap-1"><span className="text-sm font-black text-[#00334E]">Grupo de quinta-feira</span><select value={form.thursdayGroup} onChange={(event) => update("thursdayGroup", event.target.value)} className="rounded-2xl border border-slate-200 bg-white p-3"><option value="">Não alterar</option><option value="grupo-1">Grupo 1</option><option value="grupo-2">Grupo 2</option><option value="ambos">Grupo 1 e Grupo 2</option></select></label>
            <TextInput label="Entidades que recebe" value={form.entityNames} onChange={(value) => update("entityNames", value)} />
            <TextInput label="Entidades que costuma cambonar" value={form.cambonoEntityNames} onChange={(value) => update("cambonoEntityNames", value)} />
            <TextInput label="Linhas de trabalho" value={form.spiritualLines} onChange={(value) => update("spiritualLines", value)} />
            <label className="mt-4 grid gap-1"><span className="text-sm font-black text-[#00334E]">Observações de atendimento</span><textarea value={form.attendanceNotes} onChange={(event) => update("attendanceNotes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
            <button type="button" onClick={applyBulk} disabled={saving || selectedIds.length === 0} className="mt-5 w-full rounded-2xl bg-[#31C16B] px-5 py-3 font-black text-[#00334E] disabled:opacity-60">Aplicar vínculos</button>
          </section>
        </div>
      )}
    </OrganizacaoClientShell>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="mt-4 grid gap-1"><span className="text-sm font-black text-[#00334E]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>;
}
