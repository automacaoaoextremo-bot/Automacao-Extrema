"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Role = { id: string; name: string; slug: string; description: string | null; active: boolean; is_system: boolean };
type Payload = { roles: Role[] };
type RoleForm = { id: string; name: string; slug: string; description: string; active: boolean };

const emptyRoleForm: RoleForm = { id: "", name: "", slug: "", description: "", active: true };

function slugFromName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function FuncoesPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyRoleForm);
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
      load().catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar funções.")).finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  function update<K extends keyof RoleForm>(key: K, value: RoleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveRole() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({
        method: "POST",
        body: JSON.stringify({
          action: "upsertRole",
          roleId: form.id || undefined,
          name: form.name,
          slug: form.slug || slugFromName(form.name),
          description: form.description,
          active: form.active,
        }),
      });
      if (result) setPayload(result);
      setForm(emptyRoleForm);
      setMessage("Função salva. Ela já fica disponível no cadastro de envolvidos, vínculos e permissões.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar função.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(role: Role) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "toggleRole", roleId: role.id, active: role.active === false }) });
      if (result) setPayload(result);
      setMessage(role.active === false ? "Função ativada." : "Função inativada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar função.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: Role) {
    if (!window.confirm(`Inativar a função ${role.name}?`)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "deleteRole", roleId: role.id }) });
      if (result) setPayload(result);
      setMessage("Função inativada para preservar histórico.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao inativar função.");
    } finally {
      setSaving(false);
    }
  }

  function editRole(role: Role) {
    setForm({ id: role.id, name: role.name, slug: role.slug, description: role.description ?? "", active: role.active !== false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <OrganizacaoClientShell title="Funções" description="Separe papéis e responsabilidades para que Agenda Viva, Atendimento em Harmonia e Corrente em Dia saibam quem pode ver, fazer e aprovar cada etapa.">
      <OrganizacaoBaseUnicaSubnav />
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando funções...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}
      {!loading && payload && (
        <>
          <section className="rounded-[2rem] bg-white p-5 shadow ring-1 ring-slate-100 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Função</p>
            <h2 className="mt-2 text-2xl font-black text-[#00334E]">{form.id ? "Editar função" : "Cadastrar nova função"}</h2>
            <p className="mt-2 leading-7 text-slate-600">Use essa área para ajustar Presidente, Diretoria, Coordenação, Cambono, Cavalinho, Recepção, Organização e funções personalizadas.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Nome da função *</span><input value={form.name} onChange={(event) => update("name", event.target.value)} className="rounded-2xl border border-slate-200 p-3" /></label>
              <label className="grid gap-1"><span className="text-sm font-black text-[#00334E]">Código interno</span><input value={form.slug} onChange={(event) => update("slug", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder={slugFromName(form.name) || "codigo-da-funcao"} /></label>
              <label className="grid gap-1 md:col-span-2"><span className="text-sm font-black text-[#00334E]">Descrição / responsabilidades</span><textarea value={form.description} onChange={(event) => update("description", event.target.value)} className="min-h-28 rounded-2xl border border-slate-200 p-3" /></label>
              <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100"><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} className="h-5 w-5" /><span className="text-sm font-black text-[#00334E]">Função ativa</span></label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={saveRole} disabled={saving || !form.name.trim()} className="rounded-2xl bg-[#00334E] px-5 py-3 font-black text-white disabled:opacity-60">{form.id ? "Salvar função" : "Cadastrar função"}</button>{form.id && <button type="button" onClick={() => setForm(emptyRoleForm)} className="rounded-2xl bg-slate-100 px-5 py-3 font-black text-[#00334E]">Cancelar edição</button>}</div>
          </section>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {payload.roles.map((role) => (
              <article key={role.id} className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-[#00334E]">{role.name}</h3><p className="text-xs font-bold text-slate-500">{role.slug}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#00334E]">{role.active === false ? "Inativa" : "Ativa"}</span></div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{role.description || "Sem descrição."}</p>
                <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => editRole(role)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-[#00334E]">Editar</button><button type="button" onClick={() => toggleRole(role)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-[#00334E]">{role.active === false ? "Ativar" : "Inativar"}</button>{!role.is_system && <button type="button" onClick={() => deleteRole(role)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-700">Inativar</button>}</div>
              </article>
            ))}
          </section>
        </>
      )}
    </OrganizacaoClientShell>
  );
}
