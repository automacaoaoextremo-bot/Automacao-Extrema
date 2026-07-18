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

type Entity = {
  id: string;
  name: string;
  slug: string;
  line: string | null;
  entity_type: string | null;
  usual_materials: string | null;
  usual_days: string[] | null;
  daily_capacity?: number | null;
  appointment_enabled?: boolean | null;
  appointment_notes?: string | null;
  notes: string | null;
  active: boolean;
};

type Payload = { entities: Entity[] };
type EntityForm = {
  id: string;
  name: string;
  slug: string;
  line: string;
  entityType: string;
  usualMaterials: string;
  usualDays: string[];
  dailyCapacity: string;
  appointmentEnabled: boolean;
  appointmentNotes: string;
  notes: string;
  active: boolean;
};

type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "primary" | "danger" | "warning";
  run: () => Promise<void>;
};

const emptyForm: EntityForm = {
  id: "",
  name: "",
  slug: "",
  line: "",
  entityType: "",
  usualMaterials: "",
  usualDays: [],
  dailyCapacity: "4",
  appointmentEnabled: true,
  appointmentNotes: "",
  notes: "",
  active: true,
};

const dayOptions = [
  { slug: "segunda", label: "Segunda" },
  { slug: "terca", label: "Terça" },
  { slug: "quarta", label: "Quarta" },
  { slug: "quinta-grupo-1", label: "Quinta Grupo 1" },
  { slug: "quinta-grupo-2", label: "Quinta Grupo 2" },
  { slug: "eventual", label: "Eventual" },
];

const dayLabels = new Map(dayOptions.map((item) => [item.slug, item.label]));

function slugFromName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function entityToForm(entity: Entity): EntityForm {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    line: entity.line ?? "",
    entityType: entity.entity_type ?? "",
    usualMaterials: entity.usual_materials ?? "",
    usualDays: entity.usual_days ?? [],
    dailyCapacity: String(entity.daily_capacity ?? 4),
    appointmentEnabled: entity.appointment_enabled !== false,
    appointmentNotes: entity.appointment_notes ?? "",
    notes: entity.notes ?? "",
    active: entity.active !== false,
  };
}

