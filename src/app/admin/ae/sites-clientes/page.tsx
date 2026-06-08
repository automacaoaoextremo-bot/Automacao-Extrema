"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { adminFetch } from "@/lib/admin-fetch";
import { toSlug } from "@/lib/ae-utils";

type Solution = {
  id: string;
  name: string;
  slug: string;
};

type ClientSite = {
  id: string;
  solution_id: string;
  client_name: string;
  site_name: string;
  slug: string;
  url: string | null;
  public_path: string | null;
  page_type: string;
  status: string;
  notes: string | null;
  ae_solutions?: Solution | null;
};

const emptyForm = {
  id: "",
  solution_id: "",
  client_name: "",
  site_name: "",
  slug: "",
  url: "",
  public_path: "",
  page_type: "site_cliente",
  status: "planejado",
  notes: "",
};

type FormState = typeof emptyForm;

export default function SitesClientesPage() {
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [siteResult, solutionResult] = await Promise.all([
        adminFetch<{ client_sites: ClientSite[] }>("/api/admin/client-sites"),
        adminFetch<{ solutions: Solution[] }>("/api/admin/solutions"),
      ]);
      setSites(siteResult.client_sites);
      setSolutions(solutionResult.solutions);
      setForm((current) => ({ ...current, solution_id: current.solution_id || solutionResult.solutions[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar sites de clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      adminFetch<{ client_sites: ClientSite[] }>("/api/admin/client-sites"),
      adminFetch<{ solutions: Solution[] }>("/api/admin/solutions"),
    ])
      .then(([siteResult, solutionResult]) => {
        if (!isMounted) return;
        setSites(siteResult.client_sites);
        setSolutions(solutionResult.solutions);
        setForm((current) => ({ ...current, solution_id: current.solution_id || solutionResult.solutions[0]?.id || "" }));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar sites de clientes.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateForm(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm({ ...emptyForm, solution_id: solutions[0]?.id || "" });
    setSlugTouched(false);
    setMessage("");
    setError("");
  }

  function startEdit(site: ClientSite) {
    setForm({
      id: site.id,
      solution_id: site.solution_id,
      client_name: site.client_name,
      site_name: site.site_name,
      slug: site.slug,
      url: site.url ?? "",
      public_path: site.public_path ?? "",
      page_type: site.page_type,
      status: site.status,
      notes: site.notes ?? "",
    });
    setSlugTouched(true);
    setMessage("");
    setError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const body = {
      solution_id: form.solution_id,
      client_name: form.client_name,
      site_name: form.site_name,
      slug: form.slug,
      url: form.url,
      public_path: form.public_path,
      page_type: form.page_type,
      status: form.status,
      notes: form.notes,
    };

    try {
      if (form.id) {
        await adminFetch(`/api/admin/client-sites/${form.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setMessage("Site/página atualizado com sucesso.");
      } else {
        await adminFetch("/api/admin/client-sites", { method: "POST", body: JSON.stringify(body) });
        setMessage("Site/página cadastrado com sucesso.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar site/página.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(site: ClientSite) {
    if (!confirm(`Arquivar ${site.site_name}? A página deixa de aparecer como ativa no controle, mas não será apagada do histórico.`)) return;
    try {
      await adminFetch(`/api/admin/client-sites/${site.id}`, { method: "DELETE" });
      setMessage("Site/página arquivado com sucesso.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar site/página.");
    }
  }

  return (
    <AdminPageShell
      title="Sites / páginas de clientes"
      description="Controle as páginas públicas e sites específicos de clientes, sempre associados a uma solução da Automação Extrema."
      actions={<button onClick={resetForm} className="rounded-xl bg-[#31C16B] px-4 py-3 text-sm font-bold text-[#00334E] shadow">+ Novo site cliente</button>}
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl bg-white p-4 shadow sm:p-5">
          <h2 className="text-xl font-bold text-[#00334E]">Páginas cadastradas</h2>
          <p className="mt-1 text-sm text-slate-600">Use para organizar clientes, cases, eventos, campanhas, pesquisas e subpáginas sem espalhar projetos.</p>

          {loading && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-slate-600">Carregando...</p>}
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}
          {message && <p className="mt-4 rounded-2xl bg-green-50 p-4 text-green-700">{message}</p>}

          <div className="mt-4 space-y-3">
            {sites.map((site) => (
              <article key={site.id} className={`rounded-2xl border p-4 ${site.status === "arquivado" ? "bg-slate-50 opacity-70" : "bg-white"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-[#00334E]">{site.site_name}</h3>
                    <p className="text-sm text-slate-600">{site.client_name} · {site.ae_solutions?.name ?? "sem solução"} · {site.status}</p>
                    <p className="mt-1 text-xs text-slate-500">{site.public_path || site.url || `/${site.slug}`}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => startEdit(site)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Editar</button>
                    <button onClick={() => archive(site)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Arquivar</button>
                  </div>
                </div>
              </article>
            ))}
            {!loading && sites.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Nenhum site/página cadastrado.</p>}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow sm:p-5">
          <h2 className="text-xl font-bold text-[#00334E]">{form.id ? "Editar" : "Novo"} site/página</h2>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Select label="Solução associada" value={form.solution_id} onChange={(value) => updateForm("solution_id", value)} options={solutions.map((solution) => ({ value: solution.id, label: solution.name }))} />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Cliente" value={form.client_name} onChange={(value) => updateForm("client_name", value)} required />
              <Input label="Nome do site/página" value={form.site_name} onChange={(value) => {
                updateForm("site_name", value);
                if (!slugTouched) updateForm("slug", toSlug(value));
              }} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Slug" value={form.slug} onChange={(value) => {
                setSlugTouched(true);
                updateForm("slug", toSlug(value));
              }} required />
              <Input label="Caminho público" value={form.public_path} onChange={(value) => updateForm("public_path", value)} placeholder="/c/nome-do-cliente ou /acao/sao-francisco" />
            </div>
            <Input label="URL atual" value={form.url} onChange={(value) => updateForm("url", value)} placeholder="https://..." />
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Tipo" value={form.page_type} onChange={(value) => updateForm("page_type", value)} options={[
                { value: "site_cliente", label: "Site cliente" },
                { value: "landing", label: "Landing" },
                { value: "evento", label: "Evento" },
                { value: "campanha", label: "Campanha" },
                { value: "pesquisa", label: "Pesquisa" },
                { value: "case", label: "Case" },
              ]} />
              <Select label="Status" value={form.status} onChange={(value) => updateForm("status", value)} options={[
                { value: "planejado", label: "Planejado" },
                { value: "em_migracao", label: "Em migração" },
                { value: "ativo", label: "Ativo" },
                { value: "pausado", label: "Pausado" },
                { value: "arquivado", label: "Arquivado" },
              ]} />
            </div>
            <Textarea label="Observações" value={form.notes} onChange={(value) => updateForm("notes", value)} rows={4} />

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700">Cancelar</button>
              <button disabled={saving || solutions.length === 0} className="rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E] disabled:opacity-60">{saving ? "Salvando..." : "Salvar site/página"}</button>
            </div>
          </form>
        </section>
      </div>
    </AdminPageShell>
  );
}

function Input({ label, value, onChange, type = "text", required = false, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3">
        {options.length === 0 && <option value="">Nenhuma opção disponível</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
    </label>
  );
}
