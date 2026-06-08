"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPageShell } from "@/components/admin-page-shell";
import { adminFetch } from "@/lib/admin-fetch";
import { toSlug } from "@/lib/ae-utils";

type Solution = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  target_audience: string | null;
  main_pains: string | null;
  current_status: string;
  stage: string;
  priority: number;
  source_file: string | null;
  is_active: boolean;
};

type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

type CatalogPayload = {
  target_audiences: CatalogItem[];
  pains: CatalogItem[];
  features: CatalogItem[];
};

export default function NovaSolucaoPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogPayload>({ target_audiences: [], pains: [], features: [] });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<string[]>([]);
  const [selectedPains, setSelectedPains] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [createdSolution, setCreatedSolution] = useState<Solution | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestedSlug = useMemo(() => toSlug(name), [name]);
  const effectiveSlug = slugTouched ? slug : suggestedSlug;

  useEffect(() => {
    adminFetch<CatalogPayload>("/api/admin/catalog")
      .then(setCatalog)
      .catch(() => undefined);
  }, []);

  function toggle(current: string[], value: string, setter: (values: string[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setMessage("");
    setError("");
    setCreatedSolution(null);
    setSaving(true);

    try {
      const result = await adminFetch<{ solution: Solution }>("/api/admin/solutions", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name") || ""),
          slug: String(formData.get("slug") || ""),
          short_description: String(formData.get("short_description") || ""),
          target_audience: String(formData.get("target_audience") || ""),
          main_pains: String(formData.get("main_pains") || ""),
          current_status: String(formData.get("current_status") || ""),
          stage: String(formData.get("stage") || ""),
          priority: Number(formData.get("priority") || 0),
          source_file: String(formData.get("source_file") || ""),
          is_active: formData.get("is_active") === "on",
          target_audience_ids: selectedTargetAudiences,
          pain_ids: selectedPains,
          feature_ids: selectedFeatures,
        }),
      });

      setCreatedSolution(result.solution);
      setMessage("Solução cadastrada com sucesso.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar solução.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageShell
      title="Nova solução"
      description="Cadastre uma solução já conectada aos cadastros reutilizáveis de públicos, dores e funcionalidades. Isso facilita a migração para uma plataforma multi-solução."
      actions={
        <>
          <Link href="/admin/ae/solucoes" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
            Cancelar
          </Link>
          <Link href="/admin/ae/catalogo" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
            Editar catálogo
          </Link>
        </>
      }
    >
      <section className="rounded-3xl bg-white p-5 shadow">
        {message && (
          <div className="rounded-xl bg-green-50 p-4 text-green-700">
            <p className="font-semibold">{message}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {createdSolution && (
                <Link href={`/admin/ae/solucoes/${createdSolution.id}`} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-green-800 underline">
                  Editar solução cadastrada
                </Link>
              )}
              <Link href="/admin/ae/solucoes" className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-green-800 underline">
                Voltar para Soluções
              </Link>
            </div>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}

        {!createdSolution && (
          <form onSubmit={onSubmit} className="mt-2 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                name="name"
                label="Nome"
                value={name}
                onChange={(value) => {
                  setName(value);
                  if (!slugTouched) setSlug(toSlug(value));
                }}
                required
              />

              <Input
                name="slug"
                label="Slug"
                value={effectiveSlug}
                onChange={(value) => {
                  setSlugTouched(true);
                  setSlug(toSlug(value));
                }}
                required
              />
            </div>

            <Textarea name="short_description" label="Descrição curta" rows={3} required />
            <Textarea name="target_audience" label="Público-alvo resumido" rows={3} required />
            <Textarea name="main_pains" label="Principais dores resolvidas" rows={4} required />

            <div className="grid gap-4 md:grid-cols-3">
              <Select name="current_status" label="Status" defaultValue="ideia" options={["ideia", "validando", "mvp", "case", "operacao", "pausada"]} />
              <Select name="stage" label="Etapa" defaultValue="validacao" options={["descoberta", "validacao", "implementacao", "operacao", "escala"]} />
              <Input name="priority" label="Prioridade" type="number" defaultValue="3" />
            </div>

            <Input name="source_file" label="Arquivo de origem" defaultValue="" help="Opcional. Exemplo: AE - Presença Querida.docx" />

            <div className="grid gap-4 lg:grid-cols-3">
              <CheckboxGroup title="Públicos associados" items={catalog.target_audiences} selected={selectedTargetAudiences} onToggle={(id) => toggle(selectedTargetAudiences, id, setSelectedTargetAudiences)} />
              <CheckboxGroup title="Dores associadas" items={catalog.pains} selected={selectedPains} onToggle={(id) => toggle(selectedPains, id, setSelectedPains)} />
              <CheckboxGroup title="Funcionalidades associadas" items={catalog.features} selected={selectedFeatures} onToggle={(id) => toggle(selectedFeatures, id, setSelectedFeatures)} />
            </div>

            <label className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <input name="is_active" type="checkbox" defaultChecked />
              Solução ativa no diagnóstico
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/admin/ae/solucoes" className="rounded-xl border border-slate-300 px-5 py-3 text-center font-bold text-slate-700 hover:border-[#00A8CC]">
                Cancelar e voltar
              </Link>
              <button disabled={saving} className="rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E] disabled:opacity-60">
                {saving ? "Cadastrando..." : "Cadastrar solução"}
              </button>
            </div>
          </form>
        )}
      </section>
    </AdminPageShell>
  );
}

function CheckboxGroup({ title, items, selected, onToggle }: { title: string; items: CatalogItem[]; selected: string[]; onToggle: (id: string) => void }) {
  const activeItems = items.filter((item) => item.is_active !== false);
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="font-bold text-[#00334E]">{title}</h3>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {activeItems.map((item) => (
          <label key={item.id} className="flex gap-2 rounded-xl bg-slate-50 p-2 text-sm text-slate-700">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
            <span>{item.name}</span>
          </label>
        ))}
        {activeItems.length === 0 && <p className="text-sm text-slate-500">Nenhum item ativo no catálogo.</p>}
      </div>
    </section>
  );
}

function Input({
  name,
  label,
  value,
  onChange,
  defaultValue,
  type = "text",
  help,
  required = false,
}: {
  name: string;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  type?: string;
  help?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-slate-300 p-3"
      />
      {help && <p className="mt-1 text-xs text-slate-500">{help}</p>}
    </div>
  );
}

function Textarea({ name, label, rows, required = false }: { name: string; label: string; rows: number; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <textarea name={name} rows={rows} required={required} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </div>
  );
}

function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: string[] }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <select name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-xl border border-slate-300 p-3">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
