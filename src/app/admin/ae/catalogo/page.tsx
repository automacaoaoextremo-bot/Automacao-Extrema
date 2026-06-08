"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { adminFetch } from "@/lib/admin-fetch";
import { toSlug } from "@/lib/ae-utils";

type Kind = "target_audience" | "pain" | "feature";

type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  deep_dive_value?: string | null;
  emotional_impact?: string | null;
  category?: string | null;
  value_reason?: string | null;
  deep_dive_benefit?: string | null;
  is_active: boolean;
  sort_order: number;
};

type CatalogPayload = {
  target_audiences: CatalogItem[];
  pains: CatalogItem[];
  features: CatalogItem[];
};

const labels: Record<Kind, { title: string; singular: string; help: string }> = {
  target_audience: {
    title: "Públicos alvo",
    singular: "público alvo",
    help: "Quem sente a dor, decide a compra ou influencia a aquisição.",
  },
  pain: {
    title: "Dores",
    singular: "dor",
    help: "Problemas práticos e emocionais que a solução precisa eliminar.",
  },
  feature: {
    title: "Funcionalidades",
    singular: "funcionalidade",
    help: "Recursos que existem para gerar tempo, segurança, clareza, prova social e resultado.",
  },
};

const emptyForm = {
  id: "",
  name: "",
  slug: "",
  description: "",
  deep_dive_value: "",
  emotional_impact: "",
  category: "Geral",
  value_reason: "",
  deep_dive_benefit: "",
  is_active: true,
  sort_order: "50",
};

type FormState = typeof emptyForm;

