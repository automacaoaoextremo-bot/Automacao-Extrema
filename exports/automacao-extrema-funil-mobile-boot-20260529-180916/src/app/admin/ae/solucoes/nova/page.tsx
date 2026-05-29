"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";

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

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NovaSolucaoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [message, setMessage] = useState("");
  const [createdSolution, setCreatedSolution] = useState<Solution | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestedSlug = useMemo(() => toSlug(name), [name]);
  const effectiveSlug = slugTouched ? slug : suggestedSlug;

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

  function resetForm() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setMessage("");
    setError("");
    setCreatedSolution(null);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Link href="/admin/ae/solucoes" className="text-sm font-bold text-[#00A8CC]">← Voltar para Soluções</Link>
            <h1 className="mt-3 text-3xl font-bold text-[#00334E]">Nova solução</h1>
            <p className="mt-1 text-slate-600">
              Cadastre ideias, MVPs e cases que serão usados no diagnóstico e na gestão de oportunidades.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ae/solucoes" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
              Cancelar
            </Link>
            <Link href="/admin/ae" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:border-[#00A8CC]">
              Ir para Gestão
            </Link>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-green-700">
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
              <Link href="/admin/ae" className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-green-800 underline">
                Ir para Gestão
              </Link>
              <button type="button" onClick={resetForm} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-green-800 underline">
                Cadastrar outra solução
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}

        {!createdSolution && (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
              help="Identificador usado pelo sistema. Exemplo: familia-presente-60-mais."
              required
            />

            <Textarea name="short_description" label="Descrição curta" rows={3} required />
            <Textarea name="target_audience" label="Público-alvo" rows={3} required />
            <Textarea name="main_pains" label="Dores principais" rows={4} required />

            <div className="grid gap-4 md:grid-cols-3">
              <Select name="current_status" label="Status" defaultValue="ideia" options={["ideia", "validando", "mvp", "case", "operacao", "pausada"]} />
              <Select name="stage" label="Etapa" defaultValue="validacao" options={["descoberta", "validacao", "implementacao", "operacao", "escala"]} />
              <Input name="priority" label="Prioridade" type="number" defaultValue="3" />
            </div>

            <Input name="source_file" label="Arquivo de origem" defaultValue="" help="Opcional. Exemplo: AE - Nova Solução.docx" />

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
    </main>
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
