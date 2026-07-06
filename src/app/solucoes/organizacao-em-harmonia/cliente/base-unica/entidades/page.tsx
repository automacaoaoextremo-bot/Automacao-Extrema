"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Entity = { id: string; name: string; slug: string; line: string | null; entity_type: string | null; usual_materials: string | null; usual_days: string[] | null; notes: string | null; active: boolean };
type Payload = { entities: Entity[] };
type EntityForm = { id: string; name: string; slug: string; line: string; entityType: string; usualMaterials: string; usualDays: string[]; notes: string; active: boolean };

const emptyForm: EntityForm = { id: "", name: "", slug: "", line: "", entityType: "", usualMaterials: "", usualDays: [], notes: "", active: true };
const dayOptions = [
  { slug: "segunda", label: "Segunda" },
  { slug: "terca", label: "Terça" },
  { slug: "quarta", label: "Quarta" },
  { slug: "quinta-grupo-1", label: "Quinta Grupo 1" },
  { slug: "quinta-grupo-2", label: "Quinta Grupo 2" },
  { slug: "eventual", label: "Eventual" },
];

function slugFromName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function EntidadesPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<EntityForm>(emptyForm);
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
    const response = await fetch("/api/organizacao-em-harmonia/cliente/base-unica", {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a ação.");
    return result as Payload;
  }, [authToken]);

  const load = useCallback(async () => {
    const result = await request();
    if (result) setPayload(result);
  }, [request]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load().catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar entidades.")).finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  function update<K extends keyof EntityForm>(key: K, value: EntityForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function toggleDay(slug: string) {
    setForm((current) => ({ ...current, usualDays: current.usualDays.includes(slug) ? current.usualDays.filter((item) => item !== slug) : [...current.usualDays, slug] }));
  }

  async function saveEntity() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({
        method: "POST",
        body: JSON.stringify({
          action: "upsertEntity",
          entityId: form.id || undefined,
          name: form.name,
          slug: form.slug || slugFromName(form.name),
          line: form.line,
          entityType: form.entityType,
          usualMaterials: form.usualMaterials,
          usualDays: form.usualDays,
          notes: form.notes,
          active: form.active,
        }),
      });
      if (result) setPayload(result);
      setForm(emptyForm);
      setMessage("Entidade salva. Ela pode ser usada nos vínculos de cavalinhos e cambonos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar entidade.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEntity(entity: Entity) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "toggleEntity", entityId: entity.id, active: entity.active === false }) });
      if (result) setPayload(result);
      setMessage(entity.active === false ? "Entidade ativada." : "Entidade inativada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar entidade.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntity(entity: Entity) {
    if (!window.confirm(`Inativar ${entity.name}?`)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "deleteEntity", entityId: entity.id }) });
      if (result) setPayload(result);
      setMessage("Entidade inativada para preservar histórico.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao inativar entidade.");
    } finally {
      setSaving(false);
    }
  }

  function editEntity(entity: Entity) {
    setForm({
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      line: entity.line ?? "",
      entityType: entity.entity_type ?? "",
      usualMaterials: entity.usual_materials ?? "",
      usualDays: entity.usual_days ?? [],
      notes: entity.notes ?? "",
      active: entity.active !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <OrganizacaoClientShell title="Entidades" description="Cadastre entidades, linhas de trabalho, materiais usuais e dias de atuação para apoiar Agenda Viva e Atendimento em Harmonia.">
      <OrganizacaoBaseUnicaSubnav />
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando entidades...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
      {!loading && payload && (
        <>
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Entidade</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">{form.id ? "Editar entidade" : "Cadastrar entidade"}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input label="Nome da entidade *" value={form.name} onChange={(value) => update("name", value)} />
              <Input label="Código interno" value={form.slug} onChange={(value) => update("slug", value)} placeholder={slugFromName(form.name) || "codigo-da-entidade"} />
              <Input label="Linha de trabalho" value={form.line} onChange={(value) => update("line", value)} placeholder="Ex.: Oxóssi, Ogum, Xangô, Preto Velho" />
              <Input label="Tipo" value={form.entityType} onChange={(value) => update("entityType", value)} placeholder="Ex.: Caboclo, Preto Velho, Criança" />
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Materiais/apetrechos habituais</span><textarea value={form.usualMaterials} onChange={(event) => update("usualMaterials", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" placeholder="Ex.: velas, pembas, ervas, flores, pedras." /></label>
            </div>
            <div className="mt-4 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-sm font-black text-[#00334E]">Dias em que costuma atender</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">{dayOptions.map((item) => <label key={item.slug} className="flex items-center gap-2 rounded-2xl bg-white p-3 text-sm font-bold text-[#00334E] ring-1 ring-emerald-100"><input type="checkbox" checked={form.usualDays.includes(item.slug)} onChange={() => toggleDay(item.slug)} />{item.label}</label>)}</div>
            </div>
            <label className="mt-4 grid gap-1"><span className="text-sm font-black text-[#00334E]">Observações</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" /></label>
            <label className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Entidade ativa</span></label>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={saveEntity} disabled={saving || !form.name.trim()} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{form.id ? "Salvar entidade" : "Cadastrar entidade"}</button>{form.id && <button type="button" onClick={() => setForm(emptyForm)} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}</div>
          </section>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {payload.entities.map((entity) => <article key={entity.id} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-[#00334E]">{entity.name}</h3><p className="text-xs font-bold text-slate-500">{[entity.line, entity.entity_type].filter(Boolean).join(" · ") || entity.slug}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#00334E]">{entity.active === false ? "Inativa" : "Ativa"}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{entity.notes || entity.usual_materials || "Sem observações."}</p><p className="mt-2 text-xs font-bold text-slate-500">Dias: {(entity.usual_days ?? []).join(", ") || "não definido"}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => editEntity(entity)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-[#00334E]">Editar</button><button type="button" onClick={() => toggleEntity(entity)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-[#00334E]">{entity.active === false ? "Ativar" : "Inativar"}</button><button type="button" onClick={() => deleteEntity(entity)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">Inativar</button></div></article>)}
            {payload.entities.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhuma entidade cadastrada ainda.</p>}
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}

function Input({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder={placeholder} /></label>;
}
