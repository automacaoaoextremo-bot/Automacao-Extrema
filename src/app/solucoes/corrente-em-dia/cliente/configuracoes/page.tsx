"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CorrenteClientHeader } from "@/components/corrente-client-header";
import { CorrenteContextualHelp } from "@/components/corrente-contextual-help";
import {
  CORRENTE_PERMISSION_LABELS,
  type CorrentePermissionKey,
  type CorrenteRole,
  type CorrenteRolePermission,
} from "@/lib/corrente-em-dia";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ConfigPayload = {
  roles: CorrenteRole[];
  permissions: CorrenteRolePermission[];
  permissionKeys: CorrentePermissionKey[];
};

const defaultNewRole = {
  name: "",
  description: "",
  is_manager: false,
  is_financial_role: false,
  permissions: ["contribuir.view", "contribuir.upload_receipt"] as CorrentePermissionKey[],
};

export default function CorrenteConfiguracoesPage() {
  const [payload, setPayload] = useState<ConfigPayload | null>(null);
  const [newRole, setNewRole] = useState(defaultNewRole);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function token() {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? "";
  }

  async function load() {
    const authToken = await token();
    if (!authToken) {
      window.location.href = "/solucoes/corrente-em-dia/login";
      return;
    }
    const response = await fetch("/api/corrente-em-dia/cliente/configuracoes", { headers: { Authorization: `Bearer ${authToken}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar configurações.");
    setPayload(result);
  }

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load()
        .catch((err) => {
          if (active) setMessage(err instanceof Error ? err.message : "Erro ao carregar configurações.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // A carga inicial precisa rodar apenas uma vez; recarregamentos após ações usam load() diretamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissionsByRole = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of payload?.permissions ?? []) {
      if (!item.enabled) continue;
      const set = map.get(item.role_id) ?? new Set<string>();
      set.add(item.permission_key);
      map.set(item.role_id, set);
    }
    return map;
  }, [payload?.permissions]);

  async function saveRolePermissions(roleId: string, permissions: string[]) {
    const authToken = await token();
    const response = await fetch("/api/corrente-em-dia/cliente/configuracoes", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ role_id: roleId, permissions }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível salvar permissões.");
    await load();
    setMessage("Permissões salvas.");
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const authToken = await token();
    const response = await fetch("/api/corrente-em-dia/cliente/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(newRole),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Não foi possível criar função.");
      return;
    }
    setNewRole(defaultNewRole);
    await load();
    setMessage("Função criada/atualizada.");
  }

  return (
    <main className="min-h-screen bg-[#f6fbf8] text-slate-800">
      <CorrenteClientHeader />
      <section className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2F6B43]">Configurações</p>
        <h1 className="mt-2 text-4xl font-black text-[#00334E]">Funções e permissões</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
          Sim, a melhor opção é manter funções e permissões em uma tela própria de Configurações. Assim o responsável decide quem acessa Cadastro, Contribuintes, Contribuir e Aprovações sem misturar isso com o cadastro da organização.
        </p>

        <div className="mt-5">
          <CorrenteContextualHelp title="Comece com os perfis padrão" href="/solucoes/corrente-em-dia/cliente/primeiros-passos">
            Use Presidente e Coordenador para gestão. Para os demais, libere apenas o necessário. Menos acesso indevido significa mais segurança e menos suporte.
          </CorrenteContextualHelp>
        </div>

        {message && <p className="mt-5 rounded-2xl bg-white p-4 font-bold text-[#00334E] shadow-sm">{message}</p>}
        {loading && <p className="mt-5 rounded-2xl bg-white p-4 shadow-sm">Carregando...</p>}

        {!loading && payload && (
          <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <form onSubmit={createRole} className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-100">
              <h2 className="text-2xl font-black text-[#00334E]">Nova função</h2>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-sm font-bold">Nome</span>
                  <input value={newRole.name} onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-300 p-3" placeholder="Ex.: Tesoureiro" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold">Descrição</span>
                  <textarea value={newRole.description} onChange={(e) => setNewRole((prev) => ({ ...prev, description: e.target.value }))} className="mt-1 min-h-24 w-full rounded-2xl border border-slate-300 p-3" />
                </label>
                <label className="flex gap-2 text-sm font-bold"><input type="checkbox" checked={newRole.is_manager} onChange={(e) => setNewRole((prev) => ({ ...prev, is_manager: e.target.checked }))} /> Responsável pela gestão</label>
                <label className="flex gap-2 text-sm font-bold"><input type="checkbox" checked={newRole.is_financial_role} onChange={(e) => setNewRole((prev) => ({ ...prev, is_financial_role: e.target.checked }))} /> Responsável financeiro</label>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-black text-[#00334E]">Permissões iniciais</p>
                  <div className="mt-3 space-y-2">
                    {payload.permissionKeys.map((permission) => (
                      <label key={permission} className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newRole.permissions.includes(permission)}
                          onChange={(e) => setNewRole((prev) => ({
                            ...prev,
                            permissions: e.target.checked
                              ? [...prev.permissions, permission]
                              : prev.permissions.filter((item) => item !== permission),
                          }))}
                        />
                        {CORRENTE_PERMISSION_LABELS[permission]}
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full rounded-2xl bg-[#31C16B] px-6 py-4 font-black text-[#00334E] shadow-lg">Salvar função</button>
              </div>
            </form>

            <div className="space-y-4">
              {payload.roles.map((role) => {
                const selected = permissionsByRole.get(role.id) ?? new Set<string>();
                return (
                  <RolePermissionCard
                    key={role.id}
                    role={role}
                    permissions={payload.permissionKeys}
                    selected={selected}
                    onSave={saveRolePermissions}
                  />
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function RolePermissionCard({
  role,
  permissions,
  selected,
  onSave,
}: {
  role: CorrenteRole;
  permissions: CorrentePermissionKey[];
  selected: Set<string>;
  onSave: (roleId: string, permissions: string[]) => Promise<void>;
}) {
  const [local, setLocal] = useState<string[]>(Array.from(selected));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(role.id, local);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xl font-black text-[#00334E]">{role.name}</p>
          <p className="text-sm text-slate-500">{role.is_manager ? "Gestão" : "Contribuinte"}{role.is_financial_role ? " • Financeiro" : ""}</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-[#00334E] px-4 py-2 text-sm font-black text-white disabled:opacity-60">
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {permissions.map((permission) => (
          <label key={permission} className="flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={local.includes(permission)}
              onChange={(e) => setLocal((prev) => e.target.checked ? [...prev, permission] : prev.filter((item) => item !== permission))}
            />
            <span>{CORRENTE_PERMISSION_LABELS[permission]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