export default function CatalogoPage() {
  const [payload, setPayload] = useState<CatalogPayload>({ target_audiences: [], pains: [], features: [] });
  const [kind, setKind] = useState<Kind>("target_audience");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const items = useMemo(() => {
    if (kind === "target_audience") return payload.target_audiences;
    if (kind === "pain") return payload.pains;
    return payload.features;
  }, [kind, payload]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await adminFetch<CatalogPayload>("/api/admin/catalog");
      setPayload(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cadastros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    adminFetch<CatalogPayload>("/api/admin/catalog")
      .then((result) => {
        if (!isMounted) return;
        setPayload(result);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar cadastros.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateForm(key: keyof FormState, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNew(nextKind = kind) {
    setKind(nextKind);
    setForm(emptyForm);
    setSlugTouched(false);
    setMessage("");
    setError("");
  }

  function startEdit(item: CatalogItem) {
    setForm({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description ?? "",
      deep_dive_value: item.deep_dive_value ?? "",
      emotional_impact: item.emotional_impact ?? "",
      category: item.category ?? "Geral",
      value_reason: item.value_reason ?? "",
      deep_dive_benefit: item.deep_dive_benefit ?? "",
      is_active: item.is_active,
      sort_order: String(item.sort_order ?? 50),
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
      kind,
      name: form.name,
      slug: form.slug,
      description: form.description,
      deep_dive_value: form.deep_dive_value,
      emotional_impact: form.emotional_impact,
      category: form.category,
      value_reason: form.value_reason,
      deep_dive_benefit: form.deep_dive_benefit,
      is_active: form.is_active,
      sort_order: Number(form.sort_order || 50),
    };

    try {
      if (form.id) {
        await adminFetch(`/api/admin/catalog/${form.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setMessage(`${labels[kind].singular} atualizado com sucesso.`);
      } else {
        await adminFetch("/api/admin/catalog", { method: "POST", body: JSON.stringify(body) });
        setMessage(`${labels[kind].singular} cadastrado com sucesso.`);
      }
      startNew(kind);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(item: CatalogItem) {
    if (!confirm(`Arquivar ${item.name}? Ele deixará de aparecer como ativo, mas o histórico será preservado.`)) return;
    setError("");
    try {
      await adminFetch(`/api/admin/catalog/${item.id}?kind=${kind}`, { method: "DELETE" });
      setMessage(`${labels[kind].singular} arquivado com sucesso.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar cadastro.");
    }
  }

  return (
    <AdminPageShell
      title="Públicos, dores e funcionalidades"
      description="Cadastros reutilizáveis para associar cada solução a quem compra, qual dor real resolve e quais recursos entregam valor. A ideia é vender resultado percebido, não apenas tela ou ferramenta."
      actions={
        <button onClick={() => startNew(kind)} className="rounded-xl bg-[#31C16B] px-4 py-3 text-sm font-bold text-[#00334E] shadow">
          + Novo cadastro
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl bg-white p-4 shadow sm:p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(labels) as Kind[]).map((option) => (
              <button
                key={option}
                onClick={() => startNew(option)}
                className={`rounded-2xl p-3 text-left text-sm font-bold ${kind === option ? "bg-[#00334E] text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {labels[option].title}
                <span className="mt-1 block text-xs font-normal opacity-80">
                  {option === "target_audience" ? payload.target_audiences.length : option === "pain" ? payload.pains.length : payload.features.length} itens
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <h2 className="text-xl font-bold text-[#00334E]">{labels[kind].title}</h2>
            <p className="text-sm text-slate-600">{labels[kind].help}</p>
          </div>

          {loading && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-slate-600">Carregando...</p>}
          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}
          {message && <p className="mt-4 rounded-2xl bg-green-50 p-4 text-green-700">{message}</p>}

          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <article key={item.id} className={`rounded-2xl border p-4 ${item.is_active ? "border-slate-200" : "border-slate-200 bg-slate-50 opacity-70"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-[#00334E]">{item.name}</h3>
                    <p className="text-xs text-slate-500">/{item.slug} · ordem {item.sort_order}</p>
                    {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => startEdit(item)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
                      Editar
                    </button>
                    <button onClick={() => archive(item)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700">
                      Arquivar
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!loading && items.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Nenhum item cadastrado.</p>}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 shadow sm:p-5">
          <h2 className="text-xl font-bold text-[#00334E]">{form.id ? "Editar" : "Novo"} {labels[kind].singular}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use o Deep Dive para traduzir característica em motivo de compra: economia de tempo, menos esforço, segurança, tranquilidade, reconhecimento e previsibilidade.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nome"
                value={form.name}
                onChange={(value) => {
                  updateForm("name", value);
                  if (!slugTouched) updateForm("slug", toSlug(value));
                }}
                required
              />
              <Input
                label="Slug"
                value={form.slug}
                onChange={(value) => {
                  setSlugTouched(true);
                  updateForm("slug", toSlug(value));
                }}
                required
              />
            </div>

            {kind === "feature" && (
              <Input label="Categoria" value={form.category} onChange={(value) => updateForm("category", value)} />
            )}

            <Textarea label="Descrição" value={form.description} onChange={(value) => updateForm("description", value)} rows={3} />

            {kind === "target_audience" && (
              <Textarea
                label="Valor percebido / por que este público quer isso?"
                value={form.deep_dive_value}
                onChange={(value) => updateForm("deep_dive_value", value)}
                rows={3}
              />
            )}

            {kind === "pain" && (
              <Textarea
                label="Impacto emocional / operacional da dor"
                value={form.emotional_impact}
                onChange={(value) => updateForm("emotional_impact", value)}
                rows={3}
              />
            )}

            {kind === "feature" && (
              <div className="space-y-4">
                <Textarea
                  label="Por que existe esta funcionalidade?"
                  value={form.value_reason}
                  onChange={(value) => updateForm("value_reason", value)}
                  rows={3}
                />
                <Textarea
                  label="Por que a pessoa quer isso?"
                  value={form.deep_dive_benefit}
                  onChange={(value) => updateForm("deep_dive_benefit", value)}
                  rows={3}
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} />
                Ativo para associação nas soluções
              </label>
              <Input label="Ordem" type="number" value={form.sort_order} onChange={(value) => updateForm("sort_order", value)} />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => startNew(kind)} className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700">
                Cancelar
              </button>
              <button disabled={saving} className="rounded-xl bg-[#31C16B] px-5 py-3 font-bold text-[#00334E] disabled:opacity-60">
                {saving ? "Salvando..." : "Salvar cadastro"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminPageShell>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-slate-300 p-3"
      />
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
