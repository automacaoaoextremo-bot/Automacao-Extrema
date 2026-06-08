"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type SolutionDetail = {
  solution: Solution;
  target_audiences: Array<{ target_audience_id: string }>;
  pains: Array<{ pain_id: string }>;
  features: Array<{ feature_id: string }>;
  client_sites: Array<{ id: string; client_name: string; site_name: string; status: string; public_path: string | null; url: string | null }>;
};

const emptySolution: Solution = {
  id: "",
  name: "",
  slug: "",
  short_description: "",
  target_audience: "",
  main_pains: "",
  current_status: "ideia",
  stage: "validacao",
  priority: 3,
  source_file: "",
  is_active: true,
};

export default function EditarSolucaoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [solution, setSolution] = useState<Solution>(emptySolution);
  const [catalog, setCatalog] = useState<CatalogPayload>({ target_audiences: [], pains: [], features: [] });
  const [clientSites, setClientSites] = useState<SolutionDetail["client_sites"]>([]);
  const [selectedTargetAudiences, setSelectedTargetAudiences] = useState<string[]>([]);
  const [selectedPains, setSelectedPains] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const pageTitle = useMemo(() => solution.name || "Editar solução", [solution.name]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [detail, catalogResult] = await Promise.all([
        adminFetch<SolutionDetail>(`/api/admin/solutions/${id}`),
        adminFetch<CatalogPayload>("/api/admin/catalog"),
      ]);
      setSolution(detail.solution);
      setSelectedTargetAudiences(detail.target_audiences.map((item) => item.target_audience_id));
      setSelectedPains(detail.pains.map((item) => item.pain_id));
      setSelectedFeatures(detail.features.map((item) => item.feature_id));
      setClientSites(detail.client_sites);
      setCatalog(catalogResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar solução.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      adminFetch<SolutionDetail>(`/api/admin/solutions/${id}`),
      adminFetch<CatalogPayload>("/api/admin/catalog"),
    ])
      .then(([detail, catalogResult]) => {
        if (!isMounted) return;
        setSolution(detail.solution);
        setSelectedTargetAudiences(detail.target_audiences.map((item) => item.target_audience_id));
        setSelectedPains(detail.pains.map((item) => item.pain_id));
        setSelectedFeatures(detail.features.map((item) => item.feature_id));
        setClientSites(detail.client_sites);
        setCatalog(catalogResult);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar solução.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  function updateSolution(key: keyof Solution, value: string | number | boolean) {
    setSolution((current) => ({ ...current, [key]: value }));
  }

  function toggle(current: string[], value: string, setter: (values: string[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await adminFetch<{ solution: Solution }>(`/api/admin/solutions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...solution,
          target_audience_ids: selectedTargetAudiences,
          pain_ids: selectedPains,
          feature_ids: selectedFeatures,
        }),
      });
      setSolution(result.solution);
      setMessage("Solução atualizada com sucesso.");
      router.refresh();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar solução.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveSolution() {
    if (!confirm(`Arquivar ${solution.name}? Ela deixará de aparecer como ativa, mas não será apagada.`)) return;
    try {
      await adminFetch(`/api/admin/solutions/${id}`, { method: "DELETE" });
      router.push("/admin/ae/solucoes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar solução.");
    }
  }

  return (
    <AdminPageShell
      title={pageTitle}
      description="Atualize o cadastro da solução e associe públicos, dores e funcionalidades do catálogo central."
      actions={
        <>
          <Link href="/admin/ae/solucoes" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
            Voltar
          </Link>
          <Link href="/admin/ae/sites-clientes" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
            Sites clientes
          </Link>
          <button onClick={archiveSolution} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700">
            Arquivar
          </button>
        </>
      }
    >
      {loading && <div className="rounded-2xl bg-white p-5 text-slate-600 shadow">Carregando solução...</div>}
      {error && <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}
      {message && <div className="rounded-2xl bg-green-50 p-4 text-green-700">{message}</div>}

      {!loading && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={onSubmit} className="space-y-5 rounded-3xl bg-white p-5 shadow">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Nome" value={solution.name} onChange={(value) => {
                updateSolution("name", value);
                if (!solution.slug) updateSolution("slug", toSlug(value));
              }} required />
              <Input label="Slug" value={solution.slug} onChange={(value) => updateSolution("slug", toSlug(value))} required />
            </div>

            <Textarea label="Descrição curta" value={solution.short_description} onChange={(value) => updateSolution("short_description", value)} rows={3} required />
            <Textarea label="Público-alvo resumido" value={solution.target_audience ?? ""} onChange={(value) => updateSolution("target_audience", value)} rows={3} required />
            <Textarea label="Principais dores resolvidas" value={solution.main_pains ?? ""} onChange={(value) => updateSolution("main_pains", value)} rows={4} required />

            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Status" value={solution.current_status} onChange={(value) => updateSolution("current_status", value)} options={["ideia", "validando", "mvp", "case", "operacao", "pausada", "arquivada"]} />
              <Select label="Etapa" value={solution.stage} onChange={(value) => updateSolution("stage", value)} options={["descoberta", "validacao", "implementacao", "operacao", "escala"]} />
              <Input label="Prioridade" type="number" value={String(solution.priority ?? 0)} onChange={(value) => updateSolution("priority", Number(value || 0))} />
            </div>

            <Input label="Arquivo de origem" value={solution.source_file ?? ""} onChange={(value) => updateSolution("source_file", value)} />

            <label className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={solution.is_active} onChange={(event) => updateSolution("is_active", event.target.checked)} />
              Solução ativa no diagnóstico
            </label>

            <div className="grid gap-4 lg:grid-cols-3">
              <CheckboxGroup title="Públicos" items={catalog.target_audiences} selected={selectedTargetAudiences} onToggle={(itemId) => toggle(selectedTargetAudiences, itemId, setSelectedTargetAudiences)} />
              <CheckboxGroup title="Dores" items={catalog.pains} selected={selectedPains} onToggle={(itemId) => toggle(selectedPains, itemId, setSelectedPains)} />
              <CheckboxGroup title="Funcionalidades" items={catalog.features} selected={selectedFeatures} onToggle={(itemId) => toggle(selectedFeatures, itemId, setSelectedFeatures)} />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
              <Link href="/admin/ae/solucoes" className="rounded-xl border border-slate-300 px-5 py-3 text-center font-bold text-slate-700 hover:border-[#00A8CC]">
                Cancelar
              </Link>
              <button disabled={saving} className="rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E] disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="rounded-3xl bg-white p-5 shadow">
              <h2 className="text-xl font-bold text-[#00334E]">Sites e páginas associados</h2>
              <p className="mt-1 text-sm text-slate-600">Controle sites de clientes, páginas de ação, pesquisas, campanhas e cases relacionados a esta solução.</p>
              <div className="mt-4 space-y-3">
                {clientSites.map((site) => (
                  <div key={site.id} className="rounded-2xl border border-slate-200 p-3">
                    <p className="font-bold text-[#00334E]">{site.site_name}</p>
                    <p className="text-sm text-slate-600">{site.client_name} · {site.status}</p>
                    <p className="text-xs text-slate-500">{site.public_path || site.url || "sem URL"}</p>
                  </div>
                ))}
                {clientSites.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Nenhum site/página associado ainda.</p>}
              </div>
              <Link href="/admin/ae/sites-clientes" className="mt-4 inline-block rounded-xl bg-[#00334E] px-4 py-3 text-sm font-bold text-white">
                Gerenciar sites/páginas
              </Link>
            </section>

            <section className="rounded-3xl bg-[#00334E] p-5 text-white shadow">
              <h2 className="text-xl font-bold">Deep Dive aplicado</h2>
              <p className="mt-2 text-sm text-white/80">
                Ao editar esta solução, associe recursos às dores e públicos. A oferta deve explicar por que a pessoa ganha tempo, reduz esforço, sente segurança e consegue decidir melhor.
              </p>
            </section>
          </aside>
        </div>
      )}
    </AdminPageShell>
  );
}

function CheckboxGroup({ title, items, selected, onToggle }: { title: string; items: CatalogItem[]; selected: string[]; onToggle: (id: string) => void }) {
  const activeItems = items.filter((item) => item.is_active !== false || selected.includes(item.id));
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
        {activeItems.length === 0 && <p className="text-sm text-slate-500">Nenhum item disponível.</p>}
      </div>
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </label>
  );
}

function Textarea({ label, value, onChange, rows, required = false }: { label: string; value: string; onChange: (value: string) => void; rows: number; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} required={required} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
