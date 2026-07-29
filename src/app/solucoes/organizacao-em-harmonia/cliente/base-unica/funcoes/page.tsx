"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizacaoBaseUnicaSubnav } from "@/components/organizacao-base-unica-subnav";
import { OrganizacaoClientShell } from "@/components/organizacao-client-shell";
import {
  AdminActionButton,
  AdminDetailGrid,
  AdminDetailItem,
  AdminModal,
  AdminStatusBadge,
  CompactAdminRow,
  ConfirmDialog,
} from "@/components/organizacao-em-harmonia/admin-list-ui";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Role = { id: string; name: string; slug: string; description: string | null; active: boolean; is_system: boolean };
type Payload = { roles: Role[] };
type RoleForm = { id: string; name: string; slug: string; description: string; active: boolean };
type Confirmation = { title: string; message: string; confirmLabel: string; tone: "primary" | "danger" | "warning"; run: () => Promise<void> };

const emptyRoleForm: RoleForm = { id: "", name: "", slug: "", description: "", active: true };

function slugFromName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function roleToForm(role: Role): RoleForm {
  return { id: role.id, name: role.name, slug: role.slug, description: role.description ?? "", active: role.active !== false };
}

export default function FuncoesPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyRoleForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"alphabetical" | "status">("alphabetical");
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewRole, setViewRole] = useState<Role | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

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

  const visibleRoles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = (payload?.roles ?? []).filter((role) => {
      if (!normalizedQuery) return true;
      return [role.name, role.slug, role.description].filter(Boolean).some((value) => String(value).toLocaleLowerCase("pt-BR").includes(normalizedQuery));
    });
    return [...filtered].sort((left, right) => {
      if (sortOrder === "status") {
        const statusDifference = Number(right.active !== false) - Number(left.active !== false);
        if (statusDifference !== 0) return statusDifference;
      }
      return left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" });
    });
  }, [payload?.roles, query, sortOrder]);

  function update<K extends keyof RoleForm>(key: K, value: RoleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNewRole() {
    setForm(emptyRoleForm);
    setEditorOpen(true);
  }

  function editRole(role: Role) {
    setForm(roleToForm(role));
    setEditorOpen(true);
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
      setEditorOpen(false);
      setMessage("Função salva. Ela já fica disponível no cadastro de envolvidos, vínculos e permissões.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar função.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRoleActive(role: Role, active: boolean) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "toggleRole", roleId: role.id, active }) });
      if (result) setPayload(result);
      setMessage(active ? "Função ativada." : "Função inativada. Os vínculos existentes foram preservados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar função.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: Role) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "deleteRole", roleId: role.id }) });
      if (result) setPayload(result);
      setMessage("Função retirada de uso e inativada para preservar pessoas, permissões e histórico.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao retirar função de uso.");
    } finally {
      setSaving(false);
    }
  }

  function askToggle(role: Role) {
    const nextActive = role.active === false;
    setConfirmation({
      title: nextActive ? "Ativar função?" : "Inativar função?",
      message: nextActive
        ? `Deseja tornar a função ${role.name} disponível novamente?`
        : `Deseja inativar a função ${role.name}? Pessoas e registros já vinculados serão preservados.`,
      confirmLabel: nextActive ? "Ativar" : "Inativar",
      tone: nextActive ? "primary" : "warning",
      run: () => changeRoleActive(role, nextActive),
    });
  }

  function askDelete(role: Role) {
    setConfirmation({
      title: "Excluir função da lista ativa?",
      message: `Tem certeza que deseja retirar a função ${role.name} de uso? Para preservar pessoas, documentos, escalas, permissões e histórico, o registro será inativado em vez de apagado definitivamente.`,
      confirmLabel: "Excluir da lista ativa",
      tone: "danger",
      run: () => deleteRole(role),
    });
  }

  async function runConfirmation() {
    const action = confirmation?.run;
    setConfirmation(null);
    if (action) await action();
  }

  return (
    <OrganizacaoClientShell title="Funções" description="Separe papéis e responsabilidades para que Agenda Viva, Atendimento em Harmonia e Corrente em Dia saibam quem pode ver, fazer e aprovar cada etapa.">
      <OrganizacaoBaseUnicaSubnav />
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando funções...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      {!loading && payload && (
        <div className="grid gap-4">
          <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Base Única</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Lista de funções</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">As responsabilidades completas aparecem em Visualizar ou Editar.</p>
              </div>
              <AdminActionButton onClick={openNewRole} tone="primary" className="w-full sm:w-auto">Nova função</AdminActionButton>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_16rem]">
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Buscar por nome, descrição ou código" />
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Ordenar por</span>
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "alphabetical" | "status")} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <option value="alphabetical">Ordem alfabética</option>
                  <option value="status">Ativas primeiro</option>
                </select>
              </label>
            </div>
          </section>

          <section className="grid gap-3">
            {visibleRoles.map((role) => (
              <CompactAdminRow
                key={role.id}
                icon="🧩"
                title={role.name}
                subtitle={role.is_system ? `${role.slug} · função do sistema` : role.slug}
                status={<AdminStatusBadge active={role.active !== false}>{role.active === false ? "Inativa" : "Ativa"}</AdminStatusBadge>}
                actions={
                  <>
                    <AdminActionButton onClick={() => setViewRole(role)}>Visualizar</AdminActionButton>
                    <AdminActionButton onClick={() => editRole(role)} tone="primary">Editar</AdminActionButton>
                    <AdminActionButton onClick={() => askToggle(role)} tone={role.active === false ? "success" : "warning"}>{role.active === false ? "Ativar" : "Inativar"}</AdminActionButton>
                    {!role.is_system && <AdminActionButton onClick={() => askDelete(role)} tone="danger">Excluir</AdminActionButton>}
                  </>
                }
              />
            ))}
            {visibleRoles.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhuma função encontrada.</p>}
          </section>
        </div>
      )}

      <AdminModal open={editorOpen} title={form.id ? "Editar função" : "Nova função"} eyebrow="Base Única" onClose={() => !saving && setEditorOpen(false)}>
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Nome da função *</span>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} className="rounded-2xl border border-slate-200 p-3" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-black text-[#00334E]">Código interno</span>
              <input value={form.slug} onChange={(event) => update("slug", event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder={slugFromName(form.name) || "codigo-da-funcao"} />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-black text-[#00334E]">Descrição / responsabilidades</span>
              <textarea value={form.description} onChange={(event) => update("description", event.target.value)} className="min-h-32 rounded-2xl border border-slate-200 p-3" />
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} className="h-5 w-5" />
              <span className="text-sm font-black text-[#00334E]">Função ativa</span>
            </label>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AdminActionButton onClick={() => setEditorOpen(false)} disabled={saving}>Cancelar</AdminActionButton>
            <AdminActionButton onClick={saveRole} disabled={saving || !form.name.trim()} tone="primary">{saving ? "Salvando..." : form.id ? "Salvar função" : "Cadastrar função"}</AdminActionButton>
          </div>
        </div>
      </AdminModal>

      <AdminModal open={Boolean(viewRole)} title={viewRole?.name ?? "Visualizar função"} eyebrow="Função" onClose={() => setViewRole(null)}>
        {viewRole && (
          <AdminDetailGrid>
            <AdminDetailItem label="Código interno">{viewRole.slug}</AdminDetailItem>
            <AdminDetailItem label="Situação">{viewRole.active === false ? "Inativa" : "Ativa"}</AdminDetailItem>
            <AdminDetailItem label="Origem">{viewRole.is_system ? "Função do sistema" : "Função personalizada"}</AdminDetailItem>
            <AdminDetailItem label="Uso">Disponível para envolvidos, vínculos e permissões</AdminDetailItem>
            <AdminDetailItem label="Descrição / responsabilidades" full>{viewRole.description || "Nenhuma descrição cadastrada"}</AdminDetailItem>
          </AdminDetailGrid>
        )}
      </AdminModal>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title ?? "Confirmar ação"}
        message={confirmation?.message ?? ""}
        confirmLabel={confirmation?.confirmLabel}
        tone={confirmation?.tone}
        busy={saving}
        onCancel={() => setConfirmation(null)}
        onConfirm={runConfirmation}
      />
    </OrganizacaoClientShell>
  );
}