function EntityFormFields({ form, update, toggleDay }: {
  form: EntityForm;
  update: <K extends keyof EntityForm>(key: K, value: EntityForm[K]) => void;
  toggleDay: (slug: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Nome da entidade *" value={form.name} onChange={(value) => update("name", value)} />
        <Input label="Código interno" value={form.slug} onChange={(value) => update("slug", value)} placeholder={slugFromName(form.name) || "codigo-da-entidade"} />
        <Input label="Linha de trabalho" value={form.line} onChange={(value) => update("line", value)} placeholder="Ex.: Oxóssi, Ogum, Xangô, Preto Velho" />
        <Input label="Tipo" value={form.entityType} onChange={(value) => update("entityType", value)} placeholder="Ex.: Caboclo, Preto Velho, Criança" />
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-black text-[#00334E]">Materiais/apetrechos habituais</span>
          <textarea value={form.usualMaterials} onChange={(event) => update("usualMaterials", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" placeholder="Ex.: velas, pembas, ervas, flores, pedras." />
        </label>
      </div>

      <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
        <p className="text-sm font-black text-[#00334E]">Dias em que costuma atender</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {dayOptions.map((item) => (
            <label key={item.slug} className="flex min-h-12 items-center gap-2 rounded-2xl bg-white p-3 text-sm font-bold text-[#00334E] ring-1 ring-emerald-100">
              <input type="checkbox" checked={form.usualDays.includes(item.slug)} onChange={() => toggleDay(item.slug)} className="h-5 w-5" />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-black text-[#00334E]">Capacidade de atendimento por dia</span>
          <input value={form.dailyCapacity} onChange={(event) => update("dailyCapacity", event.target.value.replace(/\D/g, ""))} className="rounded-2xl border border-slate-200 p-3" inputMode="numeric" placeholder="4" />
          <span className="text-xs font-semibold text-slate-500">Quando o limite é atingido, novos agendamentos para esta entidade ficam bloqueados.</span>
        </label>
        <label className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
          <input type="checkbox" checked={form.appointmentEnabled} onChange={(event) => update("appointmentEnabled", event.target.checked)} className="h-5 w-5" />
          <span className="text-sm font-black text-[#00334E]">Permitir agendamento com esta entidade</span>
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-black text-[#00334E]">Orientações para agendamento</span>
        <textarea value={form.appointmentNotes} onChange={(event) => update("appointmentNotes", event.target.value)} className="min-h-20 rounded-2xl border border-slate-200 p-3" placeholder="Ex.: retorno obrigatório, preparo ou observações para a recepção." />
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-black text-[#00334E]">Observações</span>
        <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 p-3" />
      </label>
      <label className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
        <input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} className="h-5 w-5" />
        <span className="text-sm font-black text-[#00334E]">Entidade ativa</span>
      </label>
    </div>
  );
}

export default function EntidadesPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<EntityForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"alphabetical" | "status">("alphabetical");
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewEntity, setViewEntity] = useState<Entity | null>(null);
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
      load().catch((err) => active && setError(err instanceof Error ? err.message : "Erro ao carregar entidades.")).finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [load]);

  const visibleEntities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const filtered = (payload?.entities ?? []).filter((entity) => {
      if (!normalizedQuery) return true;
      return [entity.name, entity.slug, entity.line, entity.entity_type]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(normalizedQuery));
    });

    return [...filtered].sort((left, right) => {
      if (sortOrder === "status") {
        const statusDifference = Number(right.active !== false) - Number(left.active !== false);
        if (statusDifference !== 0) return statusDifference;
      }
      return left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" });
    });
  }, [payload?.entities, query, sortOrder]);

  function update<K extends keyof EntityForm>(key: K, value: EntityForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(slug: string) {
    setForm((current) => ({
      ...current,
      usualDays: current.usualDays.includes(slug)
        ? current.usualDays.filter((item) => item !== slug)
        : [...current.usualDays, slug],
    }));
  }

  function openNewEntity() {
    setForm(emptyForm);
    setEditorOpen(true);
  }

  function editEntity(entity: Entity) {
    setForm(entityToForm(entity));
    setEditorOpen(true);
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
          dailyCapacity: form.dailyCapacity,
          appointmentEnabled: form.appointmentEnabled,
          appointmentNotes: form.appointmentNotes,
          notes: form.notes,
          active: form.active,
        }),
      });
      if (result) setPayload(result);
      setEditorOpen(false);
      setForm(emptyForm);
      setMessage("Entidade salva. Ela pode ser usada nos vínculos de cavalinhos, cambonos e atendimentos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar entidade.");
    } finally {
      setSaving(false);
    }
  }

  async function changeEntityActive(entity: Entity, active: boolean) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "toggleEntity", entityId: entity.id, active }) });
      if (result) setPayload(result);
      setMessage(active ? "Entidade ativada." : "Entidade inativada. O histórico foi preservado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar entidade.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntity(entity: Entity) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await request({ method: "POST", body: JSON.stringify({ action: "deleteEntity", entityId: entity.id }) });
      if (result) setPayload(result);
      setMessage("Entidade retirada de uso e inativada para preservar vínculos, agendamentos e histórico.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao retirar entidade de uso.");
    } finally {
      setSaving(false);
    }
  }

  function askToggle(entity: Entity) {
    const nextActive = entity.active === false;
    setConfirmation({
      title: nextActive ? "Ativar entidade?" : "Inativar entidade?",
      message: nextActive
        ? `Deseja tornar ${entity.name} disponível novamente nos cadastros e agendamentos?`
        : `Deseja inativar ${entity.name}? Os vínculos e o histórico serão preservados.`,
      confirmLabel: nextActive ? "Ativar" : "Inativar",
      tone: nextActive ? "primary" : "warning",
      run: () => changeEntityActive(entity, nextActive),
    });
  }

  function askDelete(entity: Entity) {
    setConfirmation({
      title: "Excluir entidade da lista ativa?",
      message: `Tem certeza que deseja retirar ${entity.name} de uso? Para preservar eventos, agendamentos e histórico, o registro será inativado em vez de apagado definitivamente.`,
      confirmLabel: "Excluir da lista ativa",
      tone: "danger",
      run: () => deleteEntity(entity),
    });
  }

  async function runConfirmation() {
    const action = confirmation?.run;
    setConfirmation(null);
    if (action) await action();
  }

  return (
    <OrganizacaoClientShell title="Entidades" description="Cadastre entidades, linhas de trabalho, materiais usuais e dias de atuação para apoiar Agenda Viva e Atendimento em Harmonia.">
      <OrganizacaoBaseUnicaSubnav />
      {loading && <p className="rounded-3xl bg-white p-5 shadow ring-1 ring-slate-100">Carregando entidades...</p>}
      {error && <p className="rounded-3xl bg-red-50 p-5 font-bold text-red-700 ring-1 ring-red-100">{error}</p>}
      {message && <p className="rounded-3xl bg-emerald-50 p-5 font-bold text-emerald-800 ring-1 ring-emerald-100">{message}</p>}

      {!loading && payload && (
        <div className="grid gap-4">
          <section className="rounded-[2rem] bg-white p-4 shadow ring-1 ring-slate-100 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2F6B43]">Base Única</p>
                <h2 className="mt-2 text-2xl font-black text-[#00334E]">Lista de entidades</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">As informações completas aparecem em Visualizar ou Editar.</p>
              </div>
              <AdminActionButton onClick={openNewEntity} tone="primary" className="w-full sm:w-auto">Nova entidade</AdminActionButton>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_16rem]">
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder="Buscar por nome, linha, tipo ou código" />
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
            {visibleEntities.map((entity) => (
              <CompactAdminRow
                key={entity.id}
                icon="✨"
                title={entity.name}
                subtitle={[entity.line, entity.entity_type].filter(Boolean).join(" · ") || entity.slug}
                status={<AdminStatusBadge active={entity.active !== false}>{entity.active === false ? "Inativa" : "Ativa"}</AdminStatusBadge>}
                actions={
                  <>
                    <AdminActionButton onClick={() => setViewEntity(entity)}>Visualizar</AdminActionButton>
                    <AdminActionButton onClick={() => editEntity(entity)} tone="primary">Editar</AdminActionButton>
                    <AdminActionButton onClick={() => askToggle(entity)} tone={entity.active === false ? "success" : "warning"}>{entity.active === false ? "Ativar" : "Inativar"}</AdminActionButton>
                    <AdminActionButton onClick={() => askDelete(entity)} tone="danger">Excluir</AdminActionButton>
                  </>
                }
              />
            ))}
            {visibleEntities.length === 0 && <p className="rounded-3xl bg-white p-5 font-bold text-slate-500 shadow ring-1 ring-slate-100">Nenhuma entidade encontrada.</p>}
          </section>
        </div>
      )}

      <AdminModal open={editorOpen} title={form.id ? "Editar entidade" : "Nova entidade"} eyebrow="Base Única" onClose={() => !saving && setEditorOpen(false)}>
        <div className="grid gap-5">
          <EntityFormFields form={form} update={update} toggleDay={toggleDay} />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AdminActionButton onClick={() => setEditorOpen(false)} disabled={saving}>Cancelar</AdminActionButton>
            <AdminActionButton onClick={saveEntity} disabled={saving || !form.name.trim()} tone="primary">{saving ? "Salvando..." : form.id ? "Salvar entidade" : "Cadastrar entidade"}</AdminActionButton>
          </div>
        </div>
      </AdminModal>

      <AdminModal open={Boolean(viewEntity)} title={viewEntity?.name ?? "Visualizar entidade"} eyebrow="Entidade" onClose={() => setViewEntity(null)}>
        {viewEntity && (
          <AdminDetailGrid>
            <AdminDetailItem label="Código interno">{viewEntity.slug}</AdminDetailItem>
            <AdminDetailItem label="Situação">{viewEntity.active === false ? "Inativa" : "Ativa"}</AdminDetailItem>
            <AdminDetailItem label="Linha de trabalho">{viewEntity.line || "Não informada"}</AdminDetailItem>
            <AdminDetailItem label="Tipo">{viewEntity.entity_type || "Não informado"}</AdminDetailItem>
            <AdminDetailItem label="Dias usuais" full>{(viewEntity.usual_days ?? []).map((day) => dayLabels.get(day) ?? day).join(", ") || "Não definidos"}</AdminDetailItem>
            <AdminDetailItem label="Materiais/apetrechos" full>{viewEntity.usual_materials || "Não informados"}</AdminDetailItem>
            <AdminDetailItem label="Capacidade diária">{viewEntity.daily_capacity ?? 4} consulentes</AdminDetailItem>
            <AdminDetailItem label="Agendamento">{viewEntity.appointment_enabled === false ? "Bloqueado" : "Permitido"}</AdminDetailItem>
            <AdminDetailItem label="Orientações para agendamento" full>{viewEntity.appointment_notes || "Nenhuma orientação cadastrada"}</AdminDetailItem>
            <AdminDetailItem label="Observações" full>{viewEntity.notes || "Nenhuma observação cadastrada"}</AdminDetailItem>
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

function Input({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-black text-[#00334E]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 p-3" placeholder={placeholder} />
    </label>
  );
}
